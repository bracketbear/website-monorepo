import * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { logoMask, setColor } from '../shared/shader-harness';

const MANIFEST = createManifest({
  id: 'holo-mark',
  name: 'Hologram Mark (GLSL 3D)',
  description:
    'The mark as true 3D geometry with no mesh and no 3D library: a signed distance field is computed from the logo at load, extruded to a solid, and sphere-traced per pixel with analytic normals. The lit render then runs through a CRT chain — barrel distortion, chromatic split, tear bands, phosphor triads, scanlines. Pointer position steers the mark; fast movement accumulates instability, and past the threshold the signal tears, sync-rolls, and re-locks with a flash. Click to jolt it directly. Ambient: slow turntable with occasional dropouts.',
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
      name: 'depth',
      type: 'number',
      label: 'Extrusion Depth',
      min: 0.1,
      max: 0.9,
      step: 0.05,
      defaultValue: 0.35,
      debug: true,
    },
    {
      name: 'spin',
      type: 'number',
      label: 'Turntable Speed',
      min: 0,
      max: 2,
      step: 0.1,
      defaultValue: 0.5,
      debug: true,
    },
    {
      name: 'scan',
      type: 'number',
      label: 'Hologram Scanlines',
      min: 20,
      max: 160,
      step: 5,
      defaultValue: 70,
      debug: true,
    },
    {
      name: 'chroma',
      type: 'number',
      label: 'Chromatic Split',
      min: 0,
      max: 3,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'glow',
      type: 'number',
      label: 'Phosphor Glow',
      min: 0.2,
      max: 2,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'sens',
      type: 'number',
      label: 'Instability Sensitivity',
      min: 0.2,
      max: 3,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'mask',
      type: 'boolean',
      label: 'Phosphor Mask',
      defaultValue: true,
      debug: true,
    },
  ],
} as const);

export type HoloMarkControlValues = ManifestToControlValues<typeof MANIFEST>;

/** Carried across from the prototype verbatim. Do not reformat the GLSL. */
const VERT = `#version 300 es
    out vec2 vUV;
    void main() {
      vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
      vUV = p;
      gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`;
const SCENE = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uSDF;
    uniform vec2 uRes;
    uniform float uTime, uYaw, uPitch, uDepth, uScan, uFlash, uGlow;
    uniform vec3 uOrange, uSun, uCyan, uInk;
    
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
    const vec2 HALF = vec2(0.9, 0.5625);
    float sd2(vec2 xy) {
      vec2 uv = xy / (2.0 * HALF) + 0.5;
      vec2 cuv = clamp(uv, 0.0, 1.0);
      float d = (texture(uSDF, vec2(cuv.x, 1.0 - cuv.y)).r - 0.5) * 0.3;
      return d + length((uv - cuv) * (2.0 * HALF));
    }
    float map(vec3 p) {
      vec2 w = vec2(sd2(p.xy), abs(p.z) - uDepth * 0.5);
      return min(max(w.x, w.y), 0.0) + length(max(w, vec2(0.0)));
    }
    vec3 norm(vec3 p) {
      vec2 e = vec2(0.006, 0.0);
      return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)));
    }
    void main() {
      float asp = uRes.x / uRes.y;
      vec2 q = (vUV - 0.5) * vec2(asp, 1.0);
      // fit the full 1.8 x 1.125 x depth extrusion at any canvas aspect, with margin
      float dist = max(0.9 * 1.9 / (0.5 * asp), 0.5625 * 1.9 / 0.5) * 1.35 + uDepth;
      vec3 ro = vec3(0.0, 0.02, dist);
      vec3 rd = normalize(vec3(q, -1.9));
      float cy = cos(uYaw), sy = sin(uYaw), cx = cos(uPitch), sx = sin(uPitch);
      mat3 Ry = mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy);
      mat3 Rx = mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx);
      mat3 Rm = Ry * Rx;
      ro = Rm * ro; rd = Rm * rd;
      float t = 0.0, hit = -1.0, near = 1e5;
      for (int i = 0; i < 80; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        near = min(near, d);
        if (d < 0.0025) { hit = t; break; }
        t += d * 0.9;
        if (t > 7.0) break;
      }
      vec3 col = uInk * (0.7 + 0.3 * fbm(vUV * 3.0 + vec2(0.0, uTime * 0.02)));
      col += uOrange * 0.10 * exp(-dot(q, q) * 2.2);
      // near-miss glow: the projection bleeds a little past the silhouette
      col += uOrange * 0.18 * exp(-near * 22.0) * uGlow;
      if (hit > 0.0) {
        vec3 p = ro + rd * hit;
        vec3 n = norm(p);
        float fres = pow(1.0 - abs(dot(n, -rd)), 2.0);
        float scan = 0.72 + 0.28 * sin(p.y * uScan - uTime * 3.0);
        vec3 holo = uOrange * 0.55 + uSun * 0.5 * max(dot(n, normalize(vec3(0.4, 0.7, 0.6))), 0.0);
        holo = mix(holo, uCyan, 0.18 * fres);
        holo += uSun * fres * 1.2;
        holo *= scan;
        holo *= (0.92 + 0.08 * sin(uTime * 57.0) + 0.05 * sin(uTime * 23.7)) * uGlow;
        holo += uCyan * uFlash * 1.4;
        col = mix(col, holo, 0.96);
        col += uOrange * 0.25 * fres;
      }
      fragColor = vec4(col, 1.0);
    }`;
const POST = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uScene;
    uniform vec2 uRes;
    uniform float uTime, uGlitch, uChroma, uMask, uFlash;
    
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
      vec2 c = vUV * 2.0 - 1.0;
      c *= 1.0 + 0.045 * dot(c, c);
      vec2 uv = c * 0.5 + 0.5;
      bool oob0 = uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0;
      float g = uGlitch;
      if (g > 0.003) {
        float row = floor(uv.y * 28.0);
        float r1 = hash21(vec2(row, floor(uTime * 17.0)));
        float tear = step(1.0 - 0.35 * g, r1) * (hash21(vec2(row, floor(uTime * 29.0) + 7.0)) - 0.5);
        uv.x += tear * 0.35 * g;
        uv.y = fract(uv.y + 0.5 * g * g * smoothstep(0.7, 1.0, g) * sin(uTime * 9.0));
      }
      float ca = 0.0012 * uChroma + 0.006 * g;
      float r = texture(uScene, uv + vec2(ca, 0.0)).r;
      float gr = texture(uScene, uv).g;
      float b = texture(uScene, uv - vec2(ca, 0.0)).b;
      vec3 col = vec3(r, gr, b);
      col += vec3(hash21(uv * uRes + fract(uTime * 13.0) * 31.0) - 0.5) * (0.03 + 0.22 * g);
      col *= 0.88 + 0.12 * sin(uv.y * uRes.y * 3.14159);
      if (uMask > 0.5) {
        float m = mod(gl_FragCoord.x, 3.0);
        vec3 tri = vec3(0.97);
        if (m < 1.0) tri.r = 1.08; else if (m < 2.0) tri.g = 1.08; else tri.b = 1.08;
        col *= tri;
      }
      vec2 e = abs(vUV * 2.0 - 1.0);
      col *= smoothstep(1.0, 0.92, max(e.x, e.y)) * (0.82 + 0.18 * smoothstep(1.4, 0.2, dot(c, c)));
      col += col * uFlash * 0.6;
      if (oob0) col = vec3(0.0);
      fragColor = vec4(col, 1.0);
    }`;

/** SDF field resolution, and the pixel range encoded into 0..1. */
const FW = 288;
const FH = 180;
const SDF_RANGE = 48;

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
    console.error(`holo-mark ${tag}:`, gl.getShaderInfoLog(sh));
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
    console.error(`holo-mark link ${tag}:`, gl.getProgramInfoLog(p));
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

/**
 * Two-pass chamfer distance transform over the logo alpha, packed into an
 * RGBA8 texture as signed distance remapped to 0..1. Built once at load;
 * the shader sphere-traces against it.
 */
function buildSdfTexture(): Uint8Array {
  const cv = document.createElement('canvas');
  cv.width = FW;
  cv.height = FH;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(logoMask(), 0, 0, FW, FH);
  const a = g.getImageData(0, 0, FW, FH).data;
  const inside = new Uint8Array(FW * FH);
  for (let i = 0; i < FW * FH; i++) inside[i] = a[i * 4 + 3] > 127 ? 1 : 0;

  const chamfer = (mask: Uint8Array) => {
    const INF = 1e6;
    const d = new Float32Array(FW * FH);
    for (let i = 0; i < FW * FH; i++) d[i] = mask[i] ? 0 : INF;
    const relax = (i: number, j: number, w: number) => {
      const c = d[j] + w;
      if (c < d[i]) d[i] = c;
    };
    for (let y = 0; y < FH; y++) {
      for (let x = 0; x < FW; x++) {
        const i = y * FW + x;
        if (x > 0) relax(i, i - 1, 1);
        if (y > 0) {
          relax(i, i - FW, 1);
          if (x > 0) relax(i, i - FW - 1, 1.4142);
          if (x < FW - 1) relax(i, i - FW + 1, 1.4142);
        }
      }
    }
    for (let y = FH - 1; y >= 0; y--) {
      for (let x = FW - 1; x >= 0; x--) {
        const i = y * FW + x;
        if (x < FW - 1) relax(i, i + 1, 1);
        if (y < FH - 1) {
          relax(i, i + FW, 1);
          if (x < FW - 1) relax(i, i + FW + 1, 1.4142);
          if (x > 0) relax(i, i + FW - 1, 1.4142);
        }
      }
    }
    return d;
  };

  const outsideMask = new Uint8Array(FW * FH);
  for (let i = 0; i < FW * FH; i++) outsideMask[i] = 1 - inside[i];
  const dOut = chamfer(inside);
  const dIn = chamfer(outsideMask);
  const px = new Uint8Array(FW * FH * 4);
  for (let i = 0; i < FW * FH; i++) {
    const sd = inside[i] ? -dIn[i] : dOut[i];
    const v = Math.max(
      0,
      Math.min(255, Math.round((sd / SDF_RANGE + 0.5) * 255))
    );
    px[i * 4] = v;
    px[i * 4 + 1] = v;
    px[i * 4 + 2] = v;
    px[i * 4 + 3] = 255;
  }
  return px;
}

export class HoloMarkAnimation extends PixiAnimation<typeof MANIFEST> {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private sceneProg: WebGLProgram | null = null;
  private postProg: WebGLProgram | null = null;
  private sceneL: Locs = {};
  private postL: Locs = {};
  private sdfTx: WebGLTexture | null = null;
  private sceneTx: WebGLTexture | null = null;
  private sceneFb: WebGLFramebuffer | null = null;
  private fbW = 0;
  private fbH = 0;
  private failed = false;

  private sprite: PIXI.Sprite | null = null;
  private texture: PIXI.Texture | null = null;
  private time = 0;

  private yaw = 0;
  private pitch = 0;
  private yawT = 0;
  private pitchT = 0;
  /** Accumulated instability from fast pointer movement. */
  private heat = 0;
  /** Seconds of lost signal remaining. */
  private lost = 0;
  private glitch = 0;
  private flash = 0;
  private mx = -1;
  private my = -1;
  private nextPulse = 6;

  constructor(initialControls?: Partial<HoloMarkControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.time = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.yawT = 0;
    this.pitchT = 0;
    this.heat = 0;
    this.lost = 0;
    this.glitch = 0;
    this.flash = 0;
    this.mx = -1;
    this.my = -1;
    this.nextPulse = 6;
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
    const sceneProg = program(gl, SCENE, 'scene');
    const postProg = program(gl, POST, 'post');
    if (!sceneProg || !postProg) return false;

    const sdfTx = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, sdfTx);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      FW,
      FH,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      buildSdfTexture()
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.canvas = canvas;
    this.gl = gl;
    this.sceneProg = sceneProg;
    this.postProg = postProg;
    this.sdfTx = sdfTx;
    this.sceneL = locsOf(gl, sceneProg, [
      'uSDF',
      'uRes',
      'uTime',
      'uYaw',
      'uPitch',
      'uDepth',
      'uScan',
      'uFlash',
      'uGlow',
      'uOrange',
      'uSun',
      'uCyan',
      'uInk',
    ]);
    this.postL = locsOf(gl, postProg, [
      'uScene',
      'uRes',
      'uTime',
      'uGlitch',
      'uChroma',
      'uMask',
      'uFlash',
    ]);
    return true;
  }

  onUpdate(
    app: PIXI.Application,
    controls: HoloMarkControlValues,
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
    const m = this.pointer?.mouse;

    if (interactive && m?.active) {
      const mx = m.x / sw;
      const my = m.y / sh;
      if (this.mx >= 0 && dt > 0) {
        // Pointer speed accumulates instability; past the threshold the
        // signal tears and has to re-lock.
        const spd = Math.hypot(mx - this.mx, my - this.my) / dt;
        this.heat = Math.min(1.6, this.heat + spd * 0.05 * controls.sens);
      }
      this.mx = mx;
      this.my = my;
      this.yawT = (mx - 0.5) * 2.6;
      this.pitchT = (my - 0.5) * 1.1;
    } else {
      this.mx = -1;
      this.yawT += dt * (controls.spin * 0.8 + 0.05);
      this.pitchT = 0.18 * Math.sin(this.time * 0.3);
    }

    if (!interactive) {
      this.nextPulse -= dt;
      if (this.nextPulse <= 0) {
        this.lost = 0.25;
        this.nextPulse = 5 + Math.random() * 4;
      }
    }

    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        pointer.clicks.shift();
        if (interactive) this.heat = Math.min(1.6, this.heat + 0.4);
      }
    }
    this.heat = Math.max(0, this.heat - dt * 0.1);
    if (this.heat >= 1 && this.lost <= 0) {
      this.lost = 0.8 + Math.random() * 0.5;
      this.heat = 0;
    }
    let gT: number;
    if (this.lost > 0) {
      this.lost -= dt;
      if (this.lost <= 0) this.flash = 0.5;
      gT = 1;
    } else {
      gT = Math.min(0.5, this.heat * 0.45);
    }
    this.glitch += (gT - this.glitch) * Math.min(1, dt * 10);
    this.flash = Math.max(0, this.flash - dt * 1.8);
    this.yaw += (this.yawT - this.yaw) * Math.min(1, dt * 5);
    this.pitch += (this.pitchT - this.pitch) * Math.min(1, dt * 5);

    const jit = this.glitch * this.glitch;
    const yawD = this.yaw + (Math.random() - 0.5) * 0.2 * jit;
    const pitchD = this.pitch + (Math.random() - 0.5) * 0.1 * jit;

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

    // The scene render target follows the canvas size.
    if (this.fbW !== W || this.fbH !== H) {
      if (this.sceneTx) gl.deleteTexture(this.sceneTx);
      if (this.sceneFb) gl.deleteFramebuffer(this.sceneFb);
      this.sceneTx = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, this.sceneTx);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        W,
        H,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.sceneFb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFb);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        this.sceneTx,
        0
      );
      this.fbW = W;
      this.fbH = H;
    }

    // Pass A: the raymarched hologram, into the scene target.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFb);
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.sceneProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sdfTx);
    gl.uniform1i(this.sceneL.uSDF!, 0);
    gl.uniform2f(this.sceneL.uRes!, W, H);
    gl.uniform1f(this.sceneL.uTime!, this.time);
    gl.uniform1f(this.sceneL.uYaw!, yawD);
    gl.uniform1f(this.sceneL.uPitch!, pitchD);
    gl.uniform1f(this.sceneL.uDepth!, controls.depth);
    gl.uniform1f(this.sceneL.uScan!, controls.scan);
    gl.uniform1f(this.sceneL.uFlash!, this.flash);
    gl.uniform1f(this.sceneL.uGlow!, controls.glow);
    setColor(gl, this.sceneL.uOrange!, PAL.bright);
    setColor(gl, this.sceneL.uSun!, PAL.sun);
    setColor(gl, this.sceneL.uCyan!, PAL.cyan);
    setColor(gl, this.sceneL.uInk!, PAL.ink);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Pass B: the CRT chain, to the canvas.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.postProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTx);
    gl.uniform1i(this.postL.uScene!, 0);
    gl.uniform2f(this.postL.uRes!, W, H);
    gl.uniform1f(this.postL.uTime!, this.time);
    gl.uniform1f(this.postL.uGlitch!, this.glitch);
    gl.uniform1f(this.postL.uChroma!, controls.chroma);
    gl.uniform1f(this.postL.uMask!, controls.mask ? 1 : 0);
    gl.uniform1f(this.postL.uFlash!, this.flash);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.texture?.source.update();
  }

  onDestroy(): void {
    const gl = this.gl;
    if (gl) {
      if (this.sdfTx) gl.deleteTexture(this.sdfTx);
      if (this.sceneTx) gl.deleteTexture(this.sceneTx);
      if (this.sceneFb) gl.deleteFramebuffer(this.sceneFb);
      if (this.sceneProg) gl.deleteProgram(this.sceneProg);
      if (this.postProg) gl.deleteProgram(this.postProg);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.gl = null;
    this.canvas = null;
    this.sceneProg = null;
    this.postProg = null;
    this.sdfTx = null;
    this.sceneTx = null;
    this.sceneFb = null;
    this.fbW = 0;
    this.fbH = 0;
    this.failed = false;
    this.sprite = null;
    this.texture?.destroy(true);
    this.texture = null;
    super.onDestroy();
  }
}

export function createHoloMarkAnimation(
  initialControls?: Partial<HoloMarkControlValues>
): HoloMarkAnimation {
  return new HoloMarkAnimation(initialControls);
}
