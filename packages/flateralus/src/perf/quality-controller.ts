import type { FrameStats } from './frame-monitor';

export interface QualityControllerOptions {
  /** Target frame interval in milliseconds. 16.7 is 60fps, 33.3 is 30fps. */
  budget?: number;
  /** Fraction of budget above which quality comes down. */
  overshoot?: number;
  /** Fraction of budget below which quality tries to climb. */
  undershoot?: number;
  /** How much quality is given up in one downgrade. */
  downStep?: number;
  /** How much quality is reclaimed in one upgrade. */
  upStep?: number;
  /** Milliseconds to wait after a downgrade before another. */
  downCooldown?: number;
  /** Milliseconds to wait after an upgrade before another. */
  upCooldown?: number;
  /** Quality is rounded to this, so levers move in discrete steps. */
  quantum?: number;
  /** The worst automatic scaling is allowed to make things look. */
  minQuality?: number;
  /** Samples needed before acting on the statistics at all. */
  minSamples?: number;
}

/**
 * Decides how much quality to spend, from frame statistics.
 *
 * The rates are deliberately asymmetric and there is a deadband between
 * them. Symmetric rates with no deadband produce the classic dynamic
 * resolution failure: drop quality, get faster, raise quality, get slower,
 * forever, with the picture visibly breathing. Coming down fast is right
 * because the viewer is suffering now; going back up slowly is right because
 * guessing wrong upward makes them suffer again.
 *
 * Pure with respect to time — the caller passes `now` — so the settling
 * behaviour is a unit test rather than something to watch in a browser.
 */
export class QualityController {
  /** In 'fixed' the statistics are ignored and quality holds where it is. */
  mode: 'auto' | 'fixed' = 'auto';

  /**
   * Quality is accumulated continuously here and only quantised on the way
   * out. Rounding the stored value instead would make the up-step vanish —
   * it is smaller than the quantum by design — and quality would ratchet
   * down and never recover.
   */
  private raw = 1;
  private lastDown = -Infinity;
  private lastUp = -Infinity;

  private readonly budget: number;
  private readonly overshoot: number;
  private readonly undershoot: number;
  private readonly downStep: number;
  private readonly upStep: number;
  private readonly downCooldown: number;
  private readonly upCooldown: number;
  private readonly quantum: number;
  private readonly minQuality: number;
  private readonly minSamples: number;

  constructor(o: QualityControllerOptions = {}) {
    this.budget = o.budget ?? 16.7;
    this.overshoot = o.overshoot ?? 1.15;
    this.undershoot = o.undershoot ?? 0.75;
    this.downStep = o.downStep ?? 0.08;
    this.upStep = o.upStep ?? 0.02;
    this.downCooldown = o.downCooldown ?? 250;
    this.upCooldown = o.upCooldown ?? 1000;
    this.quantum = o.quantum ?? 0.05;
    this.minQuality = o.minQuality ?? 0.25;
    this.minSamples = o.minSamples ?? 20;
  }

  get quality(): number {
    return this.quantise(this.raw);
  }

  /**
   * Set quality directly, for pinning during look-dev.
   *
   * Clamped to [0, 1] rather than to `minQuality`: that floor exists to stop
   * the *controller* making a scene hideous unattended, and applying it here
   * as well would make each lever's `min` — documented as its value at
   * quality zero — unreachable by hand.
   */
  setQuality(q: number): void {
    this.raw = Math.min(1, Math.max(0, q));
  }

  private quantise(q: number): number {
    return Math.round(q / this.quantum) * this.quantum;
  }

  /**
   * Fold one set of statistics in and return the quality to render at.
   *
   * p95 rather than p50 is the input on purpose: a scene whose typical frame
   * is comfortable but whose worst frames are not is exactly the scene worth
   * turning down.
   */
  update(stats: FrameStats, now: number): number {
    if (this.mode === 'fixed') return this.quality;
    if (stats.count < this.minSamples) return this.quality;

    const high = this.budget * this.overshoot;
    const low = this.budget * this.undershoot;

    if (stats.p95 > high) {
      // The cooldown is what stops one slow stretch being counted on every
      // frame and sliding the scene to its floor before the first reduction
      // has had time to show up in the measurements.
      if (
        now - this.lastDown >= this.downCooldown &&
        this.raw > this.minQuality
      ) {
        this.raw = Math.max(this.minQuality, this.raw - this.downStep);
        this.lastDown = now;
      }
    } else if (stats.p95 < low) {
      if (now - this.lastUp >= this.upCooldown && this.raw < 1) {
        this.raw = Math.min(1, this.raw + this.upStep);
        this.lastUp = now;
      }
    }
    // Between the two thresholds nothing happens. That gap is the design.
    return this.quality;
  }

  reset(): void {
    this.raw = 1;
    this.lastDown = -Infinity;
    this.lastUp = -Infinity;
  }
}
