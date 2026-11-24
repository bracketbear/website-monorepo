import * as PIXI from 'pixi.js';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { logoMask, VERT } from '../shared/shader-harness';
import { identity3, roll3, type Mat3 } from '../shared/mat3';
import { MANIFEST, type SandboxControlValues } from './manifest';
import {
  STEP_FS,
  SPLAT_FS,
  DISPLAY_FS,
  STEP_UNIFORMS,
  SPLAT_UNIFORMS,
  DISP_UNIFORMS,
  PALETTES,
} from './shaders';
import {
  DEFAULT_PARAMS,
  DEPTH0,
  STEP,
  MAX_STEPS_PER_FRAME,
  clampCreep,
  windDir,
  gustAt,
  plowRatio,
  castleRatio,
  seedNoise,
} from './physics';

type Locs = Record<string, WebGLUniformLocation | null>;

/**
 * Total simulation cells, held roughly constant so the cost does not move
 * with the canvas. Same budget as the pool and the table: a portrait lab
 * canvas lands near 302x488, which puts a fingertip at five cells and a
 * ripple at nine.
 */
const CELL_BUDGET = 147456;

/**
 * Steps run before the first visible frame, and how many per frame while
 * that is happening. The box has to open on sand the wind has already
 * been at — ripples formed, a few gusts' worth of drift — which takes
 * about forty seconds of simulation. Spread over eight frames so it reads
 * as the page settling rather than a hitch.
 *
 * Primed by running the real wind, never by stamping ripples in: stamped
 * ripples are a grating, and a grating is exactly what the instability
 * does not produce.
 */
const PREROLL_STEPS = 2400;
const PREROLL_PER_FRAME = 300;

/** The fingertip, in cells. A finger and a half on a metre box. */
const FINGER_CELLS = 7;

/** The bucket, as a fraction of the box height, and how tall it stamps. */
const BUCKET_R = 0.05;
const BUCKET_H = 0.035;

/** The ball's radius in world units, and how far it sinks into the sand. */
const BALL_R = 0.072;

interface Splat {
  x: number;
  y: number;
  /** Radius in cells. */
  rad: number;
  amp: number;
  ratio: number;
  dirx: number;
  diry: number;
  bias: number;
  moist: number;
  shape: 0 | 1;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Smoothed surface height under it, and the slope it rides. */
  h: number;
  gx: number;
  gy: number;
  spin: number;
  M: Mat3;
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
    console.error(`sandbox ${tag}: ${gl.getShaderInfoLog(sh)}`);
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
  const vs = compile(gl, gl.VERTEX_SHADER, VERT, tag);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag, tag);
  if (!vs || !fs) return null;
  const p = gl.createProgram();
  if (!p) return null;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error(`sandbox link ${tag}: ${gl.getProgramInfoLog(p)}`);
    return null;
  }
  return p;
}

function locsOf(
  gl: WebGL2RenderingContext,
  prog: WebGLProgram,
  names: readonly string[]
): Locs {
  const L: Locs = {};
  gl.useProgram(prog);
  for (const n of names) L[n] = gl.getUniformLocation(prog, n);
  return L;
}

function mkTexFrom(
  gl: WebGL2RenderingContext,
  srcCv: HTMLCanvasElement
): WebGLTexture {
  const tx = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCv);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tx;
}

/**
 * A box of sand: one float field integrated on the GPU, a beach ball on
 * the CPU that reads it back and writes into it, and a display pass that
 * derives the light from the same field.
 *
 * Three programs and owned ping-pong plumbing rather than the shared
 * `PingPong` pair, for the same reasons as the pool: the tools blend onto
 * the live texture between steps, and the ball reads the live framebuffer.
 */
export class SandboxAnimation extends PixiAnimation<typeof MANIFEST> {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private stepProg: WebGLProgram | null = null;
  private splatProg: WebGLProgram | null = null;
  private dispProg: WebGLProgram | null = null;
  private stepL: Locs = {};
  private splatL: Locs = {};
  private dispL: Locs = {};
  private logoTx: WebGLTexture | null = null;
  private failed = false;

  /** Height-and-moisture pair. */
  private hTex: (WebGLTexture | null)[] = [];
  private hFb: (WebGLFramebuffer | null)[] = [];
  private hi = 0;
  private sw = 0;
  private simH = 0;

  /** Which readPixels format the driver will give us, probed once. */
  private readMode: 'float' | 'none' | null = null;
  private readBuf: Float32Array | null = null;
  private readBufN = 0;

  private sprite: PIXI.Sprite | null = null;
  private texture: PIXI.Texture | null = null;

  private time = 0;
  private acc = 0;
  /** Forcing clock, advanced per simulation step and wrapped. Never wall time. */
  private clock = 0;
  private preroll = 0;
  private mx = -1;
  private my = -1;
  /** Cursor velocity in uv/s, the collider's own momentum. */
  private cvx = 0;
  private cvy = 0;
  /**
   * Sand height under the finger, read back each frame the way the ball's
   * is. What the finger may lift is bounded by it: near the floor it digs
   * less, at the floor it scrapes plastic. Without that the removal clamps
   * at zero while the ring still lands, and the box makes sand.
   */
  private fingerH = DEPTH0;
  /** Least sand under the ball's rut, read with its slope. */
  private ballMin = DEPTH0;
  private pending: Splat[] = [];
  private ball: Ball = {
    x: 0.5,
    y: 0.5,
    vx: 0,
    vy: 0,
    h: DEPTH0,
    gx: 0,
    gy: 0,
    spin: 0,
    M: identity3(),
  };
  private plowK = plowRatio(FINGER_CELLS);

  constructor(initialControls?: Partial<SandboxControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.time = 0;
    this.acc = 0;
    this.clock = 0;
    this.preroll = 0;
    this.mx = -1;
    this.my = -1;
    this.cvx = 0;
    this.cvy = 0;
    this.fingerH = DEPTH0;
    this.ballMin = DEPTH0;
    this.pending = [];
    this.ball = {
      x: 0.36,
      y: 0.6,
      vx: 0,
      vy: 0,
      h: DEPTH0,
      gx: 0,
      gy: 0,
      spin: 0,
      M: identity3(),
    };
  }

  /** Build the context and the three programs. False means stop retrying. */
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
    // The field is a float render target; without this there is no sand.
    if (!gl.getExtension('EXT_color_buffer_float')) return false;

    const stepProg = program(gl, STEP_FS, 'step');
    const splatProg = program(gl, SPLAT_FS, 'splat');
    const dispProg = program(gl, DISPLAY_FS, 'disp');
    if (!stepProg || !splatProg || !dispProg) return false;

    this.canvas = canvas;
    this.gl = gl;
    this.stepProg = stepProg;
    this.splatProg = splatProg;
    this.dispProg = dispProg;
    this.stepL = locsOf(gl, stepProg, STEP_UNIFORMS);
    this.splatL = locsOf(gl, splatProg, SPLAT_UNIFORMS);
    this.dispL = locsOf(gl, dispProg, DISP_UNIFORMS);
    this.logoTx = mkTexFrom(gl, logoMask());
    return true;
  }

  /**
   * (Re)build the field so cells stay square on screen and the cell count
   * holds near the budget. The fresh field is filled with the opening
   * depth plus the seed roughness, then primed by running the wind.
   */
  private ensureSim(W: number, H: number): void {
    const asp = W / Math.max(1, H);
    let sh = Math.round(Math.sqrt(CELL_BUDGET / asp));
    sh = Math.max(96, Math.min(640, sh));
    const sw = Math.max(96, Math.min(1024, Math.round(sh * asp)));
    if (this.sw === sw && this.simH === sh) return;
    const gl = this.gl!;
    for (const t of this.hTex) if (t) gl.deleteTexture(t);
    for (const f of this.hFb) if (f) gl.deleteFramebuffer(f);
    this.sw = sw;
    this.simH = sh;
    const seed = new Float32Array(sw * sh * 4);
    for (let y = 0; y < sh; y++)
      for (let x = 0; x < sw; x++) {
        const i = (y * sw + x) * 4;
        seed[i] = DEPTH0 + seedNoise(x, y);
        seed[i + 3] = 1;
      }
    const mkT = (data: Float32Array | null) => {
      const tx = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32F,
        sw,
        sh,
        0,
        gl.RGBA,
        gl.FLOAT,
        data
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tx;
    };
    const mkFb = (tx: WebGLTexture) => {
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
    };
    this.hTex = [mkT(seed), mkT(null)];
    this.hFb = [mkFb(this.hTex[0]!), mkFb(this.hTex[1]!)];
    this.hi = 0;
    // Readback format is a property of the attachment, so re-probe it.
    this.readMode = null;
    this.preroll = PREROLL_STEPS;
    this.clock = 0;
  }

  /**
   * Height and central-difference gradient at a point, and the least
   * height in a window of half-width `half` cells about it, read straight
   * out of the live framebuffer. This readback is what couples the GPU
   * sand to the CPU: the ball rides the gradient, and every tool bounds
   * what it may lift by the least sand under its footprint, so nothing is
   * ever removed that is not there. Returns null once the driver has
   * proven it will not hand back floats; the ball then sits still, the
   * tools assume a full box, and the scene still runs.
   */
  private readSample(
    u: number,
    v: number,
    half = 1
  ): [number, number, number, number] | null {
    const gl = this.gl!;
    if (this.readMode === 'none') return null;
    const n = Math.max(1, Math.ceil(half));
    const px = Math.max(n, Math.min(this.sw - 1 - n, Math.round(u * this.sw)));
    const py = Math.max(
      n,
      Math.min(this.simH - 1 - n, Math.round(v * this.simH))
    );
    const side = 2 * n + 1;
    try {
      if (this.readMode === null) {
        const t = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);
        const f = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT);
        this.readMode = f === gl.RGBA && t === gl.FLOAT ? 'float' : 'none';
        if (this.readMode === 'none') return null;
      }
      if (!this.readBuf || this.readBufN < side * side * 4) {
        this.readBuf = new Float32Array(side * side * 4);
        this.readBufN = side * side * 4;
      }
      const b = this.readBuf;
      gl.readPixels(px - n, py - n, side, side, gl.RGBA, gl.FLOAT, b);
      const at = (x: number, y: number) => b[(y * side + x) * 4];
      const h = at(n, n);
      if (!isFinite(h)) return null;
      let mn = Infinity;
      for (let i = 0; i < side * side; i++) mn = Math.min(mn, b[i * 4]);
      return [
        h,
        (at(n + 1, n) - at(n - 1, n)) * 0.5,
        (at(n, n + 1) - at(n, n - 1)) * 0.5,
        mn,
      ];
    } catch {
      this.readMode = 'none';
      return null;
    }
  }

  private applySplats(splats: readonly Splat[]): void {
    if (!splats.length) return;
    const gl = this.gl!;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.blendEquation(gl.FUNC_ADD);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.hFb[this.hi]);
    gl.viewport(0, 0, this.sw, this.simH);
    gl.useProgram(this.splatProg);
    gl.uniform2f(this.splatL.uSim!, this.sw, this.simH);
    for (const e of splats) {
      gl.uniform2f(this.splatL.uC!, e.x, e.y);
      gl.uniform2f(this.splatL.uDir!, e.dirx, e.diry);
      gl.uniform1f(this.splatL.uAmp!, e.amp);
      gl.uniform1f(this.splatL.uRad!, e.rad);
      gl.uniform1f(this.splatL.uRatio!, e.ratio);
      gl.uniform1f(this.splatL.uBias!, e.bias);
      gl.uniform1f(this.splatL.uMoist!, e.moist);
      gl.uniform1f(this.splatL.uShape!, e.shape);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.disable(gl.BLEND);
  }

  onUpdate(
    app: PIXI.Application,
    controls: SandboxControlValues,
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

    this.time += dt;

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
    this.ensureSim(W, H);

    const interactive = Number(controls.mode) > 0.5;
    const ballOn = Number(controls.ball) > 0.5;
    const asp = sw / Math.max(1, sh);
    const dx = 1 / this.simH;
    const dig = Number(controls.dig);
    const splats = this.pending.splice(0);

    // Parameters this frame, in the mirror's own terms so the wind on the
    // CPU (for the ball) is the wind on the GPU (for the sand).
    const p = {
      ...DEFAULT_PARAMS,
      dx,
      asp,
      hop: Number(controls.hop),
      gust: Number(controls.wind),
      reposeDry: Math.tan((Number(controls.repose) * Math.PI) / 180),
      dryTau: Number(controls.dry),
      t: this.clock,
    };

    // ---- the finger
    const pointer = this.pointer;
    const mouse = pointer?.mouse;
    if (interactive && mouse?.active) {
      const mx = mouse.x / sw;
      const my = 1 - mouse.y / sh;
      if (this.mx >= 0 && dt > 0) {
        this.cvx = this.cvx * 0.5 + ((mx - this.mx) / dt) * 0.5;
        this.cvy = this.cvy * 0.5 + ((my - this.my) / dt) * 0.5;
        const ddx = (mx - this.mx) * asp;
        const ddy = my - this.my;
        const dist = Math.hypot(ddx, ddy);
        if (dist > 0.0008) {
          // Stamp along the drag so a fast sweep cuts a continuous furrow.
          // The stamp spacing is half a fingertip, and each stamp moves the
          // same volume, so the furrow's depth is set by the finger, not
          // by how fast it went — a finger held still digs nothing.
          const spacing = (FINGER_CELLS * 0.5) / this.simH;
          const steps = Math.min(40, Math.max(1, Math.ceil(dist / spacing)));
          const dirx = ddx / dist;
          const diry = ddy / dist;
          // A stroke's stamps overlap about 3.5 deep, so a quarter of what
          // is under the finger is the most one stamp may take.
          const amp = Math.min(
            0.0025 * dig * Math.min(1, dist / spacing / steps),
            Math.max(0, this.fingerH - 0.001) * 0.25
          );
          for (let i = 1; i <= steps && amp > 0; i++) {
            const t = i / steps;
            splats.push({
              x: this.mx + (mx - this.mx) * t,
              y: this.my + (my - this.my) * t,
              rad: FINGER_CELLS,
              amp,
              ratio: this.plowK,
              dirx,
              diry,
              // Nothing lands behind the finger. With a fifth of the ring
              // aft, the next stamp's deposit fell into the last stamp's
              // hole and a scrubbed pit could never reach the floor; with
              // the deposit all ahead and beside, sand is carried to the
              // end of the stroke, which is what a plow does.
              bias: 1.0,
              moist: 0.9,
              shape: 0,
            });
          }
        }
      }
      this.mx = mx;
      this.my = my;
    } else {
      this.mx = -1;
      this.cvx = 0;
      this.cvy = 0;
    }

    // ---- the bucket, or a shove
    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        if (!interactive) continue;
        const cx = c.x / sw;
        const cy = 1 - c.y / sh;
        const B = this.ball;
        const bdx = (B.x - cx) * asp;
        const bdy = B.y - cy;
        const bd = Math.hypot(bdx, bdy);
        if (ballOn && bd < BALL_R + 0.05) {
          const f = 0.03 / Math.max(bd, 0.04);
          B.vx += ((bdx / Math.max(bd, 1e-4)) * f) / asp;
          B.vy += (bdy / Math.max(bd, 1e-4)) * f;
          B.spin += (Math.random() - 0.5) * 3;
          continue;
        }
        const rad = BUCKET_R * this.simH;
        const ratio = castleRatio(rad);
        // A bucket is filled from the sand that is there: the least sand
        // under the moat bounds the turret. Over thin sand the castle
        // shrinks; on the bare floor there is nothing to stamp.
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.hFb[this.hi]);
        const win = this.readSample(cx, cy, 2.15 * rad + 1);
        const least = win ? win[3] : DEPTH0;
        const hgt = Math.min(BUCKET_H, Math.max(0, least - 0.002) / ratio);
        if (hgt <= 0) continue;
        splats.push({
          x: cx,
          y: cy,
          rad,
          amp: hgt,
          ratio,
          dirx: 1,
          diry: 0,
          bias: 0,
          moist: 1,
          shape: 1,
        });
      }
    }

    // ---- the ball writes into the sand as it goes
    const B = this.ball;
    if (ballOn && dt > 0) {
      const sp = Math.hypot(B.vx * asp, B.vy);
      if (sp > 0.006) {
        const rad = Math.max(2.5, BALL_R * 0.55 * this.simH);
        // An inflatable is light: its rut is a shallow mark, not a trench.
        // Bounded by the least sand under it like the finger, so a ball
        // rolling over bare floor moves nothing.
        splats.push({
          x: B.x,
          y: B.y,
          rad,
          amp: Math.min(
            Math.min(0.00005, sp * 0.001) * dt * 60,
            Math.max(0, this.ballMin - 0.001) * 0.25
          ),
          ratio: plowRatio(rad),
          dirx: (B.vx * asp) / sp,
          diry: B.vy / sp,
          // Half ahead, half beside: it rides over sand more than it plows
          // it. And it barely turns the sand, so the rut stays dry and
          // slumps at the dry angle rather than standing as a damp mound.
          bias: 0.5,
          moist: 0.08 * dt * 60,
          shape: 0,
        });
      }
    }

    this.applySplats(splats);

    const bindTex = (unit: number, tx: WebGLTexture | null) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tx);
    };

    const doStep = () => {
      // The clock advances per step, never per frame: handing every substep
      // the same wall time applies one frozen gust field up to three times
      // in a row, which makes the wind a function of the refresh rate.
      this.clock = (this.clock + STEP) % 4096;
      p.t = this.clock;
      const dir = windDir(this.clock, p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.hFb[1 - this.hi]);
      gl.viewport(0, 0, this.sw, this.simH);
      gl.useProgram(this.stepProg);
      bindTex(0, this.hTex[this.hi]);
      gl.uniform1i(this.stepL.uH!, 0);
      gl.uniform2f(this.stepL.uSim!, this.sw, this.simH);
      gl.uniform2f(this.stepL.uDir!, dir[0], dir[1]);
      gl.uniform1f(this.stepL.uDx!, dx);
      gl.uniform1f(this.stepL.uAsp!, asp);
      gl.uniform1f(this.stepL.uQ!, p.Q);
      gl.uniform1f(this.stepL.uC!, p.c);
      gl.uniform1f(this.stepL.uBeta!, p.beta);
      gl.uniform1f(this.stepL.uCap!, p.cap);
      gl.uniform1f(this.stepL.uHop!, p.hop);
      gl.uniform1f(this.stepL.uGust!, p.gust);
      gl.uniform1f(this.stepL.uClock!, this.clock);
      gl.uniform1f(this.stepL.uCreep!, clampCreep(p.creep));
      gl.uniform1f(this.stepL.uReposeDry!, p.reposeDry);
      gl.uniform1f(this.stepL.uReposeWet!, p.reposeWet);
      gl.uniform1f(this.stepL.uReposeRate!, p.reposeRate);
      gl.uniform1f(this.stepL.uDryMul!, Math.exp(-STEP / p.dryTau));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.hi = 1 - this.hi;
    };

    // The pre-roll runs outside the accumulator on purpose: the cap below
    // would eat all but three of its steps.
    let pre = PREROLL_PER_FRAME;
    while (this.preroll > 0 && pre-- > 0) {
      this.preroll--;
      doStep();
    }

    // Fixed-step integration, capped so a stall cannot spiral.
    this.acc = Math.min(this.acc + dt, MAX_STEPS_PER_FRAME * STEP);
    while (this.acc >= STEP) {
      this.acc -= STEP;
      doStep();
    }

    // ---- the finger reads the sand under it, for next frame's stamps
    // The window is the fingertip; stamps laid along a fast sweep beyond it
    // are bounded by sand the finger has not read yet, which is the one
    // place a little sand can still appear. A sweep would have to cross a
    // pit between two frames for it to happen.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.hFb[this.hi]);
    if (interactive && this.mx >= 0) {
      const fs = this.readSample(this.mx, this.my, FINGER_CELLS);
      if (fs) this.fingerH = fs[3];
    } else {
      this.fingerH = DEPTH0;
    }

    // ---- the ball reads the sand and rides it
    if (ballOn) {
      const smp = this.readSample(B.x, B.y, BALL_R * 0.55 * this.simH);
      if (smp) {
        // Low-pass the probe so the ball has mass: it follows the slope of
        // the hollow it is in, not the grain of the ripple under it.
        B.h = B.h * 0.8 + smp[0] * 0.2;
        B.gx = B.gx * 0.7 + (smp[1] / dx) * 0.3;
        B.gy = B.gy * 0.7 + (smp[2] / dx) * 0.3;
        this.ballMin = smp[3];
      }
      // Gravity along the surface. The gradient is a true slope in world
      // units, so KF is an acceleration: a 33-degree face is 0.65 of it.
      const KF = 0.9;
      let ax = -B.gx * KF;
      let ay = -B.gy * KF;
      // Gusts. An inflatable is light: the strongest quarter of the wind
      // rolls it, and the rest does nothing — which is why it goes in
      // bursts and then sits. This is the loop running with nobody there.
      const dir = windDir(this.clock, p);
      const w = gustAt(B.x, B.y, dir, p);
      const push = Math.max(0, w - 0.8 * p.gust) * 0.6;
      ax += dir[0] * push;
      ay += dir[1] * push;
      // Rolling resistance in sand is high, and it has a static part: a
      // ball sitting in a hollow does not creep down a two-degree slope.
      const sp = Math.hypot(B.vx * asp, B.vy);
      const am = Math.hypot(ax, ay);
      if (sp < 0.004 && am < 0.07) {
        B.vx = 0;
        B.vy = 0;
      } else {
        B.vx += (ax / asp) * dt;
        B.vy += ay * dt;
        const mul = Math.exp(-dt * 2.4);
        B.vx *= mul;
        B.vy *= mul;
      }
      const spMax = 0.6;
      const sp2 = Math.hypot(B.vx * asp, B.vy);
      if (sp2 > spMax) {
        B.vx *= spMax / sp2;
        B.vy *= spMax / sp2;
      }
      B.x += B.vx * dt;
      B.y += B.vy * dt;
      // The cursor is a solid collider: the ball bounces off it and picks
      // up its speed.
      if (interactive && this.mx >= 0) {
        const cr = 0.02;
        const ddx = (B.x - this.mx) * asp;
        const ddy = B.y - this.my;
        const d = Math.hypot(ddx, ddy);
        const rs = BALL_R + cr;
        if (d < rs && d > 1e-5) {
          const nx = ddx / d;
          const ny = ddy / d;
          B.x += (nx * (rs - d)) / asp;
          B.y += ny * (rs - d);
          const cvxs = this.cvx * asp;
          const cvys = this.cvy;
          const rvn = (B.vx * asp - cvxs) * nx + (B.vy - cvys) * ny;
          if (rvn < 0) {
            const imp = -1.4 * rvn; // e = 0.4: sand takes the bounce out
            B.vx += (imp * nx) / asp;
            B.vy += imp * ny;
          }
          const tx2 = -ny;
          const ty2 = nx;
          const rvt = (B.vx * asp - cvxs) * tx2 + (B.vy - cvys) * ty2;
          B.spin += (rvt / BALL_R) * 0.3;
        }
      }
      const rx = BALL_R / asp + 0.01;
      const ry = BALL_R + 0.01;
      if (B.x < rx) {
        B.x = rx;
        B.vx = Math.abs(B.vx) * 0.4;
      }
      if (B.x > 1 - rx) {
        B.x = 1 - rx;
        B.vx = -Math.abs(B.vx) * 0.4;
      }
      if (B.y < ry) {
        B.y = ry;
        B.vy = Math.abs(B.vy) * 0.4;
      }
      if (B.y > 1 - ry) {
        B.y = 1 - ry;
        B.vy = -Math.abs(B.vy) * 0.4;
      }
      B.spin *= Math.exp(-dt * 1.5);
      if (dt > 0) B.M = roll3(B.M, B.vx * asp, B.vy, BALL_R, B.spin, dt);
    }

    // ---- display
    const pal = PALETTES[Math.round(Number(controls.tint))] || PALETTES[0];
    const elev = (Number(controls.sun) * Math.PI) / 180;
    // The sun sits up and to the right of the box, so shadows fall down-left.
    const sunAz = Math.atan2(0.62, 0.55);
    const sunDir = [
      Math.cos(elev) * Math.cos(sunAz),
      Math.cos(elev) * Math.sin(sunAz),
      Math.sin(elev),
    ];
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.dispProg);
    bindTex(0, this.hTex[this.hi]);
    bindTex(2, this.logoTx);
    gl.uniform1i(this.dispL.uH!, 0);
    gl.uniform1i(this.dispL.uLogo!, 2);
    gl.uniform2f(this.dispL.uSim!, this.sw, this.simH);
    gl.uniform2f(this.dispL.uMarkBox!, 0.5, 0.31);
    gl.uniform1f(this.dispL.uDx!, dx);
    gl.uniform1f(this.dispL.uAsp!, asp);
    gl.uniform1f(this.dispL.uTime!, this.time);
    gl.uniform1f(this.dispL.uGlint!, pal.glint);
    gl.uniform1f(this.dispL.uWall!, DEPTH0 + 0.04);
    gl.uniform1f(this.dispL.uExpose!, pal.expose);
    gl.uniform3f(this.dispL.uSunDir!, sunDir[0], sunDir[1], sunDir[2]);
    gl.uniform3f(this.dispL.uSunCol!, pal.sun[0], pal.sun[1], pal.sun[2]);
    gl.uniform3f(this.dispL.uSky!, pal.sky[0], pal.sky[1], pal.sky[2]);
    gl.uniform3f(this.dispL.uSand!, pal.sand[0], pal.sand[1], pal.sand[2]);
    gl.uniform3f(
      this.dispL.uSandWet!,
      pal.sandWet[0],
      pal.sandWet[1],
      pal.sandWet[2]
    );
    gl.uniform3f(this.dispL.uFloor!, pal.floor[0], pal.floor[1], pal.floor[2]);
    gl.uniform3f(this.dispL.uMark!, pal.mark[0], pal.mark[1], pal.mark[2]);
    gl.uniform3f(this.dispL.uBallA!, 1.0, 0.373, 0.122);
    gl.uniform3f(this.dispL.uBallB!, 0.15, 0.42, 0.8);
    // Radius zero is the shader's "no ball" sentinel.
    gl.uniform4f(
      this.dispL.uBall!,
      B.x,
      B.y,
      ballOn ? BALL_R : 0,
      Math.max(0, B.h)
    );
    gl.uniformMatrix3fv(this.dispL.uBallM!, false, B.M);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.texture?.source.update();
  }

  onDestroy(): void {
    const gl = this.gl;
    if (gl) {
      for (const t of this.hTex) if (t) gl.deleteTexture(t);
      for (const f of this.hFb) if (f) gl.deleteFramebuffer(f);
      if (this.logoTx) gl.deleteTexture(this.logoTx);
      if (this.stepProg) gl.deleteProgram(this.stepProg);
      if (this.splatProg) gl.deleteProgram(this.splatProg);
      if (this.dispProg) gl.deleteProgram(this.dispProg);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.hTex = [];
    this.hFb = [];
    this.hi = 0;
    this.sw = 0;
    this.simH = 0;
    this.readMode = null;
    this.readBuf = null;
    this.gl = null;
    this.canvas = null;
    this.stepProg = null;
    this.splatProg = null;
    this.dispProg = null;
    this.stepL = {};
    this.splatL = {};
    this.dispL = {};
    this.logoTx = null;
    this.failed = false;
    this.sprite = null;
    this.texture?.destroy(true);
    this.texture = null;
    super.onDestroy();
  }
}

export function createSandboxAnimation(
  initialControls?: Partial<SandboxControlValues>
): SandboxAnimation {
  return new SandboxAnimation(initialControls);
}
