import * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation, noise2, px, rand } from '@bracketbear/flateralus-pixi';

const MANIFEST = createManifest({
  id: 'signal-alignment',
  name: 'Signal Alignment',
  description:
    'A flow field of ink dashes: noise on one side of the threshold, ordered lanes on the other. The cursor stirs the field.',
  controls: [
    {
      name: 'density',
      type: 'number',
      label: 'Dash Count',
      min: 60,
      max: 500,
      step: 20,
      defaultValue: 240,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'alignX',
      type: 'number',
      label: 'Order Threshold',
      min: 0.25,
      max: 0.8,
      step: 0.05,
      defaultValue: 0.52,
      debug: true,
    },
    {
      name: 'speed',
      type: 'number',
      label: 'Flow Speed',
      min: 20,
      max: 160,
      step: 5,
      defaultValue: 60,
      debug: true,
    },
    {
      name: 'noiseScale',
      type: 'number',
      label: 'Noise Scale',
      min: 0.002,
      max: 0.02,
      step: 0.001,
      defaultValue: 0.007,
      debug: true,
    },
    {
      name: 'lanes',
      type: 'number',
      label: 'Lane Count',
      min: 4,
      max: 18,
      step: 1,
      defaultValue: 9,
      debug: true,
    },
    {
      name: 'showThreshold',
      type: 'boolean',
      label: 'Show Threshold',
      defaultValue: true,
      debug: true,
    },
  ],
} as const);

export type SignalAlignmentControlValues = ManifestToControlValues<
  typeof MANIFEST
>;

interface Dash {
  sprite: PIXI.Sprite;
  /** Heading in radians. */
  angle: number;
}

/** Cursor stir radius and strength. */
const STIR_RADIUS = 110;
const STIR_STRENGTH = 2.4;

export class SignalAlignmentAnimation extends PixiAnimation<typeof MANIFEST> {
  private dashes: Dash[] = [];
  private gate: PIXI.Graphics | null = null;
  private t = 0;

  constructor(initialControls?: Partial<SignalAlignmentControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(app: PIXI.Application, controls: SignalAlignmentControlValues): void {
    const root = this.getRoot();
    const w = app.screen.width;
    const h = app.screen.height;
    this.dashes = [];
    for (let i = 0; i < controls.density; i++) {
      const sprite = px(PAL.ink, 14, 3);
      sprite.x = rand(0, w);
      sprite.y = rand(0, h);
      root.addChild(sprite);
      this.dashes.push({ sprite, angle: rand(0, 6.28) });
    }
    this.gate = new PIXI.Graphics();
    root.addChild(this.gate);
    this.t = 0;
  }

  onUpdate(
    app: PIXI.Application,
    controls: SignalAlignmentControlValues,
    deltaTime: number
  ): void {
    const gate = this.gate;
    if (!gate) return;

    const dt = Math.min(0.05, deltaTime);
    this.t += dt;

    const w = app.screen.width;
    const h = app.screen.height;
    const gateX = controls.alignX * w;
    const mouse = this.pointer?.mouse;

    gate.clear();
    if (controls.showThreshold) {
      for (let y = 0; y < h; y += 18) {
        gate.rect(gateX - 1, y, 2, 9).fill({ color: PAL.ink, alpha: 0.35 });
      }
    }

    for (const d of this.dashes) {
      const sprite = d.sprite;
      // Right of the threshold the field is ordered into lanes; left of it
      // the dashes follow noise.
      const ordered = sprite.x > gateX;
      let target: number;
      if (ordered) {
        target = 0;
        const laneH = h / controls.lanes;
        const lane = Math.max(
          0,
          Math.min(
            controls.lanes - 1,
            Math.round((sprite.y - laneH / 2) / laneH)
          )
        );
        sprite.y += (lane * laneH + laneH / 2 - sprite.y) * Math.min(1, 4 * dt);
      } else {
        target =
          noise2(
            sprite.x * controls.noiseScale,
            sprite.y * controls.noiseScale + this.t * 0.15
          ) *
          Math.PI *
          1.4;
      }

      if (mouse?.active) {
        const dx = sprite.x - mouse.x;
        const dy = sprite.y - mouse.y;
        const dd = Math.hypot(dx, dy);
        if (dd < STIR_RADIUS) target += (1 - dd / STIR_RADIUS) * STIR_STRENGTH;
      }

      // Turn the short way round.
      let diff = target - d.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      d.angle += diff * Math.min(1, (ordered ? 6 : 2.2) * dt);
      sprite.rotation = d.angle;

      const spd = controls.speed * (ordered ? 1.6 : 1);
      sprite.x += Math.cos(d.angle) * spd * dt;
      sprite.y += Math.sin(d.angle) * spd * dt;
      sprite.alpha = ordered ? 1 : 0.55;
      sprite.tint = ordered ? PAL.ink : PAL.ink2;

      if (sprite.x > w + 12) {
        sprite.x = -12;
        sprite.y = rand(0, h);
        d.angle = rand(0, 6.28);
      }
      if (sprite.x < -14) sprite.x = w + 12;
      if (sprite.y < -12) sprite.y = h + 12;
      if (sprite.y > h + 12) sprite.y = -12;
    }
  }

  onDestroy(): void {
    this.dashes = [];
    this.gate = null;
    super.onDestroy();
  }
}

export function createSignalAlignmentAnimation(
  initialControls?: Partial<SignalAlignmentControlValues>
): SignalAlignmentAnimation {
  return new SignalAlignmentAnimation(initialControls);
}
