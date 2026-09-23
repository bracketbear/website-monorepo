import * as PIXI from 'pixi.js';
import { createManifest, PAL } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import {
  PRE,
  phraseMask,
  phraseMetricsOf,
  setColor,
  type PhraseMetrics,
} from '../shared/shader-harness';
import { logoMask } from '../shared/logo';
import { distanceTransform } from '../shared/sdf-harness';
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
  NO_PLATE,
  NU,
  SLEEP_AFTER,
  SPS,
  W2,
  bodiesOf,
  landImpulse,
  lettersOf,
  makeGel,
  stepPlate,
  thump,
  type Gel,
  type Impulse,
} from './aspic.sim';

const DEFAULT_PHRASE = 'SHIPPING NOW';

const MANIFEST = createManifest({
  id: 'aspic',
  name: 'Aspic (GLSL)',
  description:
    'The heading — or the mark — turned out of a jelly mould, one letter at a time, in the flavour of your choice. Every letter is its own body of gel under linear elasticity, standing on its plate along its foot with its other edges free: it sways from the base at about 3 Hz and is still again in a couple of seconds. The plate is a body too, on a soft mat: it feels the traction at the feet and the pull of every jelly stuck to it, and its slide, dip and tilt go back into the gel through the feet. So a landing thumps the plate and the letters already standing shiver; a poke at one letter reaches the next through the plate, later and smaller, and never across air. The highlight and the density of the gel are read off the strain. Drag a finger through a letter; click to flick it. At rest it stops drawing.',
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
      name: 'subject',
      type: 'select',
      label: 'Subject',
      options: [
        { value: 'phrase', label: 'The phrase' },
        { value: 'logo', label: 'The mark, as one jelly' },
      ],
      defaultValue: 'phrase',
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
      // A multiplier on the plate's mass. Heavier, and the letters stop
      // hearing each other; lighter, and the plate is slaved to the jelly.
      name: 'plate',
      type: 'number',
      label: 'Plate Weight',
      min: 0.5,
      max: 4,
      step: 0.25,
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
      name: 'flavor',
      type: 'select',
      label: 'Flavour',
      options: [
        { value: 'amber', label: 'Amber (the palette)' },
        { value: 'clear', label: 'Clear' },
        { value: 'strawberry', label: 'Strawberry' },
        { value: 'lime', label: 'Lime' },
        { value: 'lemon', label: 'Lemon' },
        { value: 'grape', label: 'Grape' },
        { value: 'blue', label: 'Blue raspberry' },
      ],
      defaultValue: 'amber',
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

/**
 * A flavour of jelly: the colour deep in the body, the colour where it is
 * thin and the light comes through, how bright it reads, how opaque it is,
 * and how warm its highlight is. Amber and clear are made of the palette,
 * so they follow the theme; the rest are what the packet says.
 */
interface Flavor {
  deep: number | 'orange' | 'sun' | 'cream';
  thin: number | 'orange' | 'sun' | 'cream';
  gain: number;
  opacity: number;
  warm: number;
}

const FLAVORS: Record<string, Flavor> = {
  amber: { deep: 'orange', thin: 'sun', gain: 1.08, opacity: 0.94, warm: 1 },
  clear: { deep: 'cream', thin: 'sun', gain: 1, opacity: 0.82, warm: 0 },
  strawberry: {
    deep: 0x8a0f2c,
    thin: 0xff4d6d,
    gain: 1.12,
    opacity: 0.94,
    warm: 0.6,
  },
  lime: { deep: 0x2a7a1c, thin: 0x9cec3c, gain: 1.1, opacity: 0.92, warm: 0 },
  lemon: {
    deep: 0xc39b00,
    thin: 0xffe84a,
    gain: 1.12,
    opacity: 0.88,
    warm: 0.5,
  },
  grape: { deep: 0x3a175e, thin: 0xa563e8, gain: 1.1, opacity: 0.95, warm: 0 },
  blue: { deep: 0x123f95, thin: 0x4dbcff, gain: 1.1, opacity: 0.92, warm: 0 },
};

export type AspicControlValues = ManifestToControlValues<typeof MANIFEST>;

/** Sim cells across the type block. */
const GRID_W = 200;
/**
 * Cells each letter is grown by to make its hull; the field is padded by
 * this too. The elastic sway has to fit in it: the plate's own motion is
 * undone by the display, but a letter's lean over its plate is read from
 * the field, and past the hull there is none.
 */
const MARGIN = 7;
/** Rows above a baseline that are held to the plate. */
const FOOT = 1.5;
/** Pointer speed is capped here, cells/step, so a wild sweep cannot tear it. */
const FINGER_CAP = 0.45;
/** At most this many lines get a plate; phraseMask breaks to four. */
const MAX_PLATES = 4;
/** At most this many letters land separately; past that, neighbours land together. */
const MAX_BODIES = 32;
/**
 * Seconds a letter takes to fall onto its plate, and how far it falls: nine
 * tenths of a cap height, but never more than sixty cells, so the mark —
 * whose cap is its whole height — does not arrive at a speed that throws
 * its plate across the table.
 */
const FALL_T = 0.25;
const FALL_FRAC = 0.9;
const FALL_MAX_CELLS = 60;
/** Seconds between one letter landing and the next. */
const STAGGER = 0.055;
/** The lean a letter lands with, as a fraction of its speed. */
const LEAN = 0.6;

const f = (n: number) => n.toFixed(8);

/**
 * The stencil and the plates, shared by the sim and the reduction. The
 * domain texture carries the hull in R, the pinned cells in G, the
 * cross-section in B and the plate each cell stands on in A (255: none).
 * A neighbour outside the hull, or on another plate, reads as the cell
 * itself: a free edge.
 */
const GEL_GLSL = `
    uniform sampler2D uState;
    uniform sampler2D uDomain;
    uniform vec4 uPoseAcc[${MAX_PLATES}]; // what the plate gained in rate this step: slide, dip, tilt
    uniform vec4 uPivot[${MAX_PLATES}];   // centre column, baseline row, cap rows
    ivec2 sz;
    int plateOf(vec4 dom) { return int(dom.a * 255.0 + 0.5); }
    // The plate of the cell being stepped, for the free-edge test.
    int selfPlate;
    bool gel(ivec2 q) {
      if (any(lessThan(q, ivec2(0))) || any(greaterThanEqual(q, sz))) return false;
      vec4 d = texelFetch(uDomain, q, 0);
      return d.r > 0.5 && plateOf(d) == selfPlate;
    }
    vec4 S(ivec2 q, vec4 self) { return gel(q) ? texelFetch(uState, q, 0) : self; }
    // The field is over the plate's pose, so a cell riding a plate that
    // just gained speed feels the opposite as a force: the plate's rigid
    // acceleration at the cell.
    vec2 frameAccAt(int p, vec2 ij) {
      p = min(p, ${MAX_PLATES - 1});
      vec4 A = uPoseAcc[p], V = uPivot[p];
      return vec2(A.x - A.z * (ij.y - V.y), A.y + A.z * (ij.x - V.x));
    }
    // What the neighbours do to the cell at q: elastic traction and viscous drag.
    vec2 traction(ivec2 q, vec4 c) {
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
      return ${f(CS2)} * (dxx + dyy)
           + K * vec2(dxx.x + dxy.y, dxy.x + dyy.y)
           + ${f(NU)} * lapV;
    }`;

/** A port of `stepGel`. State: xy = u, zw = v. */
const SIM_FRAG = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    ${GEL_GLSL}
    // Finger: a capsule from uFrom to uTo (cells), radius uFinger.x, gripping
    // the gel toward velocity uFingerV at rate uFinger.y per step.
    uniform vec2 uFrom;
    uniform vec2 uTo;
    uniform vec2 uFinger;
    uniform vec2 uFingerV;
    // Flick: an impulse under a gaussian, for one step.
    uniform vec4 uFlick;
    uniform float uFlickR;
    // A letter landing: columns x0..x1 of plate uDropPlate, speed, lean.
    uniform vec4 uDrop;
    uniform int uDropPlate;
    void main() {
      sz = textureSize(uState, 0);
      ivec2 q = ivec2(gl_FragCoord.xy);
      vec4 dom = texelFetch(uDomain, q, 0);
      if (dom.r < 0.5) { fragColor = vec4(0.0); return; }
      int p = plateOf(dom);
      selfPlate = p;
      bool onPlate = p < ${MAX_PLATES};
      vec2 ij = vec2(q);
      // The foot on the plate goes where the plate goes: over the plate,
      // it does not move at all.
      if (dom.g > 0.5) { fragColor = vec4(0.0); return; }
      vec4 c = texelFetch(uState, q, 0);
      vec2 v = c.zw + traction(q, c) - ${f(W2)} * c.xy - ${f(G)} * c.zw;
      if (onPlate) v -= frameAccAt(p, ij);

      vec2 pos = ij + 0.5;
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
      if (uDrop.z > 0.0 && p == uDropPlate && ij.x >= uDrop.x && ij.x < uDrop.y) {
        // Faster the higher it stands: smoothstep in height over the cap.
        float t = clamp((ij.y - uPivot[p].y) / uPivot[p].z, 0.0, 1.0);
        float h = t * t * (3.0 - 2.0 * t);
        v += vec2(uDrop.z * uDrop.w * h, -uDrop.z * h);
      }
      fragColor = vec4(c.xy + v, v);
    }`;

/**
 * What the gel does to each plate: one column per fragment, one row per
 * plate. The feet pass on the traction from the body above them; the free
 * cells pull with the spring and the drag whose far end is the plate.
 * Out: force x, force y, torque about the pivot.
 */
const REDUCE_FRAG = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    ${GEL_GLSL}
    void main() {
      sz = textureSize(uState, 0);
      int i = int(gl_FragCoord.x);
      int p = int(gl_FragCoord.y);
      selfPlate = p;
      vec4 V = uPivot[p];
      vec3 acc = vec3(0.0);
      for (int j = 0; j < sz.y; j++) {
        ivec2 q = ivec2(i, j);
        vec4 dom = texelFetch(uDomain, q, 0);
        if (dom.r < 0.5 || plateOf(dom) != p) continue;
        vec4 c = texelFetch(uState, q, 0);
        vec2 ij = vec2(q);
        vec2 fr = dom.g > 0.5
          ? traction(q, c)
          : ${f(W2)} * c.xy + ${f(G)} * c.zw;
        acc += vec3(fr, (ij.x - V.x) * fr.y - (ij.y - V.y) * fr.x);
      }
      fragColor = vec4(acc, 0.0);
    }`;

/**
 * The display: a raymarch of the tableau. The world is in framebuffer px,
 * y down, z toward the viewer; every line stands on its own oval platter
 * on one table, the last line in front and each earlier one a platter
 * further back. A jelly is its line's ink extruded into depth with rounded
 * edges, and the point being tested is displaced by the field before the
 * ink is looked up — the same first-order material point as before, now
 * inside a march. A ray refracts in, runs to where it comes out, and what
 * it sees behind is absorbed over that length toward the flavour's deep
 * colour: thin edges pale, thick strokes deep. Strain still sets density.
 */
const DISP_FRAG =
  PRE +
  `
      uniform sampler2D uState;
      uniform sampler2D uDomain;
      uniform sampler2D uSdf;    // signed distance to the ink, in mask uv
      uniform vec4 uField;   // the sim grid's rect, framebuffer px, y down
      uniform vec2 uGrid;    // sim cells
      uniform vec4 uPlates[${MAX_PLATES}]; // x0, x1, baseline y, cap-top y; px
      uniform vec4 uPlatePose[${MAX_PLATES}]; // slide px, dip px (down), tilt, centre x px
      uniform int uPlateN;
      uniform vec4 uBodies[${MAX_BODIES}]; // x0, x1 (field uv), plate, landing time
      uniform int uBodyN;
      uniform float uSimT;
      uniform float uLastLand;
      uniform float uFallH;  // how far a letter falls, field uv
      uniform float uFallT;
      uniform float uPad;    // the hull margin, px
      uniform vec3 uGelDeep; // the flavour: colour deep in the body...
      uniform vec3 uGelThin; // ...and where it is thin
      uniform vec4 uGel;     // gain, opacity, warmth of the highlight, 0
      // The camera: eye, right, screen-down and forward, and the focal
      // length, px.
      uniform vec3 uEye;
      uniform vec3 uCamR;
      uniform vec3 uCamD;
      uniform vec3 uCamF;
      uniform float uFocal;
      // The tableau: jelly depth, edge radius, the table's y, the step in
      // depth from one platter to the one behind it.
      uniform vec4 uScene;
      // Framebuffer px per SDF px, and the mask's uv → SDF uv map.
      uniform float uSdfPx;
      uniform vec4 uSdfMap;

      const vec3 KEY = normalize(vec3(-0.45, -0.7, 0.55));

      // The letter of plate p over material column mx, on its way down:
      // 0 landed (or none), (0, 1] the share of its fall still to go,
      // -1 still in the mould.
      // Also hands back how far mx is from the edge of that body's
      // column, in field uv: the field changes there, so no step may
      // cross it.
      float falling(int p, float mx, out float edge) {
        edge = 1e5;
        if (uSimT >= uLastLand) return 0.0;
        for (int b = 0; b < ${MAX_BODIES}; b++) {
          if (b >= uBodyN) break;
          vec4 bd = uBodies[b];
          if (int(bd.z) != p || mx < bd.x || mx >= bd.y) continue;
          edge = min(mx - bd.x, bd.y - mx);
          float dl = bd.w - uSimT;
          return dl > uFallT ? -1.0 : max(dl, 0.0) / uFallT;
        }
        return 0.0;
      }

      // The field's displacement at a point of the sim's frame, px, and
      // whether that point is gel at all.
      vec2 dispAt(vec2 q, out bool gel) {
        vec2 sp = (q - uField.xy) / uField.zw;
        gel = false;
        if (any(lessThan(sp, vec2(0.0))) || any(greaterThan(sp, vec2(1.0)))) return vec2(0.0);
        vec2 suv = vec2(sp.x, 1.0 - sp.y);
        gel = texture(uDomain, suv).r > 0.5;
        vec4 st = texture(uState, suv);
        return vec2(st.x, -st.y) * (uField.zw / uGrid);
      }
      // Whose plate the cell under a material point stands on: an index,
      // so fetched, never filtered.
      int plateAt(vec2 m) {
        vec2 sp = (m - uField.xy) / uField.zw;
        if (any(lessThan(sp, vec2(0.0))) || any(greaterThan(sp, vec2(1.0)))) return 255;
        ivec2 c = ivec2(floor(vec2(sp.x, 1.0 - sp.y) * uGrid));
        return int(texelFetch(uDomain, c, 0).a * 255.0 + 0.5);
      }
      // The plate's rigid displacement at a material point of line i, px:
      // what the field is measured over.
      vec2 poseAt(int i, vec2 m) {
        vec4 ps = uPlatePose[i];
        return vec2(ps.x + ps.z * (m.y - uPlates[i].z), ps.y - ps.z * (m.x - ps.w));
      }
      // The material point of line i under a point of the sim's frame.
      // The plate's pose is undone first, as a rigid transform, so a slide
      // or a tilt never carries the letter past the hull its field lives
      // in; only the elastic residual is read from the field, and that is
      // small enough to stay inside the margin.
      // The field is over each cell's own plate, so it is small and
      // continuous everywhere, the seam between two lines included, and
      // it is read as it is.
      vec2 materialOf(int i, vec2 q) {
        vec2 m = q - poseAt(i, q);
        m = q - poseAt(i, m);
        bool gel;
        vec2 U = dispAt(m, gel);
        return gel ? m - U : m;
      }
      // Strain at a point of the sim's frame, over a three-cell baseline.
      float strainAt(vec2 q) {
        vec2 sp = (q - uField.xy) / uField.zw;
        vec2 suv = vec2(sp.x, 1.0 - sp.y);
        vec2 tx = 1.5 / uGrid;
        vec2 L = texture(uState, suv - vec2(tx.x, 0.0)).xy;
        vec2 R = texture(uState, suv + vec2(tx.x, 0.0)).xy;
        vec2 B = texture(uState, suv - vec2(0.0, tx.y)).xy;
        vec2 T = texture(uState, suv + vec2(0.0, tx.y)).xy;
        return (R.x - L.x) / 3.0 + (T.y - B.y) / 3.0;
      }
      // Signed distance to the ink at a material point, px.
      // Line i's own layer of the SDF.
      float inkDist(int i, vec2 m) {
        vec2 suv = (m - uRect.xy) / uRect.zw * uSdfMap.xy + uSdfMap.zw;
        vec2 c = clamp(suv, 0.0, 1.0);
        float outside = length((suv - c) / uSdfMap.xy * uRect.zw);
        float v = (c.y + float(i)) / float(uPlateN);
        return texture(uSdf, vec2(c.x, v)).r * uSdfPx + outside;
      }
      float zOf(int i) { return -float(uPlateN - 1 - i) * uScene.w; }
      // Line i stands with its baseline on the table: world y to sim y.
      float simYOf(int i, float y) { return y + (uPlates[i].z - uScene.z); }

      // The 2D ink of line i under world point p, with the arrival and the
      // line's own band of the mask. Also hands back the material point.
      // Line i's ink at a material point.
      float bandInk(int i, vec2 m) { return inkDist(i, m); }
      float lineInk(int i, vec3 p, out vec2 m) {
        vec2 q = vec2(p.x, simYOf(i, p.y));
        vec2 m0 = materialOf(i, q);
        m = m0;
        if (uSimT >= uLastLand) return bandInk(i, m0);
        // The letter over this column, where its fall has it...
        float edge;
        float qq = falling(i, (q.x - uField.x) / uField.z, edge);
        edge = max(edge * uField.z, 0.5);
        float d = 1e5;
        if (qq >= 0.0) {
          vec2 mf = m0 + vec2(0.0, uFallH * qq * qq * uField.w);
          d = bandInk(i, mf);
          m = mf;
        }
        // ...and a landed neighbour leaning into it.
        if (qq != 0.0) {
          float e2;
          if (falling(i, (m0.x - uField.x) / uField.z, e2) == 0.0) {
            float d0 = bandInk(i, m0);
            if (d0 < d) { d = d0; m = m0; }
          }
        }
        return min(d, edge);
      }
      // Line i as a body: the ink extruded in depth, edges rounded. Off
      // its slab the slab's own distance is a bound, and costs no taps.
      float jellyDist(int i, vec3 p, out vec2 m) {
        float r = uScene.y;
        float dz = abs(p.z - zOf(i)) - uScene.x * 0.5;
        if (dz > r + 2.0) { m = p.xy; return dz - r; }
        float d2 = lineInk(i, p, m);
        vec2 w = vec2(d2, dz) + r;
        return length(max(w, 0.0)) + min(max(w.x, w.y), 0.0) - r;
      }
      float jellyOnly(int i, vec3 p) { vec2 m; return jellyDist(i, p, m); }

      // Line i's platter: an oval, lying flat, where its pose puts it.
      float platterDist(int i, vec3 p) {
        vec4 pl = uPlates[i];
        vec4 ps = uPlatePose[i];
        float pad = uPad + 0.06 * uRect.w;
        float ax = (pl.y - pl.x) * 0.5 + pad;
        float az = uScene.w * 0.42;
        float th = 0.06 * uScene.x + 3.0;
        vec3 c = vec3(ps.w + ps.x, uScene.z + ps.y + th * 0.5, zOf(i));
        vec3 d = p - c;
        float cs = cos(ps.z), sn = sin(ps.z);
        d.xy = vec2(cs * d.x + sn * d.y, -sn * d.x + cs * d.y);
        float k = length(vec2(d.x / ax, d.z / az));
        float dr = (k - 1.0) * min(ax, az);
        float dy = abs(d.y) - th * 0.5;
        vec2 w = vec2(dr, dy);
        return length(max(w, 0.0)) + min(max(w.x, w.y), 0.0);
      }

      // The scene: id 0..3 a jelly, 10..13 a platter.
      float mapScene(vec3 p, out int id, out vec2 m) {
        float best = 1e6;
        id = -1;
        m = p.xy;
        for (int i = 0; i < ${MAX_PLATES}; i++) {
          if (i >= uPlateN) break;
          vec2 mi;
          float dj = jellyDist(i, p, mi);
          if (dj < best) { best = dj; id = i; m = mi; }
          float dp = platterDist(i, p);
          if (dp < best) { best = dp; id = 10 + i; }
        }
        return best;
      }
      float mapJelly(vec3 p) {
        float best = 1e6;
        for (int i = 0; i < ${MAX_PLATES}; i++) {
          if (i >= uPlateN) break;
          best = min(best, jellyOnly(i, p));
        }
        return best;
      }
      vec3 normalOf(int i, vec3 p) {
        vec2 e = vec2(1.0, -1.0) * (0.5 * uField.w / uGrid.y);
        return normalize(
          e.xyy * jellyOnly(i, p + e.xyy) + e.yyx * jellyOnly(i, p + e.yyx) +
          e.yxy * jellyOnly(i, p + e.yxy) + e.xxx * jellyOnly(i, p + e.xxx));
      }
      // How much of the key light reaches p: a short march toward it
      // through the jellies, which are translucent, so never quite dark.
      float lit(vec3 p) {
        float res = 1.0;
        float t = 2.0;
        float far = 3.0 * uScene.x + 2.0 * uRect.w;
        for (int k = 0; k < 20; k++) {
          float d = mapJelly(p + KEY * t);
          res = min(res, 8.0 * d / t);
          t += clamp(d, 3.0, 30.0);
          if (res < 0.02 || t > far) break;
        }
        return 0.3 + 0.7 * clamp(res, 0.0, 1.0);
      }

      // ---- what there is to see behind and around the jelly.
      vec3 groundCol() { return uStage > 0.5 ? themeDark() : uOrange; }
      // A sunset low behind the table: the light that comes through a
      // jelly is this.
      vec3 sky(vec3 rd) {
        vec3 g = groundCol();
        float up = clamp(-rd.y, 0.0, 1.0);
        float glow = exp(-up * 9.0);
        return g * (0.55 + 0.35 * up) + uSun * glow * 0.32 + uOrange * glow * glow * 0.18;
      }
      vec3 tableCol(vec3 p, bool shadowed) {
        vec3 g = groundCol();
        g *= 0.95 + 0.05 * fbm(p.xz * 0.004);
        float s = shadowed ? lit(p) : 1.0;
        float far = smoothstep(0.0, -3.0 * uRect.w, p.z);
        return mix(g * (0.85 + 0.15 * s), sky(vec3(0.0, 0.0, -1.0)), far * 0.5);
      }
      vec3 platterCol(vec3 p, bool shadowed) {
        float s = shadowed ? lit(p) : 1.0;
        return mix(uCream, uSun, 0.15) * 0.9 * (0.45 + 0.55 * s);
      }
      // What a ray from ro sees when it meets no jelly: a platter, the
      // table, or the sky.
      vec3 backdrop(vec3 ro, vec3 rd, bool shadowed) {
        float tableY = uScene.z + 0.06 * uScene.x + 3.0;
        float tTable = rd.y > 1e-4 ? (tableY - ro.y) / rd.y : 1e9;
        float t = 0.0;
        for (int k = 0; k < 24; k++) {
          vec3 p = ro + rd * t;
          float best = 1e6;
          for (int i = 0; i < ${MAX_PLATES}; i++) {
            if (i >= uPlateN) break;
            best = min(best, platterDist(i, p));
          }
          if (best < 0.6) return platterCol(p, shadowed);
          t += best;
          if (t > tTable) break;
        }
        if (tTable < 1e8) return tableCol(ro + rd * tTable, shadowed);
        return sky(rd);
      }

      // ---- the jelly itself.
      vec3 shadeJelly(int i, vec3 P, vec3 rd) {
        vec3 n = normalOf(i, P);
        vec3 V = -rd;
        float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
        // Compression makes it denser, and denser is darker.
        // Read where the material is, not where the plate carried it.
        float dv = strainAt(materialOf(i, vec2(P.x, simYOf(i, P.y))));
        float dens = clamp(1.0 + dv * 2.2, 0.55, 1.6);

        // In through the surface, and on to where it comes out: that
        // length is what the colour is made of.
        vec3 rr = refract(rd, n, 0.75);
        if (dot(rr, rr) < 1e-6) rr = reflect(rd, n);
        float t = 1.5;
        for (int k = 0; k < 20; k++) {
          float d = jellyOnly(i, P + rr * t);
          if (d > 0.4) break;
          t += max(-d, 1.0) * 0.7;
        }
        float thick = t;
        vec3 Q = P + rr * t;
        vec3 behind = backdrop(Q + rr * 1.0, rr, false);

        // Beer–Lambert toward the deep colour; the thin colour is what
        // scatters back out.
        // Coloured absorption toward the deep colour, plus a little
        // extinction that is the same in every channel: what a jelly
        // scatters rather than passes, so the platter shows through it
        // dimmed, not blazing.
        float path = thick / (0.55 * uScene.x) * dens;
        vec3 T = exp(-((vec3(1.0) - uGelDeep) + 0.45) * path);
        float a = 1.0 - exp(-path * 1.2);
        vec3 col = behind * T * mix(vec3(1.0), uGelThin, 0.45);
        col += uGelDeep * a * 0.55;
        col += uGelThin * a * 0.28;
        col *= uGel.x;
        // The key light over the surface, wrapped, since it glows.
        float dif = 0.5 + 0.5 * dot(n, KEY);
        col *= mix(0.78, 1.06, dif);
        col *= mix(1.0, 0.72, clamp(dens - 1.0, 0.0, 1.0));
        // Highlight and the sky in the surface.
        vec3 H = normalize(KEY + V);
        float spec = pow(max(dot(n, H), 0.0), 110.0) * (0.25 + 0.75 * fres);
        col += spec * mix(vec3(1.0), vec3(1.0, 0.93, 0.8), uGel.z) * 1.3;
        col += fres * sky(reflect(rd, n)) * 0.5;
        return col;
      }

      void main() {
        vec2 uvS = vec2(vUV.x, 1.0 - vUV.y);
        vec2 p = uvS * uRes;
        vec3 rd = normalize(uCamF * uFocal + uCamR * (p.x - uRes.x * 0.5) + uCamD * (p.y - uRes.y * 0.5));
        vec3 ro = uEye;

        // March the jellies and platters; the table and sky are behind.
        float tableY = uScene.z + 0.06 * uScene.x + 3.0;
        float tTable = rd.y > 1e-4 ? (tableY - ro.y) / rd.y : 1e9;
        float t = 0.0;
        int id = -1;
        vec3 col;
        bool hit = false;
        // The nearest a miss comes to a surface, in pixels at that
        // distance, for a soft silhouette. Only a distance under two px
        // is exact (the slab shortcut never returns less), and during the
        // arrival the column clamps would fake an edge, so not then.
        float nearPx = 1e9;
        float nearT = 0.0;
        int nearId = -1;
        bool aa = uSimT >= uLastLand;
        // A displaced field is not quite a distance field: its gradient
        // runs to one plus the strain, so the step is kept well short.
        // A ray that skims a surface — the top of a letter, seen from a
        // little above — closes on it slowly, and one that runs out of
        // steps while still within a couple of pixels of it counts as
        // having hit it, rather than falling through to the table.
        float lastD = 1e9;
        int lastId = -1;
        for (int k = 0; k < 160; k++) {
          vec3 q = ro + rd * t;
          int cid;
          vec2 cm;
          float d = mapScene(q, cid, cm);
          if (d < 0.5) { id = cid; hit = true; break; }
          if (aa && d < 2.0) {
            float dpx = d * uFocal / max(t, 1.0);
            if (dpx < nearPx) { nearPx = dpx; nearT = t; nearId = cid; }
          }
          lastD = d;
          lastId = cid;
          t += d * 0.7;
          if (t > tTable) break;
        }
        if (!hit && lastD < 2.5 && t <= tTable) { id = lastId; hit = true; }
        if (hit && t <= tTable) {
          vec3 P = ro + rd * t;
          col = id < 10 ? shadeJelly(id, P, rd) : platterCol(P, true);
        } else {
          col = tTable < 1e8 ? tableCol(ro + rd * tTable, true) : sky(rd);
          if (nearPx < 1.0 && nearId >= 0 && nearT < tTable) {
            vec3 P = ro + rd * nearT;
            vec3 edgeCol = nearId < 10 ? shadeJelly(nearId, P, rd) : platterCol(P, true);
            col = mix(col, edgeCol, 1.0 - nearPx);
          }
        }
        fragColor = vec4(finish(col, uvS, p), 1.0);
      }`;

/** The phrase's SDF is built at most this wide, with this much air around it. */
const SDF_MAX_W = 1024;
const SDF_PAD = 64;

/** IEEE half of a float, for the SDF upload. */
function f16(v: number): number {
  const f = new Float32Array([v]);
  const u = new Uint32Array(f.buffer)[0];
  const sign = (u >> 16) & 0x8000;
  let exp = ((u >> 23) & 0xff) - 127 + 15;
  let mant = u & 0x7fffff;
  if (exp <= 0) return sign;
  if (exp >= 31) return sign | 0x7c00;
  mant = mant >> 13;
  return sign | (exp << 10) | mant;
}

/**
 * The mask as signed distance fields, one layer per line, stacked down
 * one texture: in the mask's own pixels, negative inside, with SDF_PAD of
 * air all round so ink that touches the mask's edge ends there. The
 * bodies are extruded from these. Lines can be set touching, so a pixel
 * on a baseline may be the foot of one line or the top of the next: rows
 * that only one line's cap band covers are that line's, and the rest go
 * with the ink they touch — the rule the sim's cells follow, at the
 * mask's resolution. Sixteen bits, because the surface normal is the
 * gradient and eight would step.
 */
function uploadSdf(
  gl: WebGL2RenderingContext,
  mask: HTMLCanvasElement,
  lines: { baseline: number; cap: number }[],
  unit: number,
  into: WebGLTexture | null
): { tx: WebGLTexture; W: number; H: number; inner: [number, number] } {
  const iw = Math.min(SDF_MAX_W, mask.width);
  const ih = Math.round((mask.height * iw) / mask.width);
  const k = iw / mask.width;
  const W = iw + 2 * SDF_PAD;
  const H = ih + 2 * SDF_PAD;
  const n = W * H;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(mask, SDF_PAD, SDF_PAD, iw, ih);
  const px = g.getImageData(0, 0, W, H).data;
  const ink = new Uint8Array(n);
  for (let i = 0; i < n; i++) ink[i] = px[i * 4 + 3] > 127 ? 1 : 0;

  // Whose line each ink pixel is. Rows that only one line's cap band
  // covers are that line's; a pixel in rows two bands cover — the lines
  // set touching — goes to the line whose unambiguous ink is nearer.
  const owner = new Int8Array(n).fill(-1);
  const bands = lines.map((l) => [
    SDF_PAD + (l.baseline - l.cap) * k - 1,
    SDF_PAD + l.baseline * k + 1,
  ]);
  const covering = (y: number) =>
    bands
      .map((b, i) => (y >= b[0] && y <= b[1] ? i : -1))
      .filter((i) => i >= 0);
  let contested = false;
  for (let y = 0; y < H; y++) {
    const c = covering(y);
    for (let x = 0; x < W; x++) {
      const i = x + y * W;
      if (!ink[i]) continue;
      if (c.length === 1) owner[i] = c[0];
      else if (c.length === 0) {
        // Nearest baseline at or below, or the last line.
        let best = lines.length - 1;
        let bd = Infinity;
        bands.forEach((b, j) => {
          if (b[1] >= y && b[1] - y < bd) {
            bd = b[1] - y;
            best = j;
          }
        });
        owner[i] = best;
      } else contested = true;
    }
  }
  if (contested) {
    // A contested pixel goes to the line whose settled ink is nearer —
    // unless the other line's is within a couple of pixels too, in which
    // case it goes to neither: the lines stand on different platters at
    // different depths, and ink that touched on the page has no business
    // touching here. A sliver left on the wrong side would round into a
    // rod at the seam.
    const dist = lines.map((_, li) => {
      const seed = new Uint8Array(n);
      for (let i = 0; i < n; i++) seed[i] = owner[i] === li ? 1 : 0;
      return distanceTransform(seed, W, H, false);
    });
    for (let i = 0; i < n; i++) {
      if (!ink[i] || owner[i] >= 0) continue;
      let best = -1;
      let d1 = Infinity;
      let d2 = Infinity;
      dist.forEach((d, li) => {
        if (d[i] < d1) {
          d2 = d1;
          d1 = d[i];
          best = li;
        } else if (d[i] < d2) d2 = d[i];
      });
      owner[i] = d2 <= 2.5 ? -1 : best;
    }
  }

  const out = new Uint16Array(n * lines.length);
  const cap = 4 * SDF_PAD;
  const bin = new Uint8Array(n);
  lines.forEach((_, li) => {
    for (let i = 0; i < n; i++) bin[i] = ink[i] && owner[i] === li ? 1 : 0;
    const dIn = distanceTransform(bin, W, H, false);
    const dOut = distanceTransform(bin, W, H, true);
    for (let i = 0; i < n; i++) {
      // Half a pixel in, so the antialiased edge sits on the zero.
      const sd = bin[i] ? -dOut[i] + 0.5 : dIn[i] - 0.5;
      out[li * n + i] = f16(Math.max(-cap, Math.min(cap, sd)));
    }
  });
  const tx = into ?? gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.R16F,
    W,
    H * lines.length,
    0,
    gl.RED,
    gl.HALF_FLOAT,
    out
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.activeTexture(gl.TEXTURE0);
  return { tx, W, H, inner: [iw, ih] };
}

/**
 * The camera and the tableau, in framebuffer px. The lines stand on the
 * table one behind the other, the last line in front; the eye looks at
 * the front of the tableau from a little above, at a distance where one
 * world px is one screen px at the target, so the type keeps its size.
 */
interface Tableau {
  eye: [number, number, number];
  right: [number, number, number];
  down: [number, number, number];
  fwd: [number, number, number];
  focal: number;
  /** Jelly depth, edge radius, the table's y, the step in depth per line. */
  scene: [number, number, number, number];
}

const CAM_FOV = 28;
const CAM_ELEV = 16;

function tableauOf(
  plates: number[],
  rectH: number,
  capPx: number,
  pad: number,
  H: number
): Tableau {
  const n = plates.length / 4;
  const depth = 0.16 * capPx;
  const edge = 0.3 * depth;
  const tableY = plates[(n - 1) * 4 + 2];
  // Platters are ovals 0.42 of a step deep; a step leaves a gap between.
  const zStep = (depth * 1.3 + pad + 0.06 * rectH) / 0.42 + 0.25 * capPx;
  let x0 = Infinity;
  let x1 = -Infinity;
  for (let i = 0; i < n; i++) {
    x0 = Math.min(x0, plates[i * 4]);
    x1 = Math.max(x1, plates[i * 4 + 1]);
  }
  const target = [(x0 + x1) / 2, tableY - 0.45 * capPx, (-(n - 1) * zStep) / 2];
  const focal = H / 2 / Math.tan((CAM_FOV * Math.PI) / 360);
  const a = (CAM_ELEV * Math.PI) / 180;
  const eye: [number, number, number] = [
    target[0],
    target[1] - focal * Math.sin(a),
    target[2] + focal * Math.cos(a),
  ];
  const fwd: [number, number, number] = [0, Math.sin(a), -Math.cos(a)];
  // right = up × fwd with up = (0, -1, 0); screen-down = right × fwd.
  const right: [number, number, number] = [1, 0, 0];
  const down: [number, number, number] = [
    right[1] * fwd[2] - right[2] * fwd[1],
    right[2] * fwd[0] - right[0] * fwd[2],
    right[0] * fwd[1] - right[1] * fwd[0],
  ];
  return { eye, right, down, fwd, focal, scene: [depth, edge, tableY, zStep] };
}

/**
 * What stands on the plate: the phrase, set in Anton with its baselines
 * measured; or the mark, as one jelly on one plate, standing on its
 * bottom edge with the whole of its height for a cap. Null until the font
 * is in (the mark needs no font, but keeps the same shape of answer).
 */
function subjectOf(controls: AspicControlValues): {
  mask: HTMLCanvasElement | null;
  metrics: PhraseMetrics | null;
} {
  if (controls.subject === 'logo') {
    const mask = logoMask();
    return {
      mask,
      metrics: {
        size: mask.height,
        capHeight: 1,
        baselines: [mask.height],
        extents: [[0, mask.width]],
      },
    };
  }
  const mask = phraseMask(controls.phrase.trim() || DEFAULT_PHRASE);
  return { mask, metrics: mask && phraseMetricsOf(mask) };
}

/**
 * Which columns of a phrase mask carry ink on each line: the band from a
 * little above the cap height to a little below the baseline.
 */
function inkColumnsOfMask(
  mask: HTMLCanvasElement,
  baselines: number[],
  cap: number
): Uint8Array[] {
  const w = mask.width;
  const data = mask
    .getContext('2d', { willReadFrequently: true })!
    .getImageData(0, 0, w, mask.height).data;
  return baselines.map((b) => {
    const ink = new Uint8Array(w);
    const y0 = Math.max(0, Math.floor(b - cap * 1.05));
    const y1 = Math.min(mask.height - 1, Math.ceil(b + cap * 0.05));
    for (let y = y0; y <= y1; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(x + y * w) * 4 + 3] > 127) ink[x] = 1;
      }
    }
    return ink;
  });
}

interface Flick {
  ci: number;
  cj: number;
  fx: number;
  fy: number;
}

/** A letter due to land: which columns of which plate, at which step. */
interface Landing {
  plate: number;
  x0: number;
  x1: number;
  step: number;
  impulse: Impulse;
}

export class AspicAnimation extends PixiAnimation<typeof MANIFEST> {
  private pp: PingPong | null = null;
  private failed = false;
  private sprite: PIXI.Sprite | null = null;
  private texture: PIXI.Texture | null = null;
  private maskTx: WebGLTexture | null = null;
  private domainTx: WebGLTexture | null = null;
  private sdfTx: WebGLTexture | null = null;
  /** Framebuffer px per SDF px at dpr 1, and the mask's uv → SDF uv map. */
  private sdfPx = 1;
  private sdfMap: [number, number, number, number] = [1, 1, 0, 0];

  private time = 0;
  private acc = 0;
  /** Sim steps taken since the seed; the clock every landing is timed on. */
  private stepN = 0;
  /** What the sim was last seeded for: phrase, stage size, text scale. */
  private seedKey = '';
  private reduced = false;
  /** Type block and sim field rects in CSS px, y down. */
  private rect: [number, number, number, number] = [0, 0, 1, 1];
  private field: [number, number, number, number] = [0, 0, 1, 1];
  /** Per line: x0, x1, baseline y, cap-top y, in CSS px. */
  private plates: number[] = [];
  /** The geometry, and the plates the CPU integrates. */
  private gel: Gel | null = null;
  private capRows = 1;
  /** Letters still to land, in order. */
  private pending: Landing[] = [];
  private bodies = new Float32Array(MAX_BODIES * 4);
  private bodyN = 0;
  private lastLand = 0;
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
    this.stepN = 0;
    this.seedKey = '';
    this.lastCell = null;
    this.drawKey = '';
    // Kick the font load so the mask is ready as early as possible.
    phraseMask(DEFAULT_PHRASE);
  }

  /** (Re)build the letters as bodies and schedule their landing. False until the font is in. */
  private seed(
    pp: PingPong,
    controls: AspicControlValues,
    sw: number,
    sh: number
  ): boolean {
    const { mask, metrics } = subjectOf(controls);
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
    const baselines = metrics.baselines.slice(0, MAX_PLATES);
    const rows = baselines.map((b) => gh - 1 - (MARGIN + (b * s) / cell));
    this.capRows = (metrics.capHeight * metrics.size * s) / cell;
    this.plates = [];
    baselines.forEach((b, i) => {
      const [x0, x1] = metrics.extents[i];
      this.plates.push(
        x + x0 * s,
        x + x1 * s,
        y + b * s,
        y + (b - metrics.capHeight * metrics.size) * s
      );
    });

    const body = bodiesOf(letters, gw, gh, MARGIN, rows, FOOT, this.capRows);
    for (const pl of body.plates) {
      pl.mass *= controls.plate;
      pl.inertia *= controls.plate;
    }
    const gel = makeGel(gw, gh, body);
    this.gel = gel;
    this.reduced = prefersReducedMotion();
    this.stepN = 0;
    this.pending = [];
    this.bodyN = 0;
    this.lastLand = 0;
    if (!this.reduced) {
      // Each letter falls onto its plate in turn, left to right, line by
      // line. What its foot absorbs on contact is the plate's to carry.
      const height = (k: number) => {
        const p = gel.plateOf[k];
        if (p === NO_PLATE) return 0;
        return (Math.floor(k / gw) - rows[p]) / this.capRows;
      };
      const vImpact = (2 * this.fallCells()) / (FALL_T * SPS);
      const v = 0.2 * controls.wobble;
      // The runs of ink are read off the mask at its own resolution, since
      // Anton sets letters closer than a cell, and mapped back to cells.
      const runs = lettersOf(
        inkColumnsOfMask(mask, baselines, metrics.capHeight * metrics.size),
        mask.width,
        MAX_BODIES
      ).map((r) => ({
        plate: r.plate,
        x0: r.x0 === 0 ? 0 : MARGIN + (r.x0 / mask.width) * GRID_W,
        x1: r.x1 === mask.width ? gw : MARGIN + (r.x1 / mask.width) * GRID_W,
      }));
      runs.forEach((r, n) => {
        const t = FALL_T + n * STAGGER;
        this.pending.push({
          ...r,
          step: Math.round(t * SPS),
          impulse: landImpulse(gel, r, vImpact, v, height, LEAN),
        });
        this.bodies[n * 4] = r.x0 / gw;
        this.bodies[n * 4 + 1] = r.x1 / gw;
        this.bodies[n * 4 + 2] = r.plate;
        this.bodies[n * 4 + 3] = t;
        this.lastLand = t + 1 / SPS;
      });
      this.bodyN = runs.length;
    }

    pp.initState(gw, gh, new Float32Array(gw * gh * 4));

    // The domain, as a texture the sim reads: hull in R, pinned in G, and
    // the plate the cell stands on in A.
    const dom = new Uint8Array(gw * gh * 4);
    for (let k = 0; k < gw * gh; k++) {
      dom[k * 4] = body.hull[k] ? 255 : 0;
      dom[k * 4 + 1] = body.pinned[k] ? 255 : 0;
      dom[k * 4 + 3] = body.plateOf[k];
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
    const sdf = uploadSdf(
      gl,
      mask,
      baselines.map((b) => ({
        baseline: b,
        cap: metrics.capHeight * metrics.size,
      })),
      3,
      this.sdfTx
    );
    this.sdfTx = sdf.tx;
    // Framebuffer px per SDF px at dpr 1, and the mask's rect within the
    // padded canvas as a scale and offset on the mask's uv.
    this.sdfPx = w / sdf.inner[0];
    this.sdfMap = [
      sdf.inner[0] / sdf.W,
      sdf.inner[1] / sdf.H,
      SDF_PAD / sdf.W,
      SDF_PAD / sdf.H,
    ];

    this.lastInput = this.time;
    this.lastCell = null;
    return true;
  }

  private fallCells(): number {
    return Math.min(FALL_FRAC * this.capRows, FALL_MAX_CELLS);
  }

  /** The plates' pivots, and what they gained in rate this step. */
  private setPlateUniforms(
    gl: WebGL2RenderingContext,
    L: Record<string, WebGLUniformLocation | null>,
    acc: number[][]
  ): void {
    const gel = this.gel!;
    const a = new Float32Array(MAX_PLATES * 4);
    const pivot = new Float32Array(MAX_PLATES * 4);
    gel.plates.forEach((pl, p) => {
      a.set([acc[p][0], acc[p][1], acc[p][2], 0], p * 4);
      pivot.set([pl.cx, pl.base, this.capRows, 0], p * 4);
    });
    gl.uniform4fv(L['uPoseAcc[0]']!, a);
    gl.uniform4fv(L['uPivot[0]']!, pivot);
  }

  onUpdate(
    app: PIXI.Application,
    controls: AspicControlValues,
    deltaTime: number
  ): void {
    if (this.failed) return;
    if (!this.pp) {
      const plateU = ['uDomain', 'uPoseAcc[0]', 'uPivot[0]'];
      const pp = PingPong.create({
        simFrag: SIM_FRAG,
        dispFrag: DISP_FRAG,
        reduceFrag: REDUCE_FRAG,
        // An integrator: see PingPongOptions.fullPrecision.
        fullPrecision: true,
        simUniforms: [
          ...plateU,
          'uFrom',
          'uTo',
          'uFinger',
          'uFingerV',
          'uFlick',
          'uFlickR',
          'uDrop',
          'uDropPlate',
        ],
        reduceUniforms: plateU,
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
          'uPlatePose[0]',
          'uPlateN',
          'uBodies[0]',
          'uBodyN',
          'uSimT',
          'uLastLand',
          'uFallH',
          'uFallT',
          'uPad',
          'uGelDeep',
          'uGelThin',
          'uGel',
          'uSdf',
          'uEye',
          'uCamR',
          'uCamD',
          'uCamF',
          'uFocal',
          'uScene',
          'uSdfPx',
          'uSdfMap',
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
    const seedKey = `${controls.subject}|${phrase}|${sw}|${sh}|${controls.textScale}|${controls.plate}`;
    if (seedKey !== this.seedKey) {
      if (!this.seed(pp, controls, sw, sh)) return;
      this.seedKey = seedKey;
    }
    const gel = this.gel!;

    if (!this.sprite) {
      this.texture = PIXI.Texture.from(pp.canvas);
      this.sprite = new PIXI.Sprite(this.texture);
      this.getRoot().addChild(this.sprite);
    }

    // ---- input, in sim cells
    const input = (this.reduced ? REDUCED_INPUT_SCALE : 1) * controls.wobble;
    const [fx, fy, fw, fh] = this.field;
    const dpr = this.dpr ?? Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(2, Math.round(sw * dpr));
    const H = Math.max(2, Math.round(sh * dpr));
    const cellPx = (fw / pp.sw) * dpr;
    const tab = tableauOf(
      this.plates.map((v) => v * dpr),
      this.rect[3] * dpr,
      this.capRows * cellPx,
      MARGIN * cellPx,
      H
    );
    // The pointer is a ray; it lands on the plane of the line whose band
    // it crosses, the front line first.
    const toCell = (px: number, py: number) => {
      const sx = px * dpr - W / 2;
      const sy = py * dpr - H / 2;
      const d = [0, 1, 2].map(
        (k) => tab.fwd[k] * tab.focal + tab.right[k] * sx + tab.down[k] * sy
      );
      const n = this.plates.length / 4;
      const tableY = tab.scene[2];
      let pick: { ci: number; cj: number } | null = null;
      for (let i = n - 1; i >= 0; i--) {
        const z = -(n - 1 - i) * tab.scene[3];
        if (Math.abs(d[2]) < 1e-6) continue;
        const t = (z - tab.eye[2]) / d[2];
        if (t <= 0) continue;
        const wx = tab.eye[0] + d[0] * t;
        const wy = tab.eye[1] + d[1] * t;
        const simY = wy + (this.plates[i * 4 + 2] * dpr - tableY);
        const cell = {
          ci: ((wx / dpr - fx) / fw) * pp.sw,
          cj: (1 - (simY / dpr - fy) / fh) * pp.sh,
        };
        pick = pick ?? cell;
        const top = this.plates[i * 4 + 3] * dpr - MARGIN * cellPx;
        const bottom = this.plates[i * 4 + 2] * dpr + MARGIN * cellPx;
        if (simY >= top && simY <= bottom) return cell;
      }
      return pick ?? { ci: -99, cj: -99 };
    };

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
    const key = [
      this.seedKey,
      W,
      H,
      PAL.ink,
      PAL.bright,
      PAL.sun,
      PAL.cream,
      controls.stage,
      controls.flavor,
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

    // ---- what the gel is doing to the plates, read back once a frame and
    // held over this frame's steps. Without a readable target the plates
    // still take the landings and spring home; they just cannot be pushed.
    const force = gel.plates.map(() => ({ x: 0, y: 0, t: 0 }));
    const red = pp.reduce(pp.sw, MAX_PLATES, (gl, L) => {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.domainTx);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(L.uDomain!, 1);
      this.setPlateUniforms(
        gl,
        L,
        gel.plates.map(() => [0, 0, 0])
      );
    });
    if (red) {
      gel.plates.forEach((_, p) => {
        const f = force[p];
        for (let i = 0; i < pp.sw; i++) {
          const k = (p * pp.sw + i) * 4;
          f.x += red[k];
          f.y += red[k + 1];
          f.t += red[k + 2];
        }
        if (!isFinite(f.x + f.y + f.t)) f.x = f.y = f.t = 0;
      });
    }

    // ---- fixed step
    this.acc = Math.min(this.acc + dt, 12 / SPS);
    const fingerR = (controls.finger * this.rect[3]) / (fh / pp.sh);
    const vDrop = 0.2 * controls.wobble;
    let first = true;
    while (this.acc >= 1 / SPS) {
      this.acc -= 1 / SPS;
      this.stepN++;
      const fl = first ? flick : null;
      first = false;
      let landing: Landing | null = null;
      // What the plates gain in rate this step — a landing's thump and
      // the mat's push alike — is what their gel feels the other way.
      const before = gel.plates.map((pl) => [pl.vx, pl.vy, pl.om]);
      while (this.pending.length && this.pending[0].step <= this.stepN) {
        landing = this.pending.shift()!;
        thump(gel.plates[landing.plate], landing.impulse);
        this.lastInput = this.time;
      }
      gel.plates.forEach((pl, p) =>
        stepPlate(pl, force[p].x, force[p].y, force[p].t)
      );
      const acc = gel.plates.map((pl, p) => [
        pl.vx - before[p][0],
        pl.vy - before[p][1],
        pl.om - before[p][2],
      ]);
      pp.step((gl, L) => {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.domainTx);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(L.uDomain!, 1);
        this.setPlateUniforms(gl, L, acc);
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
        gl.uniform4f(
          L.uDrop!,
          landing?.x0 ?? 0,
          landing?.x1 ?? 0,
          landing ? vDrop : 0,
          LEAN
        );
        gl.uniform1i(L.uDropPlate!, landing?.plate ?? -1);
      });
    }

    pp.display(W, H, (gl, L) => {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.domainTx);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.maskTx);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.sdfTx);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(L.uDomain!, 1);
      gl.uniform1i(L.uTex!, 2);
      gl.uniform1i(L.uSdf!, 3);
      gl.uniform3fv(L.uEye!, tab.eye);
      gl.uniform3fv(L.uCamR!, tab.right);
      gl.uniform3fv(L.uCamD!, tab.down);
      gl.uniform3fv(L.uCamF!, tab.fwd);
      gl.uniform1f(L.uFocal!, tab.focal);
      gl.uniform4fv(L.uScene!, tab.scene);
      gl.uniform1f(L.uSdfPx!, this.sdfPx * dpr);
      gl.uniform4fv(L.uSdfMap!, this.sdfMap);
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
      // The pose in framebuffer px, y down: a dip is up in the grid.
      const pose = new Float32Array(MAX_PLATES * 4);
      gel.plates.forEach((pl, p) => {
        pose.set(
          [
            pl.x * cellPx,
            -pl.y * cellPx,
            pl.th,
            (fx + (pl.cx / pp.sw) * fw) * dpr,
          ],
          p * 4
        );
      });
      gl.uniform4fv(L['uPlatePose[0]']!, pose);
      gl.uniform1i(L.uPlateN!, Math.min(MAX_PLATES, this.plates.length / 4));
      gl.uniform4fv(L['uBodies[0]']!, this.bodies);
      gl.uniform1i(L.uBodyN!, this.bodyN);
      gl.uniform1f(L.uSimT!, this.stepN / SPS);
      gl.uniform1f(L.uLastLand!, this.lastLand);
      gl.uniform1f(L.uFallH!, this.fallCells() / pp.sh);
      gl.uniform1f(L.uFallT!, FALL_T);
      gl.uniform1f(L.uPad!, MARGIN * cellPx);
      setColor(gl, L.uInk!, PAL.ink);
      setColor(gl, L.uOrange!, PAL.bright);
      setColor(gl, L.uSun!, PAL.sun);
      setColor(gl, L.uCream!, PAL.cream);
      const fl = FLAVORS[controls.flavor] ?? FLAVORS.amber;
      const swatch = (c: Flavor['deep']) =>
        c === 'orange'
          ? PAL.bright
          : c === 'sun'
            ? PAL.sun
            : c === 'cream'
              ? PAL.cream
              : c;
      setColor(gl, L.uGelDeep!, swatch(fl.deep));
      setColor(gl, L.uGelThin!, swatch(fl.thin));
      gl.uniform4f(L.uGel!, fl.gain, fl.opacity, fl.warm, 0);
    });
    this.texture?.source.update();
  }

  onDestroy(): void {
    if (this.pp) {
      if (this.maskTx) this.pp.gl.deleteTexture(this.maskTx);
      if (this.domainTx) this.pp.gl.deleteTexture(this.domainTx);
      if (this.sdfTx) this.pp.gl.deleteTexture(this.sdfTx);
    }
    this.maskTx = null;
    this.domainTx = null;
    this.sdfTx = null;
    this.pp?.destroy();
    this.pp = null;
    this.failed = false;
    this.sprite = null;
    this.texture?.destroy(true);
    this.texture = null;
    this.gel = null;
    super.onDestroy();
  }
}

export function createAspicAnimation(
  initialControls?: Partial<AspicControlValues>
): AspicAnimation {
  return new AspicAnimation(initialControls);
}
