import * as PIXI from 'pixi.js';
import { PAL } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { PingPong } from '../shared/ping-pong';
import { Particles } from '../shared/particles';
import { setColor } from '../shared/shader-harness';
import { prefersReducedMotion } from '../shared/reduced-motion';
import { MANIFEST, type DiscControlValues } from './manifest';
import {
  STEP_FS,
  REDUCE_FS,
  DISPLAY_FS,
  GRAIN_STEP_FS,
  GRAIN_STEP_UNIFORMS,
  GRAIN_VERT,
  GRAIN_FRAG,
  GRAIN_DRAW_UNIFORMS,
  STEP_UNIFORMS,
  REDUCE_UNIFORMS,
  DISP_UNIFORMS,
  REDUCE_W,
  REDUCE_CHUNKS,
} from './shaders';
import {
  DEFAULT_PARAMS,
  MAX_PLANETS,
  MAX_STEPS_PER_FRAME,
  R_IN,
  R_OUT,
  SEED_Q,
  STEP,
  UNITS_PER_SECOND,
  circularVelocity,
  createDisc,
  elementsOf,
  orbitPath,
  settle,
  stepBodies,
  type DiscParams,
  type Planet,
} from './physics';
import { N_GRAINS, GRAIN_W, seedGrains, mulberry32 } from './grains';

/** Production grid: 512 in φ, 192 in ln r. Cells are the same shape. */
const NPHI = 512;
const NR = 192;
/**
 * Steps run before the first frame, and how many per frame while that
 * happens. Ten orbits at r = 1 so the seeded planet's wake has wrapped
 * and settled. Real drivers only, no stamped spiral. The sink is off
 * during the pre-roll so nothing vanishes before the planet can be paid.
 */
const PREROLL_STEPS = 6280;
const PREROLL_PER_FRAME = 400;
/** Disc radius that fills the shorter screen dimension. */
const R_VIEW = 2.15;
/** Drag scale: one view radius of drag is 1.5 v_K at r = 1. */
const THROW_K = 1.5 / R_VIEW;
/** Under this many pixels a press-and-release is a click: circular orbit. */
const CLICK_PX = 6;
/** Seconds for a fall-in flare to decay: long enough to read as an event. */
const FLARE_TAU = 6;
/**
 * What is already in the disc when it loads: a giant that has carved a
 * lane during the pre-roll, and a seed — the same object a throw makes —
 * further out, on the far side so the two do not start aligned.
 */
const GIANT_Q = 1.5e-3;
const GIANT_R = 0.8;
const SEED_R = 1.5;
const PREVIEW_POINTS = 240;

interface Hold {
  /** Seed position in disc units. */
  ox: number;
  oy: number;
  /** Where the press landed, in pixels, for the click threshold. */
  px: number;
  py: number;
}

/**
 * A protoplanetary disc: gas integrated on the GPU on a log-polar grid,
 * planets on the CPU that the gas feels through the step shader and that
 * feel the gas through one reduce a frame. The pointer is not in the
 * system; only what it throws is.
 */
export class DiscAnimation extends PixiAnimation<typeof MANIFEST> {
  private pp: PingPong | null = null;
  private failed = false;
  private sprite: PIXI.Sprite | null = null;
  private texture: PIXI.Texture | null = null;
  private preview: PIXI.Graphics | null = null;

  private time = 0;
  private acc = 0;
  private preroll = 0;
  private seedKey = '';
  private reduced = false;
  private sigma0 = 0;
  private floor = 0;
  private planets: Planet[] = [];
  private hold: Hold | null = null;
  private flare = 0;
  private starFlux = 0;
  private planetBuf = new Float32Array(MAX_PLANETS * 4);
  private grains: Particles | null = null;

  constructor(initialControls?: Partial<DiscControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.time = 0;
    this.acc = 0;
    this.preroll = 0;
    this.seedKey = '';
    this.planets = [];
    this.hold = null;
    this.flare = 0;
    this.starFlux = 0;
  }

  private paramsOf(controls: DiscControlValues): DiscParams {
    return {
      ...DEFAULT_PARAMS,
      h: Number(controls.aspect),
      alpha: Number(controls.alpha),
      discMass: Number(controls.discMass),
      accRate: Number(controls.accretionRate),
    };
  }

  /** Build the opening disc from the mirror and hand it to the GPU. */
  private seed(pp: PingPong, p: DiscParams, collapse: number): void {
    const D = createDisc(NR, NPHI, p);
    const data = new Float32Array(NR * NPHI * 4);
    for (let k = 0; k < NR * NPHI; k++) {
      data[k * 4] = D.sig[k];
      data[k * 4 + 1] = D.vr[k];
      data[k * 4 + 2] = D.vp[k];
    }
    if (pp.sw === NPHI && pp.sh === NR) pp.reseed(data);
    else pp.initState(NPHI, NR, data);
    this.sigma0 = D.sigma0;
    this.floor = D.floor;
    const [gvx, gvy] = circularVelocity(GIANT_R, 0);
    const [svx, svy] = circularVelocity(-SEED_R, 0);
    this.planets = [
      { x: GIANT_R, y: 0, vx: gvx, vy: gvy, q: GIANT_Q, age: 0, ax: 0, ay: 0 },
      { x: -SEED_R, y: 0, vx: svx, vy: svy, q: SEED_Q, age: 0, ax: 0, ay: 0 },
    ];
    this.hold = null;
    this.flare = 0;
    this.starFlux = 0;
    this.acc = 0;
    this.preroll = PREROLL_STEPS;
    this.reduced = prefersReducedMotion();
    this.grains?.init(seedGrains(N_GRAINS, mulberry32(1 + collapse)));
  }

  private packPlanets(forDisplay: boolean): number {
    const b = this.planetBuf;
    b.fill(0);
    const n = Math.min(MAX_PLANETS, this.planets.length);
    for (let k = 0; k < n; k++) {
      const pl = this.planets[k];
      b[k * 4] = pl.x;
      b[k * 4 + 1] = pl.y;
      if (forDisplay) {
        b[k * 4 + 2] = 0.02 * Math.cbrt(pl.q / 1e-4);
      } else {
        b[k * 4 + 2] = pl.q;
        b[k * 4 + 3] = Math.hypot(pl.x, pl.y);
      }
    }
    return n;
  }

  private setGrid(
    gl: WebGL2RenderingContext,
    L: Record<string, WebGLUniformLocation | null>
  ): void {
    gl.uniform1f(L.uRIn!, R_IN);
    gl.uniform1f(L.uDlnr!, Math.log(R_OUT / R_IN) / NR);
    gl.uniform1f(L.uDphi!, (2 * Math.PI) / NPHI);
  }

  /** One substep: three passes on the gas, then the planets. */
  private doStep(
    pp: PingPong,
    p: DiscParams,
    clearEat: boolean,
    sinkOn: boolean
  ): void {
    const n = this.packPlanets(false);
    const accK = sinkOn ? 1 - Math.exp(-p.accRate * p.dt) : 0;
    for (let pass = 0; pass < 3; pass++) {
      pp.step((gl, L) => {
        this.setGrid(gl, L);
        gl.uniform1i(L.uPass!, pass);
        gl.uniform1f(L.uDt!, p.dt);
        gl.uniform1f(L.uH!, p.h);
        gl.uniform1f(L.uAlpha!, p.alpha);
        gl.uniform1f(L.uAccK!, accK);
        gl.uniform1f(L.uSinkFloor!, p.sinkFloorCells);
        gl.uniform1f(L.uFloor!, this.floor);
        gl.uniform1f(L.uROut!, R_OUT);
        gl.uniform1f(L.uSigma0!, this.sigma0);
        gl.uniform1i(L.uClearEat!, clearEat ? 1 : 0);
        gl.uniform1i(L.uPlanetN!, n);
        gl.uniform4fv(L.uPlanet!, this.planetBuf);
      });
    }
    stepBodies(this.planets, p.dt, p.h);
    if (this.grains) {
      const gasTex = pp.texture;
      this.grains.step((gl, L) => {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, gasTex);
        gl.uniform1i(L.uState!, 1);
        this.setGrid(gl, L);
        gl.uniform1f(L.uROut!, R_OUT);
        gl.uniform1f(L.uH!, p.h);
        gl.uniform1f(L.uDt!, p.dt);
        gl.uniform1f(L.uFloor!, this.floor);
      });
    }
    for (const ev of settle(this.planets, p.h)) {
      if (ev.type === 'fell') this.flare += 4 * Math.cbrt(ev.q / 1e-4);
    }
  }

  /** The disc's answer for this frame: force on each planet, what it ate, the star's flux. */
  private readBack(pp: PingPong, p: DiscParams): void {
    const n = this.packPlanets(false);
    const rows = pp.reduce(REDUCE_W, NR, (gl, L) => {
      this.setGrid(gl, L);
      gl.uniform1f(L.uH!, p.h);
      gl.uniform1f(L.uSinkFloor!, p.sinkFloorCells);
      gl.uniform1i(L.uPlanetN!, n);
      gl.uniform4fv(L.uPlanet!, this.planetBuf);
    });
    if (!rows) return;
    for (let k = 0; k < n; k++) {
      let ax = 0;
      let ay = 0;
      let eaten = 0;
      for (let i = 0; i < NR; i++) {
        for (let c = 0; c < REDUCE_CHUNKS; c++) {
          const o = (i * REDUCE_W + k * REDUCE_CHUNKS + c) * 4;
          ax += rows[o];
          ay += rows[o + 1];
          eaten += rows[o + 2];
        }
      }
      const pl = this.planets[k];
      // A force held fixed across the pre-roll's 400 substeps is four time
      // units of one vector, and it pumps the orbit until the planet
      // escapes. The planet feels the disc once the frame is honest.
      if (this.preroll === 0 && Number.isFinite(ax) && Number.isFinite(ay)) {
        pl.ax = ax;
        pl.ay = ay;
      }
      if (Number.isFinite(eaten) && eaten > 0) pl.q += eaten;
    }
    let flux = 0;
    for (let c = 0; c < REDUCE_CHUNKS; c++)
      flux += rows[(0 * REDUCE_W + MAX_PLANETS * REDUCE_CHUNKS + c) * 4];
    if (Number.isFinite(flux)) this.starFlux = -flux;
  }

  private drawPreview(sw: number, sh: number, vx: number, vy: number): void {
    const g = this.preview!;
    g.clear();
    if (!this.hold) return;
    const scale = Math.min(sw, sh) / (2 * R_VIEW);
    const el = elementsOf(this.hold.ox, this.hold.oy, vx, vy);
    const path = orbitPath(el, PREVIEW_POINTS);
    if (path.length < 4) return;
    const toX = (x: number) => sw / 2 + x * scale;
    const toY = (y: number) => sh / 2 - y * scale;
    // Solid where it flies, dashed where it would cross the cavity.
    for (let m = 2; m < path.length; m += 2) {
      const r = Math.hypot(path[m], path[m + 1]);
      const seg = m / 2;
      if (r < R_IN && seg % 2 === 0) continue;
      g.moveTo(toX(path[m - 2]), toY(path[m - 1]));
      g.lineTo(toX(path[m]), toY(path[m + 1]));
    }
    g.stroke({ width: 1, color: 0xffffff, alpha: el.bound ? 0.55 : 0.35 });
    g.circle(toX(this.hold.ox), toY(this.hold.oy), 3);
    g.fill({ color: 0xffffff, alpha: 0.8 });
  }

  onUpdate(
    app: PIXI.Application,
    controls: DiscControlValues,
    deltaTime: number
  ): void {
    if (this.failed) return;
    if (!this.pp) {
      const pp = PingPong.create({
        simFrag: STEP_FS,
        dispFrag: DISPLAY_FS,
        // Σ is walked by 1e-3 of itself a step; half floats stripe it.
        fullPrecision: true,
        simUniforms: STEP_UNIFORMS,
        dispUniforms: DISP_UNIFORMS,
        reduceFrag: REDUCE_FS,
        reduceUniforms: REDUCE_UNIFORMS,
      });
      if (!pp) {
        this.failed = true;
        return;
      }
      this.pp = pp;
      this.grains = Particles.create(pp.gl, N_GRAINS, {
        stepFrag: GRAIN_STEP_FS,
        drawVert: GRAIN_VERT,
        drawFrag: GRAIN_FRAG,
        stepUniforms: GRAIN_STEP_UNIFORMS,
        drawUniforms: GRAIN_DRAW_UNIFORMS,
        width: GRAIN_W,
      });
    }
    const pp = this.pp;
    const p = this.paramsOf(controls);
    const dt = Math.min(0.05, deltaTime);
    this.time += dt;
    const sw = app.screen.width;
    const sh = app.screen.height;

    const seedKey = `${controls.discMass}|${controls.aspect}|${controls.reseed}`;
    if (seedKey !== this.seedKey) {
      this.seed(pp, p, Number(controls.reseed));
      this.seedKey = seedKey;
    }

    if (!this.sprite) {
      this.texture = PIXI.Texture.from(pp.canvas);
      this.sprite = new PIXI.Sprite(this.texture);
      this.getRoot().addChild(this.sprite);
      this.preview = new PIXI.Graphics();
      this.getRoot().addChild(this.preview);
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(2, Math.round(sw * dpr));
    const H = Math.max(2, Math.round(sh * dpr));
    if (pp.canvas.width !== W || pp.canvas.height !== H) {
      pp.canvas.width = W;
      pp.canvas.height = H;
      this.texture?.source.resize(W, H);
    }
    this.sprite.width = sw;
    this.sprite.height = sh;

    // ---- the throw
    const scale = Math.min(sw, sh) / (2 * R_VIEW);
    const toDisc = (x: number, y: number): [number, number] => [
      (x - sw / 2) / scale,
      (sh / 2 - y) / scale,
    ];
    const pointer = this.pointer;
    let pvx = 0;
    let pvy = 0;
    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        if (this.planets.length >= MAX_PLANETS) continue;
        const [ox, oy] = toDisc(c.x, c.y);
        this.hold = { ox, oy, px: c.x, py: c.y };
      }
      if (this.hold && (!pointer.mouse.down || !pointer.mouse.active)) {
        // Released elsewhere, or left the stage: the queue says which.
        if (!pointer.releases.length) this.hold = null;
      }
      if (this.hold && pointer.mouse.active) {
        const throwScale = this.reduced ? 0.35 : 1;
        pvx = ((pointer.mouse.x - this.hold.px) / scale) * THROW_K * throwScale;
        pvy =
          (-(pointer.mouse.y - this.hold.py) / scale) * THROW_K * throwScale;
      }
      while (pointer.releases.length) {
        const rel = pointer.releases.shift()!;
        if (!this.hold) continue;
        const drag = Math.hypot(rel.x - this.hold.px, rel.y - this.hold.py);
        let vx: number;
        let vy: number;
        if (drag < CLICK_PX) {
          [vx, vy] = circularVelocity(this.hold.ox, this.hold.oy);
        } else {
          const throwScale = this.reduced ? 0.35 : 1;
          vx = ((rel.x - this.hold.px) / scale) * THROW_K * throwScale;
          vy = (-(rel.y - this.hold.py) / scale) * THROW_K * throwScale;
        }
        this.planets.push({
          x: this.hold.ox,
          y: this.hold.oy,
          vx,
          vy,
          q: SEED_Q,
          age: 0,
          ax: 0,
          ay: 0,
        });
        this.hold = null;
      }
    }
    if (this.hold && drag2(this.hold, pointer) < CLICK_PX) {
      [pvx, pvy] = circularVelocity(this.hold.ox, this.hold.oy);
    }
    this.drawPreview(sw, sh, pvx, pvy);

    // ---- the pre-roll, outside the accumulator so the cap cannot eat it
    let pre = PREROLL_PER_FRAME;
    while (this.preroll > 0 && pre-- > 0) {
      this.preroll--;
      this.doStep(pp, p, true, false);
    }

    // ---- fixed-step integration, capped so a stall cannot spiral
    const rate =
      UNITS_PER_SECOND * Number(controls.speed) * (this.reduced ? 0.25 : 1);
    this.acc = Math.min(this.acc + dt * rate, MAX_STEPS_PER_FRAME * STEP);
    let first = true;
    let stepped = false;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.doStep(pp, p, first, true);
      first = false;
      stepped = true;
    }
    if (stepped) this.readBack(pp, p);
    this.flare *= Math.exp(-dt / FLARE_TAU);

    // ---- display
    const n = this.packPlanets(true);
    // Flux reference: Σ at r = 1 moving inward at the sound speed around
    // the cavity's circumference. Real inflow is a fraction of it.
    const fluxRef = this.sigma0 * p.h * 2 * Math.PI * R_IN;
    const starL =
      1 + this.flare + Math.max(0, Math.min(2, this.starFlux / fluxRef));
    pp.display(W, H, (gl, L) => {
      this.setGrid(gl, L);
      gl.uniform2f(L.uRes!, W, H);
      gl.uniform1f(L.uTime!, this.time);
      gl.uniform1f(L.uGrain!, Number(controls.grain));
      gl.uniform1f(L.uROut!, R_OUT);
      // Optical depth 0.39 at r = 1: density contrast passes through nearly
      // linearly, and the rim still saturates.
      gl.uniform1f(L.uKappa!, 0.5 / this.sigma0);
      gl.uniform1f(L.uView!, R_VIEW);
      gl.uniform1f(L.uStarL!, starL);
      gl.uniform1i(L.uPlanetN!, n);
      gl.uniform4fv(L.uPlanet!, this.planetBuf);
      setColor(gl, L.uInk!, PAL.ink);
      setColor(gl, L.uOrange!, PAL.orange);
    });
    this.grains?.draw(W, H, (gl, L) => {
      gl.uniform2f(L.uRes!, W, H);
      gl.uniform1f(L.uView!, R_VIEW);
      gl.uniform1f(L.uSize!, dpr);
      gl.uniform1f(L.uDust!, Number(controls.dust));
    });
    this.texture?.source.update();
  }

  onDestroy(): void {
    this.grains?.destroy();
    this.grains = null;
    this.pp?.destroy();
    this.pp = null;
    this.failed = false;
    this.sprite = null;
    this.preview = null;
    this.texture?.destroy(true);
    this.texture = null;
    super.onDestroy();
  }
}

/** Pixels the pointer has moved since the press, or 0 with no pointer. */
function drag2(
  hold: Hold,
  pointer: { mouse: { x: number; y: number } } | null
): number {
  if (!pointer) return 0;
  return Math.hypot(pointer.mouse.x - hold.px, pointer.mouse.y - hold.py);
}

export function createDiscAnimation(
  initialControls?: Partial<DiscControlValues>
): DiscAnimation {
  return new DiscAnimation(initialControls);
}
