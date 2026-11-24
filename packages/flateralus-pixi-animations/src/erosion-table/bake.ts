/**
 * Baking the opening landscape.
 *
 * The table starts as real elevation rather than noise, which is the whole
 * reason this toy has a subject: Mt Hood is something a person recognises
 * before they understand what the simulation is doing to it.
 *
 * `shared/terrain.ts` carries the grids already, decoded synchronously, so
 * there is no loading state to design around. What is left is fitting a
 * square grid to a canvas of some other shape, converting metres into the
 * simulation's world units, and adding the small-scale roughness that a
 * 180-sample downsample threw away.
 */

import { terrain, type TerrainId } from '../shared/terrain';

/**
 * Ground span of the baked crop, in metres.
 *
 * The bake took a 3x3 block of terrarium tiles at zoom 12, cropped 512x512
 * pixels out of it and resampled to 180. Web-Mercator ground resolution is
 * `156543.034 * cos(lat) / 2^z` metres per pixel, so the span is that times
 * 512. This is what turns metres of relief into world units, and getting it
 * wrong would quietly make every slope — and therefore every erosion rate —
 * wrong by the same factor.
 */
const LATITUDE: Record<TerrainId, number> = {
  hood: 45.3735,
  pgh: 40.4406,
};

const CROP_PX = 512;
const ZOOM = 12;

export function spanMetres(id: TerrainId): number {
  const rad = (LATITUDE[id] * Math.PI) / 180;
  return ((156543.03392 * Math.cos(rad)) / 2 ** ZOOM) * CROP_PX;
}

/**
 * True relief in world units: the vertical extent of the terrain divided by
 * its horizontal span. Mt Hood comes out at ~0.187, Pittsburgh at ~0.013 —
 * which is not a bug, it is why one of them is the default.
 */
export function trueRelief(id: TerrainId): number {
  const t = terrain(id);
  return (t.max - t.min) / spanMetres(id);
}

/** Deterministic value noise, so the same canvas always bakes the same seed. */
function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) ^ seed;
  h ^= h >>> 13;
  return ((h >>> 0) % 65536) / 65536;
}

function vnoise2(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
}

export interface BakeOptions {
  /** Simulation grid. */
  W: number;
  H: number;
  /** Domain width in world units; height is always 1. */
  asp: number;
  /** Which mountain. */
  id: TerrainId;
  /**
   * Vertical extent of the baked terrain in world units. Pass
   * `trueRelief(id)` for the honest geometry, or more for a steeper
   * mountain — it is the height of the range, not a display multiplier,
   * so raising it genuinely steepens every slope the erosion sees.
   */
  relief: number;
  /**
   * Roughness added on top of the data, as a fraction of relief.
   *
   * Not decoration. A downsampled DEM is smooth at the cell scale, and a
   * perfectly smooth slope sheds water as an unbroken sheet — the
   * channel-forming instability has nothing to bite on. Real ground at 27 m
   * has far more texture than 180 samples retain, so this puts some back.
   *
   * It has to stay small, and it has to stay resolvable. Height differences
   * are divided by the cell size to get the slope the shading reads, so
   * roughness that looks negligible against the relief can still dominate
   * the hillshade: 0.4% of relief across a single cell is a 23-degree
   * facet, and the mountain comes out looking tiled.
   */
  seed?: number;
  /** Seed for the roughness, so a resize does not reshuffle the mountain. */
  seedIndex?: number;
}

/**
 * Resample the square elevation grid into the simulation grid with a cover
 * fit: the shorter axis of the canvas crops the data rather than squashing
 * it, so cells stay square and slopes stay honest in both directions.
 *
 * Row 0 of the returned grid is the BOTTOM row, matching a GL texture with
 * uv.y pointing up, while row 0 of the source grid is north. The flip lives
 * here so nothing downstream has to remember it.
 */
export function bakeHeights(opts: BakeOptions): Float32Array {
  const { W, H, asp, id, relief } = opts;
  const seedAmp = (opts.seed ?? 0.0009) * relief;
  const seedIx = opts.seedIndex ?? 0x9e37;
  const T = terrain(id);
  const G = T.G;
  const range = Math.max(1, T.max - T.min);
  // Cover fit: the data square is `S` world units on a side, where S is
  // whichever of the two canvas dimensions is larger.
  const S = Math.max(asp, 1);
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    // v = 1 is the top of the canvas, which is north, which is row 0.
    const ty = 0.5 + (0.5 - v) / S;
    const gy = Math.min(G - 1, Math.max(0, ty * (G - 1)));
    const y0 = Math.floor(gy);
    const y1 = Math.min(G - 1, y0 + 1);
    const fy = gy - y0;
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      const tx = 0.5 + ((u - 0.5) * asp) / S;
      const gx = Math.min(G - 1, Math.max(0, tx * (G - 1)));
      const x0 = Math.floor(gx);
      const x1 = Math.min(G - 1, x0 + 1);
      const fx = gx - x0;
      const a = T.grid[y0 * G + x0];
      const b = T.grid[y0 * G + x1];
      const c = T.grid[y1 * G + x0];
      const d = T.grid[y1 * G + x1];
      const e = (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
      let h = ((e - T.min) / range) * relief;
      // Fractal roughness in world coordinates, so it does not change
      // wavelength when the canvas resizes.
      if (seedAmp > 0) {
        const wx = u * asp;
        const wy = v;
        // Three octaves, topping out around 130 cycles across the domain.
        // The first version ran five from a higher base and put its top
        // octave well past the simulation grid's Nyquist: cell-scale white
        // noise at 0.4% of relief is a 23-degree facet on every single cell,
        // which the hillshade then amplifies into a field of blocks. Seed
        // roughness has to stay something the grid can actually resolve.
        let amp = 0.5;
        let fr = 30;
        let n = 0;
        for (let o = 0; o < 3; o++) {
          n += amp * (vnoise2(wx * fr, wy * fr, seedIx + o) - 0.5);
          fr *= 2.07;
          amp *= 0.54;
        }
        // Taper the roughness out of the valley floors: flats in a real
        // landscape are flat because they are already full of sediment.
        const rel = (e - T.min) / range;
        h += n * seedAmp * (0.35 + 0.65 * rel);
      }
      out[y * W + x] = h;
    }
  }
  return out;
}
