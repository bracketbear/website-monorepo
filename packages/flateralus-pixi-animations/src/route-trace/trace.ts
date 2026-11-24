/**
 * The route-trace clock and geometry, with no PIXI in it.
 *
 * Everything sits on a beat grid, the same one as the LinkedIn teaser, so
 * the page and the video move alike. The pin drops on the first downbeat;
 * a beat later the streets grow out from it through the rest of the bar;
 * the runner takes two bars out to the turn and two bars home; the camera
 * has finished pulling back two beats after that.
 */

/** Tempo in beats per minute; 4/4. */
export const BPM = 125;

/** The timeline in seconds, from the pin's downbeat. */
export interface Beats {
  beat: number;
  /** End of bar 1: the streets are up and the runner leaves. */
  boot: number;
  /** End of bar 3: the turnaround, where the camera starts pulling out. */
  turn: number;
  /** End of bar 5: the runner is home. */
  home: number;
  /** Two beats later the camera has landed on the whole route. */
  landed: number;
}

export function beats(bpm: number = BPM): Beats {
  const beat = 60 / Math.max(1, bpm);
  const bar = beat * 4;
  return {
    beat,
    boot: bar,
    turn: bar * 3,
    home: bar * 5,
    landed: bar * 5 + beat * 2,
  };
}

export interface Timing {
  bpm: number;
  /** Seconds to hold once the camera has landed, before looping. */
  hold: number;
  loop: boolean;
}

export interface TraceState {
  /** Seconds since this run's downbeat. */
  t: number;
  /**
   * A second run: the streets are already up and the pin already planted,
   * so bar 1 is the camera pushing back in to the lobby instead.
   */
  replay: boolean;
  /**
   * The viewer asked for less motion: the route starts finished and never
   * loops on its own, and the camera never moves. A click still traces
   * once, because they asked.
   */
  reduced: boolean;
}

/** `instant` is the reduced-motion start: streets up, route finished. */
export function createTrace(instant: boolean): TraceState {
  return instant
    ? { t: Infinity, replay: true, reduced: true }
    : { t: 0, replay: false, reduced: false };
}

export function stepTrace(s: TraceState, dt: number, tm: Timing): void {
  s.t += dt;
  if (tm.loop && !s.reduced && s.t >= beats(tm.bpm).landed + tm.hold) {
    s.t = 0;
    s.replay = true;
  }
}

/** A click: run it again. The opening bar, streets still booting, is left alone. */
export function restartTrace(s: TraceState, bpm: number = BPM): void {
  if (!s.replay && s.t < beats(bpm).boot) return;
  s.t = 0;
  s.replay = true;
}

/**
 * Drawn share of the route at time `t`. Each leg gets two bars at its own
 * constant pace, so the turn lands on the bar-4 downbeat and home on bar 6.
 */
export function progressAt(t: number, b: Beats, turnFrac: number): number {
  if (t <= b.boot) return 0;
  if (t <= b.turn) return ((t - b.boot) / (b.turn - b.boot)) * turnFrac;
  if (t >= b.home) return 1;
  return turnFrac + ((t - b.turn) / (b.home - b.turn)) * (1 - turnFrac);
}

/** The inverse: when the runner reaches a share of the route. */
export function arrivalAt(frac: number, b: Beats, turnFrac: number): number {
  return frac <= turnFrac
    ? b.boot + (turnFrac > 0 ? frac / turnFrac : 0) * (b.turn - b.boot)
    : b.turn + ((frac - turnFrac) / (1 - turnFrac)) * (b.home - b.turn);
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

/** The point at a share of the route's arc length. */
export function pointAt(
  points: readonly (readonly [number, number])[],
  cum: Float64Array,
  frac: number
): [number, number] {
  const n = points.length;
  if (n === 0) return [0, 0];
  const s = Math.min(1, Math.max(0, frac)) * cum[n - 1];
  let i = 1;
  while (i < n - 1 && cum[i] < s) i++;
  if (n === 1) return [points[0][0], points[0][1]];
  const seg = cum[i] - cum[i - 1];
  const u = seg > 0 ? Math.min(1, Math.max(0, (s - cum[i - 1]) / seg)) : 0;
  return [
    points[i - 1][0] + (points[i][0] - points[i - 1][0]) * u,
    points[i - 1][1] + (points[i][1] - points[i - 1][1]) * u,
  ];
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

/**
 * One step of the route onto the grid: the runner arrives at `cell` when the
 * drawn share of the route reaches `frac`. `first` marks the arrival that
 * turns the cell from street to route; an out-and-back passes most cells
 * twice, and the second arrival only bounces it again.
 */
export interface RouteHit {
  cell: number;
  frac: number;
  first: boolean;
}

/**
 * The route as the street cells it runs over, in the order the runner
 * reaches them. The baked polyline is not cell-aligned (it often runs down
 * the seam of a two-cell street), so each sample along the arc snaps to the
 * nearest `road` cell centre within `reach`, falling back to the cell under
 * it. Hysteresis keeps the current cell until another is clearly nearer, so
 * a seam does not flicker between its two columns.
 */
export function routeHits(
  points: readonly (readonly [number, number])[],
  cum: Float64Array,
  cells: ArrayLike<number>,
  g: number,
  road: number,
  step = 0.25,
  reach = 1.5
): RouteHit[] {
  const n = points.length;
  const total = n ? cum[n - 1] : 0;
  const out: RouteHit[] = [];
  if (total <= 0) return out;
  const seen = new Set<number>();
  let last = -1;
  let seg = 1;
  const HYST = 0.35;
  for (let s = 0; s <= total + 1e-9; s += step) {
    const at = Math.min(s, total);
    while (seg < n - 1 && cum[seg] < at) seg++;
    const len = cum[seg] - cum[seg - 1];
    const u = len > 0 ? (at - cum[seg - 1]) / len : 0;
    const x = points[seg - 1][0] + (points[seg][0] - points[seg - 1][0]) * u;
    const y = points[seg - 1][1] + (points[seg][1] - points[seg - 1][1]) * u;

    const dist = (i: number) =>
      Math.hypot((i % g) + 0.5 - x, Math.floor(i / g) + 0.5 - y);
    let best = -1;
    let bestD = reach;
    for (let cy = Math.floor(y) - 2; cy <= Math.floor(y) + 2; cy++) {
      for (let cx = Math.floor(x) - 2; cx <= Math.floor(x) + 2; cx++) {
        if (cx < 0 || cy < 0 || cx >= g || cy >= g) continue;
        const i = cy * g + cx;
        if (cells[i] !== road) continue;
        const d = dist(i);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
    }
    if (best < 0) {
      const fx = Math.min(g - 1, Math.max(0, Math.floor(x)));
      const fy = Math.min(g - 1, Math.max(0, Math.floor(y)));
      best = fy * g + fx;
      bestD = dist(best);
    }
    if (last >= 0 && best !== last && dist(last) < bestD + HYST) best = last;
    if (best === last) continue;
    // A snap can skip a cell (a seam changing columns, a diagonal); step
    // through the cells between so the drawn route never has a hole.
    if (last >= 0) {
      const ax = last % g;
      const ay = Math.floor(last / g);
      const gap = Math.max(
        Math.abs((best % g) - ax),
        Math.abs(Math.floor(best / g) - ay)
      );
      const prev = out[out.length - 1].frac;
      for (let j = 1; j < gap; j++) {
        const cx = Math.round(ax + (((best % g) - ax) * j) / gap);
        const cy = Math.round(ay + ((Math.floor(best / g) - ay) * j) / gap);
        const i = cy * g + cx;
        const frac = prev + ((at / total - prev) * j) / gap;
        out.push({ cell: i, frac, first: !seen.has(i) });
        seen.add(i);
      }
    }
    out.push({ cell: best, frac: at / total, first: !seen.has(best) });
    seen.add(best);
    last = best;
  }
  return out;
}

/** Seconds a cell's bounce takes to settle. */
export const BOUNCE_S = 0.5;

/**
 * A cell's bounce as it turns: the displacement of a spring released from
 * rest with an upward kick (Apple-style, duration 0.5 s, bounce 0.3), scaled
 * so the peak is 1. It rises, settles back past zero by a hair, and rests.
 * Zero before the arrival and once settled.
 */
const BOUNCE_W = (2 * Math.PI) / BOUNCE_S;
const BOUNCE_Z = 1 - 0.3;
const BOUNCE_WD = BOUNCE_W * Math.sqrt(1 - BOUNCE_Z * BOUNCE_Z);
const bounceRaw = (t: number) =>
  Math.exp(-BOUNCE_Z * BOUNCE_W * t) * Math.sin(BOUNCE_WD * t);
const BOUNCE_PEAK = bounceRaw(
  Math.atan(Math.sqrt(1 - BOUNCE_Z * BOUNCE_Z) / BOUNCE_Z) / BOUNCE_WD
);
export function bounce(age: number): number {
  if (age <= 0 || age >= BOUNCE_S * 2) return 0;
  return bounceRaw(age) / BOUNCE_PEAK;
}
