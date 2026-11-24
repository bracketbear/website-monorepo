# Animation Lab Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Animation Lab shell in `apps/bracketbear-website` on top of the real flateralus packages, with every runtime primitive the ~50 prototype animations depend on, proven by porting one animation from each of the three pipelines.

**Architecture:** The prototype's `flateralus-lite.js` reimplements machinery the real `@bracketbear/flateralus` already has, so only its genuinely new parts move into the real packages: the mutable palette with its six themes, the shared draw helpers, and a pointer input service. The Lab itself is an Astro route mounting one React island, which owns a `PixiApplication` and swaps animations into it. Control values are driven by the existing `useControls` hook and rendered by a Lab-specific inspector built from the existing per-type control components.

**Tech Stack:** Astro 7, React 19, Tailwind v4 (CSS-first), PIXI 8, Zod, Vitest + jsdom, npm workspaces.

**Spec:** `docs/superpowers/specs/2026-09-10-animation-lab-design.md`

**Status: complete.** All eight tasks are implemented, committed, and verified.
832 tests pass, every touched package type-checks clean, the site builds, and all
three animations were confirmed rendering in Chrome. Deviations from the plan as
written are recorded at the bottom under "What actually changed".

## Global Constraints

- Node >= 22.12. npm workspaces, no turbo. Run tests with `npx vitest run <path>` from the repo root.
- `apps/bracketbear-website` is on `pixi.js@8.11.0` and `pixi-filters@6.1.5`. Never reintroduce a v7 API.
- Tailwind v4, CSS-first. There is no `tailwind.config.js`. A new workspace package needs an `@source` line in the consuming app's `global.css`.
- Fonts come from `@fontsource` packages, never the Google Fonts CDN. Anton, Archivo Black, JetBrains Mono, and Plus Jakarta Sans are already dependencies of `apps/bracketbear-website`.
- Radii are 0 everywhere except 999px pills and theme dots. Borders only, no offset drop shadows.
- Notch: `clip-path: polygon(0 0, calc(100% - Npx) 0, 100% Npx, 100% 100%, Npx 100%, 0 calc(100% - Npx))`, N = 8 for controls, 14 for large CTAs.
- Transitions: 0.15s ease for hover and scale, 0.3s ease for the context dim.
- Sunset palette, exact values: orange `#ff5f1f`, bright `#ff7a33`, deep `#d8420c`, rust `#a82a07`, sun `#ffc24a`, cream `#fff3e3`, ink `#110a08`, ink2 `#1c130e`, cyan `#7df9ff`, acid `#d8ff3d`.
- Ported animation source is the deliverable. Change the wrapper, never the math, the shaders, or the tuned default values.
- Every animation must survive mount, unmount, and remount without leaking GL resources.

## File Structure

**`packages/flateralus`** — rendering-agnostic additions.

- Create `src/palette/palette.ts` — the mutable `PAL` object, the six-theme table, `applyTheme`, `hx`.
- Create `src/palette/palette.test.ts`.
- Create `src/palette/index.ts` — barrel.
- Modify `src/schemas/controls.ts` — widen select values to `string | number`.
- Modify `src/types/index.ts` — widen the select branch of `ManifestToControlValues`.
- Modify `src/index.ts` — export the palette barrel.

**`packages/flateralus-pixi`** — PIXI-specific runtime primitives.

- Create `src/draw-utils.ts` — `px`, `glowTex`, `noise2`, `rand`, `pick`.
- Create `src/draw-utils.test.ts`.
- Create `src/pointer-service.ts` — `PointerService`, the `ctx.mouse` and `ctx.clicks` equivalent.
- Create `src/pointer-service.test.ts`.
- Modify `src/pixi-animation.ts` — add the owned root container and the `dpr` hook.
- Modify `src/index.ts` — export the new modules.

**`apps/bracketbear-website`** — the Lab route.

- Create `src/pages/lab.astro` — route shell, `noindex`, mounts the island.
- Create `src/components/lab/AnimationLab.tsx` — the island: state, PIXI app ownership, mount and teardown.
- Create `src/components/lab/LabHeader.tsx` — logo, status line, theme dots, view toggle, Randomize, Reset.
- Create `src/components/lab/LabNav.tsx` — section-grouped animation list.
- Create `src/components/lab/LabStage.tsx` — section background, canvas host, stage chrome.
- Create `src/components/lab/LabInspector.tsx` — manifest-driven control sidebar.
- Create `src/components/lab/sections.ts` — the nine section keys, labels, and background rules.
- Create `src/components/lab/registry.ts` — the ordered animation registry the Lab reads.
- Create `src/styles/lab.css` — Lab-scoped tokens and the notch/pill primitives.

**`packages/flateralus-pixi-animations`** — the ported animations.

- Create `src/halftone-tide/halftoneTideAnimation.ts` + `index.ts`.
- Create `src/heat-haze/heatHazeAnimation.ts` + `index.ts` + `shared-harness.ts`.
- Create `src/rd-vat/rdVatAnimation.ts` + `index.ts`.
- Modify `src/index.ts` — barrel exports.

---

### Task 1: Palette and theme table

**Files:**

- Create: `packages/flateralus/src/palette/palette.ts`
- Create: `packages/flateralus/src/palette/palette.test.ts`
- Create: `packages/flateralus/src/palette/index.ts`
- Modify: `packages/flateralus/src/index.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `PAL: PaletteColors` (a mutable singleton), `THEMES: Record<ThemeId, Theme>`, `applyTheme(id: ThemeId): void`, `getThemeId(): ThemeId`, `hx(n: number): string`, and the types `PaletteKey`, `PaletteColors`, `ThemeId`, `Theme`.

- [x] **Step 1: Write the failing test**

```ts
// packages/flateralus/src/palette/palette.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PAL, THEMES, applyTheme, getThemeId, hx } from './palette';

describe('palette', () => {
  beforeEach(() => applyTheme('sunset'));

  it('defaults to the sunset brand values', () => {
    expect(PAL.orange).toBe(0xff5f1f);
    expect(PAL.cream).toBe(0xfff3e3);
    expect(PAL.ink).toBe(0x110a08);
    expect(getThemeId()).toBe('sunset');
  });

  it('ships exactly the six named themes', () => {
    expect(Object.keys(THEMES)).toEqual([
      'sunset',
      'miami84',
      'nick95',
      'gameboy',
      'rave',
      'memphis',
    ]);
  });

  it('mutates PAL in place so held references see the new theme', () => {
    const held = PAL;
    applyTheme('gameboy');
    expect(held.orange).toBe(0x8bac0f);
    expect(held).toBe(PAL);
    expect(getThemeId()).toBe('gameboy');
  });

  it('gives every theme all ten palette keys', () => {
    const keys = [
      'orange',
      'bright',
      'deep',
      'rust',
      'sun',
      'cream',
      'ink',
      'ink2',
      'cyan',
      'acid',
    ];
    for (const t of Object.values(THEMES)) {
      expect(Object.keys(t.colors).sort()).toEqual([...keys].sort());
    }
  });

  it('ignores an unknown theme id', () => {
    applyTheme('nope' as never);
    expect(PAL.orange).toBe(0xff5f1f);
    expect(getThemeId()).toBe('sunset');
  });

  it('formats colors as six-digit hex', () => {
    expect(hx(0xff5f1f)).toBe('#ff5f1f');
    expect(hx(0x000f0a)).toBe('#000f0a');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/flateralus/src/palette/palette.test.ts`
Expected: FAIL, cannot resolve `./palette`.

- [x] **Step 3: Write the implementation**

```ts
// packages/flateralus/src/palette/palette.ts

/** Semantic slots every theme must fill. */
export type PaletteKey =
  | 'orange'
  | 'bright'
  | 'deep'
  | 'rust'
  | 'sun'
  | 'cream'
  | 'ink'
  | 'ink2'
  | 'cyan'
  | 'acid';

export type PaletteColors = Record<PaletteKey, number>;

export type ThemeId =
  | 'sunset'
  | 'miami84'
  | 'nick95'
  | 'gameboy'
  | 'rave'
  | 'memphis';

export interface Theme {
  label: string;
  colors: PaletteColors;
}

/**
 * Roles, not names: `orange` is the dominant canvas, `bright` the lifted
 * canvas, `ink` the high-contrast-on-canvas value, `cream` the paper,
 * `sun` the warm highlight, `deep`/`rust` mid accents, `cyan`/`acid` pops.
 * A theme reassigns the roles; it does not rename them.
 */
export const THEMES: Record<ThemeId, Theme> = {
  sunset: {
    label: 'Sunset (brand)',
    colors: {
      orange: 0xff5f1f,
      bright: 0xff7a33,
      deep: 0xd8420c,
      rust: 0xa82a07,
      sun: 0xffc24a,
      cream: 0xfff3e3,
      ink: 0x110a08,
      ink2: 0x1c130e,
      cyan: 0x7df9ff,
      acid: 0xd8ff3d,
    },
  },
  miami84: {
    label: "Miami '84",
    colors: {
      orange: 0x2e1a5e,
      bright: 0x45247f,
      deep: 0xff2975,
      rust: 0xc11368,
      sun: 0xffd319,
      cream: 0xfdf5ff,
      ink: 0xfdf5ff,
      ink2: 0xe8d5ff,
      cyan: 0x00e5ff,
      acid: 0xff6ec7,
    },
  },
  nick95: {
    label: "Nick '95",
    colors: {
      orange: 0xff6600,
      bright: 0xff8324,
      deep: 0x663399,
      rust: 0x4d2673,
      sun: 0xffcc00,
      cream: 0xfff8e7,
      ink: 0x1f1200,
      ink2: 0x2e1b00,
      cyan: 0x00c2cb,
      acid: 0xb5e61d,
    },
  },
  gameboy: {
    label: 'Game Boy',
    colors: {
      orange: 0x8bac0f,
      bright: 0x9bbc0f,
      deep: 0x306230,
      rust: 0x0f380f,
      sun: 0x9bbc0f,
      cream: 0xe0f8d0,
      ink: 0x0f380f,
      ink2: 0x306230,
      cyan: 0xe0f8d0,
      acid: 0xe0f8d0,
    },
  },
  rave: {
    label: 'JNCO Rave',
    colors: {
      orange: 0x0d0221,
      bright: 0x1a0b3d,
      deep: 0xb026ff,
      rust: 0x7a1fd1,
      sun: 0xff9e00,
      cream: 0xf2ffe9,
      ink: 0xf2ffe9,
      ink2: 0xd9ffd0,
      cyan: 0x00ffff,
      acid: 0x39ff14,
    },
  },
  memphis: {
    label: 'Memphis Milano',
    colors: {
      orange: 0xf4ead5,
      bright: 0xfdf6e4,
      deep: 0xff6ea9,
      rust: 0x00b3a4,
      sun: 0xffd23f,
      cream: 0xffffff,
      ink: 0x191919,
      ink2: 0x2b2b2b,
      cyan: 0x6dd3ff,
      acid: 0xb8e986,
    },
  },
};

/**
 * The live palette. Animations read `PAL.orange` at draw time and must
 * never destructure it — `applyTheme` mutates this object in place so a
 * theme switch reaches every animation without re-wiring anything.
 */
export const PAL: PaletteColors = { ...THEMES.sunset.colors };

let currentTheme: ThemeId = 'sunset';

export function applyTheme(id: ThemeId): void {
  const theme = THEMES[id];
  if (!theme) return;
  Object.assign(PAL, theme.colors);
  currentTheme = id;
}

export function getThemeId(): ThemeId {
  return currentTheme;
}

/** Integer color to CSS hex, e.g. 0xff5f1f -> '#ff5f1f'. */
export function hx(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}
```

```ts
// packages/flateralus/src/palette/index.ts
export * from './palette';
```

- [x] **Step 4: Export from the package barrel**

Add to `packages/flateralus/src/index.ts`:

```ts
export * from './palette';
```

- [x] **Step 5: Run test to verify it passes**

Run: `npx vitest run packages/flateralus/src/palette/palette.test.ts`
Expected: PASS, six tests.

- [x] **Step 6: Commit**

```bash
git add packages/flateralus/src/palette packages/flateralus/src/index.ts
git commit -m "feat(flateralus): add live palette with six themes"
```

---

### Task 2: Numeric select control values

The prototype's palette and stage pickers use numeric select values across roughly 368 controls. `SelectControlSchema` currently requires strings, so every ported manifest would throw at construction.

**Files:**

- Modify: `packages/flateralus/src/schemas/controls.ts:45-54`
- Modify: `packages/flateralus/src/types/index.ts` (the select branch of `ManifestToControlValues`)
- Modify: `packages/flateralus/src/utils/create-control-values-schema.ts` (the select `refine`)
- Test: `packages/flateralus/src/schemas/controls.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `SelectControlSchema` accepting `options: { value: string | number; label: string }[]` and `defaultValue: string | number`. `ManifestToControlValues` maps a select control to `string | number`.

- [x] **Step 1: Write the failing test**

Append to `packages/flateralus/src/schemas/controls.test.ts`:

```ts
import { SelectControlSchema } from './controls';

describe('SelectControlSchema numeric values', () => {
  it('accepts numeric option values and a numeric default', () => {
    const parsed = SelectControlSchema.safeParse({
      name: 'stage',
      type: 'select',
      label: 'Stage',
      options: [
        { value: 1, label: 'Ink stage' },
        { value: 0, label: 'Orange stage' },
      ],
      defaultValue: 1,
    });
    expect(parsed.success).toBe(true);
  });

  it('still accepts string option values', () => {
    const parsed = SelectControlSchema.safeParse({
      name: 'waveDirection',
      type: 'select',
      label: 'Wave Direction',
      options: [{ value: 'horizontal', label: 'Horizontal' }],
      defaultValue: 'horizontal',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a default that is not one of the options', () => {
    const parsed = SelectControlSchema.safeParse({
      name: 'stage',
      type: 'select',
      options: [{ value: 1, label: 'Ink stage' }],
      defaultValue: true,
    });
    expect(parsed.success).toBe(false);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/flateralus/src/schemas/controls.test.ts`
Expected: FAIL, the numeric case reports that `value` expected string.

- [x] **Step 3: Widen the schema**

In `packages/flateralus/src/schemas/controls.ts`, replace the `SelectControlSchema` body:

```ts
export const SelectControlSchema = BaseControlSchema.extend({
  type: z.literal('select'),
  options: z.array(
    z.object({
      // Numeric values carry palette entries and stage indices; the Lab
      // renders a swatch when the value is a number.
      value: z.union([z.string(), z.number()]),
      label: z.string(),
    })
  ),
  defaultValue: z.union([z.string(), z.number()]),
});
```

- [x] **Step 4: Widen the inferred value type**

In `packages/flateralus/src/types/index.ts`, in the `ManifestToControlValues` conditional chain, change the select branch from `? string` to:

```ts
        : TControl extends { type: 'select' }
          ? string | number
```

Apply the same change to the select branch of `ManifestToStageControlValues` in `packages/flateralus/src/types/stage-controls.ts` so the two stay consistent.

- [x] **Step 5: Widen the runtime refine**

In `packages/flateralus/src/utils/create-control-values-schema.ts`, the select case builds a validator from the option list. Change its base from `z.string()` to `z.union([z.string(), z.number()])` so a numeric default survives `BaseAnimation`'s constructor validation, keeping the existing `.refine` that checks membership in `options`.

- [x] **Step 6: Run the full flateralus suite**

Run: `npx vitest run packages/flateralus`
Expected: PASS, including the pre-existing randomize and manifest tests.

- [x] **Step 7: Commit**

```bash
git add packages/flateralus/src
git commit -m "feat(flateralus): allow numeric select control values"
```

---

### Task 3: Shared draw utilities

**Files:**

- Create: `packages/flateralus-pixi/src/draw-utils.ts`
- Create: `packages/flateralus-pixi/src/draw-utils.test.ts`
- Modify: `packages/flateralus-pixi/src/index.ts`

**Interfaces:**

- Consumes: `pixi.js`.
- Produces: `rand(a: number, b: number): number`, `pick<T>(arr: readonly T[]): T`, `px(color: number, w: number, h?: number): PIXI.Sprite`, `glowTex(): PIXI.Texture`, `noise2(x: number, y: number): number`, `resetGlowTex(): void`.

- [x] **Step 1: Write the failing test**

```ts
// packages/flateralus-pixi/src/draw-utils.test.ts
import { describe, it, expect } from 'vitest';
import { rand, pick, noise2 } from './draw-utils';

describe('draw-utils', () => {
  it('rand stays inside the range', () => {
    for (let i = 0; i < 200; i++) {
      const v = rand(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThan(5);
    }
  });

  it('pick returns a member of the array', () => {
    const arr = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 50; i++) expect(arr).toContain(pick(arr));
  });

  it('noise2 is deterministic for the same input', () => {
    expect(noise2(1.5, 2.5)).toBe(noise2(1.5, 2.5));
  });

  it('noise2 varies across the plane and stays in range', () => {
    const a = noise2(0, 0);
    const b = noise2(12.3, 7.7);
    expect(a).not.toBe(b);
    for (const v of [a, b, noise2(-4, 9)]) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
```

Do not test `px` or `glowTex` here — both need a GPU-backed PIXI texture that jsdom cannot provide. They are covered by the animation ports in Task 8.

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/flateralus-pixi/src/draw-utils.test.ts`
Expected: FAIL, cannot resolve `./draw-utils`.

- [x] **Step 3: Write the implementation**

```ts
// packages/flateralus-pixi/src/draw-utils.ts
import * as PIXI from 'pixi.js';

export function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Crisp rectangle from the shared white texture, anchored center. */
export function px(color: number, w: number, h?: number): PIXI.Sprite {
  const s = new PIXI.Sprite(PIXI.Texture.WHITE);
  s.anchor.set(0.5);
  s.tint = color;
  s.width = w;
  s.height = h == null ? w : h;
  return s;
}

let glowTexture: PIXI.Texture | null = null;

/** Lazy shared radial-gradient texture — filter-free neon halos. */
export function glowTex(): PIXI.Texture {
  if (!glowTexture) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d')!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    glowTexture = PIXI.Texture.from(cv);
  }
  return glowTexture;
}

/** Drop the shared glow texture; call when the renderer is torn down. */
export function resetGlowTex(): void {
  glowTexture?.destroy(true);
  glowTexture = null;
}

/** Cheap deterministic 2D value noise in -1..1. */
export function noise2(x: number, y: number): number {
  return (
    Math.sin(x * 1.7 + Math.sin(y * 2.3)) * 0.5 +
    Math.sin(y * 1.3 + Math.sin(x * 1.1) * 2.0) * 0.5
  );
}
```

- [x] **Step 4: Export from the package barrel**

Add to `packages/flateralus-pixi/src/index.ts`:

```ts
export * from './draw-utils';
```

- [x] **Step 5: Run test to verify it passes**

Run: `npx vitest run packages/flateralus-pixi/src/draw-utils.test.ts`
Expected: PASS, four tests.

- [x] **Step 6: Commit**

```bash
git add packages/flateralus-pixi/src
git commit -m "feat(flateralus-pixi): add shared draw utilities"
```

---

### Task 4: Pointer service

The prototype hands every animation `ctx.mouse` and `ctx.clicks`. The repo has no equivalent, and the one animation that needs a cursor wires `app.stage.on('pointermove')` itself. Note that `BaseApplication.setupCanvasStyles` sets `canvas.style.pointerEvents = 'none'`, so this service listens on the host element rather than the PIXI stage.

**Files:**

- Create: `packages/flateralus-pixi/src/pointer-service.ts`
- Create: `packages/flateralus-pixi/src/pointer-service.test.ts`
- Modify: `packages/flateralus-pixi/src/index.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `class PointerService` with `readonly mouse: { x: number; y: number; active: boolean }`, `readonly clicks: Array<{ x: number; y: number }>`, `attach(el: HTMLElement): void`, `detach(): void`, `clearClicks(): void`.

- [x] **Step 1: Write the failing test**

```ts
// packages/flateralus-pixi/src/pointer-service.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PointerService } from './pointer-service';

function makeHost() {
  const el = document.createElement('div');
  el.getBoundingClientRect = () =>
    ({ left: 10, top: 20, width: 100, height: 100 }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

describe('PointerService', () => {
  let host: HTMLElement;
  let svc: PointerService;

  beforeEach(() => {
    host = makeHost();
    svc = new PointerService();
    svc.attach(host);
  });
  afterEach(() => {
    svc.detach();
    host.remove();
  });

  it('starts inactive at the origin', () => {
    expect(svc.mouse).toEqual({ x: 0, y: 0, active: false });
    expect(svc.clicks).toHaveLength(0);
  });

  it('records pointer position relative to the host', () => {
    host.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 60,
        clientY: 70,
        bubbles: true,
      })
    );
    expect(svc.mouse.x).toBe(50);
    expect(svc.mouse.y).toBe(50);
    expect(svc.mouse.active).toBe(true);
  });

  it('goes inactive on pointerleave but keeps the last position', () => {
    host.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 60,
        clientY: 70,
        bubbles: true,
      })
    );
    host.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    expect(svc.mouse.active).toBe(false);
    expect(svc.mouse.x).toBe(50);
  });

  it('queues clicks for animations to consume', () => {
    host.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 30,
        clientY: 40,
        bubbles: true,
      })
    );
    host.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 15,
        clientY: 25,
        bubbles: true,
      })
    );
    expect(svc.clicks).toEqual([
      { x: 20, y: 20 },
      { x: 5, y: 5 },
    ]);
  });

  it('keeps mouse and clicks identity stable across clearClicks', () => {
    const held = svc.clicks;
    host.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 30,
        clientY: 40,
        bubbles: true,
      })
    );
    svc.clearClicks();
    expect(held).toBe(svc.clicks);
    expect(held).toHaveLength(0);
  });

  it('stops listening after detach', () => {
    svc.detach();
    host.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 99,
        clientY: 99,
        bubbles: true,
      })
    );
    expect(svc.mouse.active).toBe(false);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/flateralus-pixi/src/pointer-service.test.ts`
Expected: FAIL, cannot resolve `./pointer-service`.

- [x] **Step 3: Write the implementation**

```ts
// packages/flateralus-pixi/src/pointer-service.ts

export interface PointerState {
  x: number;
  y: number;
  active: boolean;
}

export interface ClickPoint {
  x: number;
  y: number;
}

/**
 * Host-relative pointer state shared by every animation on a stage.
 *
 * `mouse` and `clicks` are stable object identities that animations hold
 * across frames, so this class always mutates them in place and never
 * reassigns. Animations consume clicks by shifting or splicing entries out
 * of the queue.
 */
export class PointerService {
  readonly mouse: PointerState = { x: 0, y: 0, active: false };
  readonly clicks: ClickPoint[] = [];

  private el: HTMLElement | null = null;

  private onMove = (e: PointerEvent) => {
    const r = this.el!.getBoundingClientRect();
    this.mouse.x = e.clientX - r.left;
    this.mouse.y = e.clientY - r.top;
    this.mouse.active = true;
  };

  private onLeave = () => {
    this.mouse.active = false;
  };

  private onDown = (e: PointerEvent) => {
    const r = this.el!.getBoundingClientRect();
    this.clicks.push({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  attach(el: HTMLElement): void {
    this.detach();
    this.el = el;
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerleave', this.onLeave);
    el.addEventListener('pointerdown', this.onDown);
  }

  detach(): void {
    if (!this.el) return;
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerleave', this.onLeave);
    this.el.removeEventListener('pointerdown', this.onDown);
    this.el = null;
    this.mouse.active = false;
  }

  clearClicks(): void {
    this.clicks.length = 0;
  }
}
```

- [x] **Step 4: Export from the package barrel**

Add to `packages/flateralus-pixi/src/index.ts`:

```ts
export * from './pointer-service';
```

- [x] **Step 5: Run test to verify it passes**

Run: `npx vitest run packages/flateralus-pixi/src/pointer-service.test.ts`
Expected: PASS, six tests.

- [x] **Step 6: Commit**

```bash
git add packages/flateralus-pixi/src
git commit -m "feat(flateralus-pixi): add shared pointer service"
```

---

### Task 5: Owned root container and DPR override

`PixiAnimation`'s context is the raw `PIXI.Application`, so there is no per-animation container to destroy. The prototype's shell created `ctx.root` and destroyed it on teardown. Move that contract into the base class so every ported animation inherits correct teardown.

**Files:**

- Modify: `packages/flateralus-pixi/src/pixi-animation.ts`
- Test: `packages/flateralus-pixi/src/pixi-animation.test.ts` (create)

**Interfaces:**

- Consumes: `PointerService` from Task 4.
- Produces: on `PixiAnimation`, `protected root: PIXI.Container`, `protected getRoot(): PIXI.Container`, `readonly dpr?: number`, `setPointerService(svc: PointerService): void`, `protected get pointer(): PointerService | null`. `onDestroy` becomes non-abstract with a base implementation that removes and destroys `root`; subclasses that override it must call `super.onDestroy()`.

- [x] **Step 1: Write the failing test**

```ts
// packages/flateralus-pixi/src/pixi-animation.test.ts
import { describe, it, expect, vi } from 'vitest';
import * as PIXI from 'pixi.js';
import { PixiAnimation } from './pixi-animation';
import { PointerService } from './pointer-service';
import { createManifest } from '@bracketbear/flateralus';

const MANIFEST = createManifest({
  id: 'test-anim',
  name: 'Test',
  description: 'Test animation',
  controls: [
    {
      name: 'speed',
      type: 'number',
      label: 'Speed',
      min: 0,
      max: 1,
      step: 0.1,
      defaultValue: 0.5,
    },
  ],
});

class TestAnimation extends PixiAnimation<typeof MANIFEST> {
  constructor() {
    super(MANIFEST);
  }
  onInit() {
    this.getRoot().addChild(new PIXI.Container());
  }
  onUpdate() {}
}

function fakeApp() {
  const stage = new PIXI.Container();
  return {
    stage,
    screen: { width: 800, height: 600 },
  } as unknown as PIXI.Application;
}

describe('PixiAnimation root container', () => {
  it('adds its root to the stage on init', () => {
    const app = fakeApp();
    const a = new TestAnimation();
    a.init(app);
    expect(app.stage.children).toContain(a['root']);
    expect(a['root'].children).toHaveLength(1);
  });

  it('removes and destroys the root on destroy', () => {
    const app = fakeApp();
    const a = new TestAnimation();
    a.init(app);
    const root = a['root'];
    const spy = vi.spyOn(root, 'destroy');
    a.destroy();
    expect(app.stage.children).not.toContain(root);
    expect(spy).toHaveBeenCalledWith({ children: true });
  });

  it('survives mount, unmount, and remount', () => {
    const app = fakeApp();
    const a = new TestAnimation();
    a.init(app);
    a.destroy();
    const b = new TestAnimation();
    b.init(app);
    expect(app.stage.children).toHaveLength(1);
    expect(app.stage.children).toContain(b['root']);
  });

  it('exposes an attached pointer service', () => {
    const a = new TestAnimation();
    const svc = new PointerService();
    a.setPointerService(svc);
    expect(a['pointer']).toBe(svc);
  });

  it('has no dpr override by default', () => {
    expect(new TestAnimation().dpr).toBeUndefined();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/flateralus-pixi/src/pixi-animation.test.ts`
Expected: FAIL, `getRoot` is not a function.

- [x] **Step 3: Write the implementation**

Replace the body of `packages/flateralus-pixi/src/pixi-animation.ts`:

```ts
import { Application as PixiApplication, Container } from 'pixi.js';
import {
  BaseAnimation,
  type AnimationManifest,
  type ManifestToControlValues,
} from '@bracketbear/flateralus';
import type { PointerService } from './pointer-service';

/**
 * PIXI adapter for BaseAnimation. The context is the raw PIXI Application,
 * so this class owns a per-animation `root` container: it is added to the
 * stage on init and destroyed on teardown, which is what makes
 * mount -> unmount -> mount leak-free.
 */
export abstract class PixiAnimation<
  TManifest extends AnimationManifest,
  TControlValues extends
    ManifestToControlValues<TManifest> = ManifestToControlValues<TManifest>,
> extends BaseAnimation<TManifest, TControlValues, PixiApplication> {
  /** Per-animation container. Everything an animation draws goes in here. */
  protected root: Container = new Container();

  /**
   * Optional cap on render resolution for expensive shaders, e.g. 1.2.
   * Subclasses override it as a field; the Lab reads it before init.
   */
  readonly dpr?: number;

  private pointerService: PointerService | null = null;

  setPointerService(svc: PointerService): void {
    this.pointerService = svc;
  }

  protected get pointer(): PointerService | null {
    return this.pointerService;
  }

  protected getRoot(): Container {
    return this.root;
  }

  abstract onInit(context: PixiApplication, controls: TControlValues): void;

  abstract onUpdate(
    context: PixiApplication,
    controls: TControlValues,
    deltaTime: number
  ): void;

  /**
   * Subclasses that hold GL resources of their own must override this and
   * call `super.onDestroy()` so the root still gets torn down.
   */
  onDestroy(): void {
    this.root.parent?.removeChild(this.root);
    this.root.destroy({ children: true });
    this.root = new Container();
  }
}
```

Then add the stage attachment. `BaseAnimation.init` calls `onInit`, so wrap it: override `init` in `PixiAnimation` to add `root` to the stage before delegating.

```ts
  init(context: PixiApplication): void {
    context.stage.addChild(this.root);
    super.init(context);
  }
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/flateralus-pixi/src/pixi-animation.test.ts`
Expected: PASS, five tests.

- [x] **Step 5: Verify the existing animations still compile**

Run: `./node_modules/typescript/bin/tsc -p packages/flateralus-pixi-animations/tsconfig.json --noEmit`
Expected: no new errors. Five of the seven shipped animations extend `BaseAnimation` directly rather than `PixiAnimation`, so they are unaffected; the two that do extend it now inherit a concrete `onDestroy` and must call `super.onDestroy()` if they define their own.

- [x] **Step 6: Commit**

```bash
git add packages/flateralus-pixi/src
git commit -m "feat(flateralus-pixi): give animations an owned root container"
```

---

### Task 6: Lab route and shell

**Files:**

- Create: `apps/bracketbear-website/src/pages/lab.astro`
- Create: `apps/bracketbear-website/src/components/lab/sections.ts`
- Create: `apps/bracketbear-website/src/components/lab/registry.ts`
- Create: `apps/bracketbear-website/src/components/lab/AnimationLab.tsx`
- Create: `apps/bracketbear-website/src/components/lab/LabHeader.tsx`
- Create: `apps/bracketbear-website/src/components/lab/LabNav.tsx`
- Create: `apps/bracketbear-website/src/components/lab/LabStage.tsx`
- Create: `apps/bracketbear-website/src/styles/lab.css`

**Interfaces:**

- Consumes: `PAL`, `THEMES`, `applyTheme`, `hx`, `type ThemeId` from `@bracketbear/flateralus`; `PixiApplication`, `PointerService` from `@bracketbear/flateralus-pixi`.
- Produces: `type SectionKey = 'hero' | 'statement' | 'intro' | 'work' | 'receipts' | 'values' | 'about' | 'cta' | 'toys'`; `SECTIONS: { key: SectionKey; label: string }[]`; `sectionBackground(key: SectionKey): string`; `type LabEntry = { id: string; section: SectionKey; name: string; blurb: string; tag: string; create: () => PixiAnimation<AnimationManifest> }`; `REGISTRY: LabEntry[]`.

- [x] **Step 1: Write the section map**

```ts
// apps/bracketbear-website/src/components/lab/sections.ts
import { PAL, hx } from '@bracketbear/flateralus';

export type SectionKey =
  | 'hero'
  | 'statement'
  | 'intro'
  | 'work'
  | 'receipts'
  | 'values'
  | 'about'
  | 'cta'
  | 'toys';

export const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'hero', label: '01 · Hero' },
  { key: 'statement', label: '02 · Statement' },
  { key: 'intro', label: '03 · Approach' },
  { key: 'work', label: '04 · Work' },
  { key: 'receipts', label: '05 · Receipts' },
  { key: 'values', label: '06 · Values' },
  { key: 'about', label: '07 · About' },
  { key: 'cta', label: '08 · Contact' },
  { key: 'toys', label: '09 · Toys' },
];

/** Stage background, read from the live palette so themes apply. */
export function sectionBackground(key: SectionKey): string {
  switch (key) {
    case 'hero':
      return `radial-gradient(ellipse 90% 70% at 50% 30%, ${hx(PAL.sun)} 0%, ${hx(PAL.bright)} 32%, ${hx(PAL.orange)} 62%, ${hx(PAL.orange)} 100%)`;
    case 'statement':
    case 'about':
    case 'toys':
      return hx(PAL.ink);
    case 'intro':
    case 'values':
    case 'cta':
      return hx(PAL.bright);
    case 'work':
    case 'receipts':
      return hx(PAL.orange);
  }
}

/** Chrome text sits on dark grounds in these sections. */
export function isDarkSection(key: SectionKey): boolean {
  return key === 'about' || key === 'statement' || key === 'toys';
}
```

- [x] **Step 2: Write the registry**

Start with the three animations Task 8 ports. Each entry carries the metadata the prototype kept in a separate `TAGS` map — the spec calls for that metadata to live on the definition.

```ts
// apps/bracketbear-website/src/components/lab/registry.ts
import type { SectionKey } from './sections';

export interface LabEntry {
  id: string;
  section: SectionKey;
  name: string;
  blurb: string;
  tag: string;
  create: () => import('@bracketbear/flateralus-pixi').PixiAnimation<never>;
}

export const REGISTRY: LabEntry[] = [];
```

Task 8 fills this array. Keep it ordered; the nav groups by section but preserves array order inside a group.

- [x] **Step 3: Write the Lab stylesheet**

```css
/* apps/bracketbear-website/src/styles/lab.css */
@import '@fontsource/anton/400.css';
@import '@fontsource/archivo-black/400.css';
@import '@fontsource/jetbrains-mono/400.css';
@import '@fontsource/jetbrains-mono/500.css';
@import '@fontsource/jetbrains-mono/700.css';
@import '@fontsource/plus-jakarta-sans/400.css';
@import '@fontsource/plus-jakarta-sans/600.css';
@import '@fontsource/plus-jakarta-sans/700.css';

.bb-lab {
  --orange: #ff5f1f;
  --bright: #ff7a33;
  --deep: #d8420c;
  --rust: #a82a07;
  --sun: #ffc24a;
  --cream: #fff3e3;
  --ink: #110a08;
  --ink-2: #1c130e;
  --cyan: #7df9ff;
  --acid: #d8ff3d;

  --hairline: rgba(255, 243, 227, 0.14);
  --muted-30: rgba(255, 243, 227, 0.3);
  --muted-42: rgba(255, 243, 227, 0.42);
  --muted-55: rgba(255, 243, 227, 0.55);
  --muted-60: rgba(255, 243, 227, 0.6);
  --muted-75: rgba(255, 243, 227, 0.75);

  --display: 'Anton', 'Helvetica Neue', sans-serif;
  --wordmark: 'Archivo Black', 'Helvetica Neue', sans-serif;
  --mono: 'JetBrains Mono', ui-monospace, monospace;
  --body: 'Plus Jakarta Sans', system-ui, sans-serif;

  height: 100vh;
  overflow: hidden;
  background: var(--ink);
  color: var(--cream);
  font-family: var(--body);
}

.bb-lab .notch-8 {
  clip-path: polygon(
    0 0,
    calc(100% - 8px) 0,
    100% 8px,
    100% 100%,
    8px 100%,
    0 calc(100% - 8px)
  );
}
.bb-lab .notch-14 {
  clip-path: polygon(
    0 0,
    calc(100% - 14px) 0,
    100% 14px,
    100% 100%,
    14px 100%,
    0 calc(100% - 14px)
  );
}

@keyframes bbLabPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}
.bb-lab .status-dot {
  animation: bbLabPulse 1.6s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .bb-lab .status-dot {
    animation: none;
  }
}
```

Add the stylesheet's directory to Tailwind's scan set if any Lab component uses utility classes, by confirming `apps/bracketbear-website/src/styles/global.css` already has a `@source` covering `src/**`.

- [x] **Step 4: Write the route**

```astro
---
// apps/bracketbear-website/src/pages/lab.astro
import Layout from '../layouts/Layout.astro';
import AnimationLab from '../components/lab/AnimationLab.tsx';
import '../styles/lab.css';
---

<Layout
  title="Animation Lab"
  description="Bracket Bear animation lab"
  noindex={true}
>
  <AnimationLab client:only="react" />
</Layout>
```

Check `src/layouts/Layout.astro` for an existing `noindex` prop. If there is none, add one that emits `<meta name="robots" content="noindex" />` when true, rather than inventing a different mechanism.

- [x] **Step 5: Write the island**

`AnimationLab.tsx` owns the PIXI application and the mount lifecycle. It must reproduce the four hardening behaviors the handoff calls out as earned: a boot gate, a debounced remount on resize, a ticker watchdog, and per-frame error isolation surfaced as a visible error state rather than only a console line.

This task builds the island without the inspector; Task 7 adds it. The four hardening behaviors
below are the ones the handoff calls out as earned, so none of them is optional.

```tsx
// apps/bracketbear-website/src/components/lab/AnimationLab.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { PixiApplication, PointerService } from '@bracketbear/flateralus-pixi';
import { applyTheme, type ThemeId } from '@bracketbear/flateralus';
import { REGISTRY } from './registry';
import LabHeader from './LabHeader';
import LabNav from './LabNav';
import LabStage from './LabStage';

const RESIZE_DEBOUNCE_MS = 250;
const WATCHDOG_INTERVAL_MS = 1500;

export default function AnimationLab() {
  const [activeId, setActiveId] = useState(REGISTRY[0]?.id ?? '');
  const [theme, setTheme] = useState<ThemeId>('sunset');
  const [inContext, setInContext] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PixiApplication | null>(null);
  const pointerRef = useRef(new PointerService());
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  /** Teardown, then build the entry fresh. Animations bake layout at init. */
  const mount = useCallback(() => {
    const app = appRef.current;
    if (!app) return;
    const entry = REGISTRY.find((e) => e.id === activeIdRef.current);
    if (!entry) return;
    setError(null);
    pointerRef.current.clearClicks();
    try {
      const animation = entry.create();
      animation.setPointerService(pointerRef.current);
      app.setAnimation(animation);
    } catch (e) {
      console.error(entry.id, e);
      setError(`${entry.id}: ${(e as Error).message}`);
    }
  }, []);

  // Boot gate: wait for the host and a non-empty registry before init.
  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host || REGISTRY.length === 0) return;

    const app = new PixiApplication({
      config: { autoResize: true, backgroundAlpha: 0, antialias: true },
    });
    (async () => {
      await app.init(host);
      if (cancelled) {
        app.destroy();
        return;
      }
      appRef.current = app;
      app.start();
      applyTheme('sunset');
      setReady(true);
      mount();
    })();

    return () => {
      cancelled = true;
      appRef.current = null;
      app.destroy();
    };
  }, [mount]);

  // Pointer input lives on the wrapper: BaseApplication sets
  // `pointer-events: none` on the canvas it appends.
  useEffect(() => {
    const wrap = wrapRef.current;
    const pointer = pointerRef.current;
    if (wrap) pointer.attach(wrap);
    return () => pointer.detach();
  }, [ready]);

  // Remount on selection and on theme change: many pieces read the palette
  // at build time, so recoloring requires a rebuild.
  useEffect(() => {
    if (ready) mount();
  }, [activeId, theme, ready, mount]);

  // Debounced remount on resize.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !ready) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(mount, RESIZE_DEBOUNCE_MS);
    });
    ro.observe(wrap);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [ready, mount]);

  // Watchdog: one thrown error inside an animation used to kill the RAF
  // chain for the whole page. Revive the ticker if it stops advancing.
  useEffect(() => {
    if (!ready) return;
    let last = -1;
    const id = setInterval(() => {
      const ticker = appRef.current?.getPixiApp()?.ticker;
      if (!ticker) return;
      if (ticker.lastTime === last && ticker.started) {
        try {
          ticker.stop();
          ticker.start();
        } catch (e) {
          console.error('ticker watchdog', e);
        }
      }
      last = ticker.lastTime;
    }, WATCHDOG_INTERVAL_MS);
    return () => clearInterval(id);
  }, [ready]);

  const handleTheme = useCallback((id: ThemeId) => {
    applyTheme(id);
    setTheme(id);
  }, []);

  const active = REGISTRY.find((e) => e.id === activeId) ?? null;

  return (
    <div className="bb-lab flex h-screen flex-col">
      <LabHeader
        ready={ready}
        count={REGISTRY.length}
        section={active?.section ?? 'hero'}
        theme={theme}
        onTheme={handleTheme}
        inContext={inContext}
        onView={setInContext}
        onRandomize={() => {}}
        onReset={() => {}}
      />
      <div className="flex min-h-0 flex-1">
        <LabNav activeId={activeId} onSelect={setActiveId} />
        <LabStage
          wrapRef={wrapRef}
          hostRef={hostRef}
          entry={active}
          inContext={inContext}
          error={error}
        />
      </div>
    </div>
  );
}
```

`onRandomize` and `onReset` stay as no-ops until Task 7, which owns control values and wires
both. Per-frame error isolation is the other half of the watchdog: `LabStage` renders the `error`
string over the stage so a broken animation is visible in the UI rather than only in the console.

- [x] **Step 6: Write header, nav, and stage**

Build `LabHeader.tsx`, `LabNav.tsx`, and `LabStage.tsx` to the metrics in the spec's source handoff. The header is 54px with a 2px `#ff7a33` bottom border; the nav is 236px on `#1c130e`; the stage is `flex-1`, `position: relative`, `overflow: hidden`, `cursor: crosshair`. Theme dots are 18px circles with `linear-gradient(135deg, orange 0 34%, sun 34% 67%, deep 67%)`, active ring `2px solid #fff3e3`, inactive `2px solid rgba(255,243,227,0.18)`, hover `scale(1.18)` over 0.15s.

The status line reads `"{N} animations registered · {SECTION} section"` once ready, and `"Booting flateralus…"` before.

- [x] **Step 7: Verify the route builds and renders**

Run: `npm run build --workspace=@bracketbear/bracketbear-website`
Expected: five pages built, including `/lab`.

Then run `npx astro preview --port 4399` from `apps/bracketbear-website`, open `http://localhost:4399/lab`, and confirm the shell renders with an empty stage and no console output. PIXI 8 warns loudly on v7 API use, so a silent console is the signal that matters.

- [x] **Step 8: Commit**

```bash
git add apps/bracketbear-website/src/pages/lab.astro apps/bracketbear-website/src/components/lab apps/bracketbear-website/src/styles/lab.css
git commit -m "feat(lab): add animation lab route and shell"
```

---

### Task 7: Manifest-driven inspector

**Files:**

- Create: `apps/bracketbear-website/src/components/lab/LabInspector.tsx`
- Create: `apps/bracketbear-website/src/components/lab/LabInspector.test.tsx`

**Interfaces:**

- Consumes: `LabEntry` from Task 6; `getManifestDefaultControlValues`, `getRandomControlValues`, `hx` from `@bracketbear/flateralus`.
- Produces: `LabInspector` taking `{ entry: LabEntry; manifest: AnimationManifest; values: Record<string, unknown>; onChange: (name: string, value: unknown) => void }`.

Build the panel from the existing per-type control components in `@bracketbear/flateralus-react`, not from `DebugControls`. `DebugControls` is a gear-triggered popover capped at `max-w-sm`, and it calls hooks after an early `return null`, which is a conditional-hooks violation not worth inheriting.

- [x] **Step 1: Write the failing test**

```tsx
// apps/bracketbear-website/src/components/lab/LabInspector.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LabInspector from './LabInspector';
import { createManifest } from '@bracketbear/flateralus';

const manifest = createManifest({
  id: 'molten-mark',
  name: 'Molten Mark (GLSL)',
  description: 'Domain-warped fbm melt.',
  controls: [
    {
      name: 'heat',
      type: 'number',
      label: 'Heat',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: 0.4,
      debug: true,
    },
    {
      name: 'grain',
      type: 'boolean',
      label: 'Grain',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'stage',
      type: 'select',
      label: 'Stage',
      options: [
        { value: 1, label: 'Ink stage' },
        { value: 0, label: 'Orange stage' },
      ],
      defaultValue: 1,
      debug: true,
      resetsAnimation: true,
    },
  ],
});

const entry = {
  id: 'molten-mark',
  section: 'hero',
  name: 'Molten Mark (GLSL)',
  blurb: 'Domain-warped fbm melt.',
  tag: 'glsl shader',
} as never;

describe('LabInspector', () => {
  it('renders the kicker, title, and blurb', () => {
    render(
      <LabInspector
        entry={entry}
        manifest={manifest}
        values={{ heat: 0.4, grain: true, stage: 1 }}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Manifest / molten-mark')).toBeInTheDocument();
    expect(screen.getByText('Molten Mark (GLSL)')).toBeInTheDocument();
    expect(screen.getByText('Domain-warped fbm melt.')).toBeInTheDocument();
  });

  it('marks controls that rebuild the scene', () => {
    render(
      <LabInspector
        entry={entry}
        manifest={manifest}
        values={{ heat: 0.4, grain: true, stage: 1 }}
        onChange={() => {}}
      />
    );
    expect(screen.getByText(/Ink stage ⟲/)).toBeInTheDocument();
  });

  it('reports number changes by control name', () => {
    const onChange = vi.fn();
    render(
      <LabInspector
        entry={entry}
        manifest={manifest}
        values={{ heat: 0.4, grain: true, stage: 1 }}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByLabelText('Heat'), {
      target: { value: '0.75' },
    });
    expect(onChange).toHaveBeenCalledWith('heat', 0.75);
  });

  it('renders a swatch for numeric select options', () => {
    const palette = createManifest({
      id: 'p',
      name: 'P',
      description: 'p',
      controls: [
        {
          name: 'tint',
          type: 'select',
          label: 'Tint',
          options: [{ value: 0xff5f1f, label: 'Orange' }],
          defaultValue: 0xff5f1f,
          debug: true,
        },
      ],
    });
    render(
      <LabInspector
        entry={entry}
        manifest={palette}
        values={{ tint: 0xff5f1f }}
        onChange={() => {}}
      />
    );
    expect(screen.getByTestId('swatch-tint-16736031')).toHaveStyle({
      backgroundColor: '#ff5f1f',
    });
  });
});
```

The swatch test id uses the decimal form of the option value: `0xff5f1f` is `16736031`. Emit
`data-testid={`swatch-${control.name}-${option.value}`}` from the component so the two agree.

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/bracketbear-website/src/components/lab/LabInspector.test.tsx`
Expected: FAIL, cannot resolve `./LabInspector`.

- [x] **Step 3: Write the component**

296px fixed, `background: #1c130e`, `border-left: 1px solid rgba(255,243,227,0.14)`, scrolling. Kicker `Manifest / {id}` in JetBrains Mono 0.58rem 700 `.24em` uppercase at 42% cream. Title in Anton 1.6rem, `line-height: .95`, uppercase, `#ff7a33`. Blurb 0.8rem/1.5 at 60% cream. Divider hairline, then controls in a 1.05rem gap column.

Each control gets a label row in JetBrains Mono 0.62rem 700 `.16em` uppercase at 75% cream, with the current value right-aligned in `#ffc24a`, and ` ⟲` appended to the value when the control has `resetsAnimation`. Numbers render as a full-width `<input type="range">` with `accent-color: #ff7a33`. Booleans render as On/Off option buttons. Selects render as wrapping option buttons at 0.6rem 700 `.12em` uppercase, `padding: .32rem .55rem`, active `#ff7a33` on `#110a08`, inactive 1px `rgba(255,243,227,0.25)` at 70% cream, hover border `#fff3e3`. A select option whose value is a number gets a 10px swatch before its label, colored `hx(value)`.

Close with a footer note at 0.56rem, 30% cream, explaining that reset controls rebuild the scene.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/bracketbear-website/src/components/lab/LabInspector.test.tsx`
Expected: PASS, four tests.

- [x] **Step 5: Wire Randomize and Reset**

In `AnimationLab.tsx`, Randomize calls `getRandomControlValues(manifest)` and remounts; Reset calls `getManifestDefaultControlValues(manifest)` and remounts. A control change remounts only when that control has `resetsAnimation`, otherwise it updates live through `animation.updateControls({ [name]: value })`.

- [x] **Step 6: Commit**

```bash
git add apps/bracketbear-website/src/components/lab
git commit -m "feat(lab): add manifest-driven inspector"
```

---

### Task 8: Port one animation per pipeline

Three animations prove the three pipelines end to end. Port them essentially intact: the math, the shaders, and the tuned defaults are the deliverable, and only the wrapper changes.

| Animation       | Source                | Pipeline               |
| --------------- | --------------------- | ---------------------- |
| `halftone-tide` | `lab-animations-1.js` | PIXI scene graph       |
| `heat-haze`     | `lab-shaders-2.js`    | shared WebGL2 harness  |
| `rd-vat`        | `lab-shaders-6.js`    | self-contained GPU sim |

**Files:**

- Create: `packages/flateralus-pixi-animations/src/halftone-tide/halftoneTideAnimation.ts` + `index.ts`
- Create: `packages/flateralus-pixi-animations/src/shared/shader-harness.ts`
- Create: `packages/flateralus-pixi-animations/src/heat-haze/heatHazeAnimation.ts` + `index.ts`
- Create: `packages/flateralus-pixi-animations/src/rd-vat/rdVatAnimation.ts` + `index.ts`
- Modify: `packages/flateralus-pixi-animations/src/index.ts`
- Modify: `apps/bracketbear-website/src/components/lab/registry.ts`

**Interfaces:**

- Consumes: `PixiAnimation`, `PointerService`, `px`, `glowTex`, `noise2`, `rand`, `pick` from `@bracketbear/flateralus-pixi`; `PAL`, `createManifest` from `@bracketbear/flateralus`.
- Produces: `createHalftoneTideAnimation()`, `createHeatHazeAnimation()`, `createRdVatAnimation()`, each returning a `PixiAnimation`. The shared harness exports `createShaderShell(options)` returning `{ canvas, gl, program, uniforms, render(w, h, time), destroy() }`.

- [x] **Step 1: Port the PIXI scene-graph piece**

Follow the package's folder convention: `src/<kebab-case>/<camelCase>Animation.ts` plus an `index.ts` that re-exports it. Export the class with `export class`, and a `create<Name>Animation()` factory.

Map the prototype's shape onto the real lifecycle: `def.controls` becomes the `createManifest` array with `debug: true` on every control so the inspector shows it; `def.init(ctx)` becomes `onInit(app, controls)` drawing into `this.getRoot()`; `def.update(ctx, dt)` becomes `onUpdate(app, controls, deltaTime)`; `ctx.s` scratch state becomes instance fields; `ctx.v` becomes `controls`; `ctx.w`/`ctx.h` become `app.screen.width`/`app.screen.height`; `ctx.mouse` and `ctx.clicks` come from `this.pointer`. Read palette values as `PAL.orange` at draw time, never destructured.

- [x] **Step 2: Verify it in the Lab**

Add the entry to `REGISTRY`, then run the preview server and open `/lab`. Confirm the animation renders, the cursor affects it, clicks produce ripples, every control moves it, Randomize and Reset work, and switching to another entry and back leaves no growing memory or duplicated canvas.

- [x] **Step 3: Port the shared shader harness**

Move the `fx` / `fxPP` / `shell` machinery from `lab-shaders-2.js` into `src/shared/shader-harness.ts`: the fullscreen-triangle vertex shader generated from `gl_VertexID` with no buffers, the fragment prelude supplying `hash21`, `vnoise`, `fbm`, `maskA`, and `finish`, and the common uniform list `uTex, uTime, uRes, uRect, uGrain, uStage, uInk, uOrange, uSun, uCream`. Palette uniforms are pushed from `PAL` every frame, which is what makes themes reach shaders.

The harness owns an offscreen `webgl2` canvas and blits into PIXI as a `Sprite` over a `Texture.from(canvas)`. Its `destroy()` must delete the program, shaders, textures, and framebuffers, then destroy the PIXI texture — this is the leak surface that matters.

- [x] **Step 4: Port `heat-haze` on the harness, and verify**

Confirm in the Lab that switching themes recolors it, since that exercises the per-frame palette uniform push.

- [x] **Step 5: Port the self-contained sim**

`rd-vat` is Gray–Scott reaction–diffusion over a ping-pong float-texture pair, so it needs its own FBO setup rather than the shared harness. Port it with its own `destroy()` deleting both framebuffers and both textures.

- [x] **Step 6: Port a DPR override**

`raymarch-mark` uses `dpr: 1.2`. Confirm the `dpr` field added in Task 5 is read by the Lab before init and applied to the render resolution, using `rd-vat` as the test case by temporarily setting `dpr = 1` and observing the resolution change.

- [x] **Step 7: Verify teardown leaks nothing**

In the Lab, cycle through the three animations ten times. In Chrome DevTools, confirm the WebGL context count stays flat and the JS heap returns to baseline after a forced collection. This is the check that decides whether Plan 2 can proceed mechanically.

- [x] **Step 8: Commit**

```bash
git add packages/flateralus-pixi-animations/src apps/bracketbear-website/src/components/lab/registry.ts
git commit -m "feat(animations): port halftone-tide, heat-haze, and rd-vat"
```

---

## What this plan deliberately leaves out

- The remaining animations. Plan 2 covers them, and should not be written until Task 8 proves the three pipelines, because the port shape is what Task 8 discovers.
- URL state, manifest export, and wiring "In context" to the real site section components. Plan 3.
- `patch-bay` and `block-stack`, which the prototype shell does not load. Decide in Plan 2 whether to revive or drop them.
- The unreferenced `apps/bracketbear-website/src/components/HeroSection.tsx`. It is dead code from the pre-rebuild site and no page imports it; wiring it up or deleting it is a content decision.
- The pre-existing displacement-noise bug in `bb-home.client.ts`, documented in the spec. Fixing it would switch on an effect the site has never shipped, which is a visual decision on its own terms.

---

## What actually changed

The plan held up, with five corrections found during execution. Each is in the
commits; they are listed here so the next plan starts from the real shape.

**Task 2 touched five files, not three.** Widening select values to
`string | number` also required widening `SelectControlValue` in
`packages/flateralus/src/types/index.ts`, whose `metadata.options` was typed
`string[]`, and the select branch of `ManifestToStageControlValues`. It then
broke three call sites in the two existing animations that pass a select value
into a helper typed `string`; those now coerce with `String(...)`.

**The root container attaches lazily, not once in `init`.** The plan attached it
in `init` only. That breaks the reset pattern `particle-wave` uses, where an
animation calls `onDestroy()` then `onInit()` without a second `init()`: the
replacement root would be orphaned off-stage. `getRoot()` now re-attaches when
the root has no parent. Both existing `PixiAnimation` subclasses override
`onDestroy` and had to be given a `super.onDestroy()` call, or the change would
have leaked one empty container per mount.

**jsdom has no `PointerEvent`.** The pointer-service tests dispatch `MouseEvent`
instead, which carries the same `clientX`/`clientY` and dispatches under the same
type strings.

**The repo's ESLint has no react-hooks plugin.** `eslint-disable` comments
naming `react-hooks/exhaustive-deps` fail the pre-commit hook as an unknown
rule. The effects list honest dependencies instead.

**The Lab does not use `Layout.astro`.** That layout wraps everything in the site
nav, footer, contact form and pointer effects, none of which belong behind a
full-viewport stage, and it has no `noindex` prop. `/lab` renders its own
document.

Two fidelity bugs were found by measuring the rendered page rather than reading
the code: the nav and inspector are sized `content-box` with horizontal padding,
so they rendered 26px and 32px wider than the spec's 236px and 296px. Both now
set `box-sizing: border-box`.

## Verification performed

- 832 tests pass across 64 files.
- `flateralus`, `flateralus-pixi`, `flateralus-pixi-animations` and
  `flateralus-react` all type-check clean; the Lab components lint clean.
- The site builds, five pages including `/lab`.
- In Chrome, all three animations render: the halftone field with its cursor
  swell, the heat-haze headline with visible chromatic aberration, and the
  reaction-diffusion vat seeded from the mark, upright.
- The reaction-diffusion sim was watched eroding the seeded mark into outlines
  across successive frames, which is the check that the ping-pong float buffers
  actually carry state.
- Switching to the Game Boy theme recolored both a shader animation and a
  scene-graph animation, which is what proves the per-frame palette uniform push
  works and that the palette is genuinely shared.
- Numeric select controls render their color swatches and drive the animations,
  end to end, which was the point of the schema change.

**The leak check, completed.** The first attempt failed because the tab was
backgrounded, where animation frames stop and timers are clamped, so awaited
loops timed out before returning anything. Rewriting the cycle as a self-driving
timer that records progress on `window`, and reading the result from a separate
call, works regardless of throttling.

Seventy-two mount and unmount cycles across the three animations produced no
WebGL context-limit warning, no shader error, no exception, and a canvas count
that never left one. That rules out the failure mode that actually breaks the
Lab, which is exhausting the browser's WebGL context budget.

The heap needed more care. Sampled naively it looked alarming, climbing to 92MB
over 36 cycles, but most of that is collectable garbage: `rd-vat` allocates a
4.7MB seed buffer per mount and drops it. A first instrument made this worse by
allocating 48MB per sample itself. Measured quietly, the heap sat at 90MB, then a
collection dropped it to 52MB where it held flat.

| After                      | Settled heap |
| -------------------------- | ------------ |
| page load, nothing mounted | 8 MB         |
| 36 cycles                  | 33 MB        |
| 72 cycles                  | 52 MB        |

So roughly 0.5MB is retained per cycle, decelerating rather than running away,
which is consistent with PIXI's own caches and V8 compiled code rather than a
per-mount leak. It is small enough not to gate the bulk port, and worth
re-measuring across the full catalog in that plan's closing task.
