# Animation Lab — design spec

**Status:** accepted
**Source handoff:** `design_handoff_animation_lab/` (README.md + CATALOG.md + prototype/)
**Date:** 2026-09-10

## What this is

The Animation Lab is a browsing and tuning environment for the animated backgrounds that run
behind Bracket Bear site sections. It presents ~50 real-time animations (PIXI v8 scene-graph
pieces and hand-written WebGL2 shaders), each with a declared control manifest, and lets you
switch between them, tune every control live, randomize the manifest, recolor the whole system
through six palette themes, and preview each animation bare or behind the site copy it sits under.

The goal is not to ship the prototype. It is to rebuild the Lab as a real app backed by
`@bracketbear/flateralus`, so it becomes the place where new flateralus animations get authored,
tuned, and promoted into the site.

## Fidelity

High. Colors, type, spacing, and interaction behavior in the handoff are final. The animations are
finished work — visual output should be identical after the port, not "in the spirit of."

## What the handoff assumed vs. what the repo actually has

The handoff was written without knowledge of the current monorepo. Four of its assumptions are
wrong, and they change the plan materially.

**1. The manifest and control machinery already exists.** `flateralus-lite.js` reimplements
`createManifest`, `defaults()`, and `randomize()`. All three already ship in
`@bracketbear/flateralus` as `createManifest`, `getManifestDefaultControlValues`, and
`getRandomControlValues`, with Zod schemas, tests, and a `resetsAnimation` flag that
`BaseAnimation.onControlsChange` already honors. Do not port `flateralus-lite`'s manifest half.

**2. A manifest-driven control UI already exists.** `@bracketbear/flateralus-react` ships
`DebugControls`, `useDebugControls`, `useControls`, `AnimationStage`, `useAnimationStage`, and
per-type control components for number, boolean, color, select, and group — all Storybook-covered.
The Lab inspector should reuse the control primitives rather than rewrite them.

**3. `apps/bracketbear-website` is pinned to PIXI 7.4.3.** Its live homepage
(`src/scripts/bb-home.client.ts`, 1084 lines) uses v7 idioms that break under v8. Flateralus
requires PIXI 8. The app also already imports `@bracketbear/flateralus-pixi` from
`src/components/HeroSection.tsx`, so the version conflict is latent today — that component is
currently unreferenced by any page, which is the only reason it does not break.

**4. The brand palette is not tokenized.** The sunset palette the Lab needs
(`#ff5f1f`, `#fff3e3`, `#110a08`, …) exists only as plain CSS custom properties scoped to
`.bb-home` in `apps/bracketbear-website/src/styles/bb-home.css`. It is not in the shared
`@theme` block, so no Tailwind utilities reach it. The shared `@theme` carries a different,
older palette.

## Status

Plan 0, the PIXI 8 migration, is complete. Plan 1, the Lab foundation, is complete: the palette,
draw utilities, pointer service, root-container contract, Lab shell, inspector, and three ported
animations are all committed and verified. Plan 2, the remaining animations, has not started.

## Decisions

**D1 — Migrate `apps/bracketbear-website` to PIXI 8, and host the Lab there at `/lab`.**
The alternative was a separate `apps/animation-lab` on PIXI 8, routing around the version pin.
That was rejected: "In context" mode is supposed to render the real site section components, and
it cannot do that from another app. Migrating removes the conflict at its source instead of
building the Lab around it, and it clears the latent break in `HeroSection.tsx`.

The migration is well bounded — the v7 surface is concentrated in a handful of API groups,
tabulated below. `pixi-filters` moves from `^5.3.0` to `^6.1.5`, the major that targets PIXI 8;
it supplies the `GlowFilter` behind the BB silhouette's violet halo. The Lab route is `noindex`,
since it ships inside the marketing site.

**Status: done.** The migration is complete and verified — see the Verification section.

**D2 — Select controls accept numeric values.** _(Implemented. Wider than expected: it also
required widening `SelectControlValue` and the stage-control type map, and coercing three call
sites in existing animations.)_

**Original rationale.** The prototype uses numeric select values
(`{ label: 'Ink stage', value: 1 }`) across ~368 controls, and renders a color swatch when a
value is numeric. `SelectControlSchema` currently requires `z.string()` for both option value and
`defaultValue`. Widen both to `z.union([z.string(), z.number()])`. This is backwards-compatible,
matches how `ColorControlSchema` already accepts `string | number`, and avoids rewriting hundreds
of controls. Palette-picker selects stay selects; they are not remapped onto `color` controls,
because their swatch rendering is a display concern, not a different control type.

**D3 — The palette and theme table live in `@bracketbear/flateralus`.** `BBLAB.PAL` is a live
mutable palette read at draw time by every animation, and `applyTheme(id)` `Object.assign`s a
theme into it. This is rendering-agnostic, so it belongs in the core package, not in the Lab app
and not in the PIXI adapter. The six themes port verbatim.

**D4 — Pointer input becomes a shared service in `@bracketbear/flateralus-pixi`.** The prototype
gives every animation `ctx.mouse` and `ctx.clicks`. The repo has no equivalent: the one existing
animation that needs a cursor (`blobAnimation`) wires `app.stage.on('pointermove')` itself. Since
roughly every ported animation reads the cursor, a shared service is required.

**D5 — Animations own a root container.** _(Implemented, with one change: the root attaches
lazily in `getRoot()` rather than once in `init`, because animations reset themselves by calling
`onDestroy` then `onInit` without a second `init`, which would orphan the replacement root.)_

**Original rationale.** `PixiAnimation`'s context is the raw `PIXI.Application`,
with no per-animation container. The prototype's `ctx.root` is created by the shell and destroyed
on teardown. Port that contract into the PIXI adapter so mount → unmount → mount leaks nothing.

**D6 — The Lab inspector is bespoke, built from existing control primitives.** `DebugControls` is
a gear-triggered popover capped at `max-w-sm`, styled for overlay use. The Lab needs a persistent
296px sidebar with Anton titles and the handoff's exact metrics. Reuse `NumberControl`,
`BooleanControl`, `SelectControl` and the `useControls` hook; do not reuse the `DebugControls`
shell. Note that `DebugControls` calls hooks after an early `return null`, a conditional-hooks
violation to avoid inheriting.

## Scope

This spec covers three subsystems, planned separately.

**Plan 0 — PIXI 8 migration.** Complete. `apps/bracketbear-website` is on `pixi.js@8.11.0`
(resolving to 8.20.1) and `pixi-filters@6.1.5`, and `bb-home.client.ts` is ported. The one piece
of Plan 0 still open is the unreferenced `HeroSection.tsx`, which no page imports — it should be
wired up or deleted, and that is a content decision, not a migration one.

**Plan 1 — foundation. Complete.** Palette and theme module, draw utils, pointer input service, root
container and teardown contract, per-animation DPR override, error isolation and ticker watchdog,
the Lab app shell (header, nav, stage, inspector), and three animations ported end to end — one
PIXI scene-graph piece, one shared-harness shader, one self-contained GPU sim — proving each
pipeline.

**Plan 2 — the port waves.** The remaining 49 animations. All three pipelines are now proven,
so this is mechanical: PIXI scene-graph pieces, then shared-harness shaders, then self-contained
sims. Three things learned in Plan 1 shape it. Animations read `app.screen`, not
`app.renderer.width`, because pointer coordinates are in CSS pixels. Every animation that
overrides `onDestroy` must call `super.onDestroy()`. And a select control whose value feeds a
helper typed `string` needs coercion at the call site, now that select values may be numeric.

**Plan 3 — promotion.** URL state for animation id, theme, and control values; "copy manifest as
JSON/TS"; and wiring "In context" to the real site section components.

## Catalog

52 registered definitions across 27 source files, ~368 controls, ~14,700 lines. Two definitions
(`patch-bay`, `block-stack`) are not currently loaded by the prototype shell; decide whether to
revive or drop them during Plan 2. Section assignments, ids, and techniques are in
`CATALOG.md` in the handoff. Every definition carries a written `blurb` — that is copy, not notes,
and it populates the inspector.

## Constraints carried from the handoff

- Node >= 22.12. npm workspaces, no turbo. Tailwind v4, CSS-first, no `tailwind.config.js`.
- Fonts come from `@fontsource` packages, as `bb-home.css` already does. Not the Google Fonts CDN.
- Radii are 0 everywhere except 999px pills and theme dots. No offset drop shadows, borders only.
- Notch shape: `clip-path: polygon(0 0, calc(100% - Npx) 0, 100% Npx, 100% 100%, Npx 100%, 0 calc(100% - Npx))`,
  N = 8 for controls, 14 for large CTAs.
- Transitions 0.15s ease for hover and scale, 0.3s ease for the context dim.
- A new workspace package needs its own `@source` line in the consuming app's global stylesheet
  for Tailwind v4 to scan it, and its name added to three scripts in the root `package.json`.

## PIXI 7 to 8 migration surface

Four API groups cover every v7 idiom in `bb-home.client.ts`.

| v7                                                      | v8                                                     |
| ------------------------------------------------------- | ------------------------------------------------------ |
| `new Application(options)`                              | `new Application()` then `await app.init(options)`     |
| `g.beginFill(c, a)` / `g.drawRect(...)` / `g.endFill()` | `g.rect(...).fill({ color, alpha })`                   |
| `g.lineStyle(w, c, a)` / `g.drawCircle(...)`            | `g.circle(...).stroke({ width, color, alpha })`        |
| `renderer.render(scene, { renderTexture, clear })`      | `renderer.render({ container: scene, target, clear })` |
| `new BlurFilter(strength, quality)`                     | `new BlurFilter({ strength, quality })`                |
| `app.view`                                              | `app.canvas`                                           |

`RenderTexture.create({ width, height, resolution })` and `DisplacementFilter(sprite)` are
unchanged. `Texture.from(canvas)` still wraps a decoded canvas, but v8 removed synchronous URL
loading from `Texture.from`, so the SVG noise texture is now rasterized through an `Image` and
`drawImage` before being wrapped. Because `Application.init` is async in v8, the hero-stage IIFE
became an async function. The v8 reference already in the repo is `docs/pixijs/pixijs-v8-reference.md`.

## Verification

`npm run build --workspace=@bracketbear/bracketbear-website` succeeds and all four pages render.
Type-checking reports no PIXI errors; the errors that remain in `bb-home.client.ts` are eight
pre-existing `possibly null` complaints about `cursor` and `hand` at lines 101 to 231, in the
cursor block, which the migration did not touch.

Loaded in Chrome, the homepage renders the BB silhouette portal, the Memphis shapes inside it,
the drifting fireflies with their texture fills and drop shadows, and the scrolling ticker. Two
screenshots seconds apart differ, so the animation is live rather than stuck on a first frame.

A full page load emits zero console messages. That silence is the meaningful signal, because
PIXI 8 warns loudly whenever a v7 API is called, so no v7 call sites survive. The silence was
checked against a canary rather than taken at face value: console tracking only begins when the
reader is first attached, so a deliberate warning and error were emitted and read back to prove
capture was live, and only then was the page reloaded and read again.

## Known pre-existing bug, deliberately preserved

The displacement noise texture has never worked, and still does not. `NOISE_SVG` references its
own filter as `url(%23t)`, then the whole string is passed through `encodeURIComponent`, so the
`%23` becomes `%2523` and the filter reference no longer resolves. The SVG therefore rasterizes
as a flat opaque black square instead of fractal noise.

Measured in the page: the current string yields a red channel that is 0 everywhere and an alpha
that is 255 everywhere. The same SVG with a literal `#` yields red varying from 81 to 244 and
alpha from 18 to 223, which is real noise.

This predates the migration — v7's `Texture.from(url)` went through the same `Image` path and got
the same blank result — so `DisplacementFilter` has been displacing against a constant. The port
reproduces the behavior exactly rather than fixing it, because the migration's acceptance
criterion is that the homepage looks identical afterward. Changing one character to `url(#t)`
would switch on an effect the site has never actually shipped, which is a visual decision to make
on its own terms.
