import { VERT } from './shader-harness';

/**
 * A ping-pong pair of float textures with a simulation pass and a display
 * pass — the shape every feedback-buffer effect in the catalog uses.
 *
 * The simulation renders into whichever texture is not currently being read,
 * then the two swap. The display pass reads the live one and draws to the
 * canvas. Float render targets are mandatory, so `create` returns null where
 * EXT_color_buffer_float is unavailable and the caller should stop retrying.
 */
export interface PingPongOptions {
  simFrag: string;
  dispFrag: string;
  simUniforms: readonly string[];
  dispUniforms: readonly string[];
  /**
   * Store the state as 32-bit floats instead of 16. Half floats carry ten
   * bits of mantissa, which is plenty for a field that is redrawn from
   * scratch each step and not enough for an integrator: when the per-step
   * increment is a thousandth of the value it is added to, it is rounded by
   * ten percent every step, and because the rounding depends only on the
   * value, a state that is uniform along a row is striped along that row.
   * Falls back to half where float textures cannot be filtered.
   */
  fullPrecision?: boolean;
  /**
   * A reduction pass: a fragment shader that reads the live state and
   * writes a small float target which `reduce` hands back to the CPU. This
   * is how objects on the CPU feel the field.
   */
  reduceFrag?: string;
  reduceUniforms?: readonly string[];
}

type Locs = Record<string, WebGLUniformLocation | null>;

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  src: string,
  tag: string
) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error(`ping-pong ${tag}:`, gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

function program(gl: WebGL2RenderingContext, frag: string, tag: string) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT, tag);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag, tag);
  if (!vs || !fs) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error(`ping-pong link ${tag}:`, gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

export class PingPong {
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGL2RenderingContext;

  private simProg: WebGLProgram;
  private dispProg: WebGLProgram;
  private simL: Locs = {};
  private dispL: Locs = {};
  private state: (WebGLTexture | null)[] = [null, null];
  private fbo: (WebGLFramebuffer | null)[] = [null, null];
  private cur = 0;
  /** Sized internal format of the state pair. */
  private format: number = 0;

  private reduceProg: WebGLProgram | null = null;
  private reduceL: Locs = {};
  private reduceTx: WebGLTexture | null = null;
  private reduceFbo: WebGLFramebuffer | null = null;
  private reduceW = 0;
  private reduceH = 0;
  private reduceBuf: Float32Array | null = null;
  /** Whether the driver hands float pixels back; probed on the first read. */
  private readable: boolean | null = null;

  /** Simulation grid size, set by initState. */
  sw = 0;
  sh = 0;

  /** The live state texture, for another program on this context to sample. */
  get texture(): WebGLTexture | null {
    return this.state[this.cur];
  }

  private constructor(
    canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    simProg: WebGLProgram,
    dispProg: WebGLProgram
  ) {
    this.canvas = canvas;
    this.gl = gl;
    this.simProg = simProg;
    this.dispProg = dispProg;
  }

  static create(o: PingPongOptions): PingPong | null {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      premultipliedAlpha: true,
    });
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) return null;

    const simProg = program(gl, o.simFrag, 'sim');
    const dispProg = program(gl, o.dispFrag, 'disp');
    if (!simProg || !dispProg) return null;

    const pp = new PingPong(canvas, gl, simProg, dispProg);
    pp.format =
      o.fullPrecision && gl.getExtension('OES_texture_float_linear')
        ? gl.RGBA32F
        : gl.RGBA16F;
    gl.useProgram(simProg);
    for (const n of ['uState', ...o.simUniforms]) {
      pp.simL[n] = gl.getUniformLocation(simProg, n);
    }
    gl.useProgram(dispProg);
    for (const n of ['uState', ...o.dispUniforms]) {
      pp.dispL[n] = gl.getUniformLocation(dispProg, n);
    }
    if (o.reduceFrag) {
      const prog = program(gl, o.reduceFrag, 'reduce');
      if (!prog) return null;
      pp.reduceProg = prog;
      gl.useProgram(prog);
      for (const n of ['uState', ...(o.reduceUniforms ?? [])]) {
        pp.reduceL[n] = gl.getUniformLocation(prog, n);
      }
    }
    return pp;
  }

  /**
   * Allocate the pair and seed the first texture. Safe to call again with a
   * different size: the previous pair is released first.
   */
  initState(sw: number, sh: number, data: Float32Array | null): void {
    const gl = this.gl;
    for (let i = 0; i < 2; i++) {
      if (this.state[i]) gl.deleteTexture(this.state[i]);
      if (this.fbo[i]) gl.deleteFramebuffer(this.fbo[i]);
    }
    this.cur = 0;
    this.sw = sw;
    this.sh = sh;
    for (let i = 0; i < 2; i++) {
      const tx = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        this.format,
        sw,
        sh,
        0,
        gl.RGBA,
        gl.FLOAT,
        i === 0 ? data : null
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tx,
        0
      );
      this.state[i] = tx;
      this.fbo[i] = fb;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** Overwrite both textures, restarting the simulation from a new seed. */
  reseed(data: Float32Array): void {
    const gl = this.gl;
    for (let i = 0; i < 2; i++) {
      gl.bindTexture(gl.TEXTURE_2D, this.state[i]);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        this.format,
        this.sw,
        this.sh,
        0,
        gl.RGBA,
        gl.FLOAT,
        data
      );
    }
  }

  /** Advance one simulation step. */
  step(setUniforms?: (gl: WebGL2RenderingContext, locs: Locs) => void): void {
    const gl = this.gl;
    const dst = 1 - this.cur;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[dst]);
    gl.viewport(0, 0, this.sw, this.sh);
    gl.useProgram(this.simProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.state[this.cur]);
    gl.uniform1i(this.simL.uState!, 0);
    setUniforms?.(gl, this.simL);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.cur = dst;
  }

  /** Draw the live state to the canvas. */
  display(
    W: number,
    H: number,
    setUniforms?: (gl: WebGL2RenderingContext, locs: Locs) => void
  ): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.dispProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.state[this.cur]);
    gl.uniform1i(this.dispL.uState!, 0);
    setUniforms?.(gl, this.dispL);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /**
   * Run the reduction pass over the live state into a w×h float target and
   * read it back: w*h RGBA floats, row-major from the bottom. The buffer is
   * reused between calls. Null where there is no reduction pass or the
   * driver will not hand float pixels back — the caller degrades and the
   * scene still runs.
   */
  reduce(
    w: number,
    h: number,
    setUniforms?: (gl: WebGL2RenderingContext, locs: Locs) => void
  ): Float32Array | null {
    const gl = this.gl;
    if (!this.reduceProg || this.readable === false) return null;
    if (!this.reduceTx || this.reduceW !== w || this.reduceH !== h) {
      if (this.reduceTx) gl.deleteTexture(this.reduceTx);
      if (this.reduceFbo) gl.deleteFramebuffer(this.reduceFbo);
      const tx = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32F,
        w,
        h,
        0,
        gl.RGBA,
        gl.FLOAT,
        null
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tx,
        0
      );
      this.reduceTx = tx;
      this.reduceFbo = fb;
      this.reduceW = w;
      this.reduceH = h;
      this.reduceBuf = new Float32Array(w * h * 4);
      // The attachment changed, so what can be read from it may have too.
      this.readable = null;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.reduceFbo);
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.reduceProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.state[this.cur]);
    gl.uniform1i(this.reduceL.uState!, 0);
    setUniforms?.(gl, this.reduceL);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    try {
      if (this.readable === null) {
        this.readable =
          gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT) === gl.RGBA &&
          gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE) === gl.FLOAT;
        if (!this.readable) return null;
      }
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, this.reduceBuf!);
      return this.reduceBuf;
    } catch {
      this.readable = false;
      return null;
    }
  }

  /** Delete every GL object this owns and drop the context. */
  destroy(): void {
    const gl = this.gl;
    for (let i = 0; i < 2; i++) {
      if (this.state[i]) gl.deleteTexture(this.state[i]);
      if (this.fbo[i]) gl.deleteFramebuffer(this.fbo[i]);
    }
    if (this.reduceTx) gl.deleteTexture(this.reduceTx);
    if (this.reduceFbo) gl.deleteFramebuffer(this.reduceFbo);
    if (this.reduceProg) gl.deleteProgram(this.reduceProg);
    this.reduceTx = null;
    this.reduceFbo = null;
    this.reduceProg = null;
    gl.deleteProgram(this.simProg);
    gl.deleteProgram(this.dispProg);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    this.state = [null, null];
    this.fbo = [null, null];
    this.sw = 0;
    this.sh = 0;
  }
}
