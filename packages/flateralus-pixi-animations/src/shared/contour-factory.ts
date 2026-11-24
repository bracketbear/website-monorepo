import * as PIXI from 'pixi.js';
import { PAL } from '@bracketbear/flateralus';
import type { PointerService } from '@bracketbear/flateralus-pixi';
import { contourLines } from './contour-lines';
import type { ContourPoint } from './contour-lines';
import { labelSprite } from './label-sprite';
import { terrain } from './terrain';
import type { Terrain, TerrainId } from './terrain';

/**
 * The contour terrain piece, shared by every city that gets one.
 *
 * Both terrain animations are the same drawing: contour rings traced from
 * a baked elevation grid, plotted on from the valley floor, tinted by an
 * elevation ramp with a sweep running up the mountain, tilted by the
 * cursor and pinned with a labelled marker. Only the grid, the framing
 * defaults and the marker copy differ, so the animation classes carry a
 * manifest and nothing else, and this file holds all of the behaviour.
 */

/** The tuned defaults that differ per city. */
export interface ContourControlOptions {
  /** How many contour levels the city reads best at. */
  levels: number;
  colorMode: string;
  /** Label for the marker toggle, e.g. 'Summit Marker'. */
  markerLabel: string;
}

/**
 * The control set both terrain animations expose. Written once here so the
 * two manifests cannot drift apart.
 */
export function contourControls(o: ContourControlOptions) {
  return [
    {
      name: 'fit',
      type: 'select',
      label: 'Framing',
      options: [
        { label: 'Contain', value: 'contain' },
        { label: 'Cover', value: 'cover' },
      ],
      defaultValue: 'contain',
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'levels',
      type: 'number',
      label: 'Contour Levels',
      min: 12,
      max: 48,
      step: 2,
      defaultValue: o.levels,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'lineWidth',
      type: 'number',
      label: 'Line Weight',
      min: 1,
      max: 4,
      step: 0.5,
      defaultValue: 1.5,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'glow',
      type: 'boolean',
      label: 'Glow Pass',
      defaultValue: true,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'colorMode',
      type: 'select',
      label: 'Color',
      options: [
        { label: 'Hypso Ramp', value: 'ramp' },
        { label: 'Paper', value: 'paper' },
        { label: 'Acid Relief', value: 'acid' },
        { label: 'Black & Gold', value: 'pgh' },
      ],
      defaultValue: o.colorMode,
      debug: true,
    },
    {
      name: 'sweepSpeed',
      type: 'number',
      label: 'Sweep Speed',
      min: 0,
      max: 0.25,
      step: 0.01,
      defaultValue: 0.06,
      debug: true,
    },
    {
      name: 'parallax',
      type: 'number',
      label: 'Cursor Parallax',
      min: 0,
      max: 140,
      step: 5,
      defaultValue: 65,
      debug: true,
    },
    {
      name: 'breathe',
      type: 'number',
      label: 'Breathe Lift',
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 10,
      debug: true,
    },
    {
      name: 'marker',
      type: 'boolean',
      label: o.markerLabel,
      defaultValue: true,
      debug: true,
    },
  ] as const;
}

/**
 * The values `contourControls` produces. Select controls widen to
 * `string | number`, so this is what both manifests resolve to.
 */
export interface ContourControlValues {
  fit: string | number;
  levels: number;
  lineWidth: number;
  glow: boolean;
  colorMode: string | number;
  sweepSpeed: number;
  parallax: number;
  breathe: number;
  marker: boolean;
}

export interface ContourOptions {
  /** Which baked elevation grid to contour. */
  terrainId: TerrainId;
  /** Grid coordinates the marker pins to. */
  markerPos: (t: Terrain) => { x: number; y: number };
  markerTitle: string;
  markerSub: (t: Terrain) => string;
}

/** One traced polyline, in screen coordinates. */
interface ContourPoly {
  pts: ContourPoint[];
  closed: boolean;
}

interface Level {
  g: PIXI.Graphics;
  /** Elevation normalised to 0 at the valley floor, 1 at the peak. */
  tN: number;
  polys: ContourPoly[];
  /** Total point count, the budget the plot-on spends against. */
  npts: number;
  /** How much of the level is plotted; -1 until the first draw. */
  frac: number;
}

/** Blend two packed RGB colours. */
function lerpC(a: number, b: number, t: number): number {
  const ar = a >> 16;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = b >> 16;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  return (
    (Math.round(ar + (br - ar) * t) << 16) +
    (Math.round(ag + (bg - ag) * t) << 8) +
    Math.round(ab + (bb - ab) * t)
  );
}

/** Elevation in both units, the way a topo sheet prints it. */
export function fmtElev(m: number): string {
  return `${Math.round(m).toLocaleString()} M / ${Math.round(
    m * 3.28084
  ).toLocaleString()} FT`;
}

/** The plot-on finishes once the last level has started and drawn. */
const BOOT_END = 0.15 + 1.6 + 0.9;

export class ContourField {
  private readonly opts: ContourOptions;
  private readonly land: Terrain;
  private levels: Level[] = [];
  private marker: PIXI.Container | null = null;
  private markerAt = { x: 0, y: 0 };
  /** Normalised elevation under the marker, so it parallaxes with its level. */
  private markerE = 0;
  private t = 0;
  private booted = false;
  /** Click times; each one sends a band of light up the elevation range. */
  private ripples: number[] = [];
  private tx = 0;
  private ty = 0;

  constructor(opts: ContourOptions) {
    this.opts = opts;
    this.land = terrain(opts.terrainId);
  }

  /** Trace the contours and lay out the marker. */
  build(
    root: PIXI.Container,
    width: number,
    height: number,
    controls: ContourControlValues
  ): void {
    const H = this.land;
    const G = H.G;
    const N = Math.round(controls.levels);
    // Thresholds sit strictly inside the elevation range, so neither the
    // valley floor nor the summit degenerates into a level of its own.
    const thr: number[] = [];
    for (let i = 1; i <= N; i++) {
      thr.push(H.min + ((H.max - H.min) * i) / (N + 1));
    }
    const cons = contourLines(H.grid, G, G, thr);

    const S =
      controls.fit === 'cover'
        ? Math.max(width, height) * 1.08
        : Math.min(width, height) * 0.94;
    const k = S / G;
    const ox = (width - S) / 2;
    const oy = (height - S) / 2;

    // Rings that run along the edge of the sampled window are artefacts of
    // the crop, not real contours. Cutting the ring there leaves open
    // polylines that read as terrain continuing past the frame.
    const isB = (p: ContourPoint): boolean =>
      p[0] < 0.6 || p[1] < 0.6 || p[0] > G - 0.6 || p[1] > G - 0.6;
    const toScreen = (p: ContourPoint): ContourPoint => [
      ox + p[0] * k,
      oy + p[1] * k,
    ];

    this.levels = cons.map((con) => {
      const tN = (con.value - H.min) / (H.max - H.min);
      const polys: ContourPoly[] = [];
      for (const polygon of con.polygons) {
        for (const ring of polygon) {
          if (!ring.some(isB)) {
            polys.push({ pts: ring.map(toScreen), closed: true });
          } else {
            let run: ContourPoint[] = [];
            for (const p of ring) {
              if (isB(p)) {
                if (run.length > 1) polys.push({ pts: run, closed: false });
                run = [];
              } else {
                run.push(toScreen(p));
              }
            }
            if (run.length > 1) polys.push({ pts: run, closed: false });
          }
        }
      }
      const npts = polys.reduce((a, p) => a + p.pts.length, 0);
      const g = new PIXI.Graphics();
      root.addChild(g);
      return { g, tN, polys, npts, frac: -1 };
    });

    const mp = this.opts.markerPos(H);
    const mx = ox + (mp.x + 0.5) * k;
    const my = oy + (mp.y + 0.5) * k;
    this.markerAt = { x: mx, y: my };
    this.markerE =
      (H.grid[Math.round(mp.y) * G + Math.round(mp.x)] - H.min) /
      (H.max - H.min);

    const mk = new PIXI.Container();
    const cross = new PIXI.Graphics();
    cross.circle(0, 0, 4).stroke({ width: 1.5, color: 0xffffff });
    cross
      .moveTo(-11, 0)
      .lineTo(-5, 0)
      .moveTo(5, 0)
      .lineTo(11, 0)
      .moveTo(0, -11)
      .lineTo(0, -5)
      .moveTo(0, 5)
      .lineTo(0, 11)
      .stroke({ width: 1.5, color: 0xffffff });
    mk.addChild(cross);
    const title = labelSprite(this.opts.markerTitle, {
      size: 13,
      weight: '700',
      letterSpacing: 3,
      fill: '#ffffff',
    });
    title.x = 16;
    title.y = -18;
    mk.addChild(title);
    const sub = labelSprite(this.opts.markerSub(H), {
      size: 9,
      weight: '500',
      letterSpacing: 2,
      lineHeight: 14,
      fill: '#ffffff',
    });
    sub.x = 16;
    sub.y = 0;
    sub.alpha = 0.75;
    mk.addChild(sub);
    mk.x = mx;
    mk.y = my;
    // The marker fades in only once the lines have finished plotting.
    mk.alpha = 0;
    root.addChild(mk);
    this.marker = mk;

    this.t = 0;
    this.booted = false;
    this.ripples = [];
    this.tx = 0;
    this.ty = 0;
  }

  update(
    controls: ContourControlValues,
    width: number,
    height: number,
    dt: number,
    pointer: PointerService | null
  ): void {
    if (this.levels.length === 0) return;
    this.t += dt;

    if (pointer) {
      while (pointer.clicks.length) {
        pointer.clicks.shift();
        this.ripples.push(this.t);
      }
    }
    this.ripples = this.ripples.filter((t0) => this.t - t0 < 4);

    // Cursor tilt, with an ambient orbit when the cursor is away.
    const mouse = pointer?.mouse;
    let txT: number;
    let tyT: number;
    if (mouse?.active) {
      txT = Math.max(-1, Math.min(1, (mouse.x - width / 2) / (width / 2)));
      tyT = Math.max(-1, Math.min(1, (mouse.y - height / 2) / (height / 2)));
    } else {
      txT = Math.cos(this.t * 0.25) * 0.35;
      tyT = Math.sin(this.t * 0.32) * 0.3;
    }
    const sm = Math.min(1, dt * 4);
    this.tx += (txT - this.tx) * sm;
    this.ty += (tyT - this.ty) * sm;

    const N = this.levels.length;
    if (!this.booted && this.t > BOOT_END + 0.2) this.booted = true;
    // The sweep runs past 1 before wrapping, so the summit gets a beat of
    // darkness between passes.
    const sweep = this.booted ? (this.t * controls.sweepSpeed) % 1.3 : -1;
    const lift0 = (0.5 + 0.5 * Math.sin(this.t * 0.6)) * controls.breathe;

    // PAL is read per frame, never cached, so a theme switch lands live.
    const ramp = (e: number): number => {
      const stops =
        controls.colorMode === 'acid'
          ? [PAL.deep, PAL.acid, PAL.acid, PAL.cyan]
          : controls.colorMode === 'paper'
            ? [PAL.cream, PAL.cream, PAL.cream, PAL.cream]
            : controls.colorMode === 'pgh'
              ? [0x55555e, 0xa39272, 0xffb612, 0xffdd66]
              : [PAL.deep, PAL.bright, PAL.sun, PAL.cream];
      const seg = Math.min(2.999, e * 3);
      const i = Math.floor(seg);
      return lerpC(stops[i], stops[i + 1], seg - i);
    };

    for (let i = 0; i < N; i++) {
      const L = this.levels[i];
      const e = L.tN;
      const start = 0.15 + (i / N) * 1.6;
      if (L.frac < 1) {
        const f = Math.max(0, Math.min(1, (this.t - start) / 0.9));
        if (f !== L.frac) {
          this.drawLevel(L, f, controls);
          L.frac = f;
        }
      }
      // Brightness from the sweep and from any live click ripples.
      let b = sweep >= 0 ? Math.exp(-Math.pow((e - sweep) / 0.07, 2)) : 0;
      for (const t0 of this.ripples) {
        const rp = (this.t - t0) * 0.55;
        b = Math.max(b, Math.exp(-Math.pow((e - rp) / 0.05, 2)));
      }
      // Boot: each line arrives white-hot, then settles individually into
      // its resting colour.
      const settle = Math.max(0, Math.min(1, (this.t - start - 0.9) / 1.1));
      const hot = Math.max(1 - settle, Math.min(1, b) * 0.85);
      L.g.tint = lerpC(ramp(e), 0xffffff, hot);
      L.g.alpha = Math.min(1, 0.34 + 0.24 * e + 0.62 * Math.max(b, 1 - settle));
      // Higher levels shift further, which is what sells the 2.5D stack.
      L.g.x = this.tx * controls.parallax * e;
      L.g.y = this.ty * controls.parallax * e - lift0 * e;
    }

    if (this.marker) {
      const me = this.markerE;
      this.marker.visible = controls.marker;
      this.marker.tint = PAL.cream;
      this.marker.alpha +=
        ((this.booted && controls.marker ? 1 : 0) - this.marker.alpha) *
        Math.min(1, dt * 3);
      this.marker.x = this.markerAt.x + this.tx * controls.parallax * me;
      this.marker.y =
        this.markerAt.y + this.ty * controls.parallax * me - lift0 * me;
    }
  }

  /** Drop every reference; the root container owns the display objects. */
  dispose(): void {
    this.levels = [];
    this.marker = null;
    this.ripples = [];
  }

  /**
   * Redraw one level with only the first `frac` of its points, so the
   * contour plots on like a pen following the ring.
   */
  private drawLevel(
    L: Level,
    frac: number,
    controls: ContourControlValues
  ): void {
    const g = L.g;
    g.clear();
    if (frac <= 0) return;

    const paths: Array<{ pts: ContourPoint[]; n: number; closed: boolean }> =
      [];
    let budget = Math.ceil(L.npts * frac);
    for (const poly of L.polys) {
      if (budget <= 0) break;
      const n = Math.min(poly.pts.length, budget);
      budget -= n;
      if (n > 1) {
        paths.push({
          pts: poly.pts,
          n,
          closed: poly.closed && n === poly.pts.length,
        });
      }
    }

    const trace = (): void => {
      for (const p of paths) {
        g.moveTo(p.pts[0][0], p.pts[0][1]);
        for (let i = 1; i < p.n; i++) g.lineTo(p.pts[i][0], p.pts[i][1]);
        if (p.closed) g.closePath();
      }
    };

    // The glow is a second, fatter stroke of the same path underneath.
    if (controls.glow) {
      trace();
      g.stroke({
        width: controls.lineWidth * 3.2,
        color: 0xffffff,
        alpha: 0.16,
        cap: 'round',
        join: 'round',
      });
    }
    trace();
    g.stroke({
      width: controls.lineWidth,
      color: 0xffffff,
      alpha: 1,
      cap: 'round',
      join: 'round',
    });
  }
}

export function createContourField(opts: ContourOptions): ContourField {
  return new ContourField(opts);
}
