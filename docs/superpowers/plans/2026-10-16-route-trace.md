# Route Trace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `route-trace` flateralus animation that draws the Bracket Bear Run Club's Kansas City run over baked OpenStreetMap streets, registered in the lab's `work` section beside `street-pulse` and mounted on `/run` in place of the static map image.

**Architecture:** A Node bake script turns Overpass and Valhalla responses into two data entries, a `kc14` grid in `city-data.ts` and a `kc-segd-2026` route in a new `routes.ts`, both committed, nothing fetched at runtime. A pure module `route-trace/trace.ts` holds the phase state machine (boot → trace → hold → loop), the arc-length prefix, the ease curve and the phone-width alpha rule, and is the only thing the tests run. `routeTraceAnimation.ts` is a thin PIXI renderer over it, built the way `streetPulseAnimation.ts` is. A React island `RunMap.tsx` mounts the registry entry on `/run` over the server-rendered still.

**Tech Stack:** TypeScript, PIXI v8 (`Graphics` rects and strokes, no shaders), Node 22 (`fetch`, no dependencies) for the bake, vitest at the repo root, Astro 7 + `@astrojs/react` for the page.

**Spec:** `docs/superpowers/specs/2026-10-15-route-trace-design.md`

## Global Constraints

- Package manager is npm. There is no `pnpm` on PATH. Vitest runs from the repo root: `npx vitest run <path>`.
- `@bracketbear/flateralus-pixi-animations` resolves to its `dist/` in the website (the package's `main` is `dist/index.js`). Rebuild it before any website test or build that must see new exports: `npm run build --workspace=@bracketbear/flateralus-pixi-animations`.
- Astro builds from the app dir with `node_modules/.bin/astro build` (`cd apps/bracketbear-website` first). The `prebuild` script is not needed for a check.
- Palette only through `PAL` from `@bracketbear/flateralus`: `PAL.orange`, `PAL.bright`, `PAL.rust`, `PAL.sun`, `PAL.cream`, `PAL.cyan`, `PAL.ink2`. No literal brand hex in the animation.
- Grid format is the existing one: 192×192, rows run-length encoded as `<count><char>` with chars `. R W B G`, decoded by `/(\d+)([RWBG.])/g`. `kc14` has no `B` cells.
- Route points are grid cell coordinates (fractional), never lat/lon, in the same frame as the grid: cell `(x, y)` covers stage pixels `ox + x·k .. ox + (x+1)·k`.
- Timing: boot 1.6 s with ease `cubic-bezier(0.23, 1, 0.32, 1)`; trace default 4 s (1–12) linear; hold default 3 s (0–10); loop default true.
- Strokes, in cells: glow 1.9 `PAL.rust` α 0.5; mid 0.95 `PAL.orange` α 0.55; line 0.37 `PAL.orange` α 1; head dot diameter 0.75 `PAL.cream` α 0.75; start ring diameter 0.95 with a centre dot.
- Base road alpha is 0.42 at k ≥ 3.5 and falls linearly to 0.22 at k = 2, clamped below.
- Map data is © OpenStreetMap contributors (ODbL). The `/run` footer already carries that line; the lab blurb must too.
- Every lab control is `debug: true`. `route`, `fit` and `scrim` are `resetsAnimation: true`.
- No labels or text inside the animation. Captions are HTML on the page.
- Commit after every task, messages in the repo's voice (`feat(route-trace): …`, `test(route-trace): …`, `data(city): …`). The pre-commit hook runs lint-staged (prettier); it restages what it formats.
- The three `/run` page files are untracked on the branch (`apps/bracketbear-website/public/run/`, `src/pages/run.astro`, `src/styles/run.css`). Task 7 commits them with the island; nothing before that touches them.

## Review Focus

1. **A `trace` change while the route is half drawn.** A reasonable person expects the line to keep going from where it is, not jump. Pinned in Task 4 (`stepTrace` keeps `progress` when `trace` changes).
2. **Repeated consecutive route points.** Valhalla legs share their join point, so the route has zero-length segments. Interpolating inside one divides by zero and the head dot vanishes to NaN. Pinned in Task 4 (`prefixAt` on a route with a duplicated point has no NaN).
3. **`hold: 0` with `loop` on.** The hold phase must hand straight back to trace rather than wait for a frame that never satisfies `t >= hold`. Pinned in Task 4.
4. **A very wide stage** (the lab stage is landscape; the route is 4× taller than wide). `contain` must take k from the height and leave the route centred, and `cover` must take it from the width. Pinned in Task 3 (`fitRoute` at 2000×400).
5. **Clicks nobody consumes.** `PointerService.clicks` is a shared queue; an animation that reads it without shifting leaves clicks for the next animation on the stage. Pinned in Task 5 (after one update the queue is empty).

---

### Task 1: The bake library, tested

The rasteriser and encoders as pure functions in an `.mjs` module, so the CLI in Task 2 is only argument parsing and two fetches. The Python prototype (`stamp every 0.25 cell`, even-odd point-in-polygon at cell centres, multipolygon outers chained end to end) is the reference behaviour.

**Files:**

- Create: `packages/flateralus-pixi-animations/scripts/bake-lib.mjs`
- Test: `packages/flateralus-pixi-animations/scripts/bake-lib.test.mjs`

**Interfaces:**

- Produces (all exported from `bake-lib.mjs`):
  - `LAND = 0, ROAD = 1, WATER = 2, GREEN = 4` and `CH = { 0: '.', 1: 'R', 2: 'W', 4: 'G' }`
  - `ROAD_CLASSES: Set<string>`
  - `makeProjector({ lat, lon, cell, g }) => (lat, lon) => [x, y]` — equirectangular, metres per degree at the centre latitude, cell `g/2, g/2` at the centre
  - `stampLine(cells, g, pts, code)` — `pts: [x, y][]` in cell coords
  - `fillPoly(cells, g, poly, code, onlyLand = true)`
  - `chainRings(wayIds, ways) => number[][]` — node-id rings
  - `decodePolyline6(str) => [lat, lon][]`
  - `encodeRows(cells, g) => string[]`
  - `turnIndex(points) => number`
  - `rasterize(overpass, proj, g) => Uint8Array` — the whole Overpass JSON → cells
  - `routeFromValhalla(trip, proj) => { points: [number, number][], km: number }`
  - `countCells(cells) => Record<string, number>` keyed by `CH`
  - `renderGridTs(id, center, rows) => string` and `renderRouteTs(route) => string`

- [ ] **Step 1: Write the failing tests**

```js
// packages/flateralus-pixi-animations/scripts/bake-lib.test.mjs
import { describe, it, expect } from 'vitest';
import {
  LAND,
  ROAD,
  WATER,
  GREEN,
  makeProjector,
  stampLine,
  fillPoly,
  chainRings,
  decodePolyline6,
  encodeRows,
  turnIndex,
  rasterize,
  countCells,
} from './bake-lib.mjs';

const G = 16;
const grid = () => new Uint8Array(G * G).fill(LAND);

describe('bake-lib', () => {
  it('projects the centre to the middle cell and east to +x, south to +y', () => {
    const proj = makeProjector({ lat: 39.0935, lon: -94.586, cell: 22, g: G });
    const [cx, cy] = proj(39.0935, -94.586);
    expect(cx).toBeCloseTo(G / 2, 6);
    expect(cy).toBeCloseTo(G / 2, 6);
    const [ex, ey] = proj(39.0935, -94.585);
    expect(ex).toBeGreaterThan(cx);
    expect(ey).toBeCloseTo(cy, 6);
    const [sx, sy] = proj(39.0925, -94.586);
    expect(sx).toBeCloseTo(cx, 6);
    expect(sy).toBeGreaterThan(cy);
  });

  it('stamps every cell a segment crosses, including a diagonal', () => {
    const c = grid();
    stampLine(
      c,
      G,
      [
        [0.5, 0.5],
        [5.5, 5.5],
      ],
      ROAD
    );
    for (let i = 0; i <= 5; i++) expect(c[i * G + i]).toBe(ROAD);
    expect(c[6 * G + 6]).toBe(LAND);
  });

  it('ignores stamps that fall outside the grid', () => {
    const c = grid();
    stampLine(
      c,
      G,
      [
        [-3, 2],
        [2, -3],
      ],
      ROAD
    );
    expect(c.every((v) => v === LAND)).toBe(true);
  });

  it('fills a square polygon on land only, and roads win over water', () => {
    const c = grid();
    stampLine(
      c,
      G,
      [
        [2.5, 0.5],
        [2.5, 7.5],
      ],
      ROAD
    );
    fillPoly(
      c,
      G,
      [
        [1, 1],
        [6, 1],
        [6, 6],
        [1, 6],
      ],
      WATER
    );
    expect(c[3 * G + 4]).toBe(WATER);
    expect(c[3 * G + 2]).toBe(ROAD);
    expect(c[0]).toBe(LAND);
    expect(c[7 * G + 7]).toBe(LAND);
  });

  it('chains multipolygon outer ways into one closed ring', () => {
    const ways = {
      1: { nodes: [10, 11, 12] },
      2: { nodes: [14, 13, 12] },
      3: { nodes: [14, 15, 10] },
    };
    const rings = chainRings([1, 2, 3], ways);
    expect(rings).toHaveLength(1);
    expect(rings[0][0]).toBe(rings[0][rings[0].length - 1]);
    expect(new Set(rings[0]).size).toBe(6);
  });

  it('decodes a polyline6 shape', () => {
    // Two points: (38.5, -120.2) then (40.7, -120.95), encoded at 1e6.
    const s = decodePolyline6('_p~iF~ps|U_ulLnnqC');
    expect(s).toHaveLength(2);
    // The classic Google example is 1e5; at 1e6 the same string is 10x smaller.
    expect(s[0][0]).toBeCloseTo(3.85, 4);
    expect(s[0][1]).toBeCloseTo(-12.02, 4);
    expect(s[1][0]).toBeCloseTo(4.07, 4);
    expect(s[1][1]).toBeCloseTo(-12.095, 4);
  });

  it('run-length encodes rows in the city-data format', () => {
    const c = grid();
    c[0] = ROAD;
    c[1] = ROAD;
    c[5] = WATER;
    c[G - 1] = GREEN;
    const rows = encodeRows(c, G);
    expect(rows).toHaveLength(G);
    expect(rows[0]).toBe('2R3.1W9.1G');
    expect(rows[1]).toBe('16.');
    // Every row decodes back to G cells with city-data's regex.
    for (const row of rows) {
      let n = 0;
      for (const m of row.matchAll(/(\d+)([RWBG.])/g)) n += +m[1];
      expect(n).toBe(G);
    }
  });

  it('finds the turnaround as the point farthest from the start', () => {
    expect(
      turnIndex([
        [0, 0],
        [1, 1],
        [5, 9],
        [2, 2],
        [0, 0],
      ])
    ).toBe(2);
  });

  it('rasterises an Overpass payload with the spec classes and precedence', () => {
    // Nodes carry cell coordinates directly: x in lon, y in lat, and the
    // projector just swaps them back.
    const proj = (lat, lon) => [lon, lat];
    const node = (id, x, y) => ({ type: 'node', id, lat: y, lon: x });
    const overpass = {
      elements: [
        node(1, 1, 1),
        node(2, 6, 1),
        node(3, 6, 6),
        node(4, 1, 6),
        node(5, 2, 0.5),
        node(6, 2, 7.5),
        node(7, 8, 8),
        node(8, 12, 8),
        node(9, 12, 12),
        node(10, 8, 12),
        node(11, 0, 14),
        node(12, 15, 14),
        {
          type: 'way',
          id: 100,
          nodes: [1, 2, 3, 4, 1],
          tags: { natural: 'water' },
        },
        {
          type: 'way',
          id: 101,
          nodes: [5, 6],
          tags: { highway: 'residential' },
        },
        {
          type: 'way',
          id: 102,
          nodes: [7, 8, 9, 10, 7],
          tags: { leisure: 'park' },
        },
        { type: 'way', id: 103, nodes: [11, 12], tags: { highway: 'footway' } },
        { type: 'way', id: 104, nodes: [11, 12], tags: { building: 'yes' } },
      ],
    };
    const cells = rasterize(overpass, proj, G);
    const n = countCells(cells);
    expect(cells[3 * G + 4]).toBe(WATER);
    expect(cells[3 * G + 2]).toBe(ROAD);
    expect(cells[9 * G + 9]).toBe(GREEN);
    // footway is not a road class; buildings are not baked.
    expect(cells[14 * G + 5]).toBe(LAND);
    expect(n.B ?? 0).toBe(0);
    expect(n.R).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run from the repo root: `npx vitest run packages/flateralus-pixi-animations/scripts/bake-lib.test.mjs`
Expected: FAIL — `Failed to load ./bake-lib.mjs`.

- [ ] **Step 3: Write the library**

```js
// packages/flateralus-pixi-animations/scripts/bake-lib.mjs
/**
 * Rasterising OpenStreetMap geometry into the city-data grid format, and a
 * routed polyline into grid coordinates. Pure functions; the CLI in
 * bake-city.mjs does the fetching. Mirrors the Python prototype that baked
 * the Kansas City still: segments stamped every 0.25 cell, polygons by
 * even-odd point-in-polygon at cell centres, multipolygon outers chained
 * end to end, roads stamped last so they win.
 */

export const LAND = 0;
export const ROAD = 1;
export const WATER = 2;
export const GREEN = 4;
export const CH = { [LAND]: '.', [ROAD]: 'R', [WATER]: 'W', [GREEN]: 'G' };

export const ROAD_CLASSES = new Set([
  'motorway',
  'trunk',
  'primary',
  'secondary',
  'tertiary',
  'residential',
  'unclassified',
  'living_street',
  'pedestrian',
  'motorway_link',
  'trunk_link',
  'primary_link',
  'secondary_link',
  'tertiary_link',
]);
const GREEN_LEISURE = new Set(['park', 'garden', 'pitch']);
const GREEN_LANDUSE = new Set(['grass', 'recreation_ground', 'cemetery']);

/** Equirectangular projection to cell coordinates, centre at (g/2, g/2). */
export function makeProjector({ lat, lon, cell, g }) {
  const mx = 111320 * Math.cos((lat * Math.PI) / 180);
  const my = 110574;
  return (la, lo) => [
    ((lo - lon) * mx) / cell + g / 2,
    (-(la - lat) * my) / cell + g / 2,
  ];
}

export function stampLine(cells, g, pts, code) {
  for (let s = 0; s + 1 < pts.length; s++) {
    const [x0, y0] = pts[s];
    const [x1, y1] = pts[s + 1];
    const n = Math.max(1, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 0.25));
    for (let i = 0; i <= n; i++) {
      const cx = Math.floor(x0 + ((x1 - x0) * i) / n);
      const cy = Math.floor(y0 + ((y1 - y0) * i) / n);
      if (cx >= 0 && cx < g && cy >= 0 && cy < g) cells[cy * g + cx] = code;
    }
  }
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi
    )
      inside = !inside;
  }
  return inside;
}

export function fillPoly(cells, g, poly, code, onlyLand = true) {
  if (poly.length < 3) return;
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const y0 = Math.max(0, Math.floor(Math.min(...ys)));
  const y1 = Math.min(g, Math.floor(Math.max(...ys)) + 1);
  const x0 = Math.max(0, Math.floor(Math.min(...xs)));
  const x1 = Math.min(g, Math.floor(Math.max(...xs)) + 1);
  for (let cy = y0; cy < y1; cy++) {
    for (let cx = x0; cx < x1; cx++) {
      const i = cy * g + cx;
      if (onlyLand && cells[i] !== LAND) continue;
      if (pointInPoly(cx + 0.5, cy + 0.5, poly)) cells[i] = code;
    }
  }
}

/** Join member ways end to end into closed rings of node ids. */
export function chainRings(wayIds, ways) {
  const segs = wayIds.filter((w) => ways[w]).map((w) => ways[w].nodes.slice());
  const rings = [];
  while (segs.length) {
    let ring = segs.pop();
    let changed = true;
    while (changed && ring[0] !== ring[ring.length - 1]) {
      changed = false;
      for (let k = 0; k < segs.length; k++) {
        const s = segs[k];
        const head = ring[0];
        const tail = ring[ring.length - 1];
        if (s[0] === tail) ring = ring.concat(s.slice(1));
        else if (s[s.length - 1] === tail)
          ring = ring.concat(s.slice(0, -1).reverse());
        else if (s[s.length - 1] === head) ring = s.slice(0, -1).concat(ring);
        else if (s[0] === head) ring = s.slice(1).reverse().concat(ring);
        else continue;
        segs.splice(k, 1);
        changed = true;
        break;
      }
    }
    rings.push(ring);
  }
  return rings;
}

/** Valhalla shapes are Google polylines at 1e6 precision. */
export function decodePolyline6(str) {
  const out = [];
  let i = 0;
  let lat = 0;
  let lon = 0;
  while (i < str.length) {
    for (const which of [0, 1]) {
      let res = 0;
      let sh = 0;
      let b;
      do {
        b = str.charCodeAt(i++) - 63;
        res |= (b & 0x1f) << sh;
        sh += 5;
      } while (b >= 0x20);
      const d = res & 1 ? ~(res >> 1) : res >> 1;
      if (which === 0) lat += d;
      else lon += d;
    }
    out.push([lat / 1e6, lon / 1e6]);
  }
  return out;
}

export function encodeRows(cells, g) {
  const rows = [];
  for (let y = 0; y < g; y++) {
    let s = '';
    let run = 1;
    for (let x = 1; x <= g; x++) {
      if (x < g && cells[y * g + x] === cells[y * g + x - 1]) run++;
      else {
        s += `${run}${CH[cells[y * g + x - 1]]}`;
        run = 1;
      }
    }
    rows.push(s);
  }
  return rows;
}

export function turnIndex(points) {
  const [sx, sy] = points[0];
  let best = 0;
  let bd = -1;
  points.forEach(([x, y], i) => {
    const d = (x - sx) ** 2 + (y - sy) ** 2;
    if (d > bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

export function countCells(cells) {
  const n = {};
  for (const c of cells) n[CH[c]] = (n[CH[c]] ?? 0) + 1;
  return n;
}

/** Water and green first, on land only; roads stamped last so they win. */
export function rasterize(overpass, proj, g) {
  const cells = new Uint8Array(g * g).fill(LAND);
  const nodes = new Map();
  const ways = {};
  const rels = [];
  for (const e of overpass.elements) {
    if (e.type === 'node') nodes.set(e.id, [e.lat, e.lon]);
    else if (e.type === 'way') ways[e.id] = e;
    else if (e.type === 'relation') rels.push(e);
  }
  const pts = (ids) =>
    ids.filter((n) => nodes.has(n)).map((n) => proj(...nodes.get(n)));

  for (const r of rels) {
    const t = r.tags ?? {};
    if (t.natural === 'water' || (t.type === 'multipolygon' && t.water)) {
      const outers = (r.members ?? [])
        .filter((m) => m.type === 'way' && (m.role === 'outer' || !m.role))
        .map((m) => m.ref);
      for (const ring of chainRings(outers, ways))
        fillPoly(cells, g, pts(ring), WATER);
    }
  }
  for (const w of Object.values(ways)) {
    const t = w.tags ?? {};
    if (t.natural === 'water' || t.waterway === 'riverbank')
      fillPoly(cells, g, pts(w.nodes), WATER);
  }
  for (const w of Object.values(ways)) {
    const t = w.tags ?? {};
    if (GREEN_LEISURE.has(t.leisure) || GREEN_LANDUSE.has(t.landuse))
      fillPoly(cells, g, pts(w.nodes), GREEN);
  }
  for (const w of Object.values(ways)) {
    if (ROAD_CLASSES.has(w.tags?.highway))
      stampLine(cells, g, pts(w.nodes), ROAD);
  }
  return cells;
}

/** Concatenate the legs' shapes, dropping each leg's repeated first point. */
export function routeFromValhalla(trip, proj) {
  let ll = [];
  for (const leg of trip.legs) {
    const s = decodePolyline6(leg.shape);
    ll = ll.concat(ll.length ? s.slice(1) : s);
  }
  const points = ll.map(([la, lo]) => {
    const [x, y] = proj(la, lo);
    return [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
  });
  return { points, km: trip.summary.length };
}

export function renderGridTs(id, center, rows) {
  const body = rows.map((r) => `      '${r}',`).join('\n');
  return `  ${id}: {\n    g: ${rows.length},\n    z: 14,\n    center: [${center[0]}, ${center[1]}],\n    rows: [\n${body}\n    ],\n  },\n`;
}

export function renderRouteTs({ id, grid, name, km, points }) {
  const turn = turnIndex(points);
  const pts = points.map(([x, y]) => `[${x}, ${y}]`).join(', ');
  return `  '${id}': {\n    id: '${id}',\n    grid: '${grid}',\n    name: '${name}',\n    km: ${Math.round(km * 100) / 100},\n    turn: ${turn},\n    points: [${pts}],\n  },\n`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run packages/flateralus-pixi-animations/scripts/bake-lib.test.mjs`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/flateralus-pixi-animations/scripts/bake-lib.mjs packages/flateralus-pixi-animations/scripts/bake-lib.test.mjs
git commit -m "feat(city): a rasteriser for baking OSM geometry into the city grid format, with the route alongside"
```

---

### Task 2: The bake CLI, run once; `kc14` and `kc-segd-2026` committed

**Files:**

- Create: `packages/flateralus-pixi-animations/scripts/bake-city.mjs`
- Create: `packages/flateralus-pixi-animations/src/shared/routes.ts`
- Modify: `packages/flateralus-pixi-animations/src/shared/city-data.ts` (the `CityGridId` union at line 36; a new entry at the end of `GRIDS` after `pdx16`, before the closing `};` at line 843; one new export)
- Test: `packages/flateralus-pixi-animations/src/shared/city-data.test.ts`
- Test: `packages/flateralus-pixi-animations/src/shared/routes.test.ts`

**Interfaces:**

- Consumes: everything in `bake-lib.mjs` from Task 1.
- Produces:
  - `CityGridId` gains `'kc14'`; `cityGridData('kc14')` returns it.
  - `export function hasCityGrid(id: string): id is CityGridId` in `city-data.ts`.
  - `routes.ts`: `interface BakedRoute { id: string; grid: CityGridId; name: string; km: number; points: [number, number][]; turn: number }`, `ROUTES: Record<string, BakedRoute>`, `ROUTE_IDS: string[]` (insertion order).

- [ ] **Step 1: Write the CLI**

```js
#!/usr/bin/env node
// packages/flateralus-pixi-animations/scripts/bake-city.mjs
/**
 * Bake a city grid, and optionally a route over it, from OpenStreetMap.
 *
 *   node scripts/bake-city.mjs --id kc14 --center 39.0935,-94.5860 --cell 22 \
 *     --route kc-segd-2026 --name "Marriott → Liberty Memorial" \
 *     --waypoints "39.1006,-94.5862;39.0845,-94.5855;39.0805,-94.5860;39.1006,-94.5862" \
 *     --cache /path/to/dir > out.ts
 *
 * Prints TypeScript for the grid entry (paste into GRIDS in city-data.ts)
 * and the route entry (paste into ROUTES in routes.ts); counts go to
 * stderr. Run by hand, once per city or route; the output is committed and
 * nothing fetches at runtime. --cache saves the raw responses so a re-run
 * does not hit the services again. Map data © OpenStreetMap contributors.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  makeProjector,
  rasterize,
  encodeRows,
  countCells,
  routeFromValhalla,
  renderGridTs,
  renderRouteTs,
} from './bake-lib.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] ?? 'true']);
    return acc;
  }, [])
);
const need = (k) => {
  if (!args[k]) {
    console.error(`missing --${k}`);
    process.exit(2);
  }
  return args[k];
};

const id = need('id');
const [lat, lon] = need('center').split(',').map(Number);
const cell = Number(args.cell ?? 22);
const g = Number(args.g ?? 192);
const overpassUrl =
  args['overpass-url'] ?? 'https://overpass.kumi.systems/api/interpreter';
const valhallaUrl =
  args['valhalla-url'] ?? 'https://valhalla1.openstreetmap.de/route';
const cache = args.cache;

async function cached(name, fetchIt) {
  const file = cache ? join(cache, name) : null;
  if (file && existsSync(file)) return JSON.parse(await readFile(file, 'utf8'));
  const data = await fetchIt();
  if (file) {
    await mkdir(cache, { recursive: true });
    await writeFile(file, JSON.stringify(data));
  }
  return data;
}

// Half-extent of the square in degrees, with a one-cell margin.
const half = (g / 2 + 1) * cell;
const dLat = half / 110574;
const dLon = half / (111320 * Math.cos((lat * Math.PI) / 180));
const bbox = `${lat - dLat},${lon - dLon},${lat + dLat},${lon + dLon}`;
const query = `[out:json][timeout:120];
(
  way["highway"](${bbox});
  way["natural"="water"](${bbox});
  way["waterway"="riverbank"](${bbox});
  relation["natural"="water"](${bbox});
  way["leisure"~"^(park|garden|pitch)$"](${bbox});
  way["landuse"~"^(grass|recreation_ground|cemetery)$"](${bbox});
);
(._;>;);
out body;`;

const overpass = await cached(`${id}.overpass.json`, async () => {
  const r = await fetch(overpassUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!r.ok) throw new Error(`overpass ${r.status}`);
  return r.json();
});

const proj = makeProjector({ lat, lon, cell, g });
const cells = rasterize(overpass, proj, g);
const rows = encodeRows(cells, g);
console.error(`${id}: ${JSON.stringify(countCells(cells))}`);
process.stdout.write(renderGridTs(id, [lat, lon], rows));

if (args.route) {
  const waypoints = need('waypoints')
    .split(';')
    .map((p) => p.split(',').map(Number))
    .map(([la, lo]) => ({ lat: la, lon: lo }));
  const valhalla = await cached(`${args.route}.valhalla.json`, async () => {
    const r = await fetch(valhallaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations: waypoints,
        costing: 'pedestrian',
        directions_options: { units: 'kilometers' },
      }),
    });
    if (!r.ok) throw new Error(`valhalla ${r.status}`);
    return r.json();
  });
  const { points, km } = routeFromValhalla(valhalla.trip, proj);
  console.error(`${args.route}: ${points.length} points, ${km} km`);
  process.stdout.write('\n');
  process.stdout.write(
    renderRouteTs({
      id: args.route,
      grid: id,
      name: args.name ?? args.route,
      km,
      points,
    })
  );
}
```

- [ ] **Step 2: Run the bake**

From `packages/flateralus-pixi-animations/`, with a cache dir in the scratchpad (not in the repo):

```bash
node scripts/bake-city.mjs --id kc14 --center 39.0935,-94.5860 --cell 22 \
  --route kc-segd-2026 --name "Marriott → Liberty Memorial" \
  --waypoints "39.1006,-94.5862;39.0845,-94.5855;39.0805,-94.5860;39.1006,-94.5862" \
  --cache "$SCRATCH/kc-bake" > "$SCRATCH/kc-bake/out.ts"
```

Expected on stderr, within a few percent of the October 15 prototype (OSM edits move the numbers slightly): `kc14: {".":22175,"R":10769,"G":3582,"W":338}` and `kc-segd-2026: 344 points, 5.491 km`. If overpass.kumi.systems is down, pass `--overpass-url https://overpass-api.de/api/interpreter` (it returned 406 to the prototype's client once; retry). Copy the printed counts and the point count: the tests in Step 4 use them.

If the prototype's raw responses still exist at `/private/tmp/claude-501/-Users-harrisoncallahan-Projects-bracketbear/3525ef64-ff06-46de-a000-0ba006f14fff/scratchpad/kc/overpass.json` and `valhalla2.json`, copy them into the cache dir as `kc14.overpass.json` and `kc-segd-2026.valhalla.json` first; then the bake reproduces the still exactly.

- [ ] **Step 3: Paste the data in**

In `city-data.ts`:

```ts
export type CityGridId = 'pgh14' | 'pdx14' | 'pgh16' | 'pdx16' | 'kc14';
```

Paste the `kc14: { … },` block from `out.ts` into `GRIDS` after the `pdx16` entry (before the `};` that closes `GRIDS`). Add a comment above it:

```ts
// Downtown Kansas City, baked by scripts/bake-city.mjs from Overpass at
// 22 m per cell (a 4.2 km square), not from tiles: z is nominal. No
// buildings — at this scale downtown footprints fill most cells and the
// grid stops reading as streets.
```

After the `cache` declaration add:

```ts
/** Whether a string names a baked grid, so callers can build ids safely. */
export function hasCityGrid(id: string): id is CityGridId {
  return id in GRIDS;
}
```

Create `routes.ts`:

```ts
// packages/flateralus-pixi-animations/src/shared/routes.ts
import type { CityGridId } from './city-data';

/**
 * Baked routes over the city grids. Points are grid cell coordinates in the
 * same frame as the grid, so an animation never touches lat/lon. Produced by
 * scripts/bake-city.mjs from Valhalla's pedestrian costing; committed data.
 * Map data © OpenStreetMap contributors.
 */
export interface BakedRoute {
  id: string;
  grid: CityGridId;
  name: string;
  km: number;
  /** Polyline in grid cell coordinates, fractional. */
  points: [number, number][];
  /** Index into points of the farthest point from the start; the turnaround. */
  turn: number;
}

export const ROUTES: Record<string, BakedRoute> = {
  // paste the 'kc-segd-2026': { … }, block from out.ts here
};

/** Route ids in declaration order; the first is the default. */
export const ROUTE_IDS = Object.keys(ROUTES);
```

Paste the route block in. Prettier will wrap the points array on commit; that is fine.

- [ ] **Step 4: Write the failing tests**

Extend `city-data.test.ts`: replace its import line with the one below, add `'kc14'` to the id list in the first test, and add two tests inside the describe. Replace the counts with the ones the bake printed.

```ts
import {
  cityGridData,
  hasCityGrid,
  BUILDING,
  GREEN,
  ROAD,
  WATER,
} from './city-data';

it('bakes Kansas City without buildings and with the counts the bake printed', () => {
  const g = cityGridData('kc14');
  const n = (code: number) => g.cells.filter((c) => c === code).length;
  expect(g.g).toBe(192);
  expect(g.center[0]).toBeCloseTo(39.0935, 3);
  expect(n(ROAD)).toBe(10769);
  expect(n(WATER)).toBe(338);
  expect(n(GREEN)).toBe(3582);
  expect(n(BUILDING)).toBe(0);
});

it('knows which ids are baked', () => {
  expect(hasCityGrid('kc14')).toBe(true);
  expect(hasCityGrid('kc16')).toBe(false);
});
```

Create `routes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ROUTES, ROUTE_IDS } from './routes';
import { cityGridData } from './city-data';

describe('routes', () => {
  const r = ROUTES['kc-segd-2026'];

  it('is the default route', () => {
    expect(ROUTE_IDS[0]).toBe('kc-segd-2026');
  });

  it('has a few hundred points, all inside its grid', () => {
    const g = cityGridData(r.grid);
    expect(r.points.length).toBeGreaterThanOrEqual(300);
    for (const [x, y] of r.points) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(g.g);
      expect(y).toBeLessThan(g.g);
    }
  });

  it('is an out-and-back of about five and a half kilometres', () => {
    const [sx, sy] = r.points[0];
    const [ex, ey] = r.points[r.points.length - 1];
    expect(Math.hypot(ex - sx, ey - sy)).toBeLessThan(2);
    expect(r.km).toBeGreaterThan(5);
    expect(r.km).toBeLessThan(6);
  });

  it('marks the farthest point as the turn', () => {
    const [sx, sy] = r.points[0];
    const d = (i: number) =>
      Math.hypot(r.points[i][0] - sx, r.points[i][1] - sy);
    const far = d(r.turn);
    for (let i = 0; i < r.points.length; i++)
      expect(d(i)).toBeLessThanOrEqual(far);
  });

  it('runs south: the turn is lower on the grid than the start', () => {
    expect(r.points[r.turn][1]).toBeGreaterThan(r.points[0][1] + 80);
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run packages/flateralus-pixi-animations/src/shared/city-data.test.ts packages/flateralus-pixi-animations/src/shared/routes.test.ts`
Expected: PASS (6 + 5). If the count assertions fail by a handful of cells, the live OSM data moved since the bake; use the numbers the bake printed, not the prototype's.

- [ ] **Step 6: Type-check the package**

Run from `packages/flateralus-pixi-animations/`: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/flateralus-pixi-animations/scripts/bake-city.mjs packages/flateralus-pixi-animations/src/shared/city-data.ts packages/flateralus-pixi-animations/src/shared/city-data.test.ts packages/flateralus-pixi-animations/src/shared/routes.ts packages/flateralus-pixi-animations/src/shared/routes.test.ts
git commit -m "data(city): downtown Kansas City at 22 m a cell, and the SEGD run from the Marriott to the Memorial"
```

---

### Task 3: `cityGrid` for three cities, and `fitRoute`

**Files:**

- Modify: `packages/flateralus-pixi-animations/src/shared/city-view.ts`
- Test: `packages/flateralus-pixi-animations/src/shared/city-view.test.ts` (new)

**Interfaces:**

- Consumes: `hasCityGrid`, `cityGridData` (Task 2); `ROUTES` (Task 2) in the test.
- Produces:
  - `type CityId = 'pgh' | 'pdx' | 'kc'`
  - `cityGrid(city: string, z16 = false): CityGridData` — throws `Error('no baked grid kc16')` for an unbaked id
  - `interface Frame { k: number; ox: number; oy: number }`; `GridFit extends Frame` (adds `S`)
  - `type RouteFit = 'contain' | 'cover'`
  - `fitRoute(w: number, h: number, points: readonly (readonly [number, number])[], fit: RouteFit = 'contain', pad = 12): Frame`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/flateralus-pixi-animations/src/shared/city-view.test.ts
import { describe, it, expect } from 'vitest';
import { cityGrid, fitGrid, fitRoute } from './city-view';
import { ROUTES } from './routes';

describe('cityGrid', () => {
  it('builds the id from the city and the zoom', () => {
    expect(cityGrid('pgh').g).toBe(192);
    expect(cityGrid('pdx', true).z).toBe(16);
    expect(cityGrid('kc').center[0]).toBeCloseTo(39.0935, 3);
  });

  it('falls back to Pittsburgh for an unknown city, as it always has', () => {
    expect(cityGrid('nowhere')).toBe(cityGrid('pgh'));
  });

  it('refuses a zoom nobody baked', () => {
    expect(() => cityGrid('kc', true)).toThrow(/kc16/);
  });
});

describe('fitRoute', () => {
  const route = ROUTES['kc-segd-2026'].points;
  const bbox = (pts: readonly (readonly [number, number])[]) => {
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (const [x, y] of pts) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  };

  it('frames the LinkedIn still: about 9.4 px a cell at 1200 square', () => {
    const f = fitRoute(1200, 1200, route);
    expect(f.k).toBeGreaterThan(9.2);
    expect(f.k).toBeLessThan(9.7);
  });

  it('centres the padded route box on the stage', () => {
    const b = bbox(route);
    for (const [w, h] of [
      [1200, 1200],
      [900, 1100],
      [2000, 400],
    ]) {
      const f = fitRoute(w, h, route);
      expect(f.ox + b.cx * f.k).toBeCloseTo(w / 2, 6);
      expect(f.oy + b.cy * f.k).toBeCloseTo(h / 2, 6);
    }
  });

  it('contain keeps the whole padded box on stage; cover fills the stage', () => {
    const b = bbox(route);
    const pad = 12;
    const c = fitRoute(2000, 400, route, 'contain');
    expect(c.oy + (b.y0 - pad) * c.k).toBeGreaterThanOrEqual(-1e-6);
    expect(c.oy + (b.y1 + pad) * c.k).toBeLessThanOrEqual(400 + 1e-6);
    const v = fitRoute(2000, 400, route, 'cover');
    expect(v.k).toBeGreaterThan(c.k);
    expect(v.ox + (b.x0 - pad) * v.k).toBeCloseTo(0, 6);
    expect(v.ox + (b.x1 + pad) * v.k).toBeCloseTo(2000, 6);
  });

  it('is a tall route, so contain takes k from the height even on a wide stage', () => {
    const b = bbox(route);
    const f = fitRoute(2000, 400, route);
    expect(f.k).toBeCloseTo(400 / (b.y1 - b.y0 + 24), 6);
  });

  it('shares its frame shape with fitGrid', () => {
    const g = fitGrid(800, 600, 192);
    const r = fitRoute(800, 600, route);
    expect(Object.keys(r).sort()).toEqual(['k', 'ox', 'oy']);
    expect(typeof g.k).toBe(typeof r.k);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run packages/flateralus-pixi-animations/src/shared/city-view.test.ts`
Expected: FAIL — `fitRoute is not a function`, and `cityGrid('kc', true)` does not throw.

- [ ] **Step 3: Implement**

Replace `city-view.ts` with:

```ts
import { cityGridData, hasCityGrid } from './city-data';
import type { CityGridData } from './city-data';

/**
 * Picking and framing a baked city grid.
 *
 * The city animations offer the same city select and then square the grid
 * into the stage the same way, so the lookup and the fit live here rather
 * than in each animation. route-trace frames a route instead of the grid;
 * that fit lives here too so the cell-rect code is the same everywhere.
 */

export type CityId = 'pgh' | 'pdx' | 'kc';

/**
 * The baked grid for a city select value. z14 is the wide street grid, z16
 * the downtown tile with building footprints. Unknown cities read as
 * Pittsburgh, as they always have; a zoom nobody baked is an error, because
 * silently showing another city would be worse.
 */
export function cityGrid(city: string, z16 = false): CityGridData {
  const base: CityId = city === 'pdx' ? 'pdx' : city === 'kc' ? 'kc' : 'pgh';
  const id = `${base}${z16 ? '16' : '14'}`;
  if (!hasCityGrid(id)) throw new Error(`no baked grid ${id}`);
  return cityGridData(id);
}

/** Where the grid sits on the stage: pixels per cell and the cell-0 corner. */
export interface Frame {
  /** Stage pixels per grid cell. */
  k: number;
  /** Stage position of grid cell (0, 0)'s top-left corner. */
  ox: number;
  oy: number;
}

export interface GridFit extends Frame {
  /** Side length of the framed square, in stage pixels. */
  S: number;
}

/** Centre the square grid in the stage at 95% of the short side. */
export function fitGrid(w: number, h: number, g: number): GridFit {
  const S = Math.min(w, h) * 0.95;
  const k = S / g;
  return { k, ox: (w - S) / 2, oy: (h - S) / 2, S };
}

export type RouteFit = 'contain' | 'cover';

/**
 * Frame a route rather than the whole grid: its bounding box in cells,
 * padded on every side, fitted to the stage preserving aspect. `contain`
 * keeps the whole padded box visible; `cover` fills the stage and crops.
 * Cells off stage are culled by the cell-rect code as usual.
 */
export function fitRoute(
  w: number,
  h: number,
  points: readonly (readonly [number, number])[],
  fit: RouteFit = 'contain',
  pad = 12
): Frame {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of points) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  const bw = x1 - x0 + pad * 2;
  const bh = y1 - y0 + pad * 2;
  const k =
    fit === 'cover' ? Math.max(w / bw, h / bh) : Math.min(w / bw, h / bh);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return { k, ox: w / 2 - cx * k, oy: h / 2 - cy * k };
}
```

- [ ] **Step 4: Run the tests and the package's existing suite**

Run: `npx vitest run packages/flateralus-pixi-animations/src/shared`
Expected: PASS, including the existing `city-data`, `terrain`, `mask-grid` tests. Then `npx tsc --noEmit` from the package dir: `street-pulse`, `block-party` and `pixel-sunrise` still compile against `cityGrid`.

- [ ] **Step 5: Commit**

```bash
git add packages/flateralus-pixi-animations/src/shared/city-view.ts packages/flateralus-pixi-animations/src/shared/city-view.test.ts
git commit -m "feat(city): cityGrid knows three cities, and fitRoute frames a route instead of the grid"
```

---

### Task 4: The trace state machine and geometry, pure and tested

**Files:**

- Create: `packages/flateralus-pixi-animations/src/route-trace/trace.ts`
- Test: `packages/flateralus-pixi-animations/src/route-trace/trace.test.ts`

**Interfaces:**

- Produces (all exported from `trace.ts`):
  - `BOOT_S = 1.6`
  - `interface Timing { trace: number; hold: number; loop: boolean }`
  - `type Phase = 'boot' | 'trace' | 'hold'`
  - `interface TraceState { phase: Phase; t: number; progress: number }` — `t` is seconds inside the current phase; `progress` is the drawn fraction of the route's length, 0..1
  - `createTrace(instant: boolean): TraceState` — `instant` starts at `{ phase: 'hold', t: 0, progress: 1 }`
  - `stepTrace(s: TraceState, dt: number, tm: Timing): void`
  - `restartTrace(s: TraceState): void` — no effect during boot
  - `bootFraction(s: TraceState): number` — eased 0..1 share of street cells plotted
  - `bezierEase(x1, y1, x2, y2): (u: number) => number` and `EASE_OUT = bezierEase(0.23, 1, 0.32, 1)`
  - `cumulative(points): Float64Array` — `cum[i]` is arc length to point `i`; `cum[0] = 0`
  - `prefixAt(points, cum, frac): [number, number][]` — the drawn polyline, ending in an interpolated head point
  - `baseAlpha(k: number): number`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/flateralus-pixi-animations/src/route-trace/trace.test.ts
import { describe, it, expect } from 'vitest';
import {
  BOOT_S,
  EASE_OUT,
  baseAlpha,
  bezierEase,
  bootFraction,
  createTrace,
  cumulative,
  prefixAt,
  restartTrace,
  stepTrace,
  type Timing,
} from './trace';

const TM: Timing = { trace: 4, hold: 3, loop: true };
const run = (
  s: ReturnType<typeof createTrace>,
  secs: number,
  tm = TM,
  dt = 1 / 60
) => {
  for (let k = 0; k < Math.round(secs / dt); k++) stepTrace(s, dt, tm);
};
const length = (pts: [number, number][]) => {
  let L = 0;
  for (let i = 1; i < pts.length; i++)
    L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
};
const square: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];

describe('ease', () => {
  it('pins the endpoints and runs ahead of linear', () => {
    expect(EASE_OUT(0)).toBeCloseTo(0, 6);
    expect(EASE_OUT(1)).toBeCloseTo(1, 6);
    expect(EASE_OUT(0.5)).toBeGreaterThan(0.8);
    let prev = 0;
    for (let i = 1; i <= 100; i++) {
      const v = EASE_OUT(i / 100);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });

  it('reduces to the identity for the straight-line control points', () => {
    const lin = bezierEase(1 / 3, 1 / 3, 2 / 3, 2 / 3);
    expect(lin(0.25)).toBeCloseTo(0.25, 4);
    expect(lin(0.8)).toBeCloseTo(0.8, 4);
  });
});

describe('geometry', () => {
  it('accumulates arc length from zero', () => {
    const cum = cumulative(square);
    expect(Array.from(cum)).toEqual([0, 10, 20, 30, 40]);
  });

  it('cuts a prefix whose length is the asked fraction, with an interpolated head', () => {
    const cum = cumulative(square);
    const half = prefixAt(square, cum, 0.5);
    expect(length(half)).toBeCloseTo(20, 9);
    expect(half[half.length - 1]).toEqual([10, 10]);
    const bit = prefixAt(square, cum, 0.125);
    expect(bit).toEqual([
      [0, 0],
      [5, 0],
    ]);
    expect(prefixAt(square, cum, 0)).toEqual([[0, 0]]);
    expect(prefixAt(square, cum, 1)).toEqual(square);
  });

  it('survives repeated consecutive points without NaN', () => {
    const pts: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 0],
      [10, 10],
    ];
    const cum = cumulative(pts);
    for (const f of [0.49, 0.5, 0.51, 0.75]) {
      for (const [x, y] of prefixAt(pts, cum, f)) {
        expect(Number.isNaN(x)).toBe(false);
        expect(Number.isNaN(y)).toBe(false);
      }
    }
    expect(length(prefixAt(pts, cum, 0.5))).toBeCloseTo(10, 9);
  });
});

describe('phases', () => {
  it('boots for 1.6 s, eased, then traces linearly', () => {
    const s = createTrace(false);
    expect(s.phase).toBe('boot');
    expect(bootFraction(s)).toBe(0);
    run(s, 0.8);
    expect(bootFraction(s)).toBeGreaterThan(0.8);
    run(s, 0.81);
    expect(s.phase).toBe('trace');
    expect(bootFraction(s)).toBe(1);
    run(s, TM.trace / 2);
    expect(s.progress).toBeCloseTo(0.5, 2);
  });

  it('holds, then loops; the streets are not re-booted', () => {
    const s = createTrace(false);
    run(s, BOOT_S + TM.trace + 0.1);
    expect(s.phase).toBe('hold');
    expect(s.progress).toBe(1);
    run(s, TM.hold);
    expect(s.phase).toBe('trace');
    expect(s.progress).toBeLessThan(0.1);
    expect(bootFraction(s)).toBe(1);
  });

  it('with loop off, holds forever', () => {
    const s = createTrace(false);
    run(s, BOOT_S + TM.trace + 30, { ...TM, loop: false });
    expect(s.phase).toBe('hold');
    expect(s.progress).toBe(1);
  });

  it('hold 0 restarts at once instead of sticking', () => {
    const s = createTrace(false);
    const tm = { ...TM, hold: 0 };
    run(s, BOOT_S + TM.trace + 0.05, tm);
    expect(s.phase).toBe('trace');
    expect(s.progress).toBeLessThan(0.05);
  });

  it('keeps its progress when the trace duration changes mid-trace', () => {
    const s = createTrace(false);
    run(s, BOOT_S + 2);
    const before = s.progress;
    stepTrace(s, 1 / 60, { ...TM, trace: 12 });
    expect(s.progress).toBeGreaterThan(before);
    expect(s.progress - before).toBeLessThan(0.01);
  });

  it('restarts from a click during trace or hold, never during boot', () => {
    const s = createTrace(false);
    run(s, 0.5);
    restartTrace(s);
    expect(s.phase).toBe('boot');
    run(s, BOOT_S + 2);
    restartTrace(s);
    expect(s.phase).toBe('trace');
    expect(s.progress).toBe(0);
    run(s, TM.trace + 0.1);
    restartTrace(s);
    expect(s.phase).toBe('trace');
    expect(s.progress).toBe(0);
  });

  it('starts finished under reduced motion, and a click still replays', () => {
    const s = createTrace(true);
    expect(s.phase).toBe('hold');
    expect(s.progress).toBe(1);
    expect(bootFraction(s)).toBe(1);
    run(s, 10, { ...TM, loop: false });
    expect(s.progress).toBe(1);
    restartTrace(s);
    expect(s.phase).toBe('trace');
    expect(s.progress).toBe(0);
  });
});

describe('baseAlpha', () => {
  it('is 0.42 at desktop scale and fades toward 0.22 on a phone', () => {
    expect(baseAlpha(9.4)).toBeCloseTo(0.42, 6);
    expect(baseAlpha(3.5)).toBeCloseTo(0.42, 6);
    expect(baseAlpha(2.75)).toBeCloseTo(0.32, 6);
    expect(baseAlpha(2)).toBeCloseTo(0.22, 6);
    expect(baseAlpha(1)).toBeCloseTo(0.22, 6);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run packages/flateralus-pixi-animations/src/route-trace/trace.test.ts`
Expected: FAIL — `Failed to load ./trace`.

- [ ] **Step 3: Implement**

```ts
// packages/flateralus-pixi-animations/src/route-trace/trace.ts
/**
 * The route-trace clock and geometry, with no PIXI in it.
 *
 * Progress is stored as a fraction of the route and advanced by dt / trace,
 * not derived from elapsed time, so changing the trace duration mid-trace
 * leaves the drawn line where it is. Boot is the streets plotting on; the
 * route only starts once they are all there.
 */

/** Boot length in seconds; street-pulse uses the same figure. */
export const BOOT_S = 1.6;

export interface Timing {
  /** Seconds for the route to draw, start to end. */
  trace: number;
  /** Seconds to hold the finished route before looping. */
  hold: number;
  loop: boolean;
}

export type Phase = 'boot' | 'trace' | 'hold';

export interface TraceState {
  phase: Phase;
  /** Seconds inside the current phase. */
  t: number;
  /** Drawn share of the route's arc length, 0..1. */
  progress: number;
}

/** `instant` is the reduced-motion start: streets up, route finished. */
export function createTrace(instant: boolean): TraceState {
  return instant
    ? { phase: 'hold', t: 0, progress: 1 }
    : { phase: 'boot', t: 0, progress: 0 };
}

export function stepTrace(s: TraceState, dt: number, tm: Timing): void {
  switch (s.phase) {
    case 'boot':
      s.t += dt;
      if (s.t >= BOOT_S) {
        s.phase = 'trace';
        s.t = 0;
        s.progress = 0;
      }
      return;
    case 'trace':
      s.t += dt;
      s.progress = Math.min(1, s.progress + dt / Math.max(1e-3, tm.trace));
      if (s.progress >= 1) {
        s.phase = 'hold';
        s.t = 0;
      }
      return;
    case 'hold':
      s.t += dt;
      if (tm.loop && s.t >= tm.hold) {
        s.phase = 'trace';
        s.t = 0;
        s.progress = 0;
      }
      return;
  }
}

/** A click: draw the route again. Streets stay; a boot in progress is left alone. */
export function restartTrace(s: TraceState): void {
  if (s.phase === 'boot') return;
  s.phase = 'trace';
  s.t = 0;
  s.progress = 0;
}

/**
 * Cubic bezier easing as CSS defines it: control points (x1,y1), (x2,y2),
 * solved for the parameter at a given x by Newton's method.
 */
export function bezierEase(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): (u: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const dsx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  return (u: number) => {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    let t = u;
    for (let i = 0; i < 8; i++) {
      const d = dsx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= (sx(t) - u) / d;
    }
    return sy(Math.min(1, Math.max(0, t)));
  };
}

/** The strong ease-out the lab uses for entrances. */
export const EASE_OUT = bezierEase(0.23, 1, 0.32, 1);

/** Eased share of the street cells that should be plotted by now. */
export function bootFraction(s: TraceState): number {
  if (s.phase !== 'boot') return 1;
  return EASE_OUT(Math.min(1, s.t / BOOT_S));
}

export function cumulative(
  points: readonly (readonly [number, number])[]
): Float64Array {
  const cum = new Float64Array(points.length);
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    cum[i] = cum[i - 1] + Math.hypot(x1 - x0, y1 - y0);
  }
  return cum;
}

/**
 * The drawn polyline for a progress fraction: every point up to the arc
 * length, then the interpolated head. Zero-length segments (legs joined at
 * a shared point) are stepped over rather than divided by.
 */
export function prefixAt(
  points: readonly (readonly [number, number])[],
  cum: Float64Array,
  frac: number
): [number, number][] {
  const n = points.length;
  if (n === 0) return [];
  const total = cum[n - 1];
  const s = Math.min(1, Math.max(0, frac)) * total;
  const out: [number, number][] = [[points[0][0], points[0][1]]];
  if (s <= 0) return out;
  for (let i = 1; i < n; i++) {
    if (cum[i] <= s) {
      out.push([points[i][0], points[i][1]]);
      if (cum[i] === total) break;
      continue;
    }
    const seg = cum[i] - cum[i - 1];
    const t = seg > 0 ? (s - cum[i - 1]) / seg : 0;
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    break;
  }
  return out;
}

/**
 * Base street alpha for a cell size. Below 3.5 px a cell the dot grid reads
 * as noise behind the route, so it recedes linearly to 0.22 at 2 px.
 */
export function baseAlpha(k: number): number {
  if (k >= 3.5) return 0.42;
  if (k <= 2) return 0.22;
  return 0.22 + ((k - 2) / 1.5) * 0.2;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run packages/flateralus-pixi-animations/src/route-trace/trace.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/flateralus-pixi-animations/src/route-trace/trace.ts packages/flateralus-pixi-animations/src/route-trace/trace.test.ts
git commit -m "feat(route-trace): the clock — streets boot, the route draws at a runner's pace, holds, and goes again"
```

---

### Task 5: The animation

**Files:**

- Create: `packages/flateralus-pixi-animations/src/route-trace/manifest.ts`
- Create: `packages/flateralus-pixi-animations/src/route-trace/routeTraceAnimation.ts`
- Create: `packages/flateralus-pixi-animations/src/route-trace/index.ts`
- Modify: `packages/flateralus-pixi-animations/src/index.ts` (add `export * from './route-trace';` after the `./retro-grid` line, keeping the alphabetical list; it currently has no `route-trace` line)
- Test: `packages/flateralus-pixi-animations/src/route-trace/routeTraceAnimation.test.ts`

**Interfaces:**

- Consumes: `trace.ts` (Task 4), `fitRoute`/`Frame`/`RouteFit` (Task 3), `ROUTES`/`ROUTE_IDS`/`BakedRoute` and `cityGridData`/`ROAD`/`WATER`/`GREEN` (Task 2), `scrim`, `prefersReducedMotion`.
- Produces: `MANIFEST` with id `'route-trace'`, `RouteTraceControlValues`, `RouteTraceAnimation`, `createRouteTraceAnimation(initialControls?)`; all re-exported from the package root.

- [ ] **Step 1: Write the manifest**

```ts
// packages/flateralus-pixi-animations/src/route-trace/manifest.ts
import { createManifest } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { ROUTES, ROUTE_IDS } from '../shared/routes';

export const MANIFEST = createManifest({
  id: 'route-trace',
  name: 'Route Trace',
  description:
    'A real run drawn on a real city. Downtown Kansas City from OpenStreetMap as the dot-matrix grid Night Traffic draws, and over it the Bracket Bear Run Club route from the Marriott Downtown to the Liberty Memorial and back, tracing itself at a constant pace, then holding. Click to run it again. Map data © OpenStreetMap contributors.',
  controls: [
    {
      name: 'route',
      type: 'select',
      label: 'Route',
      options: ROUTE_IDS.map((id) => ({ label: ROUTES[id].name, value: id })),
      defaultValue: ROUTE_IDS[0],
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'trace',
      type: 'number',
      label: 'Trace (s)',
      min: 1,
      max: 12,
      step: 0.5,
      defaultValue: 4,
      debug: true,
    },
    {
      name: 'hold',
      type: 'number',
      label: 'Hold (s)',
      min: 0,
      max: 10,
      step: 0.5,
      defaultValue: 3,
      debug: true,
    },
    {
      name: 'loop',
      type: 'boolean',
      label: 'Loop',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'glow',
      type: 'boolean',
      label: 'Glow',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'fit',
      type: 'select',
      label: 'Fit',
      options: [
        { label: 'Contain', value: 'contain' },
        { label: 'Cover', value: 'cover' },
      ],
      defaultValue: 'contain',
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'scrim',
      type: 'boolean',
      label: 'Scrim',
      defaultValue: true,
      debug: true,
      resetsAnimation: true,
    },
  ],
} as const);

export type RouteTraceControlValues = ManifestToControlValues<typeof MANIFEST>;
```

If `createManifest`'s `as const` rejects the computed `options` array (it may want a literal tuple), write the one option out by hand instead: `options: [{ label: 'Marriott → Liberty Memorial', value: 'kc-segd-2026' }], defaultValue: 'kc-segd-2026'`, and drop the `ROUTES`/`ROUTE_IDS` import. The `routes.test.ts` default-route test keeps the two in step.

- [ ] **Step 2: Write the failing smoke test**

```ts
// packages/flateralus-pixi-animations/src/route-trace/routeTraceAnimation.test.ts
import { describe, it, expect } from 'vitest';
import * as PIXI from 'pixi.js';
import { PointerService } from '@bracketbear/flateralus-pixi';
import { createRouteTraceAnimation } from './routeTraceAnimation';

function fakeApp(w = 1200, h = 1200) {
  return {
    stage: new PIXI.Container(),
    screen: { width: w, height: h },
  } as unknown as PIXI.Application;
}

describe('route-trace animation', () => {
  it('builds its layers, runs a few frames, and consumes every click', () => {
    const a = createRouteTraceAnimation();
    const svc = new PointerService();
    a.setPointerService(svc);
    const app = fakeApp();
    a.init(app);
    const controls = a.getControlValues();
    // scrim + base + water + green + line + heat
    expect(a['root'].children.length).toBe(6);
    svc.clicks.push({ x: 600, y: 600 }, { x: 10, y: 10 });
    for (let i = 0; i < 10; i++) a.onUpdate(app, controls, 1 / 60);
    expect(svc.clicks).toHaveLength(0);
    a.onDestroy();
  });

  it('draws no scrim when told not to', () => {
    const a = createRouteTraceAnimation({ scrim: false });
    const app = fakeApp(900, 1100);
    a.init(app);
    expect(a['root'].children.length).toBe(5);
    a.onDestroy();
  });
});
```

`a['root']` reaches the protected container; TypeScript allows bracket access to protected members in tests. If the compiler objects, cast: `(a as unknown as { root: PIXI.Container }).root`.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run packages/flateralus-pixi-animations/src/route-trace/routeTraceAnimation.test.ts`
Expected: FAIL — `Failed to load ./routeTraceAnimation`.

- [ ] **Step 4: Write the animation**

```ts
// packages/flateralus-pixi-animations/src/route-trace/routeTraceAnimation.ts
import * as PIXI from 'pixi.js';
import { PAL } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { MANIFEST } from './manifest';
import type { RouteTraceControlValues } from './manifest';
import { cityGridData, GREEN, ROAD, WATER } from '../shared/city-data';
import type { CityGridData } from '../shared/city-data';
import { ROUTES, ROUTE_IDS } from '../shared/routes';
import type { BakedRoute } from '../shared/routes';
import { fitRoute } from '../shared/city-view';
import type { Frame, RouteFit } from '../shared/city-view';
import { scrim } from '../shared/scrim';
import { prefersReducedMotion } from '../shared/reduced-motion';
import {
  baseAlpha,
  bootFraction,
  createTrace,
  cumulative,
  prefixAt,
  restartTrace,
  stepTrace,
} from './trace';
import type { TraceState } from './trace';

/** Water and green come up with the streets, fainter. */
const WATER_ALPHA = 0.12;
const GREEN_ALPHA = 0.08;
/** Cursor heat radius, in grid cells; the same as street-pulse. */
const HEAT_RADIUS = 6;

/**
 * One route drawn over a baked city. Streets boot as in street-pulse; the
 * route then draws at constant arc-length speed, holds, and loops. A click
 * draws it again. No text: the page captions the map.
 */
export class RouteTraceAnimation extends PixiAnimation<typeof MANIFEST> {
  private d: CityGridData | null = null;
  private route: BakedRoute | null = null;
  private cum: Float64Array = new Float64Array(0);
  private frame: Frame = { k: 1, ox: 0, oy: 0 };
  /** Every on-screen non-land cell, shuffled, so boot plots at random. */
  private order: number[] = [];
  private drawn = 0;
  private base: PIXI.Graphics | null = null;
  private water: PIXI.Graphics | null = null;
  private green: PIXI.Graphics | null = null;
  private line: PIXI.Graphics | null = null;
  private heat: PIXI.Graphics | null = null;
  private state: TraceState = createTrace(false);

  constructor(initialControls?: Partial<RouteTraceControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(app: PIXI.Application, controls: RouteTraceControlValues): void {
    const root = this.getRoot();
    const w = app.screen.width;
    const h = app.screen.height;

    const route = ROUTES[String(controls.route)] ?? ROUTES[ROUTE_IDS[0]];
    const d = cityGridData(route.grid);
    this.route = route;
    this.d = d;
    this.cum = cumulative(route.points);
    this.frame = fitRoute(w, h, route.points, controls.fit as RouteFit);
    if (controls.scrim) scrim(root, w, h);

    const { k, ox, oy } = this.frame;
    this.order = [];
    for (let i = 0; i < d.cells.length; i++) {
      if (d.cells[i] === 0) continue;
      const px = ox + (i % d.g) * k;
      const py = oy + Math.floor(i / d.g) * k;
      if (px + k < 0 || py + k < 0 || px > w || py > h) continue;
      this.order.push(i);
    }
    for (let i = this.order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = this.order[i];
      this.order[i] = this.order[j];
      this.order[j] = t;
    }

    this.base = new PIXI.Graphics();
    this.base.alpha = baseAlpha(k);
    this.water = new PIXI.Graphics();
    this.water.alpha = WATER_ALPHA;
    this.green = new PIXI.Graphics();
    this.green.alpha = GREEN_ALPHA;
    this.line = new PIXI.Graphics();
    this.heat = new PIXI.Graphics();
    root.addChild(this.base, this.water, this.green, this.line, this.heat);

    this.drawn = 0;
    this.state = createTrace(prefersReducedMotion());
  }

  /** One grid cell as a rect on `g`, culled if it falls off stage. */
  private cellRect(
    g: PIXI.Graphics,
    idx: number,
    pad: number,
    w: number,
    h: number
  ): void {
    const d = this.d;
    if (!d) return;
    const { k, ox, oy } = this.frame;
    const px = ox + (idx % d.g) * k;
    const py = oy + Math.floor(idx / d.g) * k;
    if (px + k < 0 || py + k < 0 || px > w || py > h) return;
    g.rect(px + pad, py + pad, k - pad * 2, k - pad * 2);
  }

  /** Grid cell coordinates to stage pixels. */
  private sx(x: number): number {
    return this.frame.ox + x * this.frame.k;
  }
  private sy(y: number): number {
    return this.frame.oy + y * this.frame.k;
  }

  onUpdate(
    app: PIXI.Application,
    controls: RouteTraceControlValues,
    deltaTime: number
  ): void {
    const d = this.d;
    const route = this.route;
    const base = this.base;
    const water = this.water;
    const green = this.green;
    const line = this.line;
    const heat = this.heat;
    if (!d || !route || !base || !water || !green || !line || !heat) return;

    const dt = Math.min(0.05, deltaTime);
    const w = app.screen.width;
    const h = app.screen.height;
    const { k } = this.frame;
    base.tint = PAL.bright;
    water.tint = PAL.cyan;
    green.tint = PAL.sun;
    heat.tint = PAL.sun;

    const pointer = this.pointer;
    if (pointer) {
      let clicked = false;
      while (pointer.clicks.length) {
        pointer.clicks.shift();
        clicked = true;
      }
      if (clicked) restartTrace(this.state);
    }

    stepTrace(this.state, dt, {
      trace: controls.trace,
      hold: controls.hold,
      loop: controls.loop,
    });

    // Boot: the city plots on, each class into its own layer.
    if (this.drawn < this.order.length) {
      const target = Math.min(
        this.order.length,
        Math.ceil(bootFraction(this.state) * this.order.length)
      );
      let anyRoad = false;
      let anyWater = false;
      let anyGreen = false;
      for (; this.drawn < target; this.drawn++) {
        const i = this.order[this.drawn];
        const c = d.cells[i];
        if (c === ROAD) {
          this.cellRect(base, i, k * 0.12, w, h);
          anyRoad = true;
        } else if (c === WATER) {
          this.cellRect(water, i, k * 0.05, w, h);
          anyWater = true;
        } else if (c === GREEN) {
          this.cellRect(green, i, k * 0.2, w, h);
          anyGreen = true;
        }
      }
      if (anyRoad) base.fill({ color: 0xffffff });
      if (anyWater) water.fill({ color: 0xffffff });
      if (anyGreen) green.fill({ color: 0xffffff });
    }

    // The route: redrawn from its prefix every frame. Three strokes and a
    // head dot over ~350 points is cheap; there is nothing to cache.
    line.clear();
    const [startX, startY] = route.points[0];
    const pts = prefixAt(route.points, this.cum, this.state.progress);
    if (pts.length > 1) {
      const path = (): void => {
        line.moveTo(this.sx(pts[0][0]), this.sy(pts[0][1]));
        for (let i = 1; i < pts.length; i++)
          line.lineTo(this.sx(pts[i][0]), this.sy(pts[i][1]));
      };
      if (controls.glow) {
        path();
        line.stroke({
          width: k * 1.9,
          color: PAL.rust,
          alpha: 0.5,
          cap: 'round',
          join: 'round',
        });
      }
      path();
      line.stroke({
        width: k * 0.95,
        color: PAL.orange,
        alpha: 0.55,
        cap: 'round',
        join: 'round',
      });
      path();
      line.stroke({
        width: k * 0.37,
        color: PAL.orange,
        alpha: 1,
        cap: 'round',
        join: 'round',
      });
      if (this.state.phase === 'trace') {
        const [hx, hy] = pts[pts.length - 1];
        line.circle(this.sx(hx), this.sy(hy), k * 0.375);
        line.fill({ color: PAL.cream, alpha: 0.75 });
      }
    }
    // Start marker: a ring with a centre dot, from boot onward.
    line.circle(this.sx(startX), this.sy(startY), k * 0.475);
    line.stroke({ width: k * 0.12, color: PAL.orange, alpha: 0.9 });
    line.circle(this.sx(startX), this.sy(startY), k * 0.15);
    line.fill({ color: PAL.orange, alpha: 0.9 });

    // Cursor heat on nearby road cells, as in street-pulse.
    heat.clear();
    const mouse = this.pointer?.mouse;
    if (mouse?.active) {
      const mx = (mouse.x - this.frame.ox) / k;
      const my = (mouse.y - this.frame.oy) / k;
      for (let dy = -HEAT_RADIUS; dy <= HEAT_RADIUS; dy++) {
        for (let dx = -HEAT_RADIUS; dx <= HEAT_RADIUS; dx++) {
          const nx = Math.round(mx + dx);
          const ny = Math.round(my + dy);
          if (nx < 0 || ny < 0 || nx >= d.g || ny >= d.g) continue;
          const i = ny * d.g + nx;
          if (d.cells[i] !== ROAD) continue;
          const dist = Math.hypot(nx - mx, ny - my);
          if (dist > HEAT_RADIUS) continue;
          this.cellRect(heat, i, k * 0.1, w, h);
          heat.fill({ color: 0xffffff, alpha: (1 - dist / HEAT_RADIUS) * 0.8 });
        }
      }
    }
  }

  onDestroy(): void {
    this.d = null;
    this.route = null;
    this.base = null;
    this.water = null;
    this.green = null;
    this.line = null;
    this.heat = null;
    this.order = [];
    super.onDestroy();
  }
}

export function createRouteTraceAnimation(
  initialControls?: Partial<RouteTraceControlValues>
): RouteTraceAnimation {
  return new RouteTraceAnimation(initialControls);
}
```

```ts
// packages/flateralus-pixi-animations/src/route-trace/index.ts
export {
  RouteTraceAnimation,
  createRouteTraceAnimation,
} from './routeTraceAnimation';
export type { RouteTraceControlValues } from './manifest';
```

In `src/index.ts`, add `export * from './route-trace';` between `./retro-grid` and `./rust-machine`.

- [ ] **Step 5: Run the test, type-check, and build**

Run: `npx vitest run packages/flateralus-pixi-animations/src/route-trace`
Expected: PASS (13 + 2). If `PIXI.Graphics` throws in jsdom at `stroke()` or `fill()` (it should not; v8 Graphics records instructions without a renderer), the failing call is the one to report, not something to mock around.

Then from `packages/flateralus-pixi-animations/`: `npx tsc --noEmit`, then `npm run build` (emits `dist/`, which the website resolves).

- [ ] **Step 6: Look at it**

Start the website dev server from `apps/bracketbear-website/`: `node_modules/.bin/astro dev --port 4321`. The lab is not wired yet (Task 6), so this step is a compile check only: the dev server must start without a resolution error for `@bracketbear/flateralus-pixi-animations`. Stop it.

- [ ] **Step 7: Commit**

```bash
git add packages/flateralus-pixi-animations/src/route-trace packages/flateralus-pixi-animations/src/index.ts
git commit -m "feat(route-trace): one run drawn on a real city — streets boot, the route traces, holds, and a click runs it again"
```

---

### Task 6: Register it in the lab

**Files:**

- Modify: `apps/bracketbear-website/src/components/lab/registry.ts` (the import list at lines 4–46; a new entry after the `street-pulse` entry at lines 348–359)
- Modify: `apps/bracketbear-website/src/components/lab/registry.test.ts` (the `SELECTED` list, line 25)

**Interfaces:**

- Consumes: `createRouteTraceAnimation` from `@bracketbear/flateralus-pixi-animations` (Task 5, built to `dist/`).
- Produces: a `LabEntry` with `id: 'route-trace'`, `section: 'work'`.

- [ ] **Step 1: Write the failing test**

In `registry.test.ts`, under `'street-pulse',` in `SELECTED`, add:

```ts
  'route-trace',
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run build --workspace=@bracketbear/flateralus-pixi-animations && npx vitest run apps/bracketbear-website/src/components/lab/registry.test.ts`
Expected: FAIL — `contains every selected animation` reports `['route-trace']` missing.

- [ ] **Step 3: Register**

In `registry.ts`, add `createRouteTraceAnimation,` to the import list in alphabetical position (after `createRdVatAnimation,`). Then, directly after the `street-pulse` entry:

```ts
  {
    id: 'route-trace',
    section: 'work',
    name: 'Route Trace',
    tag: 'osm data',
    blurb:
      'A real run on a real city: the Bracket Bear Run Club route from the Kansas City Marriott Downtown to the Liberty Memorial and back, drawn at a constant pace over baked OpenStreetMap streets. Click to run it again. Map data © OpenStreetMap contributors.',
    create: (initialControls) =>
      createRouteTraceAnimation(
        initialControls as never
      ) as unknown as PixiAnimation<AnimationManifest>,
  },
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run apps/bracketbear-website/src/components/lab`
Expected: PASS, every lab test.

- [ ] **Step 5: Look at it in the lab**

From `apps/bracketbear-website/`: `node_modules/.bin/astro dev --port 4321`, open `http://localhost:4321/lab?animation=route-trace`. Check: streets plot on over 1.6 s; the route draws top to bottom in 4 s with the cream head dot; it holds 3 s and loops; a click restarts the trace; `Fit → Cover` fills the wide stage; `Scrim` off shows the orange section ground through the cells. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add apps/bracketbear-website/src/components/lab/registry.ts apps/bracketbear-website/src/components/lab/registry.test.ts
git commit -m "feat(lab): route-trace on the work shelf, beside night traffic"
```

---

### Task 7: `/run` mounts it over the still

**Files:**

- Create: `apps/bracketbear-website/src/components/run/RunMap.tsx`
- Modify: `apps/bracketbear-website/src/pages/run.astro` (the `<img class="run__map">` block at lines 79–87)
- Modify: `apps/bracketbear-website/src/styles/run.css` (the `.run__map` rule at lines 51–62)
- Commit also: `apps/bracketbear-website/public/run/` (`og.png`, `map.png`, `run.ics`), which are untracked.

**Interfaces:**

- Consumes: `REGISTRY` entry `'route-trace'` (Task 6); `PixiApplication`, `PointerService` from `@bracketbear/flateralus-pixi`; `applyTheme` from `@bracketbear/flateralus`.
- Produces: `RunMap` React component, no props; it mounts the canvas inside its own `div.run__stage` and sets `data-live` on its parent `.run__map` once the first frame has rendered.

- [ ] **Step 1: Write the island**

```tsx
// apps/bracketbear-website/src/components/run/RunMap.tsx
import { useEffect, useRef } from 'react';
import { PixiApplication, PointerService } from '@bracketbear/flateralus-pixi';
import { applyTheme } from '@bracketbear/flateralus';
import { REGISTRY } from '../lab/registry';

const ID = 'route-trace';

/**
 * The run page's map: the route-trace animation from the lab registry,
 * mounted over the server-rendered still. The still stays in the HTML (it
 * is there before hydration and without JavaScript); once the canvas has
 * drawn a frame this marks the wrapper `data-live` and the CSS fades the
 * still out. Traces once and holds; a click replays. Reduced motion is the
 * animation's own concern: it starts finished.
 */
export default function RunMap() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const entry = REGISTRY.find((e) => e.id === ID);
    if (!host || !entry) return;

    let cancelled = false;
    const app = new PixiApplication({
      config: { autoResize: true, backgroundAlpha: 0, antialias: true },
    });
    const pointer = new PointerService();

    void (async () => {
      try {
        await app.init(host);
      } catch (e) {
        // The still is already showing; a failed boot costs nothing visible.
        console.error('run map boot', e);
        return;
      }
      if (cancelled) {
        app.destroy();
        return;
      }
      app.start();
      applyTheme('sunset');
      const animation = entry.create({
        route: 'kc-segd-2026',
        loop: false,
        fit: 'contain',
        scrim: false,
      });
      animation.setPointerService(pointer);
      pointer.attach(host);
      app.setAnimation(animation);
      // Two frames: one for PIXI's first render, one for the browser to paint it.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!cancelled) host.parentElement?.setAttribute('data-live', '');
        })
      );
    })();

    return () => {
      cancelled = true;
      pointer.detach();
      host.parentElement?.removeAttribute('data-live');
      app.destroy();
    };
  }, []);

  return <div className="run__stage" ref={hostRef} aria-hidden="true" />;
}
```

- [ ] **Step 2: Mount it in the page**

In `run.astro`, add to the frontmatter after the CSS import:

```astro
import RunMap from '@/components/run/RunMap';
```

Replace the `<img class="run__map" … />` block (and the comment above it) with:

```astro
<!-- Downtown Kansas City from OpenStreetMap, the route from Valhalla's
             pedestrian routing, baked once into the animations package. The
             still is the server-rendered fallback; the island draws the
             route over it. The page loads no map service. -->
<figure class="run__figure">
  <div class="run__map">
    <img
      class="run__poster"
      src="/run/map.png"
      width="900"
      height="1100"
      alt="Map of downtown Kansas City with the route traced: from the Marriott down Wyandotte to Union Station, up to the Liberty Memorial, and back."
    />
    <RunMap client:only="react" />
  </div>
  <figcaption class="run__caption">
    <span>Marriott · start</span>
    <span>Liberty Memorial · turn</span>
  </figcaption>
</figure>
```

- [ ] **Step 3: Style it**

In `run.css`, replace the `.run__map` rule (lines 51–62) with:

```css
/* The baked downtown map: the route runs tall and narrow, so it takes the
   right column beside the text and stacks under it on a phone. The still is
   server-rendered; the island's canvas sits over it and the still fades once
   the canvas has drawn. */
.run__figure {
  margin: 0;
  width: min(100%, 28rem);
  justify-self: center;
}

.run__map {
  position: relative;
  aspect-ratio: 9 / 11;
  width: 100%;
  overflow: hidden;
  /* The baked tile is a hard square; fade its edges into the ink so it
     reads as a city, not a sticker. */
  -webkit-mask-image: radial-gradient(
    ellipse 62% 60% at 50% 50%,
    #000 58%,
    transparent 100%
  );
  mask-image: radial-gradient(
    ellipse 62% 60% at 50% 50%,
    #000 58%,
    transparent 100%
  );
}

.run__poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  transition: opacity 400ms cubic-bezier(0.23, 1, 0.32, 1);
}
.run__map[data-live] .run__poster {
  opacity: 0;
}

.run__stage {
  position: absolute;
  inset: 0;
  cursor: pointer;
}
.run__stage canvas {
  /* autoResize sizes the canvas to the host; this only kills the inline gap. */
  display: block;
}

.run__caption {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin: 0.75rem 0.5rem 0;
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.55;
}

@media (prefers-reduced-motion: reduce) {
  .run__poster {
    transition: none;
  }
}
```

- [ ] **Step 4: Build and look**

From `apps/bracketbear-website/`:

```bash
node_modules/.bin/astro build
ls dist/run/index.html
```

Expected: build passes; the file exists. Then `node_modules/.bin/astro dev --port 4321` and open `http://localhost:4321/run`:

- At 1440 wide: the still shows at once, the canvas fades over it within a second; streets boot; the route draws once in 4 s; it holds; a click on the map replays it; the captions sit under the map.
- At 390 wide (devtools device toolbar): the map stacks under the text; the streets are faint and the route carries the frame (that is `baseAlpha` working).
- With `prefers-reduced-motion: reduce` emulated in devtools rendering settings: the route is complete on the first canvas frame.
- Disable JavaScript: the still is there, the captions too.

Also run the lab tests and the package suite once more, since the website build consumed the rebuilt `dist/`:

```bash
cd ../.. && npx vitest run packages/flateralus-pixi-animations apps/bracketbear-website/src/components/lab
```

Expected: PASS.

- [ ] **Step 5: Commit the page and the island**

```bash
git add apps/bracketbear-website/src/components/run/RunMap.tsx apps/bracketbear-website/src/pages/run.astro apps/bracketbear-website/src/styles/run.css apps/bracketbear-website/public/run
git commit -m "feat(run): the run club page, with the route drawn live over the still"
```

---

## Self-review notes

- Spec coverage: data (Tasks 1–2), `cityGrid`/`fitRoute` (3), phases/ease/strokes/pointer/reduced motion (4–5), lab registration (6), `/run` island with poster, captions and OSM credit (7; the credit line is already in the page footer and in the lab blurb and manifest description). The bake script's ODbL note is in its header comment. Out-of-scope items (GPX, live routing) have no task, as intended.
- The spec's `instant` control was replaced by `prefersReducedMotion()` read in `onInit` and the spec was amended to match before this plan was written; `scrim` was added to the manifest for the same reason.
- Names used across tasks: `hasCityGrid`, `ROUTES`, `ROUTE_IDS`, `BakedRoute`, `Frame`, `RouteFit`, `fitRoute`, `BOOT_S`, `Timing`, `TraceState`, `createTrace`, `stepTrace`, `restartTrace`, `bootFraction`, `cumulative`, `prefixAt`, `baseAlpha`, `createRouteTraceAnimation`, `RunMap` — each defined in the task that first produces it and used with the same signature afterwards.
- Review Focus items 1–3 are pinned in Task 4, item 4 in Task 3, item 5 in Task 5.
