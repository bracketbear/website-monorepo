import * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { logoMask, setColor } from '../shared/shader-harness';
import { PingPong } from '../shared/ping-pong';

const MANIFEST = createManifest({
  id: 'rd-vat',
  name: 'RD Vat (GLSL)',
  description:
    'The mark dropped into a Gray-Scott reaction–diffusion vat — two chemicals feed and kill each other per pixel in a live feedback buffer, so the seed erodes, blooms, and regrows with real persistent state. Cursor stirs the chemistry; click drops a fresh blob; Chemistry switches growth regimes and Seed Texture restarts the vat from the mark, noise, rings, stripes, or a halftone grid. Ambient: a ghost stirrer wanders the vat.',
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
      name: 'chem',
      type: 'select',
      label: 'Chemistry',
      options: [
        { value: 0, label: 'Coral' },
        { value: 1, label: 'Mitosis' },
        { value: 2, label: 'Worms' },
        { value: 3, label: 'Solitons' },
      ],
      defaultValue: 0,
      debug: true,
    },
    {
      name: 'seedTex',
      type: 'select',
      label: 'Seed Texture',
      options: [
        { value: 0, label: 'The Mark' },
        { value: 1, label: 'Noise Specks' },
        { value: 2, label: 'Rings' },
        { value: 3, label: 'Stripes' },
        { value: 4, label: 'Halftone Grid' },
      ],
      defaultValue: 0,
      debug: true,
    },
    {
      name: 'speed',
      type: 'number',
      label: 'Reaction Speed',
      min: 2,
      max: 14,
      step: 1,
      defaultValue: 9,
      debug: true,
    },
    {
      name: 'brush',
      type: 'number',
      label: 'Stir Size',
      min: 0.01,
      max: 0.06,
      step: 0.005,
      defaultValue: 0.025,
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

export type RdVatControlValues = ManifestToControlValues<typeof MANIFEST>;

/** Feed and kill rates for each growth regime. */
const CHEM = [
  { f: 0.0545, k: 0.062 }, // coral
  { f: 0.0367, k: 0.0649 }, // mitosis
  { f: 0.078, k: 0.061 }, // worms
  { f: 0.03, k: 0.0605 }, // solitons
];

/** Simulation grid width; height follows the stage aspect. */
const SIM_WIDTH = 420;

const HELP = `
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
    }`;

const SIM_FRAG = `#version 300 es
      precision highp float;
      in vec2 vUV;
      out vec4 fragColor;
      uniform sampler2D uState;
      uniform vec2 uTexel;
      uniform float uFeed;
      uniform float uKill;
      uniform vec4 uBrush; // x, y, r, strength
      uniform vec4 uBlob;
      uniform float uAsp;
      void main() {
        vec2 t = uTexel;
        vec2 c = texture(uState, vUV).rg;
        vec2 lap = -c;
        lap += 0.2 * (texture(uState, vUV + vec2(t.x, 0.0)).rg + texture(uState, vUV - vec2(t.x, 0.0)).rg
                    + texture(uState, vUV + vec2(0.0, t.y)).rg + texture(uState, vUV - vec2(0.0, t.y)).rg);
        lap += 0.05 * (texture(uState, vUV + t).rg + texture(uState, vUV - t).rg
                     + texture(uState, vUV + vec2(t.x, -t.y)).rg + texture(uState, vUV - vec2(t.x, -t.y)).rg);
        float A = c.r, B = c.g;
        float rxn = A * B * B;
        A += 1.0 * lap.r - rxn + uFeed * (1.0 - A);
        B += 0.5 * lap.g + rxn - (uKill + uFeed) * B;
        vec2 q = (vUV - 0.5) * vec2(uAsp, 1.0);
        vec2 bq = (uBrush.xy - 0.5) * vec2(uAsp, 1.0);
        B += uBrush.w * exp(-dot(q - bq, q - bq) / (uBrush.z * uBrush.z));
        vec2 gq = (uBlob.xy - 0.5) * vec2(uAsp, 1.0);
        B += uBlob.w * exp(-dot(q - gq, q - gq) / (uBlob.z * uBlob.z));
        fragColor = vec4(clamp(A, 0.0, 1.0), clamp(B, 0.0, 1.0), 0.0, 1.0);
      }`;

const DISP_FRAG =
  `#version 300 es
      precision highp float;
      in vec2 vUV;
      out vec4 fragColor;
      uniform sampler2D uState;
      uniform float uTime;
      uniform float uGrain;
      uniform vec3 uInk;
      uniform vec3 uDeep;
      uniform vec3 uOrange;
      uniform vec3 uSun;
      uniform vec3 uCream;
      uniform vec2 uTexel;
      ` +
  HELP +
  `
      void main() {
        float B = texture(uState, vUV).g;
        float bx = texture(uState, vUV + vec2(uTexel.x, 0.0)).g - texture(uState, vUV - vec2(uTexel.x, 0.0)).g;
        float by = texture(uState, vUV + vec2(0.0, uTexel.y)).g - texture(uState, vUV - vec2(0.0, uTexel.y)).g;
        float v = B * 2.4;
        vec3 col = uInk * (0.9 + 0.2 * fbm(vUV * 3.0 + 5.1));
        col = mix(col, uDeep, smoothstep(0.10, 0.30, v));
        col = mix(col, uOrange, smoothstep(0.30, 0.55, v));
        col = mix(col, uSun, smoothstep(0.60, 0.85, v));
        col = mix(col, uCream, smoothstep(0.9, 1.15, v));
        // relief from the concentration gradient — makes it read as liquid
        col *= 1.0 + (bx - by) * 6.0;
        col += uOrange * length(vec2(bx, by)) * 2.5 * (1.0 - smoothstep(0.3, 0.6, v));
        vec2 cc = vUV * 2.0 - 1.0;
        col *= 0.9 + 0.1 * smoothstep(1.7, 0.3, dot(cc, cc));
        col += (hash21(floor(vUV / uTexel * 0.45) + vec2(fract(uTime * 7.0) * 13.0)) - 0.5) * 0.05 * uGrain;
        fragColor = vec4(col, 1.0);
      }`;

/** Paint a B-concentration seed onto a fresh A=1 field. */
function rdSeed(sw: number, sh: number, type: number): Float32Array {
  const data = new Float32Array(sw * sh * 4);
  const setB = (i: number, b: number) => {
    data[i * 4] = 1;
    data[i * 4 + 1] = b;
    data[i * 4 + 3] = 1;
  };
  for (let i = 0; i < sw * sh; i++) setB(i, 0);
  const t = Math.max(0, Math.min(4, Math.round(type || 0)));

  if (t === 0) {
    const logo = logoMask();
    const cv = document.createElement('canvas');
    cv.width = sw;
    cv.height = sh;
    const g = cv.getContext('2d')!;
    const lw = sw * 0.56;
    const lh = lw * (logo.height / logo.width);
    // Canvas is y-down and the state buffer is v-up, so flip to keep the
    // mark upright on screen.
    g.translate(sw / 2, sh / 2);
    g.scale(1, -1);
    g.drawImage(logo, -lw / 2, -lh / 2, lw, lh);
    const px = g.getImageData(0, 0, sw, sh).data;
    for (let i = 0; i < sw * sh; i++) if (px[i * 4 + 3] > 127) setB(i, 0.55);
  } else if (t === 1) {
    for (let n = 0; n < 130; n++) {
      const cx = Math.random() * sw;
      const cy = Math.random() * sh;
      const r = 2 + Math.random() * 3;
      for (
        let y = Math.max(0, (cy - r) | 0);
        y < Math.min(sh, cy + r + 1);
        y++
      ) {
        for (
          let x = Math.max(0, (cx - r) | 0);
          x < Math.min(sw, cx + r + 1);
          x++
        ) {
          if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r)
            setB(y * sw + x, 0.6);
        }
      }
    }
  } else {
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        let on = false;
        if (t === 2) {
          const d = Math.hypot(x - sw / 2, y - sh / 2);
          on = d % 30 < 3.5 && d > 8;
        } else if (t === 3) {
          on = (x + y) % 34 < 4;
        } else {
          on = Math.hypot((x % 26) - 13, (y % 26) - 13) < 4.2;
        }
        if (on) setB(y * sw + x, 0.6);
      }
    }
  }
  return data;
}

/**
 * Gray-Scott reaction-diffusion over a ping-pong pair of float textures.
 * Needs its own FBO setup, so it does not use the shared blit harness.
 */
export class RdVatAnimation extends PixiAnimation<typeof MANIFEST> {
  private pp: PingPong | null = null;
  private failed = false;

  private sprite: PIXI.Sprite | null = null;
  private texture: PIXI.Texture | null = null;
  private time = 0;
  private blob: { x: number; y: number; age: number } | null = null;
  private lastSeed: number | null = null;

  constructor(initialControls?: Partial<RdVatControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.time = 0;
    this.blob = null;
    this.lastSeed = null;
  }

  onUpdate(
    app: PIXI.Application,
    controls: RdVatControlValues,
    deltaTime: number
  ): void {
    if (this.failed) return;
    if (!this.pp) {
      const pp = PingPong.create({
        simFrag: SIM_FRAG,
        dispFrag: DISP_FRAG,
        simUniforms: ['uTexel', 'uFeed', 'uKill', 'uBrush', 'uBlob', 'uAsp'],
        dispUniforms: [
          'uTime',
          'uGrain',
          'uInk',
          'uDeep',
          'uOrange',
          'uSun',
          'uCream',
          'uTexel',
        ],
      });
      if (!pp) {
        this.failed = true;
        return;
      }
      this.pp = pp;
    }
    const pp = this.pp;

    const sw = app.screen.width;
    const sh = app.screen.height;

    if (!pp.sw) {
      const gw = SIM_WIDTH;
      const gh = Math.max(64, Math.round((gw * sh) / Math.max(1, sw)));
      pp.initState(gw, gh, rdSeed(gw, gh, Number(controls.seedTex)));
      this.lastSeed = Number(controls.seedTex);
    }

    if (!this.sprite) {
      this.texture = PIXI.Texture.from(pp.canvas);
      this.sprite = new PIXI.Sprite(this.texture);
      this.getRoot().addChild(this.sprite);
    }

    const dt = Math.min(0.05, deltaTime);
    this.time += dt;

    const dpr = this.dpr ?? Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(2, Math.round(sw * dpr));
    const H = Math.max(2, Math.round(sh * dpr));
    if (pp.canvas.width !== W || pp.canvas.height !== H) {
      pp.canvas.width = W;
      pp.canvas.height = H;
      this.texture?.source.resize(W, H);
    }
    this.sprite.width = sw;
    this.sprite.height = sh;

    const seedTex = Number(controls.seedTex);
    if (this.lastSeed !== seedTex) {
      this.lastSeed = seedTex;
      pp.reseed(rdSeed(pp.sw, pp.sh, seedTex));
    }

    const interactive = Number(controls.mode) > 0.5;
    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        if (interactive) this.blob = { x: c.x / sw, y: 1 - c.y / sh, age: 0 };
      }
    }
    if (this.blob) {
      this.blob.age += dt;
      if (this.blob.age > 0.1) this.blob = null;
    }

    let bx = -9;
    let by = -9;
    let bs = 0;
    const mouse = pointer?.mouse;
    if (interactive && mouse?.active) {
      bx = mouse.x / sw;
      by = 1 - mouse.y / sh;
      bs = 0.3;
    } else if (!interactive) {
      // Ambient: a ghost stirrer wanders the vat.
      const t = this.time * 0.3;
      bx = 0.5 + 0.4 * Math.sin(t * 1.07) * Math.sin(t * 0.23 + 1.0);
      by = 0.5 + 0.36 * Math.sin(t * 0.83 + 2.0);
      bs = 0.22;
    }

    const chem =
      CHEM[Math.max(0, Math.min(3, Math.round(Number(controls.chem))))];
    const asp = pp.sw / pp.sh;
    const steps = Math.round(controls.speed);

    for (let i = 0; i < steps; i++) {
      pp.step((gl, L) => {
        gl.uniform2f(L.uTexel!, 1 / pp.sw, 1 / pp.sh);
        gl.uniform1f(L.uFeed!, chem.f);
        gl.uniform1f(L.uKill!, chem.k);
        gl.uniform1f(L.uAsp!, asp);
        gl.uniform4f(L.uBrush!, bx, by, controls.brush, bs * 0.09);
        if (this.blob) {
          gl.uniform4f(
            L.uBlob!,
            this.blob.x,
            this.blob.y,
            controls.brush * 2.6,
            0.6
          );
        } else {
          gl.uniform4f(L.uBlob!, -9, -9, 0.01, 0);
        }
      });
    }

    pp.display(W, H, (gl, L) => {
      gl.uniform1f(L.uTime!, this.time);
      gl.uniform1f(L.uGrain!, controls.grain ? 1 : 0);
      gl.uniform2f(L.uTexel!, 1 / pp.sw, 1 / pp.sh);
      setColor(gl, L.uInk!, PAL.ink);
      setColor(gl, L.uDeep!, PAL.deep);
      setColor(gl, L.uOrange!, PAL.bright);
      setColor(gl, L.uSun!, PAL.sun);
      setColor(gl, L.uCream!, PAL.cream);
    });

    this.texture?.source.update();
  }

  onDestroy(): void {
    this.pp?.destroy();
    this.pp = null;
    this.failed = false;
    this.sprite = null;
    this.texture?.destroy(true);
    this.texture = null;
    super.onDestroy();
  }
}

export function createRdVatAnimation(
  initialControls?: Partial<RdVatControlValues>
): RdVatAnimation {
  return new RdVatAnimation(initialControls);
}
