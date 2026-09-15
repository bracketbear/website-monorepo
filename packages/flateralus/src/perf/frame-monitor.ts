/** A snapshot of how the render loop has been behaving. */
export interface FrameStats {
  /** Samples currently in the window. Zero while warming up. */
  count: number;
  /** Median frame interval, in milliseconds. */
  p50: number;
  /** 95th-percentile frame interval, in milliseconds. */
  p95: number;
  /** Frames per second implied by the median. */
  fps: number;
}

export interface FrameMonitorOptions {
  /** How many recent intervals to keep. */
  window?: number;
  /** Intervals to discard before reporting anything. */
  warmup?: number;
  /** Intervals longer than this are thrown away, in milliseconds. */
  maxSample?: number;
}

/**
 * Frame-interval statistics for one animation.
 *
 * Interval rather than work time, because work time cannot see these scenes:
 * an animation's update returns the moment it issues its draw call, and the
 * GPU does the expensive part afterwards. A scene taking sixteen seconds a
 * frame on the GPU still reports about a millisecond of CPU work. When the
 * GPU is the bottleneck the render loop backs up, and the interval is where
 * that shows.
 */
export class FrameMonitor {
  private readonly buf: Float64Array;
  private readonly warmup: number;
  private readonly maxSample: number;

  /** Write cursor, and how many slots hold real samples. */
  private at = 0;
  private filled = 0;
  /** Timestamp of the previous frame, or null when there is no baseline. */
  private last: number | null = null;
  /** Accepted intervals so far, for the warmup countdown. */
  private accepted = 0;
  /** Intervals still to be thrown away after a disturbance. */
  private skip = 0;

  constructor(opts: FrameMonitorOptions = {}) {
    this.buf = new Float64Array(Math.max(1, opts.window ?? 120));
    this.warmup = opts.warmup ?? 10;
    this.maxSample = opts.maxSample ?? 1000;
  }

  /**
   * Record a frame boundary. The first call after construction, a reset or a
   * discontinuity establishes a baseline and contributes no sample.
   */
  record(now: number): void {
    const prev = this.last;
    this.last = now;
    if (prev === null) return;

    if (this.skip > 0) {
      this.skip--;
      return;
    }

    const dt = now - prev;
    // A stall past the ceiling is a breakpoint, a throttled tab or a stop in
    // the debugger. Letting one into the window would misreport the scene
    // for the next two seconds.
    if (!(dt > 0) || dt > this.maxSample) return;

    // Warmup is counted in accepted intervals, so a discarded stall cannot
    // silently consume it. Shader compilation and the first texture upload
    // live in here; without this the quality controller would see the load
    // spike and drop straight to its floor.
    this.accepted++;
    if (this.accepted <= this.warmup) return;

    this.buf[this.at] = dt;
    this.at = (this.at + 1) % this.buf.length;
    if (this.filled < this.buf.length) this.filled++;
  }

  /**
   * Declare a disturbance: the tab was hidden, the animation was remounted,
   * or a render target was just reallocated.
   *
   * The baseline is always dropped, so the gap itself is never measured.
   * `settleIntervals` additionally throws away that many measurements
   * *after* the gap, for a disturbance that takes a few frames to subside.
   * Reallocating a framebuffer is the case that needs it: if those frames
   * land in the window, a quality controller reads its own adjustment as
   * the scene getting slower and chases itself down to the floor.
   */
  discontinuity(settleIntervals = 0): void {
    this.last = null;
    this.skip = Math.max(0, settleIntervals);
  }

  /** Percentiles are computed here rather than per frame: see `stats`. */
  private percentile(sorted: Float64Array, p: number): number {
    const n = sorted.length;
    if (n === 0) return 0;
    const idx = Math.min(n - 1, Math.max(0, Math.ceil(p * n) - 1));
    return sorted[idx];
  }

  /**
   * Current statistics.
   *
   * The sort happens on read, not on record. Sorting the window on every
   * frame for every mounted animation would itself be a cost worth
   * measuring, and nothing reads this more than a few times a second.
   *
   * p50 and p95 rather than a mean: a scene averaging 16ms with a 90ms p95
   * is hitching, and the mean reports it as comfortable.
   */
  stats(): FrameStats {
    const n = this.filled;
    if (n === 0) return { count: 0, p50: 0, p95: 0, fps: 0 };
    const sorted = this.buf.slice(0, n).sort();
    const p50 = this.percentile(sorted, 0.5);
    return {
      count: n,
      p50,
      p95: this.percentile(sorted, 0.95),
      fps: p50 > 0 ? 1000 / p50 : 0,
    };
  }

  /** Forget everything, including the baseline and the warmup progress. */
  reset(): void {
    this.at = 0;
    this.filled = 0;
    this.last = null;
    this.accepted = 0;
    this.skip = 0;
  }
}
