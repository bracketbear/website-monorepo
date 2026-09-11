import * as PIXI from 'pixi.js';
import { createManifest } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation, rand } from '@bracketbear/flateralus-pixi';
import { logoMask, VERT } from '../shared/shader-harness';

const MANIFEST = createManifest({
  id: 'caustics-pool',
  name: 'Caustics Pool (GLSL)',
  description:
    'A water surface integrated with the 2D wave equation in a GPU ping-pong buffer — real propagation, reflection off the pool walls, interference where wakes cross. A breeze writes pressure into the field so the surface is never still, in either mode: the chop, the ring and the decay are all answers the integrator gives, not an animation played over the top. The display pass refracts sunlight through the surface normals and measures the Jacobian of that refraction map, so caustics are computed, not painted: where rays converge, the floor brightens. Pool toys ride the result: each frame their positions sample the height field, wave slope pushes them around, the gradient tilts them, and their drift cuts wakes of its own. Drag to cut a wake; click to drop a stone — or shove a toy.',
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
      label: 'Ripple Speed',
      min: 0.08,
      max: 0.48,
      step: 0.02,
      defaultValue: 0.3,
      debug: true,
    },
    {
      name: 'damp',
      type: 'number',
      label: 'Damping',
      min: 0.97,
      max: 0.999,
      step: 0.001,
      defaultValue: 0.994,
      debug: true,
    },
    {
      name: 'wind',
      type: 'number',
      label: 'Wind Chop',
      min: 0,
      max: 3,
      step: 0.1,
      defaultValue: 1.1,
      debug: true,
    },
    {
      name: 'drop',
      type: 'number',
      label: 'Drop Strength',
      min: 0.3,
      max: 4,
      step: 0.1,
      defaultValue: 1.6,
      debug: true,
    },
    {
      name: 'depth',
      type: 'number',
      label: 'Water Depth',
      min: 0.02,
      max: 0.18,
      step: 0.01,
      defaultValue: 0.08,
      debug: true,
    },
    {
      name: 'caust',
      type: 'number',
      label: 'Caustics',
      min: 0,
      max: 2.5,
      step: 0.05,
      defaultValue: 0.9,
      debug: true,
    },
    {
      name: 'rain',
      type: 'number',
      label: 'Rain Rate',
      min: 0.2,
      max: 8,
      step: 0.2,
      defaultValue: 2.5,
      debug: true,
    },
    {
      name: 'toys',
      type: 'select',
      label: 'Pool Toys',
      options: [
        { value: 1, label: 'Afloat' },
        { value: 0, label: 'Hidden' },
      ],
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'tint',
      type: 'select',
      label: 'Color',
      options: [
        { value: 0, label: 'Lagoon' },
        { value: 1, label: 'Ember' },
        { value: 2, label: 'Ice' },
        { value: 3, label: 'Night' },
      ],
      defaultValue: 0,
      debug: true,
    },
  ],
} as const);

export type CausticsPoolControlValues = ManifestToControlValues<
  typeof MANIFEST
>;

type Locs = Record<string, WebGLUniformLocation | null>;

// Carried across from the prototype, plus the wind pressure term below.
// Do not reformat the GLSL.
const STEP_FS = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uH;   // x = h, y = h_prev
    uniform float uC2, uDamp, uWind, uTime;
    uniform vec2 uSim;
    float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), fr = fract(p);
      vec2 u = fr * fr * (3.0 - 2.0 * fr);
      return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
                 mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    void main() {
      vec2 px = 1.0 / uSim;
      vec2 c = texture(uH, vUV).xy;
      float L = texture(uH, vUV - vec2(px.x, 0.0)).x;
      float Rv = texture(uH, vUV + vec2(px.x, 0.0)).x;
      float B = texture(uH, vUV - vec2(0.0, px.y)).x;
      float T = texture(uH, vUV + vec2(0.0, px.y)).x;
      float lap = L + Rv + B + T - 4.0 * c.x;
      // A breeze crossing the pool: a noise pressure field advected downwind,
      // in a soft band so the chop is never uniform. Wind is a force on the
      // field, not a picture of waves — the ring, the interference and the
      // decay are the integrator's answer, not ours. It runs in both modes,
      // so the surface is alive before anyone touches it.
      // Frequency is the lever, not amplitude: caustics come from curvature,
      // and curvature goes as k², so halving the wavelength buys ~4x the
      // bending for the same force. 27 cycles across a ~302-cell grid is a
      // ~11-cell wavelength — short enough to bend light, clear of the
      // stencil's dispersive band near Nyquist.
      //
      // The drift constant is in NOISE-CELL units (it is subtracted from w,
      // which is already scaled by the frequency above), so 0.15 here is
      // ~1.7 grid cells/s against a wave speed of sqrt(uC2)*90 ~ 49 cells/s.
      // The gusts are therefore quasi-static: the surface holds a forced
      // pattern that follows them, rather than radiating resonant chop.
      // That is the regime this is tuned in — verified by eye, not derived.
      vec2 w = vUV * vec2(27.0, 21.0) - vec2(uTime * 0.15, uTime * 0.05);
      float gust = vnoise(w) - 0.5 + 0.5 * (vnoise(w * 2.17 + 31.0) - 0.5);
      // Fetch: a standing gradient across the pool, deliberately with no clock
      // of its own. Patchiness comes from gusts drifting through it, not from
      // a second oscillator laid over the top.
      float band = 0.55 + 0.45 * sin(vUV.y * 2.3 + vUV.x * 1.1);
      float force = gust * band * uWind * 0.013;
      float nh = (2.0 * c.x - c.y + uC2 * lap + force) * uDamp;
      fragColor = vec4(nh, c.x, 0.0, 1.0);
    }`;

// Carried across verbatim from the prototype. Do not reformat.
const SPLAT_FS = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform vec2 uC, uSim;
    uniform float uAmp, uRad;
    void main() {
      vec2 d = (vUV - uC) * uSim;
      float a = exp(-dot(d, d) / (uRad * uRad));
      fragColor = vec4(uAmp * a, 0.0, 0.0, 0.0);
    }`;

// Carried across verbatim from the prototype. Do not reformat.
const DISPLAY_FS = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uH;
    uniform sampler2D uLock;
    uniform float uTime, uDepth, uCaust, uBump, uAsp;
    uniform vec2 uSim;
    uniform vec3 uWater, uSky, uSun, uFloorA, uFloorB, uToyA, uToyB;
    uniform vec2 uLockBox;
    uniform float uTileN;
    uniform vec4 uToys[4];   // x,y center (uv), z radius (y-uv units), w type (0 ball, 1 tube, 2 duck)
    uniform vec4 uToyD[4];   // xy surface gradient, z spin/orientation
    uniform mat3 uBallM;     // ball orientation (body -> world) — it rolls
    float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), fr = fract(p);
      vec2 u = fr * fr * (3.0 - 2.0 * fr);
      return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
                 mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a2 = 0.5;
      for (int i = 0; i < 4; i++) { v += a2 * vnoise(p); p = p * 2.03 + vec2(17.0, 9.2); a2 *= 0.5; }
      return v;
    }
    vec2 gradH(vec2 uv) {
      vec2 px = 1.0 / uSim;
      float L = texture(uH, uv - vec2(px.x, 0.0)).x;
      float Rv = texture(uH, uv + vec2(px.x, 0.0)).x;
      float B = texture(uH, uv - vec2(0.0, px.y)).x;
      float T = texture(uH, uv + vec2(0.0, px.y)).x;
      return vec2(Rv - L, T - B) * 0.5;
    }
    vec2 refrUV(vec2 uv) {
      vec2 g = gradH(uv) * uBump;
      vec3 n = normalize(vec3(-g, 1.0));
      vec3 r = refract(vec3(0.0, 0.0, -1.0), n, 0.7519);
      return uv + r.xy * (uDepth / max(0.35, -r.z));
    }
    // Tiles only. Split out of the lockup below so the dispersion taps can
    // sample the floor three times without evaluating the mark's wear three
    // times — a flat painted graphic shows no visible chromatic fringe.
    vec3 floorTile(vec2 f) {
      // tiled pool floor, slightly rounded corners
      vec2 t = f * vec2(uAsp, 1.0) * uTileN;
      vec2 ft = abs(fract(t) - 0.5);
      float db = length(max(ft - vec2(0.415), 0.0)) - 0.045;
      float grout = smoothstep(0.0, 0.024, db);
      float shade = 0.93 + 0.07 * hash21(floor(t));
      // glaze noise: soft mottle + fine speckle, offset per tile so no two match
      vec2 gz = f * vec2(uAsp, 1.0);
      float mot = fbm(gz * 26.0 + hash21(floor(t)) * 37.0);
      float spk = vnoise(gz * 170.0);
      shade *= 0.93 + 0.10 * mot + 0.04 * spk;
      // grime creeping in from the grout edge
      float rim = smoothstep(-0.13, -0.01, db);
      shade *= 1.0 - 0.09 * rim * (0.4 + 0.6 * mot);
      // ceramic glaze: very low-frequency mottle across the whole floor, so
      // the eye reads one continuous surface rather than a repeating unit
      shade *= 0.93 + 0.14 * fbm(gz * 6.0 + 3.0);
      // a handful of tiles have gone blotchy. A floor with a history reads as
      // a place; a uniform one reads as a render.
      float stain = smoothstep(0.62, 0.98, hash21(floor(t) + 7.3));
      vec3 tile = uFloorA * shade;
      tile = mix(tile, tile * vec3(0.86, 0.93, 0.9), stain * (0.35 + 0.4 * mot));
      return mix(tile, uFloorB, grout * 0.7);
    }

    // The mark, painted decades ago: bleached, flaking, worn through at the
    // grout. Applied once, over whatever the dispersed tile sample produced.
    vec3 lockup(vec3 col, vec2 f) {
      vec2 t = f * vec2(uAsp, 1.0) * uTileN;
      vec2 ft = abs(fract(t) - 0.5);
      float db = length(max(ft - vec2(0.415), 0.0)) - 0.045;
      float grout = smoothstep(0.0, 0.024, db);
      vec2 q = (f - 0.5) * vec2(uAsp, 1.0);
      vec2 luv = q / uLockBox + 0.5;
      if (luv.x > 0.0 && luv.x < 1.0 && luv.y > 0.0 && luv.y < 1.0) {
        float m = texture(uLock, vec2(luv.x, 1.0 - luv.y)).a;
        if (m > 0.003) {
          vec2 wuv = f * vec2(uAsp, 1.0);
          float w = fbm(wuv * 13.0);
          float fleck = vnoise(wuv * 90.0);
          float wear = clamp(w * 0.8 + fleck * 0.35, 0.0, 1.3);
          float paint = m * smoothstep(0.12, 0.55, 1.28 - wear);
          paint *= 1.0 - grout * (0.62 + 0.3 * vnoise(wuv * 40.0));  // grout sheds paint first, traces survive
          vec3 pcol = mix(uFloorB, uFloorA, 0.16 + 0.34 * w);
          col = mix(col, pcol, paint * 0.9);
          // ghost stain where the paint has flaked away
          col = mix(col, mix(pcol, uFloorA, 0.6), m * (1.0 - paint) * 0.34);
        }
      }
      return col;
    }
    // --- pool toys -------------------------------------------------------
    // Every toy is a real model. Each one is intersected per pixel against a
    // shared camera — a signed distance field for the duck and the doughnut,
    // closed form for the ball — so silhouettes, self-occlusion and the
    // shadow a body throws across itself come out of geometry rather than
    // being drawn on.
    float sdEllipsoid(vec3 p, vec3 r) {
      float k0 = length(p / r);
      float k1 = length(p / (r * r));
      return k0 * (k0 - 1.0) / max(k1, 1e-6);
    }
    float sdCapsule(vec3 p, vec3 a, vec3 b, float ra, float rb) {
      vec3 pa = p - a, ba = b - a;
      float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      return length(pa - ba * h) - mix(ra, rb, h);
    }
    float smin(float a, float b, float k) {
      float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
      return mix(b, a, h) - k * h * (1.0 - h);
    }
    // The camera every toy is seen through. The local wave gradient tips the
    // body, the spin turns it about its own axis, and the view leans 17
    // degrees off vertical so a scene shot from overhead still shows volume.
    // M takes toy space to screen space. A toy that cannot heel — a sphere
    // looks identical however it is turned — passes a zero gradient and gets
    // world space back, which also makes its z a true height above the water.
    void toyFrame(vec2 p, vec2 grad, float sp, out vec3 ro, out vec3 rd, out mat3 M) {
      // Heel, saturating. A float has buoyant stiffness: the further it goes
      // over, the harder it resists going further, and there is an angle it
      // simply will not pass. tanh is that curve — linear across the small
      // slopes it spends most of its time on, flattening to a ceiling near 22
      // degrees, so a big swell rocks it and never rolls it onto its side.
      vec2 g = -grad * 3.2;
      float gm = length(g);
      if (gm > 1e-5) g *= 0.40 * tanh(gm / 0.40) / gm;
      vec3 upS = normalize(vec3(g, 1.0));
      vec3 sideS = normalize(cross(upS, vec3(cos(sp), sin(sp), 0.0)));
      M = mat3(cross(sideS, upS), sideS, upS);
      float ct = 0.955, st = 0.296;
      vec3 camZ = vec3(0.0, -st, ct);
      ro = transpose(M) * (vec3(p.x, 0.0, 0.0) + vec3(0.0, ct, st) * p.y + camZ * 2.6);
      rd = transpose(M) * (-camZ);
    }
    // True height above the water. A toy's frame is tilted by its heel, so its
    // own z is height along its own axis — right for placing features on the
    // body, wrong for the waterline, because the pool stays flat while the toy
    // rocks. Measured in the toy's z it is the water that appears to tilt, and
    // one side of a big float reads as sinking. Only the third row of M is
    // needed to get back to world up.
    float waterHeight(mat3 M, vec3 hp) {
      return dot(vec3(M[0].z, M[1].z, M[2].z), hp);
    }
    // --- doughnut float ----------------------------------------------------
    // A torus lying in the xy plane, its mid-plane a little above the
    // waterline so about a third of the tube is under — where an inflated one
    // rides. The outer edge lands exactly on 1.0, the toy's own radius.
    const float DR = 0.63;      // ring radius
    const float DT = 0.37;      // tube radius
    // The mid-plane sits on the waterline: half the tube under, where an
    // inflated ring actually rides. This one number has to satisfy both rims
    // at once, and the camera decides the window. Looking down 17 degrees, the
    // far side of the ring is only visible above about 17 degrees around its
    // tube, so if the waterline lands at or above that the far rim terminates
    // wet, with no dry dough between it and the pool — and a ring whose far
    // edge ends in the water reads as one that is sinking at the back. Sitting
    // the mid-plane here puts the far rim a clear 0.11 above the surface while
    // still leaving the near rim's wet band and a sliver of submerged tube in
    // view, which is the pair of cues that says the ring is in the water.
    const float DZ = 0.0;       // height of the ring's mid-plane
    float doughMap(vec3 p) {
      vec2 q = vec2(length(p.xy) - DR, p.z - DZ);
      return length(q) - DT;
    }
    // Soft shadow toward the sun, traced through the ring's own body. The sun
    // side throwing a shadow across the hole and onto the far inner wall is
    // most of what separates a torus from a ring painted on a disc.
    float doughShadow(vec3 p, vec3 l) {
      float s = 1.0, t = 0.05;
      for (int i = 0; i < 12; i++) {
        float d = doughMap(p + l * t);
        s = min(s, 10.0 * d / t);
        if (s < 0.03 || t > 2.2) break;
        t += clamp(d, 0.03, 0.22);
      }
      return clamp(s, 0.0, 1.0);
    }
    // --- rubber duck -------------------------------------------------------
    // Duck space: +x forward, +y its left, +z up, origin on the waterline.
    // The toy is blow-molded, so it is modelled the way it is made — lobes
    // fused together, tight enough at the wings that the seam stays visible.
    // Returns (distance, material: 0 vinyl, 1 bill).
    vec2 duckMap(vec3 p) {
      vec3 pm = vec3(p.x, abs(p.y), p.z);
      float d = sdEllipsoid(p - vec3(-0.04, 0.0, -0.04), vec3(0.54, 0.43, 0.40));
      d = smin(d, sdEllipsoid(p - vec3(0.28, 0.0, -0.04), vec3(0.36, 0.35, 0.34)), 0.26);
      // tail: a broad flat fan kicked up off the back, not a point
      vec3 tp = p - vec3(-0.50, 0.0, 0.15);
      tp.xz = mat2(0.87, 0.50, -0.50, 0.87) * tp.xz;
      d = smin(d, sdEllipsoid(tp, vec3(0.24, 0.125, 0.095)), 0.17);
      d = smin(d, sdCapsule(p, vec3(0.30, 0.0, 0.14), vec3(0.43, 0.0, 0.55), 0.175, 0.17), 0.15);
      d = smin(d, sdEllipsoid(p - vec3(0.47, 0.0, 0.72), vec3(0.33, 0.32, 0.32)), 0.12);
      // wings: a swell down each flank, blended just tight enough to leave a
      // crease rather than a second lobe
      d = smin(d, sdEllipsoid(pm - vec3(-0.06, 0.345, 0.05), vec3(0.33, 0.110, 0.23)), 0.07);
      vec3 bp = p - vec3(0.76, 0.0, 0.655);
      bp.xz = mat2(0.971, 0.239, -0.239, 0.971) * bp.xz;   // the bill droops
      float bill = sdEllipsoid(bp, vec3(0.29, 0.165, 0.065));
      float id = bill < d ? 1.0 : 0.0;
      return vec2(smin(d, bill, 0.035), id);
    }
    vec3 duckNormal(vec3 p) {
      vec2 e = vec2(1.0, -1.0);
      float h = 0.0022;
      return normalize(e.xyy * duckMap(p + e.xyy * h).x + e.yyx * duckMap(p + e.yyx * h).x
                     + e.yxy * duckMap(p + e.yxy * h).x + e.xxx * duckMap(p + e.xxx * h).x);
    }
    // The head's shadow falling across the back is most of what separates a
    // model from a decal, and it costs one short march.
    float duckShadow(vec3 p, vec3 l) {
      float s = 1.0, t = 0.05;
      for (int i = 0; i < 11; i++) {
        float d = duckMap(p + l * t).x;
        s = min(s, 11.0 * d / t);
        if (s < 0.03 || t > 1.5) break;
        t += clamp(d, 0.03, 0.20);
      }
      return clamp(s, 0.0, 1.0);
    }
    vec4 drawToy(vec2 uv, vec4 T, vec4 D) {
      // Every branch antialiases its own silhouette, so it needs a pixel size —
      // and a derivative has to be taken before anything branches on it.
      float fwid = fwidth(uv.y);
      vec2 p = (uv - T.xy) * vec2(uAsp, 1.0) / T.z;  // local coords, 1 = radius
      float r = length(p);
      if (r > 1.45) return vec4(0.0);
      float pw = fwid / T.z;
      float sp = D.z;
      vec3 col; vec3 n; vec3 hp; float a;
      float sh = 1.0;                 // self-shadowing; a sphere has none
      vec3 ro, rd; mat3 M;
      if (T.w < 0.5) {
        // Beach ball. The one toy that needs no march: a sphere's silhouette
        // is a circle from every angle and its surface is closed form, so a
        // single quadratic gives an exact hit and an exact normal. It does not
        // heel either — turning a ball changes nothing about its shape, only
        // where its panels point, and uBallM already tracks that off the
        // contact point. So it takes the camera and nothing else.
        toyFrame(p, vec2(0.0), 0.0, ro, rd, M);
        vec3 cen = vec3(0.0, 0.0, 0.62);        // inflated: it rides high
        vec3 oc = ro - cen;
        float bb = dot(oc, rd);
        float h2 = dot(oc, oc) - bb * bb;       // closest approach, squared
        // Coverage straight off that closest approach: exact, one pixel wide.
        a = 1.0 - smoothstep(-0.9 * pw, 0.9 * pw, sqrt(max(h2, 0.0)) - 1.0);
        if (a <= 0.004) return vec4(0.0);
        hp = ro + rd * (-bb - sqrt(max(1.0 - h2, 0.0)));
        vec3 nd = normalize(hp - cen);
        // Six gores cut on the ball's own body frame, tapering to a point at
        // each pole the way heat-welded panels do — it rolls, so they turn.
        vec3 d = transpose(uBallM) * nd;
        float ang = fract(atan(d.y, d.x) / 6.2831853 + 0.5);
        float seg = floor(ang * 6.0);
        vec3 acc = seg < 2.0 ? uToyA : (seg < 4.0 ? uToyB : vec3(1.0, 0.82, 0.26));
        // The white gores are the brightest thing on the toy and the sun is
        // added on top of them, so they are held under paper-white to leave
        // the highlight somewhere to climb. At 0.96 it clipped, and the ball
        // wore one flat blown-out patch spanning three panels.
        vec3 white = vec3(0.90, 0.885, 0.85);
        col = mod(seg, 2.0) < 0.5 ? white : acc;
        // Polar caps: the little discs that close off the point where all six
        // gores converge. On a real ball they are barely wider than the valve.
        // The old threshold opened them 39 degrees off the pole, which turned
        // a third of the ball white and read as a bald patch, not a cap.
        float cap = smoothstep(0.955, 0.988, abs(d.z));
        col = mix(col, white, cap);
        // Welded seams, as a ridge rather than a dark line: the panel edges
        // lift where two sheets are joined, so a seam catches the sun on one
        // side and shades on the other. The old shading had this inverted —
        // it darkened the middle of every panel and left the joins at full
        // brightness, which is what made the gores read as printed stripes.
        float fs = fract(ang * 6.0);
        float sdS = fs < 0.5 ? fs : fs - 1.0;        // signed, 0 on the seam
        col *= 0.90 + 0.10 * smoothstep(0.0, 0.26, abs(sdS));
        vec3 tA = cross(vec3(0.0, 0.0, 1.0), d);
        float tl = length(tA);
        if (tl > 1e-4) {
          float q = sdS / 0.055;
          nd = normalize(nd + uBallM * (tA / tl) * (q * exp(-0.5 * q * q))
                              * 0.085 * (1.0 - cap));
        }
        // The valve, set into the cap at one pole: a nub with a flange round
        // its base and a slot across the top. It is the detail that names the
        // object, and because it lives on the body frame it rolls out of sight
        // and back again as the ball goes.
        float vr = length(d.xy);
        float vm = (1.0 - smoothstep(0.10, 0.125, vr)) * step(0.0, d.z);
        col = mix(col, vec3(0.94, 0.93, 0.89), vm * 0.9);
        col *= 1.0 - 0.30 * vm * smoothstep(0.055, 0.105, vr);   // seated base
        col *= 1.0 - 0.50 * vm * (1.0 - smoothstep(0.013, 0.026, abs(d.y)));
        if (vr > 1e-5)
          nd = normalize(nd + uBallM * vec3(d.xy / vr, 0.0)
                              * vm * smoothstep(0.03, 0.10, vr) * 0.5);
        n = M * nd;
        // Waterline. Only a shallow cap is under, but without the wet band
        // and the meniscus a ball reads as resting on a sheet of glass.
        float wz = waterHeight(M, hp);
        col *= 1.0 - 0.24 * exp(-pow(max(wz, 0.0) / 0.05, 2.0));
        col += uSky * 0.32 * exp(-pow(wz / 0.020, 2.0));
        float sub = smoothstep(0.01, -0.10, wz);
        col = mix(col, col * mix(vec3(1.0), uWater, 0.9) * 1.1, sub);
        a *= 1.0 - 0.62 * smoothstep(0.0, -0.18, wz);
      } else if (T.w < 1.5) {
        // Doughnut float, sphere-traced. The hole is a real hole: at this
        // camera you look down into it, the near wall covers the far one, and
        // the ring lays a shadow across its own middle. The frosting is a
        // region of the actual surface rather than a band drawn on a disc.
        toyFrame(p, D.xy, sp, ro, rd, M);
        vec3 oc = ro - vec3(0.0, 0.0, DZ);
        float bb = dot(oc, rd);
        float disc = bb * bb - (dot(oc, oc) - 1.0404);   // bound: DR + DT, loose
        if (disc < 0.0) return vec4(0.0);
        float sq = sqrt(disc);
        float tF = -bb + sq;
        float tm = max(-bb - sq, 0.0);
        // Antialias off the closest approach rather than the hit test, so the
        // edge is a real coverage estimate one pixel wide.
        float eps = max(0.0015, 0.7 * pw);
        float md = 1e9, tBest = tm;
        bool hit = false;
        for (int i = 0; i < 28; i++) {
          float ds = doughMap(ro + rd * tm);
          if (ds < md) { md = ds; tBest = tm; }
          if (ds < eps) { hit = true; break; }
          tm += max(ds * 0.92, eps * 0.5);
          if (tm > tF) break;
        }
        a = hit ? 1.0 : 1.0 - smoothstep(eps, eps + 1.8 * pw, md);
        if (a <= 0.004) return vec4(0.0);
        hp = ro + rd * tBest;
        // Torus coordinates of the hit: th around the ring, ph around the
        // tube. The normal and every feature come out of these, so the icing
        // and the sprinkles are on the surface instead of on a projection
        // that happens to line up with it from one angle.
        float th = atan(hp.y, hp.x);
        float ph = atan(hp.z - DZ, length(hp.xy) - DR);
        float cth = cos(th), sth = sin(th), cph = cos(ph), sph = sin(ph);
        vec3 nd = vec3(cph * cth, cph * sth, sph);      // exact — no gradient
        vec3 tTh = vec3(-sth, cth, 0.0);                // around the ring
        vec3 tPh = vec3(-sph * cth, -sph * sth, cph);   // around the tube
        vec3 sunD = transpose(M) * normalize(vec3(0.42, 0.55, 0.72));
        sh = 0.30 + 0.70 * doughShadow(hp + nd * 0.008, sunD);
        // Frosting caps the top of the tube down to a drip line that wobbles
        // around the ring. sph is the height on the cross-section, so this is
        // literally "iced above here" — and where the line dips, the drip
        // hangs over the outer wall and shows up in silhouette.
        float drip = 0.58 + 0.155 * sin(th * 7.0) + 0.075 * sin(th * 13.0 + 1.7);
        float ice = smoothstep(drip - 0.05, drip + 0.05, sph);
        vec3 dough = vec3(0.98, 0.82, 0.44);
        vec3 frost = mix(vec3(0.93, 0.17, 0.56), uToyA, 0.18);
        col = mix(dough, frost, ice);
        // Sprinkles: one capsule per cell of a grid wrapped around the tube.
        // 22 cells around the ring against 13 around the tube keeps the cells
        // square; both indices are taken mod the count so the seams at +/-pi
        // hash the same from either side.
        vec2 suv = vec2(th * (22.0 / 6.2831853), ph * (13.0 / 6.2831853));
        vec2 cid = vec2(mod(floor(suv.x), 22.0), mod(floor(suv.y), 13.0));
        float h1 = hash21(cid + 3.7);
        float h2s = hash21(cid + 11.3);
        float h3 = hash21(cid + 27.1);
        vec2 lp = fract(suv) - 0.5 - 0.30 * (vec2(h1, h2s) - 0.5);
        lp.y *= 0.55;
        vec2 sd2 = vec2(cos(h3 * 6.2831853), sin(h3 * 6.2831853));
        float tt = clamp(dot(lp, sd2), -0.15, 0.15);
        float sprk = length(lp - sd2 * tt) - 0.052;
        vec3 scol = h1 < 0.22 ? vec3(1.0, 0.98, 0.94)
                  : h1 < 0.42 ? vec3(1.0, 0.86, 0.20)
                  : h1 < 0.60 ? vec3(0.25, 0.80, 0.95)
                  : h1 < 0.78 ? vec3(0.35, 0.85, 0.40)
                              : vec3(1.0, 0.45, 0.30);
        float smask = (1.0 - smoothstep(-0.012, 0.012, sprk)) * ice * step(h2s, 0.82);
        col = mix(col, scol, smask);
        // Sprinkles sit proud of the icing: tilt the normal off each capsule's
        // own distance field so it catches the sun as a little ridge. The
        // gradient is in (around the ring, around the tube), so it comes back
        // through exactly those two tangents.
        float gd = length(lp - sd2 * tt);
        vec2 gdir = gd > 1e-5 ? (lp - sd2 * tt) / gd : vec2(0.0);
        vec2 bq = gdir * clamp(gd / 0.052, 0.0, 1.0) * smask * 0.9;
        bq.y /= 0.55;                       // undo the cell squash: reads round
        nd = normalize(nd + tTh * bq.x + tPh * bq.y);
        // The welded seams, where two sheets of vinyl are joined: one around
        // the outer equator of the tube and one around the inner. Cheapest
        // single cue that says inflatable.
        float seamD = min(abs(ph), 3.14159265 - abs(ph));
        col *= 1.0 - 0.16 * exp(-pow(seamD / 0.055, 2.0));
        // Waterline. hp.z is height above the surface, so this is where the
        // ring actually sits in it: a wet darkened band just above the line, a
        // thin meniscus catching the sky right on it, and below it a hull seen
        // through water — desaturated, low contrast, never a hard edge.
        float wz = waterHeight(M, hp);
        col *= 1.0 - 0.26 * exp(-pow(max(wz, 0.0) / 0.05, 2.0));
        col += uSky * 0.35 * exp(-pow(wz / 0.020, 2.0));
        float sub = smoothstep(0.01, -0.10, wz);
        col = mix(col, col * mix(vec3(1.0), uWater, 0.9) * 1.1, sub);
        // Vinyl stays opaque under water — it loses saturation and contrast,
        // it does not dissolve. Cutting the alpha as hard as the duck does
        // eats the near rim, which is the edge doing the work here.
        a *= 1.0 - 0.45 * smoothstep(0.0, -0.22, wz);
        sh *= 1.0 - 0.8 * sub;
        n = M * nd;
      } else {
        // Rubber duck, sphere-traced. The wave slope rotates the duck itself
        // rather than nudging its shading normal — it heels into a swell, and
        // the bill swings out over the water when it does.
        toyFrame(p, D.xy, sp, ro, rd, M);
        // Bounding sphere first, so the trace only runs where the duck can be
        // and every step starts already close to the surface.
        vec3 oc = ro - vec3(0.0, 0.0, 0.25);
        float bb = dot(oc, rd);
        float disc = bb * bb - (dot(oc, oc) - 1.3225);
        if (disc < 0.0) return vec4(0.0);
        float sq = sqrt(disc);
        float tF = -bb + sq;
        float tm = max(-bb - sq, 0.0);
        // Antialias the silhouette off the closest approach rather than the
        // hit test, so the edge is a real coverage estimate one pixel wide.
        float eps = max(0.0015, 0.7 * pw);
        float md = 1e9, tBest = tm, mid = 0.0;
        bool hit = false;
        for (int i = 0; i < 40; i++) {
          vec2 ms = duckMap(ro + rd * tm);
          if (ms.x < md) { md = ms.x; tBest = tm; mid = ms.y; }
          if (ms.x < eps) { hit = true; break; }
          tm += max(ms.x * 0.9, eps * 0.5);
          if (tm > tF) break;
        }
        a = hit ? 1.0 : 1.0 - smoothstep(eps, eps + 1.8 * pw, md);
        if (a <= 0.004) return vec4(0.0);
        hp = ro + rd * tBest;
        vec3 nd = duckNormal(hp);
        vec3 sunD = transpose(M) * normalize(vec3(0.42, 0.55, 0.72));
        sh = 0.26 + 0.74 * duckShadow(hp + nd * 0.006, sunD);
        n = M * nd;
        col = mix(vec3(1.0, 0.84, 0.10), vec3(0.98, 0.47, 0.07), mid);
        // the parting line left where the two halves of the mold met
        col *= 1.0 - 0.09 * exp(-pow(hp.y / 0.02, 2.0)) * step(0.0, nd.z);
        // the split between the upper and lower bill, following its droop
        col *= 1.0 - 0.30 * mid * exp(-pow((hp.z - 0.655 + (hp.x - 0.76) * 0.246) / 0.016, 2.0));
        // nostrils, two pinpricks on the ridge of the bill
        col *= 1.0 - 0.45 * mid * (1.0 - smoothstep(0.018, 0.030,
          min(length(hp - vec3(0.700, 0.055, 0.700)),
              length(hp - vec3(0.700, -0.055, 0.700)))));
        // eyes, stamped as spheres so they sit on the curve of the head
        float eye = min(length(hp - vec3(0.640, 0.205, 0.815)),
                        length(hp - vec3(0.640, -0.205, 0.815)));
        col = mix(vec3(0.07, 0.05, 0.045), col, smoothstep(0.052, 0.072, eye));
        // sun-bleached across the top, still saturated down near the water
        col *= 1.0 - 0.10 * smoothstep(0.4, 0.9, fbm(hp.xy * 4.3 + 13.0))
                          * smoothstep(-0.05, 0.4, hp.z);
        // Waterline, as on the other two.
        float wz = waterHeight(M, hp);
        col *= 1.0 - 0.26 * exp(-pow(max(wz, 0.0) / 0.06, 2.0));
        col += uSky * 0.35 * exp(-pow(wz / 0.022, 2.0));
        float sub = smoothstep(0.01, -0.10, wz);
        col = mix(col, col * mix(vec3(1.0), uWater, 0.9) * 1.1, sub);
        a *= 1.0 - 0.62 * smoothstep(0.0, -0.22, wz);
        sh *= 1.0 - 0.8 * sub;
      }
      // No shading-normal fudge for the wave any more: the two toys that can
      // heel are rotated for real by toyFrame, and the third is a sphere,
      // which looks the same whichever way it is tipped.
      vec3 sunDir = normalize(vec3(0.42, 0.55, 0.72));
      float dif = max(dot(n, sunDir), 0.0);
      vec3 hv = normalize(sunDir + vec3(0.0, 0.0, 1.0));
      float spec = pow(max(dot(n, hv), 0.0), 70.0);
      // Vinyl, not hard plastic. An inflatable reads as inflatable because the
      // highlight is broad and soft with a small blown-out core sitting in it,
      // and because the skin keeps catching light right out to the silhouette
      // where it curves away. All three toys are the same material.
      float sheen = pow(max(dot(n, hv), 0.0), 7.0);
      float rim = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.5);
      col = col * (0.42 + 0.68 * dif * sh)
          + uSun * spec * 0.85 * sh
          + uSun * sheen * 0.15 * sh
          + uSun * rim * 0.18;
      return vec4(col, a);
    }
    void main() {
      vec2 uv = vUV;
      vec2 g = gradH(uv) * uBump;
      vec3 n = normalize(vec3(-g, 1.0));
      // refraction map + its Jacobian (3 taps)
      float e = 1.5 / uSim.x;
      vec2 f0 = refrUV(uv);
      vec2 fx = refrUV(uv + vec2(e, 0.0));
      vec2 fy = refrUV(uv + vec2(0.0, e));
      vec2 dx = (fx - f0) / e, dy = (fy - f0) / e;
      float J = abs(dx.x * dy.y - dx.y * dy.x);
      float focus = clamp(1.0 / max(J, 0.06) - 0.72, 0.0, 4.0);
      float caust = min(pow(focus, 1.35) * uCaust, 2.1);
      // Dispersion: each wavelength bends a little differently, so sample the
      // floor at three slightly different depths along the same refracted ray.
      // The faint warm/cool fringe on the bright edges is most of what reads
      // as "real water" rather than "a distorted picture".
      vec2 disp = f0 - uv;
      vec3 col = lockup(vec3(floorTile(uv + disp * 0.985).r,
                             floorTile(uv + disp).g,
                             floorTile(uv + disp * 1.018).b), f0);
      // toy shadows on the floor, offset along the sun
      for (int i = 0; i < 4; i++) {
        vec4 Ts = uToys[i];
        if (Ts.z < 1e-4) continue;
        vec2 spos = Ts.xy - vec2(0.022, 0.028) * (uDepth / 0.08);
        vec2 srel = (f0 - spos) * vec2(uAsp, 1.0);
        float sr = length(srel) / Ts.z;
        float sh = 1.0 - smoothstep(0.5, 1.25, sr);
        if (Ts.w > 0.5 && Ts.w < 1.5) sh *= smoothstep(0.2, 0.5, sr);  // light through the tube hole
        col *= 1.0 - 0.35 * sh;
      }
      // water absorption by depth, deeper toward edges
      vec2 cc = uv * 2.0 - 1.0;
      float depthF = clamp(uDepth * 8.0, 0.0, 1.0) * (0.75 + 0.25 * dot(cc, cc));
      col *= mix(vec3(1.0), uWater, depthF);
      // caustic light
      col += uSun * caust * mix(vec3(1.0), uWater, 0.25);
      // sky reflection (fresnel) + sun glints
      float F = pow(1.0 - n.z, 3.0);
      col = mix(col, uSky, F * 0.75);
      vec3 sunDir = normalize(vec3(0.42, 0.55, 0.72));
      vec3 hv = normalize(sunDir + vec3(0.0, 0.0, 1.0));
      col += uSun * pow(max(dot(n, hv), 0.0), 140.0) * 1.6;
      col *= 0.92 + 0.08 * smoothstep(1.8, 0.2, dot(cc, cc));
      // toys float on top of everything
      for (int i = 0; i < 4; i++) {
        if (uToys[i].z < 1e-4) continue;
        vec4 tc = drawToy(uv, uToys[i], uToyD[i]);
        col = mix(col, tc.rgb, tc.a);
      }
      fragColor = vec4(col, 1.0);
    }`;

interface Tint {
  water: [number, number, number];
  sky: [number, number, number];
  sun: [number, number, number];
  floorA: [number, number, number];
  floorB: [number, number, number];
  toyA: [number, number, number];
  toyB: [number, number, number];
}

const TINTS: Tint[] = [
  {
    // 0 Lagoon
    water: [0.36, 0.78, 0.74],
    sky: [0.62, 0.84, 0.8],
    sun: [1.0, 0.97, 0.86],
    floorA: [0.9, 0.84, 0.68],
    floorB: [0.07, 0.21, 0.21],
    toyA: [1.0, 0.373, 0.122],
    toyB: [0.15, 0.42, 0.8],
  },
  {
    // 1 Ember
    water: [1.0, 0.55, 0.28],
    sky: [0.24, 0.12, 0.07],
    sun: [1.0, 0.76, 0.29],
    floorA: [1.0, 0.953, 0.89],
    floorB: [0.067, 0.039, 0.031],
    toyA: [1.0, 0.42, 0.13],
    toyB: [1.0, 0.78, 0.3],
  },
  {
    // 2 Ice
    water: [0.62, 0.78, 0.95],
    sky: [0.78, 0.87, 0.96],
    sun: [1.0, 1.0, 1.0],
    floorA: [0.9, 0.93, 0.96],
    floorB: [0.1, 0.16, 0.24],
    toyA: [1.0, 0.373, 0.122],
    toyB: [0.22, 0.48, 0.85],
  },
  {
    // 3 Night
    water: [0.16, 0.38, 0.46],
    sky: [0.02, 0.045, 0.06],
    sun: [0.42, 1.0, 0.88],
    floorA: [0.11, 0.14, 0.18],
    floorB: [0.015, 0.02, 0.028],
    toyA: [1.0, 0.42, 0.18],
    toyB: [0.3, 0.85, 0.75],
  },
];

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  src: string,
  tag: string
) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error(`caustics-pool ${tag}:`, gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

function program(gl: WebGL2RenderingContext, frag: string, tag: string) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT, tag);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag, tag);
  if (!vs || !fs) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error(`caustics-pool link ${tag}:`, gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

function locsOf(
  gl: WebGL2RenderingContext,
  prog: WebGLProgram,
  names: readonly string[]
): Locs {
  const L: Locs = {};
  gl.useProgram(prog);
  for (const n of names) L[n] = gl.getUniformLocation(prog, n);
  return L;
}

function mkTexFrom(
  gl: WebGL2RenderingContext,
  srcCv: HTMLCanvasElement
): WebGLTexture {
  const tx = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCv);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tx;
}

/** Decode an IEEE half into a JS number, for the readPixels height probe. */
function h2f(h: number): number {
  const s = h & 0x8000 ? -1 : 1;
  const e = (h >> 10) & 0x1f;
  const m = h & 0x3ff;
  if (e === 0) return s * m * Math.pow(2, -24);
  if (e === 31) return m ? NaN : s * Infinity;
  return s * (1 + m / 1024) * Math.pow(2, e - 15);
}

// Column-major mat3 helpers for the rolling ball.

function mul3(A: number[], B: number[]): number[] {
  const C = new Array<number>(9);
  for (let c = 0; c < 3; c++)
    for (let r = 0; r < 3; r++) {
      let s2 = 0;
      for (let k = 0; k < 3; k++) s2 += A[k * 3 + r] * B[c * 3 + k];
      C[c * 3 + r] = s2;
    }
  return C;
}

function axisAngle3(x: number, y: number, z: number, th: number): number[] {
  const c = Math.cos(th),
    s3 = Math.sin(th),
    t = 1 - c;
  return [
    c + t * x * x,
    t * x * y + s3 * z,
    t * x * z - s3 * y,
    t * x * y - s3 * z,
    c + t * y * y,
    t * y * z + s3 * x,
    t * x * z + s3 * y,
    t * y * z - s3 * x,
    c + t * z * z,
  ];
}

/** Re-orthonormalize in place — repeated incremental rotations drift. */
function ortho3(M: number[]): void {
  let l = Math.hypot(M[0], M[1], M[2]);
  M[0] /= l;
  M[1] /= l;
  M[2] /= l;
  const d = M[0] * M[3] + M[1] * M[4] + M[2] * M[5];
  M[3] -= d * M[0];
  M[4] -= d * M[1];
  M[5] -= d * M[2];
  l = Math.hypot(M[3], M[4], M[5]);
  M[3] /= l;
  M[4] /= l;
  M[5] /= l;
  M[6] = M[1] * M[5] - M[2] * M[4];
  M[7] = M[2] * M[3] - M[0] * M[5];
  M[8] = M[0] * M[4] - M[1] * M[3];
}

const STEP_UNIFORMS = ['uH', 'uC2', 'uDamp', 'uWind', 'uTime', 'uSim'] as const;
const SPLAT_UNIFORMS = ['uC', 'uAmp', 'uRad', 'uSim'] as const;
const DISP_UNIFORMS = [
  'uH',
  'uLock',
  'uTime',
  'uDepth',
  'uCaust',
  'uBump',
  'uAsp',
  'uSim',
  'uWater',
  'uSky',
  'uSun',
  'uFloorA',
  'uFloorB',
  'uToyA',
  'uToyB',
  'uToys[0]',
  'uToyD[0]',
  'uBallM',
  'uLockBox',
  'uTileN',
] as const;

interface Splat {
  x: number;
  y: number;
  amp: number;
  rad: number;
}

interface Toy {
  x: number;
  y: number;
  r: number;
  type: number;
  vx: number;
  vy: number;
  spin: number;
  vs: number;
  /** Smoothed surface height under the toy. */
  h: number;
  /** Smoothed surface gradient under the toy — the slope it slides down. */
  gx: number;
  gy: number;
  /**
   * The same gradient again, filtered far harder — the slope the toy leans
   * on. Drift and heel want different time constants: a toy starts moving on
   * a slope right away, but it takes real time to tip, and it is still
   * tipping after the wave has gone by.
   */
  tx: number;
  ty: number;
  /**
   * Collision radius as a fraction of the drawn one. A ball and a ring fill
   * their own circle, but a duck is a long thin thing inside a square, and
   * charging it the full radius gave it an invisible bumper.
   */
  hit: number;
  /** Column-major body-to-world orientation; only the beach ball rolls. */
  M: number[];
}

function identity3(): number[] {
  return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

/** Fonts the pool-floor lockup needs before it can be rasterized. */
const LOCKUP_FONTS = ['96px Anton', '96px Graduate'];

/**
 * Build the pool-club lockup painted on the floor: the mark over
 * BRACKET BEAR / SWIM CLUB and an est. line with rules either side.
 */
function buildLockupCanvas(): HTMLCanvasElement {
  const lc = document.createElement('canvas');
  lc.width = 900;
  lc.height = 780;
  const c2 = lc.getContext('2d')!;
  c2.fillStyle = '#fff';
  const lg = logoMask();
  const lw2 = 440;
  const lh2 = (lw2 * lg.height) / lg.width;
  c2.drawImage(lg, (900 - lw2) / 2, 20, lw2, lh2);
  c2.textAlign = 'center';
  const yBB = 20 + lh2 + 122;
  setLetterSpacing(c2, '8px');
  c2.font = '92px Anton, sans-serif';
  c2.fillText('BRACKET BEAR', 450, yBB);
  setLetterSpacing(c2, '10px');
  c2.font = '108px Graduate, Anton, serif';
  c2.fillText('SWIM CLUB', 450, yBB + 178);
  setLetterSpacing(c2, '6px');
  c2.font = '34px "JetBrains Mono", monospace';
  const yE = yBB + 192 + 82;
  c2.fillText('EST. OCT 14 2025', 450, yE);
  const ew = c2.measureText('EST. OCT 14 2025').width;
  c2.fillRect(450 - ew / 2 - 132, yE - 14, 104, 5);
  c2.fillRect(450 + ew / 2 + 28, yE - 14, 104, 5);
  return lc;
}

/** Canvas letterSpacing is unsupported on older Safari; tracking is cosmetic. */
function setLetterSpacing(g: CanvasRenderingContext2D, v: string): void {
  try {
    (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
      v;
  } catch {
    /* ignore */
  }
}

/**
 * A wave-equation water surface in a GPU ping-pong float buffer.
 *
 * Three programs rather than the shared PingPong pair: the step pass
 * integrates the height field, a splat pass blends drops additively into
 * the *live* texture between steps, and the display pass refracts light
 * through the surface. The splat pass and the CPU height probe both need
 * the live framebuffer, which PingPong keeps private, so the ping-pong
 * plumbing is owned here.
 */
export class CausticsPoolAnimation extends PixiAnimation<typeof MANIFEST> {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private stepProg: WebGLProgram | null = null;
  private splatProg: WebGLProgram | null = null;
  private dispProg: WebGLProgram | null = null;
  private stepL: Locs = {};
  private splatL: Locs = {};
  private dispL: Locs = {};
  private lockTx: WebGLTexture | null = null;
  private failed = false;

  /** Height-field pair: .x is h, .y is h at the previous step. */
  private hTex: (WebGLTexture | null)[] = [];
  private hFb: (WebGLFramebuffer | null)[] = [];
  private hi = 0;
  private sw = 0;
  private simH = 0;

  /** Which readPixels format the driver will give us, probed once. */
  private readMode: 'float' | 'half' | 'none' | null = null;
  private readBufF: Float32Array | null = null;
  private readBufH: Uint16Array | null = null;

  private sprite: PIXI.Sprite | null = null;
  private texture: PIXI.Texture | null = null;

  private time = 0;
  private acc = 0;
  private fontT = 0;
  private mx = -1;
  private my = -1;
  /** Cursor velocity in uv/s, used as the collider's own momentum. */
  private cvx = 0;
  private cvy = 0;
  private nextRain = 0.4;
  private nextBig = 6;
  /** Seed the field once, then run it forward before the first visible frame. */
  private primed = false;
  private preroll = 0;
  /** Forcing clock, advanced per simulation step and wrapped. Never wall time. */
  private windT = 0;
  private pendingSplats: Splat[] = [];
  private toys: Toy[] = [];

  private toyA = new Float32Array(16);
  private toyD = new Float32Array(16);

  constructor(initialControls?: Partial<CausticsPoolControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.time = 0;
    this.acc = 0;
    this.fontT = 0;
    this.mx = -1;
    this.my = -1;
    this.nextRain = 0.4;
    this.nextBig = 6;
    this.primed = false;
    this.preroll = 0;
    this.windT = 0;
    this.cvx = 0;
    this.cvy = 0;
    this.pendingSplats = [];
    this.toys = [
      {
        x: 0.32,
        y: 0.62,
        r: 0.085,
        type: 0,
        hit: 1.0,
        vx: 0,
        vy: 0,
        spin: 0.4,
        vs: 0.2,
        h: 0,
        gx: 0,
        gy: 0,
        tx: 0,
        ty: 0,
        M: identity3(),
      },
      {
        x: 0.66,
        y: 0.38,
        r: 0.145,
        type: 1,
        hit: 1.0,
        vx: 0,
        vy: 0,
        spin: 1.2,
        vs: -0.15,
        h: 0,
        gx: 0,
        gy: 0,
        tx: 0,
        ty: 0,
        M: identity3(),
      },
      {
        x: 0.52,
        y: 0.76,
        r: 0.078,
        type: 2,
        hit: 0.62,
        vx: 0,
        vy: 0,
        spin: 2.6,
        vs: 0.1,
        h: 0,
        gx: 0,
        gy: 0,
        tx: 0,
        ty: 0,
        M: identity3(),
      },
    ];
  }

  /** Build the context and the three programs. False means stop retrying. */
  private build(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      premultipliedAlpha: true,
    });
    if (!gl) return false;
    // The height field is a float render target; without this there is no
    // simulation to run at all.
    if (!gl.getExtension('EXT_color_buffer_float')) return false;

    const stepProg = program(gl, STEP_FS, 'step');
    const splatProg = program(gl, SPLAT_FS, 'splat');
    const dispProg = program(gl, DISPLAY_FS, 'disp');
    if (!stepProg || !splatProg || !dispProg) return false;

    this.canvas = canvas;
    this.gl = gl;
    this.stepProg = stepProg;
    this.splatProg = splatProg;
    this.dispProg = dispProg;
    this.stepL = locsOf(gl, stepProg, STEP_UNIFORMS);
    this.splatL = locsOf(gl, splatProg, SPLAT_UNIFORMS);
    this.dispL = locsOf(gl, dispProg, DISP_UNIFORMS);
    this.lockTx = mkTexFrom(gl, buildLockupCanvas());
    return true;
  }

  /**
   * (Re)build the height buffers so grid cells stay square on screen —
   * anisotropic cells would make ripples propagate faster along one axis.
   * Total cell count is held near 147456 so the cost is resolution-stable.
   */
  private ensureSim(W: number, H: number): void {
    const asp = W / Math.max(1, H);
    let sh = Math.round(Math.sqrt(147456 / asp));
    sh = Math.max(96, Math.min(640, sh));
    const sw = Math.max(96, Math.min(1024, Math.round(sh * asp)));
    if (this.sw === sw && this.simH === sh) return;
    const gl = this.gl!;
    for (const t of this.hTex) if (t) gl.deleteTexture(t);
    for (const f of this.hFb) if (f) gl.deleteFramebuffer(f);
    this.sw = sw;
    this.simH = sh;
    const mkT = () => {
      const tx = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        sw,
        sh,
        0,
        gl.RGBA,
        gl.HALF_FLOAT,
        null
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tx;
    };
    const mkFb = (tx: WebGLTexture) => {
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tx,
        0
      );
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return fb;
    };
    this.hTex = [mkT(), mkT()];
    this.hFb = [mkFb(this.hTex[0]!), mkFb(this.hTex[1]!)];
    this.hi = 0;
    // Readback format is a property of the attachment, so re-probe it.
    this.readMode = null;
    // The textures were just cleared, so the pool is flat again — re-prime it
    // or a resize drops the viewer back onto a mirror with no caustics.
    this.primed = false;
  }

  /**
   * Read the height and its central-difference gradient at a toy's position
   * straight out of the live framebuffer — that 3x3 readback is what couples
   * the GPU wave field to the CPU toy physics. The caller must have bound
   * the live framebuffer first. Returns null once the driver has proven it
   * will not hand back a readable format, so the toys fall back to drifting.
   */
  private readToySample(
    tx: number,
    ty: number
  ): [number, number, number] | null {
    const gl = this.gl!;
    if (this.readMode === 'none') return null;
    const px = Math.max(1, Math.min(this.sw - 2, Math.round(tx * this.sw)));
    const py = Math.max(1, Math.min(this.simH - 2, Math.round(ty * this.simH)));
    try {
      if (this.readMode === null) {
        const t = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);
        const f = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT);
        this.readMode =
          f === gl.RGBA && t === gl.FLOAT
            ? 'float'
            : f === gl.RGBA && t === gl.HALF_FLOAT
              ? 'half'
              : 'none';
        if (this.readMode === 'none') return null;
      }
      let v: (x: number, y: number) => number;
      if (this.readMode === 'float') {
        if (!this.readBufF) this.readBufF = new Float32Array(36);
        gl.readPixels(px - 1, py - 1, 3, 3, gl.RGBA, gl.FLOAT, this.readBufF);
        const b = this.readBufF;
        v = (x, y) => b[(y * 3 + x) * 4];
      } else {
        if (!this.readBufH) this.readBufH = new Uint16Array(36);
        gl.readPixels(
          px - 1,
          py - 1,
          3,
          3,
          gl.RGBA,
          gl.HALF_FLOAT,
          this.readBufH
        );
        const b = this.readBufH;
        v = (x, y) => h2f(b[(y * 3 + x) * 4]);
      }
      const h = v(1, 1);
      if (!isFinite(h)) return null;
      return [h, (v(2, 1) - v(0, 1)) * 0.5, (v(1, 2) - v(1, 0)) * 0.5];
    } catch {
      this.readMode = 'none';
      return null;
    }
  }

  onUpdate(
    app: PIXI.Application,
    controls: CausticsPoolControlValues,
    deltaTime: number
  ): void {
    if (this.failed) return;
    const dt = Math.min(0.05, deltaTime);

    if (!this.gl) {
      // The floor lockup is rasterized once, so wait for its display faces
      // rather than baking a fallback that never refreshes. Four seconds is
      // the giving-up point.
      this.fontT += dt;
      if (
        this.fontT < 4 &&
        document.fonts &&
        !LOCKUP_FONTS.every((f) => document.fonts.check(f))
      ) {
        for (const f of LOCKUP_FONTS) void document.fonts.load(f);
        return;
      }
      if (!this.build()) {
        this.failed = true;
        return;
      }
    }
    const gl = this.gl!;

    if (!this.sprite) {
      this.texture = PIXI.Texture.from(this.canvas!);
      this.sprite = new PIXI.Sprite(this.texture);
      this.getRoot().addChild(this.sprite);
    }

    this.time += dt;

    const sw = app.screen.width;
    const sh = app.screen.height;
    const dpr = this.dpr ?? Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(2, Math.round(sw * dpr));
    const H = Math.max(2, Math.round(sh * dpr));
    if (this.canvas!.width !== W || this.canvas!.height !== H) {
      this.canvas!.width = W;
      this.canvas!.height = H;
      this.texture?.source.resize(W, H);
    }
    this.sprite.width = sw;
    this.sprite.height = sh;
    this.ensureSim(W, H);

    const interactive = Number(controls.mode) > 0.5;
    const toysOn = Number(controls.toys) > 0.5;
    const asp = sw / Math.max(1, sh);
    // Splats queued by last frame's collisions land at the head of this one.
    const splats = this.pendingSplats.splice(0);

    // Open on water that is already alive. Without this the pool spends its
    // first seconds as a mirror while the wind builds the chop up from flat,
    // and the caustics — the whole point — are invisible for all of it.
    //
    // Let the wind do it rather than seeding drops: seeded drops ring as big
    // coherent circles, and coherent circles focus into blown-out white
    // donuts instead of filigree. Wind builds the same energy as broken chop.
    if (!this.primed) {
      this.primed = true;
      this.preroll = 240;
    }

    const pointer = this.pointer;
    const mouse = pointer?.mouse;

    if (interactive && mouse?.active) {
      const mx = mouse.x / sw;
      const my = 1 - mouse.y / sh;
      if (this.mx >= 0 && dt > 0) {
        this.cvx = this.cvx * 0.5 + ((mx - this.mx) / dt) * 0.5;
        this.cvy = this.cvy * 0.5 + ((my - this.my) / dt) * 0.5;
        const dist = Math.hypot(mx - this.mx, my - this.my);
        if (dist > 0.0015) {
          // Stamp along the drag so a fast sweep still cuts a continuous
          // wake instead of a dotted line of splats.
          const steps = Math.min(4, Math.ceil(dist / 0.012));
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            splats.push({
              x: this.mx + (mx - this.mx) * t,
              y: this.my + (my - this.my) * t,
              amp: (-Math.min(0.9, dist * 14) * controls.drop * 0.35) / steps,
              rad: 4.5,
            });
          }
        }
      }
      this.mx = mx;
      this.my = my;
    } else {
      this.mx = -1;
      this.cvx = 0;
      this.cvy = 0;
    }

    if (!interactive) {
      this.nextRain -= dt;
      if (this.nextRain <= 0) {
        splats.push({
          x: rand(0.05, 0.95),
          y: rand(0.08, 0.92),
          amp: -controls.drop * rand(0.25, 0.6),
          rad: rand(2.5, 4.5),
        });
        this.nextRain = rand(0.4, 1.6) / controls.rain;
      }
      this.nextBig -= dt;
      if (this.nextBig <= 0) {
        splats.push({
          x: rand(0.2, 0.8),
          y: rand(0.25, 0.75),
          amp: -controls.drop * 2.2,
          rad: 8,
        });
        this.nextBig = rand(5, 10);
      }
    }

    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        if (!interactive) continue;
        const cx = c.x / sw;
        const cy = 1 - c.y / sh;
        splats.push({ x: cx, y: cy, amp: -controls.drop * 2.4, rad: 7 });
        if (toysOn)
          for (const T of this.toys) {
            const dx = (T.x - cx) * asp;
            const dy = T.y - cy;
            const d = Math.hypot(dx, dy);
            if (d < T.r + 0.14) {
              // Shove falls off with distance but is capped near the centre
              // so a direct hit does not fling the toy off-screen.
              const f = 0.02 / Math.max(d, 0.05);
              T.vx += ((dx / Math.max(d, 1e-4)) * f) / asp;
              T.vy += (dy / Math.max(d, 1e-4)) * f;
              T.vs += (Math.random() - 0.5) * 2.5;
            }
          }
      }
    }

    // Toys cut wakes as they drift, so the sim sees their motion too.
    if (toysOn && dt > 0)
      for (const T of this.toys) {
        const sp = Math.hypot(T.vx * asp, T.vy);
        if (sp > 0.012)
          splats.push({
            x: T.x,
            y: T.y,
            amp: -Math.min(0.45, sp * 2.2) * 3.0 * dt,
            rad: Math.max(2.5, T.r * this.simH * 0.7),
          });
      }

    if (splats.length) {
      // Additive blending onto the live texture: each drop adds its gaussian
      // to the current height without disturbing h_prev in .y.
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.blendEquation(gl.FUNC_ADD);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.hFb[this.hi]);
      gl.viewport(0, 0, this.sw, this.simH);
      gl.useProgram(this.splatProg);
      gl.uniform2f(this.splatL.uSim!, this.sw, this.simH);
      for (const e of splats) {
        gl.uniform2f(this.splatL.uC!, e.x, e.y);
        gl.uniform1f(this.splatL.uAmp!, e.amp);
        gl.uniform1f(this.splatL.uRad!, e.rad);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.disable(gl.BLEND);
    }

    const bindTex = (unit: number, tx: WebGLTexture | null) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tx);
    };

    const STEP = 1 / 90;
    const doStep = () => {
      // One step of wind per step of water. Per-step, not per-frame: handing
      // every substep in a frame the same wall-clock t applies one frozen
      // gust field 1-3 times in a row, which makes chop strength a function
      // of the display refresh rate. Wrapped because hash21's sin() degrades
      // at large coordinates and this runs for hours on an ambient page —
      // safe only because wind is a force, so a seam in the forcing is just a
      // change of gust and the field itself stays continuous through it.
      this.windT = (this.windT + STEP) % 4096;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.hFb[1 - this.hi]);
      gl.viewport(0, 0, this.sw, this.simH);
      gl.useProgram(this.stepProg);
      bindTex(0, this.hTex[this.hi]);
      gl.uniform1i(this.stepL.uH!, 0);
      gl.uniform1f(this.stepL.uC2!, controls.speed);
      gl.uniform1f(this.stepL.uDamp!, controls.damp);
      gl.uniform1f(this.stepL.uWind!, controls.wind);
      gl.uniform1f(this.stepL.uTime!, this.windT);
      gl.uniform2f(this.stepL.uSim!, this.sw, this.simH);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.hi = 1 - this.hi;
    };

    // The pre-roll runs outside the accumulator on purpose: the cap below
    // would eat all but three of its steps. The forcing clock advances inside
    // doStep, so the wind moves across the roll-forward instead of pushing
    // one frozen pattern 240 times and standing a wave up out of it.
    while (this.preroll > 0) {
      this.preroll--;
      doStep();
    }

    // Fixed-step wave integration: the stencil is only stable at a fixed dt,
    // and the accumulator is capped at 3 steps so a stall cannot spiral.
    this.acc = Math.min(this.acc + dt, 3 / 90);
    while (this.acc >= STEP) {
      this.acc -= STEP;
      doStep();
    }

    // ---- toy physics: sample the surface, ride the slope
    if (toysOn) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.hFb[this.hi]);
      const KF = 9.0;
      for (const T of this.toys) {
        const smp = this.readToySample(T.x, T.y);
        if (smp) {
          // Low-pass the probe: a single cell of a half-float field is noisy,
          // and the toys should follow the swell, not the ripple texture.
          T.h = T.h * 0.8 + smp[0] * 0.2;
          T.gx = T.gx * 0.7 + smp[1] * 0.3;
          T.gy = T.gy * 0.7 + smp[2] * 0.3;
        }
        // Rotational inertia. The toy leans on a gradient of its own, chasing
        // the drift one with a ~0.4s time constant, which is what gives it
        // mass: chop averages out of it entirely, a swell rolls it late and
        // lets it back up late, and nothing can snap it over in a frame.
        const kT = 1 - Math.exp(-dt * 2.6);
        T.tx += (T.gx - T.tx) * kT;
        T.ty += (T.gy - T.ty) * kT;
        // Gravity along the surface: a floating body accelerates down the
        // local slope, so the height gradient is the force. The x term is
        // divided by aspect because velocity is carried in uv, not pixels.
        T.vx += ((-T.gx * KF) / asp) * dt;
        T.vy += -T.gy * KF * dt;
        const mul = Math.exp(-dt * 1.15);
        T.vx *= mul;
        T.vy *= mul;
        const sp = Math.hypot(T.vx * asp, T.vy);
        if (sp > 0.85) {
          T.vx *= 0.85 / sp;
          T.vy *= 0.85 / sp;
        }
        T.x += T.vx * dt;
        T.y += T.vy * dt;
        // Cursor is a solid collider: toys bounce off it and pick up its speed.
        // Contact uses the body's own radius, not the box it is drawn in.
        // The spin terms below deliberately keep T.r: the contact circle says
        // where a knock lands, the full extent says how hard it is to turn.
        const hr = T.r * T.hit;
        if (interactive && this.mx >= 0) {
          const cr = 0.024;
          const dx = (T.x - this.mx) * asp;
          const dy = T.y - this.my;
          const d = Math.hypot(dx, dy);
          const rs = hr + cr;
          if (d < rs && d > 1e-5) {
            const nx = dx / d;
            const ny = dy / d;
            T.x += (nx * (rs - d)) / asp;
            T.y += ny * (rs - d);
            const cvxs = this.cvx * asp;
            const cvys = this.cvy;
            const rvn = (T.vx * asp - cvxs) * nx + (T.vy - cvys) * ny;
            if (rvn < 0) {
              const imp = -1.6 * rvn; // e = 0.6
              T.vx += (imp * nx) / asp;
              T.vy += imp * ny;
              this.pendingSplats.push({
                x: T.x,
                y: T.y,
                amp: -Math.min(0.5, -rvn * 1.5),
                rad: Math.max(2.5, hr * this.simH * 0.6),
              });
            }
            // Tangential friction scrubs spin into the toy.
            const tx2 = -ny;
            const ty2 = nx;
            const rvt = (T.vx * asp - cvxs) * tx2 + (T.vy - cvys) * ty2;
            T.vs += ((rvt - T.vs * T.r) / T.r) * 0.4;
          }
        }
        const rx = hr / asp + 0.012;
        const ry = hr + 0.012;
        if (T.x < rx) {
          T.x = rx;
          T.vx = Math.abs(T.vx) * 0.55;
        }
        if (T.x > 1 - rx) {
          T.x = 1 - rx;
          T.vx = -Math.abs(T.vx) * 0.55;
        }
        if (T.y < ry) {
          T.y = ry;
          T.vy = Math.abs(T.vy) * 0.55;
        }
        if (T.y > 1 - ry) {
          T.y = 1 - ry;
          T.vy = -Math.abs(T.vy) * 0.55;
        }
        T.spin += T.vs * dt;
        // Water has real rotational drag. With wind pushing the toys around
        // constantly they collide far more often than they used to, and each
        // hit scrubs in spin — at the old 0.45 it outlived the collision that
        // caused it and everything turned steadily.
        T.vs *= Math.exp(-dt * 1.2);
      }
      // Ball rolls: angular velocity from translation (contact-point
      // rolling) plus its own z spin, integrated into the orientation.
      const B = this.toys[0];
      if (dt > 0) {
        const bs = Math.hypot(B.vx * asp, B.vy);
        let wx = 0;
        let wy = 0;
        if (bs > 1e-4) {
          const w = (bs / B.r) * 0.85; // slight slip on water
          wx = (-B.vy / bs) * w;
          wy = ((B.vx * asp) / bs) * w;
        }
        const wz = B.vs;
        const wm = Math.hypot(wx, wy, wz);
        if (wm > 1e-5) {
          B.M = mul3(axisAngle3(wx / wm, wy / wm, wz / wm, wm * dt), B.M);
          ortho3(B.M);
        }
      }
      // Toy-toy collisions, resolved in screen space so circles stay round.
      for (let i = 0; i < 3; i++)
        for (let j = i + 1; j < 3; j++) {
          const a = this.toys[i];
          const b = this.toys[j];
          const dx = (b.x - a.x) * asp;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy);
          const rs = a.r * a.hit + b.r * b.hit;
          if (d < rs && d > 1e-5) {
            const nx = dx / d;
            const ny = dy / d;
            const ov = (rs - d) * 0.5;
            a.x -= (nx * ov) / asp;
            a.y -= ny * ov;
            b.x += (nx * ov) / asp;
            b.y += ny * ov;
            const vn = (b.vx - a.vx) * asp * nx + (b.vy - a.vy) * ny;
            if (vn < 0) {
              const imp = -vn * 0.78;
              a.vx -= (imp * nx) / asp;
              a.vy -= imp * ny;
              b.vx += (imp * nx) / asp;
              b.vy += imp * ny;
              const rvt = (b.vx - a.vx) * asp * -ny + (b.vy - a.vy) * nx;
              a.vs += (rvt / a.r) * 0.1;
              b.vs += (rvt / b.r) * 0.1;
            }
          }
        }
    }

    // ---- display
    const T = TINTS[Math.round(Number(controls.tint))] || TINTS[0];
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.dispProg);
    bindTex(0, this.hTex[this.hi]);
    bindTex(2, this.lockTx);
    gl.uniform1i(this.dispL.uH!, 0);
    gl.uniform1i(this.dispL.uLock!, 2);
    gl.uniform1f(this.dispL.uTime!, this.time);
    gl.uniform1f(this.dispL.uDepth!, controls.depth);
    gl.uniform1f(this.dispL.uCaust!, controls.caust);
    gl.uniform1f(this.dispL.uBump!, 3.2);
    gl.uniform1f(this.dispL.uAsp!, asp);
    gl.uniform2f(this.dispL.uSim!, this.sw, this.simH);
    gl.uniform3f(this.dispL.uWater!, T.water[0], T.water[1], T.water[2]);
    gl.uniform3f(this.dispL.uSky!, T.sky[0], T.sky[1], T.sky[2]);
    gl.uniform3f(this.dispL.uSun!, T.sun[0], T.sun[1], T.sun[2]);
    gl.uniform3f(this.dispL.uFloorA!, T.floorA[0], T.floorA[1], T.floorA[2]);
    gl.uniform3f(this.dispL.uFloorB!, T.floorB[0], T.floorB[1], T.floorB[2]);
    gl.uniform3f(this.dispL.uToyA!, T.toyA[0], T.toyA[1], T.toyA[2]);
    gl.uniform3f(this.dispL.uToyB!, T.toyB[0], T.toyB[1], T.toyB[2]);
    // Radius of zero is the shader's "no toy here" sentinel, so hiding the
    // toys is just leaving the arrays zeroed.
    this.toyA.fill(0);
    this.toyD.fill(0);
    if (toysOn)
      this.toys.forEach((t2, i) => {
        // Heave, as a touch of scale — nearer the camera reads as bigger. It
        // is an absolute rise, not a fraction of the toy: a ring and a ball on
        // the same swell lift by the same amount, so charging it per radius
        // made the largest float pump the hardest, which is backwards. A big
        // ring is also the worst case for the cue, because scaling moves its
        // whole outline at once where a compact toy just bobs.
        this.toyA.set([t2.x, t2.y, t2.r + t2.h * 0.0014, t2.type], i * 4);
        this.toyD.set([t2.tx, t2.ty, t2.spin, 0], i * 4);
      });
    gl.uniform4fv(this.dispL['uToys[0]']!, this.toyA);
    gl.uniformMatrix3fv(this.dispL.uBallM!, false, this.toys[0].M);
    gl.uniform2f(this.dispL.uLockBox!, 0.6, 0.52);
    gl.uniform1f(this.dispL.uTileN!, 11.0);
    gl.uniform4fv(this.dispL['uToyD[0]']!, this.toyD);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.texture?.source.update();
  }

  onDestroy(): void {
    const gl = this.gl;
    if (gl) {
      for (const t of this.hTex) if (t) gl.deleteTexture(t);
      for (const f of this.hFb) if (f) gl.deleteFramebuffer(f);
      if (this.lockTx) gl.deleteTexture(this.lockTx);
      if (this.stepProg) gl.deleteProgram(this.stepProg);
      if (this.splatProg) gl.deleteProgram(this.splatProg);
      if (this.dispProg) gl.deleteProgram(this.dispProg);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.hTex = [];
    this.hFb = [];
    this.hi = 0;
    this.sw = 0;
    this.simH = 0;
    this.readMode = null;
    this.readBufF = null;
    this.readBufH = null;
    this.gl = null;
    this.canvas = null;
    this.stepProg = null;
    this.splatProg = null;
    this.dispProg = null;
    this.stepL = {};
    this.splatL = {};
    this.dispL = {};
    this.lockTx = null;
    this.failed = false;
    this.sprite = null;
    this.texture?.destroy(true);
    this.texture = null;
    super.onDestroy();
  }
}

export function createCausticsPoolAnimation(
  initialControls?: Partial<CausticsPoolControlValues>
): CausticsPoolAnimation {
  return new CausticsPoolAnimation(initialControls);
}
