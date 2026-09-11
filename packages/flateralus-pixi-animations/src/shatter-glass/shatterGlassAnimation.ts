import type * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { HarnessShaderAnimation } from '../shared/harness-shader-animation';
import {
  logoMask,
  setColor,
  type ShaderContext,
} from '../shared/shader-harness';

const MANIFEST = createManifest({
  id: 'shatter-glass',
  name: 'Shatter Glass (GLSL)',
  description:
    'The mark sits behind a pane of tempered glass. Each click drives a Voronoi crack network out from the hit — shards refract the scene behind them, and networks merge as hits accumulate. Reach the pane’s strength and it lets go: shards fall away under gravity and a fresh pane is fitted. Ambient: something keeps testing the glass.',
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
      name: 'strength',
      type: 'number',
      label: 'Pane Strength',
      min: 2,
      max: 8,
      step: 1,
      defaultValue: 4,
      debug: true,
    },
    {
      name: 'shards',
      type: 'number',
      label: 'Shard Density',
      min: 8,
      max: 24,
      step: 1,
      defaultValue: 16,
      debug: true,
    },
    {
      name: 'refr',
      type: 'number',
      label: 'Refraction',
      min: 0,
      max: 2,
      step: 0.1,
      defaultValue: 1,
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

export type ShatterGlassControlValues = ManifestToControlValues<
  typeof MANIFEST
>;

/** Carried across from the prototype verbatim. Do not reformat the GLSL. */
const FRAG = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform sampler2D uLogo;
    uniform float uTime;
    uniform float uAsp;
    uniform float uGrain;
    uniform vec4 uImp[6]; // x, y (uv), age, seed
    uniform float uNImp;
    uniform float uKPts;
    uniform float uRefr;
    uniform float uDrop; // fall age, 9 = intact
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
    vec3 scene(vec2 uv, float t) {
      vec2 q = (uv - 0.5) * vec2(uAsp, 1.0);
      vec3 col = uInk * (0.82 + 0.28 * fbm(uv * 2.6 + 4.2)) + 0.012;
      vec2 luv = q / vec2(0.62, 0.62 / 1.6) + 0.5;
      float a = 0.0;
      if (luv.x > 0.0 && luv.x < 1.0 && luv.y > 0.0 && luv.y < 1.0)
        a = texture(uLogo, vec2(luv.x, 1.0 - luv.y)).a;
      col = mix(col, uOrange, a);
      col += uSun * a * 0.12 * (0.5 + 0.5 * sin(t * 0.4));
      return col;
    }
    // seed point j of impact i, in aspect-corrected space
    vec2 seedPt(int i, int j, vec4 imp) {
      vec2 c = (imp.xy - 0.5) * vec2(uAsp, 1.0);
      if (j == 0) return c;
      float fj = float(j), fi = float(i);
      float h1 = hash21(vec2(fi * 13.7 + fj, imp.w));
      float h2 = hash21(vec2(fj * 7.1, imp.w + fi));
      float ang = h1 * 6.28318;
      float rad = 0.03 + 0.36 * h2 * h2;
      return c + vec2(cos(ang), sin(ang)) * rad;
    }
    void main() {
      vec2 uv = vUV;
      vec2 q = (uv - 0.5) * vec2(uAsp, 1.0);
      float t = uTime;
      // nearest / second-nearest crack seed
      float d1 = 1e9, d2 = 1e9;
      vec2 best = vec2(0.0);
      float bestH = 0.0, bestFade = 0.0;
      for (int i = 0; i < 6; i++) {
        if (float(i) >= uNImp) break;
        vec4 imp = uImp[i];
        vec2 c = (imp.xy - 0.5) * vec2(uAsp, 1.0);
        float reach = smoothstep(0.5, 0.15, distance(q, c));
        int K = int(uKPts);
        for (int j = 0; j < 24; j++) {
          if (j > K) break;
          vec2 sp = seedPt(i, j, imp);
          float d = distance(q, sp);
          if (d < d1) {
            d2 = d1; d1 = d; best = sp;
            bestH = hash21(sp * 91.7 + imp.w);
            bestFade = reach;
          } else if (d < d2) d2 = d;
        }
      }
      float edge = d2 - d1;
      float dropping = uDrop < 5.0 ? 1.0 : 0.0;
      vec2 refr = vec2(0.0);
      float crack = 0.0;
      if (uNImp > 0.5) {
        // per-cell refraction: each shard tilts a fixed random way
        vec2 tilt = normalize(vec2(bestH - 0.5, hash21(best * 47.3) - 0.5) + 1e-4);
        refr = tilt * 0.016 * uRefr * bestFade;
        crack = smoothstep(0.006, 0.0015, edge) * bestFade;
      }
      vec2 suv = uv;
      float shardMix = 0.0;
      if (dropping > 0.5) {
        float a = uDrop;
        float hv = 0.3 + 1.0 * bestH;
        vec2 fall = vec2((bestH - 0.5) * 0.14 * a, -(hv * a + 1.9 * a * a));
        suv = uv - fall / vec2(uAsp, 1.0) * 0.5;
        shardMix = clamp(a * 1.4, 0.0, 1.0);
        crack *= 1.0 - shardMix;
      }
      vec3 through = scene(suv + refr / vec2(uAsp, 1.0), t);
      vec3 bare = scene(uv, t) * 1.06;
      vec3 col = mix(through, bare, shardMix);
      // glass tint + diagonal glint (fades as the pane drops)
      float glass = 1.0 - shardMix;
      col = mix(col, col * vec3(0.94, 0.97, 1.0), glass * 0.6);
      col += uCream * smoothstep(0.35, 0.0, abs(q.x + q.y * 0.55 - 0.42)) * 0.035 * glass;
      // cracks: bright core with warm glint
      col += uCream * crack * 0.85;
      col += uOrange * smoothstep(0.02, 0.004, edge) * bestFade * 0.18 * (1.0 - crack) * (1.0 - shardMix);
      // fresh-hit flash
      for (int i = 0; i < 6; i++) {
        if (float(i) >= uNImp) break;
        vec4 imp = uImp[i];
        if (imp.z < 0.35) {
          vec2 c = (imp.xy - 0.5) * vec2(uAsp, 1.0);
          col += uCream * smoothstep(0.1, 0.0, distance(q, c)) * (1.0 - imp.z / 0.35) * 0.7;
        }
      }
      vec2 cc = uv * 2.0 - 1.0;
      col *= 0.9 + 0.1 * smoothstep(1.7, 0.3, dot(cc, cc));
      col += (hash21(floor(uv * 640.0) + vec2(fract(uTime * 7.0) * 13.0)) - 0.5) * 0.05 * uGrain;
      fragColor = vec4(col, 1.0);
    }`;

/** Uniform array size for impacts, baked into the shader source. */
const MAX_IMPACTS = 6;
/** How long the pane takes to fall away once it lets go. */
const DROP_LIFE_S = 1.5;

interface Impact {
  x: number;
  y: number;
  age: number;
  seed: number;
}

export class ShatterGlassAnimation extends HarnessShaderAnimation<
  typeof MANIFEST
> {
  protected readonly frag = FRAG;
  protected readonly extraUniforms = [
    'uLogo',
    'uAsp',
    'uImp[0]',
    'uNImp',
    'uKPts',
    'uRefr',
    'uDrop',
  ] as const;
  protected readonly commonUniforms = [
    'uTime',
    'uGrain',
    'uInk',
    'uOrange',
    'uSun',
    'uCream',
  ] as const;

  protected get renderScale(): number {
    return typeof window === 'undefined'
      ? 1
      : Math.min(2, window.devicePixelRatio || 1);
  }

  private impacts: Impact[] = [];
  /** Non-null while the pane is falling away. */
  private drop: { age: number } | null = null;
  private nextAuto = 2;
  private impArr = new Float32Array(MAX_IMPACTS * 4);

  constructor(initialControls?: Partial<ShatterGlassControlValues>) {
    super(MANIFEST, initialControls);
  }

  protected mask(): HTMLCanvasElement {
    return logoMask();
  }

  onInit(app: PIXI.Application, controls: ShatterGlassControlValues): void {
    super.onInit(app, controls);
    this.impacts = [];
    this.drop = null;
    this.nextAuto = 2;
    this.impArr.fill(0);
  }

  /** A hit is ignored while the pane is already falling. */
  private hit(x: number, y: number, strength: number): void {
    if (this.drop) return;
    this.impacts.push({ x, y, age: 0, seed: Math.random() * 100 });
    if (this.impacts.length > MAX_IMPACTS) this.impacts.shift();
    if (this.impacts.length >= Math.round(strength)) this.drop = { age: 0 };
  }

  protected setUniforms(
    gl: WebGL2RenderingContext,
    locs: Record<string, WebGLUniformLocation | null>,
    ctx: ShaderContext,
    controls: ShatterGlassControlValues,
    dt: number,
    app: PIXI.Application
  ): void {
    const interactive = Number(controls.mode) > 0.5;
    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        if (interactive) {
          this.hit(
            c.x / app.screen.width,
            1 - c.y / app.screen.height,
            controls.strength
          );
        }
      }
    }
    if (!interactive) {
      // Ambient: something keeps testing the glass.
      this.nextAuto -= dt;
      if (this.nextAuto <= 0 && !this.drop) {
        this.hit(
          0.18 + Math.random() * 0.64,
          0.2 + Math.random() * 0.6,
          controls.strength
        );
        this.nextAuto = 1.6 + Math.random() * 1.6;
      }
    }

    for (const im of this.impacts) im.age += dt;
    if (this.drop) {
      this.drop.age += dt;
      if (this.drop.age > DROP_LIFE_S) {
        this.drop = null;
        this.impacts = [];
        this.nextAuto = 2.5;
      }
    }

    // The mask texture the harness built is the logo; this shader names it
    // uLogo rather than uTex.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ctx.texture);
    gl.uniform1i(locs.uLogo!, 0);
    gl.uniform1f(locs.uAsp!, app.screen.width / Math.max(1, app.screen.height));

    this.impArr.fill(0);
    this.impacts.forEach((im, i) => {
      this.impArr[i * 4] = im.x;
      this.impArr[i * 4 + 1] = im.y;
      this.impArr[i * 4 + 2] = im.age;
      this.impArr[i * 4 + 3] = im.seed;
    });
    gl.uniform4fv(locs['uImp[0]']!, this.impArr);
    gl.uniform1f(locs.uNImp!, this.impacts.length);
    gl.uniform1f(locs.uKPts!, Math.round(controls.shards));
    gl.uniform1f(locs.uRefr!, controls.refr);
    gl.uniform1f(locs.uDrop!, this.drop ? this.drop.age : 9);
    setColor(gl, locs.uInk!, PAL.ink);
    setColor(gl, locs.uOrange!, PAL.bright);
    setColor(gl, locs.uSun!, PAL.sun);
    setColor(gl, locs.uCream!, PAL.cream);
  }

  onDestroy(): void {
    this.impacts = [];
    this.drop = null;
    super.onDestroy();
  }
}

export function createShatterGlassAnimation(
  initialControls?: Partial<ShatterGlassControlValues>
): ShatterGlassAnimation {
  return new ShatterGlassAnimation(initialControls);
}
