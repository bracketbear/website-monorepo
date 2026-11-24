# Chladni Plate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Chladni plate to the Animation Lab's `toys` shelf — a driven simply-supported plate whose sand migrates onto the nodal lines, with a swappable boundary (square / circle / the mark) that visibly rewrites the figure.

**Architecture:** Five WebGL2 programs over a fixed 128×128 plate field and a 256×256 grain field, both ping-ponged in float textures. The plate integrates the fourth-order Kirchhoff equation as two passes per substep (Laplacian, then step). Grains read the plate's amplitude envelope and are thrown where peak acceleration beats a threshold; they render into a density buffer the integrator samples back, closing the loop. No GPU→CPU sync except one 1×1 texel every ten frames for the ambient search.

**Tech Stack:** TypeScript, WebGL2 (raw, no library), PIXI v8 for the blit, `@bracketbear/flateralus` manifests, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-11-chladni-plate-design.md` — read it before Task 1. This plan argues from it and does not restate its reasoning.

## Global Constraints

- Simulation step is `1/1200` s; plate grid is a fixed `128×128`, square and canvas-independent. Never derive it from canvas aspect.
- `β` (stiffness) is clamped at `0.05` **in code**, below the `1/16` stability limit. A manifest bound alone is not sufficient.
- The accumulator is capped at 30 steps per frame.
- Grain count is `256 × 256 = 65,536`.
- Every tuning constant is documented in the simulation's own units — grid cells, cells per step, radians per step — and any comment explaining _why_ a value works must state whether it was isolated or merely observed.
- The animation must render something sane when `EXT_color_buffer_float` is missing: fail once, set `failed = true`, never retry.
- Do not reformat or "tidy" GLSL string literals; the repo treats them as carried-across verbatim blocks.
- New animation id is `chladni-plate`, section `toys`, tag `glsl sim`.

---

## File Structure

| File                                                                             | Responsibility                                                                                 |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `packages/flateralus-pixi-animations/src/chladni-plate/physics.ts`               | Pure numeric core: constants, stability clamp, frequency map, decay and envelope maths. No GL. |
| `packages/flateralus-pixi-animations/src/chladni-plate/physics.test.ts`          | Unit tests for the above.                                                                      |
| `packages/flateralus-pixi-animations/src/chladni-plate/manifest.ts`              | Control manifest and its derived value type.                                                   |
| `packages/flateralus-pixi-animations/src/chladni-plate/shaders.ts`               | The five GLSL programs and their uniform name lists.                                           |
| `packages/flateralus-pixi-animations/src/chladni-plate/masks.ts`                 | Boundary mask canvases: square, circle, mark.                                                  |
| `packages/flateralus-pixi-animations/src/chladni-plate/chladniPlateAnimation.ts` | The `PixiAnimation` subclass: GL plumbing, frame loop, interaction.                            |
| `packages/flateralus-pixi-animations/src/chladni-plate/index.ts`                 | Barrel.                                                                                        |
| `packages/flateralus-pixi-animations/src/index.ts`                               | Add `export * from './chladni-plate';`                                                         |
| `apps/bracketbear-website/src/components/lab/registry.ts`                        | Registry entry.                                                                                |
| `apps/bracketbear-website/src/components/lab/registry.test.ts`                   | Add `'chladni-plate'` to `SELECTED` — the suite fails otherwise.                               |

## How to verify visually

Most of this animation cannot be unit tested, and the spec says so rather than pretending otherwise. Every GPU task ends with a manual check in the Lab:

```bash
npm run dev --workspace=@bracketbear/bracketbear-website
# open http://localhost:4321/lab, pick "Chladni Plate" under 09 · Toys
```

The Lab's inspector exposes every `debug: true` control live, which is the tuning surface for Tasks 3, 5 and 6.

---

## Task 1: Pure numeric core

**Files:**

- Create: `packages/flateralus-pixi-animations/src/chladni-plate/physics.ts`
- Test: `packages/flateralus-pixi-animations/src/chladni-plate/physics.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `STEP`, `GRID`, `GRAIN_TEX`, `GRAIN_N`, `BETA_MAX`, `OMEGA_MIN`, `OMEGA_MAX`, `TAU` (all `number`); `clampStiffness(beta: number): number`; `driveOmega(x: number): number`; `wrapPhase(phase: number): number`; `decayPerStep(ringTime: number): number`; `envelopeAlpha(omega: number): number`; `modeOmega(beta: number, k: number): number`.

- [ ] **Step 1: Write the failing test**

Create `physics.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  BETA_MAX,
  GRID,
  OMEGA_MAX,
  OMEGA_MIN,
  STEP,
  TAU,
  clampStiffness,
  decayPerStep,
  driveOmega,
  envelopeAlpha,
  modeOmega,
  wrapPhase,
} from './physics';

describe('chladni physics', () => {
  it('keeps the stiffness clamp below the leapfrog stability limit', () => {
    // beta * lambda_max <= 4, and the discrete grad^4 operator has
    // lambda_max = 64. Nothing in the manifest may reach past this.
    expect(BETA_MAX * 64).toBeLessThanOrEqual(4);
  });

  it('clamps stiffness from above, below and from garbage', () => {
    expect(clampStiffness(10)).toBe(BETA_MAX);
    expect(clampStiffness(0.04)).toBe(0.04);
    expect(clampStiffness(-1)).toBeGreaterThan(0);
    expect(clampStiffness(Number.NaN)).toBe(0.04);
  });

  it('maps the cursor linearly onto the drive band', () => {
    expect(driveOmega(0)).toBeCloseTo(OMEGA_MIN, 12);
    expect(driveOmega(1)).toBeCloseTo(OMEGA_MAX, 12);
    expect(driveOmega(0.5)).toBeCloseTo((OMEGA_MIN + OMEGA_MAX) / 2, 12);
    // Out of range must not escape the band.
    expect(driveOmega(-3)).toBe(OMEGA_MIN);
    expect(driveOmega(9)).toBe(OMEGA_MAX);
  });

  it('wraps phase into [0, TAU) from either direction', () => {
    expect(wrapPhase(0)).toBe(0);
    expect(wrapPhase(TAU + 0.25)).toBeCloseTo(0.25, 12);
    expect(wrapPhase(-0.25)).toBeCloseTo(TAU - 0.25, 12);
    expect(wrapPhase(1000 * TAU + 1)).toBeGreaterThanOrEqual(0);
    expect(wrapPhase(1000 * TAU + 1)).toBeLessThan(TAU);
  });

  it('turns a ring-down time into a per-step multiplier just under one', () => {
    const short = decayPerStep(0.5);
    const long = decayPerStep(30);
    expect(short).toBeGreaterThan(0);
    expect(short).toBeLessThan(1);
    expect(long).toBeGreaterThan(short);
    expect(long).toBeLessThan(1);
    // A 4s ring-down should lose 1/e over 4s worth of steps.
    expect(decayPerStep(4) ** (4 / STEP)).toBeCloseTo(Math.exp(-1), 6);
  });

  it('ties the envelope to three drive periods', () => {
    expect(envelopeAlpha(OMEGA_MIN)).toBeLessThan(envelopeAlpha(OMEGA_MAX));
    expect(envelopeAlpha(OMEGA_MIN)).toBeCloseTo(OMEGA_MIN / (TAU * 3), 12);
  });

  it('reproduces the dispersion table in the spec', () => {
    // Spec D3a: m half-waves across GRID cells at beta = 0.04.
    const w = (m: number) => modeOmega(0.04, (m * Math.PI) / GRID);
    expect(w(8)).toBeCloseTo(0.00769, 5);
    expect(w(16)).toBeCloseTo(0.03045, 5);
    // The drive band must actually contain the legible modes, or the
    // cursor sweeps across nothing.
    expect(w(8)).toBeGreaterThan(OMEGA_MIN);
    expect(w(22)).toBeLessThan(OMEGA_MAX);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
npx vitest run packages/flateralus-pixi-animations/src/chladni-plate/physics.test.ts
```

Expected: FAIL — `Failed to resolve import "./physics"`.

- [ ] **Step 3: Write the implementation**

Create `physics.ts`:

```ts
/**
 * Pure numeric core of the Chladni plate.
 *
 * Everything here is testable without a GL context, which is most of what
 * can be tested at all in this animation. The rest is verified by eye in the
 * Lab — see the spec's testing section.
 */

/** Simulation step in seconds. Spec D3a: fixed by the dispersion relation, not by taste. */
export const STEP = 1 / 1200;

/** Plate grid. Square and canvas-independent: the plate is an object, not a full-bleed field. */
export const GRID = 128;

/** Grain texture edge. GRAIN_N grains total. */
export const GRAIN_TEX = 256;
export const GRAIN_N = GRAIN_TEX * GRAIN_TEX;

export const TAU = Math.PI * 2;

/**
 * Stability limit of the leapfrog biharmonic. The scheme is stable while
 * beta * lambda_max <= 4; the discrete 5-point grad^2 has eigenvalues in
 * [-8, 0], so grad^4 = (grad^2)^2 has eigenvalues in [0, 64], giving
 * beta <= 1/16. This sits below that with margin, and it is enforced here
 * rather than only in the manifest so a randomize-all cannot detonate the
 * integrator.
 */
export const BETA_MAX = 0.05;

const BETA_DEFAULT = 0.04;

export function clampStiffness(beta: number): number {
  if (!Number.isFinite(beta)) return BETA_DEFAULT;
  return Math.min(BETA_MAX, Math.max(0.002, beta));
}

/**
 * Drive band in radians per step. At 1200 steps/s this is roughly 1.2 Hz to
 * 11.1 Hz, which brackets the legible modes of a 128-cell plate: m = 8
 * half-waves sits at 0.00769 and m = 22 at 0.05691, and the band has to
 * contain both ends or the cursor sweeps past nothing at the top.
 */
export const OMEGA_MIN = 0.006;
export const OMEGA_MAX = 0.058;

/**
 * Cursor x to drive frequency, linearly.
 *
 * Linear is the correct map here and the reflex choice from audio — a
 * geometric sweep — is wrong. For a Kirchhoff plate omega goes as k^2 while
 * the 2D mode count below k goes as k^2, so the number of modes below omega
 * grows linearly in omega: plate modes are uniformly dense in frequency. A
 * linear sweep meets them at a steady rate; a geometric one would crowd them
 * all into one end of the cursor's travel.
 */
export function driveOmega(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return OMEGA_MIN + (OMEGA_MAX - OMEGA_MIN) * t;
}

/**
 * Keep the drive phase in [0, TAU). The phase is integrated rather than
 * computed from a clock: this forcing is coherent, so a discontinuity is an
 * impulse that would ring every mode at once.
 */
export function wrapPhase(phase: number): number {
  const p = phase % TAU;
  return p < 0 ? p + TAU : p;
}

/**
 * Per-step decay multiplier from a ring-down time in seconds.
 *
 * The raw multiplier lives in 0.9999-0.99999 at this step rate, which is not
 * a number anyone can tune by hand. Seconds are, and they expose what
 * actually matters for the hunt: Q is roughly omega * ringTime / STEP / 2.
 */
export function decayPerStep(ringTime: number): number {
  return Math.exp(-STEP / Math.max(0.05, ringTime));
}

/**
 * Envelope blend factor: three drive periods.
 *
 * A fixed step count cannot work across a sweep spanning three octaves — it
 * would be most of a period at the bottom and dozens at the top. Tying it to
 * omega keeps "how hard is this spot shaking" meaning the same thing
 * everywhere in the band.
 */
export function envelopeAlpha(omega: number): number {
  return Math.min(0.5, omega / (TAU * 3));
}

/**
 * Mode frequency of the discrete scheme in radians per step, for wavenumber
 * k in radians per cell. This is the exact discrete relation, not the
 * continuum sqrt(beta) * k^2 approximation it tends toward at small k.
 */
export function modeOmega(beta: number, k: number): number {
  const s = Math.sin(k / 2);
  return Math.sqrt(beta * 16 * s * s * s * s);
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run packages/flateralus-pixi-animations/src/chladni-plate/physics.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/flateralus-pixi-animations/src/chladni-plate/
git commit -m "feat(chladni-plate): add the pure numeric core"
```

---

## Task 2: Manifest, boundary masks, and a plate on screen

Get something visible and registered before any simulation exists. The deliverable is a shaded plate shape sitting in the Lab, with the boundary select already working — so Task 3 has somewhere to draw into and the mask pipeline is proven before the integrator depends on it.

**Files:**

- Create: `.../chladni-plate/manifest.ts`, `.../chladni-plate/masks.ts`, `.../chladni-plate/shaders.ts`, `.../chladni-plate/chladniPlateAnimation.ts`, `.../chladni-plate/index.ts`
- Modify: `packages/flateralus-pixi-animations/src/index.ts`
- Modify: `apps/bracketbear-website/src/components/lab/registry.ts`
- Modify: `apps/bracketbear-website/src/components/lab/registry.test.ts:10-41` (the `SELECTED` array)

**Interfaces:**

- Consumes: `GRID`, `GRAIN_TEX` from `./physics`; `VERT` from `../shared/shader-harness`; `sdfMaskInfo` from `../shared/sdf-harness`.
- Produces: `MANIFEST` and `ChladniPlateControlValues` from `./manifest`; `boundaryCanvas(kind: 0 | 1 | 2): HTMLCanvasElement` from `./masks`; `DISPLAY_FS`, `DISPLAY_UNIFORMS` from `./shaders`; `ChladniPlateAnimation` and `createChladniPlateAnimation(initialControls?): ChladniPlateAnimation`.

- [ ] **Step 1: Write the manifest**

Create `manifest.ts`:

```ts
import { createManifest } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';

export const MANIFEST = createManifest({
  id: 'chladni-plate',
  name: 'Chladni Plate (GLSL)',
  description:
    'A driven plate with sand on it. The plate integrates the fourth-order Kirchhoff equation in a GPU ping-pong buffer, so its modes are eigenvalues rather than pictures. Sand is thrown off the surface wherever peak acceleration beats gravity and drifts down the amplitude gradient while airborne, which is why it collects on the nodal lines: quiet regions cannot throw it back out. The sand then mass-loads the plate, detuning the mode that placed it. The boundary is swappable, and swapping it rewrites every figure.',
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
      name: 'boundary',
      type: 'select',
      label: 'Plate',
      options: [
        { value: 0, label: 'Square' },
        { value: 1, label: 'Circle' },
        { value: 2, label: 'The Mark' },
      ],
      defaultValue: 0,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'stiffness',
      type: 'number',
      label: 'Stiffness',
      min: 0.005,
      max: 0.05,
      step: 0.001,
      defaultValue: 0.04,
      debug: true,
    },
    {
      name: 'ringTime',
      type: 'number',
      label: 'Ring-down (s)',
      min: 0.5,
      max: 30,
      step: 0.5,
      defaultValue: 4,
      debug: true,
    },
    {
      name: 'drive',
      type: 'number',
      label: 'Drive',
      min: 0,
      max: 3,
      step: 0.05,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'threshold',
      type: 'number',
      label: 'Throw Threshold',
      min: 0,
      max: 120,
      step: 1,
      defaultValue: 20,
      debug: true,
    },
    {
      name: 'drift',
      type: 'number',
      label: 'Drift',
      min: 0,
      max: 2,
      step: 0.02,
      defaultValue: 0.4,
      debug: true,
    },
    {
      name: 'jitter',
      type: 'number',
      label: 'Jitter',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: 0.15,
      debug: true,
    },
    {
      name: 'load',
      type: 'number',
      label: 'Sand Load',
      min: 0,
      max: 4,
      step: 0.1,
      defaultValue: 1.2,
      debug: true,
    },
    {
      name: 'sweep',
      type: 'number',
      label: 'Sweep Rate',
      min: 0.2,
      max: 5,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'tint',
      type: 'select',
      label: 'Color',
      options: [
        { value: 0, label: 'Slate' },
        { value: 1, label: 'Ember' },
        { value: 2, label: 'Ink' },
      ],
      defaultValue: 0,
      debug: true,
    },
  ],
} as const);

export type ChladniPlateControlValues = ManifestToControlValues<
  typeof MANIFEST
>;
```

Note for the implementer: `threshold`, `drift` and `jitter` are empirical constants in the field's own arbitrary amplitude units. Only their ratios matter and all three are expected to be retuned in Task 6. Do not write a comment claiming to know what they mean physically until Task 6's tuning has isolated them.

- [ ] **Step 2: Write the boundary masks**

Create `masks.ts`:

```ts
import { GRID } from './physics';
import { sdfMaskInfo } from '../shared/sdf-harness';

/**
 * The plate's boundary as a GRID x GRID canvas: white inside, black outside.
 *
 * This is sampled by three passes as the simply-supported boundary condition
 * (spec D2): w = 0 and grad^2 w = 0 hold wherever this is black, both by
 * construction with no ghost cells anywhere.
 *
 * A margin of two cells is left clear on every side so the 13-point
 * biharmonic stencil never reaches past the texture edge, where CLAMP_TO_EDGE
 * would silently mirror the interior back in and impose a boundary nobody
 * chose.
 */
export function boundaryCanvas(kind: 0 | 1 | 2): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = GRID;
  cv.height = GRID;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, GRID, GRID);
  g.fillStyle = '#fff';

  const M = 3; // cells of clearance, >= the 2-cell stencil reach
  const S = GRID - M * 2;

  if (kind === 0) {
    g.fillRect(M, M, S, S);
  } else if (kind === 1) {
    g.beginPath();
    g.arc(GRID / 2, GRID / 2, S / 2, 0, Math.PI * 2);
    g.fill();
  } else {
    // The mark's own outline. sdfMaskInfo already rasterizes the lockup and
    // hands back a binary interior mask, so the plate is literally the
    // letterforms and its modes belong to the brand's geometry.
    const info = sdfMaskInfo();
    const img = g.createImageData(GRID, GRID);
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const inMargin = x < M || y < M || x >= GRID - M || y >= GRID - M;
        const u = (x - M) / (S - 1);
        const v = (y - M) / (S - 1);
        const sx = Math.min(
          info.W - 1,
          Math.max(0, Math.floor(u * (info.W - 1)))
        );
        const sy = Math.min(
          info.H - 1,
          Math.max(0, Math.floor(v * (info.H - 1)))
        );
        const on = !inMargin && !!info.bin[sy * info.W + sx];
        const o = (y * GRID + x) * 4;
        const c = on ? 255 : 0;
        img.data[o] = c;
        img.data[o + 1] = c;
        img.data[o + 2] = c;
        img.data[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }
  return cv;
}
```

- [ ] **Step 3: Write the display shader**

Create `shaders.ts` with just the display program for now; Tasks 3 and 6 add the rest.

```ts
export const DISPLAY_FS = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uMask;
    uniform vec2 uRes;
    uniform vec3 uBg, uPlate, uEdge;
    // Plate rect in screen uv: xy = centre, zw = half-size.
    uniform vec4 uRect;
    void main() {
      vec2 p = (vUV - uRect.xy) / uRect.zw * 0.5 + 0.5;
      vec3 col = uBg;
      if (p.x > 0.0 && p.x < 1.0 && p.y > 0.0 && p.y < 1.0) {
        float m = texture(uMask, p).x;
        // Soften the mask edge so a 128-cell boundary does not read as
        // staircase pixels at screen resolution.
        float e = fwidth(m) + 1e-4;
        float body = smoothstep(0.5 - e, 0.5 + e, m);
        col = mix(col, uPlate, body);
        float rim = body * (1.0 - smoothstep(0.5 + e, 0.5 + e * 6.0, m));
        col = mix(col, uEdge, rim * 0.8);
      }
      fragColor = vec4(col, 1.0);
    }`;

export const DISPLAY_UNIFORMS = [
  'uMask',
  'uRes',
  'uBg',
  'uPlate',
  'uEdge',
  'uRect',
];
```

- [ ] **Step 4: Write the animation class**

Create `chladniPlateAnimation.ts`. This is the skeleton every later task extends — GL context, one program, the PIXI blit, and the plate rect.

```ts
import * as PIXI from 'pixi.js';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { VERT } from '../shared/shader-harness';
import { MANIFEST, type ChladniPlateControlValues } from './manifest';
import { DISPLAY_FS, DISPLAY_UNIFORMS } from './shaders';
import { boundaryCanvas } from './masks';
import { GRID } from './physics';

type Locs = Record<string, WebGLUniformLocation | null>;

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  src: string,
  tag: string
): WebGLShader | null {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error(`[chladni] ${tag}: ${gl.getShaderInfoLog(sh)}`);
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function program(
  gl: WebGL2RenderingContext,
  frag: string,
  tag: string,
  vert: string = VERT
): WebGLProgram | null {
  const vs = compile(gl, gl.VERTEX_SHADER, vert, `${tag}.vs`);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag, `${tag}.fs`);
  if (!vs || !fs) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error(`[chladni] ${tag} link: ${gl.getProgramInfoLog(p)}`);
    return null;
  }
  return p;
}

export function locsOf(
  gl: WebGL2RenderingContext,
  p: WebGLProgram,
  names: string[]
): Locs {
  const out: Locs = {};
  for (const n of names) out[n] = gl.getUniformLocation(p, n);
  return out;
}

export function mkTexFrom(
  gl: WebGL2RenderingContext,
  src: HTMLCanvasElement
): WebGLTexture {
  const tx = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tx;
}

interface Palette {
  bg: [number, number, number];
  plate: [number, number, number];
  edge: [number, number, number];
  sand: [number, number, number];
}

const TINTS: Palette[] = [
  // Slate: a dark plate with bright sand. This is a luminance-headroom
  // decision as much as a taste one — the plate's shimmer is additive and
  // needs somewhere to climb.
  {
    bg: [0.05, 0.05, 0.06],
    plate: [0.16, 0.17, 0.2],
    edge: [0.3, 0.32, 0.36],
    sand: [0.95, 0.93, 0.86],
  },
  {
    bg: [0.07, 0.04, 0.03],
    plate: [0.2, 0.11, 0.07],
    edge: [0.45, 0.24, 0.12],
    sand: [1.0, 0.86, 0.62],
  },
  {
    bg: [0.04, 0.03, 0.03],
    plate: [0.1, 0.09, 0.09],
    edge: [0.24, 0.22, 0.21],
    sand: [1.0, 0.37, 0.12],
  },
];

export class ChladniPlateAnimation extends PixiAnimation<typeof MANIFEST> {
  protected canvas: HTMLCanvasElement | null = null;
  protected gl: WebGL2RenderingContext | null = null;
  protected dispProg: WebGLProgram | null = null;
  protected dispL: Locs = {};
  protected maskTx: WebGLTexture | null = null;
  protected maskKind = -1;
  protected failed = false;

  protected sprite: PIXI.Sprite | null = null;
  protected texture: PIXI.Texture | null = null;

  constructor(initialControls?: Partial<ChladniPlateControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.maskKind = -1;
  }

  /** Build the context and the programs. False means stop retrying. */
  protected build(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      premultipliedAlpha: true,
    });
    if (!gl) return false;
    // The plate field is a float render target. Without it there is no
    // simulation to run at all, so fail once and never retry.
    if (!gl.getExtension('EXT_color_buffer_float')) return false;

    const dispProg = program(gl, DISPLAY_FS, 'disp');
    if (!dispProg) return false;

    this.canvas = canvas;
    this.gl = gl;
    this.dispProg = dispProg;
    this.dispL = locsOf(gl, dispProg, DISPLAY_UNIFORMS);
    return true;
  }

  /** (Re)upload the boundary mask when the plate shape changes. */
  protected ensureMask(kind: number): void {
    if (kind === this.maskKind) return;
    const gl = this.gl!;
    if (this.maskTx) gl.deleteTexture(this.maskTx);
    this.maskTx = mkTexFrom(gl, boundaryCanvas(kind as 0 | 1 | 2));
    this.maskKind = kind;
  }

  /**
   * The plate's rect in screen uv: centred, square, 82% of the short edge.
   * The plate is an object in the scene, so it keeps its own proportions
   * regardless of how the stage is shaped.
   */
  protected plateRect(w: number, h: number): [number, number, number, number] {
    const s = (Math.min(w, h) * 0.82) / 2;
    return [0.5, 0.5, s / w, s / h];
  }

  onUpdate(
    app: PIXI.Application,
    controls: ChladniPlateControlValues,
    _deltaTime: number
  ): void {
    if (this.failed) return;
    if (!this.gl) {
      if (!this.build()) {
        this.failed = true;
        return;
      }
    }
    const gl = this.gl!;

    if (!this.sprite) {
      this.texture = PIXI.Texture.from(this.canvas!);
      this.sprite = new PIXI.Sprite(this.texture);
      this.getRoot().addChild(this.sprite);
    }

    const sw = app.screen.width;
    const sh = app.screen.height;
    const dpr = this.dpr ?? Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(2, Math.round(sw * dpr));
    const H = Math.max(2, Math.round(sh * dpr));
    if (this.canvas!.width !== W || this.canvas!.height !== H) {
      this.canvas!.width = W;
      this.canvas!.height = H;
      this.texture?.source.resize(W, H);
    }
    this.sprite.width = sw;
    this.sprite.height = sh;

    this.ensureMask(Number(controls.boundary));

    const pal = TINTS[Math.min(TINTS.length - 1, Number(controls.tint))];
    const rect = this.plateRect(W, H);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.dispProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.maskTx);
    gl.uniform1i(this.dispL.uMask!, 0);
    gl.uniform2f(this.dispL.uRes!, W, H);
    gl.uniform3fv(this.dispL.uBg!, pal.bg);
    gl.uniform3fv(this.dispL.uPlate!, pal.plate);
    gl.uniform3fv(this.dispL.uEdge!, pal.edge);
    gl.uniform4fv(this.dispL.uRect!, rect);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.texture?.source.update();
  }

  onDestroy(): void {
    const gl = this.gl;
    if (gl) {
      if (this.maskTx) gl.deleteTexture(this.maskTx);
      if (this.dispProg) gl.deleteProgram(this.dispProg);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.maskTx = null;
    this.maskKind = -1;
    this.dispProg = null;
    this.dispL = {};
    this.gl = null;
    this.canvas = null;
    this.failed = false;
    this.sprite = null;
    this.texture?.destroy(true);
    this.texture = null;
    super.onDestroy();
  }
}

export function createChladniPlateAnimation(
  initialControls?: Partial<ChladniPlateControlValues>
): ChladniPlateAnimation {
  return new ChladniPlateAnimation(initialControls);
}
```

Note: `GRID` is imported but unused until Task 3. Import it there instead if lint objects.

- [ ] **Step 5: Write the barrel and export it**

Create `index.ts`:

```ts
export * from './chladniPlateAnimation';
export * from './manifest';
```

Add to `packages/flateralus-pixi-animations/src/index.ts`, keeping the file's alphabetical order:

```ts
export * from './chladni-plate';
```

- [ ] **Step 6: Register it in the Lab**

Add the import to `apps/bracketbear-website/src/components/lab/registry.ts` alongside the others, then append this entry to `REGISTRY`:

```ts
  {
    id: 'chladni-plate',
    section: 'toys',
    name: 'Chladni Plate',
    tag: 'glsl sim',
    blurb:
      'A driven plate with sand on it. Placeholder blurb — rewritten in Task 9 using the bb-voice skill.',
    create: (initialControls) =>
      createChladniPlateAnimation(
        initialControls as never
      ) as unknown as PixiAnimation<AnimationManifest>,
  },
```

- [ ] **Step 7: Add the id to the registry test**

`registry.test.ts` asserts the registry contains **nothing beyond** the selected set, so the suite fails until this is added. In the `SELECTED` array, after `'caustics-pool'`:

```ts
  'caustics-pool',
  'chladni-plate',
```

- [ ] **Step 8: Run the test suite**

```bash
npx vitest run apps/bracketbear-website/src/components/lab/registry.test.ts
```

Expected: PASS. If "contains nothing beyond the selected set" fails, Step 7 was skipped.

- [ ] **Step 9: Verify in the Lab**

```bash
npm run dev --workspace=@bracketbear/bracketbear-website
```

Open `/lab`, select **Chladni Plate** under `09 · Toys`. Expected: a dark stage with a lighter square plate centred in it, with a visible rim. Switch **Plate** to Circle and to The Mark — the shape must change, and the mark must be recognisable. Switch **Color** through all three. Resize the window: the plate stays square and centred.

- [ ] **Step 10: Commit**

```bash
git add packages/flateralus-pixi-animations/src apps/bracketbear-website/src/components/lab
git commit -m "feat(chladni-plate): register the toy and draw the plate boundary"
```

---

## Task 3: The plate integrator

Two passes per substep, a point driver, and a debug display of `w` so the plate's motion is visible before the envelope exists.

**Files:**

- Modify: `.../chladni-plate/shaders.ts` (add `LAPLACIAN_FS`, `STEP_FS`, extend `DISPLAY_FS`)
- Modify: `.../chladni-plate/chladniPlateAnimation.ts`

**Interfaces:**

- Consumes: `STEP`, `GRID`, `clampStiffness`, `decayPerStep`, `envelopeAlpha`, `driveOmega`, `wrapPhase` from `./physics`.
- Produces: `LAPLACIAN_FS`, `LAPLACIAN_UNIFORMS`, `STEP_FS`, `STEP_UNIFORMS` from `./shaders`; protected fields `wTex`, `wFb`, `wi`, `lTex`, `lFb`, `phase`, `acc`, `preroll` on the class.

- [ ] **Step 1: Add the Laplacian pass**

In `shaders.ts`:

```ts
export const LAPLACIAN_FS = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uW;      // .x = w, .y = w one step ago, .z = envelope
    uniform sampler2D uMask;   // .x = 1 inside the plate
    uniform vec2 uGrid;
    void main() {
      // Simply supported (spec D2): grad^2 w = 0 on the boundary, imposed by
      // zeroing L outside the plate. w = 0 outside is imposed by the step
      // pass, so the neighbour taps below already read zero there.
      if (texture(uMask, vUV).x < 0.5) { fragColor = vec4(0.0); return; }
      vec2 px = 1.0 / uGrid;
      float c = texture(uW, vUV).x;
      float l = texture(uW, vUV - vec2(px.x, 0.0)).x;
      float r = texture(uW, vUV + vec2(px.x, 0.0)).x;
      float b = texture(uW, vUV - vec2(0.0, px.y)).x;
      float t = texture(uW, vUV + vec2(0.0, px.y)).x;
      fragColor = vec4(l + r + b + t - 4.0 * c, 0.0, 0.0, 1.0);
    }`;

export const LAPLACIAN_UNIFORMS = ['uW', 'uMask', 'uGrid'];
```

- [ ] **Step 2: Add the step pass**

In `shaders.ts`:

```ts
export const STEP_FS = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uW;      // .x = w, .y = w one step ago, .z = envelope
    uniform sampler2D uL;      // .x = grad^2 w
    uniform sampler2D uMask;
    uniform sampler2D uDens;   // .x = grain density, wired in Task 7
    uniform vec2 uGrid;
    uniform float uBeta, uDecay, uLoad, uDrive, uPhase, uEnvA, uDriveR;
    uniform vec2 uDriveP;
    void main() {
      if (texture(uMask, vUV).x < 0.5) { fragColor = vec4(0.0); return; }

      vec2 px = 1.0 / uGrid;
      float cL = texture(uL, vUV).x;
      float lL = texture(uL, vUV - vec2(px.x, 0.0)).x;
      float rL = texture(uL, vUV + vec2(px.x, 0.0)).x;
      float bL = texture(uL, vUV - vec2(0.0, px.y)).x;
      float tL = texture(uL, vUV + vec2(0.0, px.y)).x;
      float bih = lL + rL + bL + tL - 4.0 * cL;   // grad^4 w

      vec3 s = texture(uW, vUV).xyz;
      float dens = texture(uDens, vUV).x;
      // Added mass lowers local stiffness; sand also dissipates energy. This
      // is the loop closure: the figure changes the plate that made it.
      float beta = uBeta / (1.0 + uLoad * dens);
      float decay = uDecay * (1.0 - min(0.4, uLoad * dens * 0.02));

      // Point driver at the plate centre. Load-bearing, not a simplification:
      // it is what excites degenerate mode pairs symmetrically, and it is why
      // only modes with a centre antinode get fed at all.
      vec2 d = (vUV - uDriveP) * uGrid;
      float f = uDrive * 3e-4 * exp(-dot(d, d) / (uDriveR * uDriveR)) * sin(uPhase);

      float w = (2.0 * s.x - s.y - beta * bih + f) * decay;
      // Numerical guard. In a stable run this never engages; if it does, the
      // stiffness clamp or the step rate is wrong, and damping is not the fix.
      w = clamp(w, -8.0, 8.0);

      float env = mix(s.z, abs(w), uEnvA);
      fragColor = vec4(w, s.x, env, 1.0);
    }`;

export const STEP_UNIFORMS = [
  'uW',
  'uL',
  'uMask',
  'uDens',
  'uGrid',
  'uBeta',
  'uDecay',
  'uLoad',
  'uDrive',
  'uPhase',
  'uEnvA',
  'uDriveR',
  'uDriveP',
];
```

- [ ] **Step 3: Show `w` in the display pass**

Replace the plate body line in `DISPLAY_FS` so the plate's live deflection is visible. Add `uniform sampler2D uW;` and `uniform float uShow;` to the shader, add `'uW'` and `'uShow'` to `DISPLAY_UNIFORMS`, and replace `col = mix(col, uPlate, body);` with:

```glsl
        float w = texture(uW, p).x;
        vec3 plate = uPlate + vec3(clamp(w * uShow, -0.6, 0.6));
        col = mix(col, plate, body);
```

`uShow` is a debug gain, set from code to `6.0` for this task and dropped to `0.0` in Task 10 once the real shimmer replaces it. Leave the uniform in place — it is how you inspect the field when anything later looks wrong.

- [ ] **Step 4: Add the float targets and the step loop**

In `chladniPlateAnimation.ts`, add fields:

```ts
  protected lapProg: WebGLProgram | null = null;
  protected stepProg: WebGLProgram | null = null;
  protected lapL: Locs = {};
  protected stepL: Locs = {};
  /** Plate field pair: .x = w, .y = w one step ago, .z = envelope. */
  protected wTex: (WebGLTexture | null)[] = [];
  protected wFb: (WebGLFramebuffer | null)[] = [];
  protected wi = 0;
  /** Intermediate grad^2 w. Not ping-ponged: it is rebuilt every substep. */
  protected lTex: WebGLTexture | null = null;
  protected lFb: WebGLFramebuffer | null = null;
  /** A 1x1 black texture standing in for the density buffer until Task 7. */
  protected densTx: WebGLTexture | null = null;
  protected acc = 0;
  protected phase = 0;
  protected preroll = 0;
  protected primed = false;
  /** Step counter handed to the grain hash. Wrapped: sin-based hashes degrade at large coordinates and an ambient page runs for hours. */
  protected frame = 0;
  /** Whether the driver will hand back a readable format, probed once in Task 8. */
  protected readMode: 'float' | 'half' | 'none' | null = null;
  protected float32Ok = false;
```

Import `STEP`, `GRID`, `clampStiffness`, `decayPerStep`, `driveOmega`, `envelopeAlpha` and
`wrapPhase` from `./physics` at the top of the file.

Add a float-target helper and call it from `build()` after the programs link:

```ts
  /**
   * RGBA32F where the driver allows it, RGBA16F otherwise. The biharmonic is
   * a difference of differences, so half-float may be too coarse to hold it;
   * if 16F shows grid-scale noise in the field, that is a finding to report,
   * not something to hide behind extra damping.
   */
  protected mkFloatTex(gl: WebGL2RenderingContext, n: number): WebGLTexture {
    const tx = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tx);
    const f32 = gl.getExtension('EXT_color_buffer_float') && this.float32Ok;
    if (f32) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, n, n, 0, gl.RGBA, gl.FLOAT, null);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, n, n, 0, gl.RGBA, gl.HALF_FLOAT, null);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tx;
  }
```

with `protected float32Ok = false;` set in `build()`:

```ts
// 32F needs both the render-target extension and linear filtering of it.
this.float32Ok = !!gl.getExtension('OES_texture_float_linear');
```

Add the framebuffer helper and the stand-in density texture:

```ts
  protected mkFb(gl: WebGL2RenderingContext, tx: WebGLTexture): WebGLFramebuffer {
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tx, 0);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fb;
  }

  /** One black pixel, so the step pass has a density texture to sample before Task 6 supplies a real one. */
  protected mkBlankDensity(gl: WebGL2RenderingContext): WebGLTexture {
    const tx = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                  new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tx;
  }
```

Then in `build()`, after the programs link:

```ts
this.wTex = [this.mkFloatTex(gl, GRID), this.mkFloatTex(gl, GRID)];
this.wFb = [this.mkFb(gl, this.wTex[0]!), this.mkFb(gl, this.wTex[1]!)];
this.lTex = this.mkFloatTex(gl, GRID);
this.lFb = this.mkFb(gl, this.lTex);
this.densTx = this.mkBlankDensity(gl);
```

- [ ] **Step 5: Drive the loop from `onUpdate`**

Insert before the display draw:

```ts
const beta = clampStiffness(Number(controls.stiffness));
const decay = decayPerStep(Number(controls.ringTime));
// Task 8 replaces this with the cursor; a fixed mid-band tone for now.
const omega = driveOmega(0.5);
const envA = envelopeAlpha(omega);

const doStep = () => {
  // The phase is integrated rather than read off a clock. This forcing is
  // coherent: a discontinuity would be an impulse ringing every mode at
  // once, unlike caustics-pool's noise gusts where a seam is just a
  // change of weather.
  this.phase = wrapPhase(this.phase + omega);

  gl.bindFramebuffer(gl.FRAMEBUFFER, this.lFb);
  gl.viewport(0, 0, GRID, GRID);
  gl.useProgram(this.lapProg);
  bindTex(0, this.wTex[this.wi]);
  bindTex(1, this.maskTx);
  gl.uniform1i(this.lapL.uW!, 0);
  gl.uniform1i(this.lapL.uMask!, 1);
  gl.uniform2f(this.lapL.uGrid!, GRID, GRID);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.bindFramebuffer(gl.FRAMEBUFFER, this.wFb[1 - this.wi]);
  gl.viewport(0, 0, GRID, GRID);
  gl.useProgram(this.stepProg);
  bindTex(0, this.wTex[this.wi]);
  bindTex(1, this.lTex);
  bindTex(2, this.maskTx);
  bindTex(3, this.densTx);
  gl.uniform1i(this.stepL.uW!, 0);
  gl.uniform1i(this.stepL.uL!, 1);
  gl.uniform1i(this.stepL.uMask!, 2);
  gl.uniform1i(this.stepL.uDens!, 3);
  gl.uniform2f(this.stepL.uGrid!, GRID, GRID);
  gl.uniform1f(this.stepL.uBeta!, beta);
  gl.uniform1f(this.stepL.uDecay!, decay);
  gl.uniform1f(this.stepL.uLoad!, Number(controls.load));
  gl.uniform1f(this.stepL.uDrive!, Number(controls.drive));
  gl.uniform1f(this.stepL.uPhase!, this.phase);
  gl.uniform1f(this.stepL.uEnvA!, envA);
  gl.uniform1f(this.stepL.uDriveR!, 2.5);
  gl.uniform2f(this.stepL.uDriveP!, 0.5, 0.5);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  this.wi = 1 - this.wi;
};

// Open on a plate that is already ringing. The envelope's time constant
// is three drive periods, so a shorter pre-roll hands the grains a
// half-built field. Outside the accumulator on purpose — its cap would
// eat all but thirty of these.
if (!this.primed) {
  this.primed = true;
  this.preroll = 2400;
}
while (this.preroll > 0) {
  this.preroll--;
  doStep();
}

// Fixed step: the biharmonic stencil is only conditionally stable and a
// variable dt detonates it. Capped at 30 steps so a stall cannot spiral.
this.acc = Math.min(this.acc + dt, 30 * STEP);
while (this.acc >= STEP) {
  this.acc -= STEP;
  doStep();
}
```

with `const dt = Math.min(0.05, deltaTime);` at the top of `onUpdate` and a local `bindTex` helper mirroring `caustics-pool:1470-1473`.

Also clear the field and re-prime when the boundary changes — extend `ensureMask` so that after uploading a new mask it clears both `wFb` targets and sets `this.primed = false`. A mode shape from the old boundary is meaningless under the new one.

- [ ] **Step 6: Extend `onDestroy`**

Delete `lapProg`, `stepProg`, `lTex`, `lFb`, `densTx` and both `wTex`/`wFb` entries alongside the existing teardown, and reset `wi`, `acc`, `phase`, `preroll` and `primed`.

- [ ] **Step 7: Verify in the Lab**

Run the dev server and open the toy. Expected, in order of importance:

1. **It does not blow up.** The plate shows a standing pattern, not a white or black flash. If it saturates within a second, the `clamp` is engaging: check `clampStiffness` is actually being called and that `STEP` is `1/1200`.
2. **A standing pattern is visible** — bands, a grid, or a ringed figure depending on where the mid-band tone landed.
3. **Sweeping `Stiffness` changes the pattern's scale** — higher stiffness means a given drive frequency corresponds to a longer wavelength, so fewer lines.
4. **`Ring-down (s)` changes how sharply it responds.** At 0.5 s the pattern is vague; at 30 s it takes many seconds to build and is much more defined.
5. **Set `Drive` to 0.** The pattern must decay smoothly to nothing over roughly the ring-down time. If it persists, the decay is not being applied; if it vanishes instantly, `decayPerStep` has the wrong sign or units.
6. **Switch `Plate` to Circle and The Mark.** Each must produce a _different_ pattern, and the mark's must visibly respect the letterforms.

Record the observed frame time from the Lab's inspector. Twenty substeps at 128² should be invisible in the frame budget; if it is not, say so rather than quietly lowering the step rate.

- [ ] **Step 8: Commit**

```bash
git add packages/flateralus-pixi-animations/src/chladni-plate
git commit -m "feat(chladni-plate): integrate the fourth-order plate"
```

---

## Task 4: Prove the envelope holds nodal structure

The envelope is already being written by Task 3's step pass. This task makes it visible and answers the question the whole design rests on: **does spatial contrast in `A` actually appear at resonance?** If it does not, nothing downstream can work, and the fix is here rather than in the grains.

**Files:**

- Modify: `.../chladni-plate/shaders.ts` (`DISPLAY_FS`)
- Modify: `.../chladni-plate/chladniPlateAnimation.ts`

- [ ] **Step 1: Add an envelope view to the display pass**

Add `uniform float uView;` to `DISPLAY_FS`, add `'uView'` to `DISPLAY_UNIFORMS`, and replace the plate body block with:

```glsl
        vec3 s = texture(uW, p).xyz;
        // uView 0 = deflection (debug), 1 = envelope. The envelope is what
        // the grains read; if the nodal structure is not legible here it is
        // not there, and no amount of grain tuning will invent it.
        float v = mix(clamp(s.x * uShow, -0.6, 0.6), s.z * uShow, uView);
        col = mix(col, uPlate + vec3(v), body);
```

- [ ] **Step 2: Add a temporary debug control**

Add to the manifest, marked clearly as temporary:

```ts
    {
      name: 'view',
      type: 'select',
      label: 'View (debug)',
      options: [
        { value: 0, label: 'Deflection' },
        { value: 1, label: 'Envelope' },
      ],
      defaultValue: 1,
      debug: true,
    },
```

Wire `uView` from `Number(controls.view)` and `uShow` from a constant `6.0`.

- [ ] **Step 3: Verify in the Lab — this is the design's gate**

Switch **View** to Envelope. Expected: a smooth field, bright where the plate is moving and **dark along continuous curves**. Those dark curves are the nodal lines, and everything else in this plan depends on them existing.

Sweep **Stiffness** slowly across its range with **Ring-down** at 8 s or more, giving each value a few seconds to build. You are looking for values where the dark curves become sharp and connected rather than mottled. Note two or three such values.

**If the dark curves never sharpen**, stop and report rather than proceeding. The likely causes, in order:

- The drive is off every mode. Widen the manifest's `stiffness` range and sweep again.
- The envelope alpha is too fast, averaging over less than a period and tracking `|w|`'s ripple. Check `envelopeAlpha(omega)` against the `omega` actually in use.
- Half-float precision is eating the biharmonic. Force `float32Ok = false` and compare; if 16F is visibly worse, that is the finding.

- [ ] **Step 4: Commit**

```bash
git add packages/flateralus-pixi-animations/src/chladni-plate
git commit -m "feat(chladni-plate): surface the amplitude envelope"
```

---

## Task 5: Grains

**Files:**

- Modify: `.../chladni-plate/shaders.ts` (add `GRAIN_FS`, `GRAIN_VS`, `GRAIN_POINT_FS`)
- Modify: `.../chladni-plate/chladniPlateAnimation.ts`

**Interfaces:**

- Consumes: `GRAIN_TEX`, `GRAIN_N`, `GRID` from `./physics`.
- Produces: `GRAIN_FS`, `GRAIN_UNIFORMS`, `GRAIN_VS`, `GRAIN_POINT_FS`, `GRAIN_RENDER_UNIFORMS`; protected `gTex`, `gFb`, `gi`, `densTex`, `densFb`, `scatterGrains()`.

- [ ] **Step 1: Add the grain update pass**

In `shaders.ts`:

```ts
export const GRAIN_FS = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uG;      // .xy position in plate uv, .zw velocity
    uniform sampler2D uW;      // .z = amplitude envelope
    uniform sampler2D uMask;
    uniform vec2 uGrid, uGTex;
    uniform float uDt, uOmega2, uThresh, uDrift, uJitter, uFriction, uSeed;
    uniform float uPourLo, uPourHi, uPourR;
    uniform vec2 uPourAt;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

    void main() {
      vec4 g = texture(uG, vUV);
      vec2 p = g.xy;
      vec2 v = g.zw;

      // Pour: a contiguous slab of the grain texture respawns at the cursor.
      // A ring pointer walks the slab forward per click, so pouring recycles
      // the oldest sand instead of ever adding more.
      float idx = (floor(vUV.y * uGTex.y) * uGTex.x + floor(vUV.x * uGTex.x))
                / (uGTex.x * uGTex.y);
      bool poured = uPourHi > uPourLo
        ? (idx >= uPourLo && idx < uPourHi)
        : (idx >= uPourLo || idx < uPourHi);
      if (poured) {
        float a = hash(vec2(idx, uSeed)) * 6.2831853;
        float rr = sqrt(hash(vec2(idx + 7.7, uSeed))) * uPourR;
        p = uPourAt + vec2(cos(a), sin(a)) * rr;
        v = vec2(0.0);
      }

      float A = texture(uW, p).z;
      vec2 px = 1.0 / uGrid;
      vec2 gradA = vec2(
        texture(uW, p + vec2(px.x, 0.0)).z - texture(uW, p - vec2(px.x, 0.0)).z,
        texture(uW, p + vec2(0.0, px.y)).z - texture(uW, p - vec2(0.0, px.y)).z
      ) * 0.5;

      // The mechanism, and the only one: a grain leaves the surface when peak
      // acceleration beats gravity, and drifts down the amplitude gradient
      // while it is off the plate. Below threshold it sits. Nodal lines
      // accumulate sand because quiet regions cannot throw it back out —
      // there is no attractor here and no target position. Delete uThresh and
      // the entire phenomenon disappears, which is the correct test.
      float excess = max(0.0, uOmega2 * A - uThresh);
      float ang = hash(p * 511.0 + uSeed) * 6.2831853;
      v += (-gradA * uDrift + vec2(cos(ang), sin(ang)) * uJitter) * excess * uDt;
      v *= exp(-uFriction * uDt);

      vec2 np = p + v * uDt;
      // The plate has a lip: grains reflect rather than falling off, so an
      // ambient page cannot slowly empty the plate over an afternoon.
      if (texture(uMask, np).x < 0.5) {
        np = p;
        v = -v * 0.4;
      }
      fragColor = vec4(clamp(np, vec2(0.002), vec2(0.998)), v);
    }`;

export const GRAIN_UNIFORMS = [
  'uG',
  'uW',
  'uMask',
  'uGrid',
  'uGTex',
  'uDt',
  'uOmega2',
  'uThresh',
  'uDrift',
  'uJitter',
  'uFriction',
  'uSeed',
  'uPourLo',
  'uPourHi',
  'uPourR',
  'uPourAt',
];
```

- [ ] **Step 2: Add the grain render program**

One program, drawn twice: into the 128² density buffer, and onto the screen. In `shaders.ts`:

```ts
export const GRAIN_VS = `#version 300 es
    uniform sampler2D uG;
    uniform vec2 uGTex;
    uniform float uPointSize;
    // Target rect in clip space: xy = centre, zw = half-size. (0,0,1,1) fills
    // the target, which is what the density pass wants.
    uniform vec4 uRect;
    void main() {
      float i = float(gl_VertexID);
      vec2 t = (vec2(mod(i, uGTex.x), floor(i / uGTex.x)) + 0.5) / uGTex;
      vec2 p = texture(uG, t).xy;
      gl_Position = vec4(uRect.xy + (p * 2.0 - 1.0) * uRect.zw, 0.0, 1.0);
      gl_PointSize = uPointSize;
    }`;

export const GRAIN_POINT_FS = `#version 300 es
    precision highp float;
    out vec4 fragColor;
    uniform vec4 uInk;
    void main() {
      vec2 d = gl_PointCoord - 0.5;
      if (dot(d, d) > 0.25) discard;
      fragColor = uInk;
    }`;

export const GRAIN_RENDER_UNIFORMS = [
  'uG',
  'uGTex',
  'uPointSize',
  'uRect',
  'uInk',
];
```

- [ ] **Step 3: Allocate the grain and density buffers**

In `build()`: create `gTex[0]`, `gTex[1]` at `GRAIN_TEX` via `mkFloatTex`, with framebuffers; create `densTex`/`densFb` at `GRID` (RGBA16F is ample for a density count) and **delete the 1×1 `densTx` stand-in from Task 3**, pointing the step pass at `densTex` instead.

Add a scatter that seeds the grain texture uniformly inside the plate:

```ts
  /**
   * Sand, scattered evenly. Called on init and whenever the boundary changes.
   * Rejection-sampled against the mask so no grain starts outside the plate,
   * where it would spend its first seconds bouncing off the lip.
   */
  protected scatterGrains(): void {
    const gl = this.gl!;
    const n = GRAIN_TEX * GRAIN_TEX;
    const data = new Float32Array(n * 4);
    const g = boundaryCanvas(this.maskKind as 0 | 1 | 2).getContext('2d')!;
    const img = g.getImageData(0, 0, GRID, GRID).data;
    const inside = (x: number, y: number) =>
      img[(Math.min(GRID - 1, Math.floor(y * GRID)) * GRID +
           Math.min(GRID - 1, Math.floor(x * GRID))) * 4] > 127;
    for (let i = 0; i < n; i++) {
      let x = 0.5;
      let y = 0.5;
      for (let k = 0; k < 40; k++) {
        x = Math.random();
        y = Math.random();
        if (inside(x, y)) break;
      }
      data[i * 4] = x;
      data[i * 4 + 1] = y;
    }
    for (const tx of this.gTex) {
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, GRAIN_TEX, GRAIN_TEX, gl.RGBA, gl.FLOAT, data);
    }
  }
```

`texSubImage2D` with `gl.FLOAT` only matches the 32F path, so the 16F fallback needs the data
converted. Add the float-to-half packer next to it and branch on `float32Ok`:

```ts
/**
 * IEEE-754 binary32 to binary16. The inverse of caustics-pool's h2f, needed
 * because a 16F texture will not accept a Float32Array upload.
 * Grain positions are in [0,1] and velocities are small, so neither subnormals
 * nor overflow are reachable here; the simple path is the correct one.
 */
function f2h(v: number): number {
  const f = new Float32Array(1);
  const i = new Int32Array(f.buffer);
  f[0] = v;
  const x = i[0];
  const sign = (x >> 16) & 0x8000;
  let exp = ((x >> 23) & 0xff) - 127 + 15;
  const man = (x >> 13) & 0x3ff;
  if (exp <= 0) return sign;
  if (exp >= 31) return sign | 0x7c00;
  return sign | (exp << 10) | man;
}
```

and in `scatterGrains`, replacing the upload:

```ts
for (const tx of this.gTex) {
  gl.bindTexture(gl.TEXTURE_2D, tx);
  if (this.float32Ok) {
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      GRAIN_TEX,
      GRAIN_TEX,
      gl.RGBA,
      gl.FLOAT,
      data
    );
  } else {
    const half = new Uint16Array(data.length);
    for (let i = 0; i < data.length; i++) half[i] = f2h(data[i]);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      GRAIN_TEX,
      GRAIN_TEX,
      gl.RGBA,
      gl.HALF_FLOAT,
      half
    );
  }
}
```

Verify the fallback rather than assuming it: force `this.float32Ok = false` once and confirm the
sand still scatters inside the plate.

Call `scatterGrains()` from `ensureMask` after the clear, so a boundary change re-scatters.

- [ ] **Step 4: Run the grain pass and draw the sand**

In `onUpdate`, after the substep loop and before the display draw:

```ts
// Grains step once per frame, not per substep: the throw is driven by the
// envelope, which is a slow field by construction.
gl.bindFramebuffer(gl.FRAMEBUFFER, this.gFb[1 - this.gi]);
gl.viewport(0, 0, GRAIN_TEX, GRAIN_TEX);
gl.useProgram(this.grainProg);
bindTex(0, this.gTex[this.gi]);
bindTex(1, this.wTex[this.wi]);
bindTex(2, this.maskTx);
gl.uniform1i(this.grainL.uG!, 0);
gl.uniform1i(this.grainL.uW!, 1);
gl.uniform1i(this.grainL.uMask!, 2);
gl.uniform2f(this.grainL.uGrid!, GRID, GRID);
gl.uniform2f(this.grainL.uGTex!, GRAIN_TEX, GRAIN_TEX);
gl.uniform1f(this.grainL.uDt!, dt);
// omega is radians per step; square it in radians per second so it pairs
// with a dt that is also in seconds.
const omegaS = omega / STEP;
gl.uniform1f(this.grainL.uOmega2!, omegaS * omegaS);
gl.uniform1f(this.grainL.uThresh!, Number(controls.threshold));
gl.uniform1f(this.grainL.uDrift!, Number(controls.drift));
gl.uniform1f(this.grainL.uJitter!, Number(controls.jitter));
gl.uniform1f(this.grainL.uFriction!, 6.0);
gl.uniform1f(this.grainL.uSeed!, this.frame++ % 4096);
gl.uniform1f(this.grainL.uPourLo!, 0.0);
gl.uniform1f(this.grainL.uPourHi!, 0.0); // no pour until Task 8
gl.uniform1f(this.grainL.uPourR!, 0.05);
gl.uniform2f(this.grainL.uPourAt!, 0.5, 0.5);
gl.drawArrays(gl.TRIANGLES, 0, 3);
this.gi = 1 - this.gi;
```

Then draw the sand to the screen after the display fullscreen draw:

```ts
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.useProgram(this.grainRenderProg);
bindTex(0, this.gTex[this.gi]);
gl.uniform1i(this.grainRenderL.uG!, 0);
gl.uniform2f(this.grainRenderL.uGTex!, GRAIN_TEX, GRAIN_TEX);
gl.uniform1f(this.grainRenderL.uPointSize!, Math.max(1.5, 2.0 * dpr));
// The plate rect is in screen uv and clip space is uv * 2 - 1, so the
// HALF-SIZE scales by 2 as well as the centre. Passing rect[2] unscaled
// draws the sand at half the plate's size, neatly centred, which looks
// plausible enough to miss.
gl.uniform4f(
  this.grainRenderL.uRect!,
  rect[0] * 2 - 1,
  rect[1] * 2 - 1,
  rect[2] * 2,
  rect[3] * 2
);
gl.uniform4f(
  this.grainRenderL.uInk!,
  pal.sand[0],
  pal.sand[1],
  pal.sand[2],
  0.85
);
gl.drawArrays(gl.POINTS, 0, GRAIN_N);
gl.disable(gl.BLEND);
```

A VAO must be bound for `drawArrays` in WebGL2 even with no attributes; create one empty VAO in `build()` and bind it once.

- [ ] **Step 5: Verify in the Lab — and tune**

Set **View** to Deflection so the sand is legible against the plate.

Expected on first run: sand visible, and **moving**. Then tune, one control at a time, recording what each does before touching the next:

1. **`Throw Threshold`.** Too low and every grain moves forever, never settling. Too high and nothing moves at all. Find the value where grains in the bright regions move and grains in the dark regions stop.
2. **`Drift`.** Controls how directly grains head downhill. Too high and they shoot to the lines and overshoot; too low and jitter dominates and no figure forms.
3. **`Jitter`.** Enough to unstick grains from local minima, not enough to smear the lines.

**Change one at a time.** A change that works is not evidence for the story you told about why it works, and the ratios here are coupled enough that moving two together will attribute the result to whichever one you had in mind.

**Expected failure mode, and it is a real fork:** the response amplitude varies a lot across a three-octave sweep, so a single absolute threshold may leave most of the band either dead or saturated. If so, the documented fallback is to normalize the threshold by the plate's mean envelope — the 1×1 reduction Task 9 adds is the same measurement, so it is nearly free. That is an **auto-gain and a real deviation from the physics**; take it only if the absolute threshold genuinely does not work across the band, and if you take it, say so in the code comment rather than describing it as physical.

Update the manifest defaults to whatever the tuning landed on.

- [ ] **Step 6: Commit**

```bash
git add packages/flateralus-pixi-animations/src/chladni-plate
git commit -m "feat(chladni-plate): throw sand off the plate"
```

---

## Task 6: Close the loop

**Files:**

- Modify: `.../chladni-plate/chladniPlateAnimation.ts`

- [ ] **Step 1: Render grains into the density buffer**

Before the display draw, using the same `grainRenderProg` with different uniforms:

```ts
// Sand mass-loads the plate. The step pass samples this, so the figure
// changes the plate that built it — the loop closure, for one texture
// read inside the integrator and no GPU->CPU sync at all.
gl.bindFramebuffer(gl.FRAMEBUFFER, this.densFb);
gl.viewport(0, 0, GRID, GRID);
gl.clearColor(0, 0, 0, 1);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.enable(gl.BLEND);
gl.blendFunc(gl.ONE, gl.ONE);
gl.useProgram(this.grainRenderProg);
bindTex(0, this.gTex[this.gi]);
gl.uniform1i(this.grainRenderL.uG!, 0);
gl.uniform2f(this.grainRenderL.uGTex!, GRAIN_TEX, GRAIN_TEX);
gl.uniform1f(this.grainRenderL.uPointSize!, 1.0);
gl.uniform4f(this.grainRenderL.uRect!, 0.0, 0.0, 1.0, 1.0);
// 65,536 grains over 16,384 cells averages four per cell, so 0.25 per
// grain puts a typical cell at a density of 1.0.
gl.uniform4f(this.grainRenderL.uInk!, 0.25, 0.0, 0.0, 1.0);
gl.drawArrays(gl.POINTS, 0, GRAIN_N);
gl.disable(gl.BLEND);
```

The step pass already samples `uDens` (Task 3, Step 2) — point it at `densTex` and the closure is live.

Note ordering: the substeps run before this, so the integrator reads the _previous_ frame's density. That is correct and deliberate — mass loading is a slow effect. Do not re-render grains per substep to "fix" it.

- [ ] **Step 2: Verify in the Lab**

With a figure formed, sweep **Sand Load** from 0 to 4.

Expected: at 0, nothing changes. As it rises, the lines should **thicken and drift slightly**, and at high values the figure should become unstable — sand piles up, detunes the mode underneath itself, and the pattern reorganizes. That instability at the top of the range is the loop working, not a bug.

If nothing at all changes at load 4, the density buffer is empty: check the blend mode is `ONE, ONE`, that the clear happens before the draw, and that `uDens` is bound to `densTex` and not the Task 3 stand-in.

Set the default to the highest value that still holds a stable figure.

- [ ] **Step 3: Commit**

```bash
git add packages/flateralus-pixi-animations/src/chladni-plate
git commit -m "feat(chladni-plate): let the sand load the plate"
```

---

## Task 7: The hunt

**Files:**

- Modify: `.../chladni-plate/chladniPlateAnimation.ts`

- [ ] **Step 1: Take the drive from the cursor**

Replace Task 3's `driveOmega(0.5)`:

```ts
const interactive = Number(controls.mode) > 0.5;
const mouse = this.pointer?.mouse;
if (interactive && mouse?.active) {
  this.cx = mouse.x / sw;
  this.cy = 1 - mouse.y / sh;
}
const omega = driveOmega(this.cx);
const drive =
  Number(controls.drive) * (interactive ? 0.25 + 1.75 * this.cy : 1);
```

with `protected cx = 0.5; protected cy = 0.6;` as fields, reset in `onInit`. The cursor position persists when the pointer leaves, so the plate holds its tone rather than snapping back.

- [ ] **Step 2: Pour on click**

```ts
// Ring pointer over the grain texture: each pour recycles the oldest
// sand rather than adding more, so the plate's total never changes.
let pourLo = 0;
let pourHi = 0;
const clicks = this.pointer?.clicks;
if (interactive && clicks?.length) {
  const c = clicks.shift()!;
  // See Step 2's toPlateUV below: a click that misses the plate pours nothing.
  clicks.length = 0;
}
```

Add `protected pourAt = 0; protected pourX = 0.5; protected pourY = 0.5;` and the inverse of
`plateRect`, so a click in screen uv lands in plate uv:

```ts
  /** Screen uv to plate uv. Returns null for a click that missed the plate. */
  protected toPlateUV(
    x: number,
    y: number,
    rect: [number, number, number, number]
  ): [number, number] | null {
    const p: [number, number] = [
      (x - rect[0]) / rect[2] * 0.5 + 0.5,
      (y - rect[1]) / rect[3] * 0.5 + 0.5,
    ];
    if (p[0] < 0 || p[0] > 1 || p[1] < 0 || p[1] > 1) return null;
    return p;
  }
```

and use it in the click branch, abandoning the pour rather than advancing the ring pointer when
the click misses:

```ts
const hit = this.toPlateUV(c.x / sw, 1 - c.y / sh, rect);
if (hit) {
  pourLo = this.pourAt;
  this.pourAt = (this.pourAt + 0.06) % 1; // a handful
  pourHi = this.pourAt;
  this.pourX = hit[0];
  this.pourY = hit[1];
}
```

Feed `pourLo`, `pourHi` and `(this.pourX, this.pourY)` into the grain pass's `uPourLo`,
`uPourHi` and `uPourAt` uniforms, replacing Task 5's hardcoded zeros.

- [ ] **Step 3: Verify in the Lab**

- Moving the cursor left to right must sweep the tone. Park at various x and wait a second or two — most positions give mush, and some snap into a clear figure. **Confirm you can find at least four distinct figures** across the travel; if you cannot, the drive band is wrong and the fix is `OMEGA_MIN`/`OMEGA_MAX` in `physics.ts`, not the grain tuning.
- Moving the cursor up must visibly drive the plate harder.
- Clicking must drop a visible pile that then crawls outward onto the lines. Click repeatedly in different places — the total amount of sand must not grow.
- Click outside the plate: nothing should happen.

- [ ] **Step 4: Commit**

```bash
git add packages/flateralus-pixi-animations/src/chladni-plate
git commit -m "feat(chladni-plate): hunt the tone with the cursor"
```

---

## Task 8: The ambient search

**Files:**

- Modify: `.../chladni-plate/chladniPlateAnimation.ts`

- [ ] **Step 1: Measure the plate's total response**

```ts
  /**
   * Mean envelope over the whole plate, via a mipmap reduction to 1x1.
   *
   * This is the animation's only GPU->CPU sync, it happens once every ten
   * frames, and the scene degrades to a constant-rate sweep if the driver
   * will not hand back a readable format. Probe once and cache the verdict —
   * the readback format is a property of the attachment.
   */
  protected readMeanEnvelope(): number | null {
    const gl = this.gl!;
    if (this.readMode === 'none') return null;
    try {
      const tx = this.wTex[this.wi]!;
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);

      // GRID is 128, so the 1x1 level is log2(128) = 7.
      const top = Math.log2(GRID);
      if (!this.meanFb) this.meanFb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.meanFb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tx, top);

      if (this.readMode === null) {
        const t = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);
        const f = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT);
        this.readMode =
          f === gl.RGBA && t === gl.FLOAT
            ? 'float'
            : f === gl.RGBA && t === gl.HALF_FLOAT
              ? 'half'
              : 'none';
      }
      let mean: number;
      if (this.readMode === 'float') {
        const b = new Float32Array(4);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, b);
        mean = b[2];                       // .z is the envelope
      } else if (this.readMode === 'half') {
        const b = new Uint16Array(4);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.HALF_FLOAT, b);
        mean = h2f(b[2]);
      } else {
        mean = Number.NaN;
      }

      // Leaving the field on a mipmapped filter would change how every other
      // pass samples it, so put it back before returning.
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return Number.isFinite(mean) ? mean : null;
    } catch {
      this.readMode = 'none';
      return null;
    }
  }
```

Add `protected meanFb: WebGLFramebuffer | null = null;`, delete it in `onDestroy`, and copy
`h2f` from `caustics-pool:837` into this file — half-float comes back as a `Uint16Array` and
needs decoding.

Two things that will bite: `generateMipmap` on a float texture needs `OES_texture_float_linear`
(already probed as `float32Ok`) and may silently no-op without it, so if `mean` comes back as a
single corner texel rather than an average, fall back to `readMode = 'none'` and the constant-rate
sweep. And the mipmap is regenerated from whichever buffer `wi` points at that frame, which is
correct — the alternative, caching it, would read a field up to ten frames stale.

- [ ] **Step 2: Sweep, slowing where it finds something**

```ts
if (!interactive) {
  this.searchT++;
  if (this.searchT % 10 === 0) {
    const m = this.readMeanEnvelope();
    // Slow where the plate answers. A measured quantity driving the
    // search, not a list of dwell points someone wrote down.
    if (m !== null) this.resp = this.resp * 0.7 + m * 0.3;
  }
  const ref = Math.max(1e-6, this.respRef);
  this.respRef = Math.max(this.respRef * 0.999, this.resp);
  const slow = 1 / (1 + 6 * Math.min(1, this.resp / ref));
  this.cx += Number(controls.sweep) * 0.012 * slow * dt * this.sweepDir;
  if (this.cx > 1) {
    this.cx = 1;
    this.sweepDir = -1;
  }
  if (this.cx < 0) {
    this.cx = 0;
    this.sweepDir = 1;
  }
}
```

Add `protected searchT = 0; protected resp = 0; protected respRef = 1e-6; protected sweepDir = 1;` and reset all four in `onInit`.

The sweep must be slow. Build-up takes roughly the ring-down time, so a sweep that crosses a resonance faster than a few seconds never rings it — `0.012` per second at `sweep = 1` crosses the full band in about 80 s, which is the right order.

- [ ] **Step 3: Verify in the Lab**

Switch **Mode** to Ambient and watch for two full minutes. Expected: the tone drifts, figures form and dissolve, and the drift visibly **slows** while a figure is holding. Confirm the readback is not costing frame time — if it is, raise the interval from 10 frames.

Then force the degraded path: temporarily `return null` from `readMeanEnvelope` and confirm the sweep still runs at a constant rate and the toy still works.

- [ ] **Step 4: Commit**

```bash
git add packages/flateralus-pixi-animations/src/chladni-plate
git commit -m "feat(chladni-plate): make the ambient sweep search"
```

---

## Task 9: The look

**Files:**

- Modify: `.../chladni-plate/shaders.ts` (`DISPLAY_FS`)
- Modify: `.../chladni-plate/manifest.ts` (remove the debug `view` control)

- [ ] **Step 1: Replace the debug view with real shading**

The plate is lit from its own gradient, so the surface visibly moves:

```glsl
        vec2 px = 1.0 / uGrid;
        float c = texture(uW, p).x;
        vec2 gw = vec2(
          texture(uW, p + vec2(px.x, 0.0)).x - texture(uW, p - vec2(px.x, 0.0)).x,
          texture(uW, p + vec2(0.0, px.y)).x - texture(uW, p - vec2(0.0, px.y)).x
        ) * 0.5;
        vec3 n = normalize(vec3(-gw * uBump, 1.0));
        vec3 lite = normalize(vec3(-0.45, 0.6, 0.75));
        float spec = pow(max(0.0, dot(reflect(-lite, n), vec3(0.0, 0.0, 1.0))), 28.0);
        // Seeing the plate itself move is what sells that the sand is
        // responding to something real rather than being animated into shape.
        vec3 plate = uPlate * (0.75 + 0.35 * max(0.0, dot(n, lite))) + uEdge * spec * 0.9;
        // A soft base under the crisp points, so piles read as depth rather
        // than as denser stippling.
        float pile = clamp(texture(uDens, p).x * 0.6, 0.0, 1.0);
        plate = mix(plate, uSand * 0.75, pile);
        col = mix(col, plate, body);
```

Add `uDens`, `uSand`, `uBump`, `uGrid` uniforms to the display program and its uniform list. Delete `uShow` and `uView` and the `view` control.

- [ ] **Step 2: Check every palette with the effect running**

Switch through all three tints with a figure formed and the plate ringing. The shimmer is additive and needs luminance headroom; **a palette that kills it gets cut, not shipped**. Adjust the `TINTS` table until all three hold both the shimmer and the sand contrast, or reduce the list.

- [ ] **Step 3: Write the blurb**

Use the `bb-voice` skill for the registry blurb — the Lab inspector renders it as written copy, and `registry.test.ts` requires more than 40 characters. Replace the Task 2 placeholder.

- [ ] **Step 4: Full verification pass**

```bash
npx vitest run
npm run lint:check
npm run dev --workspace=@bracketbear/bracketbear-website
```

In the Lab, confirm all of:

- Loads onto a ringing plate with sand already migrating, in both modes.
- All three boundaries work and produce different figures; switching re-scatters the sand.
- Interactive: sweeping finds figures; clicking pours; driving harder moves more sand.
- Ambient: the search runs and slows on resonance.
- Resize: the plate stays square, the field is **not** cleared, and the figure survives.
- Randomize-all in the inspector several times: no blow-up, no NaN, no white screen.
- Switch to another animation and back: no leak, no context loss warning in the console.

- [ ] **Step 5: Commit**

```bash
git add packages/flateralus-pixi-animations/src apps/bracketbear-website/src/components/lab
git commit -m "feat(chladni-plate): light the plate from its own gradient"
```

---

## Notes for whoever executes this

**The spec's risk list is real and Task 4 is where two of the three surface.** If the envelope shows no nodal structure, do not proceed into the grain tasks hoping the sand will reveal it. It will not — the grains only read what the envelope contains.

**Report a half-float finding as a finding.** If RGBA16F visibly degrades the biharmonic, the correct response is to say so and require 32F, not to add damping until the noise stops. Damping that hides numerical noise also flattens the figure.

**The tuning constants in `manifest.ts` are first guesses.** Every one of `threshold`, `drift`, `jitter` and `load` is expected to move. What is not expected to move is the mechanism they parameterize.
