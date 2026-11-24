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
import type { RouteFit } from '../shared/city-view';
import { scrim } from '../shared/scrim';
import { prefersReducedMotion } from '../shared/reduced-motion';
import {
  arrivalAt,
  baseAlpha,
  beats,
  bounce,
  createTrace,
  cumulative,
  EASE_OUT,
  progressAt,
  restartTrace,
  routeHits,
  stepTrace,
} from './trace';
import type { RouteHit, TraceState } from './trace';
import { cameraTrack } from './camera';
import type { View } from './camera';

/** Water and green come up with the streets, fainter. */
const WATER_ALPHA = 0.12;
const GREEN_ALPHA = 0.08;
/** Cursor heat radius, in grid cells; the same as street-pulse. */
const HEAT_RADIUS = 6;
/** At the top of its bounce a route cell is this much larger... */
const BOUNCE_SCALE = 0.6;
/** ...and lifted this many cells. */
const BOUNCE_LIFT = 0.35;
/** The way back bounces a cell again, at this share of the first pop. */
const RETURN_BOUNCE = 0.5;
/** A cell that turns is cream for this long, then sun until TURN_FLASH_S. */
const TURN_CREAM_S = 0.05;
/** Seconds a cell stays sun-coloured after it turns, before going orange. */
const TURN_FLASH_S = 0.16;
/** Seconds a street cell takes to cool from its plot-on flash. */
const PLOT_S = 0.35;
/** While following, the stage is this many cells across its short side. */
const CLOSE_CELLS = 30;
/** The start pin. Red is the pin's alone; it is not a palette role. */
const PIN_RED = 0xe01e37;

/**
 * One route drawn over a baked city, choreographed like the run club's
 * LinkedIn teaser on a 125 BPM grid. A red pin drops on the lobby on the
 * first downbeat and rings out; a beat later the streets grow out from it.
 * The camera starts close and follows the runner out to the Liberty
 * Memorial, and at the turn it pulls back to the whole route, landing two
 * beats after the runner is home. The route is the street cells themselves:
 * each one the runner reaches turns orange with a small bounce, and passing
 * it again on the way back bounces it once more. A click runs it again,
 * pushing back in to the lobby. No text: the page captions the map.
 */
export class RouteTraceAnimation extends PixiAnimation<typeof MANIFEST> {
  private d: CityGridData | null = null;
  private route: BakedRoute | null = null;
  private cum: Float64Array = new Float64Array(0);
  private turnFrac = 1;
  /** The route as cells, in the order the runner reaches them. */
  private hits: RouteHit[] = [];
  /** The frame the camera lands on, and the scale it follows at. */
  private wide: View = { cx: 0, cy: 0, k: 1 };
  private close = 1;
  /** Pin height bounds scale with the stage; the teaser's are for 1080 px. */
  private pinScale = 1;
  /** Every street, water and green cell, by when it plots on. */
  private order: number[] = [];
  private revealAt: Float32Array = new Float32Array(0);
  /** How many of `order` are settled into the static layers. */
  private settled = 0;
  private world: PIXI.Container | null = null;
  private base: PIXI.Graphics | null = null;
  private water: PIXI.Graphics | null = null;
  private green: PIXI.Graphics | null = null;
  private fresh: PIXI.Graphics | null = null;
  private line: PIXI.Graphics | null = null;
  private heat: PIXI.Graphics | null = null;
  private marks: PIXI.Graphics | null = null;
  private state: TraceState = createTrace(false);
  /** Camera tracks are built per tempo and run kind, then reused. */
  private tracks = new Map<string, (t: number) => View>();

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
    const len = this.cum[this.cum.length - 1] || 1;
    this.turnFrac = this.cum[route.turn] / len;
    this.hits = routeHits(route.points, this.cum, d.cells, d.g, ROAD);
    const f = fitRoute(w, h, route.points, controls.fit as RouteFit);
    this.wide = { cx: (w / 2 - f.ox) / f.k, cy: (h / 2 - f.oy) / f.k, k: f.k };
    this.close = Math.max(f.k, Math.min(w, h) / CLOSE_CELLS);
    this.pinScale = Math.min(1, Math.max(0.6, Math.min(w, h) / 1080));
    this.tracks.clear();
    this.state = createTrace(prefersReducedMotion());
    if (controls.scrim) scrim(root, w, h);

    // The streets grow out from the pin over the rest of bar 1, a ragged
    // disc whose radius outruns the frame's corners, so by the downbeat
    // every cell the camera can see is up. Cells beyond it are already
    // there by the time the camera reaches them. A replay or a reduced
    // start has them all up at once.
    const b = beats(controls.bpm);
    const [sx, sy] = route.points[0];
    const reach = Math.hypot(w, h) / 2 / this.close;
    const rMax = reach * 1.15 + 6;
    const n = d.cells.length;
    this.revealAt = new Float32Array(n).fill(-Infinity);
    this.order = [];
    for (let i = 0; i < n; i++) {
      const c = d.cells[i];
      if (c !== ROAD && c !== WATER && c !== GREEN) continue;
      this.order.push(i);
      if (this.state.reduced) continue;
      const dist = Math.hypot(
        (i % d.g) + 0.5 - sx,
        Math.floor(i / d.g) + 0.5 - sy
      );
      if (dist > rMax) continue;
      // The first moment the growing radius clears this cell.
      const jit = hash(i);
      this.revealAt[i] = b.boot;
      for (let t = b.beat; t <= b.boot; t += 1 / 120) {
        const r = rMax * EASE_OUT((t - b.beat) / (b.boot - b.beat));
        if (dist < r - jit * Math.min(10, r * 0.5)) {
          this.revealAt[i] = t;
          break;
        }
      }
    }
    const at = this.revealAt;
    // Both -Infinity subtract to NaN, which a sort comparator must not return.
    this.order.sort((x, y) => at[x] - at[y] || 0);
    this.settled = 0;

    this.world = new PIXI.Container();
    this.base = new PIXI.Graphics();
    this.water = new PIXI.Graphics();
    this.water.alpha = WATER_ALPHA;
    this.green = new PIXI.Graphics();
    this.green.alpha = GREEN_ALPHA;
    this.fresh = new PIXI.Graphics();
    this.line = new PIXI.Graphics();
    this.heat = new PIXI.Graphics();
    this.world.addChild(
      this.base,
      this.water,
      this.green,
      this.fresh,
      this.line,
      this.heat
    );
    this.marks = new PIXI.Graphics();
    root.addChild(this.world, this.marks);
  }

  private track(bpm: number): (t: number) => View {
    const route = this.route;
    const mode = this.state.reduced
      ? 'still'
      : this.state.replay
        ? 'replay'
        : 'first';
    const key = `${bpm}:${mode}`;
    let tr = this.tracks.get(key);
    if (!tr && route) {
      tr = cameraTrack({
        points: route.points,
        cum: this.cum,
        turnFrac: this.turnFrac,
        beats: beats(bpm),
        close: this.close,
        wide: this.wide,
        mode,
      });
      this.tracks.set(key, tr);
    }
    return tr ?? (() => this.wide);
  }

  onUpdate(
    app: PIXI.Application,
    controls: RouteTraceControlValues,
    deltaTime: number
  ): void {
    const d = this.d;
    const route = this.route;
    const { world, base, water, green, fresh, line, heat, marks } = this;
    if (!d || !route || !world || !base || !water || !green || !fresh) return;
    if (!line || !heat || !marks) return;

    const dt = Math.min(0.05, deltaTime);
    const w = app.screen.width;
    const h = app.screen.height;
    const bpm = controls.bpm;
    const b = beats(bpm);
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
      if (clicked) restartTrace(this.state, bpm);
    }
    stepTrace(this.state, dt, {
      bpm,
      hold: controls.hold,
      loop: controls.loop,
    });
    const s = this.state;
    // A replay has every street up already.
    const t = s.t;
    const plotT = s.replay ? Infinity : t;

    // The camera: the world container is the grid, in cells.
    const cam = this.track(bpm)(t);
    const k = cam.k;
    world.scale.set(k);
    world.position.set(w / 2 - cam.cx * k, h / 2 - cam.cy * k);
    base.alpha = baseAlpha(k);

    // The city plots on: settled cells into their class layer, the ones
    // still cooling from their flash redrawn each frame on top.
    let anyRoad = false;
    let anyWater = false;
    let anyGreen = false;
    for (; this.settled < this.order.length; this.settled++) {
      const i = this.order[this.settled];
      if (!(this.revealAt[i] + PLOT_S <= plotT)) break;
      const c = d.cells[i];
      if (c === ROAD) {
        cellRect(base, d.g, i, 0.12);
        anyRoad = true;
      } else if (c === WATER) {
        cellRect(water, d.g, i, 0.05);
        anyWater = true;
      } else {
        cellRect(green, d.g, i, 0.2);
        anyGreen = true;
      }
    }
    if (anyRoad) base.fill({ color: 0xffffff });
    if (anyWater) water.fill({ color: 0xffffff });
    if (anyGreen) green.fill({ color: 0xffffff });
    // Cooling cells, batched by colour and a quantised alpha so the boot
    // costs a few fills a frame rather than one a cell.
    fresh.clear();
    const batches = new Map<string, number[]>();
    for (let j = this.settled; j < this.order.length; j++) {
      const i = this.order[j];
      const age = plotT - this.revealAt[i];
      if (age < 0) break;
      const c = d.cells[i];
      const u = age / PLOT_S;
      const rest =
        c === ROAD ? base.alpha : c === WATER ? WATER_ALPHA : GREEN_ALPHA;
      const color =
        u < 0.4
          ? PAL.sun
          : c === WATER
            ? PAL.cyan
            : c === GREEN
              ? PAL.sun
              : PAL.bright;
      const alpha = Math.round((0.9 + (rest - 0.9) * EASE_OUT(u)) * 20) / 20;
      const key = `${color}:${alpha}`;
      const list = batches.get(key);
      if (list) list.push(i);
      else batches.set(key, [i]);
    }
    for (const [key, list] of batches) {
      const [color, alpha] = key.split(':').map(Number);
      for (const i of list) {
        const c = d.cells[i];
        cellRect(fresh, d.g, i, c === ROAD ? 0.12 : c === WATER ? 0.05 : 0.2);
      }
      fresh.fill({ color, alpha });
    }

    // The route: every reached cell, redrawn each frame because the newest
    // few are mid-bounce. A cell's bounce clock runs from its latest
    // arrival; the first arrival turns it orange, a later one (the way back)
    // bounces it again at the same colour. Under reduced motion the cells
    // just turn.
    line.clear();
    const p = progressAt(t, b, this.turnFrac);
    const latest = new Map<number, RouteHit>();
    if (t > b.boot) {
      for (const hit of this.hits) {
        if (hit.frac > p) break;
        latest.set(hit.cell, hit);
      }
    }
    // Oldest arrival first, so a cell mid-bounce draws over its neighbours;
    // every glow goes down before any cell so none shades the one beside it.
    const lit = [...latest.values()]
      .sort((x, y) => x.frac - y.frac)
      .map(({ cell, frac, first }) => {
        const age = t - arrivalAt(frac, b, this.turnFrac);
        const bo = s.reduced ? 0 : bounce(age) * (first ? 1 : RETURN_BOUNCE);
        const flash = s.reduced ? Infinity : age;
        return {
          // Cream, then sun, then orange as the cell lands; the way back
          // only flashes sun.
          color:
            first && flash < TURN_CREAM_S
              ? PAL.cream
              : flash < TURN_FLASH_S
                ? PAL.sun
                : PAL.orange,
          b: bo,
          s: 0.76 * (1 + BOUNCE_SCALE * bo),
          cx: (cell % d.g) + 0.5,
          cy: Math.floor(cell / d.g) + 0.5 - BOUNCE_LIFT * bo,
        };
      });
    if (controls.glow && lit.length) {
      // The glow swells with the bounce, so a pop lights the street round it.
      for (const c of lit) {
        const gs = c.s + 0.7 + 0.8 * Math.max(0, c.b);
        line.rect(c.cx - gs / 2, c.cy - gs / 2, gs, gs);
      }
      line.fill({ color: PAL.rust, alpha: 0.35 });
    }
    // One fill per run of same-coloured cells keeps the draw order intact.
    let run: number | null = null;
    for (const c of lit) {
      if (run !== null && c.color !== run) line.fill({ color: run });
      line.rect(c.cx - c.s / 2, c.cy - c.s / 2, c.s, c.s);
      run = c.color;
    }
    if (run !== null) line.fill({ color: run });

    // The start pin, in stage pixels so it keeps its size through the zoom.
    // It drops alone on the first downbeat and rings out from the tip, and
    // rings again when the runner comes home.
    marks.clear();
    const [startX, startY] = route.points[0];
    const px = w / 2 + (startX - cam.cx) * k;
    const py = h / 2 + (startY - cam.cy) * k;
    const pinH = Math.min(
      60 * this.pinScale,
      Math.max(34 * this.pinScale, 1.5 * k)
    );
    const drop = s.replay ? 1 : EASE_OUT(t / (b.beat / 2));
    if (drop > 0) {
      drawPin(marks, px, py - pinH * 0.8 * (1 - drop), pinH, drop);
      if (!s.reduced) {
        for (const ringAt of [b.beat / 4, b.home]) {
          const since = t - ringAt;
          if (since <= 0 || since >= b.beat * 2) continue;
          const u = since / (b.beat * 2);
          const e = EASE_OUT(u);
          marks.ellipse(
            px,
            py,
            pinH * (0.2 + 1.2 * e),
            pinH * (0.08 + 0.48 * e)
          );
          marks.stroke({
            width: 3 * this.pinScale,
            color: PIN_RED,
            alpha: (1 - u) * 0.8,
          });
        }
      }
    }

    // Cursor heat on nearby road cells, as in street-pulse.
    heat.clear();
    const mouse = this.pointer?.mouse;
    if (mouse?.active) {
      const mx = cam.cx + (mouse.x - w / 2) / k;
      const my = cam.cy + (mouse.y - h / 2) / k;
      for (let dy = -HEAT_RADIUS; dy <= HEAT_RADIUS; dy++) {
        for (let dx = -HEAT_RADIUS; dx <= HEAT_RADIUS; dx++) {
          const nx = Math.round(mx + dx);
          const ny = Math.round(my + dy);
          if (nx < 0 || ny < 0 || nx >= d.g || ny >= d.g) continue;
          const i = ny * d.g + nx;
          if (d.cells[i] !== ROAD) continue;
          const dist = Math.hypot(nx - mx, ny - my);
          if (dist > HEAT_RADIUS) continue;
          cellRect(heat, d.g, i, 0.1);
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
    this.hits = [];
    this.order = [];
    this.revealAt = new Float32Array(0);
    this.tracks.clear();
    this.world = null;
    this.base = null;
    this.water = null;
    this.green = null;
    this.fresh = null;
    this.line = null;
    this.heat = null;
    this.marks = null;
    super.onDestroy();
  }
}

/** One grid cell as a rect in cell units, inset by `pad` cells a side. */
function cellRect(
  g: PIXI.Graphics,
  gridW: number,
  idx: number,
  pad: number
): void {
  g.rect(
    (idx % gridW) + pad,
    Math.floor(idx / gridW) + pad,
    1 - pad * 2,
    1 - pad * 2
  );
}

/**
 * A teardrop map pin, its tip at (x, y): a round head whose sides run
 * tangent down to the tip, with an ink hole.
 */
function drawPin(
  g: PIXI.Graphics,
  x: number,
  y: number,
  h: number,
  alpha: number
): void {
  const r = h * 0.36;
  const cy = y - h + r;
  const a = Math.asin(r / (y - cy));
  g.moveTo(x, y);
  g.arc(x, cy, r, Math.PI / 2 + a, Math.PI / 2 - a + Math.PI * 2);
  g.closePath();
  g.fill({ color: PIN_RED, alpha });
  g.circle(x, cy, r * 0.42);
  g.fill({ color: PAL.ink, alpha });
}

/** A stable per-cell jitter in [0, 1), so the street edge is ragged. */
function hash(i: number): number {
  let x = Math.imul(i, 2654435761) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519) >>> 0;
  x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}

export function createRouteTraceAnimation(
  initialControls?: Partial<RouteTraceControlValues>
): RouteTraceAnimation {
  return new RouteTraceAnimation(initialControls);
}
