import { describe, it, expect } from 'vitest';
import {
  GOLDEN_ANGLE,
  FIBS,
  seedPolar,
  parastichyPair,
  candidateIndices,
} from './phyllotaxis';

/** Cartesian center of seed i, for brute-force comparison. */
function seedXY(i: number, c: number): [number, number] {
  const { r, a } = seedPolar(i, c);
  return [r * Math.cos(a), r * Math.sin(a)];
}

/** The answer the shader must arrive at, found the slow honest way. */
function nearestSeed(x: number, y: number, c: number, count: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < count; i++) {
    const [sx, sy] = seedXY(i, c);
    const d = (sx - x) * (sx - x) + (sy - y) * (sy - y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Deterministic PRNG so a failure is reproducible. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('phyllotaxis layout', () => {
  it('places seed i at radius c*sqrt(i) and angle i*golden angle', () => {
    const c = 3;
    for (const i of [0, 1, 7, 100, 987]) {
      const { r, a } = seedPolar(i, c);
      expect(r).toBeCloseTo(c * Math.sqrt(i), 10);
      expect(a).toBeCloseTo(i * GOLDEN_ANGLE, 10);
    }
  });

  it('is the golden angle, so Fibonacci strides land at ever-smaller angles', () => {
    // This is the whole reason the Fibonacci candidate search works: the
    // convergents of the golden angle's continued fraction ARE the
    // Fibonacci numbers, so wrap(F * gamma) collapses toward zero.
    const wrap = (t: number) => {
      const m = (((t % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      return Math.abs(m);
    };
    const offsets = [3, 5, 8, 13, 21, 34, 55].map((f) =>
      wrap(f * GOLDEN_ANGLE)
    );
    for (let k = 1; k < offsets.length; k++) {
      expect(offsets[k]).toBeLessThan(offsets[k - 1]);
    }
  });
});

describe('parastichyPair', () => {
  it('returns two consecutive Fibonacci strides', () => {
    for (const r of [4, 12, 40, 150, 600]) {
      const [a, b] = parastichyPair(r, 3);
      const ia = FIBS.indexOf(a);
      const ib = FIBS.indexOf(b);
      expect(ia).toBeGreaterThanOrEqual(0);
      expect(ib).toBe(ia + 1);
    }
  });

  it('reaches for longer strides as the radius grows', () => {
    // The visible spiral-arm count climbs 5 -> 8 -> 13 -> 21 outward; that
    // is this function changing its mind.
    const near = parastichyPair(8, 3)[0];
    const far = parastichyPair(400, 3)[0];
    expect(far).toBeGreaterThan(near);
  });
});

describe('candidateIndices', () => {
  it('contains the true nearest seed everywhere in the field', () => {
    const c = 3;
    const count = 4000;
    const rMax = c * Math.sqrt(count - 1);
    const rand = rng(12345);
    let misses = 0;
    for (let n = 0; n < 4000; n++) {
      // Sample uniformly by area, staying inside the outermost ring.
      const r = Math.sqrt(rand()) * rMax * 0.96;
      const a = rand() * Math.PI * 2;
      const x = r * Math.cos(a);
      const y = r * Math.sin(a);
      const truth = nearestSeed(x, y, c, count);
      if (!candidateIndices(r, a, c).includes(truth)) misses++;
    }
    expect(misses).toBe(0);
  });

  it('covers the irregular core where the spiral has not settled', () => {
    const c = 3;
    const rand = rng(999);
    let misses = 0;
    for (let n = 0; n < 1500; n++) {
      const r = Math.sqrt(rand()) * c * Math.sqrt(30);
      const a = rand() * Math.PI * 2;
      const truth = nearestSeed(r * Math.cos(a), r * Math.sin(a), c, 4000);
      if (!candidateIndices(r, a, c).includes(truth)) misses++;
    }
    expect(misses).toBe(0);
  });

  it('never proposes a negative index', () => {
    for (const r of [0, 0.5, 2, 9, 80, 500]) {
      for (const i of candidateIndices(r, r * 0.7, 3)) {
        expect(i).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
