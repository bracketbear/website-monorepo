# Animation Lab Port Waves Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port a selected 28 of the prototype animations into `@bracketbear/flateralus-pixi-animations` and register them in the Lab, with visual output identical to the prototype.

**Scope narrowed 2026-09-10.** The catalog holds 52 definitions; Harrison selected 28. The rest are not being ported and should not be started. The selected set, by catalog id:

| Prototype source      | Ids                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------- |
| `lab-shaders-2.js`    | `led-matrix`, `schematic-lens`                                                        |
| `lab-shaders-3.js`    | `portal-mark`, `visionary-eye`                                                        |
| `lab-shaders-4.js`    | `goo-lamp`, `kaleido`                                                                 |
| `lab-shaders-5.js`    | `sdf-forge`                                                                           |
| `lab-shaders-6.js`    | `crt-phosphor`                                                                        |
| `lab-shaders-7.js`    | `shatter-glass`                                                                       |
| `lab-shaders-8.js`    | `slime-mold`                                                                          |
| `lab-shaders-9.js`    | `jelly-tank`                                                                          |
| `lab-shaders-11.js`   | `ink-dissolve`                                                                        |
| `lab-shaders-12.js`   | `holo-mark`                                                                           |
| `lab-shaders-13.js`   | `scan-terrain`                                                                        |
| `lab-shaders-14.js`   | `dmt-tunnel`                                                                          |
| `lab-shaders-15.js`   | `interference-field`                                                                  |
| `lab-shaders-16.js`   | `caustics-pool`                                                                       |
| `lab-animations-2.js` | `logo-resolve`                                                                        |
| `lab-animations-3.js` | `contour-hood`, `contour-pgh`                                                         |
| `lab-animations-4.js` | `street-pulse`, `atomic-age`, `energy-body`, `block-party`, `sun-arc`, `rust-machine` |
| `lab-animations-7.js` | `foil-statement`                                                                      |
| `lab-animations-1.js` | `signal-alignment` — already done                                                     |

Deliberately excluded: `night-rain`, and every definition not listed above.

**Already in the Lab but outside this list:** `pixel-sunrise`, `silhouette-flock`, `heat-haze`, `rd-vat` and `halftone-tide` were ported as pipeline proofs before the scope narrowed. They work and are committed. Removing them is a separate decision and has not been made.

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

## Order of work

Cheapest and highest-confidence first, so a failure shows up against a proven pipeline rather than a new one.

1. **Shared-harness shaders** — `led-matrix`, `schematic-lens`, `portal-mark`, `visionary-eye`, `sdf-forge`, `goo-lamp`, `kaleido`. `heat-haze` already proves this path.
2. **Self-contained GPU sims** — `crt-phosphor`, `shatter-glass`, `slime-mold`, `jelly-tank`, `ink-dissolve`, `holo-mark`, `scan-terrain`, `dmt-tunnel`, `interference-field`, `caustics-pool`. `rd-vat` proves this path. Extract the ping-pong float-buffer machinery into `src/shared/ping-pong.ts` at the second consumer and refactor `rd-vat` onto it.
3. **Scene-graph pieces** — `logo-resolve`, `contour-hood`, `contour-pgh`, `foil-statement`. The two contour pieces are one factory with two datasets; share it.
4. **Baked-data pieces** — `street-pulse`, `block-party`, `atomic-age`, `energy-body`, `sun-arc`, `rust-machine`. Move `bb-city-data.js` into `src/shared/city-data.ts` first, with a test that the run-length decoder returns the declared grid size.

## Per-file hazards

- `lab-shaders-7.js` `shatter-glass` builds click-driven Voronoi crack networks. Whatever textures it holds must all be released; this file is the most likely leak in the selected set.
- `lab-shaders-8.js` `slime-mold` runs 131k agents in a float texture and is the heaviest piece selected. Give it a `dpr` override if it cannot hold frame rate, and record the value.
- `lab-shaders-13.js` `scan-terrain` is the only vertex-shader particle system. Give it its own program rather than bending the shared fullscreen-triangle harness.
- `lab-animations-4.js` `sun-arc` computes real solar position from a date. Pin the date in a control rather than reading the clock, so it is reproducible.
- `lab-animations-3.js` the two contour pieces must call one shared factory, not two copies.

## Closing tasks

- [ ] **Registry parity:** assert in a test that the Lab registry contains exactly the selected ids, plus whichever pipeline-proof animations are kept. A missed port should fail the suite.
- [ ] **Leak and performance pass:** cycle every animation in a **foreground** tab; a hidden tab stops animation frames and clamps timers, which makes the instrumentation time out. Compare the settled heap against the curve measured for the first three animations: 8MB at load, 33MB after 36 cycles, 52MB after 72. A steeper or linear line means a real leak.

## A note on this plan's granularity

The foundation plan specified every step down to the code, because it was inventing contracts other tasks depend on. This plan deliberately does not: it ports through one recipe that is already proven, and inlining the prototype source would make the plan less usable, not more. The unit of work is a source file. What each entry adds beyond the recipe is the specific hazard in that file.
