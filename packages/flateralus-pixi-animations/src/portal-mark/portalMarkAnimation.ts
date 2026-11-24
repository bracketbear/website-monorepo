import type * as PIXI from 'pixi.js';
import { createManifest } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { HarnessShaderAnimation } from '../shared/harness-shader-animation';
import { fitRect, type ShaderContext } from '../shared/shader-harness';
import {
  SDF_COMMON_UNIFORMS,
  SDF_PRE,
  SHARED_EYE,
  sdfMask,
} from '../shared/sdf-harness';

const MANIFEST = createManifest({
  id: 'portal-mark',
  name: 'Portal Mark (GLSL)',
  description:
    'The mark cut out of the stage as a window into fourteen worlds — grid corridor, violet nebula, phosphor ridgeline, aurora curtains, caustic depths, starfield warp, molten flow, ember drift, phosphor signal, halftone press, green ooze, third eye, a wind-driven blizzard, and a draining soap film. The letterform cut stays anchored, but worlds with physical mass react at its edge — molten sags, ooze bulges, caustics refract, snow packs onto the cut, soap film wobbles with tension. Clicking sweeps the next world through the portal as an expanding circle from the click point. The cut plane tilts in perspective toward the cursor, and each world spills its own light onto the stage around the letterforms.',
  controls: [
    {
      name: 'markScale',
      type: 'number',
      label: 'Mark Scale',
      min: 0.4,
      max: 0.9,
      step: 0.05,
      defaultValue: 0.68,
      debug: true,
    },
    {
      name: 'offsetx',
      type: 'number',
      label: 'Center Offset X',
      min: -1,
      max: 1,
      step: 0.05,
      defaultValue: 0,
      debug: true,
    },
    {
      name: 'scene',
      type: 'select',
      label: 'World',
      options: [
        { value: 0, label: 'Grid corridor' },
        { value: 1, label: 'Nebula' },
        { value: 2, label: 'Ridgeline' },
        { value: 3, label: 'Aurora' },
        { value: 4, label: 'Caustic depths' },
        { value: 5, label: 'Starfield warp' },
        { value: 6, label: 'Molten flow' },
        { value: 7, label: 'Ember drift' },
        { value: 8, label: 'Phosphor signal' },
        { value: 9, label: 'Halftone press' },
        { value: 10, label: 'Green ooze' },
        { value: 11, label: 'Third eye' },
        { value: 12, label: 'Blizzard' },
        { value: 13, label: 'Soap film' },
      ],
      defaultValue: 0,
      debug: true,
    },
    {
      name: 'cycle',
      type: 'select',
      label: 'Click Cycle',
      options: [
        { value: 'all', label: 'All worlds' },
        { value: 'featured', label: 'Featured four' },
      ],
      defaultValue: 'all',
      debug: true,
    },
    {
      name: 'speed',
      type: 'number',
      label: 'Fall Speed',
      min: 0.05,
      max: 1.5,
      step: 0.05,
      defaultValue: 0.35,
      debug: true,
    },
    {
      name: 'tilt',
      type: 'number',
      label: 'Cursor Tilt',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.6,
      debug: true,
    },
    {
      name: 'cover',
      type: 'boolean',
      label: 'Fill Stage',
      defaultValue: false,
      debug: true,
    },
    {
      name: 'lean',
      type: 'number',
      label: 'Hero Lean',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.45,
      debug: true,
    },
    {
      name: 'spill',
      type: 'number',
      label: 'Light Spill',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.65,
      debug: true,
    },
    {
      name: 'edge',
      type: 'number',
      label: 'Edge React',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.35,
      debug: true,
    },
    {
      name: 'parallax',
      type: 'number',
      label: 'Parallax',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.5,
      debug: true,
    },
    {
      name: 'grain',
      type: 'boolean',
      label: 'Film Grain',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'stage',
      type: 'select',
      label: 'Stage',
      options: [
        { value: 1, label: 'Ink stage' },
        { value: 0, label: 'Orange stage' },
      ],
      defaultValue: 1,
      debug: true,
    },
  ],
} as const);

export type PortalMarkControlValues = ManifestToControlValues<typeof MANIFEST>;

const FRAG =
  SDF_PRE +
  SHARED_EYE +
  `
      uniform vec2 uMouse;
      uniform float uSpeed;
      uniform float uTilt;
      uniform float uCover;
      uniform float uSpill;
      uniform float uPar;
      uniform float uEdge;
      uniform float uSceneA;
      uniform float uSceneB;
      uniform float uMix;
      uniform vec2 uClick;
      #define NEB_DEEP vec3(0.075, 0.055, 0.16)
      #define NEB_VIO vec3(0.47, 0.30, 0.86)
      #define NEB_MAG vec3(0.95, 0.30, 0.48)
      #define TEAL vec3(0.28, 0.92, 0.76)
      #define NEON_PINK vec3(1.0, 0.16, 0.5)
      #define NEON_CYAN vec3(0.05, 0.96, 1.0)
      #define DUSK vec3(0.09, 0.03, 0.17)
      vec3 corridor(vec2 q, float t) {
        float r = length(q) + 1e-4;
        float ang = atan(q.y, q.x);
        float z = 0.5 / r + t;
        float rings = smoothstep(0.86, 1.0, abs(fract(z) * 2.0 - 1.0));
        float spokes = smoothstep(0.9, 1.0, abs(fract(ang * 12.0 / 6.28318 + z * 0.06) * 2.0 - 1.0));
        float nearFade = smoothstep(0.03, 0.16, r);
        vec3 grid = mix(uOrange, uSun, clamp(0.07 / r, 0.0, 1.0));
        vec3 col = uInk * 0.5 + grid * (rings * 0.9 + spokes * 0.3) * nearFade;
        float shaft = pow(0.5 + 0.5 * sin(ang * 3.0 - t * 0.6), 3.0) * exp(-r * 2.2);
        col += uSun * shaft * 0.3;
        col += uCream * exp(-r * 14.0) * 0.7;
        col = mix(col, uInk * 0.75, exp(-r * 6.0) * 0.35);
        return col;
      }
      vec3 nebula(vec2 q, float t) {
        vec3 col = NEB_DEEP;
        float core = 0.0;
        for (int k = 0; k < 2; k++) {
          float ph = fract(t * 0.09 + float(k) * 0.5);
          float s = exp2(mix(2.2, -1.2, ph));
          float w = 1.0 - abs(ph * 2.0 - 1.0);
          float n = fbm(q * s * 3.2 + vec2(float(k) * 19.3, float(k) * 7.1));
          col += NEB_VIO * smoothstep(0.35, 0.8, n) * w * 0.9;
          col += NEB_MAG * smoothstep(0.55, 0.9, fbm(q * s * 5.0 + vec2(31.0, 13.0))) * w * 0.3;
          core += pow(smoothstep(0.55, 0.95, n), 2.0) * w;
        }
        col += uSun * core * 0.3;
        col += uCream * exp(-dot(q, q) * 16.0) * 0.85;
        col += uCream * stars(q, 60.0, 2.0) * 0.9;
        return col;
      }
      vec3 ridge(vec2 q, float t) {
        float hor = -0.04;
        vec3 skyC = mix(DUSK, NEB_VIO * 0.45, clamp(1.0 - (hor - q.y) * 2.2, 0.0, 1.0));
        skyC += NEON_PINK * exp(-abs(q.y - hor) * 5.5) * 0.5;
        skyC += uSun * exp(-abs(q.y - hor) * 16.0) * 0.55;
        skyC += uCream * stars(q, 70.0, 1.0) * 0.85;
        float gz = 0.3 / max(q.y - hor, 0.004);
        float gx = q.x * gz;
        vec2 g = vec2(gx * 1.4, gz * 1.1 + t * 1.6);
        vec2 f = abs(fract(g) - 0.5);
        float gl = smoothstep(0.05, 0.0, min(f.x, f.y));
        float fog = exp(-gz * 0.12);
        vec3 gndC = DUSK * 0.9 + NEON_PINK * gl * fog + NEON_PINK * (1.0 - fog) * 0.35;
        gndC += NEON_CYAN * gl * fog * 0.25;
        vec3 col = mix(gndC, skyC, step(q.y, hor));
        for (int i = 2; i >= 0; i--) {
          float d = 1.0 + float(i);
          float ry = hor - (fbm(vec2(q.x * d * 2.4 + t * 0.12 * d + float(i) * 11.0, d * 5.0)) * 0.16) / d;
          float below = smoothstep(0.0, 0.01, q.y - ry) * step(q.y, hor);
          col = mix(col, DUSK * 0.8, below * (0.8 - float(i) * 0.18));
          col += mix(NEON_CYAN, NEB_VIO, float(i) * 0.4) * smoothstep(0.006, 0.0, abs(q.y - ry)) * (1.0 - float(i) * 0.24);
        }
        return col;
      }
      vec3 aurora(vec2 q, float t) {
        vec3 col = NEB_DEEP * 0.55;
        col += uCream * stars(q, 80.0, 2.5) * 0.8;
        for (int k = 0; k < 2; k++) {
          float seed = float(k) * 9.3;
          float w = fbm(vec2(q.x * 2.2 + seed, t * 0.14 + seed));
          float y0 = -0.1 + float(k) * 0.09 + (w - 0.5) * 0.3;
          float d = q.y - y0;
          float strand = 0.35 + 0.65 * pow(vnoise(vec2(q.x * 26.0 + seed * 7.0, t * 0.4 + seed)), 2.0);
          float I = exp(-abs(d) * (d > 0.0 ? 5.0 : 14.0)) * strand;
          col += mix(TEAL, NEB_VIO, clamp(d * 3.5 + 0.5, 0.0, 1.0)) * I * 0.85;
        }
        col += uOrange * exp(-abs(q.y - 0.24) * 9.0) * 0.12;
        return col;
      }
      vec3 caustics(vec2 q, float t) {
        vec3 deep = vec3(0.015, 0.10, 0.14);
        float sink = t * 0.22;
        vec2 w = vec2(q.x, q.y - sink);
        float n1 = vnoise(w * 7.0 + vec2(t * 0.5, t * 0.3));
        float n2 = vnoise(w * 7.0 - vec2(t * 0.4, t * 0.45) + 31.0);
        float ca = pow(clamp(1.0 - abs(n1 - n2) * 2.6, 0.0, 1.0), 7.0);
        float depthFade = clamp(0.5 - q.y * 1.3, 0.15, 1.0);
        vec3 col = deep * (0.7 + 0.6 * depthFade);
        col += TEAL * ca * depthFade * 0.75;
        col += uCream * ca * ca * depthFade * 0.3;
        float ray = pow(0.5 + 0.5 * sin(q.x * 14.0 + fbm(q * 3.0 + t * 0.1) * 3.0), 3.0);
        col += mix(TEAL, uCream, 0.4) * ray * exp(-(q.y + 0.42) * -0.0 - abs(q.y + 0.42) * 2.6) * 0.18;
        col += uCream * stars(vec2(q.x, q.y + t * 0.5), 60.0, 0.5) * 0.55 * depthFade;
        return col;
      }
      vec3 warp(vec2 q, float t) {
        float r = length(q) + 1e-3;
        float a = atan(q.y, q.x);
        vec3 col = uInk * 0.45 + NEB_DEEP * 0.4;
        for (int k = 0; k < 2; k++) {
          float N = 50.0 + float(k) * 34.0;
          float n = floor(a * N / 6.28318);
          float h = hash21(vec2(n, float(k) * 7.0));
          float aw = abs(fract(a * N / 6.28318) - 0.5);
          float thin = smoothstep(0.32, 0.0, aw);
          float sp = fract(0.22 / r - t * (0.9 + h * 1.4) + h * 7.0);
          float streak = smoothstep(0.0, 0.3, sp) * smoothstep(0.85, 0.4, sp);
          vec3 sc = mix(uCream, (h > 0.7 ? NEB_VIO : uSun), h * 0.8);
          col += sc * streak * thin * smoothstep(0.04, 0.22, r) * (0.5 + 0.5 * h);
        }
        col += uCream * exp(-r * 9.0) * 0.8;
        col += NEB_VIO * exp(-r * 3.0) * 0.2;
        return col;
      }
      vec3 molten(vec2 q, float t) {
        vec2 w = q * 2.6;
        w += vec2(fbm(w + t * 0.08), fbm(w + 7.3 - t * 0.06)) * 0.9;
        float n = fbm(w);
        float crack = pow(clamp(1.0 - abs(n * 2.0 - 1.0) * 1.9, 0.0, 1.0), 3.0);
        float heat = 0.62 + 0.38 * sin(t * 0.7 + n * 9.0);
        vec3 col = uInk * (0.55 + 0.45 * fbm(q * 5.0 + 3.7));
        col += uOrange * crack * (0.75 + heat * 0.45);
        col += uSun * crack * crack * heat * 0.8;
        col += uCream * pow(crack, 6.0) * 0.5;
        col += uOrange * exp(-dot(q, q) * 5.0) * 0.1;
        return col;
      }
      vec3 embers(vec2 q, float t) {
        float smoke = fbm(vec2(q.x * 2.0, q.y * 2.0 + t * 0.25));
        vec3 col = uInk * 0.55 + uOrange * smoke * 0.07;
        col += uOrange * exp(-(0.5 - q.y) * 3.2) * 0.3;
        col += uSun * exp(-(0.5 - q.y) * 7.0) * 0.18;
        for (int k = 0; k < 3; k++) {
          float fl = float(k);
          float sc = 15.0 + fl * 9.0;
          vec2 g = vec2(q.x * sc + sin(q.y * 6.0 + t * (0.7 + fl * 0.3) + fl * 5.0) * 0.7,
                        (q.y + t * (0.28 + fl * 0.14)) * sc);
          vec2 cell = floor(g);
          float h = hash21(cell + fl * 13.1);
          if (h < 0.82) continue;
          vec2 pt = vec2(hash21(cell + 3.7), hash21(cell + 9.1));
          float d = length(fract(g) - pt);
          float s = smoothstep(0.14 + 0.1 * h, 0.0, d);
          float tw = 0.55 + 0.45 * sin(t * (3.0 + h * 6.0) + h * 40.0);
          col += mix(uOrange, uSun, h) * s * tw * (1.0 - fl * 0.22);
          col += uCream * s * s * tw * 0.25;
        }
        return col;
      }
      vec3 signalW(vec2 q, float t) {
        vec3 PH = vec3(0.35, 1.0, 0.6);
        vec3 col = uInk * 0.45 + PH * 0.025;
        float wob = sin(q.x * 9.0 + t * 1.7) * 0.12 + sin(q.x * 23.0 - t * 2.3) * 0.05
                  + (vnoise(vec2(q.x * 6.0, t * 0.8)) - 0.5) * 0.22;
        float d = abs(q.y - wob);
        col += PH * exp(-d * 36.0) * 0.9;
        col += uCream * exp(-d * 150.0) * 0.6;
        float wob2 = sin(q.x * 5.0 - t * 1.1) * 0.09;
        col += PH * exp(-abs(q.y + 0.22 - wob2) * 55.0) * 0.3;
        col += PH * exp(-abs(q.y - 0.26 + wob2 * 0.6) * 70.0) * 0.18;
        col *= 0.82 + 0.18 * sin(q.y * 300.0 + t * 3.0);
        col += PH * exp(-abs(fract(q.y * 0.5 - t * 0.06) - 0.5) * 12.0) * 0.08;
        col += PH * exp(-dot(q, q) * 3.0) * 0.05;
        return col;
      }
      vec3 halftone(vec2 q, float t) {
        float wave = fbm(q * 2.2 + vec2(t * 0.12, -t * 0.09));
        float wave2 = fbm(q * 1.8 + vec2(-t * 0.08, t * 0.1) + 21.0);
        vec3 col = uCream * (0.97 + 0.03 * fbm(q * 7.0));
        mat2 R1 = mat2(0.9689, -0.2474, 0.2474, 0.9689);
        vec2 g1 = R1 * q * 58.0;
        float d1 = length(fract(g1) - 0.5);
        float r1 = clamp(wave * 1.1 - 0.28, 0.0, 0.62);
        col = mix(col, uOrange, smoothstep(r1, r1 - 0.1, d1) * smoothstep(0.25, 0.55, wave));
        mat2 R2 = mat2(0.8253, 0.5646, -0.5646, 0.8253);
        vec2 g2 = R2 * q * 44.0;
        float d2 = length(fract(g2) - 0.5);
        float r2 = clamp(wave2 * 0.95 - 0.34, 0.0, 0.55);
        col = mix(col, uInk, smoothstep(r2, r2 - 0.1, d2) * smoothstep(0.38, 0.7, wave2) * 0.9);
        return col;
      }
      vec3 ooze(vec2 q, float t) {
        vec3 GOO = vec3(0.35, 0.95, 0.25);
        vec3 GOO_D = vec3(0.04, 0.22, 0.05);
        vec2 w = vec2(q.x, q.y - t * 0.16);
        w += vec2(fbm(w * 2.4 + t * 0.1), fbm(w * 2.4 + 9.1 - t * 0.08)) * 0.5;
        float n1 = fbm(w * 2.8);
        float n2 = fbm(w * 2.8 + 17.0);
        float blob = smoothstep(0.42, 0.62, n1);
        float glossd = abs(n1 - 0.56);
        vec3 col = uInk * 0.5 + GOO_D * (0.5 + 0.5 * n2);
        col = mix(col, GOO_D * 2.2, blob);
        col += GOO * blob * smoothstep(0.5, 0.85, n2) * 0.7;
        col += GOO * exp(-glossd * 22.0) * 0.55;
        col += uCream * exp(-glossd * 90.0) * smoothstep(0.5, 0.8, n2) * 0.45;
        vec2 bg = vec2(q.x * 9.0, (q.y + t * 0.3) * 9.0 + fbm(q * 3.0) * 2.0);
        vec2 bc = floor(bg);
        float bh = hash21(bc);
        if (bh > 0.86) {
          float bd = length(fract(bg) - vec2(hash21(bc + 5.1), hash21(bc + 2.3)));
          float br = 0.05 + 0.09 * hash21(bc + 8.8);
          col += GOO * smoothstep(br, br * 0.3, bd) * blob * 0.8;
        }
        col += GOO * exp(-(q.y + 0.4) * (q.y + 0.4) * 6.0) * 0.08;
        return col;
      }
      vec3 blizzardW(vec2 q, float t) {
        vec3 col = mix(vec3(0.05, 0.06, 0.10), vec3(0.13, 0.15, 0.21), clamp(q.y + 0.5, 0.0, 1.0));
        col += vec3(0.5, 0.6, 0.8) * fbm(vec2(q.x * 2.0 + t * 0.9, q.y * 3.0)) * 0.10;
        for (int k = 0; k < 3; k++) {
          float fl = float(k);
          float sc = 10.0 + fl * 9.0;
          vec2 g = vec2((q.x + t * (0.10 + fl * 0.05)) * sc + sin(q.y * 4.0 + t * (0.9 + fl * 0.4) + fl * 5.0) * 0.7,
                        (q.y - t * (0.16 + fl * 0.08)) * sc);
          vec2 cell = floor(g);
          float h = hash21(cell + fl * 17.1);
          if (h < 0.8) continue;
          vec2 pt = vec2(hash21(cell + 3.7), hash21(cell + 9.1));
          float d = length(fract(g) - pt);
          float s = smoothstep(0.1 + 0.08 * h, 0.0, d);
          col += mix(vec3(0.75, 0.82, 0.95), uCream, h) * s * (1.0 - fl * 0.22);
        }
        col += vec3(0.6, 0.7, 0.9) * exp(-abs(q.y - 0.45) * 4.0) * 0.15;
        return col;
      }
      vec3 soapW(vec2 q, float t) {
        float th = 1.4 + q.y * 1.6 + fbm(q * 2.3 + vec2(t * 0.08, -t * 0.14)) * 1.8 + fbm(q * 5.5 + vec2(9.0, -t * 0.22)) * 0.5;
        vec3 ir = 0.5 + 0.5 * cos(6.28318 * (th * vec3(1.0, 1.28, 1.62) + vec3(0.0, 0.12, 0.28)));
        vec3 col = mix(vec3(0.015, 0.015, 0.025), ir * vec3(0.75, 0.7, 0.85), 0.8);
        float thin = smoothstep(0.9, 0.2, th);
        col *= 1.0 - thin * 0.85;
        col += uCream * pow(vnoise(q * 3.0 + t * 0.1), 8.0) * 0.5;
        col += uCream * exp(-abs(q.y + 0.42) * 12.0) * 0.12;
        return col;
      }
      // per-world edge perturbation, in letterform-uv units. Only worlds whose
      // material has mass touching the window react; gas/particle/geometry worlds
      // (corridor, nebula, ridgeline, aurora, warp, embers, halftone) return zero.
      vec2 edgeWarp(float id, vec2 luv, float t) {
        if (id < 3.5) return vec2(0.0);
        if (id < 4.5) { // caustics: fine refraction wobble
          return vec2(vnoise(luv * 26.0 + vec2(t * 0.9, 0.0)) - 0.5,
                      vnoise(luv * 26.0 + vec2(17.0, t * 0.8)) - 0.5) * 0.012;
        }
        if (id < 5.5) return vec2(0.0);
        if (id < 6.5) { // molten: slow low-frequency sag, edges droop
          float sag = pow(fbm(vec2(luv.x * 4.0 + 2.7, t * 0.25)), 2.0);
          return vec2((fbm(vec2(luv.y * 3.0, t * 0.2)) - 0.5) * 0.006, -sag * 0.022);
        }
        if (id < 7.5) return vec2(0.0);
        if (id < 8.5) { // signal: row-quantized sync slip
          float row = floor(luv.y * 80.0);
          float fr = floor(t * 6.0);
          float h = hash21(vec2(row, fr));
          float slip = (h > 0.93) ? (hash21(vec2(row + 7.0, fr)) - 0.5) * 0.03 : 0.0;
          return vec2(slip + sin(luv.y * 40.0 + t * 3.0) * 0.0015, 0.0);
        }
        if (id < 9.5) return vec2(0.0);
        if (id < 10.5) { // ooze: blobby low-frequency bulge
          return vec2(fbm(luv * 3.0 + vec2(t * 0.18, 0.0)) - 0.5,
                      fbm(luv * 3.0 + vec2(9.0, -t * 0.14)) - 0.5) * 0.028;
        }
        // third eye: slow breathing dilation of the whole cut
        if (id < 11.5) {
          vec2 rc = luv - 0.5;
          return -rc * sin(t * 0.45) * 0.018;
        }
        if (id < 12.5) { // blizzard: lumpy snow accretion that builds and sloughs
          float pile = pow(fbm(vec2(luv.x * 5.0, floor(t * 0.08) * 3.0)), 2.0) * (0.5 + 0.5 * sin(t * 0.16));
          return vec2(0.0, pile * 0.02);
        }
        // soap film: surface-tension meniscus wobble
        return vec2(vnoise(luv * 14.0 + vec2(t * 0.5, 0.0)) - 0.5,
                    vnoise(luv * 14.0 + vec2(23.0, t * 0.45)) - 0.5) * 0.016;
      }
      vec3 sceneCol(float id, vec2 q, float t) {
        if (id < 0.5) return corridor(q, t);
        if (id < 1.5) return nebula(q, t);
        if (id < 2.5) return ridge(q, t);
        if (id < 3.5) return aurora(q, t);
        if (id < 4.5) return caustics(q, t);
        if (id < 5.5) return warp(q, t);
        if (id < 6.5) return molten(q, t);
        if (id < 7.5) return embers(q, t);
        if (id < 8.5) return signalW(q, t);
        if (id < 9.5) return halftone(q, t);
        if (id < 10.5) return ooze(q, t);
        if (id < 11.5) return visionary(q, t);
        if (id < 12.5) return blizzardW(q, t);
        return soapW(q, t);
      }
      vec3 spillC(float id) {
        if (id < 0.5) return uOrange;
        if (id < 1.5) return NEB_VIO;
        if (id < 2.5) return NEON_PINK;
        if (id < 3.5) return TEAL;
        if (id < 4.5) return vec3(0.1, 0.55, 0.6);
        if (id < 5.5) return uSun;
        if (id < 6.5) return uOrange;
        if (id < 7.5) return vec3(1.0, 0.6, 0.22);
        if (id < 8.5) return vec3(0.35, 1.0, 0.6);
        if (id < 9.5) return uCream;
        if (id < 10.5) return vec3(0.35, 0.95, 0.25);
        if (id < 11.5) return vec3(0.55, 0.45, 1.0);
        if (id < 12.5) return vec3(0.65, 0.78, 1.0);
        return vec3(0.9, 0.5, 1.0);
      }
      void main() {
        vec2 uvS = vec2(vUV.x, 1.0 - vUV.y);
        vec2 p = uvS * uRes;
        vec2 luv = (p - uRect.xy) / uRect.zw;
        vec2 mrel = uMouse; // pre-smoothed mark-relative offset from CPU
        vec2 tl = mrel * uTilt;
        vec2 c = luv - 0.5;
        float wp = max(1.0 + (c.x * tl.x + c.y * tl.y * uTexAR) * 1.3, 0.35);
        vec2 luvT = 0.5 + c / wp;
        float t0 = uTime * uSpeed;
        vec2 ew = mix(edgeWarp(uSceneA, luvT, t0), edgeWarp(uSceneB, luvT, t0), uMix) * uEdge;
        float sd = sdf(luvT + ew);
        float aa = max(fwidth(sd), 1e-5);
        float inside = 1.0 - smoothstep(-aa, aa, sd);
        inside = max(inside, uCover);
        float t = t0;
        vec2 q = (luvT - 0.5) * vec2(1.0, uTexAR) - mrel * uPar * 0.2;
        vec3 inCol = sceneCol(uSceneA, q, t);
        float wip = 0.0;
        if (uMix > 0.001) {
          float dq = length(q - uClick);
          float Rw = uMix * uMix * 1.5;
          wip = smoothstep(Rw, Rw - 0.14, dq);
          inCol = mix(inCol, sceneCol(uSceneB, q, t), wip);
          inCol += mix(spillC(uSceneB), uCream, 0.35) * exp(-abs(dq - Rw) * 26.0) * (1.0 - uMix) * 0.7;
        }
        inCol *= mix(1.0, clamp(1.0 / wp, 0.7, 1.35), uTilt);
        vec3 bg = (uStage < 0.5) ? uOrange : uInk;
        bg *= 0.95 + 0.05 * fbm(uvS * 3.0 + uTime * 0.04);
        vec3 spc = mix(spillC(uSceneA), spillC(uSceneB), uMix);
        float spill = exp(-max(sd, 0.0) * 6.5) * (1.0 - inside);
        spill *= 0.85 + 0.15 * sin(uTime * 0.9 + sd * 24.0);
        vec3 col = mix(bg, inCol, inside);
        col += spc * spill * uSpill * ((uStage < 0.5) ? 0.45 : 0.75);
        float rim = exp(-abs(sd) * 120.0) * (1.0 - uCover);
        col += mix(spc, uCream, 0.4) * rim * 0.55;
        fragColor = vec4(finish(col, uvS, p), 1.0);
      }`;

const WORLD_COUNT = 14;
/** The four worlds the "featured" click cycle rotates through. */
const FEATURED = [1, 2, 3, 4];

export class PortalMarkAnimation extends HarnessShaderAnimation<
  typeof MANIFEST
> {
  protected readonly frag = FRAG;
  protected readonly extraUniforms = [
    'uMouse',
    'uSpeed',
    'uTilt',
    'uSpill',
    'uPar',
    'uEdge',
    'uSceneA',
    'uSceneB',
    'uMix',
    'uClick',
    'uGaze',
    'uCover',
  ] as const;
  protected readonly commonUniforms = SDF_COMMON_UNIFORMS;

  /** Outgoing and incoming worlds, and the sweep between them. */
  private a = 0;
  private b = 0;
  private mix = 0;
  private click: [number, number] = [0, 0];
  /** Last seen value of the scene control, to detect a manual change. */
  private lastScene: number | null = null;
  /** Smoothed cursor position in mark-local space. */
  private smooth: [number, number] = [0, 0];
  private reducedMotion = false;

  constructor(initialControls?: Partial<PortalMarkControlValues>) {
    super(MANIFEST, initialControls);
  }

  protected mask(): HTMLCanvasElement {
    return sdfMask();
  }

  onInit(app: PIXI.Application, controls: PortalMarkControlValues): void {
    super.onInit(app, controls);
    this.a = 0;
    this.b = 0;
    this.mix = 0;
    this.click = [0, 0];
    this.lastScene = null;
    this.smooth = [0, 0];
    this.reducedMotion =
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  protected setUniforms(
    gl: WebGL2RenderingContext,
    locs: Record<string, WebGLUniformLocation | null>,
    ctx: ShaderContext,
    controls: PortalMarkControlValues,
    dt: number,
    app: PIXI.Application
  ): void {
    const rm = this.reducedMotion;
    // Reduced motion holds a still frame so the scenes stay composed.
    if (rm) gl.uniform1f(locs.uTime!, 8.0);

    const scene = Number(controls.scene);
    if (this.lastScene !== scene) {
      this.lastScene = scene;
      this.a = scene;
      this.b = scene;
      this.mix = 0;
    }

    const w = app.screen.width;
    const h = app.screen.height;
    const r = fitRect(w, h, ctx, controls.markScale);
    r[0] += ((controls.offsetx || 0) * (w - r[2])) / 2;

    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        if (this.mix > 0) this.a = this.b;
        if (controls.cycle === 'featured') {
          this.b =
            FEATURED[
              (FEATURED.indexOf(this.a) + 1 + FEATURED.length) % FEATURED.length
            ];
        } else {
          this.b = (this.a + 1) % WORLD_COUNT;
        }
        this.mix = 0.0001;
        const cx = c?.x ?? w / 2;
        const cy = c?.y ?? h / 2;
        this.click = [
          (cx - r[0]) / r[2] - 0.5,
          ((cy - r[1]) / r[3] - 0.5) * (ctx.texHeight / ctx.texWidth),
        ];
      }
    }
    if (this.mix > 0) {
      this.mix = Math.min(1, this.mix + dt * (rm ? 4.0 : 1.1));
      if (this.mix >= 1) {
        this.a = this.b;
        this.mix = 0;
      }
    }

    gl.uniform4f(locs.uRect!, r[0], r[1], r[2], r[3]);

    const m = pointer?.mouse;
    const active = !!m?.active && !rm;
    // Rest posture: the cut plane is viewed slightly from below.
    const lean = (controls.lean == null ? 0.45 : controls.lean) * 0.55;
    const tx = active ? (m!.x - r[0]) / r[2] - 0.5 : 0;
    const ty = (active ? (m!.y - r[1]) / r[3] - 0.5 : 0) + lean;
    // Ease toward the cursor so entering or leaving the stage does not snap.
    const ease = 1 - Math.exp(-dt * 6);
    this.smooth[0] += (tx - this.smooth[0]) * ease;
    this.smooth[1] += (ty - this.smooth[1]) * ease;

    gl.uniform2f(locs.uMouse!, this.smooth[0], this.smooth[1]);
    gl.uniform1f(locs.uSpeed!, controls.speed);
    gl.uniform1f(locs.uTilt!, rm ? 0 : controls.tilt);
    gl.uniform1f(locs.uCover!, controls.cover ? 1.0 : 0.0);
    gl.uniform1f(locs.uSpill!, controls.spill);
    gl.uniform1f(locs.uPar!, controls.parallax);
    gl.uniform1f(locs.uEdge!, rm ? 0 : controls.edge);
    gl.uniform1f(locs.uSceneA!, this.a);
    gl.uniform1f(locs.uSceneB!, this.b);
    gl.uniform1f(locs.uMix!, this.mix);
    gl.uniform2f(locs.uClick!, this.click[0], this.click[1]);
  }
}

export function createPortalMarkAnimation(
  initialControls?: Partial<PortalMarkControlValues>
): PortalMarkAnimation {
  return new PortalMarkAnimation(initialControls);
}
