import type * as PIXI from 'pixi.js';
import { createManifest } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { HarnessShaderAnimation } from '../shared/harness-shader-animation';
import type { ShaderContext } from '../shared/shader-harness';
import {
  GOO_LAMP_FRAG,
  TOYS_COMMON_UNIFORMS,
  TOYS_PRE,
} from '../shared/toys-harness';

const MANIFEST = createManifest({
  id: 'goo-lamp',
  name: 'Goo Lamp (GLSL)',
  description:
    'A metaball field — every pixel sums the inverse-square influence of a dozen orbiting blobs, so they merge, pinch, and split as they pass. Interactive: the cursor is a blob of its own; click to squeeze the whole field for a beat. Ambient: a ghost blob wanders the tank instead.',
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
      name: 'blobs',
      type: 'number',
      label: 'Blob Count',
      min: 3,
      max: 12,
      step: 1,
      defaultValue: 7,
      debug: true,
    },
    {
      name: 'speed',
      type: 'number',
      label: 'Drift Speed',
      min: 0.2,
      max: 2,
      step: 0.1,
      defaultValue: 0.8,
      debug: true,
    },
    {
      name: 'soft',
      type: 'number',
      label: 'Goo Softness',
      min: 0.02,
      max: 0.5,
      step: 0.02,
      defaultValue: 0.12,
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

export type GooLampControlValues = ManifestToControlValues<typeof MANIFEST>;

export class GooLampAnimation extends HarnessShaderAnimation<typeof MANIFEST> {
  protected readonly frag = TOYS_PRE + GOO_LAMP_FRAG;
  protected readonly extraUniforms = [
    'uMouse',
    'uCount',
    'uSpeed',
    'uSoft',
    'uPulse',
  ] as const;
  protected readonly commonUniforms = TOYS_COMMON_UNIFORMS;
  protected readonly needsMask = false;

  /** Decays after a click; squeezes the whole field for a beat. */
  private pulse = 0;

  constructor(initialControls?: Partial<GooLampControlValues>) {
    super(MANIFEST, initialControls);
  }

  protected mask(): null {
    return null;
  }

  onInit(app: PIXI.Application, controls: GooLampControlValues): void {
    super.onInit(app, controls);
    this.pulse = 0;
  }

  protected setUniforms(
    gl: WebGL2RenderingContext,
    locs: Record<string, WebGLUniformLocation | null>,
    _ctx: ShaderContext,
    controls: GooLampControlValues,
    dt: number,
    app: PIXI.Application
  ): void {
    const interactive = Number(controls.mode) > 0.5;
    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        pointer.clicks.shift();
        if (interactive) this.pulse = 1;
      }
    }
    this.pulse = Math.max(0, this.pulse - dt * 1.2);

    const w = app.screen.width;
    const h = app.screen.height;
    const m = pointer?.mouse;
    let mx: number;
    let my: number;
    if (interactive && m?.active) {
      mx = m.x;
      my = m.y;
    } else {
      // Ambient: a ghost blob wanders the tank.
      const tt = this.time * 0.22 * controls.speed + 0.6;
      mx = w * (0.5 + 0.34 * Math.sin(tt * 1.31 + 1.0));
      my = h * (0.5 + 0.34 * Math.sin(tt * 1.73 + 3.1));
    }
    gl.uniform2f(locs.uMouse!, mx, my);
    gl.uniform1f(locs.uCount!, controls.blobs);
    gl.uniform1f(locs.uSpeed!, controls.speed);
    gl.uniform1f(locs.uSoft!, controls.soft);
    gl.uniform1f(locs.uPulse!, this.pulse);
  }
}

export function createGooLampAnimation(
  initialControls?: Partial<GooLampControlValues>
): GooLampAnimation {
  return new GooLampAnimation(initialControls);
}
