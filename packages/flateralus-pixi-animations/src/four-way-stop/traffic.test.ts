import { describe, it, expect } from 'vitest';
import { L_APPROACH, L_EXIT, PATHS, conflictBetween } from './geometry';
import {
  DEFAULT_PARAMS,
  KINDS,
  createTraffic,
  addVehicle,
  step,
  vehiclesOn,
  bodyPoseOf,
  pathOf,
  boxS,
  isGridlocked,
  setCop,
  occupiesBox,
  demandAt,
  farSideBlocked,
  type TrafficParams,
  type TrafficState,
  type Vehicle,
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

/**
 * Whether two bodies overlap, as oriented rectangles from the pose (front
 * bumper, unit heading) and the kind's length and width. Separating-axis
 * test on the four edge normals; a hair of tolerance so bodies packed to
 * the jam gap and float noise do not count.
 */
function bodiesOverlap(a: Vehicle, b: Vehicle, tol = 0.05): boolean {
  const rect = (v: Vehicle) => {
    const q = bodyPoseOf(v);
    const k = KINDS[v.kind];
    const cx = q.x - (q.hx * k.len) / 2;
    const cy = q.y - (q.hy * k.len) / 2;
    return { cx, cy, hx: q.hx, hy: q.hy, hl: k.len / 2, hw: k.width / 2 };
  };
  const A = rect(a);
  const B = rect(b);
  const axes: [number, number][] = [
    [A.hx, A.hy],
    [-A.hy, A.hx],
    [B.hx, B.hy],
    [-B.hy, B.hx],
  ];
  const dx = B.cx - A.cx;
  const dy = B.cy - A.cy;
  for (const [ax, ay] of axes) {
    const ra =
      A.hl * Math.abs(ax * A.hx + ay * A.hy) +
      A.hw * Math.abs(-ax * A.hy + ay * A.hx);
    const rb =
      B.hl * Math.abs(ax * B.hx + ay * B.hy) +
      B.hw * Math.abs(-ax * B.hy + ay * B.hx);
    if (Math.abs(dx * ax + dy * ay) > ra + rb - tol) return false;
  }
  return true;
}

/**
 * Pairs of bodies in the box that overlap right now, not counting a pair
 * where one is forcing past the other to break a ring (`Vehicle.forcing`),
 * which is the core's stand-in for backing out of a gridlock.
 */
function overlapsInBox(S: TrafficState): number {
  const inBox = S.vehicles.filter(occupiesBox);
  let n = 0;
  for (let i = 0; i < inBox.length; i++)
    for (let j = i + 1; j < inBox.length; j++) {
      const a = inBox[i];
      const b = inBox[j];
      if (a.forcing.includes(b.id) || b.forcing.includes(a.id)) continue;
      if (bodiesOverlap(a, b)) n++;
    }
  return n;
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
    // Clock when each vehicle first stopped at its line, and the longest
    // anyone took from that stop to having its whole body out of the box.
    const stoppedAt = new Map<number, number>();
    let worstStopToExit = 0;
    for (let t = 0; t < 180; t += p.dt) {
      step(S, p);
      for (const v of S.vehicles) {
        worst[v.from] = Math.max(worst[v.from], v.wait);
        if (v.phase !== 'approach' && !seen.has(v.id)) {
          seen.add(v.id);
          served[v.from]++;
        }
        if (v.stopped && !stoppedAt.has(v.id)) stoppedAt.set(v.id, S.clock);
        const t0 = stoppedAt.get(v.id);
        if (t0 !== undefined && (v.phase !== 'exit' || occupiesBox(v)))
          worstStopToExit = Math.max(worstStopToExit, S.clock - t0);
      }
    }
    for (const a of [0, 1, 2, 3]) {
      expect(served[a]).toBeGreaterThan(8);
      expect(worst[a]).toBeLessThan(20);
    }
    expect(worstStopToExit).toBeLessThan(20);
  });

  it('never overlaps two bodies at a conflict point', () => {
    const S = createTraffic(8);
    const p = params({ demand: DEFAULT_PARAMS.demand * 1.3 });
    let crashes = 0;
    for (let t = 0; t < 180; t += p.dt) {
      step(S, p);
      crashes += overlapsInBox(S);
      for (const g of laneGaps(S, 0)) if (g < -0.05) crashes++;
    }
    expect(crashes).toBe(0);
  });
});

describe('the cop', () => {
  it('a held line is a wall even with nothing crossing', () => {
    const S = createTraffic(9);
    const p = params();
    setCop(S, { present: true, held: [true, false, false, false] });
    const c = addVehicle(S, 0, 'straight', 'car', 50, 8);
    run(S, p, 30);
    expect(c.phase).toBe('approach');
    expect(c.stopped).toBe(true);
  });

  it('a waved stream enters without stopping', () => {
    const S = createTraffic(10);
    const p = params();
    setCop(S, { present: true, waved: 0 });
    const c = addVehicle(S, 0, 'straight', 'car', 30, 8);
    run(S, p, 15);
    expect(c.phase).not.toBe('approach');
    expect(c.stopped).toBe(false);
    expect(c.waved).toBe(true);
  });

  it('a wave holds the crossing streams', () => {
    const S = createTraffic(11);
    const p = params();
    setCop(S, { present: true, waved: 0 });
    const e = addVehicle(S, 1, 'straight', 'car', 50, 8);
    run(S, p, 20);
    expect(e.phase).toBe('approach');
  });

  it('the first left after a release does not yield to oncoming', () => {
    const S = createTraffic(12);
    const p = params();
    // Both stopped, the left-turner a hair earlier: a Pittsburgh left.
    const l = addVehicle(S, 0, 'left', 'car', L_APPROACH - 0.2, 0);
    l.stopped = true;
    l.arrivedAt = 0;
    const o = addVehicle(S, 2, 'straight', 'car', L_APPROACH - 0.2, 0);
    o.stopped = true;
    o.arrivedAt = 0.1;
    const c = conflictBetween(pathOf(l), pathOf(o))!;
    let lEnter = -1;
    let oEnter = -1;
    let lAtPoint = -1;
    let oAtPoint = -1;
    for (let t = 0; t < 15; t += p.dt) {
      step(S, p);
      if (lEnter < 0 && l.phase !== 'approach') lEnter = t;
      if (oEnter < 0 && o.phase !== 'approach') oEnter = t;
      if (lAtPoint < 0 && boxS(l) >= c.sa) lAtPoint = t;
      if (oAtPoint < 0 && boxS(o) >= c.sb) oAtPoint = t;
    }
    expect(l.pittsburghLeft).toBe(true);
    expect(lEnter).toBeGreaterThan(0);
    expect(lEnter).toBeLessThanOrEqual(oEnter);
    // It took the crossing: the left reached the conflict point first.
    expect(lAtPoint).toBeGreaterThan(0);
    expect(lAtPoint).toBeLessThan(oAtPoint);
  });

  it('a bus waved through late gridlocks the box, and a clear resolves it', () => {
    const S = createTraffic(13);
    // The far side of the south road is backed up.
    const p = params({ exitBlocked: [false, false, true, false] });
    // Cars already stuck on the south exit lane, up to the box edge.
    for (let i = 0; i < 6; i++) {
      const c = addVehicle(S, 0, 'straight', 'car', 0, 0);
      c.phase = 'exit';
      c.s = L_EXIT - 4 - i * 6.5;
      c.granted = true;
    }
    setCop(S, { present: true, waved: 0 });
    const bus = addVehicle(S, 0, 'straight', 'bus', L_APPROACH - 12, 6);
    // A car wanting to cross east-west, which the bus will block.
    const e = addVehicle(S, 1, 'straight', 'car', L_APPROACH - 20, 8);
    let lockedAt = -1;
    for (let t = 0; t < 15; t += p.dt) {
      step(S, p);
      if (lockedAt < 0 && isGridlocked(S)) lockedAt = t;
    }
    expect(lockedAt).toBeGreaterThan(0);
    expect(occupiesBox(bus)).toBe(true);
    expect(e.phase).toBe('approach');
    // A clear is not magic: with the far side still backed up, five
    // seconds of clearing moves nothing, because the bus is physically
    // stuck behind the queue.
    setCop(S, { present: true, waved: null, clearing: true });
    run(S, p, 5);
    expect(occupiesBox(bus)).toBe(true);
    expect(S.cop.clearing).toBe(true);
    expect(e.phase).toBe('approach');
    // Now the far side drains. The clear holds every line while the box
    // empties, then ends itself.
    const open = params({ farSide: 0 });
    let clearedAt = -1;
    let enteredDuringClear = false;
    for (let t = 0; t < 15; t += open.dt) {
      step(S, open);
      if (S.cop.clearing && e.phase !== 'approach') enteredDuringClear = true;
      if (clearedAt < 0 && !S.vehicles.some(occupiesBox)) clearedAt = t;
    }
    expect(clearedAt).toBeGreaterThan(0);
    expect(S.cop.clearing).toBe(false);
    expect(enteredDuringClear).toBe(false);
  });
});

describe('the crossing, by the body', () => {
  it('two crossing drivers stopped at their lines are not both granted at once', () => {
    // Probe A. Both at rest at the line; the later one must read the
    // earlier one's acceleration toward the point, not "twenty seconds
    // away because it is stationary".
    const S = createTraffic(20);
    const p = params();
    const n = addVehicle(S, 0, 'straight', 'car', L_APPROACH - 0.2, 0);
    n.stopped = true;
    n.arrivedAt = 0;
    const e = addVehicle(S, 1, 'straight', 'car', L_APPROACH - 0.2, 0);
    e.stopped = true;
    e.arrivedAt = 1;
    let gN = -1;
    let gE = -1;
    let overlaps = 0;
    for (let i = 0; i < 600; i++) {
      step(S, p);
      if (gN < 0 && n.granted) gN = i;
      if (gE < 0 && e.granted) gE = i;
      overlaps += overlapsInBox(S);
    }
    expect(gN).toBeGreaterThanOrEqual(0);
    expect(gE).toBeGreaterThan(gN + 60);
    expect(gE).toBeLessThan(600);
    expect(overlaps).toBe(0);
  });

  it('a body stopped over a conflict point stops the crossing car', () => {
    // Probe F. The blocker's front is past the point but its body still
    // covers it; the crossing car must not drive through it.
    const S = createTraffic(21);
    const p = params();
    const c = conflictBetween(PATHS[0].straight, PATHS[1].straight)!;
    const o = addVehicle(S, 1, 'straight', 'car', 0, 0);
    o.phase = 'box';
    o.s = c.sb + 1.5;
    o.granted = true;
    o.enteredAt = 0;
    const v = addVehicle(S, 0, 'straight', 'car', L_APPROACH - 8, 8);
    v.granted = true;
    let maxFront = -Infinity;
    let overlaps = 0;
    for (let i = 0; i < 300; i++) {
      o.s = c.sb + 1.5; // pinned: it is stuck
      o.v = 0;
      step(S, p);
      maxFront = Math.max(maxFront, boxS(v));
      overlaps += overlapsInBox(S);
    }
    expect(v.phase).toBe('box');
    expect(maxFront).toBeLessThan(c.sa - 0.5);
    expect(overlaps).toBe(0);
  });
});

describe('the cop, by the hand', () => {
  it('a car granted during a brief wave stops at the line once the approach is held', () => {
    // Probe C. A wave reaches the cars near the line, not the whole
    // street; when the hand changes, whoever is still short of the line
    // takes the new gesture.
    const S = createTraffic(22);
    const p = params();
    setCop(S, { present: true, waved: 0 });
    const far = addVehicle(S, 0, 'straight', 'car', 10, 8);
    step(S, p);
    setCop(S, { waved: null, held: [true, false, false, false] });
    run(S, p, 20);
    expect(far.phase).toBe('approach');
    expect(far.granted).toBe(false);
    expect(far.waved).toBe(false);
    expect(far.stopped).toBe(true);
    expect(far.s).toBeLessThanOrEqual(L_APPROACH + 0.01);
    // The cop leaves; the rule takes over and it crosses on its own.
    setCop(S, { present: false, held: [false, false, false, false] });
    run(S, p, 10);
    expect(far.phase).not.toBe('approach');
  });

  it('waves rotated for minutes seize nothing a clear cannot empty in fifteen seconds', () => {
    // Probe D. A cop who waves each approach in turn every three seconds
    // at heavy demand, for five minutes, then clears the box. The spec:
    // the box "clears within fifteen seconds of a clear command", and
    // bodies never overlap on the way except where a ring is being
    // forced, the one place the core lets a body through another.
    for (const seed of [1, 2, 3, 4, 5]) {
      const p = params({ demand: 0.35, farSide: 0 });
      const S = createTraffic(seed);
      let overlaps = 0;
      for (let i = 0; i < 60 * 300; i++) {
        const a = (Math.floor(i / 180) % 4) as 0 | 1 | 2 | 3;
        setCop(S, {
          present: true,
          waved: a,
          held: [false, false, false, false],
        });
        step(S, p);
        overlaps += overlapsInBox(S);
      }
      setCop(S, { present: true, waved: null, clearing: true });
      let clearedAt = -1;
      for (let i = 0; i < 60 * 30; i++) {
        step(S, p);
        overlaps += overlapsInBox(S);
        if (clearedAt < 0 && !S.cop.clearing) clearedAt = (i + 1) / 60;
      }
      expect(clearedAt, `seed ${seed}: clear never ended`).toBeGreaterThan(0);
      expect(
        clearedAt,
        `seed ${seed}: cleared after ${clearedAt}s`
      ).toBeLessThanOrEqual(15);
      expect(overlaps, `seed ${seed}: bodies overlapped`).toBe(0);
    }
  });
});

describe('the far side', () => {
  /** Episodes (start, length) when exit `dest` is backed up over `T` seconds of clock. */
  function episodes(dest: 0 | 1 | 2 | 3, p: TrafficParams, T: number) {
    const S = createTraffic(1);
    const out: number[] = [];
    let on = false;
    let start = 0;
    for (let t = 0; t <= T; t += 0.1) {
      S.clock = t;
      const b = farSideBlocked(S, dest, p);
      if (b && !on) start = t;
      if (!b && on) out.push(t - start);
      on = b;
    }
    return out;
  }

  it('each exit backs up for a while every few minutes, and not at all when turned off', () => {
    const p = params();
    for (const dest of [0, 1, 2, 3] as const) {
      const eps = episodes(dest, p, 1800);
      // Once every two to four minutes, for ten to forty seconds.
      expect(
        eps.length,
        `exit ${dest}: ${eps.length} episodes`
      ).toBeGreaterThanOrEqual(6);
      expect(
        eps.length,
        `exit ${dest}: ${eps.length} episodes`
      ).toBeLessThanOrEqual(16);
      for (const d of eps) expect(d).toBeGreaterThan(8);
      for (const d of eps) expect(d).toBeLessThan(45);
      expect(episodes(dest, params({ farSide: 0 }), 1800)).toEqual([]);
    }
    // The exits do not all block together.
    const S = createTraffic(1);
    let allFour = 0;
    for (let t = 0; t <= 1800; t += 0.1) {
      S.clock = t;
      if ([0, 1, 2, 3].every((d) => farSideBlocked(S, d as 0 | 1 | 2 | 3, p)))
        allFour++;
    }
    expect(allFour).toBe(0);
  });

  it('a backed-up far side walls the exit lane and the queue reaches the box', () => {
    const S = createTraffic(23);
    const p = params({ farSide: 1 });
    // Find a moment exit 2 is blocked and park the clock there.
    let t = 0;
    while (!farSideBlocked({ ...S, clock: t }, 2, p) && t < 3600) t += 0.5;
    expect(t).toBeLessThan(3600);
    S.clock = t;
    const front = addVehicle(S, 0, 'straight', 'car', 0, 8);
    front.phase = 'exit';
    front.s = 10;
    const q = { ...p, dt: p.dt };
    for (let i = 0; i < 600; i++) {
      S.clock = t; // hold the light red
      step(S, q);
    }
    expect(front.v).toBeLessThan(0.1);
    expect(front.s).toBeLessThan(L_EXIT - 4);
    expect(front.s).toBeGreaterThan(L_EXIT - 10);
  });
});

describe('weather', () => {
  it('demand swings between the two streets over minutes', () => {
    const S = createTraffic(14);
    const p = params({ demand: 0.3 });
    let maxDiff = 0;
    let flipped = false;
    let lastSign = 0;
    for (let t = 0; t < 300; t += 1) {
      S.clock = t;
      const ns = demandAt(S, 0, p);
      const ew = demandAt(S, 1, p);
      maxDiff = Math.max(maxDiff, Math.abs(ns - ew));
      const sign = Math.sign(ns - ew);
      if (lastSign && sign && sign !== lastSign) flipped = true;
      if (sign) lastSign = sign;
      expect(ns).toBeGreaterThan(0.05 * p.demand);
      expect(ns).toBeLessThanOrEqual(p.demand + 1e-9);
    }
    expect(maxDiff).toBeGreaterThan(0.25 * p.demand);
    expect(flipped).toBe(true);
  });

  it('a hard brake is an event with a pose', () => {
    const S = createTraffic(15);
    const p = params({ lineIsWall: true });
    const c = addVehicle(S, 0, 'straight', 'car', L_APPROACH - 14, 11);
    let skid = null;
    for (let t = 0; t < 5; t += p.dt) {
      step(S, p);
      skid = skid ?? S.events.find((e) => e.type === 'skid') ?? null;
    }
    expect(skid).not.toBeNull();
    expect(skid!.id).toBe(c.id);
    expect(Math.hypot(skid!.hx, skid!.hy)).toBeCloseTo(1, 4);
  });
});
