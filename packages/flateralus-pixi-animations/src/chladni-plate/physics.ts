/**
 * Pure numeric core of the Chladni plate.
 *
 * Everything here is testable without a GL context, which is most of what
 * can be tested at all in this animation. The rest is verified by eye in the
 * Lab — see the spec's testing section.
 */

/** Simulation step in seconds. Spec D3a: fixed by the dispersion relation, not by taste. */
export const STEP = 1 / 1200;

/** Plate grid. Square and canvas-independent: the plate is an object, not a full-bleed field. */
export const GRID = 128;

/** Grain texture edge. GRAIN_N grains total. */
export const GRAIN_TEX = 256;
export const GRAIN_N = GRAIN_TEX * GRAIN_TEX;

export const TAU = Math.PI * 2;

/**
 * Stability limit of the leapfrog biharmonic. The scheme is stable while
 * beta * lambda_max <= 4; the discrete 5-point grad^2 has eigenvalues in
 * [-8, 0], so grad^4 = (grad^2)^2 has eigenvalues in [0, 64], giving
 * beta <= 1/16. This sits below that with margin, and it is enforced here
 * rather than only in the manifest so a randomize-all cannot detonate the
 * integrator.
 */
export const BETA_MAX = 0.05;

const BETA_DEFAULT = 0.04;

export function clampStiffness(beta: number): number {
  if (!Number.isFinite(beta)) return BETA_DEFAULT;
  return Math.min(BETA_MAX, Math.max(0.002, beta));
}

/**
 * Drive band in radians per step. At 1200 steps/s this is roughly 1.2 Hz to
 * 11.1 Hz, which brackets the legible modes of a 128-cell plate: m = 8
 * half-waves sits at 0.00769 and m = 22 at 0.05691, and the band has to
 * contain both ends or the cursor sweeps past nothing at the top.
 */
export const OMEGA_MIN = 0.006;
export const OMEGA_MAX = 0.058;

/**
 * Cursor x to drive frequency, linearly.
 *
 * Linear is the correct map here and the reflex choice from audio — a
 * geometric sweep — is wrong. For a Kirchhoff plate omega goes as k^2 while
 * the 2D mode count below k goes as k^2, so the number of modes below omega
 * grows linearly in omega: plate modes are uniformly dense in frequency. A
 * linear sweep meets them at a steady rate; a geometric one would crowd them
 * all into one end of the cursor's travel.
 */
export function driveOmega(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return OMEGA_MIN + (OMEGA_MAX - OMEGA_MIN) * t;
}

/**
 * Keep the drive phase in [0, TAU). The phase is integrated rather than
 * computed from a clock: this forcing is coherent, so a discontinuity is an
 * impulse that would ring every mode at once.
 */
export function wrapPhase(phase: number): number {
  const p = phase % TAU;
  return p < 0 ? p + TAU : p;
}

/**
 * Per-step decay multiplier from a ring-down time in seconds.
 *
 * The raw multiplier lives in 0.9999-0.99999 at this step rate, which is not
 * a number anyone can tune by hand. Seconds are, and they expose what
 * actually matters for the hunt: Q is roughly omega * ringTime / STEP / 2.
 */
export function decayPerStep(ringTime: number): number {
  return Math.exp(-STEP / Math.max(0.05, ringTime));
}

/**
 * Envelope blend factor: three drive periods.
 *
 * A fixed step count cannot work across a sweep spanning three octaves — it
 * would be most of a period at the bottom and dozens at the top. Tying it to
 * omega keeps "how hard is this spot shaking" meaning the same thing
 * everywhere in the band.
 */
export function envelopeAlpha(omega: number): number {
  return Math.min(0.5, omega / (TAU * 3));
}

/**
 * Mode frequency of the discrete scheme in radians per step, for wavenumber
 * k in radians per cell. This is the exact discrete relation, not the
 * continuum sqrt(beta) * k^2 approximation it tends toward at small k.
 */
export function modeOmega(beta: number, k: number): number {
  const s = Math.sin(k / 2);
  return Math.sqrt(beta * 16 * s * s * s * s);
}
