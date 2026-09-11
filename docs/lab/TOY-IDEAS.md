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

## Status

| Idea                                       | Rubric            | Status                          |
| ------------------------------------------ | ----------------- | ------------------------------- |
| [Erosion Table](#erosion-table)            | strong on 1, 2, 5 | **recommended next**            |
| [Lichtenberg](#lichtenberg)                | strong on 2, 4    | ready to spec                   |
| [Frost](#frost)                            | strong on 1, 2    | ready to spec                   |
| [Soap Film](#soap-film)                    | strong on 2, 4    | ready to spec                   |
| [Ember](#ember)                            | strong on 2, 4    | ready to spec                   |
| [Light Garden](#light-garden)              | strong on 1, 5    | ready to spec                   |
| [Chladni Plate](#chladni-plate--abandoned) | fails 1, 2, 3     | **abandoned** — see post-mortem |

---

## Erosion Table

**Recommended next.** It is the only candidate that is strong on subject,
legibility and loop closure at once, and the data is already in the build.

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
