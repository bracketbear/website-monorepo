import * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import type { CityGridData } from '../shared/city-data';
import { cityGrid, fitGrid } from '../shared/city-view';
import { scrim } from '../shared/scrim';

const MANIFEST = createManifest({
  id: 'street-pulse',
  name: 'Night Traffic',
  description:
    'Every street in the map — real OSM road geometry baked from map tiles — rendered as a dot-matrix grid. Signal pulses propagate outward along actual street connectivity like late-night traffic ghosts. Cursor warms nearby blocks; click to drop a pulse where you point.',
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
      name: 'speed',
      type: 'number',
      label: 'Pulse Speed',
      min: 8,
      max: 90,
      step: 1,
      defaultValue: 38,
      debug: true,
    },
    {
      name: 'every',
      type: 'number',
      label: 'Spawn Every (s)',
      min: 0.6,
      max: 8,
      step: 0.2,
      defaultValue: 2.6,
      debug: true,
    },
    {
      name: 'glow',
      type: 'boolean',
      label: 'Glow',
      defaultValue: true,
      debug: true,
    },
  ],
} as const);

export type StreetPulseControlValues = ManifestToControlValues<typeof MANIFEST>;

interface Pulse {
  /** Road cells grouped by BFS distance from the seed. */
  buckets: number[][];
  age: number;
}

/** How many distance rings the wave front is smeared across. */
const TAIL = 7;
/** Cap on the BFS so one pulse cannot walk the whole grid in a frame. */
const MAX_RINGS = 400;
/** Simultaneous pulses, and how far a click may search for a road cell. */
const MAX_PULSES = 5;
const CLICK_SEARCH = 10;
/** Cursor heat radius, in grid cells. */
const HEAT_RADIUS = 6;

export class StreetPulseAnimation extends PixiAnimation<typeof MANIFEST> {
  private d: CityGridData | null = null;
  private k = 1;
  private ox = 0;
  private oy = 0;
  /** Indices of every on-screen road cell, and a shuffled plot-on order. */
  private roads: number[] = [];
  private order: number[] = [];
  private base: PIXI.Graphics | null = null;
  private wave: PIXI.Graphics | null = null;
  private heat: PIXI.Graphics | null = null;
  private drawn = 0;
  private t = 0;
  private pulses: Pulse[] = [];
  private spawnT = 0.4;

  constructor(initialControls?: Partial<StreetPulseControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(app: PIXI.Application, controls: StreetPulseControlValues): void {
    const root = this.getRoot();
    const w = app.screen.width;
    const h = app.screen.height;

    const d = cityGrid(String(controls.city));
    const { k, ox, oy } = fitGrid(w, h, d.g);
    scrim(root, w, h);
    this.d = d;
    this.k = k;
    this.ox = ox;
    this.oy = oy;

    this.roads = [];
    for (let i = 0; i < d.cells.length; i++) {
      if (d.cells[i] !== 1) continue;
      const px = ox + (i % d.g) * k;
      const py = oy + Math.floor(i / d.g) * k;
      if (px + k < 0 || py + k < 0 || px > w || py > h) continue;
      this.roads.push(i);
    }
    // Shuffled so the boot sequence plots streets on at random rather than
    // sweeping top to bottom.
    this.order = this.roads.slice();
    for (let i = this.order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = this.order[i];
      this.order[i] = this.order[j];
      this.order[j] = t;
    }

    this.base = new PIXI.Graphics();
    this.base.alpha = 0.42;
    this.wave = new PIXI.Graphics();
    this.heat = new PIXI.Graphics();
    root.addChild(this.base, this.wave, this.heat);

    this.drawn = 0;
    this.t = 0;
    this.pulses = [];
    this.spawnT = 0.4;
  }

  /** One grid cell as a rect on `g`, culled if it falls off stage. */
  private cellRect(
    g: PIXI.Graphics,
    idx: number,
    pad: number,
    w: number,
    h: number
  ): void {
    const d = this.d;
    if (!d) return;
    const x = idx % d.g;
    const y = Math.floor(idx / d.g);
    const px = this.ox + x * this.k;
    const py = this.oy + y * this.k;
    if (px + this.k < 0 || py + this.k < 0 || px > w || py > h) return;
    g.rect(px + pad, py + pad, this.k - pad * 2, this.k - pad * 2);
  }

  /**
   * Road cells grouped by hop distance from `seed`, 8-connected. The pulse
   * rides these buckets outward, which is why it follows real street
   * connectivity instead of expanding as a circle.
   */
  private bfs(seed: number): number[][] {
    const d = this.d;
    if (!d) return [];
    const distm = new Int16Array(d.cells.length).fill(-1);
    const buckets: number[][] = [[seed]];
    distm[seed] = 0;
    let frontier = [seed];
    const G = d.g;
    while (frontier.length && buckets.length < MAX_RINGS) {
      const next: number[] = [];
      for (const i of frontier) {
        const x = i % G;
        const y = Math.floor(i / G);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue;
            const ni = ny * G + nx;
            if (d.cells[ni] === 1 && distm[ni] < 0) {
              distm[ni] = buckets.length;
              next.push(ni);
            }
          }
        }
      }
      if (next.length) buckets.push(next);
      frontier = next;
    }
    return buckets;
  }

  private spawn(idx: number): void {
    if (this.pulses.length < MAX_PULSES) {
      this.pulses.push({ buckets: this.bfs(idx), age: 0 });
    }
  }

  onUpdate(
    app: PIXI.Application,
    controls: StreetPulseControlValues,
    deltaTime: number
  ): void {
    const d = this.d;
    const base = this.base;
    const wave = this.wave;
    const heat = this.heat;
    if (!d || !base || !wave || !heat) return;

    const dt = Math.min(0.05, deltaTime);
    this.t += dt;

    const w = app.screen.width;
    const h = app.screen.height;
    base.tint = PAL.bright;
    heat.tint = PAL.sun;

    // Boot: streets plot on over the first 1.6s, then stay.
    if (this.drawn < this.order.length) {
      const target = Math.min(
        this.order.length,
        Math.ceil((this.t / 1.6) * this.order.length)
      );
      for (; this.drawn < target; this.drawn++) {
        this.cellRect(base, this.order[this.drawn], this.k * 0.12, w, h);
      }
      base.fill({ color: 0xffffff });
    }

    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.drawn >= this.order.length) {
      this.spawnT = controls.every;
      this.spawn(this.roads[Math.floor(Math.random() * this.roads.length)]);
    }

    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        const cl = pointer.clicks.shift()!;
        // Snap the click to the nearest road cell, or it lands on a rooftop
        // and nothing happens.
        const gx = Math.round((cl.x - this.ox) / this.k);
        const gy = Math.round((cl.y - this.oy) / this.k);
        let best = -1;
        let bd = 1e9;
        for (let dy = -CLICK_SEARCH; dy <= CLICK_SEARCH; dy++) {
          for (let dx = -CLICK_SEARCH; dx <= CLICK_SEARCH; dx++) {
            const nx = gx + dx;
            const ny = gy + dy;
            if (nx < 0 || ny < 0 || nx >= d.g || ny >= d.g) continue;
            const i = ny * d.g + nx;
            if (d.cells[i] === 1) {
              const dd = dx * dx + dy * dy;
              if (dd < bd) {
                bd = dd;
                best = i;
              }
            }
          }
        }
        if (best >= 0) this.spawn(best);
      }
    }

    wave.clear();
    const draw = (pad: number, color: number): void => {
      for (const p of this.pulses) {
        const r = p.age * controls.speed;
        const lo = Math.max(0, Math.ceil(r - TAIL));
        const hi = Math.min(p.buckets.length - 1, Math.floor(r));
        for (let dd = lo; dd <= hi; dd++) {
          const a = 1 - (r - dd) / TAIL;
          for (const i of p.buckets[dd]) this.cellRect(wave, i, pad, w, h);
          wave.fill({ color, alpha: a });
        }
      }
    };
    // Glow is an oversized pass underneath, drawn with a negative pad so the
    // rects bleed into each other.
    if (controls.glow) {
      draw(-this.k * 0.5, PAL.rust);
      wave.alpha = 1;
    }
    draw(this.k * 0.1, PAL.rust);

    for (const p of this.pulses) p.age += dt;
    this.pulses = this.pulses.filter(
      (p) => p.age * controls.speed < p.buckets.length + TAIL
    );

    heat.clear();
    const mouse = this.pointer?.mouse;
    if (mouse?.active) {
      const mx = (mouse.x - this.ox) / this.k;
      const my = (mouse.y - this.oy) / this.k;
      for (let dy = -HEAT_RADIUS; dy <= HEAT_RADIUS; dy++) {
        for (let dx = -HEAT_RADIUS; dx <= HEAT_RADIUS; dx++) {
          const nx = Math.round(mx + dx);
          const ny = Math.round(my + dy);
          if (nx < 0 || ny < 0 || nx >= d.g || ny >= d.g) continue;
          const i = ny * d.g + nx;
          if (d.cells[i] !== 1) continue;
          const dist = Math.hypot(nx - mx, ny - my);
          if (dist > HEAT_RADIUS) continue;
          this.cellRect(heat, i, this.k * 0.1, w, h);
          heat.fill({
            color: 0xffffff,
            alpha: (1 - dist / HEAT_RADIUS) * 0.8,
          });
        }
      }
    }
  }

  onDestroy(): void {
    this.d = null;
    this.base = null;
    this.wave = null;
    this.heat = null;
    this.roads = [];
    this.order = [];
    this.pulses = [];
    super.onDestroy();
  }
}

export function createStreetPulseAnimation(
  initialControls?: Partial<StreetPulseControlValues>
): StreetPulseAnimation {
  return new StreetPulseAnimation(initialControls);
}
