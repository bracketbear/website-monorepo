import * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import {
  PRE,
  phraseMask,
  phraseMetricsOf,
  setColor,
} from '../shared/shader-harness';
import { PingPong } from '../shared/ping-pong';
import { alphaToGrid, letterbox, uploadMask } from '../shared/mask-grid';
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
  bodiesOf,
  drop,
  insideDistance,
  makeGel,
} from './aspic.sim';

const DEFAULT_PHRASE = 'SHIPPING NOW';

const MANIFEST = createManifest({
  id: 'aspic',
  name: 'Aspic (GLSL)',
  description:
    'The heading turned out of a jelly mould. Every letter is its own body of gel under linear elasticity, standing on its plate along its foot with its other edges free: it drops, sways from the base at about 3 Hz, and is still again in a little over a second. Compression travels faster than shear, so a pressure pulse crosses a letter ahead of its wobble, and letters that do not touch cannot feel each other. The highlight and the density of the gel are read off the strain. Drag a finger through a letter; click to flick it. At rest it stops drawing.',
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
      max: 0.9,
      step: 0.05,
      defaultValue: 0.75,
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
      min: 0.02,
      max: 0.15,
      step: 0.01,
      defaultValue: 0.06,
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

/** Sim cells across the type block. */
const GRID_W = 200;
/** Cells each letter is grown by to make its hull; the field is padded by this too. */
const MARGIN = 5;
/** Cells from the edge at which the gel's dome reaches full height. */
const DOME_CELLS = 7;
/** Rows above a baseline that are held to the plate. */
const FOOT = 1.5;
/** Pointer speed is capped here, cells/step, so a wild sweep cannot tear it. */
const FINGER_CAP = 0.45;
/** At most this many lines get a plate drawn; phraseMask breaks to four. */
const MAX_PLATES = 4;

const f = (n: number) => n.toFixed(8);

/**
 * A port of `stepGel`. State: xy = u, zw = v. The domain texture carries
 * the hull in R and the pinned cells in G; a neighbour outside the hull
 * reads as the cell itself, which is a free edge.
 */
const SIM_FRAG = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform sampler2D uState;
    uniform sampler2D uDomain;
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
    bool gel(ivec2 q) {
      if (any(lessThan(q, ivec2(0))) || any(greaterThanEqual(q, sz))) return false;
      return texelFetch(uDomain, q, 0).r > 0.5;
    }
    vec4 S(ivec2 q, vec4 self) { return gel(q) ? texelFetch(uState, q, 0) : self; }
    void main() {
      sz = textureSize(uState, 0);
      ivec2 q = ivec2(gl_FragCoord.xy);
      vec2 dom = texelFetch(uDomain, q, 0).rg;
      // Air, or the foot on the plate: nothing moves.
      if (dom.r < 0.5 || dom.g > 0.5) { fragColor = vec4(0.0); return; }
      vec4 c = texelFetch(uState, q, 0);
      vec4 l4 = S(q + ivec2(-1, 0), c), r4 = S(q + ivec2(1, 0), c);
      vec4 d4 = S(q + ivec2(0, -1), c), u4 = S(q + ivec2(0, 1), c);
      vec2 l = l4.xy, r = r4.xy, d = d4.xy, u = u4.xy;
      vec2 a = S(q + ivec2(1, 1), c).xy, b = S(q + ivec2(-1, 1), c).xy;
      vec2 e = S(q + ivec2(1, -1), c).xy, g = S(q + ivec2(-1, -1), c).xy;
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
      uniform sampler2D uDomain;
      uniform vec4 uField;   // the sim grid's rect, framebuffer px, y down
      uniform vec2 uGrid;    // sim cells
      uniform vec4 uPlates[${MAX_PLATES}]; // x0, x1, baseline y, cap-top y; px
      uniform int uPlateN;

      // How far under the surface a material point of the stroke is, 0 at
      // the edge and 1 a few cells in. A ring of taps most of a cell out,
      // so neither the bilinear facets nor the crease a distance field has
      // down the middle of a stroke reach the normal: a jelly's top is
      // rounded, not ridged.
      float section(vec2 m) {
        vec2 uv = vec2(m.x, 1.0 - m.y);
        vec2 e = 0.8 / uGrid;
        float s = texture(uDomain, uv).b * 2.0;
        for (int i = 0; i < 8; i++) {
          float a = float(i) * 0.7853982;
          s += texture(uDomain, uv + vec2(cos(a), sin(a)) * e).b;
        }
        return s / 10.0;
      }

      void main() {
        vec2 uvS = vec2(vUV.x, 1.0 - vUV.y);
        vec2 p = uvS * uRes;
        vec2 sp = (p - uField.xy) / uField.zw;
        vec2 suv = vec2(sp.x, 1.0 - sp.y);

        // Everything below is read off this one field.
        vec4 st = texture(uState, suv);
        // Displacement in field uv. The grid's y runs up, the stage's down.
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
        float dv = (R.x - L.x) / 3.0 + (T.y - B.y) / 3.0;

        bool amber = uStage > 0.5;
        vec3 ground = amber ? themeDark() : uOrange;
        ground *= 0.95 + 0.05 * fbm(uvS * 3.0);

        // The plates, one under each line, and the contact shadow each
        // letter throws, leaning with the top of the line.
        for (int i = 0; i < ${MAX_PLATES}; i++) {
          if (i >= uPlateN) break;
          vec4 pl = uPlates[i];
          vec2 probe = (vec2((pl.x + pl.y) * 0.5, pl.w) - uField.xy) / uField.zw;
          float sway = texture(uState, vec2(probe.x, 1.0 - probe.y)).x / uGrid.x * uField.z;
          float h = uRect.w;
          float by = (p.y - pl.z) / h;
          float inX = smoothstep(0.0, 0.03 * h, p.x - pl.x + h * 0.06) * smoothstep(0.0, 0.03 * h, pl.y + h * 0.06 - p.x);
          float plate = smoothstep(0.012, 0.004, abs(by - 0.012)) * inX;
          ground = mix(ground, uCream, plate * 0.45);
          // Shadow: the letter's own silhouette, squashed, just below it.
          vec2 shUV = (vec2(p.x - sway * 0.6, pl.z - (p.y - pl.z) * 2.2) - uRect.xy) / uRect.zw;
          float sh = maskA(shUV) * exp(-max(by, 0.0) * 22.0) * step(0.0, by);
          ground = mix(ground, ground * 0.4, sh * 0.85);
        }

        // The letter: sampled where its material has moved to.
        vec2 luv = (uField.xy + m * uField.zw - uRect.xy) / uRect.zw;
        float type = maskA(luv);
        vec3 col = ground;
        if (type > 0.002) {
          float sec = section(m);
          // A pillow of a surface: a dome over the stroke's cross-section,
          // plus the bulge the strain raises on it.
          float dome = 1.0 - (1.0 - sec) * (1.0 - sec);
          float hgt = dome * 0.5 - dv * 2.4;
          // dFdy runs up the window; the height field is laid out down the stage.
          vec3 n = normalize(vec3(-dFdx(hgt) * uRect.w * 0.7, dFdy(hgt) * uRect.w * 0.7, 1.0));
          vec3 key = normalize(vec3(-0.45, -0.7, 0.55));
          float spec = pow(max(dot(n, normalize(key + vec3(0.0, 0.0, 1.0))), 0.0), 34.0);
          float lamb = 0.72 + 0.28 * max(dot(n, key), 0.0);

          float dens = clamp(1.0 + dv * 2.2, 0.55, 1.6);
          vec3 body = amber
            ? mix(uOrange, uSun, 0.3 + 0.5 * dome) * 1.08
            : mix(uCream, uSun, 0.1 + 0.12 * dome);
          body *= lamb * mix(1.0, 0.72, clamp(dens - 1.0, 0.0, 1.0));
          // Thin at the rim, so the ground shows through it there.
          float thick = mix(0.45, 0.94, smoothstep(0.0, 0.5, dome));
          vec3 gel = mix(ground, body, thick * (amber ? 0.94 : 0.82));
          gel += spec * (amber ? vec3(1.0, 0.93, 0.8) : vec3(1.0)) * 0.9;
          // Meniscus: a bright line just inside the outline.
          gel += smoothstep(0.1, 0.0, abs(dome - 0.22)) * 0.16;
          col = mix(ground, gel, type);
        }
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
  private domainTx: WebGLTexture | null = null;

  private time = 0;
  private acc = 0;
  /** What the sim was last seeded for: phrase, stage size, text scale. */
  private seedKey = '';
  private reduced = false;
  /** Type block and sim field rects in CSS px, y down. */
  private rect: [number, number, number, number] = [0, 0, 1, 1];
  private field: [number, number, number, number] = [0, 0, 1, 1];
  /** Per line: x0, x1, baseline y, cap-top y, in CSS px. */
  private plates: number[] = [];
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

  /** (Re)build the letters as bodies and drop them. False until the font is in. */
  private seed(
    pp: PingPong,
    controls: AspicControlValues,
    sw: number,
    sh: number
  ): boolean {
    const phrase = controls.phrase.trim() || DEFAULT_PHRASE;
    const mask = phraseMask(phrase);
    const metrics = mask && phraseMetricsOf(mask);
    if (!mask || !metrics) return false;

    const [x, y, w, h] = letterbox(
      mask.width,
      mask.height,
      sw,
      sh,
      controls.textScale
    );
    this.rect = [x, y, w, h];
    // Cells are square; the field is the block plus a margin all round.
    const cell = w / GRID_W;
    const gw = GRID_W + 2 * MARGIN;
    const gh = Math.round(h / cell) + 2 * MARGIN;
    const pad = MARGIN * cell;
    this.field = [x - pad, y - pad, gw * cell, gh * cell];

    // The letters on the grid, drawn where the block sits inside the field.
    const cv = document.createElement('canvas');
    cv.width = gw;
    cv.height = gh;
    const g = cv.getContext('2d', { willReadFrequently: true })!;
    g.imageSmoothingQuality = 'high';
    g.drawImage(mask, MARGIN, MARGIN, GRID_W, gh - 2 * MARGIN);
    const letters = alphaToGrid(g.getImageData(0, 0, gw, gh).data, gw, gh);

    // Baselines, in grid rows (row 0 at the bottom) and in CSS px.
    const s = w / mask.width;
    const rows = metrics.baselines.map(
      (b) => gh - 1 - (MARGIN + (b * s) / cell)
    );
    const capRows = (metrics.capHeight * metrics.size * s) / cell;
    this.plates = [];
    metrics.baselines.slice(0, MAX_PLATES).forEach((b, i) => {
      const [x0, x1] = metrics.extents[i];
      this.plates.push(
        x + x0 * s,
        x + x1 * s,
        y + b * s,
        y + (b - metrics.capHeight * metrics.size) * s
      );
    });

    const body = bodiesOf(letters, gw, gh, MARGIN, rows, FOOT);
    const gel = makeGel(gw, gh, body);
    this.reduced = prefersReducedMotion();
    if (!this.reduced) {
      // Each cell stands on the plate of the nearest baseline at or below
      // it; a cell in the margin under a baseline belongs to that line too.
      const height = (k: number) => {
        const j = Math.floor(k / gw);
        let base = -Infinity;
        for (const r of rows) if (r - MARGIN <= j && r > base) base = r;
        if (base === -Infinity) base = rows[rows.length - 1];
        return (j - base) / capRows;
      };
      drop(gel, 0.2 * controls.wobble, height);
    }

    const data = new Float32Array(gw * gh * 4);
    for (let k = 0; k < gw * gh; k++) {
      data[k * 4] = gel.ux[k];
      data[k * 4 + 1] = gel.uy[k];
      data[k * 4 + 2] = gel.vx[k];
      data[k * 4 + 3] = gel.vy[k];
    }
    pp.initState(gw, gh, data);

    // The domain, as a texture the sim reads: hull in R, pinned in G.
    // ...and the letter's cross-section in B, which the display reads
    // bilinearly for the dome. The sim fetches texels, so filtering it does
    // not touch the sim.
    const dist = insideDistance(letters, gw, gh, DOME_CELLS);
    const dom = new Uint8Array(gw * gh * 4);
    for (let k = 0; k < gw * gh; k++) {
      dom[k * 4] = body.hull[k] ? 255 : 0;
      dom[k * 4 + 1] = body.pinned[k] ? 255 : 0;
      dom[k * 4 + 2] = Math.round((255 * dist[k]) / DOME_CELLS);
      dom[k * 4 + 3] = 255;
    }
    const gl = pp.gl;
    this.domainTx = this.domainTx ?? gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.domainTx);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gw,
      gh,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      dom
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.activeTexture(gl.TEXTURE0);
    this.maskTx = uploadMask(gl, mask, 2, this.maskTx);

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
          'uDomain',
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
          'uDomain',
          'uField',
          'uGrid',
          'uPlates[0]',
          'uPlateN',
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
    const [fx, fy, fw, fh] = this.field;
    const toCell = (px: number, py: number) => ({
      ci: ((px - fx) / fw) * pp.sw,
      cj: (1 - (py - fy) / fh) * pp.sh,
    });

    let flick: Flick | null = null;
    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        const at = toCell(c.x, c.y);
        flick = {
          ...at,
          fx: this.lastDir[0] * 0.7 * input,
          fy: this.lastDir[1] * 0.7 * input,
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
      const onField =
        cell.ci > -4 &&
        cell.ci < pp.sw + 4 &&
        cell.cj > -4 &&
        cell.cj < pp.sh + 4;
      if (onField && this.lastCell && dt > 0) {
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
      this.lastCell = onField ? cell : null;
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
    const fingerR = (controls.finger * this.rect[3]) / (fh / pp.sh);
    let first = true;
    while (this.acc >= 1 / SPS) {
      this.acc -= 1 / SPS;
      const fl = first ? flick : null;
      first = false;
      pp.step((gl, L) => {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.domainTx);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(L.uDomain!, 1);
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
      gl.bindTexture(gl.TEXTURE_2D, this.domainTx);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.maskTx);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(L.uDomain!, 1);
      gl.uniform1i(L.uTex!, 2);
      gl.uniform1f(L.uTime!, this.time);
      gl.uniform2f(L.uRes!, W, H);
      gl.uniform1f(L.uGrain!, controls.grain ? 1 : 0);
      gl.uniform1f(L.uStage!, Number(controls.stage));
      const [rx, ry, rw, rh] = this.rect;
      gl.uniform4f(L.uRect!, rx * dpr, ry * dpr, rw * dpr, rh * dpr);
      gl.uniform4f(L.uField!, fx * dpr, fy * dpr, fw * dpr, fh * dpr);
      gl.uniform2f(L.uGrid!, pp.sw, pp.sh);
      const plates = new Float32Array(MAX_PLATES * 4);
      this.plates.forEach((v, i) => {
        plates[i] = v * dpr;
      });
      gl.uniform4fv(L['uPlates[0]']!, plates);
      gl.uniform1i(L.uPlateN!, Math.min(MAX_PLATES, this.plates.length / 4));
      setColor(gl, L.uInk!, PAL.ink);
      setColor(gl, L.uOrange!, PAL.bright);
      setColor(gl, L.uSun!, PAL.sun);
      setColor(gl, L.uCream!, PAL.cream);
    });
    this.texture?.source.update();
  }

  onDestroy(): void {
    if (this.pp) {
      if (this.maskTx) this.pp.gl.deleteTexture(this.maskTx);
      if (this.domainTx) this.pp.gl.deleteTexture(this.domainTx);
    }
    this.maskTx = null;
    this.domainTx = null;
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
