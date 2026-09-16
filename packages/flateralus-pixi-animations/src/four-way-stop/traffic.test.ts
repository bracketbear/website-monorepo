import { describe, it, expect } from 'vitest';
import { L_APPROACH } from './geometry';
import {
  DEFAULT_PARAMS,
  KINDS,
  createTraffic,
  addVehicle,
  step,
  vehiclesOn,
  type TrafficParams,
  type TrafficState,
} from './traffic';

function params(over: Partial<TrafficParams> = {}): TrafficParams {
  return { ...DEFAULT_PARAMS, demand: 0, ...over };
}

function run(S: TrafficState, p: TrafficParams, seconds: number): void {
  const n = Math.round(seconds / p.dt);
  for (let i = 0; i < n; i++) step(S, p);
}

/** Bumper-to-bumper gap between consecutive vehicles on one approach lane. */
function laneGaps(S: TrafficState, from: 0 | 1 | 2 | 3): number[] {
  const vs = vehiclesOn(S, from)
    .filter((v) => v.phase === 'approach')
    .sort((a, b) => b.s - a.s);
  const gaps: number[] = [];
  for (let i = 1; i < vs.length; i++)
    gaps.push(vs[i - 1].s - KINDS[vs[i - 1].kind].len - vs[i].s);
  return gaps;
}

describe('the approach lane', () => {
  it('a lone car drives to the line and stops there', () => {
    const S = createTraffic(1);
    const p = params({ lineIsWall: true });
    const c = addVehicle(S, 0, 'straight', 'car', 5, 8);
    run(S, p, 20);
    expect(c.phase).toBe('approach');
    expect(c.v).toBeLessThan(0.05);
    expect(c.s).toBeGreaterThan(L_APPROACH - 1.5);
    expect(c.s).toBeLessThanOrEqual(L_APPROACH + 0.01);
    expect(c.stopped).toBe(true);
  });

  it('a queue never overlaps', () => {
    const S = createTraffic(2);
    const p = params({ lineIsWall: true });
    for (let i = 0; i < 8; i++)
      addVehicle(S, 0, 'straight', i === 3 ? 'bus' : 'car', 60 - i * 14, 10);
    let minGap = Infinity;
    for (let t = 0; t < 30; t += p.dt) {
      step(S, p);
      for (const g of laneGaps(S, 0)) minGap = Math.min(minGap, g);
    }
    expect(minGap).toBeGreaterThan(-0.05);
    // And they packed up to the jam gap, not further.
    const gaps = laneGaps(S, 0);
    for (const g of gaps) expect(g).toBeGreaterThan(KINDS.car.s0 * 0.6);
  });

  it('a braking wave travels backward through the queue', () => {
    const S = createTraffic(3);
    const p = params({ lineIsWall: false });
    const cars = [];
    for (let i = 0; i < 8; i++)
      cars.push(addVehicle(S, 0, 'straight', 'car', 40 - i * 13, 10));
    // Let them settle at speed, then drop a wall in front of the leader.
    run(S, p, 1);
    const wall = params({ lineIsWall: true });
    const stopAt: number[] = new Array(8).fill(-1);
    for (let t = 0; t < 40; t += wall.dt) {
      step(S, wall);
      cars.forEach((c, i) => {
        if (stopAt[i] < 0 && c.v < 1) stopAt[i] = t;
      });
    }
    for (let i = 1; i < 8; i++) {
      expect(stopAt[i]).toBeGreaterThan(stopAt[i - 1]);
      // The wave takes real time to pass each car, but not forever.
      expect(stopAt[i] - stopAt[i - 1]).toBeGreaterThan(0.2);
      expect(stopAt[i] - stopAt[i - 1]).toBeLessThan(4);
    }
  });
});
