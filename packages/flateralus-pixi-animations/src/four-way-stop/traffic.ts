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
  L_APPROACH,
  L_EXIT,
  PATHS,
  approachPose,
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
  demand: 0.22,
  busEvery: 45,
  bikeShare: 0.12,
  headwayScale: 1,
  lineIsWall: false,
  exitBlocked: [false, false, false, false],
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
    color: Math.floor(S.rng() * 8),
  };
  S.vehicles.push(veh);
  return veh;
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

export function poseOf(v: Vehicle): Pose {
  if (v.phase === 'approach') return approachPose(v.from, v.s);
  if (v.phase === 'box') return pathPose(pathOf(v), v.s);
  return exitPose(destination(v.from, v.turn), v.s);
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

function closer(a: Leader | null, gap: number, dv: number): Leader {
  if (!a || gap < a.gap) return { gap, dv };
  return a;
}

/**
 * What a vehicle is following, as the nearest constraint ahead of it.
 * On the approach that is the vehicle ahead on the same lane and, unless
 * granted, the stop line as a stopped leader. Task 3 adds the box.
 */
function leaderOf(
  v: Vehicle,
  S: TrafficState,
  p: TrafficParams
): Leader | null {
  let L: Leader | null = null;
  const len = (o: Vehicle) => KINDS[o.kind].len;
  if (v.phase === 'approach') {
    for (const o of S.vehicles) {
      if (o === v || o.from !== v.from) continue;
      if (o.phase === 'approach' && o.s > v.s)
        L = closer(L, o.s - len(o) - v.s, v.v - o.v);
      else if (o.phase === 'box')
        L = closer(L, L_APPROACH + o.s - len(o) - v.s, v.v - o.v);
    }
    if (!v.granted || p.lineIsWall) L = closer(L, L_APPROACH - v.s, v.v);
  }
  return L;
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
  const acc = new Float64Array(S.vehicles.length);
  S.vehicles.forEach((v, i) => {
    const L = leaderOf(v, S, p);
    acc[i] = L ? idm(v, L.gap, L.dv, p) : idm(v, 1e6, 0, p);
  });
  S.vehicles.forEach((v, i) => {
    v.accel = acc[i];
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
      } else if (v.s >= L_APPROACH) {
        v.phase = 'box';
        v.s -= L_APPROACH;
        v.enteredAt = S.clock;
      }
    }
    if (v.phase === 'box') {
      const len = pathOf(v).len;
      if (v.v < 0.15) v.boxWait += p.dt;
      else v.boxWait = 0;
      if (v.s >= len) {
        v.phase = 'exit';
        v.s -= len;
      }
    }
  });
  S.vehicles = S.vehicles.filter((v) => !(v.phase === 'exit' && v.s > L_EXIT));
}
