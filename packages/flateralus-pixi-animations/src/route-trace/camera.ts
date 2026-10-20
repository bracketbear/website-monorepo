import { bezierEase, pointAt, progressAt } from './trace';
import type { Beats } from './trace';

/**
 * The route-trace camera, the same move as the LinkedIn teaser: close on
 * the lobby, following the runner out to the turn, then pulling back to
 * the whole route, landed two beats after the runner is home.
 *
 * The follow is a pair of critically damped springs, simulated once and
 * sampled by time, so the frame is a pure lookup. They chase a point just
 * ahead of the runner, which cancels most of a soft spring's lag, and they
 * round off the route's corners instead of copying them. The pull-back is a
 * tween rather than a spring so it ends on a known beat.
 */

/** Where the camera looks, in grid cells, and its scale in pixels a cell. */
export interface View {
  cx: number;
  cy: number;
  k: number;
}

/** Follow stiffness, rad/s. A spring this soft trails by about 2/ω ≈ 0.48 s... */
export const FOLLOW_W = 4.2;
/** ...so it chases the point this many seconds ahead on the route. */
export const LEAD_S = 0.45;
const DT = 1 / 240;
/** easeInOutCubic: the pull-back leaves and lands at rest. */
const EASE_ZOOM = bezierEase(0.65, 0, 0.35, 1);

export interface CameraSpec {
  points: readonly (readonly [number, number])[];
  cum: Float64Array;
  turnFrac: number;
  beats: Beats;
  /** Pixels a cell while following the runner. */
  close: number;
  /** The frame the camera lands on: the whole route. */
  wide: View;
  /**
   * A second run starts wide and pushes in to the lobby over bar 1, while
   * the first run opens on the lobby. `still` never leaves the wide frame:
   * the reduced-motion camera.
   */
  mode: 'first' | 'replay' | 'still';
}

export function cameraTrack(spec: CameraSpec): (t: number) => View {
  const { points, cum, turnFrac, beats: b, close, wide, mode } = spec;
  if (mode === 'still' || points.length === 0) return () => ({ ...wide });

  const l0 = Math.log(close);
  const l1 = Math.log(wide.k);
  // Share of the way from following to the wide frame.
  const wideness = (t: number): number => {
    if (mode === 'replay' && t < b.boot) return 1 - EASE_ZOOM(t / b.boot);
    return EASE_ZOOM((t - b.turn) / (b.landed - b.turn));
  };

  const table: number[] = [];
  let [cx, cy] = points[0];
  let vx = 0;
  let vy = 0;
  const w = FOLLOW_W;
  for (let t = 0; t <= b.landed + DT; t += DT) {
    const z = wideness(t);
    table.push(
      cx + (wide.cx - cx) * z,
      cy + (wide.cy - cy) * z,
      l0 + (l1 - l0) * z
    );
    const [hx, hy] = pointAt(points, cum, progressAt(t + LEAD_S, b, turnFrac));
    vx += (w * w * (hx - cx) - 2 * w * vx) * DT;
    vy += (w * w * (hy - cy) - 2 * w * vy) * DT;
    cx += vx * DT;
    cy += vy * DT;
  }

  const last = table.length / 3 - 1;
  return (t: number): View => {
    if (!(t < b.landed)) return { ...wide };
    const f = Math.min(last - 1e-6, Math.max(0, t / DT));
    const i = Math.floor(f);
    const u = f - i;
    const at = (j: number) =>
      table[i * 3 + j] + (table[i * 3 + 3 + j] - table[i * 3 + j]) * u;
    return { cx: at(0), cy: at(1), k: Math.exp(at(2)) };
  };
}
