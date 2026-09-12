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
