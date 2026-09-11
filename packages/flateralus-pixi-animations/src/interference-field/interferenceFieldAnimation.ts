import type * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { HarnessShaderAnimation } from '../shared/harness-shader-animation';
import { setColor, type ShaderContext } from '../shared/shader-harness';

const MANIFEST = createManifest({
  id: 'interference-field',
  name: 'Sub-Bass Interference (GLSL)',
  description:
    'Two or three radial wave fields at near-identical wavelengths, summed and drawn as contour lines. The tiny detune makes the pattern beat: antinodes brighten and nodes go dark on a slow cycle, and the whole structure drifts as the sources move. Pointer carries the third source; click knocks the detune off its resting value and the field spends about twenty seconds re-settling into phase. Ambient: sources drift on their own.',
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
      name: 'wav',
      type: 'number',
      label: 'Wavelength',
      min: 0.06,
      max: 0.4,
      step: 0.01,
      defaultValue: 0.14,
      debug: true,
    },
    {
      name: 'detune',
      type: 'number',
      label: 'Detune %',
      min: 0,
      max: 8,
      step: 0.1,
      defaultValue: 1.6,
      debug: true,
    },
    {
      name: 'srcs',
      type: 'select',
      label: 'Sources',
      options: [
        { value: 2, label: 'Two' },
        { value: 3, label: 'Three' },
      ],
      defaultValue: 3,
      debug: true,
    },
    {
      name: 'density',
      type: 'number',
      label: 'Contour Density',
      min: 1,
      max: 8,
      step: 0.5,
      defaultValue: 3,
      debug: true,
    },
    {
      name: 'speed',
      type: 'number',
      label: 'Wave Speed',
      min: 0,
      max: 3,
      step: 0.1,
      defaultValue: 0.8,
      debug: true,
    },
    {
      name: 'drift',
      type: 'number',
      label: 'Source Drift',
      min: 0,
      max: 2,
      step: 0.1,
      defaultValue: 0.6,
      debug: true,
    },
    {
      name: 'glow',
      type: 'number',
      label: 'Exposure',
      min: 0.5,
      max: 2,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'grain',
      type: 'number',
      label: 'Grain',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.3,
      debug: true,
    },
    {
      name: 'marks',
      type: 'select',
      label: 'Emitters',
      options: [
        { value: 1, label: 'Shown' },
        { value: 0, label: 'Hidden' },
      ],
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'tint',
      type: 'select',
      label: 'Color',
      options: [
        { value: 0, label: 'Ember' },
        { value: 1, label: 'Phosphor' },
        { value: 2, label: 'Ice' },
        { value: 3, label: 'Cream' },
      ],
      defaultValue: 0,
      debug: true,
    },
  ],
} as const);

export type InterferenceFieldControlValues = ManifestToControlValues<
  typeof MANIFEST
>;

/** Carried across from the prototype verbatim. Do not reformat the GLSL. */
const FRAG = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform vec2 uRes, uO1, uO2, uO3;
    uniform float uTime, uK1, uK2, uK3, uPh1, uPh2, uPh3, uSrc, uDensity, uGlow, uGrain, uKick, uMarks;
    uniform vec3 uInk, uOrange, uCream, uCyan;
    float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    void main() {
      float asp = uRes.x / uRes.y;
      vec2 q = (vUV - 0.5) * vec2(asp, 1.0);
      float d1 = length(q - uO1), d2 = length(q - uO2), d3 = length(q - uO3);
      float f = sin(d1 * uK1 + uPh1) + sin(d2 * uK2 + uPh2);
      float n = 2.0;
      if (uSrc > 2.5) { f += sin(d3 * uK3 + uPh3); n = 3.0; }
      float v = f / n; // -1..1, beats live in |v|
      float amp = abs(v);
      // contour lines of the summed field
      float cv = v * uDensity;
      float g = max(fwidth(cv), 0.012);
      float cd = abs(fract(cv + 0.5) - 0.5);
      float line = 1.0 - smoothstep(0.0, g * 1.5, cd);
      // antinodes carry the light; nodes go quiet — the beat is visible as a slow breath
      vec3 col = uInk * 0.85;
      col += mix(uOrange, uCream, amp * amp) * line * (0.18 + 0.95 * amp);
      col += uOrange * amp * amp * amp * 0.14;
      // nodal seams: faint phosphor trace where the fields cancel
      float node = exp(-v * v * 60.0);
      col += uCyan * node * (0.05 + 0.10 * uKick);
      // source marks: each emitter shows its own near-field — tight rings at its
      // wavelength, phase-locked to the wave it's radiating, fading within ~2 rings
      float src = 0.0;
      {
        float rv1 = (d1 * uK1 + uPh1) / 6.2831853;
        float rw1 = max(fwidth(rv1), 0.02);
        src += (1.0 - smoothstep(0.0, rw1 * 1.6, abs(fract(rv1 + 0.5) - 0.5))) * exp(-d1 * uK1 * 0.55) + exp(-d1 * d1 * 2600.0) * 0.9;
        float rv2 = (d2 * uK2 + uPh2) / 6.2831853;
        float rw2 = max(fwidth(rv2), 0.02);
        src += (1.0 - smoothstep(0.0, rw2 * 1.6, abs(fract(rv2 + 0.5) - 0.5))) * exp(-d2 * uK2 * 0.55) + exp(-d2 * d2 * 2600.0) * 0.9;
        if (uSrc > 2.5) {
          float rv3 = (d3 * uK3 + uPh3) / 6.2831853;
          float rw3 = max(fwidth(rv3), 0.02);
          src += (1.0 - smoothstep(0.0, rw3 * 1.6, abs(fract(rv3 + 0.5) - 0.5))) * exp(-d3 * uK3 * 0.55) + exp(-d3 * d3 * 2600.0) * 0.9;
        }
      }
      col += mix(uCream, uOrange, 0.35) * src * 0.5 * uMarks;
      col *= uGlow * (1.0 + 0.25 * uKick);
      col = mix(col, uInk, smoothstep(0.72, 1.25, length(q)));
      // faint scan + grain, tape-dark
      col *= 0.96 + 0.04 * sin(vUV.y * uRes.y * 1.8);
      col += vec3(hash21(vUV * uRes + fract(uTime * 7.0) * 13.0) - 0.5) * 0.045 * uGrain;
      fragColor = vec4(col, 1.0);
    }`;

/** Seconds for a click's extra detune to settle back out. */
const KICK_SETTLE_S = 20;

export class InterferenceFieldAnimation extends HarnessShaderAnimation<
  typeof MANIFEST
> {
  protected readonly frag = FRAG;
  protected readonly extraUniforms = [
    'uO1',
    'uO2',
    'uO3',
    'uK1',
    'uK2',
    'uK3',
    'uPh1',
    'uPh2',
    'uPh3',
    'uSrc',
    'uDensity',
    'uGlow',
    'uGrain',
    'uKick',
    'uMarks',
    'uCyan',
  ] as const;
  protected readonly commonUniforms = [
    'uRes',
    'uTime',
    'uInk',
    'uOrange',
    'uCream',
  ] as const;
  protected readonly needsMask = false;

  protected get renderScale(): number {
    return typeof window === 'undefined'
      ? 1
      : Math.min(2, window.devicePixelRatio || 1);
  }

  /** Per-source travelling phase; the slight rate differences make the beat. */
  private ph1 = 0;
  private ph2 = 0;
  private ph3 = 0;
  /** Transient extra detune from a click, and which way it was knocked. */
  private kick = 0;
  private kickSign = 1;
  /** Smoothed position of the third source. */
  private o3x = 0;
  private o3y = 0;

  constructor(initialControls?: Partial<InterferenceFieldControlValues>) {
    super(MANIFEST, initialControls);
  }

  protected mask(): null {
    return null;
  }

  onInit(
    app: PIXI.Application,
    controls: InterferenceFieldControlValues
  ): void {
    super.onInit(app, controls);
    this.ph1 = 0;
    this.ph2 = 0;
    this.ph3 = 0;
    this.kick = 0;
    this.kickSign = 1;
    this.o3x = 0;
    this.o3y = 0;
  }

  protected setUniforms(
    gl: WebGL2RenderingContext,
    locs: Record<string, WebGLUniformLocation | null>,
    _ctx: ShaderContext,
    controls: InterferenceFieldControlValues,
    dt: number,
    app: PIXI.Application
  ): void {
    const interactive = Number(controls.mode) > 0.5;
    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        pointer.clicks.shift();
        if (interactive) {
          this.kick = 1;
          this.kickSign = Math.random() < 0.5 ? -1 : 1;
        }
      }
    }
    this.kick = Math.max(0, this.kick - dt / KICK_SETTLE_S);

    const t = this.time;
    const dr = controls.drift;
    const o1 = [
      -0.42 + 0.08 * Math.sin(t * 0.06 * dr * 2),
      0.06 * Math.sin(t * 0.045 * dr * 2),
    ];
    const o2 = [
      0.42 + 0.08 * Math.sin(t * 0.052 * dr * 2 + 2.1),
      -0.06 * Math.sin(t * 0.041 * dr * 2 + 1),
    ];

    const w = app.screen.width;
    const h = app.screen.height;
    const m = pointer?.mouse;
    let tx: number;
    let ty: number;
    if (interactive && m?.active) {
      tx = (m.x / w - 0.5) * (w / h);
      ty = m.y / h - 0.5;
    } else {
      tx = 0.28 * Math.sin(t * 0.05 * (0.5 + dr));
      ty = 0.24 * Math.sin(t * 0.073 * (0.5 + dr) + 1.4);
    }
    this.o3x += (tx - this.o3x) * Math.min(1, dt * 3);
    this.o3y += (ty - this.o3y) * Math.min(1, dt * 3);

    // Wavenumbers are near-identical, plus the click's transient detune.
    const k1 = (Math.PI * 2) / controls.wav;
    const det = controls.detune * 0.01 + this.kick * this.kickSign * 0.035;
    const k2 = k1 * (1 + det);
    const k3 = k1 * (1 - controls.detune * 0.007 - this.kick * 0.02);

    // The waves travel at slightly different rates, so beats emerge on their own.
    const speed = controls.speed;
    this.ph1 -= dt * speed * 1.0;
    this.ph2 -= dt * speed * 1.07;
    this.ph3 -= dt * speed * 0.93;

    gl.uniform2f(locs.uO1!, o1[0], o1[1]);
    gl.uniform2f(locs.uO2!, o2[0], o2[1]);
    gl.uniform2f(locs.uO3!, this.o3x, this.o3y);
    gl.uniform1f(locs.uK1!, k1);
    gl.uniform1f(locs.uK2!, k2);
    gl.uniform1f(locs.uK3!, k3);
    gl.uniform1f(locs.uPh1!, this.ph1);
    gl.uniform1f(locs.uPh2!, this.ph2);
    gl.uniform1f(locs.uPh3!, this.ph3);
    gl.uniform1f(locs.uSrc!, Number(controls.srcs));
    gl.uniform1f(locs.uDensity!, controls.density);
    gl.uniform1f(locs.uGlow!, controls.glow);
    gl.uniform1f(locs.uGrain!, controls.grain);
    gl.uniform1f(locs.uKick!, this.kick);
    gl.uniform1f(locs.uMarks!, Number(controls.marks));

    // Ember reads from the live palette; the other three are fixed schemes.
    const tints = [
      [PAL.orange, PAL.cream, PAL.cyan],
      [0x39ff88, 0xd8ffe8, 0x1fd9a0], // Phosphor green
      [0x4fb8ff, 0xe6f4ff, 0x9fd0ff], // Ice blue
      [0xfff3e3, 0xffffff, 0xffb37a], // Cream mono
    ];
    const tt =
      tints[Math.max(0, Math.min(3, Math.round(Number(controls.tint))))];
    setColor(gl, locs.uInk!, PAL.ink);
    setColor(gl, locs.uOrange!, tt[0]);
    setColor(gl, locs.uCream!, tt[1]);
    setColor(gl, locs.uCyan!, tt[2]);
  }
}

export function createInterferenceFieldAnimation(
  initialControls?: Partial<InterferenceFieldControlValues>
): InterferenceFieldAnimation {
  return new InterferenceFieldAnimation(initialControls);
}
