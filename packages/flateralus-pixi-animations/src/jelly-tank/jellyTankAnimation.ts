import type * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { HarnessShaderAnimation } from '../shared/harness-shader-animation';
import { setColor, type ShaderContext } from '../shared/shader-harness';
import { WaterField, type Splat } from './water';

/** Uniform array sizes, baked into the shader source below. */
const MAX_JELLIES = 8;

const MANIFEST = createManifest({
  id: 'jelly-tank',
  name: 'Jelly Tank (GLSL)',
  description:
    'A jellyfish smack in a tank of real water. The column is a wave field integrated on the GPU, so disturbances interfere, reflect off the glass and fade on their own — nothing is on a timer. Jellies swim by pulse-jet: thrust fires only while the bell contracts, and every contraction shoves water backward, so a jelly leaves a wake that reaches the others. They read the slope they are sitting on and ride it, which means the only way to reach a jelly is to move the water it lives in. Bells, scalloped rims, organs and tentacles are signed-distance glow in one pass; refraction and the light gathering in the troughs are the first and second derivatives of the same field. Ambient: convection alone keeps it moving.',
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
      name: 'count',
      type: 'number',
      label: 'Smack Size',
      min: 1,
      max: MAX_JELLIES,
      step: 1,
      defaultValue: 5,
      debug: true,
    },
    {
      name: 'pulse',
      type: 'number',
      label: 'Pulse Rate',
      min: 0.4,
      max: 2.2,
      step: 0.1,
      defaultValue: 1.0,
      debug: true,
    },
    {
      name: 'tent',
      type: 'number',
      label: 'Tentacle Len',
      min: 0.5,
      max: 2.0,
      step: 0.1,
      defaultValue: 1.2,
      debug: true,
    },
    {
      name: 'current',
      type: 'number',
      label: 'Current',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.35,
      debug: true,
    },
    {
      name: 'glow',
      type: 'number',
      label: 'Bioluminescence',
      min: 0.5,
      max: 2.0,
      step: 0.1,
      defaultValue: 1.0,
      debug: true,
    },
    {
      name: 'snow',
      type: 'boolean',
      label: 'Marine Snow',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'chop',
      type: 'number',
      label: 'Convection',
      min: 0,
      max: 2.5,
      step: 0.05,
      defaultValue: 1.0,
      debug: true,
    },
    {
      name: 'drop',
      type: 'number',
      label: 'Touch Force',
      min: 0.3,
      max: 4,
      step: 0.1,
      defaultValue: 1.6,
      debug: true,
    },
    {
      name: 'refr',
      type: 'number',
      label: 'Refraction',
      // Displacement is uRefr * grad, and the mean gradient is 6.5e-3, so
      // this control is roughly "p-units of shift per unit of slope": 1.2
      // bends the view by ~0.8% of the tank height on ordinary convection
      // and ~3% through a crest. The old 0.12 ceiling worked out to a
      // sub-pixel shift, which is why the water was invisible.
      min: 0,
      max: 3,
      step: 0.05,
      defaultValue: 1.2,
      debug: true,
    },
    {
      name: 'caust',
      type: 'number',
      label: 'Gathered Light',
      min: 0,
      max: 4,
      step: 0.1,
      defaultValue: 1.4,
      debug: true,
    },
    {
      name: 'swell',
      type: 'number',
      label: 'Water To Jelly',
      min: 0,
      max: 3,
      step: 0.1,
      defaultValue: 1.0,
      debug: true,
    },
    {
      name: 'wake',
      type: 'number',
      label: 'Jelly To Water',
      min: 0,
      max: 3,
      step: 0.1,
      defaultValue: 1.0,
      debug: true,
    },
  ],
} as const);

export type JellyTankControlValues = ManifestToControlValues<typeof MANIFEST>;

/** Carried across from the prototype verbatim. Do not reformat the GLSL. */
const FRAG = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform float uTime;
    uniform float uAsp;
    uniform int uCount;
    uniform vec4 uJA[8];   // x, y, size, bellPhase
    uniform vec4 uJB[8];   // heading, energy, tentLen, seed
    uniform sampler2D uH;  // the water: x = surface now, y = one step ago
    uniform vec2 uSim;     // field grid size, in cells
    uniform float uRefr, uCaust;
    uniform vec3 uMouse;         // x, y, active
    uniform float uGlow;
    uniform float uSnow;
    uniform vec3 uInk;
    uniform vec3 uOrange;
    uniform vec3 uSun;
    uniform vec3 uCream;
    
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
    mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
    void main() {
      vec2 uv = vUV;
      vec2 p = (uv - 0.5) * vec2(uAsp, 1.0);
      // The water. Everything the field does to this frame is a derivative
      // of one texture — there is no ring list, and nothing here knows how a
      // disturbance was made or how long ago.
      vec2 hpx = 1.0 / uSim;
      float hC = texture(uH, uv).x;
      float hL = texture(uH, uv - vec2(hpx.x, 0.0)).x;
      float hR = texture(uH, uv + vec2(hpx.x, 0.0)).x;
      float hB = texture(uH, uv - vec2(0.0, hpx.y)).x;
      float hT = texture(uH, uv + vec2(0.0, hpx.y)).x;
      vec2 gradH = vec2(hR - hL, hT - hB) * 0.5;
      // Refraction: the view ray bends through the pressure gradient, so
      // everything behind the water — jellies, snow, god rays — shifts with
      // the slope. First derivative of the field.
      p -= gradH * uRefr;
      // Compression of the column. Second derivative of the same state.
      //
      // This deliberately does NOT become light of its own. Additive glow
      // tracking curvature is a caustic on a pool floor, and a caustic is
      // something you only see looking DOWN through a surface onto the
      // bottom. Side-on there is no floor in frame and no surface between
      // the eye and the jellies, so the term that reads as sunlight on tiles
      // from above reads as nothing physical from here — it just tells the
      // viewer they are hovering over a pool.
      //
      // What a compressed patch of water actually does from the side is
      // gather the light already passing through it, so it multiplies the
      // shafts and the particulate rather than adding a glow of its own.
      float lapH = hL + hR + hB + hT - 4.0 * hC;
      // Measured against the shipped constants on a 302x488 grid: mean
      // |lap| 1.1e-3, peaks 7.2e-3. A gain of 30 modulates the rays by a few
      // percent at rest and around 20% through a crest.
      float dense = max(0.0, -lapH) * uCaust * 30.0;
      // water column: darker with depth, faint god rays from above
      vec3 col = uInk * (0.30 + 0.55 * uv.y) + 0.004;
      float rays = fbm(vec2(p.x * 2.4 - p.y * 0.7, uTime * 0.05))
                 * fbm(vec2(p.x * 5.2 + 3.7 - p.y * 0.4, uTime * 0.03 + 7.0));
      col += uSun * pow(rays, 2.6) * smoothstep(0.05, 0.95, uv.y) * 0.55
             * (1.0 + dense * 2.0);
      // marine snow: two parallax layers of drifting motes
      if (uSnow > 0.5) {
        for (int L = 0; L < 2; L++) {
          float sc = L == 0 ? 42.0 : 74.0;
          float spd = L == 0 ? 0.016 : 0.030;
          vec2 g = p * sc + vec2(uTime * spd * 0.6, uTime * spd * sc);
          vec2 id = floor(g);
          vec2 f = fract(g) - 0.5;
          float h = hash21(id);
          if (h > 0.94) {
            vec2 off = vec2(hash21(id + 3.1), hash21(id + 7.7)) - 0.5;
            float dd = length(f - off * 0.7);
            col += uCream * smoothstep(0.09, 0.0, dd) * 0.10 * (L == 0 ? 1.0 : 0.55)
                   * (1.0 + dense * 3.0);
          }
        }
      }
      // jellies
      for (int i = 0; i < 8; i++) {
        if (i >= uCount) break;
        vec4 A = uJA[i], B = uJB[i];
        float s = A.z, ph = A.w, en = B.y, tl = B.z, seed = B.w;
        vec2 q = rot(-B.x) * (p - A.xy);
        if (length(q) > s * (1.6 + tl * 2.8)) continue;
        float gs = (0.7 + 0.6 * en) * uGlow;
        // bell: pulsing ellipse dome with scalloped rim
        float k = 0.5 + 0.5 * sin(ph);                 // 1 = contracted
        float rx = s * (1.0 - 0.30 * k);
        float ry = s * (0.60 + 0.36 * k);
        float theta = atan(q.x, q.y);                   // 0 at apex
        float sd = (length(q / vec2(rx, ry)) - 1.0) * min(rx, ry);
        sd += 0.05 * ry * sin(theta * 9.0 + ph * 2.0) * (0.5 - 0.5 * cos(theta));
        float underCut = smoothstep(-ry * 0.60, -ry * 0.12, q.y);
        float fill = smoothstep(0.012 * s, -0.02 * s, sd) * underCut;
        float membrane = fill * (0.20 + 0.65 * exp(sd / (0.28 * s)));
        float rim = exp(-abs(sd) / (0.022 * s)) * underCut;
        // gonads: four-lobe organ cluster near the apex
        float ro = length(q / vec2(rx * 0.52, ry * 0.55));
        float organ = exp(-ro * 3.2) * (0.35 + 0.65 * pow(abs(cos(theta * 2.0 + seed)), 1.5));
        col += (uOrange * membrane * 0.55 + uSun * rim * 0.85 + uCream * organ * 0.75) * gs;
        // tentacles: 5 trailing strands
        float startY = -ry * 0.22;
        float TL = tl * s * 2.4;
        if (q.y < startY) {
          float yy = (startY - q.y) / TL;
          if (yy < 1.0) {
            float fade = smoothstep(1.0, 0.7, yy) * smoothstep(0.0, 0.05, yy);
            for (int t = 0; t < 5; t++) {
              float fx = (float(t) - 2.0) * 0.5;
              float amp = s * (0.30 + 0.35 * en) * yy;
              float dx = sin(yy * 7.0 - ph * 1.4 + seed * 6.28 + float(t) * 1.9) * amp;
              float xr = fx * rx * 0.55 * (1.0 + yy * 0.8) + dx;
              float w = s * mix(0.010, 0.0025, yy);
              float g = w / (abs(q.x - xr) + w);
              col += mix(uOrange, uSun, 0.35) * g * g * 0.55 * fade * gs;
            }
            // oral arms: 2 thicker, slower ribbons
            float yy2 = yy / 0.62;
            if (yy2 < 1.0) {
              float fade2 = smoothstep(1.0, 0.6, yy2) * smoothstep(0.0, 0.05, yy2);
              for (int t = 0; t < 2; t++) {
                float side = float(t) * 2.0 - 1.0;
                float dx = sin(yy2 * 3.2 - ph * 0.9 + seed * 4.0 + side) * s * 0.22 * yy2;
                float xr = side * rx * 0.16 + dx;
                float w = s * mix(0.022, 0.005, yy2);
                float g = w / (abs(q.x - xr) + w);
                col += uCream * g * g * 0.40 * fade2 * gs;
              }
            }
          }
        }
      }
      // cursor lure: a faint mote of light
      if (uMouse.z > 0.5) {
        float d = length(p - uMouse.xy);
        col += uCream * (0.06 / (d * 34.0 + 1.0)) * (0.8 + 0.2 * sin(uTime * 5.0));
      }
      col = 1.0 - exp(-col * 1.25);
      col += (hash21(floor(uv * 720.0) + vec2(fract(uTime * 7.0) * 13.0)) - 0.5) * 0.035;
      fragColor = vec4(col, 1.0);
    }`;

interface Jelly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Heading, radians. */
  ang: number;
  /** Bell contraction phase; thrust fires on the rising half. */
  phase: number;
  rateMul: number;
  size: number;
  seed: number;
  /** Startle energy, decaying; raises pulse rate and thrust. */
  energy: number;
  /** Smoothed field height under the bell. */
  h: number;
  /**
   * Smoothed field gradient under the bell — the slope it drifts down.
   */
  gx: number;
  gy: number;
  /**
   * Field height at the previous probe, so a jelly can notice the water
   * change rather than being told that a click happened.
   */
  lastH: number;
  /**
   * Running average of how much the field moves under this jelly between
   * probes. The startle threshold is a multiple of this rather than a
   * constant, so convection — whatever its amplitude — is never startling,
   * and a real push is startling on any grid size or canvas shape.
   */
  noise: number;
}

function makeJelly(asp: number): Jelly {
  return {
    x: (Math.random() - 0.5) * asp * 0.8,
    y: (Math.random() - 0.5) * 0.8,
    vx: 0,
    vy: 0,
    ang: (Math.random() - 0.5) * 1.2,
    phase: Math.random() * Math.PI * 2,
    rateMul: 0.75 + Math.random() * 0.5,
    size: 0.1 + Math.random() * 0.07,
    seed: Math.random(),
    energy: 0,
    h: 0,
    gx: 0,
    gy: 0,
    lastH: 0,
    noise: 0,
  };
}

/** Turn toward a target heading the short way round. */
function steer(j: Jelly, target: number, rate: number, dt: number): void {
  const da = Math.atan2(Math.sin(target - j.ang), Math.cos(target - j.ang));
  j.ang += da * Math.min(1, rate * dt);
}

/**
 * How many jellies refresh their field probe each frame. readPixels is a
 * sync point, so the smack round-robins through it rather than every jelly
 * stalling the pipeline every frame. Safe because both probes are low-passed
 * below — a sample one frame stale is well inside the filter's time constant.
 */
const PROBES_PER_FRAME = 4;

export class JellyTankAnimation extends HarnessShaderAnimation<
  typeof MANIFEST
> {
  protected readonly frag = FRAG;
  protected readonly extraUniforms = [
    'uAsp',
    'uCount',
    'uMouse',
    'uGlow',
    'uSnow',
    'uJA[0]',
    'uJB[0]',
    'uH',
    'uSim',
    'uRefr',
    'uCaust',
  ] as const;
  protected readonly commonUniforms = [
    'uTime',
    'uInk',
    'uOrange',
    'uSun',
    'uCream',
  ] as const;
  protected readonly needsMask = false;

  private jellies: Jelly[] = [];
  private ja = new Float32Array(MAX_JELLIES * 4);
  private jb = new Float32Array(MAX_JELLIES * 4);

  /** The tank's water. Null until built, or where the driver cannot. */
  private water: WaterField | null = null;
  /** Set once the field cannot be built, so we stop retrying every frame. */
  private waterFailed = false;
  /** Disturbances queued this frame, from the cursor and from the jellies. */
  private splats: Splat[] = [];
  /** Which jelly probes the field next; see PROBES_PER_FRAME. */
  private probeCursor = 0;
  /** Countdown to the next ambient disturbance, in ambient mode only. */
  private nextAuto = 2.5;
  /** Last cursor position in field uv, for stamping along the drag path. */
  private pmx = -1;
  private pmy = -1;

  constructor(initialControls?: Partial<JellyTankControlValues>) {
    super(MANIFEST, initialControls);
  }

  protected mask(): null {
    return null;
  }

  onInit(app: PIXI.Application, controls: JellyTankControlValues): void {
    super.onInit(app, controls);
    this.jellies = [];
    this.nextAuto = 2.5;
    this.probeCursor = 0;
    this.pmx = -1;
    this.pmy = -1;
  }

  protected setUniforms(
    gl: WebGL2RenderingContext,
    locs: Record<string, WebGLUniformLocation | null>,
    ctx: ShaderContext,
    controls: JellyTankControlValues,
    deltaTime: number,
    app: PIXI.Application
  ): void {
    const w = app.screen.width;
    const h = app.screen.height;
    const asp = w / Math.max(1, h);
    const A = asp / 2;
    const interactive = Number(controls.mode) > 0.5;
    const dt = Math.min(deltaTime, 0.05);

    if (this.jellies.length === 0) {
      this.jellies = Array.from({ length: MAX_JELLIES }, () => makeJelly(asp));
    }
    const J = this.jellies;
    const count = Math.round(controls.count);

    // The water shares the display pass's context, but owns its own buffers:
    // it needs extra passes blended onto the live texture and CPU readback,
    // neither of which the shared ping-pong helper exposes.
    if (!this.water && !this.waterFailed) {
      this.water = WaterField.create(gl);
      if (!this.water) this.waterFailed = true;
    }
    const water = this.water;
    if (water) water.ensure(w, h);

    // Field uv <-> the shader's centred, aspect-corrected p space.
    const toU = (px: number) => px / asp + 0.5;
    const toV = (py: number) => py + 0.5;

    this.splats.length = 0;
    const splats = this.splats;

    // ---- the cursor is a body in the water
    const m = this.pointer?.mouse;
    const mAct = interactive && !!m?.active;
    const mx = mAct ? (m!.x / w - 0.5) * asp : 0;
    const my = mAct ? 0.5 - m!.y / h : 0;

    const drop = controls.drop;
    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        if (!interactive) continue;
        // A touch has to out-talk the convection or it is not a touch. At
        // radius 7 this amplitude puts a local slope of ~1.4e-2 into the
        // field, a bit over twice the ambient mean.
        splats.push({
          x: c.x / w,
          y: 1 - c.y / h,
          amp: -drop * 0.06,
          rad: 7,
        });
      }
    }

    // Stamp along the drag path rather than once per event, so a fast sweep
    // cuts a continuous line through the water instead of a dotted one. The
    // cursor displaces water by moving through it; it is not a click handler.
    if (mAct && water) {
      const cu = toU(mx);
      const cv = toV(my);
      if (this.pmx >= 0) {
        const du = cu - this.pmx;
        const dv = cv - this.pmy;
        const dist = Math.hypot(du * asp, dv);
        if (dist > 1e-4) {
          const steps = Math.max(1, Math.min(12, Math.ceil(dist * 90)));
          const push = Math.min(0.06, dist * 1.05) * drop;
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            splats.push({
              x: this.pmx + du * t,
              y: this.pmy + dv * t,
              amp: (-push / steps) * 1.4,
              rad: 5,
            });
          }
        }
      }
      this.pmx = cu;
      this.pmy = cv;
    } else {
      this.pmx = -1;
      this.pmy = -1;
    }

    // Ambient mode has no cursor, so convection alone would leave the tank
    // quiet. Fill in for the absent user rather than playing the toy in
    // front of a present one.
    if (!interactive) {
      this.nextAuto -= dt;
      if (this.nextAuto <= 0) {
        splats.push({
          x: 0.15 + Math.random() * 0.7,
          y: 0.2 + Math.random() * 0.6,
          amp: -0.05,
          rad: 7,
        });
        this.nextAuto = 3 + Math.random() * 3;
      }
    }

    // ---- jelly physics
    for (let i = 0; i < count; i++) {
      const j = J[i];
      j.phase +=
        dt *
        controls.pulse *
        j.rateMul *
        Math.PI *
        2 *
        0.35 *
        (1 + 1.6 * j.energy);
      // Thrust fires on contraction, the rising half of the pulse.
      const contract = Math.max(0, Math.sin(j.phase));
      const thrust = contract * contract * 0.22 * (1 + 1.8 * j.energy);
      j.vx += Math.sin(j.ang) * thrust * dt;
      j.vy += Math.cos(j.ang) * thrust * dt;
      // Sink between pulses.
      j.vy -= 0.022 * dt;

      // Ride the water. The field gradient is a force, not a destination —
      // the jelly resolves it with its own drag and momentum, which is why a
      // passing swell carries it and then lets it go instead of teleporting
      // it. Divided by aspect because velocity is carried in p space.
      //
      // Scale is set against thrust, which adds up to ~0.22/s to velocity.
      // A mean gradient of 6.5e-3 times 6 gives ~0.04/s, so the water is a
      // real current a jelly swims within rather than something it can
      // ignore — and a crest at 2.5e-2 briefly overpowers a pulse. The 0.55
      // this started at was a guess, and it left the water inert.
      const KF = 6.0 * controls.swell;
      j.vx += ((-j.gx * KF) / asp) * dt;
      j.vy += -j.gy * KF * dt;

      const drag = Math.exp(-1.4 * dt);
      j.vx *= drag;
      j.vy *= drag;
      j.x +=
        j.vx * dt * 60 * 0.016 +
        Math.sin(this.time * 0.3 + j.seed * 9) * controls.current * 0.012 * dt;
      j.x += controls.current * 0.008 * dt;
      j.y += j.vy * dt * 60 * 0.016;

      // Heading wanders, with a mild upward bias.
      j.ang += Math.sin(this.time * 0.4 + j.seed * 20) * 0.35 * dt;
      steer(j, 0, 0.12, dt);

      // Lure: turn toward the cursor when it is close but not on top of them.
      if (mAct) {
        const dx = mx - j.x;
        const dy = my - j.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.55 && d > 0.1) {
          steer(j, Math.atan2(dx, dy), 1.4, dt);
          j.energy = Math.max(j.energy, 0.25);
        }
      }

      // Startle. Nothing here knows a click happened — the jelly notices the
      // water around it change, and turns away from where the push came
      // from. A disturbance arriving off a wall reflection startles it
      // exactly as well as one aimed at it.
      //
      // The trigger is a multiple of this jelly's own recent noise, not a
      // constant: the field's amplitude depends on grid size, canvas shape
      // and the convection control, and a threshold picked by eye against
      // one of those is wrong on all the others.
      const jolt = Math.abs(j.h - j.lastH);
      if (j.noise > 1e-9 && jolt > j.noise * 5) {
        j.energy = Math.min(1, Math.max(j.energy, jolt / (j.noise * 14)));
        const gm = Math.hypot(j.gx, j.gy);
        if (gm > 1e-6) steer(j, Math.atan2(j.gx / gm, j.gy / gm), 2.2, dt);
      }

      // Soft bounds: steer back toward center near the edges.
      if (Math.abs(j.x) > A - 0.14 || Math.abs(j.y) > 0.38) {
        steer(j, Math.atan2(-j.x, -j.y), 1.0, dt);
      }
      j.x = Math.max(-A - 0.2, Math.min(A + 0.2, j.x));
      j.y = Math.max(-0.65, Math.min(0.62, j.y));
      j.energy *= Math.exp(-0.7 * dt);

      // Pulse-jet propulsion is a shove against the water, so put it back
      // into the field: a contracting bell pushes a slug of water out behind
      // itself. This is what lets one jelly's wake reach another, and it is
      // why the smack keeps moving after you stop touching it.
      // Placed well behind the bell and kept tight: at 0.9 radii with a wide
      // gaussian the jelly sat inside its own wake, read it as a disturbance,
      // and jetted again — a self-driving oscillator that looked like panic.
      if (water && thrust > 0.004) {
        // The coefficient works out to thrust * 3.0 * dt, which is the same
        // wake coupling caustics-pool uses for a drifting toy.
        //
        // Sizing this from a single frame's slope is the trap: the splat is
        // applied every frame a bell is contracting, so what matters is the
        // amplitude per second against the field's ~2.2s damping time, not
        // what one splat adds. Reasoning per-frame said this was 12x too
        // weak; it was already about right, and 10x of it lensed the jellies
        // into concentric rings.
        const amp = -thrust * 0.05 * controls.wake * dt * 60;
        splats.push({
          x: toU(j.x - Math.sin(j.ang) * j.size * 2.0),
          y: toV(j.y - Math.cos(j.ang) * j.size * 2.0),
          amp,
          rad: Math.max(3, j.size * (water.gridH || 300) * 0.28),
        });
      }

      this.ja[i * 4] = j.x;
      this.ja[i * 4 + 1] = j.y;
      this.ja[i * 4 + 2] = j.size;
      this.ja[i * 4 + 3] = j.phase;
      this.jb[i * 4] = j.ang;
      this.jb[i * 4 + 1] = j.energy;
      this.jb[i * 4 + 2] = controls.tent;
      this.jb[i * 4 + 3] = j.seed;
    }

    // ---- advance the water, then let the jellies feel it
    if (water) {
      water.applySplats(splats);
      water.update(dt, 0.3, 0.995, controls.chop);

      // Round-robin the readback so at most PROBES_PER_FRAME sync points
      // land in a frame.
      water.beginSample();
      const n = Math.min(count, PROBES_PER_FRAME);
      for (let k = 0; k < n; k++) {
        if (count <= 0) break;
        this.probeCursor = (this.probeCursor + 1) % count;
        const j = J[this.probeCursor];
        const smp = water.sample(toU(j.x), toV(j.y));
        if (!smp) break;
        // Low-pass the probe: one cell of a half-float field is noisy, and a
        // jelly should follow the swell, not the ripple texture.
        j.lastH = j.h;
        j.h = j.h * 0.8 + smp[0] * 0.2;
        j.gx = j.gx * 0.7 + smp[1] * 0.3;
        j.gy = j.gy * 0.7 + smp[2] * 0.3;
        // The noise floor tracks slowly and only rises gently, so a genuine
        // shove does not immediately raise the bar that detected it.
        const d = Math.abs(j.h - j.lastH);
        j.noise += (d - j.noise) * (d > j.noise ? 0.02 : 0.12);
      }

      // Hand the context back the way the harness left it: its program, the
      // default framebuffer, and the display viewport.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.useProgram(ctx.program);
      gl.activeTexture(gl.TEXTURE0 + 2);
      gl.bindTexture(gl.TEXTURE_2D, water.texture);
      gl.uniform1i(locs.uH!, 2);
      gl.uniform2f(locs.uSim!, water.gridW, water.gridH);
    }

    gl.uniform1f(locs.uRefr!, water ? controls.refr : 0);
    gl.uniform1f(locs.uCaust!, water ? controls.caust : 0);
    gl.uniform1f(locs.uAsp!, asp);
    gl.uniform1i(locs.uCount!, count);
    gl.uniform3f(locs.uMouse!, mx, my, mAct ? 1 : 0);
    gl.uniform1f(locs.uGlow!, controls.glow);
    gl.uniform1f(locs.uSnow!, controls.snow ? 1 : 0);
    setColor(gl, locs.uInk!, PAL.ink);
    setColor(gl, locs.uOrange!, PAL.bright);
    setColor(gl, locs.uSun!, PAL.sun);
    setColor(gl, locs.uCream!, PAL.cream);
    gl.uniform4fv(locs['uJA[0]']!, this.ja);
    gl.uniform4fv(locs['uJB[0]']!, this.jb);
  }

  onDestroy(): void {
    this.jellies = [];
    this.water?.destroy();
    this.water = null;
    this.waterFailed = false;
    this.splats.length = 0;
    super.onDestroy();
  }
}

export function createJellyTankAnimation(
  initialControls?: Partial<JellyTankControlValues>
): JellyTankAnimation {
  return new JellyTankAnimation(initialControls);
}
