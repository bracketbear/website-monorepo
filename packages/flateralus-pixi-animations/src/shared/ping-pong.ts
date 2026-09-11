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

  /** Simulation grid size, set by initState. */
  sw = 0;
  sh = 0;

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
    gl.useProgram(simProg);
    for (const n of ['uState', ...o.simUniforms]) {
      pp.simL[n] = gl.getUniformLocation(simProg, n);
    }
    gl.useProgram(dispProg);
    for (const n of ['uState', ...o.dispUniforms]) {
      pp.dispL[n] = gl.getUniformLocation(dispProg, n);
    }
    return pp;
  }

  /** Allocate the pair and seed the first texture. */
  initState(sw: number, sh: number, data: Float32Array | null): void {
    const gl = this.gl;
    this.sw = sw;
    this.sh = sh;
    for (let i = 0; i < 2; i++) {
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
        gl.RGBA16F,
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

  /** Delete every GL object this owns and drop the context. */
  destroy(): void {
    const gl = this.gl;
    for (let i = 0; i < 2; i++) {
      if (this.state[i]) gl.deleteTexture(this.state[i]);
      if (this.fbo[i]) gl.deleteFramebuffer(this.fbo[i]);
    }
    gl.deleteProgram(this.simProg);
    gl.deleteProgram(this.dispProg);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    this.state = [null, null];
    this.fbo = [null, null];
    this.sw = 0;
    this.sh = 0;
  }
}
