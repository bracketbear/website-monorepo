import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PARAMS,
  createDisc,
  step,
  stepBodies,
  circularVelocity,
  discForce,
  eatenBy,
  tangentialForce,
  ringIndex,
  ringMean,
  totalMass,
  wakeAmplitude,
  peakPhi,
  isHealthy,
  SEED_Q,
  UNITS_PER_SECOND,
  type Disc,
  type DiscParams,
  type Planet,
} from './physics';

const NR = 64;
const NPHI = 128;
const ORBIT = Math.round((2 * Math.PI) / 0.02);
const SLOW = 300_000;

// The mirror is four times coarser than production, so 0.02 here is an
// acoustic Courant number of about 0.3 at the inner rings — safe, and half
// the steps of STEP. The production-grid test in physics.sim.test.ts is what
// guards stability at the size the toy runs.
function params(over: Partial<DiscParams> = {}): DiscParams {
  return { ...DEFAULT_PARAMS, dt: 0.02, ...over };
}

function planetAt(r: number, q: number): Planet {
  const [vx, vy] = circularVelocity(r, 0);
  return { x: r, y: 0, vx, vy, q, age: 0, ax: 0, ay: 0 };
}

/** The disc and its planets, stepped together; the planets do not feel the disc. */
function evolve(D: Disc, p: DiscParams, planets: Planet[], steps: number) {
  for (let s = 0; s < steps; s++) {
    step(D, p, planets, true);
    stepBodies(planets, p.dt, p.h);
  }
}

describe('the wake', () => {
  it(
    'exists, scales with q in the linear regime, trails outside and leads inside',
    () => {
      const p = params({ accRate: 0 });
      const A = createDisc(NR, NPHI, p);
      const a = planetAt(1.0, 1e-4);
      evolve(A, p, [a], 5 * ORBIT);
      const B = createDisc(NR, NPHI, p);
      const b = planetAt(1.0, 5e-5);
      evolve(B, p, [b], 5 * ORBIT);
      expect(isHealthy(A) && isHealthy(B)).toBe(true);

      const wa = wakeAmplitude(A, 1.0, p.h);
      const wb = wakeAmplitude(B, 1.0, p.h);
      expect(wa).toBeGreaterThan(0.01);
      // Halve the mass inside the linear regime and the wake halves.
      expect(wa / wb).toBeGreaterThan(1.4);
      expect(wa / wb).toBeLessThan(2.8);

      const phiP = Math.atan2(a.y, a.x);
      const wrap = (d: number) =>
        ((d % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const H = p.h;
      // Outside the orbit the arm has fallen behind the planet; inside it
      // has run ahead. That is the Lindblad geometry, not a drawn spiral.
      const outer = wrap(peakPhi(A, ringIndex(A, 1.0 + 3 * H)) - phiP);
      const inner = wrap(peakPhi(A, ringIndex(A, 1.0 - 3 * H)) - phiP);
      expect(outer).toBeGreaterThan(Math.PI);
      expect(inner).toBeLessThan(Math.PI);
    },
    SLOW
  );
});

describe('the gap', () => {
  it(
    'opens past the threshold and not below it, against a q = 0 control',
    () => {
      const p = params({ accRate: 0 });
      const n = 60 * ORBIT;
      const C = createDisc(NR, NPHI, p);
      evolve(C, p, [], n);
      const S = createDisc(NR, NPHI, p);
      evolve(S, p, [planetAt(1.0, 1e-4)], n);
      const G = createDisc(NR, NPHI, p);
      evolve(G, p, [planetAt(1.0, 1e-3)], n);
      const i = ringIndex(C, 1.0);
      const ctrl = ringMean(C, i);
      expect(ringMean(S, i) / ctrl).toBeGreaterThan(0.85);
      // 128 × 64 puts two cells across the Hill radius; measured 0.63 at 60 orbits.
      expect(ringMean(G, i) / ctrl).toBeLessThan(0.7);
    },
    SLOW
  );
});

describe('the disc pulls back', () => {
  it(
    'torques a low-mass planet inward',
    () => {
      const p = params({ accRate: 0 });
      const D = createDisc(NR, NPHI, p);
      const pl = planetAt(1.0, 1e-4);
      evolve(D, p, [pl], 5 * ORBIT);
      const [ax, ay] = discForce(D, pl, p.h);
      expect(tangentialForce(pl, ax, ay)).toBeLessThan(0);
    },
    SLOW
  );

  it('feeds a planet exactly what the sink removed', () => {
    const p = params({ accRate: 0.5 });
    const D = createDisc(NR, NPHI, p);
    const pl = planetAt(1.0, 1e-3);
    step(D, p, [pl], true);
    let all = 0;
    for (let i = 0; i < D.nr; i++)
      for (let j = 0; j < D.nphi; j++) all += D.eat[i * D.nphi + j] * D.area[i];
    expect(eatenBy(D, pl, p)).toBeCloseTo(all, 12);
  });
});

describe('the production grid', () => {
  it(
    'holds at 512 × 192 for two orbits at the production step',
    () => {
      // The coarse mirror sits at a quarter of production's Courant number
      // and could not see the inner rings go NaN at dt = 0.02. This is
      // the one test that runs the mirror at the size the toy runs.
      const p = { ...DEFAULT_PARAMS };
      const D = createDisc(192, 512, p);
      const pl = [planetAt(1.1, 2e-4)];
      const m0 = totalMass(D);
      evolve(D, p, pl, 1200);
      expect(isHealthy(D)).toBe(true);
      expect(totalMass(D) / m0).toBeGreaterThan(0.98);
    },
    SLOW
  );

  it(
    'feeds a seed on a circular orbit to the gap threshold in under two minutes',
    () => {
      // The sink is rate-limited well below what shear refills it with,
      // so the rate is the lever; measured here at production cell size
      // because the sink floor is in cells.
      const p = { ...DEFAULT_PARAMS };
      const D = createDisc(192, 512, p);
      const pl = planetAt(1.2, SEED_Q);
      let eaten = 0;
      for (let s = 0; s < 200; s++) {
        step(D, p, [pl], true);
        eaten += eatenBy(D, pl, p);
        stepBodies([pl], p.dt, p.h);
      }
      const perUnit = eaten / (200 * p.dt);
      const seconds = (3.8e-4 - SEED_Q) / perUnit / UNITS_PER_SECOND;
      expect(isHealthy(D)).toBe(true);
      expect(perUnit).toBeGreaterThan(0);
      expect(seconds).toBeLessThan(120);
    },
    SLOW
  );
});
