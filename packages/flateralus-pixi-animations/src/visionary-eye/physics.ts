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

/**
 * Field resolution. Grid size buys patch count; it does NOT buy break-up
 * speed — and, less obviously, it does not buy growth either. Substituting
 * MOBILITY into availableEfolds() gives
 *
 *     availableEfolds = C * SAFETY / (8 * dt * n^4 * EVAP)
 *
 * in which GRID does not appear at all. So a *coarser* grid is free as far as
 * break-up is concerned, and it is what pays for the finer timestep below.
 */
export const GRID = 96;

/** DERIVED. Tangent units per cell. */
export const DELTA = DOMAIN / GRID;

/** Millimetres per tangent unit: 5.85mm cornea half-chord at sin(0.6). */
export const MM_PER_UNIT = 5.85 / Math.sin(0.6);

/**
 * Interface half-width, in cells. The load-bearing number: everything about
 * growth goes as n^-4, so this is by far the strongest lever in the file.
 *
 * **The invariant to protect when changing it is `IFACE_CELLS * DELTA`**, the
 * interface width in *tangent units*. KAPPA, patchWavelength() and therefore
 * the ~9.6 patches across the cornea all depend on that product and not on
 * either factor alone. Going from (128, 2.0) to (96, 1.5) holds it at exactly
 * 0.01875 — identical physics, identical patch size — while cutting n^4 from
 * 16 to 5.06 and winning 3.2x of growth budget for free. That trade is the
 * whole reason this file's grid is 96 and not 128.
 *
 * 1.5 is the floor: below it the front is under-resolved and patches go
 * square. Measured on the CPU reference, 1.5 does cost some isotropy — the
 * 4-fold anisotropy of the interface normals runs ~0.22 against ~0.09 at
 * n = 2 — which is a mild grid preference, not square patches. Do not go
 * lower without looking at the patches.
 */
export const IFACE_CELLS = 1.5;

/** DERIVED. Gradient-energy coefficient. Interface half-width sqrt(2*kappa) = n cells. */
export const KAPPA = Math.pow(IFACE_CELLS * DELTA, 2) / 2;

/**
 * Fixed simulation step. Spec D3: derived with GRID and IFACE_CELLS, not
 * chosen.
 *
 * Growth goes as 1/dt, because a finer step raises the stability ceiling on
 * MOBILITY proportionally. Together with n = 1.5 this is what takes
 * availableEfolds() from 0.27 — where the film provably cannot tear at any
 * seed — to 2.99, where it separates to the full depth of the well.
 *
 * The cost is 96*96*2*1700 = 31.3M fragments/s at 28.3 substeps per 60fps
 * frame, against 15.7M and 8 substeps for the 128/480 pair it replaces. The
 * coarser grid pays for most of the finer step: 11x the growth for 2x the
 * cost.
 */
export const STEP = 1 / 1700;

/**
 * DERIVED. Ceiling on substeps per frame, so a slow frame degrades instead of
 * spiralling.
 *
 * 1.5x what a 60fps frame needs, which is the ratio the original 12-step cap
 * had to its own 8. The harness clamps its own dt to 0.05s, so this is also
 * half of the most a single frame can ever ask for: at 20fps the film runs at
 * half speed rather than taking the frame time with it.
 */
export const MAX_SUBSTEPS = Math.round(1.5 / (60 * STEP));

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
 * TUNED. Evaporation, h per second.
 *
 * Under nucleation this does a different job than it did under spinodal
 * decomposition, and a gentler one. It no longer has to carry the mean across
 * the unstable band — it must NOT, since crossing the spinodal at h = 0.577
 * decomposes the whole film into a labyrinth (see SPINODAL_ONSET_FRACTION).
 * Instead it removes the mass that the growing dry spots absorb, so it sets
 * how fast they spread and therefore the blink cadence.
 *
 * The wet phase stays pinned near +1 while spots can take up the loss, so the
 * mean falls without the wet film ever approaching the spinodal — measured,
 * the wet-phase composition sits at 0.68-0.84 for the whole run. Dry area then
 * grows at about EVAP/2 per second, which puts the 10-30% window at 3.0s
 * wide. Lower it for a slower cycle; the window scales as 1/EVAP.
 */
export const EVAP = 0.15;

/**
 * The film tears by NUCLEATION, not by spinodal decomposition.
 *
 * SPINODAL_ONSET_FRACTION proves the spinodal route can only ever produce a
 * labyrinth. So the film is held in the *metastable* range instead — dry
 * fraction between 0 and 0.211, where a uniform film is linearly stable — and
 * break-up is started by localised defects. A defect larger than the critical
 * nucleus grows; a smaller one heals. That threshold is what makes this a
 * simulation rather than a painting: **painted spots cannot heal.**
 *
 * It is also what tear break-up physically is. It nucleates at mucin defects
 * and lid-wiper irregularities, at sites that repeat within the same eye; it
 * is not a spontaneous decomposition of the whole sheet.
 *
 * Measured on the CPU reference: of 49 seeded defects with radii spanning
 * 1.0-4.5 cells, 23 heal completely within 0.35s and 26 survive and grow.
 */

/** Nucleation sites across the domain, so SITES^2 defects in total. */
export const NUCLEUS_SITES = 7;

/**
 * Defect radius range, in cells. **Must straddle criticalRadiusCells() at the
 * operating mean**, or the mechanism is not exercised: entirely above it and
 * every defect survives, which is painting; entirely below and the film never
 * tears. The test pins this.
 */
export const NUCLEUS_R_MIN_CELLS = 1.0;
export const NUCLEUS_R_MAX_CELLS = 4.5;

/** Defect depth. Full depth of the well, so a defect is a genuine nucleus. */
export const NUCLEUS_DEPTH = 2.0;

/** DERIVED. Equilibrium interface width, from kappa h'' = f'(h): tanh(x/w). */
export function interfaceWidth(): number {
  return Math.sqrt(2 * KAPPA);
}

/**
 * DERIVED. Interface energy per unit length, integral of kappa*(dh/dx)^2 over
 * the tanh profile: (4/3)*kappa/w.
 */
export function surfaceTension(): number {
  return ((4 / 3) * KAPPA) / interfaceWidth();
}

/**
 * DERIVED. Critical nucleus radius in tangent units, for a film whose mean is
 * `h` — the classical 2D result R* = sigma / dOmega.
 *
 * dOmega is the grand-potential difference between the film and the droplet
 * phase at the film's own chemical potential, so the droplet interior is the
 * *other* root of f'(x) = f'(h) and not simply -1.
 *
 * R* diverges at the binodal (h = 1, nothing can nucleate) and collapses
 * toward the interface width at the spinodal (everything nucleates). The
 * useful range is where R* is a few cells: h around 0.90-0.95.
 */
export function criticalRadius(h: number): number {
  const mu = h * h * h - h;
  // f'(x) - mu factors as (x - h)(x^2 + h*x + h^2 - 1); take the lower root.
  const hd = (-h - Math.sqrt(h * h - 4 * (h * h - 1))) / 2;
  const f = (x: number) => Math.pow(x * x - 1, 2) / 4;
  const omega = (x: number) => f(x) - mu * x;
  return surfaceTension() / (omega(h) - omega(hd));
}

/** DERIVED. criticalRadius() in cells, which is how the defects are sized. */
export function criticalRadiusCells(h: number): number {
  return criticalRadius(h) / DELTA;
}

/**
 * The mean the film passes through while the defects are being selected.
 * criticalRadiusCells() here is 2.9 cells, inside the seeded 1.0-4.5 range,
 * which is what makes some defects heal and others grow.
 */
export const NUCLEATION_MEAN = 0.9;

/**
 * DERIVED, and the hard limit on this whole approach. **Read this before
 * proposing a different double well.**
 *
 * The dry area fraction the film already has by the time it first becomes
 * spinodally unstable. Isolated round droplets need a minority phase below
 * roughly 0.30; this says the film cannot even begin to tear until it is
 * 0.211 dry, and separation then takes seconds more, during which the fraction
 * climbs past 0.45. That is why the field is a labyrinth by the time it has
 * separated, and no tuning reaches the droplet regime.
 *
 * **Asymmetry cannot move it.** The obvious escape is a well whose unstable
 * region sits near the wet state — f'(h) = (h+1)(h-hm)(h-1) with hm > 0. But
 * substituting u = h - hm/3 gives f''(u) = 3u^2 - (3*(hm/3)^2 + 1), which is
 * a *symmetric* double well in u. So:
 *
 *     spinodal at  u = +/- sqrt((3m^2+1)/3),  binodal at  u = +/- sqrt(3m^2+1)
 *     ratio = 1/sqrt(3) exactly, for every hm
 *
 * and the lever rule at the upper spinodal gives (1 - 1/sqrt(3))/2 — the same
 * number for hm = 0 and hm = 2 alike. Every quartic double well is the
 * symmetric one under an affine change of variable; asymmetry relocates the
 * physics on the h axis and rescales it, and changes nothing about the
 * relationship between "separated" and "what volume fraction". Verified
 * numerically across hm in [0, 2] and by simulation at hm = 0.4, 0.55, 0.7.
 *
 * Escaping this needs a different mechanism, not a different well:
 * nucleation in the metastable region (0 < fraction < 0.211), where the
 * uniform film is linearly stable but finite-amplitude defects grow into
 * isolated dry spots — which is what tear break-up physically is — or a
 * thin-film disjoining pressure, which is not a double well at all.
 */
export const SPINODAL_ONSET_FRACTION = (1 - 1 / Math.sqrt(3)) / 2;

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
 * Here G = 2.99, a linear gain of about 20x. Two things about that number:
 *
 * - It is the *linear* budget. Once the disturbance is O(1) the double well
 *   takes over and drives separation the rest of the way to +/-1, so the
 *   reference measures a total gain nearer 40x. The linear budget is what
 *   decides whether break-up starts at all, which is the question that
 *   matters.
 * - An earlier revision of this file ran at 0.27 — a gain of 1.3 — where the
 *   instability could not start at any seed, and the film thinned evenly
 *   forever. The lever that fixed it was n^-4 and 1/dt together (see GRID,
 *   IFACE_CELLS and STEP), not EVAP and not the seed.
 */
export const TRANSIENT_GAIN_C = 0.0237555;

export function availableEfolds(): number {
  return (TRANSIENT_GAIN_C * MOBILITY) / (KAPPA * EVAP);
}

/**
 * TUNED. Seconds of real steps run at build time, so the eye loads mid-cycle
 * rather than as a mirror. Spec D11.
 *
 * Measured on the CPU reference with the nucleation seed, EVAP = 0.15
 * (dry fraction, component count, largest component's share of dry area,
 * circularity against a perfect digital disc at 0.52, spectral anisotropy):
 *
 *     t      dry%   comps  largest  circ   aniso
 *     0.10    8.8     26    0.109   0.592  -0.067   49 seeded, 23 already healed
 *     0.85   10.4     22    0.111   0.610  -0.037   window opens
 *     1.60   14.7     21    0.095   0.607  -0.018
 *     2.40   19.4     20    0.104   0.594   0.000   <- here
 *     3.10   24.2     20    0.098   0.595   0.006
 *     3.85   29.5     21    0.102   0.560   0.040   window closes
 *     5.60   41.2     20    0.137   0.543   0.059
 *
 * The droplet window is **3.0 seconds** and the middle of it is unambiguous,
 * which is the difference from the spinodal route, where it was 0.15s. 2.4s
 * sits at the centre with the spots round, isolated and isotropic.
 *
 * Priming costs 4080 steps, about 75M fragments once at init.
 */
export const PRIME_SECONDS = 2.4;

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
