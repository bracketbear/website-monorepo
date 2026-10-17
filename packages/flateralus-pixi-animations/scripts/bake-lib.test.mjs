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
    // The classic Google example is at 1e5; read at 1e6 the same string is
    // ten times smaller: (3.85, -12.02) then (4.07, -12.095).
    const s = decodePolyline6('_p~iF~ps|U_ulLnnqC');
    expect(s).toHaveLength(2);
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
        { type: 'way', id: 100, nodes: [1, 2, 3, 4, 1], tags: { natural: 'water' } },
        { type: 'way', id: 101, nodes: [5, 6], tags: { highway: 'residential' } },
        { type: 'way', id: 102, nodes: [7, 8, 9, 10, 7], tags: { leisure: 'park' } },
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
