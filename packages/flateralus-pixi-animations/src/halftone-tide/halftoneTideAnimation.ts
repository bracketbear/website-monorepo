import * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';

const MANIFEST = createManifest({
  id: 'halftone-tide',
  name: 'Halftone Tide',
  description:
    'The site’s halftone pattern, alive: dot radii breathe in slow traveling waves. The cursor inflates the field; clicks drop ripples.',
  controls: [
    {
      name: 'spacing',
      type: 'number',
      label: 'Dot Spacing',
      min: 16,
      max: 48,
      step: 2,
      defaultValue: 26,
      debug: true,
    },
    {
      name: 'dotSize',
      type: 'number',
      label: 'Dot Size',
      min: 0.15,
      max: 0.75,
      step: 0.05,
      defaultValue: 0.4,
      debug: true,
    },
    {
      name: 'waveSpeed',
      type: 'number',
      label: 'Wave Speed',
      min: 0.2,
      max: 3,
      step: 0.1,
      defaultValue: 0.9,
      debug: true,
    },
    {
      name: 'waveScale',
      type: 'number',
      label: 'Wave Scale',
      min: 0.003,
      max: 0.02,
      step: 0.001,
      defaultValue: 0.008,
      debug: true,
    },
    {
      name: 'mouseSwell',
      type: 'number',
      label: 'Cursor Swell',
      min: 0,
      max: 2,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'revealOnly',
      type: 'boolean',
      label: 'Cursor Reveal',
      defaultValue: false,
      debug: true,
    },
    {
      name: 'inverted',
      type: 'boolean',
      label: 'Cream Dots',
      defaultValue: false,
      debug: true,
    },
  ],
} as const);

export type HalftoneTideControlValues = ManifestToControlValues<
  typeof MANIFEST
>;

interface Ripple {
  x: number;
  y: number;
  r: number;
  life: number;
}

/** Ripple expansion in px per second, and how fast it fades. */
const RIPPLE_SPEED = 260;
const RIPPLE_DECAY = 0.55;
/** Distances at which the cursor and ripples stop influencing a dot. */
const SWELL_RADIUS = 160;
const RIPPLE_BAND = 34;
const REVEAL_RADIUS = 260;
const REVEAL_BAND = 40;

export class HalftoneTideAnimation extends PixiAnimation<typeof MANIFEST> {
  private g: PIXI.Graphics | null = null;
  private t = 0;
  private ripples: Ripple[] = [];

  constructor(initialControls?: Partial<HalftoneTideControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.g = new PIXI.Graphics();
    this.getRoot().addChild(this.g);
    this.t = 0;
    this.ripples = [];
  }

  onUpdate(
    app: PIXI.Application,
    controls: HalftoneTideControlValues,
    deltaTime: number
  ): void {
    const g = this.g;
    if (!g) return;

    // The prototype clamped dt so a backgrounded tab does not jump the sim.
    const dt = Math.min(0.05, deltaTime);
    this.t += dt;

    const pointer = this.pointer;
    const mouse = pointer?.mouse;

    if (pointer) {
      while (pointer.clicks.length) {
        const k = pointer.clicks.shift()!;
        this.ripples.push({ x: k.x, y: k.y, r: 0, life: 1 });
      }
    }
    for (const rp of this.ripples) {
      rp.r += RIPPLE_SPEED * dt;
      rp.life -= dt * RIPPLE_DECAY;
    }
    this.ripples = this.ripples.filter((rp) => rp.life > 0);

    const w = app.screen.width;
    const h = app.screen.height;
    const sp = controls.spacing;
    const maxR = sp * controls.dotSize;
    const color = controls.inverted ? PAL.cream : PAL.ink;
    const hotColor = controls.inverted ? PAL.sun : PAL.deep;

    g.clear();

    for (let y = sp / 2; y < h; y += sp) {
      // Offset every other row so the grid reads as halftone, not a lattice.
      const rowOff = ((Math.floor(y / sp) % 2) * sp) / 2;
      for (let x = sp / 2 + rowOff; x < w; x += sp) {
        let k =
          0.55 +
          0.45 *
            Math.sin(
              x * controls.waveScale * 1.6 +
                y * controls.waveScale +
                this.t * controls.waveSpeed
            ) *
            Math.cos(
              y * controls.waveScale * 1.3 - this.t * controls.waveSpeed * 0.7
            );

        if (mouse?.active && controls.mouseSwell > 0) {
          const d = Math.hypot(x - mouse.x, y - mouse.y);
          if (d < SWELL_RADIUS) {
            k += (1 - d / SWELL_RADIUS) * controls.mouseSwell;
          }
        }
        for (const rp of this.ripples) {
          const d = Math.abs(Math.hypot(x - rp.x, y - rp.y) - rp.r);
          if (d < RIPPLE_BAND) k += (1 - d / RIPPLE_BAND) * rp.life * 1.4;
        }

        // Reveal mode: dots stay invisible until the cursor or a ripple
        // uncovers them.
        let a = 1;
        if (controls.revealOnly) {
          a = 0;
          if (mouse?.active) {
            const d = Math.hypot(x - mouse.x, y - mouse.y);
            if (d < REVEAL_RADIUS) a = Math.pow(1 - d / REVEAL_RADIUS, 1.3);
          }
          for (const rp of this.ripples) {
            const d = Math.abs(Math.hypot(x - rp.x, y - rp.y) - rp.r);
            if (d < REVEAL_BAND) {
              a = Math.max(a, (1 - d / REVEAL_BAND) * rp.life);
            }
          }
          if (a <= 0.02) continue;
        }

        const r = Math.max(0.4, Math.min(sp * 0.62, maxR * k));
        g.circle(x, y, r).fill({
          color: k > 1.25 ? hotColor : color,
          alpha: a,
        });
      }
    }
  }

  onDestroy(): void {
    this.g = null;
    this.ripples = [];
    super.onDestroy();
  }
}

export function createHalftoneTideAnimation(
  initialControls?: Partial<HalftoneTideControlValues>
): HalftoneTideAnimation {
  return new HalftoneTideAnimation(initialControls);
}
