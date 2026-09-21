import { describe, it, expect } from 'vitest';
import {
  RHO,
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
      const dense = makeFrost(bar(), GW, GH, {
        gamma: 0,
        seed,
        seedEvery: 1,
      });
      // With no humidity and few sites, the last of the vapour has a long
      // way to diffuse: depletion takes most of twenty seconds.
      run(sparse, 20);
      run(dense, 20);
      // Both have run to depletion on the same vapour, so they have frozen
      // about the same amount of the letter. The floor is a share of RHO
      // and not a literal: what freezes at depletion is the vapour there
      // was, less what is stranded in receptive cells short of THETA.
      expect(fillFraction(sparse)).toBeGreaterThan(RHO * 0.45);
      expect(fillFraction(dense)).toBeGreaterThan(RHO * 0.45);
      expect(fillFraction(sparse) / fillFraction(dense)).toBeGreaterThan(0.6);
      expect(fillFraction(sparse) / fillFraction(dense)).toBeLessThan(1.4);
      // ...but a flat front is unstable too, and fingers into a fur whose
      // strands starve each other at once: nearly all of its ice stays
      // within 8 cells of the edge — measured, none of it gets further.
      // Feathers carry a quarter of theirs or more past that, toward the
      // middle of the 28-cell stroke.
      expect(deepShare(sparse, 8), `seed ${seed}`).toBeGreaterThan(0.2);
      expect(deepShare(dense, 8), `seed ${seed}`).toBeLessThan(0.05);
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

  it('regrows a melted patch as feathers, not as a slab', () => {
    const f = makeFrost(bar(), GW, GH);
    const w0 = totalWater(f);
    run(f, 8);
    const before = Uint8Array.from(f.ice);
    melt(f, 80, 36, 9);
    expect(f.ice[80 + 36 * GW]).toBe(0);
    // What evaporated is booked, so the audit still closes.
    expect((totalWater(f) - f.fed) / w0).toBeCloseTo(1, 3);

    // A slab would be back within a radius' worth of steps of the warmth
    // fading (about 1.3 s). Feathers take their time.
    run(f, 1.6);
    const patch = (pred: (k: number) => boolean) => {
      let n = 0;
      for (let j = 27; j < 46; j++) {
        for (let i = 71; i < 90; i++) {
          const k = i + j * GW;
          if ((i - 80) ** 2 + (j - 36) ** 2 <= 81 && pred(k)) n++;
        }
      }
      return n;
    };
    const cells = patch(() => true);
    expect(patch((k) => f.ice[k] === 1) / cells).toBeLessThan(0.5);

    // ...and it does come back: young ice in an old letter.
    run(f, 8);
    expect(patch((k) => f.ice[k] === 1) / cells).toBeGreaterThan(0.85);
    expect(
      patch((k) => before[k] === 1 && f.ice[k] === 1 && f.age[k] < 10 * SPS)
    ).toBeGreaterThan(50);
  });
});
