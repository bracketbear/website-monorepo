import { describe, it, expect } from 'vitest';
import { terrain } from './terrain';

describe('terrain', () => {
  it('decodes both grids to their declared size', () => {
    for (const id of ['hood', 'pgh'] as const) {
      const t = terrain(id);
      expect(t.grid.length).toBe(t.G * t.G);
    }
  });

  it('matches the recorded min, max and peak', () => {
    for (const id of ['hood', 'pgh'] as const) {
      const t = terrain(id);
      let mn = Infinity;
      let mx = -Infinity;
      let pk = 0;
      for (let i = 0; i < t.grid.length; i++) {
        if (t.grid[i] < mn) mn = t.grid[i];
        if (t.grid[i] > mx) {
          mx = t.grid[i];
          pk = i;
        }
      }
      expect(mn).toBe(t.min);
      expect(mx).toBe(t.max);
      expect(pk % t.G).toBe(t.peak.x);
      expect(Math.floor(pk / t.G)).toBe(t.peak.y);
    }
  });

  it('puts Mt Hood near its real summit and Pittsburgh at river level', () => {
    // Mt Hood is 3429m; the 180-sample grid lands just under it.
    expect(terrain('hood').max).toBeGreaterThan(3300);
    expect(terrain('hood').max).toBeLessThan(3429);
    // The Point sits around 215m where the rivers meet.
    expect(terrain('pgh').min).toBeGreaterThan(200);
    expect(terrain('pgh').min).toBeLessThan(230);
  });

  it('caches, so repeated reads share one decoded buffer', () => {
    expect(terrain('hood')).toBe(terrain('hood'));
  });
});
