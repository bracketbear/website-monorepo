# Lab toy ideas

Candidate toys for the Animation Lab's `toys` shelf, the rubric they get judged
against, and the record of what each one cost when we tried it.

This file is the home for ideas that are not yet work. An idea graduates when it
gets a spec in `docs/superpowers/specs/`; it comes back here with a post-mortem
if it dies.

Registered from `AGENTS.md` at the repo root, alongside the other agent-facing
docs.

## The rubric

Five questions, in this order. They are ordered by how expensive the mistake is
to discover, not by how interesting the question is — question 1 has killed more
work here than questions 2 through 5 combined.

**1. Does it have a subject?**
Not "is the physics real" — is there something a person would want to look at
before they understand it? `caustics-pool` is a pool, with light and toys and a
place. A grey square that throbs is not a subject, however honest its integrator.
This is the question the `simulating-not-decorating` skill is pointing at with
"warmth over impressiveness," and it is the easiest one to skip because it cannot
be settled by arithmetic.

**2. Is it legible in the first three seconds?**
A viewer should not need the mechanism explained. Water bends light; a river cuts
a valley; lightning branches. Nodal lines of a driven plate's eigenmode do not
clear this bar, and no amount of tuning moves it.

**3. Does the phenomenon fight itself?**
Look for a parameter that two requirements pull in opposite directions. If
"looks sharp" and "responds to input" want opposite values of the same number,
that is structural and tuning will not fix it. Write the tension down _before_
building, in the spec, as a named risk with the numbers attached.

**4. What is the measured quantity?**
The thing everyone else paints and we compute. If there isn't one, it's
decoration with extra steps.

**5. Does the loop close?**
Do objects read the field and write back into it? Optional, but it is what makes
`caustics-pool` the one people single out.

**0. Is it a different animal?**
Asked before the five, and after the sandbox. A new toy carries the pool's
_qualities_ — a place, tools not instructions, consequences that travel, parts
that play alone, differing parts, honest material, nothing precious — and none
of its _anatomy_. If the candidate can be described as "the pool but with X
instead of water", reject it and start over. The cheapest way to force a
different animal is to change the verb of play: the pool is
poke-and-watch-it-settle; build, tend, chase, feed, race and negotiate are all
open. Name the rejected sibling in the spec so the next reader sees the test
was run.

## Status

| Idea                                       | Rubric            | Status                                                                             |
| ------------------------------------------ | ----------------- | ---------------------------------------------------------------------------------- |
| [Erosion Table](#erosion-table)            | strong on 1, 2, 5 | **built** — shipped to the toys shelf                                              |
| [Sandbox](#sandbox)                        | strong on 1, 2, 5 | **built** — spec in `docs/superpowers/specs/2026-09-15-sandbox-design.md`; fails 0 |
| [Four-Way Stop](#four-way-stop)            | strong on 0, 2, 5 | **built** — shipped to the toys shelf                                              |
| [Disc](#disc)                              | strong on 0, 4, 5 | **built** — shipped to the toys shelf                                              |
| [Lichtenberg](#lichtenberg)                | strong on 2, 4    | ready to spec                                                                      |
| [Frost](#frost)                            | strong on 1, 2    | **subject lent** to the type shelf as `frost-line`; a toy must pass 0 against it   |
| [Soap Film](#soap-film)                    | strong on 2, 4    | ready to spec                                                                      |
| [Ember](#ember)                            | strong on 2, 4    | **subject lent** to the type shelf as `slow-burn`; a toy must pass 0 against it    |
| [Light Garden](#light-garden)              | strong on 1, 5    | ready to spec                                                                      |
| [Chladni Plate](#chladni-plate--abandoned) | fails 1, 2, 3     | **abandoned** — see post-mortem                                                    |

---

## Erosion Table — built

Shipped to the toys shelf. It was the only candidate strong on subject,
legibility and loop closure at once, and the data was already in the build.
What follows is the original case for it; the build notes are at the end.

- **State:** heightmap + water depth + suspended sediment, all integrated.
- **Measured:** drainage networks. Water flows down the gradient, picks up
  sediment above carrying capacity and drops it below; dendritic valleys emerge.
  Nothing authored.
- **Input:** the cursor rains on it, or drags uplift up like a thumb under a
  tablecloth.
- **Loop closure:** total. Terrain routes the water; water rewrites the terrain.
  Tighter than the pool's, because there is no separate object layer at all —
  the landscape _is_ the memory of every drop that fell on it.
- **Subject:** Mt Hood. `shared/terrain.ts` already bakes real elevation for
  `hood` and `pgh`, so the opening state is a real mountain rather than noise.
- **No resonance, no Q, no eigenvalues** — nothing that trades beauty against
  interactivity, which is precisely what killed the plate.

### What it cost

All of it held. There is no tension between looking good and responding, the
subject carried the whole way, and the drainage networks are the simulation's
answer rather than anyone's texture. What follows is what was not obvious in
advance.

**Every real bug was found by arithmetic, not by looking.** A CPU mirror of
the two GPU passes, exercised headlessly, caught four things that would have
been invisible or misattributed on screen:

1. **The open boundary was a weir, not an edge.** With the ground outside the
   domain at the same height, the head difference across the rim is only the
   local water depth, while head differences inside come from the terrain
   slope and are an order of magnitude larger. The interior fed the rim
   faster than the rim could drain and the table flooded. An edge has to be a
   cliff.
2. **A missing factor of the cell size in the flux update.** The pipe carries
   depth per second; the momentum equation is written for discharge per unit
   width. Those differ by one cell size, and the head difference needs
   another to become a slope. With one dropped, flow speed came out
   proportional to grid resolution — it would have looked like a plausible
   river at whatever grid it was tuned on and run seven times slower in
   production.
3. **Capacity from the gradient magnitude cannot channelise.** `|grad b|` is
   largest on the steep _walls_ of a nascent channel, where the water runs
   along the contour and does no work. Walls then cut back as fast as floors
   and every channel washes flat as it forms. Stream power is discharge times
   the downslope gradient _along the flow_, which is zero across a wall.
4. **Erosion is capacity-limited, so the dissolving rate saturates.**
   Suspended load reaches capacity within a step or two. Above a dissolving
   rate of about 40 nothing changes but the stiffness of the integrator, so
   the Erosion Rate control scales capacity instead.

**The measure has to be chosen as carefully as the model.** The obvious
channelisation metric — how concentrated the water is — turned out to track
the weather rather than the landscape. Storm cells land patchily and even
out, so the number falls over the first minute whether the bed is erodible or
made of glass, and it read as "no channelisation" for three rounds of
misdirected tuning. Two measures survived: the correlation between where the
bed was cut and where discharge accumulated, and the spread of terrain height
about a local average of it. Both need a control run with erosion switched off
to mean anything.

**Stream power alone is not a landscape model.** It has no limiter: capacity
goes as the slope along the flow, so a cell that cuts deeper gets a steeper
approach and cuts faster, without bound. Measured at a 128-cell grid the
deepest cell drilled to twelve times the relief of the whole mountain and the
field stopped being finite. Two terms fix it, and both are physics rather than
damping:

- **Hillslope creep**, which stops channels being exactly one cell wide.
  Without it the feedback concentrates on whichever single cell is deepest and
  the result is a grid of slot canyons that reads as stair-stepped rubbish
  however it is shaded.
- **Slope failure at the angle of repose**, which is what actually kills the
  singularity. Creep can suppress it too, but only at a strength where
  diffusion outruns stream power and the valleys stop being the story —
  visible as the correlation between incision and discharge going _negative_,
  because creep lowers ridges and fills valleys, which is the opposite
  signature. Slope failure only touches ground already too steep to stand up,
  so everything gentler keeps whatever the water did to it.

**Seed roughness is measured in slope, not in height.** The bake adds fine
noise so the channel-forming instability has something to bite on. At 0.4% of
relief that sounds negligible — and across a single cell it is a 23-degree
facet, which the hillshade turns into a field of visible blocks. Roughness has
to stay below what the grid can resolve, and its amplitude has to be judged
after dividing by the cell size.

**Three of the six tools from the Chladni list would have paid for
themselves here**, and the one that did was built: the headless harness. The
float-texture probe and the sim scrub would have shortened the rest.

## Sandbox — built

The first toy chosen by reading the pool as a toy rather than as a
simulation. The seven reasons the pool is a complete package — a place with
a history, tools not instructions, consequences that travel, parts that play
with each other unattended, loose parts that differ, honest light, nothing
precious — are in the spec. Sand was picked because it has the one thing the
pool cannot: memory. A wake is gone in seconds; a track stays.

- **State:** sand height plus moisture, one float target, mass-conserving.
- **Measured:** wind ripples from a nonlocal saltation flux (the linear
  stability picks a wavelength between the hop length and twice it), slope
  failure at a moisture-dependent angle of repose, and cast shadows marched
  across the height field toward a low sun.
- **Input:** drag plows — sand is displaced into a bow wave, never deleted;
  click stamps a damp bucket castle with its moat dug from around it.
- **Loop closure:** a beach ball reads the slope and rolls, cuts a rut, the
  rut shadows the wind, the ripples reorganise around it; gusts roll the
  ball, so the loop runs unattended.
- **History:** turned sand is dark because it is damp, and dries pale over a
  minute. Damp sand stands steep, so a castle holds and then crumbles.
- **Subject:** a sandbox at golden hour, with the box floor and the mark
  printed on it waiting under the sand.

## Four-Way Stop — built

The first _negotiate_ toy: two streams of cars want one crossing, and you are
the cop. Car-following is the Intelligent Driver Model, so braking waves and
phantom jams are emergent; drivers accept gaps by a critical gap that shrinks
as their patience runs out, which is where the standoff comes from. Wet
asphalt reflects every light by mirroring its geometry through the road
plane. Chosen over two cats and one sunbeam, and one door and two crowds,
because the cursor's job is unmistakable in the first second.

### What it cost

The named tension held without moving a traffic constant: compressed headway,
patience and demand still produce backward-travelling braking waves and jams
from nothing, because only the IDM's constants were compressed, not its
shape. `demand` stayed at the 0.2 the design already lowered it to; nothing
else in `DEFAULT_PARAMS` needed to move, and `traffic.test.ts` is still the
arbiter that would have said so.

**Four of the bugs the plan didn't see were about where a car actually is,
not where its model says it is, and none of them showed up by looking.**
The stop-line leader was modelled parked exactly at the line, so its bumper
sat two metres short of it; the fix is a leader a jam gap past the line. A
merge was modelled as a crossing, so two vehicles converging on the same
exit lane each waited for the other to clear a point neither was
approaching, and froze each other forever; following by remaining distance
to the merge point instead of by crossing time fixed it. The bus's body
straddles the twelve-metre box while its front is already out on the exit
lane, so gridlock and crossing checks keyed on the front bumper missed it
sitting in the way; they key on body occupancy now. And gap acceptance
judged by the gap's length in metres refused tails that would be gone by the
time a driver reached them, doubling every wait for no reason; judged in
time instead, it matches what a driver would actually risk.

**The camera fight was in "the picture," not in the traffic.** A mast close
enough to the corner to match the spec's "corner mast" description sits
inside the south and west approaches' own length, so a car passing the
mast's latitude crosses behind the lens's near plane — not just "too big,"
but a frame or two of the image tearing as depth goes through zero. Pulling
the mast back and re-aiming north-east (so the north and east queues both
climb into the frame instead of one sweeping past the lens, which is what a
south-east-facing mast did to the east approach) fixes both the framing and
the tear, but the fix is a real tower, not a streetlight: the doc comment now
says so instead of pretending otherwise. A stress run holding one approach
for a minute built a seven-car queue on the near lane with no glitch,
which is the actual bound that mattered, not the theoretical one at the
lane's full length.

**Tyre tracks were fading against the wrong lifetime.** `drawHistory` faded
every track against a fixed 75-frame span while `recordHistory` was already
computing a rain-dependent life of 25 to 75; at low rain a track would be
culled at 25 while still rendering as if it had 50 left, so it popped instead
of fading. Each track now carries the life it was drawn with.

**The fix wave found that the bodies were ghosts.** The final review parked
a car with its body over a conflict point and a granted car from the
crossing street drove through it at 8 m/s without braking, because "on the
point" was judged by the front bumper, and a wave granted every car on the
street, sixty metres up included, with nothing to take it back when the
hand changed. With the bodies made solid (a driver looks along its own
route for any body its rectangle would meet, and a granted driver still on
the approach does the same from the line) the corner showed what the point
model had been hiding: four left-turners can each stop against the next
one's body around the centre, and nothing in a world without a reverse gear
can move them. That is the honest gridlock, and the spec says it clears.
Two rules do it. A driver at the line does not enter behind a body that is
already stopped inside the box (a body beyond the seam is a queue to join,
which is how a late bus still parks across the crossing), and a ring of
drivers each stopped against the next is broken, once patience is out or
the cop is clearing, by the one who has been there longest forcing past,
which is the toy's stand-in for someone backing up. Patience latches, too:
a driver released from a courtesy used to creep forward, reset its clock,
and yield again, a few centimetres every four seconds. A cop who waves
every approach in turn every three seconds for five minutes at heavy
demand now leaves a box a clear empties in one to eight seconds on ten
seeds, and bodies overlap only inside a forced ring pass. Buses also had to
lie across the chord of their turn rather than along the front's tangent,
which had been putting a turning bus's tail across the far side of the box.

The far side got a light. Each exit lane backs up on its own for fifteen to
thirty seconds about once every two and a half minutes (a hashed third of
fifty-second cells, per exit, off the simulation clock), so a bus waved
late can meet a backed-up far side without a test hook. At that rate, with
the cop absent and default demand, the measure still holds: no wait over
twenty seconds, every approach served, and nobody takes more than twenty
seconds from stopping at the line to clearing the box. `Far Side` is on the
debug panel, 0 to 2. Tyre tracks are recorded per metre travelled instead
of per frame, so the six-thousand-segment cap holds about a minute of the
corner instead of five seconds.

**A clear cannot empty a box the far side has filled.** The spec's measure
said a late bus "clears within fifteen seconds of a clear command". It
cannot: the bus is stopped because the exit lane ahead of it is full, and no
gesture moves a queue with nowhere to go. Measured against a real 29-second
far-side red, the box emptied about ten seconds after the red ended, with
the cop holding the lines the whole time. The spec's sentence was amended to
say that; the code was not bent to fake it.

**A forced gap is drawn as a forced gap.** When a ring of stopped drivers
has to be broken, the one who has waited longest is let through the body
blocking it, and for a second or two two bodies overlap on screen. It is rare
(one and a half seconds in ten minutes at default demand, more under
adversarial waving) and it is the one place the core lets a body through a
body. Left visible rather than hidden.

## Disc — built

The first _feed_ toy. A protoplanetary disc from above the pole; you throw
seeds, they raise wakes and eat, and one fed past the gap-opening mass clears
an annulus. Chosen over a gravitational lens (the caustics Jacobian on a
deflection map — _fling_, which is poke with a longer reach) and tides with
the cursor as a moon (_drag_ on a wave field on a sphere — the pool again)
because feeding until the disc changes regime is a verb nothing else has.

- **State:** surface density and velocity on a log-polar grid, orbital
  advection (FARGO) so the supersonic Keplerian part is an exact shift and
  only the residual is advected.
- **Measured:** the spiral wake as the gas's Lindblad response, and a gap
  that opens only past the real thermal and viscous thresholds.
- **Loop closure:** the planet is a potential the gas feels; the wake's
  torque migrates the planet and the accretion sink feeds it.
- **Rejected sibling:** the rubber-sheet gravity well — the pool with a dent.
- **Named tensions:** sharp arms vs cheap step (four cells per scale height);
  Toomre `Q ≈ 9`, so self-gravity is off; feeding consumes the disc, which
  is the ending.

### What it cost

The gas held. The disc starts in equilibrium to round-off, the scheme
conserves mass by construction, and the exact orbital shift keeps a
four-cell arm through far more wraps than the named tension feared. The loop
did not hold in the default the toy loads with, and the reason is not in the
physics. What follows is what was not obvious in advance.

**The default planet is gone within a second of load, and its arms hide
that.** The disc's pull on each planet is read back once a frame and applied
on every substep until the next read. At 2.6 substeps a frame that is
harmless. The pre-roll runs just over 400 substeps a frame, four time units,
so one frame's force vector, measured at one point on the orbit, is held
fixed through more than half an orbit, and that pumps the orbit instead of
perturbing it. Traced off the planet uniform in the running lab, the seeded
planet climbs from r = 1.10 through 1.17, 1.28, 1.40, 1.51, 1.66, 1.84 and
2.11 on successive pre-roll frames and is past the r = 2.2 escape radius by
the fourteenth, about a second of wall clock, before the pre-roll has
finished. The force itself is sane: about 8.5 × 10⁻³, 1 % of the star's pull
at that radius, so the reduce's area weighting is not at fault. The mirror,
given a force of that size refreshed on the same cadence, follows the
browser's trace to within a few hundredths of a radius frame by frame and
loses the planet on the same frame; given it at six substeps a frame, it
drifts the planet inward from 1.100 to 1.092 over 200 frames, which is the
migration the spec asked for. The pre-roll lays the planet's wake down
before the planet leaves, so what loads is a disc with spiral arms and
nothing making them. No test runs bodies at the pre-roll's cadence, and on
screen the arms read as a wake, so it went unseen until the uniform was
tapped. It is not fixed on this branch. Holding the disc force at zero until
the pre-roll ends is the obvious change, and is the spec's "real drivers
only" taken literally. Until then the tensions that need the default planet
(a maintained wake, visible migration, a planet fed to a gap) cannot be
judged in the toy.

**The step that was stable on the mirror was not stable on the grid.** The
spec's `dt = 0.02` was chosen by the orbital clock and checked on the
128 × 64 mirror, which held. On the production grid the disc rendered black:
the gas went NaN between steps 200 and 300. The acoustic Courant number
`c_s dt √(1/Δx² + 1/Δy²)` at the inner rings is 0.99 at that step on
512 × 192 and 0.25 on the mirror, whose cells are four times wider, so no
mirror test could have seen it. Running the mirror at production size found
it, and at `dt = 0.01` the same run stayed healthy for 1,200 steps. The step
is now 0.01, with up to six substeps a frame and a pre-roll of 6,280 steps
for the same ten orbits. The mirror suites keep `dt = 0.02` on the coarse
grid so the suite did not double in length; the Courant number there is
about 0.25, half of production's at the new step, so the coarse suites are
not at production's margin. One sim test now runs the mirror at 512 × 192 for
1,200 steps and asks that it stays healthy and keeps 98 % of its mass. A
stability limit goes with the cell size, so a mirror has to be run once at
the size the toy runs, and now it is.

**The wake needed a different measure before the physics could be judged.**
The spec measured it as the `m = 2` Fourier component along a ring. At one
ring a planet's wake is a single peak about H wide, whose `m = 2`
coefficient is about 2 % of its contrast (0.0015 for q = 10⁻⁴), and a
heavier planet steepens the peak, so the coefficient came out smaller for
the heavier planet (0.87 of the lighter's) while the wake plainly grew. The
RMS of Σ/⟨Σ⟩ − 1 around the ring is the contrast itself: 0.0149 at
q = 10⁻⁴, and 1.94 times its value at half the mass. The torque, −4.6 × 10⁻⁴,
is the Type I order of magnitude. As on the erosion table, the measure had
to be chosen as carefully as the model.

**The equilibrium test was measuring two things.** It failed at
|v*r| = 1.19 × 10⁻⁴ against a tolerance of 10⁻⁴. The opening rotation curve
is solved without viscosity, and at the clamped edges ν∇²v*φ is one-sided
and large, so the failure was viscosity at the edge, not the stencil. Split
in two: with α = 0 every cell holds to 10⁻⁶ over 50 steps, which pins the
source split, and at the default α the body of the disc (0.4 < r < 1.6)
holds to 10⁻⁴.

**The gap bar is a statement about the mirror's resolution.** With the sink
off, q = 10⁻³ leaves the ring at 62.8 % of the q = 0 control after 60 orbits
on the 128 × 64 mirror, and q = 10⁻⁴ leaves it at 98.9 %. The spec's bar was
60 %. At two cells per Hill radius the mirror cannot carve deeper, and
production resolves the Hill radius four times finer. The bar is 70 %, and
the claim it tests, a third of the ring gone past the threshold against one
percent below it, holds.

**Feeding is slower than the spec's minute by an order of magnitude.** A
seed clicked onto a circular orbit at r ≈ 1.2, with Accretion Rate at 0.1
(three times the default), went from q = 1.05 × 10⁻⁵ to 3.30 × 10⁻⁵ in a
minute and 4.58 × 10⁻⁵ in ninety seconds, close to linear at about
4 × 10⁻⁷ a second, and stayed near r = 1.2 the whole time. At that rate the
gap threshold, 3.8 × 10⁻⁴, is about a quarter of an hour away, and further
at the default (not measured). The sink only takes gas within a cell and a
half of a small planet, so raising the rate toward 0.06, which the plan
offered as the fix, would not close the distance. Nothing was tuned. The
spec's minute leaned on the default planet, which starts at half the
threshold; with that planet gone, a seed is the only thing on the stage to
feed.

**The picture caught what the mirror had no way to see.** The display
shader mapped screen to disc by the height while the throw and its preview
mapped by the shorter side. They agree on a landscape screen; the lab stage
is portrait, so a throw landed 1.6 times further out than the pointer. The
shader now fills the shorter side, as the CPU assumed.

**The drain the mirror showed does not show.** On the 128 × 64 mirror the
inner ring fell from 1.05 to 0.58 over 1,200 steps, about 1 % of the disc
leaving through the inner edge every 12 time units at either step. Twelve
time units is eight seconds of wall clock, so if the production grid did the
same the disc would hollow visibly within a minute. Read off the framebuffer
over five minutes, the azimuthal mean of brightness at r = 0.35 went from
208.3 to 208.6 on a 0–255 scale, further out nothing moved by more than a
tenth (and that was brighter, where the arms are), and the
brightness-weighted total moved 0.2 %. Brightness saturates with optical
depth, so a small drain could hide in the inner rings, but not a halving.
The spec's "does not drain visibly" stands on screen; the mirror's
inner-edge flow is a coarse-grid effect or too slow at 512 × 192 to read.

**The arms do not wash out.** Contrast around a ring (RMS over mean of
brightness) went from 0.04 to 0.13 over three minutes at r = 1.5, and from
0.05 to 0.24 at r = 1.7. The 768 × 256 grid the named tension held in
reserve is not needed. With the planet gone these arms are the wake it left,
winding tighter every orbit with nothing renewing it, and the orbital shift
keeps them. Why the contrast grows in the outer disc rather than holding is
not explained yet.

**The frame costs about four and a half erosion tables.** Measured headless
on Metal with a timer query around every draw, at a steady 60 fps, in the lab
at 1600 × 1400 (a 1068 × 1344 stage): a substep's three passes cost 0.58,
0.72 and 0.83 ms (sources, azimuthal, radial), and at 2.6 substeps a frame
that is 5.6 ms; the reduce is 1.5 ms and the display 0.75 ms, 7.8 ms of GPU a
frame in all. The erosion table on the same page and viewport costs 1.7 ms:
eight passes at 342 × 431 of 0.10 ms each and a 0.87 ms display. The plan
expected the disc well under it. Per cell the disc's passes cost eight to
twelve times the erosion table's, which is the limiter, the three-case
stencil and the planet loop, and halving the step doubled how many of them
run. The reduce is the worst-spent time in the frame: 1,728 fragments each
summing a 512-cell ring cost more than a 98,304-cell step pass, with most of
the GPU idle, and it is the first place to look (sum pairs of rings, or
reduce in two stages). The display is not the problem. The lab's own readout
says 60 fps and 16.7 / 17.4 ms and shows none of this; its quality
controller walked down to 0.30, which this toy does not read.

**One test was red before the branch started.** The type shelf
(`off-register`, `aspic`, `frost-line`, `slow-burn`) had been registered
without being added to the registry test's `SELECTED` list. The four ids were
added on this branch alongside `disc`.

### Second pass

Spec in `docs/superpowers/specs/2026-09-23-disc-dust-design.md`. The gas had
held; what had not was the distance between the physics and what a visitor
saw. Four gaps, measured before anything was changed, and what closing them
cost.

**Feeding was a quarter of an hour, and the build note blamed the wrong
thing.** On the production grid a fresh seed with the sink at 1.5 cells and
`accretionRate` 0.1 ate `2.45 × 10⁻⁷` a time unit, sixteen minutes to the
gap threshold. At 0.5 it ate `1.10 × 10⁻⁶`, at 2.0 `3.01 × 10⁻⁶`: the sink
was rate-limited about five times below what shear refills it with, so the
rate was the lever after all, just not at 0.06. Now 0.5, with the floor at 2
cells and a seed thirty Earths instead of one. Measured live, a seed clicked
onto a circular orbit at `r = 1.2` passed `3.8 × 10⁻⁴` 52 time units later,
33 s of wall clock at 60 fps, and its lane followed. The seed the disc loads
with does the same on its own about 35 s after load.

**The display had no headroom.** `κ = 1.5/Σ₀` put the optical depth at 0.78
at `r = 1` and 0.99 at `r = 0.3`, so a 1.5 % density contrast was a 0.5 %
brightness contrast and every arm on screen was the shock-heating term.
`κ = 0.5/Σ₀` with a gain of 1.6 on the emission; the rim still saturates.

**A giant at load, and what it found at the cavity edge.** The opening
state now has a `1.5 × 10⁻³` giant on a circular orbit that carves a lane
during the pre-roll, and a seed further out. The first placement, `r = 0.6`,
sent the gas NaN on step 461 of the production-size mirror, sink on or off;
`r = 0.8` lasted to step 2383; both at ring 0. Instrumented, the mechanism
was plain: the giant's inner wake reaches the cavity edge as a shock with
radial velocities near the sound speed, its trough drains ring 0 from 0.2 to
0.001 of `Σ₀` over 150 steps, and the moment Σ touches the floor the pressure
gradient divided by the floor density multiplies the velocity by sixty in one
step. The 2 × 10⁻⁴ planet the toy shipped with never excited it. Two changes:
wave-damping zones at both edges (de Val-Borro et al. 2006), which relax the
gas toward the opening state on the edge's orbital time with a parabolic ramp
so a wake arriving there is absorbed rather than drained through the
boundary, and an inner taper eased in ln Σ, because the old one, quadratic
from the floor over 0.06, had put ring 0 at a residual Courant number of 4.3
to balance a 25× jump across one cell. The mass the zones add is tracked and
enters the conservation test. With both, the giant at 0.6 and at 0.8 is
healthy through 8,000 steps, and the toy runs at 0.8 because the inner
wake's tight rings between rim and lane are the best thing in the picture.
Two production-size tests pin it: every ring within a third of a cell a step
of Keplerian at the opening state, and the cavity edge still populated after
800 steps under the giant. Two things the zones change on purpose: the edges
are now a standing source, so a planet past `r = 1.8` has its wake absorbed
and its sink refilled by the zone, at about 0.014 a unit against a sink
rate of 0.5; and the cavity edge holds `0.2 Σ₀` at ring 0, so the rim is a
soft glow from 0.3 to 0.4 rather than a hard edge on black. The parent
spec's "tapered to a floor" and "nothing enters" are no longer true and
carry pointers.

**Dust.** 65,536 grains in a float texture on the gas context, each
`(ln r, φ, St, alive)`, stepped by a shader that samples the gas and adds the
terminal-velocity drift `t_s ∇P / Σ`, drawn as additive points coloured by
the disc's temperature. Stokes numbers log-uniform on `[0.02, 0.2]`. It does
what it was for: the lane empties of grains inside a minute, biggest first,
the grains pile into bright rings at the lane edges, and the disc visibly
turns, faster inside than out. A CPU twin in `grains.ts` carries the tests;
the "leaves the lane" test uses a constructed 80 % dip in a frozen gas,
because the mirror's torque-carved gap at 30 orbits is too shallow and the
background inward drift confounds a control, and because the gradient
stencil spans a cell each way, wider than a 50 % dip's bottom.

**What the frame costs now.** Headless Chromium on Metal, timer query
around every draw, 1068 × 1344 stage, at 60 fps:

| Pass                       | Built toy | Now      |
| -------------------------- | --------- | -------- |
| gas substeps (2.6 a frame) | 5.6 ms    | 4.1      |
| reduce                     | 1.5       | 0.93     |
| display                    | 0.75      | 0.67     |
| grain step (1 a frame)     | —         | 0.77     |
| grain draw (65,536 points) | —         | 0.78     |
| **total**                  | **7.8**   | **7.26** |

The reduce, chunked eight ways along each ring (13,824 fragments summing 64
cells each), gave back 0.6 ms. A grain step costs as much as a gas pass, so
it runs once per frame over the frame's substeps rather than per substep,
which took the total from 9.0 ms to 7.3; grains integrate `(ln r, φ)`, so the
orbit is exact at any step and only a wake's `v_r` bounds it. The gas passes
themselves measured 0.52 ms each against the earlier 0.58–0.83; same
machine, a different day.

**Two things about measuring.** The Chrome tab the agent drives is hidden
(`document.visibilityState` is `hidden`, zero animation frames a second, the
lab readout says FPS 0), so the animation only advanced in bursts during a
screenshot or a click, and an hour went to probes that never landed. The
memory's headless playwright loop is the only honest way to watch this toy
run. And the astro dev server does not watch files outside the app root, so
a rebuild of the package's `dist` two directories up is never picked up
until the server restarts.

## Lichtenberg

Worth building purely on the gap between the honest version and the version
everyone ships.

- **State:** a potential field φ plus a growing conductive cluster.
- **Measured:** the branching. Solve Laplace for φ (Jacobi, same shape as the
  pressure solve in `ink-dissolve`), then grow the discharge into a neighbour
  with probability proportional to |∇φ|^η. Fractal dimension falls out of η.
  Every lightning shader on the internet is noise-warped sine; this is the
  Niemeyer–Pietronero model.
- **Input:** the cursor is the electrode; click sets a ground point and the tree
  _aims_ at it because the field says so.
- **History:** burned channels stay conductive and charred, so later strikes
  reuse old trunks. It physically cannot loop.

## Frost

**Subject lent.** The physics here shipped as `frost-line` on the type shelf
(`docs/superpowers/specs/2026-09-21-type-effects-design.md`), where the copy
supplied the subject this entry lacked. What that build found out, so a toy
does not find it out again: the humidity feed has to go into the _vapour_, not
onto the ice (fed to receptive cells it fattens every arm into a sector plate);
sparse nucleation is what makes feathers, because a full edge fingers too and
comes out as fur; and a melted patch must lose most of its water or it
flash-freezes back as a slab. A Frost _toy_ now has to be a different animal
from a frosted heading — question 0, with `frost-line` as the named sibling.

- **State:** vapour concentration field plus a frozen mask.
- **Measured:** the feather shape. Mullins–Sekerka instability — tips reach
  further into the vapour, eat more, and run away. The branching is instability,
  not a drawn L-system. Growing ice depletes the field so neighbours starve each
  other.
- **Input:** the cursor is a warm fingertip. It melts a clear patch, which dumps
  vapour back into the field, which refreezes _differently_ than what was there.
- **Opening state solves itself:** the window is already frosted when you land,
  because the process ran.

## Soap Film

- **State:** film thickness, drained by gravity and pushed by Marangoni flow.
- **Measured:** the iridescence. Thin-film interference — path difference
  against wavelength gives the real reflectance spectrum, so the colour bands
  _are_ the thickness map. Everyone else uses a hue ramp on noise.
- **History:** the film thins irreversibly, black spots appear at the top (real
  — the Newton black film), then it ruptures and a new bubble is blown.

## Ember

**Subject lent.** The physics here shipped as `slow-burn` on the type shelf
(`docs/superpowers/specs/2026-09-21-type-effects-design.md`), with the
letterforms as the fuel and the buoyant velocity field dropped for an upward
bias in the heat transport. What that build found out: a reaction front near
extinction does not slow toward zero, it holds a minimum speed and then dies —
so "paper at a quarter of the type's speed" does not exist in this chemistry,
and the contrast between the two has to be carried by temperature. An Ember
_toy_ now has to be a different animal from a burning heading — question 0,
with `slow-burn` as the named sibling.

- **State:** fuel, temperature and a buoyant velocity field, coupled.
- **Measured:** the colour. Blackbody radiation from the temperature field
  through a Planck curve, not an orange-to-yellow gradient. Flame lives only
  where fuel and heat overlap, so it walks along the fuel.
- **History:** burned fuel is gone and leaves char. The scene is consumed, which
  is the opposite of a loop.

## Light Garden

- **State:** a light field and a set of growing stems.
- **Measured:** the canopy. Each segment grows toward the local light gradient
  and every leaf subtracts light from what is below. Competition produces
  spacing, leaning and stunted losers, none of it authored.
- **Loop closure:** the thing that makes the shapes is the thing the shapes
  destroy.
- **Subject:** the warm one. A garden, different every load.

## Also considered

Not worked up, kept so we don't re-derive them.

- **Ferrofluid (Rosensweig instability)** — spikes from magnetic pressure vs
  gravity vs surface tension; the cursor is a magnet under the dish.
- **Foam coarsening** — big bubbles eat small ones by von Neumann's law, growth
  rate proportional to (n − 6). Coarsens forever, never repeats.
- **Ising domains** — actual Metropolis Monte Carlo; near the critical
  temperature the domain structure is gorgeous and it is the physics itself.
- **Rain on a window** — contact-angle hysteresis: a drop pins until gravity
  wins, then runs and absorbs its trail. Honest, but heavily done elsewhere.
- **Double-pendulum rack** — literally cannot loop, cheap to build, visually
  thin. The honest-but-boring control case.

---

## Chladni Plate — abandoned

Specced, planned, and built through four commits before being stopped. The spec
(`docs/superpowers/specs/2026-09-11-chladni-plate-design.md`) and plan
(`docs/superpowers/plans/2026-09-11-chladni-plate.md`) are kept: the arithmetic
in them is correct and reusable, and the failure is worth not repeating.

**What worked.** The fourth-order Kirchhoff integrator ran stably at 60fps for
well under 0.1ms of GPU time. Real nodal figures formed. The boundary swap
demonstrably rewrote them. The free-edge collapse trick below is genuinely
useful and transfers to any masked biharmonic.

**Why it was stopped.**

1. **The physics fights itself (rubric 3).** A uniform inertial drive couples to
   the fundamental about 120× more strongly than to the modes that make
   interesting figures — the overlap of a constant against sin(mπx)sin(nπy) is
   16/(mnπ²). The resonant mode only wins if Q beats that ratio, and the ratio
   works out as 0.04·ω/γ. High Q buys sharp figures and costs slow build-up and
   needle-narrow resonances that are miserable to hunt. "Sharp" and "fun" wanted
   opposite values of the same number. No tuning resolves that.

2. **Grid resolution pinned from both ends.** Stability caps β at 1/16, which
   forces a coarse grid to get modes into a visible frequency band — and a coarse
   grid only carries low-order modes, which read as blobs. The crisp filigree in
   real Chladni footage comes from a metal plate with Q in the thousands and
   hundreds of available modes. Unreachable from here.

3. **No subject (rubric 1).** The one that should have stopped it before the
   spec was written. It is a grey square that throbs. It was chosen because it
   reused the wave integrator cheaply and closed the loop tightly — engineering
   virtues — and those were allowed to outvote whether anyone would want to look
   at it.

**Findings worth keeping.**

- **Free edges are a term to drop, not an extrapolation to compute.** A free edge
  needs zero bending moment, so the ghost cell is `w_ghost = 2·w_c − w_opposite`.
  Substituted into the three-point second difference it collapses to exactly
  zero. So: if either neighbour along an axis is outside the mask, that axis
  contributes nothing to the Laplacian. One mask tap per side, works on
  arbitrary irregular boundaries. This is the whole free-edge condition.
- **A simply-supported rim is a sand trap.** Pinning `w = 0` at the boundary
  makes the rim a permanent nodal line and therefore the deepest well on the
  plate — the sand builds a frame around the border and the interior figure
  starves. Real Chladni rims are antinodes, which is exactly why the sand is
  free to draw anything.
- **A point driver on a stiff plate is useless.** Measured: near field |w| ≈ 1.5
  against a modal response of 0.04. Overcoming it needs Q ≈ 3000. Drive the
  plate bodily instead.
- **Check the drive scale against `A = F·overlap/(γω)` before building.** Three
  separate iterations were spent on amplitudes that were 10× or 100× wrong in
  both directions.
- **Only (odd, odd) modes have a centre antinode**, so a symmetric drive reaches
  roughly a quarter of the spectrum. Budget for that when counting available
  modes.

**Process lesson.** Converting the spec's constants into simulation units caught
two errors before any code ran (a grid sized for 0.1 Hz modes; a drive band that
did not contain the mode it claimed). It did not catch the three failures above,
because those are not arithmetic. Rubric questions 1 and 2 are not checkable by
calculation, which is exactly why they go first.

## Tooling this exposed

Every wrong turn in the plate came from not being able to see inside the
simulation. Before the next field-based toy, these are worth more than the toy:

1. **Float-texture probe in the inspector.** Register a texture, get live
   min/mean/max per channel. Amplitude magnitude was guessed analytically all
   session and was wrong by 10×.
2. **Control-state persistence.** URL hash or localStorage round-trip of manifest
   values, plus copy/paste of a control set as JSON. Every reload lost every
   tuned value.
3. **Stats readout** — fps, frame ms, draw calls. Answering "is this sluggish?"
   required monkey-patching `drawArrays` from the console.
4. **Shader errors surfaced in the UI.** A compile failure currently sets
   `failed = true` and renders nothing, with the reason only in the console.
5. **Sim scrub** — pause, step N, reset. A 9,600-step pre-roll and an 8-second
   build-up made every observation a 20-second wait.
6. **Headless harness.** Run an animation's passes offscreen from vitest and
   assert on field statistics, so "verified by eye" has a floor under it.
