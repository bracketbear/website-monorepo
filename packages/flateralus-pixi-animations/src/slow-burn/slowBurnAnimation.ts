import * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { PRE, phraseMask, setColor } from '../shared/shader-harness';
import { PingPong } from '../shared/ping-pong';
import { letterbox, maskToGrid, uploadMask } from '../shared/mask-grid';
import {
  REDUCED_INPUT_SCALE,
  prefersReducedMotion,
} from '../shared/reduced-motion';
import {
  A,
  A_E,
  COOL,
  D,
  E_HI,
  E_LO,
  LIFT,
  PAPER,
  Q,
  Q_E,
  SPS,
  T_BAND,
  T_IGN,
  T_MAX,
} from './slowBurn.sim';

const DEFAULT_PHRASE = 'DELETE ON SIGHT';

const MANIFEST = createManifest({
  id: 'slow-burn',
  name: 'Slow Burn (GLSL)',
  description:
    'A proclamation printed on a sheet of paper, and then the sheet lit. Fuel burns where it is hot and burning makes heat, so the fire is a front: about 60 cells a second and white-hot through the ink-heavy type, half that and a dull red across bare paper, which is how it gets over a word space without the whole block going up at once. Colour is the temperature run through a Planck curve. Behind the front the char oxidises to ash as embers, which glow hotter under a moving cursor and are spent sooner. Click to light it anywhere. When it has burned out, a fresh sheet is fitted.',
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
      name: 'pace',
      type: 'number',
      label: 'Pace',
      min: 0.25,
      max: 2,
      step: 0.05,
      defaultValue: 0.55,
      debug: true,
    },
    {
      name: 'autoIgnite',
      type: 'boolean',
      label: 'Light It On Arrival',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'wind',
      type: 'number',
      label: 'Fan Strength',
      min: 0,
      max: 2,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'refit',
      type: 'number',
      label: 'Fresh Sheet After (s)',
      min: 3,
      max: 20,
      step: 1,
      defaultValue: 7,
      debug: true,
    },
    {
      name: 'exposure',
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
      type: 'boolean',
      label: 'Film Grain',
      defaultValue: true,
      debug: true,
    },
  ],
} as const);

export type SlowBurnControlValues = ManifestToControlValues<typeof MANIFEST>;

/** Sim cells across the whole sheet. */
const CELLS = 92000;
/**
 * Slowest front on the sheet, cells/s at pace 1: what the burn-out estimate
 * divides by. The sim's own rate takes a phrase in about four seconds on
 * this grid, which is a flash and not a slow burn; `pace` scales sim time,
 * and at its default the phrase takes about eight.
 */
const PAPER_SPEED = 27;
/** Seconds the embers take to go out behind the last flame. */
const EMBER_TAIL = 3;
/** The sheet slides up by this much of the stage as it is fitted. */
const SLIDE = 0.06;

const f = (n: number) => n.toFixed(8);

/** cubic-bezier(0.23, 1, 0.32, 1), the repo's strong ease-out, at time t. */
function easeOut(t: number): number {
  const x1 = 0.23;
  const y1 = 1;
  const x2 = 0.32;
  const y2 = 1;
  const bez = (a: number, b: number, u: number) =>
    3 * a * u * (1 - u) ** 2 + 3 * b * u * u * (1 - u) + u ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (bez(x1, x2, mid) < t) lo = mid;
    else hi = mid;
  }
  return bez(y1, y2, (lo + hi) / 2);
}

/** A port of `stepSheet`. State: x fuel, y temperature, z peak, w char. */
const SIM_FRAG = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform sampler2D uState;
    uniform vec3 uIgnite;   // cx, cy, r in cells; r = 0 for none
    uniform vec4 uFan;      // cx, cy, r, k
    ivec2 sz;
    vec4 S(ivec2 q) { return texelFetch(uState, clamp(q, ivec2(0), sz - 1), 0); }
    void main() {
      sz = textureSize(uState, 0);
      ivec2 q = ivec2(gl_FragCoord.xy);
      vec4 c = S(q);
      float fuel = c.x, T = c.y, peak = c.z, ch = c.w;
      float below = S(q + ivec2(0, -1)).y;
      float lap = S(q + ivec2(-1, 0)).y + S(q + ivec2(1, 0)).y + below
                + S(q + ivec2(0, 1)).y - 4.0 * T;
      float rate = ${f(A)} * fuel * smoothstep(${f(T_IGN)}, ${f(T_IGN + T_BAND)}, T);

      vec2 pos = vec2(q) + 0.5;
      float air = 1.0;
      if (uFan.w > 0.0) {
        vec2 dd = pos - uFan.xy;
        air += uFan.w * exp(-dot(dd, dd) / (uFan.z * uFan.z));
      }
      float rateE = min(ch, ${f(A_E)} * ch * smoothstep(${f(E_LO)}, ${f(E_HI)}, T) * air);

      float nt = T + ${f(D)} * lap + ${f(LIFT)} * (below - T)
               + ${f(Q)} * rate + ${f(Q_E)} * rateE - ${f(COOL)} * T;
      nt = clamp(nt, 0.0, ${f(T_MAX)});
      if (uIgnite.z > 0.0 && length(pos - uIgnite.xy) <= uIgnite.z) nt = 1.0;

      fragColor = vec4(fuel - rate, nt, max(peak, nt), ch + rate - rateE);
    }`;

const DISP_FRAG =
  PRE +
  `
      uniform sampler2D uState;
      uniform vec2 uGrid;
      uniform float uExposure;
      uniform vec2 uSlide;   // x: offset in framebuffer px, y: opacity

      // Tanner Helland's fit to the Planckian locus, below 6600 K.
      vec3 planck(float K) {
        float t = K / 100.0;
        float g = clamp(0.39008 * log(t) - 0.63184, 0.0, 1.0);
        float b = t <= 19.0 ? 0.0 : clamp(0.54321 * log(t - 10.0) - 1.19625, 0.0, 1.0);
        return vec3(1.0, g, b);
      }
      // Light from a cell at temperature T: colour off the locus, power as
      // the fourth power of the kelvin it maps to. The map is bent so the
      // paper's smoulder (T near 0.27) lands around 1000 K, and gated so
      // that only the hot crest of that front glows: a thin dull red line
      // you can see, beside a flame that still tops out at 1900 K.
      vec3 emit(float T) {
        float x = clamp(T / ${f(T_MAX)}, 0.0, 1.0);
        float K = mix(700.0, 1900.0, pow(x, 0.78));
        float pw = K / 1900.0;
        return planck(K) * pw * pw * pw * pw * smoothstep(0.14, 0.3, T);
      }

      void main() {
        vec2 uvS = vec2(vUV.x, 1.0 - vUV.y);
        vec2 p = uvS * uRes;
        // The sheet, slid down by uSlide.x while it is being fitted.
        vec2 ps = p - vec2(0.0, uSlide.x);
        vec2 sv = ps / uRes;
        vec3 under = uInk * (0.92 + 0.08 * fbm(uvS * 3.0));
        if (sv.y < 0.0 || sv.y > 1.0) { fragColor = vec4(finish(under, uvS, p), 1.0); return; }

        vec2 g = vec2(sv.x, 1.0 - sv.y);
        vec4 s = texture(uState, g);
        float fuel = s.x, T = s.y, peak = s.z, ch = s.w;

        // What was printed here, at full resolution, for a crisp edge.
        float m = maskA((ps - uRect.xy) / uRect.zw);
        float fuel0 = max(m, ${f(PAPER)});
        float burnt = clamp(1.0 - fuel / fuel0, 0.0, 1.0);
        float ash = clamp((fuel0 - fuel - ch) / fuel0, 0.0, 1.0);

        // Paper, and how far the heat that passed over it has browned it.
        float fibre = fbm(ps * 0.035) * 0.6 + fbm(ps * 0.22) * 0.4;
        vec3 paper = uCream * (0.93 + 0.09 * fibre);
        vec3 tan_ = uCream * vec3(0.78, 0.62, 0.42);
        vec3 brown = uCream * vec3(0.34, 0.22, 0.13);
        float sc = clamp(peak / 0.3, 0.0, 1.4);
        vec3 sheet = mix(paper, tan_, smoothstep(0.1, 0.5, sc));
        sheet = mix(sheet, brown, smoothstep(0.45, 1.0, sc) * (0.75 + 0.25 * fibre));
        // Burned through in patches, where the fibre was dense: a sheet that
        // has been on fire, not a sheet of brown paper.
        float patchy = smoothstep(0.52, 0.8, fbm(ps * 0.018 + 7.0)) * burnt * (1.0 - m);
        sheet = mix(sheet, vec3(0.07, 0.05, 0.04), patchy * 0.75);

        // Type: ink until it burns, then char, then whatever the embers leave.
        vec3 charC = vec3(0.035, 0.03, 0.03) * (0.7 + 0.6 * fibre);
        vec3 ashC = uCream * vec3(0.8, 0.79, 0.78) * (0.8 + 0.3 * fibre);
        vec3 type = mix(uInk, charC, burnt);
        // Unfanned embers leave charcoal; a fanned stroke burns down to pale ash.
        type = mix(type, ashC, smoothstep(0.5, 0.95, ash));
        vec3 col = mix(sheet, type, m);

        // Everything that glows. Flame is the temperature of the cells
        // below, lifted: taps further down reach up in narrower tongues.
        vec3 light = emit(T);
        vec2 tx = 1.0 / uGrid;
        // Twelve taps, evenly down the column, so a tongue is a gradient
        // and not a stack of copies of the front.
        for (int i = 1; i <= 12; i++) {
          float d = float(i) * 1.5;
          float Tb = texture(uState, g - vec2(0.0, d * tx.y)).y;
          // Only real flame rises: the paper's smoulder stays where it is.
          light += emit(Tb) * smoothstep(0.55, 1.2, Tb) * (0.22 * exp(-d / 9.0));
        }
        vec3 halo = vec3(0.0);
        for (int i = 0; i < 6; i++) {
          float a = float(i) * 1.0472;
          halo += emit(texture(uState, g + vec2(cos(a), sin(a)) * tx * 7.0).y);
        }
        light += halo * 0.06;
        light *= uExposure * 5.0;
        // Glowing things are lit from inside: add, then roll off to white.
        col = col * (1.0 - 0.6 * clamp(light.r, 0.0, 1.0)) + (vec3(1.0) - exp(-light));

        col = mix(under, col, uSlide.y);
        fragColor = vec4(finish(col, uvS, p), 1.0);
      }`;

export class SlowBurnAnimation extends PixiAnimation<typeof MANIFEST> {
  private pp: PingPong | null = null;
  private failed = false;
  private sprite: PIXI.Sprite | null = null;
  private texture: PIXI.Texture | null = null;
  private maskTx: WebGLTexture | null = null;

  private time = 0;
  private acc = 0;
  private seedKey = '';
  private reduced = false;
  private rect: [number, number, number, number] = [0, 0, 1, 1];
  /** Where a match goes if nobody holds one: low on the first letter. */
  private wick: { ci: number; cj: number } = { ci: 0, cj: 0 };
  private fittedAt = 0;
  private autoLit = false;
  /** When the fire is expected to be out, by distance over the slowest front. */
  private outAt = Infinity;
  private pendingIgnite: { ci: number; cj: number } | null = null;
  private lastMouse: { x: number; y: number } | null = null;
  private drawKey = '';
  private pace = 1;

  constructor(initialControls?: Partial<SlowBurnControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.time = 0;
    this.acc = 0;
    this.seedKey = '';
    this.drawKey = '';
    this.lastMouse = null;
    // Kick the font load so the mask is ready as early as possible.
    phraseMask(DEFAULT_PHRASE);
  }

  /** Fit a fresh sheet. False until the font is in. */
  private seed(
    pp: PingPong,
    controls: SlowBurnControlValues,
    sw: number,
    sh: number
  ): boolean {
    const phrase = controls.phrase.trim() || DEFAULT_PHRASE;
    const mask = phraseMask(phrase);
    if (!mask) return false;

    this.rect = letterbox(mask.width, mask.height, sw, sh, controls.textScale);
    const aspect = sw / sh;
    const gw = Math.round(Math.sqrt(CELLS * aspect));
    const gh = Math.round(gw / aspect);
    const letters = maskToGrid(mask, gw, gh, controls.textScale);

    const data = new Float32Array(gw * gh * 4);
    let wick: { ci: number; cj: number } | null = null;
    for (let i = 0; i < gw && !wick; i++) {
      for (let j = 0; j < gh; j++) {
        if (letters[i + j * gw] > 0.6) {
          // A few cells in and up, so the match is on ink and not its edge.
          wick = { ci: i + 3, cj: j + 3 };
          break;
        }
      }
    }
    this.wick = wick ?? { ci: gw / 2, cj: gh / 2 };
    for (let k = 0; k < gw * gh; k++) data[k * 4] = Math.max(letters[k], PAPER);
    pp.initState(gw, gh, data);
    this.maskTx = uploadMask(pp.gl, mask, 1, this.maskTx);

    this.reduced = prefersReducedMotion();
    this.fittedAt = this.time;
    this.autoLit = false;
    this.outAt = Infinity;
    this.pendingIgnite = null;
    return true;
  }

  private light(pp: PingPong, at: { ci: number; cj: number }): void {
    this.pendingIgnite = at;
    // The fire is out when its slowest front has reached the furthest corner.
    const far = Math.max(
      Math.hypot(at.ci, at.cj),
      Math.hypot(pp.sw - at.ci, at.cj),
      Math.hypot(at.ci, pp.sh - at.cj),
      Math.hypot(pp.sw - at.ci, pp.sh - at.cj)
    );
    const out = this.time + (far / PAPER_SPEED + EMBER_TAIL) / this.pace;
    // A second match only ever brings the end forward.
    this.outAt = Math.min(this.outAt, out);
  }

  onUpdate(
    app: PIXI.Application,
    controls: SlowBurnControlValues,
    deltaTime: number
  ): void {
    if (this.failed) return;
    if (!this.pp) {
      const pp = PingPong.create({
        simFrag: SIM_FRAG,
        dispFrag: DISP_FRAG,
        // The ember reaction takes 0.002 a step off a value near 0.5.
        fullPrecision: true,
        simUniforms: ['uIgnite', 'uFan'],
        dispUniforms: [
          'uTex',
          'uTime',
          'uRes',
          'uRect',
          'uGrain',
          'uStage',
          'uInk',
          'uOrange',
          'uSun',
          'uCream',
          'uGrid',
          'uExposure',
          'uSlide',
        ],
      });
      if (!pp) {
        this.failed = true;
        return;
      }
      this.pp = pp;
    }
    const pp = this.pp;

    const dt = Math.min(0.05, deltaTime);
    this.time += dt;
    this.pace = controls.pace;
    const sw = app.screen.width;
    const sh = app.screen.height;

    const phrase = controls.phrase.trim() || DEFAULT_PHRASE;
    const seedKey = `${phrase}|${sw}|${sh}|${controls.textScale}`;
    const spent = this.time > this.outAt + controls.refit;
    if (seedKey !== this.seedKey || spent) {
      if (!this.seed(pp, controls, sw, sh)) return;
      this.seedKey = seedKey;
    }

    if (!this.sprite) {
      this.texture = PIXI.Texture.from(pp.canvas);
      this.sprite = new PIXI.Sprite(this.texture);
      this.getRoot().addChild(this.sprite);
    }

    // ---- matches and moving air
    const toCell = (x: number, y: number) => ({
      ci: (x / sw) * pp.sw,
      cj: (1 - y / sh) * pp.sh,
    });
    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        this.light(pp, toCell(c.x, c.y));
      }
    }
    const sinceFit = this.time - this.fittedAt;
    if (
      controls.autoIgnite &&
      !this.reduced &&
      !this.autoLit &&
      sinceFit > 0.8
    ) {
      this.autoLit = true;
      if (this.outAt === Infinity) this.light(pp, this.wick);
    }

    let fan: [number, number, number, number] = [0, 0, 1, 0];
    const m = pointer?.mouse;
    if (m?.active && dt > 0) {
      if (this.lastMouse) {
        const speed =
          Math.hypot(m.x - this.lastMouse.x, m.y - this.lastMouse.y) / dt;
        // Air moves with the hand: a still cursor fans nothing.
        const k =
          controls.wind *
          2 *
          Math.min(1, speed / 700) *
          (this.reduced ? REDUCED_INPUT_SCALE : 1);
        const at = toCell(m.x, m.y);
        fan = [at.ci, at.cj, pp.sh * 0.09, k];
      }
      this.lastMouse = { x: m.x, y: m.y };
    } else {
      this.lastMouse = null;
    }

    // ---- the fit: slide up and fade in, or just fade under reduced motion
    const fitDur = this.reduced ? 0.2 : 0.4;
    const e = easeOut(Math.min(1, sinceFit / fitDur));
    const dpr = this.dpr ?? Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(2, Math.round(sw * dpr));
    const H = Math.max(2, Math.round(sh * dpr));
    const slidePx = this.reduced ? 0 : (1 - e) * SLIDE * H;

    // ---- asleep: fitted, not alight, nothing the picture needs has changed
    const key = [
      this.seedKey,
      this.fittedAt,
      W,
      H,
      PAL.ink,
      PAL.bright,
      PAL.sun,
      PAL.cream,
      controls.exposure,
    ].join('|');
    const alight = this.time < this.outAt && this.outAt !== Infinity;
    const still =
      sinceFit > fitDur + 0.1 &&
      !alight &&
      !this.pendingIgnite &&
      fan[3] === 0 &&
      !controls.grain;
    if (still && key === this.drawKey) return;
    this.drawKey = still ? key : '';

    if (pp.canvas.width !== W || pp.canvas.height !== H) {
      pp.canvas.width = W;
      pp.canvas.height = H;
      this.texture?.source.resize(W, H);
    }
    this.sprite.width = sw;
    this.sprite.height = sh;

    // ---- fixed step
    this.acc = Math.min(this.acc + dt * controls.pace, 3 / SPS);
    while (this.acc >= 1 / SPS) {
      this.acc -= 1 / SPS;
      const ig = this.pendingIgnite;
      this.pendingIgnite = null;
      pp.step((gl, L) => {
        gl.uniform3f(L.uIgnite!, ig?.ci ?? 0, ig?.cj ?? 0, ig ? 3 : 0);
        gl.uniform4f(L.uFan!, fan[0], fan[1], fan[2], fan[3]);
      });
    }

    pp.display(W, H, (gl, L) => {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.maskTx);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(L.uTex!, 1);
      gl.uniform1f(L.uTime!, this.time);
      gl.uniform2f(L.uRes!, W, H);
      gl.uniform1f(L.uGrain!, controls.grain ? 1 : 0);
      gl.uniform1f(L.uStage!, 1);
      const [rx, ry, rw, rh] = this.rect;
      gl.uniform4f(L.uRect!, rx * dpr, ry * dpr, rw * dpr, rh * dpr);
      gl.uniform2f(L.uGrid!, pp.sw, pp.sh);
      gl.uniform1f(L.uExposure!, controls.exposure);
      gl.uniform2f(L.uSlide!, slidePx, e);
      setColor(gl, L.uInk!, PAL.ink);
      setColor(gl, L.uOrange!, PAL.bright);
      setColor(gl, L.uSun!, PAL.sun);
      setColor(gl, L.uCream!, PAL.cream);
    });
    this.texture?.source.update();
  }

  onDestroy(): void {
    if (this.pp && this.maskTx) this.pp.gl.deleteTexture(this.maskTx);
    this.maskTx = null;
    this.pp?.destroy();
    this.pp = null;
    this.failed = false;
    this.sprite = null;
    this.texture?.destroy(true);
    this.texture = null;
    super.onDestroy();
  }
}

export function createSlowBurnAnimation(
  initialControls?: Partial<SlowBurnControlValues>
): SlowBurnAnimation {
  return new SlowBurnAnimation(initialControls);
}
