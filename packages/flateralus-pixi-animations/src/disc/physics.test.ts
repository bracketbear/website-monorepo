import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PARAMS,
  R_IN,
  R_OUT,
  R_ESCAPE,
  createDisc,
  ringIndex,
  ringMean,
  totalMass,
  isHealthy,
  sourcePass,
  step,
  phiPass,
  hillRadius,
  stepBodies,
  circularVelocity,
  elementsOf,
  orbitPath,
  orbitEnergy,
  settle,
  type DiscParams,
  type Planet,
} from './physics';

const NR = 48;
const NPHI = 96;

// The mirror is four times coarser than production, so 0.02 here is an
// acoustic Courant number of about 0.3 at the inner rings — safe, and half
// the steps of STEP. The production-grid test in physics.sim.test.ts is what
// guards stability at the size the toy runs.
function params(over: Partial<DiscParams> = {}): DiscParams {
  return { ...DEFAULT_PARAMS, dt: 0.02, ...over };
}

function planet(x: number, y: number, q: number): Planet {
  const r = Math.hypot(x, y);
  const vK = 1 / Math.sqrt(r);
  return { x, y, vx: (-y / r) * vK, vy: (x / r) * vK, q, age: 0, ax: 0, ay: 0 };
}

/** Run n steps, clearing the eat channel each step and totalling it. */
function run(
  D: ReturnType<typeof createDisc>,
  p: DiscParams,
  planets: Planet[],
  n: number
): number {
  let eaten = 0;
  for (let s = 0; s < n; s++) {
    step(D, p, planets, true);
    for (let i = 0; i < D.nr; i++) {
      let row = 0;
      for (let j = 0; j < D.nphi; j++) row += D.eat[i * D.nphi + j];
      eaten += row * D.area[i];
    }
  }
  return eaten;
}

const ORBIT = Math.round((2 * Math.PI) / 0.02);

function phiPassOnly(D: ReturnType<typeof createDisc>, p: DiscParams) {
  phiPass(D, p);
}

describe('the opening disc', () => {
  it('holds about discMass, less the tapers', () => {
    const D = createDisc(NR, NPHI, params());
    const m = totalMass(D);
    expect(m).toBeGreaterThan(0.85 * DEFAULT_PARAMS.discMass);
    expect(m).toBeLessThan(1.0 * DEFAULT_PARAMS.discMass);
    expect(isHealthy(D)).toBe(true);
  });

  it('rotates sub-Keplerian by the pressure gradient', () => {
    const p = params();
    const D = createDisc(NR, NPHI, p);
    const i = ringIndex(D, 1.0);
    const r = D.r[i];
    const vK = 1 / Math.sqrt(r);
    // Σ ∝ 1/r and c_s² = h²/r give v_φ² = (1 − 2h²) v_K² analytically.
    const want = vK * Math.sqrt(1 - 2 * p.h * p.h);
    expect(Math.abs(D.vp[i * NPHI] - want) / vK).toBeLessThan(2e-3);
    expect(D.vr[i * NPHI]).toBe(0);
  });

  it('is uniform along φ and falls as 1/r in the body', () => {
    const D = createDisc(NR, NPHI, params());
    const a = ringIndex(D, 0.6);
    const b = ringIndex(D, 1.4);
    expect(ringMean(D, a) * D.r[a]).toBeCloseTo(ringMean(D, b) * D.r[b], 6);
    for (let j = 1; j < NPHI; j++)
      expect(D.sig[a * NPHI + j]).toBe(D.sig[a * NPHI]);
  });

  it('spans the cavity to the edge with same-shaped cells', () => {
    const D = createDisc(NR, NPHI, params());
    expect(D.rf[0]).toBeCloseTo(R_IN, 9);
    expect(D.rf[NR]).toBeCloseTo(R_OUT, 9);
    expect(D.dlnr).toBeCloseTo(Math.log(R_OUT / R_IN) / NR, 12);
    expect(D.dphi).toBeCloseTo((2 * Math.PI) / NPHI, 12);
  });
});

describe('the source pass', () => {
  it('leaves the equilibrium disc where it is, without viscosity', () => {
    // No ν: the only forces are the ones the opening state was solved
    // against, so any drift is a stencil that does not match createDisc.
    const p = params({ alpha: 0 });
    const D = createDisc(NR, NPHI, p);
    const vp0 = Float32Array.from(D.vp);
    for (let s = 0; s < 50; s++) sourcePass(D, p, [], true);
    for (let k = 0; k < D.sig.length; k++) {
      expect(Math.abs(D.vr[k])).toBeLessThan(1e-6);
      expect(Math.abs(D.vp[k] - vp0[k])).toBeLessThan(1e-6);
    }
  });

  it('viscosity only stirs the edges', () => {
    // With ν on, the clamped edge rings see a one-sided Laplacian of a
    // curved v_φ and drift; the body of the disc must not.
    const p = params();
    const D = createDisc(NR, NPHI, p);
    const vp0 = Float32Array.from(D.vp);
    for (let s = 0; s < 50; s++) sourcePass(D, p, [], true);
    const a = ringIndex(D, 0.4);
    const b = ringIndex(D, 1.6);
    for (let i = a; i <= b; i++)
      for (let j = 0; j < NPHI; j++) {
        const k = i * NPHI + j;
        expect(Math.abs(D.vr[k])).toBeLessThan(1e-4);
        expect(Math.abs(D.vp[k] - vp0[k])).toBeLessThan(1e-4);
      }
  });

  it('removes gas inside the sink and records exactly what it removed', () => {
    const p = params({ accRate: 0.5 });
    const D = createDisc(NR, NPHI, p);
    const pl = planet(1.0, 0, 1e-3);
    const before = totalMass(D);
    sourcePass(D, p, [pl], true);
    let eaten = 0;
    for (let i = 0; i < NR; i++)
      for (let j = 0; j < NPHI; j++) eaten += D.eat[i * NPHI + j] * D.area[i];
    expect(eaten).toBeGreaterThan(0);
    expect(Math.abs(before - totalMass(D) - eaten) / eaten).toBeLessThan(1e-5);
  });

  it('accumulates eaten mass across substeps until told to clear', () => {
    const p = params({ accRate: 0.5 });
    const D = createDisc(NR, NPHI, p);
    const pl = planet(1.0, 0, 1e-3);
    sourcePass(D, p, [pl], true);
    const one = Float32Array.from(D.eat);
    sourcePass(D, p, [pl], false);
    let grew = false;
    for (let k = 0; k < one.length; k++) {
      expect(D.eat[k]).toBeGreaterThanOrEqual(one[k]);
      if (D.eat[k] > one[k]) grew = true;
    }
    expect(grew).toBe(true);
    sourcePass(D, p, [pl], true);
    for (let k = 0; k < one.length; k++)
      expect(D.eat[k]).toBeLessThanOrEqual(one[k] + 1e-12);
  });

  it('a sink is never smaller than the floor', () => {
    const pl = planet(1.0, 0, 1e-5);
    // Half a Hill radius at Earth mass is 0.007, under one production cell.
    expect(0.5 * hillRadius(pl)).toBeLessThan(0.01);
  });

  it('pulls gas toward a planet', () => {
    const p = params({ accRate: 0 });
    const D = createDisc(NR, NPHI, p);
    const pl = planet(1.0, 0, 1e-2);
    sourcePass(D, p, [pl], true);
    // Just inside the planet's radius, gas is pulled outward (toward it);
    // just outside, inward.
    const iIn = ringIndex(D, 0.9);
    const iOut = ringIndex(D, 1.1);
    expect(D.vr[iIn * NPHI + 0]).toBeGreaterThan(0);
    expect(D.vr[iOut * NPHI + 0]).toBeLessThan(0);
  });
});

describe('transport', () => {
  it('holds the equilibrium disc for three orbits', () => {
    const p = params();
    const D = createDisc(NR, NPHI, p);
    const sig0 = Float32Array.from(D.sig);
    run(D, p, [], 3 * ORBIT);
    expect(isHealthy(D)).toBe(true);
    const a = ringIndex(D, 0.4);
    const b = ringIndex(D, 1.6);
    for (let i = a; i <= b; i++)
      for (let j = 0; j < NPHI; j++) {
        const k = i * NPHI + j;
        expect(Math.abs(D.sig[k] - sig0[k]) / sig0[k]).toBeLessThan(0.01);
        expect(Math.abs(D.vr[k])).toBeLessThan(2e-3);
      }
  });

  it('conserves mass across transport, the sink and the open edges', () => {
    const p = params();
    const D = createDisc(NR, NPHI, p);
    const before = totalMass(D);
    const eaten = run(D, p, [planet(1.0, 0, 1e-4)], 300);
    const after = totalMass(D) + eaten + D.outflow;
    // Σ is float32 and the floor may add mass only where Σ is already at
    // 1e-4 of the disc; 1e-4 relative is the honest bound, not 1e-7.
    expect(Math.abs(after - before) / before).toBeLessThan(1e-4);
    expect(eaten).toBeGreaterThan(0);
  });

  it('shifts each ring by the nearest whole number of cells', () => {
    const p = params();
    const D = createDisc(NR, NPHI, p);
    // Paint one cell of extra Σ on the r = 1 ring and step once with no
    // sources: the blob moves by round(Ω dt / Δφ) cells and nothing else.
    const i = ringIndex(D, 1.0);
    D.sig[i * NPHI + 10] *= 1.5;
    const om = Math.pow(D.r[i], -1.5);
    const n = Math.round((om * p.dt) / D.dphi);
    phiPassOnly(D, p);
    let at = 0;
    let best = 0;
    for (let j = 0; j < NPHI; j++)
      if (D.sig[i * NPHI + j] > best) {
        best = D.sig[i * NPHI + j];
        at = j;
      }
    expect(at).toBe((10 + n) % NPHI);
  });

  it('stays finite at the control extremes', () => {
    const p = params({ h: 0.03, alpha: 1e-2, discMass: 0.05, accRate: 0.2 });
    const D = createDisc(NR, NPHI, p);
    run(D, p, [planet(0.7, 0, 5e-4), planet(-1.3, 0, 1e-3)], 2 * ORBIT);
    expect(isHealthy(D)).toBe(true);
  });
});

describe('planets', () => {
  it('keeps a circular orbit for fifty orbits without drifting', () => {
    const [vx, vy] = circularVelocity(1, 0);
    const pl: Planet = { x: 1, y: 0, vx, vy, q: 1e-4, age: 0, ax: 0, ay: 0 };
    const E0 = orbitEnergy(pl);
    for (let s = 0; s < 50 * ORBIT; s++)
      stepBodies([pl], DEFAULT_PARAMS.dt, 0.05);
    expect(Math.abs(orbitEnergy(pl) - E0) / Math.abs(E0)).toBeLessThan(1e-4);
    expect(Math.abs(Math.hypot(pl.x, pl.y) - 1)).toBeLessThan(2e-3);
  });

  it('describes a circular throw as e = 0, a = r', () => {
    const [vx, vy] = circularVelocity(0.8, 0.6);
    const el = elementsOf(0.8, 0.6, vx, vy);
    expect(el.bound).toBe(true);
    expect(el.e).toBeLessThan(1e-9);
    expect(el.a).toBeCloseTo(1, 9);
  });

  it('draws the ellipse the body actually flies', () => {
    // At periapsis r = 1 with v = 1.2: a = 1/(2 − 1.44) = 1.786, e = 0.44.
    const el = elementsOf(1, 0, 0, 1.2);
    expect(el.a).toBeCloseTo(1.7857, 3);
    expect(el.e).toBeCloseTo(0.44, 3);
    const path = orbitPath(el, 720);
    const pl: Planet = {
      x: 1,
      y: 0,
      vx: 0,
      vy: 1.2,
      q: 1e-5,
      age: 0,
      ax: 0,
      ay: 0,
    };
    const T = 2 * Math.PI * Math.pow(el.a, 1.5);
    const steps = Math.round(T / DEFAULT_PARAMS.dt);
    for (let s = 0; s < steps; s++) {
      stepBodies([pl], DEFAULT_PARAMS.dt, 0.05);
      let best = Infinity;
      for (let m = 0; m < path.length; m += 2)
        best = Math.min(best, Math.hypot(path[m] - pl.x, path[m + 1] - pl.y));
      expect(best).toBeLessThan(0.02);
    }
  });

  it('calls an escape a hyperbola', () => {
    const el = elementsOf(1, 0, 0, 1.6);
    expect(el.bound).toBe(false);
    expect(el.e).toBeGreaterThan(1);
    const path = orbitPath(el, 200);
    expect(path.length).toBeGreaterThan(0);
    for (let m = 0; m < path.length; m += 2)
      expect(Math.hypot(path[m], path[m + 1])).toBeLessThan(
        1.5 * R_ESCAPE + 1e-9
      );
  });

  it('merges two planets inside a Hill radius, conserving mass and momentum', () => {
    const a = planet(1, 0, 1e-3);
    const b: Planet = { ...planet(1, 0, 1e-3), x: 1.02, vx: 0.1 };
    const list = [a, b];
    const ev = settle(list, 0.05);
    expect(list).toHaveLength(1);
    expect(ev.map((e) => e.type)).toEqual(['merge']);
    expect(list[0].q).toBeCloseTo(2e-3, 12);
    expect(list[0].vx).toBeCloseTo(0.05, 9);
  });

  it('drops a planet into the star and lets one leave', () => {
    const fell: Planet = { ...planet(1, 0, 3e-4), x: 0.2, y: 0 };
    const left: Planet = { ...planet(1, 0, 3e-4), x: 2.5, y: 0 };
    const stays = planet(1, 0, 3e-4);
    const list = [fell, stays, left];
    const ev = settle(list, 0.05);
    expect(list).toEqual([stays]);
    expect(ev.map((e) => e.type).sort()).toEqual(['escape', 'fell']);
    expect(ev.find((e) => e.type === 'fell')?.q).toBe(3e-4);
  });
});
