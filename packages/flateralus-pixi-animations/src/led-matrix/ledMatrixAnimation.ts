import type * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { HarnessShaderAnimation } from '../shared/harness-shader-animation';
import {
  PRE,
  logoMask,
  setColor,
  fitRect,
  type ShaderContext,
} from '../shared/shader-harness';

const MANIFEST = createManifest({
  id: 'led-matrix',
  name: 'LED Matrix (GLSL)',
  description:
    'The mark shown on a simulated LED wall — a fixed dot grid where each diode samples the logo mask at its cell center, with live content (flow field, sweep, or data rain) playing through the lit region. The cursor reveals the unlit hardware grid around the mark; clicks send a signal pulse rippling through every diode. PWM flicker and a rolling refresh band sell the physical wall.',
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
      name: 'cell',
      type: 'number',
      label: 'Pixel Pitch (px)',
      min: 8,
      max: 34,
      step: 1,
      defaultValue: 15,
      debug: true,
    },
    {
      name: 'pitch',
      type: 'number',
      label: 'Diode Size',
      min: 0.15,
      max: 0.45,
      step: 0.02,
      defaultValue: 0.3,
      debug: true,
    },
    {
      name: 'pattern',
      type: 'select',
      label: 'Content Feed',
      options: [
        { value: 0, label: 'Flow field' },
        { value: 1, label: 'Sweep' },
        { value: 2, label: 'Data rain' },
      ],
      defaultValue: 0,
      debug: true,
    },
    {
      name: 'glow',
      type: 'number',
      label: 'Diode Glow',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.65,
      debug: true,
    },
    {
      name: 'flicker',
      type: 'number',
      label: 'PWM Flicker',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.35,
      debug: true,
    },
    {
      name: 'reveal',
      type: 'number',
      label: 'Grid Reveal',
      min: 0.08,
      max: 0.5,
      step: 0.02,
      defaultValue: 0.2,
      debug: true,
    },
    {
      name: 'litColor',
      type: 'select',
      label: 'Diode Color',
      options: [
        { value: 0xff7a33, label: 'Orange' },
        { value: 0xffc24a, label: 'Sun' },
        { value: 0x7df9ff, label: 'Phosphor Cyan' },
        { value: 0xd8ff3d, label: 'Acid' },
        { value: 0xfff3e3, label: 'Cream' },
        { value: 0xd8420c, label: 'Rust' },
      ],
      defaultValue: 0xff7a33,
      debug: true,
    },
    {
      name: 'hotColor',
      type: 'select',
      label: 'Peak Color',
      options: [
        { value: 0xffc24a, label: 'Sun' },
        { value: 0xfff3e3, label: 'Cream' },
        { value: 0xffffff, label: 'White' },
        { value: 0x7df9ff, label: 'Cyan' },
        { value: 0xd8ff3d, label: 'Acid' },
      ],
      defaultValue: 0xffc24a,
      debug: true,
    },
    {
      name: 'refresh',
      type: 'boolean',
      label: 'Refresh Band',
      defaultValue: true,
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

export type LedMatrixControlValues = ManifestToControlValues<typeof MANIFEST>;

const FRAG =
  PRE +
  `
      uniform vec2 uMouse;
      uniform float uCell;
      uniform float uPitch;
      uniform float uMode;
      uniform float uGlow;
      uniform float uFlick;
      uniform float uReveal;
      uniform float uRoll;
      uniform vec3 uLit;
      uniform vec3 uHot;
      uniform vec3 uR0;
      uniform vec3 uR1;
      uniform vec3 uR2;
      float ripple(vec2 cellC, vec3 r) {
        if (r.z > 6.0) return 0.0;
        float d = length(cellC - r.xy);
        return exp(-abs(d - (40.0 + r.z * 680.0)) * 0.014) * exp(-r.z * 1.3);
      }
      void main() {
        vec2 uvS = vec2(vUV.x, 1.0 - vUV.y);
        vec2 p = uvS * uRes;
        float t = uTime;
        vec2 cellId = floor(p / uCell);
        vec2 cellC = (cellId + 0.5) * uCell;
        vec2 cuv = (cellC - uRect.xy) / uRect.zw;
        float mc = maskA(cuv);
        float pat;
        if (uMode < 0.5) {
          pat = fbm(cuv * 3.5 + vec2(t * 0.5, t * 0.3)) * 1.35;
        } else if (uMode < 1.5) {
          pat = 0.18 + 1.3 * exp(-abs(fract((cuv.x + cuv.y) * 0.6 - t * 0.22) - 0.5) * 7.0);
        } else {
          float spd = 0.25 + 0.55 * hash21(vec2(cellId.x, 3.7));
          float ph = fract(t * spd - cuv.y * 0.9 + hash21(vec2(cellId.x, 9.1)));
          pat = pow(1.0 - ph, 3.0) * 1.5;
        }
        float ripSum = ripple(cellC, uR0) + ripple(cellC, uR1) + ripple(cellC, uR2);
        float rev = exp(-length(cellC - uMouse) / (uRes.y * uReveal));
        float B = mc * (0.22 + 0.85 * pat) + ripSum * (0.2 + mc * 0.9) + rev * 0.3 * (1.0 - mc);
        float fl = 1.0 - uFlick * 0.22 * step(0.55, fract(hash21(cellId) * 7.0 + t * (7.0 + 6.0 * hash21(cellId.yx))));
        B *= fl;
        B *= 1.0 - uRoll * 0.35 * exp(-abs(fract(uvS.y - t * 0.3) - 0.5) * 9.0);
        vec2 g = fract(p / uCell) - 0.5;
        float dd = length(g) / max(uPitch, 0.01);
        float dotV = smoothstep(1.0, 0.82, dd);
        float on = clamp(B, 0.0, 1.0);
        vec3 bg = (uStage < 0.5) ? uOrange * 0.55 : uInk;
        vec3 offC = bg * 1.35;
        vec3 lit = mix(uLit, uHot, clamp(B - 0.55, 0.0, 1.0) * 1.6);
        vec3 diode = mix(offC, lit, on);
        vec3 col = mix(bg, diode, dotV);
        col += ((uStage < 0.5) ? uHot * 0.5 : uLit) * clamp(B, 0.0, 1.3) * exp(-dd * 2.4) * uGlow * on;
        fragColor = vec4(finish(col, uvS, p), 1.0);
      }`;

interface Ripple {
  x: number;
  y: number;
  age: number;
}

/** Only three pulses can be in flight; the shader has three uniforms. */
const MAX_RIPPLES = 3;

export class LedMatrixAnimation extends HarnessShaderAnimation<
  typeof MANIFEST
> {
  protected readonly frag = FRAG;
  protected readonly extraUniforms = [
    'uMouse',
    'uCell',
    'uPitch',
    'uMode',
    'uGlow',
    'uFlick',
    'uReveal',
    'uRoll',
    'uLit',
    'uHot',
    'uR0',
    'uR1',
    'uR2',
  ] as const;

  private ripples: Ripple[] = [];

  constructor(initialControls?: Partial<LedMatrixControlValues>) {
    super(MANIFEST, initialControls);
  }

  protected mask(): HTMLCanvasElement {
    return logoMask();
  }

  onInit(app: PIXI.Application, controls: LedMatrixControlValues): void {
    super.onInit(app, controls);
    this.ripples = [];
  }

  protected setUniforms(
    gl: WebGL2RenderingContext,
    locs: Record<string, WebGLUniformLocation | null>,
    ctx: ShaderContext,
    controls: LedMatrixControlValues,
    dt: number,
    app: PIXI.Application
  ): void {
    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        this.ripples.unshift({ x: c.x, y: c.y, age: 0 });
      }
    }
    this.ripples.length = Math.min(this.ripples.length, MAX_RIPPLES);
    for (const r of this.ripples) r.age += dt;

    const rect = fitRect(
      app.screen.width,
      app.screen.height,
      ctx,
      controls.markScale
    );
    gl.uniform4f(locs.uRect!, rect[0], rect[1], rect[2], rect[3]);

    const m = pointer?.mouse;
    const active = m?.active ?? false;
    gl.uniform2f(locs.uMouse!, active ? m!.x : -9999, active ? m!.y : -9999);
    gl.uniform1f(locs.uCell!, controls.cell);
    gl.uniform1f(locs.uPitch!, controls.pitch);
    gl.uniform1f(locs.uMode!, Number(controls.pattern));
    gl.uniform1f(locs.uGlow!, controls.glow);
    gl.uniform1f(locs.uFlick!, controls.flicker);
    gl.uniform1f(locs.uReveal!, controls.reveal);
    gl.uniform1f(locs.uRoll!, controls.refresh ? 1 : 0);
    setColor(gl, locs.uLit!, Number(controls.litColor));
    setColor(gl, locs.uHot!, Number(controls.hotColor));

    const slots = [locs.uR0!, locs.uR1!, locs.uR2!];
    for (let i = 0; i < MAX_RIPPLES; i++) {
      const rp = this.ripples[i];
      if (rp) gl.uniform3f(slots[i], rp.x, rp.y, rp.age);
      else gl.uniform3f(slots[i], 0, 0, 99);
    }
    // PAL is referenced so the palette stays a live read, not a cached one.
    void PAL;
  }

  onDestroy(): void {
    this.ripples = [];
    super.onDestroy();
  }
}

export function createLedMatrixAnimation(
  initialControls?: Partial<LedMatrixControlValues>
): LedMatrixAnimation {
  return new LedMatrixAnimation(initialControls);
}
