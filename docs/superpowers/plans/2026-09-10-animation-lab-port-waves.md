# Animation Lab Port Waves Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the remaining 49 prototype animations into `@bracketbear/flateralus-pixi-animations` and register them in the Lab, with visual output identical to the prototype.

**Architecture:** The three pipelines are already proven by `halftone-tide`, `heat-haze`, and `rd-vat`. Nothing new is invented here. Each task ports one prototype source file, because animations that share a file also share local helpers, and moving them together is what keeps those helpers from being duplicated.

**Tech Stack:** PIXI 8, WebGL2, TypeScript, Vitest, Astro 7, React 19.

**Spec:** `docs/superpowers/specs/2026-09-10-animation-lab-design.md`

**Predecessor:** `docs/superpowers/plans/2026-09-10-animation-lab-foundation.md` — read its "What actually changed" section before starting.

## Global Constraints

- The animations are finished work. Port the math, the shaders, and the tuned default values unchanged. Only the wrapper differs. Visual output must be identical, not "in the spirit of".
- Every `blurb` in the prototype is written copy, not a note. Carry it across verbatim; it populates the inspector.
- Read stage size from `app.screen`, never `app.renderer.width`. Pointer coordinates are CSS pixels and `app.screen` matches them; `renderer.width` is device pixels and will be wrong by the device pixel ratio.
- Every animation that overrides `onDestroy` must call `super.onDestroy()`, or it leaks its root container on every mount.
- Read palette values as `PAL.orange` at draw time. Never destructure `PAL` and never cache a color across frames, or theme switching silently stops working for that animation.
- Every control needs `debug: true` or the inspector will not render it.
- A select control whose value feeds a helper typed `string` needs `String(...)` at the call site, because select values may now be numeric.
- Clamp delta time to 0.05s at the top of `onUpdate`, as the prototype shell did, so a backgrounded tab does not jump the simulation.
- Consume the click queue with `shift()`. Leaving entries in it means the next animation inherits them.
- Node >= 22.12, npm workspaces. Tests: `npx vitest run <path>` from the repo root.

## The porting recipe

Every task below follows this recipe. It is written once here rather than repeated 20 times.

**1. Create the folder.** `packages/flateralus-pixi-animations/src/<kebab-id>/<camelId>Animation.ts` plus an `index.ts` containing only `export * from './<camelId>Animation';`. Add the folder to `src/index.ts`, keeping that barrel alphabetical.

**2. Translate the definition.**

| Prototype                                           | Port                                                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `controls: [...]`                                   | the `controls` array of `createManifest({ id, name, description, controls })`, every entry with `debug: true` |
| `blurb`                                             | the manifest's `description`, and the registry entry's `blurb`                                                |
| `init(c)`                                           | `onInit(app, controls)`                                                                                       |
| `update(c, dt)`                                     | `onUpdate(app, controls, deltaTime)`                                                                          |
| `c.s.foo`                                           | a private instance field                                                                                      |
| `c.v.foo`                                           | `controls.foo`                                                                                                |
| `c.root`                                            | `this.getRoot()`                                                                                              |
| `c.w` / `c.h`                                       | `app.screen.width` / `app.screen.height`                                                                      |
| `c.mouse`                                           | `this.pointer?.mouse`                                                                                         |
| `c.clicks`                                          | `this.pointer?.clicks`                                                                                        |
| `R.PAL`                                             | `PAL` from `@bracketbear/flateralus`                                                                          |
| `R.rand`, `R.pick`, `R.px`, `R.glowTex`, `R.noise2` | the same names from `@bracketbear/flateralus-pixi`                                                            |
| `R.LOGO_CV`                                         | `logoMask()` from `../shared/shader-harness`                                                                  |
| `dpr: 1.2` on the definition                        | `readonly dpr = 1.2;` as a class field                                                                        |

**3. Export a factory.** `export class XAnimation extends PixiAnimation<typeof MANIFEST>` and `export function createXAnimation(initialControls?: Partial<XControlValues>): XAnimation`.

**4. Register it.** Add a `LabEntry` to `apps/bracketbear-website/src/components/lab/registry.ts` with the id, section, name, tag, and blurb from `CATALOG.md` and the source file. Keep registry order matching the catalog.

**5. Verify it.** Per-animation, in the Lab:

- It renders, and looks like the prototype side by side.
- Every control moves it, and controls marked `resetsAnimation` rebuild rather than glitch.
- The cursor affects it and clicks do what the blurb claims, where the blurb claims any.
- Switching to the Game Boy theme recolors it. If it does not, a color was cached.
- Selecting away and back leaves no console error and no second canvas.

**6. Commit** one source file's worth of animations per commit.

---

## Wave A: PIXI scene-graph, no external data

These need nothing but the palette and draw utilities. Start here: they are the cheapest, and they exercise the same path `halftone-tide` already proved.

### Task 1: `lab-animations-1.js` — the rest of it

**Partially done.** `signal-alignment` and `silhouette-flock` are ported, registered and
verified. Only `pixel-sunrise` and the shared pixel helpers remain, which is Step 1 and Step 4
below.

**Files:** Create `src/pixel-sunrise/`, `src/silhouette-flock/`, `src/signal-alignment/`. Modify `src/index.ts`, `registry.ts`.

Ports `pixel-sunrise` (hero, 8-bit ordered dither over a low-FPS pixel grid), `silhouette-flock` (hero, boids with burst-flap glide and the cursor as a hawk), and `signal-alignment` (intro, a flow field split by a noise-versus-order threshold).

- [ ] **Step 1:** Read the three definitions in the prototype file, plus the `bbLogoMask` and `bbCityGrid` helpers at the top that `pixel-sunrise` uses. Those helpers move into `src/shared/pixel-helpers.ts` so the other 8-bit pieces can share them.
- [ ] **Step 2:** Port `signal-alignment` first — it is the simplest and uses `px` and `rand` from the draw utilities.
- [ ] **Step 3:** Port `silhouette-flock`. Its `density` control has `resetsAnimation: true`; confirm the rebuild is clean.
- [ ] **Step 4:** Port `pixel-sunrise`, including the baked skyline tables for Pittsburgh and Portland. They are data, not code: move them verbatim into `src/shared/skylines.ts`.
- [ ] **Step 5:** Register all three, run the per-animation verification from the recipe.
- [ ] **Step 6:** Commit.

### Task 2: `lab-animations-2.js`

**Files:** Create `src/tile-flip/`, `src/logo-terrain/`, `src/logo-resolve/`.

Ports `tile-flip` (values, 16-bit checker wipe with click ripples), `logo-terrain` (hero, stacked slice extrusion on a heartbeat rig), and `logo-resolve` (about, neon-sign boot sequence with additive glow and glitch).

- [ ] **Step 1:** This file builds `R.LOGO_CV` from an SVG data URL through an `Image`. Do not port that. Use `logoMask()` from the shared harness, which rasterizes the same paths synchronously.
- [ ] **Step 2:** Port the three animations per the recipe. `logo-resolve` uses `glowTex()` for its filter-free halos.
- [ ] **Step 3:** Register, verify, commit.

### Task 3: `lab-animations-3.js`

**Files:** Create `src/spiral-moire/`, `src/contour-hood/`, `src/contour-pgh/`.

Ports `spiral-moire` (about, counter-rotating Archimedean spirals) and the two contour pieces, which are the same factory driven by different elevation data.

- [ ] **Step 1:** `contour-hood` and `contour-pgh` share one factory. Put it in `src/shared/contour-factory.ts` and have both animations call it with their own dataset, rather than duplicating.
- [ ] **Step 2:** Port, register, verify, commit.

### Task 4: `lab-animations-9.js`

**Files:** Create `src/monolith/`, `src/pixel-sunrise-2/`, `src/shadow-pass/`, `src/beneath/`.

Ports `monolith` (statement, voxel extrusion with a hand-rolled painter's-algorithm depth sort), `pixel-sunrise-2` (hero, choreographed eclipse loop over dithered sky bands), `shadow-pass` (work, oversized logo shadow over a halftone field), and `beneath` (values, a grid displaced by a mass under the surface).

- [ ] **Step 1:** `pixel-sunrise-2` shares the dither and pixel-grid helpers extracted in Task 1. Import them; do not re-implement.
- [ ] **Step 2:** `monolith` sorts its voxels every frame. Keep the sort exactly as written — the draw order is the effect.
- [ ] **Step 3:** Port, register, verify, commit.

### Task 5: `lab-animations-10.js` and `lab-animations-11.js`

**Files:** Create `src/particle-terrain/`, `src/collision-event/`.

Ports `particle-terrain` (hero, a 3D point cloud with hand-rolled perspective) and `collision-event` (hero, a particle-detector event display with helical tracks).

- [ ] **Step 1:** Both hand-roll their own projection. Do not substitute a library; the projection constants are tuned.
- [ ] **Step 2:** Port, register, verify, commit.

### Task 6: `lab-animations-6.js` and `lab-animations-7.js`

**Files:** Create `src/burner-wall/`, `src/foil-statement/`.

Ports `burner-wall` (about, a playable paint simulation) and `foil-statement` (statement, holographic foil driven by pointer tilt).

- [ ] **Step 1:** `burner-wall` is playable and holds a paint buffer. Give it an explicit `onDestroy` that releases the buffer and calls `super.onDestroy()`.
- [ ] **Step 2:** `foil-statement` reads pointer position for its tilt. It needs `this.pointer`, and it must degrade to a neutral tilt when `mouse.active` is false, as the prototype does.
- [ ] **Step 3:** Port, register, verify, commit.

## Wave B: baked data

### Task 7: the baked datasets

**Files:** Create `src/shared/city-data.ts`, `src/shared/star-catalog.ts`.

`bb-city-data.js` holds run-length-encoded OpenStreetMap road and building grids for Pittsburgh and Portland, a 65-star northern-sky catalog with J2000 positions and magnitudes, and the inputs for the solar-position math. It is data plus a decoder.

- [ ] **Step 1:** Move the RLE decoder and the four grids verbatim. The encoding is one row per string, count-plus-character pairs, with `.` land, `R` road, `W` water, `B` building, `G` green.
- [ ] **Step 2:** Write a test asserting the decoder returns the declared grid size and that decoding is stable, so a future reformat of the data cannot silently corrupt it.
- [ ] **Step 3:** Commit the data module on its own, before anything consumes it.

### Task 8: `lab-animations-4.js`

**Files:** Create `src/street-pulse/`, `src/block-party/`, `src/star-map/`, `src/sun-arc/`, `src/atomic-age/`, `src/energy-body/`, `src/rust-machine/`.

The largest file, 1385 lines and seven animations: `street-pulse` (work, connectivity propagation over baked road geometry), `block-party` (about, block-by-block pop of building footprints), `star-map` (hero, a real star catalog on a long-exposure wheel), `sun-arc` (contact, real solar math for the date and city coordinates), `atomic-age` (receipts, phosphor CRT with a radar sweep), `energy-body` (receipts, a phyllotaxis eye field that tracks the cursor), and `rust-machine` (contact, industrial decay with beat-locked slams).

- [ ] **Step 1:** Port in two commits, not one: the four data-driven pieces first, then the three generative ones. Seven animations in one commit is not reviewable.
- [ ] **Step 2:** `sun-arc` computes real solar position from a date. Pin the date in a control rather than reading the clock, so the animation is reproducible and testable.
- [ ] **Step 3:** Register, verify, commit.

## Wave C: shared-harness shaders

All of these use the harness in `src/shared/shader-harness.ts`, already proven by `heat-haze`.

### Task 9: `lab-molten-mark.js`

**Files:** Create `src/molten-mark/`.

`molten-mark` is the first GLSL effect and stands alone: fbm domain warp with a dwell-driven melt threshold.

- [ ] **Step 1:** It predates the shared harness and carries its own copy of the setup. Port it onto the shared harness rather than duplicating that code.
- [ ] **Step 2:** Verify the dwell behavior: holding the cursor still should progress the melt, moving away should recover it.
- [ ] **Step 3:** Commit.

### Task 10: `lab-shaders-2.js` — the rest of it

**Files:** Create `src/burn-through/`, `src/schematic-lens/`, `src/led-matrix/`.

Three more hero effects on the harness `heat-haze` already uses.

- [ ] **Step 1:** These share the `fitRect` letterboxing and the headline mask. Both are already exported from the harness.
- [ ] **Step 2:** `burn-through` reseeds its noise on click. Confirm the reseed does not rebuild the GL program.
- [ ] **Step 3:** Port, register, verify, commit.

### Task 11: `lab-shaders-3.js`

**Files:** Create `src/portal-mark/`, `src/visionary-eye/`.

840 lines for two effects, so expect dense shader bodies.

- [ ] **Step 1:** Port the fragment shaders verbatim. Do not reformat GLSL; whitespace changes make a later diff against the prototype unreadable.
- [ ] **Step 2:** Port, register, verify, commit.

### Task 12: `lab-shaders-4.js` and `lab-shaders-5.js`

**Files:** Create `src/goo-lamp/`, `src/kaleido/`, `src/night-rain/`, `src/sdf-forge/`.

Three toys plus `sdf-forge` (hero). The toys sit in the `toys` section, whose stage ground is ink and which is never dimmed in context mode.

- [ ] **Step 1:** Port, register, verify, commit as two commits, one per source file.

## Wave D: self-contained GPU simulations

Each owns its own framebuffer setup. `rd-vat` is the worked example; follow its teardown exactly, deleting every texture, framebuffer, and program before losing the context.

### Task 13: `lab-shaders-6.js` — `crt-phosphor`

Ports the remaining effect from the file `rd-vat` came from: a spring-damped beam with real phosphor decay, where holding still burns in and a click degausses.

- [ ] **Step 1:** It uses the same ping-pong float-texture machinery as `rd-vat`. Extract that into `src/shared/ping-pong.ts` now that there are two consumers, and refactor `rd-vat` onto it in the same commit.
- [ ] **Step 2:** Verify burn-in accumulates and that a click clears it.
- [ ] **Step 3:** Commit.

### Task 14: `lab-shaders-7.js`

**Files:** Create `src/slit-scan/`, `src/shatter-glass/`.

`slit-scan` holds a 30-frame ring buffer and offsets time per pixel. `shatter-glass` builds click-driven Voronoi crack networks with refraction.

- [ ] **Step 1:** The ring buffer is 30 textures. Its `onDestroy` must delete all 30, and this is the single most likely leak in the catalog. Verify with the cycle test from the recipe before committing.
- [ ] **Step 2:** Port, register, verify, commit.

### Task 15: `lab-shaders-8.js` and `lab-shaders-9.js`

**Files:** Create `src/slime-mold/`, `src/jelly-tank/`.

`slime-mold` runs 131k physarum agents in a float texture. `jelly-tank` is a pulse-jet locomotion sim with light-biased heading.

- [ ] **Step 1:** `slime-mold` is the heaviest piece in the catalog. Give it a `dpr` override if it does not hold frame rate, and record the value chosen.
- [ ] **Step 2:** Port, register, verify, commit.

### Task 16: `lab-shaders-10.js`, `11`, `12`

**Files:** Create `src/raymarch-mark/`, `src/ink-dissolve/`, `src/holo-mark/`.

`raymarch-mark` sphere-traces an extruded SDF with soft shadows and ambient occlusion, and ships `dpr: 1.2`. `ink-dissolve` is Navier-Stokes with advection, vorticity, and a Jacobi pressure solve. `holo-mark` builds a logo SDF at load and uses analytic normals.

- [ ] **Step 1:** `raymarch-mark` is the DPR test case. Confirm `readonly dpr = 1.2` actually lowers its render resolution, since `BaseApplication.init` overwrites `config.resolution` unconditionally and the override has to be applied by the animation itself.
- [ ] **Step 2:** Port, register, verify, commit one file per commit.

### Task 17: `lab-shaders-13.js` through `16`

**Files:** Create `src/scan-terrain/`, `src/dmt-tunnel/`, `src/interference-field/`, `src/caustics-pool/`.

`scan-terrain` draws roughly 50k particles from `gl_VertexID` over ridged fbm and is the only vertex-shader particle system. `dmt-tunnel` is a polar kaleidoscope fold. `interference-field` renders contours over detuned radial wave fields. `caustics-pool` is a 2D wave equation with a refraction pass.

- [ ] **Step 1:** `scan-terrain` needs a vertex shader, unlike every other effect, which uses the shared fullscreen triangle. Give it its own program rather than bending the harness.
- [ ] **Step 2:** Port, register, verify, commit one file per commit.

## Wave E: the two unloaded definitions

### Task 18: decide on `patch-bay` and `block-stack`

`lab-animations-5.js` holds `patch-bay`, a playable modular-patch toy. `lab-animations-8.js` holds `block-stack`, a playable block yard. Neither is loaded by the prototype shell, so neither has been exercised recently.

- [ ] **Step 1:** Load each into the prototype and see whether it still works. Serve the prototype over HTTP and add the script tag; `file://` will not work.
- [ ] **Step 2:** If it works, port it. If it does not, delete it and record why in the spec rather than leaving dead files implying unfinished work.
- [ ] **Step 3:** Commit.

## Closing tasks

### Task 19: catalog parity check

- [ ] **Step 1:** Assert in a test that the Lab registry contains exactly the ids `CATALOG.md` lists, minus any dropped in Task 18. A missing port should fail the suite, not go unnoticed.
- [ ] **Step 2:** Check every registry entry has a non-empty blurb and tag.
- [ ] **Step 3:** Commit.

### Task 20: full-catalog leak and performance pass

- [ ] **Step 1:** Cycle every animation in a **foreground** tab. A hidden tab stops animation frames and clamps timers, which makes the instrumentation time out and produces no measurement.
- [ ] **Step 2:** Confirm no WebGL context-limit warning and a canvas count that stays at one. Both held across 72 cycles of the first three animations.
- [ ] **Step 3:** Measure the settled heap, and measure it quietly — an instrument that allocates while sampling swamps the signal. With three animations the floor was 8MB at load, 33MB after 36 cycles and 52MB after 72, roughly 0.5MB retained per cycle and decelerating. Compare the full catalog against that curve; a steeper or linear line means a real leak.
- [ ] **Step 4:** Record the per-animation mount cost and give a `dpr` override to anything that cannot hold frame rate.
- [ ] **Step 5:** Commit the overrides.

## A note on this plan's granularity

The foundation plan specified every step down to the code, because it was inventing contracts other tasks depend on. This plan deliberately does not: it ports 49 animations through one recipe that is already proven, and inlining roughly 15,000 lines of prototype source would make the plan less usable, not more. The unit of work is a source file. What each task adds beyond the recipe is the specific hazard in that file — shared helpers to extract, a buffer that must be freed, a projection not to substitute, a date not to read from the clock.
