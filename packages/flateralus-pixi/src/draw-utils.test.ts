import { describe, it, expect } from 'vitest';
import { rand, pick, noise2 } from './draw-utils';

describe('draw-utils', () => {
  it('rand stays inside the range', () => {
    for (let i = 0; i < 200; i++) {
      const v = rand(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThan(5);
    }
  });

  it('pick returns a member of the array', () => {
    const arr = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 50; i++) expect(arr).toContain(pick(arr));
  });

  it('noise2 is deterministic for the same input', () => {
    expect(noise2(1.5, 2.5)).toBe(noise2(1.5, 2.5));
  });

  it('noise2 varies across the plane and stays in range', () => {
    const a = noise2(0, 0);
    const b = noise2(12.3, 7.7);
    expect(a).not.toBe(b);
    for (const v of [a, b, noise2(-4, 9)]) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
