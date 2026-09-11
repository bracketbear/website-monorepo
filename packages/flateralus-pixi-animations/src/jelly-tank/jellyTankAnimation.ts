import type * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { HarnessShaderAnimation } from '../shared/harness-shader-animation';
import { setColor, type ShaderContext } from '../shared/shader-harness';

/** Uniform array sizes, baked into the shader source below. */
const MAX_JELLIES = 8;
const MAX_RINGS = 4;

const MANIFEST = createManifest({
  id: 'jelly-tank',
  name: 'Jelly Tank (GLSL)',
  description:
    'A jellyfish smack with pulse-jet locomotion simulated for real: thrust only fires while the bell contracts, the jelly sinks between pulses, and headings wander with a bias toward the light. The bells, scalloped rims, organs and tentacle strands are all signed-distance glow in one GLSL pass over a god-ray water column. Your cursor is a lure nearby jellies turn toward; click to send a pressure wave that startles the whole smack into a jet. Ambient: waves fire on their own.',
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
      name: 'count',
      type: 'number',
      label: 'Smack Size',
      min: 1,
      max: MAX_JELLIES,
      step: 1,
      defaultValue: 5,
      debug: true,
    },
    {
      name: 'pulse',
      type: 'number',
      label: 'Pulse Rate',
      min: 0.4,
      max: 2.2,
      step: 0.1,
      defaultValue: 1.0,
      debug: true,
    },
    {
      name: 'tent',
      type: 'number',
      label: 'Tentacle Len',
      min: 0.5,
      max: 2.0,
      step: 0.1,
      defaultValue: 1.2,
      debug: true,
    },
    {
      name: 'current',
      type: 'number',
      label: 'Current',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.35,
      debug: true,
    },
    {
      name: 'glow',
      type: 'number',
      label: 'Bioluminescence',
      min: 0.5,
      max: 2.0,
      step: 0.1,
      defaultValue: 1.0,
      debug: true,
    },
    {
      name: 'snow',
      type: 'boolean',
      label: 'Marine Snow',
      defaultValue: true,
      debug: true,
    },
  ],
} as const);

export type JellyTankControlValues = ManifestToControlValues<typeof MANIFEST>;

/** Carried across from the prototype verbatim. Do not reformat the GLSL. */
const FRAG = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform float uTime;
    uniform float uAsp;
    uniform int uCount;
    uniform vec4 uJA[8];   // x, y, size, bellPhase
    uniform vec4 uJB[8];   // heading, energy, tentLen, seed
    uniform vec4 uRings[4]; // x, y, age(0..1), strength
    uniform vec3 uMouse;         // x, y, active
    uniform float uGlow;
    uniform float uSnow;
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
    mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
    void main() {
      vec2 uv = vUV;
      vec2 p = (uv - 0.5) * vec2(uAsp, 1.0);
      // pressure waves: displace space + remember glow
      float ringGlow = 0.0;
      for (int i = 0; i < 4; i++) {
        vec4 rg = uRings[i];
        if (rg.w <= 0.0) continue;
        float d = length(p - rg.xy);
        float rr = rg.z * 0.85 + 0.02;
        float band = exp(-pow((d - rr) * 16.0, 2.0));
        float life = 1.0 - rg.z;
        p -= normalize(p - rg.xy + 1e-5) * band * 0.025 * life * rg.w;
        ringGlow += band * life * rg.w;
      }
      // water column: darker with depth, faint god rays from above
      vec3 col = uInk * (0.30 + 0.55 * uv.y) + 0.004;
      float rays = fbm(vec2(p.x * 2.4 - p.y * 0.7, uTime * 0.05))
                 * fbm(vec2(p.x * 5.2 + 3.7 - p.y * 0.4, uTime * 0.03 + 7.0));
      col += uSun * pow(rays, 2.6) * smoothstep(0.05, 0.95, uv.y) * 0.55;
      // marine snow: two parallax layers of drifting motes
      if (uSnow > 0.5) {
        for (int L = 0; L < 2; L++) {
          float sc = L == 0 ? 42.0 : 74.0;
          float spd = L == 0 ? 0.016 : 0.030;
          vec2 g = p * sc + vec2(uTime * spd * 0.6, uTime * spd * sc);
          vec2 id = floor(g);
          vec2 f = fract(g) - 0.5;
          float h = hash21(id);
          if (h > 0.94) {
            vec2 off = vec2(hash21(id + 3.1), hash21(id + 7.7)) - 0.5;
            float dd = length(f - off * 0.7);
            col += uCream * smoothstep(0.09, 0.0, dd) * 0.10 * (L == 0 ? 1.0 : 0.55);
          }
        }
      }
      // jellies
      for (int i = 0; i < 8; i++) {
        if (i >= uCount) break;
        vec4 A = uJA[i], B = uJB[i];
        float s = A.z, ph = A.w, en = B.y, tl = B.z, seed = B.w;
        vec2 q = rot(-B.x) * (p - A.xy);
        if (length(q) > s * (1.6 + tl * 2.8)) continue;
        float gs = (0.7 + 0.6 * en) * uGlow;
        // bell: pulsing ellipse dome with scalloped rim
        float k = 0.5 + 0.5 * sin(ph);                 // 1 = contracted
        float rx = s * (1.0 - 0.30 * k);
        float ry = s * (0.60 + 0.36 * k);
        float theta = atan(q.x, q.y);                   // 0 at apex
        float sd = (length(q / vec2(rx, ry)) - 1.0) * min(rx, ry);
        sd += 0.05 * ry * sin(theta * 9.0 + ph * 2.0) * (0.5 - 0.5 * cos(theta));
        float underCut = smoothstep(-ry * 0.60, -ry * 0.12, q.y);
        float fill = smoothstep(0.012 * s, -0.02 * s, sd) * underCut;
        float membrane = fill * (0.20 + 0.65 * exp(sd / (0.28 * s)));
        float rim = exp(-abs(sd) / (0.022 * s)) * underCut;
        // gonads: four-lobe organ cluster near the apex
        float ro = length(q / vec2(rx * 0.52, ry * 0.55));
        float organ = exp(-ro * 3.2) * (0.35 + 0.65 * pow(abs(cos(theta * 2.0 + seed)), 1.5));
        col += (uOrange * membrane * 0.55 + uSun * rim * 0.85 + uCream * organ * 0.75) * gs;
        // tentacles: 5 trailing strands
        float startY = -ry * 0.22;
        float TL = tl * s * 2.4;
        if (q.y < startY) {
          float yy = (startY - q.y) / TL;
          if (yy < 1.0) {
            float fade = smoothstep(1.0, 0.7, yy) * smoothstep(0.0, 0.05, yy);
            for (int t = 0; t < 5; t++) {
              float fx = (float(t) - 2.0) * 0.5;
              float amp = s * (0.30 + 0.35 * en) * yy;
              float dx = sin(yy * 7.0 - ph * 1.4 + seed * 6.28 + float(t) * 1.9) * amp;
              float xr = fx * rx * 0.55 * (1.0 + yy * 0.8) + dx;
              float w = s * mix(0.010, 0.0025, yy);
              float g = w / (abs(q.x - xr) + w);
              col += mix(uOrange, uSun, 0.35) * g * g * 0.55 * fade * gs;
            }
            // oral arms: 2 thicker, slower ribbons
            float yy2 = yy / 0.62;
            if (yy2 < 1.0) {
              float fade2 = smoothstep(1.0, 0.6, yy2) * smoothstep(0.0, 0.05, yy2);
              for (int t = 0; t < 2; t++) {
                float side = float(t) * 2.0 - 1.0;
                float dx = sin(yy2 * 3.2 - ph * 0.9 + seed * 4.0 + side) * s * 0.22 * yy2;
                float xr = side * rx * 0.16 + dx;
                float w = s * mix(0.022, 0.005, yy2);
                float g = w / (abs(q.x - xr) + w);
                col += uCream * g * g * 0.40 * fade2 * gs;
              }
            }
          }
        }
      }
      col += uSun * ringGlow * 0.22;
      // cursor lure: a faint mote of light
      if (uMouse.z > 0.5) {
        float d = length(p - uMouse.xy);
        col += uCream * (0.06 / (d * 34.0 + 1.0)) * (0.8 + 0.2 * sin(uTime * 5.0));
      }
      col = 1.0 - exp(-col * 1.25);
      col += (hash21(floor(uv * 720.0) + vec2(fract(uTime * 7.0) * 13.0)) - 0.5) * 0.035;
      fragColor = vec4(col, 1.0);
    }`;

interface Jelly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Heading, radians. */
  ang: number;
  /** Bell contraction phase; thrust fires on the rising half. */
  phase: number;
  rateMul: number;
  size: number;
  seed: number;
  /** Startle energy, decaying; raises pulse rate and thrust. */
  energy: number;
}

interface Ring {
  x: number;
  y: number;
  age: number;
  str: number;
}

function makeJelly(asp: number): Jelly {
  return {
    x: (Math.random() - 0.5) * asp * 0.8,
    y: (Math.random() - 0.5) * 0.8,
    vx: 0,
    vy: 0,
    ang: (Math.random() - 0.5) * 1.2,
    phase: Math.random() * Math.PI * 2,
    rateMul: 0.75 + Math.random() * 0.5,
    size: 0.1 + Math.random() * 0.07,
    seed: Math.random(),
    energy: 0,
  };
}

/** Turn toward a target heading the short way round. */
function steer(j: Jelly, target: number, rate: number, dt: number): void {
  const da = Math.atan2(Math.sin(target - j.ang), Math.cos(target - j.ang));
  j.ang += da * Math.min(1, rate * dt);
}

/** A pressure ring lives this long. */
const RING_LIFE_S = 1.6;

export class JellyTankAnimation extends HarnessShaderAnimation<
  typeof MANIFEST
> {
  protected readonly frag = FRAG;
  protected readonly extraUniforms = [
    'uAsp',
    'uCount',
    'uMouse',
    'uGlow',
    'uSnow',
    'uJA[0]',
    'uJB[0]',
    'uRings[0]',
  ] as const;
  protected readonly commonUniforms = [
    'uTime',
    'uInk',
    'uOrange',
    'uSun',
    'uCream',
  ] as const;
  protected readonly needsMask = false;

  private jellies: Jelly[] = [];
  private rings: Ring[] = [];
  /** Countdown to the next ambient pressure wave. */
  private nextAuto = 2.5;
  private ja = new Float32Array(MAX_JELLIES * 4);
  private jb = new Float32Array(MAX_JELLIES * 4);
  private rg = new Float32Array(MAX_RINGS * 4);

  constructor(initialControls?: Partial<JellyTankControlValues>) {
    super(MANIFEST, initialControls);
  }

  protected mask(): null {
    return null;
  }

  onInit(app: PIXI.Application, controls: JellyTankControlValues): void {
    super.onInit(app, controls);
    this.jellies = [];
    this.rings = [];
    this.nextAuto = 2.5;
  }

  protected setUniforms(
    gl: WebGL2RenderingContext,
    locs: Record<string, WebGLUniformLocation | null>,
    _ctx: ShaderContext,
    controls: JellyTankControlValues,
    deltaTime: number,
    app: PIXI.Application
  ): void {
    const w = app.screen.width;
    const h = app.screen.height;
    const asp = w / Math.max(1, h);
    const A = asp / 2;
    const interactive = Number(controls.mode) > 0.5;
    // The locomotion sim is unstable above a ~20fps step.
    const dt = Math.min(deltaTime, 1 / 20);

    if (this.jellies.length === 0) {
      this.jellies = Array.from({ length: MAX_JELLIES }, () => makeJelly(asp));
    }
    const J = this.jellies;
    const count = Math.round(controls.count);

    // Events: clicks when interactive, ambient auto-waves otherwise.
    const waves: { x: number; y: number; str: number }[] = [];
    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        if (interactive) {
          waves.push({ x: (c.x / w - 0.5) * asp, y: 0.5 - c.y / h, str: 1 });
        }
      }
    }
    if (!interactive) {
      this.nextAuto -= dt;
      if (this.nextAuto <= 0) {
        waves.push({
          x: (Math.random() - 0.5) * asp * 0.7,
          y: (Math.random() - 0.5) * 0.7,
          str: 0.8,
        });
        this.nextAuto = 3 + Math.random() * 3;
      }
    }
    for (const wv of waves) {
      this.rings.push({ x: wv.x, y: wv.y, age: 0, str: wv.str });
      if (this.rings.length > MAX_RINGS) this.rings.shift();
    }

    const m = pointer?.mouse;
    const mAct = interactive && !!m?.active;
    const mx = mAct ? (m!.x / w - 0.5) * asp : 0;
    const my = mAct ? 0.5 - m!.y / h : 0;

    for (let i = 0; i < count; i++) {
      const j = J[i];
      j.phase +=
        dt *
        controls.pulse *
        j.rateMul *
        Math.PI *
        2 *
        0.35 *
        (1 + 1.6 * j.energy);
      // Thrust fires on contraction, the rising half of the pulse.
      const contract = Math.max(0, Math.sin(j.phase));
      const thrust = contract * contract * 0.22 * (1 + 1.8 * j.energy);
      j.vx += Math.sin(j.ang) * thrust * dt;
      j.vy += Math.cos(j.ang) * thrust * dt;
      // Sink between pulses.
      j.vy -= 0.022 * dt;
      const drag = Math.exp(-1.4 * dt);
      j.vx *= drag;
      j.vy *= drag;
      j.x +=
        j.vx * dt * 60 * 0.016 +
        Math.sin(this.time * 0.3 + j.seed * 9) * controls.current * 0.012 * dt;
      j.x += controls.current * 0.008 * dt;
      j.y += j.vy * dt * 60 * 0.016;

      // Heading wanders, with a mild upward bias.
      j.ang += Math.sin(this.time * 0.4 + j.seed * 20) * 0.35 * dt;
      steer(j, 0, 0.12, dt);

      // Lure: turn toward the cursor when it is close but not on top of them.
      if (mAct) {
        const dx = mx - j.x;
        const dy = my - j.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.55 && d > 0.1) {
          steer(j, Math.atan2(dx, dy), 1.4, dt);
          j.energy = Math.max(j.energy, 0.25);
        }
      }

      // Startle from a fresh wave: jet away from it.
      for (const wv of waves) {
        const dx = j.x - wv.x;
        const dy = j.y - wv.y;
        if (Math.hypot(dx, dy) < 0.75) {
          j.energy = 1;
          j.ang = Math.atan2(dx, dy);
        }
      }

      // Soft bounds: steer back toward center near the edges.
      if (Math.abs(j.x) > A - 0.14 || Math.abs(j.y) > 0.38) {
        steer(j, Math.atan2(-j.x, -j.y), 1.0, dt);
      }
      j.x = Math.max(-A - 0.2, Math.min(A + 0.2, j.x));
      j.y = Math.max(-0.65, Math.min(0.62, j.y));
      j.energy *= Math.exp(-0.7 * dt);

      this.ja[i * 4] = j.x;
      this.ja[i * 4 + 1] = j.y;
      this.ja[i * 4 + 2] = j.size;
      this.ja[i * 4 + 3] = j.phase;
      this.jb[i * 4] = j.ang;
      this.jb[i * 4 + 1] = j.energy;
      this.jb[i * 4 + 2] = controls.tent;
      this.jb[i * 4 + 3] = j.seed;
    }

    this.rings = this.rings.filter((r) => {
      r.age += dt;
      return r.age < RING_LIFE_S;
    });
    this.rg.fill(0);
    this.rings.forEach((r, i) => {
      this.rg[i * 4] = r.x;
      this.rg[i * 4 + 1] = r.y;
      this.rg[i * 4 + 2] = r.age / RING_LIFE_S;
      this.rg[i * 4 + 3] = r.str;
    });

    gl.uniform1f(locs.uAsp!, asp);
    gl.uniform1i(locs.uCount!, count);
    gl.uniform3f(locs.uMouse!, mx, my, mAct ? 1 : 0);
    gl.uniform1f(locs.uGlow!, controls.glow);
    gl.uniform1f(locs.uSnow!, controls.snow ? 1 : 0);
    setColor(gl, locs.uInk!, PAL.ink);
    setColor(gl, locs.uOrange!, PAL.bright);
    setColor(gl, locs.uSun!, PAL.sun);
    setColor(gl, locs.uCream!, PAL.cream);
    gl.uniform4fv(locs['uJA[0]']!, this.ja);
    gl.uniform4fv(locs['uJB[0]']!, this.jb);
    gl.uniform4fv(locs['uRings[0]']!, this.rg);
  }

  onDestroy(): void {
    this.jellies = [];
    this.rings = [];
    super.onDestroy();
  }
}

export function createJellyTankAnimation(
  initialControls?: Partial<JellyTankControlValues>
): JellyTankAnimation {
  return new JellyTankAnimation(initialControls);
}
