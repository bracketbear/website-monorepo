import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PARAMS,
  createField,
  step,
  fluxPass,
  terrainPass,
  totalWater,
  dischargeField,
  dissection,
  correlate,
  isHealthy,
  type ErosionField,
  type ErosionParams,
} from './physics';
import { bakeHeights, trueRelief, spanMetres } from './bake';

const W = 64;
const H = 64;
const RELIEF = 0.22;

function params(over: Partial<ErosionParams> = {}): ErosionParams {
  return { ...DEFAULT_PARAMS, dx: 1 / H, asp: W / H, relief: RELIEF, ...over };
}

/** A plane tilting down toward +y: row 0 is the high end. */
function ramp(amp = RELIEF, rough = 0): Float32Array {
  const g = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      g[y * W + x] =
        amp * (1 - y / (H - 1)) +
        (rough ? rough * Math.sin(x * 2.7 + y * 1.3) : 0);
  return g;
}

/** Run n steps, advancing the forcing clock inside the loop as the GPU does. */
function run(F: ErosionField, p: ErosionParams, n: number, t0 = 0): number {
  const q = { ...p, t: t0 };
  for (let i = 0; i < n; i++) {
    q.t = (q.t + q.dt) % 4096;
    step(F, q);
  }
  return q.t;
}

describe('bake', () => {
  it('puts the Mt Hood crop at its true relief', () => {
    // A 512-pixel crop of zoom-12 terrarium tiles is ~13.7 km of ground.
    expect(spanMetres('hood')).toBeGreaterThan(13000);
    expect(spanMetres('hood')).toBeLessThan(14500);
    // 2564 m of relief across that span.
    expect(trueRelief('hood')).toBeCloseTo(0.1866, 3);
    // Pittsburgh really is nearly flat, which is why it is not the default.
    expect(trueRelief('pgh')).toBeLessThan(0.02);
  });

  it('fills the relief range and is deterministic', () => {
    const opts = { W, H, asp: 0.62, id: 'hood' as const, relief: RELIEF };
    const a = bakeHeights(opts);
    const b = bakeHeights(opts);
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(Math.max(...a) - Math.min(...a)).toBeGreaterThan(RELIEF * 0.4);
    expect(Math.max(...a)).toBeLessThan(RELIEF * 1.05);
  });

  it('puts north at the top', () => {
    // Mt Hood's peak is at source row 81 of 180, north of centre, so the
    // highest baked cell has to land above the middle of the canvas.
    const g = bakeHeights({
      W,
      H,
      asp: 0.62,
      id: 'hood',
      relief: RELIEF,
      seed: 0,
    });
    let best = 0;
    for (let i = 1; i < g.length; i++) if (g[i] > g[best]) best = i;
    expect(Math.floor(best / W)).toBeGreaterThan(H / 2);
  });

  it('covers the canvas at the same scale in either orientation', () => {
    // A portrait canvas crops the data horizontally and a landscape one
    // crops it vertically; neither squashes, so both still reach the peak.
    const tall = bakeHeights({
      W: 32,
      H: 64,
      asp: 0.5,
      id: 'hood',
      relief: 1,
      seed: 0,
    });
    const wide = bakeHeights({
      W: 64,
      H: 32,
      asp: 2,
      id: 'hood',
      relief: 1,
      seed: 0,
    });
    expect(Math.max(...tall)).toBeGreaterThan(0.9);
    expect(Math.max(...wide)).toBeGreaterThan(0.9);
  });
});

describe('water routing', () => {
  const still = { rain: 0, evap: 0, melt: 0, uplift: 0, ks: 0, kd: 0 };

  it('conserves water when the edges are closed and nothing drives it', () => {
    const F = createField(W, H, ramp());
    F.w.fill(2e-4);
    const before = totalWater(F);
    run(F, params({ ...still, openBoundary: false }), 400);
    expect(isHealthy(F)).toBe(true);
    expect(totalWater(F)).toBeCloseTo(before, 5);
  });

  it('drains off an open edge', () => {
    const F = createField(W, H, ramp());
    F.w.fill(2e-4);
    const before = totalWater(F);
    run(F, params(still), 600);
    expect(isHealthy(F)).toBe(true);
    // With the edge treated as a same-height weir rather than a cliff this
    // sat above 99%: interior head differences come from the terrain slope
    // and dwarf the local depth, so the slope fed the rim faster than the
    // rim could drain and the whole table flooded.
    expect(totalWater(F)).toBeLessThan(before * 0.5);
  });

  it('carries a band of water downhill', () => {
    const F = createField(W, H, ramp());
    // Wet only the high end, so what is measured is transport rather than
    // the steady sheet a uniform fill settles into.
    for (let y = 0; y < H / 4; y++)
      for (let x = 0; x < W; x++) F.w[y * W + x] = 8e-4;
    run(F, params({ ...still, openBoundary: false }), 900);
    let top = 0;
    let bottom = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (y < H / 2) top += F.w[y * W + x];
        else bottom += F.w[y * W + x];
    expect(bottom).toBeGreaterThan(top);
  });

  it('never sends more water out of a cell than it holds', () => {
    const F = createField(W, H, ramp(RELIEF, 0.004));
    F.w.fill(1e-6);
    // An absurd flow speed: only the outflow clamp keeps this finite.
    run(F, params({ grav: 400, rain: 0 }), 400);
    expect(isHealthy(F)).toBe(true);
  });

  it('keeps flux non-negative and water non-negative, pass by pass', () => {
    const F = createField(W, H, ramp(RELIEF, 0.01));
    F.w.fill(5e-5);
    const p = params();
    fluxPass(F, p);
    for (let i = 0; i < F.f.length; i++)
      expect(F.f[i]).toBeGreaterThanOrEqual(0);
    terrainPass(F, p);
    for (let i = 0; i < F.w.length; i++)
      expect(F.w[i]).toBeGreaterThanOrEqual(0);
  });
});

describe('erosion', () => {
  const hood = () => bakeHeights({ W, H, asp: 1, id: 'hood', relief: RELIEF });
  const p = () => params({ dx: 1 / H, asp: 1 });

  /**
   * Run the model on a copy of the bake and return the final bed together
   * with the discharge accumulated along the way.
   */
  function runIsolated(b0: Float32Array, over: Partial<ErosionParams>) {
    const F = createField(W, H, b0);
    const q = { ...p(), ...over, t: 0 };
    const power = new Float32Array(W * H);
    for (let i = 0; i < 7200; i++) {
      q.t = (q.t + q.dt) % 4096;
      step(F, q);
      if (i % 20 === 0) {
        const d = dischargeField(F, q.dx);
        for (let k = 0; k < power.length; k++) power[k] += d[k];
      }
    }
    return { b: F.b, b0: F.b0, power };
  }

  it('stays finite over a long run on real terrain', () => {
    const F = createField(W, H, hood());
    run(F, p(), 7200);
    expect(isHealthy(F)).toBe(true);
    expect(Math.max(...F.b)).toBeGreaterThan(RELIEF * 0.5);
  });

  it('cuts the bed where the discharge runs', () => {
    // The claim the whole animation rests on: the valleys are where the
    // water went, not where a texture said.
    //
    // Measured against a control run with erosion switched off but creep and
    // slope failure left in, so what is correlated is the material the WATER
    // took, not the material diffusion moved. Without that control the
    // number can come out negative on a perfectly good landscape, because
    // creep lowers ridges and fills valleys — the opposite signature, and
    // nothing to do with what the rivers did.
    const b0 = hood();
    const control = runIsolated(b0, { ks: 0, kd: 0, uplift: 0 });
    const eroded = runIsolated(b0, {});
    const extra = new Float32Array(W * H);
    let deepest = 0;
    for (let k = 0; k < extra.length; k++) {
      extra[k] = control.b[k] - eroded.b[k];
      deepest = Math.max(deepest, eroded.b0[k] - eroded.b[k]);
    }
    expect(correlate(extra, eroded.power)).toBeGreaterThan(0.25);
    // And it is a visible amount of rock, not a rounding error.
    expect(deepest).toBeGreaterThan(RELIEF * 0.02);
  });

  it('dissects the surface rather than sanding it flat', () => {
    // Capacity taken from the gradient MAGNITUDE fails here: it is largest
    // on the steep walls of a nascent channel, where the water is running
    // along the contour and doing nothing, so walls cut back as fast as
    // floors and channels wash flat as fast as they form. Capacity along the
    // flow direction is what makes this number climb.
    //
    // The comparison is against the same control, for the same reason: creep
    // smooths the seed roughness out of the bake within seconds, so the
    // baked surface is not a fair baseline for anything.
    const b0 = hood();
    const control = runIsolated(b0, { ks: 0, kd: 0, uplift: 0 });
    const eroded = runIsolated(b0, {});
    expect(dissection(eroded.b, W, H)).toBeGreaterThan(
      dissection(control.b, W, H) * 1.15
    );
  });

  it('lays sediment back down where the flow slows', () => {
    const F = createField(W, H, hood());
    run(F, p(), 5000);
    let up = 0;
    for (let i = 0; i < F.b.length; i++) if (F.b[i] > F.b0[i] + 1e-6) up++;
    expect(up).toBeGreaterThan(F.b.length * 0.01);
  });

  it('is capacity-limited, so the dissolving rate barely moves it', () => {
    // Measured, and it is why the Erosion Rate control scales capacity
    // rather than this: suspended load reaches capacity within a step or
    // two, so five times the dissolving rate buys well under half again as
    // much incision, and most of the rest of what it buys is a stiffer
    // integrator.
    const b0 = hood();
    const a = createField(W, H, b0);
    const b = createField(W, H, b0);
    run(a, params({ dx: 1 / H, asp: 1, ks: 40 }), 2400);
    run(b, params({ dx: 1 / H, asp: 1, ks: 200 }), 2400);
    const deepest = (F: ErosionField) => {
      let m = 0;
      for (let i = 0; i < F.b.length; i++) m = Math.max(m, F.b0[i] - F.b[i]);
      return m;
    };
    expect(deepest(b) / deepest(a)).toBeLessThan(1.5);
  });
});

describe('snow', () => {
  it('caps the high ground and melts below the line', () => {
    const F = createField(
      W,
      H,
      bakeHeights({ W, H, asp: 1, id: 'hood', relief: RELIEF })
    );
    const p = params({ dx: 1 / H, asp: 1 });
    run(F, p, 3000);
    const line = p.snowLine * RELIEF;
    let high = 0;
    let low = 0;
    for (let i = 0; i < F.snow.length; i++)
      if (F.b0[i] > line + 0.02) high += F.snow[i];
      else if (F.b0[i] < line - 0.05) low += F.snow[i];
    expect(high).toBeGreaterThan(0);
    expect(low).toBeLessThan(high * 0.05);
  });
});
