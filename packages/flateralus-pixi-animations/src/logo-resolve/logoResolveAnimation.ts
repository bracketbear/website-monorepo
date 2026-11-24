import * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import {
  PixiAnimation,
  glowTex,
  pick,
  px,
  rand,
} from '@bracketbear/flateralus-pixi';
import { logoImageData } from '../shared/logo';

const MANIFEST = createManifest({
  id: 'logo-resolve',
  name: 'Logo Resolve',
  description:
    'The [BB] mark as a neon sign: pixels flicker on like a boot sequence, then hold with an additive glow while individual pixels glitch cyan and the sign buzzes. The cursor heats pixels through cyan to white-hot; click for a shockwave.',
  controls: [
    {
      name: 'pixelSize',
      type: 'number',
      label: 'Pixel Size',
      min: 6,
      max: 18,
      step: 2,
      defaultValue: 10,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'logoScale',
      type: 'number',
      label: 'Logo Scale',
      min: 0.3,
      max: 0.85,
      step: 0.05,
      defaultValue: 0.6,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'bow',
      type: 'number',
      label: 'Spherical Bow',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.55,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'bootTime',
      type: 'number',
      label: 'Boot Time (s)',
      min: 0.5,
      max: 6,
      step: 0.25,
      defaultValue: 2.5,
      debug: true,
    },
    {
      name: 'glowIntensity',
      type: 'number',
      label: 'Glow',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.6,
      debug: true,
    },
    {
      name: 'flicker',
      type: 'number',
      label: 'Neon Flicker',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.35,
      debug: true,
    },
    {
      name: 'pixelGlitch',
      type: 'number',
      label: 'Pixel Glitch',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.5,
      debug: true,
    },
    {
      name: 'touchRadius',
      type: 'number',
      label: 'Touch Radius',
      min: 0,
      max: 250,
      step: 10,
      defaultValue: 120,
      debug: true,
    },
    {
      name: 'sweep',
      type: 'boolean',
      label: 'Scanline Sweep',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'accent',
      type: 'select',
      label: 'Neon Color',
      options: [
        { value: 0xff7a33, label: 'Bright' },
        { value: 0xffc24a, label: 'Sun' },
        { value: 0x7df9ff, label: 'Cyan' },
        { value: 0xd8ff3d, label: 'Acid' },
      ],
      defaultValue: 0xff7a33,
      debug: true,
      resetsAnimation: true,
    },
  ],
} as const);

export type LogoResolveControlValues = ManifestToControlValues<typeof MANIFEST>;

interface Glitch {
  life: number;
  mode: 'shift' | 'color' | 'off';
  off: number;
  col: number;
}

interface Pixel {
  sp: PIXI.Sprite;
  gsp: PIXI.Sprite;
  col: number;
  /** Home position; the springs recover to this. */
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Staggers this pixel's boot-on moment. */
  delay: number;
  dip: number;
  gl: Glitch | null;
  shade: number;
}

/** Source resolution the mark is sampled from. */
const SRC_W = 240;
const SRC_H = 150;
/** Cap on total cells, so a small pixel size cannot explode the sprite count. */
const MAX_CELLS = 3600;

export class LogoResolveAnimation extends PixiAnimation<typeof MANIFEST> {
  private pix: Pixel[] = [];
  private glowCont: PIXI.Container | null = null;
  private pixCont: PIXI.Container | null = null;
  private p = 10;
  private logoTop = 0;
  private logoH = 0;
  private t = 0;
  /** Rare whole-sign dimming, like a dying transformer. */
  private buzz = 0;

  constructor(initialControls?: Partial<LogoResolveControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(app: PIXI.Application, controls: LogoResolveControlValues): void {
    const root = this.getRoot();
    const cw = app.screen.width;
    const ch = app.screen.height;

    let W = controls.logoScale * cw;
    let H = W * (SRC_H / SRC_W);
    if (H > ch * 0.78) {
      H = ch * 0.78;
      W = H * (SRC_W / SRC_H);
    }
    let p = controls.pixelSize;
    while ((W / p) * (H / p) > MAX_CELLS) p += 2;
    const cols = Math.max(8, Math.floor(W / p));
    const rows = Math.max(5, Math.floor(H / p));
    const x0 = cw / 2 - (cols * p) / 2;
    const y0 = ch / 2 - (rows * p) / 2;

    const src = logoImageData(SRC_W, SRC_H);
    const bow = controls.bow || 0;
    const cxm = cw / 2;
    const cym = ch / 2;
    const R0 = Math.hypot(cols * p, rows * p) / 2;
    // Fisheye field angle.
    const A = 0.6 + bow * 0.75;
    const accent = Number(controls.accent);

    this.glowCont = new PIXI.Container();
    root.addChild(this.glowCont);
    this.pixCont = new PIXI.Container();
    root.addChild(this.pixCont);
    this.pix = [];

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const sx = Math.floor(((i + 0.5) / cols) * SRC_W);
        const sy = Math.floor(((j + 0.5) / rows) * SRC_H);
        if (src.data[(sy * SRC_W + sx) * 4 + 3] < 100) continue;
        const col = Math.random() < 0.1 ? PAL.sun : accent;
        let hx = x0 + i * p + p / 2;
        let hy = y0 + j * p + p / 2;
        let szK = 1;
        let shade = 1;
        if (bow > 0) {
          // Project onto a sphere: center magnified, edges compressed and dimmed.
          const dx = hx - cxm;
          const dy = hy - cym;
          const r = Math.min(1, Math.hypot(dx, dy) / R0);
          const k =
            r > 1e-4 ? Math.sin(r * A) / (r * Math.sin(A)) : A / Math.sin(A);
          hx = cxm + dx * k;
          hy = cym + dy * k;
          // Pseudo-depth: 1 at center, low at the rim.
          const zK = Math.cos(r * A);
          szK = 1 + bow * (zK - 0.45) * 0.8;
          shade = 1 - bow * 0.45 * (1 - zK);
        }
        const gsp = new PIXI.Sprite(glowTex());
        gsp.anchor.set(0.5);
        gsp.tint = col;
        gsp.width = p * 3.6 * szK;
        gsp.height = p * 3.6 * szK;
        gsp.blendMode = 'add';
        gsp.alpha = 0;
        gsp.x = hx;
        gsp.y = hy;
        this.glowCont.addChild(gsp);
        const sp = px(col, Math.max(2, (p - 1.5) * szK));
        sp.x = hx;
        sp.y = hy;
        sp.alpha = 0;
        this.pixCont.addChild(sp);
        this.pix.push({
          sp,
          gsp,
          col,
          hx,
          hy,
          x: hx,
          y: hy,
          vx: 0,
          vy: 0,
          delay: Math.random(),
          dip: 0,
          gl: null,
          shade,
        });
      }
    }

    this.p = p;
    this.logoTop = y0;
    this.logoH = rows * p;
    this.t = 0;
    this.buzz = 0;
  }

  onUpdate(
    _app: PIXI.Application,
    controls: LogoResolveControlValues,
    deltaTime: number
  ): void {
    const dt = Math.min(0.05, deltaTime);
    this.t += dt;
    const T = controls.bootTime;
    const pointer = this.pointer;
    const mouse = pointer?.mouse;

    // Shockwaves from clicks, the one physics interaction left.
    if (pointer) {
      while (pointer.clicks.length) {
        const k = pointer.clicks.shift()!;
        for (const q of this.pix) {
          const dx = q.x - k.x;
          const dy = q.y - k.y;
          const d = Math.hypot(dx, dy) || 1;
          const f = Math.max(0, 1 - d / 320) * 620;
          q.vx += (dx / d) * f;
          q.vy += (dy / d) * f;
        }
      }
    }

    if (this.buzz <= 0 && Math.random() < controls.flicker * 2.5 * dt) {
      this.buzz = rand(0.04, 0.12);
    }
    this.buzz = Math.max(0, this.buzz - dt);
    const buzzDim = this.buzz > 0 ? 0.55 + 0.2 * Math.random() : 1;
    const sweepY = controls.sweep
      ? this.logoTop + ((this.t * 0.45) % 1.6) * this.logoH
      : -1e4;
    const glitchCols = [PAL.cyan, PAL.acid, 0xffffff];

    for (const q of this.pix) {
      // Springs recover the shockwave displacement around a fixed home.
      q.vx += (q.hx - q.x) * 40 * dt;
      q.vy += (q.hy - q.y) * 40 * dt;
      q.vx *= Math.max(0, 1 - 6 * dt);
      q.vy *= Math.max(0, 1 - 6 * dt);
      q.x += q.vx * dt;
      q.y += q.vy * dt;

      let tint = q.col;
      let gx = 0;
      let glowK = 1;
      let alpha =
        1 -
        controls.flicker *
          0.18 *
          (0.5 + 0.5 * Math.sin(this.t * 13 + q.hx * 0.7 + q.hy));
      if (q.dip > 0) {
        q.dip -= dt;
        alpha *= 0.25;
      } else if (Math.random() < controls.flicker * 3.6 * dt) {
        q.dip = rand(0.03, 0.1);
      }

      // Individual pixel glitches: shift, recolor, or blink off.
      if (!q.gl && Math.random() < controls.pixelGlitch * 1.5 * dt) {
        const roll = Math.random();
        q.gl = {
          life: rand(0.06, 0.25),
          mode: roll < 0.4 ? 'shift' : roll < 0.8 ? 'color' : 'off',
          off: (Math.random() < 0.5 ? -1 : 1) * this.p * rand(0.8, 1.6),
          col: pick(glitchCols),
        };
      }
      if (q.gl) {
        q.gl.life -= dt;
        if (q.gl.mode === 'shift') gx = q.gl.off;
        if (q.gl.mode === 'color') tint = q.gl.col;
        if (q.gl.mode === 'off') alpha = 0;
        if (q.gl.life <= 0) q.gl = null;
      }

      // Cursor heat recolors, never warps: cyan at the edge, white-hot at center.
      if (mouse?.active && controls.touchRadius > 0) {
        const d = Math.hypot(q.x - mouse.x, q.y - mouse.y);
        if (d < controls.touchRadius) {
          const heat = 1 - d / controls.touchRadius;
          tint = heat > 0.65 ? 0xffffff : PAL.cyan;
          alpha = Math.max(alpha, 0.6 + heat * 0.4);
          glowK = 1 + heat * 1.6;
        }
      }

      // The sweep warps the sign: rows near the line smear sideways.
      const dSweep = q.y - sweepY;
      const band = this.p * 4;
      if (Math.abs(dSweep) < band) {
        const k = 1 - Math.abs(dSweep) / band;
        gx += Math.sin(dSweep * 0.25 + this.t * 6) * this.p * 1.8 * k * k;
        alpha *= 1 - 0.5 * k;
      }
      alpha *= buzzDim;

      // Boot mask: pixels sputter on while the live animation already runs.
      const on = this.t - q.delay * T * 0.85;
      if (on < 0) alpha = 0;
      else if (on < 0.35) {
        if (Math.random() > 0.4 + (on / 0.35) * 0.55) alpha = 0;
        else if (Math.random() < 0.15) tint = 0xffffff;
      }

      q.sp.x = q.x + gx;
      q.sp.y = q.y;
      q.sp.alpha = alpha * q.shade;
      q.sp.tint = tint;
      q.gsp.x = q.x + gx;
      q.gsp.y = q.y;
      q.gsp.tint = tint;
      q.gsp.alpha = Math.min(
        1,
        alpha * q.shade * controls.glowIntensity * 0.55 * glowK
      );
    }
  }

  onDestroy(): void {
    this.pix = [];
    this.glowCont = null;
    this.pixCont = null;
    super.onDestroy();
  }
}

export function createLogoResolveAnimation(
  initialControls?: Partial<LogoResolveControlValues>
): LogoResolveAnimation {
  return new LogoResolveAnimation(initialControls);
}
