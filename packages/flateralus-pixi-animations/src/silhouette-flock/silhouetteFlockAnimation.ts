import * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation, rand } from '@bracketbear/flateralus-pixi';

const MANIFEST = createManifest({
  id: 'silhouette-flock',
  name: 'Silhouette Flock',
  description:
    'Swifts crossing the sunset, DKC-silhouette style: scythe-winged boids that burst-flap then glide, never slowing down. Fully ambient; the cursor reads as a hawk and scatters them; click to release more.',
  controls: [
    {
      name: 'count',
      type: 'number',
      label: 'Bird Count',
      min: 20,
      max: 200,
      step: 10,
      defaultValue: 70,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'cohesion',
      type: 'number',
      label: 'Cohesion',
      min: 0,
      max: 2,
      step: 0.1,
      defaultValue: 0.8,
      debug: true,
    },
    {
      name: 'alignment',
      type: 'number',
      label: 'Alignment',
      min: 0,
      max: 2,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'separation',
      type: 'number',
      label: 'Separation',
      min: 0,
      max: 2,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'maxSpeed',
      type: 'number',
      label: 'Max Speed',
      min: 60,
      max: 300,
      step: 10,
      defaultValue: 170,
      debug: true,
    },
    {
      name: 'glide',
      type: 'number',
      label: 'Glide Bias',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.5,
      debug: true,
    },
    {
      name: 'hawkRadius',
      type: 'number',
      label: 'Cursor Scare',
      min: 0,
      max: 250,
      step: 10,
      defaultValue: 130,
      debug: true,
    },
  ],
} as const);

export type SilhouetteFlockControlValues = ManifestToControlValues<
  typeof MANIFEST
>;

interface Bird {
  sprite: PIXI.Sprite;
  scale: number;
  vx: number;
  vy: number;
  /** Current wing-cycle frame, advanced only while flapping. */
  frame: number;
  flapping: boolean;
  /** Seconds left in the current flap burst or glide. */
  gait: number;
  rotation: number;
}

/** Neighbour and separation radii for the boid rules. */
const NEIGHBOUR_R = 70;
const SEPARATION_R = 26;
/** Hard cap so repeated clicks cannot grow the flock without bound. */
const MAX_BIRDS = 240;
const FRAME_COUNT = 6;

/** One swift pose: spindle body, forked tail, swept crescent wings. */
function drawSwift(g: CanvasRenderingContext2D, spread: number, sweep: number) {
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(11, 0);
  g.quadraticCurveTo(8, -2.6, 2, -2.4);
  g.quadraticCurveTo(-6, -1.6, -10, 0);
  g.quadraticCurveTo(-6, 1.6, 2, 2.4);
  g.quadraticCurveTo(8, 2.6, 11, 0);
  g.fill();

  g.beginPath();
  g.moveTo(-7, -1.6);
  g.lineTo(-16, -3.4);
  g.lineTo(-11.5, 0);
  g.lineTo(-16, 3.4);
  g.lineTo(-7, 1.6);
  g.closePath();
  g.fill();

  for (const sn of [-1, 1]) {
    const tx = -4 - 11 * sweep;
    const ty = sn * 18 * spread;
    g.beginPath();
    g.moveTo(5, sn * 1.5);
    g.quadraticCurveTo(4 + 2 * spread, sn * 11 * spread, tx, ty);
    g.quadraticCurveTo(-3.5, sn * 9 * spread, -3.5, sn * 1.8);
    g.closePath();
    g.fill();
  }
}

export class SilhouetteFlockAnimation extends PixiAnimation<typeof MANIFEST> {
  private frames: PIXI.Texture[] = [];
  private birds: Bird[] = [];
  private t = 0;

  constructor(initialControls?: Partial<SilhouetteFlockControlValues>) {
    super(MANIFEST, initialControls);
  }

  /** Frame 0 is the full-glide scythe pose. */
  private buildFrames(): void {
    this.frames = [];
    for (let f = 0; f < FRAME_COUNT; f++) {
      const p = (f / FRAME_COUNT) * Math.PI * 2;
      const cv = document.createElement('canvas');
      cv.width = 72;
      cv.height = 48;
      const g = cv.getContext('2d')!;
      g.translate(36, 24);
      drawSwift(
        g,
        1 - 0.45 * (0.5 - 0.5 * Math.cos(p)),
        0.85 + 0.15 * Math.cos(p)
      );
      this.frames.push(PIXI.Texture.from(cv));
    }
  }

  private makeBird(w: number, h: number, x?: number, y?: number): Bird {
    const sprite = new PIXI.Sprite(this.frames[0]);
    sprite.anchor.set(0.5);
    sprite.tint = PAL.ink;
    const scale = rand(0.3, 0.55);
    sprite.scale.set(scale);
    sprite.x = x == null ? rand(0, w) : x;
    sprite.y = y == null ? rand(0, h * 0.7) : y;
    this.getRoot().addChild(sprite);
    const a = rand(0, 6.28);
    const spd = rand(90, 140);
    return {
      sprite,
      scale,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      frame: rand(0, FRAME_COUNT),
      flapping: Math.random() < 0.5,
      gait: rand(0.2, 1.2),
      rotation: a,
    };
  }

  onInit(app: PIXI.Application, controls: SilhouetteFlockControlValues): void {
    this.buildFrames();
    const w = app.screen.width;
    const h = app.screen.height;
    this.birds = [];
    for (let i = 0; i < controls.count; i++)
      this.birds.push(this.makeBird(w, h));
    this.t = 0;
  }

  onUpdate(
    app: PIXI.Application,
    controls: SilhouetteFlockControlValues,
    deltaTime: number
  ): void {
    const dt = Math.min(0.05, deltaTime);
    this.t += dt;

    const w = app.screen.width;
    const h = app.screen.height;
    const pointer = this.pointer;
    const mouse = pointer?.mouse;

    if (pointer) {
      while (pointer.clicks.length) {
        const k = pointer.clicks.shift()!;
        for (let i = 0; i < 6; i++) {
          this.birds.push(
            this.makeBird(w, h, k.x + rand(-20, 20), k.y + rand(-20, 20))
          );
        }
        while (this.birds.length > MAX_BIRDS) {
          this.birds.shift()!.sprite.destroy();
        }
      }
    }

    const flock = this.birds;
    for (const b of flock) {
      let cx = 0;
      let cy = 0;
      let ax = 0;
      let ay = 0;
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (const o of flock) {
        if (o === b) continue;
        const dx = o.sprite.x - b.sprite.x;
        const dy = o.sprite.y - b.sprite.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > NEIGHBOUR_R * NEIGHBOUR_R) continue;
        n++;
        cx += o.sprite.x;
        cy += o.sprite.y;
        ax += o.vx;
        ay += o.vy;
        if (d2 < SEPARATION_R * SEPARATION_R && d2 > 0.01) {
          const d = Math.sqrt(d2);
          sx -= (dx / d) * (1 - d / SEPARATION_R);
          sy -= (dy / d) * (1 - d / SEPARATION_R);
        }
      }
      if (n > 0) {
        b.vx +=
          ((cx / n - b.sprite.x) * 0.02 * controls.cohesion +
            (ax / n - b.vx) * 0.05 * controls.alignment) *
          dt *
          60;
        b.vy +=
          ((cy / n - b.sprite.y) * 0.02 * controls.cohesion +
            (ay / n - b.vy) * 0.05 * controls.alignment) *
          dt *
          60;
      }
      b.vx += sx * 30 * controls.separation * dt;
      b.vy += sy * 30 * controls.separation * dt;

      if (mouse?.active && controls.hawkRadius > 0) {
        const dx = b.sprite.x - mouse.x;
        const dy = b.sprite.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < controls.hawkRadius && d > 0.01) {
          const f = (1 - d / controls.hawkRadius) * 900 * dt;
          b.vx += (dx / d) * f;
          b.vy += (dy / d) * f;
          // Jink: burst-flap away from the hawk.
          b.flapping = true;
          b.gait = Math.max(b.gait, 0.3);
        }
      }

      // Gentle pull toward the sky band so the flock stays composed.
      b.vy += (h * 0.38 - b.sprite.y) * 0.05 * dt;

      // Swift gait: alternate flap bursts for thrust with long coasting glides.
      b.gait -= dt;
      if (b.gait <= 0) {
        b.flapping = !b.flapping;
        b.gait = b.flapping
          ? rand(0.25, 0.7)
          : rand(0.3, 1.4) * (0.4 + controls.glide * 1.2);
      }
      if (b.flapping) {
        const hyp = Math.hypot(b.vx, b.vy) || 1;
        b.vx += (b.vx / hyp) * 130 * dt;
        b.vy += (b.vy / hyp) * 130 * dt;
        b.frame += dt * 15;
      }

      const speed = Math.hypot(b.vx, b.vy) || 1;
      // Swifts never slow to a hover.
      const minSpeed = controls.maxSpeed * 0.55;
      if (speed > controls.maxSpeed) {
        b.vx *= controls.maxSpeed / speed;
        b.vy *= controls.maxSpeed / speed;
      }
      if (speed < minSpeed) {
        b.vx *= minSpeed / speed;
        b.vy *= minSpeed / speed;
      }
      b.sprite.x += b.vx * dt;
      b.sprite.y += b.vy * dt;
      if (b.sprite.x < -26) b.sprite.x = w + 24;
      if (b.sprite.x > w + 26) b.sprite.x = -24;
      if (b.sprite.y < -26) b.sprite.y = h + 24;
      if (b.sprite.y > h + 26) b.sprite.y = -24;

      // Smoothed heading, with the body compressed on hard turns to read as bank.
      const target = Math.atan2(b.vy, b.vx);
      let dA = target - b.rotation;
      while (dA > Math.PI) dA -= Math.PI * 2;
      while (dA < -Math.PI) dA += Math.PI * 2;
      b.rotation += dA * Math.min(1, dt * 9);
      b.sprite.rotation = b.rotation;
      b.sprite.texture =
        this.frames[b.flapping ? Math.floor(b.frame) % FRAME_COUNT : 0];
      b.sprite.scale.x = b.scale;
      b.sprite.scale.y = b.scale * (1 - Math.min(0.4, Math.abs(dA) * 1.6));
    }
  }

  onDestroy(): void {
    // The six flap frames are canvas-backed textures built per mount, so
    // they have to be released explicitly.
    for (const t of this.frames) t.destroy(true);
    this.frames = [];
    this.birds = [];
    super.onDestroy();
  }
}

export function createSilhouetteFlockAnimation(
  initialControls?: Partial<SilhouetteFlockControlValues>
): SilhouetteFlockAnimation {
  return new SilhouetteFlockAnimation(initialControls);
}
