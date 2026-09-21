import * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { PRE, phraseMask, setColor } from '../shared/shader-harness';
import { PingPong } from '../shared/ping-pong';
import { letterbox, uploadMask } from '../shared/mask-grid';
import {
  REDUCED_INPUT_SCALE,
  prefersReducedMotion,
} from '../shared/reduced-motion';
import {
  CP2,
  CS2,
  G,
  NU,
  SLEEP_AFTER,
  SPS,
  W2,
  drop,
  makeGel,
} from './aspic.sim';

const DEFAULT_PHRASE = 'SHIPPING NOW';

const MANIFEST = createManifest({
  id: 'aspic',
  name: 'Aspic (GLSL)',
  description:
    'A heading set in a slab of gel and dropped on a plate. The slab is a small grid of displacements under linear elasticity, with its base pinned, so it lands, sways from the top at about 3 Hz, and is still again in a little over a second. Compression travels faster than shear: poke the first letter and a pressure pulse reaches the last one a quarter of a second later, ahead of the wobble. The highlight and the density of the gel are read off the strain. Drag a finger through it; click to flick it. At rest it stops drawing.',
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
      min: 0.4,
      max: 0.85,
      step: 0.05,
      defaultValue: 0.7,
      debug: true,
    },
    {
      name: 'wobble',
      type: 'number',
      label: 'Wobble',
      min: 0.3,
      max: 2,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'finger',
      type: 'number',
      label: 'Finger Radius',
      min: 0.04,
      max: 0.25,
      step: 0.01,
      defaultValue: 0.12,
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
      label: 'Stage',
      options: [
        { value: 1, label: 'Ink stage, amber gel' },
        { value: 0, label: 'Orange stage, clear gel' },
      ],
      defaultValue: 1,
      debug: true,
    },
  ],
} as const);

export type AspicControlValues = ManifestToControlValues<typeof MANIFEST>;

/** Sim grid width; the height follows the slab's aspect. */
const GRID_W = 96;
/** The slab is the type block grown by this much of its height, all round. */
const SLAB_PAD = 0.16;
/** Pointer speed is capped here, cells/step, so a wild sweep cannot tear it. */
const FINGER_CAP = 0.3;

const f = (n: number) => n.toFixed(8);

/** A port of `stepGel`. Constants are interpolated, never retyped. */
const SIM_FRAG = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform sampler2D uState;
    // Finger: a capsule from uFrom to uTo (cells), radius uFinger.x, gripping
    // the gel toward velocity uFingerV at rate uFinger.y per step.
    uniform vec2 uFrom;
    uniform vec2 uTo;
    uniform vec2 uFinger;
    uniform vec2 uFingerV;
    // Flick: an impulse under a gaussian, for one step.
    uniform vec4 uFlick;
    uniform float uFlickR;
    ivec2 sz;
    vec4 S(ivec2 q) { return texelFetch(uState, clamp(q, ivec2(0), sz - 1), 0); }
    void main() {
      sz = textureSize(uState, 0);
      ivec2 q = ivec2(gl_FragCoord.xy);
      // The base sits on the plate.
      if (q.y == 0) { fragColor = vec4(0.0); return; }
      vec4 c = S(q);
      vec4 l4 = S(q + ivec2(-1, 0)), r4 = S(q + ivec2(1, 0));
      vec4 d4 = S(q + ivec2(0, -1)), u4 = S(q + ivec2(0, 1));
      vec2 l = l4.xy, r = r4.xy, d = d4.xy, u = u4.xy;
      vec2 a = S(q + ivec2(1, 1)).xy, b = S(q + ivec2(-1, 1)).xy;
      vec2 e = S(q + ivec2(1, -1)).xy, g = S(q + ivec2(-1, -1)).xy;
      vec2 dxx = l + r - 2.0 * c.xy;
      vec2 dyy = d + u - 2.0 * c.xy;
      vec2 dxy = (a - b - e + g) * 0.25;
      vec2 lapV = l4.zw + r4.zw + d4.zw + u4.zw - 4.0 * c.zw;
      float K = ${f(CP2 - CS2)};
      vec2 acc = ${f(CS2)} * (dxx + dyy)
               + K * vec2(dxx.x + dxy.y, dxy.x + dyy.y)
               - ${f(W2)} * c.xy - ${f(G)} * c.zw
               + ${f(NU)} * lapV;
      vec2 v = c.zw + acc;

      vec2 pos = vec2(q) + 0.5;
      if (uFinger.y > 0.0) {
        vec2 ab = uTo - uFrom;
        float t = clamp(dot(pos - uFrom, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
        float dist = length(pos - (uFrom + ab * t));
        float w = exp(-(dist * dist) / (uFinger.x * uFinger.x));
        v += (uFingerV - v) * (uFinger.y * w);
      }
      if (uFlickR > 0.0) {
        vec2 dd = pos - uFlick.xy;
        v += uFlick.zw * exp(-dot(dd, dd) / (uFlickR * uFlickR));
      }
      fragColor = vec4(c.xy + v, v);
    }`;

const DISP_FRAG =
  PRE +
  `
      uniform sampler2D uState;
      uniform vec4 uSlab;   // x, y, w, h in framebuffer px, y down
      uniform vec2 uGrid;   // sim cells

      // Distance to the slab's rounded outline, in slab-height units, in the
      // gel's own (undeformed) coordinates. Negative inside.
      float slabSdf(vec2 m, float asp) {
        vec2 q = abs((m - 0.5) * vec2(asp, 1.0)) - vec2(asp, 1.0) * 0.5 + 0.11;
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.11;
      }

      void main() {
        vec2 uvS = vec2(vUV.x, 1.0 - vUV.y);
        vec2 p = uvS * uRes;
        float asp = uSlab.z / uSlab.w;
        vec2 sp = (p - uSlab.xy) / uSlab.zw;
        vec2 suv = vec2(sp.x, 1.0 - sp.y);

        // Everything below is read off this one field.
        vec4 st = texture(uState, suv);
        // Displacement in slab uv. The grid's y runs up, the stage's down.
        vec2 U = vec2(st.x / uGrid.x, -st.y / uGrid.y);
        // The material point now sitting under this pixel, to first order.
        vec2 m = sp - U;

        // Strain over a three-cell baseline: the shading follows the swell
        // and ignores the chop.
        vec2 tx = 1.5 / uGrid;
        vec2 L = texture(uState, suv - vec2(tx.x, 0.0)).xy;
        vec2 R = texture(uState, suv + vec2(tx.x, 0.0)).xy;
        vec2 B = texture(uState, suv - vec2(0.0, tx.y)).xy;
        vec2 T = texture(uState, suv + vec2(0.0, tx.y)).xy;
        // Volume strain: squeezed gel is denser and bulges toward the eye.
        float dv = (R.x - L.x) / 3.0 + (T.y - B.y) / 3.0;

        float sd = slabSdf(m, asp);
        float inside = smoothstep(0.004, -0.004, sd);

        bool amber = uStage > 0.5;
        vec3 ground = amber ? uInk : uOrange;
        ground *= 0.95 + 0.05 * fbm(uvS * 3.0);

        // The plate, and the slab's contact shadow on it, which leans with
        // the top of the gel.
        float sway = texture(uState, vec2(0.5, 0.95)).x / uGrid.x;
        float by = (sp.y - 1.0) * uSlab.w / uSlab.z;
        float bx = (sp.x - 0.5 - sway * 0.35);
        float plate = smoothstep(0.012, 0.0, abs(by - 0.012)) * smoothstep(0.62, 0.56, abs(bx));
        float shade = exp(-max(by, 0.0) * 26.0) * smoothstep(0.6, 0.35, abs(bx)) * step(0.0, by);
        ground = mix(ground, ground * 0.45, shade * 0.8);
        ground = mix(ground, uCream, plate * 0.55);

        // A pillow of a surface, plus the bulge the strain raises on it.
        // A superellipse dome rather than a bevel off the outline's distance
        // field: that field creases along the diagonals, and a crease reads
        // as moulded plastic.
        vec2 mc = abs(m * 2.0 - 1.0);
        float dome = sqrt(max((1.0 - pow(mc.x, 5.0)) * (1.0 - pow(mc.y, 3.5)), 0.0));
        float edge = clamp(-sd / 0.2, 0.0, 1.0);
        float h = dome * 0.5 - dv * 2.4;
        // dFdy runs up the window; the height field is laid out down the stage.
        vec3 n = normalize(
          vec3(-dFdx(h) * uSlab.w * 1.3, dFdy(h) * uSlab.w * 1.3, 1.0));
        vec3 key = normalize(vec3(-0.45, -0.7, 0.55));
        float spec = pow(max(dot(n, normalize(key + vec3(0.0, 0.0, 1.0))), 0.0), 60.0);
        float lamb = 0.62 + 0.38 * max(dot(n, key), 0.0);

        // The type hangs at half depth, so the surface above it refracts it.
        vec2 tm = m + n.xy * 0.012;
        vec2 luv = (uSlab.xy + tm * uSlab.zw - uRect.xy) / uRect.zw;
        float type = maskA(luv);

        float dens = clamp(1.0 + dv * 2.2, 0.55, 1.6);
        vec3 body = amber ? mix(uOrange, uSun, 0.25 + 0.45 * dome) : mix(uCream, uSun, 0.18);
        body *= lamb * mix(1.0, 0.72, clamp(dens - 1.0, 0.0, 1.0));
        // Thin at the rim, so the ground shows through it there.
        float thick = mix(0.55, 0.9, edge);
        vec3 gel = mix(ground, body, thick * (amber ? 0.9 : 0.72));
        vec3 ink = amber ? uCream : uInk;
        gel = mix(gel, ink * (0.9 + 0.1 * lamb), type * 0.96);
        gel += spec * (amber ? vec3(1.0, 0.93, 0.8) : vec3(1.0)) * 0.85;
        // Meniscus: a bright line just inside the outline.
        gel += smoothstep(0.03, 0.0, abs(sd + 0.018)) * 0.16;

        vec3 col = mix(ground, gel, inside);
        fragColor = vec4(finish(col, uvS, p), 1.0);
      }`;

interface Flick {
  ci: number;
  cj: number;
  fx: number;
  fy: number;
}

export class AspicAnimation extends PixiAnimation<typeof MANIFEST> {
  private pp: PingPong | null = null;
  private failed = false;
  private sprite: PIXI.Sprite | null = null;
  private texture: PIXI.Texture | null = null;
  private maskTx: WebGLTexture | null = null;

  private time = 0;
  private acc = 0;
  /** What the sim was last seeded for: phrase, stage size, text scale. */
  private seedKey = '';
  private reduced = false;
  /** Slab and type rects in CSS px, y down. */
  private slab: [number, number, number, number] = [0, 0, 1, 1];
  private rect: [number, number, number, number] = [0, 0, 1, 1];
  private lastCell: { ci: number; cj: number } | null = null;
  private lastDir: [number, number] = [0, -1];
  private lastInput = 0;
  private drawKey = '';

  constructor(initialControls?: Partial<AspicControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.time = 0;
    this.acc = 0;
    this.seedKey = '';
    this.lastCell = null;
    this.drawKey = '';
    // Kick the font load so the mask is ready as early as possible.
    phraseMask(DEFAULT_PHRASE);
  }

  /** (Re)build the slab around the phrase and drop it. False until the font is in. */
  private seed(
    pp: PingPong,
    controls: AspicControlValues,
    sw: number,
    sh: number
  ): boolean {
    const phrase = controls.phrase.trim() || DEFAULT_PHRASE;
    const mask = phraseMask(phrase);
    if (!mask) return false;

    const [x, y, w, h] = letterbox(
      mask.width,
      mask.height,
      sw,
      sh,
      controls.textScale
    );
    const pad = h * SLAB_PAD;
    this.rect = [x, y, w, h];
    this.slab = [x - pad, y - pad, w + pad * 2, h + pad * 2];

    const gw = GRID_W;
    const gh = Math.max(
      24,
      Math.min(160, Math.round((gw * this.slab[3]) / this.slab[2]))
    );
    const gel = makeGel(gw, gh);
    this.reduced = prefersReducedMotion();
    // 0.2 cells/step lands with the top swaying about three cells: a few
    // percent of the slab's height, which is what reads as a wobble.
    if (!this.reduced) drop(gel, 0.2 * controls.wobble);

    const data = new Float32Array(gw * gh * 4);
    for (let k = 0; k < gw * gh; k++) {
      data[k * 4] = gel.ux[k];
      data[k * 4 + 1] = gel.uy[k];
      data[k * 4 + 2] = gel.vx[k];
      data[k * 4 + 3] = gel.vy[k];
    }
    pp.initState(gw, gh, data);
    this.maskTx = uploadMask(pp.gl, mask, 1, this.maskTx);
    this.lastInput = this.time;
    this.lastCell = null;
    return true;
  }

  onUpdate(
    app: PIXI.Application,
    controls: AspicControlValues,
    deltaTime: number
  ): void {
    if (this.failed) return;
    if (!this.pp) {
      const pp = PingPong.create({
        simFrag: SIM_FRAG,
        dispFrag: DISP_FRAG,
        // An integrator: see PingPongOptions.fullPrecision.
        fullPrecision: true,
        simUniforms: [
          'uFrom',
          'uTo',
          'uFinger',
          'uFingerV',
          'uFlick',
          'uFlickR',
        ],
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
          'uSlab',
          'uGrid',
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
    const sw = app.screen.width;
    const sh = app.screen.height;

    const phrase = controls.phrase.trim() || DEFAULT_PHRASE;
    const seedKey = `${phrase}|${sw}|${sh}|${controls.textScale}`;
    if (seedKey !== this.seedKey) {
      if (!this.seed(pp, controls, sw, sh)) return;
      this.seedKey = seedKey;
    }

    if (!this.sprite) {
      this.texture = PIXI.Texture.from(pp.canvas);
      this.sprite = new PIXI.Sprite(this.texture);
      this.getRoot().addChild(this.sprite);
    }

    // ---- input, in sim cells
    const input = (this.reduced ? REDUCED_INPUT_SCALE : 1) * controls.wobble;
    const [sx, sy, sWid, sHei] = this.slab;
    const toCell = (px: number, py: number) => ({
      ci: ((px - sx) / sWid) * pp.sw,
      cj: (1 - (py - sy) / sHei) * pp.sh,
    });

    let flick: Flick | null = null;
    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        const at = toCell(c.x, c.y);
        flick = {
          ...at,
          fx: this.lastDir[0] * 0.55 * input,
          fy: this.lastDir[1] * 0.55 * input,
        };
        this.lastInput = this.time;
      }
    }

    const m = pointer?.mouse;
    let from = { ci: -99, cj: -99 };
    let to = from;
    let fingerV: [number, number] = [0, 0];
    let grip = 0;
    if (m?.active) {
      const cell = toCell(m.x, m.y);
      const onSlab =
        cell.ci > -4 &&
        cell.ci < pp.sw + 4 &&
        cell.cj > -4 &&
        cell.cj < pp.sh + 4;
      if (onSlab && this.lastCell && dt > 0) {
        // Cells per sim step.
        let vx = (cell.ci - this.lastCell.ci) / (dt * SPS);
        let vy = (cell.cj - this.lastCell.cj) / (dt * SPS);
        const sp = Math.hypot(vx, vy);
        if (sp > 1e-4) {
          this.lastDir = [vx / sp, vy / sp];
          if (sp > FINGER_CAP) {
            vx *= FINGER_CAP / sp;
            vy *= FINGER_CAP / sp;
          }
          from = this.lastCell;
          to = cell;
          fingerV = [vx * input, vy * input];
          grip = 0.12;
          this.lastInput = this.time;
        }
      }
      this.lastCell = onSlab ? cell : null;
    } else {
      this.lastCell = null;
    }

    // ---- asleep: the gel has rung down and nothing the picture needs changed
    const dpr = this.dpr ?? Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(2, Math.round(sw * dpr));
    const H = Math.max(2, Math.round(sh * dpr));
    const key = [
      this.seedKey,
      W,
      H,
      PAL.ink,
      PAL.bright,
      PAL.sun,
      PAL.cream,
      controls.stage,
    ].join('|');
    const still =
      this.time - this.lastInput > SLEEP_AFTER + 0.4 && !controls.grain;
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
    this.acc = Math.min(this.acc + dt, 12 / SPS);
    const fingerR = controls.finger * pp.sh;
    let first = true;
    while (this.acc >= 1 / SPS) {
      this.acc -= 1 / SPS;
      const fl = first ? flick : null;
      first = false;
      pp.step((gl, L) => {
        gl.uniform2f(L.uFrom!, from.ci, from.cj);
        gl.uniform2f(L.uTo!, to.ci, to.cj);
        gl.uniform2f(L.uFinger!, fingerR, grip);
        gl.uniform2f(L.uFingerV!, fingerV[0], fingerV[1]);
        gl.uniform4f(
          L.uFlick!,
          fl?.ci ?? 0,
          fl?.cj ?? 0,
          fl?.fx ?? 0,
          fl?.fy ?? 0
        );
        gl.uniform1f(L.uFlickR!, fl ? fingerR * 1.8 : 0);
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
      gl.uniform1f(L.uStage!, Number(controls.stage));
      const [rx, ry, rw, rh] = this.rect;
      gl.uniform4f(L.uRect!, rx * dpr, ry * dpr, rw * dpr, rh * dpr);
      gl.uniform4f(L.uSlab!, sx * dpr, sy * dpr, sWid * dpr, sHei * dpr);
      gl.uniform2f(L.uGrid!, pp.sw, pp.sh);
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

export function createAspicAnimation(
  initialControls?: Partial<AspicControlValues>
): AspicAnimation {
  return new AspicAnimation(initialControls);
}
