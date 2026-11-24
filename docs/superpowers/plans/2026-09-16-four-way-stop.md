# Four-Way Stop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A lab toy where two streams of cars want one crossing at a rainy Pittsburgh corner and the cursor is the cop who holds, waves and clears.

**Architecture:** A pure, fixed-step traffic core (`geometry.ts`, `traffic.ts`) with no PIXI in it, tested headlessly with vitest. A pinhole camera (`camera.ts`) projects world metres to the frame. A PIXI scene-graph renderer (`scene.ts`) redraws Graphics layers each frame from the traffic state. `fourWayStopAnimation.ts` wires controls, pointer and the three together.

**Tech Stack:** TypeScript, PIXI v8 (`pixi.js`), `@bracketbear/flateralus` manifests, vitest (run from the repo root), prettier and eslint via lint-staged on commit.

**Spec:** `docs/superpowers/specs/2026-09-16-four-way-stop-design.md`

## Global Constraints

- Package: `packages/flateralus-pixi-animations`, directory `src/four-way-stop/`. Follow the sandbox's layout (`src/sandbox/`) for file roles.
- Simulation is a fixed step of `1/60` s with an accumulator capped at 4 steps; no wall-clock time reaches the core. Forcing clocks advance inside the step.
- The traffic core imports nothing from PIXI and touches no DOM. Everything the scene needs to draw is in `TrafficState`.
- Every random number in the core comes from `state.rng`, a seeded generator, so tests are deterministic.
- Controls are all `debug: true`. A `select` with numeric values reads back as a number: compare with `Number(controls.mode) > 0.5`.
- Right-hand traffic. Approaches are indexed by where vehicles come FROM: `0` north, `1` east, `2` south, `3` west. World units are metres, `+y` is north, `+x` is east, the box is centred on the origin.
- Run tests from the repo root: `npx vitest run packages/flateralus-pixi-animations/src/four-way-stop/<file>.test.ts`. Type-check with `npm run type-check --workspace=@bracketbear/flateralus-pixi-animations`. Rebuild with `npm run build --workspace=@bracketbear/flateralus-pixi-animations` before looking at the lab; the astro dev server on 4321 serves `dist`.
- Verify in the lab at `http://localhost:4321/lab?animation=four-way-stop` with the playwright loop described in Task 9, not the Chrome MCP tab: a background tab gets no `requestAnimationFrame`.
- Commit after every task with a message in the repo's style: `feat(four-way-stop): <what the corner does now>`. Do not commit files outside this feature.

---

## File map

| File                                                           | Responsibility                                                                                                                                                                           |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/four-way-stop/geometry.ts`                                | Box and lane dimensions, approach headings, the twelve box paths as sampled curves, world position of a vehicle, the conflict table between paths.                                       |
| `src/four-way-stop/geometry.test.ts`                           | Path lengths, destinations, conflicts exist where they should and not where they should not.                                                                                             |
| `src/four-way-stop/traffic.ts`                                 | Vehicles, the Intelligent Driver Model, leaders and gaps, gap acceptance with patience, the four-way rule, the cop, demand, spawning, events, gridlock.                                  |
| `src/four-way-stop/traffic.test.ts`                            | No collisions, braking wave, gap acceptance, patience forces a gap and the crossing car brakes, no starvation, the cop's three gestures, the late bus gridlocks and a clear resolves it. |
| `src/four-way-stop/camera.ts`                                  | Pinhole camera on the corner mast: project, mirror through the road plane, unproject a screen point to the ground.                                                                       |
| `src/four-way-stop/camera.test.ts`                             | Projection sanity and the mirror.                                                                                                                                                        |
| `src/four-way-stop/manifest.ts`                                | Controls and tints.                                                                                                                                                                      |
| `src/four-way-stop/scene.ts`                                   | PIXI drawing: backdrop, road, history, vehicles, lights, reflections, cop, rain.                                                                                                         |
| `src/four-way-stop/fourWayStopAnimation.ts`                    | The `PixiAnimation`: controls to params, pointer to cop, fixed-step loop, scene draw.                                                                                                    |
| `src/four-way-stop/index.ts`                                   | Exports.                                                                                                                                                                                 |
| `src/index.ts`                                                 | Add the export.                                                                                                                                                                          |
| `apps/bracketbear-website/src/components/lab/registry.ts`      | Register on the toys shelf.                                                                                                                                                              |
| `apps/bracketbear-website/src/components/lab/registry.test.ts` | Add `'four-way-stop'` to the allowlist.                                                                                                                                                  |
| `docs/lab/TOY-IDEAS.md`                                        | Status to built, with what it cost.                                                                                                                                                      |

---

### Task 1: Geometry — lanes, paths, conflicts

**Files:**

- Create: `packages/flateralus-pixi-animations/src/four-way-stop/geometry.ts`
- Test: `packages/flateralus-pixi-animations/src/four-way-stop/geometry.test.ts`

**Interfaces:**

- Produces: `B`, `LANE`, `L_APPROACH`, `L_EXIT`, `type Approach = 0|1|2|3`, `type Turn`, `APPROACHES`, `TURNS`, `heading(a)`, `rightOf(d)`, `destination(from, turn)`, `entryPoint(a)`, `exitPoint(a)`, `interface Path { from, turn, len, pts: Float32Array }`, `PATHS[from][turn]`, `pathPose(path, s): Pose`, `approachPose(from, s)`, `exitPose(dest, s)`, `interface Conflict { sa, sb }`, `conflictBetween(a: Path, b: Path): Conflict | null`, `type Pose = { x, y, hx, hy }`.

- [ ] **Step 1: Write the failing tests**

```ts
// packages/flateralus-pixi-animations/src/four-way-stop/geometry.test.ts
import { describe, it, expect } from 'vitest';
import {
  B,
  LANE,
  L_APPROACH,
  PATHS,
  APPROACHES,
  TURNS,
  destination,
  entryPoint,
  exitPoint,
  pathPose,
  approachPose,
  conflictBetween,
} from './geometry';

describe('destinations', () => {
  it('straight crosses, right and left turn the way right-hand traffic does', () => {
    // From north (heading south): right turn heads west, exits on the west road.
    expect(destination(0, 'straight')).toBe(2);
    expect(destination(0, 'right')).toBe(3);
    expect(destination(0, 'left')).toBe(1);
    // From east (heading west): right turn heads north.
    expect(destination(1, 'right')).toBe(0);
    expect(destination(1, 'left')).toBe(2);
  });
});

describe('paths', () => {
  it('a straight path is a line the length of the box', () => {
    const p = PATHS[0].straight;
    expect(p.len).toBeCloseTo(B, 3);
    const e = entryPoint(0);
    const x = exitPoint(2);
    // Inbound lane from the north sits on the west side of its road.
    expect(e.x).toBeCloseTo(-LANE, 6);
    expect(e.y).toBeCloseTo(B / 2, 6);
    expect(x.x).toBeCloseTo(-LANE, 6);
    expect(x.y).toBeCloseTo(-B / 2, 6);
  });

  it('turns are longer than a right turn and shorter than the box perimeter', () => {
    for (const a of APPROACHES) {
      expect(PATHS[a].right.len).toBeGreaterThan(2);
      expect(PATHS[a].left.len).toBeGreaterThan(PATHS[a].right.len);
      expect(PATHS[a].left.len).toBeLessThan(4 * B);
    }
  });

  it('a pose at the end of a path is the exit point, heading out', () => {
    for (const a of APPROACHES)
      for (const t of TURNS) {
        const p = PATHS[a][t];
        const end = pathPose(p, p.len);
        const x = exitPoint(destination(a, t));
        expect(end.x).toBeCloseTo(x.x, 2);
        expect(end.y).toBeCloseTo(x.y, 2);
        expect(Math.hypot(end.hx, end.hy)).toBeCloseTo(1, 4);
      }
  });

  it('the approach lane ends at the entry point', () => {
    const p = approachPose(1, L_APPROACH);
    const e = entryPoint(1);
    expect(p.x).toBeCloseTo(e.x, 6);
    expect(p.y).toBeCloseTo(e.y, 6);
    expect(p.hx).toBeCloseTo(-1, 6); // from the east, heading west
  });
});

describe('conflicts', () => {
  it('crossing straights conflict near the middle of both', () => {
    const c = conflictBetween(PATHS[0].straight, PATHS[1].straight);
    expect(c).not.toBeNull();
    expect(c!.sa).toBeGreaterThan(2);
    expect(c!.sa).toBeLessThan(B - 2);
    expect(c!.sb).toBeGreaterThan(2);
    expect(c!.sb).toBeLessThan(B - 2);
  });

  it('opposing straights do not conflict', () => {
    expect(conflictBetween(PATHS[0].straight, PATHS[2].straight)).toBeNull();
  });

  it('opposing right turns do not conflict', () => {
    expect(conflictBetween(PATHS[0].right, PATHS[2].right)).toBeNull();
  });

  it('a left yields to the oncoming straight because their paths cross', () => {
    expect(conflictBetween(PATHS[0].left, PATHS[2].straight)).not.toBeNull();
  });

  it('two paths to the same exit lane conflict at their ends', () => {
    // North straight and west right both leave by the south road.
    const c = conflictBetween(PATHS[0].straight, PATHS[3].right);
    expect(c).not.toBeNull();
    expect(c!.sa).toBeGreaterThan(PATHS[0].straight.len - 1.5);
    expect(c!.sb).toBeGreaterThan(PATHS[3].right.len - 1.5);
  });

  it('is symmetric', () => {
    const ab = conflictBetween(PATHS[0].straight, PATHS[1].left)!;
    const ba = conflictBetween(PATHS[1].left, PATHS[0].straight)!;
    expect(ab.sa).toBeCloseTo(ba.sb, 6);
    expect(ab.sb).toBeCloseTo(ba.sa, 6);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run packages/flateralus-pixi-animations/src/four-way-stop/geometry.test.ts`
Expected: FAIL, cannot resolve `./geometry`.

- [ ] **Step 3: Write the geometry**

```ts
// packages/flateralus-pixi-animations/src/four-way-stop/geometry.ts
/**
 * The corner, in metres. +x is east, +y is north, the box is centred on the
 * origin. Approaches are indexed by where vehicles come FROM: 0 north, 1
 * east, 2 south, 3 west. Right-hand traffic, so the inbound lane of every
 * road is on the driver's right and the outbound lane on the far side.
 *
 * Lanes are one-dimensional on purpose: the traffic is a queueing problem,
 * and the geometry only matters at the crossing, where the twelve box paths
 * are sampled curves and the conflicts between them are measured rather
 * than tabulated.
 */

/** Side of the box, m. */
export const B = 12;
/** Lane centre offset from the road's centreline, m. */
export const LANE = 2.6;
/** Approach lane length, m: how far up the street a queue can reach. */
export const L_APPROACH = 70;
/** Exit lane length, m: a vehicle is removed at the end of it. */
export const L_EXIT = 45;
/** Two paths conflict where they come within this, m. */
export const CONFLICT_R = 2.2;
/** Samples per path. */
const N_SAMPLES = 48;

export type Approach = 0 | 1 | 2 | 3;
export type Turn = 'straight' | 'right' | 'left';
export const APPROACHES: Approach[] = [0, 1, 2, 3];
export const TURNS: Turn[] = ['straight', 'right', 'left'];

export interface Pose {
  x: number;
  y: number;
  /** Unit heading. */
  hx: number;
  hy: number;
}

/** Direction of travel for a vehicle coming from approach `a`. */
export function heading(a: Approach): [number, number] {
  return [
    [0, -1],
    [-1, 0],
    [0, 1],
    [1, 0],
  ][a] as [number, number];
}

/** The driver's right, for a heading. */
export function rightOf(d: [number, number]): [number, number] {
  return [d[1], -d[0]];
}

/** The approach whose outbound lane a vehicle leaves by. */
export function destination(from: Approach, turn: Turn): Approach {
  const k = turn === 'straight' ? 2 : turn === 'right' ? 3 : 1;
  return ((from + k) % 4) as Approach;
}

/** The approach on the driver's right of a vehicle coming from `a`. */
export function approachToRight(a: Approach): Approach {
  return ((a + 3) % 4) as Approach;
}

/** Inbound lane centre at the stop line of approach `a`. */
export function entryPoint(a: Approach): { x: number; y: number } {
  const h = heading(a);
  const r = rightOf(h);
  return { x: -h[0] * (B / 2) + r[0] * LANE, y: -h[1] * (B / 2) + r[1] * LANE };
}

/** Outbound lane centre at the box edge of approach `a`. */
export function exitPoint(a: Approach): { x: number; y: number } {
  const hOut: [number, number] = [-heading(a)[0], -heading(a)[1]];
  const r = rightOf(hOut);
  return {
    x: hOut[0] * (B / 2) + r[0] * LANE,
    y: hOut[1] * (B / 2) + r[1] * LANE,
  };
}

export interface Path {
  from: Approach;
  turn: Turn;
  len: number;
  /** Interleaved x, y samples, N_SAMPLES of them, evenly spaced in arc length. */
  pts: Float32Array;
  /** Interleaved unit headings at the samples. */
  hd: Float32Array;
}

function bezier(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  t: number
): [number, number] {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
}

/**
 * Build one path as a cubic from the entry point, leaving along the inbound
 * heading, to the exit point, arriving along the outbound heading, then
 * resample it evenly in arc length so `pathPose` is a plain lookup.
 */
function buildPath(from: Approach, turn: Turn): Path {
  const dest = destination(from, turn);
  const e = entryPoint(from);
  const x = exitPoint(dest);
  const hIn = heading(from);
  const hOut: [number, number] = [-heading(dest)[0], -heading(dest)[1]];
  const p0: [number, number] = [e.x, e.y];
  const p3: [number, number] = [x.x, x.y];
  const k = turn === 'straight' ? 0 : 0.5 * Math.hypot(x.x - e.x, x.y - e.y);
  const p1: [number, number] = [e.x + hIn[0] * k, e.y + hIn[1] * k];
  const p2: [number, number] = [x.x - hOut[0] * k, x.y - hOut[1] * k];
  // Dense sample, then cumulative length.
  const M = 400;
  const raw: [number, number][] = [];
  const cum = new Float64Array(M + 1);
  for (let i = 0; i <= M; i++) {
    raw.push(bezier(p0, p1, p2, p3, i / M));
    if (i > 0)
      cum[i] =
        cum[i - 1] +
        Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]);
  }
  const len = cum[M];
  const pts = new Float32Array(N_SAMPLES * 2);
  const hd = new Float32Array(N_SAMPLES * 2);
  let j = 0;
  for (let i = 0; i < N_SAMPLES; i++) {
    const s = (i / (N_SAMPLES - 1)) * len;
    while (j < M - 1 && cum[j + 1] < s) j++;
    const seg = cum[j + 1] - cum[j] || 1e-9;
    const t = Math.min(1, Math.max(0, (s - cum[j]) / seg));
    pts[i * 2] = raw[j][0] + (raw[j + 1][0] - raw[j][0]) * t;
    pts[i * 2 + 1] = raw[j][1] + (raw[j + 1][1] - raw[j][1]) * t;
    const dx = raw[j + 1][0] - raw[j][0];
    const dy = raw[j + 1][1] - raw[j][1];
    const m = Math.hypot(dx, dy) || 1;
    hd[i * 2] = dx / m;
    hd[i * 2 + 1] = dy / m;
  }
  return { from, turn, len, pts, hd };
}

/** All twelve box paths, indexed `PATHS[from][turn]`. */
export const PATHS: Record<Approach, Record<Turn, Path>> = [0, 1, 2, 3].map(
  (a) => ({
    straight: buildPath(a as Approach, 'straight'),
    right: buildPath(a as Approach, 'right'),
    left: buildPath(a as Approach, 'left'),
  })
) as unknown as Record<Approach, Record<Turn, Path>>;

/** Position and heading `s` metres along a box path. Clamped. */
export function pathPose(p: Path, s: number): Pose {
  const f = Math.min(1, Math.max(0, s / p.len)) * (N_SAMPLES - 1);
  const i = Math.min(N_SAMPLES - 2, Math.floor(f));
  const t = f - i;
  const k = i * 2;
  const hx = p.hd[k] + (p.hd[k + 2] - p.hd[k]) * t;
  const hy = p.hd[k + 1] + (p.hd[k + 3] - p.hd[k + 1]) * t;
  const m = Math.hypot(hx, hy) || 1;
  return {
    x: p.pts[k] + (p.pts[k + 2] - p.pts[k]) * t,
    y: p.pts[k + 1] + (p.pts[k + 3] - p.pts[k + 1]) * t,
    hx: hx / m,
    hy: hy / m,
  };
}

/** Position on the approach lane, `s` from its start, `L_APPROACH` at the line. */
export function approachPose(from: Approach, s: number): Pose {
  const e = entryPoint(from);
  const h = heading(from);
  const back = L_APPROACH - s;
  return { x: e.x - h[0] * back, y: e.y - h[1] * back, hx: h[0], hy: h[1] };
}

/** Position on the exit lane of `dest`, `s` past the box edge. */
export function exitPose(dest: Approach, s: number): Pose {
  const x = exitPoint(dest);
  const h: [number, number] = [-heading(dest)[0], -heading(dest)[1]];
  return { x: x.x + h[0] * s, y: x.y + h[1] * s, hx: h[0], hy: h[1] };
}

export interface Conflict {
  /** Arc length on the first path where the two come closest. */
  sa: number;
  /** Arc length on the second. */
  sb: number;
}

const conflictCache = new Map<string, Conflict | null>();

/**
 * Where two box paths conflict, measured rather than tabulated: the pair of
 * samples that come closest, if they come within `CONFLICT_R`. Paths from
 * the same approach share a lane and are handled by car-following, so they
 * never conflict here. Two paths into the same exit lane conflict at their
 * ends, which is the merge.
 */
export function conflictBetween(a: Path, b: Path): Conflict | null {
  if (a.from === b.from) return null;
  const key = `${a.from}${a.turn}|${b.from}${b.turn}`;
  const hit = conflictCache.get(key);
  if (hit !== undefined) return hit;
  let best = Infinity;
  let bi = 0;
  let bj = 0;
  for (let i = 0; i < N_SAMPLES; i++) {
    const ax = a.pts[i * 2];
    const ay = a.pts[i * 2 + 1];
    for (let j = 0; j < N_SAMPLES; j++) {
      const dx = ax - b.pts[j * 2];
      const dy = ay - b.pts[j * 2 + 1];
      const d = dx * dx + dy * dy;
      if (d < best) {
        best = d;
        bi = i;
        bj = j;
      }
    }
  }
  const out =
    Math.sqrt(best) < CONFLICT_R
      ? {
          sa: (bi / (N_SAMPLES - 1)) * a.len,
          sb: (bj / (N_SAMPLES - 1)) * b.len,
        }
      : null;
  conflictCache.set(key, out);
  return out;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run packages/flateralus-pixi-animations/src/four-way-stop/geometry.test.ts`
Expected: PASS, 10 tests. If "opposing straights do not conflict" fails, the two lanes are `2 * LANE = 5.2` m apart, which is above `CONFLICT_R`; check `rightOf`.

- [ ] **Step 5: Commit**

```bash
git add packages/flateralus-pixi-animations/src/four-way-stop/geometry.ts packages/flateralus-pixi-animations/src/four-way-stop/geometry.test.ts
git commit -m "feat(four-way-stop): the corner's lanes, paths and measured conflicts"
```

---

### Task 2: Traffic core — vehicles, the IDM, the approach lane

**Files:**

- Create: `packages/flateralus-pixi-animations/src/four-way-stop/traffic.ts`
- Test: `packages/flateralus-pixi-animations/src/four-way-stop/traffic.test.ts`

**Interfaces:**

- Consumes: everything in `geometry.ts`.
- Produces: `STEP`, `MAX_STEPS_PER_FRAME`, `type Kind`, `KINDS`, `type Phase`, `interface Vehicle`, `interface Cop`, `interface TrafficParams`, `DEFAULT_PARAMS`, `interface TrafficEvent`, `interface TrafficState`, `createTraffic(seed)`, `addVehicle(state, from, turn, kind, s, v)`, `idm(v, gap, dv, p)`, `step(state, p)`, `boxS(v)`, `poseOf(v): Pose`, `vehiclesOn(state, from)`. Later tasks add to `step`; the function names here are final.

- [ ] **Step 1: Write the failing tests**

```ts
// packages/flateralus-pixi-animations/src/four-way-stop/traffic.test.ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run packages/flateralus-pixi-animations/src/four-way-stop/traffic.test.ts`
Expected: FAIL, cannot resolve `./traffic`.

- [ ] **Step 3: Write the core**

`lineIsWall` is a test hook: it makes every stop line an unconditional wall so the approach lane can be tested before gap acceptance exists. Task 3 replaces its use in `step` with the real grant logic but keeps the flag, because the "held" gesture is the same wall.

```ts
// packages/flateralus-pixi-animations/src/four-way-stop/traffic.ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run packages/flateralus-pixi-animations/src/four-way-stop/traffic.test.ts`
Expected: PASS, 3 tests. If the braking-wave test fails on the lower bound, the cars started closer than one desired headway apart; check the spacing of 13 m against `v0 * T + s0 = 11.9`.

- [ ] **Step 5: Commit**

```bash
git add packages/flateralus-pixi-animations/src/four-way-stop/traffic.ts packages/flateralus-pixi-animations/src/four-way-stop/traffic.test.ts
git commit -m "feat(four-way-stop): cars follow by the IDM and queue at the line"
```

---

### Task 3: Gap acceptance, patience, the four-way rule, the box

**Files:**

- Modify: `packages/flateralus-pixi-animations/src/four-way-stop/traffic.ts`
- Test: `packages/flateralus-pixi-animations/src/four-way-stop/traffic.test.ts`

**Interfaces:**

- Consumes: Task 2.
- Produces: `criticalGap(v, p)`, `gapAccepted(v, S, p)`, `hasPriority(v, S, p)`, `frontOf(S, from)`, and `leaderOf` extended to the box and exit lanes; `step` now grants entry. `exitBlocked` becomes a wall at the end of the exit lane.

- [ ] **Step 1: Add the failing tests**

Append to `traffic.test.ts`:

```ts
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
```

Add `poseOf` to the import from `./traffic`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run packages/flateralus-pixi-animations/src/four-way-stop/traffic.test.ts`
Expected: the new "the crossing" tests FAIL (nothing is ever granted, so the lone car never crosses).

- [ ] **Step 3: Extend the core**

Replace `leaderOf` and `step` in `traffic.ts` with the following, and add the new functions above `step`.

```ts
/** The critical gap a driver will accept, after `wait` seconds at the line. */
export function criticalGap(v: Vehicle, p: TrafficParams): number {
  return Math.max(p.tcMin, p.tc0 * Math.exp(-v.wait / p.tau));
}

/**
 * Whether the vehicles already committed to the box leave this driver a
 * gap. For each committed vehicle whose path conflicts with mine: if it has
 * passed the conflict point, ignore it; if it is on the point, no; else the
 * time it needs to reach the point must exceed my critical gap.
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
    if (o.phase === 'exit') continue;
    if (o.phase === 'approach' && !o.granted) continue;
    const c = conflictBetween(mine, pathOf(o));
    if (!c) continue;
    const so = boxS(o);
    const len = KINDS[o.kind].len;
    if (so > c.sb + 1) continue; // passed
    if (so >= c.sb - len - 1) return false; // on it
    if ((c.sb - so) / Math.max(o.v, 0.3) < tc) return false;
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

/**
 * What a vehicle is following, as the nearest constraint ahead of it.
 *
 * Approach: the vehicle ahead on the lane, and the stop line as a stopped
 * leader unless granted. Box: the vehicle ahead on the same path, anything
 * physically on a conflict point ahead of me, and — unless my patience in
 * the box has run out — anyone who entered before me and has not yet
 * cleared a conflict point I am heading for. Exit: the vehicle ahead on the
 * exit lane, and the test hook's wall at its end.
 *
 * Physical occupancy always counts. That is how a forced gap reaches the
 * crossing car: the forcer is simply there, on the point, and the IDM does
 * the rest.
 */
function leaderOf(
  v: Vehicle,
  S: TrafficState,
  p: TrafficParams
): Leader | null {
  let L: Leader | null = null;
  const len = (o: Vehicle) => KINDS[o.kind].len;
  const dest = destination(v.from, v.turn);
  if (v.phase === 'approach') {
    for (const o of S.vehicles) {
      if (o === v || o.from !== v.from) continue;
      if (o.phase === 'approach' && o.s > v.s)
        L = closer(L, o.s - len(o) - v.s, v.v - o.v);
      else if (o.phase === 'box')
        L = closer(L, L_APPROACH + o.s - len(o) - v.s, v.v - o.v);
    }
    if (!v.granted || p.lineIsWall) L = closer(L, L_APPROACH - v.s, v.v);
    return L;
  }
  const mine = pathOf(v);
  const ms = boxS(v);
  if (v.phase === 'box') {
    const yielding = v.boxWait < p.boxTau && !S.cop.clearing;
    for (const o of S.vehicles) {
      if (o === v) continue;
      if (o.from === v.from && o.turn === v.turn) {
        const os = boxS(o);
        if (os > ms) L = closer(L, os - len(o) - ms, v.v - o.v);
        continue;
      }
      if (o.phase === 'exit' && destination(o.from, o.turn) === dest) {
        L = closer(L, mine.len + o.s - len(o) - ms, v.v - o.v);
        continue;
      }
      if (o.phase === 'exit' || (o.phase === 'approach' && !o.granted))
        continue;
      const c = conflictBetween(mine, pathOf(o));
      if (!c || c.sa <= ms) continue;
      const os = boxS(o);
      const onIt = os > c.sb - len(o) - 1 && os < c.sb + 1;
      if (onIt) {
        L = closer(L, c.sa - ms - 1, v.v);
        continue;
      }
      if (yielding && o.enteredAt < v.enteredAt && os < c.sb) {
        const tClear = (c.sb + len(o) - os) / Math.max(o.v, 1);
        const tMine = (c.sa - ms) / Math.max(v.v, 1);
        if (tMine < tClear + 0.5) L = closer(L, c.sa - ms - 1.5, v.v);
      }
    }
    return L;
  }
  // exit
  for (const o of S.vehicles) {
    if (o === v || o.phase !== 'exit') continue;
    if (destination(o.from, o.turn) !== dest || o.s <= v.s) continue;
    L = closer(L, o.s - len(o) - v.s, v.v - o.v);
  }
  if (p.exitBlocked[dest]) L = closer(L, L_EXIT - 4 - v.s, v.v);
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
    if (mode === 'wall') continue;
    if (mode === 'wave') {
      for (const v of S.vehicles)
        if (v.from === a && v.phase === 'approach' && !v.granted) {
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
  spawn(S, p);
}
```

Also add, above `step`, the spawner. Demand drift comes in Task 5; for now the rate is flat:

```ts
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

/** Arrival rate on approach `a` right now, vehicles/s. Flat until Task 5. */
function demandAt(S: TrafficState, _a: Approach, p: TrafficParams): number {
  void S;
  return p.demand;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run packages/flateralus-pixi-animations/src/four-way-stop/traffic.test.ts`
Expected: PASS, 8 tests. The starvation and crash tests run three simulated minutes each; a few seconds of wall time is normal. If "never overlaps" fails with a small count, raise the emergency cap `B_MAX` before touching `tcMin`: a forced gap must be survivable, and `tcMin` is the toy's edge.

- [ ] **Step 5: Commit**

```bash
git add packages/flateralus-pixi-animations/src/four-way-stop/traffic.ts packages/flateralus-pixi-animations/src/four-way-stop/traffic.test.ts
git commit -m "feat(four-way-stop): drivers take gaps, lose patience and force them"
```

---

### Task 4: The cop, the Pittsburgh left, gridlock

**Files:**

- Modify: `packages/flateralus-pixi-animations/src/four-way-stop/traffic.ts`
- Test: `packages/flateralus-pixi-animations/src/four-way-stop/traffic.test.ts`

**Interfaces:**

- Consumes: Task 3.
- Produces: `isGridlocked(S)`, `setCop(S, cop: Partial<Cop>)`, gridlock events, `clearing` ends itself when the box empties, `pittsburghLeft` assigned in `grant`.

- [ ] **Step 1: Add the failing tests**

Append to `traffic.test.ts`, and add `isGridlocked`, `setCop`, `boxS` to the import:

```ts
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
    let lEnter = -1;
    let oEnter = -1;
    for (let t = 0; t < 15; t += p.dt) {
      step(S, p);
      if (lEnter < 0 && l.phase !== 'approach') lEnter = t;
      if (oEnter < 0 && o.phase !== 'approach') oEnter = t;
    }
    expect(l.pittsburghLeft).toBe(true);
    expect(lEnter).toBeGreaterThan(0);
    expect(lEnter).toBeLessThanOrEqual(oEnter);
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
    expect(bus.phase).toBe('box');
    expect(e.phase).toBe('approach');
    // Now the far side drains and the cop clears the box.
    const open = params();
    setCop(S, { present: true, waved: null, clearing: true });
    let clearedAt = -1;
    for (let t = 0; t < 15; t += open.dt) {
      step(S, open);
      if (clearedAt < 0 && !S.vehicles.some((v) => v.phase === 'box'))
        clearedAt = t;
    }
    expect(clearedAt).toBeGreaterThan(0);
    expect(S.cop.clearing).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run packages/flateralus-pixi-animations/src/four-way-stop/traffic.test.ts`
Expected: FAIL, `setCop` and `isGridlocked` are not exported; the Pittsburgh-left test fails on the flag.

- [ ] **Step 3: Add the cop, the flag and gridlock**

Add to `traffic.ts`:

```ts
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
  return S.vehicles.some((v) => v.phase === 'box' && v.boxWait > 3);
}
```

In `grant`, in the `rule` branch, replace

```ts
const f = frontOf(S, a);
if (!f || !f.stopped) continue;
if (!hasPriority(f, S, p)) continue;
```

with

```ts
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
```

At the end of `step`, before `spawn(S, p)`:

```ts
// Clearing ends itself when the box is empty.
if (S.cop.clearing && !S.vehicles.some((v) => v.phase === 'box'))
  S.cop.clearing = false;
// Gridlock is an event once, when it begins.
if (isGridlocked(S)) {
  if (S.gridlockT === 0)
    S.events.push({ type: 'gridlock', id: 0, x: 0, y: 0, hx: 0, hy: 1 });
  S.gridlockT += p.dt;
} else S.gridlockT = 0;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run packages/flateralus-pixi-animations/src/four-way-stop/traffic.test.ts`
Expected: PASS, 13 tests. If the gridlock test's second half fails on `clearedAt`, check that `exitBlocked` was dropped in `open` (it was: `params()` rebuilds from defaults) and that the bus's leader in the box is the exit-lane queue, which now drains.

- [ ] **Step 5: Commit**

```bash
git add packages/flateralus-pixi-animations/src/four-way-stop/traffic.ts packages/flateralus-pixi-animations/src/four-way-stop/traffic.test.ts
git commit -m "feat(four-way-stop): the cop holds, waves and clears; the box can seize"
```

---

### Task 5: Demand that drifts, skid events

**Files:**

- Modify: `packages/flateralus-pixi-animations/src/four-way-stop/traffic.ts`
- Test: `packages/flateralus-pixi-animations/src/four-way-stop/traffic.test.ts`

**Interfaces:**

- Consumes: Task 4.
- Produces: `demandAt(S, a, p)` exported, driven by a per-step clock; `'skid'` events with the vehicle's pose.

- [ ] **Step 1: Add the failing tests**

Append, adding `demandAt` to the import:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run packages/flateralus-pixi-animations/src/four-way-stop/traffic.test.ts`
Expected: FAIL, `demandAt` not exported; no skid event.

- [ ] **Step 3: Implement**

Replace `demandAt` in `traffic.ts`:

```ts
/** Value noise on a line, for the demand clock. */
function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const h = (n: number) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return s - Math.floor(s);
  };
  return h(i) + (h(i + 1) - h(i)) * u;
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
```

In `step`, inside the per-vehicle forEach right after `v.accel = acc[i];`:

```ts
if (acc[i] < -KINDS[v.kind].b * 1.6 && v.v > 4) {
  const q = poseOf(v);
  S.events.push({ type: 'skid', id: v.id, x: q.x, y: q.y, hx: q.hx, hy: q.hy });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run packages/flateralus-pixi-animations/src/four-way-stop/traffic.test.ts`
Expected: PASS, 15 tests. Re-run the whole file: the starvation test must still pass under drifting demand; if it fails, the peak is too high for the rule to clear, and `DEFAULT_PARAMS.demand` comes down, not `tau`.

- [ ] **Step 5: Commit**

```bash
git add packages/flateralus-pixi-animations/src/four-way-stop/traffic.ts packages/flateralus-pixi-animations/src/four-way-stop/traffic.test.ts
git commit -m "feat(four-way-stop): the corner has weather, and hard brakes leave a mark"
```

---

### Task 6: The camera

**Files:**

- Create: `packages/flateralus-pixi-animations/src/four-way-stop/camera.ts`
- Test: `packages/flateralus-pixi-animations/src/four-way-stop/camera.test.ts`

**Interfaces:**

- Produces: `interface Camera`, `makeCamera(aspect)`, `project(cam, x, y, z): Projected | null` with `{ u, v, depth }` in frame fractions, `projectMirror(cam, x, y, z)`, `groundHit(cam, u, v): { x, y } | null`, `cameraPos(cam)`.

- [ ] **Step 1: Write the failing tests**

```ts
// packages/flateralus-pixi-animations/src/four-way-stop/camera.test.ts
import { describe, it, expect } from 'vitest';
import { makeCamera, project, projectMirror, groundHit } from './camera';

describe('camera', () => {
  const cam = makeCamera(0.75);

  it('puts the box in the frame with north up', () => {
    const c = project(cam, 0, 0, 0)!;
    expect(c).not.toBeNull();
    expect(c.u).toBeGreaterThan(0.2);
    expect(c.u).toBeLessThan(0.8);
    expect(c.v).toBeGreaterThan(0.3);
    expect(c.v).toBeLessThan(0.9);
    const far = project(cam, 0, 40, 0)!;
    expect(far.v).toBeLessThan(c.v); // further north is higher in the frame
    expect(far.depth).toBeGreaterThan(c.depth);
  });

  it('mirrors a light through the road plane to below its foot', () => {
    const foot = project(cam, 3, 3, 0)!;
    const lamp = project(cam, 3, 3, 1)!;
    const refl = projectMirror(cam, 3, 3, 1)!;
    expect(lamp.v).toBeLessThan(foot.v);
    expect(refl.v).toBeGreaterThan(foot.v);
    expect(Math.abs(refl.u - foot.u)).toBeLessThan(0.02);
  });

  it('unprojects a screen point back to the ground it came from', () => {
    for (const [x, y] of [
      [0, 0],
      [-2.6, 20],
      [8, -3],
    ]) {
      const s = project(cam, x, y, 0)!;
      const g = groundHit(cam, s.u, s.v)!;
      expect(g.x).toBeCloseTo(x, 3);
      expect(g.y).toBeCloseTo(y, 3);
    }
  });

  it('rejects points behind the camera', () => {
    expect(project(cam, 200, -200, 0)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run packages/flateralus-pixi-animations/src/four-way-stop/camera.test.ts`
Expected: FAIL, cannot resolve `./camera`.

- [ ] **Step 3: Write the camera**

```ts
// packages/flateralus-pixi-animations/src/four-way-stop/camera.ts
/**
 * A pinhole camera on the south-east corner mast, looking down into the
 * crossing with the north approach receding up the frame. One projection
 * for everything: road, vehicles, lights, and the same lights mirrored
 * through the road plane, which is what a wet street does to them.
 */

export interface Camera {
  pos: [number, number, number];
  /** Orthonormal basis: forward, right, up. */
  f: [number, number, number];
  r: [number, number, number];
  u: [number, number, number];
  /** tan(fovY / 2). */
  tanH: number;
  aspect: number;
}

export interface Projected {
  /** Fraction across the frame, 0 left. */
  u: number;
  /** Fraction down the frame, 0 top. */
  v: number;
  /** Distance along the view axis, m. */
  depth: number;
}

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: V3): V3 => {
  const m = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / m, a[1] / m, a[2] / m];
};

/**
 * The mast: 7 m up on the south-east corner, aimed a little north of the
 * box centre so the frame holds the north queue. A portrait frame gets a
 * taller field of view, so the queue still reaches the top.
 */
export function makeCamera(aspect: number): Camera {
  const pos: V3 = [11.5, -12.5, 7.2];
  const target: V3 = [-1.5, 6, 0];
  const f = norm(sub(target, pos));
  const r = norm(cross(f, [0, 0, 1]));
  const u = cross(r, f);
  const fovY = aspect < 1 ? 1.15 : 0.85;
  return { pos, f, r, u, tanH: Math.tan(fovY / 2), aspect };
}

export function cameraPos(cam: Camera): [number, number, number] {
  return cam.pos;
}

export function project(
  cam: Camera,
  x: number,
  y: number,
  z: number
): Projected | null {
  const d = sub([x, y, z], cam.pos);
  const depth = dot(d, cam.f);
  if (depth < 0.2) return null;
  const px = dot(d, cam.r) / (depth * cam.tanH * cam.aspect);
  const py = dot(d, cam.u) / (depth * cam.tanH);
  return { u: 0.5 + 0.5 * px, v: 0.5 - 0.5 * py, depth };
}

/** The same point seen in the wet road: mirrored through z = 0. */
export function projectMirror(
  cam: Camera,
  x: number,
  y: number,
  z: number
): Projected | null {
  return project(cam, x, y, -z);
}

/** Where a ray through a frame point meets the road plane. */
export function groundHit(
  cam: Camera,
  u: number,
  v: number
): { x: number; y: number } | null {
  const px = (u - 0.5) * 2 * cam.tanH * cam.aspect;
  const py = (0.5 - v) * 2 * cam.tanH;
  const dir: V3 = [
    cam.f[0] + cam.r[0] * px + cam.u[0] * py,
    cam.f[1] + cam.r[1] * px + cam.u[1] * py,
    cam.f[2] + cam.r[2] * px + cam.u[2] * py,
  ];
  if (dir[2] >= -1e-6) return null;
  const t = -cam.pos[2] / dir[2];
  return { x: cam.pos[0] + dir[0] * t, y: cam.pos[1] + dir[1] * t };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run packages/flateralus-pixi-animations/src/four-way-stop/camera.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/flateralus-pixi-animations/src/four-way-stop/camera.ts packages/flateralus-pixi-animations/src/four-way-stop/camera.test.ts
git commit -m "feat(four-way-stop): a camera on the corner mast, and the road as a mirror"
```

---

### Task 7: Manifest, animation shell, road and backdrop, lab registration

**Files:**

- Create: `packages/flateralus-pixi-animations/src/four-way-stop/manifest.ts`
- Create: `packages/flateralus-pixi-animations/src/four-way-stop/scene.ts`
- Create: `packages/flateralus-pixi-animations/src/four-way-stop/fourWayStopAnimation.ts`
- Create: `packages/flateralus-pixi-animations/src/four-way-stop/index.ts`
- Modify: `packages/flateralus-pixi-animations/src/index.ts` (add one export line, alphabetical: after `./foil-statement`)
- Modify: `apps/bracketbear-website/src/components/lab/registry.ts` (import + entry before `erosion-table`)
- Modify: `apps/bracketbear-website/src/components/lab/registry.test.ts` (allowlist)

**Interfaces:**

- Consumes: `traffic.ts`, `camera.ts`.
- Produces: `MANIFEST`, `FourWayStopControlValues`, `TINTS`, `class Scene { constructor(root); resize(w, h, cam); draw(S, cam, dt, tint, rain) }` — this task draws the backdrop and road only; Task 8 fills in the rest of `draw`. `createFourWayStopAnimation()`.

- [ ] **Step 1: Write the manifest**

```ts
// packages/flateralus-pixi-animations/src/four-way-stop/manifest.ts
import { createManifest } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';

export const MANIFEST = createManifest({
  id: 'four-way-stop',
  name: 'Four-Way Stop',
  description:
    'A Pittsburgh corner at night in the rain, no light, a cop in the middle. Two streams of cars want the same crossing. Every car follows the Intelligent Driver Model, so braking waves run backward up a queue and jams appear from nothing; drivers at the line take gaps by a critical gap that shrinks the longer they wait, so a driver who has waited long enough forces one, and the crossing car brakes, and that wave runs back up the other queue. Wet asphalt is a mirror: every light you see is reflected by mirroring its own geometry through the road. Hover an approach to hold it, click it to wave it through, click the box to clear it. Leave, and the four-way-stop rule runs the corner on its own — the Pittsburgh left included.',
  controls: [
    {
      name: 'mode',
      type: 'select',
      label: 'Mode',
      options: [
        { value: 1, label: 'Interactive' },
        { value: 0, label: 'Ambient' },
      ],
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'demand',
      type: 'number',
      label: 'Traffic',
      min: 0.05,
      max: 0.5,
      step: 0.01,
      defaultValue: 0.22,
      debug: true,
    },
    {
      name: 'patience',
      type: 'number',
      label: 'Patience',
      min: 2,
      max: 30,
      step: 1,
      defaultValue: 8,
      debug: true,
    },
    {
      name: 'headway',
      type: 'number',
      label: 'Headway',
      min: 0.6,
      max: 2,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'bus',
      type: 'boolean',
      label: 'Buses',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'bikes',
      type: 'boolean',
      label: 'Cyclists',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'rain',
      type: 'number',
      label: 'Rain',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.7,
      debug: true,
    },
    {
      name: 'tint',
      type: 'select',
      label: 'Light',
      options: [
        { value: 0, label: 'Night' },
        { value: 1, label: 'Sodium' },
        { value: 2, label: 'Dawn' },
      ],
      defaultValue: 0,
      debug: true,
    },
  ],
} as const);

export type FourWayStopControlValues = ManifestToControlValues<typeof MANIFEST>;

export interface Tint {
  sky: number;
  skyLow: number;
  asphalt: number;
  wetSheen: number;
  curb: number;
  paint: number;
  lamp: number;
  headlight: number;
  tail: number;
  window: number;
  /** Multiplies every additive light, so a dawn sky can dim them. */
  lightGain: number;
}

/**
 * Check every one of these with the corner running. The lights are added
 * on top of the asphalt, so the asphalt has to sit dark enough that a
 * headlight cone and its reflection have somewhere to climb.
 */
export const TINTS: Tint[] = [
  {
    sky: 0x0a0d18,
    skyLow: 0x1b1a2c,
    asphalt: 0x14161d,
    wetSheen: 0x2a2f44,
    curb: 0x2c2c33,
    paint: 0x9a9585,
    lamp: 0xffc26b,
    headlight: 0xfff3d6,
    tail: 0xff2a1e,
    window: 0xffd08a,
    lightGain: 1,
  },
  {
    sky: 0x1a0f06,
    skyLow: 0x3a2008,
    asphalt: 0x1c150e,
    wetSheen: 0x4a3216,
    curb: 0x3a2e20,
    paint: 0xa89468,
    lamp: 0xff9a2a,
    headlight: 0xffe2b0,
    tail: 0xff3a1e,
    window: 0xffb060,
    lightGain: 0.9,
  },
  {
    sky: 0x2b3450,
    skyLow: 0x8a6a78,
    asphalt: 0x2a2d36,
    wetSheen: 0x5a5f78,
    curb: 0x4a4a52,
    paint: 0xc8c2b0,
    lamp: 0xffd08a,
    headlight: 0xfff6e6,
    tail: 0xff3a2a,
    window: 0xffe0a0,
    lightGain: 0.55,
  },
];
```

- [ ] **Step 2: Write the scene shell with backdrop and road**

```ts
// packages/flateralus-pixi-animations/src/four-way-stop/scene.ts
import * as PIXI from 'pixi.js';
import {
  B,
  LANE,
  L_APPROACH,
  L_EXIT,
  APPROACHES,
  heading,
  rightOf,
  type Approach,
} from './geometry';
import { type Camera, project } from './camera';
import type { TrafficState } from './traffic';
import type { Tint } from './manifest';

/**
 * Everything drawn, as PIXI Graphics layers redrawn each frame from the
 * traffic state. Backdrop and road are static and redrawn only on resize
 * or a tint change; everything else is cleared and rebuilt every frame,
 * which at sixty vehicles is cheap.
 */
export class Scene {
  readonly backdrop = new PIXI.Graphics();
  readonly road = new PIXI.Graphics();
  readonly history = new PIXI.Graphics();
  readonly reflections = new PIXI.Graphics();
  readonly cones = new PIXI.Graphics();
  readonly vehicles = new PIXI.Graphics();
  readonly lamps = new PIXI.Graphics();
  readonly cop = new PIXI.Graphics();
  readonly rain = new PIXI.Graphics();

  private w = 1;
  private h = 1;
  private staticTint: Tint | null = null;
  /** Seeded once so the skyline and the lit windows do not change per frame. */
  private seed = 7;

  constructor(root: PIXI.Container) {
    this.reflections.blendMode = 'add';
    this.cones.blendMode = 'add';
    this.lamps.blendMode = 'add';
    root.addChild(
      this.backdrop,
      this.road,
      this.history,
      this.reflections,
      this.cones,
      this.vehicles,
      this.lamps,
      this.cop,
      this.rain
    );
  }

  /** Frame fraction to pixels. */
  px(p: { u: number; v: number }): [number, number] {
    return [p.u * this.w, p.v * this.h];
  }

  private rnd(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  resize(w: number, h: number, cam: Camera, tint: Tint): void {
    this.w = w;
    this.h = h;
    this.staticTint = tint;
    this.drawBackdrop(cam, tint);
    this.drawRoad(cam, tint);
  }

  needsStatic(tint: Tint): boolean {
    return this.staticTint !== tint;
  }

  /** A quad on the ground, projected. Skipped if any corner is behind the camera. */
  private groundQuad(
    g: PIXI.Graphics,
    cam: Camera,
    pts: [number, number][]
  ): boolean {
    const P = pts.map((q) => project(cam, q[0], q[1], 0));
    if (P.some((p) => !p)) return false;
    const [a, ...rest] = P.map((p) => this.px(p!));
    g.moveTo(a[0], a[1]);
    for (const r of rest) g.lineTo(r[0], r[1]);
    g.closePath();
    return true;
  }

  /**
   * Sky, then row houses along the far sides of the north and east roads,
   * with a few lit windows, then the four street lamps on the corners.
   */
  private drawBackdrop(cam: Camera, tint: Tint): void {
    const g = this.backdrop;
    g.clear();
    this.seed = 7;
    g.rect(0, 0, this.w, this.h * 0.55).fill(tint.sky);
    g.rect(0, this.h * 0.4, this.w, this.h * 0.6).fill(tint.skyLow);
    // Row houses: boxes set back from the road along two sides.
    const houses: {
      x: number;
      y: number;
      w: number;
      d: number;
      hgt: number;
    }[] = [];
    for (let i = 0; i < 9; i++) {
      const w = 7 + this.rnd() * 3;
      houses.push({
        x: -B / 2 - 9 - w,
        y: B / 2 + 4 + i * 10.5,
        w,
        d: 9,
        hgt: 8 + this.rnd() * 3,
      });
      houses.push({
        x: B / 2 + 9,
        y: B / 2 + 4 + i * 10.5,
        w,
        d: 9,
        hgt: 8 + this.rnd() * 3,
      });
    }
    for (let i = 0; i < 7; i++) {
      const w = 7 + this.rnd() * 3;
      houses.push({
        x: B / 2 + 6 + i * 10.5,
        y: B / 2 + 9,
        w,
        d: 9,
        hgt: 8 + this.rnd() * 3,
      });
    }
    houses.sort((a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y));
    for (const hs of houses) {
      const c = [
        [hs.x, hs.y],
        [hs.x + hs.w, hs.y],
        [hs.x + hs.w, hs.y + hs.d],
        [hs.x, hs.y + hs.d],
      ] as [number, number][];
      const top = c.map((q) => project(cam, q[0], q[1], hs.hgt));
      const bot = c.map((q) => project(cam, q[0], q[1], 0));
      if (top.some((p) => !p) || bot.some((p) => !p)) continue;
      // Front face (the one facing the box) and the roof.
      const face = [bot[0], bot[1], top[1], top[0]].map((p) => this.px(p!));
      g.moveTo(face[0][0], face[0][1]);
      for (const f of face.slice(1)) g.lineTo(f[0], f[1]);
      g.closePath().fill(0x0d0f16);
      const roof = top.map((p) => this.px(p!));
      g.moveTo(roof[0][0], roof[0][1]);
      for (const r of roof.slice(1)) g.lineTo(r[0], r[1]);
      g.closePath().fill(0x101320);
      // Lit windows, a few per face.
      for (let k = 0; k < 3; k++) {
        if (this.rnd() > 0.45) continue;
        const fx = 0.2 + this.rnd() * 0.6;
        const fz = 0.25 + this.rnd() * 0.5;
        const p = project(cam, hs.x + hs.w * fx, hs.y, hs.hgt * fz);
        if (!p) continue;
        const [x, y] = this.px(p);
        const s = Math.max(2, 40 / p.depth);
        g.rect(x - s / 2, y - s * 0.7, s, s * 1.4).fill({
          color: tint.window,
          alpha: 0.85,
        });
      }
    }
    // Street lamps on the four corners of the intersection.
    for (const [sx, sy] of [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ]) {
      const x = sx * (B / 2 + 2.5);
      const y = sy * (B / 2 + 2.5);
      const foot = project(cam, x, y, 0);
      const head = project(cam, x, y, 6.5);
      if (!foot || !head) continue;
      const [fx, fy] = this.px(foot);
      const [hx, hy] = this.px(head);
      g.moveTo(fx, fy)
        .lineTo(hx, hy)
        .stroke({ color: 0x1a1c24, width: Math.max(1, 30 / foot.depth) });
      const r = Math.max(4, 90 / head.depth);
      g.circle(hx, hy, r).fill({ color: tint.lamp, alpha: 0.9 });
      g.circle(hx, hy, r * 3).fill({ color: tint.lamp, alpha: 0.12 });
    }
  }

  /**
   * Asphalt for the four roads and the box, curbs beside them, a dashed
   * centre line up each approach, a stop line at each line, and the
   * crosswalks: white bars, worn along the two wheel paths.
   */
  private drawRoad(cam: Camera, tint: Tint): void {
    const g = this.road;
    g.clear();
    const half = LANE * 2;
    const far = L_APPROACH + 5;
    const farOut = L_EXIT + 5;
    // Curbs first, wider than the road.
    for (const a of APPROACHES) {
      const h = heading(a);
      const r = rightOf(h);
      const q = (u: number, w: number): [number, number] => [
        -h[0] * u + r[0] * w,
        -h[1] * u + r[1] * w,
      ];
      const reach =
        a % 2 === 0 ? (a === 0 ? far : farOut) : a === 1 ? far : farOut;
      if (
        this.groundQuad(g, cam, [
          q(B / 2, -half - 2.2),
          q(reach, -half - 2.2),
          q(reach, half + 2.2),
          q(B / 2, half + 2.2),
        ])
      )
        g.fill(tint.curb);
    }
    g.rect(0, 0, 0, 0);
    // Asphalt.
    for (const a of APPROACHES) {
      const h = heading(a);
      const r = rightOf(h);
      const q = (u: number, w: number): [number, number] => [
        -h[0] * u + r[0] * w,
        -h[1] * u + r[1] * w,
      ];
      const reach = far;
      if (
        this.groundQuad(g, cam, [
          q(B / 2, -half),
          q(reach, -half),
          q(reach, half),
          q(B / 2, half),
        ])
      )
        g.fill(tint.asphalt);
    }
    if (
      this.groundQuad(g, cam, [
        [-B / 2, -B / 2],
        [B / 2, -B / 2],
        [B / 2, B / 2],
        [-B / 2, B / 2],
      ])
    )
      g.fill(tint.asphalt);
    // A broad wet sheen under the far sky, brightest away from the camera.
    if (
      this.groundQuad(g, cam, [
        [-half, B / 2],
        [half, B / 2],
        [half, far],
        [-half, far],
      ])
    )
      g.fill({ color: tint.wetSheen, alpha: 0.22 });
    // Centre lines, stop lines, crosswalks.
    for (const a of APPROACHES) {
      const h = heading(a);
      const r = rightOf(h);
      const q = (u: number, w: number): [number, number] => [
        -h[0] * u + r[0] * w,
        -h[1] * u + r[1] * w,
      ];
      for (let u = B / 2 + 6; u < far; u += 6)
        if (
          this.groundQuad(g, cam, [
            q(u, -0.08),
            q(u + 2.5, -0.08),
            q(u + 2.5, 0.08),
            q(u, 0.08),
          ])
        )
          g.fill({ color: tint.paint, alpha: 0.5 });
      // Stop line across the inbound lane, 0.5 m wide.
      if (
        this.groundQuad(g, cam, [
          q(B / 2 + 0.2, 0.1),
          q(B / 2 + 0.7, 0.1),
          q(B / 2 + 0.7, half),
          q(B / 2 + 0.2, half),
        ])
      )
        g.fill({ color: tint.paint, alpha: 0.8 });
      // Crosswalk: bars across the whole road, just outside the box.
      for (let w = -half + 0.3; w < half - 0.3; w += 1.0) {
        const wear = Math.abs(Math.abs(w) - LANE) < 0.9 ? 0.35 : 0.85;
        if (
          this.groundQuad(g, cam, [
            q(B / 2 + 1.0, w),
            q(B / 2 + 3.4, w),
            q(B / 2 + 3.4, w + 0.55),
            q(B / 2 + 1.0, w + 0.55),
          ])
        )
          g.fill({ color: tint.paint, alpha: wear });
      }
    }
  }

  /** Per-frame drawing. Task 8 fills this in. */
  draw(
    _S: TrafficState,
    _cam: Camera,
    _dt: number,
    _tint: Tint,
    _rain: number
  ): void {
    void _S;
    void _cam;
    void _dt;
    void _tint;
    void _rain;
  }
}
```

`draw` is a stub on purpose: Task 8 replaces it. This task's deliverable is a corner with a road and a skyline in the lab.

- [ ] **Step 3: Write the animation shell and index**

```ts
// packages/flateralus-pixi-animations/src/four-way-stop/fourWayStopAnimation.ts
import type * as PIXI from 'pixi.js';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { MANIFEST, TINTS, type FourWayStopControlValues } from './manifest';
import { B, type Approach } from './geometry';
import { makeCamera, groundHit, type Camera } from './camera';
import {
  DEFAULT_PARAMS,
  STEP,
  MAX_STEPS_PER_FRAME,
  createTraffic,
  setCop,
  step,
  type TrafficParams,
  type TrafficState,
} from './traffic';
import { Scene } from './scene';

/**
 * Steps run before the first frame, so the corner opens with queues that
 * have already formed and a standoff in progress rather than an empty
 * street filling up. Forty seconds of traffic, spread over a few frames.
 */
const PREROLL_STEPS = 2400;
const PREROLL_PER_FRAME = 600;

/** The cop's hand, from the pointer. */
type Hover = { kind: 'box' } | { kind: 'approach'; a: Approach } | null;

export class FourWayStopAnimation extends PixiAnimation<typeof MANIFEST> {
  private S: TrafficState = createTraffic(Date.now() & 0xffff);
  private scene: Scene | null = null;
  private cam: Camera | null = null;
  private acc = 0;
  private preroll = 0;
  private w = 0;
  private h = 0;
  private hover: Hover = null;
  /** The approach being waved, until the pointer leaves it. */
  private waving: Approach | null = null;

  constructor(initialControls?: Partial<FourWayStopControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.S = createTraffic(Date.now() & 0xffff);
    this.acc = 0;
    this.preroll = PREROLL_STEPS;
    this.hover = null;
    this.waving = null;
    this.scene = new Scene(this.getRoot());
    this.w = 0;
    this.h = 0;
  }

  private paramsFrom(c: FourWayStopControlValues): TrafficParams {
    return {
      ...DEFAULT_PARAMS,
      demand: Number(c.demand),
      tau: Number(c.patience),
      headwayScale: Number(c.headway),
      busEvery: c.bus ? DEFAULT_PARAMS.busEvery : 0,
      bikeShare: c.bikes ? DEFAULT_PARAMS.bikeShare : 0,
    };
  }

  /** Which part of the corner a frame point is over. */
  private regionAt(u: number, v: number): Hover {
    if (!this.cam) return null;
    const g = groundHit(this.cam, u, v);
    if (!g) return null;
    if (Math.abs(g.x) < B / 2 && Math.abs(g.y) < B / 2) return { kind: 'box' };
    if (Math.abs(g.y) > Math.abs(g.x))
      return { kind: 'approach', a: g.y > 0 ? 0 : 2 };
    return { kind: 'approach', a: g.x > 0 ? 1 : 3 };
  }

  onUpdate(
    app: PIXI.Application,
    controls: FourWayStopControlValues,
    deltaTime: number
  ): void {
    const dt = Math.min(0.05, deltaTime);
    const sw = app.screen.width;
    const sh = app.screen.height;
    const tint = TINTS[Math.round(Number(controls.tint))] || TINTS[0];
    if (!this.scene) return;
    if (this.w !== sw || this.h !== sh || this.scene.needsStatic(tint)) {
      this.w = sw;
      this.h = sh;
      this.cam = makeCamera(sw / Math.max(1, sh));
      this.scene.resize(sw, sh, this.cam, tint);
    }
    const p = this.paramsFrom(controls);
    const interactive = Number(controls.mode) > 0.5;

    // ---- the cop
    const pointer = this.pointer;
    const mouse = pointer?.mouse;
    const present = interactive && !!mouse?.active;
    this.hover = present ? this.regionAt(mouse!.x / sw, mouse!.y / sh) : null;
    if (
      this.waving !== null &&
      !(this.hover?.kind === 'approach' && this.hover.a === this.waving)
    )
      this.waving = null;
    if (pointer) {
      while (pointer.clicks.length) {
        const k = pointer.clicks.shift()!;
        if (!interactive) continue;
        const r = this.regionAt(k.x / sw, k.y / sh);
        if (!r) continue;
        if (r.kind === 'box') setCop(this.S, { clearing: true });
        else this.waving = r.a;
      }
    }
    const held: [boolean, boolean, boolean, boolean] = [
      false,
      false,
      false,
      false,
    ];
    if (this.hover?.kind === 'approach' && this.waving === null)
      held[this.hover.a] = true;
    setCop(this.S, { present, held, waved: this.waving });

    // ---- fixed-step traffic
    let pre = PREROLL_PER_FRAME;
    while (this.preroll > 0 && pre-- > 0) {
      this.preroll--;
      step(this.S, p);
    }
    this.acc = Math.min(this.acc + dt, MAX_STEPS_PER_FRAME * STEP);
    while (this.acc >= STEP) {
      this.acc -= STEP;
      step(this.S, p);
    }

    this.scene.draw(this.S, this.cam!, dt, tint, Number(controls.rain));
  }

  onDestroy(): void {
    this.scene = null;
    super.onDestroy();
  }
}

export function createFourWayStopAnimation(
  initialControls?: Partial<FourWayStopControlValues>
): FourWayStopAnimation {
  return new FourWayStopAnimation(initialControls);
}
```

```ts
// packages/flateralus-pixi-animations/src/four-way-stop/index.ts
export {
  FourWayStopAnimation,
  createFourWayStopAnimation,
} from './fourWayStopAnimation';
export type { FourWayStopControlValues } from './manifest';
```

Add to `packages/flateralus-pixi-animations/src/index.ts`, after the `foil-statement` line:

```ts
export * from './four-way-stop';
```

- [ ] **Step 4: Register in the lab**

In `apps/bracketbear-website/src/components/lab/registry.ts`, add `createFourWayStopAnimation,` to the import list (alphabetical, after `createFoilStatementAnimation`), and insert this entry immediately before the `id: 'erosion-table'` entry:

```ts
  {
    id: 'four-way-stop',
    section: 'toys',
    name: 'Four-Way Stop',
    tag: 'traffic sim',
    blurb:
      'A Pittsburgh corner at night in the rain, no light, a cop in the middle. Two streams of cars want the same crossing. Every car follows the Intelligent Driver Model, so braking waves run backward up a queue and jams appear from nothing, and drivers at the line take gaps by a critical gap that shrinks the longer they wait: a driver who has waited long enough forces one, and the crossing car brakes, and that runs back up the other queue. Wet asphalt is a mirror, so every light is reflected by mirroring its geometry through the road. Hover an approach to hold it, click to wave it through, click the box to clear it. Leave, and the four-way-stop rule runs the corner on its own.',
    create: (initialControls) =>
      createFourWayStopAnimation(
        initialControls as never
      ) as unknown as PixiAnimation<AnimationManifest>,
  },
```

In `apps/bracketbear-website/src/components/lab/registry.test.ts`, add `'four-way-stop',` to the allowlist after `'sandbox',`.

- [ ] **Step 5: Type-check, test, build, and look**

Run:

```bash
npm run type-check --workspace=@bracketbear/flateralus-pixi-animations
npx vitest run apps/bracketbear-website/src/components/lab/registry.test.ts packages/flateralus-pixi-animations/src/four-way-stop
npm run build --workspace=@bracketbear/flateralus-pixi-animations
```

Expected: no type errors; registry test and all four-way-stop tests pass; build completes. Then, with the dev server on 4321 running (`npm run dev` from the repo root if it is not), run the probe from Task 9 Step 1 with `shot-7` as the output name and open `shot-7-1.png`: a dark road in perspective with a skyline, lamps on the corners, crosswalks and stop lines, no vehicles yet, and no console errors in the probe's log.

- [ ] **Step 6: Commit**

```bash
git add packages/flateralus-pixi-animations/src/four-way-stop packages/flateralus-pixi-animations/src/index.ts apps/bracketbear-website/src/components/lab/registry.ts apps/bracketbear-website/src/components/lab/registry.test.ts
git commit -m "feat(four-way-stop): the corner, the road and the cop's controls, on the shelf"
```

---

### Task 8: Vehicles, lights, reflections, the cop, rain, history

**Files:**

- Modify: `packages/flateralus-pixi-animations/src/four-way-stop/scene.ts`

**Interfaces:**

- Consumes: `TrafficState`, `poseOf`, `KINDS`, `Camera`, `project`, `projectMirror`, `Tint`.
- Produces: the full `draw`.

- [ ] **Step 1: Replace the `draw` stub and add the drawing methods**

Add these imports at the top of `scene.ts`:

```ts
import { projectMirror, cameraPos } from './camera';
import { KINDS, poseOf, type Vehicle } from './traffic';
```

Add these fields to the class:

```ts
  /** Wheel tracks in the wet film, refilled by rain. */
  private tracks: { x1: number; y1: number; x2: number; y2: number; age: number }[] = [];
  /** Skid marks, kept for the session. */
  private skids: { x: number; y: number; hx: number; hy: number }[] = [];
  private lastPose = new Map<number, { x: number; y: number }>();
  private time = 0;
  private static readonly BODY = [0x2c3140, 0x4a2f2a, 0x1f3a4a, 0x3a3a3a, 0x5a4a30, 0x2a4a3a, 0x50505a, 0x3a2a4a];
```

Replace the `draw` stub:

```ts
  /**
   * Every frame. Order matters for the painter: tracks on the road, then
   * the mirrored lights, then the light cones on the ground, then the
   * vehicles far to near, then the lamps themselves (they sit above the
   * bodies), then the cop, then the rain.
   */
  draw(S: TrafficState, cam: Camera, dt: number, tint: Tint, rain: number): void {
    this.time += dt;
    this.recordHistory(S, dt, rain);
    this.drawHistory(cam);
    const sorted = [...S.vehicles].sort((a, b) => {
      const pa = poseOf(a);
      const pb = poseOf(b);
      const c = cameraPos(cam);
      return Math.hypot(pb.x - c[0], pb.y - c[1]) - Math.hypot(pa.x - c[0], pa.y - c[1]);
    });
    this.reflections.clear();
    this.cones.clear();
    this.vehicles.clear();
    this.lamps.clear();
    for (const v of sorted) this.drawVehicle(v, cam, tint, rain);
    this.drawCop(S, cam, tint);
    this.drawRain(rain, tint);
  }

  /**
   * Wheel tracks: two lines per vehicle per frame, at ±0.4 of its width,
   * that the rain refills over about a minute. Skids come from the core's
   * events and stay.
   */
  private recordHistory(S: TrafficState, dt: number, rain: number): void {
    for (const v of S.vehicles) {
      const q = poseOf(v);
      const last = this.lastPose.get(v.id);
      if (last && v.v > 0.5) {
        const k = KINDS[v.kind];
        const rx = q.hy * k.width * 0.4;
        const ry = -q.hx * k.width * 0.4;
        this.tracks.push({ x1: last.x + rx, y1: last.y + ry, x2: q.x + rx, y2: q.y + ry, age: 0 });
        this.tracks.push({ x1: last.x - rx, y1: last.y - ry, x2: q.x - rx, y2: q.y - ry, age: 0 });
      }
      this.lastPose.set(v.id, { x: q.x, y: q.y });
    }
    for (const id of [...this.lastPose.keys()]) if (!S.vehicles.some((v) => v.id === id)) this.lastPose.delete(id);
    const life = 25 + 50 * rain;
    for (const t of this.tracks) t.age += dt;
    this.tracks = this.tracks.filter((t) => t.age < life);
    if (this.tracks.length > 6000) this.tracks.splice(0, this.tracks.length - 6000);
    for (const e of S.events)
      if (e.type === 'skid') {
        this.skids.push({ x: e.x, y: e.y, hx: e.hx, hy: e.hy });
        if (this.skids.length > 160) this.skids.shift();
      }
  }

  private drawHistory(cam: Camera): void {
    const g = this.history;
    g.clear();
    for (const t of this.tracks) {
      const a = project(cam, t.x1, t.y1, 0);
      const b = project(cam, t.x2, t.y2, 0);
      if (!a || !b) continue;
      const [x1, y1] = this.px(a);
      const [x2, y2] = this.px(b);
      g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: 0x07080c, alpha: 0.3 * (1 - t.age / 75), width: Math.max(1, 14 / a.depth) });
    }
    for (const s of this.skids) {
      const a = project(cam, s.x - s.hx * 7, s.y - s.hy * 7, 0);
      const b = project(cam, s.x, s.y, 0);
      if (!a || !b) continue;
      const [x1, y1] = this.px(a);
      const [x2, y2] = this.px(b);
      g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: 0x050608, alpha: 0.55, width: Math.max(1.5, 22 / a.depth) });
    }
  }

  /**
   * A vehicle is a box with a cab, projected corner by corner. Side faces
   * are drawn only when they face the camera; the roof always. Headlights
   * are two additive discs at the front corners with a cone on the road
   * ahead; tail lights two red discs at the rear, brighter and larger
   * while braking, which the IDM decides. Every disc is drawn again
   * mirrored through the road, smeared downward: the reflection is the
   * light's own geometry, and nothing is painted under a car.
   */
  private drawVehicle(v: Vehicle, cam: Camera, tint: Tint, rain: number): void {
    const k = KINDS[v.kind];
    const q = poseOf(v);
    const rx = q.hy;
    const ry = -q.hx;
    const corner = (ds: number, dw: number, z: number) =>
      project(cam, q.x - q.hx * ds + rx * dw, q.y - q.hy * ds + ry * dw, z);
    const hw = k.width / 2;
    const roofH = k.height;
    const body = this.vehicles;
    const c0 = corner(0, -hw, 0);
    const c1 = corner(0, hw, 0);
    const c2 = corner(k.len, hw, 0);
    const c3 = corner(k.len, -hw, 0);
    const t0 = corner(0, -hw, roofH);
    const t1 = corner(0, hw, roofH);
    const t2 = corner(k.len, hw, roofH);
    const t3 = corner(k.len, -hw, roofH);
    if (!c0 || !c1 || !c2 || !c3 || !t0 || !t1 || !t2 || !t3) return;
    const base = Scene.BODY[v.color % Scene.BODY.length];
    const shade = (c: number, f: number) => {
      const r = Math.min(255, ((c >> 16) & 255) * f);
      const gg = Math.min(255, ((c >> 8) & 255) * f);
      const b = Math.min(255, (c & 255) * f);
      return (r << 16) | (gg << 8) | b;
    };
    const cp = cameraPos(cam);
    const faces: { pts: [number, number][]; n: [number, number]; mid: [number, number]; col: number }[] = [
      // front (glass), right side, rear, left side
      { pts: [this.px(c0), this.px(c1), this.px(t1), this.px(t0)], n: [q.hx, q.hy], mid: [q.x, q.y], col: shade(base, 0.55) },
      { pts: [this.px(c1), this.px(c2), this.px(t2), this.px(t1)], n: [rx, ry], mid: [q.x - q.hx * k.len * 0.5 + rx * hw, q.y - q.hy * k.len * 0.5 + ry * hw], col: shade(base, 0.8) },
      { pts: [this.px(c2), this.px(c3), this.px(t3), this.px(t2)], n: [-q.hx, -q.hy], mid: [q.x - q.hx * k.len, q.y - q.hy * k.len], col: shade(base, 0.7) },
      { pts: [this.px(c3), this.px(c0), this.px(t0), this.px(t3)], n: [-rx, -ry], mid: [q.x - q.hx * k.len * 0.5 - rx * hw, q.y - q.hy * k.len * 0.5 - ry * hw], col: shade(base, 0.8) },
    ];
    for (const f of faces) {
      const toCam = [cp[0] - f.mid[0], cp[1] - f.mid[1]];
      if (toCam[0] * f.n[0] + toCam[1] * f.n[1] <= 0) continue;
      body.moveTo(f.pts[0][0], f.pts[0][1]);
      for (const p of f.pts.slice(1)) body.lineTo(p[0], p[1]);
      body.closePath().fill(f.col);
    }
    const roof = [this.px(t0), this.px(t1), this.px(t2), this.px(t3)];
    body.moveTo(roof[0][0], roof[0][1]);
    for (const p of roof.slice(1)) body.lineTo(p[0], p[1]);
    body.closePath().fill(shade(base, 1.15 + 0.25 * rain));
    // Lights.
    const gain = tint.lightGain;
    const braking = v.accel < -0.6 || (v.v < 0.2 && v.phase === 'approach');
    const lamp = (ds: number, dw: number, z: number, color: number, r: number, alpha: number) => {
      const p = corner(ds, dw, z);
      if (!p) return;
      const [x, y] = this.px(p);
      const rad = Math.max(1.5, (r * 60) / p.depth);
      this.lamps.circle(x, y, rad).fill({ color, alpha: alpha * gain });
      this.lamps.circle(x, y, rad * 2.6).fill({ color, alpha: alpha * 0.18 * gain });
      const m = projectMirror(cam, q.x - q.hx * ds + rx * dw, q.y - q.hy * ds + ry * dw, z);
      if (!m) return;
      const [mx, my] = this.px(m);
      const smear = rad * (3 + 6 * rain);
      this.reflections.ellipse(mx, my + smear * 0.4, rad * 0.8, smear).fill({ color, alpha: alpha * (0.18 + 0.3 * rain) * gain });
    };
    const isBike = v.kind === 'bike';
    if (isBike) {
      lamp(0, 0, 0.9, tint.headlight, 0.6, 0.9);
      lamp(k.len, 0, 0.8, tint.tail, 0.5, braking ? 1 : 0.6);
    } else {
      lamp(0, -hw * 0.75, 0.65, tint.headlight, 1, 0.95);
      lamp(0, hw * 0.75, 0.65, tint.headlight, 1, 0.95);
      const tr = braking ? 1.35 : 0.9;
      const ta = braking ? 1 : 0.55;
      lamp(k.len, -hw * 0.75, 0.85, tint.tail, tr, ta);
      lamp(k.len, hw * 0.75, 0.85, tint.tail, tr, ta);
      // Headlight cone on the road: a quad from the front corners forward.
      const reach = 6 + v.v * 0.9;
      const a = corner(0, -hw, 0);
      const b = corner(0, hw, 0);
      const c = corner(-reach, hw + 2.2, 0);
      const d = corner(-reach, -hw - 2.2, 0);
      if (a && b && c && d) {
        const P = [a, b, c, d].map((p) => this.px(p));
        this.cones.moveTo(P[0][0], P[0][1]);
        for (const p of P.slice(1)) this.cones.lineTo(p[0], p[1]);
        this.cones.closePath().fill({ color: tint.headlight, alpha: (0.05 + 0.05 * rain) * gain });
      }
    }
  }

  /**
   * The cop: a silhouette with a lit vest and one arm that poses. Up toward
   * a held approach, sweeping for a wave, both out for a clear. Absent, the
   * cop stands on the corner.
   */
  private drawCop(S: TrafficState, cam: Camera, tint: Tint): void {
    const g = this.cop;
    g.clear();
    const c = S.cop;
    const at: [number, number] = c.present ? [0, 0] : [B / 2 + 1.8, -B / 2 - 1.8];
    const P = (dx: number, dy: number, z: number) => project(cam, at[0] + dx, at[1] + dy, z);
    const foot = P(0, 0, 0);
    const shoulder = P(0, 0, 1.45);
    const head = P(0, 0, 1.7);
    if (!foot || !shoulder || !head) return;
    const w = Math.max(2, 60 / foot.depth);
    const [fx, fy] = this.px(foot);
    const [sx, sy] = this.px(shoulder);
    const [hx, hy] = this.px(head);
    g.moveTo(fx, fy).lineTo(sx, sy).stroke({ color: 0x0a0b10, width: w * 1.6 });
    g.circle(hx, hy, w * 0.9).fill(0x0a0b10);
    // The vest, lit.
    const v1 = P(0, 0, 0.95);
    const v2 = P(0, 0, 1.35);
    if (v1 && v2) {
      const [ax, ay] = this.px(v1);
      const [bx, by] = this.px(v2);
      g.moveTo(ax, ay).lineTo(bx, by).stroke({ color: tint.lamp, width: w * 1.7, alpha: 0.9 });
    }
    // The arm.
    let dir: [number, number] | null = null;
    let lift = 0;
    let both = false;
    if (c.present) {
      if (c.clearing) both = true;
      else if (c.waved !== null) {
        const h = heading(c.waved);
        const sweep = Math.sin(this.time * 5);
        dir = [-h[0] * Math.cos(sweep) - h[1] * Math.sin(sweep), -h[1] * Math.cos(sweep) + h[0] * Math.sin(sweep)];
        lift = 0.2;
      } else {
        const a = c.held.findIndex((x) => x);
        if (a >= 0) {
          const h = heading(a as Approach);
          dir = [-h[0], -h[1]];
          lift = 0.6;
        }
      }
    }
    const arm = (d: [number, number], z: number) => {
      const tip = P(d[0] * 0.75, d[1] * 0.75, 1.4 + z);
      if (!tip) return;
      const [tx, ty] = this.px(tip);
      g.moveTo(sx, sy).lineTo(tx, ty).stroke({ color: 0x0a0b10, width: w * 0.9 });
    };
    if (both) {
      arm([1, 0], 0);
      arm([-1, 0], 0);
    } else if (dir) arm(dir, lift);
  }

  /** Streaks in the near field, redrawn each frame. */
  private drawRain(rain: number, tint: Tint): void {
    const g = this.rain;
    g.clear();
    if (rain <= 0) return;
    const n = Math.round(90 * rain);
    let s = (this.time * 1000) | 0;
    const r = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    for (let i = 0; i < n; i++) {
      const x = r() * this.w;
      const y = r() * this.h;
      const len = 8 + r() * 18;
      g.moveTo(x, y).lineTo(x + 1.5, y + len).stroke({ color: tint.headlight, alpha: 0.07 + 0.08 * r(), width: 1 });
    }
  }
```

- [ ] **Step 2: Type-check and build**

Run:

```bash
npm run type-check --workspace=@bracketbear/flateralus-pixi-animations
npm run build --workspace=@bracketbear/flateralus-pixi-animations
```

Expected: clean. If `heading` or `Approach` are reported unused in `scene.ts`, they are used in `drawCop`; if reported missing, add them to the `./geometry` import.

- [ ] **Step 3: Look at it**

Run the Task 9 probe with output name `shot-8`. Open `shot-8-1.png` (load), `shot-8-2.png` (after a hold and a wave) and `shot-8-3.png` (after a clear, thirty seconds on). Check against the spec's picture:

- Queues visible up the north road with headlight cones and reflections under them.
- Brake lights brighten in a queue as the wave passes.
- The cop's arm is up toward the held approach in shot 2.
- Wheel tracks darken the road where cars have gone.
- No console errors in the probe log.

Fix what is wrong in `scene.ts` before committing; the probe's `field` line does not apply here and prints nothing.

- [ ] **Step 4: Commit**

```bash
git add packages/flateralus-pixi-animations/src/four-way-stop/scene.ts
git commit -m "feat(four-way-stop): cars, their lights in the wet road, the cop and the rain"
```

---

### Task 9: Verification, tuning, and the record

**Files:**

- Create (scratchpad, not committed): `probe.mjs`
- Modify: `packages/flateralus-pixi-animations/src/four-way-stop/traffic.ts` (constants only, if the measure demands)
- Modify: `docs/lab/TOY-IDEAS.md`

- [ ] **Step 1: The headless probe**

Write this to the session scratchpad directory (see the system prompt; never to the repo) as `probe.mjs`, and run it with `node probe.mjs <name>` while the dev server is up. It uses the playwright install in `~/Projects/federato-front-end`, as the sandbox probe did.

```js
import { createRequire } from 'node:module';
const require = createRequire(
  '/Users/harrisoncallahan/Projects/federato-front-end/node_modules/'
);
const { chromium } = require('playwright');
const out = process.argv[2] || 'run';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({
  viewport: { width: 1600, height: 1400 },
  deviceScaleFactor: 1,
});
const logs = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning')
    logs.push(`${m.type()}: ${m.text().slice(0, 300)}`);
});
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
await page.goto('http://localhost:4321/lab?animation=four-way-stop');
await page.waitForTimeout(4000);
const perf = () =>
  page.evaluate(() => {
    const el = [...document.querySelectorAll('div,section')].find(
      (e) =>
        /FRAME P50/i.test(e.textContent || '') && e.textContent.length < 400
    );
    return el
      ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, 90)
      : 'none';
  });
console.log('perf@4s:', await perf());
await page.screenshot({ path: `${out}-1.png` });
const box = await page.evaluate(() => {
  const r = [...document.querySelectorAll('canvas')]
    .map((c) => c.getBoundingClientRect())
    .find((r) => r.width > 300);
  return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
});
console.log('stage:', JSON.stringify(box));
if (box) {
  const X = (u) => box.x + u * box.w;
  const Y = (v) => box.y + v * box.h;
  // Hold the north approach (upper middle of the frame) for 8 s.
  await page.mouse.move(X(0.45), Y(0.25));
  await page.waitForTimeout(8000);
  // Wave it through for 6 s.
  await page.mouse.click(X(0.45), Y(0.25));
  await page.waitForTimeout(6000);
  console.log('perf@wave:', await perf());
  await page.screenshot({ path: `${out}-2.png` });
  // Clear the box, then step off the stage for 30 s.
  await page.mouse.click(X(0.5), Y(0.62));
  await page.waitForTimeout(500);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(30000);
  console.log('perf@30s:', await perf());
  await page.screenshot({ path: `${out}-3.png` });
}
console.log('logs:', logs.slice(0, 20).join('\n') || 'none');
await browser.close();
```

The box's frame position (`X(0.5), Y(0.62)`) and the north approach's (`X(0.45), Y(0.25)`) are estimates from the camera in Task 6; read them off `shot-7-1.png` and adjust.

- [ ] **Step 2: Hold the frame rate**

Expected: `perf@*` lines report 60 fps with p95 under 20 ms at 1600x1400. If not, the cost is in `drawHistory` (thousands of stroked segments): cap `tracks` at 3000 and stroke every other one before touching anything else.

- [ ] **Step 3: Measure the named tension**

Add this test to `traffic.test.ts` if it is not already covered by "no approach starves" (it is: that test holds the twenty-second bound and the served count), and run the whole file once more:

Run: `npx vitest run packages/flateralus-pixi-animations/src/four-way-stop`
Expected: PASS, all files. If tuning in Task 8's look changed any constant in `traffic.ts`, the tests are the arbiter of whether the corner still negotiates.

- [ ] **Step 4: Cycle the tints and the ambient mode**

In the lab (or by extending the probe with clicks on the `Sodium`, `Dawn` and `Ambient` buttons, as the sandbox probe did with `page.getByRole('button', { name })`), confirm: every tint keeps the headlight cones and reflections legible against the asphalt; in ambient mode the cop stands on the corner and the four-way rule runs; a Pittsburgh left happens within a minute of watching the north-south pair.

- [ ] **Step 5: Record what it cost**

In `docs/lab/TOY-IDEAS.md`, change the Four-Way Stop status row to `**built** — shipped to the toys shelf` and add a short "What it cost" paragraph under its section: which of the spec's claims held, which constant moved and why, and anything found by arithmetic that the eye would have missed. Keep the sandbox's entry as the model for length.

- [ ] **Step 6: Format, lint, commit**

```bash
./node_modules/.bin/prettier --write packages/flateralus-pixi-animations/src/four-way-stop docs/lab/TOY-IDEAS.md
./node_modules/.bin/eslint packages/flateralus-pixi-animations/src/four-way-stop apps/bracketbear-website/src/components/lab/registry.ts --max-warnings 0
git add packages/flateralus-pixi-animations/src/four-way-stop docs/lab/TOY-IDEAS.md
git commit -m "feat(four-way-stop): tuned against the measure, and the record of what it cost"
```

---

## Self-review

**Spec coverage.** Geometry and 1-D lanes: Task 1. IDM, vehicle kinds, bus and cyclist parameters: Task 2. Gap acceptance, critical gap decay, forced gaps, four-way rule, left yields, box priority by entry order: Task 3. Pittsburgh left, the three cop gestures, ambient rule, gridlock and its two resolutions, the late bus: Task 4. Demand drift, skid events: Task 5. Camera and mirror: Task 6. Road, crosswalk wear, stop lines, skyline, lamps, controls, registry: Task 7. Vehicles, lights, reflections, cones, brake lights off the IDM, cop poses, rain, tracks refilled by rain, permanent skids: Task 8. Named-tension measure, tints checked running, record: Task 9. Not in any task: none.

**Placeholders.** The `draw` stub in Task 7 is replaced in full in Task 8. Probe coordinates are marked as estimates to read off a screenshot. No other deferred content.

**Type consistency.** `setCop`, `isGridlocked`, `demandAt`, `poseOf`, `boxS`, `frontOf`, `hasPriority`, `gapAccepted`, `criticalGap` are named identically in every task. `Scene.draw(S, cam, dt, tint, rain)` matches its call in the animation. `Tint` fields used in `scene.ts` (`sky`, `skyLow`, `asphalt`, `wetSheen`, `curb`, `paint`, `lamp`, `headlight`, `tail`, `window`, `lightGain`) are all declared in `manifest.ts`. `heading` and `Approach` are imported into `scene.ts` in Task 7's import line.
