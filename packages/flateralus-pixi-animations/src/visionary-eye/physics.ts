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
 * TUNED, but bounded from above. Evaporation, h per second.
 *
 * EVAP does two jobs and they pull against each other. It sets the blink
 * cadence — the cycle runs about 2/EVAP plus the growth time, so ~7.9s here —
 * and it sets how long the mean spends inside the spinodal band, because the
 * mean crosses that band at exactly this rate.
 *
 * The second job sets a ceiling. availableEfolds() goes as 1/EVAP, so a fast
 * traverse leaves a disturbance no time to grow — but the dependence is so
 * weak that EVAP cannot be the lever that makes the film tear: reaching three
 * e-folds this way needs EVAP near 0.018 and a two-minute blink cycle. The
 * structure comes from SEED_AMPLITUDE instead, and EVAP is left to do the job
 * it is actually good at.
 *
 * 0.20 gives a ~10s traverse and a blink cycle near 8s. It remains the single
 * named lever for cadence — spec D6 forbids an interval floor or ceiling on
 * the blink state machine — but note it also moves PRIME_SECONDS, which has
 * to stay inside the window where patches are formed and film remains.
 */
export const EVAP = 0.2;

/**
 * Amplitude of the imperfection the fresh film is laid with, by SEED_FRAG and
 * later by the blink splat. **Must agree with the shader** — film.ts
 * interpolates this constant into the GLSL rather than repeating the number,
 * so they cannot drift.
 *
 * 0.6 is not a perturbation, and it is not meant to be. availableEfolds()
 * below says the traverse can amplify a disturbance by at most ~1.3x, so
 * **the seed has to carry the structure** — there is no regime on this grid
 * and this step where a small seed grows into patches. Spec D4 already says
 * the lid lays an imperfect film; this is that sentence taken literally
 * rather than decoratively, and it matches how real break-up works, nucleated
 * at mucin defects and lid-wiper irregularities at sites that repeat in the
 * same eye rather than emerging from noise.
 *
 * Measured on a CPU reference of the exact two-pass arithmetic: peak spread
 * 0.19 at seed 0.25, 0.34 at 0.40, 0.55 at 0.60. 0.6 is the smallest value
 * whose patches reach an amplitude that reads.
 */
export const SEED_AMPLITUDE = 0.6;

/**
 * DERIVED. Seconds the mean spends inside the spinodal band, where f''(h) < 0
 * and patches can grow at all. The band is |h| < 1/sqrt(3) and the mean
 * crosses it at rate EVAP.
 *
 * NOTE: this is *not* the growth budget, and reading it as one is the mistake
 * that cost this task two rounds. See availableEfolds().
 */
export function spinodalResidence(): number {
  return 2 / Math.sqrt(3) / EVAP;
}

/**
 * DERIVED. Maximum e-folds any disturbance can collect on the way down.
 *
 * The obvious estimate — `spinodalResidence() / efoldSeconds()` — is wrong by
 * a factor of about 5, and both of the ways it is wrong are invisible until
 * you integrate:
 *
 * 1. **sigma_max is instantaneous.** `M/(4*kappa)` is reached only at h = 0,
 *    but f''(h) = 3h^2 - 1 varies across the whole traverse and a fixed
 *    wavelength also pays the kappa*k^2 penalty at every moment.
 * 2. **The seed is damped before it ever reaches the band.** From h = 1 down
 *    to 1/sqrt(3) the film is *stable*, so the disturbance is actively
 *    suppressed on the way in. Nobody rediscovers this by staring at the
 *    equations: it shows up as the seed spread falling 0.024 -> 0.014 before
 *    any growth starts, and it is why lowering EVAP helps far less than it
 *    looks like it should — a slower traverse damps for longer too.
 *
 * Integrating sigma(k, t) = -M*k^2*(3h^2 - 1 + kappa*k^2) along h = 1 - E*t
 * from the start of the traverse, and taking the maximum over both the fixed
 * wavelength and the stopping time, gives a closed form:
 *
 *     G = C * M / (kappa * EVAP),  C = max_x x*((2/(3*sqrt(3)))*(1-x)^1.5 - x)
 *
 * where x = kappa*k^2. C = 0.0237555 at x = 0.12419. Note what this says: the
 * net gain over a *complete* traverse from +1 to -1 is always negative — the
 * damping on the way in and out exactly cancels the growth in the middle and
 * then some — so break-up is a transient that has to be caught mid-traverse.
 * That is what PRIME_SECONDS is for.
 *
 * Here G = 0.267, a gain of 1.31x. It is an upper bound: it assumes every bit
 * of the seed sits at the single best wavelength. The CPU reference measures
 * 1.09x for the actual three-octave seed.
 */
export const TRANSIENT_GAIN_C = 0.0237555;

export function availableEfolds(): number {
  return (TRANSIENT_GAIN_C * MOBILITY) / (KAPPA * EVAP);
}

/**
 * TUNED. Seconds of real steps run at build time, so the eye loads mid-cycle
 * rather than as a mirror. Spec D11.
 *
 * **This is the transient-catcher.** availableEfolds() shows the net gain over
 * a full traverse is negative, so there is no steady state worth showing:
 * break-up is a window, and priming is what lands the viewer inside it.
 *
 * Transport is conservative under the Neumann boundary, so the spatial mean
 * obeys d<h>/dt = -EVAP while film remains. Measured on the CPU reference at
 * SEED_AMPLITUDE = 0.6, EVAP = 0.2 (t, mean, spread, fraction below DRY_H):
 *
 *     3.0   0.096  0.504   0.0%   patches visible, nothing torn yet
 *     4.0  -0.093  0.603   2.3%   first patches reach the dry threshold
 *     4.5  -0.177  0.641  11.5%   <- here: strongest contrast, film remains
 *     5.5  -0.319  0.666  57.9%   past half the cornea, blink is overdue
 *     7.0  -0.469  0.548  98.3%   effectively all dry, contrast collapsing
 *
 * 4.5s is where the patches are darkest against film that is still light —
 * grey 0.24 against 0.56 on the debug ramp — and it leaves headroom before
 * the break-up fraction crosses BLINK_FRACTION. Too late and the viewer gets
 * a uniformly dry field on the first frame, which reads as a dead shader and
 * is not one. If EVAP or SEED_AMPLITUDE moves, re-run the sweep; the test
 * pins the outer bounds but only measurement finds the best point inside.
 */
export const PRIME_SECONDS = 4.5;

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
