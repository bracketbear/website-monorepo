# Disc

A protoplanetary disc seen from above its pole: a young star, a disc of gas
and dust from an inner cavity out to a soft edge, and one planet already in
it trailing a spiral wake. You throw seeds. Small ones raise a wake and eat;
one that eats past the gap-opening mass clears a dark annulus in front of
you. The planets keep what they took, and the disc is what is left.

The first _feed_ toy on the shelf, after the rule in
[`docs/lab/TOY-IDEAS.md`](../../lab/TOY-IDEAS.md) that a new toy carries the
pool's qualities and none of its anatomy.

## Why this one

Gravity is the one medium where the field _is_ the objects: a body reads the
field and is the field, so the loop closes by construction rather than by a
probe. Of the space candidates — a gravitational lens (the caustics Jacobian
applied to a deflection map), tides on a planet with the cursor as its moon,
and this — the disc won because it has the open verb. The lens is _fling_,
which is poke with a longer reach; tides is _drag_ on a wave field, which is
the pool on a sphere. Feeding a seed until it changes the disc's regime is a
verb nothing on the shelf has.

**Rejected sibling.** The rubber-sheet gravity well: balls rolling on a
dented height field. It is a field with things riding its slope — the pool's
anatomy with a different dent.

**Rejected inside this one.** A cursor that _is_ a body dragged through the
gas. A held body has no orbit to disrupt and nothing plays alone while you
hold it. Here the hand stays outside the system; only what it throws is
inside.

## The seven qualities, carried over

1. **A place.** A star, a cavity, a rim that is white-hot because it is
   close, an edge that fades to nothing. Face-on, from the pole.
2. **Tools, not instructions.** Press, drag, release. The predicted orbit is
   the only feedback while you hold.
3. **Consequences that travel.** A seed's wake is a spiral that wraps the
   whole disc; a gap changes what every later seed can eat.
4. **Parts that play alone.** The seeded planet migrates, eats and carves
   without anyone there.
5. **Differing parts.** Seeds of different mass are different objects: a
   wake-maker, a gap-opener, one that falls into the star.
6. **Honest material.** Colour is the disc's temperature through a Planck
   curve; brightness is optical depth; the star's flare is measured accretion.
7. **Nothing precious.** The worst outcome is a disc full of gaps that dies
   early. Re-seed and it collapses again.

## Rubric

1. **Subject.** Something being born. Warm.
2. **Legible in three seconds.** A star with a ring around it and a spiral
   in the ring. Everyone has seen the picture.
3. **Fights itself?** Three named tensions, below.
4. **Measured quantity.** Two: the spiral wake is the gas's Lindblad-resonance
   response to a planet, and a gap opens only past the real thermal and
   viscous thresholds. Nobody draws the arms and nobody decides when a gap
   appears.
5. **Loop closure.** The planet is a potential term the gas feels; the gas's
   wake pulls the planet inward (Type I migration) and feeds it; its new mass
   changes the wake. The loop runs with nobody there.

## The gas

### Units and grid

`GM★ = 1`, `r = 1` is the middle of the disc. A **log-polar grid**, 512 in
φ by 192 in `ln r`, `r ∈ [0.25, 2.0]`. Log spacing makes every cell the
same shape (`Δr/r = Δφ = 2π/512`), so resolution follows the physics inward,
and the texture edges are the boundaries: φ wraps, the inner edge is the
cavity, the outer edge is outflow.

One `PingPong` at `fullPrecision` (the half-float integrator stripes are
already documented). RGBA per cell: surface density `Σ`, radial velocity
`v_r`, azimuthal velocity `v_φ` (full, not the deviation), and the mass the
accretion sink removed from the cell this frame, which is how the reduce
knows what each planet ate.

### Equations

Vertically integrated, locally isothermal Euler:

```
∂Σ/∂t + ∇·(Σ v) = 0
∂v/∂t + (v·∇)v = −∇P/Σ − ∇Φ + ν∇²v
P   = c_s² Σ
c_s = h · v_K(r),          h = H/r = 0.05  →  c_s ∝ r^−½
Φ   = −1/r − Σ_p q_p / sqrt(|x − x_p|² + ε²),   ε = 0.6 H
ν   = α c_s H,             α = 3×10⁻³
```

`h` is the one constant that sets the pressure, the softening, the wake's
pitch and the colour (§ Rendering). The initial `Σ ∝ r^−1`, normalised so the
disc holds `discMass` of the star (default 0.02), tapered to a floor over
the last 10 % of radius and the first few cells, with the rotation curve
solved from the _discrete_ pressure gradient the step uses, so the disc
starts in equilibrium to round-off rather than to the analytic
approximation.

The viscosity is not the disc's clock. `t_ν = 1/(α h² Ω) ≈ 1.3×10⁵` time
units at `r = 1` — a day of wall clock — so at this `α` the disc does not
drain visibly. What consumes it is the planets (tension 4).

### Step — orbital advection

Keplerian speed is supersonic everywhere (`v_K/c_s = 20`). Advecting the
whole velocity field would either smear a 4-cell arm into nothing or need a
step too small to afford. The real codes solve this with **orbital
advection** (Masset 2000, FARGO), and so does this one. Each substep:

1. **Sources.** Pressure gradient, star and planet gravity, centrifugal and
   Coriolis terms in polar form:
   `a_r = v_φ²/r − 1/r² − (1/Σ)∂P/∂r − ∂Φ_p/∂r`,
   `a_φ = −v_r v_φ/r − (1/(Σ r))∂P/∂φ − (1/r)∂Φ_p/∂φ`.
   **Semi-implicit Euler**: update `v_φ`, then `v_r` with the new `v_φ`.
   Forward Euler on an epicycle at the inner edge grows about 1 % a step
   and e-folds in two seconds; semi-implicit is stable for `ω·dt < 2`.
   Viscosity `ν∇²v` is folded in, explicit; the diffusive CFL is loose at
   this `α`.
2. **Accretion sink**, in the same pass. Inside `max(0.5 r_H, 1.5 cells)` of
   each planet (`r_H = r_p (q/3)^⅓`, Kley's prescription; the floor because
   a fresh seed's half-Hill radius is 0.008, under one cell, and a sink the
   grid cannot see never feeds) Σ is removed at rate `1/τ_acc`. What is
   removed is written to the fourth channel and is what the planet gains
   (§ The planets).
3. **Azimuthal transport with orbital shift.** Every ring is shifted by the
   integer number of cells nearest `Ω_K(r)·dt/Δφ` — an exact permutation,
   no diffusion — and the remainder (under half a cell) plus the real
   deviation `v_φ − v_K` is the residual, order `c_s`, which transports Σ,
   `Σ v_r` and `Σ r v_φ` in **flux form** with van Leer slope-limited
   upwind faces. Flux form because the mass test (§ Tests, 5) is only
   honest if the scheme conserves by construction; semi-Lagrangian does
   not. This is FARGO's scheme (Masset 2000).
4. **Radial transport.** The same van Leer flux form in `ln r`, with cell
   areas `½(r²_{i+½} − r²_{i−½})Δφ` so mass is conserved on the
   non-uniform cells. Domain faces are outflow: flux leaves with the upwind
   value, nothing enters.

Fixed `dt = 0.02` with a capped accumulator (max 4 substeps a frame). Wall
clock runs at 1.57 units/s, so the orbit at `r = 1` takes **4 s**, the
cavity edge 0.5 s, the outer edge 9 s; that is one to two substeps a frame
on a 98k-cell grid. A `speed` control scales the rate.

_As built, not as first specified:_ `dt = 0.01`, up to 6 substeps a frame,
2.6 a frame at 60 fps. At 0.02 the acoustic Courant number
`c_s dt √(1/Δx² + 1/Δy²)` at the inner rings of the 512 × 192 grid is 0.99,
and the gas went NaN between steps 200 and 300. The 128 × 64 mirror, four
times coarser, sat at 0.25, so no mirror test saw it; the mirror run at
production size did. The step was set by the orbital clock and has to be
checked against the sound speed at the finest cell.

### Measured, with numbers

- **The wake.** A planet's gravity launches waves at its Lindblad
  resonances; they trail outside the orbit and lead inside, and wrap with a
  pitch set by `c_s/v_K = h`. Measured in the mirror as the `m = 2` Fourier
  component of Σ along φ at `r_p ± 2H`; amplitude scales with `q`.
  _As built, not as first specified:_ measured as the RMS of `Σ/⟨Σ⟩ − 1`
  around the ring. At one ring the wake is a single peak about `H` wide,
  whose `m = 2` coefficient is about 2 % of its contrast (0.0015 at
  `q = 10⁻⁴`) and shrinks as a heavier planet steepens the peak. RMS
  contrast is 0.0149 at `q = 10⁻⁴`, and 1.94 times its value at half the
  mass.
- **The gap.** Opens when `q` passes both the thermal threshold
  `q > 3h³ = 3.8×10⁻⁴` and the viscous one `q > 40 ν/(r² Ω) ≈ 3×10⁻⁴`. A
  seed at `q = 10⁻⁵` (Earth-ish) makes a wake and no gap; fed to
  `~4×10⁻⁴` it clears one. With the disc at 2 % of the star, the seed has
  to eat a few percent of the disc to get there, and `τ_acc` is tuned so that
  takes about a minute.
  _As built, not as first specified:_ it takes far longer. A seed on a
  circular orbit at `r ≈ 1.2`, with `accretionRate` at 0.1, went from
  `q = 1.05×10⁻⁵` to `3.30×10⁻⁵` in a minute, near-linear at about
  `4×10⁻⁷` a second, which puts the threshold about a quarter of an hour
  away. The sink only reaches gas within a cell and a half of a small
  planet, so raising the rate does not buy the minute. Not tuned; recorded.

### Named tensions

1. **Sharp arms against a cheap step.** Arm width is `H = 0.05`, four cells
   at `Δr/r = 0.0123`. Second-order upwind still diffuses a four-cell
   feature over a few wraps; the exact orbital shift is what keeps most of
   it. If the arms wash out inside two orbits, the fix is the grid
   (768 × 256), not a constant.
2. **Toomre.** With `Σ ∝ r⁻¹` and 2 % of the star in the disc, `Σ(1) ≈
1.8×10⁻³`, so `Q = c_s κ / (π G Σ) ≈ 9` at `r = 1`. The disc would not
   fragment even with self-gravity on, which is why self-gravity is off in
   v1: at `Q ≈ 9` it buys a Poisson pass and nothing visible.
   Recorded so v2 knows the margin, and so nobody adds it to "make the arms
   stronger" — the arms are the planet's, not the disc's.
3. **Feeding against history.** Every gap is disc the star never gets, and a
   stage full of gaps dies fast. Accepted as the ending rather than damped:
   the disc is consumed, and `reseed` runs the collapse again.
4. **A visible drain against a reachable gap.** Both hang on `α`. A drain
   you could watch (ten minutes) needs `α ≈ 0.4`, which puts the viscous
   gap threshold `40 α h²` at `q ≈ 0.04` — forty Jupiters — so nothing you
   could throw would ever open one. Gaps win. The drain is not the story;
   the star's brightness is its accretion flux and will read nearly
   constant, flaring only when a planet falls in.

## The planets

On the CPU, up to 8: position, velocity, `q`, age. Integrated at the same
`dt` by kick-drift-kick leapfrog in the star's potential plus each other's —
second order and symplectic, so the energy oscillates within `(ω dt)²/8`
and does not drift. Passed
to the step shader as uniform arrays (position, `q`, `ε`) — the **write**
direction: the planet is a potential the gas feels.

The **read** direction is one `PingPong.reduce` after the frame's last
substep, giving per planet:

- **Force from the disc.**
  `F = Σ_cells Σ·dA·(x_c − x_p) / (|x_c − x_p|² + ε²)^{3/2}`. Its tangential
  part is the migration torque; it is the wake pulling on the thing that made
  it. A low-mass planet drifts inward on its own — Type I migration falling
  out, not scripted.
- **Mass eaten.** The sum of what the accretion sink removed this frame,
  added to `q`. The eaten gas's momentum is ignored; it is co-orbital and the
  error is second order.

Plus one scalar: **mass flux through the cavity edge** (`Σ·v_r` on the inner
ring), which is the star's accretion luminosity.

`readPixels` once per frame is the same sync the sandbox's probe pays. If the
float read fails, planets keep orbiting without migrating or growing, and the
scene still runs.

**Events.** Two planets inside the larger Hill radius merge, mass and
momentum summed. A planet crossing `r < 0.25` is removed and its mass goes to
the star's accretion counter. One past `r > 2.2` is gone. Nothing else: no
moons, no rings around planets.

## Input

**The throw.** Pointer down places a ghost seed at the pointer, in disc
coordinates. Drag sets the launch velocity as `(pointer − origin) × k`, with
`k` such that one disc radius of drag is about `1.5 v_K` — enough to reach
escape. While held, the predicted orbit is drawn from the orbital elements of
`(r, v)`: an ellipse if bound, a hyperbola if not, dashed inside the cavity
so it is visible that it will fall in. Release launches at `q = 10⁻⁵`. A
press and release with under 6 px of drag launches circular at `v_K(r)`.

The pointer is otherwise nothing. It is not a body and does not stir the gas.
The sim skill's "cursor as a body in the medium" is the pool's move; here the
hand is outside the system.

The orbital-elements maths lives in `physics.ts` and is used by both the
preview and the integrator, so the drawn ellipse and the flown orbit cannot
disagree.

**Default state.** One planet at `r = 1.1`, `q = 2×10⁻⁴` — half the gap
threshold, a strong wake with something left to finish — on a circular
orbit. Pre-roll: ten orbits at `r = 1` (about 3,100 substeps) at init before
the first frame, real drivers only, no stamped spirals. Re-prime on resize
and on any control change that rebuilds the grid.

_As built, not as first specified:_ ten orbits are 6,280 substeps at the
halved step, run 400 a frame over the first sixteen frames rather than
before the first. A resize re-primes nothing: the grid is fixed at
512 × 192 whatever the canvas, so a resize changes no state. And the default
planet does not survive the pre-roll. The disc's force on it is read back
once a frame and applied on every substep, so each pre-roll frame holds one
force vector fixed for four time units, more than half an orbit; that pumps
the orbit, and the planet crosses the `r > 2.2` escape radius within about
fourteen frames. The disc loads with the wake the planet laid down and no
planet. Holding the disc force at zero until the pre-roll ends is the fix;
not made on the build branch.

**Reduced motion.** Read at init via `shared/reduced-motion.ts`. Under it
the wall-clock rate drops to 0.25× (16 s per orbit at `r = 1`); the throw
still works. The disc slows rather than stops — a stopped disc is a picture.

## Rendering

Screen → disc coordinates → `(ln r, φ)` → one bilinear sample of the state.
Everything on screen is a projection of Σ and v:

- **Surface brightness.** Dust temperature `T = T₀ r^−½` — the passive
  irradiated profile, and the same `h` the pressure uses — through a Planck
  curve to RGB, times the optical depth `1 − exp(−κΣ)`. Dense is bright,
  thin shows the stage through it, the rim is white-hot because it is close.
  `T₀` is fixed by `h`; there is no warmth control.
- **Shock heating.** The wake is a weak shock. Compression (`∇·v < 0`) adds
  to `T` locally, so the arms glow rather than merely thicken. Same field the
  step computes; no second layer.
- **The star.** A disc with glare. Brightness is the measured mass flux
  through the cavity edge, plus a decaying flare each time a planet falls in.
- **Planets.** A dot scaled by `q^⅓` with a small glow. The Hill sphere is
  not drawn. The held throw draws its predicted orbit as a thin line.
- **Grain** as on the other shelves. Face-on, no tilt: an affine tilt on an
  honest disc reads as a sticker.

Ground is `PAL.ink`; the disc's outer taper fades into it so there is no
rectangle.

## Controls

All `debug: true`, lab-only.

| Control         | Range / default                 | What it moves                                       |
| --------------- | ------------------------------- | --------------------------------------------------- |
| `discMass`      | 0.005 – 0.05, **0.02**          | Σ normalisation; rebuilds                           |
| `alpha`         | 10⁻³ – 10⁻², **3×10⁻³**         | viscous drain, gap threshold                        |
| `aspect`        | 0.03 – 0.08, **0.05**           | `h`: pressure, pitch, colour                        |
| `accretionRate` | 0.01 – 0.2, **0.03** per unit   | `1/τ_acc` (≈ 5 orbits); tuned so a gap takes ~1 min |
| `speed`         | 0.25 – 2, **1**                 | wall-clock multiplier                               |
| `grain`         | as the other shelves            |                                                     |
| `reseed`        | select; any change re-collapses | rebuild + pre-roll                                  |

## Architecture

`packages/flateralus-pixi-animations/src/disc/`, the 5-file toy convention:

| File               | Owns                                                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `manifest.ts`      | `MANIFEST`, `DiscControlValues`                                                                                                                                                                        |
| `shaders.ts`       | `STEP_FS` (orbital shift → residual advect + MacCormack → sources → viscosity → sink), `REDUCE_FS` (per-planet force and eaten mass, inner-edge flux), `DISPLAY_FS`, uniform lists                     |
| `physics.ts`       | CPU mirror: `createDisc`, `step` (same operator split on a small log-polar grid), `stepBodies`, `elementsOf(r, v)`; measures `wakeAmplitude`, `gapDepth`, `totalMass`, `orbitEnergyDrift`, `isHealthy` |
| `physics.test.ts`  | Vitest against the mirror, no GL                                                                                                                                                                       |
| `discAnimation.ts` | `DiscAnimation extends PixiAnimation`; `PingPong.create({ fullPrecision: true })`; accumulator; throw state machine; planets; reduce readback; pre-roll                                                |

Registered in `src/index.ts` and in the lab registry on the toys shelf,
`tag: 'glsl sim'`. Nothing new in `shared/`: `PingPong`, `VERT`, the reduce
path and the pointer service are enough.

## Tests

Every real erosion bug was found by arithmetic. These are the disc's, on a
128 × 64 mirror:

1. **Equilibrium holds.** An unperturbed disc with the pressure-corrected
   rotation curve keeps Σ within 1 % over 20 orbits. If not, the source split
   is wrong, and no picture would say which term.
   _As built, not as first specified:_ split in two. The opening rotation
   curve is solved without viscosity, and at the clamped edges `ν∇²v_φ` is
   one-sided and large, so one test was measuring both. With `α = 0` every
   cell holds `|v_r|` and `|Δv_φ|` under 10⁻⁶ over 50 steps; at the default
   `α` the body, `0.4 < r < 1.6`, holds `|v_r|` under 10⁻⁴.
2. **Orbit drift.** A body on a circular orbit: energy drift under 10⁻⁴ per
   orbit at `dt = 0.02`; the preview ellipse matches the flown path to within
   a cell.
   _As built, not as first specified:_ production steps at 0.01; the
   mirror suites keep `dt = 0.02` on the 128 × 64 grid, where the
   inner-ring acoustic Courant number is about 0.25, half of production's.
3. **Wake exists, right sign.** A `q = 10⁻⁴` planet produces an `m = 2`
   perturbation trailing outside and leading inside its orbit, amplitude
   scaling with `q`.
   _As built, not as first specified:_ amplitude is the RMS contrast
   (above), and the scaling compares `q = 5×10⁻⁵` with `10⁻⁴`, both inside
   the linear regime, for a ratio between 1.4 and 2.8.
4. **Gap threshold is real.** With the sink off, so only gravity can clear
   anything: `q = 10⁻⁴` keeps the azimuthal mean of Σ at `r_p` above 85 %
   of a `q = 0` control after 60 orbits; `q = 10⁻³` takes it below 60 %.
   The control is what separates a torque-opened gap from anything the
   scheme does on its own. If either lands on the wrong side, the claim
   under test is the spec's threshold, not the tolerance.
   _As built, not as first specified:_ the bar is 70 %. At two cells per
   Hill radius the mirror leaves the ring at 62.8 % of the control after 60
   orbits for `q = 10⁻³`, and at 98.9 % for `q = 10⁻⁴`; production resolves
   `r_H` four times finer.
5. **Mass is conserved.** Σ lost from the grid equals mass gained by planets,
   star and the outer boundary, to float precision.
6. **Migration sign.** The reduce's torque on a low-mass planet is negative.
7. **Stability.** No NaN over 200 orbits at defaults and at every control
   extreme.
   _As built, not as first specified:_ plus one run at production size,
   512 × 192 for 1,200 steps at the production step, healthy and keeping
   98 % of its mass. It is the test that would have caught the Courant
   number.

The GPU step is kept numerically in line with the mirror as the erosion table's
is. Per-frame cost (three substeps at 512 × 192 plus one reduce) is checked
with the headless Metal timer loop, not the lab readout.
_As built:_ 7.8 ms of GPU a frame at 60 fps in a 1068 × 1344 stage (5.6 ms
of substeps, 1.5 ms of reduce, 0.75 ms of display) against 1.7 ms for the
erosion table on the same page. The reduce's 1,728 fragments cost more than
a whole step pass.

## Out of scope for v1

Self-gravity (Toomre margin above). Dust as a second phase trapped in
pressure bumps. The indirect term (the star's own acceleration from the
planets) — small at these `q`, and noted so it is not mistaken for a bug in
the planet's precession. Moons, planet rings, tilt, sound.
