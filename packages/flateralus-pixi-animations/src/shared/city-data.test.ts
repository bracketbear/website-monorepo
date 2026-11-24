import { describe, it, expect } from 'vitest';
import {
  cityGridData,
  hasCityGrid,
  BUILDING,
  GREEN,
  ROAD,
  WATER,
} from './city-data';

describe('city-data', () => {
  it('decodes every grid to its declared size', () => {
    for (const id of ['pgh14', 'pdx14', 'pgh16', 'pdx16', 'kc14'] as const) {
      const g = cityGridData(id);
      expect(g.cells.length).toBe(g.g * g.g);
    }
  });

  it('fills every cell, so no row under-runs its width', () => {
    // An under-run would leave trailing zeros, which decode as land. Water
    // and road coverage are the cheap signal that the rows are complete.
    for (const id of ['pgh14', 'pdx14'] as const) {
      const g = cityGridData(id);
      const roads = g.cells.filter((c) => c === ROAD).length;
      const water = g.cells.filter((c) => c === WATER).length;
      expect(roads).toBeGreaterThan(g.cells.length * 0.05);
      expect(water).toBeGreaterThan(0);
    }
  });

  it('caches, so repeated reads share one decoded buffer', () => {
    expect(cityGridData('pgh14')).toBe(cityGridData('pgh14'));
  });

  it('keeps the declared centre and zoom', () => {
    const g = cityGridData('pgh16');
    expect(g.z).toBe(16);
    expect(g.center[0]).toBeCloseTo(40.44, 1);
  });

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
});
