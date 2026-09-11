import * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation, rand } from '@bracketbear/flateralus-pixi';
import { logoMask, setColor } from '../shared/shader-harness';

const MANIFEST = createManifest({
  id: 'ink-dissolve',
  name: 'Ink Dissolve (GLSL)',
  description:
    'The mark as dye in a real Navier–Stokes solver — semi-Lagrangian advection, vorticity confinement, and a full Jacobi pressure projection run every frame on the GPU. Drag through it and your stroke becomes actual vorticity: the ink rolls up into eddies, smears downstream, and — because the mark is continuously re-injected — pulls itself back together when the flow dies down. Click for a radial burst that blows it apart. Ambient: an invisible stirrer wanders the tank.',
  controls: [
    {
      name: 'mode',
      type: 'select',
      label: 'Mode',
      options: [
        { value: 1, label: 'Interactive' },
        { value: 0, label: 'Ambient' },
      ],
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'swirl',
      type: 'number',
      label: 'Swirl Persistence',
      min: 0.985,
      max: 0.999,
      step: 0.001,
      defaultValue: 0.996,
      debug: true,
    },
    {
      name: 'vort',
      type: 'number',
      label: 'Vorticity',
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 16,
      debug: true,
    },
    {
      name: 'stir',
      type: 'number',
      label: 'Stir Strength',
      min: 0.2,
      max: 3,
      step: 0.1,
      defaultValue: 1.2,
      debug: true,
    },
    {
      name: 'reform',
      type: 'number',
      label: 'Re-form Rate',
      min: 0.1,
      max: 2.5,
      step: 0.1,
      defaultValue: 0.9,
      debug: true,
    },
    {
      name: 'body',
      type: 'number',
      label: 'Ink Body',
      min: 0.975,
      max: 0.999,
      step: 0.001,
      defaultValue: 0.993,
      debug: true,
    },
    {
      name: 'burst',
      type: 'number',
      label: 'Click Burst',
      min: 100,
      max: 1200,
      step: 50,
      defaultValue: 550,
      debug: true,
    },
    {
      name: 'grain',
      type: 'boolean',
      label: 'Film Grain',
      defaultValue: true,
      debug: true,
    },
  ],
} as const);

export type InkDissolveControlValues = ManifestToControlValues<typeof MANIFEST>;

/** Velocity / pressure / curl / divergence grid. */
const SW = 512;
const SH = 288;
/** Dye grid, at twice the sim resolution so the mark keeps its edges. */
const DW = 1024;
const DH = 576;

/**
 * Every shader below is carried across from the prototype verbatim. Do not
 * reformat the GLSL, rename uniforms, or "tidy" it.
 *
 * The prototype interpolated `${SIMV}` into each sim shader; the literal
 * grid size is baked in here instead, and the display shader's `+ HELP +`
 * splice has been resolved by inlining the noise helpers.
 */
const VERT = `#version 300 es
    out vec2 vUV;
    void main() {
      vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
      vUV = p;
      gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`;
const ADVECT_VEL = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uVel;
    uniform float uDt, uDiss;
    const vec2 SIM = vec2(512.0, 288.0);
    void main() {
      vec2 v = texture(uVel, vUV).xy;
      vec2 back = vUV - uDt * v / SIM;
      vec2 nv = texture(uVel, back).xy * uDiss;
      vec2 e = smoothstep(0.0, 0.025, vUV) * smoothstep(0.0, 0.025, 1.0 - vUV);
      fragColor = vec4(nv * e.x * e.y, 0.0, 1.0);
    }`;
const CURL = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uVel;
    const vec2 SIM = vec2(512.0, 288.0);
    void main() {
      vec2 px = 1.0 / SIM;
      float L = texture(uVel, vUV - vec2(px.x, 0.0)).y;
      float Rv = texture(uVel, vUV + vec2(px.x, 0.0)).y;
      float B = texture(uVel, vUV - vec2(0.0, px.y)).x;
      float T = texture(uVel, vUV + vec2(0.0, px.y)).x;
      fragColor = vec4(0.5 * ((Rv - L) - (T - B)), 0.0, 0.0, 1.0);
    }`;
const VORT = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uVel;
    uniform sampler2D uCurl;
    uniform float uDt, uEps;
    const vec2 SIM = vec2(512.0, 288.0);
    void main() {
      vec2 px = 1.0 / SIM;
      float L = texture(uCurl, vUV - vec2(px.x, 0.0)).x;
      float Rv = texture(uCurl, vUV + vec2(px.x, 0.0)).x;
      float B = texture(uCurl, vUV - vec2(0.0, px.y)).x;
      float T = texture(uCurl, vUV + vec2(0.0, px.y)).x;
      float C = texture(uCurl, vUV).x;
      vec2 N = 0.5 * vec2(abs(Rv) - abs(L), abs(T) - abs(B));
      N /= length(N) + 1e-5;
      vec2 f = uEps * vec2(N.y, -N.x) * C;
      vec2 v = texture(uVel, vUV).xy + f * uDt;
      fragColor = vec4(clamp(v, vec2(-1200.0), vec2(1200.0)), 0.0, 1.0);
    }`;
const DIVERGENCE = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uVel;
    const vec2 SIM = vec2(512.0, 288.0);
    void main() {
      vec2 px = 1.0 / SIM;
      float L = texture(uVel, vUV - vec2(px.x, 0.0)).x;
      float Rv = texture(uVel, vUV + vec2(px.x, 0.0)).x;
      float B = texture(uVel, vUV - vec2(0.0, px.y)).y;
      float T = texture(uVel, vUV + vec2(0.0, px.y)).y;
      fragColor = vec4(0.5 * ((Rv - L) + (T - B)), 0.0, 0.0, 1.0);
    }`;
const PRESSURE = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uPr;
    uniform sampler2D uDiv;
    const vec2 SIM = vec2(512.0, 288.0);
    void main() {
      vec2 px = 1.0 / SIM;
      float L = texture(uPr, vUV - vec2(px.x, 0.0)).x;
      float Rv = texture(uPr, vUV + vec2(px.x, 0.0)).x;
      float B = texture(uPr, vUV - vec2(0.0, px.y)).x;
      float T = texture(uPr, vUV + vec2(0.0, px.y)).x;
      float d = texture(uDiv, vUV).x;
      fragColor = vec4((L + Rv + B + T - d) * 0.25, 0.0, 0.0, 1.0);
    }`;
const GRADIENT = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uVel;
    uniform sampler2D uPr;
    const vec2 SIM = vec2(512.0, 288.0);
    void main() {
      vec2 px = 1.0 / SIM;
      float L = texture(uPr, vUV - vec2(px.x, 0.0)).x;
      float Rv = texture(uPr, vUV + vec2(px.x, 0.0)).x;
      float B = texture(uPr, vUV - vec2(0.0, px.y)).x;
      float T = texture(uPr, vUV + vec2(0.0, px.y)).x;
      vec2 v = texture(uVel, vUV).xy - 0.5 * vec2(Rv - L, T - B);
      fragColor = vec4(v, 0.0, 1.0);
    }`;
const SPLAT = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform vec2 uC;      // uv
    uniform vec2 uF;      // force, sim px/s
    uniform float uRad;   // sim px
    const vec2 SIM = vec2(512.0, 288.0);
    void main() {
      vec2 d = (vUV - uC) * SIM;
      float a = exp(-dot(d, d) / (uRad * uRad));
      fragColor = vec4(uF * a, 0.0, 1.0);
    }`;
const BURST = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform vec2 uC;
    uniform float uPow, uRad;
    const vec2 SIM = vec2(512.0, 288.0);
    void main() {
      vec2 d = (vUV - uC) * SIM;
      float r = length(d) + 1e-4;
      float a = exp(-r * r / (uRad * uRad));
      fragColor = vec4((d / r) * uPow * a, 0.0, 1.0);
    }`;
const ADVECT_DYE = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uDye;
    uniform sampler2D uVel;
    uniform sampler2D uLogo;
    uniform float uDt, uDiss, uInj, uAsp;
    const vec2 SIM = vec2(512.0, 288.0);
    void main() {
      vec2 v = texture(uVel, vUV).xy;
      vec2 back = vUV - uDt * v / SIM;
      float d = texture(uDye, back).x * uDiss;
      vec2 q = (vUV - 0.5) * vec2(uAsp, 1.0);
      vec2 luv = q / vec2(0.62, 0.3875) + 0.5;
      float m = 0.0;
      if (luv.x > 0.0 && luv.x < 1.0 && luv.y > 0.0 && luv.y < 1.0)
        m = texture(uLogo, vec2(luv.x, 1.0 - luv.y)).a;
      d += m * uInj * uDt * max(0.0, 1.25 - d);
      fragColor = vec4(max(d, 0.0), 0.0, 0.0, 1.0);
    }`;
const DISPLAY = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uDye;
    uniform sampler2D uVel;
    uniform float uTime, uGrain;
    uniform vec3 uInk, uOrange, uSun, uCream;
    
    float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
                 mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + vec2(17.0, 9.2); a *= 0.5; }
      return v;
    }
    void main() {
      vec2 uv = vUV;
      float d = max(texture(uDye, uv).x, 0.0);
      float g = 1.0 - exp(-d * 1.5);
      vec3 col = uInk * (0.8 + 0.25 * fbm(uv * 3.0 + 2.7)) + 0.008;
      col = mix(col, uOrange * 0.55, smoothstep(0.02, 0.2, g));
      col = mix(col, uOrange, smoothstep(0.16, 0.5, g));
      col = mix(col, uSun, smoothstep(0.45, 0.8, g));
      col = mix(col, uCream, smoothstep(0.78, 0.98, g));
      // faint shear highlight where the fluid is moving fast through thin ink
      float sp = length(texture(uVel, uv).xy);
      col += uOrange * 0.10 * smoothstep(60.0, 320.0, sp) * smoothstep(0.3, 0.05, g);
      vec2 c = uv * 2.0 - 1.0;
      col *= 0.9 + 0.1 * smoothstep(1.7, 0.3, dot(c, c));
      col += (hash21(floor(uv * 640.0) + vec2(fract(uTime * 7.0) * 13.0)) - 0.5) * 0.05 * uGrain;
      fragColor = vec4(col, 1.0);
    }`;

type Locs = Record<string, WebGLUniformLocation | null>;

interface Splat {
  x: number;
  y: number;
  fx: number;
  fy: number;
  rad: number;
}

interface Burst {
  x: number;
  y: number;
  pow: number;
}

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
    console.error(`ink-dissolve ${tag}:`, gl.getShaderInfoLog(sh));
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
    console.error(`ink-dissolve link ${tag}:`, gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

function locsOf(
  gl: WebGL2RenderingContext,
  prog: WebGLProgram,
  names: string[]
): Locs {
  const L: Locs = {};
  gl.useProgram(prog);
  for (const n of names) L[n] = gl.getUniformLocation(prog, n);
  return L;
}

export class InkDissolveAnimation extends PixiAnimation<typeof MANIFEST> {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private failed = false;

  // One program per pass of the solver.
  private pAdv: WebGLProgram | null = null;
  private pCurl: WebGLProgram | null = null;
  private pVort: WebGLProgram | null = null;
  private pDiv: WebGLProgram | null = null;
  private pPr: WebGLProgram | null = null;
  private pGrad: WebGLProgram | null = null;
  private pSplat: WebGLProgram | null = null;
  private pBurst: WebGLProgram | null = null;
  private pDye: WebGLProgram | null = null;
  private pDisp: WebGLProgram | null = null;
  private lAdv: Locs = {};
  private lCurl: Locs = {};
  private lVort: Locs = {};
  private lDiv: Locs = {};
  private lPr: Locs = {};
  private lGrad: Locs = {};
  private lSplat: Locs = {};
  private lBurst: Locs = {};
  private lDye: Locs = {};
  private lDisp: Locs = {};

  /**
   * Ping-pong pairs: velocity and pressure on the sim grid, dye on the
   * finer grid. `vi`/`pi`/`di` index the side currently holding the live
   * field; every pass reads `[i]` and writes `[1 - i]`, then flips.
   */
  private vel: WebGLTexture[] = [];
  private velFb: WebGLFramebuffer[] = [];
  private prTex: WebGLTexture[] = [];
  private prFb: WebGLFramebuffer[] = [];
  private dyeTex: WebGLTexture[] = [];
  private dyeFb: WebGLFramebuffer[] = [];
  /** Scratch targets: curl and divergence are written once and read once. */
  private curlT: WebGLTexture | null = null;
  private curlFb: WebGLFramebuffer | null = null;
  private divT: WebGLTexture | null = null;
  private divFb: WebGLFramebuffer | null = null;
  private logoTx: WebGLTexture | null = null;
  private vi = 0;
  private pi = 0;
  private di = 0;

  private sprite: PIXI.Sprite | null = null;
  private texture: PIXI.Texture | null = null;
  private time = 0;

  /** Fixed-step accumulator, and the last pointer / stirrer position in uv. */
  private acc = 0;
  private mx = -1;
  private my = -1;
  private ax = 0.5;
  private ay = 0.5;
  private nextBurst = 4;

  constructor(initialControls?: Partial<InkDissolveControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.time = 0;
    this.acc = 0;
    this.mx = -1;
    this.my = -1;
    this.ax = 0.5;
    this.ay = 0.5;
    this.nextBurst = 4;
  }

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
    // The velocity, pressure and dye fields are half-float render targets;
    // without this extension none of them is renderable.
    if (!gl.getExtension('EXT_color_buffer_float')) return false;

    const pAdv = program(gl, ADVECT_VEL, 'adv');
    const pCurl = program(gl, CURL, 'curl');
    const pVort = program(gl, VORT, 'vort');
    const pDiv = program(gl, DIVERGENCE, 'div');
    const pPr = program(gl, PRESSURE, 'pr');
    const pGrad = program(gl, GRADIENT, 'grad');
    const pSplat = program(gl, SPLAT, 'splat');
    const pBurst = program(gl, BURST, 'burst');
    const pDye = program(gl, ADVECT_DYE, 'dye');
    const pDisp = program(gl, DISPLAY, 'disp');
    if (
      !pAdv ||
      !pCurl ||
      !pVort ||
      !pDiv ||
      !pPr ||
      !pGrad ||
      !pSplat ||
      !pBurst ||
      !pDye ||
      !pDisp
    ) {
      return false;
    }

    const mkT = (w: number, h: number) => {
      const tx = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        w,
        h,
        0,
        gl.RGBA,
        gl.HALF_FLOAT,
        null
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tx;
    };
    // Clear on creation so the first advection samples a quiet field rather
    // than whatever the driver left in the allocation.
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

    const logoTx = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, logoTx);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      logoMask()
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const vel = [mkT(SW, SH), mkT(SW, SH)];
    const prTex = [mkT(SW, SH), mkT(SW, SH)];
    const dyeTex = [mkT(DW, DH), mkT(DW, DH)];
    const curlT = mkT(SW, SH);
    const divT = mkT(SW, SH);

    this.canvas = canvas;
    this.gl = gl;
    this.pAdv = pAdv;
    this.pCurl = pCurl;
    this.pVort = pVort;
    this.pDiv = pDiv;
    this.pPr = pPr;
    this.pGrad = pGrad;
    this.pSplat = pSplat;
    this.pBurst = pBurst;
    this.pDye = pDye;
    this.pDisp = pDisp;
    this.lAdv = locsOf(gl, pAdv, ['uVel', 'uDt', 'uDiss']);
    this.lCurl = locsOf(gl, pCurl, ['uVel']);
    this.lVort = locsOf(gl, pVort, ['uVel', 'uCurl', 'uDt', 'uEps']);
    this.lDiv = locsOf(gl, pDiv, ['uVel']);
    this.lPr = locsOf(gl, pPr, ['uPr', 'uDiv']);
    this.lGrad = locsOf(gl, pGrad, ['uVel', 'uPr']);
    this.lSplat = locsOf(gl, pSplat, ['uC', 'uF', 'uRad']);
    this.lBurst = locsOf(gl, pBurst, ['uC', 'uPow', 'uRad']);
    this.lDye = locsOf(gl, pDye, [
      'uDye',
      'uVel',
      'uLogo',
      'uDt',
      'uDiss',
      'uInj',
      'uAsp',
    ]);
    this.lDisp = locsOf(gl, pDisp, [
      'uDye',
      'uVel',
      'uTime',
      'uGrain',
      'uInk',
      'uOrange',
      'uSun',
      'uCream',
    ]);
    this.logoTx = logoTx;
    this.vel = vel;
    this.velFb = [mkFb(vel[0]), mkFb(vel[1])];
    this.prTex = prTex;
    this.prFb = [mkFb(prTex[0]), mkFb(prTex[1])];
    this.dyeTex = dyeTex;
    this.dyeFb = [mkFb(dyeTex[0]), mkFb(dyeTex[1])];
    this.curlT = curlT;
    this.curlFb = mkFb(curlT);
    this.divT = divT;
    this.divFb = mkFb(divT);
    this.vi = 0;
    this.pi = 0;
    this.di = 0;
    return true;
  }

  onUpdate(
    app: PIXI.Application,
    controls: InkDissolveControlValues,
    deltaTime: number
  ): void {
    if (this.failed) return;
    if (!this.gl && !this.build()) {
      this.failed = true;
      return;
    }
    const gl = this.gl!;

    if (!this.sprite) {
      this.texture = PIXI.Texture.from(this.canvas!);
      this.sprite = new PIXI.Sprite(this.texture);
      this.getRoot().addChild(this.sprite);
    }

    const dt = Math.min(0.05, deltaTime);
    this.time += dt;

    const sw = app.screen.width;
    const sh = app.screen.height;
    const inter = Number(controls.mode) > 0.5;

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

    // ---- gather velocity splats for this frame (in vel-grid px/s)
    const splats: Splat[] = [];
    const bursts: Burst[] = [];
    const mouse = this.pointer?.mouse;
    if (inter && mouse?.active) {
      const mx = mouse.x / sw;
      const my = 1 - mouse.y / sh;
      if (this.mx >= 0 && dt > 0) {
        let fx = ((mx - this.mx) * SW) / dt;
        let fy = ((my - this.my) * SH) / dt;
        const mag = Math.hypot(fx, fy);
        const cap = 900;
        if (mag > cap) {
          fx *= cap / mag;
          fy *= cap / mag;
        }
        if (mag > 1)
          splats.push({
            x: mx,
            y: my,
            fx: fx * controls.stir,
            fy: fy * controls.stir,
            rad: 22,
          });
      }
      this.mx = mx;
      this.my = my;
    } else {
      this.mx = -1;
    }
    if (!inter) {
      // wandering stirrer on a lissajous path
      const t = this.time;
      const ax =
        0.5 + 0.34 * Math.sin(t * 0.37 + 1.3) * Math.sin(t * 0.11 + 0.4);
      const ay = 0.5 + 0.32 * Math.sin(t * 0.53) * Math.cos(t * 0.09);
      if (dt > 0) {
        const fx = ((ax - this.ax) * SW) / dt;
        const fy = ((ay - this.ay) * SH) / dt;
        splats.push({ x: ax, y: ay, fx: fx * 1.6, fy: fy * 1.6, rad: 26 });
      }
      this.ax = ax;
      this.ay = ay;
      this.nextBurst -= dt;
      if (this.nextBurst <= 0) {
        bursts.push({
          x: rand(0.25, 0.75),
          y: rand(0.3, 0.7),
          pow: controls.burst * 0.7,
        });
        this.nextBurst = rand(4, 8);
      }
    }
    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        if (inter)
          bursts.push({ x: c.x / sw, y: 1 - c.y / sh, pow: controls.burst });
      }
    }

    const bindTex = (unit: number, tx: WebGLTexture | null) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tx);
    };

    // ---- apply splats additively onto current velocity
    // Additive blending is what makes this read-modify-write of the live
    // velocity buffer safe: the splat shaders never sample it.
    if (splats.length || bursts.length) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.blendEquation(gl.FUNC_ADD);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.velFb[this.vi]);
      gl.viewport(0, 0, SW, SH);
      if (splats.length) {
        gl.useProgram(this.pSplat);
        for (const e of splats) {
          gl.uniform2f(this.lSplat.uC!, e.x, e.y);
          gl.uniform2f(this.lSplat.uF!, e.fx, e.fy);
          gl.uniform1f(this.lSplat.uRad!, e.rad);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
      }
      if (bursts.length) {
        gl.useProgram(this.pBurst);
        for (const e of bursts) {
          gl.uniform2f(this.lBurst.uC!, e.x, e.y);
          gl.uniform1f(this.lBurst.uPow!, e.pow);
          gl.uniform1f(this.lBurst.uRad!, 60);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
      }
      gl.disable(gl.BLEND);
    }

    // ---- fixed-step sim, max 2 steps per frame
    this.acc = Math.min(this.acc + dt, 2 / 60);
    const STEP = 1 / 60;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      gl.viewport(0, 0, SW, SH);
      // 1. advect velocity — vel[vi] -> vel[1 - vi]
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.velFb[1 - this.vi]);
      gl.useProgram(this.pAdv);
      bindTex(0, this.vel[this.vi]);
      gl.uniform1i(this.lAdv.uVel!, 0);
      gl.uniform1f(this.lAdv.uDt!, STEP);
      gl.uniform1f(this.lAdv.uDiss!, controls.swirl);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.vi = 1 - this.vi;
      // 2. curl — vel[vi] -> curlT
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.curlFb);
      gl.useProgram(this.pCurl);
      bindTex(0, this.vel[this.vi]);
      gl.uniform1i(this.lCurl.uVel!, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // 3. vorticity confinement — vel[vi] + curlT -> vel[1 - vi]
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.velFb[1 - this.vi]);
      gl.useProgram(this.pVort);
      bindTex(0, this.vel[this.vi]);
      bindTex(1, this.curlT);
      gl.uniform1i(this.lVort.uVel!, 0);
      gl.uniform1i(this.lVort.uCurl!, 1);
      gl.uniform1f(this.lVort.uDt!, STEP);
      gl.uniform1f(this.lVort.uEps!, controls.vort);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.vi = 1 - this.vi;
      // 4. divergence — vel[vi] -> divT
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.divFb);
      gl.useProgram(this.pDiv);
      bindTex(0, this.vel[this.vi]);
      gl.uniform1i(this.lDiv.uVel!, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // 5. pressure jacobi (warm-started from last step)
      // pr[pi] + divT -> pr[1 - pi], twenty times; pi is never reset, so the
      // previous step's solution is the initial guess.
      gl.useProgram(this.pPr);
      gl.uniform1i(this.lPr.uPr!, 0);
      gl.uniform1i(this.lPr.uDiv!, 1);
      bindTex(1, this.divT);
      for (let i = 0; i < 20; i++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.prFb[1 - this.pi]);
        bindTex(0, this.prTex[this.pi]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        this.pi = 1 - this.pi;
      }
      // 6. subtract pressure gradient — vel[vi] + pr[pi] -> vel[1 - vi]
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.velFb[1 - this.vi]);
      gl.useProgram(this.pGrad);
      bindTex(0, this.vel[this.vi]);
      bindTex(1, this.prTex[this.pi]);
      gl.uniform1i(this.lGrad.uVel!, 0);
      gl.uniform1i(this.lGrad.uPr!, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.vi = 1 - this.vi;
      // 7. advect dye + re-inject the mark — dye[di] + vel[vi] + logo ->
      // dye[1 - di], on the finer dye grid.
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.dyeFb[1 - this.di]);
      gl.viewport(0, 0, DW, DH);
      gl.useProgram(this.pDye);
      bindTex(0, this.dyeTex[this.di]);
      bindTex(1, this.vel[this.vi]);
      bindTex(2, this.logoTx);
      gl.uniform1i(this.lDye.uDye!, 0);
      gl.uniform1i(this.lDye.uVel!, 1);
      gl.uniform1i(this.lDye.uLogo!, 2);
      gl.uniform1f(this.lDye.uDt!, STEP);
      gl.uniform1f(this.lDye.uDiss!, controls.body);
      gl.uniform1f(this.lDye.uInj!, controls.reform);
      gl.uniform1f(this.lDye.uAsp!, sw / Math.max(1, sh));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.di = 1 - this.di;
    }

    // ---- display: dye[di] tinted through the palette ramp, velocity used
    // only for the shear highlight, straight to the canvas.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.pDisp);
    bindTex(0, this.dyeTex[this.di]);
    bindTex(1, this.vel[this.vi]);
    gl.uniform1i(this.lDisp.uDye!, 0);
    gl.uniform1i(this.lDisp.uVel!, 1);
    gl.uniform1f(this.lDisp.uTime!, this.time);
    gl.uniform1f(this.lDisp.uGrain!, controls.grain ? 1 : 0);
    setColor(gl, this.lDisp.uInk!, PAL.ink);
    setColor(gl, this.lDisp.uOrange!, PAL.bright);
    setColor(gl, this.lDisp.uSun!, PAL.sun);
    setColor(gl, this.lDisp.uCream!, PAL.cream);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.texture?.source.update();
  }

  onDestroy(): void {
    const gl = this.gl;
    if (gl) {
      for (const tx of [
        ...this.vel,
        ...this.prTex,
        ...this.dyeTex,
        this.curlT,
        this.divT,
        this.logoTx,
      ]) {
        if (tx) gl.deleteTexture(tx);
      }
      for (const fb of [
        ...this.velFb,
        ...this.prFb,
        ...this.dyeFb,
        this.curlFb,
        this.divFb,
      ]) {
        if (fb) gl.deleteFramebuffer(fb);
      }
      for (const p of [
        this.pAdv,
        this.pCurl,
        this.pVort,
        this.pDiv,
        this.pPr,
        this.pGrad,
        this.pSplat,
        this.pBurst,
        this.pDye,
        this.pDisp,
      ]) {
        if (p) gl.deleteProgram(p);
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.gl = null;
    this.canvas = null;
    this.pAdv = null;
    this.pCurl = null;
    this.pVort = null;
    this.pDiv = null;
    this.pPr = null;
    this.pGrad = null;
    this.pSplat = null;
    this.pBurst = null;
    this.pDye = null;
    this.pDisp = null;
    this.lAdv = {};
    this.lCurl = {};
    this.lVort = {};
    this.lDiv = {};
    this.lPr = {};
    this.lGrad = {};
    this.lSplat = {};
    this.lBurst = {};
    this.lDye = {};
    this.lDisp = {};
    this.vel = [];
    this.velFb = [];
    this.prTex = [];
    this.prFb = [];
    this.dyeTex = [];
    this.dyeFb = [];
    this.curlT = null;
    this.curlFb = null;
    this.divT = null;
    this.divFb = null;
    this.logoTx = null;
    this.failed = false;
    this.sprite = null;
    this.texture?.destroy(true);
    this.texture = null;
    super.onDestroy();
  }
}

export function createInkDissolveAnimation(
  initialControls?: Partial<InkDissolveControlValues>
): InkDissolveAnimation {
  return new InkDissolveAnimation(initialControls);
}
