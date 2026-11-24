import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PARAMS,
  DEPTH0,
  createField,
  step,
  plow,
  castle,
  seedNoise,
  totalSand,
  relief,
  dominantWavelengthX,
  maxSlope,
  isHealthy,
  windDir,
  type SandField,
  type SandParams,
} from './physics';

const W = 64;
const H = 64;
/**
 * Production cell size, not 1/H. The exposure term is a slope, so a coarser
 * grid is a less unstable one: at 1/64 the same Q grows ripples 7.6x slower
 * than the lab does. The test box is a 64-cell patch of the real grid.
 */
const DX = 1 / 488;

function params(over: Partial<SandParams> = {}): SandParams {
  return { ...DEFAULT_PARAMS, dx: DX, asp: W / H, ...over };
}

/** A box of sand with the opening seed roughness on it. */
function seeded(): SandField {
  const F = createField(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) F.h[y * W + x] += seedNoise(x, y);
  return F;
}

/** Run n steps, advancing the forcing clock inside the loop as the GPU does. */
function run(F: SandField, p: SandParams, n: number): SandParams {
  const q = { ...p };
  for (let i = 0; i < n; i++) {
    q.t = (q.t + q.dt) % 4096;
    step(F, q);
  }
  return q;
}

/** Depth of the deepest cell below the opening level. */
function deepest(F: SandField): number {
  let d = 0;
  for (let i = 0; i < F.h.length; i++) d = Math.max(d, DEPTH0 - F.h[i]);
  return d;
}

/** Volume missing below the opening level: how much track is left. */
function deficit(F: SandField): number {
  let d = 0;
  for (let i = 0; i < F.h.length; i++) d += Math.max(0, DEPTH0 - F.h[i]);
  return d;
}

const east: [number, number] = [1, 0];

describe('conservation', () => {
  // The field is float32, so the bound is relative: one part in 10^7 of
  // the box over 600 steps is round-off, not a leak.
  it('keeps every grain under a steady wind', () => {
    const F = seeded();
    const before = totalSand(F);
    run(F, params({ steadyDir: east }), 600);
    expect(isHealthy(F)).toBe(true);
    expect(Math.abs(totalSand(F) - before) / before).toBeLessThan(1e-7);
  });

  it('keeps every grain under the real rotating wind', () => {
    const F = seeded();
    const before = totalSand(F);
    run(F, params(), 600);
    expect(isHealthy(F)).toBe(true);
    expect(Math.abs(totalSand(F) - before) / before).toBeLessThan(1e-7);
  });

  it('leaves flat sand flat: a uniform flux has no divergence', () => {
    const F = createField(W, H);
    run(F, params({ steadyDir: east }), 300);
    let dev = 0;
    for (let i = 0; i < F.h.length; i++)
      dev = Math.max(dev, Math.abs(F.h[i] - DEPTH0));
    // One float32 ulp at 0.06 is 3.7e-9.
    expect(dev).toBeLessThan(1e-8);
  });

  it('the plow displaces sand rather than deleting it', () => {
    const F = createField(W, H);
    const before = totalSand(F);
    plow(F, 0.5, 0.5, 4, 0.01, 1, 0);
    expect(totalSand(F)).toBeCloseTo(before, 4);
    // It dug a hole and raised a berm, forward of the hole more than aft.
    expect(deepest(F)).toBeGreaterThan(0.005);
    const c = 32 * W + 32;
    expect(F.h[c + 6]).toBeGreaterThan(F.h[c - 6]);
    expect(F.h[c + 6]).toBeGreaterThan(DEPTH0);
    // And what it turned is damp.
    expect(F.m[c]).toBeGreaterThan(0.8);
  });

  it('a dig to the floor makes no sand', () => {
    // The finger reads what is under it: removal cannot exceed what is
    // there, so the ring never lands sand that was never lifted. A hole
    // can only be as deep as its radius times the repose slope, so the
    // scrub has to be wide — eighty strokes of the lab's seven-cell finger
    // over a patch half the box across and a third tall have to reach the
    // floor and leave the box holding what it held. (A four-cell finger
    // never gets there: the pit it can hold open is too narrow.)
    const F = createField(W, H);
    const before = totalSand(F);
    const p = params({ Q: 0 });
    for (let k = 0; k < 80; k++) {
      const dir = k % 2 ? -1 : 1;
      const v = 0.5 + 0.2 * Math.sin(k * 0.9);
      for (let i = 0; i <= 12; i++) {
        const u = 0.25 + 0.5 * (dir > 0 ? i / 12 : 1 - i / 12);
        plow(F, u, v, 7, 0.0025, dir, 0);
      }
      run(F, p, 4);
    }
    run(F, p, 300);
    expect(isHealthy(F)).toBe(true);
    expect(Math.abs(totalSand(F) - before) / before).toBeLessThan(0.01);
    let floor = 0;
    for (let i = 0; i < F.h.length; i++) if (F.h[i] < 0.006) floor++;
    expect(floor).toBeGreaterThan(20);
  });

  it('the bucket fills its turret from its moat', () => {
    const F = createField(W, H);
    const before = totalSand(F);
    castle(F, 0.5, 0.5, 4, 0.03);
    expect(totalSand(F)).toBeCloseTo(before, 3);
    const c = 32 * W + 32;
    expect(F.h[c]).toBeCloseTo(DEPTH0 + 0.03, 4);
    expect(F.h[c + 7]).toBeLessThan(DEPTH0);
    expect(F.m[c]).toBe(1);
  });
});

describe('ripples', () => {
  it('emerge from seed noise at a wavelength between L and 2L', () => {
    const p = params({ steadyDir: east });
    const F = seeded();
    const r0 = relief(F);
    run(F, p, 2400);
    expect(isHealthy(F)).toBe(true);
    // Real growth, not a noise floor rearranging itself.
    expect(relief(F) / r0).toBeGreaterThan(8);
    // The stability analysis: growth for kL in (pi, 2pi).
    const lam = dominantWavelengthX(F);
    expect(lam).toBeGreaterThan(p.hop);
    expect(lam).toBeLessThan(2 * p.hop);
  }, 60000);

  it('do not appear without wind', () => {
    const F = seeded();
    const r0 = relief(F);
    run(F, params({ steadyDir: east, Q: 0 }), 1800);
    expect(relief(F)).toBeLessThanOrEqual(r0);
  }, 60000);

  it('form inside forty seconds and saturate below the repose slope', () => {
    const p = params({ steadyDir: east });
    const F = seeded();
    run(F, p, 2400); // 40 s
    // Visible: amplitude past a tenth of a millimetre on a metre box.
    expect(relief(F)).toBeGreaterThan(1e-4);
    run(F, p, 3600); // a further minute
    expect(isHealthy(F)).toBe(true);
    expect(maxSlope(F, DX)).toBeLessThan(p.reposeDry * 1.3);
  }, 120000);
});

describe('repose', () => {
  it('slumps a dry tower to the dry angle', () => {
    const F = createField(W, H);
    castle(F, 0.5, 0.5, 4, 0.03);
    F.m.fill(0); // bone dry
    const p = params({ Q: 0, creep: 0 });
    expect(maxSlope(F, DX)).toBeGreaterThan(p.reposeDry * 2);
    run(F, p, 900);
    expect(maxSlope(F, DX)).toBeLessThan(p.reposeDry * 1.05);
  });

  it('lets a damp tower stand where a dry one fell', () => {
    const F = createField(W, H);
    castle(F, 0.5, 0.5, 4, 0.03);
    // Not drying, so the turret keeps its cohesion.
    const p = params({ Q: 0, creep: 0, dryTau: 1e9 });
    run(F, p, 900);
    expect(maxSlope(F, DX)).toBeGreaterThan(p.reposeDry * 1.4);
    expect(maxSlope(F, DX)).toBeLessThan(p.reposeWet * 1.05);
  });

  it('crumbles a castle as it dries', () => {
    const F = createField(W, H);
    castle(F, 0.5, 0.5, 4, 0.03);
    const p = params({ Q: 0, creep: 0, dryTau: 4 });
    run(F, p, 90); // 1.5 s: still damp, still steep
    const early = maxSlope(F, DX);
    run(F, p, 2010); // 35 s: dried out
    const late = maxSlope(F, DX);
    expect(early).toBeGreaterThan(p.reposeDry * 1.4);
    expect(late).toBeLessThan(p.reposeDry * 1.05);
  });

  it('dries on the stated time constant', () => {
    const F = createField(W, H);
    F.m.fill(1);
    const p = params({ Q: 0, creep: 0, dryTau: 10 });
    run(F, p, 600); // one tau
    expect(F.m[0]).toBeCloseTo(Math.exp(-1), 3);
  });
});

describe('memory', () => {
  it('a furrow across the wind outlives the ripples by minutes', () => {
    // The named tension in the spec: ripples want transport, tracks want
    // stillness. Ripples must form inside 40 s (held above). A plowed
    // furrow across a steady full-strength wind — the worst case, since a
    // trench across the wind is a sand trap — must keep half its depth for
    // a minute and half its volume for three. Under the real wind, which
    // gusts at about half strength on average and rotates, both last
    // about twice as long.
    //
    // Deposition lands at the foot of the lee wall, which is the deepest
    // cell, so depth is the harsh measure and volume is the one that says
    // whether the track can still be seen.
    const p = params({ steadyDir: east });
    const F = seeded();
    // A furrow running north-south, across an east wind, cut in a sweep.
    for (let v = 0.2; v <= 0.8; v += 0.02) plow(F, 0.5, v, 4, 0.012, 0, 1);
    // Let the berms settle before measuring what we are protecting.
    run(F, params({ steadyDir: east, Q: 0 }), 120);
    const d0 = deepest(F);
    const a0 = deficit(F);
    expect(d0).toBeGreaterThan(0.012);
    const q = run(F, p, 3600); // 60 s
    expect(deepest(F)).toBeGreaterThan(0.5 * d0);
    run(F, q, 7200); // to 3 min
    expect(isHealthy(F)).toBe(true);
    expect(deficit(F)).toBeGreaterThan(0.5 * a0);
  }, 300000);
});

describe('stability', () => {
  it('runs five minutes of rotating wind without blowing up', () => {
    const F = seeded();
    castle(F, 0.3, 0.6, 4, 0.03);
    run(F, params(), 18000);
    expect(isHealthy(F)).toBe(true);
    expect(maxSlope(F, DX)).toBeLessThan(DEFAULT_PARAMS.reposeWet * 1.1);
  }, 180000);

  it('rotates the wind a full turn in five minutes', () => {
    const p = params();
    const a = windDir(0, p);
    const b = windDir(300, p);
    // Same heading up to the wander.
    expect(a[0] * b[0] + a[1] * b[1]).toBeGreaterThan(0.2);
    const c = windDir(150, p);
    expect(a[0] * c[0] + a[1] * c[1]).toBeLessThan(0);
  });
});
