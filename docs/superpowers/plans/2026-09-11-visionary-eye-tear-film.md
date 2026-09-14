# Visionary Eye Tear Film Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `visionary-eye` an integrated tear film whose break-up triggers its own blinks, and derive the corneal specular and iris caustics from that one field.

**Architecture:** A 128x128 Cahn-Hilliard field in corneal-local tangent coordinates, ping-ponged on the existing offscreen WebGL2 context via a new `simulate()` hook on `HarnessShaderAnimation`. Two sim passes per fixed 1/480s step, a splat pass for the lid, an 8x8 reduction whose 64-texel readback closes the loop back to the blink decision, and a display pass that derives specular and the Jacobian caustic from the same `h`.

**Tech Stack:** TypeScript, WebGL2 (RGBA32F preferred, RGBA16F fallback), PIXI v8, vitest.

**Spec:** `docs/superpowers/specs/2026-09-11-visionary-eye-tear-film-design.md`

## Global Constraints

- **The step pass contains no clock.** No `uTime` in the mu or step programs. Spec D4.
- **`M` is clamped to the derived stability limit in code**, not only in the manifest. Spec D3.
- **Every tuning constant is written in cells or cells-per-step**, with the conversion beside it. Spec D5.
- **Texture unit 0 belongs to the SDF mask.** The base class re-binds it before every display draw; sim passes may use any unit. Spec D13.
- **`caustics-pool` is not refactored.** Its divergence is deliberate and documented.
- **`portal-mark` behaviour must not change.** It imports `SHARED_EYE` for `visionary()` only.
- All new debug controls carry `debug: true` so they appear in the Lab and not in production chrome.
- **This is an npm-workspaces monorepo.** Tests: `npx vitest run <path>` for one file, `npm run test:run` from the root for everything (the root `vitest.config.ts` covers every workspace). Types: `npm run type-check --workspace=@bracketbear/flateralus-pixi-animations`. Lint: `npm run lint`. Lab: `npm run dev --workspace=@bracketbear/bracketbear-website`. There is no pnpm here.
- **`packages/flateralus-pixi-animations/src/chladni-plate/physics.test.ts` is already failing on this branch** - one dispersion assertion still expects the spec's 128-cell grid after `physics.ts:32` moved to 64. It is unrelated to this work, it comes from uncommitted changes that predate this plan, and **it is not yours to fix.** Expect a red line there in every full-suite run and judge your task only by the tests it owns.

## File Structure

| File                                                  | Responsibility                                                                                                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/visionary-eye/physics.ts` (new)                  | Pure numeric core: CH constants and the derived mobility limit, break-up reducer, blink state machine, world-to-local frame transform. No GL. |
| `src/visionary-eye/physics.test.ts` (new)             | vitest cover for all of the above.                                                                                                            |
| `src/visionary-eye/eye.ts` (new)                      | Display GLSL: `eyeW`, `energyH`, `irisUV`, caustics, film specular. Moved out of `shared/sdf-harness.ts`.                                     |
| `src/visionary-eye/film.ts` (new)                     | The four sim programs and the `FilmSim` class owning textures, FBOs, the fixed-step accumulator, priming and readback.                        |
| `src/visionary-eye/visionaryEyeAnimation.ts` (modify) | Manifest, gaze/pupil state (unchanged), plus film wiring and the blink decision.                                                              |
| `src/shared/harness-shader-animation.ts` (modify)     | Add the `simulate()` hook and the mask re-bind.                                                                                               |
| `src/shared/sdf-harness.ts` (modify)                  | `SHARED_EYE` keeps `visionary()` and `stars()`; `eyeW`/`energyH` leave.                                                                       |

Tasks 1-4 are pure and TDD'd. Tasks 5-6 are structural with no behaviour change. Tasks 7-9 build the simulation, each verifiable through a debug view that renders the field directly. Tasks 10-12 wire the display. Tasks 13-14 harden and finish.

---

### Task 1: Film constants and the mobility clamp

**Files:**

- Create: `packages/flateralus-pixi-animations/src/visionary-eye/physics.ts`
- Test: `packages/flateralus-pixi-animations/src/visionary-eye/physics.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `DOMAIN`, `GRID`, `DELTA`, `IFACE_CELLS`, `KAPPA`, `STEP`, `SAFETY`, `mobilityLimit(): number`, `MOBILITY`, `clampMobility(m: number): number`, `EVAP`, `GRAVITY`, `CORNEA_ANG`, `CORNEA_L`, `IRIS_DEPTH`, `efoldSeconds(): number`, `patchWavelength(): number`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/flateralus-pixi-animations/src/visionary-eye/physics.test.ts
import { describe, it, expect } from 'vitest';
import {
  CORNEA_L,
  DELTA,
  DOMAIN,
  GRID,
  IFACE_CELLS,
  KAPPA,
  MOBILITY,
  SAFETY,
  STEP,
  clampMobility,
  efoldSeconds,
  mobilityLimit,
  patchWavelength,
} from './physics';

describe('tear film constants', () => {
  it('derives the cell size from the domain and grid', () => {
    expect(DOMAIN).toBe(1.2);
    expect(GRID).toBe(128);
    expect(DELTA).toBeCloseTo(0.009375, 12);
  });

  it('sets kappa from the interface width in cells', () => {
    // Interface half-width is sqrt(2*kappa); we want it to be IFACE_CELLS cells.
    expect(Math.sqrt(2 * KAPPA)).toBeCloseTo(IFACE_CELLS * DELTA, 12);
  });

  it('keeps the mobility below the explicit biharmonic stability limit', () => {
    // Explicit Euler on -M*kappa*grad^4: the 5-point Laplacian has eigenvalues
    // in [-8/d^2, 0], so grad^4 reaches 64/d^4, and stability needs
    // dt*M*kappa*64/d^4 <= 2, i.e. M <= d^4 / (32*dt*kappa).
    const limit = Math.pow(DELTA, 4) / (32 * STEP * KAPPA);
    expect(mobilityLimit()).toBeCloseTo(limit, 15);
    expect(MOBILITY).toBeLessThan(limit);
    expect(MOBILITY).toBeCloseTo(SAFETY * limit, 15);
  });

  it('clamps mobility from above, below and from garbage', () => {
    expect(clampMobility(1)).toBeCloseTo(mobilityLimit(), 15);
    expect(clampMobility(MOBILITY)).toBeCloseTo(MOBILITY, 15);
    expect(clampMobility(-5)).toBeGreaterThan(0);
    expect(clampMobility(Number.NaN)).toBeCloseTo(MOBILITY, 15);
  });

  it('lands the derived timescale and patch size the spec argued for', () => {
    // e-fold = 32*dt*n^4/s at the spinodal; the spec's table says 1.78s.
    expect(efoldSeconds()).toBeCloseTo(1.778, 2);
    // patch wavelength = 2*pi*n*delta; 0.1178 tangent units = 1.22mm.
    expect(patchWavelength()).toBeCloseTo(0.1178, 4);
  });

  it('puts the cornea inside the domain with margin', () => {
    expect(CORNEA_L).toBeCloseTo(Math.sin(0.6), 12);
    expect(CORNEA_L).toBeLessThan(DOMAIN / 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/flateralus-pixi-animations/src/visionary-eye/physics.test.ts`
Expected: FAIL — `Failed to resolve import "./physics"`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/flateralus-pixi-animations/src/visionary-eye/physics.ts
/**
 * Pure numeric core of the tear film.
 *
 * Everything here is testable without a GL context, which is most of what can
 * be tested at all in this animation. The rest is verified by eye in the Lab —
 * see the spec's testing section.
 *
 * Units: the film lives in corneal-local tangent coordinates, where the eye's
 * surface normal projects to (lx, ly). One tangent unit is about 10.35mm —
 * the cornea's 5.85mm half-chord subtends sin(0.6 rad) = 0.565 units.
 */

/** Tangent-space domain: (lx, ly) in [-0.6, 0.6]. */
export const DOMAIN = 1.2;

/** Field resolution. Grid size buys patch count; it does NOT buy break-up speed. */
export const GRID = 128;

/** Tangent units per cell. */
export const DELTA = DOMAIN / GRID;

/** Millimetres per tangent unit: 5.85mm cornea half-chord at sin(0.6). */
export const MM_PER_UNIT = 5.85 / Math.sin(0.6);

/**
 * Interface half-width, in cells. This is the load-bearing number: the e-fold
 * time goes as n^4, so it is the only cheap lever on how fast the film tears.
 * Below ~1.5 the front is under-resolved and patches go square.
 */
export const IFACE_CELLS = 2;

/** Gradient-energy coefficient. Interface half-width sqrt(2*kappa) = n cells. */
export const KAPPA = Math.pow(IFACE_CELLS * DELTA, 2) / 2;

/** Fixed simulation step. Spec D3: derived with GRID and IFACE_CELLS, not chosen. */
export const STEP = 1 / 480;

/** Fraction of the stability limit the mobility is allowed to use. */
export const SAFETY = 0.6;

/**
 * Explicit-Euler stability limit for the biharmonic term -M*kappa*grad^4.
 *
 * The 5-point Laplacian has eigenvalues in [-8/d^2, 0], so grad^4 = (grad^2)^2
 * reaches 64/d^4. The amplification factor 1 - dt*M*kappa*lambda stays inside
 * [-1, 1] while dt*M*kappa*64/d^4 <= 2, giving M <= d^4 / (32*dt*kappa).
 *
 * Enforced here and not only in the manifest, so a randomize-all cannot
 * detonate the integrator.
 */
export function mobilityLimit(): number {
  return Math.pow(DELTA, 4) / (32 * STEP * KAPPA);
}

export const MOBILITY = SAFETY * mobilityLimit();

export function clampMobility(m: number): number {
  if (!Number.isFinite(m)) return MOBILITY;
  return Math.min(mobilityLimit(), Math.max(1e-6, m));
}

/**
 * e-fold time of the spinodal instability, in seconds.
 *
 * sigma_max = M/(4*kappa) at f'' = -1, and with M = s*M_limit this collapses
 * to 32*dt*n^4/s — independent of grid size. Refining the grid to make
 * break-up faster does nothing; only dt and the interface width move it.
 */
export function efoldSeconds(): number {
  return (32 * STEP * Math.pow(IFACE_CELLS, 4)) / SAFETY;
}

/** Fastest-growing wavelength, 2*pi*sqrt(2*kappa), in tangent units. */
export function patchWavelength(): number {
  return 2 * Math.PI * Math.sqrt(2 * KAPPA);
}

/** Evaporation, h per second. Time to reach the spinodal from a fresh film is 1/EVAP. */
export const EVAP = 0.5;

/** Downward drain, tangent units per second. 1.5 cells/s. */
export const GRAVITY = 1.5 * DELTA;

/** Corneal cap half-angle. The existing limbus sits at ang = 0.56. */
export const CORNEA_ANG = 0.6;

/** Tangent radius of the cap. */
export const CORNEA_L = Math.sin(CORNEA_ANG);

/** Iris plane depth behind the corneal apex: 3.6mm in tangent units. */
export const IRIS_DEPTH = 3.6 / MM_PER_UNIT;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/flateralus-pixi-animations/src/visionary-eye/physics.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/flateralus-pixi-animations/src/visionary-eye/physics.ts \
        packages/flateralus-pixi-animations/src/visionary-eye/physics.test.ts
git commit -m "feat(visionary-eye): derive the tear film constants and clamp mobility"
```

---

### Task 2: Break-up fraction reducer

The CPU half of the loop closure. Given the 8x8 tile minima read back from the GPU, how much of the cornea has torn?

**Files:**

- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/physics.ts`
- Test: `packages/flateralus-pixi-animations/src/visionary-eye/physics.test.ts`

**Interfaces:**

- Consumes: `DOMAIN`, `CORNEA_L` from Task 1.
- Produces: `REDUCE` (8), `DRY_H` (-0.3), `tileInsideCornea(i, j, size): boolean`, `breakupFraction(tileMin: Float32Array, size?: number): number`.

- [ ] **Step 1: Write the failing test**

```ts
// append to physics.test.ts — add REDUCE, DRY_H, breakupFraction,
// tileInsideCornea to the existing import block
describe('break-up fraction', () => {
  const size = REDUCE;
  const wet = () => new Float32Array(size * size).fill(1);

  it('counts only tiles whose centre lies on the cornea', () => {
    // Corner tiles sit outside the cap and must never be counted.
    expect(tileInsideCornea(0, 0, size)).toBe(false);
    expect(tileInsideCornea(size - 1, size - 1, size)).toBe(false);
    // Centre tiles are always on it.
    expect(tileInsideCornea(size / 2, size / 2, size)).toBe(true);
  });

  it('is zero for a fully wet film', () => {
    expect(breakupFraction(wet())).toBe(0);
  });

  it('is one when every corneal tile has torn', () => {
    const t = new Float32Array(size * size).fill(-1);
    expect(breakupFraction(t)).toBe(1);
  });

  it('ignores dry tiles that fall outside the cornea', () => {
    const t = wet();
    t[0] = -1; // a corner, off the cap
    expect(breakupFraction(t)).toBe(0);
  });

  it('uses the dry threshold, not the sign of h', () => {
    const t = wet();
    const c = (size / 2) * size + size / 2;
    t[c] = DRY_H + 0.01; // thinning, not yet torn
    expect(breakupFraction(t)).toBe(0);
    t[c] = DRY_H - 0.01;
    expect(breakupFraction(t)).toBeGreaterThan(0);
  });

  it('returns zero rather than NaN for a degenerate grid', () => {
    expect(breakupFraction(new Float32Array(0), 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/flateralus-pixi-animations/src/visionary-eye/physics.test.ts`
Expected: FAIL — `REDUCE is not exported`.

- [ ] **Step 3: Write minimal implementation**

```ts
// append to physics.ts

/** Reduction target edge. 64 texels is one small readback instead of 128KB. */
export const REDUCE = 8;

/** h at or below this counts as torn. The wells sit at +1 and -1. */
export const DRY_H = -0.3;

/** Tangent-space centre of reduction tile (i, j). */
function tileCentre(i: number, j: number, size: number): [number, number] {
  const s = DOMAIN / size;
  return [-DOMAIN / 2 + (i + 0.5) * s, -DOMAIN / 2 + (j + 0.5) * s];
}

export function tileInsideCornea(i: number, j: number, size: number): boolean {
  const [x, y] = tileCentre(i, j, size);
  return Math.hypot(x, y) <= CORNEA_L;
}

/**
 * Fraction of the cornea that has torn, from the per-tile minima of h.
 *
 * Minima and not means: a tile is torn as soon as any part of it is, which is
 * what makes the measurement responsive to a patch opening rather than to the
 * whole film sagging.
 */
export function breakupFraction(
  tileMin: Float32Array,
  size: number = REDUCE
): number {
  let on = 0;
  let dry = 0;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      if (!tileInsideCornea(i, j, size)) continue;
      on++;
      if (tileMin[j * size + i] <= DRY_H) dry++;
    }
  }
  return on === 0 ? 0 : dry / on;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/flateralus-pixi-animations/src/visionary-eye/physics.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/flateralus-pixi-animations/src/visionary-eye/physics.ts \
        packages/flateralus-pixi-animations/src/visionary-eye/physics.test.ts
git commit -m "feat(visionary-eye): measure corneal break-up from tile minima"
```

---

### Task 3: Blink state machine

The behaviour half of the loop closure. It reads the measured fraction and nothing else — no interval, no floor, no ceiling.

**Files:**

- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/physics.ts`
- Test: `packages/flateralus-pixi-animations/src/visionary-eye/physics.test.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: `BLINK_FRACTION`, `REFRACTORY`, `CLOSE_TIME`, `OPEN_TIME`, `type LidPhase`, `interface BlinkState`, `newBlinkState(): BlinkState`, `stepBlink(s, dt, fraction): BlinkState`, `lidCoverage(s): number`, `isWiping(s): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
// append to physics.test.ts — add the blink exports to the import block
describe('blink state machine', () => {
  const run = (s: BlinkState, seconds: number, fraction: number) => {
    let cur = s;
    const dt = 1 / 60;
    for (let i = 0; i < Math.round(seconds / dt); i++) {
      cur = stepBlink(cur, dt, fraction);
    }
    return cur;
  };

  it('starts open and stays open while the film holds', () => {
    const s = run(newBlinkState(), 30, 0);
    expect(s.phase).toBe('open');
    expect(lidCoverage(s)).toBe(0);
  });

  it('closes once the measured fraction crosses the threshold', () => {
    const s = stepBlink(newBlinkState(), 1 / 60, BLINK_FRACTION + 0.01);
    expect(s.phase).toBe('closing');
  });

  it('does not close one tick below the threshold', () => {
    const s = stepBlink(newBlinkState(), 1 / 60, BLINK_FRACTION - 0.01);
    expect(s.phase).toBe('open');
  });

  it('reaches full coverage at the end of the closing phase', () => {
    let s = stepBlink(newBlinkState(), 1 / 60, 1);
    s = run(s, CLOSE_TIME, 1);
    expect(lidCoverage(s)).toBeCloseTo(1, 1);
  });

  it('re-opens and returns to rest', () => {
    let s = stepBlink(newBlinkState(), 1 / 60, 1);
    s = run(s, CLOSE_TIME + OPEN_TIME + 0.05, 0);
    expect(s.phase).toBe('open');
    expect(lidCoverage(s)).toBe(0);
  });

  // NOTE: this walk is 0.29s at dt=1/60 = 17 steps, and the opening phase ends
  // at 11/60 = 0.18333 against OPEN_TIME = 0.18 — true by 3ms. If this ever
  // goes red, widen the margin here; do NOT move OPEN_TIME to suit it.
  it('refuses to re-blink inside the refractory window', () => {
    // Hold the fraction pinned high the whole time: a chattering measurement
    // must not produce a chattering lid.
    let s = stepBlink(newBlinkState(), 1 / 60, 1);
    s = run(s, CLOSE_TIME + OPEN_TIME + 0.01, 1);
    expect(s.phase).toBe('open');
    const before = s.since;
    s = run(s, REFRACTORY * 0.5, 1);
    expect(s.phase).toBe('open');
    expect(s.since).toBeGreaterThan(before);
    s = run(s, REFRACTORY, 1);
    expect(s.phase).toBe('closing');
  });

  it('wipes only while the lid is travelling', () => {
    expect(isWiping(newBlinkState())).toBe(false);
    const s = stepBlink(newBlinkState(), 1 / 60, 1);
    expect(isWiping(s)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/flateralus-pixi-animations/src/visionary-eye/physics.test.ts`
Expected: FAIL — `newBlinkState is not exported`.

- [ ] **Step 3: Write minimal implementation**

```ts
// append to physics.ts

/** Corneal break-up share that triggers a blink. */
export const BLINK_FRACTION = 0.35;

/** Minimum seconds between blinks, so a measurement at the threshold cannot chatter. */
export const REFRACTORY = 1.5;

/** Lid travel. Real blinks close faster than they open. */
export const CLOSE_TIME = 0.1;
export const OPEN_TIME = 0.18;

export type LidPhase = 'open' | 'closing' | 'opening';

export interface BlinkState {
  phase: LidPhase;
  /** Seconds elapsed inside the current phase. */
  t: number;
  /** Seconds since the last blink began. */
  since: number;
}

export function newBlinkState(): BlinkState {
  return { phase: 'open', t: 0, since: REFRACTORY };
}

/**
 * Advance the lid.
 *
 * The only input is the measured break-up fraction. There is deliberately no
 * interval here: if the cadence comes out wrong, the lever is EVAP. A clamped
 * interval would be a timer wearing the simulation's clothes.
 */
export function stepBlink(
  s: BlinkState,
  dt: number,
  fraction: number
): BlinkState {
  const t = s.t + dt;
  const since = s.since + dt;
  switch (s.phase) {
    case 'open':
      if (fraction > BLINK_FRACTION && since >= REFRACTORY) {
        return { phase: 'closing', t: 0, since: 0 };
      }
      return { phase: 'open', t, since };
    case 'closing':
      return t >= CLOSE_TIME
        ? { phase: 'opening', t: 0, since }
        : { phase: 'closing', t, since };
    case 'opening':
      return t >= OPEN_TIME
        ? { phase: 'open', t: 0, since }
        : { phase: 'opening', t, since };
  }
}

/** 0 fully open, 1 fully closed. Smoothstepped so the lid eases at both ends. */
export function lidCoverage(s: BlinkState): number {
  const u =
    s.phase === 'closing'
      ? Math.min(1, s.t / CLOSE_TIME)
      : s.phase === 'opening'
        ? 1 - Math.min(1, s.t / OPEN_TIME)
        : 0;
  return u * u * (3 - 2 * u);
}

/** Is the lid travelling, and therefore laying film? */
export function isWiping(s: BlinkState): boolean {
  return s.phase !== 'open';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/flateralus-pixi-animations/src/visionary-eye/physics.test.ts`
Expected: PASS, 19 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/flateralus-pixi-animations/src/visionary-eye/physics.ts \
        packages/flateralus-pixi-animations/src/visionary-eye/physics.test.ts
git commit -m "feat(visionary-eye): blink when the measured film has torn"
```

---

### Task 4: World-to-local frame transform

Gravity and the lid sweep are world-space; the field is gaze-local. This must match the shader's frame construction exactly or the film will drain sideways.

**Files:**

- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/physics.ts`
- Test: `packages/flateralus-pixi-animations/src/visionary-eye/physics.test.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: `gazeFrame(gx, gy): { tx: [number,number,number]; ty: [number,number,number]; gd: [number,number,number] }`, `worldToLocal(wx, wy, gx, gy): [number, number]`.

- [ ] **Step 1: Write the failing test**

```ts
// append to physics.test.ts — add gazeFrame, worldToLocal to the import block
describe('gaze frame', () => {
  it('is the identity when the eye looks straight out', () => {
    const { tx, ty, gd } = gazeFrame(0, 0);
    expect(gd).toEqual([0, 0, 1]);
    expect(tx[0]).toBeCloseTo(1, 12);
    expect(tx[1]).toBeCloseTo(0, 12);
    expect(ty[0]).toBeCloseTo(0, 12);
    expect(ty[1]).toBeCloseTo(1, 12);
    expect(worldToLocal(0, 1, 0, 0)[1]).toBeCloseTo(1, 12);
    expect(worldToLocal(1, 0, 0, 0)[0]).toBeCloseTo(1, 12);
  });

  it('keeps the basis orthonormal at an off-axis gaze', () => {
    const { tx, ty, gd } = gazeFrame(0.5, -0.3);
    const dot = (a: number[], b: number[]) =>
      a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    expect(dot(tx, tx)).toBeCloseTo(1, 12);
    expect(dot(ty, ty)).toBeCloseTo(1, 12);
    expect(dot(gd, gd)).toBeCloseTo(1, 12);
    expect(dot(tx, ty)).toBeCloseTo(0, 12);
    expect(dot(tx, gd)).toBeCloseTo(0, 12);
    expect(dot(ty, gd)).toBeCloseTo(0, 12);
  });

  it('never lengthens a world vector', () => {
    // A projection onto a tangent plane can only shorten.
    const [lx, ly] = worldToLocal(0, 1, 0.6, 0.4);
    expect(Math.hypot(lx, ly)).toBeLessThanOrEqual(1 + 1e-12);
  });

  it('foreshortens gravity as the eye looks up', () => {
    // tx = cross([0,1,0], gd) has y-component a2*b0 - a0*b2 = 0 identically, so
    // tx[1] is always 0 and a world-down vector can never pick up a local-x
    // component. Under this basis gravity foreshortens; it never shears.
    const [lx, ly] = worldToLocal(0, 1, 0, 0.8);
    expect(lx).toBeCloseTo(0, 12);
    expect(ly).toBeCloseTo(0.8418, 3);
    expect(ly).toBeLessThan(1);
  });

  it('foreshortens a sideways vector as the eye looks aside', () => {
    const [lx] = worldToLocal(1, 0, 0.8, 0);
    expect(lx).toBeCloseTo(0.8423, 3);
    expect(lx).toBeLessThan(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/flateralus-pixi-animations/src/visionary-eye/physics.test.ts`
Expected: FAIL — `gazeFrame is not exported`.

- [ ] **Step 3: Write minimal implementation**

```ts
// append to physics.ts

type V3 = [number, number, number];

function norm3(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function cross3(a: V3, b: V3): V3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/**
 * The corneal-local basis, constructed exactly as the display shader does at
 * sdf-harness.ts:280-281. If these two drift apart the film drains sideways,
 * so the shader's version is the specification and this mirrors it.
 */
export function gazeFrame(gx: number, gy: number): { tx: V3; ty: V3; gd: V3 } {
  const gd = norm3([gx * 0.8, gy * 0.8, 1]);
  const tx = norm3(cross3([0, 1, 0], gd));
  const ty = cross3(gd, tx);
  return { tx, ty, gd };
}

/** Project a world-plane direction onto the corneal tangent basis. */
export function worldToLocal(
  wx: number,
  wy: number,
  gx: number,
  gy: number
): [number, number] {
  const { tx, ty } = gazeFrame(gx, gy);
  return [wx * tx[0] + wy * tx[1], wx * ty[0] + wy * ty[1]];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/flateralus-pixi-animations/src/visionary-eye/physics.test.ts`
Expected: PASS, 24 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/flateralus-pixi-animations/src/visionary-eye/physics.ts \
        packages/flateralus-pixi-animations/src/visionary-eye/physics.test.ts
git commit -m "feat(visionary-eye): mirror the shader's corneal basis on the CPU"
```

---

### Task 5: The `simulate()` hook on the shared harness

Structural, no behaviour change. Every existing effect on this harness must render identically afterwards.

**Files:**

- Modify: `packages/flateralus-pixi-animations/src/shared/harness-shader-animation.ts`

**Interfaces:**

- Consumes: `ShaderContext` from `shared/shader-harness.ts`.
- Produces: `protected simulate(gl: WebGL2RenderingContext, ctx: ShaderContext, controls: TControlValues, dt: number): void` — default no-op, called once per frame before the display program is bound.

- [ ] **Step 1: Add the hook, its contract, and the mask re-bind**

In `harness-shader-animation.ts`, add beside the existing `setUniforms` declaration:

```ts
  /**
   * Run simulation passes before the display program is bound.
   *
   * Called after the canvas has been sized and before the base binds the
   * display program and viewport, so the base's own `gl.viewport` and
   * `gl.useProgram` restore the state an implementation leaves behind — there
   * is no save/restore dance to get wrong.
   *
   * Texture units are free. `createShaderContext` binds the mask to unit 0
   * once at creation and never re-binds, so the base re-binds it below rather
   * than asking every implementation to remember that unit 0 is spoken for.
   */
  protected simulate(
    _gl: WebGL2RenderingContext,
    _ctx: ShaderContext,
    _controls: TControlValues,
    _dt: number
  ): void {}
```

Then in `onUpdate`, immediately after the resize block and before `const { gl, locs } = ctx;`:

```ts
this.simulate(ctx.gl, ctx, controls, dt);
```

And immediately before `gl.drawArrays(gl.TRIANGLES, 0, 3);`:

```ts
// Unit 0 is the mask, bound once at context creation. A simulate() pass
// may have left something else there.
if (ctx.texture) {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ctx.texture);
}
```

- [ ] **Step 2: Verify types and the existing suite**

Run: `npm run type-check --workspace=@bracketbear/flateralus-pixi-animations && npm run test:run`
Expected: clean type-check, all existing tests pass.

- [ ] **Step 3: Verify no visual regression**

Run the Lab and confirm `portal-mark` and `sdf-forge` render exactly as before. They do not override `simulate`, so the only change in their path is the redundant mask re-bind.

Run: `npm run dev --workspace=@bracketbear/bracketbear-website`, open the Animation Lab, load both entries.
Expected: unchanged. If either changes, the re-bind is in the wrong place — it must be after `setUniforms`, which may itself bind textures to higher units.

- [ ] **Step 4: Commit**

```bash
git add packages/flateralus-pixi-animations/src/shared/harness-shader-animation.ts
git commit -m "feat(shared): let harness effects run simulation passes before the display draw"
```

---

### Task 6: Move the globe out of `SHARED_EYE`

Pure code movement. `portal-mark` uses `SHARED_EYE` for `visionary()` only, so `eyeW` and `energyH` can leave without touching it.

**Files:**

- Create: `packages/flateralus-pixi-animations/src/visionary-eye/eye.ts`
- Modify: `packages/flateralus-pixi-animations/src/shared/sdf-harness.ts:186-329`
- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/visionaryEyeAnimation.ts:1-12,71-81`

**Interfaces:**

- Consumes: `SHARED_EYE` from `shared/sdf-harness.ts` (still exports the uniforms, `stars`, `visionary`).
- Produces: `EYE_GLOBE` — a GLSL string holding `energyH` and `eyeW`, to be concatenated after `SHARED_EYE`.

- [ ] **Step 1: Create `eye.ts` with the moved GLSL**

Cut `energyH` and `eyeW` verbatim from `SHARED_EYE` (currently `sdf-harness.ts:256-328`) into:

```ts
// packages/flateralus-pixi-animations/src/visionary-eye/eye.ts
/**
 * The raytraced globe. Lives here rather than in the SDF harness because
 * visionary-eye is its only consumer — portal-mark imports SHARED_EYE for
 * visionary() alone, at portalMarkAnimation.ts:464.
 *
 * Concatenate after SHARED_EYE, which still supplies the uniforms, stars()
 * and visionary().
 */
export const EYE_GLOBE = `
      float energyH(float lx, float ly, float ang, float t) {
        /* ...moved verbatim... */
      }
      vec3 eyeW(vec2 q, float t) {
        /* ...moved verbatim... */
      }
  `;
```

Do not reformat the GLSL while moving it. A diff is the only practical way to check a move of this size, and the harness file says so at `sdf-harness.ts:5-10`.

- [ ] **Step 2: Trim `SHARED_EYE` and re-wire the consumer**

Delete the two moved functions from `SHARED_EYE`. In `visionaryEyeAnimation.ts`, import `EYE_GLOBE` and change the `FRAG` concatenation:

```ts
const FRAG = SDF_PRE + SHARED_EYE + EYE_GLOBE + `
      uniform float uSpeed;
      uniform float uScale;
      ...
```

- [ ] **Step 3: Verify nothing moved on screen**

Run: `npm run type-check --workspace=@bracketbear/flateralus-pixi-animations && npm run test:run`
Then load the Lab and compare `visionary-eye` and `portal-mark` against `main`.
Expected: byte-identical rendering. This task changes no behaviour; if anything looks different, the move was not verbatim.

- [ ] **Step 4: Commit**

```bash
git add packages/flateralus-pixi-animations/src/visionary-eye/eye.ts \
        packages/flateralus-pixi-animations/src/shared/sdf-harness.ts \
        packages/flateralus-pixi-animations/src/visionary-eye/visionaryEyeAnimation.ts
git commit -m "refactor(visionary-eye): move the globe shader out of the SDF harness"
```

---

### Task 7: The film field — resources, two-pass step, priming

The first task with a visible result. It ships with a debug view that renders `h` directly, which is how every remaining simulation task is verified.

**Files:**

- Create: `packages/flateralus-pixi-animations/src/visionary-eye/film.ts`
- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/visionaryEyeAnimation.ts`
- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/eye.ts`

**Interfaces:**

- Consumes: `GRID`, `STEP`, `KAPPA`, `MOBILITY`, `EVAP`, `GRAVITY`, `DELTA`, `DOMAIN` from `physics.ts`.
- Consumes: `worldToLocal` from Task 4 — gravity reaches `advance()` as `worldToLocal(0, 1, this.gaze[0], this.gaze[1])`, never as a world vector.
- Consumes: the `simulate()` hook from Task 5 — `VisionaryEyeAnimation` overrides it, and every sim pass runs from there rather than from `setUniforms`.
- Produces (display shader, added to `extraUniforms` in `visionaryEyeAnimation.ts` and declared at the top of `EYE_GLOBE`): `uniform sampler2D uFilm`, `uniform float uFilmN` (= `GRID`), `uniform float uDelta`, `uniform float uShowFilm`, `uniform float uFilmOK`. Tasks 10-12 add `uFilmSlope`, `uCaustic`, `uIrisDepth`, `uViewLocal`, `uQuiet` the same way. The film texture binds to **unit 3** — unit 0 is the mask, per Global Constraints.
- Produces: `class FilmSim` with `static create(gl): FilmSim | null`, `advance(dt: number, gravityLocal: [number, number]): void`, `prime(seed: number): void`, `bindField(unit: number): void`, `readonly ok: boolean`, `destroy(): void`.

- [ ] **Step 1: Write the sim programs**

```ts
// packages/flateralus-pixi-animations/src/visionary-eye/film.ts
const FILM_PRE = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform sampler2D uH;
    uniform float uTexel;   // 1.0 / GRID
    uniform float uDelta;   // tangent units per cell
  `;

/** mu = h^3 - h - kappa*lap(h). No clock: spec D4. */
const MU_FRAG =
  FILM_PRE +
  `
    uniform float uKappa;
    void main() {
      float e = uTexel;
      float h = texture(uH, vUV).x;
      float l = texture(uH, vUV + vec2(-e, 0.0)).x;
      float r = texture(uH, vUV + vec2( e, 0.0)).x;
      float b = texture(uH, vUV + vec2(0.0, -e)).x;
      float t = texture(uH, vUV + vec2(0.0,  e)).x;
      float lap = (l + r + b + t - 4.0 * h) / (uDelta * uDelta);
      fragColor = vec4(h, h * h * h - h - uKappa * lap, 0.0, 1.0);
    }`;

/** h' = min(h + dt*(M*lap(mu) - E - v.grad(h)), 1). */
const STEP_FRAG =
  FILM_PRE +
  `
    uniform float uM;
    uniform float uDt;
    uniform float uEvap;
    uniform vec2 uGravity;   // tangent units per second, already in local frame
    void main() {
      float e = uTexel;
      vec2 c = texture(uH, vUV).xy;
      float ml = texture(uH, vUV + vec2(-e, 0.0)).y;
      float mr = texture(uH, vUV + vec2( e, 0.0)).y;
      float mb = texture(uH, vUV + vec2(0.0, -e)).y;
      float mt = texture(uH, vUV + vec2(0.0,  e)).y;
      float lapMu = (ml + mr + mb + mt - 4.0 * c.y) / (uDelta * uDelta);
      float hl = texture(uH, vUV + vec2(-e, 0.0)).x;
      float hr = texture(uH, vUV + vec2( e, 0.0)).x;
      float hb = texture(uH, vUV + vec2(0.0, -e)).x;
      float ht = texture(uH, vUV + vec2(0.0,  e)).x;
      vec2 g = vec2(hr - hl, ht - hb) / (2.0 * uDelta);
      float nh = c.x + uDt * (uM * lapMu - uEvap - dot(uGravity, g));
      fragColor = vec4(min(nh, 1.0), c.y, 0.0, 1.0);
    }`;
```

`uDelta` divides the stencils so every constant is in tangent units per second rather than per cell, which is the conversion Global Constraints requires be visible.

- [ ] **Step 2: Write `FilmSim`**

Follow `caustics-pool`'s resource shape (`causticsPoolAnimation.ts:1176-1238`): two RGBA32F textures with `LINEAR` filtering and `CLAMP_TO_EDGE`, two FBOs, an index. Request `EXT_color_buffer_float` and return `null` once if absent — the caller must stop retrying. Prefer `RGBA32F`; fall back to `RGBA16F` if the float target is incomplete, per the spec's precision risk.

`advance` holds the fixed-step accumulator:

```ts
  advance(dt: number, gravityLocal: [number, number]): void {
    this.acc = Math.min(this.acc + dt, 12 * STEP); // cap: 12 steps, never a spiral
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.pass(this.muProg, this.muL, gravityLocal);
      this.pass(this.stepProg, this.stepL, gravityLocal);
    }
  }
```

`prime(seed)` stamps a fresh film with seeded noise and runs `4 / STEP` steps, so the eye loads mid-cycle rather than as a mirror. Spec D11.

- [ ] **Step 3: Add the debug view**

Add a `debug: true` boolean control `showFilm` to the manifest. In `eye.ts`, before the existing body of `eyeW`, add:

```glsl
        if (uShowFilm > 0.5 && r < R) {
          float nz = sqrt(max(R * R - r * r, 0.0));
          vec3 n = vec3(q, nz) / R;
          vec3 tx = normalize(cross(vec3(0.0, 1.0, 0.0), gd));
          vec3 ty = cross(gd, tx);
          vec2 l = vec2(dot(n, tx), dot(n, ty));
          float h = texture(uFilm, l / 1.2 + 0.5).x;
          return vec3(0.5 + 0.5 * h);
        }
```

This is the verification instrument for Tasks 7, 8 and 9. It stays in the shipped shader behind a debug control.

- [ ] **Step 4: Verify the field integrates and tears**

Run the Lab, load `visionary-eye`, enable **Show Film**.
Expected, in order: a near-white disc (fresh film, `h = 1`) that greys as evaporation walks it toward the spinodal, then breaks into roughly **ten** dark patches across the cornea within about **7 seconds** of load. Patches should have visible bright rims — that is `M*lap(mu)` moving fluid out of a draining patch, and it is the sign the conservative term is wired correctly.

If patches appear as squares, the interface is under-resolved: raise `IFACE_CELLS`, and note that the e-fold goes as `n^4`.
If the field goes uniformly grey and never tears, `mu` is not reaching the step pass — check that pass A's output is what pass B samples.
If it explodes to NaN within a second, `MOBILITY` is above the limit; `clampMobility` should have prevented it, so that is a bug in the wiring, not a tuning problem.

- [ ] **Step 5: Commit**

```bash
git add packages/flateralus-pixi-animations/src/visionary-eye/
git commit -m "feat(visionary-eye): integrate the tear film"
```

---

### Task 8: The lid lays film

**Files:**

- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/film.ts`
- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/visionaryEyeAnimation.ts`

**Interfaces:**

- Consumes: `FilmSim` from Task 7; `BlinkState`, `stepBlink`, `lidCoverage`, `isWiping`, `newBlinkState`, `worldToLocal` from Tasks 3-4.
- Produces: `FilmSim.wipe(edgeLocal: [number, number], normalLocal: [number, number], seed: number): void`.

- [ ] **Step 1: Write the splat program**

```glsl
    uniform vec2 uEdge;     // a point on the lid line, local frame
    uniform vec2 uNormal;   // unit normal, points at the covered side
    uniform float uSeed;
    void main() {
      vec2 l = (vUV - 0.5) * 1.2;
      float d = dot(l - uEdge, uNormal);
      // Behind the edge is freshly wetted; the front is soft over ~3 cells.
      float w = smoothstep(-3.0 * uDelta, 3.0 * uDelta, -d);
      // The lid lays an imperfect sheet. This is the ONLY seed of the
      // instability, and it is why the step pass needs no clock at all.
      float n = vnoise(l * 34.0 + uSeed) - 0.5;
      fragColor = vec4(w * (2.0 + 0.25 * n), 0.0, 0.0, 1.0);
    }
```

Include the `vnoise`/`hash21` pair from `SDF_PRE` in `FILM_PRE` so the splat can use it.

- [ ] **Step 2: Bind it correctly**

```ts
gl.enable(gl.BLEND);
gl.blendFunc(gl.ONE, gl.ONE);
gl.colorMask(true, false, false, false); // .y holds mu; do not touch it
gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb[this.hi]); // live, not the back buffer
// ... draw ...
gl.colorMask(true, true, true, true);
gl.disable(gl.BLEND);
```

Additive blending cannot saturate toward a target, so the splat adds `+2.0` and the step pass's `min(nh, 1.0)` does the clamping. That clamp is already in place from Task 7.

- [ ] **Step 3: Drive it from the blink state, on a temporary timer**

Wire `stepBlink` into `setUniforms` with a **placeholder fraction that rises linearly with time since the last blink**, so the lid can be verified before the readback exists. Call `wipe()` every frame while `isWiping(state)`, interpolating the edge across the frame's travel so a fast closure lays a continuous sheet rather than a dotted one. Rotate the lid's world-space normal `(0, -1)` into the local frame with `worldToLocal`.

This placeholder is deleted in Task 9. Mark it:

```ts
// TEMPORARY: replaced by the measured break-up fraction in Task 9.
const fraction = Math.min(1, this.sinceBlink / 7);
```

- [ ] **Step 4: Bell's phenomenon**

The globe rolls up behind a closing lid. Two lines in the existing gaze integrator, added
where `this.gaze` is written in `setUniforms`:

```ts
// Bell's phenomenon: the eye rolls up behind a closing lid.
const bell = lidCoverage(this.blink) * 0.35;
gl.uniform2f(locs.uGaze!, this.gaze[0], this.gaze[1] - bell);
```

Nobody will be able to say why this looks right, which is the point.

- [ ] **Step 5: Verify the wipe**

Run the Lab with **Show Film** on.
Expected: every ~7s a bright band sweeps across the disc and leaves it uniformly white, then the tearing cycle restarts from a _different_ patch layout each time — that difference is the seed doing its job. A repeating pattern means the seed is not reaching the splat.

Sweep the gaze with the cursor during a blink: the band must stay horizontal **on screen**, not on the field. If it tilts with the gaze, the normal is being passed already-local or not rotated at all.

- [ ] **Step 6: Commit**

```bash
git add packages/flateralus-pixi-animations/src/visionary-eye/
git commit -m "feat(visionary-eye): the lid lays a fresh, imperfect film"
```

---

### Task 9: Close the loop

**Files:**

- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/film.ts`
- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/visionaryEyeAnimation.ts`

**Interfaces:**

- Consumes: `FilmSim` from Tasks 7-8; `breakupFraction`, `REDUCE` from Task 2.
- Produces: `FilmSim.measure(): number | null` — the break-up fraction, or `null` if the driver refused the readback.

- [ ] **Step 1: Write the reduction pass**

An 8x8 target; each texel takes the minimum of `h` over its 16x16 tile.

```glsl
    uniform float uTile;   // GRID / REDUCE, as a float
    void main() {
      vec2 base = floor(vUV * float(REDUCE)) * uTile;
      float m = 1.0;
      for (int j = 0; j < 16; j++)
        for (int i = 0; i < 16; i++)
          m = min(m, texelFetch(uH, ivec2(base) + ivec2(i, j), 0).x);
      fragColor = vec4(m, 0.0, 0.0, 1.0);
    }
```

- [ ] **Step 2: Probe the readback format once and cache it**

Copy the pattern from `causticsPoolAnimation.ts:1239-1287`. The format is a property of the attachment and varies by driver:

```ts
const t = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);
const f = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT);
this.readMode =
  f === gl.RGBA && t === gl.FLOAT
    ? 'float'
    : f === gl.RGBA && t === gl.HALF_FLOAT
      ? 'half'
      : 'none';
```

`h2f()` in `causticsPoolAnimation.ts:837` converts half-float. On `'none'`, `measure()` returns `null` and the caller keeps the Task 8 timer as a fallback — the scene still runs, it just stops being the good version. Re-probe after a resize.

- [ ] **Step 3: Replace the placeholder**

Delete the `// TEMPORARY` block from Task 8 and feed `stepBlink` the measured value:

```ts
const measured = this.film.measure();
const fraction = measured ?? this.fallbackFraction(dt);
this.blink = stepBlink(this.blink, dt, fraction);
```

- [ ] **Step 4: Measure the readback stall**

64 texels is small, but `readPixels` is still a GPU sync point. Wrap `measure()` in
`performance.now()` and log the cost over 300 frames.

Expected: well under a millisecond. If it costs more than the frame has headroom for, measure
every third frame and hold the last value between — the blink decision has no need of 60Hz
resolution, and at 480 steps/s the field moves by 8 steps per frame anyway:

```ts
if (++this.probeT >= 3) {
  this.probeT = 0;
  this.lastFraction = this.film.measure();
}
```

Do not delete the readback to save the stall. It is the loop closure; without it the animation is
a decorated eye with extra passes.

- [ ] **Step 5: Verify the loop closes, and that it is a loop**

Add a temporary `console.log` of the fraction and the interblink interval.

Expected: interblink lands in **6-9 seconds** at rest, and — this is the actual test — **it is not constant**. A perfectly regular interval means the fraction is not reaching the decision and something is still timing it.

Then confirm the causality directly: raise **Dryness** (`EVAP`) in the Lab and the eye must blink _sooner_, with no other change. That is the loop. If cadence is wrong, move `EVAP` and only `EVAP`, and per the skill's warning on tuning, do not attach an explanation to a constant you did not isolate.

- [ ] **Step 6: Commit**

```bash
git add packages/flateralus-pixi-animations/src/visionary-eye/
git commit -m "feat(visionary-eye): blink because the film tore, not because time passed"
```

---

### Task 10: The film drives the specular

**Files:**

- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/eye.ts:317-320` (the moved `eyeW`)

**Interfaces:**

- Consumes: `uFilm` sampler bound by Task 7.
- Produces: `filmNormal(vec2 l, vec3 n, vec3 tx, vec3 ty)` in GLSL.

- [ ] **Step 1: Sample the field smoothly**

A 128 field across ~600 screen pixels is ~5px per cell, and bilinear gives piecewise-linear normals that facet visibly in a specular. Smooth the fractional coordinate before the fetch:

```glsl
      vec2 filmUV(vec2 l) {
        vec2 p = (l / 1.2 + 0.5) * uFilmN - 0.5;
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return (i + f + 0.5) / uFilmN;
      }
```

- [ ] **Step 2: Replace the painted specular**

`eyeW` currently has, at the moved equivalent of `sdf-harness.ts:317-320`:

```glsl
          float dif = clamp(dot(nb, ld), 0.0, 1.0);
          eye *= 0.55 + 0.6 * dif;
          eye += uCream * pow(dif, 48.0) * 0.9;
```

Replace the highlight term with a reflection off the film-perturbed normal, gated on wetness:

```glsl
          float hC = texture(uFilm, filmUV(vec2(lx, ly))).x;
          vec2 gH = vec2(
            texture(uFilm, filmUV(vec2(lx + uDelta, ly))).x - hC,
            texture(uFilm, filmUV(vec2(lx, ly + uDelta))).x - hC) / uDelta;
          vec3 nf = normalize(nb - (tx * gH.x + ty * gH.y) * uFilmSlope);
          float wet = smoothstep(-0.3, 0.4, hC);
          float dsp = clamp(dot(nf, ld), 0.0, 1.0);
          eye += uCream * pow(dsp, 48.0) * 0.9 * wet;
          eye += uCream * pow(dsp, 7.0) * 0.07 * (1.0 - irisM) * wet;
```

Keep the diffuse term on `nb` so the energy relief is unchanged; only the highlight moves onto the film.

- [ ] **Step 3: Verify**

Run the Lab with **Show Film** off.
Expected: the catchlight now **smears when the eye saccades**, **breaks into shards as the film tears**, and **re-forms whole on a blink**. Dry patches read as dull holes in the sheen on the white — subtractive, which is the only thing that reads on a near-white sclera.

If the highlight jitters cell-to-cell, `filmUV` smoothing is not applied to the gradient taps.

- [ ] **Step 4: Commit**

```bash
git add packages/flateralus-pixi-animations/src/visionary-eye/eye.ts
git commit -m "feat(visionary-eye): the catchlight is a reflection off the film"
```

---

### Task 11: Corneal caustics from the Jacobian

The measured quantity.

**Files:**

- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/eye.ts`

**Interfaces:**

- Consumes: `filmUV`, `nf` from Task 10; `IRIS_DEPTH` from Task 1, passed as `uIrisDepth`.
- Produces: `irisUV(vec2 l, vec3 nf)` and the `focus` term applied to the iris colour.

- [ ] **Step 1: Build the refraction map and take its Jacobian**

```glsl
      vec2 irisUV(vec2 l, vec3 nf) {
        vec3 rr = refract(uViewLocal, nf, 1.0 / 1.376);
        return l + rr.xy * (uIrisDepth / max(0.2, -rr.z));
      }
      // ...
      float e = uDelta;
      vec2 f0 = irisUV(vec2(lx, ly), nf);
      vec2 fx = irisUV(vec2(lx + e, ly), nf);
      vec2 fy = irisUV(vec2(lx, ly + e), nf);
      vec2 dxv = (fx - f0) / e, dyv = (fy - f0) / e;
      float J = abs(dxv.x * dyv.y - dxv.y * dyv.x);
      float focus = clamp(1.0 / max(J, 0.06) - 0.72, 0.0, 4.0);
```

Sample the iris through `f0` rather than the current straight lookup, so the iris is seen through the cornea — which also gives the real magnification and a limbus that reads as thick glass rather than a drawn ring.

```glsl
          vec3 ir = visionary(f0 * 0.62, t);
          ir += mix(ELEC, uCream, 0.25) * focus * uCaustic * irisM;
```

- [ ] **Step 2: Verify, and tune the right lever**

Run the Lab.
Expected: bright filigree on the iris that **moves ahead of the patches**, not with them, and that **rearranges on every blink**. It should sharpen as the film goes unstable and wash out immediately after a wipe.

If it reads weak, **raise `IFACE_CELLS`, do not raise `uCaustic` or the slope**. Curvature goes as `k^2`, so halving the patch wavelength quadruples the bending for the same amplitude. The response is steep — the skill records 11 cells landing, 7 boiling and 21 vanishing on a comparable grid — so move it one notch at a time and remember `IFACE_CELLS` also moves the e-fold as `n^4`, which will change the blink cadence. Re-check cadence after any change here.

- [ ] **Step 3: Commit**

```bash
git add packages/flateralus-pixi-animations/src/visionary-eye/eye.ts
git commit -m "feat(visionary-eye): caustics from the Jacobian of the corneal refraction"
```

---

### Task 12: The wetness channel, and headroom for the sclera

The dry patches currently read as **dents pressed into the globe**, not as dry spots. The cause is
physical, not cosmetic: `DRY_DIM` makes dry patches _darker_, and darker on a sphere reads as
shading, which reads as geometry.

**Wetting a surface darkens it.** A tear film traps light by internal reflection, so wet cornea is
darker and glossier and a dry patch is _lighter and matte_. We have the sign backwards.

**Files:**

- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/eye.ts`
- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/physics.ts`
- Test: `packages/flateralus-pixi-animations/src/visionary-eye/physics.test.ts`

**Interfaces:**

- Consumes: `wet` and the `FILM_REACH` gating from Task 10.
- Produces: `WET_DARKEN` replacing `DRY_DIM`; `surfaceDim()` re-derived so `wet = 0` is the
  identity rather than `wet = 1`.

- [ ] **Step 1: Invert the assignment**

```glsl
      // Wetting darkens: the film traps light by internal reflection, so the
      // wet cornea is darker and glossier and a dry patch is lighter and matte.
      // The previous form darkened the DRY side, which reads as a dent.
      eye *= (0.55 + 0.6 * dif) * (1.0 - WET_DARKEN * wet);
```

The variation is the same magnitude; only which state is darkened changes. The fallback identity
moves with it: `wet = 0` must now yield exactly 1.0, so the `uFilmOK = 0` path stays bit-identical.
**That property is pinned by an existing test — update it, do not delete it.**

- [ ] **Step 2: Take the gloss with it**

A dry patch is matte. Beyond the diffuse sign, the specular terms must fall to zero across a dry
patch — they are already gated on `wet`, so confirm the combination reads as _matte_, not merely
_dim_, and report the measured contrast between a wet and a dry pixel in each channel.

- [ ] **Step 3: Confirm the headroom this buys**

Darkening the wet majority lowers the sclera's base. Measure and report the resulting headroom
across the sclera — at the specular peak, mid-sclera, and grazing. Task 13's aurora is additive
light on this surface and cannot exist without it. Clipping is local to the highlight (diffuse is
1.110 at `dif = 1` but 0.820 at `dif = 0.5`), so report the map, not a single number.

- [ ] **Step 4: Verification**

Type-check, tests, and tell me what to look for. I will confirm in the Lab that the patches read as
matte rather than as relief.

- [ ] **Step 5: Commit**

```bash
git add packages/flateralus-pixi-animations/src/visionary-eye/
git commit -m "fix(visionary-eye): wetting darkens, so a dry patch is matte and not a dent"
```

---

### Task 13: The aurora — energy streaming off the limbus

Replace the painted capillaries on the whites with a **simulated excitation field** that streams
outward from the limbus toward the silhouette and wisps like an aurora. Driven by the tear film:
where the film tears, energy leaks out over the white.

This is a second field, and it must be simulated rather than painted. A curl-noise flow or a
scrolling texture is exactly what this piece exists not to do.

**Files:**

- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/film.ts` (the field and its passes)
- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/eye.ts` (display; remove vessels)
- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/physics.ts` (constants, derivations)
- Test: `packages/flateralus-pixi-animations/src/visionary-eye/physics.test.ts`

**Interfaces:**

- Consumes: the film field and its break-up measurement; `FilmSim`'s existing ping-pong plumbing.
- Produces: an excitation field bound to its own texture unit (NOT 0, which is the SDF mask, and
  NOT 3, which is the film).

- [ ] **Step 1: The field and its domain**

Excitation `E` over the sclera in `(azimuth, angle)`, from the limbus (`ang ~= 0.56`) to the
silhouette (`ang -> pi/2`). **Azimuth wraps** — use `REPEAT` on that axis and `CLAMP_TO_EDGE` on
the other. Resolution is yours to derive: azimuth carries the curtain structure and needs more
cells than angle. Justify it from the curtain width you intend, the way `GRID` is justified.

- [ ] **Step 2: The dynamics**

```
E' = E + dt * ( -v * dE/d(ang)        // advection outward, toward the silhouette
                + D * lap(E)          // diffusion, anisotropic: more along the flow
                - decay * E
                + S(azimuth) )        // seeding at the inner edge only
```

Curtains and wisps must emerge from advection, sparse discrete sources and decay — not from noise
added to make it look wispy. If you need folding, derive it from a shear the field itself produces
(self-advection in azimuth), not from a painted swirl. Fixed timestep, capped accumulator, and
**no `uTime` in the step pass** — the same rule the film lives by.

- [ ] **Step 3: The causal seed**

`S(azimuth)` comes from the film's break-up in the matching angular sector: where the film is
tearing near the limbus, energy is released. The eye glows where it is drying, and a blink calms
it. Derive the sector mapping from the existing corneal-local frame so the aurora rides the globe
with the gaze, exactly as the film does.

**The rhythm this produces is the risk, and it is worth measuring before it is worth tuning.**
Report the excitation's time course against the blink cycle: quiet after a wipe, building as
break-up spreads, brightest just before a blink. If it reads as flicking on and off rather than
breathing, say so with the numbers rather than adding a floor.

- [ ] **Step 4: Colour from the field, not from a gradient**

Map emission colour to the field's own state — energy near the limbus, older and cooler outward —
so the layering is a consequence rather than a painted ramp. `ELEC` near the source through `VMAG`
outward keeps the existing palette. Real aurora layers by emission energy; this is the same idea.

- [ ] **Step 5: Remove the painted vessels**

Delete the capillary terms from the sclera. The whites become a clean ground for the aurora.
`visionary()` and `stars()` are shared with `portal-mark` and **must not change** — confirm the
vessels live in `eyeW` and not in the shared code before touching anything.

- [ ] **Step 6: Verification**

The aurora is additive light on the sclera and depends on Task 12's headroom. Report the measured
brightness against the available headroom at three points on the sclera. Assert what you can
headlessly — advection speed in cells per step, decay time, the azimuthal wrap, conservation under
zero seeding and zero decay.

- [ ] **Step 7: Commit**

```bash
git add packages/flateralus-pixi-animations/src/visionary-eye/
git commit -m "feat(visionary-eye): the white streams energy where the film tears"
```

---

### Task 14: Quiet the iris

Additive light is legible only against headroom. Spec D9.

**Files:**

- Modify: `packages/flateralus-pixi-animations/src/shared/sdf-harness.ts:223-255` (`visionary()`)

**Note:** `visionary()` is shared with `portal-mark` world 11. Gate the change behind a `uQuiet` uniform defaulting to 0, so portal-mark — which does not set it — is unchanged. `visionary-eye` sets it to 1.

- [ ] **Step 1: Remove the terms that pay rent to hide a period**

Behind `uQuiet`:

- `sdf-harness.ts:227` — delete `breath`. It is inert once the film drives brightness, and it is the exact term the skill names as the signal to stop. Its use at `:228` and `:254` goes with it.
- `:238-239` — delete the scrolling ring. `fract(r*5.5 - t*0.16)` is a literal loop.
- `:240-243` — delete the three-sine lattice `l1*l2*l3`.
- `:236` — halve the filament contribution: `* 0.85` becomes `* 0.42`.

- [ ] **Step 2: Verify both consumers**

Run the Lab.
Expected on `visionary-eye`: the caustics from Task 11 are now the brightest thing on the iris, and the iris reads as a dim structured substrate under moving light.
Expected on `portal-mark` world 11: **completely unchanged**. If it moved, `uQuiet` is not defaulting to 0.

If the caustics still lose, go further on the filaments — do not push `uCaustic`.

- [ ] **Step 3: Commit**

```bash
git add packages/flateralus-pixi-animations/src/shared/sdf-harness.ts
git commit -m "feat(visionary-eye): quiet the painted iris so the measured light reads"
```

---

### Task 15: Degradation, reduced motion, teardown

**Files:**

- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/film.ts`
- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/visionaryEyeAnimation.ts`

- [ ] **Step 1: Reduced motion**

The effect already pins `uTime` to 7.0 when `prefers-reduced-motion` is set. Extend it: **do not
step the field, hold the lid open, never blink.** A full-screen eye blinking is precisely what
that setting exists to prevent. Prime once so it still shows structure rather than a mirror.

```ts
if (this.reducedMotion) {
  gl.uniform1f(locs.uTime!, 7.0);
  if (!this.primed) {
    this.film?.prime(1);
    this.primed = true;
  }
} else {
  this.film?.advance(dt, worldToLocal(0, 1, this.gaze[0], this.gaze[1]));
}
```

- [ ] **Step 2: No float targets**

If `FilmSim.create` returns `null`, set a flag, never retry, and keep the pre-film specular path
(`pow(dif, 48.0)`) alive behind `uFilmOK`. Bail once, as `PingPong` already does.

```ts
if (!this.film && !this.filmFailed) {
  this.film = FilmSim.create(gl);
  if (!this.film)
    this.filmFailed = true; // stop retrying every frame
  else this.film.prime((Math.random() * 1e4) | 0);
}
gl.uniform1f(locs.uFilmOK!, this.film ? 1 : 0);
```

In `eye.ts`, the Task 10 highlight becomes the film path only when `uFilmOK > 0.5`; otherwise the
original `pow(dif, 48.0) * 0.9` runs unchanged.

- [ ] **Step 3: Teardown**

In `onDestroy`, delete both textures, both FBOs and all four programs. The context belongs to `HarnessShaderAnimation`, which already calls `destroyShaderContext`, so `FilmSim.destroy()` must **not** call `loseContext()` — that is the harness's job and doing it twice kills a context the sprite still references.

- [ ] **Step 4: Verify**

Run: `npm run test:run && npm run type-check --workspace=@bracketbear/flateralus-pixi-animations`
Then in the Lab: toggle the OS reduced-motion setting and confirm a still, structured eye with no blinking; switch animations back and forth ten times and confirm no context-loss warnings in the console.

- [ ] **Step 5: Commit**

```bash
git add packages/flateralus-pixi-animations/src/visionary-eye/
git commit -m "feat(visionary-eye): degrade cleanly without float targets or motion"
```

---

### Task 16: Controls, copy, and the Lab pass

**Files:**

- Modify: `packages/flateralus-pixi-animations/src/visionary-eye/visionaryEyeAnimation.ts` (manifest + description)
- Modify: `apps/bracketbear-website/src/components/lab/registry.ts:100-111` (blurb)

- [ ] **Step 1: Finalise the manifest**

Keep `eyeScale`, `speed`, `dilate`, `bump`, `grain`. Add, all `debug: true`:

| Control     | Range                  | Drives                                                           |
| ----------- | ---------------------- | ---------------------------------------------------------------- |
| `dryness`   | 0.1-1.5, default 0.5   | `EVAP`. The only lever on blink cadence.                         |
| `caustic`   | 0-2, default 1         | `uCaustic`. Presentation only — never the fix for weak caustics. |
| `filmSlope` | 0-2, default 1         | `uFilmSlope` for the specular.                                   |
| `showFilm`  | boolean, default false | The debug view from Task 7. Keep it; it is the instrument.       |

- [ ] **Step 2: Rewrite the description and the registry blurb**

The current copy at `visionaryEyeAnimation.ts:17` advertises "energy filaments carve real relief" — which was true of a painted height field and is now the least interesting thing in the piece. Both strings should say what it actually does: the film, and that the blink is caused rather than scheduled.

- [ ] **Step 3: The Lab pass**

Check every palette with the effect running. A palette that kills the computed light is worse than one that never had it — the sclera has no headroom by construction, so confirm the caustics survive on the iris in each.

Then settle the open question from the spec's Look section: **opaque lid sweep versus film-only wipe.** Try the film-only wipe first. The eye is an orb in a starfield with no lids, and an opaque occluder may fight that badly. Record which won and why in the spec's Look section.

- [ ] **Step 4: Full verification**

```bash
# The root vitest config covers every workspace, registry.test.ts included - and that is
# the test proving the reworked entry still resolves and constructs.
npm run test:run
npm run type-check --workspace=@bracketbear/flateralus-pixi-animations
npm run lint
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add packages/flateralus-pixi-animations/src/visionary-eye/ \
        apps/bracketbear-website/src/components/lab/registry.ts \
        docs/superpowers/specs/2026-09-11-visionary-eye-tear-film-design.md
git commit -m "feat(visionary-eye): finish the tear film rework"
```

---

## Done when

- The step pass contains no `uTime`, and deleting the clock from the animation leaves the film evolving.
- Interblink interval is emergent, lands 6-9s at rest, and varies.
- Raising **Dryness** makes the eye blink sooner with no other change.
- The catchlight smears on a saccade and shatters as the film tears.
- Caustics on the iris move ahead of the patches and rearrange after each blink.
- `portal-mark` is pixel-identical to `main`.
