---
name: simulating-not-decorating
description: Use when building or fixing a generative scene that runs on its own — canvas, WebGL, GLSL, particle system, ambient or hero background, water, fire, smoke, flocking, growth, ripples, caustics. Use when such a scene reads as fake, looped, flat, or like separate layers sharing a canvas. Use especially when reaching for coprime frequencies, another desynced noise octave, or a breathing alpha term to hide a visible period. Not for UI motion — for component transitions, modals, gestures and scroll effects use the animate skill instead.
---

# Simulating, Not Decorating

## Overview

A generative scene feels alive when everything visible is a consequence of **one
simulated state**. It feels fake when it is several functions of time sharing a
canvas.

This is not about fidelity. Sophisticated decoration still reads as fake: you can
raymarch real refraction, do Beer-Lambert absorption and chromatic dispersion, and
still produce something nobody believes — because the surface is a sum of sines and
the caustics are painted.

**Core move: integrate state, derive everything from it, let input write into it.**

## When NOT to use

UI motion — modals, transitions, gestures, scroll effects, component feel. Use
**animate**. A dropdown does not need a wave equation. This skill is for a scene
that runs continuously and is its own subject.

## The switch signal

**If you are adding a term whose only job is to hide a period, stop.** Coprime
frequencies, one more desynced octave, "breathing" alpha, a slow large-scale
modulation so it "never looks like a loop."

That is not a tuning problem, and the next layer will not fix it. It is the scene
telling you it has no state. Every term you add to hide the loop is cost you pay
forever, on every frame, to conceal a structural choice you can simply reverse.

## The recipe

Five parts, in this order. Each is something the scene **has**.

### 1. A state field you integrate

The scene owns a variable that persists across frames and is stepped from its own
previous value — not evaluated from the clock.

```glsl
// The 2D wave equation. Interference, reflection off walls and dispersion
// all fall out of this for free; none of them are authored.
float lap = L + R + B + T - 4.0 * c.x;
float nh  = (2.0 * c.x - c.y + uC2 * lap) * uDamp;   // c.y is h at t-1
```

**The test:** delete `uTime` from the update step. Does the scene still evolve?
If no, you have decoration.

A sum of sines has a period, so it needs hiding. An integrated field has a
_history_, so it never repeats and never needs hiding.

### 2. One source of truth

Everything visible is a different projection of that one field: the refraction of
what is behind it, the light, the reflections, which way objects drift, which way
they tilt, where shadows land.

Layers that each run their own loop look busy and read flat, because nothing in
them is causally connected. Coherence is not a rendering property. It is what a
single root cause looks like.

### 3. A measured phenomenon, not a painted lookalike

Find the quantity that _defines_ the effect and compute it.

Caustics are the classic case. Everyone paints them — scrolling noise, iterated
sine folds, `pow()`'d worley. But a caustic _is_ the collapse of the ray mapping's
determinant, so measure it: build the refraction map, take its Jacobian, and
brighten where it converges.

```glsl
vec2 f0 = refrUV(uv), fx = refrUV(uv + vec2(e,0)), fy = refrUV(uv + vec2(0,e));
vec2 dx = (fx-f0)/e, dy = (fy-f0)/e;
float J = abs(dx.x*dy.y - dx.y*dy.x);      // rays converging => J -> 0
float focus = clamp(1.0/max(J,0.06) - 0.72, 0.0, 4.0);
```

Three extra taps. The payoff is that the bright lines are exactly where the
geometry says, lensing _ahead_ of the ripple — and they respond to disturbance
with the right latency, because they are a second derivative of the same state.

Painted light is decoupled from the thing it supposedly comes from. That decoupling
is the tell, not the texture quality.

**What feeds it matters more than how hard you push.** Computed light comes from
the field's _curvature_, and curvature goes as k² — halve the wavelength and you
get roughly four times the bending for the same amplitude. So when the effect
reads as weak, the first lever is the spatial frequency of whatever disturbs the
field, not its strength. The response is steep and easy to overshoot: on one
~300-cell grid an 11-cell wavelength landed, 7 boiled, and 21 vanished.

### 4. Input that writes into the field

**The test:** can the user change the state, or only the view? Pointer-driven
camera parallax is a view change. Nothing was touched.

Make the cursor a body in the medium: it has momentum, a radius, restitution, and
it leaves a wake. Stamp interpolated samples _along_ the drag path so a fast sweep
cuts a continuous line rather than a dotted one — continuous contact, not discrete
events.

### 5. Objects that read the field and write back

Close the loop. Objects sample the state to decide how to move, and their motion
re-enters the state as a new disturbance.

```ts
// A floating body accelerates down the local surface slope. This is the
// correct law, and it is why a passing swell nudges a toy and then stalls —
// instead of the sinusoidal bob everyone writes.
T.vx += -T.gx * KF * dt;
```

A scene where element A affects B and B affects A is categorically different from
one where both are animated. In this repo exactly one of 33 animations closes that
loop, and it is the one people single out.

## Then it needs

- **Mass.** Low-pass the field probe (`h = h*0.8 + sample*0.2`). Objects should
  follow the swell and ignore the chop. Unfiltered sampling chatters and reads
  weightless.
- **Correct rotation.** If it rolls, give it a real orientation matrix with
  contact-point angular velocity and a little slip. A ball that translates without
  rolling correctly reads as a sticker sliding on glass. Nobody notices
  consciously; everybody notices.
- **A history.** Model wear in stages — bleaching, then flaking, then a ghost stain
  where paint is gone. Clean reads as a render; worn reads as a place.
- **A floor.** Never dead flat. A faint ambient swell means there is no moment
  where it stops being water.
- **Warmth over impressiveness.** Point the machinery at something with a subject.
  The same shader work aimed at a pool with toys in it beats a tech demo.

## Gotchas

**Fixed timestep is mandatory.** The wave stencil is only conditionally stable — a
variable `dt` detonates it. Accumulate, step at a fixed rate, and cap the
accumulator so a stall cannot spiral.

```ts
this.acc = Math.min(this.acc + dt, 3 / 90); // cap: 3 steps, never a spiral
const STEP = 1 / 90;
while (this.acc >= STEP) {
  this.acc -= STEP;
  step();
}
```

**Any clock driving the forcing advances per step, never per frame.** Hand every
substep in a frame the same wall-clock `t` and one frozen forcing pattern gets
applied one to three times in a row — so the effect's strength becomes a function
of the display refresh rate, and a pre-roll stands a standing wave up instead of
building chop. Keep a counter incremented inside the step itself, and wrap it:
hashes built on `sin(dot(...))` degrade at large coordinates and an ambient page
runs for hours. Wrapping is safe precisely because this is _forcing_ — a seam in
the driver is just a change of gust, and the field carries its own history
through it.

**Constants inherit the units of the expression they sit in.** In
`w = uv * 27.0 - t * 0.15`, that `0.15` is in _noise cells_, not uv, because it
is subtracted after the scale. Convert every tuning constant into the
simulation's own unit — grid cells, cells per step — before reasoning about it.
Getting this wrong is quiet: the number still tunes, the scene still improves,
and the explanation you attach to it is simply false.

**Additive light needs luminance headroom.** Computed light is added
(`col += sun * caust`), so its legibility is set by how dark the surface under it
is. A near-white floor leaves nowhere to climb and the effect vanishes; a dark
floor makes the same code glow. Check every palette with the effect running — a
palette that kills the thing you computed is worse than one that never had it.

**Your default state must show the best thing.** Guard ambient activity behind an
interaction mode and the scene loads dead flat, showing none of what makes it good
until someone happens to drag across it. Load the state with something already
happening.

Prime it by running the _process_ forward, not by injecting impulses. Seeded
drops ring as big coherent circles, and coherent circles focus into blown-out
blobs instead of filigree — run whatever normally drives the field and let it
build. Re-prime whenever the state is cleared, too: a resize drops the viewer
back onto a mirror otherwise.

**Reading state back from the GPU is fine.** A small `readPixels` per object per
frame is a sync point, and it is what closes the loop. Probe the format once and
degrade gracefully if the driver refuses.

## When you tune it

**A change that works is not evidence for the story you told about why it works.**
Move the frequency and the drift together, watch the scene improve, and you will
credit whichever one you had in mind. Change one thing at a time, or say plainly
that you did not isolate it. The cost is not the tuning — the tuning is fine —
it is that a false explanation ends up in a comment, and then in someone's head.

Convert your constants into the simulation's units and check the claim before you
write it down. "The gusts outran the waves" is a satisfying sentence that can be
off by 14x.

## Common mistakes

| Instead of                                          | Do                                                 |
| --------------------------------------------------- | -------------------------------------------------- |
| Another desynced octave to hide the loop            | Integrate state — it has no loop                   |
| Painting caustics with noise or sine folds          | Measure the Jacobian of the refraction map         |
| `Math.sin(t)` bob                                   | Accelerate down the local slope                    |
| Pointer drives camera parallax                      | Pointer is a body that disturbs the medium         |
| Discrete splat per pointer event                    | Interpolate samples along the drag path            |
| Layers each animating themselves                    | One field; everything is a projection of it        |
| Sampling the field raw                              | Low-pass it, so objects have mass                  |
| Turning up the force when computed light reads weak | Raise the spatial frequency — curvature goes as k² |
| Seeding the opening state with impulses             | Run the real driver forward to build it            |
| Wall-clock `t` into the forcing                     | A counter advanced per simulation step             |
| Variable `dt` into the integrator                   | Fixed step with a capped accumulator               |

## Reference

Implementation specifics for this repo — ping-pong plumbing, the display-pass
skeleton, GPU→CPU probes, and which of the 33 animations already do this — are in
[glsl-and-flateralus.md](glsl-and-flateralus.md). Read it when implementing, not
when deciding.

Worked example: `packages/flateralus-pixi-animations/src/caustics-pool/`.
