import type * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { HarnessShaderAnimation } from '../shared/harness-shader-animation';
import { setColor, type ShaderContext } from '../shared/shader-harness';

const MANIFEST = createManifest({
  id: 'dmt-tunnel',
  name: 'Breakthrough Tunnel (GLSL)',
  description:
    'A cosmic journey in one fragment shader: a polar kaleidoscope fold and domain-warped fbm filigree are projected as a tunnel (z = 1/r), colored by cycling the theme palette. A trip envelope carries the whole scene through phases — starfield ascent, kaleidoscopic peak where the fold count and melt bloom, then the descent back to dark — and loops. Pointer steers the vanishing point and hue drift; click fires a breakthrough surge that floods the core and jumps the palette. Ambient: the trip runs on its own clock.',
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
      name: 'speed',
      type: 'number',
      label: 'Fly Speed',
      min: 0.2,
      max: 3,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'trip',
      type: 'number',
      label: 'Trip Length (s)',
      min: 15,
      max: 120,
      step: 5,
      defaultValue: 45,
      debug: true,
    },
    {
      name: 'seg',
      type: 'number',
      label: 'Kaleido Segments',
      min: 4,
      max: 24,
      step: 1,
      defaultValue: 12,
      debug: true,
    },
    {
      name: 'warp',
      type: 'number',
      label: 'Melt',
      min: 0,
      max: 2,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'detail',
      type: 'number',
      label: 'Filigree Detail',
      min: 0.5,
      max: 2.5,
      step: 0.1,
      defaultValue: 1.2,
      debug: true,
    },
    {
      name: 'hue',
      type: 'number',
      label: 'Spectral Drift',
      min: 0,
      max: 3,
      step: 0.1,
      defaultValue: 1,
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
      name: 'sides',
      type: 'select',
      label: 'Cross-Section',
      options: [
        { value: 0, label: 'Circle' },
        { value: 3, label: 'Triangle' },
        { value: 4, label: 'Square' },
        { value: 6, label: 'Hexagon' },
        { value: -1, label: 'Flower' },
        { value: -2, label: 'Gear' },
      ],
      defaultValue: -1,
      debug: true,
    },
    {
      name: 'twist',
      type: 'number',
      label: 'Twist',
      min: 0,
      max: 2,
      step: 0.1,
      defaultValue: 0.6,
      debug: true,
    },
  ],
} as const);

export type DmtTunnelControlValues = ManifestToControlValues<typeof MANIFEST>;

/** Carried across from the prototype verbatim. Do not reformat the GLSL. */
const FRAG = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform vec2 uRes;
    uniform float uTime, uScroll, uSeg, uWarp, uHue, uInt, uSurge, uGlow, uSteerX, uSteerY, uDetail, uSides, uTwist;
    uniform vec3 uC1, uC2, uC3, uC4, uInk, uCream;
    float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
                 mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.03 + vec2(17.0, 9.2); a *= 0.5; }
      return v;
    }
    vec3 pal(float t) {
      t = fract(t) * 4.0;
      if (t < 1.0) return mix(uC1, uC2, t);
      if (t < 2.0) return mix(uC2, uC3, t - 1.0);
      if (t < 3.0) return mix(uC3, uC4, t - 2.0);
      return mix(uC4, uC1, t - 3.0);
    }
    // cross-section radius at angle a: 1 = circle; >0 = n-gon; -1 flower; -2 gear
    float shapeR(float a) {
      if (uSides < -1.5) { float s = sin(a * 8.0); return 1.0 + 0.10 * s / sqrt(s * s + 0.08); }
      if (uSides < -0.5) return 1.0 + 0.18 * cos(a * 6.0);
      if (uSides < 0.5) return 1.0;
      float n = uSides;
      float m = mod(a, 6.2831853 / n) - 3.14159265 / n;
      return cos(3.14159265 / n) / cos(m);
    }
    void main() {
      float asp = uRes.x / uRes.y;
      vec2 q = (vUV - 0.5) * vec2(asp, 1.0);
      q -= vec2(uSteerX, uSteerY) * 0.22;
      float r = length(q) + 1e-4;
      float a0 = atan(q.y, q.x);
      // twist: the cross-section corkscrews with depth
      float at = a0 + uTwist * 0.16 * (0.42 / r);
      // shaped radius: iso-lines of rs follow the cross-section instead of circles
      float rs = r / shapeR(at);
      // angular melt, strongest away from the core
      float a = at + uWarp * uInt * 0.38 * sin(3.0 * a0 + uTime * 0.7) * smoothstep(0.0, 0.6, r);
      // kaleido fold; fold count eases up continuously with the trip envelope
      float seg = max(2.0, uSeg * (0.3 + 0.7 * uInt));
      float sa = 6.2831853 / seg;
      float ak = abs(mod(a, sa) - sa * 0.5);
      // tunnel projection along the shaped radius
      float z = 0.42 / rs + uScroll;
      vec2 tp = vec2(ak * (2.0 + seg * 0.35), z);
      float m1 = fbm(tp * vec2(1.0, 0.55) * uDetail);
      float m2 = fbm(tp * vec2(2.3, 1.4) * uDetail + m1 * 2.2 + uTime * 0.06);
      float bands = 0.5 + 0.5 * sin(z * 3.0 - m2 * 5.0 + uTime * 0.4);
      float lace = smoothstep(0.35, 0.0, abs(fract(m1 * 4.0 + z * 0.5) - 0.5));
      // far starfield: round soft points, fade out as the trip peaks
      vec2 sg = q * 24.0;
      vec2 sc = floor(sg);
      vec2 so = vec2(hash21(sc), hash21(sc + 41.7)) - 0.5;
      float sd = length(fract(sg) - 0.5 - so * 0.7);
      float star = smoothstep(0.09, 0.0, sd) * step(0.93, hash21(sc + 7.3)) * smoothstep(0.85, 0.25, uInt);
      float hue = m2 * 1.6 + z * 0.10 + uHue * uTime * 0.03 + uSurge * 0.25;
      vec3 col = pal(hue) * (0.25 + 0.9 * bands) * (0.35 + 0.85 * uInt);
      col += pal(hue + 0.33) * lace * (0.4 + 1.7 * uInt);
      // white-hot vanishing point
      float core = exp(-rs * rs * 26.0);
      col += uCream * core * (0.35 + 1.5 * uInt + 2.2 * uSurge);
      col += pal(hue + 0.5) * exp(-rs * 5.0) * 0.5 * uInt;
      // mandala petals bloom near the core at high intensity
      float petals = pow(abs(sin(a0 * seg * 0.5 + uTime * 0.5)), 6.0);
      col += pal(hue + 0.15) * petals * exp(-r * 3.2) * 1.5 * uInt * uInt;
      col += uCream * star * 0.9;
      col = mix(col, uInk, smoothstep(0.78, 1.4, r));
      col *= uGlow * (1.0 + 0.35 * uSurge);
      col += vec3(hash21(vUV * uRes + fract(uTime * 9.0) * 17.0) - 0.5) * 0.03;
      fragColor = vec4(col, 1.0);
    }`;

export class DmtTunnelAnimation extends HarnessShaderAnimation<
  typeof MANIFEST
> {
  protected readonly frag = FRAG;
  protected readonly extraUniforms = [
    'uScroll',
    'uSeg',
    'uWarp',
    'uHue',
    'uInt',
    'uSurge',
    'uGlow',
    'uSteerX',
    'uSteerY',
    'uDetail',
    'uSides',
    'uTwist',
    'uC1',
    'uC2',
    'uC3',
    'uC4',
  ] as const;
  /** This shader declares its own uRes, uTime, uInk and uCream only. */
  protected readonly commonUniforms = [
    'uRes',
    'uTime',
    'uInk',
    'uCream',
  ] as const;
  protected readonly needsMask = false;

  protected get renderScale(): number {
    return typeof window === 'undefined'
      ? 1
      : Math.min(2, window.devicePixelRatio || 1);
  }

  /** Distance flown down the tunnel. */
  private scroll = 0;
  /** Decays after a click; floods the core and jumps the palette. */
  private surge = 0;
  private steerX = 0;
  private steerY = 0;

  constructor(initialControls?: Partial<DmtTunnelControlValues>) {
    super(MANIFEST, initialControls);
  }

  protected mask(): null {
    return null;
  }

  onInit(app: PIXI.Application, controls: DmtTunnelControlValues): void {
    super.onInit(app, controls);
    this.scroll = 0;
    this.surge = 0;
    this.steerX = 0;
    this.steerY = 0;
  }

  protected setUniforms(
    gl: WebGL2RenderingContext,
    locs: Record<string, WebGLUniformLocation | null>,
    _ctx: ShaderContext,
    controls: DmtTunnelControlValues,
    dt: number,
    app: PIXI.Application
  ): void {
    const interactive = Number(controls.mode) > 0.5;

    // Trip envelope: ascent, peak, descent, looping.
    const t01 = (this.time % controls.trip) / controls.trip;
    let intensity =
      Math.min(1, t01 / 0.3) * (1 - Math.max(0, (t01 - 0.7) / 0.3));
    intensity = Math.max(0.08, intensity * intensity * (3 - 2 * intensity));

    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        pointer.clicks.shift();
        if (interactive) this.surge = 1;
      }
    }
    this.surge = Math.max(0, this.surge - dt * 0.9);
    const I = Math.min(1.25, intensity + this.surge * 0.6);

    const m = pointer?.mouse;
    const steering = interactive && !!m?.active;
    let sxT: number;
    let syT: number;
    if (steering) {
      sxT = (m!.x / app.screen.width - 0.5) * 2;
      syT = -(m!.y / app.screen.height - 0.5) * 2;
    } else {
      sxT = 0.4 * Math.sin(this.time * 0.11);
      syT = 0.3 * Math.sin(this.time * 0.17 + 2);
    }
    this.steerX += (sxT - this.steerX) * Math.min(1, dt * 2.5);
    this.steerY += (syT - this.steerY) * Math.min(1, dt * 2.5);
    this.scroll +=
      dt * controls.speed * (0.35 + 1.6 * intensity + 2.5 * this.surge);

    gl.uniform1f(locs.uScroll!, this.scroll);
    gl.uniform1f(locs.uSeg!, controls.seg);
    gl.uniform1f(
      locs.uWarp!,
      controls.warp + (steering ? Math.abs(this.steerY) * 0.5 : 0)
    );
    gl.uniform1f(locs.uHue!, controls.hue + (steering ? this.steerX * 0.6 : 0));
    gl.uniform1f(locs.uInt!, I);
    gl.uniform1f(locs.uSurge!, this.surge);
    gl.uniform1f(locs.uGlow!, controls.glow);
    gl.uniform1f(locs.uSteerX!, this.steerX);
    gl.uniform1f(locs.uSteerY!, this.steerY);
    gl.uniform1f(locs.uDetail!, controls.detail);
    gl.uniform1f(locs.uSides!, Number(controls.sides));
    gl.uniform1f(locs.uTwist!, controls.twist);
    setColor(gl, locs.uC1!, PAL.orange);
    setColor(gl, locs.uC2!, PAL.sun);
    setColor(gl, locs.uC3!, PAL.cyan);
    setColor(gl, locs.uC4!, PAL.acid);
  }
}

export function createDmtTunnelAnimation(
  initialControls?: Partial<DmtTunnelControlValues>
): DmtTunnelAnimation {
  return new DmtTunnelAnimation(initialControls);
}
