# Disc: dust, a carved lane, and a reachable gap

A second pass on the disc toy. The gas held; what did not was the distance
between the physics and what a visitor sees. Feeding took a quarter of an
hour, the opening state had no gap, the display saturated where the density
was, and nothing in the gas read as moving. This spec closes those four
gaps without touching the integrator. Builds on
[`2026-09-23-disc-design.md`](2026-09-23-disc-design.md); everything not
mentioned here stands as built.

## What was found

Measured on the built toy before any change:

- **Feeding.** On the production grid a fresh seed at `r = 1.2` with the
  sink at 1.5 cells and `accretionRate` 0.1 eats `2.45×10⁻⁷` a time unit,
  sixteen minutes of wall clock to the gap threshold. Raising the rate to
  0.5 gives `1.10×10⁻⁶`; at 2.0, `3.01×10⁻⁶`. The sink is rate-limited
  about five times below what shear refills it with, so the build note's
  claim that the rate cannot buy the minute was wrong at the rates it
  considered and right only up to about 0.06.
- **Headroom.** `κ = 1.5/Σ₀` puts the optical depth at 0.78 at `r = 1`
  and 0.99 at `r = 0.3`. A 1.5 % density contrast is a 0.5 % brightness
  contrast at `r = 1`; a torque-opened gap that removes 40 % of the gas
  dims by 12–24 %. Every arm on screen is the shock-heating term.
- **The opening state.** One planet at half the gap threshold: no gap,
  and a thrown Earth-mass seed leaves nothing visible in the gas.
- **Motion.** The gas is smooth and axisymmetric, so only the wake pattern
  rotates, and it rotates at the planet's pattern speed. Differential
  rotation, the defining fact of a disc, is invisible.
- **Migration**, for the record: the mirror's `1.100 → 1.092` over twelve
  time units is about 0.06 in radius a minute of wall clock, so a planet at
  1.1 falls in after roughly fourteen minutes.

## Feeding and seeds

| Constant / control | Was            | Now                             |
| ------------------ | -------------- | ------------------------------- |
| `accretionRate`    | 0.01–0.2, 0.03 | 0.05–2, **0.5**                 |
| `sinkFloorCells`   | 1.5            | **2**                           |
| `SEED_Q`           | `1e-5`         | **`1e-4`**, about thirty Earths |

At these values the removal timescale is two time units, a third of an
orbit at `r = 1`, still a sink prescription and not a vacuum. A seed on a
circular orbit at `r ≈ 1.2` reaches the thermal threshold `3.8×10⁻⁴` in
about a minute: extrapolated from 200 steps by the test in § Tests, and
watched to the threshold on screen before the branch is finished. A
thrown seed raises a wake the shock-heating term shows at once, so a throw
announces itself. The eaten gas's momentum stays ignored.

_As built:_ a seed clicked onto a circular orbit at `r = 1.2` passed the
threshold 52 time units later, 33 s of wall clock at 60 fps, faster than the
test's linear extrapolation because the sink radius outgrows the floor past
`q ≈ 1.5×10⁻⁴`. The seed the disc loads with does the same on its own about
35 s after load.

## Default state

Two bodies, both circular:

- a giant, `q = 1.5×10⁻³` at `r = 0.6`, the one that carves the lane;
- a seed, `q = 10⁻⁴` at `r = 1.3`, the same object a throw makes, so what
  is already there and what you add are the same kind of thing.

Pre-roll stays at `PREROLL_STEPS = 6280`, 21 orbits at `r = 0.6`, with the
sink off and the disc force zeroed as it is now. The torque opens the lane
during the pre-roll; it keeps deepening live, and the grains drain out of
it during the first minute on screen, which is where most of the visible
depth comes from. The giant's wake spans about 0.4–0.9 and the seed's
1.0–1.7, so neither sits in the other's arms.

_As built, not as first specified:_ the giant is at **`r = 0.8`** and the
seed at **`1.5`**. At 0.6 the production-size mirror went NaN on step 461
at the cavity edge, sink on or off; 0.8 lasted to step 2383. The cause was
the boundary, not the placement (§ The edges), and with it fixed both
placements are healthy through 8,000 steps; 0.8 stays because it leaves
room for the inner wake's tight rings between rim and lane.

## The edges

_Added as built._ A giant's inner wake reaches the cavity edge as a shock
with radial velocities near the sound speed. Its trough drains ring 0 from
0.2 to 0.001 of `Σ₀` over about 150 steps, and when Σ touches the floor the
pressure gradient over the floor density multiplies the velocity by sixty
in one step. Two changes to `physics.ts` and the step shader, pinned by
tests on the production grid:

- **Wave-damping zones** (de Val-Borro et al. 2006): for `r < 0.32` and
  `r > 1.8`, Σ, `v_r` and `v_φ` relax toward the opening ring profile at a
  rate `ramp² / τ`, `ramp` linear from 0 at the zone's inner boundary to 1
  at the edge, `τ` the orbital period at that edge (0.785 inside, 17.8
  outside). A wake arriving at an edge is absorbed rather than reflected or
  drained through it. The mass the zones add is accumulated in `D.damped`
  and enters the conservation test. The shader recomputes the opening
  profile and its rotation curve where it needs them, from `uSigma0`. Two
  consequences: the zones are a standing source, so "the dust is consumed
  with the disc" is no longer strictly true of the gas at the edges, and a
  planet orbiting past 1.8 has its wake absorbed and its sink refilled at
  about 0.014 a unit against a sink rate of 0.5, negligible but real; and
  the cavity edge now holds `0.2 Σ₀` at ring 0, so it glows faintly
  (optical depth about 0.1) rather than reading black.
- **The inner taper eased in ln Σ**: `Σ = (Σ₀/r) · exp(−3(1 − s(r)))` with
  `s` the smoothstep over `[0.25, 0.37]`, instead of a smoothstep from the
  floor over 0.06. The old taper's first cell held a 25× jump; balancing
  that put ring 0 at 30 % above Keplerian, a residual Courant number of 4.3
  at the production step, hidden while the ring stayed uniform. Every ring
  now opens under 0.3.

## Headroom

`uKappa` goes from `1.5/Σ₀` to **`0.5/Σ₀`**: optical depth 0.39 at `r = 1`,
0.81 at `r = 0.3`, so density contrast passes through nearly linearly in
the body of the disc and the rim still saturates to white, which is right
for something that close to the star. An exposure gain of **1.6** on the
disc emission term (`emit`) keeps the mid disc about as bright as it was.
The star, planets and grains are not gained.

## Dust as grains

### What it is

65,536 grains, a `256 × 256` RGBA32F texture on the gas `PingPong`'s GL
context, each `(ln r, φ, St, alive)`. A grain samples the gas at its
position and moves with the gas velocity plus the terminal-velocity drift.
That drift is the measured quantity: stopping time times the pressure
gradient over the density, which is why dust leaves gaps and piles at
their edges, and why the inner rim collects it. Grains do not act on the
gas; at a dust-to-gas ratio of a percent the back-reaction is second order,
and it is stated here so nobody adds it to "make the rings stronger".

### The step

Per gas substep, in the same `dt`, on every grain:

```
(Σ, v_r, v_φ)  = bilinear sample of the gas at (ln r, φ), φ wrapped by hand
∂P/∂r          = (c²(r₊)Σ(r₊) − c²(r₋)Σ(r₋)) / (r₊ − r₋),   r± one cell away in ln r
∂P/∂φ          = c²(r) (Σ(φ₊) − Σ(φ₋)) / (2 Δφ)
t_s            = St / Ω_K(r)
Δv_r           = t_s (∂P/∂r) / Σ
Δv_φ           = t_s (∂P/∂φ) / (Σ r)
|Δv| clamped to c_s(r)                  — the approximation fails past it
ln r          += (v_r + Δv_r) / r · dt
φ             += (v_φ + Δv_φ) / r · dt,  wrapped to [0, 2π)
```

Integrating in `(ln r, φ)` makes a circular orbit exact at any step, the
same reason the gas uses orbital advection: only the deviation is
integrated. Σ is floored at the grid's floor before dividing. A grain that
crosses `R_IN` has fallen in and a grain past `R_OUT` has left; both set
`alive = 0` and are neither stepped nor drawn. Nothing respawns; the dust
is consumed with the disc.

**Stokes numbers** are drawn log-uniform in `[0.02, 0.2]` at seed time.
At `St = 0.2` a grain at a gap edge with `d ln P / d r ≈ 5` drifts at
`2.5×10⁻³`, across a 0.1-wide lane in 25 s of wall clock; at 0.02 it takes
four minutes. The lane clears size-sorted, big grains first, and small ones
linger inside it, which is what scattered-light images show. In the smooth
disc the drift is inward at `St · c_s² · 2 / (Ω r)`, about 0.05 in radius a
minute at `St = 0.1`, so the disc's dust reaches the rim in tens of
minutes; `reseed` brings it back.

**Seeding.** Uniform in area weighted by Σ: since `Σ ∝ 1/r`, uniform in
`r` on `[0.3, 1.9]`, uniform in `φ`. Grains are stepped through the
pre-roll with the gas, so they have already drained from the lane's
centre when the first honest frame is shown. Reseeded whenever the gas is.

### Drawing

After `pp.display`, on the same canvas, `gl.POINTS` with additive blending,
one point per living grain, `gl_PointSize` of one device pixel scaled by
`min(2, dpr)`. Colour is `kelvin(T(r))` at the grain's radius, the same
Planck curve as the gas, times the `dust` control. The display pass is
unchanged and draws first: disc, star, planets, film grain, vignette. The
points are added on top, and the points fragment multiplies by the same
vignette weight so the corners do not fill with dust. The film grain stays
on the disc only.

_As built, not as first specified:_ grains step **once per live frame**
with `dt` = that frame's substeps × `STEP`, and once every eight gas
substeps during the pre-roll. A grain step costs 0.68 ms of GPU, as much as
a gas pass, and per substep it put the frame at 9.0 ms; per frame it is
0.77. Integrating `(ln r, φ)` makes the orbit exact at any step, so only a
wake's `v_r` bounds it: 0.08 units at `c_s` moves a grain half a percent of
its radius.

### Plumbing

- `PingPong.texture`: a getter for the live state texture, so another
  program on the same context can sample it. Three lines.
- `shared/particles.ts`: `Particles.create(gl, n, { stepFrag, drawVert,
drawFrag, stepUniforms, drawUniforms })`. A ping-pong pair of `n`-texel
  RGBA32F textures, `init(data)`, `step(setUniforms)` (binds the particle
  texture to unit 0; the caller binds the gas texture to unit 1 in
  `setUniforms`), `draw(W, H, setUniforms)` (draws `n` points onto the
  currently bound default framebuffer with `ONE, ONE` blending, then
  disables blending), `destroy()`. The draw vertex shader fetches its grain
  by `gl_VertexID`. Returns `null` where RGBA32F is not renderable, and the
  disc runs without dust.

### Control

| Control | Range / default | What it moves                  |
| ------- | --------------- | ------------------------------ |
| `dust`  | 0–1, **0.6**    | grain brightness; 0 hides them |

`debug: true` like the rest. The Stokes range is a constant, not a control.

## Small items

- `FLARE_TAU` from 1.5 s to **6 s**, so a fall-in reads as an event and not
  a blink. Amplitude unchanged.
- **Chunked reduce.** `REDUCE_CHUNKS = 8`: the target is
  `REDUCE_W × 8` wide, each fragment sums 64 cells of its ring instead of
  512, and the CPU sums the eight. Fragments go from 1,728 to 13,824 and
  the readback from 27 KB to 221 KB a frame. Measured with the headless
  Metal timer loop; if that loop cannot be run on this branch the number is
  reported as unmeasured, not guessed.

_As built:_ measured in headless Chromium on Metal with a timer query around
every draw, 1068 × 1344 stage, 60 fps: gas substeps 4.1 ms (7.85 passes a
frame at 0.52 each), reduce **0.93** (was 1.5), display 0.67, grain step
0.77, grain draw 0.78; **7.26 ms** a frame against the built toy's 7.8.
The chunked reduce's answer, read off the running toy after the pre-roll:
the disc's pull on the giant at `r = 0.78` is `8.9×10⁻³`, on the seed at
`1.46` `8.0×10⁻³`, finite and of the order the built toy measured
(`8.5×10⁻³` for a `2×10⁻⁴` planet at 1.1).

## Architecture

| File                       | Change                                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `shared/ping-pong.ts`      | `texture` getter                                                                                                       |
| `shared/particles.ts`      | new: `Particles`                                                                                                       |
| `disc/grains.ts`           | new: CPU twin of the grain step, `seedGrains`, `stepGrains`, `driftRate` for the analytic check                        |
| `disc/grains.test.ts`      | new: the grain tests                                                                                                   |
| `disc/shaders.ts`          | `GRAIN_STEP_FS`, `GRAIN_VERT`, `GRAIN_FRAG`; `REDUCE_CHUNKS` and `REDUCE_FS` chunked; `DISPLAY_FS` gain; uniform lists |
| `disc/physics.ts`          | `SEED_Q`, `sinkFloorCells`; no change to the operator split                                                            |
| `disc/manifest.ts`         | `accretionRate` range and default; `dust`                                                                              |
| `disc/discAnimation.ts`    | two-body seed, grains stepped and drawn, chunked readback, `FLARE_TAU`                                                 |
| `disc/physics.sim.test.ts` | the feeding test                                                                                                       |

## Tests

1. **Drift rate.** A single grain in the unperturbed equilibrium disc at
   `r = 1`, `St = 0.1`, over one Keplerian period on the `128 × 64`
   mirror: its mean `d r / d t` matches `St · (∂P/∂r) / (Σ Ω)` from the
   discrete profile, which is negative, to within 5 %, and its `φ` advances
   by `2π · v_φ / v_K` to within a cell.
2. **Leaves the lane.** Carve a lane in the mirror with the sink off
   (`q = 10⁻³` at `r = 1`, 30 orbits, as the gap test does), then seed
   grains at `St = 0.2` uniformly across `r ∈ [0.9, 1.1]` and step them
   for ten orbits with the planet still there. Fewer than a quarter remain
   within `±H` of `r = 1`; the control disc without the planet keeps more
   than three quarters.
3. **Feeding, production size.** `512 × 192`, `dt = 0.01`, defaults, a
   `SEED_Q` seed at `r = 1.2` on a circular orbit, 200 steps: the eaten
   mass extrapolates linearly to under two minutes of wall clock to the
   thermal threshold. Slow; marked so.

   _As built:_ test 2 uses a constructed lane, an 80 % Gaussian dip of width
   `H` in a frozen gas, not a torque-carved one: the mirror's 30-orbit gap
   is too shallow, the background inward drift confounds the control, and
   the gradient stencil spans a cell each way, wider than a shallower dip's
   bottom. Two tests were added on the production grid: every ring within a
   residual Courant number of 0.3 at the opening state, and the cavity edge
   keeping 30 % of its density after 800 steps under a `1.5×10⁻³` giant at
   `r = 0.6`.

4. **Mass is still conserved** with the sink at 2 cells and rate 0.5: the
   existing test 5 at the new defaults.
5. **The mirror's existing suites pass unchanged** except where the
   defaults they assume are named above.

On screen, in the lab, before the branch is finished: the loaded frame
shows a lane at `r ≈ 0.6` with a dot in it and a wake at 1.3; grains at
different radii visibly shear past each other within the first orbit; the
lane is clear of large grains inside a minute; a throw shows a wake and a
growing dot, and the dot's mass passes `3.8×10⁻⁴` inside two minutes of
being clicked onto a circular orbit at `r ≈ 1.2`; the frame's GPU cost
stays under the built toy's 7.8 ms.

_As built:_ all of it, in headless Chromium at 60 fps, with the clock and
the planets' masses read off a temporary title probe. The Chrome tab the
agent drives is hidden, so `requestAnimationFrame` never fires there and
the animation only moved during screenshots and clicks.

## Out of scope

Dust back-reaction on the gas. A dust density field. Grain growth or
fragmentation. A sink for grains. Self-gravity, the indirect term, tilt,
sound, as before.
