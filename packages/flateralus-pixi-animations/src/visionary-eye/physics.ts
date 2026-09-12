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

/**
 * DERIVED. Tangent-space domain: (lx, ly) in [-0.6, 0.6], the corneal cap plus
 * margin. CORNEA_L = sin(0.6) = 0.565, so the cap fits with room for the
 * boundary condition to act away from the visible edge.
 */
export const DOMAIN = 1.2;

/**
 * TUNED. Field resolution, chosen against what the nucleation mechanism has to
 * resolve rather than against a growth budget.
 *
 * Three lengths have to fit on this grid, and 96 is about the smallest
 * resolution where they all do:
 *
 *   - the interface, `interfaceWidth()` = 1.5 cells. Below that the front is
 *     under-resolved and spots pick up the grid's symmetry.
 *   - the critical nucleus, `criticalRadiusCells(NUCLEATION_MEAN)` = 2.9
 *     cells. If R* falls to the interface width the healing threshold stops
 *     being sharp and every defect survives, which is painting, not physics.
 *   - the site spacing, `DOMAIN / NUCLEUS_SITES` = 13.7 cells, so neighbouring
 *     spots are resolved as separate and can be seen to merge.
 *
 * Cost is 96*96*2*1700 = 31.3M fragments/s at 28.3 substeps per 60fps frame.
 */
export const GRID = 96;

/** DERIVED. Tangent units per cell. */
export const DELTA = DOMAIN / GRID;

/** Millimetres per tangent unit: 5.85mm cornea half-chord at sin(0.6). */
export const MM_PER_UNIT = 5.85 / Math.sin(0.6);

/**
 * TUNED. Interface half-width, in cells.
 *
 * **The invariant to protect when changing it is `IFACE_CELLS * DELTA`**, the
 * interface width in *tangent units*, because that is what KAPPA depends on,
 * and KAPPA sets `surfaceTension()` and therefore `criticalRadius()`. Moving
 * GRID and IFACE_CELLS together at fixed product leaves the physics alone and
 * changes only how well it is resolved.
 *
 * 1.5 is the floor for a resolved front: below it the spots pick up the grid's
 * 4-fold symmetry and R* is no longer comfortably larger than the interface.
 * Much above 2.5 the interface eats into the critical radius from the other
 * side, and the threshold blurs again.
 */
export const IFACE_CELLS = 1.5;

/** DERIVED. Gradient-energy coefficient. Interface half-width sqrt(2*kappa) = n cells. */
export const KAPPA = Math.pow(IFACE_CELLS * DELTA, 2) / 2;

/**
 * DERIVED. Fixed simulation step, set by how fast the film has to respond.
 *
 * MOBILITY is capped at `SAFETY * DELTA^4 / (32 * STEP * KAPPA)` by explicit
 * Euler on the biharmonic, so a finer step buys a proportionally larger M and
 * a proportionally faster field. Under nucleation the requirement is that
 * *selection* be quick and growth be visible: measured, a sub-critical defect
 * heals completely within 0.35s and the survivors spread across the droplet
 * window's 3 seconds. At 1/480 — the rate a spinodal reading of spec D3
 * arrived at — the same dynamics run 3.5x slower, and healing would take
 * longer than a blink cycle, leaving dead defects on screen.
 *
 * The cost is 28.3 substeps per 60fps frame, 31.3M fragments/s.
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
 * the wet-phase composition sits at 0.68-0.84 for the whole run.
 *
 * Dry area then grows at roughly EVAP/2 per second, so the lever-rule estimate
 * of the 10-30% window is 0.4/EVAP = 2.67s. **Measured it is 3.0s**, t = 0.85
 * to 3.85, the difference being that spots are still nucleating early on.
 * Lower EVAP for a slower cycle; the window scales as 1/EVAP either way.
 *
 * **Since the loop closed this is also the only lever on blink cadence**, and
 * spec D6 says it stays the only one: no interval floor, no ceiling, nothing
 * that would make the trigger a timer in the simulation's clothes. Measured on
 * the CPU reference, closed loop, 60 film seconds per run, three runs each:
 *
 *     EVAP   interblink mean   sd     range         dry at fire
 *     0.10       4.39s        0.47   3.18-5.35        0.261
 *     0.15       3.18s        0.33   2.33-3.93        0.261    <- here
 *     0.20       2.56s        0.25   1.90-3.18        0.261
 *     0.25       2.18s        0.20   1.60-2.73        0.263
 *
 * Raising it makes the eye blink sooner, with nothing else changed — the film
 * dries faster, so it reaches the threshold sooner. The product EVAP*interval
 * drifts from 0.44 to 0.55 across that range rather than holding constant,
 * because the nucleation delay before the spots start growing is set by the
 * defect radii and does not scale with evaporation.
 *
 * 0.15 gives 19 blinks a minute, which is the middle of the physiological
 * resting rate. Past about 0.25 the REFRACTORY debounce starts to bind on the
 * shortest intervals and the fraction overshoots the threshold, which is the
 * upper end of the useful range.
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

/**
 * TUNED. Nucleation sites across the domain, so SITES^2 defects in total.
 * 7 gives 49 candidates and, after healing, roughly 20 spots.
 */
export const NUCLEUS_SITES = 7;

/**
 * TUNED. Defect radius range, in cells. **Must straddle criticalRadiusCells() at the
 * operating mean**, or the mechanism is not exercised: entirely above it and
 * every defect survives, which is painting; entirely below and the film never
 * tears. The test pins this.
 */
export const NUCLEUS_R_MIN_CELLS = 1.0;
export const NUCLEUS_R_MAX_CELLS = 4.5;

/**
 * TUNED. Defect depth: the full depth of the well, so a defect is a genuine
 * nucleus and its radius alone decides whether it heals or grows.
 */
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
 * TUNED. The mean the film passes through while the defects are selected.
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

/* ------------------------------------------------------------------ *
 * The display side of the field: how far it may be read, how hard it
 * bends the specular normal, and where it stops counting as wet.
 * ------------------------------------------------------------------ */

/** GLSL's smoothstep, so the display constants can be asserted on the CPU. */
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * DERIVED. How far from the gaze axis, in tangent units, a film-derived term
 * may still be read — as a **Chebyshev** radius, `max(|lx|, |ly|)`.
 *
 * The field is a square, `|lx|, |ly| <= DOMAIN/2`, whose outermost texel
 * centres sit at `DOMAIN/2 - DELTA/2`. Past that, `CLAMP_TO_EDGE` extrapolates
 * the boundary texel outward forever, and anything that keeps sampling smears
 * each edge texel into a long radial streak running out to the silhouette. In
 * the debug view those streaks are obvious; carried into the specular they
 * would read as a shader bug. So the reach is the last real texel centre minus
 * one gradient tap: the furthest sample whose three taps all land on data the
 * simulation actually wrote.
 *
 * **This is a square and not the corneal cap, and the difference is
 * load-bearing.** The cap is the inscribed circle `|l| <= CORNEA_L = 0.565`.
 * The specular's own centre sits at `|l| = 0.640`: the light direction
 * `normalize(-0.45, -0.55, 0.85)` puts the catchlight where the surface normal
 * equals it, which is `ang = acos(0.767) = 0.70` — on the white, just outside
 * the limbus. No circular mask can both reach it and stay off the clamp, since
 * a circle of radius 0.6 is the largest that is streak-free on axis. But the
 * catchlight is near-diagonal — `l = (-0.406, -0.496)`, each component
 * comfortably inside the square — so the square keeps it while staying
 * strictly inside the field's own data. Masking on `ang` alone would be safe
 * and would also delete the highlight this field exists to drive.
 */
export const FILM_REACH = DOMAIN / 2 - DELTA / 2 - DELTA;

/**
 * TUNED. Width of the fade that lands the film's influence on zero at
 * `FILM_REACH`.
 *
 * **The field is only barely wider than the eye, and that sets this.** The
 * square's half-width is 0.6, the corneal cap's radius is 0.565, and a
 * gradient tap costs a cell — so along the four axis directions there is
 * almost nothing to spare, and every unit of fade is taken out of the cornea's
 * outer rim. The constraint is that the fade must not begin before the limbus,
 * which `eye.ts` rings at `ang = 0.56`, i.e. `|l| = 0.531`: inside that the
 * film has to be at full strength, because that is the iris, the catchlight
 * and everything anyone looks at. `FILM_REACH - 4*DELTA = 0.531` lands on it.
 *
 * What the fade costs, then, is the sliver of cap between the limbus and
 * `CORNEA_ANG` — an annulus that is already carrying the limbus glow and the
 * corneal shadow ring, which is the best place on the eye to hide a boundary.
 * Four cells is 0.05 in tangent units, about 5% of the globe's radius, some
 * fifteen screen pixels of gradient. Narrow, but a cliff it is not.
 */
export const FILM_REACH_FADE = 4 * DELTA;

/** 1 where the film may be read, 0 where the fetch would clamp. */
export function filmReach(lx: number, ly: number): number {
  const m = Math.max(Math.abs(lx), Math.abs(ly));
  return 1 - smoothstep(FILM_REACH - FILM_REACH_FADE, FILM_REACH, m);
}

/**
 * TUNED. Tangent-space height gradient to normal tilt, in radians per unit of
 * `dh/dl`.
 *
 * Measured on a CPU mirror of the two shipped passes at `PRIME_SECONDS`, over
 * the cornea, one-cell forward differences — the same stencil the display uses:
 *
 *     |dh/dl| on wet film (h > 0.4)   p50 2.0   p90 14.8   p99 42
 *     |dh/dl| everywhere              p50 2.5   p90 36.7   p99 50
 *
 * The tilt is `|dh/dl| * FILM_SLOPE`, and the sharp lobe is `pow(dot, 48)`,
 * which is down to half at 0.169 rad. At 0.008 the median of the wet sheet
 * tilts 0.016 rad — the catchlight keeps its shape and ripples — while the
 * raised rims around the dry patches, the p90 and above, tilt 0.12 to 0.34 rad
 * and cut the highlight apart. That split is the whole effect: **the film
 * shards the catchlight exactly where it is tearing**, and leaves it alone
 * where it is not.
 */
export const FILM_SLOPE = 0.008;

/**
 * DERIVED-ish. Height at which the film reads as fully wet in the specular.
 *
 * The wet well is at +1 and the dry well at -1, so the wetness ramp has to
 * start somewhere in between. It starts at `DRY_H`, which is the same
 * threshold the reduction pass counts as torn — so a patch the measurement
 * calls dry is exactly a patch that reads as a hole in the sheen, and the
 * lid fires on the thing the eye is showing. 0.7 above it is a little under
 * half the remaining distance to the wet well, which puts the ramp across the
 * interface rather than across the flat film on either side of it.
 */
export const WET_H = DRY_H + 0.7;

/**
 * How much sheen a given film height carries: 1 on wet film, 0 on a dry patch.
 *
 * **Subtractive, and that is the only thing that works here.** The sclera is
 * near-white — `vec3(0.965, 0.95, 0.925)` before the light — so it has no
 * headroom for a dry patch to be drawn by adding light. It has plenty of room
 * to be drawn by taking the sheen away, which is also what a dry spot on a
 * real eye is: not a bright mark, a dull one.
 */
export function wetness(h: number): number {
  return smoothstep(DRY_H, WET_H, h);
}

/**
 * TUNED. How much of the surface's own brightness a fully dry patch takes
 * away — a multiplier on the diffuse-lit colour, not a withheld highlight.
 *
 * **Gating only the added light does not work, and the reason is clipping.**
 * Decomposed at the brightest sclera pixel, which is the specular peak at
 * `ang = 0.696`, in luminance:
 *
 *     diffuse  pow(dsp,48)*0.9  pow(dsp,7)*0.07   rim     total
 *     1.079    0.863            0.067             0.001   2.010
 *
 * The sharp lobe is 43% of that sum, so it is not a small term. It is an
 * invisible one. The diffuse term **on its own** is `(1.094, 1.078, 1.053)`
 * per channel — already past white before a single specular term is added —
 * and `finish()` tone-maps nothing, it only adds grain and a vignette that
 * cannot exceed 1. So `wet = 1` gives 2.010 and `wet = 0` gives 1.081 and
 * **both clip to pure white**: measured difference in the framebuffer, 0.0%.
 * The dry patches were being computed correctly and thrown away by the clamp.
 *
 * That is also why a larger `FILM_SLOPE` could never have fixed it. Nothing
 * additive can darken a pixel that is already over 1. The gate has to reach a
 * term that scales what is already there, which is the diffuse.
 *
 * Physically this is the honest term anyway: a dewetted surface does not
 * merely stop being glossy, it scatters differently and reads duller. At 0.15
 * the measured dip in the *clipped* framebuffer is 8% at the specular peak,
 * 12% on veined sclera there, 18% across the mid-sclera and 9% on the iris —
 * present everywhere rather than only in the narrow band near the limbus
 * where the corneal shadow ring happened to leave headroom.
 */
export const DRY_DIM = 0.15;

/**
 * The multiplier a given wetness puts on the surface's diffuse-lit colour.
 *
 * Exactly 1 at `wet = 1`, by construction rather than by rounding: this runs
 * on the no-film fallback, where it must not tint the eye by a last bit.
 */
export function surfaceDim(wet: number): number {
  return 1 - DRY_DIM * (1 - wet);
}

/* ------------------------------------------------------------------ *
 * The cornea as a lens: the refraction map, and the caustic that is
 * the Jacobian of it.
 * ------------------------------------------------------------------ */

/**
 * Refractive index of the cornea at the tear film's outer surface, 1.376.
 *
 * The step that matters optically is air to tear film (1.336) to corneal
 * stroma (1.376); the film is thin enough that the two interfaces act as one,
 * and the standard schematic eye lumps them at 1.376. That single number is
 * responsible for about two thirds of the eye's total refractive power.
 */
export const N_CORNEA = 1.376;

/** DERIVED. `refract`'s eta for a ray entering the cornea from air. */
export const CORNEA_ETA = 1 / N_CORNEA;

/**
 * DERIVED. Finite-difference baseline for the Jacobian, in tangent units.
 *
 * One cell, and there is no other defensible choice. Shorter, and the
 * difference measures the curvature of `filmUV`'s smooth-bilinear
 * reconstruction — an artefact of how the field is read, not of the film.
 * Longer, and it averages across the interface, whose whole width is
 * `IFACE_CELLS` = 1.5 cells, which is exactly the structure the caustic comes
 * from. One cell is the field's own Nyquist and the scale at which it has
 * something to say.
 *
 * It is also what lets the stencil stay inside `FILM_REACH`, which reserves
 * exactly one cell of margin for a gradient tap.
 */
export const JACOBIAN_STEP = DELTA;

/** Thickness of the precorneal tear film, in millimetres. OCT puts it at
 * 3-4 microns over the cornea; it thins to bare epithelium where it breaks, so
 * this is also the full height swing across a break. */
export const TEAR_FILM_MM = 3.5e-3;

/**
 * DERIVED. Height of the film per unit of `h`, in tangent units — the
 * **displacement** counterpart of `FILM_SLOPE`.
 *
 * **`FILM_SLOPE` is a bump amplitude and this is a displacement amplitude, and
 * conflating them is what tore the pupil apart.** `FILM_SLOPE` only ever
 * perturbs a normal — it feeds the specular and nothing else, exactly like the
 * `uBump` energy relief a few lines above it, which likewise displaces
 * nothing. A bump amplitude has no absolute length to violate, so Task 10 was
 * free to tune it against the only scale the specular has, the width of the
 * `pow(dot, 48)` lobe. It came out at 0.008 tangent units per unit of `h`,
 * which is **82.9 microns** of film and a surface tilting 24 degrees at a
 * rim. As a bump that is unremarkable; bump amplitudes routinely run tens of
 * times the displacement they stand in for, because the eye reads normals far
 * more sensitively than it reads positions.
 *
 * The refraction map is not a bump. It propagates a ray 3.6mm to the iris, so
 * it has three absolute scales to answer to — the pupil radius, the cell, and
 * the interface width — and an 82.9 micron film fails all three: measured, the
 * film alone threw the lookup 45% of a pupil radius at the steepest resolved
 * slope, 13% at the p90, and it did so at the axis as hard as at the limbus,
 * where the cornea's own magnification correctly goes to zero. A pupil cannot
 * survive that, and the Lab render says it did not.
 *
 * So the map uses the film's actual height: half the swing, `TEAR_FILM_MM / 2`,
 * in tangent units. That is 1.75 microns, **47x smaller** than `FILM_SLOPE`,
 * and it puts the steepest rim at half a degree of tilt and the throw at 1% of
 * a pupil radius.
 *
 * The two now disagree about how thick the film is, and that is worth saying
 * out loud rather than hiding: the specular's film is stylised and the map's is
 * measured. Reconciling them means moving `FILM_SLOPE` down by 47x, which
 * would take the visible catchlight shards with it — Task 10's whole effect.
 * That is a spec-level call, not one to make while fixing a pupil.
 */
export const FILM_LENS = TEAR_FILM_MM / 2 / MM_PER_UNIT;

/**
 * DERIVED. The largest irradiance ratio the film can honestly be said to
 * produce, as a multiple of the unfocused iris.
 *
 * A caustic's brightness at a fold is infinite in geometric optics and finite
 * in every real instrument, bounded by whatever resolves it. Here that is the
 * stencil: light is gathered onto the iris plane by a displacement field the
 * film can only push so far, and it is counted in bins one cell wide.
 *
 *   deviation per unit of surface tilt   1 - CORNEA_ETA          = 0.2733
 *   lateral throw at the iris plane      x IRIS_DEPTH            = 0.09495
 *   height per unit of dh/dl             x FILM_LENS             = 1.604e-5
 *   steepest resolved slope              x 1/(IFACE_CELLS*DELTA) = 8.56e-4
 *   in cells                             / DELTA                 = 0.068
 *   light arriving in the one cell       1 +                     = 1.068
 *
 * So the film moves light across at most 0.068 of a cell, and a fold can
 * therefore pile that much *extra* on top of the cell's own — the `1 +` is
 * the light that was going to land there anyway, and leaving it out is a
 * mistake that only hides while the throw is large compared to a cell.
 * Claiming more would be claiming structure finer than the field.
 *
 * The same number bounds the **dark** side by its reciprocal: light gathered
 * onto a crest came off the slope beside it, and the widest that slope can be
 * stretched is the same fraction of a cell. So the caustic runs from
 * `1/CAUSTIC_MAX` to `CAUSTIC_MAX` times the unfocused iris, and the two
 * bounds are one statement of where the light went, not two tuned numbers.
 *
 * **At the film's real thickness this bound is 1.068, and that is the finding,
 * not a disappointment.** A tear film is a very weak lens over 3.6mm. It is
 * also why the visible signature of a breaking film is in the *specular* —
 * which is a first-order effect on a normal — and not in caustics on the iris,
 * which is what photographs of real eyes show. Clinical tear break-up time is
 * read off a specular reflection at a slit lamp for exactly this reason.
 *
 * **A sub-grid correction was considered for the shortfall and rejected.** The
 * argument for one is real: curvature goes as `thickness / W^2`, this grid
 * resolves the interface at 194 microns, and a dewetting rim in a 3.5 micron
 * film is nearer 10-50. Scaling the coupling by `(W_sim / W_real)^2` is the
 * textbook move. Measured, it does not work here, and the tests below pin
 * each reason:
 *
 *   - **`1/W^2` holds only while the stencil can see the interface.** Measured
 *     exponent: -1.97 at W >= 4 cells, -1.80 at the 1.5 this film has, -1.07
 *     at half a cell, -0.34 at a quarter. The difference baseline is one cell,
 *     so below that the measured curvature saturates — at 6.7x the current
 *     peak, *no matter how sharp the interface gets*. The algebra says 15x at
 *     50 microns and the pipeline delivers 5.4x; it says 377x at 10 microns
 *     and the pipeline still delivers 6.7x. Past about one cell the multiplier
 *     is not recovering structure the grid is hiding. It is a gain.
 *   - **The pupil forbids it in any case.** One coupling drives displacement
 *     and curvature together, so a 15x throws the iris lookup 14.6% of a pupil
 *     radius and a 42x throws it 40% — which is the bug this constant's
 *     neighbour `FILM_LENS` exists to describe. The pupil caps any multiplier
 *     at 5.2x.
 *   - **`W_sim` is not blur, it is this film's interface.** `IFACE_CELLS *
 *     DELTA` sets `KAPPA`, hence `surfaceTension()`, hence `criticalRadius()`,
 *     hence the droplet window and the blink cadence. Correcting the optics to
 *     a 50 micron film while the dynamics integrate a 194 micron one is the
 *     same two-films-in-one-shader error as using a bump amplitude for a
 *     displacement, one layer up.
 *
 * What the honest value does deliver is the right *shape*: measured on a real
 * front, the bright line sits 1.11 cells to the wet side and the dark
 * companion 1.11 cells to the dry side, so the filigree leads the rim exactly
 * as the spec wanted. Only the amplitude is under the grain.
 */
export const CAUSTIC_MAX =
  1 +
  ((1 - CORNEA_ETA) * IRIS_DEPTH * FILM_LENS) / (IFACE_CELLS * DELTA) / DELTA;

/** GLSL's `refract`. Returns the zero vector on total internal reflection. */
export function refract(i: V3, n: V3, eta: number): V3 {
  const d = i[0] * n[0] + i[1] * n[1] + i[2] * n[2];
  const k = 1 - eta * eta * (1 - d * d);
  if (k < 0) return [0, 0, 0];
  const a = eta * d + Math.sqrt(k);
  return [eta * i[0] - a * n[0], eta * i[1] - a * n[1], eta * i[2] - a * n[2]];
}

/**
 * The corneal refraction map: where the ray through the tangent point `l`
 * lands on the iris plane, in the same tangent coordinates.
 *
 * `tilt` is the film's contribution to the surface normal — `FILM_SLOPE`
 * times the height gradient, already scaled — so a zero tilt is the bare
 * corneal sphere and the whole film drops out of the map by arithmetic rather
 * than by a branch. `view` is the incident direction in the gaze-local frame,
 * pointing from the camera into the surface.
 *
 * The 0.2 floor on the depth component is a guard for rays that come out
 * grazing near the silhouette; over the iris the true value never falls below
 * about 0.91, so it shapes nothing that is visible.
 */
export function irisPoint(
  lx: number,
  ly: number,
  tiltX: number,
  tiltY: number,
  view: V3 = [0, 0, -1]
): [number, number] {
  const nx = lx - tiltX;
  const ny = ly - tiltY;
  const nz = Math.sqrt(Math.max(1 - (lx * lx + ly * ly), 1e-4));
  const m = Math.hypot(nx, ny, nz);
  const r = refract(view, [nx / m, ny / m, nz / m], CORNEA_ETA);
  const s = IRIS_DEPTH / Math.max(0.2, -r[2]);
  return [lx + r[0] * s, ly + r[1] * s];
}

/**
 * How much larger the iris looks through the cornea than it is: the
 * reciprocal of the map's on-axis contraction.
 *
 * Not a constant this file uses — it is the check that the map is a cornea and
 * not an arbitrary warp. Clinical figures for the apparent magnification of
 * the iris and pupil run 1.12 to 1.15; a single refracting sphere lands a
 * little under that because the real cornea is aspheric and has a second
 * surface.
 */
export function cornealMagnification(): number {
  const d = 1e-3;
  return d / irisPoint(d, 0, 0, 0)[0];
}

/**
 * What the film does to the light reaching the iris, as a **fraction of the
 * unfocused iris** — positive where it concentrates, negative where it
 * spreads — from the Jacobian of the refraction map.
 *
 * `J0` is the same map with the film removed, so this is **zero on a flat
 * film by construction, not by tuning**. That matters three times over: it is
 * what makes the term a measurement of the film rather than a wash over the
 * whole eye; it removes the cornea's own magnification gradient, which runs
 * from 0.82 on axis to 0.75 at the limbus and would otherwise read as a
 * permanent glow in the middle of the iris; and it makes the `uFilmOK = 0`
 * fallback exact, since there `J` and `J0` are the same arithmetic on the
 * same numbers.
 *
 * **The negative half is not an embellishment, it is the other end of the
 * same conservation law.** A crest of the film is a converging lens and the
 * light it piles onto a line is light that left the slope beside it. Keeping
 * only the bright half would be adding light the film never had. Across a
 * real interface the pair reads as it should: a dim band on the dry side, a
 * hairline on the wet side.
 *
 * `abs` because a strong enough crest folds the map, and a fold is a caustic
 * with its sign flipped, not an absence of one.
 */
export function causticFocus(J: number, J0: number): number {
  const ratio = J0 / Math.max(Math.abs(J), 1e-6);
  return Math.min(Math.max(ratio, 1 / CAUSTIC_MAX), CAUSTIC_MAX) - 1;
}

/**
 * The refraction map, its Jacobian, and the caustic, at one tangent point.
 *
 * Mirrors the shader stencil exactly, including which differences are centred.
 * The film enters through its **Hessian**: the map is evaluated at `l`,
 * `l + (e, 0)` and `l + (0, e)`, and the gradient at the two offset points is
 * extrapolated from the Hessian rather than re-differenced from the field.
 * That is the same accuracy to first order and it keeps every tap within one
 * cell of `l`, which is precisely the margin `FILM_REACH` reserves. Taking the
 * offset gradients by differencing the field directly would need taps two
 * cells out, and the reach has no second cell to give.
 */
export function irisJacobian(
  lx: number,
  ly: number,
  h: (x: number, y: number) => number,
  slope: number = FILM_LENS,
  view: V3 = [0, 0, -1],
  e: number = JACOBIAN_STEP
): { f0: [number, number]; J: number; J0: number; focus: number } {
  const h00 = h(lx, ly);
  const h10 = h(lx + e, ly);
  const hm0 = h(lx - e, ly);
  const h01 = h(lx, ly + e);
  const h0m = h(lx, ly - e);
  const h11 = h(lx + e, ly + e);
  const gx = (h10 - hm0) / (2 * e);
  const gy = (h01 - h0m) / (2 * e);
  const hxx = (h10 - 2 * h00 + hm0) / (e * e);
  const hyy = (h01 - 2 * h00 + h0m) / (e * e);
  const hxy = (h11 - h10 - h01 + h00) / (e * e);
  const det = (a: [number, number], b: [number, number], c: [number, number]) =>
    ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / (e * e);

  const f0 = irisPoint(lx, ly, gx * slope, gy * slope, view);
  const fx = irisPoint(
    lx + e,
    ly,
    (gx + hxx * e) * slope,
    (gy + hxy * e) * slope,
    view
  );
  const fy = irisPoint(
    lx,
    ly + e,
    (gx + hxy * e) * slope,
    (gy + hyy * e) * slope,
    view
  );
  const b0 = irisPoint(lx, ly, 0, 0, view);
  const bx = irisPoint(lx + e, ly, 0, 0, view);
  const by = irisPoint(lx, ly + e, 0, 0, view);
  const J = det(f0, fx, fy);
  const J0 = det(b0, bx, by);
  return { f0, J, J0, focus: causticFocus(J, J0) };
}

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
 * Fraction of the cornea that has torn, from the per-tile **area means** of
 * the dry indicator — each input texel is already `mean(step(h, DRY_H))` over
 * its own tile, so this is a plain average of averages over equal-area tiles.
 *
 * **Means and not minima, and this is load-bearing.** The first draft took
 * `min(h)` per tile: a tile counted as torn as soon as any part of it was.
 * That reads as the responsive choice and is in fact a saturating one. At
 * `REDUCE = 8` on a 96 grid the tiles are 12x12 cells and the dry patches are
 * about 12.6 cells across, so a single patch touching a tile marks the whole
 * tile dry, and the fraction reaches ~1.0 while the cornea is nearer a tenth
 * dry than a third. Measured against the CPU reference, the minimum-based
 * statistic converges to "fraction of tiles touching any patch" rather than to
 * a dry area.
 *
 * Shrinking the tiles makes it worse, not better — smaller tiles against a
 * fixed patch size means a *larger* share of tiles overlap something, so the
 * saturation is harder. The statistic was wrong, not the resolution. An area
 * mean is exact at any tile size, which is why `REDUCE` stays at 8 and its
 * 64-texel readback stays one small `readPixels`.
 *
 * Tiles whose centre falls off the corneal cap are skipped, so this is the dry
 * share of the cornea rather than of the square domain the field lives on.
 */
export function breakupFraction(
  tileDry: Float32Array,
  size: number = REDUCE
): number {
  let on = 0;
  let dry = 0;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      if (!tileInsideCornea(i, j, size)) continue;
      on++;
      dry += tileDry[j * size + i];
    }
  }
  return on === 0 ? 0 : dry / on;
}

/**
 * TUNED. Corneal dry-area share that triggers a blink.
 *
 * **The constraint is that the blink must fire while the dry phase is still a
 * minority.** Under nucleation the film passes through isolated droplets and
 * then, left alone, coarsens and percolates into a connected labyrinth. A lid
 * that fires late holds the film in the percolated regime permanently, because
 * every cycle starts from the same wipe and takes the same time to get there.
 * The droplet window is dry fraction 0.10-0.30 — see `PRIME_SECONDS` for the
 * trace and `SPINODAL_ONSET_FRACTION` for why 0.30 is a hard ceiling.
 *
 * 0.26 sits inside that window with room on both sides: above the 0.194 the
 * primed field already carries at load, so the eye is not wiped before anyone
 * has seen it (spec D11), and below the 0.295 at which the spots start to
 * merge.
 *
 * Measured on a CPU reference of the two shipped passes, driven through the
 * shipped clock and this state machine at dt = 1/60 for 60 film seconds, three
 * runs, 54 intervals:
 *
 *     interblink   mean 3.18s   sd 0.33   range 2.33-3.93
 *     dry at fire  mean 0.261   range 0.260-0.262
 *
 * The dry fraction at firing overshoots the threshold by about 0.001, which is
 * one frame of film time at the rate the field dries — so the lid is firing on
 * the crossing and not late. The interval is **not constant**, and that is the
 * evidence that the measurement reaches the decision: the spread is the run to
 * run difference in which defects survive, since each blink lays a new layout.
 *
 * The earlier 0.35 was calibrated against the minimum-based statistic and
 * against the spinodal mechanism that preceded nucleation; it is past the
 * window on both counts.
 */
export const BLINK_FRACTION = 0.26;

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

/** One frame of the film's clock: see `filmTick`. */
export interface FilmTick {
  /** Substeps to integrate this frame. */
  steps: number;
  /** Backlog carried into the next frame. */
  acc: number;
  /** Film seconds this frame buys — `steps * STEP`, and **not** `dt`. */
  ran: number;
}

/**
 * How much film time a frame of wall time actually buys.
 *
 * **The film does not age at the rate the wall does, and the gap is a function
 * of the frame rate.** The backlog is capped at `MAX_SUBSTEPS * STEP` = 0.025s
 * so a slow frame degrades instead of spiralling, and the harness clamps its
 * own `dt` to 0.05s before this ever sees it. Together those make the field
 * age at 1.00x real time at 60fps, 0.76x at 30, 0.38x at 15 and 0.15x at 6.
 *
 * Anything that has to stay in step with the film's *state* — the blink, whose
 * trigger is a measurement of that state — has to run on `ran` and not on
 * `dt`. Drive it from `dt` and the cadence silently becomes a function of the
 * frame rate: at 8fps the trigger's clock runs at 0.40x while the field runs
 * at 0.20x, so the refractory window and the lid's travel are timed against a
 * clock the dryness is not on. That is a real bug this function exists to make
 * testable without a GL context.
 */
export function filmTick(acc: number, dt: number): FilmTick {
  let left = Math.min(acc + dt, MAX_SUBSTEPS * STEP);
  let steps = 0;
  while (left >= STEP) {
    left -= STEP;
    steps++;
  }
  return { steps, acc: left, ran: steps * STEP };
}

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

/**
 * DERIVED. Half the diagonal of the square field, which is how far the lid's
 * edge has to travel from "clear of the field" to "past all of it" whatever
 * angle the gaze leaves the sweep at.
 */
export const LID_TRAVEL = DOMAIN * Math.SQRT1_2;

/**
 * Where the lid's leading edge is, in the corneal-local frame.
 *
 * The lid is a half-plane: `normal` is a unit vector pointing at the side the
 * lid has already passed over, and `edge` is a point on the leading line. At
 * coverage 0 the edge sits clear of the field on the open side and at 1 it is
 * clear on the other, so the swept half-plane grows from nothing to all of it.
 *
 * **Both come back rotated into the corneal-local frame**, because the field
 * is gaze-local and the lid is not. A world-space normal handed straight to
 * the splat makes the band tilt as the eye looks around, which is the one
 * artefact a viewer spots immediately. World down is `(0, 1)` here, the same
 * convention `GRAVITY` uses, so the lid closes downward and the covered side
 * is up.
 */
export interface LidPose {
  /** A point on the lid's leading line, corneal-local. */
  edge: [number, number];
  /** Unit normal pointing at the side the lid has already crossed. */
  normal: [number, number];
}

export function lidFrame(coverage: number, gx: number, gy: number): LidPose {
  const down = worldToLocal(0, 1, gx, gy);
  // Renormalised: worldToLocal foreshortens as the eye turns, and a short
  // normal would shrink the sweep's travel instead of tilting it.
  const len = Math.hypot(down[0], down[1]) || 1;
  const dx = down[0] / len;
  const dy = down[1] / len;
  const s = (2 * Math.min(1, Math.max(0, coverage)) - 1) * LID_TRAVEL;
  return { edge: [dx * s, dy * s], normal: [-dx, -dy] };
}

/**
 * TUNED. Ceiling on splats per frame. A frame that stalls through most of the
 * lid's travel degrades to a coarser sweep rather than spending the next
 * frame's budget on it; 32 covers a full 60fps closing frame nearly three
 * times over.
 */
export const LID_SPLATS_MAX = 32;

/**
 * The lid's poses across one frame's travel, from just after `from` to exactly
 * `to`, spaced about two cells apart.
 *
 * The wetted region is a half-plane, so consecutive poses nest and the sweep
 * cannot literally break into dashes. This exists because the *front* is soft
 * over about three cells and a 60fps closing frame moves it more than twenty:
 * one splat per frame would step that soft edge in visible jumps, and a
 * dropped frame would move it the whole way at once. Stepping it keeps the
 * wipe reading as a sweep at any frame rate.
 */
export function lidSweep(
  from: number,
  to: number,
  gx: number,
  gy: number
): LidPose[] {
  const travel = Math.abs(to - from) * 2 * LID_TRAVEL;
  const n = Math.max(
    1,
    Math.min(LID_SPLATS_MAX, Math.ceil(travel / (2 * DELTA)))
  );
  const out: LidPose[] = [];
  for (let k = 1; k <= n; k++) {
    out.push(lidFrame(from + (to - from) * (k / n), gx, gy));
  }
  return out;
}

/**
 * DEGRADED PATH ONLY. Film seconds between blinks when the field cannot be
 * measured, and the ramp that produces it.
 *
 * `FilmSim.measure()` returns null when the driver will not hand back a
 * readable format from the reduction target. The film still runs and still
 * looks right — it is the *decision* that has lost its input. Rather than
 * freeze the lid open (a staring eye, which reads as broken) or wire in an
 * interval (spec D6: no timer), the trigger falls back to a ramp calibrated so
 * that it crosses `BLINK_FRACTION` at the cadence the measurement produces on
 * average. Same threshold, same state machine, same film clock; only the
 * fraction is synthesised.
 *
 * **This is not a floor or a ceiling on the measured path.** It is reached
 * only when `measure()` has returned null, and nothing blends the two.
 *
 * 3.18 is the mean interblink interval measured on the CPU reference at
 * EVAP = 0.15 — see `BLINK_FRACTION`. `newBlinkState()` starts `since` at
 * `REFRACTORY`, so the first degraded blink lands 1.6 film seconds after load,
 * with the primed field on screen until then (spec D11).
 *
 * It lives here rather than in the animation so the cadence can be driven
 * headlessly — `physics.test.ts` runs the shipped ramp against the shipped
 * clock, which is what pins the blink to film time rather than wall time.
 */
export const FALLBACK_BLINK_SECONDS = 3.18;

export function fallbackFraction(sinceFilmSeconds: number): number {
  return Math.min(
    1,
    sinceFilmSeconds * (BLINK_FRACTION / FALLBACK_BLINK_SECONDS)
  );
}
