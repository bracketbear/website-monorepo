import { VERT } from '../shared/shader-harness';
import type { LidPose } from './physics';
import {
  DELTA,
  DOMAIN,
  EVAP,
  GRAVITY,
  GRID,
  KAPPA,
  MAX_SUBSTEPS,
  MOBILITY,
  NUCLEUS_DEPTH,
  NUCLEUS_R_MAX_CELLS,
  NUCLEUS_R_MIN_CELLS,
  NUCLEUS_SITES,
  PRIME_SECONDS,
  STEP,
  clampMobility,
  interfaceWidth,
} from './physics';

/**
 * The tear film field: a Cahn-Hilliard sheet on a GRID^2 (96^2) grid in
 * corneal-local tangent coordinates.
 *
 * Two draws per step. Pass A recomputes the chemical potential
 * `mu = h^3 - h - kappa*lap(h)` from `h`; pass B advances
 *
 *     h' = min(h + dt*(M*lap(mu) - E*g(h) - v.grad(h)), 1)
 *
 * where `g(h) = smoothstep(-0.9, 0.1, h)` gates evaporation off where there is
 * no film left to evaporate — without it the conservative transport leaves the
 * mean in free fall. `mu` is derived every step rather than stored between
 * steps, so **`h` is the only state** — spec D2. Neither pass has a clock in
 * it: the only per-step quantity is the fixed `STEP`, and the defects that
 * nucleate break-up are stamped by `prime()` at init and by `wipe()` as the
 * lid crosses, rather than forced every frame — spec D4.
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
 *    unstable point of the double well, and it would decompose into a
 *    labyrinth — which looks exactly like a broken integrator and is not one.
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
      // Evaporation acts only where there is still film. Without this gate the
      // conservative transport leaves the mean in free fall (d<h>/dt = -E) and
      // the field marches past the dry well forever. Gating and not clamping:
      // a max(nh, -1.0) would also stop the runaway, but it clamps the
      // conservative transport with it and flattens the raised rims around
      // each dry patch — and those rims are what make dewetting read as holes
      // rather than as stains.
      float evap = uEvap * smoothstep(-0.9, 0.1, c.x);
      float nh = c.x + uDt * (uM * lapMu - evap - dot(uGravity, g));
      fragColor = vec4(min(nh, 1.0), c.y, 0.0, 1.0);
    }`;

/**
 * A fresh sheet at h = 1, dimpled by a scattering of localised defects.
 *
 * **This is the nucleation seed, and its whole point is that most of it
 * disappears.** A defect wider than the critical nucleus grows into a dry
 * spot; a narrower one heals and leaves no trace. The radii are drawn across
 * that threshold on purpose — measured, 23 of 49 heal within 0.35s — so the
 * spots that survive are selected by the physics rather than placed by the
 * shader. Painted spots cannot heal; that asymmetry is the acceptance test.
 *
 * A defect is full depth and has the equilibrium tanh profile, so radius is
 * the only variable that decides its fate. Everything is interpolated from
 * `physics.ts` rather than written as a GLSL literal, so the shader and
 * `criticalRadiusCells()` cannot drift apart.
 *
 * It lives in its own snippet because **the lid lays the same imperfect sheet
 * every blink**, and the second cycle has to nucleate from something. A fresh
 * film that were flat at h = 1 would be linearly stable: it would thin
 * uniformly and never tear again. One copy, two callers.
 */
const NUCLEI_GLSL = `
    float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    /* 1 at the centre of a defect, 0 on clean film. */
    float nucleusDip(vec2 uv, vec2 seed) {
      const float SITES = ${NUCLEUS_SITES.toFixed(1)};
      const float UNIT = ${(DOMAIN / NUCLEUS_SITES).toFixed(6)};   // tangent units per site cell
      const float RMIN = ${(NUCLEUS_R_MIN_CELLS * DELTA).toFixed(6)};
      const float RMAX = ${(NUCLEUS_R_MAX_CELLS * DELTA).toFixed(6)};
      const float IFACE = ${interfaceWidth().toFixed(6)};
      vec2 p = uv * SITES;
      vec2 ip = floor(p);
      float dip = 0.0;
      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec2 g = ip + vec2(float(i), float(j));
          vec2 o = vec2(hash21(g + seed), hash21(g + seed + 7.3));
          float rad = mix(RMIN, RMAX, hash21(g + seed + 13.7));
          float d = length(p - (g + o)) * UNIT;
          dip = max(dip, 0.5 * (1.0 - tanh((d - rad) / IFACE)));
        }
      }
      return dip;
    }
    /* Fresh film: h = 1, dimpled to full well depth at every defect. */
    float freshFilm(vec2 uv, vec2 seed) {
      return 1.0 - ${NUCLEUS_DEPTH.toFixed(1)} * nucleusDip(uv, seed);
    }
  `;

const SEED_FRAG =
  `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform vec2 uSeed;
  ` +
  NUCLEI_GLSL +
  `
    void main() {
      fragColor = vec4(freshFilm(vUV, uSeed), 0.0, 0.0, 1.0);
    }`;

/**
 * The lid's wipe: fresh film behind the leading edge, nothing in front of it.
 *
 * The edge is a half-plane and not a band, so successive frames nest and the
 * sweep cannot leave gaps — but it is still stepped across each frame's travel
 * (see `wipe`), because a dropped frame would otherwise move the soft front by
 * twenty cells at once and the sweep would read as a cut rather than a wipe.
 *
 * **This is a lerp toward fresh film, not an addition to it.** The brief's
 * `+2.0` predates nucleation: it saturates against the step pass's
 * `min(nh, 1.0)`, which is exactly what is wanted for the wet sheet and fatal
 * for the defects in it — every dimple would be clamped back up to 1 and the
 * next cycle would have nothing to nucleate from. Premultiplied source with
 * `blendFunc(ONE, ONE_MINUS_SRC_ALPHA)` gives `mix(h, fresh, w)` in the blend
 * unit instead, which lands the defects at their true depth without reading
 * the texture it is writing.
 */
const WIPE_FRAG =
  `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform vec2 uEdge;     // a point on the lid's leading line, local frame
    uniform vec2 uNormal;   // unit normal, points at the side already swept
    uniform vec2 uSeed;
    uniform float uDelta;   // tangent units per cell
  ` +
  NUCLEI_GLSL +
  `
    void main() {
      vec2 l = (vUV - 0.5) * ${DOMAIN.toFixed(6)};
      float d = dot(l - uEdge, uNormal);
      // Behind the edge is freshly wetted; the front is soft over ~3 cells.
      float w = smoothstep(-3.0 * uDelta, 3.0 * uDelta, d);
      fragColor = vec4(w * freshFilm(vUV, uSeed), 0.0, 0.0, w);
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
const WIPE_UNIFORMS = ['uEdge', 'uNormal', 'uSeed', 'uDelta'] as const;

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
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return null;
  }
  const p = gl.createProgram();
  if (!p) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }
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
  private readonly wipeProg: WebGLProgram;
  private readonly muL: Locs;
  private readonly stepL: Locs;
  private readonly seedL: Locs;
  private readonly wipeL: Locs;
  private tex: (WebGLTexture | null)[] = [null, null];
  private fb: (WebGLFramebuffer | null)[] = [null, null];
  /** Index of the live field. A full step flips it twice, so it is stable. */
  private i = 0;
  private acc = 0;

  private constructor(
    gl: WebGL2RenderingContext,
    muProg: WebGLProgram,
    stepProg: WebGLProgram,
    seedProg: WebGLProgram,
    wipeProg: WebGLProgram
  ) {
    this.gl = gl;
    this.muProg = muProg;
    this.stepProg = stepProg;
    this.seedProg = seedProg;
    this.wipeProg = wipeProg;
    this.muL = locsOf(gl, muProg, MU_UNIFORMS);
    this.stepL = locsOf(gl, stepProg, STEP_UNIFORMS);
    this.seedL = locsOf(gl, seedProg, SEED_UNIFORMS);
    this.wipeL = locsOf(gl, wipeProg, WIPE_UNIFORMS);
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
    const wipeProg = program(gl, WIPE_FRAG, 'wipe');
    if (!muProg || !stepProg || !seedProg || !wipeProg) {
      if (muProg) gl.deleteProgram(muProg);
      if (stepProg) gl.deleteProgram(stepProg);
      if (seedProg) gl.deleteProgram(seedProg);
      if (wipeProg) gl.deleteProgram(wipeProg);
      return null;
    }

    const sim = new FilmSim(gl, muProg, stepProg, seedProg, wipeProg);
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
    // `EXT_float_blend` as well as the filter, because `wipe()` blends into
    // this target. Without the extension a blended draw to a 32F attachment
    // raises INVALID_OPERATION and draws nothing — so the film would run,
    // the display would show it, and only the blink would silently do
    // nothing. 16F blending is core in WebGL2, so the fallback is safe.
    const wantF32 =
      !!gl.getExtension('OES_texture_float_linear') &&
      !!gl.getExtension('EXT_float_blend');
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
      if (!fb) {
        gl.deleteTexture(tx);
        return false;
      }
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
    // Clamped even though MOBILITY is already derived below the limit, so
    // that a future control — or a re-tuned STEP — cannot silently push the
    // explicit integrator past its stability bound.
    gl.uniform1f(this.stepL.uM!, clampMobility(MOBILITY));
    gl.uniform1f(this.stepL.uDt!, STEP);
    gl.uniform1f(this.stepL.uEvap!, EVAP);
    gl.useProgram(this.wipeProg);
    gl.uniform1f(this.wipeL.uDelta!, DELTA);
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
    // Cap the backlog so a slow frame degrades instead of spiralling; the
    // ceiling is derived from the step rate, not a literal.
    this.acc = Math.min(this.acc + dt, MAX_SUBSTEPS * STEP);
    if (this.acc < STEP) return;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.pass(this.muProg, this.muL, gravityLocal);
      this.pass(this.stepProg, this.stepL, gravityLocal);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Stamp a fresh, slightly flawed film and run it forward `PRIME_SECONDS`.
   *
   * Spec D11: the default state must show the best thing, and a flat film is a
   * mirror. Priming costs ~4080 steps once at init so the eye loads mid-cycle
   * with real structure rather than making the viewer wait out a first cycle.
   *
   * The duration lives in `physics.ts` with the trace it was read off. The
   * ceiling is not drying but **percolation**: past about 3.85s the dry spots
   * merge into a connected labyrinth and stop reading as spots. The floor is
   * about 0.85s, before which they have not grown.
   */
  prime(seed: number): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb[this.i]);
    gl.viewport(0, 0, GRID, GRID);
    gl.useProgram(this.seedProg);
    this.pushSeed(this.seedL, seed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.acc = 0;
    // Straight down in the local frame: priming happens before any gaze, and
    // the direction it ran under stops mattering within a cycle anyway.
    const g: [number, number] = [0, 1];
    const n = Math.round(PRIME_SECONDS / STEP);
    for (let k = 0; k < n; k++) {
      this.pass(this.muProg, this.muL, g);
      this.pass(this.stepProg, this.stepL, g);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Spread one scalar seed over the two hash axes the nucleus field indexes
   * on. Shared by `prime` and `wipe` so a given seed places the same defects
   * whichever stamped them.
   */
  private pushSeed(L: Locs, seed: number): void {
    this.gl.uniform2f(L.uSeed!, (seed * 0.137) % 97, (seed * 0.311) % 89);
  }

  /**
   * Lay fresh film behind the lid's leading edge, once per pose in `sweep`.
   *
   * The poses come from `lidSweep()` already rotated into the corneal tangent
   * frame — a world-space normal must never reach here or the band tilts as
   * the eye looks around, and the field is gaze-local.
   *
   * `seed` is held fixed for one blink and changed the next, so the defect
   * layout is steady while the lid crosses the field and different every time
   * it does. **The defects are the point.** A lid that laid flat film at
   * h = 1 would lay a linearly stable sheet: it would thin uniformly and never
   * tear again, and the animation would blink exactly once.
   *
   * Writes the live field in place, so the running `advance()` picks it up on
   * its next substep with no swap to coordinate. `ONE, ONE_MINUS_SRC_ALPHA`
   * against a premultiplied source is `mix(h, fresh, w)` evaluated in the
   * blend unit, which is how the defects land at their true depth without
   * this pass reading the texture it is writing. The colour mask keeps it off
   * `.y`, where the last mu pass's result is waiting to be read.
   */
  wipe(seed: number, sweep: readonly LidPose[]): void {
    const gl = this.gl;
    if (sweep.length === 0) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb[this.i]);
    gl.viewport(0, 0, GRID, GRID);
    gl.useProgram(this.wipeProg);
    this.pushSeed(this.wipeL, seed);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.colorMask(true, false, false, false);
    for (const pose of sweep) {
      gl.uniform2f(this.wipeL.uEdge!, pose.edge[0], pose.edge[1]);
      gl.uniform2f(this.wipeL.uNormal!, pose.normal[0], pose.normal[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.colorMask(true, true, true, true);
    gl.disable(gl.BLEND);
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
    gl.deleteProgram(this.wipeProg);
  }
}

/** The texture unit the display shader expects the field on. */
export const FILM_TEXTURE_UNIT = FILM_UNIT;
