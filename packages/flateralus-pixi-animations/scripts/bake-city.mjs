#!/usr/bin/env node
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
  if (file && existsSync(file))
    return JSON.parse(await readFile(file, 'utf8'));
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
