import * as PIXI from 'pixi.js';
import { createManifest } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { lerpColor } from '../shared/color-mix';
import { scrim } from '../shared/scrim';

const MANIFEST = createManifest({
  id: 'energy-body',
  name: 'All Eyes',
  description:
    'Visionary blue — a phyllotaxis field of ornate eye-orbs radiating from a central iris, every one of them watching. All pupils track your cursor; blink waves ripple outward through the field; the whole lattice breathes. Click to send a dilation wave — every eye it touches goes wide, then blinks shut and recovers.',
  controls: [
    {
      name: 'count',
      type: 'number',
      label: 'Eye Count',
      min: 40,
      max: 320,
      step: 10,
      defaultValue: 90,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'blink',
      type: 'number',
      label: 'Blink Rate',
      min: 0,
      max: 2,
      step: 0.05,
      defaultValue: 0.7,
      debug: true,
    },
    {
      name: 'spiral',
      type: 'number',
      label: 'Spiral Drift',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.4,
      debug: true,
    },
    {
      name: 'breathe',
      type: 'number',
      label: 'Field Breathe',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.55,
      debug: true,
    },
    {
      name: 'track',
      type: 'boolean',
      label: 'Eyes Track Cursor',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'tone',
      type: 'select',
      label: 'Palette',
      options: [
        { label: 'Deep Blue', value: 'blue' },
        { label: 'Spectrum', value: 'spec' },
      ],
      defaultValue: 'blue',
      debug: true,
    },
  ],
} as const);

export type EnergyBodyControlValues = ManifestToControlValues<typeof MANIFEST>;

/**
 * This piece is deliberately off-palette: it is visionary blue, not a
 * Bracket Bear theme, so these colours are fixed rather than read from PAL.
 */
const BLUE = {
  deep: 0x081a52,
  mid: 0x1e49c8,
  iris: 0x2f8ff0,
  glow: 0x37c6ff,
  pale: 0xa8ecff,
  white: 0xf0ffff,
};

const SPEC = [
  0xff3b30, 0xff8a00, 0xffd60a, 0x34e07f, 0x37c6ff, 0x5e5eff, 0xb26bff,
];

/** Golden angle: the phyllotaxis spacing the field is laid out on. */
const GOLDEN_ANGLE = 2.399963;
/** Dilation wave life, and the radius multiplier it expands to. */
const WAVE_LIFE = 2.5;
const WAVE_REACH = 1.4;
/** Cursor excitement radius. */
const CURSOR_RADIUS = 90;

interface Orb {
  r: number;
  a: number;
  /** Normalized radius 0..1, drives size and drift rate. */
  fr: number;
  /** Eye half-width in stage pixels. */
  s: number;
  ph: number;
  /** Index into the spectrum ramp. */
  col: number;
  /** Time of the next blink, and blink progress (-1 when open). */
  nb: number;
  bt: number;
  /** Gaze direction: current, target, dwell timer, saccade flag. */
  gx: number;
  gy: number;
  gtx: number;
  gty: number;
  dwell: number;
  sacc: number;
}

interface Wave {
  x: number;
  y: number;
  t0: number;
}

/**
 * Natural blink profile: snap shut over the first 35% of the blink, reopen
 * more slowly, eased both ways.
 */
function blinkOpen(bt: number): number {
  if (bt < 0) return 1;
  if (bt < 0.35) {
    const q = bt / 0.35;
    return 1 - q * q;
  }
  const q = (bt - 0.35) / 0.65;
  return q * (2 - q);
}

export class EnergyBodyAnimation extends PixiAnimation<typeof MANIFEST> {
  private t = 0;
  private waves: Wave[] = [];
  private cx = 0;
  private cy = 0;
  private RMAX = 1;
  private coreR = 1;

  private orbG: PIXI.Graphics | null = null;
  private fx: PIXI.Graphics | null = null;
  private orbs: Orb[] = [];

  /** The great eye's own blink, gaze and dwell state. */
  private cbt = -1;
  private cnb = 4;
  private cgx = 0;
  private cgy = 0;
  private ctx2 = 0;
  private cty2 = 0;
  private cdwell = 2;

  constructor(initialControls?: Partial<EnergyBodyControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(app: PIXI.Application, controls: EnergyBodyControlValues): void {
    const root = this.getRoot();
    const w = app.screen.width;
    const h = app.screen.height;

    this.t = 0;
    this.waves = [];
    scrim(root, w, h).alpha = 0.95;

    const cx = w / 2;
    const cy = h / 2;
    this.cx = cx;
    this.cy = cy;
    const RMAX = Math.hypot(w, h) * 0.52;
    this.RMAX = RMAX;

    // Ambient radial gradient: indigo heart fading into void.
    const bg = new PIXI.Graphics();
    for (let i = 12; i >= 1; i--) {
      bg.circle(cx, cy, RMAX * 0.92 * (i / 12));
      bg.fill({ color: lerpColor(BLUE.deep, BLUE.mid, 0.35), alpha: 0.09 });
    }
    // Vignette: darkness closing in at the edges.
    const vig = new PIXI.Graphics();
    for (let i = 0; i < 10; i++) {
      vig.circle(cx, cy, RMAX * (0.78 + i * 0.05));
      vig.stroke({
        width: RMAX * 0.06,
        color: 0x02040f,
        alpha: 0.1 + i * 0.02,
      });
    }
    // Static radial threads, faint under the rotating rays.
    const back = new PIXI.Graphics();
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      back.moveTo(
        cx + Math.cos(a) * RMAX * 0.12,
        cy + Math.sin(a) * RMAX * 0.12
      );
      back.lineTo(cx + Math.cos(a) * RMAX, cy + Math.sin(a) * RMAX);
    }
    back.stroke({ width: 1, color: BLUE.mid, alpha: 0.07 });

    this.orbG = new PIXI.Graphics();
    this.fx = new PIXI.Graphics();
    root.addChild(bg, back, this.orbG, vig, this.fx);

    // Phyllotaxis eye field, biggest orbs at mid radius, like a halo.
    const N = Math.round(controls.count);
    this.orbs = [];
    const coreR = Math.min(w, h) * 0.13;
    for (let i = 0; i < N; i++) {
      const fr = Math.sqrt((i + 0.5) / N);
      const r = coreR * 1.08 + fr * (RMAX * 0.9 - coreR * 1.08);
      const a = i * GOLDEN_ANGLE;
      const mid = 4 * fr * (1 - fr);
      this.orbs.push({
        r,
        a,
        fr,
        s: Math.min(w, h) * 0.016 * (0.55 + mid * 1.5),
        ph: ((i * 0.618) % 1) * 6.28,
        col: i % 7,
        nb: 0.8 + Math.random() * 7,
        bt: -1,
        gx: 0,
        gy: 0,
        gtx: 0,
        gty: 0,
        dwell: Math.random() * 2,
        sacc: 0,
      });
    }
    this.coreR = coreR;

    this.cbt = -1;
    this.cnb = 4;
    this.cgx = 0;
    this.cgy = 0;
    this.ctx2 = 0;
    this.cty2 = 0;
    this.cdwell = 2;
  }

  /**
   * One ornate eye: almond sclera, two-tone iris, pupil and highlight, then
   * lids sliding over it from above and below.
   *
   * The iris parts are drawn as circles sampled at 24 points and clamped to
   * the lid curves, which is how they get clipped to the almond without a
   * mask — a mask per eye would cost a render-texture switch per orb.
   */
  private drawEye(
    g: PIXI.Graphics,
    x: number,
    y: number,
    es: number,
    open: number,
    colIris: number,
    colDeep: number,
    gzx: number,
    gzy: number,
    glow: number,
    rot: number
  ): void {
    const op = Math.max(0, Math.min(1, open));
    const co = Math.cos(rot);
    const si = Math.sin(rot);
    const TX = (px: number, py: number): number => x + px * co - py * si;
    const TY = (px: number, py: number): number => y + px * si + py * co;
    // Full-open lid apex heights.
    const lu = es * 0.72;
    const ll = es * 0.56;
    const almond = (): void => {
      g.moveTo(TX(-es, 0), TY(-es, 0));
      g.quadraticCurveTo(TX(0, -lu * 2), TY(0, -lu * 2), TX(es, 0), TY(es, 0));
      g.quadraticCurveTo(TX(0, ll * 2), TY(0, ll * 2), TX(-es, 0), TY(-es, 0));
      g.closePath();
    };

    if (glow > 0.04) {
      g.circle(x, y, es * 2.1);
      g.fill({ color: BLUE.glow, alpha: glow * 0.1 });
    }
    almond();
    g.fill({ color: 0xf4faff, alpha: 0.92 });

    let lx = 0;
    let ly = 0;
    const ir = Math.min(es * 0.42, lu * 0.95);
    if (gzx || gzy) {
      const m = es * 0.5;
      lx = (gzx * co + gzy * si) * m;
      ly = (-gzx * si + gzy * co) * m;
      lx = Math.max(-es * 0.5, Math.min(es * 0.5, lx));
      // Almond half-height factor at this lx, so the iris cannot ride out
      // through the corner of the eye.
      const H = 1 - (lx / es) * (lx / es);
      ly = Math.max(-lu * H * 0.8, Math.min(ll * H * 0.8, ly));
    }

    const clipBlob = (
      bx: number,
      by: number,
      r: number,
      col: number,
      alpha: number
    ): void => {
      let firstP = true;
      for (let q = 0; q <= 24; q++) {
        const th = (q / 24) * 6.2832;
        const px2 = bx + Math.cos(th) * r;
        let py2 = by + Math.sin(th) * r;
        const H2 = Math.max(0, 1 - (px2 / es) * (px2 / es));
        py2 = Math.max(-lu * H2, Math.min(ll * H2, py2));
        const X = TX(px2, py2);
        const Y = TY(px2, py2);
        if (firstP) {
          g.moveTo(X, Y);
          firstP = false;
        } else g.lineTo(X, Y);
      }
      g.closePath();
      g.fill({ color: col, alpha });
    };

    // Two-tone iris: dark limbal ring, bright core, pale upper sheen.
    clipBlob(lx, ly, ir, lerpColor(colIris, BLUE.deep, 0.5), 0.92);
    clipBlob(lx, ly, ir * 0.68, colIris, 0.95);
    clipBlob(
      lx - ir * 0.15,
      ly - ir * 0.18,
      ir * 0.4,
      lerpColor(colIris, BLUE.pale, 0.45),
      0.5
    );
    const pr = Math.min(es * (0.18 + glow * 0.13), ir * 0.8);
    clipBlob(lx, ly, pr, colDeep, 1);
    clipBlob(
      lx - pr * 0.35,
      ly - pr * 0.45,
      Math.max(0.6, es * 0.06),
      BLUE.white,
      0.9
    );

    if (op < 0.97) {
      const lidCol = lerpColor(BLUE.deep, 0x000000, 0.45);
      const cu = lu * op;
      const cl2 = ll * op;
      g.moveTo(TX(-es, 0), TY(-es, 0));
      g.quadraticCurveTo(TX(0, -lu * 2), TY(0, -lu * 2), TX(es, 0), TY(es, 0));
      g.quadraticCurveTo(
        TX(0, -cu * 2),
        TY(0, -cu * 2),
        TX(-es, 0),
        TY(-es, 0)
      );
      g.closePath();
      g.fill({ color: lidCol, alpha: 0.96 });
      g.moveTo(TX(-es, 0), TY(-es, 0));
      g.quadraticCurveTo(TX(0, ll * 2), TY(0, ll * 2), TX(es, 0), TY(es, 0));
      g.quadraticCurveTo(
        TX(0, cl2 * 2),
        TY(0, cl2 * 2),
        TX(-es, 0),
        TY(-es, 0)
      );
      g.closePath();
      g.fill({ color: lidCol, alpha: 0.96 });
      g.moveTo(TX(-es, 0), TY(-es, 0));
      g.quadraticCurveTo(TX(0, -cu * 2), TY(0, -cu * 2), TX(es, 0), TY(es, 0));
      g.moveTo(TX(-es, 0), TY(-es, 0));
      g.quadraticCurveTo(TX(0, cl2 * 2), TY(0, cl2 * 2), TX(es, 0), TY(es, 0));
      g.stroke({ width: 1, color: BLUE.mid, alpha: 0.7 });
    }

    almond();
    g.stroke({ width: 1.2, color: BLUE.mid, alpha: 0.55 + glow * 0.35 });
  }

  onUpdate(
    app: PIXI.Application,
    controls: EnergyBodyControlValues,
    deltaTime: number
  ): void {
    const g = this.orbG;
    const fx = this.fx;
    if (!g || !fx) return;

    const dt = Math.min(0.05, deltaTime);
    this.t += dt;

    const w = app.screen.width;
    const h = app.screen.height;
    const pointer = this.pointer;
    const mouse = pointer?.mouse;

    if (pointer) {
      while (pointer.clicks.length) {
        const cl = pointer.clicks.shift()!;
        this.waves.push({ x: cl.x, y: cl.y, t0: this.t });
      }
    }
    this.waves = this.waves.filter((wv) => this.t - wv.t0 < WAVE_LIFE);

    fx.clear();
    for (const wv of this.waves) {
      const a = (this.t - wv.t0) / WAVE_LIFE;
      fx.circle(wv.x, wv.y, a * this.RMAX * WAVE_REACH);
      fx.stroke({ width: 2, color: BLUE.glow, alpha: (1 - a) * 0.35 });
    }

    g.clear();

    for (let i = 0; i < this.orbs.length; i++) {
      const o = this.orbs[i];
      // Orbs arrive outward from the centre.
      const born = 0.15 + (o.r / this.RMAX) * 1.6;
      if (this.t < born) continue;
      const bootO = Math.min(1, (this.t - born) / 0.5);
      // Spiral drift: slow orbit, a touch faster near the centre.
      o.a += dt * controls.spiral * (0.015 + 0.09 * (1 - o.fr));
      const br =
        o.r *
        (1 + Math.sin(this.t * 0.6 + o.r * 0.02) * 0.025 * controls.breathe);
      const x = this.cx + Math.cos(o.a) * br;
      const y = this.cy + Math.sin(o.a) * br;
      if (x < -30 || y < -30 || x > w + 30 || y > h + 30) continue;

      // Blink: independent random timers, fast shut and slower reopen, with
      // the occasional double-blink.
      if (o.bt >= 0) {
        o.bt += dt / 0.3;
        if (o.bt >= 1) {
          o.bt = -1;
          o.nb =
            this.t +
            (Math.random() < 0.14
              ? 0.35
              : 2.5 + (Math.random() * 8) / Math.max(0.05, controls.blink));
        }
      } else if (controls.blink > 0 && this.t >= o.nb) o.bt = 0;

      let open = blinkOpen(o.bt);
      let glow = 0;
      for (const wv of this.waves) {
        const wr = ((this.t - wv.t0) / WAVE_LIFE) * this.RMAX * WAVE_REACH;
        const dd = Math.hypot(x - wv.x, y - wv.y);
        const hit = Math.exp(-Math.pow((dd - wr) / 34, 2));
        glow = Math.max(glow, hit);
        // Just behind the wave front the eye blinks shut and recovers.
        const post = (wr - dd) / 60;
        if (post > 0.4 && post < 1.1) {
          open = Math.min(open, Math.abs(post - 0.75) * 3);
        }
      }
      if (mouse?.active) {
        const md = Math.hypot(x - mouse.x, y - mouse.y);
        if (md < CURSOR_RADIUS) {
          glow = Math.max(glow, (1 - md / CURSOR_RADIUS) * 0.6);
        }
      }
      open *= bootO;

      // Gaze: focus mode locks onto the cursor, idle mode saccades freely.
      if (controls.track && mouse?.active) {
        const dd = Math.hypot(mouse.x - x, mouse.y - y) || 1;
        const m = Math.min(1, (dd * 0.05) / (o.s * 0.24));
        o.gtx = ((mouse.x - x) / dd) * m;
        o.gty = ((mouse.y - y) / dd) * m;
        // Re-dwell briefly when the cursor leaves.
        o.dwell = 0.25 + Math.random() * 0.6;
      } else {
        o.dwell -= dt;
        if (o.dwell <= 0) {
          const roll = Math.random();
          if (roll < 0.18) {
            // Stare straight out.
            o.gtx = 0;
            o.gty = 0;
          } else if (roll < 0.34) {
            // Glance at the great eye.
            const dd = Math.hypot(this.cx - x, this.cy - y) || 1;
            o.gtx = ((this.cx - x) / dd) * 0.9;
            o.gty = ((this.cy - y) / dd) * 0.9;
          } else {
            const a2 = Math.random() * Math.PI * 2;
            const m2 = 0.35 + Math.random() * 0.65;
            o.gtx = Math.cos(a2) * m2;
            o.gty = Math.sin(a2) * m2;
          }
          o.dwell = 0.7 + Math.random() * 2.8;
          o.sacc = 1;
        }
        // Micro-drift while fixating.
        o.gtx += Math.sin(this.t * 6.1 + o.ph) * 0.004;
        o.gty += Math.cos(this.t * 7.3 + o.ph) * 0.004;
      }
      // Saccade snaps, fixation settles — the two speeds a real eye has.
      const gerr = Math.hypot(o.gtx - o.gx, o.gty - o.gy);
      if (gerr < 0.06) o.sacc = 0;
      const grate = o.sacc ? 16 : 4;
      const gk = Math.min(1, dt * grate);
      o.gx += (o.gtx - o.gx) * gk;
      o.gy += (o.gty - o.gy) * gk;

      const iris =
        controls.tone === 'spec'
          ? SPEC[o.col]
          : lerpColor(BLUE.iris, BLUE.glow, (o.col % 7) / 12);
      this.drawEye(
        g,
        x,
        y,
        o.s * (0.7 + bootO * 0.3),
        open,
        lerpColor(iris, 0xffffff, glow * 0.5),
        BLUE.deep,
        o.gx,
        o.gy,
        glow,
        Math.atan2(y - this.cy, x - this.cx)
      );
    }

    // Central presence: one great eye.
    const cb = Math.min(1, this.t / 1.2);
    let cGlow = 0.25 + Math.sin(this.t * 1.2) * 0.1;
    for (const wv of this.waves) {
      cGlow = Math.max(cGlow, 1 - (this.t - wv.t0) / 1.2);
    }
    if (this.cbt >= 0) {
      this.cbt += dt / 0.34;
      if (this.cbt >= 1) {
        this.cbt = -1;
        this.cnb = this.t + 4 + Math.random() * 7;
      }
    } else if (this.t >= this.cnb) this.cbt = 0;
    const cBlink = blinkOpen(this.cbt);

    if (controls.track && mouse?.active) {
      const dd = Math.hypot(mouse.x - this.cx, mouse.y - this.cy) || 1;
      const m = Math.min(1, (dd * 0.05) / (this.coreR * 0.85 * 0.24));
      this.ctx2 = ((mouse.x - this.cx) / dd) * m;
      this.cty2 = ((mouse.y - this.cy) / dd) * m;
    } else {
      this.cdwell -= dt;
      if (this.cdwell <= 0) {
        const a2 = Math.random() * Math.PI * 2;
        const m2 = Math.random() * 0.8;
        this.ctx2 = Math.cos(a2) * m2;
        this.cty2 = Math.sin(a2) * m2;
        this.cdwell = 1.6 + Math.random() * 3.4;
      }
    }
    const cerr = Math.hypot(this.ctx2 - this.cgx, this.cty2 - this.cgy);
    const ck = Math.min(1, dt * (cerr > 0.2 ? 12 : 3));
    this.cgx += (this.ctx2 - this.cgx) * ck;
    this.cgy += (this.cty2 - this.cgy) * ck;

    // Radiance: layered halo plus a slow-turning crown of rays.
    g.circle(this.cx, this.cy, this.coreR * 1.6);
    g.fill({ color: BLUE.mid, alpha: 0.07 * cb });
    g.circle(this.cx, this.cy, this.coreR * 1.3);
    g.fill({ color: BLUE.iris, alpha: 0.06 * cb });
    g.circle(this.cx, this.cy, this.coreR * 1.14);
    g.stroke({
      width: 1.5,
      color: BLUE.glow,
      alpha: (0.22 + cGlow * 0.3) * cb,
    });
    for (let k = 0; k < 28; k++) {
      const a2 = (k / 28) * 6.2832 + this.t * 0.04;
      const r0 = this.coreR * (1.2 + 0.03 * Math.sin(this.t * 1.5 + k * 1.7));
      const r1 = this.RMAX * 1.05;
      g.moveTo(this.cx + Math.cos(a2) * r0, this.cy + Math.sin(a2) * r0);
      g.lineTo(this.cx + Math.cos(a2) * r1, this.cy + Math.sin(a2) * r1);
    }
    g.stroke({ width: 1, color: BLUE.glow, alpha: 0.22 * cb });

    this.drawEye(
      g,
      this.cx,
      this.cy,
      this.coreR * 0.85,
      cb * cBlink,
      BLUE.iris,
      BLUE.deep,
      this.cgx,
      this.cgy,
      Math.max(0, cGlow),
      0
    );
  }

  onDestroy(): void {
    this.orbG = null;
    this.fx = null;
    this.orbs = [];
    this.waves = [];
    super.onDestroy();
  }
}

export function createEnergyBodyAnimation(
  initialControls?: Partial<EnergyBodyControlValues>
): EnergyBodyAnimation {
  return new EnergyBodyAnimation(initialControls);
}
