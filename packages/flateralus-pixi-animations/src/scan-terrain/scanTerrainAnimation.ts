import * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { logoMask, setColor } from '../shared/shader-harness';

const MANIFEST = createManifest({
  id: 'scan-terrain',
  name: 'Scan Terrain (GLSL particles)',
  description:
    'A point-cloud landscape built entirely in a vertex shader — no buffers, no 3D library: ~50,000 particles are generated from gl_VertexID, displaced by ridged fbm heights with terraced mesas, and flown through along a winding canyon with additive glow and depth fog. A scan pulse periodically sweeps out over the terrain, lighting the points as it passes — and the Bracket Bear mark is stamped into the landscape as a flat-topped mesa the flight path passes over, flaring when the scan hits it. Pointer aims the camera; click fires a scan pulse from the camera. Ambient: slow drift with automatic sweeps.',
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
      name: 'density',
      type: 'number',
      label: 'Point Density',
      min: 120,
      max: 400,
      step: 20,
      defaultValue: 260,
      debug: true,
    },
    {
      name: 'relief',
      type: 'number',
      label: 'Terrain Relief',
      min: 1,
      max: 9,
      step: 0.5,
      defaultValue: 4.5,
      debug: true,
    },
    {
      name: 'terrace',
      type: 'number',
      label: 'Terracing',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.4,
      debug: true,
    },
    {
      name: 'speed',
      type: 'number',
      label: 'Flight Speed',
      min: 0,
      max: 3,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'pt',
      type: 'number',
      label: 'Point Size',
      min: 0.5,
      max: 4,
      step: 0.1,
      defaultValue: 1.8,
      debug: true,
    },
    {
      name: 'fog',
      type: 'number',
      label: 'Depth Fog',
      min: 0.2,
      max: 2.5,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'logo',
      type: 'boolean',
      label: 'Logo Mesa',
      defaultValue: true,
      debug: true,
    },
  ],
} as const);

export type ScanTerrainControlValues = ManifestToControlValues<typeof MANIFEST>;

/** Carried across from the prototype verbatim. Do not reformat the GLSL. */
const BG_VERT = `#version 300 es
    out vec2 vUV;
    void main() {
      vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
      vUV = p;
      gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`;
const BG_FRAG = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform float uTime, uHorizon;
    uniform vec3 uInk, uOrange;
    
    float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
                 mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    void main() {
      vec3 col = uInk * (0.55 + 0.25 * vUV.y);
      float hz = 1.0 - uHorizon; // vUV.y is up
      col += uOrange * 0.14 * exp(-abs(vUV.y - hz) * 7.0);
      col += uOrange * 0.05 * exp(-abs(vUV.y - hz) * 1.6);
      col += vec3(hash21(vUV * 917.0 + fract(uTime * 7.0)) - 0.5) * 0.02;
      vec2 e = abs(vUV * 2.0 - 1.0);
      col *= 0.86 + 0.14 * smoothstep(1.35, 0.3, dot(e, e));
      fragColor = vec4(col, 1.0);
    }`;
const PT_VERT = `#version 300 es
    precision highp float;
    uniform vec2 uRes;
    uniform float uGridX, uScroll, uTime, uYaw, uPitch, uRelief, uTerrace, uPt, uFog, uPulse, uPulseAmp, uLogoOn;
    uniform sampler2D uLogo;
    uniform vec3 uLow, uHigh, uCyan;
    out vec3 vCol;
    
    float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
                 mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    const float DEPTH = 95.0;
    float terrain(vec2 p) {
      float a = 0.0, amp = 0.62; vec2 q = p;
      for (int i = 0; i < 5; i++) {
        float n = 1.0 - abs(2.0 * vnoise(q) - 1.0);
        a += amp * n * n;
        q = q * 2.03 + vec2(31.4, 17.7);
        amp *= 0.5;
      }
      return a;
    }
    void main() {
      int gx = int(uGridX + 0.5);
      float xi = float(gl_VertexID % gx);
      float zi = float(gl_VertexID / gx);
      float sp = DEPTH / 210.0;
      float camz = mod(zi * sp - uScroll, DEPTH);
      float worldZ = uScroll + camz;               // constant per point between wraps
      float h1 = hash21(vec2(xi * 3.7, worldZ));
      float h2 = hash21(vec2(worldZ, xi * 1.3));
      float halfW = 58.0;
      float x = (xi / (uGridX - 1.0) - 0.5) * 2.0 * halfW + (h1 - 0.5) * 1.4;
      float wz = worldZ + (h2 - 0.5) * sp * 1.5;
      // winding canyon: the flight corridor stays low
      float canyon = smoothstep(3.5, 24.0, abs(x + sin(wz * 0.021) * 9.0 + sin(wz * 0.007) * 5.0));
      float h = terrain(vec2(x, wz) * 0.043) * mix(0.12, 1.0, canyon) * uRelief;
      float stepped = floor(h * 2.4 + 0.5) / 2.4;  // terraced mesas
      h = mix(h, stepped, uTerrace);
      // the mark as a mesa: stamped flat on the canyon floor once per two windows
      float cxr = -(sin(wz * 0.021) * 9.0 + sin(wz * 0.007) * 5.0);
      float lz0 = mod(wz, DEPTH * 2.0) - 62.0;
      vec2 luv = vec2((x - cxr) / 42.0 + 0.5, 1.0 - lz0 / 26.2);
      float inBox = step(abs(luv.x - 0.5), 0.5) * step(abs(luv.y - 0.5), 0.5);
      float logoM = uLogoOn * inBox * step(0.5, textureLod(uLogo, clamp(luv, 0.0, 1.0), 0.0).a);
      h = mix(h, uRelief * 1.05 + 0.4, logoM);
      float camY = uRelief * 0.92 + 1.4;
      vec3 pos = vec3(x, h - camY, -(camz + 1.5));
      float cy = cos(uYaw), sy = sin(uYaw), cx = cos(uPitch), sx = sin(uPitch);
      pos.xz = mat2(cy, -sy, sy, cy) * pos.xz;
      pos.yz = mat2(cx, -sx, sx, cx) * pos.yz;
      float w = -pos.z;
      if (w < 0.6) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); gl_PointSize = 0.0; vCol = vec3(0.0); return; }
      float asp = uRes.x / uRes.y;
      float f = 1.45;
      gl_Position = vec4(pos.x * f / (asp * w), pos.y * f / w, 0.0, 1.0);
      gl_PointSize = clamp(uPt * uRes.y * 0.055 / w, 1.5, 12.0);
      float fog = exp(-camz * uFog * 0.028);
      fog = mix(fog, 1.0, 0.12);
      float hn = clamp(h / (uRelief + 0.001), 0.0, 1.0);
      vec3 col = mix(uLow * 1.1, uHigh * 1.5, hn * hn * 0.9 + hn * 0.1);
      col = mix(col, uHigh * 2.0, logoM * 0.75);
      // scan pulse: bright expanding band, cyan-white at the front
      float pd = camz - uPulse;
      float band = exp(-pd * pd * 0.028) * uPulseAmp;
      col += mix(uCyan, vec3(1.0), 0.35) * band * (2.4 + logoM * 2.0);
      col += uHigh * exp(-abs(pd) * 0.09) * uPulseAmp * 0.4;
      float fl = 0.82 + 0.18 * sin(uTime * (1.5 + h1 * 4.0) + h2 * 40.0);
      vCol = col * fog * fl;
    }`;
const PT_FRAG = `#version 300 es
    precision highp float;
    in vec3 vCol; out vec4 fragColor;
    void main() {
      vec2 d = gl_PointCoord - 0.5;
      float a = smoothstep(0.5, 0.12, length(d));
      fragColor = vec4(vCol * a, 1.0);
    }`;

/** Camera depth and grid rows, matching the constants baked into PT_VERT. */
const DEPTH = 95.0;
const GZ = 210;

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
    console.error(`scan-terrain ${tag}:`, gl.getShaderInfoLog(sh));
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
    console.error(`scan-terrain link ${tag}:`, gl.getProgramInfoLog(p));
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
 * Two programs rather than one: a fullscreen background pass, then the
 * point cloud drawn additively on top. The points come from gl_VertexID
 * alone, so there are no vertex buffers to allocate or free.
 */
export class ScanTerrainAnimation extends PixiAnimation<typeof MANIFEST> {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private bg: WebGLProgram | null = null;
  private pt: WebGLProgram | null = null;
  private logoTx: WebGLTexture | null = null;
  private Lb: Locs = {};
  private Lp: Locs = {};
  private failed = false;

  private sprite: PIXI.Sprite | null = null;
  private texture: PIXI.Texture | null = null;
  private time = 0;
  /** Distance flown along the canyon. */
  private scroll = 0;
  private yaw = 0;
  private pitch = -0.1;
  private yawT = 0;
  private pitchT = -0.1;
  /** Radius of the expanding scan pulse, and its remaining strength. */
  private pulse = 12;
  private pulseAmp = 1;
  private nextPulse = 4;

  constructor(initialControls?: Partial<ScanTerrainControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.time = 0;
    this.scroll = 0;
    this.yaw = 0;
    this.pitch = -0.1;
    this.yawT = 0;
    this.pitchT = -0.1;
    this.pulse = 12;
    this.pulseAmp = 1;
    this.nextPulse = 4;
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
    const bg = program(gl, BG_VERT, BG_FRAG, 'bg');
    const pt = program(gl, PT_VERT, PT_FRAG, 'pt');
    if (!bg || !pt) return false;

    const logoTx = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, logoTx);
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

    this.canvas = canvas;
    this.gl = gl;
    this.bg = bg;
    this.pt = pt;
    this.logoTx = logoTx;
    this.Lb = locsOf(gl, bg, ['uTime', 'uHorizon', 'uInk', 'uOrange']);
    this.Lp = locsOf(gl, pt, [
      'uRes',
      'uGridX',
      'uScroll',
      'uTime',
      'uYaw',
      'uPitch',
      'uRelief',
      'uTerrace',
      'uPt',
      'uFog',
      'uPulse',
      'uPulseAmp',
      'uLow',
      'uHigh',
      'uCyan',
      'uLogo',
      'uLogoOn',
    ]);
    return true;
  }

  onUpdate(
    app: PIXI.Application,
    controls: ScanTerrainControlValues,
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
    const interactive = Number(controls.mode) > 0.5;
    this.scroll += dt * (controls.speed * 8.5 + 0.4);

    const sw = app.screen.width;
    const sh = app.screen.height;
    const m = this.pointer?.mouse;
    if (interactive && m?.active) {
      this.yawT = (m.x / sw - 0.5) * 0.85;
      this.pitchT = -0.1 + (m.y / sh - 0.5) * 0.34;
    } else {
      this.yawT = 0.22 * Math.sin(this.time * 0.13);
      this.pitchT = -0.1 + 0.05 * Math.sin(this.time * 0.21);
    }
    this.yaw += (this.yawT - this.yaw) * Math.min(1, dt * 3.5);
    this.pitch += (this.pitchT - this.pitch) * Math.min(1, dt * 3.5);

    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        pointer.clicks.shift();
        if (interactive) {
          this.pulse = 0;
          this.pulseAmp = 1;
        }
      }
    }
    this.nextPulse -= dt;
    if (this.nextPulse <= 0) {
      this.pulse = 0;
      this.pulseAmp = 1;
      this.nextPulse = 5 + Math.random() * 4;
    }
    if (this.pulse < DEPTH + 20) this.pulse += dt * (26 + controls.speed * 8.5);
    const amp =
      this.pulse < DEPTH + 20
        ? this.pulseAmp * Math.exp(-this.pulse * 0.008)
        : 0;

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

    gl.viewport(0, 0, W, H);

    // Background first, opaque.
    gl.disable(gl.BLEND);
    gl.useProgram(this.bg);
    gl.uniform1f(this.Lb.uTime!, this.time);
    gl.uniform1f(this.Lb.uHorizon!, 0.5 - this.pitch * 1.45 * 0.5);
    setColor(gl, this.Lb.uInk!, PAL.ink);
    setColor(gl, this.Lb.uOrange!, PAL.orange);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Points additively on top, so overlapping particles build up glow.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(this.pt);
    const gx = Math.round(controls.density);
    gl.uniform2f(this.Lp.uRes!, W, H);
    gl.uniform1f(this.Lp.uGridX!, gx);
    gl.uniform1f(this.Lp.uScroll!, this.scroll);
    gl.uniform1f(this.Lp.uTime!, this.time);
    gl.uniform1f(this.Lp.uYaw!, this.yaw);
    gl.uniform1f(this.Lp.uPitch!, this.pitch);
    gl.uniform1f(this.Lp.uRelief!, controls.relief);
    gl.uniform1f(this.Lp.uTerrace!, controls.terrace);
    gl.uniform1f(this.Lp.uPt!, controls.pt);
    gl.uniform1f(this.Lp.uFog!, controls.fog);
    gl.uniform1f(this.Lp.uPulse!, this.pulse);
    gl.uniform1f(this.Lp.uPulseAmp!, amp);
    gl.uniform1f(this.Lp.uLogoOn!, controls.logo ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.logoTx);
    gl.uniform1i(this.Lp.uLogo!, 0);
    setColor(gl, this.Lp.uLow!, PAL.orange);
    setColor(gl, this.Lp.uHigh!, PAL.sun);
    setColor(gl, this.Lp.uCyan!, PAL.cyan);
    gl.drawArrays(gl.POINTS, 0, gx * GZ);
    gl.disable(gl.BLEND);

    this.texture?.source.update();
  }

  onDestroy(): void {
    const gl = this.gl;
    if (gl) {
      if (this.logoTx) gl.deleteTexture(this.logoTx);
      if (this.bg) gl.deleteProgram(this.bg);
      if (this.pt) gl.deleteProgram(this.pt);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.gl = null;
    this.canvas = null;
    this.bg = null;
    this.pt = null;
    this.logoTx = null;
    this.failed = false;
    this.sprite = null;
    this.texture?.destroy(true);
    this.texture = null;
    super.onDestroy();
  }
}

export function createScanTerrainAnimation(
  initialControls?: Partial<ScanTerrainControlValues>
): ScanTerrainAnimation {
  return new ScanTerrainAnimation(initialControls);
}
