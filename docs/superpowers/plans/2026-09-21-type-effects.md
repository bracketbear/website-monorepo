# Type Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `10 · Type` shelf in the Animation Lab holding four GLSL effects — Off Register, Aspic, Frost Line, Slow Burn — each of which sets whatever phrase is typed into it.

**Architecture:** Every effect is split in two. A pure-TS **sim mirror** (`<name>.sim.ts`) owns the constants and the step, has no DOM or GL in it, and is tested headlessly. The **animation** (`<name>Animation.ts`) ports that step to GLSL line for line, interpolating the same exported constants into the shader source, and adds the display pass. Off Register is a single fragment pass on `HarnessShaderAnimation` with its state on the CPU; the other three are `PixiAnimation` + the shared `PingPong`, following `rd-vat`.

**Tech Stack:** TypeScript, WebGL2 (GLSL ES 3.00), PIXI v8, `@bracketbear/flateralus` manifests, vitest from the repo root, prettier + eslint via lint-staged on commit.

**Spec:** `docs/superpowers/specs/2026-09-21-type-effects-design.md`

## Global Constraints

- Package `packages/flateralus-pixi-animations`; one directory per effect under `src/`: `off-register/`, `aspic/`, `frost-line/`, `slow-burn/`.
- **The tests are the contract; the constants are not.** Spec targets (settle times, fill fraction, front speeds) are asserted in `*.sim.test.ts`. If a test fails, tune the constants in the mirror until it passes. Do not loosen an assertion without writing down why in the test.
- The GLSL step must be a port of the mirror's step, with constants interpolated from the mirror's exports (`${C2.toFixed(6)}`), never retyped.
- Fixed timestep with a capped accumulator everywhere. No wall-clock time in any step. Any forcing clock is a step counter.
- Grid convention: row 0 is the **bottom** of the stage (GL uv), index `i + j * gw`.
- All four take `phrase` (`type: 'text'`, `maxLength: 64`) through `phraseMask(text)`. `phraseMask` returns null until Anton loads — keep asking each frame, never cache the null. A phrase change re-seeds.
- All controls `debug: true`. Numeric `select` values read back as numbers: `Number(controls.stage) > 0.5`.
- Reduced motion: read `prefersReducedMotion()` at seed time. Under it, open settled and multiply pointer input by `REDUCED_INPUT_SCALE`.
- Default phrases: Off Register `LEAVE A GREAT IMPRESSION.`, Aspic `SHIPPING NOW`, Frost Line `THE WORK`, Slow Burn `DELETE ON SIGHT`.
- Tests: `npx vitest run packages/flateralus-pixi-animations/src/<dir>/`. Types: `npm run type-check --workspace=@bracketbear/flateralus-pixi-animations`. The lab serves `dist`: `npm run build --workspace=@bracketbear/flateralus-pixi-animations` before looking.
- Look at it with the headless playwright loop (Task 3, Step 6), not a Chrome MCP tab — a background tab gets no `requestAnimationFrame`.
- One commit per task, in the repo's style: `feat(off-register): <what the heading does now>`.
- Registry blurbs are brand copy: write them with the `bb-voice` skill.

---

## File map

| File                                                      | Responsibility                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/shared/reduced-motion.ts`                            | `prefersReducedMotion()`, `REDUCED_INPUT_SCALE`.                                     |
| `src/shared/mask-grid.ts`                                 | Letterbox maths, alpha → bottom-up `Float32Array`, canvas rasterize, GL mask upload. |
| `src/shared/mask-grid.test.ts`                            | Letterbox and the row flip.                                                          |
| `src/off-register/offRegister.sim.ts`                     | Plate spring–damper, energy, rest test, knock, drag.                                 |
| `src/off-register/offRegisterAnimation.ts`                | Manifest, halftone/overprint shader, sleep-at-rest.                                  |
| `src/aspic/aspic.sim.ts`                                  | Navier–Cauchy step on a small grid, pinned base, poke, energy.                       |
| `src/aspic/aspicAnimation.ts`                             | Manifest, sim + display shaders, drop-in, analytic sleep.                            |
| `src/frost-line/frostLine.sim.ts`                         | Hex-offset Reiter growth, conservative diffusion, seeding, melt.                     |
| `src/frost-line/frostLineAnimation.ts`                    | Manifest, sim + display shaders, fingertip.                                          |
| `src/slow-burn/slowBurn.sim.ts`                           | Fuel/temperature/peak/char step, ignite, fan.                                        |
| `src/slow-burn/slowBurnAnimation.ts`                      | Manifest, sim + display shaders, Planck colour, fresh sheet.                         |
| `src/<dir>/<name>.sim.test.ts`                            | The spec's assertions for that effect.                                               |
| `src/<dir>/index.ts`, `src/index.ts`                      | Exports.                                                                             |
| `apps/bracketbear-website/src/components/lab/sections.ts` | The `'type'` key.                                                                    |
| `apps/bracketbear-website/src/components/lab/registry.ts` | Four entries.                                                                        |
| `docs/lab/TOY-IDEAS.md`                                   | Frost and Ember status.                                                              |

---

### Task 1: The shelf and the shared helpers

**Files:** Create `src/shared/reduced-motion.ts`, `src/shared/mask-grid.ts`, `src/shared/mask-grid.test.ts`. Modify `apps/bracketbear-website/src/components/lab/sections.ts`.

**Interfaces — Produces:**

```ts
// reduced-motion.ts
export const REDUCED_INPUT_SCALE = 0.35;
export function prefersReducedMotion(): boolean;

// mask-grid.ts
/** [x, y, w, h] of a srcW×srcH image letterboxed at `scale` in a gw×gh grid. */
export function letterbox(
  srcW: number,
  srcH: number,
  gw: number,
  gh: number,
  scale: number
): [number, number, number, number];
/** Alpha of top-down RGBA bytes as a bottom-up 0..1 grid. */
export function alphaToGrid(
  rgba: Uint8ClampedArray,
  gw: number,
  gh: number
): Float32Array;
/** Rasterize `mask` letterboxed into a gw×gh grid. Needs a real canvas. */
export function maskToGrid(
  mask: HTMLCanvasElement,
  gw: number,
  gh: number,
  scale: number
): Float32Array;
/** Upload a mask canvas as an RGBA8 LINEAR/CLAMP texture on `unit`; reuses `into` if given. */
export function uploadMask(
  gl: WebGL2RenderingContext,
  mask: HTMLCanvasElement,
  unit: number,
  into?: WebGLTexture | null
): WebGLTexture;
```

- [ ] **Step 1: Failing test** — `mask-grid.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { letterbox, alphaToGrid } from './mask-grid';

describe('letterbox', () => {
  it('fits a wide image to the grid width and centres it', () => {
    const [x, y, w, h] = letterbox(1600, 400, 200, 100, 1);
    expect(w).toBeCloseTo(200);
    expect(h).toBeCloseTo(50);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(25);
  });
  it('fits a tall image to the grid height', () => {
    const [x, , w, h] = letterbox(100, 400, 200, 100, 1);
    expect(h).toBeCloseTo(100);
    expect(w).toBeCloseTo(25);
    expect(x).toBeCloseTo(87.5);
  });
  it('applies scale about the centre', () => {
    const [x, y, w, h] = letterbox(200, 100, 200, 100, 0.5);
    expect([x, y, w, h]).toEqual([50, 25, 100, 50]);
  });
});

describe('alphaToGrid', () => {
  it('flips rows so index 0 is the bottom of the image', () => {
    // 1×2 image: top pixel opaque, bottom pixel clear.
    const rgba = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 0]);
    const g = alphaToGrid(rgba, 1, 2);
    expect(g[0]).toBe(0); // bottom
    expect(g[1]).toBe(1); // top
  });
});
```

- [ ] **Step 2:** Run `npx vitest run packages/flateralus-pixi-animations/src/shared/mask-grid.test.ts` — FAIL, module not found.
- [ ] **Step 3: Implement** `mask-grid.ts`:

```ts
export function letterbox(
  srcW: number,
  srcH: number,
  gw: number,
  gh: number,
  scale: number
): [number, number, number, number] {
  const ar = srcW / srcH;
  const w = Math.min(gw, gh * ar) * scale;
  const h = w / ar;
  return [(gw - w) / 2, (gh - h) / 2, w, h];
}

export function alphaToGrid(
  rgba: Uint8ClampedArray,
  gw: number,
  gh: number
): Float32Array {
  const out = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) {
    const src = (gh - 1 - j) * gw;
    for (let i = 0; i < gw; i++)
      out[i + j * gw] = rgba[(src + i) * 4 + 3] / 255;
  }
  return out;
}

export function maskToGrid(
  mask: HTMLCanvasElement,
  gw: number,
  gh: number,
  scale: number
): Float32Array {
  const cv = document.createElement('canvas');
  cv.width = gw;
  cv.height = gh;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  const [x, y, w, h] = letterbox(mask.width, mask.height, gw, gh, scale);
  g.imageSmoothingQuality = 'high';
  g.drawImage(mask, x, y, w, h);
  return alphaToGrid(g.getImageData(0, 0, gw, gh).data, gw, gh);
}

export function uploadMask(
  gl: WebGL2RenderingContext,
  mask: HTMLCanvasElement,
  unit: number,
  into?: WebGLTexture | null
): WebGLTexture {
  const tx = into ?? gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.activeTexture(gl.TEXTURE0);
  return tx;
}
```

and `reduced-motion.ts`:

```ts
/** Pointer input is scaled by this under prefers-reduced-motion. */
export const REDUCED_INPUT_SCALE = 0.35;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}
```

- [ ] **Step 4:** Tests PASS.
- [ ] **Step 5:** `sections.ts` — add `| 'type'` to `SectionKey`, `{ key: 'type', label: '10 · Type' }` to `SECTIONS`, `case 'type':` beside `'toys'` in `sectionBackground`, and `|| key === 'type'` in `isDarkSection`. Type-check the website app.
- [ ] **Step 6:** Commit `feat(lab): a type shelf, and the helpers its effects share`.

---

### Task 2: Off Register — the plates

**Files:** Create `src/off-register/offRegister.sim.ts`, `offRegister.sim.test.ts`.

**Interfaces — Produces:**

```ts
export const K = 361; // kg/s²
export const C = 13.3; // kg/s
export const STEP = 1 / 120;
export const MASSES = [1, 1.6, 2.4] as const; // key, orange, sun
export interface Plate {
  x: number;
  y: number;
  a: number;
  vx: number;
  vy: number;
  va: number;
  m: number;
  rx: number;
  ry: number;
  ra: number;
}
export function makePlates(register: number): Plate[]; // rest poses fan out by `register` px
export function scatter(
  plates: Plate[],
  rng: () => number,
  px: number,
  rad: number
): void; // displace, zero velocity
export function knock(
  plates: Plate[],
  rng: () => number,
  v: number,
  w: number
): void; // impulses
export function drag(p: Plate, pvx: number, pvy: number, grip: number): void; // viscous coupling to pointer velocity, one STEP
export function stepPlate(p: Plate): void;
export function energy(p: Plate): number;
export function atRest(plates: Plate[], eps?: number): boolean;
export const settleTime: (m: number) => number; // 8m/C
```

Angle is carried in the same units as position by a fixed lever arm `ARM = 400` px (`a` is radians; energy and the spring use `a * ARM`), so one `K`/`C` pair serves both.

- [ ] **Step 1: Failing tests:**

```ts
import { describe, it, expect } from 'vitest';
import {
  C,
  MASSES,
  STEP,
  atRest,
  energy,
  knock,
  makePlates,
  scatter,
  settleTime,
  stepPlate,
} from './offRegister.sim';

const lcg =
  (s = 1) =>
  () =>
    (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
const run = (p: ReturnType<typeof makePlates>[number], secs: number) => {
  for (let i = 0; i < Math.round(secs / STEP); i++) stepPlate(p);
};

describe('off-register plates', () => {
  it('settle in mass order, at 8m/C', () => {
    expect(MASSES.map(settleTime)).toEqual(MASSES.map((m) => (8 * m) / C));
    for (const [i, m] of MASSES.entries()) {
      const p = makePlates(3)[i];
      p.x = p.rx + 40;
      const e0 = energy(p);
      run(p, settleTime(m));
      // Energy envelope is e^(-Ct/m); at t = 8m/C that is e^-8.
      const ratio = energy(p) / e0;
      expect(ratio, `mass ${m}`).toBeLessThan(Math.exp(-6.5));
      expect(ratio, `mass ${m}`).toBeGreaterThan(Math.exp(-9.5));
    }
  });

  it('never gains energy on its own', () => {
    const plates = makePlates(3);
    scatter(plates, lcg(7), 60, 0.12);
    for (const p of plates) {
      let last = energy(p);
      for (let k = 0; k < 30; k++) {
        run(p, 0.1);
        const e = energy(p);
        expect(e).toBeLessThanOrEqual(last * 1.001);
        last = e;
      }
    }
  });

  it('returns to its rest pose after a knock, and says so', () => {
    const plates = makePlates(3);
    knock(plates, lcg(3), 900, 2);
    expect(atRest(plates)).toBe(false);
    for (const p of plates) run(p, 4);
    expect(atRest(plates)).toBe(true);
    for (const p of plates) {
      expect(p.x).toBeCloseTo(p.rx, 1);
      expect(p.y).toBeCloseTo(p.ry, 1);
      expect(p.a).toBeCloseTo(p.ra, 3);
    }
  });

  it('rests with the plates fanned by `register`, and together at zero', () => {
    const d = (ps: ReturnType<typeof makePlates>) =>
      Math.hypot(ps[1].rx - ps[2].rx, ps[1].ry - ps[2].ry);
    expect(d(makePlates(0))).toBe(0);
    expect(d(makePlates(3))).toBeGreaterThan(2);
  });
});
```

- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3: Implement.** Semi-implicit Euler, velocity first:

```ts
const ARM = 400;
export function stepPlate(p: Plate): void {
  const s = STEP / p.m;
  p.vx += (-K * (p.x - p.rx) - C * p.vx) * s;
  p.vy += (-K * (p.y - p.ry) - C * p.vy) * s;
  p.va += ((-K * (p.a - p.ra) * ARM - C * p.va * ARM) * s) / ARM;
  p.x += p.vx * STEP;
  p.y += p.vy * STEP;
  p.a += p.va * STEP;
}
export function energy(p: Plate): number {
  const dx = p.x - p.rx,
    dy = p.y - p.ry,
    da = (p.a - p.ra) * ARM,
    wa = p.va * ARM;
  return (
    0.5 * p.m * (p.vx * p.vx + p.vy * p.vy + wa * wa) +
    0.5 * K * (dx * dx + dy * dy + da * da)
  );
}
export function atRest(plates: Plate[], eps = 0.02): boolean {
  return plates.every((p) => energy(p) < eps);
}
export function drag(p: Plate, pvx: number, pvy: number, grip: number): void {
  const s = (grip * STEP) / p.m;
  p.vx += (pvx - p.vx) * s;
  p.vy += (pvy - p.vy) * s;
}
```

`makePlates(r)`: key rests at `(0,0,0)`; orange at `(r, -r*0.6, 0)`; sun at `(-r*0.8, r*0.7, 0)`. `scatter` sets positions to rest ± `px`, angle ± `rad`, velocities 0. `knock` adds `v`-scaled random velocity and `w`-scaled angular velocity.

- [ ] **Step 4:** PASS. **Step 5:** Commit `feat(off-register): three plates on springs, the heavy ones landing last`.

---

### Task 3: Off Register — the print, and the registry

**Files:** Create `src/off-register/offRegisterAnimation.ts`, `index.ts`. Modify `src/index.ts`, lab `registry.ts`.

**Interfaces — Consumes:** Task 2 exports; `HarnessShaderAnimation`, `PRE`, `fitRect`, `phraseMask`. **Produces:** `createOffRegisterAnimation(initialControls?)`, `OffRegisterAnimation`.

- [ ] **Step 1: Manifest.** `id: 'off-register'`, `name: 'Off Register (GLSL)'`. Controls: `phrase`; `textScale` 0.5–0.95 (0.8); `register` 0–10 px (3); `pitch` 0.02–0.09 em (0.045); `grip` 0–30 (12); `knock` 200–2000 px/s (900); `grain`; `stage` select `{1: 'Cream stock', 0: 'Ink stock'}` default 1.
- [ ] **Step 2: Mask swap.** `HarnessShaderAnimation` uploads its mask once at context creation. Override `onUpdate`: when `controls.phrase` differs from the uploaded key and `phraseMask()` is non-null, `uploadMask(gl, mask, 0, ctx.texture)`, update `ctx.texWidth/texHeight`, `scatter` the plates (or not, under reduced motion), then call `super.onUpdate`. `mask()` returns `phraseMask(currentPhrase)`.
- [ ] **Step 3: Step the plates** in `setUniforms` with `acc = min(acc + dt, 4 * STEP)`. Pointer velocity from successive `mouse.x/y` over `dt`, clamped to 3000 px/s, × `REDUCED_INPUT_SCALE` if reduced; while the pointer is inside `uRect`, `drag(p, pvx, pvy, controls.grip)` each step. Each click: `knock(plates, Math.random, controls.knock, 2)`.
- [ ] **Step 4: Shader.** Extra uniforms `uP0 uP1 uP2` (vec3: x, y, angle), `uPitchPx`. Per plate `i`, screen angle `A_i` (key: none; orange 45°; sun 75°):

```glsl
vec2 plateUV(vec2 p, vec3 P) {            // stage px -> this plate's mask uv
  vec2 c = uRect.xy + uRect.zw * 0.5;
  vec2 q = p - c - P.xy;
  float s = sin(-P.z), k = cos(-P.z);
  q = vec2(k * q.x - s * q.y, s * q.x + k * q.y);
  return (q + uRect.zw * 0.5) / uRect.zw;
}
float tone(vec2 uv) {                     // low-passed mask: edges break into dots
  vec2 e = vec2(uPitchPx * 0.5) / uRect.zw;
  return (maskA(uv) * 2.0 + maskA(uv + vec2(e.x, 0.)) + maskA(uv - vec2(e.x, 0.))
        + maskA(uv + vec2(0., e.y)) + maskA(uv - vec2(0., e.y))) / 6.0;
}
float screen(vec2 p, vec3 P, float ang) { // dot coverage of one plate at stage px p
  vec2 uv = plateUV(p, P);
  float a = ang + P.z;                    // the screen turns with its plate
  vec2 q = p - P.xy;
  q = vec2(cos(a) * q.x + sin(a) * q.y, -sin(a) * q.x + cos(a) * q.y) / uPitchPx;
  float r = sqrt(tone(uv) * 0.82) * 0.7072;
  float aa = 0.75 / uPitchPx;
  return smoothstep(r + aa, r - aa, length(fract(q) - 0.5));
}
```

Cream stock: `col = cream; col *= mix(vec3(1), sunInk, screen(sun)); col *= mix(vec3(1), orangeInk, screen(orange)); col = mix(col, uInk, maskA(plateUV(p, uP0)));` — multiply is what overprinted ink on paper does. Ink stock: opaque layering, sun then orange then a cream key. The tint is 0.82, not solid, so the lattices stay open enough to beat against each other.

- [ ] **Step 5: Sleep.** Keep a `drawKey` string of plate rest flag, control values, `PAL` colours, stage size and mask key. In `onUpdate`, if `atRest(plates)`, no pointer inside the rect, no pending clicks, grain off or reduced, and `drawKey` unchanged since the last draw: return before `super.onUpdate`. (Film grain animates; with `grain` on the effect keeps drawing. Default `grain: false` for this effect so the default heading really does sleep.)
- [ ] **Step 6: Register and look.** Export from `src/index.ts`; add the registry entry (`section: 'type'`, `tag: 'glsl shader'`, blurb via `bb-voice`). Build the package, then drive the lab headlessly:

```js
// scratchpad/look.mjs — usage: node look.mjs <animation-id> [clickX clickY]
import { createRequire } from 'module';
const require = createRequire(
  process.env.HOME + '/Projects/federato-front-end/node_modules/'
);
const { chromium } = require('playwright');
const [id, cx, cy] = process.argv.slice(2);
const b = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const pg = await b.newPage({ viewport: { width: 1600, height: 1400 } });
pg.on('console', (m) => m.type() === 'error' && console.log('ERR', m.text()));
await pg.goto(`http://localhost:4321/lab?animation=${id}`);
for (const [i, t] of [300, 900, 1800, 4000].entries()) {
  await pg.waitForTimeout(i ? t - [300, 900, 1800, 4000][i - 1] : t);
  await pg.screenshot({ path: `${id}-${t}.png` });
}
if (cx) {
  await pg.mouse.click(+cx, +cy);
  await pg.waitForTimeout(250);
  await pg.screenshot({ path: `${id}-click.png` });
}
await b.close();
```

Read the screenshots. Check: no console errors; plates visibly apart at 300 ms and home by 1800; dots round, not aliased; moiré visible where orange and sun overlap outside the key; both stocks; a click knocks them.

- [ ] **Step 7:** Commit `feat(off-register): a heading printed in three passes that have not quite lined up`.

---

### Task 4: Aspic — the gel

**Files:** Create `src/aspic/aspic.sim.ts`, `aspic.sim.test.ts`.

**Interfaces — Produces:**

```ts
export const SPS = 480; // steps per second
export const CP2 = 0.325; // (P-wave cells/step)² — 0.57 cells/step, under the 0.707 CFL bound
export const CS2 = 0.16; // (S-wave cells/step)²
export const W2: number; // (ω₀/SPS)², ω₀ ≈ 18.2 rad/s
export const G: number; // γ/SPS, γ = 6.5 s⁻¹
export const SLEEP_AFTER: number; // 2·ln(1/1e-3)/γ seconds
export interface Gel {
  gw: number;
  gh: number;
  ux: Float32Array;
  uy: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
}
export function makeGel(gw: number, gh: number): Gel;
export function stepGel(g: Gel): void;
export function poke(
  g: Gel,
  ci: number,
  cj: number,
  r: number,
  fx: number,
  fy: number
): void; // adds velocity in a gaussian
export function drop(g: Gel, v: number): void; // the arrival: uniform downward velocity above the base
export function gelEnergy(g: Gel): number;
```

The step is Navier–Cauchy with a restoring spring and damping, in per-step units:
`a = CS2·∇²u + (CP2 − CS2)·∇(∇·u) − W2·u − G·v; v += a; u += v`. Row `j = 0` is pinned to zero; other edges clamp their neighbour index (free). `∂x∂y` is the four-corner difference over 4.

- [ ] **Step 1: Failing tests:**

```ts
import { describe, it, expect } from 'vitest';
import { SPS, drop, gelEnergy, makeGel, poke, stepGel } from './aspic.sim';

const GW = 96,
  GH = 60;
const at = (i: number, j: number) => i + j * GW;
const run = (
  g: ReturnType<typeof makeGel>,
  secs: number,
  each?: (k: number) => void
) => {
  for (let k = 0; k < Math.round(secs * SPS); k++) {
    stepGel(g);
    each?.(k);
  }
};

describe('aspic gel', () => {
  it('is stable for 10^4 steps after a hard poke', () => {
    const g = makeGel(GW, GH);
    poke(g, 48, 40, 5, 0.4, 0.2);
    for (let k = 0; k < 10000; k++) stepGel(g);
    expect(Number.isFinite(gelEnergy(g))).toBe(true);
    expect(gelEnergy(g)).toBeLessThan(1e-6);
  });

  it('loses energy, never gains it', () => {
    const g = makeGel(GW, GH);
    drop(g, 0.05);
    let last = gelEnergy(g);
    for (let k = 0; k < 20; k++) {
      run(g, 0.1);
      const e = gelEnergy(g);
      expect(e).toBeLessThanOrEqual(last * 1.001);
      last = e;
    }
  });

  it('keeps its base on the plate', () => {
    const g = makeGel(GW, GH);
    drop(g, 0.05);
    poke(g, 20, 3, 6, 0.3, 0.3);
    run(g, 0.5);
    for (let i = 0; i < GW; i++) {
      expect(g.ux[at(i, 0)]).toBe(0);
      expect(g.uy[at(i, 0)]).toBe(0);
    }
  });

  it('sways near 3 Hz and is back to 2% inside 1.4 s', () => {
    const g = makeGel(GW, GH);
    // A sideways shove of the whole slab excites the fundamental.
    for (let j = 1; j < GH; j++)
      for (let i = 0; i < GW; i++) g.vx[at(i, j)] = 0.02 * (j / GH);
    const probe = at(48, GH - 1);
    let peak = 0,
      crossings = 0,
      prev = 0,
      settledAt = Infinity;
    run(g, 2.5, (k) => {
      const x = g.ux[probe];
      peak = Math.max(peak, Math.abs(x));
      if (k / SPS < 1 && prev !== 0 && Math.sign(x) !== Math.sign(prev))
        crossings++;
      if (x !== 0) prev = x;
      if (Math.abs(x) > 0.02 * peak) settledAt = Infinity;
      else if (settledAt === Infinity) settledAt = k / SPS;
    });
    const hz = crossings / 2; // zero crossings in the first second
    expect(hz).toBeGreaterThanOrEqual(2.5);
    expect(hz).toBeLessThanOrEqual(3.5);
    expect(settledAt).toBeLessThanOrEqual(1.4);
  });

  it('carries a poke across the slab in about a third of a second', () => {
    const g = makeGel(GW, GH);
    poke(g, 6, 30, 4, 0.3, 0);
    const far = at(GW - 7, 30);
    let arrived = Infinity;
    run(g, 1, (k) => {
      if (arrived === Infinity && Math.hypot(g.ux[far], g.uy[far]) > 1e-4)
        arrived = k / SPS;
    });
    expect(arrived).toBeGreaterThan(0.15);
    expect(arrived).toBeLessThan(0.7);
  });
});
```

- [ ] **Step 2:** FAIL. **Step 3:** Implement `stepGel` with two scratch arrays for the new velocity (read old `u` everywhere, then write). **Step 4:** PASS — tune `W2` first for the sway test, then `G` for the settle. **Step 5:** Commit `feat(aspic): a slab of gel that carries a poke from one side to the other`.

---

### Task 5: Aspic — the slab on the plate

**Files:** Create `src/aspic/aspicAnimation.ts`, `index.ts`. Modify `src/index.ts`, `registry.ts`.

**Interfaces — Consumes:** Task 4 constants; `PingPong`, `phraseMask`, `uploadMask`, `fitRect`-style letterbox. **Produces:** `createAspicAnimation`.

- [ ] **Step 1: Manifest.** `phrase`; `textScale` (0.72); `wobble` 0.3–2 (1, scales `drop` and poke strength); `finger` radius 0.04–0.2 of block height (0.1); `tint` select amber/clear/ink; `grain`; `stage`.
- [ ] **Step 2: Grid.** The sim covers the **slab**, not the stage: slab rect = the type's letterboxed rect grown by 9 % of its height, grid `gw = 96`, `gh = round(96 / slabAspect)`. Re-init on phrase change or resize, then `drop` (skipped under reduced motion).
- [ ] **Step 3: Sim shader.** Port `stepGel`: state `xy = u`, `zw = v`; nine `texelFetch` taps with clamped coords; `if (int(gl_FragCoord.y) == 0) { fragColor = vec4(0); return; }`. Poke is a uniform `uPoke = vec4(cx, cy, r, 0)` + `uForce = vec2`, added to `v` as a gaussian, so the finger and the drop ride the step pass and `PingPong` needs no splat pass. Accumulator capped at 12 steps.
- [ ] **Step 4: Display shader.** Stage px → slab uv → `u = texture(uState, suv).xy` (in slab-height units) → type sampled at `luv − u·k`. Derive, from the same field: `dv = ∇·u` by central difference; body colour `= tint · (1 + 2.2·dv)` (compression is denser); bulge height `h = −dv`, normal from `∇h`, one fixed key light for the specular; rounded-rect SDF for the slab edge with a meniscus highlight; a contact shadow on the plate that shears with the top row's `ux`. Type sits inside the gel at half depth: sampled with a slight extra refraction offset `∇h · 0.01`.
- [ ] **Step 5: Input and sleep.** Pointer inside the slab: force = pointer velocity (slab units/s) × `wobble`, stamped at interpolated positions if it moved more than one finger radius. Click: a flick, 6× force along the last pointer direction, or downward if still. `lastInput` timestamp; when `time − lastInput > SLEEP_AFTER` and the draw key is unchanged, skip stepping and drawing.
- [ ] **Step 6:** Register (`section: 'type'`), build, `node look.mjs aspic 800 700`. Check: drops and sways with the top leading; settles crisp; a poke on the first letter visibly arrives at the last; specular moves with the strain, not on its own.
- [ ] **Step 7:** Commit `feat(aspic): the heading set in gel and dropped on a plate`.

---

### Task 6: Frost Line — the growth

**Files:** Create `src/frost-line/frostLine.sim.ts`, `frostLine.sim.test.ts`.

**Interfaces — Produces:**

```ts
export const SPS = 240;
export const ALPHA: number; // diffusion weight, per neighbour flux = ALPHA/12
export const RHO: number; // initial vapour inside the glyph
export const THETA = 1; // water a cell needs to freeze
export const GAMMA: number; // humidity fed to each receptive cell per step (the sinter)
export const SEED_EVERY = 12; // edge cells per nucleation site
export interface Frost {
  gw: number;
  gh: number;
  cold: Float32Array;
  ice: Uint8Array;
  water: Float32Array;
  age: Float32Array;
  warm: Float32Array;
  fed: number;
}
export function makeFrost(
  cold: Float32Array,
  gw: number,
  gh: number,
  opts?: { seedEvery?: number; gamma?: number; seed?: number }
): Frost;
export function stepFrost(f: Frost): void;
export function melt(f: Frost, ci: number, cj: number, r: number): void;
export function fillFraction(f: Frost): number; // ice cells / cold cells
export function totalWater(f: Frost): number; // Σ water, ice included
export function perimeterOverArea(f: Frost): number;
```

Hex lattice as offset rows: neighbours of `(i, j)` are `(i±1, j)`, `(i, j±1)`, and `(i + s, j±1)` with `s = (j & 1) ? 1 : −1`. A cell is **cold** where `cold ≥ 0.5`, **receptive** if cold, not ice, not warm, and beside ice. Per step: non-receptive, non-ice cold cells exchange `ALPHA/12 · (w_nb − w_self)` with each cold non-ice neighbour; a receptive neighbour counts as `w = 0` for the exchange and keeps what arrives (flux form, so it conserves); receptive cells add `GAMMA` (accumulated into `f.fed`); any receptive cell with `water ≥ THETA` freezes. Initial water is `RHO · (0.9 + 0.2·hash)`. `warm` decays ×0.985 per step and blocks freezing above 0.1. `melt` clears `ice`, sets `warm = 1`, leaves `water` where it is.

- [ ] **Step 1: Failing tests:**

```ts
import { describe, it, expect } from 'vitest';
import {
  SPS,
  fillFraction,
  makeFrost,
  melt,
  perimeterOverArea,
  stepFrost,
  totalWater,
} from './frostLine.sim';

const GW = 160,
  GH = 72;
/** A bar 120×28 cells — about one Anton stroke laid on its side. */
const bar = () => {
  const c = new Float32Array(GW * GH);
  for (let j = 22; j < 50; j++)
    for (let i = 20; i < 140; i++) c[i + j * GW] = 1;
  return c;
};
const run = (f: ReturnType<typeof makeFrost>, secs: number) => {
  for (let k = 0; k < Math.round(secs * SPS); k++) stepFrost(f);
};

describe('frost line', () => {
  it('conserves water while nothing is fed', () => {
    const f = makeFrost(bar(), GW, GH, { gamma: 0 });
    const w0 = totalWater(f);
    run(f, 2);
    expect(totalWater(f)).toBeCloseTo(w0, 2);
  });

  it('accounts for every drop the sinter adds', () => {
    const f = makeFrost(bar(), GW, GH);
    const w0 = totalWater(f);
    run(f, 3);
    expect(totalWater(f) - f.fed).toBeCloseTo(w0, 1);
  });

  it('never freezes outside the letter', () => {
    const cold = bar();
    const f = makeFrost(cold, GW, GH);
    run(f, 6);
    for (let k = 0; k < cold.length; k++)
      if (cold[k] < 0.5) expect(f.ice[k]).toBe(0);
  });

  it('grows feathers first: sparse seeds beat a rind on perimeter', () => {
    const sparse = makeFrost(bar(), GW, GH, { gamma: 0 });
    const dense = makeFrost(bar(), GW, GH, { gamma: 0, seedEvery: 1 });
    run(sparse, 2.5);
    run(dense, 2.5);
    expect(fillFraction(sparse)).toBeGreaterThan(0.15);
    expect(perimeterOverArea(sparse)).toBeGreaterThan(
      perimeterOverArea(dense) * 1.5
    );
  });

  it('reads as a solid letter by six seconds', () => {
    const f = makeFrost(bar(), GW, GH);
    run(f, 2.5);
    expect(fillFraction(f)).toBeLessThan(0.75); // still feathers at the end of stage one
    run(f, 3.5);
    expect(fillFraction(f)).toBeGreaterThanOrEqual(0.88);
  });

  it('refreezes a melted patch, differently', () => {
    const f = makeFrost(bar(), GW, GH);
    run(f, 6);
    const before = Uint8Array.from(f.ice);
    melt(f, 80, 36, 9);
    expect(f.ice[80 + 36 * GW]).toBe(0);
    run(f, 5);
    expect(f.ice[80 + 36 * GW]).toBe(1);
    let ageDiff = 0;
    for (let j = 27; j < 46; j++)
      for (let i = 71; i < 90; i++)
        if (before[i + j * GW] && f.age[i + j * GW] < 5 * SPS) ageDiff++;
    expect(ageDiff).toBeGreaterThan(50); // the patch is young ice in an old letter
  });
});
```

- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS — tune `RHO` for the stage-one fill (< 0.75), `ALPHA` for its speed, `GAMMA` for the sinter. **Step 5:** Commit `feat(frost-line): feathers that starve each other, then a letter that fills in`.

---

### Task 7: Frost Line — the pane

**Files:** Create `src/frost-line/frostLineAnimation.ts`, `index.ts`. Modify `src/index.ts`, `registry.ts`.

- [ ] **Step 1: Manifest.** `phrase`; `textScale` (0.82); `speed` 0.5–2; `finger` radius; `sparkle` 0–1; `grain`; `stage`.
- [ ] **Step 2: Grid and seed.** Stage-aspect grid near 164k cells with rows squeezed for the hex lattice: `gw = round(sqrt(164000 · aspect · 0.866))`, `gh = round(gw / aspect / 0.866)`. Seed on the CPU: `maskToGrid(phraseMask, gw, gh, textScale)` → `makeFrost(...)` → pack `R = ice, G = water, B = age/SPS/8, A = warm` into the `Float32Array` for `initState`/`reseed`. Cold region goes up as a second texture (`uploadMask` of the phrase, unit 1) since all four state channels are spent. Under reduced motion run `stepFrost` for 6 s on the CPU before packing.
- [ ] **Step 3: Sim shader.** Port `stepFrost` with `texelFetch`; row parity from `int(gl_FragCoord.y) & 1`; `cold` from the mask texture through the same letterbox as the seed (uniform `uRect` in grid cells). The fingertip is a uniform disc: inside it `ice = 0, warm = 1`. `speed` sets steps per frame through the accumulator (`SPS · speed`, capped at 6 steps).
- [ ] **Step 4: Display.** Thickness `t = ice · (0.55 + 0.45·sat(age))` blurred over the six neighbours; normal from `∇t`; fixed key light → sparkle on facets, gated by a per-cell hash so it glitters rather than glows; young ice is glassy and blue-cool, old ice bleaches to cream; multiply by the **full-resolution** phrase mask so the letter edge is crisp however coarse the grid; unfrozen vapour inside the glyph shows as a faint breath-fog so the letter is legible from the first frame.
- [ ] **Step 5:** Register, build, look at 300/900/1800/4000 ms and after a drag. Check: feathers visibly race inward from sparse sites; the letter reads at every stage; melt patch refreezes with a different grain; both stages.
- [ ] **Step 6:** Commit `feat(frost-line): the heading freezes onto a cold pane`.

---

### Task 8: Slow Burn — the fire

**Files:** Create `src/slow-burn/slowBurn.sim.ts`, `slowBurn.sim.test.ts`.

**Interfaces — Produces:**

```ts
export const SPS = 120;
export const PAPER = 0.15; // fuel in bare paper; letters are 1
export const A: number,
  T_IGN: number,
  T_BAND: number,
  D: number,
  LIFT: number,
  Q: number,
  COOL: number;
export interface Sheet {
  gw: number;
  gh: number;
  fuel: Float32Array;
  temp: Float32Array;
  peak: Float32Array;
  char: Float32Array;
}
export function makeSheet(
  letters: Float32Array,
  gw: number,
  gh: number,
  paper?: number
): Sheet;
export function stepSheet(
  s: Sheet,
  fan?: { ci: number; cj: number; r: number; k: number }
): void;
export function ignite(s: Sheet, ci: number, cj: number, r?: number): void;
export function burning(s: Sheet): boolean; // any cell with temp > T_IGN and fuel > 0.01
export function frontX(s: Sheet, j: number): number; // rightmost i on row j with fuel < half its start
```

Per step: `rate = A·fuel·smoothstep(T_IGN, T_IGN+T_BAND, T)`; `T += D·∇²T + LIFT·(T_below − T) + Q·rate − COOL·T`, clamped to `[0, 1.5]`; `fuel −= rate`; `char += rate`; `peak = max(peak, T)`. Initial fuel is `max(letters, paper)`.

- [ ] **Step 1: Failing tests:**

```ts
import { describe, it, expect } from 'vitest';
import {
  SPS,
  burning,
  frontX,
  ignite,
  makeSheet,
  stepSheet,
} from './slowBurn.sim';

const GW = 384,
  GH = 40,
  ROW = 20;
const bars = (spans: [number, number][]) => {
  const l = new Float32Array(GW * GH);
  for (const [a, b] of spans)
    for (let j = 12; j < 28; j++) for (let i = a; i < b; i++) l[i + j * GW] = 1;
  return l;
};
const runUntil = (
  s: ReturnType<typeof makeSheet>,
  maxSecs: number,
  done: () => boolean
) => {
  let k = 0;
  while (k < maxSecs * SPS && !done()) {
    stepSheet(s);
    k++;
  }
  return k / SPS;
};

describe('slow burn', () => {
  it('only ever loses fuel', () => {
    const s = makeSheet(bars([[10, 200]]), GW, GH);
    ignite(s, 12, ROW);
    for (let k = 0; k < 600; k++) {
      const before = Float32Array.from(s.fuel);
      stepSheet(s);
      for (let n = 0; n < before.length; n += 97)
        expect(s.fuel[n]).toBeLessThanOrEqual(before[n]);
    }
  });

  it('walks through type at about 55 cells a second', () => {
    const s = makeSheet(bars([[10, 374]]), GW, GH);
    ignite(s, 12, ROW);
    const t0 = runUntil(s, 20, () => frontX(s, ROW) >= 60);
    const t1 = runUntil(s, 20, () => frontX(s, ROW) >= 300);
    const v = 240 / t1;
    expect(t0).toBeLessThan(3);
    expect(v).toBeGreaterThan(40);
    expect(v).toBeLessThan(70);
  });

  it('crosses a word space on the paper, slowly', () => {
    const s = makeSheet(
      bars([
        [10, 120],
        [136, 260],
      ]),
      GW,
      GH
    );
    ignite(s, 12, ROW);
    runUntil(s, 20, () => frontX(s, ROW) >= 118);
    const gap = runUntil(s, 20, () => frontX(s, ROW) >= 140);
    expect(gap).toBeLessThan(3); // it gets there
    expect(gap).toBeGreaterThan(0.6); // ...at paper speed: 16 cells at 55/s would be 0.29 s
  });

  it('stalls at the gap if the paper cannot burn — which is why the paper burns', () => {
    const s = makeSheet(
      bars([
        [10, 120],
        [136, 260],
      ]),
      GW,
      GH,
      0
    );
    ignite(s, 12, ROW);
    runUntil(s, 30, () => !burning(s));
    expect(frontX(s, ROW)).toBeLessThan(136);
  });

  it('never lets the paper flame', () => {
    const s = makeSheet(bars([]), GW, GH);
    ignite(s, 100, ROW);
    let hottest = 0;
    for (let k = 0; k < 4 * SPS; k++) {
      stepSheet(s);
      for (let i = 130; i < 384; i += 3)
        hottest = Math.max(hottest, s.temp[i + ROW * GW]);
    }
    expect(hottest).toBeGreaterThan(0.2); // it does smoulder
    expect(hottest).toBeLessThan(0.6); // under the display's flame threshold
  });

  it('burns out', () => {
    const s = makeSheet(bars([[10, 374]]), GW, GH);
    ignite(s, 12, ROW);
    const t = runUntil(s, 40, () => !burning(s));
    expect(t).toBeGreaterThan(6);
    expect(t).toBeLessThan(14);
  });
});
```

- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. Tuning order: `D`/`Q`/`A` for type speed; then check the paper front sustains at `PAPER = 0.15` — a reaction front needs `Q·PAPER` to beat `COOL` near `T_IGN`, so if it dies, lower `T_IGN` before raising `PAPER`; then `COOL` for the no-flame bound. **Step 5:** Commit `feat(slow-burn): a front that runs through type and creeps across paper`.

---

### Task 9: Slow Burn — the sheet

**Files:** Create `src/slow-burn/slowBurnAnimation.ts`, `index.ts`. Modify `src/index.ts`, `registry.ts`.

- [ ] **Step 1: Manifest.** `phrase`; `textScale` (0.8); `autoIgnite` boolean (true); `wind` 0–2 (1, scales the fan); `refit` seconds before a fresh sheet 3–20 (7); `exposure` 0.5–2; `grain`. No `stage` — the sheet is the ground.
- [ ] **Step 2: Grid and seed.** Stage-aspect grid near 92k cells. `maskToGrid` → pack `R = max(letters, PAPER), G = 0, B = 0, A = 0`. The display also takes the full-res phrase mask (unit 1) for a crisp printed edge before the burn.
- [ ] **Step 3: Sim shader.** Port `stepSheet`. `uIgnite = vec3(cx, cy, r)` sets `T = 1` in a disc for one step. The fan is `uFan = vec4(cx, cy, r, k)`: inside it, a second reaction `rateE = A_E · char · smoothstep(0.12, 0.3, T) · (1 + k)` turns char to ash and returns a little heat, which is what makes embers under a moving cursor glow and then go grey. Accumulator capped at 3.
- [ ] **Step 4: Display.** Paper: cream with fbm fibre; ink type from the full-res mask × remaining fuel. Scorch: `peak` through cream → tan → brown → black. Char: black, going to pale ash as `char` oxidises. Emission: `T` → kelvin `mix(600., 1900., sat(T))` → Planck-locus RGB fit → × `pow(T, 4.)` × `exposure`, added, then a filmic tone map. Flame above a burning cell: emission sampled from a few cells **below** with a width that narrows with height, so flames are the temperature field lifted, not a sprite. A cheap glow pass: emission at a wider blurred tap, added at 0.35.

```glsl
vec3 planck(float K) {                       // Krystek-style fit to the Planckian locus, 600–1900 K
  float t = K / 100.0;
  float r = 1.0;
  float g = clamp(0.39008 * log(t) - 0.63184, 0.0, 1.0);
  float b = t <= 19.0 ? 0.0 : clamp(0.54321 * log(t - 10.0) - 1.19625, 0.0, 1.0);
  return vec3(r, g, b);
}
```

- [ ] **Step 5: Life cycle.** Auto-ignite 0.8 s after seeding at the lower-left of the first letter (first non-zero grid cell scanning rows bottom-up, columns left-right), unless reduced motion. Click → `uIgnite` at the click. Burn-out is detected without a readback: track `lastIgnite` and the mirror's measured burn-out bound — after `max(14 s, …)` with no clicks, start the `refit` countdown; then re-seed with a short upward slide of the new sheet (`uSlide` uniform, 0.4 s, `cubic-bezier(0.23, 1, 0.32, 1)` evaluated on the CPU; under reduced motion a 0.2 s fade).
- [ ] **Step 6:** Register, build, look at 1/3/6/12 s and after a click on bare paper. Check: copy legible before, during and after; front visibly fast in letters and slow across word spaces; colour runs dull red → orange → yellow-white along one curve; embers brighten under a moving cursor.
- [ ] **Step 7:** Commit `feat(slow-burn): the proclamation printed on a sheet, and then the sheet lit`.

---

### Task 10: Close out

- [ ] **Step 1:** `docs/lab/TOY-IDEAS.md` — Frost and Ember rows: status `subject lent to the type shelf (frost-line / slow-burn); a toy version must pass question 0 against it`. Add Aspic nowhere — it shipped.
- [ ] **Step 2:** Reconcile the spec with what was built (state-channel layouts, Off Register's pointer rule, any retuned number), so the spec stays true.
- [ ] **Step 3:** Whole suite `npx vitest run packages/flateralus-pixi-animations`, type-check both the package and the website, `npm run build` for the package, lint.
- [ ] **Step 4:** Every effect × every palette/theme × every stage in the lab, by screenshot. A palette that erases the computed thing (moiré, strain specular, feather ridges, blackbody) is a bug, not a preference.
- [ ] **Step 5:** GPU cost per effect at 1600×1400 with the timer-query probe; Off Register and Aspic must read ~0 ms at rest.
- [ ] **Step 6:** Commit `docs(lab): the type shelf is built; Frost and Ember lent it their subjects`.
