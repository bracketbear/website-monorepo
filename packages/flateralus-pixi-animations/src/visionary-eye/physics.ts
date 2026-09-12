/**
 * Pure numeric core of the tear film.
 *
 * Everything here is testable without a GL context, which is most of what can
 * be tested at all in this animation. The rest is verified by eye in the Lab —
 * see the spec's testing section.
 *
 * Units: the film lives in corneal-local tangent coordinates, where the eye's
 * surface normal projects to (lx, ly). One tangent unit is about 10.35mm —
 * the cornea's 5.85mm half-chord subtends sin(0.6 rad) = 0.565 units.
 *
 * DERIVED vs TUNED: constants marked DERIVED follow from the stability
 * analysis or the corneal geometry — they are not free to move without
 * redoing that math. Constants marked TUNED were picked by eye against the
 * Lab and can be freely re-tuned; nothing else in this file depends on their
 * exact values the way it depends on the derived ones.
 */

/** Tangent-space domain: (lx, ly) in [-0.6, 0.6]. */
export const DOMAIN = 1.2;

/** Field resolution. Grid size buys patch count; it does NOT buy break-up speed. */
export const GRID = 128;

/** DERIVED. Tangent units per cell. */
export const DELTA = DOMAIN / GRID;

/** Millimetres per tangent unit: 5.85mm cornea half-chord at sin(0.6). */
export const MM_PER_UNIT = 5.85 / Math.sin(0.6);

/**
 * Interface half-width, in cells. This is the load-bearing number: the e-fold
 * time goes as n^4, so it is the only cheap lever on how fast the film tears.
 * Below ~1.5 the front is under-resolved and patches go square.
 */
export const IFACE_CELLS = 2;

/** DERIVED. Gradient-energy coefficient. Interface half-width sqrt(2*kappa) = n cells. */
export const KAPPA = Math.pow(IFACE_CELLS * DELTA, 2) / 2;

/** Fixed simulation step. Spec D3: derived with GRID and IFACE_CELLS, not chosen. */
export const STEP = 1 / 480;

/**
 * TUNED. Fraction of the stability limit the mobility is allowed to use.
 *
 * Not 1.0: the field is stored at half-float precision in the worst case,
 * and rounding in h must not be able to push the effective mobility over
 * the limit mid-run. 0.6 leaves enough headroom below the hard limit that
 * rounding can't tip it over.
 */
export const SAFETY = 0.6;

/**
 * DERIVED. Explicit-Euler stability limit for the biharmonic term
 * -M*kappa*grad^4.
 *
 * The 5-point Laplacian has eigenvalues in [-8/d^2, 0], so grad^4 = (grad^2)^2
 * reaches 64/d^4. The amplification factor 1 - dt*M*kappa*lambda stays inside
 * [-1, 1] while dt*M*kappa*64/d^4 <= 2, giving M <= d^4 / (32*dt*kappa).
 *
 * Enforced here and not only in the manifest, so a randomize-all cannot
 * detonate the integrator.
 */
export function mobilityLimit(): number {
  return Math.pow(DELTA, 4) / (32 * STEP * KAPPA);
}

/** DERIVED. SAFETY held below mobilityLimit(); see both for the reasoning. */
export const MOBILITY = SAFETY * mobilityLimit();

export function clampMobility(m: number): number {
  if (!Number.isFinite(m)) return MOBILITY;
  return Math.min(mobilityLimit(), Math.max(1e-6, m));
}

/**
 * DERIVED. e-fold time of the spinodal instability, in seconds.
 *
 * sigma_max = M/(4*kappa) at f'' = -1, and with M = s*M_limit this collapses
 * to 32*dt*n^4/s — independent of grid size. Refining the grid to make
 * break-up faster does nothing; only dt and the interface width move it.
 */
export function efoldSeconds(): number {
  return (32 * STEP * Math.pow(IFACE_CELLS, 4)) / SAFETY;
}

/** DERIVED. Fastest-growing wavelength, 2*pi*sqrt(2*kappa), in tangent units. */
export function patchWavelength(): number {
  return 2 * Math.PI * Math.sqrt(2 * KAPPA);
}

/**
 * TUNED. Evaporation, h per second, chosen for the resulting blink cadence.
 *
 * Time to reach the spinodal from a fresh film is 1/EVAP = 2s. Against the
 * 1.78s e-fold (efoldSeconds()) and the ~3.5 e-folds needed to grow a 3%
 * seed to O(1) (~6.2s), that composes to a blink cycle near 7s.
 *
 * This is the single named lever for blink cadence. Spec D6 forbids adding
 * an interval floor or ceiling to the blink state machine, so if the
 * cadence ever needs to change, move EVAP and only EVAP — nothing else in
 * this file is meant to absorb that adjustment.
 */
export const EVAP = 0.5;

/**
 * TUNED. Seconds of real steps run at build time, so the eye loads mid-cycle
 * rather than as a mirror. Spec D11.
 *
 * **Coupled to EVAP.** Transport is conservative under the Neumann boundary,
 * so it integrates to zero and the spatial mean obeys d<h>/dt = -EVAP exactly
 * while there is film left to evaporate. From a fresh film at <h> = +1 that
 * means the mean enters the spinodal at 1/(2*EVAP) = 1s, peaks at 1/EVAP = 2s
 * and reaches the dry well at 2/EVAP = 4s. Priming past 2/EVAP hands the
 * viewer a uniformly dry field on the first frame — a black disc, which reads
 * as a dead shader and is not one.
 *
 * So: PRIME_SECONDS must stay below 2/EVAP, and 2.2s puts first paint inside
 * the window where patches have formed but film still remains. If EVAP moves
 * to re-cadence the blink, this moves with it; the test pins the invariant.
 */
export const PRIME_SECONDS = 2.2;

/** TUNED. Downward drain, 1.5 cells/s, tuned by eye — not derived. */
export const GRAVITY = 1.5 * DELTA;

/** Corneal cap half-angle. The existing limbus sits at ang = 0.56. */
export const CORNEA_ANG = 0.6;

/** DERIVED. Tangent radius of the cap. */
export const CORNEA_L = Math.sin(CORNEA_ANG);

/** DERIVED. Iris plane depth behind the corneal apex: 3.6mm in tangent units. */
export const IRIS_DEPTH = 3.6 / MM_PER_UNIT;

/** Reduction target edge. 64 texels is one small readback instead of 128KB. */
export const REDUCE = 8;

/** h at or below this counts as torn. The wells sit at +1 and -1. */
export const DRY_H = -0.3;

/** Tangent-space centre of reduction tile (i, j). */
function tileCentre(i: number, j: number, size: number): [number, number] {
  const s = DOMAIN / size;
  return [-DOMAIN / 2 + (i + 0.5) * s, -DOMAIN / 2 + (j + 0.5) * s];
}

export function tileInsideCornea(i: number, j: number, size: number): boolean {
  const [x, y] = tileCentre(i, j, size);
  return Math.hypot(x, y) <= CORNEA_L;
}

/**
 * Fraction of the cornea that has torn, from the per-tile minima of h.
 *
 * Minima and not means: a tile is torn as soon as any part of it is, which is
 * what makes the measurement responsive to a patch opening rather than to the
 * whole film sagging.
 */
export function breakupFraction(
  tileMin: Float32Array,
  size: number = REDUCE
): number {
  let on = 0;
  let dry = 0;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      if (!tileInsideCornea(i, j, size)) continue;
      on++;
      if (tileMin[j * size + i] <= DRY_H) dry++;
    }
  }
  return on === 0 ? 0 : dry / on;
}

/** TUNED. Corneal break-up share that triggers a blink, picked by eye. */
export const BLINK_FRACTION = 0.35;

/**
 * TUNED. Minimum seconds between blinks, picked by eye.
 *
 * Exists so a measurement sitting on BLINK_FRACTION cannot itself produce a
 * chattering lid — it is a debounce on the trigger, not a cadence control.
 */
export const REFRACTORY = 1.5;

/**
 * TUNED. Lid travel, in seconds. Physiological, not derived: real blinks
 * close in roughly 100ms and take roughly 150-200ms to come back up.
 */
export const CLOSE_TIME = 0.1;
export const OPEN_TIME = 0.18;

export type LidPhase = 'open' | 'closing' | 'opening';

export interface BlinkState {
  phase: LidPhase;
  /** Seconds elapsed inside the current phase. */
  t: number;
  /** Seconds since the last blink began. */
  since: number;
}

export function newBlinkState(): BlinkState {
  return { phase: 'open', t: 0, since: REFRACTORY };
}

/**
 * Advance the lid.
 *
 * The only input is the measured break-up fraction. There is deliberately no
 * interval here: if the cadence comes out wrong, the lever is EVAP. A clamped
 * interval would be a timer wearing the simulation's clothes.
 */
export function stepBlink(
  s: BlinkState,
  dt: number,
  fraction: number
): BlinkState {
  const t = s.t + dt;
  const since = s.since + dt;
  switch (s.phase) {
    case 'open':
      if (fraction > BLINK_FRACTION && since >= REFRACTORY) {
        return { phase: 'closing', t: 0, since: 0 };
      }
      return { phase: 'open', t, since };
    case 'closing':
      return t >= CLOSE_TIME
        ? { phase: 'opening', t: 0, since }
        : { phase: 'closing', t, since };
    case 'opening':
      return t >= OPEN_TIME
        ? { phase: 'open', t: 0, since }
        : { phase: 'opening', t, since };
  }
}

/** 0 fully open, 1 fully closed. Smoothstepped so the lid eases at both ends. */
export function lidCoverage(s: BlinkState): number {
  const u =
    s.phase === 'closing'
      ? Math.min(1, s.t / CLOSE_TIME)
      : s.phase === 'opening'
        ? 1 - Math.min(1, s.t / OPEN_TIME)
        : 0;
  return u * u * (3 - 2 * u);
}

/** Is the lid travelling, and therefore laying film? */
export function isWiping(s: BlinkState): boolean {
  return s.phase !== 'open';
}

type V3 = [number, number, number];

function norm3(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function cross3(a: V3, b: V3): V3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/**
 * The corneal-local basis, constructed exactly as the display shader does at
 * sdf-harness.ts:280-281. If these two drift apart the film drains sideways,
 * so the shader's version is the specification and this mirrors it.
 */
export function gazeFrame(gx: number, gy: number): { tx: V3; ty: V3; gd: V3 } {
  const gd = norm3([gx * 0.8, gy * 0.8, 1]);
  const tx = norm3(cross3([0, 1, 0], gd));
  const ty = cross3(gd, tx);
  return { tx, ty, gd };
}

/** Project a world-plane direction onto the corneal tangent basis. */
export function worldToLocal(
  wx: number,
  wy: number,
  gx: number,
  gy: number
): [number, number] {
  const { tx, ty } = gazeFrame(gx, gy);
  return [wx * tx[0] + wy * tx[1], wx * ty[0] + wy * ty[1]];
}
