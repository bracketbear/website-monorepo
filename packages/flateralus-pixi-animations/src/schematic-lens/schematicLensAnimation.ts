import type * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { HarnessShaderAnimation } from '../shared/harness-shader-animation';
import {
  PRE,
  compositeMask,
  setColor,
  fitRect,
  type ShaderContext,
} from '../shared/shader-harness';

const MANIFEST = createManifest({
  id: 'schematic-lens',
  name: 'Schematic Lens (GLSL)',
  description:
    'The cursor carries a molten glass lens. Outside it, the finished lockup; through it, the same scene refracted and magnified into a schematic pass — grid, hatching, edge-traced outline. Click fires an expanding pulse that sweeps the schematic across the full frame.',
  controls: [
    {
      name: 'markScale',
      type: 'number',
      label: 'Lockup Scale',
      min: 0.4,
      max: 0.9,
      step: 0.05,
      defaultValue: 0.62,
      debug: true,
    },
    {
      name: 'lensSize',
      type: 'number',
      label: 'Lens Size',
      min: 0.1,
      max: 0.45,
      step: 0.02,
      defaultValue: 0.22,
      debug: true,
    },
    {
      name: 'magnify',
      type: 'number',
      label: 'Magnify',
      min: 1,
      max: 2.4,
      step: 0.1,
      defaultValue: 1.4,
      debug: true,
    },
    {
      name: 'wobble',
      type: 'number',
      label: 'Liquid Wobble',
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

export type SchematicLensControlValues = ManifestToControlValues<
  typeof MANIFEST
>;

const FRAG =
  PRE +
  `
      uniform vec2 uLens;
      uniform float uLR;
      uniform float uMag;
      uniform float uWob;
      uniform vec3 uRing;
      uniform vec3 uCyan;
      uniform vec3 uAcid;
      vec3 normalView(vec2 p, vec2 uvS) {
        vec2 luv = (p - uRect.xy) / uRect.zw;
        float m = maskA(luv);
        vec3 bg = (uStage < 0.5) ? uOrange : uInk;
        bg *= 0.94 + 0.06 * fbm(uvS * 2.5 + uTime * 0.05);
        vec3 markC = (uStage < 0.5) ? uInk : uCream;
        return mix(bg, markC, m);
      }
      vec3 bpView(vec2 p) {
        vec2 luv = (p - uRect.xy) / uRect.zw;
        float m = maskA(luv);
        float e = 0.007;
        float mE = max(max(maskA(luv + vec2(e, 0.0)), maskA(luv - vec2(e, 0.0))),
                       max(maskA(luv + vec2(0.0, e)), maskA(luv - vec2(0.0, e))));
        float edge = clamp(mE - m, 0.0, 1.0);
        vec3 col = uInk * 0.7;
        vec2 gp = fract(p / 46.0);
        float grid = clamp(step(gp.x, 0.045) + step(gp.y, 0.045), 0.0, 1.0);
        col += uCyan * 0.12 * grid;
        float hat = step(0.55, fract((p.x + p.y) * 0.055)) * m;
        col += uCyan * 0.16 * hat;
        col += uCyan * edge * 1.5;
        float sweep = exp(-abs(fract(uTime * 0.12) * (uRes.y * 1.35) - p.y) * 0.03);
        col += uAcid * 0.14 * sweep;
        return col;
      }
      void main() {
        vec2 uvS = vec2(vUV.x, 1.0 - vUV.y);
        vec2 p = uvS * uRes;
        vec2 d = p - uLens;
        float r = length(d) / max(uLR, 1.0);
        float wob = (fbm(vec2(atan(d.y, d.x) * 1.7 + 3.0, uTime * 0.8)) - 0.5) * uWob;
        float rr = r + wob * 0.16;
        float inL = smoothstep(1.0, 0.94, rr);
        float k = 1.0 - 1.0 / max(uMag, 1.0);
        vec2 pin = uLens + d * (1.0 - k * smoothstep(1.05, 0.0, rr));
        float ringR = uRing.z * 820.0 + 30.0;
        float band = exp(-abs(length(p - uRing.xy) - ringR) * 0.012) * exp(-uRing.z * 1.5);
        float reveal = clamp(inL + band, 0.0, 1.0);
        vec3 col = mix(normalView(p, uvS), bpView(pin), reveal);
        float rim = exp(-abs(rr - 0.97) * 30.0);
        col += (uCyan * 0.5 + uCream * 0.4) * rim;
        fragColor = vec4(finish(col, uvS, p), 1.0);
      }`;

export class SchematicLensAnimation extends HarnessShaderAnimation<
  typeof MANIFEST
> {
  protected readonly frag = FRAG;
  protected readonly extraUniforms = [
    'uLens',
    'uLR',
    'uMag',
    'uWob',
    'uRing',
    'uCyan',
    'uAcid',
  ] as const;

  /** Smoothed lens position, so it trails the cursor rather than snapping. */
  private lx = 0;
  private ly = 0;
  private ring = { x: 0, y: 0, age: 99 };

  constructor(initialControls?: Partial<SchematicLensControlValues>) {
    super(MANIFEST, initialControls);
  }

  protected mask(): HTMLCanvasElement | null {
    return compositeMask();
  }

  onInit(app: PIXI.Application, controls: SchematicLensControlValues): void {
    super.onInit(app, controls);
    this.lx = app.screen.width / 2;
    this.ly = app.screen.height / 2;
    this.ring = { x: 0, y: 0, age: 99 };
  }

  protected setUniforms(
    gl: WebGL2RenderingContext,
    locs: Record<string, WebGLUniformLocation | null>,
    ctx: ShaderContext,
    controls: SchematicLensControlValues,
    dt: number,
    app: PIXI.Application
  ): void {
    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        this.ring = { x: c.x, y: c.y, age: 0 };
      }
    }
    this.ring.age += dt;

    const w = app.screen.width;
    const h = app.screen.height;
    const m = pointer?.mouse;
    // With no cursor the lens drifts on its own so the effect stays alive.
    const tx = m?.active ? m.x : w * (0.5 + 0.3 * Math.sin(this.time * 0.4));
    const ty = m?.active
      ? m.y
      : h * (0.5 + 0.24 * Math.sin(this.time * 0.31 + 1.7));
    const k = Math.min(1, dt * 5);
    this.lx += (tx - this.lx) * k;
    this.ly += (ty - this.ly) * k;

    const rect = fitRect(w, h, ctx, controls.markScale);
    gl.uniform4f(locs.uRect!, rect[0], rect[1], rect[2], rect[3]);
    gl.uniform2f(locs.uLens!, this.lx, this.ly);
    gl.uniform1f(locs.uLR!, controls.lensSize * h);
    gl.uniform1f(locs.uMag!, controls.magnify);
    gl.uniform1f(locs.uWob!, controls.wobble);
    gl.uniform3f(locs.uRing!, this.ring.x, this.ring.y, this.ring.age);
    setColor(gl, locs.uCyan!, PAL.cyan);
    setColor(gl, locs.uAcid!, PAL.acid);
  }
}

export function createSchematicLensAnimation(
  initialControls?: Partial<SchematicLensControlValues>
): SchematicLensAnimation {
  return new SchematicLensAnimation(initialControls);
}
