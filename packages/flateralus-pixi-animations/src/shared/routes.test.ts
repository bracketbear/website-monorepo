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
