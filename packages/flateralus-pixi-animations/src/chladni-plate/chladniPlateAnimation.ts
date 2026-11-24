import * as PIXI from 'pixi.js';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { VERT } from '../shared/shader-harness';
import { MANIFEST, type ChladniPlateControlValues } from './manifest';
import {
  DISPLAY_FS,
  DISPLAY_UNIFORMS,
  LAPLACIAN_FS,
  LAPLACIAN_UNIFORMS,
  STEP_FS,
  STEP_UNIFORMS,
} from './shaders';
import { boundaryCanvas, driverPoints } from './masks';
import {
  GRID,
  STEP,
  clampStiffness,
  decayPerStep,
  driveOmega,
  envelopeAlpha,
  wrapPhase,
} from './physics';

type Locs = Record<string, WebGLUniformLocation | null>;

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  src: string,
  tag: string
): WebGLShader | null {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error(`[chladni] ${tag}: ${gl.getShaderInfoLog(sh)}`);
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function program(
  gl: WebGL2RenderingContext,
  frag: string,
  tag: string,
  vert: string = VERT
): WebGLProgram | null {
  const vs = compile(gl, gl.VERTEX_SHADER, vert, `${tag}.vs`);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag, `${tag}.fs`);
  if (!vs || !fs) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error(`[chladni] ${tag} link: ${gl.getProgramInfoLog(p)}`);
    return null;
  }
  return p;
}

export function locsOf(
  gl: WebGL2RenderingContext,
  p: WebGLProgram,
  names: string[]
): Locs {
  const out: Locs = {};
  for (const n of names) out[n] = gl.getUniformLocation(p, n);
  return out;
}

export function mkTexFrom(
  gl: WebGL2RenderingContext,
  src: HTMLCanvasElement
): WebGLTexture {
  const tx = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tx;
}

interface Palette {
  bg: [number, number, number];
  plate: [number, number, number];
  edge: [number, number, number];
  sand: [number, number, number];
}

const TINTS: Palette[] = [
  // Slate: a dark plate with bright sand. This is a luminance-headroom
  // decision as much as a taste one — the plate's shimmer is additive and
  // needs somewhere to climb.
  {
    bg: [0.05, 0.05, 0.06],
    plate: [0.16, 0.17, 0.2],
    edge: [0.3, 0.32, 0.36],
    sand: [0.95, 0.93, 0.86],
  },
  {
    bg: [0.07, 0.04, 0.03],
    plate: [0.2, 0.11, 0.07],
    edge: [0.45, 0.24, 0.12],
    sand: [1.0, 0.86, 0.62],
  },
  {
    bg: [0.04, 0.03, 0.03],
    plate: [0.1, 0.09, 0.09],
    edge: [0.24, 0.22, 0.21],
    sand: [1.0, 0.37, 0.12],
  },
];

export class ChladniPlateAnimation extends PixiAnimation<typeof MANIFEST> {
  protected canvas: HTMLCanvasElement | null = null;
  protected gl: WebGL2RenderingContext | null = null;
  protected dispProg: WebGLProgram | null = null;
  protected lapProg: WebGLProgram | null = null;
  protected stepProg: WebGLProgram | null = null;
  protected dispL: Locs = {};
  protected lapL: Locs = {};
  protected stepL: Locs = {};

  /** Plate field pair: .x = w, .y = w one step ago, .z = envelope. */
  protected wTex: (WebGLTexture | null)[] = [];
  protected wFb: (WebGLFramebuffer | null)[] = [];
  protected wi = 0;
  /** Intermediate grad^2 w. Not ping-ponged: it is rebuilt every substep. */
  protected lTex: WebGLTexture | null = null;
  protected lFb: WebGLFramebuffer | null = null;
  /** Stand-in density until the grain pass lands; one black pixel. */
  protected densTx: WebGLTexture | null = null;
  /** Driver positions, flattened, one per connected region of the plate. */
  protected drivers = new Float32Array(16);
  protected driverN = 1;
  /** 32F needs both the render-target extension and linear filtering of it. */
  protected float32Ok = false;

  protected acc = 0;
  protected phase = 0;
  protected preroll = 0;
  protected primed = false;
  protected maskTx: WebGLTexture | null = null;
  protected maskKind = -1;
  protected failed = false;

  protected sprite: PIXI.Sprite | null = null;
  protected texture: PIXI.Texture | null = null;

  constructor(initialControls?: Partial<ChladniPlateControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.maskKind = -1;
    this.acc = 0;
    this.phase = 0;
    this.preroll = 0;
    this.primed = false;
    this.wi = 0;
  }

  /**
   * RGBA32F where the driver allows it, RGBA16F otherwise. The biharmonic is
   * a difference of differences, so half-float may be too coarse to hold it;
   * if 16F shows grid-scale noise in the field, that is a finding to report,
   * not something to hide behind extra damping.
   */
  protected mkFloatTex(gl: WebGL2RenderingContext, n: number): WebGLTexture {
    const tx = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tx);
    if (this.float32Ok) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32F,
        n,
        n,
        0,
        gl.RGBA,
        gl.FLOAT,
        null
      );
    } else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        n,
        n,
        0,
        gl.RGBA,
        gl.HALF_FLOAT,
        null
      );
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tx;
  }

  protected mkFb(
    gl: WebGL2RenderingContext,
    tx: WebGLTexture
  ): WebGLFramebuffer {
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      tx,
      0
    );
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fb;
  }

  /** One black pixel, so the step pass has a density texture before the grains exist. */
  protected mkBlankDensity(gl: WebGL2RenderingContext): WebGLTexture {
    const tx = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255])
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tx;
  }

  /** Build the context and the programs. False means stop retrying. */
  protected build(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      premultipliedAlpha: true,
    });
    if (!gl) return false;
    // The plate field is a float render target. Without it there is no
    // simulation to run at all, so fail once and never retry.
    if (!gl.getExtension('EXT_color_buffer_float')) return false;

    const dispProg = program(gl, DISPLAY_FS, 'disp');
    const lapProg = program(gl, LAPLACIAN_FS, 'lap');
    const stepProg = program(gl, STEP_FS, 'step');
    if (!dispProg || !lapProg || !stepProg) return false;

    this.canvas = canvas;
    this.gl = gl;
    this.float32Ok = !!gl.getExtension('OES_texture_float_linear');
    this.dispProg = dispProg;
    this.lapProg = lapProg;
    this.stepProg = stepProg;
    this.dispL = locsOf(gl, dispProg, DISPLAY_UNIFORMS);
    this.lapL = locsOf(gl, lapProg, LAPLACIAN_UNIFORMS);
    this.stepL = locsOf(gl, stepProg, STEP_UNIFORMS);

    this.wTex = [this.mkFloatTex(gl, GRID), this.mkFloatTex(gl, GRID)];
    this.wFb = [this.mkFb(gl, this.wTex[0]!), this.mkFb(gl, this.wTex[1]!)];
    this.lTex = this.mkFloatTex(gl, GRID);
    this.lFb = this.mkFb(gl, this.lTex);
    this.densTx = this.mkBlankDensity(gl);
    return true;
  }

  /**
   * (Re)upload the boundary mask when the plate shape changes.
   *
   * Deliberately not a `resetsAnimation` control: BaseAnimation.reset merges
   * the changed control with manifest DEFAULTS, so declaring it there would
   * throw away every other control the user had tuned just to change shape.
   */
  protected ensureMask(kind: number): void {
    if (kind === this.maskKind) return;
    const gl = this.gl!;
    if (this.maskTx) gl.deleteTexture(this.maskTx);
    this.maskTx = mkTexFrom(gl, boundaryCanvas(kind as 0 | 1 | 2));
    this.maskKind = kind;

    const pts = driverPoints(kind as 0 | 1 | 2);
    this.driverN = Math.max(1, pts.length);
    this.drivers.fill(0);
    pts.forEach(([x, y], i) => {
      this.drivers[i * 2] = x;
      this.drivers[i * 2 + 1] = y;
    });

    // A mode shape from the old boundary means nothing under the new one, so
    // clear the field and run the plate back up rather than carrying it over.
    for (const fb of this.wFb) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.wi = 0;
    this.primed = false;
  }

  /**
   * The plate's rect in screen uv: centred, square, 82% of the short edge.
   * The plate is an object in the scene, so it keeps its own proportions
   * regardless of how the stage is shaped.
   */
  protected plateRect(w: number, h: number): [number, number, number, number] {
    const s = (Math.min(w, h) * 0.82) / 2;
    return [0.5, 0.5, s / w, s / h];
  }

  onUpdate(
    app: PIXI.Application,
    controls: ChladniPlateControlValues,
    deltaTime: number
  ): void {
    if (this.failed) return;
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

    const sw = app.screen.width;
    const sh = app.screen.height;
    const dpr = this.dpr ?? Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(2, Math.round(sw * dpr));
    const H = Math.max(2, Math.round(sh * dpr));
    if (this.canvas!.width !== W || this.canvas!.height !== H) {
      this.canvas!.width = W;
      this.canvas!.height = H;
      this.texture?.source.resize(W, H);
    }
    this.sprite.width = sw;
    this.sprite.height = sh;

    this.ensureMask(Number(controls.boundary));

    const pal = TINTS[Math.min(TINTS.length - 1, Number(controls.tint))];
    const rect = this.plateRect(W, H);
    const dt = Math.min(0.05, deltaTime);

    const bindTex = (unit: number, tx: WebGLTexture | null) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tx);
    };

    const beta = clampStiffness(Number(controls.stiffness));
    const decay = decayPerStep(Number(controls.ringTime));
    // The cursor takes this over in a later task; a fixed mid-band tone for now.
    const omega = driveOmega(0.5);
    const envA = envelopeAlpha(omega);

    const doStep = () => {
      // The phase is integrated rather than read off a clock. This forcing is
      // coherent: a discontinuity would be an impulse ringing every mode at
      // once, unlike caustics-pool's noise gusts where a seam is just a
      // change of weather.
      this.phase = wrapPhase(this.phase + omega);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.lFb);
      gl.viewport(0, 0, GRID, GRID);
      gl.useProgram(this.lapProg);
      bindTex(0, this.wTex[this.wi]);
      bindTex(1, this.maskTx);
      gl.uniform1i(this.lapL.uW!, 0);
      gl.uniform1i(this.lapL.uMask!, 1);
      gl.uniform2f(this.lapL.uGrid!, GRID, GRID);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.wFb[1 - this.wi]);
      gl.viewport(0, 0, GRID, GRID);
      gl.useProgram(this.stepProg);
      bindTex(0, this.wTex[this.wi]);
      bindTex(1, this.lTex);
      bindTex(2, this.maskTx);
      bindTex(3, this.densTx);
      gl.uniform1i(this.stepL.uW!, 0);
      gl.uniform1i(this.stepL.uL!, 1);
      gl.uniform1i(this.stepL.uMask!, 2);
      gl.uniform1i(this.stepL.uDens!, 3);
      gl.uniform2f(this.stepL.uGrid!, GRID, GRID);
      gl.uniform1f(this.stepL.uBeta!, beta);
      gl.uniform1f(this.stepL.uDecay!, decay);
      gl.uniform1f(this.stepL.uLoad!, Number(controls.load));
      gl.uniform1f(this.stepL.uDrive!, Number(controls.drive));
      gl.uniform1f(this.stepL.uPhase!, this.phase);
      gl.uniform1f(this.stepL.uEnvA!, envA);
      gl.uniform1f(this.stepL.uDriveR!, 2.5);
      gl.uniform2fv(this.stepL['uDriveP[0]']!, this.drivers);
      gl.uniform1i(this.stepL.uDriveN!, this.driverN);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.wi = 1 - this.wi;
    };

    // Open on a plate that is already ringing. The envelope's time constant
    // is three drive periods, so a shorter pre-roll hands the grains a
    // half-built field.
    if (!this.primed) {
      this.primed = true;
      this.preroll = 2400;
    }
    // Spread the pre-roll over a few frames. All 2400 steps in one frame is
    // 4800 draws and a visible hitch on load; 600 a frame clears it in four.
    let budget = Math.min(this.preroll, 600);
    this.preroll -= budget;
    while (budget-- > 0) doStep();

    // Fixed step: the biharmonic stencil is only conditionally stable and a
    // variable dt detonates it. Capped at 30 steps so a stall cannot spiral.
    this.acc = Math.min(this.acc + dt, 30 * STEP);
    while (this.acc >= STEP) {
      this.acc -= STEP;
      doStep();
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.dispProg);
    bindTex(0, this.maskTx);
    bindTex(1, this.wTex[this.wi]);
    gl.uniform1i(this.dispL.uMask!, 0);
    gl.uniform1i(this.dispL.uW!, 1);
    gl.uniform1f(this.dispL.uShow!, 6.0);
    gl.uniform1f(this.dispL.uView!, Number(controls.view));
    gl.uniform2f(this.dispL.uRes!, W, H);
    gl.uniform3fv(this.dispL.uBg!, pal.bg);
    gl.uniform3fv(this.dispL.uPlate!, pal.plate);
    gl.uniform3fv(this.dispL.uEdge!, pal.edge);
    gl.uniform4fv(this.dispL.uRect!, rect);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.texture?.source.update();
  }

  onDestroy(): void {
    const gl = this.gl;
    if (gl) {
      if (this.maskTx) gl.deleteTexture(this.maskTx);
      for (const t of this.wTex) if (t) gl.deleteTexture(t);
      for (const f of this.wFb) if (f) gl.deleteFramebuffer(f);
      if (this.lTex) gl.deleteTexture(this.lTex);
      if (this.lFb) gl.deleteFramebuffer(this.lFb);
      if (this.densTx) gl.deleteTexture(this.densTx);
      if (this.dispProg) gl.deleteProgram(this.dispProg);
      if (this.lapProg) gl.deleteProgram(this.lapProg);
      if (this.stepProg) gl.deleteProgram(this.stepProg);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.maskTx = null;
    this.maskKind = -1;
    this.wTex = [];
    this.wFb = [];
    this.lTex = null;
    this.lFb = null;
    this.densTx = null;
    this.wi = 0;
    this.acc = 0;
    this.phase = 0;
    this.preroll = 0;
    this.primed = false;
    this.dispProg = null;
    this.lapProg = null;
    this.stepProg = null;
    this.dispL = {};
    this.lapL = {};
    this.stepL = {};
    this.gl = null;
    this.canvas = null;
    this.failed = false;
    this.sprite = null;
    this.texture?.destroy(true);
    this.texture = null;
    super.onDestroy();
  }
}

export function createChladniPlateAnimation(
  initialControls?: Partial<ChladniPlateControlValues>
): ChladniPlateAnimation {
  return new ChladniPlateAnimation(initialControls);
}
