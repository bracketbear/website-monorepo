# Type effects

A tenth shelf in the Animation Lab: GLSL effects whose subject is a line of
copy. Four of them, for section headings and for louder proclamations, each
taking whatever phrase is typed into it.

The shelf exists because the plumbing already does. `phraseMask()` in
`shared/shader-harness.ts` sets arbitrary copy in Anton and breaks it to a
target aspect; only `ink-dissolve` uses it, behind a toggle. Every other
effect that touches type is welded to the hero headline or the mark.

## Why these four

A heading is something a person reads, so the first question is the
`animate` skill's gate rather than the toy rubric's: should this move at all,
and for how long? Type in perpetual motion is hostile to reading. That splits
the shelf in two, and each effect declares which side it is on.

- **Arrival.** Plays as the heading enters, then comes to rest as crisp type.
  Pointer and click can disturb it again. Usable on a real section heading.
- **Proclamation.** Runs for as long as it has something to do. For a hero,
  a statement block, or a talk slide.

An arrival only qualifies if it rests **by physics** — springs damp, vapour is
eaten, fuel runs out. An effect that a timer fades to a stop is decoration
with an envelope on it, and the `simulating-not-decorating` test (delete
`uTime` from the step; does it still evolve?) catches it.

Territory already taken, and avoided: noise distortion (`heat-haze`),
cursor-as-light on a material (`foil-statement`, `sdf-forge`), fluid dye
(`ink-dissolve`), reaction–diffusion (`rd-vat`), neon (`logo-resolve`), the
CRT chain (`holo-mark`).

| Effect       | Kind         | Verb                  | Rests because      | Cost             |
| ------------ | ------------ | --------------------- | ------------------ | ---------------- |
| Off Register | arrival      | knock out of register | springs damp       | one pass, sleeps |
| Aspic        | arrival      | poke                  | gel damps          | tiny sim, sleeps |
| Frost Line   | arrival      | melt                  | vapour is depleted | mid sim          |
| Slow Burn    | proclamation | ignite                | fuel is consumed   | mid sim          |

Frost Line and Slow Burn take their physics from the Frost and Ember entries
in [`docs/lab/TOY-IDEAS.md`](../../lab/TOY-IDEAS.md). Those entries were
strong on rubric questions 2 and 4 and had no answer to question 1; the copy
is the subject they were missing.

**Rejected siblings.** "Heat-haze with springs" — Aspic is only worth building
if the gel is a _body_, with a pinned base and waves that carry a poke from
one end of a letter to the other; a displacement field that merely wobbles in
place is the haze again. "The pool with type on the floor" — type under a ripple tank
is `caustics-pool`'s anatomy and was not considered further.

## The shelf

`sections.ts` gains a `'type'` key, labelled `10 · Type`. Ground is `PAL.ink`
and the section is dark. Slow Burn paints its own paper over the whole stage,
so the ground never shows behind it.

Shared by all four:

- **`phrase`** — `text` control, `maxLength: 64`, set through `phraseMask`.
  A change re-seeds the effect, which replays the arrival. `phraseMask`
  returns null until Anton loads; every effect keeps asking rather than
  caching the null, as `ink-dissolve` does. The rasterizer now measures the
  face's cap height instead of assuming 0.72 em — Anton's caps are taller,
  and the first line was losing its top — and records each canvas's size,
  baselines and line extents (`phraseMetricsOf`) for effects that need to
  know where the type stands.
- **`textScale`**, **`grain`**, and (where the effect has two grounds)
  **`stage`**, matching the existing shader effects.
- **Reduced motion.** The framework has none today. These four ship with it:
  `shared/reduced-motion.ts` exposes `prefersReducedMotion()`, read at init
  and on phrase change. Under it an arrival opens in its settled state (plates
  in register, gel at rest, frost pre-rolled to full, sheet unburned with
  auto-ignite off) and pointer input is scaled to 0.35. Retrofitting the other
  38 animations is out of scope.
- **`shared/mask-grid.ts`** — `maskToGrid(mask, gw, gh, scale)` draws a mask
  canvas letterboxed onto a sim grid and returns its alpha as a
  `Float32Array`. Three of the four need it. `rd-vat` does the same thing
  inline for the mark and is left alone.

Default phrases are real headings from the site copy, not new lines:
`LEAVE A GREAT IMPRESSION.`, `SHIPPING NOW`, `THE WORK`, `DELETE ON SIGHT`.

## Off Register

The heading printed in three passes that have not quite lined up.

**Rubric.** Subject: a misprinted poster — everyone has held one. Legible at
once. Measured: the moiré. Tension: below.

**State.** Three plates, each `(x, y, θ)` and its velocities, on the CPU. One
spring–damper per plate toward its rest pose, semi-implicit Euler at a fixed
1/120 s with the accumulator capped at 4 steps.

All plates share `k = 361 kg/s²` and `c = 13.3 kg/s` and differ in mass:
1, 1.6, 2.4. Settling to 2 % takes `8m/c`, so they land at **0.60 s, 0.96 s
and 1.44 s** — one after another, each overshooting once or twice
(ζ = 0.35, 0.28, 0.23). Angular motion uses the same constants scaled by a
moment of inertia proportional to mass.

**Plates.** Two halftone screens — orange at 45°, sun at 45° plus a `skew` of
5° — and an ink keyline on top. The screens print the type as a tint: dot
radius follows a low-passed mask so edges break into dots rather than
aliasing. _As built, not as first specified:_ the first cut had a solid key
over 45°/75° screens, and it read as a drop shadow — the solid key hid the
plates, and 30° of separation makes a moiré too fine to see at heading size.
A keyline shows the plates, and screens a few degrees apart beat at the size
of a letter.

**Rest pose.** Not zero. With perfect register the colour plates hide under
the key and the effect has no resting face. The `register` control sets the
rest offset, default ~3 px of deliberate riso fringe; 0 is available.

**Measured.** The overprint is a real multiply of two dot screens at their
actual angles. When a knock rotates a plate the beat bands sweep across the
letters at the frequency the angle difference dictates. Nothing draws them.

**Input.** The pointer is a hand on the whole stack: a viscous coupling toward
its velocity, folded into the same force as the spring so the held position
carries no mass-dependent bias. Mass does not change how far a plate is pulled
(a steady drag holds every plate at grip·v/K); it changes _when_ — the light
plate answers first and the heavy one lags, so the stack is pulled apart in
time. A click knocks all three with random linear and angular impulses.

**Rest.** When every plate's kinetic + potential energy is under ε and the
palette, controls and stage size are unchanged since the last draw,
`onUpdate` returns before touching GL. A resting heading costs nothing.

**Shape.** Extends `HarnessShaderAnimation`; one fragment pass.

**Tension.** Moiré wants fine screens; legibility at heading size wants coarse
ones. Screen pitch is set in em, not px — default 0.045 em — so it scales with
the type, and the key plate guarantees the letterform whatever the screens do.

## Aspic

The heading turned out of a jelly mould: every letter its own body of gel,
standing on a plate.

**Rubric.** Subject: jellies on a plate. Legible at once. Measured: strain.
Loop: a poke at one end of a letter reaches the other end; a poke at one
letter does not reach the next through the gel — it reaches it through the
plate, later and smaller, because the plate is a body that the gel pushes
and that pushes the gel back.

**State.** `PingPong`, RGBA**32**F: `xy` displacement `u`, `zw` velocity `v`,
on a grid 200 cells across the type block plus a margin. A second texture
carries the domain: each letterform grown by five cells is a _hull_, and the
hull cells within a row and a half of the line's baseline (or below it, in
the margin) are _pinned_. Outside the hulls is air.

    v += (c² ∇²u − ω₀² u − γ v + ν ∇²v) dt      u += v dt

A neighbour outside the hull, or on another plate, reads as the cell itself
— zero traction to first order, a free edge — so each letter is its own
elastic body and two that do not touch cannot feel each other through the
gel; the mirror asserts a poke crosses a letter and arrives at the next as
exactly zero with the plate nailed down. The margin exists so a lean carries
the silhouette into cells that hold displacement: the display reads the
letter at the material point under each pixel, `m = sp − u(sp)`, and a pixel
just outside the undeformed letter needs a `u` to read.

**Subject and flavour.** A `subject` select puts either the phrase or the
mark on the plate: the mark is one jelly on one plate, standing on its
bottom edge with the whole of its height for a cap, and lands as its two
halves, which is what the column gap between them makes of it. The fall is
capped at sixty cells so a subject whose cap is its whole height does not
arrive at a speed that throws its plate. A `flavour` select colours the gel
— amber and clear are made of the palette and follow the theme; strawberry,
lime, lemon, grape and blue raspberry are what the packet says — and is
decoupled from `stage`, which now only picks the ground.

**The plate.** Anton sets lines touching, so the hull margins of two lines
overlap and a row on a baseline holds the foot of one line and the top of
the next; the domain's alpha carries which plate each cell stands on (ink
by the cap band it is in, margin by its nearest ink), and that index is
what makes the free edge between lines. Each plate is a rigid body on a
soft mat — slide, dip and tilt, with a mass of three gel cells per cell it
carries — and the spring `ω₀²(u − p)` is now relative to the plate's pose
`p` at the cell: physically it is the jelly's contact with the plate under
its whole face, so its far end is on the plate and it pulls the plate back.
The field is kept _relative to each cell's own plate_: pinned cells are
zero, and what a plate gains in rate each step enters its free cells as the
fictitious force of a moving frame (a rigid pose is a linear field, so the
stencil cannot tell). This is what keeps the field small and continuous
across the seam between two lines — a field that held each plate's absolute
motion would, when the display samples it between cells, blend two poses
into a displacement neither body has, and that showed up as fragments the
size of the difference between the poses right after a thump. A reduction
pass (`PingPong.reduce`, one column per fragment, one row per plate) sums
the traction at the feet and the spring's reaction over the free cells, and
the CPU reads it back once a frame, holds it over that frame's steps and
integrates the plates. Without a readable float target the plates still take
the landings and spring home; they just cannot be pushed. Energy of gel plus
plates is non-increasing in the mirror. Plate mass sets the character: at
three, the sway on a loose plate runs within 15 % of its nailed pitch; the
`plate` control scales it.

_First built as one slab with the type inside it_, which was the spec's
original shape. It read as a tray. The letters as the bodies are the
different animal: the material is the type. Kelvin–Voigt viscosity `ν∇²v`
takes the grid-scale ringing out and leaves the sway alone; 32-bit state
because half floats stripe an integrator (see `PingPong.fullPrecision`).

**Arrival.** The letters land one at a time, 55 ms apart, left to right and
line by line, each falling for a quarter second from nine tenths of a cap
height, its shadow darkening as it comes. The letters are found as runs of
ink columns on the mask at its own resolution (Anton sets them closer than a
cell) and mapped back to cells; at the landing step every free cell of the
run starts moving down in proportion to its height above its foot, with a
lean, and the momentum the pinned foot absorbed — the difference between the
impact speed and what the gel keeps — goes into the plate as an impulse. So
each landing thumps the plate, and the letters already standing shiver;
twelve landings in a row rock the line. The fall itself is kinematic and
drawn by the display from the step counter; the sim takes over at contact.
A letter on its way down is drawn in front of one that has landed.

**Display.** A raymarch of a tableau, in framebuffer px: every line stands
on its own oval platter on one table, the last line in front and each
earlier one a platter further back, seen from 16° above through a 28° lens
at a distance where one world px is one screen px at the target. A jelly
is its line's ink extruded to 0.16 of a cap with edges rounded to 0.3 of
that depth. The ink is a 16-bit SDF built at seed, one layer per line,
stacked in one texture and padded with air: lines can be set touching, and
a pixel on the shared row goes to the line whose settled ink is nearer, or
to neither when both are within a couple of pixels — the lines stand on
different platters and have no business touching in depth. The point being
tested has the plate's pose undone as a rigid transform, then the elastic
residual read from the field: the same first-order material point as the 2D
version, inside a march, and one that never carries a letter past the hull
its field lives in. A ray refracts in, runs to where it comes out, and what
it sees behind (platter, table, the sunset at the horizon) is absorbed over
that length toward the flavour's deep colour, with a little extinction the
same in every channel; thin edges pale, thick strokes deep. Strain still
sets density; one key light, Fresnel, a soft shadow marched toward the
light. The pointer is unprojected onto the plane of the line whose band it
crosses. The march steps 0.7 of the distance (a displaced field's gradient
runs to one plus the strain), a ray that stalls within a couple of pixels
of a surface counts as having hit it (a letter's top, skimmed from a little
above, is where that happens), and silhouettes are softened from the ray's
closest approach, taken only from exact distances and never during the
arrival.

**Input.** The pointer is a finger with a radius: inside it, `v` is dragged
toward pointer velocity, stamped along the path. A click is a flick impulse.

**Rest.** Analytic: `2 ln(1/ε)/γ ≈ 2.1 s` after the last input, stop stepping
and stop drawing. No readback.

**Tension.** Wobble wants low damping; a heading wants to be read. The 1.2 s
ring is the compromise and is asserted in the mirror test, along with the
fundamental landing in 2.5–3.5 Hz.

## Frost Line

The heading freezes onto a cold pane.

**Rubric.** Subject: a frosted window. Legible at once; a fingertip melting it
needs no explanation. Measured: the feather shape.

**State.** `PingPong`, RGBA32F at ~70k cells: `x` ice, `y` water (−1 outside
the letter, so the sim carries its own mask), `z` freeze age, `w` warmth.
Fewer cells than first specified, because a cell is then about three pixels
and a feather a few dozen cells long is long enough on screen to be seen as
one. There is no separate boundary-mass channel: a receptive cell simply
keeps what reaches it.

**Model.** Reiter-style: vapour diffuses through unfrozen cells; a cell next
to ice keeps what reaches it and freezes past a threshold. Tips reach further
into the vapour, collect faster and run away, and starve their neighbours —
Mullins–Sekerka from depletion, not a drawn branch. Six-fold habit comes from
the hex lattice (offset rows) rather than from a term. Diffusion is written as
pairwise flux so water is conserved exactly, and the tests audit it.

**Seeding.** Sparse: one site per ~36 cells of edge. Nucleate every edge cell
and the front fingers too — a flat front is unstable — but into a short even
fur, every strand starving the next before any gets anywhere; measured, none
of its ice gets further than eight cells in. Scattered sites have room to
become feathers that run to the middle of the stroke, and the test asserts
that share of deep ice rather than a perimeter ratio, which turned out not to
separate the two.

**Tension — the one that matters.** Feathers need starvation, and starved
feathers leave gaps; legibility needs the letter filled. One vapour density
cannot serve both. Two stages:

1. **Feather**, ~2–3 s: closed vapour budget, fast dendrites to depletion.
2. **Sinter**, to ~6 s: a small uniform humidity feed brings the fill to
   **≥ 88 %** of the glyph area.

The feed goes into the _vapour_, everywhere, and not onto the ice. Fed to
receptive cells — Reiter's own γ — it thickens every arm from the first step
and the crystals come out as fat sector plates. Fed to the vapour it is
negligible while the letter is rich, so growth stays diffusion-limited and
dendritic, and only takes over after depletion, when it pools in the gaps and
deposits evenly on whatever is nearest. One model, two regimes, no switch.

The display shades by age and thickness, so the feather skeleton stays
visible as bright ridges inside a letter that now reads solid.

**Input.** A warm fingertip, stamped along the drag path. Melting returns ice
to vapour in place, but most of the meltwater leaves — off the glass, into the
room — so the patch is left fogged at the letter's starting density. It has to
be: kept in place, every melted cell holds a full cell's worth of water and
the patch flash-freezes back from its rim as a featureless slab. Fogged, it
regrows the way the letter grew, as a second generation of smaller feathers.
The water that left is booked, so the conservation audit still closes. A
click is a palm: a larger melt.

**Arrival.** The growth is the arrival; no pre-roll except under reduced
motion, where the sim is run forward to full before the first draw.

**Display.** Thickness → normal → a fixed key light for sparkle, a faint
refraction of the ground, cream-white on ink. Old ice bleaches.

Fixed step at 120 Hz, accumulator capped at 3.

## Slow Burn

The proclamation printed on a sheet of paper, and then the sheet lit.

**Rubric.** Subject: a burning page. Legible at once. Measured: the colour.
History: total — burned is burned.

**Ground.** Ink type on cream paper, so the copy reads _before_ anything
happens, and char on scorched paper reads after.

**State.** `PingPong`, RGBA32F at ~92k cells: `x` fuel, `y` temperature,
`z` peak temperature seen (scorch), `w` char.

    rate = A · fuel · smoothstep(T_ign, T_ign + δ, T)
    dT   = D ∇²T + upward bias + Q · rate − cooling · T
    dfuel = −rate

The Ember entry's buoyant velocity field is dropped. Type lies flat on a
sheet; an upward bias in the heat transport makes the front lick up strokes
without a second solver.

**Tension.** The front must cross word spaces. Heat diffusion alone will not
jump a ~16-cell gap; raise `D` or `Q` until it does and the whole block
flashes over at once, with no walking front. So the paper is fuel too — thin
(0.15 against the letters' 1.0), enough to carry a slow cool smoulder across
gaps and scorch as it goes, never enough to flame.

_Measured, the contrast is in temperature more than speed._ A
reaction–diffusion front near extinction does not slow toward zero: it holds
a minimum speed and then goes out. On this chemistry the paper runs at 32
cells/s with `T_IGN = 0.08`, 27 at 0.09, and is dead at 0.10; "a quarter of
the type's speed" does not exist. So type runs at **~60 cells/s** and pins the
temperature at the cap; paper runs at **~32** and peaks near 0.27 — a dull
red crawl beside a white-hot one.

Targets, asserted in the mirror: a front crosses a 16-cell paper gap between
two fuel bars, slower than it crosses type; with paper fuel zeroed it stalls
(the test that proves the reason); first-to-last letter ignition ≥ 3 s;
default phrase burns out in 6–14 s of sim time. A `pace` control (default
0.55) scales sim time, because at the sim's own rate a phrase goes in about
four seconds and reads as a flash.

**Colour.** Temperature through a Planck-locus fit, 600–1900 K, intensity as
`T⁴`, tone-mapped. Flame, ember and the dull red before black are one curve.

**Remains.** Char, scorch from the peak channel, and embers: a second, slower
oxidation of char to ash that gives back heat. The heat per unit of char has
to be several times what a balance against room cooling alone suggests,
because a glowing stroke loses most of its heat sideways into the cold burned
sheet around it. Moving air multiplies the ember rate, so a fanned stroke
glows hotter and is ash sooner — and ends visibly paler: measured on screen,
fanned strokes finish 27 % brighter than unfanned ones.

**Input.** A click ignites at the click point — on a letter, or on bare paper,
which smoulders its way to one. The pointer fans: moving air (a still cursor
fans nothing) raises the ember reaction rate under it. Clicking char does
nothing.

**Opening state.** Auto-ignites ~0.8 s after load (`autoIgnite`), so the lab
opens on it burning rather than on a sheet of paper. After burn-out and a
pause a fresh sheet is fitted, as `shatter-glass` fits a fresh pane.

Fixed step at 120 Hz, accumulator capped at 3.

## Testing

`TOY-IDEAS.md` records that every real bug in the Erosion Table was found by
arithmetic, not by looking. Each effect has a pure-TS mirror of its step in
`<effect>.sim.ts`, sharing constants with the GLSL by interpolation, tested
under vitest:

- **Off Register** — energy is non-increasing with no input; settle times
  match `8m/c` within 10 %; a knocked plate returns to its rest pose.
- **Aspic** — stable at the fixed step for 10⁴ steps, with the plate loose
  too; energy of gel plus plates decays; 2 % settle ≤ 1.4 s nailed; fundamental
  in 2.5–3.5 Hz nailed and 2.5–4.5 Hz loose; pinned row stays zero when nailed
  and sits exactly at the plate's pose when loose; a poke crosses to the next
  letter through the plate within 0.1 s at under three quarters of its
  amplitude and not at all with the plate nailed; a landing on one bar dips
  and tilts the plate and moves the other bar within 0.1 s; the plate comes
  home; two lines set tighter than the margin stay separate bodies.
- **Frost Line** — ice + vapour + boundary mass conserved in stage one; no
  ice where mask < 0.5; glyph fill ≥ 0.88 by 6 s; sparse seeding yields a
  higher perimeter-to-area ratio than dense seeding (feathers, not a rind).
- **Slow Burn** — fuel non-increasing; the gap-crossing pair above;
  flash-over guard; burn-out window.

Then on screen: the headless probe loop, and every stage and palette in the
lab with the effect running. A palette that kills the computed thing is a bug.

**Measured at 1600×1400 on an M1 Max, GPU time per frame by timer query:**
Off Register 0.82 ms busy / 0.00 at rest; Aspic 4.56 / 0.00 (1.11 as a 2D dome, 1.86 with
the plate's reduction pass, 4.56 raymarched with a layer of SDF per line; the
readback is a sync point, not GPU time); Frost Line
1.90 / 0.00; Slow Burn 1.37 while burning (a proclamation, so it is always
burning or being refitted). The three arrivals issue no draw calls at all
once they have settled — counted, not inferred.

## Build order

Off Register, Aspic, Frost Line, Slow Burn — cheapest to heaviest, each landed
complete before the next begins. Off Register proves the shelf, the phrase
control and the sleep-at-rest pattern that Aspic reuses.

## Files

    packages/flateralus-pixi-animations/src/
      shared/mask-grid.ts          shared/mask-grid.test.ts
      shared/reduced-motion.ts
      off-register/  aspic/  frost-line/  slow-burn/
        <name>Animation.ts  <name>.sim.ts  <name>.sim.test.ts  index.ts
      index.ts                                    four exports
    apps/bracketbear-website/src/components/lab/
      sections.ts                                 the 'type' key
      registry.ts                                 four entries
    docs/lab/TOY-IDEAS.md                         Frost and Ember status

## Out of scope

- Using any of these on the live site. The shelf proves them; placing one on
  a real heading is its own decision, with its own intersection-observer
  trigger and its own look at cost on a phone.
- Reduced-motion handling for the existing 38 animations.
- Themes with a light canvas. Every theme reassigns the palette's _roles_, so
  under Miami '84 and JNCO Rave `ink` is near-white and `orange` is the dark.
  The four effects pick their dark by luminance (`themeDark()` in the shared
  prelude) rather than by role, which is what keeps frost on a dark pane and
  ink on cream paper under every theme. The other shader effects still read
  roles literally; whether they should is a separate question.
- Fonts other than Anton. `phraseMask` is Anton-only and stays that way here.
- The Frost and Ember _toys_. They remain open in `TOY-IDEAS.md`, and now
  have to pass question 0 against these two.
