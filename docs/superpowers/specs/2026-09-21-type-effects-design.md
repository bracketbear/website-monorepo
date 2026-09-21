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
one letter to the next; a displacement field that merely wobbles in place is
the haze again. "The pool with type on the floor" — type under a ripple tank
is `caustics-pool`'s anatomy and was not considered further.

## The shelf

`sections.ts` gains a `'type'` key, labelled `10 · Type`. Ground is `PAL.ink`
and the section is dark. Slow Burn paints its own paper over the whole stage,
so the ground never shows behind it.

Shared by all four:

- **`phrase`** — `text` control, `maxLength: 64`, set through `phraseMask`.
  A change re-seeds the effect, which replays the arrival. `phraseMask`
  returns null until Anton loads; every effect keeps asking rather than
  caching the null, as `ink-dissolve` does.
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

The heading set in a slab of amber gel, dropped onto a plate.

**Rubric.** Subject: a jelly on a plate. Legible at once. Measured: strain.
Loop: a poke at one letter reaches the others.

**State.** `PingPong`, RGBA**32**F: `xy` displacement `u`, `zw` velocity `v`.
The slab is a rounded rectangle around the type block.

    v += (c² ∇²u − ω₀² u − γ v + ν ∇²v) dt      u += v dt

Two things the build added. Kelvin–Voigt viscosity `ν∇²v`, which takes the
grid-scale ringing out in a few steps and leaves the sway alone — without it
a drop leaves the slab striped with two-cell compression modes. And 32-bit
state: with half floats the per-step increment (~10⁻³) is rounded by ten
percent against a velocity near 0.2, and because the rounding depends only on
the value, a state uniform along a row is striped along it. The CPU mirror,
in Float32, cannot see this; the screen can. `PingPong` now takes
`fullPrecision` for any integrator.
Symplectic Euler at a fixed 1/480 s, at most 12 steps a frame. Bottom row
pinned (`u = 0`) — it sits on the plate — and the other edges free. Grid is
~5760 cells from the block aspect (96×60 at 1.6). A displacement field is
smooth, so linear filtering carries it to screen resolution.

Numbers: `c = 0.57` cells/step, under the 0.707 CFL limit, is 274 cells/s —
a poke crosses the block in **0.35 s**. `γ = 6.5 s⁻¹` takes amplitude to 2 %
in **1.2 s**. `ω₀` is tuned so the fundamental sway lands near **3 Hz**
(the slab's own shear mode, `c/4H ≈ 1.1 Hz`, adds in quadrature).

**Arrival.** The slab starts displaced upward with downward velocity and
lands. Because the base is pinned, the top sways most — which is the look.

**Display.** Mask sampled at `luv − u`. The slab body is shaded from `∇·u`:
compression raises optical density and drives a surface bulge whose gradient
gives the specular highlight. One field, every visible thing derived from it.

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
- **Aspic** — stable at the fixed step for 10⁴ steps; energy decays; 2 %
  settle ≤ 1.4 s; fundamental in 2.5–3.5 Hz; pinned row stays zero.
- **Frost Line** — ice + vapour + boundary mass conserved in stage one; no
  ice where mask < 0.5; glyph fill ≥ 0.88 by 6 s; sparse seeding yields a
  higher perimeter-to-area ratio than dense seeding (feathers, not a rind).
- **Slow Burn** — fuel non-increasing; the gap-crossing pair above;
  flash-over guard; burn-out window.

Then on screen: the headless probe loop, and every stage and palette in the
lab with the effect running. A palette that kills the computed thing is a bug.

**Measured at 1600×1400 on an M1 Max, GPU time per frame by timer query:**
Off Register 0.82 ms busy / 0.00 at rest; Aspic 1.11 / 0.00; Frost Line
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
