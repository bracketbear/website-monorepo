import * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation, pick, px, rand } from '@bracketbear/flateralus-pixi';
import { logoBitmask, type LogoBitmask } from '../shared/logo';
import { cityGrid, type CityGrid, type CityId } from '../shared/skylines';
import { bayerAt, mixColor } from '../shared/dither';

const MANIFEST = createManifest({
  id: 'pixel-sunrise',
  name: 'Pixel Sunrise',
  description:
    'Ordered-dither sun rising over a pixel skyline of Pittsburgh or Portland. The whole scene steps on a low sim FPS locked to the pixel grid, so pixels never slide. Glitch scene: a cheery daytime city that flash-cuts to a neon night where the Bracket Bear logo hangs where the sun was.',
  controls: [
    {
      name: 'city',
      type: 'select',
      label: 'City',
      options: [
        { value: 'pgh', label: 'Pittsburgh' },
        { value: 'pdx', label: 'Portland' },
      ],
      defaultValue: 'pgh',
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'scene',
      type: 'select',
      label: 'Scene',
      options: [
        { value: 'classic', label: 'Sunrise' },
        { value: 'glitch', label: 'Day/Night Glitch' },
      ],
      defaultValue: 'glitch',
      debug: true,
    },
    {
      name: 'body',
      type: 'select',
      label: 'Rising Body',
      options: [
        { value: 'sun', label: 'Pixel Sun' },
        { value: 'logo', label: 'BB Logo' },
      ],
      defaultValue: 'sun',
      debug: true,
    },
    {
      name: 'nightBias',
      type: 'number',
      label: 'Night Bias',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.35,
      debug: true,
    },
    {
      name: 'pixelSize',
      type: 'number',
      label: 'Pixel Size',
      min: 6,
      max: 20,
      step: 2,
      defaultValue: 10,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'sunRadius',
      type: 'number',
      label: 'Sun Radius',
      min: 0.14,
      max: 0.42,
      step: 0.02,
      defaultValue: 0.3,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'logoScale',
      type: 'number',
      label: 'Logo Looming',
      min: 2,
      max: 4,
      step: 0.1,
      defaultValue: 2,
      debug: true,
    },
    {
      name: 'fps',
      type: 'number',
      label: 'Sim FPS',
      min: 4,
      max: 24,
      step: 1,
      defaultValue: 10,
      debug: true,
    },
    {
      name: 'pixelPush',
      type: 'number',
      label: 'Pixel Push',
      min: 0,
      max: 240,
      step: 10,
      defaultValue: 120,
      debug: true,
    },
    {
      name: 'animate',
      type: 'boolean',
      label: 'Animate Sunrise',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'stayUp',
      type: 'boolean',
      label: 'Stay Risen',
      defaultValue: false,
      debug: true,
    },
    {
      name: 'cycleTime',
      type: 'number',
      label: 'Sunrise Cycle (s)',
      min: 4,
      max: 40,
      step: 2,
      defaultValue: 16,
      debug: true,
    },
    {
      name: 'particleCount',
      type: 'number',
      label: 'Ember Count',
      min: 0,
      max: 240,
      step: 10,
      defaultValue: 90,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'scanlines',
      type: 'boolean',
      label: 'Scanlines',
      defaultValue: true,
      debug: true,
    },
  ],
} as const);

export type PixelSunriseControlValues = ManifestToControlValues<
  typeof MANIFEST
>;

interface NightPalette {
  name: string;
  sky0: number;
  sky1: number;
  body: number;
  glow: number;
  bld: number;
  star: number;
  ghost: number;
  win: number[];
}

/** One is picked at random for each night flash. */
const NIGHTS: NightPalette[] = [
  {
    name: 'katana',
    sky0: 0x0b0612,
    sky1: 0x1a0b2e,
    body: 0xff2f92,
    glow: 0x8a3dff,
    bld: 0x150c22,
    star: 0xbfa8ff,
    ghost: 0x7df9ff,
    win: [0xff2f92, 0x7df9ff, 0xffc24a, 0xff9de2],
  },
  {
    name: 'teal',
    sky0: 0x040d12,
    sky1: 0x0d2430,
    body: 0x7df9ff,
    glow: 0x1f6f8a,
    bld: 0x081720,
    star: 0x9adcf0,
    ghost: 0xff2f92,
    win: [0x7df9ff, 0xd8ff3d, 0xfff3e3, 0x37c6ff],
  },
  {
    name: 'acid',
    sky0: 0x0a0f04,
    sky1: 0x1c2608,
    body: 0xd8ff3d,
    glow: 0x2c4a10,
    bld: 0x101a06,
    star: 0xc8e6a0,
    ghost: 0xff9e00,
    win: [0xd8ff3d, 0xffc24a, 0xf2ffe9, 0x39ff14],
  },
  {
    name: 'crimson',
    sky0: 0x120406,
    sky1: 0x2a0a10,
    body: 0xff4436,
    glow: 0x6e0f1c,
    bld: 0x1c060a,
    star: 0xffb09a,
    ghost: 0xffc24a,
    win: [0xffc24a, 0xff6e5e, 0xfff3e3, 0xff2f92],
  },
];

interface Ember {
  sprite: PIXI.Sprite;
  color: number;
  i: number;
  x: number;
  y: number;
  phase: number;
  speed: number;
}

interface Tear {
  y0: number;
  y1: number;
  dx: number;
}

interface FlashStep {
  night: boolean;
  n: number;
  jit?: number;
}

export class PixelSunriseAnimation extends PixiAnimation<typeof MANIFEST> {
  private g: PIXI.Graphics | null = null;
  private fx: PIXI.Graphics | null = null;
  private embers: Ember[] = [];
  private logo: LogoBitmask | null = null;
  private grid: CityGrid | null = null;

  private p = 10;
  private W = 0;
  private H = 0;
  private groundRow = 0;
  private apexRow = 0;
  private radius = 0;

  private t = 0;
  private acc = 0;
  private night = false;
  private flash: FlashStep[] = [];
  private tears: Tear[] = [];
  private nightPal: NightPalette = NIGHTS[0];
  /** Cursor position sampled on sim ticks only, so the push steps too. */
  private mx: number | null = null;
  private my = 0;

  constructor(initialControls?: Partial<PixelSunriseControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(app: PIXI.Application, controls: PixelSunriseControlValues): void {
    const root = this.getRoot();
    const w = app.screen.width;
    const h = app.screen.height;
    const p = (this.p = controls.pixelSize);

    this.W = Math.ceil(w / p);
    this.H = Math.ceil(h / p);
    this.groundRow = Math.round((h * 0.9) / p);
    this.apexRow = Math.round((h * 0.34) / p);
    this.radius = Math.max(
      3,
      Math.round((controls.sunRadius * Math.min(w, h)) / p)
    );
    // Half-cell resolution so the brackets still read at this size.
    this.logo = logoBitmask(Math.round(this.radius * 2.6) * 2);
    this.grid = cityGrid(
      controls.city as CityId,
      this.W,
      this.H,
      this.groundRow
    );

    this.g = new PIXI.Graphics();
    root.addChild(this.g);

    this.embers = [];
    for (let i = 0; i < controls.particleCount; i++) {
      const color = pick([PAL.cream, PAL.sun, PAL.bright]);
      const sprite = px(color, Math.max(2, p * 0.6));
      root.addChild(sprite);
      this.embers.push({
        sprite,
        color,
        i,
        x: rand(0, w),
        y: rand(0, h),
        phase: rand(0, 6.28),
        speed: rand(0.5, 1.4),
      });
    }

    this.fx = new PIXI.Graphics();
    for (let y = 0; y < h; y += p * 1.5) {
      this.fx
        .rect(0, y, w, Math.max(1, p * 0.18))
        .fill({ color: PAL.ink, alpha: 0.07 });
    }
    root.addChild(this.fx);

    this.t = 0;
    this.acc = 0;
    this.night = false;
    this.flash = [];
    this.tears = [];
    this.mx = null;
    this.nightPal = NIGHTS[0];
    this.draw(app, controls);
  }

  /** Sun or logo elevation, 0 below the horizon to 1 at apex. */
  private elevation(controls: PixelSunriseControlValues): number {
    if (!controls.animate) return 1;
    const T = Math.max(2, controls.cycleTime);
    if (controls.stayUp) {
      const u = Math.min(1, this.t / (T * 0.42));
      return 1 - Math.pow(1 - u, 3);
    }
    const q = (this.t % T) / T;
    if (q < 0.42) {
      const u = q / 0.42;
      return 1 - Math.pow(1 - u, 3);
    }
    if (q < 0.62) return 1;
    if (q < 0.95) {
      const u = (q - 0.62) / 0.33;
      return 1 - u * u * u;
    }
    return 0;
  }

  private retear(): void {
    this.tears = [];
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const y0 = Math.floor(Math.random() * this.groundRow);
      this.tears.push({
        y0,
        y1: y0 + 1 + Math.floor(Math.random() * 4),
        dx:
          (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 3)),
      });
    }
  }

  private tick(
    app: PIXI.Application,
    controls: PixelSunriseControlValues,
    step: number
  ): void {
    this.t += step;
    const mouse = this.pointer?.mouse;
    if (mouse?.active) {
      this.mx = mouse.x;
      this.my = mouse.y;
    } else {
      this.mx = null;
    }

    if (controls.scene === 'glitch') {
      if (this.flash.length) {
        const f = this.flash[0];
        this.night = f.night;
        if (f.jit) this.retear();
        else if (Math.random() < 0.35) this.tears = [];
        f.n -= 1;
        if (f.n <= 0) this.flash.shift();
      } else {
        this.night = false;
        this.tears = [];
        if (Math.random() < step * (0.15 + controls.nightBias * 1.2)) {
          this.nightPal = NIGHTS[Math.floor(Math.random() * NIGHTS.length)];
          const F = Math.max(2, Math.round(controls.fps));
          const long = Math.random() < controls.nightBias;
          const hold = long
            ? Math.round(F * rand(1.8, 3.5 + controls.nightBias * 6))
            : Math.round(rand(2, 7));
          this.flash = [
            { night: true, n: 1, jit: 1 },
            { night: false, n: 1 },
            { night: true, n: hold, jit: 0 },
            { night: false, n: 1 },
            { night: true, n: 2, jit: 1 },
          ];
        }
      }
      const win = this.grid?.win;
      if (win?.length && Math.random() < 0.6) {
        const wn = win[Math.floor(Math.random() * win.length)];
        wn.on = Math.random() < 0.75;
      }
    } else {
      this.night = false;
      this.tears = [];
    }

    const h = app.screen.height;
    const w = app.screen.width;
    for (const em of this.embers) {
      em.y -= 45 * em.speed * step;
      em.x += Math.sin(this.t * 1.5 + em.phase) * 12 * step;
      if (em.y < -10) {
        em.y = h + 10;
        em.x = Math.random() * w;
      }
      if (em.x < -10) em.x = w + 10;
      if (em.x > w + 10) em.x = -10;
    }
  }

  private draw(
    app: PIXI.Application,
    controls: PixelSunriseControlValues
  ): void {
    const g = this.g;
    const grid = this.grid;
    const logo = this.logo;
    if (!g || !grid || !logo) return;

    const w = app.screen.width;
    const h = app.screen.height;
    const p = this.p;
    g.clear();

    const glitch = controls.scene === 'glitch';
    const night = glitch && this.night;
    const day = glitch && !this.night;
    const e = this.elevation(controls);
    const NP = this.nightPal;

    if (glitch) {
      // The sky steps through palette bands with the body's elevation.
      const skyRamp = night
        ? [
            NP.sky0,
            NP.sky0,
            mixColor(NP.sky0, NP.sky1, 0.5),
            NP.sky1,
            mixColor(NP.sky1, 0xffffff, 0.07),
          ]
        : [PAL.rust, PAL.deep, PAL.orange, PAL.orange, PAL.bright];
      const ki = Math.max(0, Math.min(4, Math.floor(e * 5)));
      g.rect(0, 0, w, h).fill(skyRamp[ki]);
      if (ki > 0) {
        // Dithered horizon band, one palette step warmer or darker.
        const lo = skyRamp[ki - 1];
        const BAND = 12;
        for (let gy = this.groundRow - BAND; gy < this.groundRow; gy++) {
          const t = (this.groundRow - gy) / BAND;
          for (let gx = 0; gx < this.W; gx++) {
            if (bayerAt(gx, gy) > t) continue;
            g.rect(gx * p, gy * p, p - 1, p - 1).fill(lo);
          }
        }
      }
      if (night) {
        const tw = Math.floor(this.t * 2);
        for (const st of grid.stars) {
          if ((st.gx + st.gy + tw) % 7 !== 0) {
            g.rect(
              st.gx * p,
              st.gy * p,
              Math.max(1, p * 0.35),
              Math.max(1, p * 0.35)
            ).fill({ color: NP.star, alpha: 0.75 });
          }
        }
      }
    }

    const startRow =
      this.H +
      Math.max(
        this.radius,
        Math.ceil((logo.h * (controls.logoScale || 1)) / 4)
      ) +
      2;
    const bodyRow = Math.round(startRow + (this.apexRow - startRow) * e);
    const body = night ? 'logo' : controls.body;
    const ramp = [PAL.deep, PAL.orange, PAL.bright, PAL.sun];
    const k = Math.max(0, Math.min(3, Math.floor(e * 4)));
    const core = night ? NP.body : ramp[k];
    const rim = night
      ? mixColor(NP.body, 0xffffff, 0.35)
      : ramp[Math.min(3, k + 1)];
    const cxCell = Math.round(w / (2 * p));

    const off = (gy: number): number => {
      if (!night || !this.tears.length) return 0;
      for (const t of this.tears) if (gy >= t.y0 && gy < t.y1) return t.dx;
      return 0;
    };

    // The cursor pushes body pixels apart, quantized to the cell size so
    // nothing slides off the grid.
    const push = (
      pxx: number,
      pyy: number,
      cell: number
    ): [number, number] | null => {
      if (this.mx == null || controls.pixelPush <= 0) return null;
      const dx = pxx - this.mx;
      const dy = pyy - this.my;
      const d = Math.hypot(dx, dy);
      if (d > controls.pixelPush || d < 0.01) return null;
      const f = (1 - d / controls.pixelPush) * controls.pixelPush * 0.55;
      return [
        Math.round(((dx / d) * f) / cell) * cell,
        Math.round(((dy / d) * f) / cell) * cell,
      ];
    };

    if (body === 'sun') {
      const Rr = this.radius;
      const gy1 = Math.min(bodyRow + Rr + 1, this.groundRow + 2);
      for (let gy = bodyRow - Rr - 1; gy <= gy1; gy++) {
        const dx = off(gy);
        for (let gx = cxCell - Rr - 1; gx <= cxCell + Rr + 1; gx++) {
          const d = Math.hypot(gx - cxCell, gy - bodyRow) / Rr;
          if (d > 1.08) continue;
          let col = core;
          let keep = true;
          if (d > 0.74) {
            const t = (d - 0.74) / 0.34;
            keep = bayerAt(gx, gy) > t;
            col = d > 0.92 ? rim : core;
          }
          if (!keep) continue;
          const pxx = (gx + dx) * p;
          const pyy = gy * p;
          const pu = push(pxx, pyy, p);
          if (pu) g.rect(pxx + pu[0], pyy + pu[1], p - 1, p - 1).fill(col);
          else g.rect(pxx, pyy, p - 1, p - 1).fill(col);
        }
      }
    } else {
      const L = logo;
      // Clamp so the logo never exceeds ~85% of the canvas width.
      const hp = Math.min(
        (p / 2) * (controls.logoScale || 1),
        (w * 0.85) / L.w
      );
      // Looming: a bigger logo hangs lower and the buildings cut into it.
      const loom = Math.round(((controls.logoScale || 1) - 1) * this.H * 0.09);
      const rowL = bodyRow + loom;
      if (night) {
        // Dithered glow halo, breathing slowly.
        const GR = Math.min(
          Math.round(((L.w * hp) / (2 * p)) * 1.45),
          Math.round((w * 0.55) / p)
        );
        const breathe = 0.42 + 0.14 * Math.sin(this.t * 1.6);
        const gy1 = Math.min(rowL + GR, this.groundRow + 2);
        for (let gy = rowL - GR; gy <= gy1; gy++) {
          for (let gx = cxCell - GR; gx <= cxCell + GR; gx++) {
            const d = Math.hypot(gx - cxCell, gy - rowL) / GR;
            if (d > 1) continue;
            if (bayerAt(gx, gy) > (1 - d) * breathe) continue;
            g.rect((gx + off(gy)) * p, gy * p, p - 1, p - 1).fill({
              color: NP.glow,
              alpha: 0.5,
            });
          }
        }
      }
      const x0 = cxCell * p - (L.w * hp) / 2;
      const y0 = rowL * p - (L.h * hp) / 2;
      for (let ly = 0; ly < L.h; ly++) {
        const gy = Math.floor((y0 + ly * hp) / p);
        if (gy > this.groundRow + 2) break;
        const dxp = off(gy) * p;
        for (let lx = 0; lx < L.w; lx++) {
          if (!L.m[ly * L.w + lx]) continue;
          const pxx = x0 + lx * hp + dxp;
          const pyy = y0 + ly * hp;
          const pu = push(pxx, pyy, hp);
          if (pu) g.rect(pxx + pu[0], pyy + pu[1], hp - 1, hp - 1).fill(core);
          else g.rect(pxx, pyy, hp - 1, hp - 1).fill(core);
        }
      }
    }

    const bcol = night ? NP.bld : PAL.ink;
    for (let gy = grid.minTop; gy < this.groundRow; gy++) {
      const dx = off(gy);
      let run = -1;
      for (let gx = 0; gx <= this.W; gx++) {
        const solid = gx < this.W && grid.colTop[gx] <= gy;
        if (solid && run < 0) run = gx;
        if (!solid && run >= 0) {
          if (dx !== 0) {
            g.rect((run + dx + 2) * p, gy * p, (gx - run) * p, p).fill({
              color: NP.ghost,
              alpha: 0.4,
            });
          }
          g.rect((run + dx) * p, gy * p, (gx - run) * p, p).fill(bcol);
          run = -1;
        }
      }
    }
    g.rect(0, this.groundRow * p, w, h - this.groundRow * p).fill(bcol);

    if (night) {
      for (const wn of grid.win) {
        if (!wn.on) continue;
        g.rect((wn.gx + off(wn.gy)) * p, wn.gy * p, p - 1, p - 1).fill({
          color: NP.win[wn.i % NP.win.length],
          alpha: 0.9,
        });
      }
    }
    if (day) {
      for (const wn of grid.win) {
        if (wn.i % 6) continue;
        g.rect(wn.gx * p, wn.gy * p, p - 1, p - 1).fill({
          color: PAL.sun,
          alpha: 0.55,
        });
      }
    }

    for (const em of this.embers) {
      em.sprite.x = Math.round(em.x / p) * p;
      em.sprite.y = Math.round(em.y / p) * p;
      em.sprite.tint = night ? NP.win[em.i % NP.win.length] : em.color;
      em.sprite.alpha = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 2 + em.phase));
      em.sprite.visible = !day || em.i % 3 === 0;
    }
    if (this.fx) this.fx.visible = controls.scanlines;
  }

  onUpdate(
    app: PIXI.Application,
    controls: PixelSunriseControlValues,
    deltaTime: number
  ): void {
    // The whole scene steps on a low sim FPS locked to the pixel grid, so
    // pixels snap rather than slide.
    const step = 1 / Math.max(2, controls.fps);
    this.acc += Math.min(0.05, deltaTime);
    let stepped = false;
    while (this.acc >= step) {
      this.acc -= step;
      this.tick(app, controls, step);
      stepped = true;
    }
    if (stepped) this.draw(app, controls);
  }

  onDestroy(): void {
    this.g = null;
    this.fx = null;
    this.embers = [];
    this.logo = null;
    this.grid = null;
    super.onDestroy();
  }
}

export function createPixelSunriseAnimation(
  initialControls?: Partial<PixelSunriseControlValues>
): PixelSunriseAnimation {
  return new PixelSunriseAnimation(initialControls);
}
