# Four-Way Stop

A Pittsburgh corner at night in the rain, with no traffic light and a cop in
the middle. Two streams of cars want the same crossing. You are the cop.

The first _negotiate_ toy on the shelf, and the first built after the rule in
[`docs/lab/TOY-IDEAS.md`](../../lab/TOY-IDEAS.md) that a new toy carries the
pool's qualities and none of its anatomy.

## Why this one

The toys on the shelf are almost all one verb: poke a medium and watch it
settle. The pool, the sandbox, the jelly tank, the erosion table. That verb
decides everything downstream — the cursor is a body, time is seconds, the
object is a field with a history — which is why every toy built from it comes
out as a sibling however the material changes.

A negotiate toy is a different animal by construction: two systems with
conflicting wants, the player as go-between, a cursor that tips a balance,
and time that is a standoff. None of that can be built on a height field.

Candidates considered: two cats and one sunbeam (warmest, strongest history,
weakest go-between), one door and two crowds (social-force model, desire
paths, cold subject), and this one. The four-way stop won because the
cursor's job is unmistakable in the first second, and the negotiation is the
most legible: everyone has stood at one.

**Rejected sibling.** Two colonies spreading across a field with a fence
drawn between them. It is the pool with a fence instead of a finger.

## The seven qualities, carried over

1. **A place.** A named corner, wet asphalt, worn crosswalk paint, row-house
   silhouettes, a stop sign on each corner.
2. **Tools, not instructions.** Hover, click. The cop's pose is the only
   feedback; nothing is labelled.
3. **Consequences that travel.** A driver forced into a gap makes the
   crossing car brake, and that braking wave runs back up the other queue.
4. **Parts that play alone.** With no cop the four-way-stop rule and its
   impatience run the corner, and the pressure swings between streets over
   minutes.
5. **Differing parts.** Cars, a bus that blocks the box if waved late, a
   cyclist who fits gaps nobody else can.
6. **Honest material.** Wet asphalt is a mirror, so every light's reflection
   is the light mirrored through the road plane, not a painted glow.
7. **Nothing precious.** The worst outcome is gridlock, and it clears.

## Rubric

1. **Subject.** A rainy corner at night with headlights queued up it. Warm.
2. **Legible in three seconds.** Cars, a crossing, a cop. Hover an approach
   and its queue stops with a raised hand before the viewer has thought.
3. **Fights itself?** Realism against watchability, named below.
4. **Measured quantity.** Two: car-following by the Intelligent Driver Model,
   whose braking waves and phantom jams are emergent; and reflections off
   the road plane, mirrored geometry rather than sprites.
5. **Loop closure.** Drivers read the crossing stream and each other; the
   cop's hand changes what they read; their response changes what the next
   driver reads. The loop runs with nobody there.

## The traffic

### Geometry

Four approaches, north, south, east, west, each one lane in and one lane
out, meeting in a square box. Each approach is a 1-D lane of length `L`
ending at its stop line; the box is a set of paths through it, straight,
right and left, each a 1-D curve of known length. A vehicle's state is
`(path, s, v)`: which curve it is on, distance along it, speed. Lanes are
1-D on purpose: the traffic is a queueing problem and the geometry only
matters at the crossing.

### Car-following

Every vehicle advances by the Intelligent Driver Model (Treiber, Hennecke,
Helbing 2000):

```
s*  = s0 + v·T + v·Δv / (2·sqrt(a·b))
dv  = a · (1 − (v/v0)^4 − (s*/gap)^2)
```

where `gap` is the bumper-to-bumper distance to the leader, `Δv` the
closing speed, `s0` the jam gap, `T` the desired headway, `a` the comfortable
acceleration and `b` the comfortable braking. Nothing is scripted: a queue
compresses, a braking wave travels backward at the speed the model gives it,
and a jam can appear on a free lane from one driver's hesitation. The leader
is whichever vehicle is next along the same lane, or, at the stop line, a
virtual stopped vehicle when the driver does not have the box.

Vehicle types differ in the parameters, not in the law: a bus has a long
body, low `a`, low `v0`; a cyclist has a short body, low `v0`, and a tiny
`s0`, which is what lets it fill gaps nobody else can.

### The negotiation

A driver at the stop line who has stopped may enter the box when the
crossing streams present a gap larger than their **critical gap** `tc`,
measured as the time until the nearest crossing vehicle reaches the
conflict point. Gap acceptance is the standard unsignalised-intersection
model; the toy's addition is that patience runs out:

```
tc(wait) = tc0 · exp(−wait / τ)     floored at tcMin
```

A driver who has waited long enough accepts a gap they would have refused
when fresh, and forces it. The crossing vehicle sees a leader appear in its
path and brakes by the IDM, hard if the gap was small — that is the
consequence travelling, and it is where the phantom jams come from.

With no cop, the tie-break is the four-way-stop rule: first to stop goes
first; simultaneous, the right goes first; a left yields to oncoming. The
first left-turner after a stream is released does not yield — the
Pittsburgh left — which is a `pittsburghLeft` flag on that one driver and
nothing else.

**Demand drifts.** Arrival rate on each street is a slow noise with a
per-step clock, so over minutes the pressure swings from one street to the
other and the corner has weather. This is the toy's wind.

### The cop

The cop stands in the box. Three gestures, all by the cursor, none labelled:

- **Hover an approach: held.** The stop line becomes a wall (virtual stopped
  leader with no gap acceptance) and the cop's arm goes up toward it.
- **Click an approach: waved.** Its drivers enter without gap acceptance
  until the cursor leaves the approach; the cop's arm sweeps. The crossing
  streams are held for as long as the wave lasts.
- **Click the box: clear it.** Vehicles in the box get priority and every
  approach is held until it is empty; the cop's arms go out.

Cursor off the stage and the cop steps to the corner, and the four-way-stop
rule takes over. That is ambient mode and it is alive on its own.

Waving a bus through late — when the far side is already backed into the
box — parks the bus across the crossing, and nothing moves until the far
side drains. That is the one honest way to gridlock the corner, and
clearing the box gets it out.

### Gridlock

A vehicle stopped in the box with both exits blocked is gridlock. It is not
prevented: it is the failure state the negotiation is about. It resolves
when the cop clears the box, or on its own, because a driver's patience in
the box decays the same way and eventually they squeeze through whatever
gap exists. No score, no end.

## The picture

A fixed camera on a corner mast, three-quarter, looking down into the
crossing with the north approach receding up the frame. A single projection
matrix; every point on the road plane and every vehicle corner goes through
it. PIXI scene graph, not a shader.

- **Road.** Wet asphalt as a dark plane with a broad specular lobe under the
  sky, painted once as a texture: crosswalk bars worn along the wheel paths,
  a stop line per approach, patched asphalt.
- **Vehicles.** Boxes with a cab step, projected through the camera and
  painted in depth order. Body colour from a short palette of night cars,
  glass darker. Headlights are additive cones on the road plane ahead;
  taillights and brake lights are additive discs, brighter when braking
  (the IDM gives the deceleration, so brake lights are honest).
- **Reflections.** Every light mirrored through the road plane and projected
  again, drawn additively with a vertical smear. The reflection is the
  light's own geometry; nothing is painted under a car.
- **Rain.** Streaks in the near field, and the reason the road reflects.
- **The cop.** A silhouette with a lit vest and one arm that poses: up,
  sweeping, out. Drawn as a few projected segments.
- **Backdrop.** Row-house silhouettes with a few lit windows, a street lamp
  on each corner with a cone of drizzle in it, stop signs.

### History

- Tyre tracks cut the wet film where wheels pass, drawn as darker lines on
  the road that rain refills over about a minute.
- A hard brake (deceleration past `b`) leaves a skid mark that lasts the
  session.
- The crosswalk paint is worn along the wheel paths from the start.

## Controls

`mode` (interactive / ambient), `demand` (arrival rate), `patience` (`τ`),
`headway` (`T`), `bus` (on / off), `cyclists` (on / off), `rain` (0 to 1),
`tint` (Night, Sodium, Dawn). All `debug`.

## The named tension

Realism against watchability. A real four-way stop serves about one vehicle
every four seconds per approach, and real patience is tens of seconds; a
person managing that would have nothing to do. Headway, patience and demand
are compressed so a standoff resolves in a few seconds and a queue builds in
about thirty. The IDM's shape survives compression — the waves still travel
backward, the jams still appear from nothing — because only its constants
move. The measure: with the cop absent and default demand, no approach's
longest wait exceeds twenty seconds and no approach starves; with a bus
waved late, the box gridlocks, and once the far side reopens it clears
within fifteen seconds while the cop holds the lines.

**Amended after building.** The first draft of that last clause said "within
fifteen seconds of a clear command". Measured, a clear cannot do that: the
bus is parked because the exit lane ahead of it is physically full, and no
gesture moves a queue that has nowhere to go. What a clear does is hold every
line so that the moment the far side moves, the box drains rather than
refills — measured at about ten seconds after the light down the block
changes. The measure now says what the corner can honestly deliver.

## Files

```
packages/flateralus-pixi-animations/src/four-way-stop/
  manifest.ts         controls
  traffic.ts          pure core: lanes, IDM, gap acceptance, the cop, demand
  traffic.test.ts     no lane collisions; braking wave travels backward;
                      patience forces a gap; no starvation without a cop;
                      a late bus gridlocks and a clear resolves it
  camera.ts           the projection, road-plane mirror
  scene.ts            PIXI drawing: road texture, vehicles, lights,
                      reflections, cop, backdrop, history
  fourWayStopAnimation.ts
  index.ts
```

Registered on the toys shelf in the lab registry and its allowlist test.

## Out of scope

Pedestrians at the crosswalk (the obvious next part: they tip every
negotiation), a second intersection, sound, daylight.
