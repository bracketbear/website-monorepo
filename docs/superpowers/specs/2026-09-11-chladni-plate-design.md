# Chladni Plate — design spec

**Status:** proposed
**Date:** 2026-09-11
**Lands as:** a new `toys` entry in the Animation Lab registry

## What this is

A vibrating plate with sand on it. You sweep a drive frequency with the cursor; where the
frequency lands on one of the plate's eigenmodes, the plate rings, and the sand migrates off the
moving regions and collects on the nodal lines, drawing the mode.

The plate's boundary is swappable — square, circle, or the [BB] mark — and the same integrator,
the same sand and the same tone produce a completely different figure for each. That swap is the
argument the toy makes: nothing here is painted. The figure is a property of the boundary.

## Why this one

The `toys` section already owns wave propagation (`caustics-pool`), reaction-diffusion
(`rd-vat`), Navier-Stokes (`ink-dissolve`), stigmergic agents (`slime-mold`) and agent locomotion
(`jelly-tank`). It has no granular physics, and it has nothing whose visible structure is an
_eigenvalue_.

It is also the cheapest honest loop closure available. `caustics-pool` pays a `readPixels` per
toy per frame because its toys are CPU objects. Grains here live in a float texture and render
into a density buffer that the integrator samples directly — the closure costs one texture read
inside the step pass, with no GPU→CPU sync at all.

## Decisions

### D1 — The plate is a plate, not a membrane

The governing equation is Kirchhoff–Love, fourth order and stiffness-dominated:

```
∂²w/∂t² = −β ∇⁴w
```

This is the load-bearing decision. Reusing the `caustics-pool` wave integrator (∇², second
order) would be cheaper and would still produce real nodal lines — but they would be a
_drumhead's_ nodal lines. On a square, a membrane's modes are plain `sin(mπx)·sin(nπy)`: grids
and diagonals. The curvy, non-obvious figures that make Chladni plates famous are fourth-order
with free edges. A membrane version would be honest physics of the wrong phenomenon.

**Implementation:** two passes per simulation step.

1. `L = ∇²w`, written to an intermediate target, zeroed outside the plate mask.
2. `w' = 2w − w_prev − β·∇²L + forcing`, then damping.

Splitting it is not only for the stencil; it is where the boundary condition goes.

### D2 — Simply supported edges, and the spec says so plainly

An earlier draft of this spec claimed "free edges via zero bending moment." That was wrong, and
the correction matters enough to record rather than quietly swap.

What is actually implementable on an irregular masked boundary — and the mark's boundary is very
irregular — is **simply supported**: `w = 0` and `∇²w = 0` on the edge. Both fall straight out of
the mask. Cells outside the plate hold `w = 0`, and `L` is zeroed outside, so the two conditions
are imposed by construction with no ghost-cell extrapolation anywhere.

Free-free is the textbook Chladni case and this is not it. The honest statement is that this is a
driven simply-supported plate.

**Why the figures are still non-trivial, which is the part that nearly killed the design.** On a
square, every standard separable boundary condition has separable eigenfunctions —
`sin(mπx)·sin(nπy)` — which are grids and diagonals, the exact boring outcome D1 exists to avoid.
The rescue is **degeneracy**: `(m,n)` and `(n,m)` share a frequency, and a point driver at the
plate center excites both equally by symmetry. What you see is the superposition `φ_mn + φ_nm`,
and those superpositions are the curved, ringed, cornered figures people recognize. The grids are
the eigenfunctions; the figures are what a driven plate does with them.

The circular and mark boundaries are non-separable to begin with, so they need no such argument.

This also means the center driver is load-bearing, not a simplification (see D8). Move the driver
off-center and the degenerate pair stops combining symmetrically.

### D3 — β is clamped below the stability limit in code

The leapfrog `w' = 2w − w_prev − β·∇⁴w` is conditionally stable at `β·λ_max ≤ 4`. The discrete
5-point `∇²` has eigenvalues in `[−8, 0]`, so `∇⁴ = (∇²)²` has eigenvalues in `[0, 64]`, giving:

```
β ≤ 4/64 = 1/16 = 0.0625
```

Target `β ≈ 0.04`. The control is clamped at **0.05** in code, not merely bounded in the
manifest, so no randomize-all and no restored control value can detonate the integrator.

`β` is dimensionless and per-step: it already absorbs `dt²/dx⁴`, and the grid spacing is one
cell. Every tuning constant in this animation is stated in the simulation's own units — grid
cells, cells per step, radians per step — before any claim is made about what it does.

### D3a — Grid size and step rate are fixed by the dispersion relation, not by taste

This is the calculation that sets the whole animation's shape, and getting it wrong produces a
plate that technically works and is useless. An earlier draft of this spec said "~300 cells,
`STEP = 1/240`," copied from `caustics-pool`. Those numbers give a plate whose legible modes
oscillate at about **0.1 Hz** — a six-second wobble, not a vibration. The sand would have nothing
to respond to.

The discrete dispersion relation for the scheme is:

```
ω = sqrt(β · 16 · sin⁴(k/2))        ω in radians per step, k in radians per cell
```

For `m` half-waves across `N` cells, `k = mπ/N`. A legible Chladni figure wants roughly 4–16
half-waves across the plate. At `N = 128` and `β = 0.04`:

| m (half-waves) | k rad/cell | ω rad/step | at 1200 steps/s |
| -------------- | ---------- | ---------- | --------------- |
| 8              | 0.196      | 0.00769    | 1.5 Hz          |
| 12             | 0.295      | 0.01722    | 3.3 Hz          |
| 16             | 0.393      | 0.03045    | 5.8 Hz          |
| 22             | 0.540      | 0.05691    | 10.9 Hz         |

So: **the sim grid is a fixed 128×128 and `STEP = 1/1200`.** Roughly 20 substeps per frame at
60fps, each pass covering 16,384 pixels — about 655k fragment invocations per frame for the whole
plate, which is nothing. Resolution buys mode headroom and costs frequency; this pair lands the
usable band at 1.5–11 Hz, which looks like a plate buzzing rather than a sheet undulating.

```ts
const STEP = 1 / 1200;
this.acc = Math.min(this.acc + dt, 30 * STEP); // cap: 30 steps, never a spiral
while (this.acc >= STEP) {
  this.acc -= STEP;
  step();
}
```

**The grid is square and fixed, independent of canvas size.** The plate is an object in the
scene, not a full-bleed field, so there is no aspect-matching to do and no `ensureSim` dance —
this is a real simplification over `caustics-pool`, which has to keep its cells square against a
resizing canvas. It also means a resize never clears the field, so there is nothing to re-prime
(see D11).

A coarse plate grid does not mean coarse nodal lines. Grains live in continuous plate uv and are
drawn at screen resolution; the envelope is sampled with `LINEAR` filtering. The lines are as
sharp as the sand, not as the grid.

### D4 — Three fields in one texture; the envelope is the one that matters

One RGBA target, ping-ponged:

| channel | holds                           |
| ------- | ------------------------------- |
| `.x`    | `w`, the plate displacement now |
| `.y`    | `w` one step ago                |
| `.z`    | `A`, the amplitude envelope     |
| `.w`    | spare                           |

`A` is an exponential average of `|w|` whose time constant is tied to the drive rather than
fixed: `α = ω / (2π · 3)`, i.e. three drive periods. A fixed step count cannot work when the
sweep spans 1.5–11 Hz — 50 steps is most of a period at the bottom of the range and dozens of
periods at the top. Tying it to `ω` keeps "how hard is this spot shaking" meaning the same thing
across the whole sweep.

The envelope exists because grains cannot respond to instantaneous height. A plate ringing at a
few hundred hertz is a blur; what a grain responds to is _how hard this spot is shaking_, which
is a slowly-varying field. `∇A` is the drift direction, `A` is the throw strength, and the
plate's visible shimmer comes from `∇w` off the same texture. One root cause, three projections.

### D5 — Grains get thrown; they never seek a line

Peak vertical acceleration at a point is `ω²·A`. Above a threshold the plate throws the grain
clear of the surface; while airborne it drifts down `−∇A` and lands. Below threshold it sits.

```glsl
// omega2 is the drive frequency squared, in radians per step — not w, the
// plate displacement. A is the envelope from .z.
float excess = max(0.0, omega2 * A - gThresh);
v += (-gradA * kDrift + hashDir(id, step) * kJitter) * excess * dt;
```

Nodal lines accumulate sand because quiet regions **cannot throw grains back out**. There is no
attractor, no target position, and no term whose job is to make a line appear. Delete the
threshold and the whole phenomenon disappears, which is the correct test.

This also produces the right off-resonance behaviour for free. Drive moderately away from a mode
and the entire plate sits above threshold, so grains skitter continuously and no structure
forms. Sweep onto a mode and the response rises by roughly Q, `∇A` sharpens, and the figure snaps
out. **The mush is the physics, not a penalty state** — do not add a fallback pattern to fill it.

### D6 — The loop closes through the density buffer

Grains render as additive points into a density texture `D`. The step pass samples `D` and
applies two effects:

- `β_eff = β / (1 + μD)` — added mass lowers local stiffness, so a loaded region detunes.
- damping increases with `D` — sand dissipates energy.

Damping itself is a control in **seconds of ring-down**, not a raw per-step multiplier. At 1200
steps/s the useful range of that multiplier is 0.9999–0.99999, which is unreadable and untunable;
`decay = exp(−STEP/ringTime)` with `ringTime` from 0.5 to 30 s is the same number in units a
person can reason about. It also exposes the thing that actually matters for the hunt: `Q ≈
ω·ringTime·(steps/s)/2`, so at the default 4 s and mid-sweep, Q ≈ 20 — sharp enough that landing
on a mode feels like landing, broad enough that build-up takes a second or two rather than
fifteen.

The figure the plate builds therefore changes the plate that built it. Pile enough sand on a line
and the mode shifts underneath it.

`D` refreshes once per frame while the plate steps several times per frame. That is acceptable
precisely because mass loading is a slow effect; it must not be "fixed" by re-rendering grains
per substep.

Coupling strength is a control (`load`). It has to be strong enough to see and weak enough not to
erase the figure; this is tuned by eye and the resulting constant gets a comment saying so.

### D7 — Grains live in a float texture

256×256 = 65,536 grains, ping-ponged: `.xy` position in plate uv, `.zw` velocity. Updated once
per frame by its own pass.

The plate has a raised lip: grains reflect at the boundary rather than falling off, so sand is
conserved and the scene cannot slowly empty itself over an ambient page's lifetime.

### D8 — Cursor is a tone control; click pours sand

- **X** → drive frequency, mapped **linearly** onto `ω ∈ [0.006, 0.058]` radians per step.
- **Y** → drive amplitude.
- **Click** → pours a fresh handful of sand at the cursor.

The map is linear on purpose. For a Kirchhoff plate `ω ∝ k²` while the 2D mode count below `k`
goes as `k²`, so the number of modes below `ω` grows **linearly in `ω`** — modes are uniformly
dense in frequency. A linear sweep therefore encounters them at a steady rate, and a
log/geometric map (the reflex choice, correct for audio) would crowd them all into one end of the
cursor's travel.

The driver is a fixed point source at the plate center. Per D2 this is load-bearing: it is what
excites degenerate mode pairs symmetrically, and it is why only modes with a center antinode get
fed at all.

The pour is implemented as a ring pointer respawning a slab of the grain texture at the click
point. Watching a poured pile crawl outward onto the lines is the clearest demonstration of
migration the toy has, and it doubles as the reset.

### D9 — Drive phase is integrated, not computed from a clock

```ts
this.phase = (this.phase + omega * STEP) % TAU;
```

Advanced inside the step, never per frame. `caustics-pool` wraps a _time_ counter because its
forcing is noise, where a seam is just a change of gust. This forcing is coherent: a phase
discontinuity is an impulse, and it would ring every mode at once. Integrating the phase also
means a frequency change mid-sweep is automatically continuous.

### D10 — Ambient mode searches, and the search is measured

The automatic sweep slows where the plate responds. Mipmap the envelope channel down to 1×1 and
read that single texel back every ~10 frames; sweep rate scales inversely with total response.

So ambient mode hunts, lingers on what it finds, and moves on — driven by a measured quantity
rather than a scripted list of dwell points. One 1×1 readback every ten frames is the only
GPU→CPU sync in the animation, and the scene degrades to a constant-rate sweep if the read fails.

### D11 — Prime the plate, not the sand

Pre-roll 2,400 steps (two simulation seconds) outside the accumulator so the envelope is
established and the plate is already ringing on the first visible frame. The envelope's own time
constant is three drive periods, so anything much shorter hands the grains a half-built field. Scatter sand uniformly and **let the figure form on
screen** over the first seconds.

This is a deliberate reading of "your default state must show the best thing." The best thing
this toy does is the migration. Pre-rolling the grains into position would hide it and would also
mean seeding a figure rather than growing one.

There is no re-prime on resize: per D3a the sim grid is fixed and canvas-independent, so a resize
touches only the display pass and never clears the field.

### D12 — Three source files, not one

`caustics-pool` is 1,749 lines in a single file. The new animation splits:

```
packages/flateralus-pixi-animations/src/chladni-plate/
  manifest.ts                 controls
  shaders.ts                  the five programs
  chladniPlateAnimation.ts    class, physics, plumbing
  index.ts
```

This is not a proposal to refactor `caustics-pool`. It is the same pattern, bounded better, in
new code.

## Passes

Five programs. Per frame:

| #   | pass                                                 | rate      | writes          |
| --- | ---------------------------------------------------- | --------- | --------------- |
| 1   | Laplacian — `L = ∇²w`, masked                        | per step  | intermediate    |
| 2   | Plate step — integrate, envelope, forcing, mass load | per step  | plate ping-pong |
| 3   | Grain update — sample `A`, `∇A`, throw and drift     | per frame | grain ping-pong |
| 4   | Density render — grains as additive points           | per frame | density target  |
| 5   | Display — plate shading + sand                       | per frame | screen          |

## Boundary masks

The plate mask is a signed distance field sampled by passes 1, 2 and 3. Square and circle are
analytic. The mark reuses `shared/sdf-harness.ts`, which already builds an SDF of the lockup at
load.

Swapping the boundary is `resetsAnimation` — the field is cleared and re-primed, because a mode
shape from the old boundary is meaningless under the new one.

## Look

Dark plate, bright sand. This is a luminance-headroom decision, not only a taste one: the plate's
live specular shimmer (lit from `∇w`) is additive, and it needs somewhere to climb. Every `tint`
option gets checked with the sand running and the plate ringing; a palette that kills the shimmer
gets cut rather than shipped.

The shimmer matters more than it sounds. Seeing the plate itself move is what sells that the sand
is responding to something real rather than being animated into a shape.

Controls follow the `caustics-pool` manifest pattern, all `debug: true`: `mode`, `boundary`,
`stiffness`, `damping`, `drive`, `threshold`, `drift`, `jitter`, `load`, `sweep`, `tint`.

## Risks

**Half-float precision in the biharmonic.** `∇⁴` is a difference of differences, and RGBA16F may
be too coarse to hold it cleanly. Plan: request RGBA32F, fall back to 16F. If 16F shows
grid-scale noise, that is a finding to report, not something to paper over with extra damping —
damping that hides numerical noise also flattens the figure.

**No `EXT_color_buffer_float`.** Bail once and stop retrying, as `PingPong` already does.

**Mode density.** If the chosen frequency range turns out to hold too few modes, the sweep reads
as empty. The lever is plate size in grid cells and `β`, and it is checked by sweeping the full
range in the Lab before the toy is called done.

**Figure formation time.** If migration takes much longer than a few seconds, the toy feels
inert. The lever is `kDrift` against the envelope time constant. Per the skill's warning on
tuning: change one at a time, and convert both into grid cells per step before writing any
explanation of why a value works.

## Testing

Honest split.

Unit-tested, because they are pure functions: the drive-frequency mapping from cursor X, the β
stability clamp (a value above 0.0625 must come back clamped), and the phase wrap.

Covered by the existing `registry.test.ts`: the new `toys` entry resolves and constructs.

Everything else — figure formation, mode density, the mass-loading strength, every palette — is
verified by eye in the Lab. That is the truth about this class of work and the spec says so
rather than implying a coverage that will not exist.

## Out of scope

- Audio. The sand is the readout.
- Swappable media (water, lycopodium powder — which collects at antinodes rather than nodes, and
  is a lovely fact, and is a second toy).
- Bowing the rim, and finger damping. Both were considered as the primary verb and lost to the
  tone hunt; neither gets bolted on as a secondary.
