import * as PIXI from 'pixi.js';
import { createManifest, PAL, hx } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { labelSprite } from '../shared/label-sprite';
import { LOGO_VIEWBOX, logoPath2Ds } from '../shared/logo';
import { scrim } from '../shared/scrim';

const MANIFEST = createManifest({
  id: 'atomic-age',
  name: 'Atomic Age',
  description:
    'Mid-century atomic futurism on a phosphor CRT — a rutherford atom with trailing electrons, a radar sweep painting blips, googie starbursts, and a jittery rads meter. Scanlines roll, the tube flickers. Cursor tilts the orbital plane; each click feeds the pile — redline the rads meter and the tube goes nuclear, then resets.',
  controls: [
    {
      name: 'orbit',
      type: 'number',
      label: 'Orbit Speed',
      min: 0.2,
      max: 4,
      step: 0.1,
      defaultValue: 1.4,
      debug: true,
    },
    {
      name: 'sweepSpd',
      type: 'number',
      label: 'Radar Sweep',
      min: 0,
      max: 2,
      step: 0.05,
      defaultValue: 0.45,
      debug: true,
    },
    {
      name: 'scan',
      type: 'boolean',
      label: 'Scanlines',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'bursts',
      type: 'boolean',
      label: 'Starbursts',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'phosphor',
      type: 'select',
      label: 'Phosphor',
      options: [
        { label: 'Acid Green', value: 'acid' },
        { label: 'Cyan', value: 'cyan' },
        { label: 'Amber', value: 'sun' },
      ],
      defaultValue: 'acid',
      debug: true,
    },
  ],
} as const);

export type AtomicAgeControlValues = ManifestToControlValues<typeof MANIFEST>;

interface Blip {
  x: number;
  y: number;
  /** Bearing from the dial centre; the sweep lights it when it passes. */
  a: number;
  flash: number;
}

interface Electron {
  /** Which of the three orbits it rides. */
  o: number;
  th: number;
  /** Flat x,y pairs, oldest first — the trail. */
  hist: number[];
}

interface Ring {
  x: number;
  y: number;
  t0: number;
}

interface Star {
  g: PIXI.Graphics;
  ph: number;
}

/** Meltdown duration, and the rads a single click adds. */
const NUKE_TIME = 4.2;
const CLICK_RADS = 0.13;
/** Nucleus bake: mark width and bloom padding in canvas pixels. */
const MARK_W = 220;
const MARK_PAD = 90;

export class AtomicAgeAnimation extends PixiAnimation<typeof MANIFEST> {
  private t = 0;
  /** Tube flicker and the click-driven brightness spike, both decaying. */
  private flick = 0;
  private spike = 0;
  private rings: Ring[] = [];
  private lastRing = 0;

  private grp: PIXI.Container | null = null;
  private cx = 0;
  private cy = 0;
  private S = 1;

  private blips: Blip[] = [];
  private sweep: PIXI.Graphics | null = null;
  private blipG: PIXI.Graphics | null = null;
  private orbits: PIXI.Container | null = null;
  private orbitG: PIXI.Graphics | null = null;
  private trailG: PIXI.Graphics | null = null;
  private nuc: PIXI.Container | null = null;
  private halo: PIXI.Sprite | null = null;
  private electrons: Electron[] = [];
  private fx: PIXI.Graphics | null = null;
  private stars: Star[] = [];

  private warn: PIXI.Sprite | null = null;
  private warnSub: PIXI.Sprite | null = null;
  private warn2: PIXI.Sprite | null = null;
  private meter: PIXI.Graphics | null = null;
  private meterLbl: PIXI.Sprite | null = null;
  private flash: PIXI.Graphics | null = null;
  private scanG: PIXI.Graphics | null = null;
  private rollG: PIXI.Graphics | null = null;

  /** Reactor state: accumulated rads and the meltdown countdown. */
  private rads = 0;
  private nuke = 0;
  private flashHold = 0;
  private tiltX = 0;
  private tiltY = 0;
  private swA = 0;

  constructor(initialControls?: Partial<AtomicAgeControlValues>) {
    super(MANIFEST, initialControls);
  }

  /**
   * The phosphor colour, read from PAL at call time so both the control and
   * a theme switch reach the vector layers on the next frame.
   */
  private phosphor(controls: AtomicAgeControlValues): number {
    const key = String(controls.phosphor);
    if (key === 'cyan') return PAL.cyan;
    if (key === 'sun') return PAL.sun;
    return PAL.acid;
  }

  onInit(app: PIXI.Application, controls: AtomicAgeControlValues): void {
    const root = this.getRoot();
    const w = app.screen.width;
    const h = app.screen.height;
    const PH = this.phosphor(controls);

    this.t = 0;
    this.flick = 0;
    this.rings = [];
    this.lastRing = 0;
    this.spike = 0;
    this.rads = 0;
    this.nuke = 0;
    this.flashHold = 0;
    this.tiltX = 0;
    this.tiltY = 0;
    this.swA = 0;

    scrim(root, w, h).alpha = 0.93;
    this.grp = new PIXI.Container();
    root.addChild(this.grp);
    const cx = w / 2;
    const cy = h / 2 - h * 0.03;
    this.cx = cx;
    this.cy = cy;
    const S = Math.min(w, h);
    this.S = S;

    // Radar blips: a fixed random field the sweep discovers.
    this.blips = [];
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = S * (0.12 + Math.random() * 0.33);
      this.blips.push({
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
        a,
        flash: 0,
      });
    }

    const dial = new PIXI.Graphics();
    for (const rr of [0.16, 0.28, 0.4]) dial.circle(cx, cy, S * rr);
    dial.stroke({ width: 1, color: PH, alpha: 0.18 });
    dial.moveTo(cx - S * 0.44, cy);
    dial.lineTo(cx + S * 0.44, cy);
    dial.moveTo(cx, cy - S * 0.44);
    dial.lineTo(cx, cy + S * 0.44);
    dial.stroke({ width: 1, color: PH, alpha: 0.1 });
    this.grp.addChild(dial);

    this.sweep = new PIXI.Graphics();
    this.blipG = new PIXI.Graphics();
    this.orbits = new PIXI.Container();
    this.orbits.x = cx;
    this.orbits.y = cy;
    this.orbitG = new PIXI.Graphics();
    this.trailG = new PIXI.Graphics();

    // Nucleus: the Bracket Bear mark burned into the phosphor tube.
    this.nuc = new PIXI.Container();
    {
      const phHex = hx(PH);
      const pr = (PH >> 16) & 255;
      const pg = (PH >> 8) & 255;
      const pb = PH & 255;
      const cv = document.createElement('canvas');
      cv.width = MARK_W + MARK_PAD * 2;
      cv.height =
        Math.round((MARK_W * LOGO_VIEWBOX.h) / LOGO_VIEWBOX.w) + MARK_PAD * 2;
      const lctx = cv.getContext('2d')!;
      lctx.translate(MARK_PAD, MARK_PAD);
      lctx.scale(
        MARK_W / LOGO_VIEWBOX.w,
        (cv.height - MARK_PAD * 2) / LOGO_VIEWBOX.h
      );
      const paths = logoPath2Ds();
      // Baked bloom: wide soft passes first, tight hot pass last.
      for (const [blur, alpha] of [
        [70, 0.3],
        [34, 0.5],
        [14, 0.8],
      ]) {
        lctx.save();
        lctx.globalAlpha = alpha;
        lctx.fillStyle = phHex;
        lctx.shadowColor = phHex;
        lctx.shadowBlur = blur;
        for (const p of paths) lctx.fill(p);
        lctx.restore();
      }
      lctx.save();
      lctx.globalAlpha = 0.35;
      lctx.fillStyle = '#ffffff';
      lctx.shadowColor = '#ffffff';
      lctx.shadowBlur = 5;
      for (const p of paths) lctx.fill(p);
      lctx.restore();

      // Additive halo behind the mark.
      const hcv = document.createElement('canvas');
      hcv.width = 256;
      hcv.height = 256;
      const hctx = hcv.getContext('2d')!;
      const grad = hctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, `rgba(${pr},${pg},${pb},0.6)`);
      grad.addColorStop(0.35, `rgba(${pr},${pg},${pb},0.2)`);
      grad.addColorStop(1, `rgba(${pr},${pg},${pb},0)`);
      hctx.fillStyle = grad;
      hctx.fillRect(0, 0, 256, 256);
      const halo = new PIXI.Sprite(PIXI.Texture.from(hcv));
      halo.anchor.set(0.5);
      halo.width = 210;
      halo.height = 210;
      halo.blendMode = 'add';
      halo.alpha = 0.75;
      this.halo = halo;

      const spr = new PIXI.Sprite(PIXI.Texture.from(cv));
      spr.anchor.set(0.5);
      spr.blendMode = 'add';
      const lw = 80;
      const sw = (lw * cv.width) / MARK_W;
      spr.width = sw;
      spr.height = sw * (cv.height / cv.width);
      this.nuc.addChild(halo, spr);
    }

    this.orbits.addChild(this.orbitG, this.trailG, this.nuc);
    this.grp.addChild(this.sweep, this.blipG, this.orbits);

    this.electrons = [];
    for (let o = 0; o < 3; o++) {
      for (let e = 0; e < 2; e++) {
        this.electrons.push({ o, th: e * Math.PI + o * 1.1, hist: [] });
      }
    }
    this.fx = new PIXI.Graphics();
    this.grp.addChild(this.fx);

    // Retro atomic-age starbursts: 4-point sparkle, sputnik, 8-point burst.
    this.stars = [];
    {
      const spike = (g: PIXI.Graphics, a: number, L: number, wd: number) => {
        const nx = Math.cos(a + Math.PI / 2);
        const ny = Math.sin(a + Math.PI / 2);
        g.poly([
          nx * wd,
          ny * wd,
          Math.cos(a) * L,
          Math.sin(a) * L,
          -nx * wd,
          -ny * wd,
        ]).fill({ color: PH, alpha: 0.88 });
      };
      const mkRetroStar = (kind: number, sc: number): PIXI.Graphics => {
        const g = new PIXI.Graphics();
        if (kind === 0) {
          // Elongated 4-point sparkle (tall diamond star).
          const Lv = 17 * sc;
          const Lh = 7 * sc;
          const k = 1.9 * sc;
          g.poly([
            0,
            -Lv,
            k,
            -k,
            Lh,
            0,
            k,
            k,
            0,
            Lv,
            -k,
            k,
            -Lh,
            0,
            -k,
            -k,
          ]).fill({ color: PH, alpha: 0.9 });
        } else if (kind === 1) {
          // Sputnik: thin spokes at irregular angles, some tipped with dots.
          const arms: Array<[number, number, number]> = [
            [-90, 15, 1],
            [-28, 10, 1],
            [42, 13, 0],
            [118, 9, 1],
            [198, 12, 0],
            [282, 8, 1],
          ];
          for (const [d, ln, dot] of arms) {
            const a = (d * Math.PI) / 180;
            const L = ln * sc;
            spike(g, a, L, 0.9 * sc);
            if (dot) {
              g.circle(Math.cos(a) * L, Math.sin(a) * L, 1.3 * sc).fill({
                color: PH,
                alpha: 0.85,
              });
            }
          }
          g.circle(0, 0, 1.5 * sc).fill({ color: PH, alpha: 0.9 });
        } else {
          // 8-point burst, alternating long and short tapered spikes.
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
            spike(g, a, (i % 2 ? 7 : 15) * sc, 1.5 * sc);
          }
        }
        return g;
      };
      const spots: Array<[number, number, number, number]> = [
        [0.14, 0.16, 0, 1.1],
        [0.86, 0.22, 1, 1],
        [0.12, 0.8, 2, 0.9],
        [0.88, 0.76, 0, 0.75],
        [0.72, 0.1, 1, 0.7],
      ];
      for (const [x, y, kind, sc] of spots) {
        const g = mkRetroStar(kind, sc);
        g.x = w * x;
        g.y = h * y;
        g.rotation = kind === 2 ? Math.PI / 8 : 0;
        this.grp.addChild(g);
        this.stars.push({ g, ph: Math.random() * 6 });
      }
    }

    this.warn = labelSprite('● CAUTION — ATOMIC TEST IN PROGRESS', {
      size: 11,
      weight: '700',
      letterSpacing: 4,
      fill: hx(PH),
    });
    const maxW = w * 0.9;
    if (this.warn.width > maxW) {
      this.warn.scale.set(maxW / (this.warn.width / this.warn.scale.x));
    }
    this.warn.x = w / 2 - this.warn.width / 2;
    this.warn.y = h * 0.055;
    this.grp.addChild(this.warn);

    this.warnSub = labelSprite('( DO NOT CLICK. ESPECIALLY NOT REPEATEDLY. )', {
      size: 8,
      weight: '700',
      letterSpacing: 3,
      fill: hx(PH),
    });
    this.warnSub.x = w / 2 - this.warnSub.width / 2;
    this.warnSub.y = h * 0.055 + this.warn.height + 6;
    this.warnSub.alpha = 0.55;
    this.grp.addChild(this.warnSub);

    this.warn2 = labelSprite('☢ MELTDOWN — CONTAINMENT LOST ☢', {
      size: 13,
      weight: '700',
      letterSpacing: 5,
      fill: '#ffffff',
    });
    this.warn2.x = w / 2 - this.warn2.width / 2;
    this.warn2.y = h * 0.055;
    this.warn2.visible = false;
    this.grp.addChild(this.warn2);

    this.flash = new PIXI.Graphics();
    this.flash.rect(-4, -4, w + 8, h + 8);
    this.flash.fill({ color: 0xffffff });
    this.flash.alpha = 0;

    this.meterLbl = labelSprite('RADS/SEC', {
      size: 9,
      weight: '700',
      letterSpacing: 3,
      fill: hx(PH),
    });
    this.meterLbl.x = w * 0.07;
    this.meterLbl.y = h * 0.87;
    this.meterLbl.alpha = 0.7;
    this.meter = new PIXI.Graphics();
    this.grp.addChild(this.meter, this.meterLbl);

    this.scanG = new PIXI.Graphics();
    for (let y = 0; y < h; y += 3) {
      this.scanG.moveTo(0, y);
      this.scanG.lineTo(w, y);
    }
    this.scanG.stroke({ width: 1, color: 0x000000, alpha: 0.16 });
    this.rollG = new PIXI.Graphics();
    this.rollG.rect(0, 0, w, 26);
    this.rollG.fill({ color: PH, alpha: 0.05 });
    root.addChild(this.flash, this.rollG, this.scanG);
  }

  onUpdate(
    app: PIXI.Application,
    controls: AtomicAgeControlValues,
    deltaTime: number
  ): void {
    const grp = this.grp;
    const orbits = this.orbits;
    const orbitG = this.orbitG;
    const trailG = this.trailG;
    const nuc = this.nuc;
    const sweep = this.sweep;
    const blipG = this.blipG;
    const fx = this.fx;
    const meter = this.meter;
    const flash = this.flash;
    const warn = this.warn;
    const warnSub = this.warnSub;
    const warn2 = this.warn2;
    const scanG = this.scanG;
    const rollG = this.rollG;
    if (
      !grp ||
      !orbits ||
      !orbitG ||
      !trailG ||
      !nuc ||
      !sweep ||
      !blipG ||
      !fx ||
      !meter ||
      !flash ||
      !warn ||
      !warnSub ||
      !warn2 ||
      !scanG ||
      !rollG
    ) {
      return;
    }

    const dt = Math.min(0.05, deltaTime);
    this.t += dt;

    const w = app.screen.width;
    const h = app.screen.height;
    const PH = this.phosphor(controls);
    const pointer = this.pointer;
    const mouse = pointer?.mouse;

    if (pointer) {
      while (pointer.clicks.length) {
        pointer.clicks.shift();
        if (this.nuke <= 0) {
          this.rads = Math.min(1, this.rads + CLICK_RADS);
          this.flick = Math.max(this.flick, 0.45);
          this.spike = Math.max(this.spike, 0.5);
          if (this.rads >= 1) {
            this.nuke = NUKE_TIME;
            this.rings.length = 0;
            this.lastRing = 0;
          }
        }
      }
    }

    if (this.nuke > 0) {
      this.nuke -= dt;
      if (this.t - this.lastRing > 0.4) {
        this.lastRing = this.t;
        this.rings.push({ x: this.cx, y: this.cy, t0: this.t });
      }
      const k = NUKE_TIME - this.nuke;
      // Hard flash on detonation, decaying, then a white-out as it resets.
      const burst =
        k < 0.25 ? k / 0.25 : Math.max(0, 0.85 * Math.exp(-(k - 0.25) * 2.2));
      const fadeUp =
        this.nuke < 1.1 ? Math.min(1, (1.1 - Math.max(0, this.nuke)) / 1.1) : 0;
      flash.alpha = Math.max(burst, fadeUp);
      const shake = Math.min(1, Math.max(0, this.nuke));
      grp.x = (Math.random() - 0.5) * 16 * shake;
      grp.y = (Math.random() - 0.5) * 16 * shake;
      warn.visible = false;
      warnSub.visible = false;
      warn2.visible = Math.sin(this.t * 12) > -0.4;
      this.spike = 1;
      if (this.nuke <= 0) {
        this.nuke = 0;
        this.rads = 0;
        grp.x = 0;
        grp.y = 0;
        warn.visible = true;
        warnSub.visible = true;
        warn2.visible = false;
        flash.alpha = 1;
        this.flashHold = 1;
        this.rings.length = 0;
      }
    } else {
      flash.alpha = Math.max(
        0,
        flash.alpha - dt * (this.flashHold > 0 ? 0 : 0.45)
      );
      this.flashHold = Math.max(0, this.flashHold - dt);
      this.rads = Math.max(0, this.rads - dt * 0.12);
    }

    this.flick *= Math.exp(-dt * 4);
    this.spike *= Math.exp(-dt * 1.2);
    grp.alpha = 1 - this.flick * 0.3 * Math.random() - 0.03 * Math.random();

    // Cursor tilts the orbital plane; with no cursor it drifts on its own.
    const txT = mouse?.active
      ? (mouse.x - w / 2) / (w / 2)
      : Math.cos(this.t * 0.3) * 0.3;
    const tyT = mouse?.active
      ? (mouse.y - h / 2) / (h / 2)
      : Math.sin(this.t * 0.25) * 0.3;
    const sm = Math.min(1, dt * 3);
    this.tiltX += (txT - this.tiltX) * sm;
    this.tiltY += (tyT - this.tiltY) * sm;
    const squash = 0.34 + Math.abs(this.tiltY) * 0.22;
    const baseRot = this.tiltX * 0.5;

    const nukeK =
      this.nuke > 0
        ? Math.max(0, Math.min(1, (NUKE_TIME - this.nuke) / NUKE_TIME))
        : 0;
    const bonkers = nukeK * nukeK;
    const nukePulse =
      this.nuke > 0
        ? 1 + Math.sin(this.t * (7 + bonkers * 14)) * (0.15 + bonkers * 0.85)
        : 1;
    orbits.scale.set(nukePulse);

    const A = this.S * 0.3;
    // Each orbit is the same ellipse rotated in plane, sampled as a polyline
    // because Graphics has no rotated-ellipse primitive.
    const epos = (o: number, th: number): { x: number; y: number } => {
      const rot = baseRot + (o * Math.PI) / 3;
      const ex = Math.cos(th) * A;
      const ey = Math.sin(th) * A * squash;
      return {
        x: ex * Math.cos(rot) - ey * Math.sin(rot),
        y: ex * Math.sin(rot) + ey * Math.cos(rot),
      };
    };
    orbitG.clear();
    for (let o = 0; o < 3; o++) {
      let first = true;
      for (let th = 0; th <= Math.PI * 2 + 0.1; th += 0.16) {
        const p = epos(o, th);
        if (first) {
          orbitG.moveTo(p.x, p.y);
          first = false;
        } else orbitG.lineTo(p.x, p.y);
      }
      orbitG.stroke({ width: 1, color: PH, alpha: 0.3 });
    }

    trailG.clear();
    for (const e of this.electrons) {
      e.th +=
        dt *
        controls.orbit *
        (1.6 + e.o * 0.35) *
        (1 +
          this.rads * 4 +
          (this.nuke > 0
            ? 2.5 + Math.pow((NUKE_TIME - this.nuke) / NUKE_TIME, 2) * 8
            : 0));
      const p = epos(e.o, e.th);
      e.hist.push(p.x, p.y);
      if (e.hist.length > 28) e.hist.splice(0, 2);
      for (let i = 2; i < e.hist.length; i += 2) {
        trailG.moveTo(e.hist[i - 2], e.hist[i - 1]);
        trailG.lineTo(e.hist[i], e.hist[i + 1]);
        trailG.stroke({
          width: 2,
          color: PH,
          alpha: (i / e.hist.length) * 0.5,
        });
      }
      trailG.circle(p.x, p.y, 4);
      trailG.fill({ color: 0xffffff });
      trailG.circle(p.x, p.y, 8);
      trailG.fill({ color: PH, alpha: 0.25 });
    }

    nuc.scale.set(
      (1 +
        Math.sin(this.t * (3 + this.rads * 7)) * (0.06 + this.rads * 0.12) +
        this.spike * 0.25) *
        (this.nuke > 0
          ? 1 +
            Math.sin(this.t * (9 + bonkers * 18) + 1.3) * (0.2 + bonkers * 1.1)
          : 1)
    );
    const nj = this.rads * this.rads * 9 + (this.nuke > 0 ? 5 : 0);
    nuc.x = (Math.random() - 0.5) * nj;
    nuc.y = (Math.random() - 0.5) * nj;
    nuc.rotation = (Math.random() - 0.5) * this.rads * 0.16;
    if (this.halo) {
      this.halo.alpha =
        0.5 +
        0.08 * Math.sin(this.t * 2.2) +
        Math.random() * 0.06 +
        this.rads * 0.35 +
        this.spike * 0.2;
    }

    sweep.clear();
    if (controls.sweepSpd > 0) {
      this.swA += dt * controls.sweepSpd * Math.PI * 2;
      const RR = this.S * 0.44;
      // Ten trailing spokes fake the phosphor decay behind the sweep line.
      for (let i = 0; i < 10; i++) {
        const a = this.swA - i * 0.035;
        sweep.moveTo(this.cx, this.cy);
        sweep.lineTo(this.cx + Math.cos(a) * RR, this.cy + Math.sin(a) * RR);
        sweep.stroke({ width: 3, color: PH, alpha: 0.14 * (1 - i / 10) });
      }
      for (const b of this.blips) {
        const da =
          ((b.a - (this.swA % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) -
          Math.PI;
        if (Math.abs(da) < 0.06) b.flash = 1;
        b.flash *= Math.exp(-dt * 1.6);
      }
    }

    blipG.clear();
    for (const b of this.blips) {
      if (b.flash < 0.02) continue;
      blipG.circle(b.x, b.y, 3 + (1 - b.flash) * 5);
      blipG.fill({ color: PH, alpha: b.flash * 0.9 });
    }

    for (const st of this.stars) {
      st.g.visible = controls.bursts;
      const tw = 0.5 + 0.5 * Math.sin(this.t * 1.4 + st.ph);
      st.g.alpha = 0.25 + tw * 0.6;
      st.g.rotation = Math.sin(this.t * 0.4 + st.ph) * 0.15;
      st.g.scale.set(0.8 + tw * 0.35);
    }

    warn.alpha =
      (Math.sin(this.t * 4) > -0.3 ? 0.9 : 0.15) * (0.8 + this.spike * 0.2);

    // Rads meter: 18 bars, level is idle noise plus whatever is in the pile.
    meter.clear();
    const lvl =
      this.nuke > 0
        ? 1
        : Math.min(
            1,
            0.06 +
              0.04 * Math.abs(Math.sin(this.t * 2.1)) +
              0.03 * Math.random() +
              this.rads * 0.88
          );
    const bx = w * 0.07;
    const by = h * 0.84;
    const bars = 18;
    for (let i = 0; i < bars; i++) {
      const on = i / bars < lvl;
      meter.rect(bx + i * 9, by - 12, 6, 12);
      meter.fill({
        color: on ? (this.nuke > 0 ? 0xffffff : PH) : 0xffffff,
        alpha: on ? 0.9 : 0.08,
      });
    }

    fx.clear();
    this.rings = this.rings.filter((r) => this.t - r.t0 < 1.8);
    for (const r of this.rings) {
      const a = (this.t - r.t0) / 1.8;
      fx.circle(r.x, r.y, 8 + a * this.S * 0.5);
      fx.stroke({ width: 3 * (1 - a), color: 0xffffff, alpha: (1 - a) * 0.8 });
      fx.circle(r.x, r.y, 4 + a * this.S * 0.34);
      fx.stroke({ width: 2, color: PH, alpha: (1 - a) * 0.6 });
    }

    scanG.visible = controls.scan;
    rollG.visible = controls.scan;
    rollG.y = ((this.t * 70) % (h + 60)) - 30;
  }

  onDestroy(): void {
    this.grp = null;
    this.sweep = null;
    this.blipG = null;
    this.orbits = null;
    this.orbitG = null;
    this.trailG = null;
    this.nuc = null;
    this.halo = null;
    this.fx = null;
    this.meter = null;
    this.meterLbl = null;
    this.flash = null;
    this.scanG = null;
    this.rollG = null;
    this.warn = null;
    this.warnSub = null;
    this.warn2 = null;
    this.blips = [];
    this.electrons = [];
    this.stars = [];
    this.rings = [];
    super.onDestroy();
  }
}

export function createAtomicAgeAnimation(
  initialControls?: Partial<AtomicAgeControlValues>
): AtomicAgeAnimation {
  return new AtomicAgeAnimation(initialControls);
}
