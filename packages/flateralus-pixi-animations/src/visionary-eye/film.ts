import { VERT } from '../shared/shader-harness';
import {
  DELTA,
  EVAP,
  GRAVITY,
  GRID,
  KAPPA,
  MOBILITY,
  STEP,
  clampMobility,
} from './physics';

/**
 * The tear film field: a Cahn-Hilliard sheet on a 128^2 grid in corneal-local
 * tangent coordinates.
 *
 * Two draws per step. Pass A recomputes the chemical potential
 * `mu = h^3 - h - kappa*lap(h)` from `h`; pass B advances
 * `h' = min(h + dt*(M*lap(mu) - E - v.grad(h)), 1)`. `mu` is derived every
 * step rather than stored between steps, so **`h` is the only state** — spec
 * D2. Neither pass has a clock in it: the only per-step quantity is the fixed
 * `STEP`, and the perturbation that seeds the instability is stamped once by
 * `prime()` (later, by the blink splat) rather than forced every frame — spec
 * D4.
 *
 * Every constant comes from `physics.ts`, which marks which are DERIVED from
 * the stability analysis and which are TUNED. Nothing here re-derives one.
 *
 * Two things about the resources are load-bearing and easy to get wrong:
 *
 * 1. **RGBA32F is not filterable by default.** In WebGL2 `RGBA16F` is
 *    texture-filterable by core, but `RGBA32F` needs `OES_texture_float_linear`
 *    for `LINEAR` and `EXT_color_buffer_float` does *not* imply it. The
 *    display pass filters this field on every fetch, so 32F is used only when
 *    both extensions are present and 16F + `HALF_FLOAT` is the fallback —
 *    which is what `caustics-pool` ships and is proven here.
 * 2. **h = 0 is the spinodal, not the rest state.** Clearing to zero the way
 *    a wave field does would drop the whole sheet onto the single most
 *    unstable point of the double well, and it would tear instantly and
 *    uniformly — which looks exactly like a broken integrator and is not one.
 *    Fresh film is `h = +1`, so the clear colour is `(1, 0, 0, 1)`.
 *
 * `CLAMP_TO_EDGE` at the domain boundary is the zero-flux (Neumann) condition,
 * which is what a film that cannot flow off the cornea wants.
 */

/** Texture unit the field is read from, in the sim passes and the display. */
const FILM_UNIT = 3;

const FILM_PRE = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform sampler2D uH;
    uniform float uTexel;   // 1.0 / GRID
    uniform float uDelta;   // tangent units per cell
  `;

/** mu = h^3 - h - kappa*lap(h). No clock: spec D4. */
const MU_FRAG =
  FILM_PRE +
  `
    uniform float uKappa;
    void main() {
      float e = uTexel;
      float h = texture(uH, vUV).x;
      float l = texture(uH, vUV + vec2(-e, 0.0)).x;
      float r = texture(uH, vUV + vec2( e, 0.0)).x;
      float b = texture(uH, vUV + vec2(0.0, -e)).x;
      float t = texture(uH, vUV + vec2(0.0,  e)).x;
      float lap = (l + r + b + t - 4.0 * h) / (uDelta * uDelta);
      fragColor = vec4(h, h * h * h - h - uKappa * lap, 0.0, 1.0);
    }`;

/** h' = min(h + dt*(M*lap(mu) - E - v.grad(h)), 1). */
const STEP_FRAG =
  FILM_PRE +
  `
    uniform float uM;
    uniform float uDt;
    uniform float uEvap;
    uniform vec2 uGravity;   // tangent units per second, already in local frame
    void main() {
      float e = uTexel;
      vec2 c = texture(uH, vUV).xy;
      float ml = texture(uH, vUV + vec2(-e, 0.0)).y;
      float mr = texture(uH, vUV + vec2( e, 0.0)).y;
      float mb = texture(uH, vUV + vec2(0.0, -e)).y;
      float mt = texture(uH, vUV + vec2(0.0,  e)).y;
      float lapMu = (ml + mr + mb + mt - 4.0 * c.y) / (uDelta * uDelta);
      float hl = texture(uH, vUV + vec2(-e, 0.0)).x;
      float hr = texture(uH, vUV + vec2( e, 0.0)).x;
      float hb = texture(uH, vUV + vec2(0.0, -e)).x;
      float ht = texture(uH, vUV + vec2(0.0,  e)).x;
      vec2 g = vec2(hr - hl, ht - hb) / (2.0 * uDelta);
      float nh = c.x + uDt * (uM * lapMu - uEvap - dot(uGravity, g));
      fragColor = vec4(min(nh, 1.0), c.y, 0.0, 1.0);
    }`;

/**
 * A fresh sheet: h = 1 minus a few percent of broadband noise.
 *
 * The amplitude is the 3% seed the stability table costs out — 3.5 e-folds
 * from 3% to O(1) is the ~6.2s that composes with the 2s walk to the spinodal
 * into a ~7s cycle. The spectrum is deliberately broad rather than tuned to
 * the fastest-growing wavelength: letting the instability select its own mode
 * is what makes the patches land irregularly instead of on a lattice.
 *
 * `hash21`/`vnoise` are inlined rather than imported. Self-contained shader
 * strings are the convention in this package; the same pair is inlined in
 * about twenty of them.
 */
const SEED_FRAG = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform vec2 uSeed;
    float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
                 mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    void main() {
      vec2 p = vUV * 11.0 + uSeed;
      float n = vnoise(p) * 0.5
              + vnoise(p * 2.7 + vec2(11.3, 4.1)) * 0.3
              + vnoise(p * 6.1 + vec2(23.7, 17.9)) * 0.2;
      fragColor = vec4(1.0 - 0.03 * n, 0.0, 0.0, 1.0);
    }`;

const MU_UNIFORMS = ['uH', 'uTexel', 'uDelta', 'uKappa'] as const;
const STEP_UNIFORMS = [
  'uH',
  'uTexel',
  'uDelta',
  'uM',
  'uDt',
  'uEvap',
  'uGravity',
] as const;
const SEED_UNIFORMS = ['uSeed'] as const;

type Locs = Record<string, WebGLUniformLocation | null>;

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
    console.error(`visionary-eye film ${tag}:`, gl.getShaderInfoLog(sh));
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
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error(`visionary-eye film link ${tag}:`, gl.getProgramInfoLog(p));
    gl.deleteProgram(p);
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

export class FilmSim {
  /**
   * True for any live instance: `create` returns null rather than handing back
   * a broken one, so the caller's `uFilmOK` is `film?.ok ? 1 : 0`.
   */
  readonly ok: boolean = true;

  private readonly gl: WebGL2RenderingContext;
  private readonly muProg: WebGLProgram;
  private readonly stepProg: WebGLProgram;
  private readonly seedProg: WebGLProgram;
  private readonly muL: Locs;
  private readonly stepL: Locs;
  private readonly seedL: Locs;
  private tex: (WebGLTexture | null)[] = [null, null];
  private fb: (WebGLFramebuffer | null)[] = [null, null];
  /** Index of the live field. A full step flips it twice, so it is stable. */
  private i = 0;
  private acc = 0;

  private constructor(
    gl: WebGL2RenderingContext,
    muProg: WebGLProgram,
    stepProg: WebGLProgram,
    seedProg: WebGLProgram
  ) {
    this.gl = gl;
    this.muProg = muProg;
    this.stepProg = stepProg;
    this.seedProg = seedProg;
    this.muL = locsOf(gl, muProg, MU_UNIFORMS);
    this.stepL = locsOf(gl, stepProg, STEP_UNIFORMS);
    this.seedL = locsOf(gl, seedProg, SEED_UNIFORMS);
  }

  /**
   * Build the field on the display context's `gl`. Returns null when the
   * float render target or a program is unavailable — the caller must record
   * that and stop retrying, not ask again next frame.
   */
  static create(gl: WebGL2RenderingContext): FilmSim | null {
    // Without a float colour attachment there is no simulation to run.
    if (!gl.getExtension('EXT_color_buffer_float')) {
      console.error('visionary-eye film: EXT_color_buffer_float unavailable');
      return null;
    }

    const muProg = program(gl, MU_FRAG, 'mu');
    const stepProg = program(gl, STEP_FRAG, 'step');
    const seedProg = program(gl, SEED_FRAG, 'seed');
    if (!muProg || !stepProg || !seedProg) {
      if (muProg) gl.deleteProgram(muProg);
      if (stepProg) gl.deleteProgram(stepProg);
      if (seedProg) gl.deleteProgram(seedProg);
      return null;
    }

    const sim = new FilmSim(gl, muProg, stepProg, seedProg);
    if (!sim.allocate()) {
      sim.destroy();
      return null;
    }
    sim.pushConstants();
    return sim;
  }

  /**
   * Allocate the pair, preferring RGBA32F and falling back to RGBA16F.
   *
   * 32F is only reached for when `OES_texture_float_linear` is also present,
   * because the display pass filters this texture and an unfilterable one
   * samples as black with no error anywhere. The framebuffer is still checked
   * for completeness: a driver may advertise the extensions and still refuse
   * the attachment, in which case 16F gets a turn before we give up.
   */
  private allocate(): boolean {
    const gl = this.gl;
    const wantF32 = !!gl.getExtension('OES_texture_float_linear');
    for (const f32 of wantF32 ? [true, false] : [false]) {
      if (this.build(f32)) return true;
      this.releaseTargets();
      if (f32) {
        console.error('visionary-eye film: RGBA32F incomplete, using RGBA16F');
      }
    }
    console.error('visionary-eye film: no complete float target');
    return false;
  }

  /** One attempt at the texture/FBO pair in a given precision. */
  private build(f32: boolean): boolean {
    const gl = this.gl;
    const internal = f32 ? gl.RGBA32F : gl.RGBA16F;
    const type = f32 ? gl.FLOAT : gl.HALF_FLOAT;
    let complete = true;
    for (let n = 0; n < 2; n++) {
      const tx = gl.createTexture();
      if (!tx) return false;
      gl.activeTexture(gl.TEXTURE0 + FILM_UNIT);
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        internal,
        GRID,
        GRID,
        0,
        gl.RGBA,
        type,
        null
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      // Zero-flux boundaries: the film cannot flow off the cornea.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer();
      if (!fb) return false;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tx,
        0
      );
      if (
        gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE
      ) {
        complete = false;
      }
      // Fresh film, not flat film: h = 0 is the spinodal.
      gl.viewport(0, 0, GRID, GRID);
      gl.clearColor(1, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.tex[n] = tx;
      this.fb[n] = fb;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return complete;
  }

  private releaseTargets(): void {
    const gl = this.gl;
    for (let n = 0; n < 2; n++) {
      if (this.tex[n]) gl.deleteTexture(this.tex[n]);
      if (this.fb[n]) gl.deleteFramebuffer(this.fb[n]);
      this.tex[n] = null;
      this.fb[n] = null;
    }
  }

  /**
   * Uniforms that never change. They are per-program state, so setting them
   * once at build time is enough — only `uGravity` is pushed per pass.
   */
  private pushConstants(): void {
    const gl = this.gl;
    gl.useProgram(this.muProg);
    gl.uniform1i(this.muL.uH!, FILM_UNIT);
    gl.uniform1f(this.muL.uTexel!, 1 / GRID);
    gl.uniform1f(this.muL.uDelta!, DELTA);
    gl.uniform1f(this.muL.uKappa!, KAPPA);
    gl.useProgram(this.stepProg);
    gl.uniform1i(this.stepL.uH!, FILM_UNIT);
    gl.uniform1f(this.stepL.uTexel!, 1 / GRID);
    gl.uniform1f(this.stepL.uDelta!, DELTA);
    // Clamped even though MOBILITY is already derived below the limit: a
    // control that can detonate the integrator is a bug with a slider on it.
    gl.uniform1f(this.stepL.uM!, clampMobility(MOBILITY));
    gl.uniform1f(this.stepL.uDt!, STEP);
    gl.uniform1f(this.stepL.uEvap!, EVAP);
  }

  /** One draw: read the live field, write the other, swap. */
  private pass(prog: WebGLProgram, L: Locs, gravityLocal: [number, number]) {
    const gl = this.gl;
    const dst = 1 - this.i;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb[dst]);
    gl.viewport(0, 0, GRID, GRID);
    gl.useProgram(prog);
    gl.activeTexture(gl.TEXTURE0 + FILM_UNIT);
    gl.bindTexture(gl.TEXTURE_2D, this.tex[this.i]);
    if (L.uGravity) {
      // GRAVITY is the speed; the direction arrives already projected onto the
      // corneal tangent basis, so nothing here knows about world axes.
      gl.uniform2f(
        L.uGravity,
        GRAVITY * gravityLocal[0],
        GRAVITY * gravityLocal[1]
      );
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.i = dst;
  }

  /**
   * Advance the field by wall-clock `dt` in fixed steps.
   *
   * `gravityLocal` is world down already projected onto the corneal tangent
   * basis — `worldToLocal(0, 1, gazeX, gazeY)`. A world vector must never
   * reach here or the film drains sideways as the eye looks around.
   */
  advance(dt: number, gravityLocal: [number, number]): void {
    const gl = this.gl;
    this.acc = Math.min(this.acc + dt, 12 * STEP); // cap: 12 steps, never a spiral
    if (this.acc < STEP) return;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.pass(this.muProg, this.muL, gravityLocal);
      this.pass(this.stepProg, this.stepL, gravityLocal);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Stamp a fresh, slightly flawed film and run it forward ~4s.
   *
   * Spec D11: the default state must show the best thing, and a flat film is a
   * mirror. Priming costs 1920 steps once at init so the eye loads mid-cycle
   * with real structure rather than making the viewer wait out a first cycle.
   */
  prime(seed: number): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb[this.i]);
    gl.viewport(0, 0, GRID, GRID);
    gl.useProgram(this.seedProg);
    gl.uniform2f(this.seedL.uSeed!, (seed * 0.137) % 97, (seed * 0.311) % 89);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.acc = 0;
    // Straight down in the local frame: priming happens before any gaze, and
    // the direction it ran under stops mattering within a cycle anyway.
    const g: [number, number] = [0, 1];
    const n = Math.round(4 / STEP);
    for (let k = 0; k < n; k++) {
      this.pass(this.muProg, this.muL, g);
      this.pass(this.stepProg, this.stepL, g);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** Bind the live field for the display pass. */
  bindField(unit: number): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.tex[this.i]);
  }

  /**
   * Delete everything this owns. The context belongs to the display harness,
   * so it is deliberately not lost here.
   */
  destroy(): void {
    const gl = this.gl;
    this.releaseTargets();
    gl.deleteProgram(this.muProg);
    gl.deleteProgram(this.stepProg);
    gl.deleteProgram(this.seedProg);
  }
}

/** The texture unit the display shader expects the field on. */
export const FILM_TEXTURE_UNIT = FILM_UNIT;
