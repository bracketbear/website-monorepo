import * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation, rand } from '@bracketbear/flateralus-pixi';
import { logoMask, setColor } from '../shared/shader-harness';

const MANIFEST = createManifest({
  id: 'slime-mold',
  name: 'Slime Mold (GLSL)',
  description:
    'A physarum colony run entirely on the GPU — 131k agents live in a float texture, sense the trail map ahead of them, steer, and deposit as they move; the trail diffuses and decays underneath. The mark is a food field, so the network keeps converging into the logo. Your cursor lays a scent trail the colony chases; click to burn a hole in the network and watch it reroute. Ambient: food pulses drop on their own.',
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
      name: 'pop',
      type: 'number',
      label: 'Colony ×1k',
      min: 8,
      max: 131,
      step: 1,
      defaultValue: 64,
      debug: true,
    },
    {
      name: 'sa',
      type: 'number',
      label: 'Sense Angle°',
      min: 10,
      max: 60,
      step: 1,
      defaultValue: 28,
      debug: true,
    },
    {
      name: 'sd',
      type: 'number',
      label: 'Sense Reach',
      min: 4,
      max: 28,
      step: 1,
      defaultValue: 12,
      debug: true,
    },
    {
      name: 'speed',
      type: 'number',
      label: 'Speed',
      min: 20,
      max: 140,
      step: 5,
      defaultValue: 70,
      debug: true,
    },
    {
      name: 'decay',
      type: 'number',
      label: 'Trail Decay',
      min: 0.9,
      max: 0.99,
      step: 0.005,
      defaultValue: 0.96,
      debug: true,
    },
    {
      name: 'food',
      type: 'number',
      label: 'Mark Pull',
      min: 0,
      max: 12,
      step: 0.5,
      defaultValue: 6,
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

export type SlimeMoldControlValues = ManifestToControlValues<typeof MANIFEST>;

/**
 * Agent texture dimensions: 512 x 256 texels, so 131,072 agents maximum.
 * Each texel holds one agent as RGBA32F — .xy is position in 0..1 trail-map
 * UV space, .z is heading in radians, .w is carried through untouched.
 */
const AW = 512;
const AH = 256;

/** Trail map resolution. Fixed, so sim cost does not follow canvas size. */
const SW = 960;
const SH = 540;

/** Carried across from the prototype verbatim. Do not reformat the GLSL. */
const VERT = `#version 300 es
    out vec2 vUV;
    void main() {
      vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
      vUV = p;
      gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`;
/**
 * Carried across from the prototype verbatim. Do not reformat the GLSL.
 * The prototype spliced its shared `HELP` noise kit in by concatenation and
 * interpolated SW/SH; both are resolved inline here.
 */
const UPDATE_FRAG = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform sampler2D uAgents;
    uniform sampler2D uTrail;
    uniform sampler2D uLogo;
    uniform float uDt;
    uniform float uTime;
    uniform float uSpeed;   // px per second in sim space
    uniform float uSA;      // sensor angle, radians
    uniform float uSD;      // sensor distance, sim px
    uniform float uTurn;    // turn rate, rad/s
    uniform float uFood;    // logo food weight (0 = off)

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
    const vec2 SIM = vec2(960.0, 540.0);
    const float ASP = 960.0 / 540.0;
    float senseAt(vec2 p) {
      p = fract(p);
      float v = texture(uTrail, p).r;
      if (uFood > 0.0) {
        vec2 q = (p - 0.5) * vec2(ASP, 1.0);
        vec2 luv = q / vec2(0.62, 0.62 / 1.6) + 0.5;
        if (luv.x > 0.0 && luv.x < 1.0 && luv.y > 0.0 && luv.y < 1.0)
          v += texture(uLogo, vec2(luv.x, 1.0 - luv.y)).a * uFood;
      }
      return v;
    }
    void main() {
      vec4 a = texelFetch(uAgents, ivec2(gl_FragCoord.xy), 0);
      vec2 pos = a.xy;
      float ang = a.z;
      vec2 px = 1.0 / SIM;
      float F = senseAt(pos + vec2(cos(ang), sin(ang)) * uSD * px);
      float L = senseAt(pos + vec2(cos(ang + uSA), sin(ang + uSA)) * uSD * px);
      float Rv = senseAt(pos + vec2(cos(ang - uSA), sin(ang - uSA)) * uSD * px);
      float rnd = hash21(gl_FragCoord.xy + fract(uTime) * vec2(211.7, 97.3));
      float turn = uTurn * uDt;
      if (F > L && F > Rv) { /* hold course */ }
      else if (F < L && F < Rv) ang += (rnd - 0.5) * 2.0 * turn;
      else if (L > Rv) ang += turn;
      else ang -= turn;
      ang += (rnd - 0.5) * 0.2 * turn;
      pos = fract(pos + vec2(cos(ang), sin(ang)) * uSpeed * uDt * px);
      fragColor = vec4(pos, ang, a.w);
    }`;
/** Carried across from the prototype verbatim. Do not reformat the GLSL. */
const DIFFUSE_FRAG = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform sampler2D uTrail;
    uniform float uDecay;
    const vec2 SIM = vec2(960.0, 540.0);
    void main() {
      vec2 px = 1.0 / SIM;
      float sum = 0.0;
      for (int dy = -1; dy <= 1; dy++)
        for (int dx = -1; dx <= 1; dx++)
          sum += texture(uTrail, fract(vUV + vec2(float(dx), float(dy)) * px)).r;
      float v = mix(texture(uTrail, vUV).r, sum / 9.0, 0.4);
      fragColor = vec4(max(v * uDecay, 0.0), 0.0, 0.0, 1.0);
    }`;
/** Carried across from the prototype verbatim. Do not reformat the GLSL. */
const DEPOSIT_VERT = `#version 300 es
    uniform sampler2D uAgents;
    void main() {
      ivec2 ij = ivec2(gl_VertexID % 512, gl_VertexID / 512);
      vec4 a = texelFetch(uAgents, ij, 0);
      gl_Position = vec4(a.xy * 2.0 - 1.0, 0.0, 1.0);
      gl_PointSize = 1.0;
    }`;
/** Carried across from the prototype verbatim. Do not reformat the GLSL. */
const DEPOSIT_FRAG = `#version 300 es
    precision highp float;
    out vec4 fragColor;
    uniform float uDep;
    void main() { fragColor = vec4(uDep, 0.0, 0.0, 1.0); }`;
/** Carried across from the prototype verbatim. Do not reformat the GLSL. */
const BLOB_FRAG = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform vec2 uC;      // uv
    uniform float uRad;   // sim px
    uniform float uAmt;
    const vec2 SIM = vec2(960.0, 540.0);
    void main() {
      float d = distance(vUV * SIM, uC * SIM);
      fragColor = vec4(uAmt * smoothstep(uRad, uRad * 0.15, d), 0.0, 0.0, 1.0);
    }`;
/**
 * Carried across from the prototype verbatim. Do not reformat the GLSL.
 * Same concatenated `HELP` splice as UPDATE_FRAG, resolved inline.
 */
const DISPLAY_FRAG = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform sampler2D uTrail;
    uniform float uTime;
    uniform float uGrain;
    uniform vec3 uInk;
    uniform vec3 uOrange;
    uniform vec3 uSun;
    uniform vec3 uCream;

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
      float d = max(texture(uTrail, uv).r, 0.0);
      float g = 1.0 - exp(-d * 0.9);
      vec3 col = uInk * (0.8 + 0.25 * fbm(uv * 3.0 + 2.7)) + 0.008;
      col = mix(col, uOrange * 0.55, smoothstep(0.03, 0.22, g));
      col = mix(col, uOrange, smoothstep(0.18, 0.5, g));
      col = mix(col, uSun, smoothstep(0.45, 0.78, g));
      col = mix(col, uCream, smoothstep(0.75, 0.97, g));
      vec2 c = uv * 2.0 - 1.0;
      col *= 0.9 + 0.1 * smoothstep(1.7, 0.3, dot(c, c));
      col += (hash21(floor(uv * 640.0) + vec2(fract(uTime * 7.0) * 13.0)) - 0.5) * 0.05 * uGrain;
      fragColor = vec4(col, 1.0);
    }`;

type Locs = Record<string, WebGLUniformLocation | null>;

/** A blob stamped into the trail map once — a click burn or an ambient pulse. */
interface BlobEvent {
  x: number;
  y: number;
  rad: number;
  /** Negative burns (reverse-subtract), positive feeds (additive). */
  amt: number;
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
    console.error(`slime-mold ${tag}:`, gl.getShaderInfoLog(sh));
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
    console.error(`slime-mold link ${tag}:`, gl.getProgramInfoLog(p));
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
  for (const n of names) L[n] = gl.getUniformLocation(prog, n);
  return L;
}

/** One step of the sim runs at a fixed 60 Hz regardless of frame rate. */
const STEP = 1 / 60;

/**
 * Physarum, entirely on the GPU. Five programs across two ping-pong pairs:
 *
 *   agents  ag[ai] + tr[ti] -> ag[1-ai]   sense, steer, advance
 *   diffuse tr[ti]          -> tr[1-ti]   3x3 blur, then decay
 *   deposit ag[ai]          -> tr[ti]     one additive point per agent
 *   blob    (none)          -> tr[ti]     cursor scent, click burns, pulses
 *   display tr[ti]          -> canvas     trail density to the palette ramp
 *
 * The sim resolution is fixed at SW x SH, so only the display pass follows
 * the canvas size. Agent state is packed into RGBA32F: xy position in trail
 * UV space, z heading in radians, w unused but preserved so the layout has
 * room without a second texture.
 */
export class SlimeMoldAnimation extends PixiAnimation<typeof MANIFEST> {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private updateProg: WebGLProgram | null = null;
  private diffuseProg: WebGLProgram | null = null;
  private depositProg: WebGLProgram | null = null;
  private blobProg: WebGLProgram | null = null;
  private dispProg: WebGLProgram | null = null;
  private updateL: Locs = {};
  private diffuseL: Locs = {};
  private depositL: Locs = {};
  private blobL: Locs = {};
  private dispL: Locs = {};
  private logoTx: WebGLTexture | null = null;
  /** Agent state ping-pong, and the index currently holding the live state. */
  private ag: (WebGLTexture | null)[] = [];
  private agFb: (WebGLFramebuffer | null)[] = [];
  private ai = 0;
  /** Trail map ping-pong, and the index currently holding the live map. */
  private tr: (WebGLTexture | null)[] = [];
  private trFb: (WebGLFramebuffer | null)[] = [];
  private ti = 0;
  private failed = false;

  private sprite: PIXI.Sprite | null = null;
  private texture: PIXI.Texture | null = null;
  private time = 0;
  /** Leftover frame time owed to the fixed-step sim. */
  private acc = 0;
  /** Seconds until the next ambient food pulse. */
  private nextAuto = 1.5;

  constructor(initialControls?: Partial<SlimeMoldControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.time = 0;
    this.acc = 0;
    this.nextAuto = 1.5;
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
    // Agent state and the trail map are both float render targets; without
    // this extension neither can be drawn into, so there is no fallback.
    if (!gl.getExtension('EXT_color_buffer_float')) return false;

    const updateProg = program(gl, VERT, UPDATE_FRAG, 'update');
    const diffuseProg = program(gl, VERT, DIFFUSE_FRAG, 'diffuse');
    const depositProg = program(gl, DEPOSIT_VERT, DEPOSIT_FRAG, 'deposit');
    const blobProg = program(gl, VERT, BLOB_FRAG, 'blob');
    const dispProg = program(gl, VERT, DISPLAY_FRAG, 'disp');
    if (!updateProg || !diffuseProg || !depositProg || !blobProg || !dispProg) {
      return false;
    }

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

    // Seed every agent at a random position with a random heading. Both
    // ping-pong textures start from the same seed so the first update reads
    // valid state whichever way the pair is oriented.
    const seed = new Float32Array(AW * AH * 4);
    for (let i = 0; i < AW * AH; i++) {
      seed[i * 4] = Math.random();
      seed[i * 4 + 1] = Math.random();
      seed[i * 4 + 2] = Math.random() * Math.PI * 2;
    }
    const mkAg = (data: Float32Array) => {
      const tx = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tx);
      // NEAREST: the update pass texelFetches exact agent slots, never blends.
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32F,
        AW,
        AH,
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
    const mkTr = () => {
      const tx = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tx);
      // Half float is enough headroom for trail density and halves bandwidth
      // on the 3x3 diffuse, which is the per-step cost that matters.
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        SW,
        SH,
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

    const ag = [mkAg(seed), mkAg(seed)];
    const tr = [mkTr(), mkTr()];

    this.canvas = canvas;
    this.gl = gl;
    this.updateProg = updateProg;
    this.diffuseProg = diffuseProg;
    this.depositProg = depositProg;
    this.blobProg = blobProg;
    this.dispProg = dispProg;
    this.logoTx = logoTx;
    this.updateL = locsOf(gl, updateProg, [
      'uAgents',
      'uTrail',
      'uLogo',
      'uDt',
      'uTime',
      'uSpeed',
      'uSA',
      'uSD',
      'uTurn',
      'uFood',
    ]);
    this.diffuseL = locsOf(gl, diffuseProg, ['uTrail', 'uDecay']);
    this.depositL = locsOf(gl, depositProg, ['uAgents', 'uDep']);
    this.blobL = locsOf(gl, blobProg, ['uC', 'uRad', 'uAmt']);
    this.dispL = locsOf(gl, dispProg, [
      'uTrail',
      'uTime',
      'uGrain',
      'uInk',
      'uOrange',
      'uSun',
      'uCream',
    ]);
    this.ag = ag;
    this.agFb = [mkFb(ag[0]), mkFb(ag[1])];
    this.tr = tr;
    this.trFb = [mkFb(tr[0]), mkFb(tr[1])];
    this.ai = 0;
    this.ti = 0;
    return true;
  }

  onUpdate(
    app: PIXI.Application,
    controls: SlimeMoldControlValues,
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
    const interactive = Number(controls.mode) > 0.5;

    // Blob events fire once per frame, not once per sim step, so a click
    // burns the same hole regardless of how many steps the frame runs.
    const events: BlobEvent[] = [];
    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        if (interactive) {
          events.push({ x: c.x / sw, y: 1 - c.y / sh, rad: 55, amt: -5 });
        }
      }
    }
    if (!interactive) {
      this.nextAuto -= dt;
      if (this.nextAuto <= 0) {
        events.push({
          x: 0.15 + Math.random() * 0.7,
          y: 0.15 + Math.random() * 0.7,
          rad: 30,
          amt: 2.4,
        });
        this.nextAuto = rand(2.2, 4.0);
      }
    }

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

    // Fixed-step sim, capped at two steps per frame so a stalled tab cannot
    // spiral into an unbounded catch-up.
    this.acc = Math.min(this.acc + dt, 2 / 60);
    const m = this.pointer?.mouse;
    while (this.acc >= STEP) {
      this.acc -= STEP;

      // 1. Agent update: ag[ai] + tr[ti] -> ag[1-ai], then flip.
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.agFb[1 - this.ai]);
      gl.viewport(0, 0, AW, AH);
      gl.useProgram(this.updateProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.ag[this.ai]);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.tr[this.ti]);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.logoTx);
      gl.uniform1i(this.updateL.uAgents!, 0);
      gl.uniform1i(this.updateL.uTrail!, 1);
      gl.uniform1i(this.updateL.uLogo!, 2);
      gl.uniform1f(this.updateL.uDt!, STEP);
      gl.uniform1f(this.updateL.uTime!, this.time);
      gl.uniform1f(this.updateL.uSpeed!, controls.speed);
      gl.uniform1f(this.updateL.uSA!, (controls.sa * Math.PI) / 180);
      gl.uniform1f(this.updateL.uSD!, controls.sd);
      gl.uniform1f(this.updateL.uTurn!, 7.0);
      gl.uniform1f(this.updateL.uFood!, controls.food);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.ai = 1 - this.ai;

      // 2. Diffuse + decay: tr[ti] -> tr[1-ti], then flip.
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.trFb[1 - this.ti]);
      gl.viewport(0, 0, SW, SH);
      gl.useProgram(this.diffuseProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.tr[this.ti]);
      gl.uniform1i(this.diffuseL.uTrail!, 0);
      gl.uniform1f(this.diffuseL.uDecay!, controls.decay);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.ti = 1 - this.ti;

      // 3. Deposit: one additive point per agent, read from ag[ai] in the
      // vertex shader and blended into the freshly diffused tr[ti] in place.
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.blendEquation(gl.FUNC_ADD);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.trFb[this.ti]);
      gl.viewport(0, 0, SW, SH);
      gl.useProgram(this.depositProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.ag[this.ai]);
      gl.uniform1i(this.depositL.uAgents!, 0);
      gl.uniform1f(this.depositL.uDep!, 0.55);
      gl.drawArrays(
        gl.POINTS,
        0,
        Math.min(AW * AH, Math.round(controls.pop * 1000))
      );

      // Cursor scent, stamped every step so a held pointer lays a continuous
      // trail rather than a dotted one.
      if (interactive && m?.active) {
        gl.useProgram(this.blobProg);
        gl.uniform2f(this.blobL.uC!, m.x / sw, 1 - m.y / sh);
        gl.uniform1f(this.blobL.uRad!, 11);
        gl.uniform1f(this.blobL.uAmt!, 0.55);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.disable(gl.BLEND);
    }

    // Click burns and ambient pulses, into the live trail map tr[ti].
    if (events.length) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.trFb[this.ti]);
      gl.viewport(0, 0, SW, SH);
      gl.useProgram(this.blobProg);
      for (const e of events) {
        // A burn subtracts density rather than writing zero, so the hole has
        // soft edges the colony can immediately start re-growing into.
        gl.blendEquation(e.amt < 0 ? gl.FUNC_REVERSE_SUBTRACT : gl.FUNC_ADD);
        gl.uniform2f(this.blobL.uC!, e.x, e.y);
        gl.uniform1f(this.blobL.uRad!, e.rad);
        gl.uniform1f(this.blobL.uAmt!, Math.abs(e.amt));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.blendEquation(gl.FUNC_ADD);
      gl.disable(gl.BLEND);
    }

    // 4. Display: tr[ti] -> canvas, at full canvas resolution.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.dispProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tr[this.ti]);
    gl.uniform1i(this.dispL.uTrail!, 0);
    gl.uniform1f(this.dispL.uTime!, this.time);
    gl.uniform1f(this.dispL.uGrain!, controls.grain ? 1 : 0);
    setColor(gl, this.dispL.uInk!, PAL.ink);
    setColor(gl, this.dispL.uOrange!, PAL.bright);
    setColor(gl, this.dispL.uSun!, PAL.sun);
    setColor(gl, this.dispL.uCream!, PAL.cream);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.texture?.source.update();
  }

  onDestroy(): void {
    const gl = this.gl;
    if (gl) {
      if (this.logoTx) gl.deleteTexture(this.logoTx);
      for (const t of this.ag) if (t) gl.deleteTexture(t);
      for (const t of this.tr) if (t) gl.deleteTexture(t);
      for (const f of this.agFb) if (f) gl.deleteFramebuffer(f);
      for (const f of this.trFb) if (f) gl.deleteFramebuffer(f);
      if (this.updateProg) gl.deleteProgram(this.updateProg);
      if (this.diffuseProg) gl.deleteProgram(this.diffuseProg);
      if (this.depositProg) gl.deleteProgram(this.depositProg);
      if (this.blobProg) gl.deleteProgram(this.blobProg);
      if (this.dispProg) gl.deleteProgram(this.dispProg);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.gl = null;
    this.canvas = null;
    this.updateProg = null;
    this.diffuseProg = null;
    this.depositProg = null;
    this.blobProg = null;
    this.dispProg = null;
    this.updateL = {};
    this.diffuseL = {};
    this.depositL = {};
    this.blobL = {};
    this.dispL = {};
    this.logoTx = null;
    this.ag = [];
    this.agFb = [];
    this.tr = [];
    this.trFb = [];
    this.ai = 0;
    this.ti = 0;
    this.failed = false;
    this.sprite = null;
    this.texture?.destroy(true);
    this.texture = null;
    super.onDestroy();
  }
}

export function createSlimeMoldAnimation(
  initialControls?: Partial<SlimeMoldControlValues>
): SlimeMoldAnimation {
  return new SlimeMoldAnimation(initialControls);
}
