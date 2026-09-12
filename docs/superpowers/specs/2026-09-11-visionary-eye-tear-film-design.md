# Visionary Eye — tear film, blink loop, corneal caustics

**Status:** proposed
**Date:** 2026-09-11
**Lands as:** a rework of the existing `visionary-eye` hero entry, in place

## What this is

The eye grows a tear film. A real one: a thin layer over the cornea that is laid down by a
blink, thins, goes unstable, and tears into dry patches. Everything wet about the eye is then a
projection of that one field — the catchlight, the dull spots in the sheen, and the bright
filigree the cornea focuses onto the iris.

And the eye blinks because the film broke up. Not on a timer. The field is measured every frame,
the lid reads that measurement, the lid lays fresh film, and the fresh film sets when the next
blink happens. Field → behaviour → field.

## Why this one

`visionary-eye` already has the hard half right, and nobody notices, because the half it has
right is invisible next to the half it fakes.

The gaze is genuinely integrated — saccades, pursuit, asymmetric pupil constants, startle pulse,
all persisting across frames with a history. That is the good part. Everything else in the piece
is a function of `t` sharing a canvas with it:

| Where                          | What                                                |
| ------------------------------ | --------------------------------------------------- |
| `sdf-harness.ts:227`           | `breath = 0.9 + 0.1*sin(t*0.45)`                    |
| `sdf-harness.ts:238`           | `ring = fract(r*5.5 - t*0.16)` — a literal loop     |
| `sdf-harness.ts:235`           | colour cycling on `sin(r*9 - t*0.8 + af*6)`         |
| `sdf-harness.ts:240-243`       | three-sine interference lattice                     |
| `sdf-harness.ts:256`           | `energyH` — painted fbm filaments                   |
| `sdf-harness.ts:308`           | relief measures the normal of that _painted_ height |
| `visionaryEyeAnimation.ts:175` | hippus as two desynced sines                        |

The relief at `:308` is the instructive one. It does the right _operation_ — central-difference a
height field, perturb the normal, light it — on a height field that has no state. Sophisticated
decoration is still decoration. The fix is not a better `energyH`; it is a height field that is
integrated.

The pointer, meanwhile, only aims the gaze. That is a view change. Nothing in the scene can be
touched.

## Decisions

### D1 — The field lives in corneal-local tangent coordinates

The film is a ping-pong pair over `(lx, ly) ∈ [-0.6, 0.6]²`, using the same
`lx = dot(n, tx)`, `ly = dot(n, ty)` the display shader already computes at `sdf-harness.ts:282`.

Not `sdir`. `sdir = vec2(lx,ly)/max(sin(ang),1e-3)` is singular on the gaze axis — which is the
pupil centre, the one place the film must be well-behaved. Raw `(lx, ly)` has no singularity
anywhere on the cap.

Two things fall out of this choice, and both are load-bearing:

**The field rides the globe for free.** The frame _is_ the gaze frame, so a saccade carries the
film with the cornea. No advection pass, no interpolation error, no drift. A screen-space field
would leave the catchlight parked while the eye moved under it, which is the single most obvious
way to get this wrong.

**The grid is independent of canvas size.** The cornea is a fixed cap in local coordinates, so a
resize does not touch the simulation at all — no `ensureSim` dance, no re-priming, nothing
cleared. This is a real simplification over `caustics-pool`, which has to keep its cells square
against a resizing canvas. Only the readback probe re-runs, because the attachment changed.

Gravity and the lid sweep are world-space, so they are rotated into the local frame each step:
two dots against `tx`/`ty` on the CPU, passed as a `vec2` uniform. Cheap, and it keeps every
frame-dependent quantity out of the step pass.

The cornea subtends about 0.6 rad — the existing limbus already sits at `ang ≈ 0.56` — so it
occupies `|l| < sin(0.6) = 0.565`, filling 94% of the domain half-width with a small margin for
the boundary.

### D2 — Break-up is a dewetting instability, so the equation is Cahn–Hilliard

This is the decision the piece stands on.

The obvious model — thickness with an evaporation sink — is wrong, and wrong in a way that looks
plausible until you run it. A uniformly thinning film gets uniformly dimmer. It does not tear.
Real tear film breaks into _patches_ because a thin film on a partially-wetting substrate is
spinodally unstable: thin regions thin faster. Patches are the phenomenon. Without the
instability there is nothing to measure and nothing to trigger a blink.

```
pass A:  μ = h³ - h - κ∇²h              // double-well + surface tension
pass B:  h ← min(h + dt(M∇²μ - E - v·∂h/∂y_local), 1)
```

`h = +1` is full film, `h = -1` is dry. The double well `f(h) = (h²-1)²/4` gives the two states;
`κ` sets the width of the front between them; `M∇²μ` is the conservative transport that lets a
draining patch feed a rim into its neighbours — which is what makes dewetting patches read as
_holes with raised edges_ rather than as fading stains.

Evaporation enters as a constant sink, which is the honest way to get the cycle started: it
walks the film down from `h = +1` toward `h = 0`, and `h = 0` is exactly the spinodal point where
`f'' < 0` and the instability bites. So the film does not decay; it drifts until it becomes
unstable, then tears. That sequence is the real one.

Two draws per step, `(h, μ)` in `.xy`. `μ` is recomputed from `h` every step, so it is derived,
not state — **`h` is the only state in the field.** No dryness accumulator, no stain channel:
those belong to the irritation-history slice and an accumulator wired up ahead of its consumer is
the kind of thing that stays half-wired.

### D3 — Grid, step rate and mobility are derived, not chosen

Explicit Euler on `-Mκ∇⁴h`. The 5-point Laplacian has eigenvalues in `[-8/Δ², 0]`, so `∇⁴ = (∇²)²`
reaches `64/Δ⁴`, and stability requires:

```
M ≤ Δ⁴ / (32 · dt · κ)
```

Write the interface half-width as `n` cells, so `κ = n²Δ²/2`. Then with `M = s · M_max`, the
linear stability analysis at the spinodal (`f'' = -1`) gives:

```
σ_max   = M / (4κ)      →   e-fold time  τ = 32 · dt · n⁴ / s
λ_max   = 2π·sqrt(2κ)   →   patch wavelength = 2π · n · Δ
```

Both relationships matter more than the constants, because **`τ` is independent of grid size**.
Resolution buys patch count; only `dt` and `n` buy speed. Getting that backwards means refining
the grid to make break-up faster and watching nothing change.

Picking `s = 0.6` for margin, `n = 2`, `N = 128`, `STEP = 1/480`:

| quantity              | value         | check                                      |
| --------------------- | ------------- | ------------------------------------------ |
| `Δ`                   | 0.009375 u    | 1.2 / 128                                  |
| `κ`                   | 1.758e-4      | `n²Δ²/2`                                   |
| `M`                   | 3.955e-4      | 0.6 of the stability limit                 |
| e-fold `τ`            | 1.78 s        | 3.5 e-folds from a 3% seed ≈ 6.2 s         |
| patch wavelength      | 0.1178 u      | **1.22 mm** at 10.35 mm per tangent unit   |
| patches across cornea | 9.6           |                                            |
| cost                  | 15.7 M frag/s | 8 substeps/frame at 60fps, 262k frag/frame |

The 1.22 mm is the number worth trusting. Clinical tear break-up patches run 0.5–2 mm, and that
figure was not tuned toward — it fell out of a stability limit and a choice of interface width.
The cost is under half of what `chladni-plate` budgeted for the same 128² grid.

**`M` is clamped to the derived limit in code**, the way `chladni-plate` clamps `β`. A control
that can detonate the integrator is a bug with a slider on it.

```ts
const STEP = 1 / 480;
this.acc = Math.min(this.acc + dt, 12 * STEP); // cap: 12 steps, never a spiral
while (this.acc >= STEP) {
  this.acc -= STEP;
  step();
}
```

### D4 — The step pass contains no clock

Run the skill's test on the step pass: delete `uTime`. Nothing changes, because there is no
`uTime` in it to delete.

The perturbation that seeds the instability does not come from noise forcing applied every step.
It comes from the blink: **the lid lays an imperfect film.** The splat carries a noise pattern
keyed to a seed the CPU generates at blink time, so every blink lays a differently flawed sheet
and the patches land somewhere new. That is both more physical and strictly cheaper than
continuous forcing, and it removes the entire class of bug the skill warns about — a wall-clock
`t` handed to three substeps in a row, making the effect's strength a function of refresh rate.

The only per-step quantity is `dt`, which is a constant.

### D5 — Every constant is written in cells and cells per step

`glsl-and-flateralus.md` is emphatic and it is the mistake that survives review: a constant
inherits the units of the expression it sits in, the number still tunes, the scene still
improves, and a false explanation ends up in a comment.

So the source carries the conversions, not the magic numbers:

```
Δ            = 1.2 / N            tangent units per cell
evaporation  = E                  h per second; time to spinodal = 1/E
gravity      = v                  tangent units per second  (v/Δ cells per second)
interface    = n · Δ              tangent units  (n cells)
patch λ      = 2π · n · Δ         tangent units
```

Opening values: `E = 0.5 /s` (2 s to spinodal), `v = 0.0141 u/s` (1.5 cells/s of downward
drain). Both are tuned by eye; the spec says which numbers are derived and which are not.

### D6 — The loop closes through an 8×8 reduction and a 64-texel read

A reduction pass renders the 128² field to an 8×8 target, each texel holding `min(h)` over its
16×16 tile. The CPU reads those 64 texels, counts the tiles inside the cornea whose minimum has
fallen below the break-up threshold, and divides. That is the break-up fraction.

When it crosses 0.35, the lid blinks. A 1.5 s refractory period stops it chattering across the
threshold.

Reading a whole 128² field every frame would be 130 KB of sync per frame; a reduction makes it 64
texels and one small stall. The readback _format_ is a property of the attachment and varies by
driver, so probe `IMPLEMENTATION_COLOR_READ_TYPE` once, cache the verdict, and re-probe after a
resize. `h2f()` in `causticsPoolAnimation.ts` already converts half-float. If the probe fails,
degrade to a fixed-interval blink and keep running — the scene still works, it just stops being
the good version.

**The blink rate is emergent and stays emergent.** If it lands wrong, the lever is `E`, and the
spec commits to moving `E` rather than adding a floor or a ceiling on the interval. A clamped
interval is a timer wearing the simulation's clothes.

### D7 — The blink is a splat along the lid's path, with a masked write

The lid is a line in world space, swept and interpolated so a fast closure lays a continuous
sheet rather than a dotted one. Down in ~100 ms, up slower, as a real blink is.

The splat blends additively onto the _live_ texture, never the back buffer, and writes only the
thickness channel:

```ts
gl.colorMask(true, false, false, false);
gl.blendFunc(gl.ONE, gl.ONE);
gl.bindFramebuffer(gl.FRAMEBUFFER, this.hFb[this.hi]); // live, not the back buffer
```

It adds `+2.0` in the lid's wake and the step pass clamps `h` to 1. Additive blending cannot
saturate toward a target, so the clamp lives in the integrator where it belongs.

Bell's phenomenon — the globe rolling up behind a closing lid — is two lines in the existing gaze
integrator and nobody will be able to say why it looks right.

### D8 — Caustics are the Jacobian of the corneal refraction map

The measured quantity. Build the map from the film surface to the iris plane:

```glsl
vec3 nf = normalize(vec3(l - s * gradH(l), lz));         // film-perturbed corneal normal
vec2 irisUV(vec2 l) {
  vec3 rr = refract(uViewLocal, nf, 1.0 / 1.376);
  return l + rr.xy * (IRIS_DEPTH / max(0.2, -rr.z));      // 3.6mm / 10.35mm = 0.348
}
vec2 f0 = irisUV(l), fx = irisUV(l + vec2(e,0)), fy = irisUV(l + vec2(0,e));
vec2 dx = (fx-f0)/e, dy = (fy-f0)/e;
float J = abs(dx.x*dy.y - dx.y*dy.x);
float focus = clamp(1.0/max(J, 0.06) - 0.72, 0.0, 4.0);
```

Three extra taps. The payoff is that the bright lines are where the geometry says, they lens
ahead of the ripple, and they respond to a blink with the right latency because they are a second
derivative of the same state.

**When this reads weak, the lever is `n`, not `s`.** Curvature goes as `k²`, so halving the patch
wavelength quadruples the bending for the same amplitude. Turning up the slope scale is the
instinct and it is the wrong one. The response is steep enough to overshoot — the skill records a
case where 11 cells landed, 7 boiled and 21 vanished — so move `n` one notch at a time.

### D9 — The iris gets quieted so the caustics have somewhere to climb

Additive light is legible only against headroom. The sclera is `vec3(0.965, 0.95, 0.925)` and has
none; the iris base is `IND = vec3(0.09, 0.05, 0.20)` and has plenty — but the iris is currently
packed with painted filaments, a scrolling ring and a three-sine lattice, all at full brightness.
Computed light dropped onto that competes with decoration and loses.

So, in this slice: drop the ring (`:238`) and the lattice (`:240-243`), pull the base filaments to
roughly half, and delete `breath` (`:227`, `:254`), which is inert once the field drives
brightness and is the exact term the skill names as the signal to stop.

This is the one place the slice widens past "film, blink, caustics", and it is the difference
between shipping the measured light and burying it.

The rest of the painted iris stays. Replacing it with a grown one — anisotropic reaction-diffusion
seeded with the 12-fold mandala, so the symmetry is what the iris _was_ and the crypts are what
time did to it — is the obvious next slice and is out of scope here.

### D10 — The film drives the specular, which is what reads on the white

Caustics need the dark iris; the sclera needs the opposite treatment. `pow(dif, 48.0)` at
`sdf-harness.ts:318` is replaced by a reflection off the film-perturbed normal `nf`, multiplied
by a wetness factor. Dry patches then read as _dull holes in the sheen_ — subtractive, which
works fine on a near-white surface where additive light cannot.

So one field, two projections, each landing on the surface that can show it. The catchlight
smears on a saccade, shatters as the film tears, and re-forms on a blink, all without a single
term written to make it do any of that.

### D11 — Prime by running the blink cycle, not by seeding impulses

The default state must show the best thing. A flat film is a mirror, and a hero that loads as a
mirror shows none of what makes it good until someone waits eight seconds.

So at build time: stamp a film with a seed and run ~4 s of real steps — 1920 steps, 3840 draws at
16k px. One-time, a few ms. The eye then loads mid-cycle with real structure. If it hitches
visibly, slice it across the first 8 frames rather than shortening it.

Re-prime whenever the field is cleared. Per D1 a resize does not clear it, so in practice this is
init only.

### D12 — `eyeW` moves out of `SHARED_EYE`; portal-mark is untouched

`portal-mark` imports `SHARED_EYE` but uses only `visionary()`, at `portalMarkAnimation.ts:464`
(world 11). `eyeW` and `energyH` — the whole spherical globe — are exclusively `visionary-eye`'s.

So the seam is clean: `visionary()` and `stars()` stay in `sdf-harness.ts`, `eyeW` and `energyH`
move into `visionary-eye/`. portal-mark's shader still declares `uPupil` and `uBump` without
setting them, which defaults them to 0 and leaves `pd = 1.0` — unchanged behaviour.

Four files, not one:

| File                       | Holds                                                        |
| -------------------------- | ------------------------------------------------------------ |
| `visionaryEyeAnimation.ts` | class, manifest, gaze/pupil/blink CPU state, readback        |
| `physics.ts` + `.test.ts`  | the pure numeric core — constants, clamps, reducer, lid      |
| `film.ts`                  | the four sim programs and the ping-pong resources            |
| `eye.ts`                   | display GLSL — `eyeW`, `irisUV`, caustics, the film specular |

`physics.ts` follows `chladni-plate` and `erosion-table`: everything testable without a GL
context lives there, which is exactly the set the Testing section commits to covering.

### D13 — `HarnessShaderAnimation` gets a `simulate()` hook

`visionary-eye` needs both of the things `glsl-and-flateralus.md` says force you to own the
plumbing: a splat pass blending onto the live texture, and a CPU readback. But it also depends on
everything the base class provides — the SDF mask, the palette uniforms that carry a theme
switch into the shader, the blit, the resize.

`PingPong` cannot serve: it keeps `fbo` private, so there is no splat, and it owns its own canvas
and display program, so adopting it means abandoning the base class anyway. Forking to the
`caustics-pool` shape duplicates ~200 lines the effect actually uses.

So: one hook on the base class.

```ts
/** Run simulation passes before the display program is bound. Default: nothing. */
protected simulate(gl, ctx, controls, dt): void {}
```

Called before the base binds the display program and viewport, so the base's existing
`gl.viewport` / `gl.useProgram` restore state naturally with no save/restore dance.

One hazard, verified in source rather than assumed: `createShaderContext` binds the mask to
`TEXTURE0` and sets `uTex = 0` **once, at creation** (`shader-harness.ts:168-183`), and never
re-binds. A `simulate()` implementation that binds the field to unit 0 would silently feed the
display pass the wrong texture — a bug that would read as "the eye is drawing the tear film
instead of the mark" and waste an afternoon. So the base re-binds the mask to unit 0 immediately
before its draw. Two lines, and more robust than a documented convention about which units are
spoken for.

About a dozen lines total, and the next feedback effect on this harness gets it free.

`caustics-pool` is not refactored onto it. Its divergence is deliberate and documented.

## Passes

Per simulation step (480/s):

1. **mu** — `μ = h³ - h - κ∇²h`, writes `(h, μ)`
2. **step** — `h ← min(h + dt(M∇²μ - E - v·∂h/∂y), 1)`, reading `μ` from `.y`

Per frame:

3. **splat** — only while the lid is sweeping; additive, `colorMask` on `.x`, onto the live buffer
4. **reduce** — 128² → 8×8 tile minima
5. **readback** — 64 texels → break-up fraction → the lid's decision
6. **display** — the existing `eyeW`, now deriving specular and caustics from `h`

## Look

The eye keeps its identity: floating globe, starfield, electric iris, cream catchlight. What
changes is that the wet parts are wet because something is simulating being wet.

The lid is the open question. The piece currently has no lids at all — it is an orb in space —
and an opaque lid sweeping over it may fight that reading badly. Two candidates, decided in the
Lab, not here:

- **Opaque sweep.** A soft-edged occluder in `uInk`, no lash detail, matching the abstraction.
- **Film-only wipe.** No occluder at all; the sweep is a visible wave of wetness crossing the
  cornea and restoring the sheen. Arguably more on-brand, definitely stranger, and it keeps the
  orb intact.

The second is more interesting and is the one to try first.

## Risks

**The lid may not belong on this eye.** Named above. The fallback is the film-only wipe, and it
is a fallback that might turn out to be the better answer.

**Faceting from a 128² field upsampled across ~600 screen px.** Bilinear gives piecewise-linear
normals, and the specular will show the facets even where the colour does not. Mitigation:
smooth-bilinear sampling (`smoothstep` the fractional coordinate before the fetch) for anything
feeding a gradient. If that is not enough, `N = 192` costs 35 M frag/s and is still affordable.

**Half-float precision in `∇⁴`.** `μ` is a difference of differences, the same exposure
`chladni-plate` flagged. Request RGBA32F, fall back to 16F. Grid-scale noise in 16F is a finding
to report, not something to damp away — damping that hides numerical noise also flattens the
patches.

**The `readPixels` stall.** 64 texels is small but it is still a sync point. Measure it; if it
costs more than a frame's headroom, drop to every third frame — the blink decision has no need of
60 Hz resolution.

**Blink cadence on a hero.** A full-stage eye blinking every ~7 s may be too much presence for an
ambient background. The lever is `E` and only `E`, per D6.

**Caustics may still lose to the quieted iris.** D9 halves the painted filaments; if that is not
enough the answer is to go further, not to push `s`.

**No `EXT_color_buffer_float`.** Keep the current painted specular path, bail once, never retry.

**Reduced motion.** Freeze the field, hold the lid open, pin `uTime` as the effect already does.
No blinks. A full-screen eye blinking is exactly what that setting exists to prevent.

## Testing

Honest split.

Unit-tested, because they are pure functions: the `M` stability clamp (a value above
`Δ⁴/(32·dt·κ)` must come back clamped), the break-up fraction reducer over a synthetic 8×8 tile
array, the blink state machine including the refractory period, and the world→local rotation of
the gravity and lid vectors.

Covered by the existing `registry.test.ts`: the reworked `visionary-eye` entry still resolves and
constructs.

Everything else — whether the patches read, whether the caustics survive the iris, whether the
lid belongs, every palette — is verified by eye in the Lab. That is the truth about this class of
work and the spec says so rather than implying coverage that will not exist.

## Out of scope

Deliberately cut from this slice, in the order they are worth adding back:

- **The cursor writing into the field** — air across the cornea, thinning the film along the drag
  path. About fifteen lines reusing the splat pass built for the lid, and it is the difference
  between satisfying four of the skill's five parts and all five. First thing in the next slice.
- **Thin-film iridescence** from `h`. Free colour, but a look decision on a brand hero.
- **A grown iris** — anisotropic reaction-diffusion seeded with the 12-fold mandala, pupil radius
  as a moving boundary condition on the field.
- **Main-sequence saccades and iris wobble** — ballistic profile, then the iris hung off the globe
  as a lightly-damped mass.
- **Hippus from a delayed feedback loop** rather than two sines, driven by measured scene
  luminance.
- **An irritation history** — dryness and harassment accumulating into vessel prominence over
  minutes.
