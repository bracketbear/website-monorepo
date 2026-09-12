import { logoMask } from './logo';

/**
 * The lab-shaders-3 family: effects that sample a signed distance field of
 * the mark rather than its plain alpha, so they can offset, inflate and
 * refract the letterform edge.
 *
 * The prelude and the shared eye shader below are carried across from the
 * prototype verbatim. Do not reformat the GLSL; a diff against the source
 * is the only practical way to check a port of this size.
 */

/** SDF texture geometry. PAD leaves room for the distance field to spread. */
const SDF_W = 1280;
const SDF_PAD = 200;
const SDF_SPREAD = 190;

export interface SdfInfo {
  canvas: HTMLCanvasElement;
  /** 1 where the mark is solid. */
  bin: Uint8Array;
  W: number;
  H: number;
  /** Normalized points well inside the mark, for placing hits. */
  pts: [number, number][];
}

let sdfInfo: SdfInfo | null = null;

/**
 * Two-pass chamfer distance transform. Returns distance in pixels from each
 * cell to the nearest set cell, or to the nearest clear cell when inverted.
 */
function distanceTransform(
  bin: Uint8Array,
  W: number,
  H: number,
  invert: boolean
): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(W * H);
  const D = 1.41421;
  for (let i = 0; i < W * H; i++) {
    d[i] = (invert ? !bin[i] : bin[i]) ? 0 : INF;
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) {
        v = Math.min(v, d[i - W] + 1);
        if (x > 0) v = Math.min(v, d[i - W - 1] + D);
        if (x < W - 1) v = Math.min(v, d[i - W + 1] + D);
      }
      d[i] = v;
    }
  }
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      let v = d[i];
      if (x < W - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < H - 1) {
        v = Math.min(v, d[i + W] + 1);
        if (x < W - 1) v = Math.min(v, d[i + W + 1] + D);
        if (x > 0) v = Math.min(v, d[i + W - 1] + D);
      }
      d[i] = v;
    }
  }
  return d;
}

/**
 * The mark as a signed distance field: red carries the signed distance
 * remapped to 0..1, green carries the original alpha.
 */
/**
 * The SDF plus the binary mask and a set of interior sample points, for
 * effects that need to ask "is this point on the mark?" or place a hit
 * somewhere plausible.
 */
export function sdfMaskInfo(): SdfInfo {
  if (sdfInfo) return sdfInfo;
  const logo = logoMask();
  const W = SDF_W;
  const lw = W - SDF_PAD * 2;
  const lh = Math.round(lw * (logo.height / logo.width));
  const H = lh + SDF_PAD * 2;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(logo, SDF_PAD, SDF_PAD, lw, lh);
  const img = g.getImageData(0, 0, W, H);
  const px = img.data;
  const n = W * H;
  const bin = new Uint8Array(n);
  const aa = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    aa[i] = px[i * 4 + 3];
    bin[i] = aa[i] > 127 ? 1 : 0;
  }
  const dIn = distanceTransform(bin, W, H, false);
  const dOut = distanceTransform(bin, W, H, true);
  for (let i = 0; i < n; i++) {
    const sd = bin[i] ? -dOut[i] : dIn[i];
    px[i * 4] = Math.max(
      0,
      Math.min(255, Math.round((0.5 + sd / (2 * SDF_SPREAD)) * 255))
    );
    px[i * 4 + 1] = aa[i];
    px[i * 4 + 2] = 0;
    px[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);

  // Sample points at least 22px inside the mark, so a hit never lands on
  // the edge. Deterministic count, random positions, as the prototype had.
  const pts: [number, number][] = [];
  let guard = 0;
  while (pts.length < 220 && guard++ < 8000) {
    const x = Math.floor(Math.random() * W);
    const y = Math.floor(Math.random() * H);
    if (bin[y * W + x] && dOut[y * W + x] > 22) pts.push([x / W, y / H]);
  }

  sdfInfo = { canvas: cv, bin, W, H, pts };
  return sdfInfo;
}

/** The SDF canvas alone, for effects that only sample the texture. */
export function sdfMask(): HTMLCanvasElement {
  return sdfMaskInfo().canvas;
}

/** Is this normalized point inside the mark? */
export function onMark(u: number, v: number): boolean {
  if (u < 0 || u > 1 || v < 0 || v > 1) return false;
  const info = sdfMaskInfo();
  return !!info.bin[
    Math.floor(v * (info.H - 1)) * info.W + Math.floor(u * (info.W - 1))
  ];
}

/** Fragment prelude for the SDF family. Carried across verbatim. */
export const SDF_PRE = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform sampler2D uTex;
    uniform float uTime;
    uniform vec2 uRes;
    uniform vec4 uRect;
    uniform float uGrain;
    uniform float uStage;
    uniform float uTexAR;
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
    float maskA(vec2 uv) {
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
      return texture(uTex, uv).g;
    }
    float sdf(vec2 uv) {
      vec2 c = clamp(uv, 0.0, 1.0);
      float d = (texture(uTex, c).r - 0.5) * 0.296875;
      vec2 o = (uv - c) * vec2(1.0, uTexAR);
      return d + length(o);
    }
    vec3 finish(vec3 col, vec2 uvS, vec2 p) {
      col += (hash21(floor(p * 0.9) + vec2(fract(uTime * 7.0) * 13.0)) - 0.5) * 0.05 * uGrain;
      vec2 c = uvS * 2.0 - 1.0;
      return col * (0.9 + 0.1 * smoothstep(1.7, 0.3, dot(c, c)));
    }
  `;

export const SDF_COMMON_UNIFORMS = [
  'uTex',
  'uTime',
  'uRes',
  'uRect',
  'uGrain',
  'uStage',
  'uTexAR',
  'uInk',
  'uOrange',
  'uSun',
  'uCream',
] as const;

/** The raytraced eye, shared by portal-mark's third-eye world and visionary-eye. */
export const SHARED_EYE = `
      uniform vec2 uGaze;
      uniform float uPupil;
      uniform float uBump;
      float stars(vec2 q, float density, float twinkle) {
        vec2 g = q * density;
        vec2 cell = floor(g);
        float h = hash21(cell);
        if (h < 0.93) return 0.0;
        vec2 pt = vec2(hash21(cell + 11.3), hash21(cell + 27.7));
        float d = length(fract(g) - pt);
        float sz = 0.06 + 0.14 * hash21(cell + 41.2);
        float s = smoothstep(sz, 0.0, d);
        return s * s * (0.45 + 0.55 * sin(uTime * (1.2 + twinkle * hash21(cell + 3.0)) + h * 40.0) * 0.5 + 0.275);
      }

      vec3 visionary(vec2 q, float t) {
        vec3 IND = vec3(0.09, 0.05, 0.20);
        vec3 ELEC = vec3(0.30, 0.55, 1.0);
        vec3 VMAG = vec3(0.85, 0.20, 0.75);
        float breath = 0.9 + 0.1 * sin(t * 0.45);
        float r = length(q) / breath + 1e-4;
        float a = atan(q.y, q.x);
        float sec = 6.28318 / 12.0;
        float af = abs(mod(a + t * 0.04, sec) - sec * 0.5);
        vec3 col = IND * (0.7 + 0.5 * fbm(q * 2.0 + t * 0.05));
        float fil = fbm(vec2(af * 14.0 + fbm(vec2(r * 6.0, t * 0.2)) * 2.5, r * 9.0 - t * 0.5));
        float lines = pow(clamp(1.0 - abs(fil * 2.0 - 1.0) * 2.2, 0.0, 1.0), 3.0);
        vec3 spec = mix(ELEC, VMAG, 0.5 + 0.5 * sin(r * 9.0 - t * 0.8 + af * 6.0));
        float pd = 1.0 + uPupil * 1.1;
        col += spec * lines * smoothstep(0.065 * pd, 0.18, r) * 0.85;
        float ring = abs(fract(r * 5.5 - t * 0.16) - 0.5);
        col += mix(VMAG, ELEC, 0.5 + 0.5 * sin(t * 0.4)) * smoothstep(0.09, 0.0, ring) * exp(-r * 1.5) * 0.45;
        float l1 = sin(length(q - vec2(0.16, 0.0)) * 34.0 - t * 0.6);
        float l2 = sin(length(q + vec2(0.16, 0.0)) * 34.0 - t * 0.6);
        float l3 = sin(length(q - vec2(0.0, 0.16)) * 34.0 - t * 0.6);
        float lat = pow(clamp(l1 * l2 * l3 * 0.5 + 0.5, 0.0, 1.0), 6.0);
        col += uSun * lat * exp(-r * 1.2) * 0.35;
        float iris = smoothstep(0.22, 0.06 * pd, r);
        col += ELEC * iris * smoothstep(0.05 * pd, 0.1 * pd, r) * (0.5 + 0.5 * sin(a * 24.0 + fbm(vec2(a * 4.0, r * 20.0)) * 5.0 + t * 0.5)) * 0.4;
        col += VMAG * iris * 0.15;
        // pupil: clean dark disc, crisp edge, cool electric limbal ring — no warm center glow
        float pr = 0.055 * pd;
        col = mix(col, uInk * 0.35, smoothstep(pr + 0.006, pr - 0.006, r));
        col += mix(ELEC, uCream, 0.35) * exp(-abs(r - pr) * 110.0) * 0.55;
        col += ELEC * smoothstep(pr + 0.05, pr, r) * step(pr, r) * 0.2;
        col += uCream * stars(q, 50.0, 1.5) * 0.3 * smoothstep(0.3, 0.7, r);
        return col * breath;
      }
  `;
