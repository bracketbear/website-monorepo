import * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { VERT, logoMask, setColor } from '../shared/shader-harness';

const MANIFEST = createManifest({
  id: 'rd-vat',
  name: 'RD Vat (GLSL)',
  description:
    'The mark dropped into a Gray-Scott reaction–diffusion vat — two chemicals feed and kill each other per pixel in a live feedback buffer, so the seed erodes, blooms, and regrows with real persistent state. Cursor stirs the chemistry; click drops a fresh blob; Chemistry switches growth regimes and Seed Texture restarts the vat from the mark, noise, rings, stripes, or a halftone grid. Ambient: a ghost stirrer wanders the vat.',
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
      name: 'chem',
      type: 'select',
      label: 'Chemistry',
      options: [
        { value: 0, label: 'Coral' },
        { value: 1, label: 'Mitosis' },
        { value: 2, label: 'Worms' },
        { value: 3, label: 'Solitons' },
      ],
      defaultValue: 0,
      debug: true,
    },
    {
      name: 'seedTex',
      type: 'select',
      label: 'Seed Texture',
      options: [
        { value: 0, label: 'The Mark' },
        { value: 1, label: 'Noise Specks' },
        { value: 2, label: 'Rings' },
        { value: 3, label: 'Stripes' },
        { value: 4, label: 'Halftone Grid' },
      ],
      defaultValue: 0,
      debug: true,
    },
    {
      name: 'speed',
      type: 'number',
      label: 'Reaction Speed',
      min: 2,
      max: 14,
      step: 1,
      defaultValue: 9,
      debug: true,
    },
    {
      name: 'brush',
      type: 'number',
      label: 'Stir Size',
      min: 0.01,
      max: 0.06,
      step: 0.005,
      defaultValue: 0.025,
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

export type RdVatControlValues = ManifestToControlValues<typeof MANIFEST>;

/** Feed and kill rates for each growth regime. */
const CHEM = [
  { f: 0.0545, k: 0.062 }, // coral
  { f: 0.0367, k: 0.0649 }, // mitosis
  { f: 0.078, k: 0.061 }, // worms
  { f: 0.03, k: 0.0605 }, // solitons
];

/** Simulation grid width; height follows the stage aspect. */
const SIM_WIDTH = 420;

const HELP = `
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
    }`;

const SIM_FRAG = `#version 300 es
      precision highp float;
      in vec2 vUV;
      out vec4 fragColor;
      uniform sampler2D uState;
      uniform vec2 uTexel;
      uniform float uFeed;
      uniform float uKill;
      uniform vec4 uBrush; // x, y, r, strength
      uniform vec4 uBlob;
      uniform float uAsp;
      void main() {
        vec2 t = uTexel;
        vec2 c = texture(uState, vUV).rg;
        vec2 lap = -c;
        lap += 0.2 * (texture(uState, vUV + vec2(t.x, 0.0)).rg + texture(uState, vUV - vec2(t.x, 0.0)).rg
                    + texture(uState, vUV + vec2(0.0, t.y)).rg + texture(uState, vUV - vec2(0.0, t.y)).rg);
        lap += 0.05 * (texture(uState, vUV + t).rg + texture(uState, vUV - t).rg
                     + texture(uState, vUV + vec2(t.x, -t.y)).rg + texture(uState, vUV - vec2(t.x, -t.y)).rg);
        float A = c.r, B = c.g;
        float rxn = A * B * B;
        A += 1.0 * lap.r - rxn + uFeed * (1.0 - A);
        B += 0.5 * lap.g + rxn - (uKill + uFeed) * B;
        vec2 q = (vUV - 0.5) * vec2(uAsp, 1.0);
        vec2 bq = (uBrush.xy - 0.5) * vec2(uAsp, 1.0);
        B += uBrush.w * exp(-dot(q - bq, q - bq) / (uBrush.z * uBrush.z));
        vec2 gq = (uBlob.xy - 0.5) * vec2(uAsp, 1.0);
        B += uBlob.w * exp(-dot(q - gq, q - gq) / (uBlob.z * uBlob.z));
        fragColor = vec4(clamp(A, 0.0, 1.0), clamp(B, 0.0, 1.0), 0.0, 1.0);
      }`;

const DISP_FRAG =
  `#version 300 es
      precision highp float;
      in vec2 vUV;
      out vec4 fragColor;
      uniform sampler2D uState;
      uniform float uTime;
      uniform float uGrain;
      uniform vec3 uInk;
      uniform vec3 uDeep;
      uniform vec3 uOrange;
      uniform vec3 uSun;
      uniform vec3 uCream;
      uniform vec2 uTexel;
      ` +
  HELP +
  `
      void main() {
        float B = texture(uState, vUV).g;
        float bx = texture(uState, vUV + vec2(uTexel.x, 0.0)).g - texture(uState, vUV - vec2(uTexel.x, 0.0)).g;
        float by = texture(uState, vUV + vec2(0.0, uTexel.y)).g - texture(uState, vUV - vec2(0.0, uTexel.y)).g;
        float v = B * 2.4;
        vec3 col = uInk * (0.9 + 0.2 * fbm(vUV * 3.0 + 5.1));
        col = mix(col, uDeep, smoothstep(0.10, 0.30, v));
        col = mix(col, uOrange, smoothstep(0.30, 0.55, v));
        col = mix(col, uSun, smoothstep(0.60, 0.85, v));
        col = mix(col, uCream, smoothstep(0.9, 1.15, v));
        // relief from the concentration gradient — makes it read as liquid
        col *= 1.0 + (bx - by) * 6.0;
        col += uOrange * length(vec2(bx, by)) * 2.5 * (1.0 - smoothstep(0.3, 0.6, v));
        vec2 cc = vUV * 2.0 - 1.0;
        col *= 0.9 + 0.1 * smoothstep(1.7, 0.3, dot(cc, cc));
        col += (hash21(floor(vUV / uTexel * 0.45) + vec2(fract(uTime * 7.0) * 13.0)) - 0.5) * 0.05 * uGrain;
        fragColor = vec4(col, 1.0);
      }`;

/** Paint a B-concentration seed onto a fresh A=1 field. */
function rdSeed(sw: number, sh: number, type: number): Float32Array {
  const data = new Float32Array(sw * sh * 4);
  const setB = (i: number, b: number) => {
    data[i * 4] = 1;
    data[i * 4 + 1] = b;
    data[i * 4 + 3] = 1;
  };
  for (let i = 0; i < sw * sh; i++) setB(i, 0);
  const t = Math.max(0, Math.min(4, Math.round(type || 0)));

  if (t === 0) {
    const logo = logoMask();
    const cv = document.createElement('canvas');
    cv.width = sw;
    cv.height = sh;
    const g = cv.getContext('2d')!;
    const lw = sw * 0.56;
    const lh = lw * (logo.height / logo.width);
    // Canvas is y-down and the state buffer is v-up, so flip to keep the
    // mark upright on screen.
    g.translate(sw / 2, sh / 2);
    g.scale(1, -1);
    g.drawImage(logo, -lw / 2, -lh / 2, lw, lh);
    const px = g.getImageData(0, 0, sw, sh).data;
    for (let i = 0; i < sw * sh; i++) if (px[i * 4 + 3] > 127) setB(i, 0.55);
  } else if (t === 1) {
    for (let n = 0; n < 130; n++) {
      const cx = Math.random() * sw;
      const cy = Math.random() * sh;
      const r = 2 + Math.random() * 3;
      for (
        let y = Math.max(0, (cy - r) | 0);
        y < Math.min(sh, cy + r + 1);
        y++
      ) {
        for (
          let x = Math.max(0, (cx - r) | 0);
          x < Math.min(sw, cx + r + 1);
          x++
        ) {
          if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r)
            setB(y * sw + x, 0.6);
        }
      }
    }
  } else {
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        let on = false;
        if (t === 2) {
          const d = Math.hypot(x - sw / 2, y - sh / 2);
          on = d % 30 < 3.5 && d > 8;
        } else if (t === 3) {
          on = (x + y) % 34 < 4;
        } else {
          on = Math.hypot((x % 26) - 13, (y % 26) - 13) < 4.2;
        }
        if (on) setB(y * sw + x, 0.6);
      }
    }
  }
  return data;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('rd-vat shader:', gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

function program(gl: WebGL2RenderingContext, frag: string) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error('rd-vat link:', gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

type Locs = Record<string, WebGLUniformLocation | null>;

/**
 * Gray-Scott reaction-diffusion over a ping-pong pair of float textures.
 * Needs its own FBO setup, so it does not use the shared blit harness.
 */
export class RdVatAnimation extends PixiAnimation<typeof MANIFEST> {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private simProg: WebGLProgram | null = null;
  private dispProg: WebGLProgram | null = null;
  private simL: Locs = {};
  private dispL: Locs = {};
  private state: (WebGLTexture | null)[] = [null, null];
  private fbo: (WebGLFramebuffer | null)[] = [null, null];
  private cur = 0;
  private simW = 0;
  private simH = 0;
  private failed = false;

  private sprite: PIXI.Sprite | null = null;
  private texture: PIXI.Texture | null = null;
  private time = 0;
  private blob: { x: number; y: number; age: number } | null = null;
  private lastSeed: number | null = null;

  constructor(initialControls?: Partial<RdVatControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.time = 0;
    this.blob = null;
    this.lastSeed = null;
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
    // Float render targets are mandatory for the feedback buffer.
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) return false;

    const simProg = program(gl, SIM_FRAG);
    const dispProg = program(gl, DISP_FRAG);
    if (!simProg || !dispProg) return false;

    gl.useProgram(simProg);
    for (const n of [
      'uState',
      'uTexel',
      'uFeed',
      'uKill',
      'uBrush',
      'uBlob',
      'uAsp',
    ]) {
      this.simL[n] = gl.getUniformLocation(simProg, n);
    }
    gl.useProgram(dispProg);
    for (const n of [
      'uState',
      'uTime',
      'uGrain',
      'uInk',
      'uDeep',
      'uOrange',
      'uSun',
      'uCream',
      'uTexel',
    ]) {
      this.dispL[n] = gl.getUniformLocation(dispProg, n);
    }

    this.canvas = canvas;
    this.gl = gl;
    this.simProg = simProg;
    this.dispProg = dispProg;
    return true;
  }

  private initState(sw: number, sh: number, data: Float32Array): void {
    const gl = this.gl!;
    this.simW = sw;
    this.simH = sh;
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

  private reseed(data: Float32Array): void {
    const gl = this.gl!;
    for (let i = 0; i < 2; i++) {
      gl.bindTexture(gl.TEXTURE_2D, this.state[i]);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        this.simW,
        this.simH,
        0,
        gl.RGBA,
        gl.FLOAT,
        data
      );
    }
  }

  onUpdate(
    app: PIXI.Application,
    controls: RdVatControlValues,
    deltaTime: number
  ): void {
    if (this.failed) return;
    if (!this.gl && !this.build()) {
      this.failed = true;
      return;
    }
    const gl = this.gl!;

    const sw = app.screen.width;
    const sh = app.screen.height;

    if (!this.simW) {
      const gw = SIM_WIDTH;
      const gh = Math.max(64, Math.round((gw * sh) / Math.max(1, sw)));
      this.initState(gw, gh, rdSeed(gw, gh, Number(controls.seedTex)));
      this.lastSeed = Number(controls.seedTex);
    }

    if (!this.sprite) {
      this.texture = PIXI.Texture.from(this.canvas!);
      this.sprite = new PIXI.Sprite(this.texture);
      this.getRoot().addChild(this.sprite);
    }

    const dt = Math.min(0.05, deltaTime);
    this.time += dt;

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

    const seedTex = Number(controls.seedTex);
    if (this.lastSeed !== seedTex) {
      this.lastSeed = seedTex;
      this.reseed(rdSeed(this.simW, this.simH, seedTex));
    }

    const interactive = Number(controls.mode) > 0.5;
    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        if (interactive) this.blob = { x: c.x / sw, y: 1 - c.y / sh, age: 0 };
      }
    }
    if (this.blob) {
      this.blob.age += dt;
      if (this.blob.age > 0.1) this.blob = null;
    }

    let bx = -9;
    let by = -9;
    let bs = 0;
    const mouse = pointer?.mouse;
    if (interactive && mouse?.active) {
      bx = mouse.x / sw;
      by = 1 - mouse.y / sh;
      bs = 0.3;
    } else if (!interactive) {
      // Ambient: a ghost stirrer wanders the vat.
      const t = this.time * 0.3;
      bx = 0.5 + 0.4 * Math.sin(t * 1.07) * Math.sin(t * 0.23 + 1.0);
      by = 0.5 + 0.36 * Math.sin(t * 0.83 + 2.0);
      bs = 0.22;
    }

    const chem =
      CHEM[Math.max(0, Math.min(3, Math.round(Number(controls.chem))))];
    const asp = this.simW / this.simH;
    const steps = Math.round(controls.speed);

    for (let i = 0; i < steps; i++) {
      const dst = 1 - this.cur;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[dst]);
      gl.viewport(0, 0, this.simW, this.simH);
      gl.useProgram(this.simProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.state[this.cur]);
      gl.uniform1i(this.simL.uState!, 0);
      gl.uniform2f(this.simL.uTexel!, 1 / this.simW, 1 / this.simH);
      gl.uniform1f(this.simL.uFeed!, chem.f);
      gl.uniform1f(this.simL.uKill!, chem.k);
      gl.uniform1f(this.simL.uAsp!, asp);
      gl.uniform4f(this.simL.uBrush!, bx, by, controls.brush, bs * 0.09);
      if (this.blob) {
        gl.uniform4f(
          this.simL.uBlob!,
          this.blob.x,
          this.blob.y,
          controls.brush * 2.6,
          0.6
        );
      } else {
        gl.uniform4f(this.simL.uBlob!, -9, -9, 0.01, 0);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.cur = dst;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.dispProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.state[this.cur]);
    gl.uniform1i(this.dispL.uState!, 0);
    gl.uniform1f(this.dispL.uTime!, this.time);
    gl.uniform1f(this.dispL.uGrain!, controls.grain ? 1 : 0);
    gl.uniform2f(this.dispL.uTexel!, 1 / this.simW, 1 / this.simH);
    setColor(gl, this.dispL.uInk!, PAL.ink);
    setColor(gl, this.dispL.uDeep!, PAL.deep);
    setColor(gl, this.dispL.uOrange!, PAL.bright);
    setColor(gl, this.dispL.uSun!, PAL.sun);
    setColor(gl, this.dispL.uCream!, PAL.cream);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.texture?.source.update();
  }

  onDestroy(): void {
    const gl = this.gl;
    if (gl) {
      for (let i = 0; i < 2; i++) {
        if (this.state[i]) gl.deleteTexture(this.state[i]);
        if (this.fbo[i]) gl.deleteFramebuffer(this.fbo[i]);
      }
      if (this.simProg) gl.deleteProgram(this.simProg);
      if (this.dispProg) gl.deleteProgram(this.dispProg);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.state = [null, null];
    this.fbo = [null, null];
    this.simW = 0;
    this.simH = 0;
    this.cur = 0;
    this.gl = null;
    this.canvas = null;
    this.simProg = null;
    this.dispProg = null;
    this.failed = false;
    this.sprite = null;
    this.texture?.destroy(true);
    this.texture = null;
    super.onDestroy();
  }
}

export function createRdVatAnimation(
  initialControls?: Partial<RdVatControlValues>
): RdVatAnimation {
  return new RdVatAnimation(initialControls);
}
