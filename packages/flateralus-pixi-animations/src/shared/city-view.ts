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
