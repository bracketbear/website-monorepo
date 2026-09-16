# Talk Runner — design spec

**Status:** implemented (branch talk-runner, 2026-09-15)
**Date:** 2026-09-15
**First content:** "Everything Is an Experience" (Fireside, ~10 min, 13 slides). Storyboard and
speaker beats live on the design canvas; working files are in
`docs/talks/everything-is-an-experience/`.

## What this is

A presentation surface inside `apps/bracketbear-website` that plays a slide sequence with live
Flateralus animations behind the type. One route, one Pixi application, keyboard navigation, a
notes drawer. It exists so the deck can be presented from a browser with the real animations
running, instead of stills.

It is a **runner**, not a maker. Slides are authored in code, the same way the lab registry is.
There is no authoring UI, no CMS, no export. Those were considered and cut (see Non-goals).

## Fidelity

The slide chrome and type follow the storyboard canvas exactly: Anton display, Plus Jakarta Sans
body, JetBrains Mono labels, Archivo Black wordmark, sunset palette from `lab.css` (`#ff5f1f`,
`#fff3e3`, `#110a08`, cyan at ~5%). The running header (talk title, `NN / 13`) and footer
(`[BB] BRACKET BEAR`, `FLATERALUS · <name>` chip) are the same elements the canvas shows.

## Decisions

**D1 — Host it in the website at `/talks/<slug>`, next to `/lab`.**
The lab already solved every hard part: PIXI 8 is migrated, the sunset palette is applied via
`applyTheme('sunset')`, `PointerService` attaches to a wrapper, and every animation is reachable
through `REGISTRY` by id. The runner reuses all of it. The page skips `Layout.astro` and is
`noindex`, exactly like `lab.astro`.

Rejected: bundling Flateralus into the design-canvas artboards. The packages are ESM-only with
no standalone build, the canvas iframe has no network egress, and each artboard would carry its
own megabyte-scale bundle. Also rejected: reveal.js with a plugin. It adds a second layout
system and a dependency for a problem that is ten lines of keyboard handling.

**D2 — One `PixiApplication` for the whole talk; slides swap the animation.**
Boot once (`autoResize`, `backgroundAlpha: 0`, `antialias`), `app.start()`, `applyTheme`. On
each slide change, compare the new slide's `animation.id` with the current one:

- different id → `app.setAnimation(REGISTRY.find(id).create(controls))`, then
  `setPointerService(pointer)`
- same id → leave it running (adjacent slides can share an animation without a restart)
- no animation → `app.setAnimation(null)`; the ink background shows through

`setAnimation` already destroys the previous animation. Resize follows the lab: debounce 250 ms,
then remount the current animation, because animations bake layout at init.

**D3 — Slides are React components in a typed array. Animation is a reference, not a
component.**

```ts
type Slide = {
  id: string; // stable, used for ?slide= and keys
  render: () => ReactNode; // the slide's foreground
  animation?: { id: string; controls?: Record<string, unknown> };
  light?: boolean; // ink type on an orange animation (slide 13)
  notes?: string; // speaker beats, shown in the drawer
};

type Talk = { slug: string; title: string; slides: Slide[] };
```

Talks live in `apps/bracketbear-website/src/talks/<slug>.tsx` and are collected in
`src/talks/index.ts`. The Astro route `src/pages/talks/[slug].astro` uses `getStaticPaths` over
that index and mounts `<TalkRunner talk={...} client:only="react" />`.

Rejected: a JSON/schema slide model with a fixed set of layouts. The storyboard already needs
six layouts across thirteen slides (title over still, list, book, wireframe, quote, giant type).
A schema would either grow to match React or constrain the next talk. Components are the
schema.

**D4 — Keyboard and URL.**

| Key                    | Action                                                                 |
| ---------------------- | ---------------------------------------------------------------------- |
| `→` `Space` `PageDown` | next slide                                                             |
| `←` `PageUp`           | previous slide                                                         |
| `Home` / `End`         | first / last                                                           |
| `N`                    | toggle notes drawer                                                    |
| `T`                    | hide or show the slide text (also a button at the bottom of the stage) |
| `F`                    | toggle fullscreen                                                      |

The current slide is mirrored to `?slide=<id>` with `replaceState`, mirroring the lab's
`?animation=` behavior, so a deep link opens on the right slide and refresh does not lose your
place. Index is clamped; there is no wrap-around.

**D5 — Notes drawer, not a presenter window.**
`N` opens a bottom drawer: the slide's `notes` in Plus Jakarta Sans, plus an elapsed-time
readout in mono that starts on the first advance from slide 1. It is meant for a laptop screen
mirrored to a projector, which is what a meetup usually has. A second-window presenter view is a
future item, not v1.

**D6 — Transitions.**
Foreground crossfades over 200 ms. Animations cut, no fade: a fade would either need two Pixi
applications or a render-to-texture pass, and the storyboard does not call for it.

## Components

```
apps/bracketbear-website/src/
  pages/talks/[slug].astro       route shell (noindex, no Layout, ink background)
  components/talk/
    TalkRunner.tsx               boot Pixi, own the index, keyboard, URL, drawer
    TalkStage.tsx                wrapper + host div for the canvas, pointer attach
    TalkChrome.tsx               header / footer / animation chip, reads slide.light
    TalkNotes.tsx                drawer + elapsed clock
    talk-model.ts                pure: clampIndex, next, prev, parseSlideParam, formatSlideParam
  talks/
    index.ts                     export const TALKS: Talk[]
    everything-is-an-experience.tsx
  styles/talk.css                scoped .bb-talk tokens, copied from .bb-lab
```

`TalkRunner` follows `AnimationLab.tsx`'s boot gate, pointer effect, resize remount, and the
1500 ms ticker watchdog. The parts that differ are the index state and the slide-change effect.

## Data flow

1. Astro renders `[slug].astro` with the matching `Talk` object.
2. `TalkRunner` reads `?slide=`, resolves it to an index (default 0), boots Pixi.
3. Slide-change effect runs `D2`'s comparison and updates the URL.
4. Keyboard handler updates the index; the effect does the rest.
5. `TalkChrome` and `TalkNotes` render from the current slide; the slide's `render()` is the
   foreground.

## Error handling

- `REGISTRY` miss for an `animation.id` → console error, slide renders without an animation, a
  small mono badge in the chip's place says `MISSING · <id>`. The talk keeps going.
- `entry.create` throws → same as the lab: caught, logged, surfaced in the chip, slide continues.
- Pixi fails to boot → slides render on the ink background with no stage. The talk is still
  presentable.

## First content: Everything Is an Experience

Thirteen slides, copied from the canvas artboards in `docs/talks/everything-is-an-experience/`.
Animation assignments:

| Slide           | Animation                             |
| --------------- | ------------------------------------- |
| 01 title        | `caustics-pool`                       |
| 02 ux           | `contour-hood` (cover 1.8)            |
| 03 hospitality  | `block-party` (Pittsburgh, cover 1.6) |
| 04 beyond       | `rd-vat` (noise seed, speed 5)        |
| 05 experiential | `jelly-tank` (neon palette override)  |
| 06 touch point  | `portal-mark`                         |
| 10 bad ux       | `rust-machine`                        |
| 11 habit        | `energy-body`                         |
| 13 thanks       | `silhouette-flock` (light)            |

Speaker beats from the canvas sticky notes become each slide's `notes`.

## Testing

- `talk-model.test.ts` (vitest, alongside the package tests): clamp at both ends, next/prev,
  `?slide=` round-trip, unknown id falls back to 0.
- Playwright smoke, run the way the lab is probed today (headless Chromium against the dev
  server on 4321): open `/talks/everything-is-an-experience`, assert a `<canvas>` mounts, press
  `→`, assert the counter reads `02 / 13` and the URL carries `?slide=`.
- Manual: present it once end to end on a projector-shaped viewport (1920×1080) and confirm the
  five animation slides boot within a second of arriving.

## Non-goals (v1)

- Authoring UI, a "deck maker," or CMS-backed slides
- PDF or PNG export (the design canvas already does this)
- Second-window presenter view or remote control
- Slide-to-slide animation blending
- Mobile layout: the route targets a laptop or projector

## Open questions for review

1. Should slides 08–10 (business / place / person) share one quiet animation, or stay bare?
   The storyboard leaves them bare; D2 makes sharing free if you want it.
2. Does the notes drawer need the elapsed clock, or is that over-building for a ten-minute talk?
