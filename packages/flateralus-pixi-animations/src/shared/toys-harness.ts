/**
 * The lab-shaders-4 toy family: pure fragment shaders with no mask texture
 * and no logo. Their prelude declares uDeep and omits uTex entirely.
 *
 * Carried across from the prototype verbatim. Do not reformat the GLSL.
 */

/** Fragment prelude for the toys. */
export const TOYS_PRE = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform float uTime;
    uniform vec2 uRes;
    uniform float uGrain;
    uniform vec3 uInk;
    uniform vec3 uOrange;
    uniform vec3 uDeep;
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
    vec3 finish(vec3 col, vec2 uvS, vec2 p) {
      col += (hash21(floor(p * 0.9) + vec2(fract(uTime * 7.0) * 13.0)) - 0.5) * 0.05 * uGrain;
      vec2 c = uvS * 2.0 - 1.0;
      return col * (0.9 + 0.1 * smoothstep(1.7, 0.3, dot(c, c)));
    }
  `;

export const TOYS_COMMON_UNIFORMS = [
  'uTime',
  'uRes',
  'uGrain',
  'uInk',
  'uOrange',
  'uDeep',
  'uSun',
  'uCream',
] as const;

/** Goo Lamp fragment body. */
export const GOO_LAMP_FRAG = `
      uniform vec2 uMouse;
      uniform float uCount;
      uniform float uSpeed;
      uniform float uSoft;
      uniform float uPulse;
      void main() {
        vec2 uvS = vec2(vUV.x, 1.0 - vUV.y);
        vec2 p = uvS * uRes;
        float asp = uRes.x / uRes.y;
        vec2 q = vec2(uvS.x * asp, uvS.y);
        float t = uTime * uSpeed;
        float field = 0.0;
        for (int i = 0; i < 12; i++) {
          if (float(i) >= uCount) break;
          float fi = float(i);
          float r1 = hash21(vec2(fi, 1.7));
          float r2 = hash21(vec2(fi, 9.1));
          float r3 = hash21(vec2(fi, 4.3));
          vec2 c = vec2(
            (0.5 + (0.18 + 0.22 * r2) * sin(t * (0.35 + r1 * 0.5) + fi * 2.39)) * asp,
            0.5 + (0.16 + 0.2 * r1) * sin(t * (0.3 + r2 * 0.55) + fi * 1.71 + r3 * 6.28));
          float rad = (0.075 + 0.06 * r3) * (1.0 + uPulse * 0.55);
          field += rad * rad / max(dot(q - c, q - c), 1e-5);
        }
        vec2 mq = vec2(uMouse.x / uRes.x * asp, uMouse.y / uRes.y);
        float mr = 0.1 * (1.0 + uPulse * 0.55);
        field += mr * mr / max(dot(q - mq, q - mq), 1e-5);
        field *= 1.0 + (fbm(q * 3.2 + vec2(t * 0.3, -t * 0.2)) - 0.5) * 0.55;
        float m = smoothstep(1.0, 1.03 + uSoft * 0.5, field);
        float rim = smoothstep(0.78, 1.0, field) * (1.0 - m);
        float core = smoothstep(2.1, 3.6, field);
        vec3 col = uInk * (0.82 + 0.18 * fbm(uvS * 2.0 + vec2(3.7, 1.2)));
        col += uDeep * rim * 0.85;
        col = mix(col, uOrange, m);
        col = mix(col, uSun, core);
        col = mix(col, uCream, smoothstep(3.8, 5.6, field) * 0.85);
        fragColor = vec4(finish(col, uvS, p), 1.0);
      }`;

/** Kaleido fragment body. */
export const KALEIDO_FRAG = `
      uniform float uSeg;
      uniform float uWarp;
      uniform float uSpeed;
      uniform float uZoom;
      uniform float uSpin;
      uniform float uPulse;
      uniform float uPhase;
      uniform vec3 uP0;
      uniform vec3 uP1;
      uniform vec3 uP2;
      uniform vec3 uP3;
      uniform vec3 uP4;
      void main() {
        vec2 uvS = vec2(vUV.x, 1.0 - vUV.y);
        vec2 p = uvS * uRes;
        vec2 c = (p - 0.5 * uRes) / uRes.y;
        float t = uTime * uSpeed;
        float ang = atan(c.y, c.x) + uSpin;
        float rad = length(c) * uZoom * (1.0 - uPulse * 0.3);
        float seg = 6.28318 / uSeg;
        ang = abs(mod(ang, seg) - seg * 0.5);
        vec2 k = vec2(cos(ang), sin(ang)) * rad;
        vec2 w = k * 3.0 + vec2(uPhase, uPhase * 0.7);
        vec2 off = vec2(fbm(w + vec2(t * 0.18, 0.0)), fbm(w + vec2(5.2, -t * 0.14)));
        float n = fbm(w + (off - 0.5) * uWarp * 3.0 + vec2(0.0, t * 0.1));
        n = n * 1.35 - 0.1 + uPulse * 0.12;
        vec3 col = uP0;
        col = mix(col, uP1, smoothstep(0.34, 0.5, n));
        col = mix(col, uP2, smoothstep(0.5, 0.64, n));
        col = mix(col, uP3, smoothstep(0.68, 0.8, n));
        col = mix(col, uP4, smoothstep(0.84, 0.95, n));
        fragColor = vec4(finish(col, uvS, p), 1.0);
      }`;
