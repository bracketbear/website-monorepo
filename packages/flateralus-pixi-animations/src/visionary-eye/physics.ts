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
 * DERIVED. Where the sharp catchlight sits, and how wide it is.
 *
 * `eyeW` lights the globe with `normalize(vec3(-0.45, -0.55, 0.85))` and the
 * sharp term is `pow(dot(n, ld), 48.0)`, so the highlight peaks exactly where
 * the surface normal equals the light — `acos(0.767) = 0.696` from the gaze
 * axis, which is **outside the limbus, on the white**. That fact is why
 * `FILM_REACH` is a square and it is why `FILM_GLOSS_ANG1` is not 0.56.
 *
 * The lobe is down to half at `acos(0.5^(1/48)) = 0.169` rad off the light.
 */
const LIGHT_LEN = Math.hypot(0.45, 0.55, 0.85);
export const SPEC_ANG = Math.acos(0.85 / LIGHT_LEN);
export const SPEC_LOBE_HALF = Math.acos(Math.pow(0.5, 1 / 48));

/**
 * DERIVED. Half-width of the **broad** sheen, `pow(dot(n, ld), 7.0)`.
 *
 * 0.438 rad — two and a half times the sharp lobe's. It is not a highlight;
 * it is a wide low wash across most of the lit white, which is why it is
 * bounded with the diffuse rather than with the gloss. See `FILM_GLOSS_ANG0`.
 */
export const SHEEN_LOBE_HALF = Math.acos(Math.pow(0.5, 1 / 7));

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
 * DERIVED, bracketed. How much of the surface's own brightness the **wet**
 * film takes away — a multiplier on the diffuse-lit colour.
 *
 * **Wetting darkens.** This replaces `DRY_DIM`, which had the sign backwards
 * and darkened the dry side. Darker on a sphere reads as shading and shading
 * reads as geometry, so dry patches looked like dents pressed into the globe.
 * They are not dents. A tear film is a smooth dielectric sheet over a
 * scattering substrate: light that leaves the substrate and meets the
 * film-air interface from inside at more than the critical angle is totally
 * internally reflected and sent back down for another chance at absorption.
 * The wet surface is darker and glossier; the dry patch is lighter and matte.
 *
 * Lekner & Dorf's result for a Lambertian source under a smooth film gives
 * the fraction returned at that interface as `r = 1 - 1/n²`, and with the
 * tear film's `n = 1.336` that is **0.4397** — 44% of the escaping light
 * turned back. After the multiple-scattering sum the ratio is
 *
 *     R_wet / R_dry = (1 - r) / (1 - R₀·r)
 *
 * which is albedo-dependent, and the globe spans a lot of albedo. Evaluated
 * on this eye's own colours:
 *
 *     sclera R/G/B (0.965, 0.950, 0.925)      2.7%   3.8%   5.6%
 *     limbal rim / vein red   (0.74)                16.9%
 *     iris (0.35, 0.45, 0.75)                33.8%  30.2%  16.4%
 *     pupil (0.05)                                  42.7%
 *
 * Area-weighted over the disc the film reaches, on the shader's own colour
 * build: **9.5% across the sclera alone, 22.7% including the iris.** A single
 * scalar cannot be right on both, and 0.15 is the value between them — inside
 * the physical bracket everywhere on the globe, and the same magnitude of
 * variation the previous, inverted form already shipped, so the only change
 * anyone sees is the sign.
 *
 * The clipping finding from `DRY_DIM` still holds and still selects this term
 * over any additive one. At the specular peak the diffuse term alone is
 * `(1.094, 1.078, 1.053)` per channel — past white before a single specular
 * term is added — and `finish()` tone-maps nothing. Nothing additive can move
 * a pixel that is already over 1; only a multiplier on what is already there
 * can. What the inverted sign changes is *which* side sits at the clamp: the
 * wet majority is now pulled down off it, which is where Task 13's aurora
 * gets the room to exist.
 */
export const WET_DARKEN = 0.15;

/**
 * The multiplier a given wetness puts on the surface's diffuse-lit colour.
 *
 * Exactly 1 at `wet = 0`, by construction rather than by rounding. The
 * identity moved here from `wet = 1` when the sign inverted, and it still has
 * to be exact: the shader feeds this a wetness that collapses to 0 on the
 * no-float-target fallback, where it multiplies every pixel of the globe and
 * must not tint it by a last bit.
 */
export function surfaceDim(wet: number): number {
  return 1 - WET_DARKEN * wet;
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

/* ------------------------------------------------------------------ *
 * The aurora, and the wind it blows in.
 *
 * Energy is released where the film tears, at the limbus, into a **wind that
 * does not belong to the eye**. The eye is an obstacle in a tunnel: the flow
 * parts at its upwind face, accelerates around it, and closes downwind, and
 * what it carries is stretched as it accelerates. That stretching is the whole
 * of the wispiness — there is no noise term anywhere in this file and none in
 * the GLSL that transcribes it.
 *
 * **What was retired, and why.** Task 13 shipped a second *surface* field in
 * (azimuth, angle) over the sclera: flux-form advection outward from the
 * limbus, anisotropic diffusion, Burgers self-steepening, an exactly
 * conservative divergence, a periodic azimuthal seam. It worked and it was
 * measured — transport within 2.4e-7 of conservative, the seam bit-identical,
 * a x1.91 breathing swing lagging the blink by 1.26s. It is gone because the
 * piece changed shape, not because it failed: **you cannot have two transports
 * carrying the same energy**, and a wind that goes around the globe is the
 * better one for what the piece is now. The measurements stand as prior art in
 * the task reports. What survives here is the causal chain the user chose —
 * the film tap, the azimuthal sparsity it produces, and the release band —
 * plus the colour-by-age, which the volume carries unchanged.
 *
 * Everything below is transcribed into GLSL by `film.ts` and `eye.ts` from
 * these same constants, so the reference and the shipped shaders cannot drift.
 * `windStep()` is the specification for the simulation and `windMarch()` for
 * the render; both are written where they can be driven headlessly.
 *
 * **Units.** Lengths in this section are in **globe radii**, not in the `q`
 * units `eyeW` draws in. The globe is the unit sphere at the origin, `z` is
 * toward the viewer, and `x`/`y` are screen right and up. Nothing here knows
 * the value of `eye.ts`'s `R`, which is what keeps the two from having to
 * agree about a number.
 * ------------------------------------------------------------------ */

/**
 * DERIVED. The limbus, where the cornea ends and the white begins — and now
 * the ring the energy is released from.
 *
 * `eye.ts` rings the limbus at `ang = 0.56` — `exp(-abs(ang - 0.56) * 26.0)` —
 * and fades the iris out across `smoothstep(0.62, 0.5, ang)`. 0.56 is the same
 * number, so the release boundary lands underneath the limbal glow, which is
 * the one place on the globe where a boundary can hide.
 */
export const AURORA_ANG0 = 0.56;

/**
 * The globe's radius in `eyeW`'s `q` units.
 *
 * It lives here because two shaders need it now — `eyeW` draws the sphere and
 * the march has to turn a pixel into globe radii — and a number that two
 * shaders must agree about is a number neither of them should spell out. Both
 * interpolate it; a test asserts they do.
 */
export const EYE_R = 0.36;

/**
 * DERIVED. Azimuthal extent of one source, in radians — the angular width a
 * single dry patch of film subtends at the seeding band.
 *
 * `breakupFraction`'s comment measures the patches at **12.6 `DELTA` cells**
 * across, and `AURORA_SEED_ANG0/1` puts the band at a mean angle of 0.47 rad,
 * where the tangent plane the film is stored in is foreshortened by
 * `sin(0.47)`. So one dry patch is `12.6 * DELTA / sin(0.47) = 0.348 rad` of
 * azimuth — about 20 degrees, some eighteen source-widths around the limbus.
 *
 * **This is the largest structure the volume has to carry**, and dividing it
 * by the flow's own stretching is what sizes the grid. See `WIND_NX`.
 */
export const AURORA_SOURCE_WIDTH = (12.6 * DELTA) / Math.sin((0.38 + 0.56) / 2);

/**
 * DERIVED. Inner and outer angle of the band on the **cornea** whose break-up
 * feeds the release above it, and how many taps read it.
 *
 * Unchanged from Task 13, and this is the piece of it that matters most: it is
 * the whole of the causal coupling. The band is one dry-patch diameter deep —
 * `12.6 * DELTA / cos(0.47) = 0.18 rad` — so a patch either fills its sector's
 * band or it does not, and the release stays discrete. It ends at the limbus
 * and is entirely inside `FILM_REACH`: the furthest tap sits at
 * `sin(0.56) = 0.531` against a reach of 0.581, so no tap ever reads a clamped
 * texel.
 *
 * Five taps put 0.036 rad — 2.6 cells of film — between samples, against
 * patches 12.6 cells across.
 */
export const AURORA_SEED_ANG1 = AURORA_ANG0;
export const AURORA_SEED_ANG0 = 0.38;
export const AURORA_SEED_TAPS = 5;

/**
 * DERIVED. Where the film's **diffuse darkening** stops being drawn.
 *
 * **This is the bound that answers "beads".** `WET_DARKEN` multiplies the
 * diffuse-lit colour, so a dry patch is a round region of the surface at a
 * different brightness — and on flat near-white sclera that reads as a bead of
 * water sitting on the eye rather than as a hole in a film. The precorneal
 * film is on the cornea; this keeps its darkening there.
 *
 * The band is exactly `AURORA_SEED_ANG0` to `AURORA_SEED_ANG1`, and that is by
 * construction rather than by coincidence: **the annulus where the film stops
 * being visible is the annulus whose break-up the aurora consumes.** The same
 * five taps that read it for the seed are the ones fading it out of the
 * render, so the energy does not disappear at the limbus, it changes form
 * there.
 *
 * The **broad sheen** rides this bound too, and for the same reason. It looks
 * like a specular term and is not one: `SHEEN_LOBE_HALF` is 0.438 rad, so it
 * is a wide low wash over most of the lit white rather than a highlight, and a
 * patch in it is a round brightness step on flat white — a bead again.
 * Measured, leaving it on the gloss bound instead put steps of up to 0.029 of
 * luminance on the white away from the catchlight; on this bound they are
 * 0.0000.
 */
export const FILM_DIM_ANG0 = AURORA_SEED_ANG0;
export const FILM_DIM_ANG1 = AURORA_SEED_ANG1;

/**
 * DERIVED. Where the film's **sharp gloss gating** stops being drawn.
 *
 * **A different question, so a different bound.** Inside a bright highlight a
 * dry patch does not read as a bead; it reads as the *gloss* failing, which is
 * what a tearing tear film actually looks like and what a clinician reads a
 * break-up time off. That effect is Task 10's whole deliverable and it lives
 * on the white, because `SPEC_ANG` is 0.696 and the limbus is 0.56.
 *
 * So this is bounded by the lobe rather than by the limbus: full strength in
 * to and through the peak, falling to nothing exactly where the sharp lobe
 * itself falls to half power, `SPEC_ANG + SPEC_LOBE_HALF = 0.866`. The film
 * modulates the highlight wherever the highlight is bright, and nowhere else.
 *
 * Measured, the share of the sharp lobe's energy the film still modulates:
 *
 *     filmReach alone (the ceiling)      64.9%
 *     x filmDim, the tight bound          6.2%
 *     x filmGloss                        59.5%
 *
 * The film-tilted normal `nf` rides this bound as well — it is the *shape* of
 * the highlight and it feeds nothing else now that the broad sheen is back on
 * the bare normal — and so does the lens coupling behind the caustic, which
 * `irisM` closes at 0.62 regardless.
 *
 * **Do not collapse this with `FILM_DIM_ANG1`.** One is bounded by where a
 * round brightness step reads as a droplet on flat white; the other by where
 * the specular lobe stops being bright. They are answering different
 * questions and they happen to be on either side of the limbus.
 */
export const FILM_GLOSS_ANG0 = SPEC_ANG;
export const FILM_GLOSS_ANG1 = SPEC_ANG + SPEC_LOBE_HALF;

/** 1 where the film darkens the surface, 0 on the white. */
export function filmDim(ang: number): number {
  return 1 - smoothstep(FILM_DIM_ANG0, FILM_DIM_ANG1, ang);
}

/** 1 where the film gates the sharp highlight, 0 past the lobe. */
export function filmGloss(ang: number): number {
  return 1 - smoothstep(FILM_GLOSS_ANG0, FILM_GLOSS_ANG1, ang);
}

/**
 * Where tap `k` of the release reads the film, in corneal-local tangent
 * coordinates, for a sector at azimuth `az`.
 *
 * **This is the whole of the causal coupling.** The film is stored in the
 * corneal-local tangent frame `gazeFrame()` builds; this maps a sector of the
 * limbus into that same frame, so when the eye turns, the sector that sheds
 * energy is the one over the part of the cornea that is actually tearing.
 * Nothing here knows about world axes, for the same reason `lidFrame` does
 * not — and that is exactly the asymmetry that makes the piece work now: the
 * **source** rides the gaze and the **wind** does not.
 */
export function auroraSeedTap(az: number, k: number): [number, number] {
  const ang =
    AURORA_SEED_ANG0 +
    ((k + 0.5) / AURORA_SEED_TAPS) * (AURORA_SEED_ANG1 - AURORA_SEED_ANG0);
  const s = Math.sin(ang);
  return [s * Math.cos(az), s * Math.sin(az)];
}

/* ---- The wind ---------------------------------------------------- */

/**
 * TUNED, in the two places a direction can be tuned and nowhere else.
 *
 * **In the screen plane**, because that is where a wind tunnel's flow can be
 * seen: the streamlines part at one limb, accelerate over the top and bottom
 * of the disc, and close at the other. A wind blowing along the view axis
 * would be radially symmetric on screen and would read as a sunburst.
 *
 * **Tilted 16 degrees into the screen** (the negative `z`), because a purely
 * in-plane wind leaves the density field mirror-symmetric in depth: the
 * material in front of the globe and the material behind it are the same
 * shape, and the front/behind sorting, though correct, buys nothing you can
 * see. Tilting it away from the viewer means a wisp crosses in **front** of
 * the eye and then goes **behind** it, which is the single clearest statement
 * that it is a separate thing in space and not a decal.
 *
 * **It is in world space and does not turn with the gaze.** That is the
 * point. Wind that turns when the model turns is attached to the model however
 * well it is rendered; the film-driven source rides the gaze, the wind does
 * not, and the two meeting is what the piece is.
 */
export const WIND_DIR: [number, number, number] = (() => {
  const v: [number, number, number] = [0.82, 0.5, -0.28];
  const m = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / m, v[1] / m, v[2] / m];
})();

/**
 * DERIVED. Half-extents of the tunnel's test section, in globe radii.
 *
 * Across the screen: 1.6, so there is 0.6 of a globe radius of clear air
 * around the disc for the wisps to stand off into. At the shipped framing
 * (`R = 0.36` against a half-frame of 0.44) that is 49% of the way from the
 * silhouette to the top of the frame, so the volume runs off the top and
 * bottom of a 16:9 frame and cannot show an edge there.
 *
 * Along the view: 1.4, fewer radii and — see `WIND_NZ` — far fewer cells,
 * because the march integrates along this axis and blurs it.
 *
 * The left and right faces **are** inside a 16:9 frame (half-width 0.782 in
 * `q` against the box's 0.576), so the march fades the density out over
 * `WIND_FADE` at every face rather than cutting it. The decay does most of the
 * work already: material reaching the downwind face has been in flight
 * `2 * WIND_HALF_XY / WIND_U` and is down to 8% of what was released.
 */
export const WIND_HALF_XY = 1.6;
export const WIND_HALF_Z = 1.4;

/**
 * DERIVED. Cells across the volume: **96 x 96 x 48**, 442368 of them.
 *
 * The structure this has to carry is one dry patch of film, released at the
 * limbus and then thinned by the flow. `AURORA_SOURCE_WIDTH` is 0.348 rad, so
 * a source is 0.348 globe radii of arc when it leaves; potential flow past a
 * sphere accelerates a surface parcel from rest at the forward stagnation
 * point to `1.5 U` at the equator, and a material element stretched along the
 * flow by that ratio is thinned across it by the same ratio. So the narrowest
 * filament the volume must hold is about `0.348 / 1.5 = 0.232` radii.
 *
 * Four cells across that wants `0.058` radii. `2 * 1.6 / 96 = 0.0333` gives
 * **seven**, which is more margin than the derivation demands and is what the
 * budget allows rather than what it insists on; the honest measurement of what
 * the field actually reaches is in the test, not here.
 *
 * The view axis gets half the cells — `2 * 1.4 / 48 = 0.0583` radii, **3.97**
 * across a filament — because the march integrates along it. It is the one
 * axis allowed under the four-cell floor, and the only one where a cell is
 * never resolved on its own.
 *
 * **Cost: 442368 cells at 60Hz is 26.5M fragments per second**, against the
 * film's 31.3M. The simulation is the cheap half of this task; the march is
 * the expensive one. See `WIND_MARCH`.
 */
export const WIND_NX = 96;
export const WIND_NY = 96;
export const WIND_NZ = 48;

/** Cell size, in globe radii. The two screen axes share one; the view axis does not. */
export const WIND_DX = (2 * WIND_HALF_XY) / WIND_NX;
export const WIND_DZ = (2 * WIND_HALF_Z) / WIND_NZ;

/**
 * DERIVED. Freestream speed, in globe radii per second.
 *
 * Fixed by wanting the test section to **turn over in 2.5 seconds** — three
 * quarters of the 3.35s mean interblink `BLINK_FRACTION` produces. One blink's
 * release therefore crosses the frame and has largely faded before the blink
 * after next arrives, so what you see is a succession of puffs rather than a
 * steady plume, and the rhythm of the film survives into the air.
 *
 * `2 * WIND_HALF_XY / 2.5 = 1.28`. The flow reaches `1.5 * 1.28 = 1.92` at the
 * equator, which is what sets the step.
 */
export const WIND_U = (2 * WIND_HALF_XY) / 2.5;

/**
 * DERIVED. Decay time, in seconds.
 *
 * **Set against the breathing, which is the one thing about the rhythm the
 * piece has already been judged on.** The blink wipes every source at once,
 * and how much of that squareness survives is set by the volume's memory:
 * this plus the transit. Measured on the coupled run at the shipped step, 30
 * seconds and nine blinks each:
 *
 *     tau    swing    largest change in 1/6s     trough lag    aspect
 *            /trough   as a share of the swing
 *     1.6     x3.18            0.505               1.23s        4.27
 *     2.2     x2.99            0.480               1.30s        4.22
 *     2.8     x2.90            0.464               1.37s        4.19
 *
 * The third column is the number that separates breathing from switching — a
 * switch puts the whole swing into a frame or two — and Task 13 shipped at
 * 0.40 against a bound of 0.5. **2.2 is the shortest memory that clears that
 * bound**, and the structure is indifferent to it: the aspect moves by 2% over
 * the whole sweep, because what makes the filaments is the flow and not the
 * decay.
 *
 * It also sets how far material gets: `WIND_U * WIND_TAU = 2.82` radii, which
 * is most of the test section, so a wisp is still visible when it leaves the
 * frame and `WIND_FADE` has real work to do.
 */
export const WIND_TAU = 2.2;

/**
 * DERIVED. Fixed step — and it is the **largest** the trajectory will carry,
 * not the smallest the flow will allow. This is the opposite of the usual rule
 * and the measurement that overturned it is below.
 *
 * Semi-Lagrangian advection is unconditionally stable, so the CFL number does
 * not bound the step. What it costs instead is **one trilinear interpolation
 * per step**, and every interpolation is a low-pass filter: the scheme's
 * numerical diffusion is per-step, not per-second. Halve the step rate and you
 * halve the smearing — and halve the cost with it. Measured on the coupled
 * run, 10 seconds each, correlation lengths of the advected material:
 *
 *     rate    along   across   aspect   mean |grad E| / mean E
 *     60Hz    0.527   0.410     1.29           2.455
 *     30Hz    0.504   0.316     1.59           2.705
 *     20Hz    0.480   0.277     1.73           2.803
 *     15Hz    0.433   0.250     1.74           3.031
 *
 * **The filaments get thinner as the step gets longer**, which is the whole of
 * the wispiness argument and is why there is no noise term anywhere near this
 * file: the structure was already there and the scheme was eating it.
 *
 * What bounds it is the **trajectory**, not the interpolation. RK2 on a flow
 * this curved drifts, and a parcel that ends a transit in the wrong cell is
 * carrying structure to the wrong place. Measured against a 64x-refined
 * reference over one 2.5s transit:
 *
 *     rate    drift          in cells of WIND_DX
 *     60Hz    0.00164 radii        0.05
 *     30Hz    0.01269 radii        0.38
 *     20Hz    0.03971 radii        1.19
 *     15Hz    0.09329 radii        2.80
 *
 * **1/30 is the largest step that lands a parcel inside the cell it belongs to
 * after crossing the whole test section.** 20Hz buys another 0.14 of aspect
 * and spends 1.2 cells of position for it, which is a worse trade than it
 * looks: the drift is systematic and rotates the whole plume.
 *
 * Cost: 442368 cells at 30Hz is **13.3M fragments per second**, against the
 * film's 31.3M. The simulation is less than half the film and the march is
 * nine times the simulation; see `WIND_MARCH`.
 */
export const WIND_STEP = 1 / 30;

/**
 * DERIVED. Substep ceiling: **one**, and the honest note is that this is the
 * closest a 1/30 step can come to the film's backlog cap rather than a match.
 *
 * `MAX_SUBSTEPS * STEP` is 0.0253s; one wind step is 0.0333s. So on a slow
 * frame the volume can age 0.008s more than the film does — a third of a step,
 * against a memory of `WIND_TAU = 1.6s`, which is half a percent. The reason
 * to care at all is the one `filmTick` sets out: two coupled fields that
 * throttle by different factors drift apart, and the release would stop being
 * in step with the break-up that produced it. Half a percent is not that.
 */
export const WIND_MAX_SUBSTEPS = Math.max(
  1,
  Math.round((MAX_SUBSTEPS * STEP) / WIND_STEP)
);

/**
 * DERIVED. Seconds of wind run at init, so the air is not empty on the first
 * frame.
 *
 * One traverse plus one decay time is when the volume stops changing under a
 * held release: the leading edge has crossed the test section and the oldest
 * material behind it has faded. 4.7s is 141 steps, 62M fragments once, against
 * the film's 75M.
 */
export const WIND_PRIME_SECONDS = (2 * WIND_HALF_XY) / WIND_U + WIND_TAU;

/** One frame of the wind's clock. Same shape as `filmTick`, own step. */
export function windTick(acc: number, dt: number): FilmTick {
  let left = Math.min(acc + dt, WIND_MAX_SUBSTEPS * WIND_STEP);
  let steps = 0;
  while (left >= WIND_STEP) {
    left -= WIND_STEP;
    steps++;
  }
  return { steps, acc: left, ran: steps * WIND_STEP };
}

/**
 * **Potential flow past a sphere of radius 1.** This is the wind tunnel, and
 * it is analytic rather than approximated.
 *
 *     u = U - (1 / (2 r^3)) * ( 3 (U . n) n - U )        n = p / |p|
 *
 * which is the gradient of `phi = U.p (1 + 1/(2 r^3))`, the classical
 * dipole-plus-uniform solution. Its three properties are the three things that
 * make the picture read as a wind tunnel, and none of them is tuned:
 *
 * - **It stagnates at the upwind pole.** `U . n = U` there and the two terms
 *   cancel exactly, so the flow comes to rest against the eye.
 * - **It reaches exactly `1.5 U` at the equator.** `U . n = 0` there, so
 *   `u = U + U/2`. That factor is the stretching budget — see `WIND_NX` — and
 *   it is the number the test measures the field against.
 * - **It never enters the sphere.** `u . n = U cos(theta) (1 - 1/r^3)`, which
 *   is identically zero at `r = 1` whatever the direction. The globe is a
 *   streamsurface, so nothing has to be done to keep material out of it.
 *
 * Inside the sphere the dipole diverges; `r` is clamped to 1, which is where
 * the only callers — a backtrace that has stepped slightly inside — belong
 * anyway.
 */
export function windFlow(
  p: [number, number, number],
  u = WIND_U
): [number, number, number] {
  const len = Math.max(Math.hypot(p[0], p[1], p[2]), 1e-6);
  const r = Math.max(len, 1);
  const n: [number, number, number] = [p[0] / len, p[1] / len, p[2] / len];
  const w: [number, number, number] = [
    WIND_DIR[0] * u,
    WIND_DIR[1] * u,
    WIND_DIR[2] * u,
  ];
  const d = w[0] * n[0] + w[1] * n[1] + w[2] * n[2];
  const k = 1 / (2 * r * r * r);
  return [
    w[0] - k * (3 * d * n[0] - w[0]),
    w[1] - k * (3 * d * n[1] - w[1]),
    w[2] - k * (3 * d * n[2] - w[2]),
  ];
}

/* ---- The release ------------------------------------------------- */

/**
 * DERIVED. How thick a shell above the surface the energy enters, and how wide
 * a ring in angle — both two cells, in radii and in radians respectively.
 *
 * **Two cells and not zero, because the sphere is a streamsurface.** `windFlow`
 * has no radial velocity at `r = 1` at all, so anything released exactly on the
 * surface stays there forever. Energy has to enter the air above the eye, and
 * the thinnest layer the grid can hold it in is the one it is resolved on.
 */
export const WIND_RELEASE_H = 2 * WIND_DX;
export const WIND_RELEASE_DANG = 2 * WIND_DX;

/**
 * DERIVED. Release rate, energy per second per unit of dry fraction.
 *
 * The same contract `AURORA_SEED` carried: fixed by wanting a **fully torn
 * sector to hold E = 1 in the release band in steady state**, so the field's
 * natural scale is 1 and the display gain has one meaning rather than being a
 * free brightness knob. Steady state is rate times residence, and residence is
 * the band's arc divided by the speed that carries material out of it.
 *
 * That speed is the tangential flow at the surface, `1.5 * WIND_U * sin(theta)`
 * against the wind axis, and the limbus ring sweeps through every `theta` as
 * the gaze moves, so the honest figure is its mean over the sphere:
 * `<sin(theta)> = pi/4`. Hence `1.5 * U * pi/4 = 1.508` radii per second,
 * a residence of 0.044s, and a rate of 22.6.
 */
export const WIND_RELEASE = (1.5 * WIND_U * Math.PI) / 4 / WIND_RELEASE_DANG;

/**
 * The release gate at a point: 1 in the ring of air just outside the limbus,
 * 0 everywhere else, smooth at both boundaries.
 *
 * `r` is the distance from the globe's centre in radii and `ang` the angle
 * from the gaze axis. The angular profile peaks **exactly at the limbus**, so
 * its inner half is over the cornea where `eye.ts`'s limbal ring is already
 * glowing and its boundary cannot be seen.
 */
export function windReleaseGate(r: number, ang: number): number {
  const gr = 1 - smoothstep(0, WIND_RELEASE_H, r - 1);
  const ga =
    smoothstep(AURORA_ANG0 - WIND_RELEASE_DANG, AURORA_ANG0, ang) *
    (1 - smoothstep(AURORA_ANG0, AURORA_ANG0 + WIND_RELEASE_DANG, ang));
  return Math.max(0, gr) * ga;
}

/* ---- The volume -------------------------------------------------- */

/** The two-channel volume. `E` is energy density, `A` is age-density. */
export interface WindField {
  nx: number;
  ny: number;
  nz: number;
  E: Float32Array;
  A: Float32Array;
  /** Scratch for the step's output; swapped in, not reallocated. */
  E1: Float32Array;
  A1: Float32Array;
}

/**
 * A volume. The shipped one is `WIND_NX x WIND_NY x WIND_NZ`; the tests drive
 * coarser ones for the dynamics checks, which is the only reason the
 * dimensions live on the field rather than being read from the constants.
 */
export function newWindField(
  nx = WIND_NX,
  ny = WIND_NY,
  nz = WIND_NZ
): WindField {
  const n = nx * ny * nz;
  return {
    nx,
    ny,
    nz,
    E: new Float32Array(n),
    A: new Float32Array(n),
    E1: new Float32Array(n),
    A1: new Float32Array(n),
  };
}

/** Centre of cell `(i, j, k)`, in globe radii. */
export function windCell(
  f: WindField,
  i: number,
  j: number,
  k: number
): [number, number, number] {
  return [
    -WIND_HALF_XY + ((i + 0.5) / f.nx) * 2 * WIND_HALF_XY,
    -WIND_HALF_XY + ((j + 0.5) / f.ny) * 2 * WIND_HALF_XY,
    -WIND_HALF_Z + ((k + 0.5) / f.nz) * 2 * WIND_HALF_Z,
  ];
}

/**
 * Trilinear fetch at a point in radii, **clamped at the faces** — exactly what
 * `CLAMP_TO_EDGE` on the 3D texture does, so the reference and the shader
 * agree to the last bit of the interpolation.
 *
 * Clamping is safe here only because of where the material comes from: it
 * enters at the limbus and leaves downwind, so every face cell is empty and
 * extending it extends nothing. A backtrace that exits the box exits through
 * an **upwind** face by construction, and picks up the zero that is there.
 * The march's own `windFade` is what stops the box showing an edge on screen.
 */
export function windSample(
  f: WindField,
  p: [number, number, number]
): [number, number] {
  const gx = ((p[0] + WIND_HALF_XY) / (2 * WIND_HALF_XY)) * f.nx - 0.5;
  const gy = ((p[1] + WIND_HALF_XY) / (2 * WIND_HALF_XY)) * f.ny - 0.5;
  const gz = ((p[2] + WIND_HALF_Z) / (2 * WIND_HALF_Z)) * f.nz - 0.5;
  const i0 = Math.floor(gx);
  const j0 = Math.floor(gy);
  const k0 = Math.floor(gz);
  const fx = gx - i0;
  const fy = gy - j0;
  const fz = gz - k0;
  const cl = (v: number, n: number) => Math.min(n - 1, Math.max(0, v));
  let e = 0;
  let a = 0;
  for (let dk = 0; dk < 2; dk++) {
    const k = cl(k0 + dk, f.nz);
    const wk = dk ? fz : 1 - fz;
    for (let dj = 0; dj < 2; dj++) {
      const j = cl(j0 + dj, f.ny);
      const wj = dj ? fy : 1 - fy;
      for (let di = 0; di < 2; di++) {
        const i = cl(i0 + di, f.nx);
        const w = (di ? fx : 1 - fx) * wj * wk;
        const n = (k * f.ny + j) * f.nx + i;
        e += w * f.E[n];
        a += w * f.A[n];
      }
    }
  }
  return [e, a];
}

/** Overrides for `windStep`, so the scheme can be driven term by term. */
export interface WindOpts {
  dt?: number;
  u?: number;
  /** Seconds. `Infinity` switches decay off. */
  tau?: number;
  rate?: number;
  /** Unit gaze direction. Defaults to straight at the viewer. */
  gaze?: [number, number, number];
}

/**
 * One wind step. **This is the specification the GLSL transcribes.**
 *
 * Semi-Lagrangian: each cell asks where its contents came from, backtraces
 * along the analytic flow with RK2, and fetches there. Then decay, then
 * release. It is unconditionally stable, it needs no pressure solve because
 * `windFlow` is already divergence-free, and — the reason it is the right
 * scheme here rather than a flux form — it carries a filament through a
 * shearing flow without the directional bias an upwind stencil would give it.
 *
 * **What it does not do is diffuse.** There is no explicit diffusion term
 * anywhere: the only smoothing is the trilinear fetch's own, which is the
 * minimum a grid can have. Task 13 needed diffusion to keep an upwind scheme
 * from ringing; this one is monotone by interpolation and does not.
 *
 * **The backtrace cannot leave the globe's interior with anything**, because
 * `windFlow` has no radial component at the surface, so no streamline crosses
 * it. RK2 can still land a hair inside on a curved streamline; such a point is
 * projected back out radially, which is where the parcel actually was.
 *
 * `A` is age density: `A/E` is the mean age of the energy in a cell, in
 * seconds. It rides the same backtrace, decays at the same rate — so the ratio
 * is decay-invariant — and gains `E` per second. Release injects `E` with no
 * `A`, so new material is new.
 *
 * `dry` gives the dry fraction of the film's seeding band at an azimuth, in
 * the gaze frame; `null` switches release off, which is what the transport
 * checks need.
 */
export function windStep(
  f: WindField,
  dry: ((az: number) => number) | null,
  o: WindOpts = {}
): void {
  const dt = o.dt ?? WIND_STEP;
  const u = o.u ?? WIND_U;
  const tau = o.tau ?? WIND_TAU;
  const rate = o.rate ?? WIND_RELEASE;
  const gd = o.gaze ?? [0, 0, 1];
  const dec = Math.exp(-dt / tau);
  const { E, A, E1, A1 } = f;
  // The gaze frame, exactly as `gazeFrame` and `eyeW` build it.
  const tx = norm3(cross3([0, 1, 0], gd));
  const ty = cross3(gd, tx);
  for (let k = 0; k < f.nz; k++) {
    for (let j = 0; j < f.ny; j++) {
      for (let i = 0; i < f.nx; i++) {
        const n = (k * f.ny + j) * f.nx + i;
        const p = windCell(f, i, j, k);
        const r = Math.hypot(p[0], p[1], p[2]);
        if (r < 1) {
          // Inside the globe. Nothing lives here and the march never reads it.
          E1[n] = 0;
          A1[n] = 0;
          continue;
        }
        // RK2 backtrace. The midpoint matters: the streamlines are at their
        // most curved exactly where the material is, hugging the sphere.
        const v0 = windFlow(p, u);
        const pm: [number, number, number] = [
          p[0] - 0.5 * dt * v0[0],
          p[1] - 0.5 * dt * v0[1],
          p[2] - 0.5 * dt * v0[2],
        ];
        const vm = windFlow(pm, u);
        let q: [number, number, number] = [
          p[0] - dt * vm[0],
          p[1] - dt * vm[1],
          p[2] - dt * vm[2],
        ];
        const qr = Math.hypot(q[0], q[1], q[2]);
        if (qr < 1 && qr > 0) q = [q[0] / qr, q[1] / qr, q[2] / qr];
        const [e0, a0] = windSample(f, q);
        let e = e0 * dec;
        const a = (a0 + dt * e0) * dec;
        if (dry) {
          const g = windReleaseGate(r, 0);
          // The gate is separable, so the radial half is worth computing
          // before the angular half asks for an acos.
          if (g > 0 || r <= 1 + WIND_RELEASE_H) {
            const nx = p[0] / r;
            const ny = p[1] / r;
            const nz = p[2] / r;
            const ang = Math.acos(
              Math.min(1, Math.max(-1, nx * gd[0] + ny * gd[1] + nz * gd[2]))
            );
            const az = Math.atan2(
              nx * ty[0] + ny * ty[1] + nz * ty[2],
              nx * tx[0] + ny * tx[1] + nz * tx[2]
            );
            const gate = windReleaseGate(r, ang);
            if (gate > 0) e += dt * rate * dry(az) * gate;
          }
        }
        E1[n] = e;
        A1[n] = a;
      }
    }
  }
  f.E = E1;
  f.A = A1;
  f.E1 = E;
  f.A1 = A;
}

/** The volume's total energy. Zero release and zero decay must leave it alone. */
export function windMass(f: WindField): number {
  let m = 0;
  for (let n = 0; n < f.E.length; n++) m += f.E[n];
  return m;
}

/* ---- The render -------------------------------------------------- */

/**
 * DERIVED. Age, in seconds, at which emission has run all the way from `ELEC`
 * to `VMAG`.
 *
 * One decay time — `WIND_TAU` now rather than `AURORA_TAU`, but the same
 * statement. A parcel that has lived as long as the air's own memory has
 * cooled; one freshly released has not. **The colour is a function of the
 * field's state and not of where the pixel is**, so a wisp that stalls at the
 * upwind stagnation point cools there while one flung around the equator
 * arrives still blue. That layering is now a consequence of the flow.
 */
export const AURORA_COOL = WIND_TAU;

/**
 * DERIVED. March samples per ray. **16**, with a spatial dither.
 *
 * The cost, honestly: the march runs at **quarter linear resolution** and is
 * bilinearly upsampled, so at 1920x1080 it is 480x270 pixels, 16 samples each,
 * 60 times a second — **124.4M samples per second**, one hardware-trilinear 3D
 * fetch apiece. For scale, the film's step pass is 31.3M fragments per second
 * of roughly five fetches each, so this is below the film's own texture
 * traffic and it is the largest single thing the render does.
 *
 * Quarter resolution rather than fewer samples because **resolution is what
 * preserves a filament** — the narrowest wisp is seven cells across and a
 * sixth-res march would mush exactly the thing the piece is about — while
 * banding from a short march is what a dither is for, on media this soft.
 *
 * The chord is up to `2 * WIND_HALF_Z = 2.8` radii, so 16 samples is a step of
 * 0.175 radii against a view-axis cell of 0.0583: **three cells a step**. That
 * is undersampled on purpose and the dither is not decoration — without it the
 * volume would show 16 shells. The dither is a 4x4 Bayer value of the march
 * pixel's own coordinates, **not of time**: a temporal jitter would need
 * accumulation to resolve, and there is none.
 */
export const WIND_MARCH = 16;

/** The 4x4 Bayer value of a march pixel, in [0, 1). */
export function bayer4(x: number, y: number): number {
  const M = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];
  return M[((y % 4) + 4) % 4][((x % 4) + 4) % 4] / 16;
}

/**
 * DERIVED. How far in from each face the density is faded to zero, in radii.
 *
 * **Four cells, because `WIND_TAU` grew.** The box's top and bottom faces are
 * outside a 16:9 frame, but its left and right faces are inside it, and a
 * volume that stops on a plane reads as a volume in a box. At a 1.6s memory
 * material reaches the downwind face at 21% of what was released — not the 8%
 * a one-second memory left there — so the decay no longer hides the box by
 * itself and this has real work to do. Four cells is 0.133 radii, a fifth of
 * the clear air between the silhouette and the box.
 */
export const WIND_FADE = 4 * WIND_DX;

/**
 * DERIVED. Extinction per unit of energy density per radius of path.
 *
 * **This is what makes the wisps occupy space rather than glow through it.**
 * A wisp in front of the eye dims what is behind it, which is the strongest
 * statement available that it is between you and the globe; one behind the eye
 * is not drawn at all, which the march handles by stopping at the sphere.
 *
 * The number is measured rather than chosen. Optical depth of the densest
 * rays, over the whole box, on the coupled run:
 *
 *     sigma    alpha p90   p99     max
 *      0.55      0.0018   0.0105  0.031
 *      4         0.0128   0.0742  0.206
 *      8         0.0254   0.1429  0.369
 *     16         0.0502   0.2655  0.602
 *
 * 5.0 puts the **densest ray in the frame at about a quarter** — visible as
 * depth, nowhere near a grey veil over a white eye — while the ninetieth
 * percentile is under 2%, so the overwhelming majority of the air is
 * effectively transparent and the volume reads as emission with occasional
 * body rather than as fog.
 *
 * Setting it to 0 leaves a purely emissive volume and changes nothing else.
 */
export const WIND_SIGMA = 5.0;

/**
 * DERIVED, against contrast on the white rather than against headroom.
 *
 * **The overdrive is inherited from Task 13 and the trade is the same one.**
 * Physical brightness put the energy below the threshold of visibility on a
 * near-white sclera; the piece chose to keep the whites white and push. What
 * makes the overdrive read as colour rather than as a smear is the
 * hue-preserving compression at the end of `eyeW`: past the point where the
 * brightest channel reaches 1, more gain stops buying luminance and starts
 * buying hue.
 *
 * What changed is what the gain multiplies. Task 13's 2.75 scaled a **surface**
 * value read once per pixel; this scales an **emission density integrated
 * along a chord**, in units of energy per radius of path. The two are not
 * comparable and this was re-derived from scratch, against the same three
 * points on the white and the same 20-40% band.
 *
 * **Measured where the wisps are, not averaged around the ring.** The wind is
 * directional and fixed in world space, so unlike Task 13's field the aurora
 * is *not* azimuthally uniform: there are bearings that are permanently
 * downwind and bearings that are permanently upwind. Averaging contrast around
 * the ring therefore measures mostly empty air — 4% where the p95 is 29% — and
 * it is the p95 that says whether a viewer can see a wisp. Both are reported;
 * the gain is derived off the p95, at the median phase of the blink cycle:
 *
 *     gain   near-limbus     mid-sclera      grazing
 *            contr / sat     contr / sat     contr / sat
 *      24    21.9% / 0.24    10.7% / 0.11     9.8% / 0.16
 *      30    28.9% / 0.27    13.9% / 0.13    12.7% / 0.17
 *      36    33.8% / 0.31    17.1% / 0.15    15.7% / 0.19
 *      42    36.1% / 0.33    20.3% / 0.17    18.6% / 0.20
 *      50    34.4% / 0.36    24.6% / 0.19    22.6% / 0.22
 *      58    34.8% / 0.39    28.9% / 0.21    26.5% / 0.23
 *      68    37.1% / 0.42    34.3% / 0.23    31.4% / 0.25
 *
 * Base saturation on the white is 0.024, 0.023 and 0.063 at those points, so
 * every row is several times more coloured than the surface it sits on. Near
 * the limbus the contrast stops rising past 42 — that is the compression's
 * knee, reached there first, exactly as Task 13 found.
 *
 * **50 is the smallest gain at which all three points clear 20%** — 42 leaves
 * the grazing point at 18.6%. That is the same rule Task 13 derived 2.75 by.
 *
 * The field breathes by a factor of three, so no single gain holds all three
 * points inside the band at every phase, and this one does not pretend to.
 * Across the cycle at this gain the three points run:
 *
 *     trough   33% / 11% / 10%
 *     median   34% / 25% / 23%
 *     peak     38% / 46% / 49%
 *
 * The outer two points fall out of the bottom of the band at the trough and
 * the middle one goes over the top at the peak. That spread **is** the
 * breathing; flattening it would mean flattening the thing the blink does.
 */
export const AURORA_GAIN = 50;

/**
 * Emission colour for a sample, from its own state: `ELEC` where the energy is
 * young, `VMAG` where it has aged. `eye.ts` carries the same two constants and
 * the same mix.
 */
export function auroraColour(E: number, A: number): [number, number, number] {
  const ELEC = [0.3, 0.55, 1.0];
  const VMAG = [0.85, 0.2, 0.75];
  const t = smoothstep(0, AURORA_COOL, A / Math.max(E, 1e-4));
  const g = AURORA_GAIN * Math.max(0, E);
  return [
    (ELEC[0] + (VMAG[0] - ELEC[0]) * t) * g,
    (ELEC[1] + (VMAG[1] - ELEC[1]) * t) * g,
    (ELEC[2] + (VMAG[2] - ELEC[2]) * t) * g,
  ];
}

/** The box fade at a point: 1 in the interior, 0 at every face. */
export function windFade(p: [number, number, number]): number {
  const f = (v: number, half: number) =>
    smoothstep(0, WIND_FADE, half - Math.abs(v));
  return f(p[0], WIND_HALF_XY) * f(p[1], WIND_HALF_XY) * f(p[2], WIND_HALF_Z);
}

/**
 * One ray of the march. **This is the specification `eye.ts` transcribes.**
 *
 * `x` and `y` are the pixel in globe radii — `q / R` — and the view is
 * orthographic, so the ray is `(x, y, z)` with `z` running from the box's near
 * face toward the viewer's far side. Front to back, so the accumulated
 * transmittance is available to weight each sample as it is taken.
 *
 * **The sorting is exact and is the whole reason the wisps read as being in
 * space.** The ray stops at the analytic sphere intersection when there is
 * one, so everything behind the globe is never sampled and the globe occludes
 * it by construction rather than by comparison; and everything the march
 * *does* accumulate is in front of the globe, so the result composites over
 * `eyeW`'s colour with a single `mix`. There is no depth buffer and no
 * approximation in it.
 *
 * Returns premultiplied colour and the coverage `1 - T`.
 */
export function windMarch(
  f: WindField,
  x: number,
  y: number,
  dither = 0.5,
  samples = WIND_MARCH
): { rgb: [number, number, number]; alpha: number } {
  const rgb: [number, number, number] = [0, 0, 0];
  if (Math.abs(x) >= WIND_HALF_XY || Math.abs(y) >= WIND_HALF_XY) {
    return { rgb, alpha: 0 };
  }
  const zStart = WIND_HALF_Z;
  const d2 = x * x + y * y;
  // The globe's near surface where the ray hits it, the box's far face where
  // it does not. One `max`, and it is both the occlusion and the exit test.
  const zStop = d2 < 1 ? Math.sqrt(1 - d2) : -WIND_HALF_Z;
  const span = zStart - zStop;
  if (span <= 0) return { rgb, alpha: 0 };
  const ds = span / samples;
  let T = 1;
  for (let i = 0; i < samples; i++) {
    const z = zStart - (i + dither) * ds;
    const p: [number, number, number] = [x, y, z];
    const [e0, a0] = windSample(f, p);
    const e = Math.max(e0, 0) * windFade(p);
    // The hue is the *unfaded* age ratio: the fade scales E and A together, so
    // dimming a wisp at the box face must not also cool it.
    const age = a0 / Math.max(e0, 1e-4);
    const em = auroraColour(e, age * e);
    for (let c = 0; c < 3; c++) rgb[c] += T * em[c] * ds;
    T *= Math.exp(-WIND_SIGMA * e * ds);
  }
  return { rgb, alpha: 1 - T };
}

/* ---- The root ---------------------------------------------------- */

/**
 * DERIVED. The half-width of the glow left on the surface where the energy
 * leaves it, in radians of angle from the gaze axis.
 *
 * **Without it the wisps appear in mid-air with no visible origin**, and the
 * causal story the user chose — the aurora is driven by the film — becomes
 * invisible even though it is still true. A short bright root at the limbus is
 * what makes a viewer read the wisps as *shed by the eye* rather than blowing
 * past it.
 *
 * It is exactly `WIND_RELEASE_DANG`, the angular half-width of the release
 * band itself, so the glow is the release and not a second aurora. Two cells
 * of the volume, 0.0667 rad, 3.8 degrees — and centred on `AURORA_ANG0`, so
 * its inner half sits under `eye.ts`'s limbal ring.
 */
export const ROOT_DANG = WIND_RELEASE_DANG;

/**
 * DERIVED. The root's gain, against the volume's.
 *
 * **A third of the contrast the volume reaches**, so it says where the energy
 * comes from without becoming a second aurora. Measured on the white at the
 * limbus, mean over three azimuths:
 *
 *     ROOT_GAIN   contrast   saturation   max channel
 *       0.10        9.8%        0.33         0.84
 *       0.20       19.5%        0.37         0.94
 *       0.30       26.0%        0.41         1.04
 *       0.46       27.3%        0.45         1.20
 *       0.70       22.1%        0.49         1.44
 *
 * The volume's own p95 contrast at the three sclera points is 34%, 25% and
 * 23%; 0.10 puts the root at 9.8%, which is between a third and a half of the
 * dimmest of them. It is also the last row that stays **under** the
 * compression knee — max channel 0.84 — so the root lifts luminance rather
 * than trading it for hue, which is what a bright root has to do. Past 0.30
 * the contrast goes backwards for exactly the reason `AURORA_GAIN`'s table
 * does.
 */
export const ROOT_GAIN = 0.1;

/** The root's profile at an angle from the gaze axis: a band on the limbus. */
export function rootGate(ang: number): number {
  return (
    smoothstep(AURORA_ANG0 - ROOT_DANG, AURORA_ANG0, ang) *
    (1 - smoothstep(AURORA_ANG0, AURORA_ANG0 + ROOT_DANG, ang))
  );
}
