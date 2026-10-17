import * as PIXI from 'pixi.js';
import { PAL } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { MANIFEST } from './manifest';
import type { RouteTraceControlValues } from './manifest';
import { cityGridData, GREEN, ROAD, WATER } from '../shared/city-data';
import type { CityGridData } from '../shared/city-data';
import { ROUTES, ROUTE_IDS } from '../shared/routes';
import type { BakedRoute } from '../shared/routes';
import { fitRoute } from '../shared/city-view';
import type { Frame, RouteFit } from '../shared/city-view';
import { scrim } from '../shared/scrim';
import { prefersReducedMotion } from '../shared/reduced-motion';
import {
  baseAlpha,
  bootFraction,
  createTrace,
  cumulative,
  prefixAt,
  restartTrace,
  stepTrace,
} from './trace';
import type { TraceState } from './trace';

/** Water and green come up with the streets, fainter. */
const WATER_ALPHA = 0.12;
const GREEN_ALPHA = 0.08;
/** Cursor heat radius, in grid cells; the same as street-pulse. */
const HEAT_RADIUS = 6;

/**
 * One route drawn over a baked city. Streets boot as in street-pulse; the
 * route then draws at constant arc-length speed, holds, and loops. A click
 * draws it again. No text: the page captions the map.
 */
export class RouteTraceAnimation extends PixiAnimation<typeof MANIFEST> {
  private d: CityGridData | null = null;
  private route: BakedRoute | null = null;
  private cum: Float64Array = new Float64Array(0);
  private frame: Frame = { k: 1, ox: 0, oy: 0 };
  /** Every on-screen non-land cell, shuffled, so boot plots at random. */
  private order: number[] = [];
  private drawn = 0;
  private base: PIXI.Graphics | null = null;
  private water: PIXI.Graphics | null = null;
  private green: PIXI.Graphics | null = null;
  private line: PIXI.Graphics | null = null;
  private heat: PIXI.Graphics | null = null;
  private state: TraceState = createTrace(false);

  constructor(initialControls?: Partial<RouteTraceControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(app: PIXI.Application, controls: RouteTraceControlValues): void {
    const root = this.getRoot();
    const w = app.screen.width;
    const h = app.screen.height;

    const route = ROUTES[String(controls.route)] ?? ROUTES[ROUTE_IDS[0]];
    const d = cityGridData(route.grid);
    this.route = route;
    this.d = d;
    this.cum = cumulative(route.points);
    this.frame = fitRoute(w, h, route.points, controls.fit as RouteFit);
    if (controls.scrim) scrim(root, w, h);

    const { k, ox, oy } = this.frame;
    this.order = [];
    for (let i = 0; i < d.cells.length; i++) {
      if (d.cells[i] === 0) continue;
      const px = ox + (i % d.g) * k;
      const py = oy + Math.floor(i / d.g) * k;
      if (px + k < 0 || py + k < 0 || px > w || py > h) continue;
      this.order.push(i);
    }
    for (let i = this.order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = this.order[i];
      this.order[i] = this.order[j];
      this.order[j] = t;
    }

    this.base = new PIXI.Graphics();
    this.base.alpha = baseAlpha(k);
    this.water = new PIXI.Graphics();
    this.water.alpha = WATER_ALPHA;
    this.green = new PIXI.Graphics();
    this.green.alpha = GREEN_ALPHA;
    this.line = new PIXI.Graphics();
    this.heat = new PIXI.Graphics();
    root.addChild(this.base, this.water, this.green, this.line, this.heat);

    this.drawn = 0;
    this.state = createTrace(prefersReducedMotion());
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
    const { k, ox, oy } = this.frame;
    const px = ox + (idx % d.g) * k;
    const py = oy + Math.floor(idx / d.g) * k;
    if (px + k < 0 || py + k < 0 || px > w || py > h) return;
    g.rect(px + pad, py + pad, k - pad * 2, k - pad * 2);
  }

  /** Grid cell coordinates to stage pixels. */
  private sx(x: number): number {
    return this.frame.ox + x * this.frame.k;
  }
  private sy(y: number): number {
    return this.frame.oy + y * this.frame.k;
  }

  onUpdate(
    app: PIXI.Application,
    controls: RouteTraceControlValues,
    deltaTime: number
  ): void {
    const d = this.d;
    const route = this.route;
    const base = this.base;
    const water = this.water;
    const green = this.green;
    const line = this.line;
    const heat = this.heat;
    if (!d || !route || !base || !water || !green || !line || !heat) return;

    const dt = Math.min(0.05, deltaTime);
    const w = app.screen.width;
    const h = app.screen.height;
    const { k } = this.frame;
    base.tint = PAL.bright;
    water.tint = PAL.cyan;
    green.tint = PAL.sun;
    heat.tint = PAL.sun;

    const pointer = this.pointer;
    if (pointer) {
      let clicked = false;
      while (pointer.clicks.length) {
        pointer.clicks.shift();
        clicked = true;
      }
      if (clicked) restartTrace(this.state);
    }

    stepTrace(this.state, dt, {
      trace: controls.trace,
      hold: controls.hold,
      loop: controls.loop,
    });

    // Boot: the city plots on, each class into its own layer.
    if (this.drawn < this.order.length) {
      const target = Math.min(
        this.order.length,
        Math.ceil(bootFraction(this.state) * this.order.length)
      );
      let anyRoad = false;
      let anyWater = false;
      let anyGreen = false;
      for (; this.drawn < target; this.drawn++) {
        const i = this.order[this.drawn];
        const c = d.cells[i];
        if (c === ROAD) {
          this.cellRect(base, i, k * 0.12, w, h);
          anyRoad = true;
        } else if (c === WATER) {
          this.cellRect(water, i, k * 0.05, w, h);
          anyWater = true;
        } else if (c === GREEN) {
          this.cellRect(green, i, k * 0.2, w, h);
          anyGreen = true;
        }
      }
      if (anyRoad) base.fill({ color: 0xffffff });
      if (anyWater) water.fill({ color: 0xffffff });
      if (anyGreen) green.fill({ color: 0xffffff });
    }

    // The route: redrawn from its prefix every frame. Three strokes and a
    // head dot over ~350 points is cheap; there is nothing to cache.
    line.clear();
    const [startX, startY] = route.points[0];
    const pts = prefixAt(route.points, this.cum, this.state.progress);
    if (pts.length > 1) {
      const path = (): void => {
        line.moveTo(this.sx(pts[0][0]), this.sy(pts[0][1]));
        for (let i = 1; i < pts.length; i++)
          line.lineTo(this.sx(pts[i][0]), this.sy(pts[i][1]));
      };
      if (controls.glow) {
        path();
        line.stroke({
          width: k * 1.9,
          color: PAL.rust,
          alpha: 0.5,
          cap: 'round',
          join: 'round',
        });
      }
      path();
      line.stroke({
        width: k * 0.95,
        color: PAL.orange,
        alpha: 0.55,
        cap: 'round',
        join: 'round',
      });
      path();
      line.stroke({
        width: k * 0.37,
        color: PAL.orange,
        alpha: 1,
        cap: 'round',
        join: 'round',
      });
      if (this.state.phase === 'trace') {
        const [hx, hy] = pts[pts.length - 1];
        line.circle(this.sx(hx), this.sy(hy), k * 0.375);
        line.fill({ color: PAL.cream, alpha: 0.75 });
      }
    }
    // Start marker: a ring with a centre dot, from boot onward.
    line.circle(this.sx(startX), this.sy(startY), k * 0.475);
    line.stroke({ width: k * 0.12, color: PAL.orange, alpha: 0.9 });
    line.circle(this.sx(startX), this.sy(startY), k * 0.15);
    line.fill({ color: PAL.orange, alpha: 0.9 });

    // Cursor heat on nearby road cells, as in street-pulse.
    heat.clear();
    const mouse = this.pointer?.mouse;
    if (mouse?.active) {
      const mx = (mouse.x - this.frame.ox) / k;
      const my = (mouse.y - this.frame.oy) / k;
      for (let dy = -HEAT_RADIUS; dy <= HEAT_RADIUS; dy++) {
        for (let dx = -HEAT_RADIUS; dx <= HEAT_RADIUS; dx++) {
          const nx = Math.round(mx + dx);
          const ny = Math.round(my + dy);
          if (nx < 0 || ny < 0 || nx >= d.g || ny >= d.g) continue;
          const i = ny * d.g + nx;
          if (d.cells[i] !== ROAD) continue;
          const dist = Math.hypot(nx - mx, ny - my);
          if (dist > HEAT_RADIUS) continue;
          this.cellRect(heat, i, k * 0.1, w, h);
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
    this.route = null;
    this.base = null;
    this.water = null;
    this.green = null;
    this.line = null;
    this.heat = null;
    this.order = [];
    super.onDestroy();
  }
}

export function createRouteTraceAnimation(
  initialControls?: Partial<RouteTraceControlValues>
): RouteTraceAnimation {
  return new RouteTraceAnimation(initialControls);
}
