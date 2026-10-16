# Route Trace

A real run, drawn on a real city. Downtown Kansas City's streets as the
dot-matrix grid `street-pulse` already draws, and over them one route — the
Bracket Bear Run Club's SEGD 2026 run from the Marriott Downtown to the
Liberty Memorial and back — tracing itself at a runner's constant pace, then
holding. Click, and it runs again.

It lives in the lab's `work` section beside `street-pulse`, not on the `toys`
shelf: it is a piece about a specific morning, not a system to play with. Of
the toy rubric in [`docs/lab/TOY-IDEAS.md`](../../lab/TOY-IDEAS.md) only the
first two questions apply, and it clears both. The subject is a run people
are being invited to. It is legible in three seconds because everyone has
watched a route draw itself on a phone.

## Why it exists

The run club's LinkedIn post, flyer and `/run` page carry a still of this
map, rendered from a throwaway prototype on 2026-10-15. The still is the
right picture; the page should have the moving version, and the lab should
hold the piece so the next event — Portland, Pittsburgh, a different
conference — is a data change, not a rebuild.

## What already exists

- `packages/flateralus-pixi-animations/src/street-pulse/` — the dot-matrix
  street renderer. Boot: road cells plot on in shuffled order over 1.6 s.
  Base layer at alpha 0.42 tinted `PAL.bright`; glow passes in `PAL.rust`.
- `shared/city-data.ts` — baked grids `pgh14`, `pdx14`, `pgh16`, `pdx16`:
  192×192 cells, run-length encoded rows of `. R W B G`, with `center` as
  `[lat, lon]`. No script in the repo produced them.
- `shared/city-view.ts` — `cityGrid(city, z16)` hardcoded to `pgh`/`pdx`, and
  `fitGrid(w, h, g)` which squares the whole grid at 95% of the short side.
- `apps/bracketbear-website/src/components/lab/registry.ts` — the ordered
  `REGISTRY`; `registry.test.ts` lists expected ids.
- `apps/bracketbear-website/src/components/talk/TalkRunner.tsx` — mounts a
  registry animation into a `PixiApplication` on a standalone page. The
  pattern `/run` will follow.
- `apps/bracketbear-website/src/pages/run.astro` — the event page, currently
  showing `public/run/map.png`, a static render of exactly this data.

## Data

Two additions to `shared/`, and the script that makes them.

### `kc14` in `city-data.ts`

A fifth grid in the existing format. 192×192 cells at 22 m per cell, a
4.2 km square centred on `[39.0935, -94.5860]`, which puts the Marriott near
the top and the Memorial near the bottom with the river in frame. Classes:
`R` for `highway` in {motorway, trunk, primary, secondary, tertiary,
residential, unclassified, living_street, pedestrian, and their `_link`s};
`W` for `natural=water` ways and multipolygon relations; `G` for
`leisure` ∈ {park, garden, pitch} and `landuse` ∈ {grass, recreation_ground,
cemetery}. No `B`: at 22 m downtown, building footprints fill most cells and
the grid stops reading as streets. Precedence `R` > `W` > `G` > `.`.

`CityGridId` gains `'kc14'`; `CityId` in `city-view.ts` gains `'kc'`;
`cityGrid()` stops special-casing two cities and builds the id from the
argument.

### `shared/routes.ts`

```ts
export interface BakedRoute {
  id: string; // 'kc-segd-2026'
  grid: CityGridId; // 'kc14'
  name: string; // 'Marriott → Liberty Memorial'
  km: number; // 5.49
  /** Polyline in grid cell coordinates, fractional, same frame as the grid. */
  points: [number, number][];
  /** Index into points for the furthest point from the start; the turnaround. */
  turn: number;
}
export const ROUTES: Record<string, BakedRoute>;
```

One route to begin with. Points come from Valhalla's pedestrian costing
through four waypoints (Marriott 200 W 12th St → Union Station → Liberty
Memorial → Marriott), 344 points, 5.49 km. Stored as cell coordinates so the
animation never touches lat/lon.

### `scripts/bake-city.mjs`

Node, no dependencies, in `packages/flateralus-pixi-animations/scripts/`.
Takes `--center lat,lon --cell 22 --id kc14` and optional
`--route id --waypoints lat,lon;lat,lon;…`. Fetches Overpass (streets, water,
parks) and Valhalla (`costing: pedestrian`), rasterises as above, and prints
the TypeScript for the grid entry and the route entry to paste into the two
data files. It is run by hand, once per city or route, and its output is
committed; nothing fetches at runtime. The prototype's Python version is the
reference for the rasteriser: segments stamped every 0.25 cell, polygons by
even-odd point-in-polygon at cell centres, multipolygon outers chained end to
end.

Map data is © OpenStreetMap contributors (ODbL). The `/run` page footer and
the lab blurb carry that line.

## The animation: `route-trace`

`packages/flateralus-pixi-animations/src/route-trace/routeTraceAnimation.ts`,
a `PixiAnimation` built the way `street-pulse` is, sharing `scrim`,
`cityGridData`, and the cell-rect drawing.

### Manifest

| control | type    | default        | notes                                    |
| ------- | ------- | -------------- | ---------------------------------------- |
| `route` | select  | `kc-segd-2026` | one option per entry in `ROUTES`; resets |
| `trace` | number  | 4 s, 1–12      | time for the route to draw, start to end |
| `hold`  | number  | 3 s, 0–10      | pause at the end before looping          |
| `loop`  | boolean | true           | false: trace once and hold forever       |
| `glow`  | boolean | true           |                                          |
| `fit`   | select  | `contain`      | `contain` / `cover`, see Framing; resets |
| `scrim` | boolean | true           | the lab's ink wash; `/run` turns it off  |

`route`, `fit` and `scrim` are `resetsAnimation`; the rest update in place.
Changing `trace` mid-trace does not move the drawn prefix: progress is
stored as a fraction of the route and advanced by `dt / trace`, not derived
from elapsed time.

### Framing

`fitGrid` frames the whole grid; this piece frames the route.
`fitRoute(w, h, route, pad)` in `city-view.ts`: the route's bounding box in
cells, padded by 12 cells each side, fitted into the stage preserving aspect
(`contain`: whole padded box visible; `cover`: box fills the stage, edges
cropped). Returns the same `{k, ox, oy}` shape as `fitGrid`, so the cell-rect
code is unchanged. Cells that fall off stage are culled exactly as
`street-pulse` culls them. At 1200×1200 with this route, `contain` gives
k ≈ 9.4 px per cell, which is the still everyone has seen.

### Phases

1. **Boot** (0 → 1.6 s): road cells plot on in shuffled order, as
   `street-pulse` does; water and green cells come up with them at their own
   alphas (0.12 cyan-ish for `W`, 0.08 for `G`). Ease-out on the plotted
   fraction, `cubic-bezier(0.23, 1, 0.32, 1)` evaluated by hand.
2. **Trace** (boot end → +`trace` s): the route draws from its start at
   constant arc-length speed. Linear, because a run is constant motion and
   an easing here would read as the runner speeding up. Three strokes per
   frame over the drawn prefix: glow at 1.9 cells `PAL.rust` α 0.5 (skipped
   when `glow` is off), mid at 0.95 cells `PAL.orange` α 0.55, line at 0.37
   cells `PAL.orange`. A `PAL.cream` head dot of 0.75 cells at the drawn end.
3. **Hold** (`hold` s): the finished route, no head dot. The start marker — a
   ring of 0.95 cells with a centre dot — is drawn from boot onward.
4. If `loop`, the route clears and phase 2 restarts; the streets stay.

The trace is redrawn each frame from the prefix (one `Graphics.clear()` and
three strokes, ~350 points): cheap enough that there is no reason to cache.

### Pointer

A click anywhere restarts the trace from the start. Cursor heat on nearby
road cells is carried over from `street-pulse` unchanged; it is the one
thing that makes the piece feel live while the route holds.

### Reduced motion

The animation reads `prefersReducedMotion()` from `shared/reduced-motion.ts`
in `onInit`, the way `frost-line` does, and when it is set it skips boot and
trace: the first frame is the finished route. A click still replays the
trace, because the viewer asked for that motion. There is no control for
this; the manifest schema has no notion of a hidden control, and the host
has nothing to set.

### Labels

None in the animation. "Marriott · start" and "Liberty Memorial" are the
page's job, as HTML, because the lab has no guarantee of the mono face and a
`PIXI.Text` in a fallback font would be worse than nothing. The animation
exposes nothing for label placement; the page captions the map rather than
annotating it.

## Lab registration

- `src/route-trace/index.ts` re-export; `export * from './route-trace'` in
  the package `index.ts`.
- A `LabEntry` after `street-pulse` in `REGISTRY`: section `work`, name
  "Route Trace", tag `osm data`, blurb naming Kansas City and the Memorial.
- `route-trace` added to the expected ids in `registry.test.ts`.

## `/run` mounts it

`apps/bracketbear-website/src/components/run/RunMap.tsx`, a React island
mounted `client:only="react"` where `run.astro` now has the `<img>`:

- Same construction as `TalkRunner`: `new PixiApplication({config: {autoResize:
true, backgroundAlpha: 0, antialias: true}})`, `init(host)`, `start()`,
  `applyTheme('sunset')`, registry lookup by id, `setPointerService`,
  `setAnimation`.
- Controls: `{ route: 'kc-segd-2026', loop: false, fit: 'contain', scrim:
false }`. On the page it traces once and holds; a click replays it.
- The host is an aspect-ratio box (`9 / 11`, matching the still) so nothing
  shifts when the canvas arrives. The box holds `public/run/map.png` as plain
  server-rendered HTML, so it is there before hydration and without
  JavaScript; the island fades it out once the canvas has drawn a frame. The
  still stays the OG image.
- Captions "Marriott · start" and "Liberty Memorial · turn" sit under the
  box as HTML.
- Footer gains "Map data © OpenStreetMap contributors."

## Testing

Vitest, beside the existing package and lab tests:

- `city-data`: `kc14` decodes to 192×192; cell counts match the bake
  (10,769 `R`, 338 `W`, 3,582 `G`, no `B`); `cityGrid('kc')` returns it.
- `routes`: `kc-segd-2026` has ≥ 300 points, all inside the grid, starts and
  ends within 2 cells of each other, `km` within 5–6, `turn` is the
  farthest point.
- `fitRoute`: for a 1200×1200 stage and this route, `contain` yields
  k ≈ 9.4 ± 0.2; `cover` yields k larger than `contain`; both keep the route
  bbox centred.
- `route-trace`: under reduced motion the state starts finished; otherwise
  progress at t = boot + `trace`/2 is 0.5 and the prefix's arc length is half
  the route's ± one segment; a click resets progress to 0; a `trace` change
  mid-trace leaves progress where it is; `hold: 0` with `loop` restarts
  without sticking; a route with repeated consecutive points produces no NaN.
- `registry.test.ts` picks up the new id.
- `astro build` passes and `/run/index.html` is emitted; the existing
  `talk-smoke.mjs` pattern is not extended — the island's mount is covered by
  the registry test and a manual look.

## Risks

**Dots versus legibility at phone width.** This is the rubric's "does it
fight itself." At 390 px wide, `contain` gives k ≈ 2.9 px per cell; the
0.76-cell road rects become ~2 px and the grid reads as noise behind the
route. Below k = 3.5 the base alpha drops linearly from 0.42 toward 0.22 at
k = 2, so the streets recede and the route carries the frame. The still on
the current page has the same problem and solves it the same way, by being
small. If that is not enough on a real phone, the fallback is `cover` on
narrow stages, which trades the river for bigger dots.

**Boot plus trace is seven seconds of looking.** On the lab stage that is
fine. On `/run` it is the first thing on the page, so the island mounts with
`loop: false`, and the still is visible until the first frame, which means a
visitor never waits on an empty box.

**Valhalla's "walkway" legs.** The out leg uses pedestrian walkways near
Crown Center, which is probably the Link skywalk, and the Memorial approach
ends on stairs. The data is honest about what the router chose; whether the
group runs exactly that is the lobby's call. The spec does not hand-edit the
route.

## Out of scope

GPX import, live routing, moving the start, more than one route per grid,
and anything on the `toys` shelf. The bake script makes a second city or
route a data change; this spec ships one.
