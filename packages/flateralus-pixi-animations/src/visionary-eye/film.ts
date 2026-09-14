import { VERT } from '../shared/shader-harness';
import type { LidPose } from './physics';
import {
  AURORA_ANG0,
  AURORA_COOL,
  AURORA_GAIN,
  AURORA_SEED_ANG0,
  AURORA_SEED_ANG1,
  AURORA_SEED_TAPS,
  DELTA,
  DOMAIN,
  DRY_H,
  EVAP,
  EYE_R,
  GRAVITY,
  GRID,
  KAPPA,
  MOBILITY,
  NUCLEUS_DEPTH,
  NUCLEUS_R_MAX_CELLS,
  NUCLEUS_R_MIN_CELLS,
  NUCLEUS_SITES,
  PRIME_SECONDS,
  REDUCE,
  STEP,
  WIND_DIR,
  WIND_FADE,
  WIND_HALF_XY,
  WIND_HALF_Z,
  WIND_MARCH,
  WIND_NX,
  WIND_NY,
  WIND_NZ,
  WIND_PRIME_SECONDS,
  WIND_RELEASE,
  WIND_RELEASE_DANG,
  WIND_RELEASE_H,
  WIND_SIGMA,
  WIND_STEP,
  WIND_TAU,
  WIND_U,
  breakupFraction,
  clampMobility,
  filmTick,
  interfaceWidth,
  windTick,
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

/** Cells per side of one reduction tile. GRID % REDUCE === 0 is pinned by a test. */
const TILE = GRID / REDUCE;

/**
 * The measurement: an 8x8 target whose every texel is the **dry area fraction
 * of its own 12x12 tile**, `mean(step(h, DRY_H))`.
 *
 * A mean and not a minimum, which is the whole reason this pass is worth
 * writing — `breakupFraction()` carries the measurement that settled it. A
 * per-tile minimum saturates at this tile size against patches this size and
 * reads ~1.0 while the cornea is a tenth dry; a mean is an exact area fraction
 * at any tile size, so the target stays at 8x8 and the readback stays 64
 * texels.
 *
 * `step(h, DRY_H)` and not `step(DRY_H, h)`: GLSL's `step(edge, x)` is
 * `x < edge ? 0 : 1`, so passing `h` as the edge gives 1 exactly where
 * `h <= DRY_H`, matching `breakupFraction`'s CPU-side threshold test.
 *
 * `texelFetch` rather than `texture`, so the sum is over cells and not over
 * whatever the filter interpolates — a LINEAR fetch straddling a tile edge
 * would count neighbouring cells into the wrong tile.
 */
const REDUCE_FRAG = `#version 300 es
    precision highp float;
    // Declared, not defaulted: fragment-stage \`int\` defaults to mediump, and
    // the tile arithmetic indexes a 96-wide grid through texelFetch.
    precision highp int;
    in vec2 vUV;
    out vec4 fragColor;
    uniform sampler2D uH;
    const int TILE = ${TILE};
    const float DRY_H = ${DRY_H.toFixed(6)};
    void main() {
      ivec2 base = ivec2(vUV * ${REDUCE.toFixed(1)}) * TILE;
      float dry = 0.0;
      for (int j = 0; j < TILE; j++) {
        for (int i = 0; i < TILE; i++) {
          dry += step(texelFetch(uH, base + ivec2(i, j), 0).x, DRY_H);
        }
      }
      fragColor = vec4(dry / float(TILE * TILE), 0.0, 0.0, 1.0);
    }`;

/**
 * Decode an IEEE half into a JS number, for the `readPixels` measurement.
 *
 * Duplicated from `caustics-pool`, deliberately: the two animations share no
 * module and hoisting eight lines into one would couple them for no gain.
 */
function h2f(h: number): number {
  const s = h & 0x8000 ? -1 : 1;
  const e = (h >> 10) & 0x1f;
  const m = h & 0x3ff;
  if (e === 0) return s * m * Math.pow(2, -24);
  if (e === 31) return m ? NaN : s * Infinity;
  return s * (1 + m / 1024) * Math.pow(2, e - 15);
}

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
const REDUCE_UNIFORMS = ['uH'] as const;

/**
 * What `readPixels` will accept from the reduction target. `null` until the
 * driver has been asked, `'none'` once it has refused.
 */
type ReadMode = 'float' | 'half' | 'none' | null;

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
  private readonly reduceProg: WebGLProgram;
  private readonly muL: Locs;
  private readonly stepL: Locs;
  private readonly seedL: Locs;
  private readonly wipeL: Locs;
  private tex: (WebGLTexture | null)[] = [null, null];
  private fb: (WebGLFramebuffer | null)[] = [null, null];
  /** The 8x8 measurement target and its attachment. */
  private reduceTex: WebGLTexture | null = null;
  private reduceFb: WebGLFramebuffer | null = null;
  /** Index of the live field. A full step flips it twice, so it is stable. */
  private i = 0;
  private acc = 0;
  /** Probed on the first `measure()` and cached; see `measure()`. */
  private readMode: ReadMode = null;
  /** Has the first `readPixels` been checked for a GL error? Once only. */
  private readChecked = false;
  /** Last finite fraction, held across a corrupt frame. Cleared on retire. */
  private lastGood: number | null = null;
  private readBufF: Float32Array | null = null;
  private readBufH: Uint16Array | null = null;
  /** The 64 tile fractions, reused so `measure()` allocates nothing. */
  private readonly tiles = new Float32Array(REDUCE * REDUCE);

  private constructor(
    gl: WebGL2RenderingContext,
    muProg: WebGLProgram,
    stepProg: WebGLProgram,
    seedProg: WebGLProgram,
    wipeProg: WebGLProgram,
    reduceProg: WebGLProgram
  ) {
    this.gl = gl;
    this.muProg = muProg;
    this.stepProg = stepProg;
    this.seedProg = seedProg;
    this.wipeProg = wipeProg;
    this.reduceProg = reduceProg;
    this.muL = locsOf(gl, muProg, MU_UNIFORMS);
    this.stepL = locsOf(gl, stepProg, STEP_UNIFORMS);
    this.seedL = locsOf(gl, seedProg, SEED_UNIFORMS);
    this.wipeL = locsOf(gl, wipeProg, WIPE_UNIFORMS);
    const reduceL = locsOf(gl, reduceProg, REDUCE_UNIFORMS);
    gl.uniform1i(reduceL.uH!, FILM_UNIT);
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
    const reduceProg = program(gl, REDUCE_FRAG, 'reduce');
    if (!muProg || !stepProg || !seedProg || !wipeProg || !reduceProg) {
      if (muProg) gl.deleteProgram(muProg);
      if (stepProg) gl.deleteProgram(stepProg);
      if (seedProg) gl.deleteProgram(seedProg);
      if (wipeProg) gl.deleteProgram(wipeProg);
      if (reduceProg) gl.deleteProgram(reduceProg);
      return null;
    }

    const sim = new FilmSim(
      gl,
      muProg,
      stepProg,
      seedProg,
      wipeProg,
      reduceProg
    );
    if (!sim.allocate()) {
      sim.destroy();
      return null;
    }
    // Deliberately not fatal. A film that cannot be measured still draws, and
    // the caller falls back to a synthesised fraction rather than losing the
    // scene — see `measure()`.
    sim.buildReduce();
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

  /** Which precision `build()` settled on, so the 8x8 target matches it. */
  private f32 = false;

  /** One attempt at the texture/FBO pair in a given precision. */
  private build(f32: boolean): boolean {
    const gl = this.gl;
    const internal = f32 ? gl.RGBA32F : gl.RGBA16F;
    const type = f32 ? gl.FLOAT : gl.HALF_FLOAT;
    this.f32 = f32;
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

  /**
   * The 8x8 measurement target, in the same precision the field landed on.
   *
   * NEAREST, because nothing samples it — it exists to be read back. No
   * mipmaps and no filtering means an 8x8 float attachment is complete on
   * anything that got this far, but the status is still checked: a driver that
   * refuses it costs the loop its input, not the scene.
   */
  private buildReduce(): void {
    const gl = this.gl;
    const tx = gl.createTexture();
    const fb = gl.createFramebuffer();
    if (!tx || !fb) {
      if (tx) gl.deleteTexture(tx);
      if (fb) gl.deleteFramebuffer(fb);
      this.retire('could not allocate the measurement target');
      return;
    }
    gl.activeTexture(gl.TEXTURE0 + FILM_UNIT);
    gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      this.f32 ? gl.RGBA32F : gl.RGBA16F,
      REDUCE,
      REDUCE,
      0,
      gl.RGBA,
      this.f32 ? gl.FLOAT : gl.HALF_FLOAT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      tx,
      0
    );
    const complete =
      gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!complete) {
      gl.deleteTexture(tx);
      gl.deleteFramebuffer(fb);
      this.retire('measurement target incomplete');
      return;
    }
    this.reduceTex = tx;
    this.reduceFb = fb;
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
   *
   * **Returns the seconds of film time actually integrated, which is not
   * `dt`.** The accounting is `filmTick()` in `physics.ts`, which is where the
   * reasoning and the tests live: below about 40fps the field ages slower than
   * the wall does, and anything tracking the film's state has to run on this
   * number rather than on the frame's `dt`.
   */
  advance(dt: number, gravityLocal: [number, number]): number {
    const gl = this.gl;
    const tick = filmTick(this.acc, dt);
    this.acc = tick.acc;
    if (tick.steps === 0) return 0;
    for (let k = 0; k < tick.steps; k++) {
      this.pass(this.muProg, this.muL, gravityLocal);
      this.pass(this.stepProg, this.stepL, gravityLocal);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return tick.ran;
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

  /**
   * **The loop closure.** Reduce the field to 64 tile dry-fractions, read them
   * back, and return the corneal break-up fraction — or `null` if the driver
   * will not hand back a readable format.
   *
   * This is the only thing in the animation that reads the simulation. Without
   * it the eye is a decorated sphere with extra passes and a timer; with it the
   * lid fires because the film measurably tore. Delete it and nothing looks
   * different for one cycle, which is exactly why it is worth a comment this
   * long.
   *
   * **The format is a property of the attachment, not of the context**, so it
   * is probed against the reduction target itself, with that framebuffer bound,
   * and cached. The 8x8 target is allocated once at build time and never
   * resized — the display canvas resizes with the stage, the field and its
   * measurement do not — so there is no resize path that can invalidate the
   * probe.
   *
   * **The probe makes a bad readback unlikely, not impossible, and a bad
   * readback here does not throw.** WebGL2 only throws for a wrong-typed or
   * undersized view; a driver that refuses the format raises
   * `INVALID_OPERATION` and leaves the view untouched. That path is the one
   * genuinely dangerous failure in this file: `tiles` would stay all zeros,
   * `breakupFraction` would return a perfectly finite 0, the caller's
   * `?? fallback` would never fire, and the eye would stare forever with no
   * error anywhere. So the first `readPixels` — and only the first, because
   * `getError()` is itself a sync point — is checked, with the error queue
   * drained beforehand so the check reads this call and not somebody else's.
   * All three failure modes latch through `retire()`, so a refusing driver is
   * asked once and says so once.
   *
   * 64 texels is one 1KB readback. It is still a GPU sync point, and it runs
   * on every frame the lid is open — the caller skips it during the sweep,
   * where `stepBlink` ignores the fraction anyway. The field moves 28 substeps
   * per 60fps frame, so a stale fraction is a stale *decision*, and holding it
   * across open frames would trade the one thing this pass exists to provide
   * for a stall that 64 texels does not cause. If it ever does show up in a
   * frame budget, the cheap fix is to measure every third frame and hold
   * between — not to delete the readback.
   *
   * Returns a fraction in [0, 1], or `null` — which is either the measurement
   * having retired, or the transient before any good value has been captured
   * at all. Both want the same thing from the caller, a fallback, but only the
   * first is permanent.
   */
  measure(): number | null {
    const gl = this.gl;
    if (this.readMode === 'none' || !this.reduceFb) return null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.reduceFb);
    gl.viewport(0, 0, REDUCE, REDUCE);
    gl.useProgram(this.reduceProg);
    gl.activeTexture(gl.TEXTURE0 + FILM_UNIT);
    gl.bindTexture(gl.TEXTURE_2D, this.tex[this.i]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const check = !this.readChecked;
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
        if (this.readMode === 'none') {
          return this.retire('no readable measurement format');
        }
      }
      const n = REDUCE * REDUCE;
      if (check) {
        // Anything queued by the rest of the frame would be handed back by the
        // getError() below and misread as this call's. Bounded, because a lost
        // context reports CONTEXT_LOST_WEBGL once and NO_ERROR after.
        for (let k = 0; k < 8 && gl.getError() !== gl.NO_ERROR; k++);
      }
      if (this.readMode === 'float') {
        if (!this.readBufF) this.readBufF = new Float32Array(n * 4);
        gl.readPixels(0, 0, REDUCE, REDUCE, gl.RGBA, gl.FLOAT, this.readBufF);
        if (check && !this.acceptRead()) return null;
        for (let k = 0; k < n; k++) this.tiles[k] = this.readBufF[k * 4];
      } else {
        if (!this.readBufH) this.readBufH = new Uint16Array(n * 4);
        gl.readPixels(
          0,
          0,
          REDUCE,
          REDUCE,
          gl.RGBA,
          gl.HALF_FLOAT,
          this.readBufH
        );
        if (check && !this.acceptRead()) return null;
        for (let k = 0; k < n; k++) this.tiles[k] = h2f(this.readBufH[k * 4]);
      }
    } catch (e) {
      return this.retire(`readback threw: ${e}`);
    } finally {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    const fraction = breakupFraction(this.tiles, REDUCE);
    if (Number.isFinite(fraction)) {
      this.lastGood = fraction;
      return fraction;
    }
    // A single corrupt readback — a half-float NaN, say — is not a reason to
    // hand the decision to the synthesised ramp. `since` is shared state, so
    // one substituted frame late in a cycle can fire the lid early, which is a
    // worse error than one frame of staleness on a field that only moves 28
    // substeps between frames. Null only before the first good value, when
    // there is nothing to hold.
    return this.lastGood;
  }

  /**
   * Did the first `readPixels` actually happen? See `measure()` — this is the
   * failure that would otherwise be silent, so it is checked exactly once.
   */
  private acceptRead(): boolean {
    this.readChecked = true;
    const err = this.gl.getError();
    if (err === this.gl.NO_ERROR) return true;
    this.retire(`readback rejected, gl error 0x${err.toString(16)}`);
    return false;
  }

  /**
   * Retire the measurement permanently, once, with a reason. Every path that
   * gives up routes through here so a dead loop always says so, and so the
   * held value cannot outlive the thing that produced it.
   */
  private retire(why: string): null {
    this.readMode = 'none';
    this.lastGood = null;
    console.error(`visionary-eye film: ${why}; blink falls back`);
    return null;
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
    if (this.reduceTex) gl.deleteTexture(this.reduceTex);
    if (this.reduceFb) gl.deleteFramebuffer(this.reduceFb);
    this.reduceTex = null;
    this.reduceFb = null;
    gl.deleteProgram(this.muProg);
    gl.deleteProgram(this.stepProg);
    gl.deleteProgram(this.seedProg);
    gl.deleteProgram(this.wipeProg);
    gl.deleteProgram(this.reduceProg);
  }
}

/* ------------------------------------------------------------------ *
 * The wind: a volume the eye is an obstacle in.
 * ------------------------------------------------------------------ */

/**
 * Texture units. Not 0 — that is the SDF mask — and not `FILM_UNIT`, which the
 * step pass reads at the same time as the volume.
 *
 * `WIND_UNIT` carries the 3D volume for the step pass and the march;
 * `MARCH_UNIT` carries the march's own quarter-resolution result, which is the
 * only one `eyeW` ever sees. The display never touches the volume itself.
 */
const WIND_UNIT = 4;
const MARCH_UNIT = 5;

/** A vec3 literal, so a derived direction is never retyped as digits. */
const glVec3 = (v: readonly number[]) =>
  `vec3(${v[0].toFixed(8)}, ${v[1].toFixed(8)}, ${v[2].toFixed(8)})`;

/**
 * The box, and the map from a point in globe radii into the 3D texture's own
 * frame. Shared, because the step pass and the march have to agree about it
 * exactly or the volume shifts by a texel between writing and reading.
 */
const WIND_BOX = `
    const float HXY = ${WIND_HALF_XY.toFixed(8)};
    const float HZ = ${WIND_HALF_Z.toFixed(8)};
    vec3 windUVW(vec3 p) {
      return (p + vec3(HXY, HXY, HZ)) / vec3(2.0 * HXY, 2.0 * HXY, 2.0 * HZ);
    }`;

/**
 * The analytic wind. Used by the step pass alone -- the march reads the
 * volume the wind has already made and never evaluates it.
 *
 * A transcription of windFlow() in physics.ts, where the derivation and the
 * three properties that matter -- stagnation, 1.5 U at the equator, and the
 * sphere being a streamsurface -- are set out.
 */
const WIND_FLOW = `
    const vec3 WDIR = ${glVec3(WIND_DIR)};
    const float WU = ${WIND_U.toFixed(8)};
    vec3 windFlow(vec3 p) {
      float len = max(length(p), 1e-6);
      float r = max(len, 1.0);
      vec3 n = p / len;
      vec3 w = WDIR * WU;
      return w - (0.5 / (r * r * r)) * (3.0 * dot(w, n) * n - w);
    }`;
/**
 * One wind step, on one z-slice of the volume.
 *
 * A transcription of `windStep()` in `physics.ts`, which is where the scheme
 * and its derivations live. Every constant is interpolated from there rather
 * than written as a literal, so the shipped shader and the reference that is
 * tested headlessly cannot drift apart.
 *
 * **One slice per draw.** WebGL2 has no geometry shader and therefore no
 * layered rendering, so a 3D target is written a layer at a time through
 * `framebufferTextureLayer`. That is 48 draws a frame of 96x96 each — 442368
 * fragments, the same work a single 665x665 pass would be, split up.
 *
 * **No clock.** The only per-step quantity is the fixed `WIND_STEP`. What
 * makes the volume evolve is the film tearing at the limbus — spec D4, the
 * same rule the film's own passes live by. Delete `uTime` from this animation
 * and the wisps still breathe, because the thing driving them is a
 * measurement.
 *
 * **`uGaze` carries the CPU gaze and not the rendered one.** `eyeW` adds a
 * fixation micro-tremor of +-0.0125 on top; at the volume's cell size of
 * 0.0333 radii that is a third of a cell and below anything this grid can
 * hold, and reading it here would mean reading a clock in a step pass.
 *
 * The release is the causal coupling and is the reason this pass reads `uH`:
 * `AURORA_SEED_TAPS` samples across a band of cornea one dry-patch deep, just
 * inside the limbus, at this cell's own azimuth. `step(h, DRY_H)` is GLSL's
 * `x < edge ? 0 : 1` with `h` as the edge, so it is 1 exactly where the film
 * is at or below the same threshold the reduction pass counts as torn — the
 * blink and the release fire on the same definition of a hole.
 *
 * The azimuth is the corneal-local one, so the taps land wherever the cornea
 * is *now*: the **source** rides the globe with the gaze. The **wind** does
 * not, which is the whole asymmetry of the piece.
 */
export const WIND_FRAG = `#version 300 es
    precision highp float;
    precision highp sampler3D;
    in vec2 vUV;
    out vec4 fragColor;
    uniform sampler3D uV;   // the volume itself
    uniform sampler2D uH;   // the tear film, for the causal release
    uniform float uSlice;   // (k + 0.5) / NZ of the layer being written
    uniform vec2 uGaze;
    ${WIND_BOX}${WIND_FLOW}
    const float DT = ${WIND_STEP.toExponential(8)};
    const float DEC = ${Math.exp(-WIND_STEP / WIND_TAU).toFixed(8)};
    const float RATE = ${WIND_RELEASE.toFixed(6)};
    const float ANG0 = ${AURORA_ANG0.toFixed(6)};
    const float RH = ${WIND_RELEASE_H.toFixed(8)};
    const float RDA = ${WIND_RELEASE_DANG.toFixed(8)};
    void main() {
      vec3 p = vec3((vUV - 0.5) * (2.0 * HXY), (uSlice - 0.5) * (2.0 * HZ));
      float r = length(p);
      // Inside the globe. Nothing lives here and the march never reads it.
      if (r < 1.0) { fragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
      // RK2 backtrace. The midpoint matters: the streamlines are at their most
      // curved exactly where the material is, hugging the sphere.
      vec3 pm = p - 0.5 * DT * windFlow(p);
      vec3 q = p - DT * windFlow(pm);
      float qr = length(q);
      // windFlow has no radial component at r = 1, so no streamline crosses
      // the surface; RK2 on a curved one can still land a hair inside, and
      // that point belongs back on the surface it came along.
      if (qr < 1.0 && qr > 0.0) q /= qr;
      vec2 s = texture(uV, windUVW(q)).xy;
      float e = s.x * DEC;
      float a = (s.y + DT * s.x) * DEC;
      // The release: a ring of air just outside the limbus, in the gaze frame.
      float gr = 1.0 - smoothstep(0.0, RH, r - 1.0);
      if (gr > 0.0) {
        vec3 gd = normalize(vec3(uGaze * 0.8, 1.0));
        vec3 tx = normalize(cross(vec3(0.0, 1.0, 0.0), gd));
        vec3 ty = cross(gd, tx);
        vec3 n = p / r;
        float ang = acos(clamp(dot(n, gd), -1.0, 1.0));
        float ga = smoothstep(ANG0 - RDA, ANG0, ang)
          * (1.0 - smoothstep(ANG0, ANG0 + RDA, ang));
        if (ga > 0.0) {
          float az = atan(dot(n, ty), dot(n, tx));
          vec2 dir = vec2(cos(az), sin(az));
          float dry = 0.0;
          for (int k = 0; k < ${AURORA_SEED_TAPS}; k++) {
            float ca = ${AURORA_SEED_ANG0.toFixed(6)}
              + (float(k) + 0.5) / ${AURORA_SEED_TAPS.toFixed(1)}
              * ${(AURORA_SEED_ANG1 - AURORA_SEED_ANG0).toFixed(6)};
            vec2 l = sin(ca) * dir;
            dry += step(texture(uH, l / ${DOMAIN.toFixed(6)} + 0.5).x, ${DRY_H.toFixed(6)});
          }
          e += DT * RATE * (dry / ${AURORA_SEED_TAPS.toFixed(1)}) * gr * ga;
        }
      }
      fragColor = vec4(e, a, 0.0, 1.0);
    }`;

const WIND_UNIFORMS = ['uV', 'uH', 'uSlice', 'uGaze'] as const;

/**
 * The march: the volume, integrated along the view ray, at quarter resolution.
 *
 * A transcription of `windMarch()` in `physics.ts`. It runs in its own pass
 * rather than inside `eyeW` for one reason: **it is the most expensive thing
 * in the animation and it is the one thing that can afford to be soft.**
 * 480x270 by 16 samples at 60fps is 124.4M trilinear fetches a second; the
 * same march inside `eyeW` at full resolution would be sixteen times that.
 *
 * **The sorting is exact.** The ray stops at the analytic sphere intersection,
 * so everything behind the globe is never sampled and is occluded by
 * construction rather than by comparison. Everything this accumulates is in
 * front of the globe, which is why `eyeW` composites it with one `mix` at the
 * very end and needs no depth of its own.
 *
 * The dither is a 4x4 Bayer value of the march pixel, **not** of time — see
 * `WIND_MARCH` for why 16 samples needs one and why it cannot be temporal.
 */
export const MARCH_FRAG = `#version 300 es
    precision highp float;
    precision highp sampler3D;
    in vec2 vUV;
    out vec4 fragColor;
    uniform sampler3D uV;
    uniform vec2 uRes;
    uniform float uScale;
    ${WIND_BOX}
    const float R = ${EYE_R.toFixed(6)};
    const float SIG = ${WIND_SIGMA.toFixed(6)};
    const float GAIN = ${AURORA_GAIN.toFixed(6)};
    const float COOL = ${AURORA_COOL.toFixed(6)};
    const float FADE = ${WIND_FADE.toFixed(8)};
    const float N = ${WIND_MARCH.toFixed(1)};
    /** The 4x4 Bayer value of this march pixel, in [0,1). Matches bayer4. */
    float bayer4(vec2 c) {
      float M[16] = float[16](
         0.0,  8.0,  2.0, 10.0,
        12.0,  4.0, 14.0,  6.0,
         3.0, 11.0,  1.0,  9.0,
        15.0,  7.0, 13.0,  5.0);
      ivec2 f = ivec2(mod(c, 4.0));
      return M[f.y * 4 + f.x] * 0.0625;
    }
    void main() {
      // The same q as the display pass, from the same uRes and uScale.
      vec2 p2 = vec2(vUV.x, 1.0 - vUV.y) * uRes;
      vec2 q = (p2 - uRes * 0.5) / (min(uRes.x, uRes.y) * 0.5) * (0.44 / uScale);
      vec2 xy = q / R;
      fragColor = vec4(0.0, 0.0, 0.0, 0.0);
      if (abs(xy.x) >= HXY || abs(xy.y) >= HXY) return;
      float d2 = dot(xy, xy);
      // The globe's near surface where the ray hits it, the box's far face
      // where it does not. One expression, and it is both the occlusion and
      // the exit test.
      float zStop = d2 < 1.0 ? sqrt(1.0 - d2) : -HZ;
      float span = HZ - zStop;
      if (span <= 0.0) return;
      float ds = span / N;
      float dith = bayer4(gl_FragCoord.xy);
      vec3 acc = vec3(0.0);
      float T = 1.0;
      for (int i = 0; i < ${WIND_MARCH}; i++) {
        vec3 pt = vec3(xy, HZ - (float(i) + dith) * ds);
        vec2 s = texture(uV, windUVW(pt)).xy;
        vec3 ax = abs(pt);
        float fade = smoothstep(0.0, FADE, HXY - ax.x)
          * smoothstep(0.0, FADE, HXY - ax.y)
          * smoothstep(0.0, FADE, HZ - ax.z);
        float e = max(s.x, 0.0) * fade;
        // Colour from the field's state, not from a ramp: s.y/s.x is the mean
        // age of the energy here, in seconds, so young emits at ELEC and
        // cooled at VMAG. The fade scales E and A together, so the ratio --
        // and therefore the hue -- is untouched by it.
        float age = s.y / max(s.x, 1e-4);
        vec3 em = mix(vec3(0.3, 0.55, 1.0), vec3(0.85, 0.2, 0.75),
          smoothstep(0.0, COOL, age)) * (GAIN * e);
        acc += T * em * ds;
        T *= exp(-SIG * e * ds);
      }
      fragColor = vec4(acc, 1.0 - T);
    }`;

const MARCH_UNIFORMS = ['uV', 'uRes', 'uScale'] as const;

/**
 * The wind volume, and the march that renders it.
 *
 * Same shape as `FilmSim` — a ping-pong pair, a fixed-step accumulator, a
 * float target with a half-float fallback — and deliberately a separate class
 * rather than a refactor of it: the two fields share no grid, no boundary
 * conditions and no step rate, and the only thing that passes between them is
 * a texture unit.
 *
 * **What is not here is a wrap.** Task 13's field closed on itself in azimuth
 * and had a seam to get right. This one is a box of air with still air outside
 * it: every face is `CLAMP_TO_EDGE`, every face is empty because material only
 * ever enters at the limbus, and the march fades the last `WIND_FADE` of each
 * face to nothing so the box cannot show an edge.
 */
export class WindSim {
  readonly ok: boolean = true;

  private readonly gl: WebGL2RenderingContext;
  private readonly prog: WebGLProgram;
  private readonly marchProg: WebGLProgram;
  private readonly sliceL: WebGLUniformLocation | null;
  private readonly gazeL: WebGLUniformLocation | null;
  private readonly resL: WebGLUniformLocation | null;
  private readonly scaleL: WebGLUniformLocation | null;
  private tex: (WebGLTexture | null)[] = [null, null];
  private fb: WebGLFramebuffer | null = null;
  private marchTex: WebGLTexture | null = null;
  private marchFb: WebGLFramebuffer | null = null;
  private mw = 0;
  private mh = 0;
  private i = 0;
  private acc = 0;
  private gaze: [number, number] = [0, 0];

  private constructor(
    gl: WebGL2RenderingContext,
    prog: WebGLProgram,
    marchProg: WebGLProgram
  ) {
    this.gl = gl;
    this.prog = prog;
    this.marchProg = marchProg;
    const L = locsOf(gl, prog, WIND_UNIFORMS);
    gl.uniform1i(L.uV!, WIND_UNIT);
    gl.uniform1i(L.uH!, FILM_UNIT);
    this.sliceL = L.uSlice;
    this.gazeL = L.uGaze;
    const M = locsOf(gl, marchProg, MARCH_UNIFORMS);
    gl.uniform1i(M.uV!, WIND_UNIT);
    this.resL = M.uRes;
    this.scaleL = M.uScale;
  }

  /**
   * Build the volume. Returns null when the program or the float target is
   * unavailable, exactly as `FilmSim.create` does, so the caller records the
   * failure once and the display's `uWindOK` stays 0.
   */
  static create(gl: WebGL2RenderingContext): WindSim | null {
    if (!gl.getExtension('EXT_color_buffer_float')) return null;
    const prog = program(gl, WIND_FRAG, 'wind');
    if (!prog) return null;
    const marchProg = program(gl, MARCH_FRAG, 'wind march');
    if (!marchProg) {
      gl.deleteProgram(prog);
      return null;
    }
    const sim = new WindSim(gl, prog, marchProg);
    if (!sim.allocate()) {
      sim.destroy();
      return null;
    }
    return sim;
  }

  private allocate(): boolean {
    const gl = this.gl;
    // The march filters the volume, so 32F is only taken when it is
    // filterable -- the same rule and the same fallback as the film. At
    // 442368 cells the difference is 7.1MB against 14.2MB for the pair, so
    // the half-float path is also the one to prefer on its own merits; it is
    // taken second only because 32F costs nothing where it is already there.
    const wantF32 = !!gl.getExtension('OES_texture_float_linear');
    for (const f32 of wantF32 ? [true, false] : [false]) {
      if (this.build(f32)) return true;
      this.release();
    }
    console.error('visionary-eye wind: no complete float target');
    return false;
  }

  private build(f32: boolean): boolean {
    const gl = this.gl;
    const fb = gl.createFramebuffer();
    if (!fb) return false;
    this.fb = fb;
    for (let n = 0; n < 2; n++) {
      const tx = gl.createTexture();
      if (!tx) return false;
      gl.activeTexture(gl.TEXTURE0 + WIND_UNIT);
      gl.bindTexture(gl.TEXTURE_3D, tx);
      gl.texImage3D(
        gl.TEXTURE_3D,
        0,
        f32 ? gl.RGBA32F : gl.RGBA16F,
        WIND_NX,
        WIND_NY,
        WIND_NZ,
        0,
        gl.RGBA,
        f32 ? gl.FLOAT : gl.HALF_FLOAT,
        null
      );
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      // Still air outside the test section, on every face. Nothing wraps:
      // material only ever enters at the limbus, so the faces are empty and
      // clamping them extends nothing.
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
      this.tex[n] = tx;
      // An empty volume is the rest state: still air is the honest starting
      // condition, and `prime()` fills it from the film.
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.viewport(0, 0, WIND_NX, WIND_NY);
      for (let k = 0; k < WIND_NZ; k++) {
        gl.framebufferTextureLayer(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          tx,
          0,
          k
        );
        if (
          k === 0 &&
          gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE
        ) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          return false;
        }
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return true;
  }

  private release(): void {
    const gl = this.gl;
    for (let n = 0; n < 2; n++) {
      if (this.tex[n]) gl.deleteTexture(this.tex[n]);
      this.tex[n] = null;
    }
    if (this.fb) gl.deleteFramebuffer(this.fb);
    this.fb = null;
    if (this.marchTex) gl.deleteTexture(this.marchTex);
    if (this.marchFb) gl.deleteFramebuffer(this.marchFb);
    this.marchTex = null;
    this.marchFb = null;
    this.mw = 0;
    this.mh = 0;
  }

  /** One step: read the live volume and the film, write the other, swap. */
  private pass(): void {
    const gl = this.gl;
    const dst = 1 - this.i;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.viewport(0, 0, WIND_NX, WIND_NY);
    gl.useProgram(this.prog);
    gl.uniform2f(this.gazeL!, this.gaze[0], this.gaze[1]);
    gl.activeTexture(gl.TEXTURE0 + WIND_UNIT);
    gl.bindTexture(gl.TEXTURE_3D, this.tex[this.i]);
    for (let k = 0; k < WIND_NZ; k++) {
      gl.framebufferTextureLayer(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        this.tex[dst],
        0,
        k
      );
      gl.uniform1f(this.sliceL!, (k + 0.5) / WIND_NZ);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    this.i = dst;
  }

  /**
   * Advance by wall-clock `dt` in fixed steps, with `film` bound as the
   * release and `gaze` placing the release band.
   *
   * The backlog cap is `WIND_MAX_SUBSTEPS * WIND_STEP`, as close as a 60Hz
   * step can come to the film's 0.0253s, so the two fields age by nearly the
   * same amount on a slow frame and the release stays in step with the
   * break-up that produced it. Returns the wind seconds actually integrated.
   */
  advance(dt: number, film: FilmSim, gaze: [number, number]): number {
    const gl = this.gl;
    this.gaze = gaze;
    const tick = windTick(this.acc, dt);
    this.acc = tick.acc;
    if (tick.steps === 0) return 0;
    film.bindField(FILM_UNIT);
    for (let k = 0; k < tick.steps; k++) this.pass();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return tick.ran;
  }

  /**
   * Fill the volume from an already-primed film, so the air is not empty on
   * the first frame. See `WIND_PRIME_SECONDS`.
   */
  prime(film: FilmSim, gaze: [number, number]): void {
    const gl = this.gl;
    this.acc = 0;
    this.gaze = gaze;
    film.bindField(FILM_UNIT);
    const n = Math.round(WIND_PRIME_SECONDS / WIND_STEP);
    for (let k = 0; k < n; k++) this.pass();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Render the volume into its quarter-resolution target, then bind that for
   * the display pass. `w` and `h` are the **full** canvas size.
   *
   * The target is reallocated only when the quarter size actually changes, so
   * a resize costs one allocation and a steady canvas costs none.
   */
  march(w: number, h: number, scale: number, unit: number): void {
    const gl = this.gl;
    const mw = Math.max(1, Math.ceil(w / 4));
    const mh = Math.max(1, Math.ceil(h / 4));
    if (mw !== this.mw || mh !== this.mh) {
      if (this.marchTex) gl.deleteTexture(this.marchTex);
      if (this.marchFb) gl.deleteFramebuffer(this.marchFb);
      this.marchTex = gl.createTexture();
      this.marchFb = gl.createFramebuffer();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, this.marchTex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        mw,
        mh,
        0,
        gl.RGBA,
        gl.HALF_FLOAT,
        null
      );
      // LINEAR is the upsample: a quarter-resolution march read bilinearly is
      // a four-pixel blur on media that is already soft, and it is what keeps
      // the cost where it is.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.marchFb);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        this.marchTex,
        0
      );
      this.mw = mw;
      this.mh = mh;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.marchFb);
    gl.viewport(0, 0, mw, mh);
    gl.useProgram(this.marchProg);
    gl.uniform2f(this.resL!, w, h);
    gl.uniform1f(this.scaleL!, scale);
    gl.activeTexture(gl.TEXTURE0 + WIND_UNIT);
    gl.bindTexture(gl.TEXTURE_3D, this.tex[this.i]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.marchTex);
  }

  destroy(): void {
    this.release();
    this.gl.deleteProgram(this.prog);
    this.gl.deleteProgram(this.marchProg);
  }
}

/** The texture unit the display shader expects the march's result on. */
export const MARCH_TEXTURE_UNIT = MARCH_UNIT;

/** The texture unit the display shader expects the film on. */
export const FILM_TEXTURE_UNIT = FILM_UNIT;
