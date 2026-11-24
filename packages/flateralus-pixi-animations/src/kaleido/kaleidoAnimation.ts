import type * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { HarnessShaderAnimation } from '../shared/harness-shader-animation';
import { setColor, type ShaderContext } from '../shared/shader-harness';
import {
  KALEIDO_FRAG,
  TOYS_COMMON_UNIFORMS,
  TOYS_PRE,
} from '../shared/toys-harness';

const MANIFEST = createManifest({
  id: 'kaleido',
  name: 'Kaleido (GLSL)',
  description:
    'Domain-warped noise folded through an n-way mirror — one fbm field, folded into radial symmetry, warped by a second fbm sampled through the first. Interactive: the cursor steers the rotation and its distance from center sets the warp depth; click kicks the zoom and shifts the pattern to a new region of the field. Ambient: it turns and breathes on its own.',
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
      name: 'palette',
      type: 'select',
      label: 'Palette',
      options: [
        { value: 0, label: 'House' },
        { value: 1, label: 'Bathysphere' },
        { value: 2, label: 'Hothouse' },
        { value: 3, label: 'Ultraviolet' },
        { value: 4, label: 'Terrazzo' },
      ],
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'segments',
      type: 'number',
      label: 'Mirror Segments',
      min: 4,
      max: 14,
      step: 2,
      defaultValue: 8,
      debug: true,
    },
    {
      name: 'warp',
      type: 'number',
      label: 'Warp Depth',
      min: 0,
      max: 2,
      step: 0.1,
      defaultValue: 0.9,
      debug: true,
    },
    {
      name: 'speed',
      type: 'number',
      label: 'Flow Speed',
      min: 0.2,
      max: 2.4,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'zoom',
      type: 'number',
      label: 'Zoom',
      min: 0.5,
      max: 2.5,
      step: 0.1,
      defaultValue: 1.2,
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

export type KaleidoControlValues = ManifestToControlValues<typeof MANIFEST>;

export class KaleidoAnimation extends HarnessShaderAnimation<typeof MANIFEST> {
  protected readonly frag = TOYS_PRE + KALEIDO_FRAG;
  protected readonly extraUniforms = [
    'uSeg',
    'uWarp',
    'uSpeed',
    'uZoom',
    'uSpin',
    'uPulse',
    'uPhase',
    'uP0',
    'uP1',
    'uP2',
    'uP3',
    'uP4',
  ] as const;
  protected readonly commonUniforms = TOYS_COMMON_UNIFORMS;
  protected readonly needsMask = false;

  private spin = 0;
  private pulse = 0;
  /** Shifts the sampled region of the field on click. */
  private phase = 0;
  /** Smoothed multiplier on the warp control, driven by cursor distance. */
  private warpMul = 1;

  constructor(initialControls?: Partial<KaleidoControlValues>) {
    super(MANIFEST, initialControls);
  }

  protected mask(): null {
    return null;
  }

  onInit(app: PIXI.Application, controls: KaleidoControlValues): void {
    super.onInit(app, controls);
    this.spin = 0;
    this.pulse = 0;
    this.phase = 0;
    this.warpMul = 1;
  }

  protected setUniforms(
    gl: WebGL2RenderingContext,
    locs: Record<string, WebGLUniformLocation | null>,
    _ctx: ShaderContext,
    controls: KaleidoControlValues,
    dt: number,
    app: PIXI.Application
  ): void {
    const interactive = Number(controls.mode) > 0.5;
    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        pointer.clicks.shift();
        if (interactive) {
          this.pulse = 1;
          this.phase += 2.7;
        }
      }
    }
    this.pulse = Math.max(0, this.pulse - dt * 1.6);

    const w = app.screen.width;
    const h = app.screen.height;
    const m = pointer?.mouse;
    let targetWarp = 1;
    if (interactive && m?.active) {
      // The cursor steers rotation; its distance from center sets warp depth.
      const dx = m.x - w / 2;
      const dy = m.y - h / 2;
      const target = Math.atan2(dy, dx);
      let d = target - this.spin;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.spin += d * Math.min(1, dt * 2.5);
      targetWarp =
        0.55 + 1.7 * Math.min(1, Math.hypot(dx, dy) / (Math.min(w, h) * 0.5));
    } else {
      this.spin += dt * 0.07 * controls.speed;
      targetWarp = 0.9 + 0.35 * Math.sin(this.time * 0.23);
    }
    this.warpMul += (targetWarp - this.warpMul) * Math.min(1, dt * 3);

    gl.uniform1f(locs.uSeg!, controls.segments);
    gl.uniform1f(locs.uWarp!, controls.warp * this.warpMul);
    gl.uniform1f(locs.uSpeed!, controls.speed);
    gl.uniform1f(locs.uZoom!, controls.zoom);
    gl.uniform1f(locs.uSpin!, this.spin);
    gl.uniform1f(locs.uPulse!, this.pulse);
    gl.uniform1f(locs.uPhase!, this.phase);

    // House reads from the live palette; the rest are fixed schemes.
    const palettes = [
      [PAL.ink, PAL.deep, PAL.bright, PAL.sun, PAL.cream],
      [0x03131f, 0x0b4f6c, 0x0fa3b1, 0xbfffe0, 0xf2fbf5], // Bathysphere
      [0x1b0b2e, 0x8c1f66, 0xe84855, 0xffb100, 0xfff2c9], // Hothouse
      [0x0d021a, 0x3b0f8f, 0x7b2ff7, 0xc86bfa, 0xf3e5ff], // Ultraviolet
      [0x14312c, 0x2e6e5f, 0xd96c3f, 0xe8c15a, 0xf6efe3], // Terrazzo
    ];
    const pal =
      palettes[Math.round(Number(controls.palette)) % palettes.length] ??
      palettes[0];
    const slots = [locs.uP0!, locs.uP1!, locs.uP2!, locs.uP3!, locs.uP4!];
    for (let i = 0; i < 5; i++) setColor(gl, slots[i], pal[i]);
  }
}

export function createKaleidoAnimation(
  initialControls?: Partial<KaleidoControlValues>
): KaleidoAnimation {
  return new KaleidoAnimation(initialControls);
}
