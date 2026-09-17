import type * as PIXI from 'pixi.js';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { MANIFEST, TINTS, type FourWayStopControlValues } from './manifest';
import { B, type Approach } from './geometry';
import { makeCamera, groundHit, type Camera } from './camera';
import {
  DEFAULT_PARAMS,
  STEP,
  MAX_STEPS_PER_FRAME,
  createTraffic,
  setCop,
  step,
  type TrafficParams,
  type TrafficState,
} from './traffic';
import { Scene } from './scene';

/**
 * Steps run before the first frame, so the corner opens with queues that
 * have already formed and a standoff in progress rather than an empty
 * street filling up. Forty seconds of traffic, spread over a few frames.
 */
const PREROLL_STEPS = 2400;
const PREROLL_PER_FRAME = 600;

/** The cop's hand, from the pointer. */
type Hover = { kind: 'box' } | { kind: 'approach'; a: Approach } | null;

export class FourWayStopAnimation extends PixiAnimation<typeof MANIFEST> {
  private S: TrafficState = createTraffic(Date.now() & 0xffff);
  private scene: Scene | null = null;
  private cam: Camera | null = null;
  private acc = 0;
  private preroll = 0;
  private w = 0;
  private h = 0;
  private hover: Hover = null;
  /** The approach being waved, until the pointer leaves it. */
  private waving: Approach | null = null;

  constructor(initialControls?: Partial<FourWayStopControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.S = createTraffic(Date.now() & 0xffff);
    this.acc = 0;
    this.preroll = PREROLL_STEPS;
    this.hover = null;
    this.waving = null;
    this.scene = new Scene(this.getRoot());
    this.w = 0;
    this.h = 0;
  }

  private paramsFrom(c: FourWayStopControlValues): TrafficParams {
    return {
      ...DEFAULT_PARAMS,
      demand: Number(c.demand),
      tau: Number(c.patience),
      headwayScale: Number(c.headway),
      busEvery: c.bus ? DEFAULT_PARAMS.busEvery : 0,
      bikeShare: c.bikes ? DEFAULT_PARAMS.bikeShare : 0,
      farSide: Number(c.farSide),
    };
  }

  /** Which part of the corner a frame point is over. */
  private regionAt(u: number, v: number): Hover {
    if (!this.cam) return null;
    const g = groundHit(this.cam, u, v);
    if (!g) return null;
    if (Math.abs(g.x) < B / 2 && Math.abs(g.y) < B / 2) return { kind: 'box' };
    if (Math.abs(g.y) > Math.abs(g.x))
      return { kind: 'approach', a: g.y > 0 ? 0 : 2 };
    return { kind: 'approach', a: g.x > 0 ? 1 : 3 };
  }

  onUpdate(
    app: PIXI.Application,
    controls: FourWayStopControlValues,
    deltaTime: number
  ): void {
    const dt = Math.min(0.05, deltaTime);
    const sw = app.screen.width;
    const sh = app.screen.height;
    const tint = TINTS[Math.round(Number(controls.tint))] || TINTS[0];
    if (!this.scene) return;
    if (this.w !== sw || this.h !== sh || this.scene.needsStatic(tint)) {
      this.w = sw;
      this.h = sh;
      this.cam = makeCamera(sw / Math.max(1, sh));
      this.scene.resize(sw, sh, this.cam, tint);
    }
    const p = this.paramsFrom(controls);
    const interactive = Number(controls.mode) > 0.5;

    // ---- the cop
    const pointer = this.pointer;
    const mouse = pointer?.mouse;
    const present = interactive && !!mouse?.active;
    this.hover = present ? this.regionAt(mouse!.x / sw, mouse!.y / sh) : null;
    if (
      this.waving !== null &&
      !(this.hover?.kind === 'approach' && this.hover.a === this.waving)
    )
      this.waving = null;
    if (pointer) {
      while (pointer.clicks.length) {
        const k = pointer.clicks.shift()!;
        if (!interactive) continue;
        const r = this.regionAt(k.x / sw, k.y / sh);
        if (!r) continue;
        if (r.kind === 'box') setCop(this.S, { clearing: true });
        else this.waving = r.a;
      }
    }
    const held: [boolean, boolean, boolean, boolean] = [
      false,
      false,
      false,
      false,
    ];
    if (this.hover?.kind === 'approach' && this.waving === null)
      held[this.hover.a] = true;
    setCop(this.S, { present, held, waved: this.waving });

    // ---- fixed-step traffic
    let pre = PREROLL_PER_FRAME;
    while (this.preroll > 0 && pre-- > 0) {
      this.preroll--;
      step(this.S, p);
    }
    this.acc = Math.min(this.acc + dt, MAX_STEPS_PER_FRAME * STEP);
    while (this.acc >= STEP) {
      this.acc -= STEP;
      step(this.S, p);
    }

    this.scene.draw(this.S, this.cam!, dt, tint, Number(controls.rain));
  }

  onDestroy(): void {
    this.scene = null;
    super.onDestroy();
  }
}

export function createFourWayStopAnimation(
  initialControls?: Partial<FourWayStopControlValues>
): FourWayStopAnimation {
  return new FourWayStopAnimation(initialControls);
}
