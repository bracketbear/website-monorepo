import * as PIXI from 'pixi.js';
import { createManifest, hx, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation, glowTex, rand } from '@bracketbear/flateralus-pixi';
import { LOGO_VIEWBOX, logoPath2Ds } from '../shared/logo';

const MANIFEST = createManifest({
  id: 'foil-statement',
  name: 'SIG/09 — Press Foil',
  description:
    'The statement set as press foil: type and frame are one alpha mask over a live material gradient, and the light source is your cursor. Tilt to rake the sheen across the block; swap the foil stock — holo, chrome, gold, oil, galaxy — while it runs. Click for a full flash pass. Left alone, it inspects itself.',
  controls: [
    {
      name: 'material',
      type: 'select',
      label: 'Foil material',
      defaultValue: 'gold',
      options: [
        { label: 'Holo Rainbow', value: 'holo' },
        { label: 'Chrome', value: 'chrome' },
        { label: 'Gold Leaf', value: 'gold' },
        { label: 'Oil Slick', value: 'oil' },
        { label: 'Galaxy', value: 'galaxy' },
      ],
      debug: true,
    },
    {
      name: 'layout',
      type: 'select',
      label: 'Type scale',
      defaultValue: 'emphasis',
      options: [
        { label: 'Emphasis', value: 'emphasis' },
        { label: 'Even block', value: 'even' },
      ],
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'frameStyle',
      type: 'select',
      label: 'Frame',
      defaultValue: 'none',
      options: [
        { label: 'Ornate', value: 'ornate' },
        { label: 'Belt', value: 'belt' },
        { label: 'Ticket', value: 'ticket' },
        { label: 'Plate', value: 'plate' },
        { label: 'None', value: 'none' },
      ],
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'sheenWidth',
      type: 'number',
      label: 'Sheen width',
      min: 0.08,
      max: 0.6,
      step: 0.02,
      defaultValue: 0.22,
      debug: true,
    },
    {
      name: 'tiltAmount',
      type: 'number',
      label: 'Tilt response',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.55,
      debug: true,
    },
    {
      name: 'sparkleAmount',
      type: 'number',
      label: 'Sparkle count',
      min: 0,
      max: 220,
      step: 10,
      defaultValue: 90,
      debug: true,
    },
    {
      name: 'driftSpeed',
      type: 'number',
      label: 'Idle drift',
      min: 0,
      max: 1.5,
      step: 0.05,
      defaultValue: 0.35,
      debug: true,
    },
    {
      name: 'dormant',
      type: 'boolean',
      label: 'Dormant until touched',
      defaultValue: false,
      debug: true,
    },
    {
      name: 'hud',
      type: 'boolean',
      label: 'Annotation layer',
      defaultValue: true,
      debug: true,
      resetsAnimation: true,
    },
  ],
} as const);

export type FoilStatementControlValues = ManifestToControlValues<
  typeof MANIFEST
>;

interface FoilMaterial {
  label: string;
  /** Gradient stops around the ramp; `holo` synthesizes a rainbow instead. */
  stops: readonly string[] | null;
  spark: number;
  /** Per-stock multiplier on sheen and sparkle — dark stocks need more. */
  boost: number;
}

const CHROME_STOPS = [
  '#23272c',
  '#c9d4de',
  '#5a636d',
  '#f8fbff',
  '#31373d',
  '#9aa7b3',
  '#e8eef4',
  '#3c434a',
] as const;

const MATS: Record<string, FoilMaterial> = {
  holo: { label: 'Holo Rainbow', stops: null, spark: 0xffffff, boost: 1 },
  chrome: {
    label: 'Chrome',
    stops: CHROME_STOPS,
    spark: 0xffffff,
    boost: 1.15,
  },
  gold: {
    label: 'Gold Leaf',
    stops: [
      '#5a3b06',
      '#f7c948',
      '#8a5c0a',
      '#ffe9a3',
      '#6b4304',
      '#e0a52e',
      '#fff3cf',
      '#7a4d05',
    ],
    spark: 0xffe9a3,
    boost: 0.9,
  },
  oil: {
    label: 'Oil Slick',
    stops: [
      '#0b3a3a',
      '#7a2ea6',
      '#0f6f4f',
      '#c92a8d',
      '#123a6b',
      '#25c9a8',
      '#5b1f8f',
      '#0d5747',
    ],
    spark: 0xa9fff0,
    boost: 1,
  },
  galaxy: {
    label: 'Galaxy',
    stops: [
      '#060616',
      '#3b1f7a',
      '#0d2a5e',
      '#7a5cff',
      '#0a0d2a',
      '#274b9f',
      '#8f7bff',
      '#101038',
    ],
    spark: 0xcfe0ff,
    boost: 1.7,
  },
};

const foilTextures: Record<string, PIXI.Texture> = {};

/**
 * The material ramp as a 1024x8 strip, tiled and raked across the card.
 * Cached per stock so swapping material mid-run is a texture assignment.
 */
function foilFor(id: string): PIXI.Texture {
  const hit = foilTextures[id];
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 8;
  const g = cv.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 1024, 0);
  if (id === 'holo') {
    for (let i = 0; i <= 24; i++) {
      gr.addColorStop(i / 24, `hsl(${(i * 30) % 360},88%,56%)`);
    }
  } else {
    const st = (MATS[id] ?? MATS.chrome).stops ?? CHROME_STOPS;
    const n = st.length;
    // One stop past the end repeats the first color, so the ramp tiles.
    for (let i = 0; i <= n; i++) gr.addColorStop(i / n, st[i % n]);
  }
  g.fillStyle = gr;
  g.fillRect(0, 0, 1024, 8);
  const tex = PIXI.Texture.from(cv);
  foilTextures[id] = tex;
  return tex;
}

let specTexture: PIXI.Texture | null = null;

/** Soft white band used for both the tracking sheen and the click flash. */
function specTex(): PIXI.Texture {
  if (specTexture) return specTexture;
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 8;
  const g = cv.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 256, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(0.42, 'rgba(255,255,255,0.5)');
  gr.addColorStop(0.5, 'rgba(255,255,255,1)');
  gr.addColorStop(0.58, 'rgba(255,255,255,0.5)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 8);
  specTexture = PIXI.Texture.from(cv);
  return specTexture;
}

type LabelAlign = 'left' | 'right' | 'center';

/**
 * A HUD label rasterized by hand into a 2x canvas and blitted as a sprite.
 *
 * There is deliberately no PIXI.Text here: the annotation layer wants the
 * same mono face and letter-spacing the rest of the lab uses, and canvas
 * text gets it without pulling in the text pipeline.
 */
class Label {
  private cur: string | null = null;
  private spr: PIXI.Sprite | null = null;

  constructor(
    private readonly root: PIXI.Container,
    private readonly size: number,
    private readonly color: string,
    private readonly x: number,
    private readonly y: number,
    private readonly align: LabelAlign = 'left',
    private readonly ls = 1.5
  ) {}

  set(t: string): void {
    if (t === this.cur || this.root.destroyed) return;
    this.cur = t;
    const cv = document.createElement('canvas');
    const font = `700 ${this.size}px "JetBrains Mono", monospace`;
    const g = cv.getContext('2d')!;
    g.font = font;
    const wCss = Math.max(
      4,
      Math.ceil(g.measureText(t).width + this.ls * t.length) + 6
    );
    const hCss = Math.ceil(this.size * 1.4) + 4;
    // Resizing the canvas resets the context, so font and transform are set
    // again below.
    cv.width = wCss * 2;
    cv.height = hCss * 2;
    g.scale(2, 2);
    g.font = font;
    try {
      g.letterSpacing = `${this.ls}px`;
    } catch {
      // Browsers without letterSpacing just draw the default tracking.
    }
    g.fillStyle = this.color;
    g.textBaseline = 'top';
    g.fillText(t, 3, 2);
    const tex = PIXI.Texture.from(cv);
    if (!this.spr) {
      this.spr = new PIXI.Sprite(tex);
      this.root.addChild(this.spr);
    } else {
      this.spr.texture = tex;
    }
    this.spr.scale.set(0.5);
    this.spr.position.set(
      this.align === 'right'
        ? this.x - wCss
        : this.align === 'center'
          ? this.x - wCss / 2
          : this.x,
      this.y
    );
  }
}

function mkLabel(
  root: PIXI.Container,
  text: string,
  size: number,
  color: string,
  x: number,
  y: number,
  align: LabelAlign = 'left',
  ls = 1.5
): Label {
  const l = new Label(root, size, color, x, y, align, ls);
  l.set(text);
  return l;
}

interface Spark {
  sp: PIXI.Sprite;
  /** Twinkle phase and rate, fixed at placement. */
  ph: number;
  spd: number;
}

export class FoilStatementAnimation extends PixiAnimation<typeof MANIFEST> {
  private stage: PIXI.Container | null = null;
  private card: PIXI.Container | null = null;
  private foil: PIXI.TilingSprite | null = null;
  private spec: PIXI.Sprite | null = null;
  private flash: PIXI.Sprite | null = null;
  private sparkCont: PIXI.Container | null = null;
  private sparks: Spark[] = [];
  private matLabel: Label | null = null;
  private t = 0;
  /** Smoothed light position in 0..1 stage coords. */
  private lx = 0.5;
  private ly = 0.5;
  /** Flash-pass progress, or null when no pass is running. */
  private flashT: number | null = null;
  private mat: string | null = null;
  private boost = 1;
  /** Set when the stage is too small to build a readable card. */
  private dead = false;
  private woke = false;

  constructor(initialControls?: Partial<FoilStatementControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(app: PIXI.Application, controls: FoilStatementControlValues): void {
    const root = this.getRoot();
    const w = app.screen.width;
    const h = app.screen.height;

    this.dead = false;
    this.woke = false;
    this.card = null;
    this.sparks = [];
    // Below this the frame insets and type boxes collapse to nothing, so
    // bail rather than rasterize a degenerate plate.
    if (w < 160 || h < 160) {
      this.dead = true;
      return;
    }

    this.t = 0;
    this.lx = 0.5;
    this.ly = 0.5;
    this.flashT = null;
    this.mat = null;
    this.boost = 1;

    const spot = new PIXI.Sprite(glowTex());
    spot.anchor.set(0.5);
    spot.position.set(w / 2, h * 0.46);
    spot.width = w * 1.5;
    spot.height = h * 1.5;
    spot.tint = PAL.cream;
    spot.alpha = 0.05;
    root.addChild(spot);

    this.stage = new PIXI.Container();
    root.addChild(this.stage);

    this.matLabel = null;
    if (controls.hud) {
      const dim = 'rgba(255,243,227,0.55)';
      const dim2 = 'rgba(255,243,227,0.35)';
      mkLabel(root, 'SIG/09 · PRESS FOIL', 9, dim, 14, 12);
      mkLabel(root, 'MASK: TYPE + FRAME / MATERIAL: LIVE', 8, dim2, 14, 27);
      this.matLabel = mkLabel(root, '—', 9, hx(PAL.sun), w - 14, 12, 'right');
      mkLabel(root, 'LIGHT SOURCE: CURSOR', 8, dim2, w - 14, 27, 'right');
      mkLabel(root, 'GRADE: GEM MINT 10 · NOT FOR RESALE', 8, dim, 14, h - 27);
      mkLabel(
        root,
        'TILT TO INSPECT — CLICK FOR FLASH PASS',
        8,
        dim2,
        w - 14,
        h - 27,
        'right'
      );
    }

    this.buildCard(app, controls);

    // The plate is rasterized once. If Anton has not loaded yet the type
    // comes out in the fallback face, so rebuild when it arrives.
    if (!document.fonts.check('100px Anton')) {
      document.fonts
        .load('100px Anton')
        .then(() => {
          if (this.dead || !this.stage || this.stage.destroyed)
            return undefined;
          this.buildCard(app, this.getControlValues());
          return undefined;
        })
        .catch(() => undefined);
    }
  }

  /**
   * Rasterize the cover plate and rebuild the card stack under it.
   *
   * The plate is an ink sheet with the frame and statement punched out as
   * holes; the foil, sheen and flash layers sit underneath and read only
   * through those holes. That is the whole masking scheme — no GPU masks,
   * no filters, one sprite.
   */
  private buildCard(
    app: PIXI.Application,
    controls: FoilStatementControlValues
  ): void {
    const stage = this.stage;
    if (!stage) return;
    const w = app.screen.width;
    const h = app.screen.height;

    if (this.card) {
      try {
        stage.removeChild(this.card);
        this.card.destroy({ children: true });
      } catch {
        // Already torn down by a destroy that raced the font load.
      }
    }

    // Overscan the plate so tilt and skew never expose its edges.
    const ox = Math.ceil(w * 0.15);
    const oy = Math.ceil(h * 0.15);
    const pw = w + 2 * ox;
    const ph = h + 2 * oy;
    const cv = document.createElement('canvas');
    cv.width = pw * 2;
    cv.height = ph * 2;
    const g = cv.getContext('2d', { willReadFrequently: true })!;
    g.scale(2, 2);
    g.fillStyle = hx(PAL.ink);
    g.fillRect(0, 0, pw, ph);
    g.globalCompositeOperation = 'destination-out';
    g.translate(ox, oy);
    g.fillStyle = '#fff';
    g.strokeStyle = '#fff';
    const mn = Math.min(w, h);
    const m = mn * 0.055;
    const bw = mn * 0.022;

    const dot = (x: number, y: number, r: number): void => {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    };

    // Ink a dot back onto punched foil (rivets, perforations).
    const inkDot = (x: number, y: number, r: number): void => {
      g.save();
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = hx(PAL.ink);
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.restore();
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = '#fff';
    };

    // Dots along the frame band's centerline.
    const perimeterDots = (
      inset: number,
      r: number,
      spacing: number,
      skipCorner: number
    ): void => {
      const x0 = inset;
      const x1 = w - inset;
      const y0 = inset;
      const y1 = h - inset;
      for (let x = x0 + skipCorner; x <= x1 - skipCorner + 1; x += spacing) {
        inkDot(x, y0, r);
        inkDot(x, y1, r);
      }
      for (let y = y0 + skipCorner; y <= y1 - skipCorner + 1; y += spacing) {
        inkDot(x0, y, r);
        inkDot(x1, y, r);
      }
    };

    // Corner tile: the mark in foil, wrapped in a thick foil border that
    // follows its silhouette, with an ink gap between core and border.
    const paths = logoPath2Ds();
    const logo = (x: number, y: number, r: number, rot?: number): void => {
      const logoW = r * 1.7;
      const sc = logoW / LOGO_VIEWBOX.w;
      const logoH = LOGO_VIEWBOX.h * sc;
      const border = logoW * 0.11;
      const gapW = logoW * 0.06;
      const pass = (lw: number): void => {
        g.lineJoin = 'round';
        g.lineCap = 'round';
        paths.forEach((p) => {
          g.fill(p);
          if (lw > 0) {
            g.lineWidth = lw / sc;
            g.stroke(p);
          }
        });
      };
      g.save();
      g.translate(x, y);
      g.rotate(rot == null ? Math.PI / 4 : rot);
      g.translate(-logoW / 2, -logoH / 2);
      g.scale(sc, sc);
      g.strokeStyle = '#fff';
      pass(2 * (gapW + border)); // punch fattened silhouette (border outer edge)
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = g.strokeStyle = hx(PAL.ink);
      pass(2 * gapW); // ink back the gap ring
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = '#fff';
      pass(0); // punch the logo core
      g.restore();
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = '#fff';
    };

    let pad: number;
    if (controls.frameStyle === 'ornate') {
      const cr = mn * 0.045;
      g.lineJoin = 'round';
      g.lineWidth = bw * 2.1;
      g.beginPath();
      g.roundRect(m, m, w - 2 * m, h - 2 * m, cr);
      g.stroke();
      const i2 = m + bw * 1.25 + 16;
      g.lineWidth = Math.max(28, bw * 3.4) * 1.7 * 0.11; // match corner-logo border weight
      g.beginPath();
      g.roundRect(i2, i2, w - 2 * i2, h - 2 * i2, Math.max(4, cr - (i2 - m)));
      g.stroke();
      dot(w / 2, m, bw * 0.85);
      dot(w / 2, h - m, bw * 0.85);
      dot(m, h / 2, bw * 0.85);
      dot(w - m, h / 2, bw * 0.85);
      const lr = Math.max(28, bw * 3.4);
      const q = Math.PI / 4;
      const li = lr * 0.45;
      // Same tile at each corner, rotated 90° per corner going around.
      logo(w - m - li, m + li, lr, q);
      logo(w - m - li, h - m - li, lr, q + Math.PI / 2);
      logo(m + li, h - m - li, lr, q + Math.PI);
      logo(m + li, m + li, lr, q - Math.PI / 2);
      pad = i2 + mn * 0.055;
    } else if (controls.frameStyle === 'belt') {
      // Championship strap: extra-thick band, riveted, side medallions.
      const cr = mn * 0.05;
      g.lineJoin = 'round';
      g.lineWidth = bw * 2.9;
      g.beginPath();
      g.roundRect(m, m, w - 2 * m, h - 2 * m, cr);
      g.stroke();
      perimeterDots(m, bw * 0.38, bw * 2.6, cr + bw);
      const i2 = m + bw * 1.7 + 12;
      g.lineWidth = Math.max(28, bw * 3.4) * 1.7 * 0.11;
      g.beginPath();
      g.roundRect(i2, i2, w - 2 * i2, h - 2 * i2, Math.max(4, cr - (i2 - m)));
      g.stroke();
      const lr = Math.max(28, bw * 3.4);
      // Top/bottom medallion plates, upright.
      logo(w / 2, m, lr * 1.25, 0);
      logo(w / 2, h - m, lr * 1.25, 0);
      pad = i2 + mn * 0.055;
    } else if (controls.frameStyle === 'ticket') {
      // Admission-ticket band with perforation dots and a thin inner rule.
      const cr = mn * 0.035;
      g.lineJoin = 'round';
      g.lineWidth = bw * 1.9;
      g.beginPath();
      g.roundRect(m, m, w - 2 * m, h - 2 * m, cr);
      g.stroke();
      perimeterDots(m, bw * 0.52, bw * 1.7, cr);
      const i2 = m + bw * 1.2 + 10;
      g.lineWidth = 3;
      g.beginPath();
      g.roundRect(i2, i2, w - 2 * i2, h - 2 * i2, Math.max(4, cr - (i2 - m)));
      g.stroke();
      const lr = Math.max(26, bw * 3);
      const q = Math.PI / 4;
      const li = lr * 0.45;
      logo(w - m - li, m + li, lr, q);
      logo(m + li, h - m - li, lr, q + Math.PI);
      pad = i2 + mn * 0.05;
    } else if (controls.frameStyle === 'plate') {
      g.lineJoin = 'round';
      g.lineWidth = bw * 2.4;
      g.beginPath();
      g.roundRect(m, m, w - 2 * m, h - 2 * m, mn * 0.06);
      g.stroke();
      logo(w / 2, m, Math.max(26, bw * 3.2));
      pad = m + bw * 0.85 + mn * 0.055;
    } else {
      pad = mn * 0.04;
    }

    const lines = ['BRACKET BEAR', 'IS AN', 'EXPERIENCE'];
    const availW = w - 2 * pad;
    const availH = h - 2 * pad;
    const gap = availH * 0.055;
    const wts = controls.layout === 'emphasis' ? [1.1, 0.34, 1.56] : [1, 1, 1];
    const wsum = wts[0] + wts[1] + wts[2];
    const netH = availH - 2 * gap;
    g.textBaseline = 'alphabetic';
    let yCur = pad;
    lines.forEach((ln, i) => {
      const hbox = (netH * wts[i]) / wsum;
      if (i === 1) {
        // "IS AN" — a solid foil bar with the words knocked back out in ink.
        let bx0 = pad;
        let bx1 = pad + availW;
        if (controls.frameStyle === 'none') {
          // Frameless: upright logo medallions flank the bar.
          const r2 = hbox / 1.4;
          const tw2 = r2 * 2.35;
          logo(pad + tw2 / 2, yCur + hbox / 2, r2, 0);
          logo(pad + availW - tw2 / 2, yCur + hbox / 2, r2, 0);
          bx0 = pad + tw2 + hbox * 0.35;
          bx1 = pad + availW - tw2 - hbox * 0.35;
        }
        g.beginPath();
        g.roundRect(bx0, yCur, bx1 - bx0, hbox, Math.min(hbox * 0.18, 10));
        g.fill();
        g.save();
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = hx(PAL.ink);
        const fs2 = hbox * 0.62;
        g.font = `${fs2}px Anton, sans-serif`;
        try {
          g.letterSpacing = `${fs2 * 0.45}px`;
        } catch {
          // Browsers without letterSpacing draw the default tracking.
        }
        g.textBaseline = 'middle';
        const tw = g.measureText(ln).width;
        g.fillText(
          ln,
          pad + (availW - tw) / 2 + fs2 * 0.22,
          yCur + hbox * 0.56
        );
        g.restore();
        g.globalCompositeOperation = 'destination-out';
        g.fillStyle = '#fff';
        g.textBaseline = 'alphabetic';
        yCur += hbox + gap;
        return;
      }
      // Measure at 100px, then scale so the cap height fills the row box and
      // the glyphs stretch horizontally to the full column.
      g.font = '100px Anton, sans-serif';
      const mm = g.measureText(ln);
      const capH = mm.actualBoundingBoxAscent || 73;
      const fs = (100 * hbox) / capH;
      g.font = `${fs}px Anton, sans-serif`;
      const wl = Math.max(1, g.measureText(ln).width);
      g.save();
      g.translate(pad, yCur + hbox);
      g.scale(availW / wl, 1);
      g.fillText(ln, 0, 0);
      g.restore();
      yCur += hbox + gap;
    });

    const coverSpr = new PIXI.Sprite(PIXI.Texture.from(cv));
    coverSpr.scale.set(0.5);
    coverSpr.position.set(-ox, -oy);

    // Card stack: foil + sheen + flash under the cover, sparkles above.
    const card = new PIXI.Container();
    const diag = Math.hypot(w, h) * 1.5;
    this.foil = new PIXI.TilingSprite({
      texture: foilFor(String(controls.material)),
      width: diag,
      height: diag,
    });
    this.foil.anchor.set(0.5);
    this.foil.position.set(w / 2, h / 2);
    this.foil.rotation = -0.5;
    card.addChild(this.foil);
    this.spec = new PIXI.Sprite(specTex());
    this.spec.anchor.set(0.5);
    this.spec.rotation = -0.5;
    this.spec.height = diag;
    this.spec.blendMode = 'add';
    card.addChild(this.spec);
    this.flash = new PIXI.Sprite(specTex());
    this.flash.anchor.set(0.5);
    this.flash.rotation = -0.5;
    this.flash.height = diag;
    this.flash.blendMode = 'add';
    this.flash.alpha = 0;
    card.addChild(this.flash);
    card.addChild(coverSpr);
    this.sparkCont = new PIXI.Container();
    card.addChild(this.sparkCont);

    // Sparkles only go where the plate is punched through, i.e. on foil.
    const img = g.getImageData(0, 0, pw * 2, ph * 2).data;
    const M = MATS[String(controls.material)] ?? MATS.holo;
    this.sparks = [];
    let placed = 0;
    for (let tries = 0; tries < 9000 && placed < 220; tries++) {
      const x = (Math.random() * w * 2) | 0;
      const y = (Math.random() * h * 2) | 0;
      if (img[((y + oy * 2) * pw * 2 + x + ox * 2) * 4 + 3] > 60) continue;
      const sp = new PIXI.Sprite(glowTex());
      sp.anchor.set(0.5);
      const sz = rand(3, 9);
      sp.width = sz;
      sp.height = sz;
      sp.position.set(x / 2, y / 2);
      sp.blendMode = 'add';
      sp.tint = M.spark;
      sp.alpha = 0;
      this.sparkCont.addChild(sp);
      this.sparks.push({
        sp,
        ph: Math.random() * Math.PI * 2,
        spd: rand(1.2, 3.4),
      });
      placed++;
    }

    card.pivot.set(w / 2, h / 2);
    card.position.set(w / 2, h / 2);
    this.card = card;
    stage.addChild(card);
  }

  onUpdate(
    app: PIXI.Application,
    controls: FoilStatementControlValues,
    deltaTime: number
  ): void {
    const card = this.card;
    const foil = this.foil;
    const spec = this.spec;
    const flash = this.flash;
    if (this.dead || !card || !foil || !spec || !flash) return;

    const dt = Math.min(0.05, deltaTime);
    const w = app.screen.width;
    const h = app.screen.height;
    this.t += dt;

    const material = String(controls.material);
    if (material !== this.mat) {
      // Material swaps live: same geometry, new ramp, new spark tint.
      this.mat = material;
      const M = MATS[material] ?? MATS.holo;
      this.boost = M.boost;
      foil.texture = foilFor(material);
      for (const sk of this.sparks) sk.sp.tint = M.spark;
      this.matLabel?.set(`MATERIAL: ${M.label.toUpperCase()}`);
    }

    const pointer = this.pointer;
    const mouse = pointer?.mouse;
    const act = mouse?.active ?? false;

    if (controls.dormant && !this.woke) {
      if (act || (pointer?.clicks.length ?? 0) > 0) {
        this.woke = true;
      } else {
        // Asleep: canted and still — no drift, no sheen sweep, faint sparkle.
        card.rotation = -0.021;
        card.skew.y = 0.012;
        card.scale.set(1);
        spec.alpha = 0;
        flash.alpha = 0;
        const N0 = Math.round(controls.sparkleAmount);
        this.sparks.forEach((sk, i) => {
          sk.sp.visible = i < N0;
          if (sk.sp.visible) {
            sk.sp.alpha =
              0.1 *
              Math.pow(Math.max(0, Math.sin(this.t * sk.spd * 0.4 + sk.ph)), 6);
          }
        });
        return;
      }
    }

    // Light target: the cursor when it is on the stage, a slow lissajous
    // otherwise, so an untouched card inspects itself.
    const tx =
      act && mouse
        ? mouse.x / w
        : 0.5 + 0.42 * Math.sin(this.t * (0.35 + controls.driftSpeed));
    const ty =
      act && mouse
        ? mouse.y / h
        : 0.5 +
          0.3 * Math.sin(this.t * 0.7 * (0.35 + controls.driftSpeed) + 1.7);
    const k = Math.min(1, dt * 5);
    this.lx += (tx - this.lx) * k;
    this.ly += (ty - this.ly) * k;
    const tl = controls.tiltAmount;
    card.rotation = (this.lx - 0.5) * 0.055 * tl;
    card.skew.y = (this.ly - 0.5) * 0.035 * tl;
    card.scale.set(1 + (0.5 - this.ly) * 0.02 * tl);
    foil.tilePosition.x =
      -this.lx * 620 - this.ly * 180 - this.t * 30 * controls.driftSpeed;
    foil.tilePosition.y = this.ly * 40;
    spec.width = w * controls.sheenWidth;
    spec.position.set(
      (this.lx * 1.5 - 0.25) * w,
      h / 2 + (this.ly - 0.5) * h * 0.25
    );
    spec.alpha = Math.min(1, (act ? 0.75 : 0.5) * this.boost);

    if (pointer) {
      while (pointer.clicks.length) {
        pointer.clicks.shift();
        this.flashT = 0;
      }
    }
    if (this.flashT != null) {
      this.flashT += dt * 1.5;
      const p = Math.min(1, this.flashT);
      flash.width = w * 0.5;
      flash.position.set((p * 1.7 - 0.35) * w, h / 2);
      flash.alpha = Math.sin(Math.PI * p) * 0.95;
      if (this.flashT >= 1) {
        this.flashT = null;
        flash.alpha = 0;
      }
    }

    const N = Math.round(controls.sparkleAmount);
    const bx = spec.x;
    this.sparks.forEach((sk, i) => {
      sk.sp.visible = i < N;
      if (!sk.sp.visible) return;
      // Sparkles only fire near the sheen band, so the twinkle tracks light.
      const near = Math.max(0, 1 - Math.abs(sk.sp.x - bx) / (w * 0.25));
      const tw = Math.pow(Math.max(0, Math.sin(this.t * sk.spd + sk.ph)), 6);
      sk.sp.alpha = Math.min(1, (0.15 + 0.85 * near) * tw * 1.4 * this.boost);
    });
  }

  onDestroy(): void {
    this.dead = true;
    this.stage = null;
    this.card = null;
    this.foil = null;
    this.spec = null;
    this.flash = null;
    this.sparkCont = null;
    this.sparks = [];
    this.matLabel = null;
    super.onDestroy();
  }
}

export function createFoilStatementAnimation(
  initialControls?: Partial<FoilStatementControlValues>
): FoilStatementAnimation {
  return new FoilStatementAnimation(initialControls);
}
