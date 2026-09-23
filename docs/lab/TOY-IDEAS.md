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
| [Disc](#disc)                              | strong on 0, 4, 5 | **specced** — `docs/superpowers/specs/2026-09-23-disc-design.md`                   |
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

## Disc — specced

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
