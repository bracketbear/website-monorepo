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
  ALPHA,
  GAMMA,
  RHO,
  SPS,
  THETA,
  WARM_DECAY,
  makeFrost,
} from './frostLine.sim';

const DEFAULT_PHRASE = 'THE WORK';

const MANIFEST = createManifest({
  id: 'frost-line',
  name: 'Frost Line (GLSL)',
  description:
    'A heading that freezes onto a cold pane. The letters hold water vapour; ice starts at scattered sites on their edges, and a tip that reaches further into the vapour collects faster and leaves its neighbours starved. That is the Mullins–Sekerka instability, and it is the only reason there are feathers. They run to depletion in a second or two, then a slow feed of humidity fills the letter in behind them. Ice that froze fast froze dense, so the feathers stay visible as ridges in the finished letter. The cursor is a warm fingertip: drag to melt a line, click for a palm, and watch the patch refreeze from different vapour into a different grain.',
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
      defaultValue: 0.82,
      debug: true,
    },
    {
      name: 'speed',
      type: 'number',
      label: 'Growth Speed',
      min: 0.25,
      max: 3,
      step: 0.25,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'finger',
      type: 'number',
      label: 'Fingertip',
      min: 0.02,
      max: 0.15,
      step: 0.01,
      defaultValue: 0.05,
      debug: true,
    },
    {
      name: 'sparkle',
      type: 'number',
      label: 'Sparkle',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.6,
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
        { value: 1, label: 'Ink stage' },
        { value: 0, label: 'Orange stage' },
      ],
      defaultValue: 1,
      debug: true,
    },
  ],
} as const);

export type FrostLineControlValues = ManifestToControlValues<typeof MANIFEST>;

/**
 * Sim cells, spent on the type block and not the stage around it. Few enough
 * that a cell is about three pixels: a feather is a few dozen cells long, and
 * it has to be long enough on screen to be seen as one.
 */
const CELLS = 70000;
/** Hex rows are this much shorter than the cells are wide. */
const ROW = 0.866;
/** The grid is the type block grown by this fraction of its size, all round. */
const PAD = 0.03;
/** Seconds from the last disturbance until the letter is full and still. */
const SETTLE = 13;

const f = (n: number) => n.toFixed(8);

/**
 * A port of `stepFrost`. State: x ice, y water (−1 outside the letter, so
 * the sim needs no mask of its own), z steps since freezing, w warmth.
 */
const SIM_FRAG = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform sampler2D uState;
    // A warm fingertip: a capsule from uFrom to uTo, radius uMelt (cells).
    uniform vec2 uFrom;
    uniform vec2 uTo;
    uniform float uMelt;
    ivec2 sz;
    vec4 S(ivec2 q) {
      if (any(lessThan(q, ivec2(0))) || any(greaterThanEqual(q, sz))) return vec4(0.0, -1.0, 0.0, 0.0);
      return texelFetch(uState, q, 0);
    }
    // The six neighbours on the offset-row hex lattice.
    ivec2 nb(ivec2 q, int n) {
      int s = (q.y & 1) == 1 ? 1 : -1;
      if (n == 0) return q + ivec2(-1, 0);
      if (n == 1) return q + ivec2(1, 0);
      if (n == 2) return q + ivec2(0, -1);
      if (n == 3) return q + ivec2(0, 1);
      if (n == 4) return q + ivec2(s, -1);
      return q + ivec2(s, 1);
    }
    bool receptive(ivec2 q, vec4 c) {
      if (c.y < 0.0 || c.x > 0.5 || c.w > 0.1) return false;
      for (int n = 0; n < 6; n++) if (S(nb(q, n)).x > 0.5) return true;
      return false;
    }
    void main() {
      sz = textureSize(uState, 0);
      ivec2 q = ivec2(gl_FragCoord.xy);
      vec4 c = S(q);
      // Outside the letter there is nothing to do.
      if (c.y < 0.0) { fragColor = c; return; }

      float ice = c.x, w = c.y, age = c.z, warm = c.w;
      if (ice < 0.5) {
        bool rk = receptive(q, c);
        float a = ${f(ALPHA / 12)};
        for (int n = 0; n < 6; n++) {
          ivec2 mq = nb(q, n);
          vec4 m = S(mq);
          // Ice and the warm room outside the letter are walls.
          if (m.y < 0.0 || m.x > 0.5) continue;
          bool rm = receptive(mq, m);
          if (rk) { if (!rm) w += a * m.y; }
          else if (rm) w -= a * c.y;
          else w += a * (m.y - c.y);
        }
        // Humidity reaches the whole pane, as vapour.
        w += ${f(GAMMA)};
        if (rk && w >= ${f(THETA)}) { ice = 1.0; age = 0.0; }
      } else {
        age += 1.0;
      }
      warm *= ${f(WARM_DECAY)};

      if (uMelt > 0.0) {
        vec2 pos = vec2(q) + 0.5;
        vec2 ab = uTo - uFrom;
        float t = clamp(dot(pos - uFrom, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
        if (length(pos - (uFrom + ab * t)) <= uMelt) {
          // Melted, and most of the meltwater gone into the room.
          ice = 0.0; age = 0.0; warm = 1.0;
          w = min(w, ${f(RHO)});
        }
      }
      fragColor = vec4(ice, w, age, warm);
    }`;

const DISP_FRAG =
  PRE +
  `
      uniform sampler2D uState;
      uniform vec4 uField;   // the sim grid's rect, framebuffer px, y down
      uniform vec2 uGrid;
      uniform float uSparkle;

      vec4 cell(ivec2 q) {
        return texelFetch(uState, clamp(q, ivec2(0), ivec2(uGrid) - 1), 0);
      }
      // One row of the hex lattice, interpolated along x. Odd rows sit half a
      // cell to the right. Cells outside the letter (water < 0) carry no
      // weight, so the ice runs cleanly up to the glyph's own edge and is
      // not blended away against the empty cells beyond it. Returns the
      // weighted sum in xyz (ice, water, age), warmth folded into age's
      // place is not needed: w holds the weight.
      void rowAt(int j, float gx, float wy, inout vec4 sum, inout float warm, inout float wsum) {
        float x = gx * uGrid.x - 0.5 - (((j & 1) == 1) ? 0.5 : 0.0);
        float i0 = floor(x);
        float fx = x - i0;
        for (int k = 0; k < 2; k++) {
          vec4 c = cell(ivec2(int(i0) + k, j));
          float w = (k == 0 ? 1.0 - fx : fx) * wy * step(0.0, c.y);
          sum += vec4(c.xyz, 0.0) * w;
          warm += c.w * w;
          wsum += w;
        }
      }
      vec4 field(vec2 g) {
        float y = g.y * uGrid.y - 0.5;
        float j0 = floor(y);
        float fy = y - j0;
        vec4 sum = vec4(0.0);
        float warm = 0.0, wsum = 0.0;
        rowAt(int(j0), g.x, 1.0 - fy, sum, warm, wsum);
        rowAt(int(j0) + 1, g.x, fy, sum, warm, wsum);
        if (wsum < 1e-4) return vec4(0.0);
        return vec4(sum.xyz, warm) / wsum;
      }

      void main() {
        vec2 uvS = vec2(vUV.x, 1.0 - vUV.y);
        vec2 p = uvS * uRes;
        bool inkStage = uStage > 0.5;
        vec3 ground = inkStage ? uInk : uOrange;
        ground *= 0.94 + 0.06 * fbm(uvS * 3.0);

        vec2 luv = (p - uRect.xy) / uRect.zw;
        float m = maskA(luv);
        vec2 g = (p - uField.xy) / uField.zw;
        g.y = 1.0 - g.y;

        vec3 col = ground;
        if (m > 0.002 && g.x > 0.0 && g.x < 1.0 && g.y > 0.0 && g.y < 1.0) {
          vec4 s = field(g);
          float ice = s.x;
          float vapour = max(s.y, 0.0) * (1.0 - ice);
          // Breath on the glass: the letter is legible from the first frame,
          // and the fog thins where the feathers have drunk it.
          float fog = clamp(vapour / ${f(RHO)}, 0.0, 1.4) * 0.16;
          // Ice that froze fast froze dense. The excess over THETA is a
          // permanent record of the growth rate: high along the feathers,
          // almost nothing in the sinter that filled in behind them.
          float ridge = clamp((s.y - ${f(THETA)}) * 14.0, 0.0, 1.0) * ice;
          // Fresh ice fades up over a quarter of a second, not in one frame.
          float born = clamp(s.z / ${f(SPS * 0.25)}, 0.0, 1.0);
          float thick = ice * born * (0.7 + 0.3 * ridge);
          // Meltwater: a wet, dark, slightly glossy patch while it is warm.
          float wet = s.w * (1.0 - ice);

          vec3 n = normalize(vec3(-dFdx(thick) * 26.0, dFdy(thick) * 26.0, 1.0));
          vec3 key = normalize(vec3(-0.5, -0.65, 0.57));
          float lamb = 0.9 + 0.1 * max(dot(n, key), 0.0);
          // Facets: each cell has its own tilt, and a few of them catch the key.
          vec2 cid = floor(g * uGrid);
          vec3 facet = normalize(n + (vec3(hash21(cid), hash21(cid + 17.0), 0.5) - 0.5) * 1.1);
          float glint = pow(max(dot(facet, normalize(key + vec3(0.0, 0.0, 1.0))), 0.0), 160.0);

          // Sinter is a translucent glaze; the feathers are the opaque white.
          vec3 iceCol = mix(mix(ground, uCream, 0.66), uCream * 1.04, ridge) * lamb;
          iceCol += (uSun * 0.35 + vec3(0.65)) * glint * uSparkle * (0.4 + 0.6 * ridge) * 1.6;
          vec3 inLetter = ground + uCream * fog;
          inLetter = mix(inLetter, ground * 0.7 + uCream * 0.06, wet * 0.8);
          inLetter = mix(inLetter, iceCol, clamp(thick * 1.25, 0.0, 1.0));
          col = mix(ground, inLetter, m);
        }
        fragColor = vec4(finish(col, uvS, p), 1.0);
      }`;

export class FrostLineAnimation extends PixiAnimation<typeof MANIFEST> {
  private pp: PingPong | null = null;
  private failed = false;
  private sprite: PIXI.Sprite | null = null;
  private texture: PIXI.Texture | null = null;
  private maskTx: WebGLTexture | null = null;

  private time = 0;
  private acc = 0;
  private seedKey = '';
  private reduced = false;
  /** Steps still to run unseen, under reduced motion, before the first draw. */
  private preroll = 0;
  /** Type block and sim grid rects in CSS px, y down. */
  private rect: [number, number, number, number] = [0, 0, 1, 1];
  private fieldRect: [number, number, number, number] = [0, 0, 1, 1];
  private lastCell: { ci: number; cj: number } | null = null;
  private lastInput = 0;
  private drawKey = '';

  constructor(initialControls?: Partial<FrostLineControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.time = 0;
    this.acc = 0;
    this.seedKey = '';
    this.lastCell = null;
    this.drawKey = '';
    this.preroll = 0;
    // Kick the font load so the mask is ready as early as possible.
    phraseMask(DEFAULT_PHRASE);
  }

  /** Lay the vapour into the letters and nucleate the edges. False until the font is in. */
  private seed(
    pp: PingPong,
    controls: FrostLineControlValues,
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
    this.rect = [x, y, w, h];
    this.fieldRect = [
      x - w * PAD,
      y - h * PAD,
      w * (1 + 2 * PAD),
      h * (1 + 2 * PAD),
    ];

    // Cells are dx wide and ROW·dx tall, and there are CELLS of them.
    const aspect = this.fieldRect[2] / this.fieldRect[3];
    const gw = Math.round(Math.sqrt(CELLS * aspect * ROW));
    const gh = Math.round(gw / aspect / ROW);
    // The padding is the same fraction both ways, so the mask fits exactly.
    // Rasterized at twice the columns, because odd hex rows sit half a cell
    // to the right and have to be sampled there: sample every row on the
    // same columns and each vertical edge of the type comes out as a
    // sawtooth, a cell and a half tall.
    //
    // Any cell the letter touches is cold, not just those it half covers.
    // That overshoots the glyph by up to a cell, and the display trims it
    // back with the full-resolution mask.
    const fine = maskToGrid(mask, gw, gh, 1 / (1 + 2 * PAD), 2);
    const cold = new Float32Array(gw * gh);
    for (let j = 0; j < gh; j++) {
      const o = j & 1;
      for (let i = 0; i < gw; i++) {
        const a = fine[Math.min(gw * 2 - 1, 2 * i + o) + j * gw * 2];
        const b = fine[Math.min(gw * 2 - 1, 2 * i + 1 + o) + j * gw * 2];
        cold[i + j * gw] = (a + b) / 2 >= 0.06 ? 1 : 0;
      }
    }
    const frost = makeFrost(cold, gw, gh, {
      seed: 1 + Math.floor(Math.random() * 1e6),
    });

    const data = new Float32Array(gw * gh * 4);
    for (let k = 0; k < gw * gh; k++) {
      data[k * 4] = frost.ice[k];
      data[k * 4 + 1] = cold[k] >= 0.5 ? frost.water[k] : -1;
    }
    pp.initState(gw, gh, data);
    this.maskTx = uploadMask(pp.gl, mask, 1, this.maskTx);

    this.reduced = prefersReducedMotion();
    // Less motion means arriving already frozen: grow it unseen.
    this.preroll = this.reduced ? Math.round(SETTLE * 0.8 * SPS) : 0;
    this.lastInput = this.time;
    this.lastCell = null;
    return true;
  }

  onUpdate(
    app: PIXI.Application,
    controls: FrostLineControlValues,
    deltaTime: number
  ): void {
    if (this.failed) return;
    if (!this.pp) {
      const pp = PingPong.create({
        simFrag: SIM_FRAG,
        dispFrag: DISP_FRAG,
        // The sinter adds 0.004 to a value near 0.5 every step.
        fullPrecision: true,
        simUniforms: ['uFrom', 'uTo', 'uMelt'],
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
          'uField',
          'uGrid',
          'uSparkle',
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

    // ---- the fingertip, in sim cells
    const [fx, fy, fw, fh] = this.fieldRect;
    const m = this.pointer?.mouse;
    let from = { ci: -99, cj: -99 };
    let to = from;
    let melt = 0;
    const size =
      controls.finger * pp.sh * (this.reduced ? REDUCED_INPUT_SCALE * 2 : 1);
    const clicks = this.pointer?.clicks;
    let palm = false;
    while (clicks?.length) {
      clicks.shift();
      palm = true;
    }
    if (m?.active) {
      const cell = {
        ci: ((m.x - fx) / fw) * pp.sw,
        cj: (1 - (m.y - fy) / fh) * pp.sh,
      };
      const on =
        cell.ci > -size &&
        cell.ci < pp.sw + size &&
        cell.cj > -size &&
        cell.cj < pp.sh + size;
      if (on) {
        from = this.lastCell ?? cell;
        to = cell;
        // A click is a palm: the same warmth over a wider patch.
        melt = palm ? size * 2.6 : size;
        this.lastInput = this.time;
      }
      this.lastCell = on ? cell : null;
    } else {
      this.lastCell = null;
    }

    // ---- asleep: the letter is full and nothing the picture needs changed
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
      controls.sparkle,
    ].join('|');
    const still =
      this.preroll === 0 &&
      this.time - this.lastInput > SETTLE / controls.speed &&
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
    let steps = 0;
    if (this.preroll > 0) {
      steps = Math.min(this.preroll, 90);
      this.preroll -= steps;
    } else {
      this.acc = Math.min(this.acc + dt * controls.speed, 6 / SPS);
      while (this.acc >= 1 / SPS) {
        this.acc -= 1 / SPS;
        steps++;
      }
    }
    for (let i = 0; i < steps; i++) {
      // The fingertip is stamped once a frame, on the first step.
      const r = i === 0 ? melt : 0;
      pp.step((gl, L) => {
        gl.uniform2f(L.uFrom!, from.ci, from.cj);
        gl.uniform2f(L.uTo!, to.ci, to.cj);
        gl.uniform1f(L.uMelt!, r);
      });
    }
    // Growing unseen: hold the first picture until it is grown.
    if (this.preroll > 0) return;

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
      gl.uniform4f(L.uField!, fx * dpr, fy * dpr, fw * dpr, fh * dpr);
      gl.uniform2f(L.uGrid!, pp.sw, pp.sh);
      gl.uniform1f(L.uSparkle!, controls.sparkle);
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

export function createFrostLineAnimation(
  initialControls?: Partial<FrostLineControlValues>
): FrostLineAnimation {
  return new FrostLineAnimation(initialControls);
}
