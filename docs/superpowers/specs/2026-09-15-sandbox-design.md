# Sandbox

A box of sand under a low sun, with a beach ball in it. The second toy on the
shelf built to the same bar as the caustics pool, and the first built by
asking what the pool is _as a toy_ rather than as a simulation.

## Why this one

The brief was: capture what makes the caustics pool a complete package, not
the water. Read as a toy designer would — the way Cas Holman reads a toy, as
something that is ten percent object and ninety percent the person playing
with it — the pool is a complete package for seven reasons, and none of them
is "the caustics are computed":

1. **It is a place, not a picture.** Worn paint on the floor, stained tiles,
   an est. date. A place has a history, and a history is what makes it
   somewhere rather than something.
2. **It hands you tools, not instructions.** Drag, click, shove. Nothing is
   labelled and nothing tells you what to do. The cursor is a body with
   momentum and a radius, not a lens.
3. **Every act has a consequence you can see, and the consequences travel.**
   Push a toy, it cuts a wake, the wake reaches the duck, the duck heels.
   The chain is the whole game.
4. **The parts play with each other when you are not there.** Wind, drift,
   collisions. It is a companion, not a demo that waits for input.
5. **The loose parts differ.** The ball rolls, the ring heels, the duck heels
   differently and lower. Parts that behave differently invite combination.
6. **The material is honest.** Light is measured from the surface, so the
   picture never contradicts what you did to it.
7. **Nothing is precious.** No goal, no score, no end state, no way to break
   it. Shove the duck off the edge and it comes back off the wall.

The pool gets all seven, and one is weaker than the rest: memory. A wake
fades in seconds. What you did is gone before you have finished admiring it.

Sand is the canonical loose-parts material. Everyone knows what to do with it
inside one second, which clears rubric question 2 without a mechanism ever
being explained; and sand _remembers_. A track stays until something erases
it. That is the one property the pool cannot have, and it is the reason to
build this rather than another tank.

## Rubric

From `docs/lab/TOY-IDEAS.md`.

1. **Subject.** A sandbox at golden hour with a beach ball in it and the box
   floor under the sand. Warm, not impressive.
2. **Legible in three seconds.** Sand, a ball, a shadow. A track appears
   under the cursor before the viewer has thought about it.
3. **Does it fight itself?** The named tension is between drawing fidelity
   and the wind. Ripples need enough transport to form, and transport
   erases tracks. Written down below as a rate, not left to tuning.
4. **Measured quantity.** Three: wind ripples that emerge from a nonlocal
   saltation flux, slope failure at the angle of repose, and cast shadows
   marched across the height field toward the sun.
5. **Loop closure.** The ball reads the slope and rolls; rolling cuts a rut
   and pushes a berm; the berm shadows the wind; the ripples reorganise
   around the rut. Gusts push the ball, so the loop runs unattended.

## The state

One float render target, `RGBA32F`, `NEAREST`, `CLAMP_TO_EDGE`, ping-ponged:

| channel | meaning                                      |
| ------- | -------------------------------------------- |
| `.x`    | sand height above the box floor, world units |
| `.y`    | moisture, 0 dry to 1 freshly turned          |

The domain is `asp` world units wide and 1 tall; cells are square with
`dx = 1 / gridH`. Cell budget is held near 147456 like the pool and the
table, so a portrait lab canvas lands around 302x488.

32-bit is required. A step of saltation moves the bed by parts in 10^5 of
the sand depth, and half-float has thrown that away before it reaches the
texture. NEAREST because float32 filtering is an extension not every driver
has, and the passes only ever read cell centres.

Sand depth starts at 0.03 world units, with a low-amplitude rough seed so
the ripple instability has something to bite on. Roughness is judged in
slope, not height, per the erosion table's lesson: it stays below what one
cell can resolve. The depth is shallow on purpose: dry sand cannot hold a
narrow hole — a pit is at most its radius times the repose slope deep — and
at twice this nobody would ever reach the floor with a fingertip.

## The step

Fixed step, 60 per second, accumulator capped at 3 steps. One pass does all
four things below in order; a CPU mirror in `physics.ts` does the same in
the same order and is the version that gets tested. The box opens on forty
seconds of that wind, run forward across the first eight frames, never on
stamped ripples.

### 1. Saltation — the ripples

Wind carries sand downwind in hops. The flux across a cell face is

```
q(face) = Q · w(face) · max(0, c + β · (h(face − L·d) − h(face)))
```

where `d` is the unit wind direction, `w` the local gust strength, `L` the
hop length in cells, and `h(face)` the mean of the two cells either side.
The nonlocal term is the mechanism: grains dislodged `L` upwind land here,
so the flux here is set by the exposure _there_. Linear stability of this
flux against a perturbation `e^{ikx}` gives growth `Re σ = −Qβk·sin(kL)`,
positive for `kL` in `(π, 2π)` — ripples of wavelength between `L` and
`2L`, fastest near `4L/3`. The flux factor is clamped to a carrying
capacity, which is what separates the two timescales: a steep furrow wall
would otherwise drive the flux up with its slope.

Grains do not all hop the same distance, and that is what selects the
wavelength: the exposure tap is the mean over hop lengths `L−2 … L+2`,
which multiplies the growth by `(1 + 2cos k + 2cos 2k)/5` — positive at the
ripple band and negative across every shorter one. The first version killed
the short bands with creep instead, and creep strong enough to do that
diffuses six cells a minute, which erases a plowed track in the same
minute. There is a test holding the wavelength: from noise, the dominant
one lands inside `(L, 2L)`.

Written in flux form, so it conserves mass by construction: a face flux is
computed once from the same taps by both cells that share it, and each cell
changes by minus the divergence.

**Transport wraps at the edges.** Ripples migrate downwind, which is a mean
transport, and a box with zero-flux walls collects all its sand against the
lee wall within minutes — honest sand behaviour, and useless for a page that
runs for hours. The walls are real for slope failure and creep and for the
light; for the wind the box is a window onto a longer beach. Wind direction
also rotates fully every five minutes, driven by the per-step clock, so the
ripples re-orient — which is most of what the box does on its own.

### 2. Slope failure — the angle of repose

Ground steeper than the repose angle fails and slides, as in the erosion
table but on eight neighbours: each pair exchanges what exceeds
`maxDrop = tan(θ)·dx` (times √2 on the diagonals), written from both sides
with the same magnitude, so it conserves mass in the same pass. Four
neighbours slump a pit into a diamond. The rate per neighbour is 0.12, so
the eight together never ask a cell for more than it holds.

The repose angle depends on moisture. Dry sand stands to about 33°; damp
sand has capillary cohesion and stands near 60°. `tan θ = mix(0.65, 1.7, m)`
where `m` is the mean moisture of the pair. This is what lets a stamped
castle stand, and what makes it crumble as it dries.

### 3. Creep

A small explicit diffusion, Courant number well under 0.25, which keeps
ripples from sharpening to one cell and stops the plow leaving pixel-sharp
walls. Same regulariser the table uses, same reasoning.

### 4. Drying

Moisture decays with a time constant near 40 seconds. Turned sand is dark
because it is damp underneath; it dries pale. A track is therefore dark for a
while and then only relief, which is the history reading in two stages.

## Tools

**Drag — plow.** The cursor is a fingertip of radius 7 cells. Sand under it
is _displaced_, not deleted: the splat pass subtracts a gaussian at the
centre and adds the same volume back as a ring weighted `1 + cos φ` toward
the direction of motion, so nothing lands behind the finger and the next
stamp carries the deposit on — a stroke delivers its sand to where it ends.
Stamped along the drag path so a fast sweep cuts a continuous furrow. The
ring then fails at the repose angle and slumps into a berm, which is the
integrator's answer, not a drawn one. Sand removed at the centre adds
moisture where it was removed.

**Every tool reads the sand under it first.** The finger reads back a
window the size of the fingertip each frame and may lift at most a quarter
of the least sand in it; the bucket reads the window under its moat; the
ball reads under its rut. Without this a tool at the floor removes nothing
(the field clamps at zero) while its ring still lands, and the box makes
sand — measured at 6% of the box in one dig, standing as a damp pyramid.
With it the box conserves to five parts in a million through a session, and
a finger on the bare floor scrapes plastic.

**Click — bucket.** A castle: a cylinder of damp sand with the volume taken
from an annulus around it, so the moat is the bucket's fill. Moisture set to
1 on the turret, so it holds steep, then dries and slumps. A click that lands
on the ball shoves it instead.

**The ball.** A beach ball with real rolling orientation, off the pool's
contact-point law. Each frame it reads a 3x3 window of the field back from
the live framebuffer (probe format cached, degrades to drifting), low-passes
the sample so it has mass, and accelerates down the local slope. Rolling
resistance in sand is high, so it stops in hollows and does not wander. Its
motion stamps a rut with berms under it in proportion to speed, and turned
sand under it is damp. Gusts push it: an inflatable is light, and a strong
gust rolls it. The cursor collides with it and it picks up cursor speed.

## Display

Top-down, orthographic. Everything below is a projection of the one field.

- **Normal** from the central-difference gradient in world units, so slopes
  are physical and repose reads as the angle it is.
- **Cast shadows** by marching the height field toward the sun: twenty-odd
  steps along the sun's ground direction, ray rising at `tan(elev)` per
  world unit, penumbra from the minimum clearance ratio. This is the
  "caustic" of sand — the thing everyone paints as AO, computed.
- **Ball shadow** by ray-sphere test from each pixel's surface point toward
  the sun, so it stretches at low elevation and lands on the sand where
  the sand actually is.
- **Wall shadow**: the box has a rim, and the sun-side rim throws a band
  across the sand whose width depends on elevation. The rim itself is out
  of frame.
- **Sand**: warm cream albedo darkened by moisture, sparse specular glints
  from a per-cell random facet, sky-coloured fill in the shadows. Ripple
  crests are not tinted; whatever they look like is the shading.
- **The floor**: where sand height falls under a few thousandths, the box
  floor shows through — dark plastic with the mark printed on it. Dig and
  you find it.

Palettes are light, not time of day, because elevation is its own control:
Golden Hour (default; sun held well over the sky so flat sand stays warm —
matched, they averaged to grey), Overcast (a dim sun, a bright neutral sky,
no glints, soft shadows), Blue Hour (a dusk glow off the rim, the sky doing
the work). Default elevation 18°.

## Controls

`mode` (interactive / ambient), `wind` (gust strength), `hop` (hop length
`L`, cells), `repose` (dry angle, degrees), `dry` (drying time, seconds),
`sun` (elevation, degrees), `dig` (finger depth), `ball` (in the box / put
away), `tint`. All `debug`.

## The named tension

Ripples want transport; tracks want stillness. The number is the erasure
rate: how long a plowed furrow stays visible under wind. Measured on a
64-cell patch of the production grid under a steady, full-strength cross
wind — the worst case for a track, since a trench across the wind is a sand
trap: ripples reach visible amplitude in under 40 s, and a furrow keeps
half its depth for a minute and half its volume for three. Under the real
wind, which gusts at about half strength on average and rotates, both last
about twice as long. `Q` was halved once after watching it: at twice the
default the ripples were eating a track inside half a minute. If the two
cannot both be had, ripples give, not memory — memory is why this exists.
`physics.test.ts` holds both ends.

## Files

```
packages/flateralus-pixi-animations/src/sandbox/
  manifest.ts         controls
  physics.ts          CPU mirror of the step: saltation, repose, creep, drying
  physics.test.ts     conservation, ripple wavelength, repose vs moisture, stability
  shaders.ts          STEP_FS, SPLAT_FS, DISPLAY_FS, uniforms, palettes
  sandboxAnimation.ts plumbing, ball physics, readback
  index.ts
packages/flateralus-pixi-animations/src/shared/mat3.ts
                      column-major mat3 helpers, moved out of the pool
```

Registered on the toys shelf in the lab registry.

## Out of scope

Two balls, a shovel, rain, wet sand from a tide, footprints. Any of them is a
day's work later and none of them is what makes the box a toy.
