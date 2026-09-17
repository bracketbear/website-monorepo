/**
 * The traffic, with nothing drawn.
 *
 * Every vehicle follows the Intelligent Driver Model (Treiber, Hennecke,
 * Helbing 2000). Nothing is scripted: a queue compresses, a braking wave
 * runs backward at the speed the model gives it, and a jam can appear on a
 * free lane from one driver's hesitation. Drivers at the line enter the box
 * by gap acceptance against the crossing streams, and the critical gap
 * shrinks the longer they have waited — which is the negotiation, and where
 * the phantom jams come from. The cop changes what the drivers read.
 *
 * Time is compressed: a real four-way stop serves a car every four seconds
 * per approach and real patience is tens of seconds. Headway, patience and
 * demand here are set so a standoff resolves in seconds and a queue builds
 * in about thirty. The IDM's shape survives, because only its constants move.
 */
import {
  APPROACHES,
  L_APPROACH,
  L_EXIT,
  PATHS,
  approachPose,
  approachToRight,
  conflictBetween,
  destination,
  exitPose,
  pathPose,
  type Approach,
  type Path,
  type Pose,
  type Turn,
} from './geometry';

/** Simulation step, s. Fixed: the IDM is integrated explicitly. */
export const STEP = 1 / 60;
/** Accumulator cap, in steps, so a stall cannot spiral. */
export const MAX_STEPS_PER_FRAME = 4;

export type Kind = 'car' | 'bus' | 'bike';

export interface KindParams {
  /** Desired speed, m/s. */
  v0: number;
  /** Desired time headway, s. */
  T: number;
  /** Comfortable acceleration, m/s^2. */
  a: number;
  /** Comfortable braking, m/s^2. */
  b: number;
  /** Jam gap, m. */
  s0: number;
  len: number;
  width: number;
  height: number;
}

/**
 * Vehicle types differ in the parameters, not the law. A bus is long and
 * slow to move; a cyclist is short and happy with a tiny jam gap, which is
 * what lets it fill gaps nobody else can.
 */
export const KINDS: Record<Kind, KindParams> = {
  car: {
    v0: 11,
    T: 0.9,
    a: 2.2,
    b: 2.8,
    s0: 2.0,
    len: 4.4,
    width: 1.8,
    height: 1.45,
  },
  bus: {
    v0: 8,
    T: 1.3,
    a: 1.0,
    b: 2.0,
    s0: 2.5,
    len: 11.5,
    width: 2.5,
    height: 3.0,
  },
  bike: {
    v0: 6,
    T: 0.7,
    a: 1.6,
    b: 2.4,
    s0: 0.6,
    len: 1.8,
    width: 0.6,
    height: 1.4,
  },
};

/** Hardest braking the model may produce, m/s^2. An emergency stop. */
export const B_MAX = 9;
/** A wave reaches the drivers this close to the line, m; the rest keep coming. */
export const WAVE_REACH = 12;
/** Closer than this to the line, a waved driver is committed and goes, m. */
export const WAVE_COMMIT = 3;
/** How far ahead a driver in or entering the box looks for bodies, m. */
export const SWEEP_HORIZON = 24;
/** Sampling of that look, m. */
export const SWEEP_STEP = 0.25;
/** Clearance kept around a body when sweeping, m. */
export const SWEEP_CLEARANCE = 0.2;

export type Phase = 'approach' | 'box' | 'exit';

export interface Vehicle {
  id: number;
  kind: Kind;
  from: Approach;
  turn: Turn;
  phase: Phase;
  /** Front bumper position along the current lane or path, m. */
  s: number;
  /** Speed, m/s. */
  v: number;
  /** Last acceleration, m/s^2. The scene lights the brake lamps off it. */
  accel: number;
  /** Has come to a full stop at the line. */
  stopped: boolean;
  /** Clock when it first stopped at the line; Infinity until then. */
  arrivedAt: number;
  /** Seconds spent waiting at the line. */
  wait: number;
  /** May cross the line. */
  granted: boolean;
  /** Was waved through by the cop: no stop, no gap acceptance. */
  waved: boolean;
  /** The first left after a release, which does not yield to oncoming. */
  pittsburghLeft: boolean;
  /** Clock when it entered the box; Infinity until then. */
  enteredAt: number;
  /** Seconds stopped inside the box. */
  boxWait: number;
  /**
   * Patience in the box has run out: `boxWait` passed `boxTau` once. It
   * stays out for the rest of this crossing, so a driver released from a
   * courtesy does not creep forward, reset the clock and yield again.
   */
  impatient: boolean;
  /**
   * Ids of the bodies this driver is forcing past to break a ring (see
   * `leaderOf`); emptied as each is left behind.
   */
  forcing: number[];
  /** Index into the scene's body-colour palette. */
  color: number;
}

export interface Cop {
  /** In the box. False means the four-way rule runs the corner. */
  present: boolean;
  held: [boolean, boolean, boolean, boolean];
  waved: Approach | null;
  /** Holding every line until the box is empty. */
  clearing: boolean;
}

export interface TrafficParams {
  dt: number;
  /** Critical gap when fresh, s. */
  tc0: number;
  /** Critical gap floor, s. */
  tcMin: number;
  /** Patience: the critical gap decays on this time constant, s. */
  tau: number;
  /** Patience inside the box before a driver stops yielding, s. */
  boxTau: number;
  /** Peak arrival rate per approach, vehicles/s. */
  demand: number;
  /** Seconds between buses on each street; 0 for none. */
  busEvery: number;
  /** Share of arrivals that are cyclists. */
  bikeShare: number;
  /** Multiplies every kind's headway T. */
  headwayScale: number;
  /** Test hook: every stop line is a wall. */
  lineIsWall: boolean;
  /** Test hook: the far end of each exit lane is blocked (the far side is backed up). */
  exitBlocked: [boolean, boolean, boolean, boolean];
  /**
   * How often the far side of an exit backs up on its own (`farSideBlocked`):
   * 1 is the measured default, 0 never, 2 twice as often.
   */
  farSide: number;
}

/**
 * Measured on the tests in `traffic.test.ts`: with no cop and this demand,
 * no approach's longest wait passes twenty seconds over three minutes, and
 * no approach starves.
 */
export const DEFAULT_PARAMS: TrafficParams = {
  dt: STEP,
  tc0: 4.0,
  tcMin: 0.8,
  tau: 8,
  boxTau: 4,
  demand: 0.2,
  busEvery: 45,
  bikeShare: 0.12,
  headwayScale: 1,
  lineIsWall: false,
  exitBlocked: [false, false, false, false],
  farSide: 1,
};

export interface TrafficEvent {
  /** A hard brake leaves a skid; an entry is a wave being taken; gridlock is the box seizing. */
  type: 'skid' | 'enter' | 'gridlock';
  id: number;
  x: number;
  y: number;
  hx: number;
  hy: number;
}

export interface TrafficState {
  vehicles: Vehicle[];
  cop: Cop;
  clock: number;
  nextId: number;
  /** Seeded; every random number in the core comes from here. */
  rng: () => number;
  /** Per street (0 north-south, 1 east-west), seconds until the next bus. */
  busTimer: [number, number];
  /** Emitted this step; the scene drains it. */
  events: TrafficEvent[];
  /** Seconds the box has been seized. */
  gridlockT: number;
}

/** mulberry32, so a test seed replays exactly. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createTraffic(seed = 1): TrafficState {
  return {
    vehicles: [],
    cop: {
      present: false,
      held: [false, false, false, false],
      waved: null,
      clearing: false,
    },
    clock: 0,
    nextId: 1,
    rng: mulberry32(seed),
    busTimer: [20, 35],
    events: [],
    gridlockT: 0,
  };
}

export function addVehicle(
  S: TrafficState,
  from: Approach,
  turn: Turn,
  kind: Kind,
  s: number,
  v: number
): Vehicle {
  const veh: Vehicle = {
    id: S.nextId++,
    kind,
    from,
    turn,
    phase: 'approach',
    s,
    v,
    accel: 0,
    stopped: false,
    arrivedAt: Infinity,
    wait: 0,
    granted: false,
    waved: false,
    pittsburghLeft: false,
    enteredAt: Infinity,
    boxWait: 0,
    impatient: false,
    forcing: [],
    color: Math.floor(S.rng() * 8),
  };
  S.vehicles.push(veh);
  return veh;
}

/** Set the cop's gesture. Fields omitted keep their value. */
export function setCop(S: TrafficState, cop: Partial<Cop>): void {
  Object.assign(S.cop, cop);
}

/**
 * The box has seized: someone has been stopped inside it for a while. Not
 * prevented — it is the failure state the negotiation is about — and it
 * resolves by the cop clearing the box or by patience inside it.
 */
export function isGridlocked(S: TrafficState): boolean {
  return S.vehicles.some((v) => occupiesBox(v) && v.boxWait > 3);
}

export function pathOf(v: Vehicle): Path {
  return PATHS[v.from][v.turn];
}

/** Front-bumper position measured along the box path: negative on the approach. */
export function boxS(v: Vehicle): number {
  if (v.phase === 'approach') return v.s - L_APPROACH;
  if (v.phase === 'box') return v.s;
  return pathOf(v).len + v.s;
}

/**
 * Whether any of a vehicle's body is inside the box: its front is on a
 * box path, or its front is out on the exit lane but its tail is not yet
 * past the seam. A bus is nearly as long as the box, so the front bumper
 * alone says it has left while the crossing is still blocked.
 */
export function occupiesBox(v: Vehicle): boolean {
  if (v.phase === 'box') return true;
  return v.phase === 'exit' && v.s < KINDS[v.kind].len;
}

export function poseOf(v: Vehicle): Pose {
  if (v.phase === 'approach') return approachPose(v.from, v.s);
  if (v.phase === 'box') return pathPose(pathOf(v), v.s);
  return exitPose(destination(v.from, v.turn), v.s);
}

/** Front-bumper pose `sBox` metres along a vehicle's whole route, measured as `boxS`. */
function poseAlong(v: Vehicle, sBox: number): Pose {
  if (sBox < 0) return approachPose(v.from, L_APPROACH + sBox);
  const path = pathOf(v);
  if (sBox <= path.len) return pathPose(path, sBox);
  return exitPose(destination(v.from, v.turn), sBox - path.len);
}

/**
 * The body's pose with its front `sBox` along the route: the front bumper
 * with the heading of the body's own axis, which runs from where its tail
 * is on the route to its front. On a straight that is the lane heading;
 * in a bend the rear tracks inside the curve, so a bus in a left turn
 * lies across the chord of its arc rather than along a tangent that would
 * put its tail across the far side of the box.
 */
function bodyPoseAlong(v: Vehicle, sBox: number): Pose {
  const front = poseAlong(v, sBox);
  const tail = poseAlong(v, sBox - KINDS[v.kind].len);
  const dx = front.x - tail.x;
  const dy = front.y - tail.y;
  const m = Math.hypot(dx, dy);
  if (m < 1e-6) return front;
  return { x: front.x, y: front.y, hx: dx / m, hy: dy / m };
}

/** The body's pose now: front bumper and body-axis heading. The scene draws this. */
export function bodyPoseOf(v: Vehicle): Pose {
  return bodyPoseAlong(v, boxS(v));
}

/** A body: a rectangle back from the front bumper along the body's axis. */
interface Body {
  cx: number;
  cy: number;
  hx: number;
  hy: number;
  hl: number;
  hw: number;
}

function bodyAt(k: KindParams, q: Pose): Body {
  return {
    cx: q.x - (q.hx * k.len) / 2,
    cy: q.y - (q.hy * k.len) / 2,
    hx: q.hx,
    hy: q.hy,
    hl: k.len / 2,
    hw: k.width / 2,
  };
}

/** Separating-axis test on two rectangles, each grown by `margin`. */
function bodiesTouch(a: Body, b: Body, margin: number): boolean {
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  const axes = [a.hx, a.hy, -a.hy, a.hx, b.hx, b.hy, -b.hy, b.hx];
  for (let i = 0; i < 8; i += 2) {
    const ax = axes[i];
    const ay = axes[i + 1];
    const ra =
      a.hl * Math.abs(ax * a.hx + ay * a.hy) +
      a.hw * Math.abs(-ax * a.hy + ay * a.hx);
    const rb =
      b.hl * Math.abs(ax * b.hx + ay * b.hy) +
      b.hw * Math.abs(-ax * b.hy + ay * b.hx);
    if (Math.abs(dx * ax + dy * ay) > ra + rb + 2 * margin) return false;
  }
  return true;
}

/**
 * How far `v` can drive along its route from `ms` before its body meets
 * `o`'s, held still: the physical gap between them, in metres, or
 * Infinity within the horizon. On a square crossing this is the body on
 * the conflict point, a metre either side; where two paths run together
 * for a stretch, it is the tail that would sweep into a body short of the
 * point, which a point cannot see.
 */
export function sweepGap(v: Vehicle, ms: number, o: Vehicle): number {
  const kv = KINDS[v.kind];
  const ko = KINDS[o.kind];
  const ob = bodyAt(ko, bodyPoseOf(o));
  const q0 = poseOf(v);
  if (Math.hypot(q0.x - ob.cx, q0.y - ob.cy) > SWEEP_HORIZON + kv.len + ko.len)
    return Infinity;
  for (let d = 0; d <= SWEEP_HORIZON; d += SWEEP_STEP)
    if (bodiesTouch(bodyAt(kv, bodyPoseAlong(v, ms + d)), ob, SWEEP_CLEARANCE))
      return d;
  return Infinity;
}

export function vehiclesOn(S: TrafficState, from: Approach): Vehicle[] {
  return S.vehicles.filter((v) => v.from === from);
}

/**
 * The Intelligent Driver Model. `gap` is bumper to bumper, `dv` is the
 * closing speed (positive when catching the leader). Free-road term pulls
 * toward v0; the interaction term brakes as the desired gap s* grows past
 * the real one. Braking is capped at B_MAX: the model is unbounded below,
 * and a leader appearing out of a forced gap should be an emergency stop,
 * not a teleport.
 */
export function idm(
  v: Vehicle,
  gap: number,
  dv: number,
  p: TrafficParams
): number {
  const k = KINDS[v.kind];
  const T = k.T * p.headwayScale;
  const g = Math.max(gap, 0.1);
  const sStar =
    k.s0 + Math.max(0, v.v * T + (v.v * dv) / (2 * Math.sqrt(k.a * k.b)));
  const acc = k.a * (1 - Math.pow(v.v / k.v0, 4) - (sStar / g) * (sStar / g));
  return Math.max(-B_MAX, acc);
}

interface Leader {
  gap: number;
  dv: number;
}

/**
 * Seconds for a vehicle of kind `k` now at speed `u` to cover `d` metres,
 * accelerating at its comfortable rate and capped at its desired speed. A
 * stationary vehicle is not twenty seconds away from a point seven metres
 * off; it is two and a half.
 */
export function timeToCover(d: number, u: number, k: KindParams): number {
  if (d <= 0) return 0;
  const u0 = Math.min(u, k.v0);
  const dToV0 = (k.v0 * k.v0 - u0 * u0) / (2 * k.a);
  if (d <= dToV0) return (Math.sqrt(u0 * u0 + 2 * k.a * d) - u0) / k.a;
  return (k.v0 - u0) / k.a + (d - dToV0) / k.v0;
}

function closer(a: Leader | null, gap: number, dv: number): Leader {
  if (!a || gap < a.gap) return { gap, dv };
  return a;
}

/** The critical gap a driver will accept, after `wait` seconds at the line. */
export function criticalGap(v: Vehicle, p: TrafficParams): number {
  return Math.max(p.tcMin, p.tc0 * Math.exp(-v.wait / p.tau));
}

/**
 * Whether the vehicles already committed to the box leave this driver a
 * gap. For each committed vehicle whose path conflicts with mine: passed,
 * on it (cleared in time, or not), or approaching within the critical gap.
 */
export function gapAccepted(
  v: Vehicle,
  S: TrafficState,
  p: TrafficParams
): boolean {
  const tc = criticalGap(v, p);
  const mine = pathOf(v);
  for (const o of S.vehicles) {
    if (o === v || o.from === v.from) continue;
    if (o.phase === 'exit' && !occupiesBox(o)) continue;
    if (o.phase === 'approach' && !o.granted) continue;
    const c = conflictBetween(mine, pathOf(o));
    if (!c) continue;
    const so = boxS(o);
    const len = KINDS[o.kind].len;
    if (so - len > c.sb + 1) continue; // its tail is past the point: clear
    if (so > c.sb - 1) {
      // Its front is at or past the point, so its body is on it. Clear only
      // if the tail is gone before I can get there from rest; a stopped
      // vehicle on the point never clears.
      const tClear = (c.sb + len + 1 - so) / Math.max(o.v, 0.3);
      const tArrive = timeToCover(Math.max(c.sa, 0.5), v.v, KINDS[v.kind]);
      if (tClear >= tArrive) return false;
      continue;
    }
    // Approaching: it must not reach the point inside my critical gap,
    // judged by how it would drive there, not by the speed it has now.
    if (timeToCover(c.sb - so, o.v, KINDS[o.kind]) < tc) return false;
  }
  return true;
}

/** The vehicle nearest the line on an approach that has not been granted. */
export function frontOf(S: TrafficState, from: Approach): Vehicle | null {
  let best: Vehicle | null = null;
  for (const v of S.vehicles)
    if (
      v.from === from &&
      v.phase === 'approach' &&
      !v.granted &&
      (!best || v.s > best.s)
    )
      best = v;
  return best;
}

/**
 * The four-way-stop rule between the drivers stopped at their lines. First
 * to stop goes first. Within a beat of each other: a left yields to the
 * oncoming car, and otherwise the driver on the right goes. The Pittsburgh
 * left is a driver who has been told not to yield. Patience overrides
 * everything at twice tau, which is what breaks a ring of four rights.
 */
export function hasPriority(
  v: Vehicle,
  S: TrafficState,
  p: TrafficParams
): boolean {
  if (v.wait > 2 * p.tau) return true;
  const mine = pathOf(v);
  for (const a of APPROACHES) {
    if (a === v.from) continue;
    const o = frontOf(S, a);
    if (!o || !o.stopped) continue;
    if (!conflictBetween(mine, pathOf(o))) continue;
    const d = o.arrivedAt - v.arrivedAt;
    if (d < -0.4) return false;
    if (d > 0.4) continue;
    const oncoming = o.from === (v.from + 2) % 4;
    if (v.turn === 'left' && oncoming && o.turn !== 'left' && !v.pittsburghLeft)
      return false;
    if (o.from === approachToRight(v.from)) return false;
  }
  return true;
}

const NOBODY: ReadonlySet<Vehicle> = new Set();

interface Constraints {
  L: Leader | null;
  /** The stopped body this vehicle is itself stopped against, if any. */
  blocker: Vehicle | null;
}

/**
 * What a vehicle is following, as the nearest constraint ahead of it, and
 * which body it is stopped against.
 *
 * Approach: the vehicle ahead on the lane, and the stop line as a stopped
 * leader unless granted — parked one jam gap (`s0`) past the line, so the
 * IDM's equilibrium lands the bumper on the line itself. A granted driver
 * still on the approach reads the box's constraints too, from where it
 * stands, so a body just past the line is a leader before the line, and a
 * body stopped inside the box on its route keeps it at the line rather
 * than in the box (do not block the box).
 *
 * Box: the vehicle ahead on the same path; a vehicle heading for the same
 * exit lane, followed by remaining distance (a merge is car-following, not
 * a crossing); any body my own body would meet along my route, at the
 * distance it would meet it (`sweepGap`); and — unless my patience in the
 * box has run out — anyone who entered before me and has not yet cleared a
 * conflict point I am heading for.
 *
 * Exit: the vehicle ahead on the exit lane, and the wall at its end when
 * the far side is backed up.
 *
 * Physical occupancy always counts. That is how a forced gap reaches the
 * crossing car: the forcer is simply there, in the way, and the IDM does
 * the rest. `ignore` is the set of bodies the ring valve in `leaderOf`
 * lets a driver force past.
 */
function constraints(
  v: Vehicle,
  S: TrafficState,
  p: TrafficParams,
  ignore: ReadonlySet<Vehicle> = NOBODY
): Constraints {
  let L: Leader | null = null;
  let blocker: Vehicle | null = null;
  let blockerGap = Infinity;
  const len = (o: Vehicle) => KINDS[o.kind].len;
  const dest = destination(v.from, v.turn);
  const stoppedAgainst = (o: Vehicle, gap: number) => {
    if (
      v.v < 0.15 &&
      o.v < 0.15 &&
      gap < blockerGap &&
      gap < KINDS[v.kind].s0 + 0.6
    ) {
      blocker = o;
      blockerGap = gap;
    }
  };
  if (v.phase === 'approach') {
    for (const o of S.vehicles) {
      if (o === v || o.from !== v.from) continue;
      if (o.phase === 'approach' && o.s > v.s)
        L = closer(L, o.s - len(o) - v.s, v.v - o.v);
      else if (o.phase === 'box')
        L = closer(L, L_APPROACH + o.s - len(o) - v.s, v.v - o.v);
    }
    // The line is a stopped leader one jam gap beyond the line itself, so
    // the IDM's equilibrium lands the bumper on the line; the clamp in
    // `step` catches overshoot.
    if (!v.granted || p.lineIsWall) {
      L = closer(L, L_APPROACH + KINDS[v.kind].s0 - v.s, v.v);
      return { L, blocker };
    }
  }
  const mine = pathOf(v);
  const ms = boxS(v);
  if (v.phase !== 'exit') {
    const yielding = !v.impatient && !S.cop.clearing;
    for (const o of S.vehicles) {
      if (o === v || ignore.has(o)) continue;
      if (o.from === v.from) {
        // Same lane, handled above. Same path: the vehicle ahead. Another
        // path from the same entry: a body that diverged ahead of me is
        // still a body, and a turning car's rear corner swings through
        // the lane it is leaving.
        if (v.phase !== 'box' || o.phase === 'approach') continue;
        const os = boxS(o);
        if (o.turn === v.turn) {
          if (os > ms) {
            L = closer(L, os - len(o) - ms, v.v - o.v);
            stoppedAgainst(o, os - len(o) - ms);
          }
          continue;
        }
        const hit = sweepGap(v, ms, o);
        if (hit < Infinity) {
          L = closer(L, hit, v.v - o.v);
          stoppedAgainst(o, hit);
        }
        continue;
      }
      // A merge is car-following, not a crossing: two paths into one exit
      // lane are one lane from the seam back, so whoever has less path
      // left is ahead and the other follows it. Measured in distance to
      // the seam, because the two paths are different lengths.
      if (destination(o.from, o.turn) === dest) {
        if (o.phase === 'exit') {
          L = closer(L, mine.len + o.s - len(o) - ms, v.v - o.v);
        } else if (o.phase === 'box') {
          const remO = pathOf(o).len - boxS(o);
          const remMe = mine.len - ms;
          if (remO < remMe || (remO === remMe && o.id < v.id)) {
            L = closer(L, remMe - remO - len(o), v.v - o.v);
            stoppedAgainst(o, remMe - remO - len(o));
          }
        }
        continue;
      }
      // An exit-phase vehicle still counts until its tail clears the seam.
      if (
        (o.phase === 'exit' && !occupiesBox(o)) ||
        (o.phase === 'approach' && !o.granted)
      )
        continue;
      const c = conflictBetween(mine, pathOf(o));
      if (!c) continue;
      // Physical occupancy: their body, wherever my route would meet it.
      const hit = sweepGap(v, ms, o);
      if (hit < Infinity) {
        // Do not block the box: a driver still at the line who would have
        // to stop inside the box behind a body that is itself stopped
        // waits at the line instead. A body beyond the seam is a queue to
        // join, and joining it late is the honest gridlock.
        if (
          v.phase === 'approach' &&
          o.v < 0.5 &&
          ms + hit >= 0 &&
          ms + hit < mine.len
        ) {
          L = closer(L, L_APPROACH + KINDS[v.kind].s0 - v.s, v.v);
          stoppedAgainst(o, hit);
          continue;
        }
        const qo = poseOf(o);
        const qv = poseOf(v);
        L = closer(L, hit, v.v - o.v * (qo.hx * qv.hx + qo.hy * qv.hy));
        stoppedAgainst(o, hit);
        continue;
      }
      if (c.sa <= ms) continue;
      const os = boxS(o);
      if (yielding && o.enteredAt < v.enteredAt && os < c.sb) {
        const tClear = (c.sb + len(o) - os) / Math.max(o.v, 1);
        const tMine = (c.sa - ms) / Math.max(v.v, 1);
        if (tMine < tClear + 0.5) L = closer(L, c.sa - ms - 1.5, v.v);
      }
    }
    return { L, blocker };
  }
  // exit
  for (const o of S.vehicles) {
    if (o === v || o.phase !== 'exit') continue;
    if (destination(o.from, o.turn) !== dest || o.s <= v.s) continue;
    L = closer(L, o.s - len(o) - v.s, v.v - o.v);
  }
  if (p.exitBlocked[dest] || farSideBlocked(S, dest, p))
    L = closer(L, L_EXIT - 4 - v.s, v.v);
  return { L, blocker };
}

/** Longest in the box first; ties by id. */
function earlier(a: Vehicle, b: Vehicle): boolean {
  return (
    a.enteredAt < b.enteredAt || (a.enteredAt === b.enteredAt && a.id < b.id)
  );
}

/** The bodies a driver is currently forcing past, as vehicles. */
function forcingSet(v: Vehicle, S: TrafficState): Set<Vehicle> {
  const out = new Set<Vehicle>();
  if (v.forcing.length === 0) return out;
  for (const o of S.vehicles) if (v.forcing.includes(o.id)) out.add(o);
  return out;
}

/**
 * The nearest constraint ahead of a vehicle, with the ring valve.
 *
 * Bodies are solid and nobody reverses, so a ring — each driver stopped
 * against the next one's body, round to the first — would hold forever.
 * It is the box's honest failure, and the spec says it clears: once a
 * driver in a ring has waited out `boxTau` (`impatient`), or the cop is clearing, the
 * one who has been in the box longest forces past the bodies in its way,
 * which is the toy's stand-in for someone backing up. The forcing sticks
 * until each body is behind it, so it does not creep in four-second
 * steps. A chain that ends at the far side (a bus parked behind a
 * backed-up exit) is not a ring and is never forced: that gridlock waits
 * for the far side to drain.
 */
function leaderOf(
  v: Vehicle,
  S: TrafficState,
  p: TrafficParams
): Leader | null {
  const ignore = forcingSet(v, S);
  if (ignore.size) {
    // Done with the ones whose body my route no longer meets (a bus's
    // tail is still passing when its front is out on the exit lane).
    const ms = boxS(v);
    for (const o of ignore)
      if (sweepGap(v, ms, o) === Infinity) ignore.delete(o);
    v.forcing = [...ignore].map((o) => o.id);
  }
  let { L, blocker } = constraints(v, S, p, ignore);
  if (v.phase !== 'box') return L;
  if (!v.impatient && !S.cop.clearing) return L;
  for (let guard = 0; blocker && guard < 4; guard++) {
    const ring: Vehicle[] = [v];
    let cur: Vehicle | null = blocker;
    while (cur && cur !== v && ring.length < 8 && !ring.includes(cur)) {
      ring.push(cur);
      cur = constraints(cur, S, p, forcingSet(cur, S)).blocker;
    }
    if (cur !== v) return L;
    for (const o of ring) if (o !== v && earlier(o, v)) return L;
    ignore.add(blocker);
    v.forcing.push(blocker.id);
    ({ L, blocker } = constraints(v, S, p, ignore));
  }
  return L;
}

/** Whether approach `a`'s line is open to gap acceptance this step. */
function lineMode(S: TrafficState, a: Approach): 'wall' | 'wave' | 'rule' {
  const c = S.cop;
  if (!c.present) return 'rule';
  if (c.clearing) return 'wall';
  if (c.waved === a) return 'wave';
  if (c.waved !== null || c.held[a]) return 'wall';
  return 'rule';
}

/** Decide who may cross this step. */
function grant(S: TrafficState, p: TrafficParams): void {
  if (p.lineIsWall) return;
  for (const a of APPROACHES) {
    const mode = lineMode(S, a);
    if (mode !== 'wave') {
      // The hand has changed. Whoever the wave reached but who is still
      // short of the line takes the new gesture: a hold is a wall again
      // and a clear stops the feed. Within a few metres and rolling they
      // are committed; standing still at the line, they are not.
      for (const v of S.vehicles)
        if (
          v.from === a &&
          v.phase === 'approach' &&
          v.waved &&
          (v.s < L_APPROACH - WAVE_COMMIT || v.v < 0.15)
        ) {
          v.granted = false;
          v.waved = false;
        }
    }
    if (mode === 'wall') continue;
    if (mode === 'wave') {
      // Every step, so the queue keeps flowing while the wave lasts; only
      // the drivers within reach of the line, so a car sixty metres up
      // the street is not committed by a gesture it has not reached.
      for (const v of S.vehicles)
        if (
          v.from === a &&
          v.phase === 'approach' &&
          !v.granted &&
          v.s > L_APPROACH - WAVE_REACH
        ) {
          v.granted = true;
          v.waved = true;
          const q = poseOf(v);
          S.events.push({
            type: 'enter',
            id: v.id,
            x: q.x,
            y: q.y,
            hx: q.hx,
            hy: q.hy,
          });
        }
      continue;
    }
    const f = frontOf(S, a);
    if (!f || !f.stopped) continue;
    // The Pittsburgh left: a left-turner who stopped before the oncoming
    // driver takes the crossing first instead of yielding to them.
    if (f.turn === 'left' && !f.pittsburghLeft) {
      const o = frontOf(S, ((a + 2) % 4) as Approach);
      if (o && o.stopped && o.turn !== 'left' && f.arrivedAt <= o.arrivedAt)
        f.pittsburghLeft = true;
    }
    if (!hasPriority(f, S, p)) continue;
    if (!gapAccepted(f, S, p)) continue;
    f.granted = true;
    const q = poseOf(f);
    S.events.push({
      type: 'enter',
      id: f.id,
      x: q.x,
      y: q.y,
      hx: q.hx,
      hy: q.hy,
    });
  }
}

/** Turn choice: most go straight. */
function pickTurn(S: TrafficState): Turn {
  const r = S.rng();
  return r < 0.6 ? 'straight' : r < 0.85 ? 'right' : 'left';
}

/**
 * Poisson arrivals at the top of each approach, if there is room. A new
 * vehicle appears with its front bumper one length in, at most of its
 * desired speed, behind whatever is already there.
 */
function spawn(S: TrafficState, p: TrafficParams): void {
  for (const a of APPROACHES) {
    if (S.rng() >= demandAt(S, a, p) * p.dt) continue;
    const street = a % 2;
    let kind: Kind = 'car';
    if (p.busEvery > 0 && S.busTimer[street] <= 0) {
      kind = 'bus';
      S.busTimer[street] = p.busEvery;
    } else if (S.rng() < p.bikeShare) kind = 'bike';
    const k = KINDS[kind];
    let rearmost = Infinity;
    let rearKind: Kind = 'car';
    for (const v of S.vehicles)
      if (v.from === a && v.phase === 'approach' && v.s < rearmost) {
        rearmost = v.s;
        rearKind = v.kind;
      }
    if (rearmost - KINDS[rearKind].len < k.len + k.s0 + 2) continue;
    addVehicle(S, a, pickTurn(S), kind, k.len, k.v0 * 0.8);
  }
  S.busTimer[0] -= p.dt;
  S.busTimer[1] -= p.dt;
}

/** A hash of an integer to [0, 1). */
function hash1(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/** Value noise on a line, for the demand clock. */
function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash1(i) + (hash1(i + 1) - hash1(i)) * u;
}

/**
 * Arrival rate on approach `a` right now, vehicles/s. The two streets ride
 * two slow noise tracks, so over minutes the pressure swings from one to
 * the other and the corner has weather. Driven by the simulation clock,
 * never wall time.
 */
export function demandAt(
  S: TrafficState,
  a: Approach,
  p: TrafficParams
): number {
  const street = a % 2;
  const n = noise1(S.clock * 0.011 + street * 57.3);
  return p.demand * (0.15 + 0.85 * n);
}

/** The far side's clock is cut into cells this long, s. */
const FAR_SIDE_CELL = 50;
/** Share of cells that go red at `farSide` 1: one every two and a half minutes. */
const FAR_SIDE_SHARE = 1 / 3;
/** A red lasts between these, s. */
const FAR_SIDE_RED_MIN = 15;
const FAR_SIDE_RED_MAX = 30;

/**
 * Whether the far side of exit `dest` is backed up right now: a light
 * down the street that nobody can see. Each exit's clock is cut into
 * cells; a hashed third of them (at `farSide` 1) hold a red of fifteen
 * to thirty seconds at a hashed offset, so every exit backs up about
 * once every two or three minutes for a stretch that can reach the box.
 * The same hash as the demand noise, on its own track per exit. Driven
 * by the simulation clock, never wall time; `farSide` 0 turns it off.
 */
export function farSideBlocked(
  S: TrafficState,
  dest: Approach,
  p: TrafficParams
): boolean {
  if (p.farSide <= 0) return false;
  const cell = Math.floor(S.clock / FAR_SIDE_CELL);
  const base = cell * 3 + dest * 1013;
  if (hash1(base) >= FAR_SIDE_SHARE * p.farSide) return false;
  const red =
    FAR_SIDE_RED_MIN + (FAR_SIDE_RED_MAX - FAR_SIDE_RED_MIN) * hash1(base + 1);
  const start = (FAR_SIDE_CELL - red) * hash1(base + 2);
  const t = S.clock - cell * FAR_SIDE_CELL;
  return t >= start && t < start + red;
}

/**
 * One step. Order: decide grants, compute every acceleration from the
 * current state, then move everyone, then phase changes and bookkeeping.
 * Accelerations are all computed before anyone moves so the update is
 * symmetric in time and the order of the vehicle list does not matter.
 */
export function step(S: TrafficState, p: TrafficParams): void {
  S.clock += p.dt;
  S.events.length = 0;
  grant(S, p);
  const acc = new Float64Array(S.vehicles.length);
  S.vehicles.forEach((v, i) => {
    const L = leaderOf(v, S, p);
    acc[i] = L ? idm(v, L.gap, L.dv, p) : idm(v, 1e6, 0, p);
  });
  S.vehicles.forEach((v, i) => {
    v.accel = acc[i];
    if (acc[i] < -KINDS[v.kind].b * 1.6 && v.v > 4) {
      const q = poseOf(v);
      S.events.push({
        type: 'skid',
        id: v.id,
        x: q.x,
        y: q.y,
        hx: q.hx,
        hy: q.hy,
      });
    }
    v.v = Math.max(0, v.v + acc[i] * p.dt);
    v.s += v.v * p.dt;
    if (v.phase === 'approach') {
      if (!v.granted || p.lineIsWall) {
        if (v.s > L_APPROACH) {
          v.s = L_APPROACH;
          v.v = 0;
        }
        if (v.s > L_APPROACH - 1.5 && v.v < 0.15) {
          v.stopped = true;
          v.arrivedAt = Math.min(v.arrivedAt, S.clock);
          v.wait += p.dt;
        }
      } else if (v.s > L_APPROACH) {
        // Past the line, not on it: a granted driver standing on the line
        // is still reading the box from the line.
        v.phase = 'box';
        v.s -= L_APPROACH;
        v.enteredAt = S.clock;
      }
    }
    if (v.phase === 'box') {
      const len = pathOf(v).len;
      if (v.s >= len) {
        v.phase = 'exit';
        v.s -= len;
      }
    }
    if (occupiesBox(v)) {
      if (v.v < 0.15) {
        v.boxWait += p.dt;
        if (v.boxWait > p.boxTau) v.impatient = true;
      } else v.boxWait = 0;
    }
  });
  S.vehicles = S.vehicles.filter((v) => !(v.phase === 'exit' && v.s > L_EXIT));
  // Clearing ends itself when the box is empty.
  if (S.cop.clearing && !S.vehicles.some(occupiesBox)) S.cop.clearing = false;
  // Gridlock is an event once, when it begins.
  if (isGridlocked(S)) {
    if (S.gridlockT === 0)
      S.events.push({ type: 'gridlock', id: 0, x: 0, y: 0, hx: 0, hy: 1 });
    S.gridlockT += p.dt;
  } else S.gridlockT = 0;
  spawn(S, p);
}
