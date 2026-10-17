/**
 * The route-trace clock and geometry, with no PIXI in it.
 *
 * Progress is stored as a fraction of the route and advanced by dt / trace,
 * not derived from elapsed time, so changing the trace duration mid-trace
 * leaves the drawn line where it is. Boot is the streets plotting on; the
 * route only starts once they are all there.
 */

/** Boot length in seconds; street-pulse uses the same figure. */
export const BOOT_S = 1.6;

export interface Timing {
  /** Seconds for the route to draw, start to end. */
  trace: number;
  /** Seconds to hold the finished route before looping. */
  hold: number;
  loop: boolean;
}

export type Phase = 'boot' | 'trace' | 'hold';

export interface TraceState {
  phase: Phase;
  /** Seconds inside the current phase. */
  t: number;
  /** Drawn share of the route's arc length, 0..1. */
  progress: number;
}

/** `instant` is the reduced-motion start: streets up, route finished. */
export function createTrace(instant: boolean): TraceState {
  return instant
    ? { phase: 'hold', t: 0, progress: 1 }
    : { phase: 'boot', t: 0, progress: 0 };
}

export function stepTrace(s: TraceState, dt: number, tm: Timing): void {
  switch (s.phase) {
    case 'boot':
      s.t += dt;
      if (s.t >= BOOT_S) {
        s.phase = 'trace';
        s.t = 0;
        s.progress = 0;
      }
      return;
    case 'trace':
      s.t += dt;
      s.progress = Math.min(1, s.progress + dt / Math.max(1e-3, tm.trace));
      if (s.progress >= 1) {
        s.phase = 'hold';
        s.t = 0;
      }
      return;
    case 'hold':
      s.t += dt;
      if (tm.loop && s.t >= tm.hold) {
        s.phase = 'trace';
        s.t = 0;
        s.progress = 0;
      }
      return;
  }
}

/** A click: draw the route again. Streets stay; a boot in progress is left alone. */
export function restartTrace(s: TraceState): void {
  if (s.phase === 'boot') return;
  s.phase = 'trace';
  s.t = 0;
  s.progress = 0;
}

/**
 * Cubic bezier easing as CSS defines it: control points (x1,y1), (x2,y2),
 * solved for the parameter at a given x by Newton's method.
 */
export function bezierEase(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): (u: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const dsx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  return (u: number) => {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    let t = u;
    for (let i = 0; i < 8; i++) {
      const d = dsx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= (sx(t) - u) / d;
    }
    return sy(Math.min(1, Math.max(0, t)));
  };
}

/** The strong ease-out the lab uses for entrances. */
export const EASE_OUT = bezierEase(0.23, 1, 0.32, 1);

/** Eased share of the street cells that should be plotted by now. */
export function bootFraction(s: TraceState): number {
  if (s.phase !== 'boot') return 1;
  return EASE_OUT(Math.min(1, s.t / BOOT_S));
}

export function cumulative(
  points: readonly (readonly [number, number])[]
): Float64Array {
  const cum = new Float64Array(points.length);
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    cum[i] = cum[i - 1] + Math.hypot(x1 - x0, y1 - y0);
  }
  return cum;
}

/**
 * The drawn polyline for a progress fraction: every point up to the arc
 * length, then the interpolated head. Zero-length segments (legs joined at
 * a shared point) are stepped over rather than divided by.
 */
export function prefixAt(
  points: readonly (readonly [number, number])[],
  cum: Float64Array,
  frac: number
): [number, number][] {
  const n = points.length;
  if (n === 0) return [];
  const total = cum[n - 1];
  const s = Math.min(1, Math.max(0, frac)) * total;
  const out: [number, number][] = [[points[0][0], points[0][1]]];
  if (s <= 0) return out;
  for (let i = 1; i < n; i++) {
    if (cum[i] <= s) {
      out.push([points[i][0], points[i][1]]);
      if (cum[i] === total) break;
      continue;
    }
    const seg = cum[i] - cum[i - 1];
    const t = seg > 0 ? (s - cum[i - 1]) / seg : 0;
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    break;
  }
  return out;
}

/**
 * Base street alpha for a cell size. Below 3.5 px a cell the dot grid reads
 * as noise behind the route, so it recedes linearly to 0.22 at 2 px.
 */
export function baseAlpha(k: number): number {
  if (k >= 3.5) return 0.42;
  if (k <= 2) return 0.22;
  return 0.22 + ((k - 2) / 1.5) * 0.2;
}
