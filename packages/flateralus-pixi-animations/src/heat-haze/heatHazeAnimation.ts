import type * as PIXI from 'pixi.js';
import { createManifest } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { HarnessShaderAnimation } from '../shared/harness-shader-animation';
import {
  PRE,
  fitRect,
  headlineMask,
  type ShaderContext,
} from '../shared/shader-harness';

const MANIFEST = createManifest({
  id: 'heat-haze',
  name: 'Heat Haze (GLSL)',
  description:
    'The hero headline pushed through a thermal distortion field — fbm noise advected upward bends the letterforms like air over hot asphalt. The cursor is a heat source: type warps and color-shifts near it, snaps crisp when you leave. Click for a heat flash across the whole block.',
  controls: [
    {
      name: 'textScale',
      type: 'number',
      label: 'Text Scale',
      min: 0.5,
      max: 0.95,
      step: 0.05,
      defaultValue: 0.78,
      debug: true,
    },
    {
      name: 'shimmer',
      type: 'number',
      label: 'Shimmer Amp',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.6,
      debug: true,
    },
    {
      name: 'speed',
      type: 'number',
      label: 'Rise Speed',
      min: 0.2,
      max: 2.5,
      step: 0.1,
      defaultValue: 1.0,
      debug: true,
    },
    {
      name: 'radius',
      type: 'number',
      label: 'Heat Radius',
      min: 0.1,
      max: 0.5,
      step: 0.02,
      defaultValue: 0.24,
      debug: true,
    },
    {
      name: 'aberration',
      type: 'number',
      label: 'Aberration',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.5,
      debug: true,
    },
    {
      name: 'ghost',
      type: 'number',
      label: 'Mirage Ghost',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.6,
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

export type HeatHazeControlValues = ManifestToControlValues<typeof MANIFEST>;

const EXTRA_UNIFORMS = [
  'uMouse',
  'uAmp',
  'uSpeed',
  'uRadius',
  'uAb',
  'uGhost',
  'uFlash',
] as const;

const FRAG =
  PRE +
  `
      uniform vec2 uMouse;
      uniform float uAmp;
      uniform float uSpeed;
      uniform float uRadius;
      uniform float uAb;
      uniform float uGhost;
      uniform float uFlash;
      void main() {
        vec2 uvS = vec2(vUV.x, 1.0 - vUV.y);
        vec2 p = uvS * uRes;
        float t = uTime * uSpeed;
        vec2 luv = (p - uRect.xy) / uRect.zw;
        float mprox = exp(-length(p - uMouse) / (uRes.y * uRadius));
        float heat = 0.16 + mprox * 1.5 + uFlash * 0.9;
        vec2 q = vec2(luv.x * 7.0, luv.y * 4.0 + t * 1.3);
        float wx = fbm(q) - 0.5;
        float wy = fbm(q + 13.7) - 0.5;
        vec2 luv2 = luv + vec2(wx, wy * 0.35) * (uAmp * heat * 0.045);
        float ab = uAb * 0.005 * heat;
        float mR = maskA(luv2 + vec2(ab, 0.0));
        float mG = maskA(luv2);
        float mB = maskA(luv2 - vec2(ab, 0.0));
        float gh = maskA(luv2 + vec2(wx * 0.03, 0.05 + wy * 0.03)) * uGhost * clamp(heat - 0.3, 0.0, 1.0) * 0.4;
        vec3 bg = (uStage < 0.5) ? uOrange : uInk;
        bg *= 0.94 + 0.06 * fbm(uvS * 3.0 + uTime * 0.06);
        bg += ((uStage < 0.5) ? uSun : uOrange * 0.5) * abs(wx) * mprox * 0.25;
        float hf = clamp(heat * (0.4 + 0.9 * fbm(luv2 * 6.0 + t * 0.7)), 0.0, 1.4);
        vec3 mark = (uStage < 0.5) ? uInk : uCream;
        mark = mix(mark, uOrange, smoothstep(0.45, 0.95, hf));
        mark = mix(mark, uSun, smoothstep(0.9, 1.35, hf));
        vec3 col;
        col.r = mix(bg.r, mark.r, mR);
        col.g = mix(bg.g, mark.g, mG);
        col.b = mix(bg.b, mark.b, mB);
        vec3 ghostC = (uStage < 0.5) ? uInk : uOrange;
        col = mix(col, ghostC, gh * (1.0 - mG));
        fragColor = vec4(finish(col, uvS, p), 1.0);
      }`;

export class HeatHazeAnimation extends HarnessShaderAnimation<typeof MANIFEST> {
  protected readonly frag = FRAG;
  protected readonly extraUniforms = EXTRA_UNIFORMS;

  /** Decays after a click; drives the whole-block heat flash. */
  private flash = 0;

  constructor(initialControls?: Partial<HeatHazeControlValues>) {
    super(MANIFEST, initialControls);
  }

  protected mask(): HTMLCanvasElement | null {
    return headlineMask();
  }

  onInit(app: PIXI.Application, controls: HeatHazeControlValues): void {
    super.onInit(app, controls);
    this.flash = 0;
  }

  protected setUniforms(
    gl: WebGL2RenderingContext,
    locs: Record<string, WebGLUniformLocation | null>,
    ctx: ShaderContext,
    controls: HeatHazeControlValues,
    dt: number,
    app: PIXI.Application
  ): void {
    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        pointer.clicks.shift();
        this.flash = 1;
      }
    }
    this.flash = Math.max(0, this.flash - dt * 1.4);

    const rect = fitRect(
      app.screen.width,
      app.screen.height,
      ctx,
      controls.textScale
    );
    gl.uniform4f(locs.uRect!, rect[0], rect[1], rect[2], rect[3]);

    const m = pointer?.mouse;
    const active = m?.active ?? false;
    gl.uniform2f(locs.uMouse!, active ? m!.x : -9999, active ? m!.y : -9999);
    gl.uniform1f(locs.uAmp!, controls.shimmer);
    gl.uniform1f(locs.uSpeed!, controls.speed);
    gl.uniform1f(locs.uRadius!, controls.radius);
    gl.uniform1f(locs.uAb!, controls.aberration);
    gl.uniform1f(locs.uGhost!, controls.ghost);
    gl.uniform1f(locs.uFlash!, this.flash);
  }
}

export function createHeatHazeAnimation(
  initialControls?: Partial<HeatHazeControlValues>
): HeatHazeAnimation {
  return new HeatHazeAnimation(initialControls);
}
