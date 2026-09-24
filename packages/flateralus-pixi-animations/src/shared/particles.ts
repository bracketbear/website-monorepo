import { VERT } from './shader-harness';

/**
 * A set of particles on the GPU: an n-texel RGBA32F ping-pong pair, a
 * fragment shader that steps every particle, and a points draw that
 * reads them by gl_VertexID. Built on someone else's context — a
 * PingPong's — so the step can sample that context's field texture.
 * Float render targets are mandatory; `create` returns null without them
 * and the caller runs without particles.
 */
export interface ParticlesOptions {
  stepFrag: string;
  drawVert: string;
  drawFrag: string;
  stepUniforms: readonly string[];
  drawUniforms: readonly string[];
  /** Texture width; n must divide by it. Default 256. */
  width?: number;
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
    console.error(`particles ${tag}:`, gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

function program(
  gl: WebGL2RenderingContext,
  vert: string,
  frag: string,
  tag: string
) {
  const vs = compile(gl, gl.VERTEX_SHADER, vert, tag);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag, tag);
  if (!vs || !fs) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error(`particles link ${tag}:`, gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

export class Particles {
  readonly gl: WebGL2RenderingContext;
  readonly n: number;
  readonly w: number;
  readonly h: number;

  private stepProg: WebGLProgram;
  private drawProg: WebGLProgram;
  private stepL: Locs = {};
  private drawL: Locs = {};
  private tex: (WebGLTexture | null)[] = [null, null];
  private fbo: (WebGLFramebuffer | null)[] = [null, null];
  private cur = 0;

  private constructor(
    gl: WebGL2RenderingContext,
    n: number,
    w: number,
    stepProg: WebGLProgram,
    drawProg: WebGLProgram
  ) {
    this.gl = gl;
    this.n = n;
    this.w = w;
    this.h = n / w;
    this.stepProg = stepProg;
    this.drawProg = drawProg;
  }

  static create(
    gl: WebGL2RenderingContext,
    n: number,
    o: ParticlesOptions
  ): Particles | null {
    const w = o.width ?? 256;
    if (n % w !== 0) return null;
    if (!gl.getExtension('EXT_color_buffer_float')) return null;
    const stepProg = program(gl, VERT, o.stepFrag, 'step');
    const drawProg = program(gl, o.drawVert, o.drawFrag, 'draw');
    if (!stepProg || !drawProg) return null;
    const ps = new Particles(gl, n, w, stepProg, drawProg);
    gl.useProgram(stepProg);
    for (const name of ['uParticles', 'uPW', ...o.stepUniforms])
      ps.stepL[name] = gl.getUniformLocation(stepProg, name);
    gl.useProgram(drawProg);
    for (const name of ['uParticles', 'uPW', ...o.drawUniforms])
      ps.drawL[name] = gl.getUniformLocation(drawProg, name);
    for (let i = 0; i < 2; i++) {
      const tx = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32F,
        ps.w,
        ps.h,
        0,
        gl.RGBA,
        gl.FLOAT,
        null
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
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
      const ok =
        gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      ps.tex[i] = tx;
      ps.fbo[i] = fb;
      if (!ok) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        ps.destroy();
        return null;
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return ps;
  }

  /** Overwrite every particle; n * 4 floats. */
  init(data: Float32Array): void {
    const gl = this.gl;
    for (let i = 0; i < 2; i++) {
      gl.bindTexture(gl.TEXTURE_2D, this.tex[i]);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32F,
        this.w,
        this.h,
        0,
        gl.RGBA,
        gl.FLOAT,
        data
      );
    }
    this.cur = 0;
  }

  /** Step every particle once. The caller binds any other samplers on units ≥ 1. */
  step(setUniforms?: (gl: WebGL2RenderingContext, locs: Locs) => void): void {
    const gl = this.gl;
    const dst = 1 - this.cur;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[dst]);
    gl.viewport(0, 0, this.w, this.h);
    gl.useProgram(this.stepProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex[this.cur]);
    gl.uniform1i(this.stepL.uParticles!, 0);
    gl.uniform1i(this.stepL.uPW!, this.w);
    setUniforms?.(gl, this.stepL);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.cur = dst;
  }

  /** Add every particle to the canvas as a point. */
  draw(
    W: number,
    H: number,
    setUniforms?: (gl: WebGL2RenderingContext, locs: Locs) => void
  ): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.drawProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex[this.cur]);
    gl.uniform1i(this.drawL.uParticles!, 0);
    gl.uniform1i(this.drawL.uPW!, this.w);
    setUniforms?.(gl, this.drawL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, this.n);
    gl.disable(gl.BLEND);
  }

  destroy(): void {
    const gl = this.gl;
    for (let i = 0; i < 2; i++) {
      if (this.tex[i]) gl.deleteTexture(this.tex[i]);
      if (this.fbo[i]) gl.deleteFramebuffer(this.fbo[i]);
      this.tex[i] = null;
      this.fbo[i] = null;
    }
    gl.deleteProgram(this.stepProg);
    gl.deleteProgram(this.drawProg);
  }
}
