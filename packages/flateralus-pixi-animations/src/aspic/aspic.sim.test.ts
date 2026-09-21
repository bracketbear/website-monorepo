import { describe, it, expect } from 'vitest';
import {
  SPS,
  drop,
  gelEnergy,
  makeGel,
  poke,
  stepGel,
  type Gel,
} from './aspic.sim';

const GW = 96;
const GH = 60;
const at = (i: number, j: number) => i + j * GW;
const run = (g: Gel, secs: number, each?: (k: number) => void) => {
  for (let k = 0; k < Math.round(secs * SPS); k++) {
    stepGel(g);
    each?.(k);
  }
};

describe('aspic gel', () => {
  it('is stable for 10^4 steps after a hard poke', () => {
    const g = makeGel(GW, GH);
    poke(g, 48, 40, 5, 0.4, 0.2);
    for (let k = 0; k < 10000; k++) stepGel(g);
    expect(Number.isFinite(gelEnergy(g))).toBe(true);
    expect(gelEnergy(g)).toBeLessThan(1e-6);
  });

  it('loses energy, never gains it', () => {
    const g = makeGel(GW, GH);
    drop(g, 0.05);
    let last = gelEnergy(g);
    expect(last).toBeGreaterThan(0);
    for (let k = 0; k < 20; k++) {
      run(g, 0.1);
      const e = gelEnergy(g);
      expect(e).toBeLessThanOrEqual(last * 1.001);
      last = e;
    }
  });

  it('keeps its base on the plate', () => {
    const g = makeGel(GW, GH);
    drop(g, 0.05);
    poke(g, 20, 3, 6, 0.3, 0.3);
    run(g, 0.5);
    for (let i = 0; i < GW; i++) {
      expect(g.ux[at(i, 0)]).toBe(0);
      expect(g.uy[at(i, 0)]).toBe(0);
    }
  });

  it('sways near 3 Hz and is back to 2% inside 1.4 s', () => {
    const g = makeGel(GW, GH);
    // A sideways shove of the whole slab, growing with height, excites the
    // fundamental: base pinned, top free.
    for (let j = 1; j < GH; j++) {
      for (let i = 0; i < GW; i++) g.vx[at(i, j)] = 0.02 * (j / GH);
    }
    const probe = at(48, GH - 1);
    let peak = 0;
    let crossings = 0;
    let prev = 0;
    let settledAt = Infinity;
    run(g, 2.5, (k) => {
      const x = g.ux[probe];
      peak = Math.max(peak, Math.abs(x));
      if (k / SPS < 1 && prev !== 0 && Math.sign(x) !== Math.sign(prev)) {
        crossings++;
      }
      if (x !== 0) prev = x;
      if (Math.abs(x) > 0.02 * peak) settledAt = Infinity;
      else if (settledAt === Infinity) settledAt = k / SPS;
    });
    // Two zero crossings to a cycle, counted over the first second.
    const hz = crossings / 2;
    expect(hz).toBeGreaterThanOrEqual(2.5);
    expect(hz).toBeLessThanOrEqual(3.5);
    expect(settledAt).toBeLessThanOrEqual(1.4);
  });

  it('rings down its grid-scale modes long before its sway', () => {
    // A two-cell checker in velocity is the worst stripe the grid can hold.
    const g = makeGel(GW, GH);
    for (let j = 1; j < GH; j++) {
      for (let i = 0; i < GW; i++) g.vy[at(i, j)] = j % 2 ? 0.02 : -0.02;
    }
    const e0 = gelEnergy(g);
    run(g, 0.1);
    expect(gelEnergy(g) / e0).toBeLessThan(1e-3);

    // The sway, over the same tenth of a second, has barely started to fade.
    const s = makeGel(GW, GH);
    for (let j = 1; j < GH; j++) {
      for (let i = 0; i < GW; i++) s.vx[at(i, j)] = 0.02 * (j / GH);
    }
    const s0 = gelEnergy(s);
    run(s, 0.1);
    expect(gelEnergy(s) / s0).toBeGreaterThan(0.3);
  });

  it('carries a poke across the slab in about a third of a second', () => {
    const g = makeGel(GW, GH);
    poke(g, 6, 30, 4, 0.3, 0);
    const far = at(GW - 7, 30);
    let arrived = Infinity;
    run(g, 1, (k) => {
      if (arrived === Infinity && Math.hypot(g.ux[far], g.uy[far]) > 1e-4) {
        arrived = k / SPS;
      }
    });
    expect(arrived).toBeGreaterThan(0.15);
    expect(arrived).toBeLessThan(0.7);
  });
});
