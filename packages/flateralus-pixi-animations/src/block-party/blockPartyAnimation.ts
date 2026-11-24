import * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { cityGrid, fitGrid } from '../shared/city-view';
import { lerpColor } from '../shared/color-mix';
import { labelSprite } from '../shared/label-sprite';

const MANIFEST = createManifest({
  id: 'block-party',
  name: 'Block Party',
  description:
    'Every downtown building footprint, straight from the baked map data — the Golden Triangle or Portland’s core — popping on block by block, then breathing in slow waves. Cursor heat lights the blocks under your hand and runs a neighborhood flag up a pole; click for a shockwave across the city.',
  controls: [
    {
      name: 'city',
      type: 'select',
      label: 'City',
      options: [
        { label: 'Pittsburgh', value: 'pgh' },
        { label: 'Portland', value: 'pdx' },
      ],
      defaultValue: 'pgh',
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'colorful',
      type: 'boolean',
      label: 'Polychrome',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'flags',
      type: 'boolean',
      label: 'Neighborhood Flags',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'wave',
      type: 'number',
      label: 'Wave Speed',
      min: 0,
      max: 3,
      step: 0.1,
      defaultValue: 1.1,
      debug: true,
    },
    {
      name: 'radius',
      type: 'number',
      label: 'Heat Radius',
      min: 30,
      max: 200,
      step: 5,
      defaultValue: 90,
      debug: true,
    },
  ],
} as const);

export type BlockPartyControlValues = ManifestToControlValues<typeof MANIFEST>;

interface Building {
  g: PIXI.Graphics;
  /** Centroid in stage pixels; the block is drawn around it. */
  cx: number;
  cy: number;
  /** Smoothed cursor heat, 0..1. */
  heat: number;
  /** Footprint size in cells, part of the colour hash. */
  size: number;
  /** Time this block pops on. */
  born: number;
  /** Index into the accent ramp, resolved against PAL at draw time. */
  pal: number;
}

interface Hood {
  name: string;
  x: number;
  y: number;
  sp: PIXI.Sprite;
}

interface Shock {
  x: number;
  y: number;
  t0: number;
}

/**
 * Neighborhood anchors, hand-placed on the z16 grid: [name, grid x, grid y].
 */
const HOODS: Record<string, Array<[string, number, number]>> = {
  pgh: [
    ['NORTH SHORE', 28, 12],
    ['CULTURAL DISTRICT', 62, 52],
    ['STRIP DISTRICT', 170, 35],
    ['MARKET SQUARE', 70, 102],
    ['GRANT STREET', 125, 95],
    ['FIRSTSIDE', 75, 135],
    ['THE BLUFF', 165, 155],
    ['STATION SQUARE', 25, 175],
  ],
  pdx: [
    ['PEARL DISTRICT', 45, 15],
    ['OLD TOWN', 125, 20],
    ['DOWNTOWN', 60, 90],
    ['WATERFRONT PARK', 158, 80],
    ['YAMHILL DISTRICT', 105, 125],
    ['UNIVERSITY DISTRICT', 40, 170],
  ],
};

/** Shockwave ring life and expansion rate. */
const SHOCK_LIFE = 2;
const SHOCK_RING_SPEED = 480;
const SHOCK_KICK_SPEED = 240;
/** Flag pole height at full extension. */
const FLAG_HEIGHT = 46;

export class BlockPartyAnimation extends PixiAnimation<typeof MANIFEST> {
  private fx: PIXI.Graphics | null = null;
  private contextLayer: PIXI.Graphics | null = null;
  private park: PIXI.Graphics | null = null;
  private blds: Building[] = [];
  private hoods: Hood[] = [];
  private shocks: Shock[] = [];
  private t = 0;
  /** Flag rise, its velocity, and which block it is planted on. */
  private flagA = 0;
  private flagV = 0;
  private flagBlk: Building | null = null;
  private hood: Hood | null = null;

  constructor(initialControls?: Partial<BlockPartyControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(app: PIXI.Application, controls: BlockPartyControlValues): void {
    const root = this.getRoot();
    const w = app.screen.width;
    const h = app.screen.height;

    const d = cityGrid(String(controls.city), true);
    const { k, ox, oy } = fitGrid(w, h, d.g);
    this.t = 0;
    this.shocks = [];
    const G = d.g;

    // Water and parks as flat context under the blocks.
    const ctxG = new PIXI.Graphics();
    const park = new PIXI.Graphics();
    for (let i = 0; i < d.cells.length; i++) {
      const x = i % G;
      const y = Math.floor(i / G);
      if (d.cells[i] === 2) ctxG.rect(ox + x * k, oy + y * k, k, k);
      else if (d.cells[i] === 4) park.rect(ox + x * k, oy + y * k, k, k);
    }
    ctxG.fill({ color: 0xffffff });
    ctxG.alpha = 0.3;
    park.fill({ color: 0xffffff });
    park.alpha = 0.14;
    this.contextLayer = ctxG;
    this.park = park;
    this.fx = new PIXI.Graphics();
    root.addChild(ctxG, park);

    // Flood-fill the building cells into connected blocks, so each block
    // pops, breathes and lights as one object.
    const seen = new Uint8Array(d.cells.length);
    this.blds = [];
    for (let i = 0; i < d.cells.length; i++) {
      if (d.cells[i] !== 3 || seen[i]) continue;
      const comp: number[] = [];
      const stack = [i];
      seen[i] = 1;
      while (stack.length) {
        const j = stack.pop()!;
        comp.push(j);
        const x = j % G;
        const y = Math.floor(j / G);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue;
            const nj = ny * G + nx;
            if (d.cells[nj] === 3 && !seen[nj]) {
              seen[nj] = 1;
              stack.push(nj);
            }
          }
        }
      }
      if (comp.length < 2) continue;
      let cx = 0;
      let cy = 0;
      for (const j of comp) {
        cx += j % G;
        cy += Math.floor(j / G);
      }
      cx = ox + (cx / comp.length + 0.5) * k;
      cy = oy + (cy / comp.length + 0.5) * k;
      // Cells are drawn relative to the centroid so the whole block can be
      // scaled from its middle when it pops.
      const g = new PIXI.Graphics();
      for (const j of comp) {
        const x = j % G;
        const y = Math.floor(j / G);
        g.rect(
          ox + x * k - cx + k * 0.08,
          oy + y * k - cy + k * 0.08,
          k * 0.84,
          k * 0.84
        );
      }
      g.fill({ color: 0xffffff });
      g.x = cx;
      g.y = cy;
      g.alpha = 0;
      root.addChild(g);
      this.blds.push({
        g,
        cx,
        cy,
        heat: 0,
        size: comp.length,
        born: 0,
        pal: 0,
      });
    }
    root.addChild(this.fx);

    const hoodDefs = HOODS[String(controls.city)] ?? [];
    this.hoods = hoodDefs.map(([n, gx, gy]) => {
      const sp = labelSprite(n, {
        size: 10,
        weight: '700',
        letterSpacing: 3,
        fill: '#fff3e3',
      });
      sp.anchor.set(0, 0.5);
      sp.alpha = 0;
      root.addChild(sp);
      return { name: n, x: ox + gx * k, y: oy + gy * k, sp };
    });
    this.flagA = 0;
    this.flagV = 0;
    this.flagBlk = null;
    this.hood = null;

    // Blocks pop on from the middle of the stage outward.
    const mcx = w / 2;
    const mcy = h / 2;
    this.blds.sort(
      (a, b) =>
        Math.hypot(a.cx - mcx, a.cy - mcy) - Math.hypot(b.cx - mcx, b.cy - mcy)
    );
    this.blds.forEach((b, i) => {
      b.born = 0.2 + (i / this.blds.length) * 2.2;
      b.pal = (b.size + i) % 4;
    });
  }

  /** Accent ramp, read fresh so a theme switch lands on the next frame. */
  private accent(i: number): number {
    return [PAL.deep, PAL.bright, PAL.sun, PAL.rust][i];
  }

  onUpdate(
    app: PIXI.Application,
    controls: BlockPartyControlValues,
    deltaTime: number
  ): void {
    const g = this.fx;
    if (!g) return;

    const dt = Math.min(0.05, deltaTime);
    this.t += dt;

    const w = app.screen.width;
    const h = app.screen.height;
    if (this.contextLayer) this.contextLayer.tint = PAL.deep;
    if (this.park) this.park.tint = PAL.rust;

    const pointer = this.pointer;
    const mouse = pointer?.mouse;
    if (pointer) {
      while (pointer.clicks.length) {
        const cl = pointer.clicks.shift()!;
        this.shocks.push({ x: cl.x, y: cl.y, t0: this.t });
      }
    }
    this.shocks = this.shocks.filter((sh) => this.t - sh.t0 < SHOCK_LIFE);

    g.clear();
    for (const sh of this.shocks) {
      const a = (this.t - sh.t0) / SHOCK_LIFE;
      g.circle(sh.x, sh.y, a * SHOCK_RING_SPEED);
      g.stroke({ width: 2, color: PAL.cream, alpha: (1 - a) * 0.4 });
    }

    const mcx = w / 2;
    const mcy = h / 2;
    for (const b of this.blds) {
      const age = this.t - b.born;
      if (age < 0) {
        b.g.alpha = 0;
        continue;
      }
      const pop = Math.min(1, age / 0.35);
      // Overshoot on the way in, so blocks land rather than fade up.
      const over = pop < 1 ? 1 + Math.sin(pop * Math.PI) * 0.2 : 1;
      const dist = Math.hypot(b.cx - mcx, b.cy - mcy);
      const wv =
        Math.pow(
          Math.max(0, Math.sin(dist * 0.028 - this.t * controls.wave)),
          3
        ) * 0.4;
      let heat = 0;
      if (mouse?.active) {
        const md = Math.hypot(b.cx - mouse.x, b.cy - mouse.y);
        if (md < controls.radius) heat = 1 - md / controls.radius;
      }
      let kick = 0;
      for (const sh of this.shocks) {
        const rr = (this.t - sh.t0) * SHOCK_KICK_SPEED;
        const sd = Math.hypot(b.cx - sh.x, b.cy - sh.y);
        kick = Math.max(kick, Math.exp(-Math.pow((sd - rr) / 40, 2)));
      }
      b.heat += (heat - b.heat) * Math.min(1, dt * 6);
      const lit = Math.min(1, wv + b.heat + kick);
      b.g.alpha = pop * (0.35 + lit * 0.65);
      b.g.scale.set(over * (1 + (b.heat + kick) * 0.1));
      b.g.tint = lerpColor(
        controls.colorful ? this.accent(b.pal) : PAL.bright,
        0xffffff,
        lit * 0.8
      );
    }

    // Neighborhood flag: pops up from the hovered block and stays planted.
    let blk: Building | null = null;
    if (controls.flags && mouse?.active) {
      let bd0 = 1e9;
      for (const b of this.blds) {
        const md = Math.hypot(b.cx - mouse.x, b.cy - mouse.y);
        if (b.heat > 0.2 && md < controls.radius && md < bd0) {
          bd0 = md;
          blk = b;
        }
      }
    }
    if (blk && blk !== this.flagBlk) {
      this.flagBlk = blk;
      let best: Hood | null = null;
      let bd = 1e9;
      for (const hd of this.hoods) {
        const d2 = Math.hypot(hd.x - blk.cx, hd.y - blk.cy);
        if (d2 < bd) {
          bd = d2;
          best = hd;
        }
      }
      if (best !== this.hood && this.hood) this.hood.sp.alpha = 0;
      this.hood = best;
      // Fresh pop when the flag was already mostly down.
      if (this.flagA < 0.35) {
        this.flagA = 0;
        this.flagV = 0;
      }
    }
    if (!blk && !mouse?.active) this.flagBlk = null;

    // Springy rise: underdamped toward up, overdamped toward down.
    const tgt = blk || (mouse?.active && this.flagBlk) ? 1 : 0;
    const up = tgt > this.flagA;
    this.flagV +=
      ((tgt - this.flagA) * (up ? 160 : 90) - this.flagV * (up ? 9 : 16)) * dt;
    this.flagA += this.flagV * dt;
    if (this.flagA <= 0.02 && !blk && Math.abs(this.flagV) < 0.05) {
      this.flagBlk = null;
    }
    if (this.hood && this.flagBlk) {
      const a = this.flagA;
      if (a > 0.02) {
        const fx = Math.round(this.flagBlk.cx);
        const fy = Math.round(this.flagBlk.cy);
        const top = fy - FLAG_HEIGHT * a;
        g.moveTo(fx, fy);
        g.lineTo(fx, top);
        g.stroke({
          width: 1.5,
          color: PAL.cream,
          alpha: Math.min(1, a) * 0.9,
        });
        this.hood.sp.x = Math.min(w - this.hood.sp.width - 4, fx + 10);
        this.hood.sp.y = Math.max(10, top);
        this.hood.sp.alpha = Math.max(0, Math.min(1, (a - 0.3) * 1.6));
      } else this.hood.sp.alpha = 0;
    } else if (this.hood) this.hood.sp.alpha = 0;
  }

  onDestroy(): void {
    this.fx = null;
    this.contextLayer = null;
    this.park = null;
    this.blds = [];
    this.hoods = [];
    this.shocks = [];
    this.flagBlk = null;
    this.hood = null;
    super.onDestroy();
  }
}

export function createBlockPartyAnimation(
  initialControls?: Partial<BlockPartyControlValues>
): BlockPartyAnimation {
  return new BlockPartyAnimation(initialControls);
}
