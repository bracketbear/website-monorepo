import { cityGridData } from './city-data';
import type { CityGridData, CityGridId } from './city-data';

/**
 * Picking and framing a baked city grid.
 *
 * The city animations offer the same two-city select and then square the
 * grid into the stage the same way, so the lookup and the fit live here
 * rather than in each animation.
 */

export type CityId = 'pgh' | 'pdx';

/**
 * The baked grid for a city select value. z14 is the wide street grid, z16
 * the downtown tile with building footprints.
 */
export function cityGrid(city: string, z16 = false): CityGridData {
  const id = `${city === 'pdx' ? 'pdx' : 'pgh'}${z16 ? '16' : '14'}`;
  return cityGridData(id as CityGridId);
}

export interface GridFit {
  /** Stage pixels per grid cell. */
  k: number;
  /** Top-left corner of the framed grid, in stage pixels. */
  ox: number;
  oy: number;
  /** Side length of the framed square, in stage pixels. */
  S: number;
}

/** Centre the square grid in the stage at 95% of the short side. */
export function fitGrid(w: number, h: number, g: number): GridFit {
  const S = Math.min(w, h) * 0.95;
  const k = S / g;
  return { k, ox: (w - S) / 2, oy: (h - S) / 2, S };
}
