import { describe, it, expect } from 'vitest';
import { L_APPROACH } from './geometry';
import {
  DEFAULT_PARAMS,
  KINDS,
  createTraffic,
  addVehicle,
  step,
  vehiclesOn,
  poseOf,
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

describe('the crossing', () => {
  it('a lone car at the line crosses when nothing is coming', () => {
    const S = createTraffic(4);
    const p = params();
    const c = addVehicle(S, 0, 'straight', 'car', 50, 8);
    run(S, p, 25);
    expect(['box', 'exit']).toContain(c.phase);
    expect(c.stopped).toBe(true); // it did stop first
  });

  it('waits for a crossing car to clear', () => {
    const S = createTraffic(5);
    const p = params();
    const n = addVehicle(S, 0, 'straight', 'car', L_APPROACH - 0.2, 0);
    n.stopped = true;
    n.arrivedAt = 0;
    // An eastbound car already committed, about to enter the box.
    const e = addVehicle(S, 1, 'straight', 'car', L_APPROACH - 6, 9);
    e.granted = true;
    e.stopped = true;
    e.arrivedAt = -5;
    let nEnteredAt = -1;
    let eClearedAt = -1;
    for (let t = 0; t < 12; t += p.dt) {
      step(S, p);
      if (nEnteredAt < 0 && n.phase !== 'approach') nEnteredAt = t;
      if (eClearedAt < 0 && e.phase === 'exit') eClearedAt = t;
    }
    expect(nEnteredAt).toBeGreaterThan(0);
    // It went once the crossing car had passed the conflict, not before.
    expect(eClearedAt).toBeGreaterThan(0);
    expect(nEnteredAt).toBeGreaterThan(eClearedAt - 1.5);
  });

  it('patience runs out: a driver forces a gap and the crossing car brakes', () => {
    const S = createTraffic(6);
    const p = params({ tc0: 4, tcMin: 0.8, tau: 6 });
    const n = addVehicle(S, 0, 'straight', 'car', L_APPROACH - 0.2, 0);
    n.stopped = true;
    n.arrivedAt = 0;
    // A relentless eastbound stream at a 2.4 s headway, every car granted.
    let nextSpawn = 0;
    let entered = -1;
    let hardestBrake = 0;
    for (let t = 0; t < 40; t += p.dt) {
      if (t >= nextSpawn) {
        const e = addVehicle(S, 1, 'straight', 'car', L_APPROACH - 30, 10);
        e.granted = true;
        e.stopped = true;
        e.arrivedAt = -10;
        nextSpawn += 2.4;
      }
      step(S, p);
      if (entered < 0 && n.phase !== 'approach') entered = t;
      if (entered >= 0)
        for (const o of S.vehicles)
          if (o.from === 1) hardestBrake = Math.min(hardestBrake, o.accel);
    }
    // A fresh driver refuses a 2.4 s gap (tc0 = 4); a worn one takes it.
    expect(entered).toBeGreaterThan(2);
    expect(entered).toBeLessThan(30);
    expect(hardestBrake).toBeLessThan(-1.5);
  });

  it('no approach starves and no wait passes twenty seconds', () => {
    const S = createTraffic(7);
    const p = params({ demand: DEFAULT_PARAMS.demand });
    const served = [0, 0, 0, 0];
    const worst = [0, 0, 0, 0];
    const seen = new Set<number>();
    for (let t = 0; t < 180; t += p.dt) {
      step(S, p);
      for (const v of S.vehicles) {
        worst[v.from] = Math.max(worst[v.from], v.wait);
        if (v.phase !== 'approach' && !seen.has(v.id)) {
          seen.add(v.id);
          served[v.from]++;
        }
      }
    }
    for (const a of [0, 1, 2, 3]) {
      expect(served[a]).toBeGreaterThan(8);
      expect(worst[a]).toBeLessThan(20);
    }
  });

  it('never overlaps two bodies at a conflict point', () => {
    const S = createTraffic(8);
    const p = params({ demand: DEFAULT_PARAMS.demand * 1.3 });
    let crashes = 0;
    for (let t = 0; t < 180; t += p.dt) {
      step(S, p);
      const inBox = S.vehicles.filter((v) => v.phase === 'box');
      for (let i = 0; i < inBox.length; i++)
        for (let j = i + 1; j < inBox.length; j++) {
          const a = inBox[i];
          const b = inBox[j];
          const pa = poseOf(a);
          const pb = poseOf(b);
          // Centres closer than half a car: bodies overlap.
          if (Math.hypot(pa.x - pb.x, pa.y - pb.y) < 1.6) crashes++;
        }
      for (const g of laneGaps(S, 0)) if (g < -0.05) crashes++;
    }
    expect(crashes).toBe(0);
  });
});
