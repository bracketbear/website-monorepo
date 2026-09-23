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
  wakeAmplitude,
  peakPhi,
  isHealthy,
  type Disc,
  type DiscParams,
  type Planet,
} from './physics';

const NR = 64;
const NPHI = 128;
const ORBIT = Math.round((2 * Math.PI) / DEFAULT_PARAMS.dt);
const SLOW = 300_000;

function params(over: Partial<DiscParams> = {}): DiscParams {
  return { ...DEFAULT_PARAMS, ...over };
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
    'exists, scales with q, trails outside and leads inside',
    () => {
      const p = params({ accRate: 0 });
      const A = createDisc(NR, NPHI, p);
      const a = planetAt(1.0, 1e-4);
      evolve(A, p, [a], 5 * ORBIT);
      const B = createDisc(NR, NPHI, p);
      const b = planetAt(1.0, 2e-4);
      evolve(B, p, [b], 5 * ORBIT);
      expect(isHealthy(A) && isHealthy(B)).toBe(true);

      const wa = wakeAmplitude(A, 1.0, p.h);
      const wb = wakeAmplitude(B, 1.0, p.h);
      expect(wa).toBeGreaterThan(0.01);
      expect(wb / wa).toBeGreaterThan(1.2);
      expect(wb / wa).toBeLessThan(3.5);

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
      expect(ringMean(G, i) / ctrl).toBeLessThan(0.6);
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
