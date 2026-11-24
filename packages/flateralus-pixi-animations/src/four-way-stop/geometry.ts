/**
 * The corner, in metres. +x is east, +y is north, the box is centred on the
 * origin. Approaches are indexed by where vehicles come FROM: 0 north, 1
 * east, 2 south, 3 west. Right-hand traffic, so the inbound lane of every
 * road is on the driver's right and the outbound lane on the far side.
 *
 * Lanes are one-dimensional on purpose: the traffic is a queueing problem,
 * and the geometry only matters at the crossing, where the twelve box paths
 * are sampled curves and the conflicts between them are measured rather
 * than tabulated.
 */

/** Side of the box, m. */
export const B = 12;
/** Lane centre offset from the road's centreline, m. */
export const LANE = 2.6;
/** Approach lane length, m: how far up the street a queue can reach. */
export const L_APPROACH = 70;
/** Exit lane length, m: a vehicle is removed at the end of it. */
export const L_EXIT = 45;
/** Two paths conflict where they come within this, m. */
export const CONFLICT_R = 2.2;
/** Samples per path. */
const N_SAMPLES = 48;

export type Approach = 0 | 1 | 2 | 3;
export type Turn = 'straight' | 'right' | 'left';
export const APPROACHES: Approach[] = [0, 1, 2, 3];
export const TURNS: Turn[] = ['straight', 'right', 'left'];

export interface Pose {
  x: number;
  y: number;
  /** Unit heading. */
  hx: number;
  hy: number;
}

/** Direction of travel for a vehicle coming from approach `a`. */
export function heading(a: Approach): [number, number] {
  return [
    [0, -1],
    [-1, 0],
    [0, 1],
    [1, 0],
  ][a] as [number, number];
}

/** The driver's right, for a heading. */
export function rightOf(d: [number, number]): [number, number] {
  return [d[1], -d[0]];
}

/** The approach whose outbound lane a vehicle leaves by. */
export function destination(from: Approach, turn: Turn): Approach {
  const k = turn === 'straight' ? 2 : turn === 'right' ? 3 : 1;
  return ((from + k) % 4) as Approach;
}

/** The approach on the driver's right of a vehicle coming from `a`. */
export function approachToRight(a: Approach): Approach {
  return ((a + 3) % 4) as Approach;
}

/** Inbound lane centre at the stop line of approach `a`. */
export function entryPoint(a: Approach): { x: number; y: number } {
  const h = heading(a);
  const r = rightOf(h);
  return { x: -h[0] * (B / 2) + r[0] * LANE, y: -h[1] * (B / 2) + r[1] * LANE };
}

/** Outbound lane centre at the box edge of approach `a`. */
export function exitPoint(a: Approach): { x: number; y: number } {
  const hOut: [number, number] = [-heading(a)[0], -heading(a)[1]];
  const r = rightOf(hOut);
  return {
    x: hOut[0] * (B / 2) + r[0] * LANE,
    y: hOut[1] * (B / 2) + r[1] * LANE,
  };
}

export interface Path {
  from: Approach;
  turn: Turn;
  len: number;
  /** Interleaved x, y samples, N_SAMPLES of them, evenly spaced in arc length. */
  pts: Float32Array;
  /** Interleaved unit headings at the samples. */
  hd: Float32Array;
}

function bezier(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  t: number
): [number, number] {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
}

/**
 * Build one path as a cubic from the entry point, leaving along the inbound
 * heading, to the exit point, arriving along the outbound heading, then
 * resample it evenly in arc length so `pathPose` is a plain lookup.
 */
function buildPath(from: Approach, turn: Turn): Path {
  const dest = destination(from, turn);
  const e = entryPoint(from);
  const x = exitPoint(dest);
  const hIn = heading(from);
  const hOut: [number, number] = [-heading(dest)[0], -heading(dest)[1]];
  const p0: [number, number] = [e.x, e.y];
  const p3: [number, number] = [x.x, x.y];
  const k = turn === 'straight' ? 0 : 0.5 * Math.hypot(x.x - e.x, x.y - e.y);
  const p1: [number, number] = [e.x + hIn[0] * k, e.y + hIn[1] * k];
  const p2: [number, number] = [x.x - hOut[0] * k, x.y - hOut[1] * k];
  // Dense sample, then cumulative length.
  const M = 400;
  const raw: [number, number][] = [];
  const cum = new Float64Array(M + 1);
  for (let i = 0; i <= M; i++) {
    raw.push(bezier(p0, p1, p2, p3, i / M));
    if (i > 0)
      cum[i] =
        cum[i - 1] +
        Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]);
  }
  const len = cum[M];
  const pts = new Float32Array(N_SAMPLES * 2);
  const hd = new Float32Array(N_SAMPLES * 2);
  let j = 0;
  for (let i = 0; i < N_SAMPLES; i++) {
    const s = (i / (N_SAMPLES - 1)) * len;
    while (j < M - 1 && cum[j + 1] < s) j++;
    const seg = cum[j + 1] - cum[j] || 1e-9;
    const t = Math.min(1, Math.max(0, (s - cum[j]) / seg));
    pts[i * 2] = raw[j][0] + (raw[j + 1][0] - raw[j][0]) * t;
    pts[i * 2 + 1] = raw[j][1] + (raw[j + 1][1] - raw[j][1]) * t;
    const dx = raw[j + 1][0] - raw[j][0];
    const dy = raw[j + 1][1] - raw[j][1];
    const m = Math.hypot(dx, dy) || 1;
    hd[i * 2] = dx / m;
    hd[i * 2 + 1] = dy / m;
  }
  return { from, turn, len, pts, hd };
}

/** All twelve box paths, indexed `PATHS[from][turn]`. */
export const PATHS: Record<Approach, Record<Turn, Path>> = [0, 1, 2, 3].map(
  (a) => ({
    straight: buildPath(a as Approach, 'straight'),
    right: buildPath(a as Approach, 'right'),
    left: buildPath(a as Approach, 'left'),
  })
) as unknown as Record<Approach, Record<Turn, Path>>;

/** Position and heading `s` metres along a box path. Clamped. */
export function pathPose(p: Path, s: number): Pose {
  const f = Math.min(1, Math.max(0, s / p.len)) * (N_SAMPLES - 1);
  const i = Math.min(N_SAMPLES - 2, Math.floor(f));
  const t = f - i;
  const k = i * 2;
  const hx = p.hd[k] + (p.hd[k + 2] - p.hd[k]) * t;
  const hy = p.hd[k + 1] + (p.hd[k + 3] - p.hd[k + 1]) * t;
  const m = Math.hypot(hx, hy) || 1;
  return {
    x: p.pts[k] + (p.pts[k + 2] - p.pts[k]) * t,
    y: p.pts[k + 1] + (p.pts[k + 3] - p.pts[k + 1]) * t,
    hx: hx / m,
    hy: hy / m,
  };
}

/** Position on the approach lane, `s` from its start, `L_APPROACH` at the line. */
export function approachPose(from: Approach, s: number): Pose {
  const e = entryPoint(from);
  const h = heading(from);
  const back = L_APPROACH - s;
  return { x: e.x - h[0] * back, y: e.y - h[1] * back, hx: h[0], hy: h[1] };
}

/** Position on the exit lane of `dest`, `s` past the box edge. */
export function exitPose(dest: Approach, s: number): Pose {
  const x = exitPoint(dest);
  const h: [number, number] = [-heading(dest)[0], -heading(dest)[1]];
  return { x: x.x + h[0] * s, y: x.y + h[1] * s, hx: h[0], hy: h[1] };
}

export interface Conflict {
  /** Arc length on the first path where the two come closest. */
  sa: number;
  /** Arc length on the second. */
  sb: number;
}

const conflictCache = new Map<string, Conflict | null>();

/**
 * Where two box paths conflict, measured rather than tabulated: the pair of
 * samples that come closest, if they come within `CONFLICT_R`. Paths from
 * the same approach share a lane and are handled by car-following, so they
 * never conflict here. Two paths into the same exit lane conflict at their
 * ends, which is the merge.
 */
export function conflictBetween(a: Path, b: Path): Conflict | null {
  if (a.from === b.from) return null;
  const key = `${a.from}${a.turn}|${b.from}${b.turn}`;
  const hit = conflictCache.get(key);
  if (hit !== undefined) return hit;
  let best = Infinity;
  let bi = 0;
  let bj = 0;
  for (let i = 0; i < N_SAMPLES; i++) {
    const ax = a.pts[i * 2];
    const ay = a.pts[i * 2 + 1];
    for (let j = 0; j < N_SAMPLES; j++) {
      const dx = ax - b.pts[j * 2];
      const dy = ay - b.pts[j * 2 + 1];
      const d = dx * dx + dy * dy;
      if (d < best) {
        best = d;
        bi = i;
        bj = j;
      }
    }
  }
  const out =
    Math.sqrt(best) < CONFLICT_R
      ? {
          sa: (bi / (N_SAMPLES - 1)) * a.len,
          sb: (bj / (N_SAMPLES - 1)) * b.len,
        }
      : null;
  conflictCache.set(key, out);
  return out;
}
