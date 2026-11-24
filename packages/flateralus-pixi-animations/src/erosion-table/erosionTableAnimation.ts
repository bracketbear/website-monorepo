import * as PIXI from 'pixi.js';
import { PixiAnimation, rand } from '@bracketbear/flateralus-pixi';
import { VERT } from '../shared/shader-harness';
import type { TerrainId } from '../shared/terrain';
import { MANIFEST, type ErosionTableControlValues } from './manifest';
import {
  FLUX_FS,
  STEP_FS,
  SPLAT_FS,
  DISPLAY_FS,
  FLUX_UNIFORMS,
  STEP_UNIFORMS,
  SPLAT_UNIFORMS,
  DISP_UNIFORMS,
  TINTS,
} from './shaders';
import { DEFAULT_PARAMS, STEP, clampCreep } from './physics';
import { bakeHeights } from './bake';

type Locs = Record<string, WebGLUniformLocation | null>;

/**
 * Total simulation cells, held roughly constant so the cost does not move
 * with the canvas. Same budget as the caustics pool: a portrait lab canvas
 * lands near 302x488, which puts a channel at three or four cells across and
 * leaves room for something like seventy of them.
 */
const CELL_BUDGET = 147456;

/**
 * Steps run before the first visible frame, and how many of them are allowed
 * per frame while that is happening.
 *
 * The table has to open on a mountain that weather has already happened to:
 * streams running, snow on the peak, the first cuts started. Twelve seconds
 * of simulation gets there. Doing it all in one frame is a visible stall, so
 * it is spread over about ten frames instead — a sixth of a second, during
 * which it reads as a storm arriving rather than as a hitch.
 *
 * Primed by running the real driver, never by stamping impulses in: seeded
 * water lands as coherent discs and drains as rings, which is not what rain
 * on a mountain looks like and not what the channels need to bite on.
 */
const PREROLL_STEPS = 3000;
const PREROLL_PER_FRAME = 300;

/**
 * Dissolving and deposition rates, 1/s.
 *
 * Measured, not guessed: past about 40 the dissolving rate almost stops
 * mattering, because suspended load reaches capacity within a step or two
 * and erosion becomes capacity-limited. Five times this bought roughly a
 * quarter more incision. Capacity is therefore the lever — the Erosion Rate
 * control scales `kc`, not this — and raising this mostly buys a stiffer
 * integrator.
 */
const KS = 40;
const KD = 20;

/**
 * Capacity coefficient at an Erosion Rate of 1.
 *
 * Measured on Mt Hood over thirty seconds of simulation, against a control
 * run with erosion switched off: at a 64-cell grid this cuts the deepest
 * channel to about 8% of the relief and leaves the surface 26% more
 * dissected than creep alone, with the material the water removed
 * correlating 0.36 against accumulated discharge. It improves with
 * resolution — at 128 cells the same settings give 1.6x the dissection of
 * the control and beat even the baked mountain — so the production grid,
 * finer still, does better than the tests report.
 */
const KC_BASE = 4;

/**
 * Display scales: the depth at which water goes opaque, the sediment load
 * that fully browns it, and the stream power that reads as a lit channel.
 *
 * Read off the measured field rather than dialled in by eye. On the default
 * settings water sits near 2.8e-4 deep across the hillside and reaches
 * 6.7e-3 in channels, so opacity saturating at 1.5e-3 leaves sheet flow
 * translucent and makes rivers solid. Discharge per unit width peaks near
 * 4.4e-4, so lighting at 3e-4 picks out the channels that beat the slope
 * around them and leaves the slope itself dark.
 */
const W_VIS = 1.5e-3;
const S_VIS = 1.5e-4;
const POW_VIS = 3e-4;

const LANDS: TerrainId[] = ['hood', 'pgh'];

interface Splat {
  x: number;
  y: number;
  rad: number;
  add: [number, number, number, number];
}

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  src: string,
  tag: string
): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error(`erosion-table ${tag}: ${gl.getShaderInfoLog(sh)}`);
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function program(
  gl: WebGL2RenderingContext,
  frag: string,
  tag: string
): WebGLProgram | null {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT, `${tag} vert`);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag, `${tag} frag`);
  if (!vs || !fs) return null;
  const p = gl.createProgram();
  if (!p) return null;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error(`erosion-table ${tag}: ${gl.getProgramInfoLog(p)}`);
    gl.deleteProgram(p);
    return null;
  }
  return p;
}

function locsOf(
  gl: WebGL2RenderingContext,
  p: WebGLProgram,
  names: readonly string[]
): Locs {
  const out: Locs = {};
  for (const n of names) out[n] = gl.getUniformLocation(p, n);
  return out;
}

/**
 * Mt Hood, left out in the rain.
 *
 * The state is a terrain height, a water depth, a suspended sediment load
 * and a snowpack, all integrated in a GPU ping-pong buffer, plus the four
 * pipe fluxes that route water between cells. Everything on screen is a
 * projection of that one field, and the only thing driving it is weather.
 *
 * The loop is closed inside the field itself rather than through a separate
 * object layer, which makes it tighter than the pool's: the terrain decides
 * where the water goes, the water decides what the terrain becomes, and the
 * landscape ends up being the memory of every drop that has fallen on it.
 */
export class ErosionTableAnimation extends PixiAnimation<typeof MANIFEST> {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private fluxProg: WebGLProgram | null = null;
  private stepProg: WebGLProgram | null = null;
  private splatProg: WebGLProgram | null = null;
  private dispProg: WebGLProgram | null = null;
  private fluxL: Locs = {};
  private stepL: Locs = {};
  private splatL: Locs = {};
  private dispL: Locs = {};
  private failed = false;

  /** State pair: .x terrain, .y water, .z sediment, .w snow. */
  private terTex: (WebGLTexture | null)[] = [];
  private terFb: (WebGLFramebuffer | null)[] = [];
  /** Pipe outflow pair: .x left, .y right, .z down, .w up. */
  private flxTex: (WebGLTexture | null)[] = [];
  private flxFb: (WebGLFramebuffer | null)[] = [];
  /** The terrain as baked. Never written after the bake. */
  private b0Tex: WebGLTexture | null = null;
  private hi = 0;
  private sw = 0;
  private sh = 0;

  private sprite: PIXI.Sprite | null = null;
  private texture: PIXI.Texture | null = null;

  private acc = 0;
  private preroll = 0;
  /** Forcing clock. Advanced inside the step, wrapped, never wall time. */
  private simT = 0;
  private mx = -1;
  private my = -1;
  private nextStorm = 4;
  private pending: Splat[] = [];
  /** What the current bake was made from, so a control change can redo it. */
  private bakedLand = -1;
  private bakedRelief = -1;

  constructor(initialControls?: Partial<ErosionTableControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.acc = 0;
    this.preroll = 0;
    this.simT = 0;
    this.mx = -1;
    this.my = -1;
    this.nextStorm = 4;
    this.pending = [];
    this.bakedLand = -1;
    this.bakedRelief = -1;
  }

  /** Build the context and the four programs. False means stop retrying. */
  private build(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      premultipliedAlpha: true,
    });
    if (!gl) return false;
    // Float render targets are the simulation. A single step moves the bed
    // by a few parts in 10^7 of the relief, so there is nothing to salvage
    // at half precision and no point degrading to it.
    if (!gl.getExtension('EXT_color_buffer_float')) return false;

    const fluxProg = program(gl, FLUX_FS, 'flux');
    const stepProg = program(gl, STEP_FS, 'step');
    const splatProg = program(gl, SPLAT_FS, 'splat');
    const dispProg = program(gl, DISPLAY_FS, 'disp');
    if (!fluxProg || !stepProg || !splatProg || !dispProg) return false;

    this.canvas = canvas;
    this.gl = gl;
    this.fluxProg = fluxProg;
    this.stepProg = stepProg;
    this.splatProg = splatProg;
    this.dispProg = dispProg;
    this.fluxL = locsOf(gl, fluxProg, FLUX_UNIFORMS);
    this.stepL = locsOf(gl, stepProg, STEP_UNIFORMS);
    this.splatL = locsOf(gl, splatProg, SPLAT_UNIFORMS);
    this.dispL = locsOf(gl, dispProg, DISP_UNIFORMS);
    return true;
  }

  private mkTex(data: Float32Array | null): WebGLTexture {
    const gl = this.gl!;
    const tx = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      this.sw,
      this.sh,
      0,
      gl.RGBA,
      gl.FLOAT,
      data
    );
    // NEAREST because filtering float32 needs OES_texture_float_linear, an
    // extension some drivers do not have. Every tap that wants interpolation
    // does it by hand in the shader instead, so the result is identical
    // everywhere rather than better on some machines.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tx;
  }

  private mkFb(tx: WebGLTexture): WebGLFramebuffer {
    const gl = this.gl!;
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      tx,
      0
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fb;
  }

  private freeSim(): void {
    const gl = this.gl;
    if (!gl) return;
    for (const t of [...this.terTex, ...this.flxTex])
      if (t) gl.deleteTexture(t);
    for (const f of [...this.terFb, ...this.flxFb])
      if (f) gl.deleteFramebuffer(f);
    if (this.b0Tex) gl.deleteTexture(this.b0Tex);
    this.terTex = [];
    this.flxTex = [];
    this.terFb = [];
    this.flxFb = [];
    this.b0Tex = null;
  }

  /**
   * (Re)build the state buffers and bake the landscape into them.
   *
   * Cells are kept square, because anisotropic ones would route water faster
   * along one axis than the other and put a grain into the drainage network
   * that has nothing to do with the terrain.
   */
  private ensureSim(W: number, H: number, land: number, relief: number): void {
    const asp = W / Math.max(1, H);
    let h = Math.round(Math.sqrt(CELL_BUDGET / asp));
    h = Math.max(96, Math.min(640, h));
    const w = Math.max(96, Math.min(1024, Math.round(h * asp)));
    if (
      this.sw === w &&
      this.sh === h &&
      this.bakedLand === land &&
      this.bakedRelief === relief
    )
      return;
    this.freeSim();
    this.sw = w;
    this.sh = h;
    this.bakedLand = land;
    this.bakedRelief = relief;

    const heights = bakeHeights({
      W: w,
      H: h,
      asp,
      id: LANDS[land] ?? 'hood',
      relief,
    });
    // .x terrain, .y water, .z sediment, .w snow — all empty but the bed.
    const state = new Float32Array(w * h * 4);
    const base = new Float32Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      state[i * 4] = heights[i];
      base[i * 4] = heights[i];
    }
    this.terTex = [this.mkTex(state), this.mkTex(state)];
    this.flxTex = [this.mkTex(null), this.mkTex(null)];
    this.terFb = [this.mkFb(this.terTex[0]!), this.mkFb(this.terTex[1]!)];
    this.flxFb = [this.mkFb(this.flxTex[0]!), this.mkFb(this.flxTex[1]!)];
    this.b0Tex = this.mkTex(base);
    // The flux pair comes back from mkTex(null) with undefined contents on
    // some drivers, so clear both before anything reads them.
    const gl = this.gl!;
    for (const fb of this.flxFb) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.hi = 0;
    // A fresh bed is a dry bed. Without re-priming, a resize drops the
    // viewer back onto bare rock with no water and no snow on it — the one
    // state that shows none of what this is.
    this.preroll = PREROLL_STEPS;
  }

  onUpdate(
    app: PIXI.Application,
    controls: ErosionTableControlValues,
    deltaTime: number
  ): void {
    if (this.failed) return;
    const dt = Math.min(0.05, deltaTime);

    if (!this.gl) {
      if (!this.build()) {
        this.failed = true;
        return;
      }
    }
    const gl = this.gl!;

    if (!this.sprite) {
      this.texture = PIXI.Texture.from(this.canvas!);
      this.sprite = new PIXI.Sprite(this.texture);
      this.getRoot().addChild(this.sprite);
    }

    const cw = app.screen.width;
    const ch = app.screen.height;
    const dpr = this.dpr ?? Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(2, Math.round(cw * dpr));
    const H = Math.max(2, Math.round(ch * dpr));
    if (this.canvas!.width !== W || this.canvas!.height !== H) {
      this.canvas!.width = W;
      this.canvas!.height = H;
      this.texture?.source.resize(W, H);
    }
    this.sprite.width = cw;
    this.sprite.height = ch;

    const relief = controls.relief;
    const land = Math.round(Number(controls.land));
    this.ensureSim(W, H, land, relief);

    const asp = cw / Math.max(1, ch);
    const dx = 1 / this.sh;
    const interactive = Number(controls.mode) > 0.5;
    const uplifting = Number(controls.brush) > 0.5;
    const splats = this.pending.splice(0);

    // ---- input: the cursor is weather, or it is tectonics
    const pointer = this.pointer;
    const mouse = pointer?.mouse;
    if (interactive && mouse?.active) {
      const mx = mouse.x / cw;
      const my = 1 - mouse.y / ch;
      if (this.mx >= 0) {
        const dist = Math.hypot(mx - this.mx, my - this.my);
        if (dist > 0.001) {
          // Stamp along the drag so a fast sweep leaves a continuous line of
          // rain rather than a dotted one. Continuous contact, not events.
          const steps = Math.min(5, Math.ceil(dist / 0.01));
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = this.mx + (mx - this.mx) * t;
            const y = this.my + (my - this.my) * t;
            // Divided by the stamp count so a fast sweep and a slow one lay
            // down the same amount of water per unit of path, rather than
            // per event. The magnitudes are set against the display scale:
            // water goes opaque around 1.5e-3, so a stroke has to leave
            // several times that or the brush does nothing anyone can see.
            splats.push(
              uplifting
                ? { x, y, rad: 11, add: [(relief * 0.03) / steps, 0, 0, 0] }
                : { x, y, rad: 10, add: [0, 1.0e-2 / steps, 0, 0] }
            );
          }
        }
      }
      this.mx = mx;
      this.my = my;
    } else {
      this.mx = -1;
    }

    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        if (!interactive) continue;
        const x = c.x / cw;
        const y = 1 - c.y / ch;
        splats.push(
          uplifting
            ? { x, y, rad: 24, add: [relief * 0.11, 0, 0, 0] }
            : { x, y, rad: 20, add: [0, 3.5e-2, 0, 0] }
        );
      }
    }

    // Ambient mode still gets weather events, because the drifting cells
    // alone give the scene texture but no punctuation.
    if (!interactive) {
      this.nextStorm -= dt;
      if (this.nextStorm <= 0) {
        splats.push({
          x: rand(0.12, 0.88),
          y: rand(0.15, 0.9),
          rad: rand(14, 26),
          add: [0, rand(1.2e-2, 3e-2), 0, 0],
        });
        this.nextStorm = rand(4, 11);
      }
    }

    if (splats.length) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.blendEquation(gl.FUNC_ADD);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.terFb[this.hi]);
      gl.viewport(0, 0, this.sw, this.sh);
      gl.useProgram(this.splatProg);
      gl.uniform2f(this.splatL.uSim!, this.sw, this.sh);
      for (const e of splats) {
        gl.uniform2f(this.splatL.uC!, e.x, e.y);
        gl.uniform1f(this.splatL.uRad!, e.rad);
        gl.uniform4f(this.splatL.uAdd!, e.add[0], e.add[1], e.add[2], e.add[3]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.disable(gl.BLEND);
    }

    const bindTex = (unit: number, tx: WebGLTexture | null) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tx);
    };

    const kc = KC_BASE * controls.erode;
    const kd = KD * controls.deposit;

    const doStep = () => {
      // One tick of weather per tick of water. Per step, never per frame:
      // handing every substep in a frame the same wall-clock time applies
      // one frozen storm field two or three times in a row, which makes
      // rainfall a function of the display refresh rate. Wrapped because the
      // hash degrades at large coordinates and an ambient page runs for
      // hours — safe only because this is forcing, so a seam in it is just a
      // change of weather and the landscape carries its history through.
      this.simT = (this.simT + STEP) % 4096;

      // pass 1: route
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.flxFb[1 - this.hi]);
      gl.viewport(0, 0, this.sw, this.sh);
      gl.useProgram(this.fluxProg);
      bindTex(0, this.terTex[this.hi]);
      bindTex(1, this.flxTex[this.hi]);
      gl.uniform1i(this.fluxL.uTer!, 0);
      gl.uniform1i(this.fluxL.uFlx!, 1);
      gl.uniform2f(this.fluxL.uSim!, this.sw, this.sh);
      gl.uniform1f(this.fluxL.uDt!, STEP);
      gl.uniform1f(this.fluxL.uGrav!, controls.flow);
      gl.uniform1f(this.fluxL.uFDamp!, DEFAULT_PARAMS.fDamp);
      gl.uniform1f(this.fluxL.uDx!, dx);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // pass 2: rewrite
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.terFb[1 - this.hi]);
      gl.viewport(0, 0, this.sw, this.sh);
      gl.useProgram(this.stepProg);
      bindTex(0, this.terTex[this.hi]);
      bindTex(1, this.flxTex[1 - this.hi]);
      bindTex(2, this.b0Tex);
      gl.uniform1i(this.stepL.uTer!, 0);
      gl.uniform1i(this.stepL.uFlx!, 1);
      gl.uniform1i(this.stepL.uB0!, 2);
      gl.uniform2f(this.stepL.uSim!, this.sw, this.sh);
      gl.uniform1f(this.stepL.uDt!, STEP);
      gl.uniform1f(this.stepL.uDx!, dx);
      gl.uniform1f(this.stepL.uAsp!, asp);
      gl.uniform1f(this.stepL.uT!, this.simT);
      gl.uniform1f(this.stepL.uKc!, kc);
      gl.uniform1f(this.stepL.uKs!, KS);
      gl.uniform1f(this.stepL.uKd!, kd);
      gl.uniform1f(this.stepL.uWCap!, DEFAULT_PARAMS.wCap);
      gl.uniform1f(this.stepL.uMinSlope!, DEFAULT_PARAMS.minSlope);
      gl.uniform1f(this.stepL.uEvap!, DEFAULT_PARAMS.evap);
      gl.uniform1f(this.stepL.uCreep!, clampCreep(controls.creep * 1e-4));
      gl.uniform1f(this.stepL.uRepose!, DEFAULT_PARAMS.reposeRate);
      gl.uniform1f(this.stepL.uMaxDrop!, DEFAULT_PARAMS.repose * dx);
      gl.uniform1f(this.stepL.uRain!, controls.rain * 1e-4);
      gl.uniform1f(this.stepL.uRainBase!, DEFAULT_PARAMS.rainBase);
      gl.uniform1f(this.stepL.uRainFreq!, DEFAULT_PARAMS.rainFreq);
      gl.uniform1f(this.stepL.uOro!, DEFAULT_PARAMS.oro);
      gl.uniform1f(this.stepL.uRelief!, relief);
      gl.uniform1f(this.stepL.uSnowLine!, controls.snowline);
      gl.uniform1f(this.stepL.uSnowBand!, DEFAULT_PARAMS.snowBand);
      gl.uniform1f(this.stepL.uMelt!, DEFAULT_PARAMS.melt);
      gl.uniform1f(this.stepL.uSnowMax!, DEFAULT_PARAMS.snowMax);
      gl.uniform1f(this.stepL.uUplift!, controls.uplift * 1e-6);
      gl.uniform1f(this.stepL.uUpMax!, DEFAULT_PARAMS.upliftMax);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      this.hi = 1 - this.hi;
    };

    // The pre-roll runs outside the accumulator, which would otherwise eat
    // all but a handful of its steps, and is capped per frame so it costs a
    // sixth of a second spread thin rather than one long stall.
    let budget = PREROLL_PER_FRAME;
    while (this.preroll > 0 && budget-- > 0) {
      this.preroll--;
      doStep();
    }

    // Fixed step. The pipe clamp keeps water non-negative at any step size,
    // but sediment advection and the velocity estimate both want CFL under
    // one, and the accumulator is capped so a stall cannot spiral.
    this.acc = Math.min(this.acc + dt, 12 * STEP);
    while (this.acc >= STEP) {
      this.acc -= STEP;
      doStep();
    }

    // ---- display
    const T = TINTS[Math.round(Number(controls.tint))] || TINTS[0];
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.dispProg);
    bindTex(0, this.terTex[this.hi]);
    bindTex(1, this.flxTex[this.hi]);
    bindTex(2, this.b0Tex);
    gl.uniform1i(this.dispL.uTer!, 0);
    gl.uniform1i(this.dispL.uFlx!, 1);
    gl.uniform1i(this.dispL.uB0!, 2);
    gl.uniform2f(this.dispL.uSim!, this.sw, this.sh);
    gl.uniform1f(this.dispL.uDx!, dx);
    gl.uniform1f(this.dispL.uAsp!, asp);
    gl.uniform1f(this.dispL.uT!, this.simT);
    gl.uniform1f(this.dispL.uExag!, controls.exag);
    gl.uniform1f(this.dispL.uRelief!, relief);
    gl.uniform1f(this.dispL.uSnowMax!, DEFAULT_PARAMS.snowMax);
    gl.uniform3f(this.dispL.uScale!, W_VIS, S_VIS, POW_VIS);
    gl.uniform1f(this.dispL.uStreams!, controls.streams);
    gl.uniform1f(this.dispL.uContours!, controls.contours);
    gl.uniform1f(this.dispL.uRainFreq!, DEFAULT_PARAMS.rainFreq);
    gl.uniform1f(this.dispL.uRainBase!, DEFAULT_PARAMS.rainBase);
    const c3 = (name: string, v: [number, number, number]) =>
      gl.uniform3f(this.dispL[name]!, v[0], v[1], v[2]);
    c3('uRockLo', T.rockLo);
    c3('uRockHi', T.rockHi);
    c3('uBare', T.bare);
    c3('uSilt', T.silt);
    c3('uSnowC', T.snow);
    c3('uWater', T.water);
    c3('uSiltW', T.siltW);
    c3('uSun', T.sun);
    c3('uSky', T.sky);
    c3('uGlow', T.glow);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.texture?.source.update();
  }

  onDestroy(): void {
    const gl = this.gl;
    if (gl) {
      this.freeSim();
      if (this.fluxProg) gl.deleteProgram(this.fluxProg);
      if (this.stepProg) gl.deleteProgram(this.stepProg);
      if (this.splatProg) gl.deleteProgram(this.splatProg);
      if (this.dispProg) gl.deleteProgram(this.dispProg);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.hi = 0;
    this.sw = 0;
    this.sh = 0;
    this.bakedLand = -1;
    this.bakedRelief = -1;
    this.gl = null;
    this.canvas = null;
    this.fluxProg = null;
    this.stepProg = null;
    this.splatProg = null;
    this.dispProg = null;
    this.fluxL = {};
    this.stepL = {};
    this.splatL = {};
    this.dispL = {};
    this.failed = false;
    this.sprite = null;
    this.texture?.destroy(true);
    this.texture = null;
    super.onDestroy();
  }
}

export function createErosionTableAnimation(
  initialControls?: Partial<ErosionTableControlValues>
): ErosionTableAnimation {
  return new ErosionTableAnimation(initialControls);
}
