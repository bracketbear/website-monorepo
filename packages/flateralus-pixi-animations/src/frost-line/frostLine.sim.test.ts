import { describe, it, expect } from 'vitest';
import {
  SPS,
  deepShare,
  fillFraction,
  makeFrost,
  melt,
  stepFrost,
  totalWater,
  type Frost,
} from './frostLine.sim';

const GW = 160;
const GH = 72;
/** A bar 120×28 cells — about one Anton stroke laid on its side. */
const bar = () => {
  const c = new Float32Array(GW * GH);
  for (let j = 22; j < 50; j++)
    for (let i = 20; i < 140; i++) c[i + j * GW] = 1;
  return c;
};
const run = (f: Frost, secs: number) => {
  for (let k = 0; k < Math.round(secs * SPS); k++) stepFrost(f);
};

describe('frost line', () => {
  it('conserves water while nothing is fed', () => {
    const f = makeFrost(bar(), GW, GH, { gamma: 0 });
    const w0 = totalWater(f);
    run(f, 2);
    expect(totalWater(f) / w0).toBeCloseTo(1, 4);
  });

  it('accounts for every drop the sinter adds', () => {
    const f = makeFrost(bar(), GW, GH);
    const w0 = totalWater(f);
    run(f, 3);
    expect(f.fed).toBeGreaterThan(0);
    expect((totalWater(f) - f.fed) / w0).toBeCloseTo(1, 3);
  });

  it('never freezes outside the letter', () => {
    const cold = bar();
    const f = makeFrost(cold, GW, GH);
    run(f, 6);
    for (let k = 0; k < cold.length; k++) {
      if (cold[k] < 0.5) expect(f.ice[k]).toBe(0);
    }
  });

  it('grows feathers from scattered sites, and only fur from a full edge', () => {
    for (const seed of [1, 2, 3]) {
      const sparse = makeFrost(bar(), GW, GH, { gamma: 0, seed });
      const dense = makeFrost(bar(), GW, GH, { gamma: 0, seed, seedEvery: 1 });
      run(sparse, 4);
      run(dense, 4);
      // Both have run to depletion on the same vapour, so they have frozen
      // about the same amount of the letter...
      expect(fillFraction(sparse)).toBeGreaterThan(0.25);
      expect(fillFraction(dense)).toBeGreaterThan(0.25);
      // ...but a flat front is unstable too, and fingers into a fur whose
      // strands starve each other at once: nearly all of its ice stays
      // within 8 cells of the edge. Feathers carry a fifth of theirs or
      // more past that, toward the middle of the 28-cell stroke.
      expect(deepShare(sparse, 8), `seed ${seed}`).toBeGreaterThan(0.18);
      expect(deepShare(dense, 8), `seed ${seed}`).toBeLessThan(0.08);
    }
  });

  it('reads as a solid letter by six seconds', () => {
    const f = makeFrost(bar(), GW, GH);
    run(f, 2.5);
    // Still feathers at the end of stage one.
    expect(fillFraction(f)).toBeLessThan(0.75);
    run(f, 3.5);
    expect(fillFraction(f)).toBeGreaterThanOrEqual(0.88);
  });

  it('refreezes a melted patch, differently', () => {
    const f = makeFrost(bar(), GW, GH);
    run(f, 6);
    const before = Uint8Array.from(f.ice);
    melt(f, 80, 36, 9);
    expect(f.ice[80 + 36 * GW]).toBe(0);
    run(f, 5);
    expect(f.ice[80 + 36 * GW]).toBe(1);
    // The patch is young ice in an old letter.
    let young = 0;
    for (let j = 27; j < 46; j++) {
      for (let i = 71; i < 90; i++) {
        const k = i + j * GW;
        if (before[k] && f.ice[k] && f.age[k] < 5 * SPS) young++;
      }
    }
    expect(young).toBeGreaterThan(50);
  });
});
