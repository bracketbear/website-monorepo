import { VERT } from '../shared/shader-harness';

/**
 * The tank's water: a 2D wave field integrated on the GPU, owned separately
 * from the display pass so the jellies can both disturb it and read it back.
 *
 * This is deliberately not `shared/ping-pong.ts`. That helper keeps the live
 * framebuffer private, and this field needs two things it cannot give:
 * extra passes blended onto the live texture between steps (the splats), and
 * CPU readback of the state (the jellies sampling the slope they sit on).
 */

/**
 * State lives in two channels: `.x` is the surface now, `.y` is the surface
 * one step ago. Interference, reflection off the glass and dispersion are all
 * consequences of this stencil — none of them are authored.
 */
const STEP_FS = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uH;   // x = h, y = h_prev
    uniform float uC2, uDamp, uChop, uClock;
    uniform vec2 uSim;
    float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), fr = fract(p);
      vec2 u = fr * fr * (3.0 - 2.0 * fr);
      return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
                 mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    void main() {
      vec2 px = 1.0 / uSim;
      vec2 c = texture(uH, vUV).xy;
      float L = texture(uH, vUV - vec2(px.x, 0.0)).x;
      float Rv = texture(uH, vUV + vec2(px.x, 0.0)).x;
      float B = texture(uH, vUV - vec2(0.0, px.y)).x;
      float T = texture(uH, vUV + vec2(0.0, px.y)).x;
      float lap = L + Rv + B + T - 4.0 * c.x;
      // Convection: a tank is not windy, but it is never still either — the
      // filter turns the column over slowly. This is a force on the field,
      // not a picture of motion, and it runs in both modes so the water is
      // already alive before anyone touches it.
      //
      // Far gentler than an open pool: the point is that the surface has a
      // floor it never falls below, not that it has chop. The drift constant
      // is in NOISE-CELL units — it is subtracted from w, which has already
      // been scaled by the frequency above.
      vec2 w = vUV * vec2(19.0, 15.0) - vec2(uClock * 0.08, uClock * 0.11);
      float conv = vnoise(w) - 0.5;
      // A standing vertical gradient with no clock of its own: the patchiness
      // comes from convection drifting through it, not a second oscillator.
      float band = 0.45 + 0.55 * smoothstep(0.0, 0.8, vUV.y);
      float force = conv * band * uChop * 0.004;
      float nh = (2.0 * c.x - c.y + uC2 * lap + force) * uDamp;
      fragColor = vec4(nh, c.x, 0.0, 1.0);
    }`;

/**
 * Additive gaussian onto the live texture. Writing only `.x` leaves `h_prev`
 * in `.y` untouched, so a disturbance does not corrupt the integrator.
 */
const SPLAT_FS = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform vec2 uC, uSim;
    uniform float uAmp, uRad;
    void main() {
      vec2 d = (vUV - uC) * uSim;
      float a = exp(-dot(d, d) / (uRad * uRad));
      fragColor = vec4(uAmp * a, 0.0, 0.0, 0.0);
    }`;

type Locs = Record<string, WebGLUniformLocation | null>;

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  src: string,
  tag: string
): WebGLShader | null {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(`jelly-tank compile ${tag}:`, gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

function program(
  gl: WebGL2RenderingContext,
  frag: string,
  tag: string
): WebGLProgram | null {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT, tag);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag, tag);
  if (!vs || !fs) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error(`jelly-tank link ${tag}:`, gl.getProgramInfoLog(p));
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

/** Decode an IEEE half into a JS number, for the readPixels probe. */
function h2f(h: number): number {
  const s = h & 0x8000 ? -1 : 1;
  const e = (h >> 10) & 0x1f;
  const m = h & 0x3ff;
  if (e === 0) return s * m * Math.pow(2, -24);
  if (e === 31) return m ? NaN : s * Infinity;
  return s * (1 + m / 1024) * Math.pow(2, e - 15);
}

const STEP_UNIFORMS = [
  'uH',
  'uC2',
  'uDamp',
  'uChop',
  'uClock',
  'uSim',
] as const;
const SPLAT_UNIFORMS = ['uC', 'uAmp', 'uRad', 'uSim'] as const;

/** Simulation rate. The stencil is only conditionally stable at a fixed dt. */
const STEP = 1 / 90;

export interface Splat {
  /** Centre in field uv. */
  x: number;
  y: number;
  amp: number;
  /** Radius in grid cells. */
  rad: number;
}

export class WaterField {
  private gl: WebGL2RenderingContext;
  private stepProg: WebGLProgram;
  private splatProg: WebGLProgram;
  private stepL: Locs;
  private splatL: Locs;

  private hTex: (WebGLTexture | null)[] = [null, null];
  private hFb: (WebGLFramebuffer | null)[] = [null, null];
  private hi = 0;

  private sw = 0;
  private sh = 0;
  private acc = 0;
  /**
   * The forcing clock, advanced inside the step and never from wall time.
   * Handing every substep in a frame the same `t` applies one frozen
   * convection pattern up to three times in a row, which makes the water's
   * liveliness a function of the display refresh rate. Wrapped because
   * hash21's sin() degrades at large coordinates and this runs for hours.
   */
  private clock = 0;
  private preroll = 0;

  /** Which readPixels format the driver will give us, probed once. */
  private readMode: 'float' | 'half' | 'none' | null = null;
  private readBufF: Float32Array | null = null;
  private readBufH: Uint16Array | null = null;

  private constructor(
    gl: WebGL2RenderingContext,
    stepProg: WebGLProgram,
    splatProg: WebGLProgram
  ) {
    this.gl = gl;
    this.stepProg = stepProg;
    this.splatProg = splatProg;
    this.stepL = locsOf(gl, stepProg, STEP_UNIFORMS);
    this.splatL = locsOf(gl, splatProg, SPLAT_UNIFORMS);
  }

  /** Returns null where the driver cannot render to a float target. */
  static create(gl: WebGL2RenderingContext): WaterField | null {
    if (!gl.getExtension('EXT_color_buffer_float')) return null;
    const stepProg = program(gl, STEP_FS, 'step');
    const splatProg = program(gl, SPLAT_FS, 'splat');
    if (!stepProg || !splatProg) return null;
    return new WaterField(gl, stepProg, splatProg);
  }

  get texture(): WebGLTexture | null {
    return this.hTex[this.hi];
  }

  get gridW(): number {
    return this.sw;
  }

  get gridH(): number {
    return this.sh;
  }

  /**
   * (Re)build the buffers so grid cells stay square on screen — anisotropic
   * cells would make ripples propagate faster along one axis. Total cell
   * count is held near 147456 so cost is resolution-stable.
   */
  ensure(W: number, H: number): void {
    const asp = W / Math.max(1, H);
    let sh = Math.round(Math.sqrt(147456 / asp));
    sh = Math.max(96, Math.min(640, sh));
    const sw = Math.max(96, Math.min(1024, Math.round(sh * asp)));
    if (this.sw === sw && this.sh === sh) return;

    const gl = this.gl;
    for (const t of this.hTex) if (t) gl.deleteTexture(t);
    for (const f of this.hFb) if (f) gl.deleteFramebuffer(f);
    this.sw = sw;
    this.sh = sh;

    const mkT = () => {
      const tx = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        sw,
        sh,
        0,
        gl.RGBA,
        gl.HALF_FLOAT,
        null
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      // CLAMP_TO_EDGE is what gives reflection off the tank walls for free.
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
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return fb;
    };
    this.hTex = [mkT(), mkT()];
    this.hFb = [mkFb(this.hTex[0]!), mkFb(this.hTex[1]!)];
    this.hi = 0;
    // Readback format is a property of the attachment, so re-probe it.
    this.readMode = null;
    // The buffers were just cleared, so the tank is a mirror. Run the real
    // convection forward to build a surface rather than seeding impulses —
    // seeded drops ring as big coherent circles, which is not what settled
    // water looks like.
    this.preroll = 240;
  }

  /**
   * Advance the field. Splats are applied to the live texture first so a
   * disturbance made this frame is integrated by the steps that follow it.
   */
  update(dt: number, c2: number, damp: number, chop: number): void {
    const gl = this.gl;
    if (!this.hTex[0]) return;

    const doStep = () => {
      this.clock = (this.clock + STEP) % 4096;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.hFb[1 - this.hi]);
      gl.viewport(0, 0, this.sw, this.sh);
      gl.useProgram(this.stepProg);
      gl.activeTexture(gl.TEXTURE0 + 2);
      gl.bindTexture(gl.TEXTURE_2D, this.hTex[this.hi]);
      gl.uniform1i(this.stepL.uH!, 2);
      gl.uniform1f(this.stepL.uC2!, c2);
      gl.uniform1f(this.stepL.uDamp!, damp);
      gl.uniform1f(this.stepL.uChop!, chop);
      gl.uniform1f(this.stepL.uClock!, this.clock);
      gl.uniform2f(this.stepL.uSim!, this.sw, this.sh);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.hi = 1 - this.hi;
    };

    // The pre-roll runs outside the accumulator on purpose: the cap below
    // would eat all but three of its steps. The forcing clock advances inside
    // doStep, so convection moves across the roll-forward instead of pushing
    // one frozen pattern 240 times and standing a wave up out of it.
    while (this.preroll > 0) {
      this.preroll--;
      doStep();
    }

    // Capped at three steps so a stall cannot spiral.
    this.acc = Math.min(this.acc + dt, 3 * STEP);
    while (this.acc >= STEP) {
      this.acc -= STEP;
      doStep();
    }
  }

  /** Blend gaussian disturbances onto the live texture. */
  applySplats(splats: readonly Splat[]): void {
    if (!splats.length || !this.hTex[0]) return;
    const gl = this.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.blendEquation(gl.FUNC_ADD);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.hFb[this.hi]);
    gl.viewport(0, 0, this.sw, this.sh);
    gl.useProgram(this.splatProg);
    gl.uniform2f(this.splatL.uSim!, this.sw, this.sh);
    for (const e of splats) {
      gl.uniform2f(this.splatL.uC!, e.x, e.y);
      gl.uniform1f(this.splatL.uAmp!, e.amp);
      gl.uniform1f(this.splatL.uRad!, e.rad);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.disable(gl.BLEND);
  }

  /** Bind the live framebuffer so `sample` can read from it. */
  beginSample(): void {
    if (!this.hFb[this.hi]) return;
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.hFb[this.hi]);
  }

  /**
   * Height and its central-difference gradient at a point in field uv, read
   * straight out of the live framebuffer. This 3x3 readback is what couples
   * the GPU water to the CPU jelly physics.
   *
   * The readback format is a property of the attachment and varies by driver,
   * so probe once and cache the verdict. Returns null once the driver has
   * proven it will not hand back a readable format — the jellies then swim on
   * their own and the scene still runs.
   */
  sample(u: number, v: number): [number, number, number] | null {
    const gl = this.gl;
    if (this.readMode === 'none' || !this.hTex[0]) return null;
    const px = Math.max(1, Math.min(this.sw - 2, Math.round(u * this.sw)));
    const py = Math.max(1, Math.min(this.sh - 2, Math.round(v * this.sh)));
    try {
      if (this.readMode === null) {
        const t = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);
        const f = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT);
        this.readMode =
          f === gl.RGBA && t === gl.FLOAT
            ? 'float'
            : f === gl.RGBA && t === gl.HALF_FLOAT
              ? 'half'
              : 'none';
        if (this.readMode === 'none') return null;
      }
      let val: (x: number, y: number) => number;
      if (this.readMode === 'float') {
        if (!this.readBufF) this.readBufF = new Float32Array(36);
        gl.readPixels(px - 1, py - 1, 3, 3, gl.RGBA, gl.FLOAT, this.readBufF);
        const b = this.readBufF;
        val = (x, y) => b[(y * 3 + x) * 4];
      } else {
        if (!this.readBufH) this.readBufH = new Uint16Array(36);
        gl.readPixels(
          px - 1,
          py - 1,
          3,
          3,
          gl.RGBA,
          gl.HALF_FLOAT,
          this.readBufH
        );
        const b = this.readBufH;
        val = (x, y) => h2f(b[(y * 3 + x) * 4]);
      }
      const h = val(1, 1);
      if (!isFinite(h)) return null;
      return [h, (val(2, 1) - val(0, 1)) * 0.5, (val(1, 2) - val(1, 0)) * 0.5];
    } catch {
      this.readMode = 'none';
      return null;
    }
  }

  destroy(): void {
    const gl = this.gl;
    for (const t of this.hTex) if (t) gl.deleteTexture(t);
    for (const f of this.hFb) if (f) gl.deleteFramebuffer(f);
    this.hTex = [null, null];
    this.hFb = [null, null];
    this.sw = 0;
    this.sh = 0;
    this.readMode = null;
  }
}
