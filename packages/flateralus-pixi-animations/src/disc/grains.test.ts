import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PARAMS,
  R_IN,
  R_OUT,
  createDisc,
  ringIndex,
  type DiscParams,
} from './physics';
import {
  ST_MIN,
  ST_MAX,
  driftRate,
  mulberry32,
  sampleGas,
  seedGrains,
  stepGrains,
} from './grains';

const NR = 64;
const NPHI = 128;
const TAU = 2 * Math.PI;

function params(over: Partial<DiscParams> = {}): DiscParams {
  return { ...DEFAULT_PARAMS, dt: 0.02, ...over };
}

/** One grain at (r, φ) with Stokes number st. */
function grain(r: number, phi: number, st: number): Float32Array {
  return Float32Array.from([Math.log(r), phi, st, 1]);
}

describe('seeding', () => {
  it('draws Stokes numbers log-uniform in range and radii uniform on [0.3, 1.9]', () => {
    const g = seedGrains(4096, mulberry32(1));
    let lo = 0;
    let rlo = 0;
    for (let k = 0; k < 4096; k++) {
      const r = Math.exp(g[k * 4]);
      const st = g[k * 4 + 2];
      expect(r).toBeGreaterThanOrEqual(0.3);
      expect(r).toBeLessThanOrEqual(1.9);
      expect(g[k * 4 + 1]).toBeGreaterThanOrEqual(0);
      expect(g[k * 4 + 1]).toBeLessThan(TAU);
      expect(st).toBeGreaterThanOrEqual(ST_MIN);
      expect(st).toBeLessThanOrEqual(ST_MAX);
      expect(g[k * 4 + 3]).toBe(1);
      if (st < Math.sqrt(ST_MIN * ST_MAX)) lo++;
      if (r < 1.1) rlo++;
    }
    // Log-uniform: half below the geometric mean. Uniform in r: half below 1.1.
    expect(lo / 4096).toBeGreaterThan(0.45);
    expect(lo / 4096).toBeLessThan(0.55);
    expect(rlo / 4096).toBeGreaterThan(0.45);
    expect(rlo / 4096).toBeLessThan(0.55);
  });

  it('is deterministic for a seed and differs between seeds', () => {
    const a = seedGrains(64, mulberry32(7));
    const b = seedGrains(64, mulberry32(7));
    const c = seedGrains(64, mulberry32(8));
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(Array.from(a)).not.toEqual(Array.from(c));
  });
});

describe('sampling the gas', () => {
  it('returns the ring profile away from the seam', () => {
    const p = params();
    const D = createDisc(NR, NPHI, p);
    const i = ringIndex(D, 1.0);
    const [sig, vr, vp] = sampleGas(D, Math.log(D.r[i]), Math.PI);
    expect(sig).toBeCloseTo(D.sig[i * NPHI], 6);
    expect(vr).toBeCloseTo(0, 9);
    expect(vp).toBeCloseTo(D.vp[i * NPHI], 6);
  });

  it('wraps at the seam instead of clamping', () => {
    const p = params();
    const D = createDisc(NR, NPHI, p);
    const i = ringIndex(D, 1.0);
    // Mark the last cell of the ring; a sample just past φ = 0 must see it.
    D.sig[i * NPHI + NPHI - 1] *= 2;
    const lnr = Math.log(D.r[i]);
    const eps = 0.25 * D.dphi;
    const [near] = sampleGas(D, lnr, eps);
    const [far] = sampleGas(D, lnr, Math.PI);
    expect(near).toBeGreaterThan(far * 1.2);
    // And symmetrically from the other side of the seam.
    const [wrap] = sampleGas(D, lnr, TAU - eps);
    expect(wrap).toBeGreaterThan(far * 1.5);
  });
});

describe('the drift', () => {
  it('carries a grain inward at the terminal rate in the smooth disc', () => {
    // The gas is frozen at its equilibrium — never stepped — so v_r is
    // exactly zero and the grain's radial motion is the drift alone.
    const p = params();
    const D = createDisc(NR, NPHI, p);
    const g = grain(1.0, 1.0, 0.1);
    const T = TAU; // one Keplerian period at r = 1
    const steps = Math.round(T / p.dt);
    const r0 = Math.exp(g[0]);
    const phi0 = g[1];
    let dphi = 0;
    let last = phi0;
    for (let s = 0; s < steps; s++) {
      stepGrains(D, p, g);
      let d = g[1] - last;
      if (d < -Math.PI) d += TAU;
      dphi += d;
      last = g[1];
    }
    const r1 = Math.exp(g[0]);
    const measured = (r1 - r0) / (steps * p.dt);
    const expected = driftRate(D, p, 1.0, 0.1);
    expect(expected).toBeLessThan(0);
    expect(Math.abs(measured / expected - 1)).toBeLessThan(0.05);
    // φ advances at the gas's rate: v_φ(r = 1) · T, with r = v_K = 1. The
    // grain ends 0.3 % further in, where Ω is 0.5 % higher, so allow two cells.
    const [, , vp0] = sampleGas(D, 0, 1.0);
    expect(Math.abs(dphi - vp0 * T)).toBeLessThan(2 * D.dphi);
    expect(g[3]).toBe(1);
  });

  it('empties a lane and leaves the smooth disc alone', () => {
    // A constructed lane, not a torque-carved one: the mirror's 30-orbit
    // gap is shallow and the background drift confounds a control. The
    // gas is frozen; only the grains move. St = 0.2, the fastest drifter.
    // The lane is 80 % deep and H wide: the gradient stencil spans a cell
    // each way, wider than the lane, so a shallower dip leaves grains
    // near the bottom e-folding away too slowly to clear in three orbits.
    const p = params();
    const D = createDisc(NR, NPHI, p);
    const L = createDisc(NR, NPHI, p);
    for (let i = 0; i < NR; i++) {
      const x = (L.r[i] - 1) / 0.05;
      const dip = 1 - 0.8 * Math.exp(-x * x);
      for (let j = 0; j < NPHI; j++) L.sig[i * NPHI + j] *= dip;
    }
    const N = 400;
    const H = 0.05;
    const mk = () => {
      const g = new Float32Array(N * 4);
      for (let k = 0; k < N; k++) {
        const r = 1 - H + (2 * H * (k + 0.5)) / N;
        g.set([Math.log(r), (TAU * ((k * 37) % N)) / N, 0.2, 1], k * 4);
      }
      return g;
    };
    const inLane = (g: Float32Array) => {
      let n = 0;
      for (let k = 0; k < N; k++) if (Math.abs(Math.exp(g[k * 4]) - 1) < H) n++;
      return n / N;
    };
    const gl = mk();
    const gs = mk();
    const steps = Math.round((3 * TAU) / p.dt);
    for (let s = 0; s < steps; s++) {
      stepGrains(L, p, gl);
      stepGrains(D, p, gs);
    }
    expect(inLane(gl)).toBeLessThan(0.05);
    expect(inLane(gs)).toBeGreaterThan(0.7);
  });

  it('clamps the drift to the sound speed where Σ sits at the floor', () => {
    // The opening profile never exercises the clamp (its steepest cells
    // ask for 2 % of c_s), so construct the case: two rings at the floor
    // and a grain on the outer one, with the profile one cell further out.
    // The unclamped drift is t_s c² Σ_profile / (floor · 2Δr), a thousand
    // times the sound speed.
    const p = params();
    const D = createDisc(NR, NPHI, p);
    const i = ringIndex(D, 1.0);
    for (let j = 0; j < NPHI; j++) {
      D.sig[i * NPHI + j] = D.floor;
      D.sig[(i - 1) * NPHI + j] = D.floor;
    }
    const r = D.r[i];
    const cs = p.h / Math.sqrt(r);
    const unclamped = driftRate(D, p, r, ST_MAX);
    expect(Math.abs(unclamped)).toBeGreaterThan(10 * cs);
    const g = grain(r, 2.0, ST_MAX);
    const before = g[0];
    stepGrains(D, p, g);
    const dlnr = Math.abs(g[0] - before);
    // |v_r + Δv_r| / r · dt ≤ (|v_r| + c_s) / r · dt; v_r is 0 here.
    expect(dlnr).toBeLessThanOrEqual(((cs + 1e-6) / r) * p.dt);
    expect(dlnr).toBeGreaterThan(((0.5 * cs) / r) * p.dt);
    expect(Number.isFinite(g[0])).toBe(true);
    expect(Number.isFinite(g[1])).toBe(true);
    expect(g[3]).toBe(1);
  });

  it('kills a grain that leaves the domain and never revives it', () => {
    const p = params();
    const D = createDisc(NR, NPHI, p);
    // Push the gas outward hard so the grain is carried past R_OUT.
    for (let k = 0; k < D.vr.length; k++) D.vr[k] = 0.5;
    const g = grain(R_OUT * 0.999, 1.0, 0.1);
    stepGrains(D, p, g);
    expect(g[3]).toBe(0);
    const frozen = Array.from(g);
    for (let k = 0; k < D.vr.length; k++) D.vr[k] = -0.5;
    stepGrains(D, p, g);
    expect(Array.from(g)).toEqual(frozen);
    // And inward across the cavity edge.
    const h = grain(R_IN * 1.001, 1.0, 0.1);
    stepGrains(D, p, h);
    expect(h[3]).toBe(0);
  });
});
