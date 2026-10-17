/**
 * Rasterising OpenStreetMap geometry into the city-data grid format, and a
 * routed polyline into grid coordinates. Pure functions; the CLI in
 * bake-city.mjs does the fetching. Mirrors the Python prototype that baked
 * the Kansas City still: segments stamped every 0.25 cell, polygons by
 * even-odd point-in-polygon at cell centres, multipolygon outers chained
 * end to end, roads stamped last so they win.
 *
 * Map data © OpenStreetMap contributors (ODbL).
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
  const segs = wayIds
    .filter((w) => ways[w])
    .map((w) => ways[w].nodes.slice());
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
