import * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { setColor } from '../shared/shader-harness';
import { PingPong } from '../shared/ping-pong';

const MANIFEST = createManifest({
  id: 'crt-phosphor',
  name: 'CRT Phosphor (GLSL)',
  description:
    'A persistence-of-vision tube with a physical beam — the electron gun is a spring-damped mass chasing your cursor, so it overshoots, whips, and rings, and brightness follows real scope physics: a slow beam pools blinding light, a fast whip leaves only a faint streak. Trails decay like phosphor; park the beam and it burns in a permanent ghost; click to degauss — a ripple sweeps the tube and wipes the burn-in. Ambient: it chases Lissajous figures on its own.',
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
      name: 'phos',
      type: 'select',
      label: 'Phosphor',
      options: [
        { value: 0x6fff7e, label: 'Green P1' },
        { value: 0xffb347, label: 'Amber P3' },
        { value: 0x7df9ff, label: 'Cyan' },
        { value: 0xff7a33, label: 'Brand Orange' },
      ],
      defaultValue: 0x6fff7e,
      debug: true,
    },
    {
      name: 'persist',
      type: 'number',
      label: 'Persistence',
      min: 0.86,
      max: 0.985,
      step: 0.005,
      defaultValue: 0.955,
      debug: true,
    },
    {
      name: 'beam',
      type: 'number',
      label: 'Beam Size',
      min: 0.004,
      max: 0.02,
      step: 0.001,
      defaultValue: 0.008,
      debug: true,
    },
    {
      name: 'spring',
      type: 'number',
      label: 'Beam Stiffness',
      min: 40,
      max: 420,
      step: 10,
      defaultValue: 170,
      debug: true,
    },
    {
      name: 'damp',
      type: 'number',
      label: 'Beam Damping',
      min: 2,
      max: 14,
      step: 0.5,
      defaultValue: 5.5,
      debug: true,
    },
    {
      name: 'scan',
      type: 'number',
      label: 'Scanlines',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.55,
      debug: true,
    },
    {
      name: 'burn',
      type: 'boolean',
      label: 'Burn-In',
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
  ],
} as const);

export type CrtPhosphorControlValues = ManifestToControlValues<typeof MANIFEST>;

/** Carried across from the prototype verbatim. Do not reformat the GLSL. */
const SIM_FRAG = `#version 300 es
      precision highp float;
      in vec2 vUV;
      out vec4 fragColor;
      uniform sampler2D uState;
      uniform float uDecay;
      uniform vec4 uSeg;   // beam segment x1 y1 x2 y2 (state uv)
      uniform float uBeamR;
      uniform float uBeamI;
      uniform float uBurnOn;
      uniform vec3 uDegauss; // cx, cy, age (9 = off)
      uniform float uAsp;
      float segDist(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
        return length(pa - ba * h);
      }
      void main() {
        vec2 c = texture(uState, vUV).rg;
        float E = c.r * uDecay;
        vec2 q = vUV * vec2(uAsp, 1.0);
        float d = segDist(q, uSeg.xy * vec2(uAsp, 1.0), uSeg.zw * vec2(uAsp, 1.0));
        E += uBeamI * exp(-d * d / (uBeamR * uBeamR));
        E = min(E, 1.6);
        float burn = c.g;
        burn += smoothstep(0.75, 1.2, E) * 0.0022 * uBurnOn;
        burn *= 0.99998;
        if (uDegauss.z < 1.2) {
          float dd = distance(q, uDegauss.xy * vec2(uAsp, 1.0));
          float front = uDegauss.z * 1.4;
          burn *= 1.0 - smoothstep(0.06, 0.0, abs(dd - front)) * 0.5;
          E += smoothstep(0.05, 0.0, abs(dd - front)) * 0.35 * (1.0 - uDegauss.z / 1.2);
        }
        fragColor = vec4(E, min(burn, 0.9), 0.0, 1.0);
      }`;
const DISP_FRAG = `#version 300 es
      precision highp float;
      in vec2 vUV;
      out vec4 fragColor;
      uniform sampler2D uState;
      uniform float uTime;
      uniform float uGrain;
      uniform float uScan;
      uniform vec3 uPhos;
      uniform vec3 uInk;
      uniform vec3 uCream;
      uniform vec3 uDegauss;
      uniform float uSimH;
      
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
      void main() {
        vec2 c = vUV * 2.0 - 1.0;
        float r2 = dot(c, c);
        vec2 cb = c * (1.0 + 0.055 * r2);
        // degauss wobble
        if (uDegauss.z < 1.2) {
          float w = (1.0 - uDegauss.z / 1.2);
          cb += vec2(sin(cb.y * 24.0 + uTime * 40.0), sin(cb.x * 21.0 - uTime * 37.0)) * 0.012 * w;
        }
        vec2 uv = cb * 0.5 + 0.5;
        float tube = 1.0 - smoothstep(0.92, 1.0, pow(abs(cb.x), 6.0) + pow(abs(cb.y), 6.0));
        vec2 t = vec2(1.5) / vec2(uSimH * 1.6, uSimH);
        float E = texture(uState, uv).r;
        float bloom = texture(uState, uv + vec2(t.x, 0.0)).r + texture(uState, uv - vec2(t.x, 0.0)).r
                    + texture(uState, uv + vec2(0.0, t.y)).r + texture(uState, uv - vec2(0.0, t.y)).r;
        float burn = texture(uState, uv).g;
        float scan = 1.0 - uScan * 0.5 * (0.5 + 0.5 * sin(uv.y * uSimH * 3.14159));
        vec3 glass = uInk * 0.55 + 0.012;
        vec3 col = glass;
        col += uPhos * (pow(E, 1.25) * 1.15 + bloom * 0.12) * scan;
        col += uPhos * burn * 0.20 * scan;
        col += uCream * smoothstep(0.5, 0.0, abs(cb.x + cb.y * 0.6 - 0.55)) * 0.028 * (1.0 - r2 * 0.4);
        col *= tube;
        col = mix(uInk * 0.8, col, tube);
        col *= 0.88 + 0.12 * smoothstep(1.7, 0.2, r2);
        col += (hash21(floor(vUV * 700.0) + vec2(fract(uTime * 7.0) * 13.0)) - 0.5) * 0.045 * uGrain;
        fragColor = vec4(col, 1.0);
      }`;

/** Simulation grid width; height follows the stage aspect. */
const SIM_WIDTH = 640;
/** Substeps per frame, so a fast whip still lays a continuous trail. */
const SUBSTEPS = 4;

export class CrtPhosphorAnimation extends PixiAnimation<typeof MANIFEST> {
  private pp: PingPong | null = null;
  private failed = false;
  private sprite: PIXI.Sprite | null = null;
  private texture: PIXI.Texture | null = null;
  private time = 0;

  /** Spring-damped electron gun. */
  private beam = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
  private target: [number, number] = [0.5, 0.5];
  private degauss: { x: number; y: number; age: number } | null = null;
  /** Ambient Lissajous figure, reshuffled every few seconds. */
  private liss = { a: 3, b: 2, next: 6 };

  constructor(initialControls?: Partial<CrtPhosphorControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.time = 0;
    this.beam = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
    this.target = [0.5, 0.5];
    this.degauss = null;
    this.liss = { a: 3, b: 2, next: 6 };
  }

  onUpdate(
    app: PIXI.Application,
    controls: CrtPhosphorControlValues,
    deltaTime: number
  ): void {
    if (this.failed) return;
    if (!this.pp) {
      const pp = PingPong.create({
        simFrag: SIM_FRAG,
        dispFrag: DISP_FRAG,
        simUniforms: [
          'uDecay',
          'uSeg',
          'uBeamR',
          'uBeamI',
          'uBurnOn',
          'uDegauss',
          'uAsp',
        ],
        dispUniforms: [
          'uTime',
          'uGrain',
          'uScan',
          'uPhos',
          'uInk',
          'uCream',
          'uDegauss',
          'uSimH',
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
      pp.initState(gw, gh, new Float32Array(gw * gh * 4));
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

    const interactive = Number(controls.mode) > 0.5;
    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        if (interactive)
          this.degauss = { x: c.x / sw, y: 1 - c.y / sh, age: 0 };
      }
    }
    if (this.degauss) {
      this.degauss.age += dt;
      if (this.degauss.age > 1.2) this.degauss = null;
    }

    const mouse = pointer?.mouse;
    if (interactive) {
      if (mouse?.active) this.target = [mouse.x / sw, 1 - mouse.y / sh];
    } else {
      this.liss.next -= dt;
      if (this.liss.next <= 0) {
        this.liss.a = 2 + Math.floor(Math.random() * 4);
        this.liss.b = 2 + Math.floor(Math.random() * 4);
        this.liss.next = 5 + Math.random() * 4;
      }
      const t = this.time * 0.9;
      this.target = [
        0.5 + 0.38 * Math.sin(this.liss.a * t),
        0.5 + 0.34 * Math.sin(this.liss.b * t + 1.3),
      ];
      if (Math.random() < dt * 0.15) this.degauss = { x: 0.5, y: 0.5, age: 0 };
    }

    // The beam is substepped for stability, and each substep deposits its
    // own segment with a speed-dependent intensity: a slow beam pools light,
    // a fast whip leaves only a faint streak.
    const h = Math.min(dt, 0.05) / SUBSTEPS;
    const k = controls.spring;
    const dp = controls.damp;
    const b = this.beam;
    const asp = pp.sw / pp.sh;
    const decayStep = Math.pow(
      controls.persist,
      Math.max(0.05, (dt * 60) / SUBSTEPS)
    );

    for (let i = 0; i < SUBSTEPS; i++) {
      const px = b.x;
      const py = b.y;
      b.vx += ((this.target[0] - b.x) * k - b.vx * dp) * h;
      b.vy += ((this.target[1] - b.y) * k - b.vy * dp) * h;
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.x = Math.max(-0.1, Math.min(1.1, b.x));
      b.y = Math.max(-0.1, Math.min(1.1, b.y));
      // uv per second, aspect-corrected.
      const spd = Math.hypot(b.vx * asp, b.vy);
      const inten = 0.16 * Math.min(2.8, 0.12 / (spd * 0.55 + 0.048));
      pp.step((gl, L) => {
        gl.uniform1f(L.uDecay!, decayStep);
        gl.uniform4f(L.uSeg!, px, py, b.x, b.y);
        gl.uniform1f(L.uBeamR!, controls.beam);
        gl.uniform1f(L.uBeamI!, inten);
        gl.uniform1f(L.uBurnOn!, controls.burn ? 1 : 0);
        gl.uniform1f(L.uAsp!, asp);
        if (this.degauss) {
          gl.uniform3f(
            L.uDegauss!,
            this.degauss.x,
            this.degauss.y,
            this.degauss.age
          );
        } else {
          gl.uniform3f(L.uDegauss!, 0, 0, 9);
        }
      });
    }

    pp.display(W, H, (gl, L) => {
      gl.uniform1f(L.uTime!, this.time);
      gl.uniform1f(L.uGrain!, controls.grain ? 1 : 0);
      gl.uniform1f(L.uScan!, controls.scan);
      gl.uniform1f(L.uSimH!, pp.sh);
      setColor(gl, L.uPhos!, Number(controls.phos));
      setColor(gl, L.uInk!, PAL.ink);
      setColor(gl, L.uCream!, PAL.cream);
      if (this.degauss) {
        gl.uniform3f(
          L.uDegauss!,
          this.degauss.x,
          this.degauss.y,
          this.degauss.age
        );
      } else {
        gl.uniform3f(L.uDegauss!, 0, 0, 9);
      }
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

export function createCrtPhosphorAnimation(
  initialControls?: Partial<CrtPhosphorControlValues>
): CrtPhosphorAnimation {
  return new CrtPhosphorAnimation(initialControls);
}
