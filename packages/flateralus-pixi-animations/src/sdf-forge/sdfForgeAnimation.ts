import type * as PIXI from 'pixi.js';
import { createManifest } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { HarnessShaderAnimation } from '../shared/harness-shader-animation';
import { fitRect, type ShaderContext } from '../shared/shader-harness';
import { onMark, sdfMask, sdfMaskInfo } from '../shared/sdf-harness';

const MANIFEST = createManifest({
  id: 'sdf-forge',
  name: 'SDF Forge (GLSL)',
  description:
    'The mark as forged metal — its signed distance field becomes a beveled height field, relit per pixel from the SDF gradient. The cursor carries the forge lamp. Click to hammer: a spark burst, a heat bloom that cools from white through orange to black, and a dent that slowly anneals flat. Ambient: the lamp orbits and the forge hammers itself.',
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
      name: 'hammer',
      type: 'number',
      label: 'Hammer Size',
      min: 0.02,
      max: 0.09,
      step: 0.005,
      defaultValue: 0.045,
      debug: true,
    },
    {
      name: 'force',
      type: 'number',
      label: 'Strike Depth',
      min: 0.4,
      max: 1.6,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'anneal',
      type: 'number',
      label: 'Anneal Time',
      min: 4,
      max: 40,
      step: 1,
      defaultValue: 14,
      debug: true,
    },
    {
      name: 'bevel',
      type: 'number',
      label: 'Edge Bevel',
      min: 0.012,
      max: 0.06,
      step: 0.004,
      defaultValue: 0.028,
      debug: true,
    },
    {
      name: 'metal',
      type: 'select',
      label: 'Metal',
      options: [
        { value: 0, label: 'Iron' },
        { value: 1, label: 'Bronze' },
        { value: 2, label: 'Steel' },
        { value: 3, label: 'Copper' },
        { value: 4, label: 'Brass' },
        { value: 5, label: 'Gunmetal' },
        { value: 6, label: 'Cast Orange' },
        { value: 7, label: 'Blued Steel' },
      ],
      defaultValue: 0,
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

export type SdfForgeControlValues = ManifestToControlValues<typeof MANIFEST>;

/** Carried across from the prototype verbatim. Do not reformat the GLSL. */
const FRAG = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform sampler2D uTex;
    uniform float uTime;
    uniform vec2 uRes;
    uniform vec4 uRect;
    uniform float uGrain;
    uniform float uTexAR;
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
  
      uniform vec3 uLight;   // logo uv (x, y), z = lamp height in x-units
      uniform vec4 uDentA[24]; // x, y (logo uv), radius (x-units), depth
      uniform float uHeatA[24];
      uniform float uND;
      uniform vec3 uHit;     // logo uv xy, age (9 = none)
      uniform float uBevel;
      uniform vec3 uCursor;  // logo uv xy, ring radius (0 = hide)
      uniform float uMetal;
      vec2 units(vec2 uv) { return vec2(uv.x, uv.y * uTexAR); }
      float dents(vec2 q) {
        float d = 0.0;
        for (int i = 0; i < 24; i++) {
          if (float(i) >= uND) break;
          vec4 dn = uDentA[i];
          vec2 dq = q - vec2(dn.x, dn.y * uTexAR);
          float r2 = dot(dq, dq) / (dn.z * dn.z);
          d += dn.w * exp(-r2 * 3.0) * (1.0 + 0.18 * uHeatA[i] * cos(sqrt(r2) * 9.4));
        }
        return d;
      }
      float height(vec2 uv) {
        float plateau = 1.0 - smoothstep(-uBevel, uBevel, sdf(uv));
        return plateau * (1.0 - 0.55 * clamp(dents(units(uv)), 0.0, 1.4));
      }
      float heatAt(vec2 q) {
        float h = 0.0;
        for (int i = 0; i < 24; i++) {
          if (float(i) >= uND) break;
          vec4 dn = uDentA[i];
          vec2 dq = q - vec2(dn.x, dn.y * uTexAR);
          h += uHeatA[i] * exp(-dot(dq, dq) / (dn.z * dn.z) * 2.2);
        }
        return h;
      }
      void main() {
        vec2 uvS = vec2(vUV.x, 1.0 - vUV.y);
        vec2 p = uvS * uRes;
        vec2 luv = (p - uRect.xy) / uRect.zw;
        vec2 q = units(luv);
        float eps = 1.5 / 1280.0;
        float hC = height(luv);
        float hX = height(luv + vec2(eps, 0.0));
        float hY = height(luv + vec2(0.0, eps / uTexAR));
        float S = 0.05; // physical relief height in x-units
        vec3 n = normalize(vec3(-(hX - hC) / eps * S, -(hY - hC) / eps * S, 1.0));
        float sd = sdf(luv);
        float m = 1.0 - smoothstep(-uBevel * 0.2, uBevel, sd);
        // materials
        float brush = 0.82 + 0.18 * fbm(vec2(luv.x * 90.0, luv.y * 9.0));
        int mi = int(uMetal + 0.5);
        vec3 metal = vec3(0.30, 0.29, 0.30); float gloss = 0.55; // iron
        if (mi == 1) { metal = vec3(0.48, 0.32, 0.18); gloss = 0.8; }   // bronze
        else if (mi == 2) { metal = vec3(0.52, 0.55, 0.60); gloss = 1.2; } // steel
        else if (mi == 3) { metal = vec3(0.72, 0.40, 0.30); gloss = 1.6; } // copper
        else if (mi == 4) { metal = vec3(0.66, 0.52, 0.22); gloss = 1.3; } // brass
        else if (mi == 5) { metal = vec3(0.16, 0.17, 0.22); gloss = 1.5; } // gunmetal
        else if (mi == 6) { metal = vec3(1.0, 0.373, 0.122); gloss = 0.9; } // cast orange #ff5f1f
        else if (mi == 7) { metal = vec3(0.20, 0.24, 0.34); gloss = 1.4; } // blued steel
        if (mi == 7) {
          // heat-treat iridescence: tint bands ride the view-grazing angle
          float g2 = pow(1.0 - abs(n.z), 1.5);
          metal += 0.22 * g2 * vec3(sin(g2 * 9.0) * 0.5 + 0.2, sin(g2 * 9.0 + 2.1) * 0.4, sin(g2 * 9.0 + 4.2) * 0.5 + 0.3);
        }
        vec3 stage = uInk * (0.85 + 0.3 * fbm(luv * 3.1 + 7.3)) + 0.02;
        vec3 alb = mix(stage, metal * brush, m);
        // lighting: point lamp above the plane, warm forge color
        vec3 P = vec3(q, hC * S);
        vec3 lp = vec3(units(uLight.xy), uLight.z);
        vec3 ldv = lp - P;
        float ldist = length(ldv);
        vec3 ld = ldv / max(ldist, 1e-4);
        float atten = 1.0 / (1.0 + ldist * ldist * 5.5);
        float diff = max(dot(n, ld), 0.0);
        vec3 hv = normalize(ld + vec3(0.0, 0.0, 1.0));
        float spec = pow(max(dot(n, hv), 0.0), 64.0) * gloss;
        vec3 lampC = mix(uOrange, uSun, 0.45);
        vec3 col = alb * (0.16 + diff * atten * 2.6) * mix(vec3(1.0), lampC * 1.6, 0.55)
                 + lampC * spec * atten * m * 1.8;
        // cool rim from above-left so the mark reads without the lamp
        vec3 rimD = normalize(vec3(-0.4, -0.5, 0.55));
        col += uCream * pow(max(dot(n, rimD), 0.0), 3.0) * 0.10 * m;
        // heat bloom at fresh dents
        float heat = clamp(heatAt(q), 0.0, 1.2);
        vec3 emis = mix(vec3(0.0), uDeep, smoothstep(0.03, 0.28, heat));
        emis = mix(emis, uOrange, smoothstep(0.28, 0.55, heat));
        emis = mix(emis, uSun, smoothstep(0.55, 0.82, heat));
        emis = mix(emis, uCream, smoothstep(0.88, 1.1, heat));
        col += emis * heat * m;
        col += uOrange * heat * 0.10; // spill onto the stage
        // spark burst + ring on a fresh strike
        if (uHit.z < 0.7) {
          vec2 hq = units(uHit.xy);
          float a = uHit.z;
          float fade = 1.0 - a / 0.7;
          float dist = distance(q, hq);
          col += uSun * smoothstep(0.010, 0.0, abs(dist - a * 0.30)) * fade * 0.8;
          for (int k = 0; k < 8; k++) {
            float fk = float(k);
            float h1 = hash21(vec2(fk, uHit.x * 91.7));
            float h2 = hash21(vec2(fk, uHit.y * 57.3));
            vec2 dir = vec2(cos(h1 * 6.2831), sin(h1 * 6.2831) * 0.7 - 0.35);
            vec2 sp = hq + dir * a * (0.22 + 0.3 * h2) + vec2(0.0, 0.55 * a * a);
            col += uCream * smoothstep(0.006 + 0.004 * h2, 0.0, distance(q, sp)) * fade;
          }
        }
        // hammer ring affordance at the cursor
        if (uCursor.z > 0.0) {
          float cr = abs(distance(q, units(uCursor.xy)) - uCursor.z);
          col += uCream * smoothstep(0.0022, 0.0, cr) * 0.22;
        }
        fragColor = vec4(finish(col, uvS, p), 1.0);
      }`;

/** Uniform array size for dents, baked into the shader source. */
const MAX_DENTS = 24;
/** The mark is drawn at a fixed fraction of the stage in this effect. */
const MARK_SCALE = 0.72;
/** Heat cooling time constant, seconds. */
const HEAT_TAU = 2.8;

interface Dent {
  x: number;
  y: number;
  r: number;
  depth: number;
  heat: number;
}

export class SdfForgeAnimation extends HarnessShaderAnimation<typeof MANIFEST> {
  protected readonly frag = FRAG;
  protected readonly extraUniforms = [
    'uLight',
    'uDentA[0]',
    'uHeatA[0]',
    'uND',
    'uHit',
    'uBevel',
    'uCursor',
    'uMetal',
  ] as const;
  protected readonly commonUniforms = [
    'uTex',
    'uTime',
    'uRes',
    'uRect',
    'uGrain',
    'uTexAR',
    'uInk',
    'uOrange',
    'uDeep',
    'uSun',
    'uCream',
  ] as const;

  private dents: Dent[] = [];
  /** The most recent strike, for the spark burst. */
  private hit: { x: number; y: number; age: number } | null = null;
  private nextAuto = 1.2;
  private dArr = new Float32Array(MAX_DENTS * 4);
  private hArr = new Float32Array(MAX_DENTS);

  constructor(initialControls?: Partial<SdfForgeControlValues>) {
    super(MANIFEST, initialControls);
  }

  protected mask(): HTMLCanvasElement {
    return sdfMask();
  }

  onInit(app: PIXI.Application, controls: SdfForgeControlValues): void {
    super.onInit(app, controls);
    this.dents = [];
    this.hit = null;
    this.nextAuto = 1.2;
    this.dArr.fill(0);
    this.hArr.fill(0);
  }

  private strike(u: number, v: number, controls: SdfForgeControlValues): void {
    this.dents.push({
      x: u,
      y: v,
      r: controls.hammer,
      depth: controls.force,
      heat: 1,
    });
    if (this.dents.length > MAX_DENTS) this.dents.shift();
    this.hit = { x: u, y: v, age: 0 };
  }

  protected setUniforms(
    gl: WebGL2RenderingContext,
    locs: Record<string, WebGLUniformLocation | null>,
    ctx: ShaderContext,
    controls: SdfForgeControlValues,
    dt: number,
    app: PIXI.Application
  ): void {
    const interactive = Number(controls.mode) > 0.5;
    const rc = fitRect(app.screen.width, app.screen.height, ctx, MARK_SCALE);
    const toUV = (x: number, y: number): [number, number] => [
      (x - rc[0]) / rc[2],
      (y - rc[1]) / rc[3],
    ];

    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        if (!interactive) continue;
        const [u, v] = toUV(c.x, c.y);
        if (onMark(u, v)) this.strike(u, v, controls);
      }
    }

    // Ambient: the forge hammers itself at points inside the mark.
    if (!interactive) {
      const pts = sdfMaskInfo().pts;
      if (pts.length) {
        this.nextAuto -= dt;
        if (this.nextAuto <= 0) {
          const pt = pts[Math.floor(Math.random() * pts.length)];
          this.strike(pt[0], pt[1], controls);
          this.nextAuto = 0.9 + Math.random() * 1.4;
        }
      }
    }

    // Dents anneal flat and the heat bleeds off on separate time constants.
    const aTau = Math.max(1, controls.anneal);
    this.dents = this.dents.filter((d) => {
      d.depth *= Math.exp(-dt / aTau);
      d.heat *= Math.exp(-dt / HEAT_TAU);
      return d.depth > 0.03;
    });
    if (this.hit) {
      this.hit.age += dt;
      if (this.hit.age > 0.7) this.hit = null;
    }

    const m = pointer?.mouse;
    let lu: number;
    let lv: number;
    if (interactive && m?.active) {
      [lu, lv] = toUV(m.x, m.y);
    } else {
      // Ambient: the lamp orbits.
      const t = this.time * 0.35;
      lu = 0.5 + 0.46 * Math.sin(t * 1.13);
      lv = 0.5 + 0.4 * Math.sin(t * 0.79 + 2.1);
    }

    this.dArr.fill(0);
    this.hArr.fill(0);
    this.dents.forEach((d, i) => {
      this.dArr[i * 4] = d.x;
      this.dArr[i * 4 + 1] = d.y;
      this.dArr[i * 4 + 2] = d.r;
      this.dArr[i * 4 + 3] = d.depth;
      this.hArr[i] = d.heat;
    });

    gl.uniform3f(locs.uLight!, lu, lv, 0.42);
    gl.uniform4fv(locs['uDentA[0]']!, this.dArr);
    gl.uniform1fv(locs['uHeatA[0]']!, this.hArr);
    gl.uniform1f(locs.uND!, this.dents.length);
    if (this.hit)
      gl.uniform3f(locs.uHit!, this.hit.x, this.hit.y, this.hit.age);
    else gl.uniform3f(locs.uHit!, 0, 0, 9);

    // The cursor ring only shows while it is actually over the mark.
    let cu = 0;
    let cv = 0;
    let cr = 0;
    if (interactive && m?.active) {
      const [u, v] = toUV(m.x, m.y);
      if (onMark(u, v)) {
        cu = u;
        cv = v;
        cr = controls.hammer;
      }
    }
    gl.uniform3f(locs.uCursor!, cu, cv, cr);
    gl.uniform1f(locs.uMetal!, Number(controls.metal));
    gl.uniform1f(locs.uBevel!, controls.bevel);
    gl.uniform4f(locs.uRect!, rc[0], rc[1], rc[2], rc[3]);
  }

  onDestroy(): void {
    this.dents = [];
    this.hit = null;
    super.onDestroy();
  }
}

export function createSdfForgeAnimation(
  initialControls?: Partial<SdfForgeControlValues>
): SdfForgeAnimation {
  return new SdfForgeAnimation(initialControls);
}
