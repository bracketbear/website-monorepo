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
 */

/** Tangent-space domain: (lx, ly) in [-0.6, 0.6]. */
export const DOMAIN = 1.2;

/** Field resolution. Grid size buys patch count; it does NOT buy break-up speed. */
export const GRID = 128;

/** Tangent units per cell. */
export const DELTA = DOMAIN / GRID;

/** Millimetres per tangent unit: 5.85mm cornea half-chord at sin(0.6). */
export const MM_PER_UNIT = 5.85 / Math.sin(0.6);

/**
 * Interface half-width, in cells. This is the load-bearing number: the e-fold
 * time goes as n^4, so it is the only cheap lever on how fast the film tears.
 * Below ~1.5 the front is under-resolved and patches go square.
 */
export const IFACE_CELLS = 2;

/** Gradient-energy coefficient. Interface half-width sqrt(2*kappa) = n cells. */
export const KAPPA = Math.pow(IFACE_CELLS * DELTA, 2) / 2;

/** Fixed simulation step. Spec D3: derived with GRID and IFACE_CELLS, not chosen. */
export const STEP = 1 / 480;

/** Fraction of the stability limit the mobility is allowed to use. */
export const SAFETY = 0.6;

/**
 * Explicit-Euler stability limit for the biharmonic term -M*kappa*grad^4.
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

export const MOBILITY = SAFETY * mobilityLimit();

export function clampMobility(m: number): number {
  if (!Number.isFinite(m)) return MOBILITY;
  return Math.min(mobilityLimit(), Math.max(1e-6, m));
}

/**
 * e-fold time of the spinodal instability, in seconds.
 *
 * sigma_max = M/(4*kappa) at f'' = -1, and with M = s*M_limit this collapses
 * to 32*dt*n^4/s — independent of grid size. Refining the grid to make
 * break-up faster does nothing; only dt and the interface width move it.
 */
export function efoldSeconds(): number {
  return (32 * STEP * Math.pow(IFACE_CELLS, 4)) / SAFETY;
}

/** Fastest-growing wavelength, 2*pi*sqrt(2*kappa), in tangent units. */
export function patchWavelength(): number {
  return 2 * Math.PI * Math.sqrt(2 * KAPPA);
}

/** Evaporation, h per second. Time to reach the spinodal from a fresh film is 1/EVAP. */
export const EVAP = 0.5;

/** Downward drain, tangent units per second. 1.5 cells/s. */
export const GRAVITY = 1.5 * DELTA;

/** Corneal cap half-angle. The existing limbus sits at ang = 0.56. */
export const CORNEA_ANG = 0.6;

/** Tangent radius of the cap. */
export const CORNEA_L = Math.sin(CORNEA_ANG);

/** Iris plane depth behind the corneal apex: 3.6mm in tangent units. */
export const IRIS_DEPTH = 3.6 / MM_PER_UNIT;
