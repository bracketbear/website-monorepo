import { PAL } from '@bracketbear/flateralus';

/**
 * Baked skylines for the pixel-grid animations.
 *
 * Each building is [x, width, height, topStyle, antennas], with x, width and
 * height as fractions of the canvas. This is drawn-by-hand data, not a
 * derivation from anything — the comments name the real buildings.
 */
export type CityId = 'pgh' | 'pdx';

type Building = [number, number, number, string, number?];

const CITIES: Record<CityId, Building[]> = {
  // Pittsburgh from the Point
  pgh: [
    [0.03, 0.05, 0.08, 'flat'],
    [0.09, 0.06, 0.13, 'flat'],
    [0.16, 0.05, 0.11, 'flat', 1],
    [0.22, 0.045, 0.16, 'flat'],
    [0.275, 0.075, 0.3, 'pinnacles'], // PPG Place
    [0.36, 0.05, 0.2, 'flat'],
    [0.415, 0.055, 0.31, 'pyramid', 1], // Fifth Avenue Place
    [0.475, 0.055, 0.34, 'flat'], // BNY Mellon
    [0.53, 0.04, 0.18, 'flat'],
    [0.575, 0.09, 0.44, 'flat', 2], // US Steel Tower
    [0.675, 0.06, 0.3, 'steps'], // One Oxford Centre
    [0.745, 0.05, 0.27, 'zig'], // Gulf Tower
    [0.8, 0.04, 0.24, 'pyramid'], // Koppers
    [0.85, 0.05, 0.13, 'flat'],
    [0.905, 0.06, 0.09, 'flat'],
  ],
  // Portland from the east bank
  pdx: [
    [0.04, 0.06, 0.1, 'flat'],
    [0.11, 0.05, 0.14, 'flat'],
    [0.165, 0.055, 0.21, 'flat'],
    [0.225, 0.05, 0.16, 'flat'],
    [0.28, 0.05, 0.28, 'crown'], // Park Avenue West
    [0.335, 0.06, 0.37, 'flat', 2], // Wells Fargo Center
    [0.4, 0.1, 0.31, 'flat'], // Big Pink
    [0.51, 0.05, 0.19, 'flat'],
    [0.565, 0.06, 0.29, 'steppyr'], // KOIN Center
    [0.63, 0.05, 0.15, 'flat'],
    [0.685, 0.045, 0.12, 'flat'],
    [0.75, 0.014, 0.3, 'flat'], // Convention Center spires
    [0.782, 0.014, 0.27, 'flat'],
    [0.815, 0.05, 0.09, 'flat'],
    [0.87, 0.06, 0.07, 'flat'],
  ],
};

export interface CityGrid {
  /** Topmost solid row per column; groundRow where there is no building. */
  colTop: Int32Array;
  /** Highest point across the skyline, so drawing can skip empty sky. */
  minTop: number;
  win: { gx: number; gy: number; c: number; on: boolean; i: number }[];
  stars: { gx: number; gy: number }[];
}

/**
 * Rasterize a skyline onto a cell grid.
 *
 * Randomness is seeded per city rather than taken from Math.random, so the
 * same city always produces the same building tops, antennas and window
 * layout across mounts.
 */
export function cityGrid(
  city: CityId,
  W: number,
  H: number,
  groundRow: number
): CityGrid {
  const spec = CITIES[city] ?? CITIES.pgh;
  const colTop = new Int32Array(W).fill(groundRow);
  let seed = city === 'pgh' ? 71 : 137;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const blds: { x0: number; bw: number; base: number }[] = [];
  for (const bd of spec) {
    const x0 = Math.round(bd[0] * W);
    const bw = Math.max(2, Math.round(bd[1] * W));
    const base = groundRow - Math.max(2, Math.round(bd[2] * H));
    const cmid = (bw - 1) / 2;
    for (let j = 0; j < bw; j++) {
      const gx = x0 + j;
      if (gx < 0 || gx >= W) continue;
      let t = base;
      const dc = Math.abs(j - cmid) / (cmid || 1);
      const top = bd[3];
      if (top === 'pyramid') t -= Math.round((1 - dc) * bw * 0.55);
      else if (top === 'pinnacles') {
        if (j % 3 === 0) t -= j === 0 || j === bw - 1 ? 3 : 2;
      } else if (top === 'steps') t += dc > 0.75 ? 3 : dc > 0.4 ? 1 : 0;
      else if (top === 'zig') t += Math.round(dc * 4);
      else if (top === 'crown') {
        if (j === 0 || j === bw - 1) t -= 2;
      } else if (top === 'steppyr') {
        if (dc > 0.7) t += 2;
        else if (dc < 0.4) t -= Math.round((1 - dc / 0.4) * 3);
      }
      if (t < colTop[gx]) colTop[gx] = t;
    }
    for (let k = 0; k < (bd[4] || 0); k++) {
      const gx = x0 + 1 + Math.round(rnd() * (bw - 3));
      if (gx >= 0 && gx < W) {
        colTop[gx] = Math.min(colTop[gx], base - 3 - Math.round(rnd() * 3));
      }
    }
    blds.push({ x0, bw, base });
  }

  const wcols = [PAL.sun, PAL.cyan, PAL.bright, PAL.cream];
  const win: CityGrid['win'] = [];
  let wi = 0;
  for (const bd of blds) {
    for (let gy = bd.base + 2; gy < groundRow - 1; gy += 2) {
      for (
        let gx = Math.max(1, bd.x0 + 1);
        gx < Math.min(W - 1, bd.x0 + bd.bw - 1);
        gx += 2
      ) {
        if (colTop[gx] <= gy && rnd() < 0.3) {
          win.push({
            gx,
            gy,
            c: wcols[Math.floor(rnd() * 4)],
            on: rnd() < 0.75,
            i: wi++,
          });
        }
      }
    }
  }

  let minTop = groundRow;
  for (let x = 0; x < W; x++) if (colTop[x] < minTop) minTop = colTop[x];

  const stars: CityGrid['stars'] = [];
  for (let k = 0; k < 90; k++) {
    const gx = Math.floor(rnd() * W);
    const gy = Math.floor(rnd() * Math.max(1, groundRow - 6));
    if (gy < colTop[gx] - 1) stars.push({ gx, gy });
  }

  return { colTop, minTop, win, stars };
}
