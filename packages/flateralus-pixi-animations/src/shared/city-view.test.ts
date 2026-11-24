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
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
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
