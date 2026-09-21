import type * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { HarnessShaderAnimation } from '../shared/harness-shader-animation';
import {
  PRE,
  phraseEm,
  phraseMask,
  type ShaderContext,
} from '../shared/shader-harness';
import { letterbox, uploadMask } from '../shared/mask-grid';
import {
  REDUCED_INPUT_SCALE,
  prefersReducedMotion,
} from '../shared/reduced-motion';
import {
  STEP,
  atRest,
  knock,
  makePlates,
  scatter,
  setRegister,
  stepPlate,
  type Hand,
  type Plate,
} from './offRegister.sim';

const DEFAULT_PHRASE = 'LEAVE A GREAT IMPRESSION.';

const MANIFEST = createManifest({
  id: 'off-register',
  name: 'Off Register (GLSL)',
  description:
    'A heading printed in three passes that have not quite lined up: two halftone plates and an ink keyline, each one a mass on a spring. They start apart and land one after another, the heaviest last. The moiré between the colour plates is the overprint of two dot screens set five degrees apart, so its bands are the size of a letter and sweep across the letters when a knock turns a plate. Drag across the stack and the light plate moves first; click to knock all three. At rest it stops drawing. Type your own line into Phrase.',
  controls: [
    {
      name: 'phrase',
      type: 'text',
      label: 'Phrase',
      placeholder: DEFAULT_PHRASE,
      maxLength: 64,
      defaultValue: DEFAULT_PHRASE,
      debug: true,
    },
    {
      name: 'textScale',
      type: 'number',
      label: 'Text Scale',
      min: 0.5,
      max: 0.95,
      step: 0.05,
      defaultValue: 0.8,
      debug: true,
    },
    {
      name: 'register',
      type: 'number',
      label: 'Misregister (px)',
      min: 0,
      max: 10,
      step: 0.5,
      defaultValue: 3,
      debug: true,
    },
    {
      name: 'pitch',
      type: 'number',
      label: 'Screen Pitch (em)',
      min: 0.02,
      max: 0.09,
      step: 0.005,
      defaultValue: 0.045,
      debug: true,
    },
    {
      name: 'skew',
      type: 'number',
      label: 'Screen Skew (deg)',
      min: 0,
      max: 30,
      step: 0.5,
      defaultValue: 5,
      debug: true,
    },
    {
      name: 'grip',
      type: 'number',
      label: 'Grip',
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 12,
      debug: true,
    },
    {
      name: 'knock',
      type: 'number',
      label: 'Knock',
      min: 200,
      max: 2000,
      step: 50,
      defaultValue: 900,
      debug: true,
    },
    {
      // Off by default: grain animates, and a heading that animates cannot
      // go to sleep.
      name: 'grain',
      type: 'boolean',
      label: 'Film Grain',
      defaultValue: false,
      debug: true,
    },
    {
      name: 'stage',
      type: 'select',
      label: 'Stock',
      options: [
        { value: 1, label: 'Cream stock' },
        { value: 0, label: 'Ink stock' },
      ],
      defaultValue: 1,
      debug: true,
    },
  ],
} as const);

export type OffRegisterControlValues = ManifestToControlValues<typeof MANIFEST>;

const EXTRA_UNIFORMS = [
  'uP0',
  'uP1',
  'uP2',
  'uPitchPx',
  'uSkew',
  'uLinePx',
] as const;

const FRAG =
  PRE +
  `
      uniform vec3 uP0;
      uniform vec3 uP1;
      uniform vec3 uP2;
      uniform float uPitchPx;
      uniform float uSkew;
      uniform float uLinePx;

      // Stage px -> the mask uv of a plate that has slid by P.xy and turned
      // by P.z about the middle of the block.
      vec2 plateUV(vec2 p, vec3 P) {
        vec2 h = uRect.zw * 0.5;
        vec2 q = p - (uRect.xy + h) - P.xy;
        float s = sin(-P.z), k = cos(-P.z);
        q = vec2(k * q.x - s * q.y, s * q.x + k * q.y);
        return (q + h) / uRect.zw;
      }

      // The tone a screen is asked to print: the mask low-passed at the dot
      // pitch, so an edge breaks into shrinking dots instead of being cut
      // through the middle of one.
      float tone(vec2 uv) {
        vec2 e = vec2(uPitchPx * 0.5) / uRect.zw;
        return (maskA(uv) * 2.0
              + maskA(uv + vec2(e.x, 0.0)) + maskA(uv - vec2(e.x, 0.0))
              + maskA(uv + vec2(0.0, e.y)) + maskA(uv - vec2(0.0, e.y))) / 6.0;
      }

      // Dot coverage of one screened plate at stage px p. The lattice is
      // fixed to the plate, so it slides and turns with it — which is the
      // whole of why the moire moves.
      float screenDot(vec2 p, vec3 P, float ang, float tint) {
        float t = tone(plateUV(p, P));
        if (t <= 0.001) return 0.0;
        float a = ang + P.z;
        vec2 q = p - (uRect.xy + uRect.zw * 0.5) - P.xy;
        q = vec2(cos(a) * q.x + sin(a) * q.y, -sin(a) * q.x + cos(a) * q.y);
        // Ink goes down unevenly, and the unevenness belongs to the plate.
        float lay = 0.88 + 0.12 * vnoise(q * 0.03 + ang * 40.0);
        q /= uPitchPx;
        // A tint, never a solid: the lattices have to stay open to beat.
        float r = sqrt(t * tint) * 0.7072;
        float aa = 0.75 / uPitchPx;
        return smoothstep(r + aa, r - aa, length(fract(q) - 0.5)) * lay;
      }

      // The key plate is linework: the band where the mask changes, found
      // as the spread of eight taps around the point.
      float keyline(vec2 uv) {
        vec2 e = vec2(uLinePx) / uRect.zw;
        float lo = 1.0, hi = 0.0;
        for (int i = 0; i < 8; i++) {
          float a = float(i) * 0.7853982;
          float m = maskA(uv + vec2(cos(a), sin(a)) * e);
          lo = min(lo, m);
          hi = max(hi, m);
        }
        return smoothstep(0.25, 0.75, hi - lo);
      }

      void main() {
        vec2 uvS = vec2(vUV.x, 1.0 - vUV.y);
        vec2 p = uvS * uRes;
        // Both screens near 45 degrees. A print shop separates them by 30
        // to keep the moire small; a few degrees apart it is the size of a
        // letter, and that is the one worth watching.
        float sun = screenDot(p, uP2, 0.7854 + uSkew, 0.74);
        float org = screenDot(p, uP1, 0.7854, 0.8);
        float key = keyline(plateUV(p, uP0));
        vec3 col;
        if (uStage > 0.5) {
          // Ink on paper subtracts: overprint is a multiply.
          col = uCream * (0.965 + 0.035 * fbm(p * 0.012));
          col *= mix(vec3(1.0), uSun, sun);
          col *= mix(vec3(1.0), uOrange, org);
          col = mix(col, uInk, key);
        } else {
          // Opaque inks on dark stock: the later pass covers the earlier.
          col = uInk * (0.94 + 0.06 * fbm(p * 0.012));
          col = mix(col, uSun, sun);
          col = mix(col, uOrange, org * 0.9);
          col = mix(col, uCream, key);
        }
        fragColor = vec4(finish(col, uvS, p), 1.0);
      }`;

export class OffRegisterAnimation extends HarnessShaderAnimation<
  typeof MANIFEST
> {
  protected readonly frag = FRAG;
  protected readonly extraUniforms = EXTRA_UNIFORMS;

  private plates: Plate[] = makePlates(3);
  private acc = 0;
  private phrase = DEFAULT_PHRASE;
  /** The phrase whose pixels are in the GL texture right now. */
  private uploaded: string | null = null;
  private reduced = false;
  private lastMouse: { x: number; y: number } | null = null;
  private hand: Hand | undefined;
  /** What the last drawn frame depended on; unchanged + at rest = sleep. */
  private drawKey = '';

  constructor(initialControls?: Partial<OffRegisterControlValues>) {
    super(MANIFEST, initialControls);
  }

  /**
   * Halftone dots want real device pixels. The base class holds mask effects
   * at one framebuffer pixel per CSS pixel because their uRect is in CSS
   * pixels; this effect scales every pixel-space uniform itself instead.
   */
  protected get renderScale(): number {
    return Math.min(2, window.devicePixelRatio || 1);
  }

  protected mask(): HTMLCanvasElement | null {
    return phraseMask(this.phrase);
  }

  onInit(app: PIXI.Application, controls: OffRegisterControlValues): void {
    this.phrase = controls.phrase.trim() || DEFAULT_PHRASE;
    this.uploaded = null;
    this.plates = makePlates(controls.register);
    this.acc = 0;
    this.lastMouse = null;
    this.drawKey = '';
    super.onInit(app, controls);
  }

  onUpdate(
    app: PIXI.Application,
    controls: OffRegisterControlValues,
    deltaTime: number
  ): void {
    this.phrase = controls.phrase.trim() || DEFAULT_PHRASE;
    const sw = app.screen.width;
    const sh = app.screen.height;

    // A new phrase goes into the texture the context already owns, and the
    // plates are thrown apart again: retyping the heading replays its arrival.
    if (this.uploaded !== this.phrase) {
      const mask = this.mask();
      if (mask && this.ctx) {
        uploadMask(this.ctx.gl, mask, 0, this.ctx.texture);
        this.ctx.texWidth = mask.width;
        this.ctx.texHeight = mask.height;
      }
      if (mask) {
        this.uploaded = this.phrase;
        this.reduced = prefersReducedMotion();
        if (!this.reduced) {
          const [, , w] = letterbox(
            mask.width,
            mask.height,
            sw,
            sh,
            controls.textScale
          );
          scatter(this.plates, Math.random, w * 0.06, 0.09);
        }
      }
    }

    this.stepPlates(app, controls, Math.min(0.05, deltaTime));

    // Asleep: nothing is moving and nothing the picture depends on changed.
    const key = [
      this.uploaded,
      sw,
      sh,
      PAL.ink,
      PAL.bright,
      PAL.sun,
      PAL.cream,
      JSON.stringify(controls),
    ].join('|');
    const still = atRest(this.plates) && !controls.grain;
    if (still && this.ctx && key === this.drawKey) return;
    // Keyed only once still, so the frame that lands at rest is always drawn.
    this.drawKey = still ? key : '';

    super.onUpdate(app, controls, deltaTime);
  }

  private stepPlates(
    app: PIXI.Application,
    controls: OffRegisterControlValues,
    dt: number
  ): void {
    setRegister(this.plates, controls.register);
    const input = this.reduced ? REDUCED_INPUT_SCALE : 1;

    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        pointer.clicks.shift();
        knock(this.plates, Math.random, controls.knock * input, 2 * input);
      }
    }

    // The hand only grips while it is on the block.
    this.hand = undefined;
    const m = pointer?.mouse;
    const mask = this.mask();
    if (m?.active && mask && dt > 0) {
      const [x, y, w, h] = letterbox(
        mask.width,
        mask.height,
        app.screen.width,
        app.screen.height,
        controls.textScale
      );
      const inside = m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
      if (inside && this.lastMouse) {
        const cap = 3000;
        const vx = (m.x - this.lastMouse.x) / dt;
        const vy = (m.y - this.lastMouse.y) / dt;
        const sp = Math.hypot(vx, vy);
        const k = sp > cap ? cap / sp : 1;
        this.hand = {
          vx: vx * k * input,
          vy: vy * k * input,
          grip: controls.grip,
        };
      }
      this.lastMouse = { x: m.x, y: m.y };
    } else {
      this.lastMouse = null;
    }

    this.acc = Math.min(this.acc + dt, 4 * STEP);
    while (this.acc >= STEP) {
      this.acc -= STEP;
      for (const p of this.plates) stepPlate(p, this.hand);
    }
  }

  protected setUniforms(
    gl: WebGL2RenderingContext,
    locs: Record<string, WebGLUniformLocation | null>,
    ctx: ShaderContext,
    controls: OffRegisterControlValues,
    _dt: number,
    app: PIXI.Application
  ): void {
    // Everything below is in framebuffer pixels, so it carries the scale.
    const s = this.renderScale;
    const [x, y, w, h] = letterbox(
      ctx.texWidth,
      ctx.texHeight,
      app.screen.width,
      app.screen.height,
      controls.textScale
    );
    gl.uniform4f(locs.uRect!, x * s, y * s, w * s, h * s);

    // Pitch is in em, so the screens scale with the type and not the stage.
    const mask = this.mask();
    const em = mask ? (phraseEm(mask) * w) / mask.width : h;
    gl.uniform1f(locs.uPitchPx!, Math.max(3, controls.pitch * em * s));
    gl.uniform1f(locs.uSkew!, (controls.skew * Math.PI) / 180);
    gl.uniform1f(locs.uLinePx!, Math.max(1, 0.012 * em * s));

    const [p0, p1, p2] = this.plates;
    gl.uniform3f(locs.uP0!, p0.x * s, p0.y * s, p0.a);
    gl.uniform3f(locs.uP1!, p1.x * s, p1.y * s, p1.a);
    gl.uniform3f(locs.uP2!, p2.x * s, p2.y * s, p2.a);
  }
}

export function createOffRegisterAnimation(
  initialControls?: Partial<OffRegisterControlValues>
): OffRegisterAnimation {
  return new OffRegisterAnimation(initialControls);
}
