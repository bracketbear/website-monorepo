/**
 * The erosion table's four passes.
 *
 * `flux` and `step` are a line-for-line mirror of `fluxPass` and
 * `terrainPass` in `physics.ts`, which is the version that gets tested. When
 * one changes the other has to, and the test is the arbiter of whether the
 * model still channelises.
 *
 * State lives in two float render targets:
 *
 *   uTer  .x terrain height   .y water depth   .z suspended sediment   .w snow
 *   uFlx  .x outflow left     .y right         .z down                 .w up
 *
 * plus `uB0`, the terrain exactly as it was baked, which never changes. The
 * display reads it to show what has been cut away and what has been laid
 * down; the step pass reads it to know where the range is.
 *
 * Both targets are RGBA32F with NEAREST filtering. 32-bit is not optional:
 * a single step moves the bed by a few parts in 10^7 of the relief, and
 * half-float has thrown that away before it reaches the texture. NEAREST is
 * because float32 filtering is an extension (`OES_texture_float_linear`)
 * that some drivers do not have, so the bilinear taps that need it are
 * written out by hand in `texB` and behave the same everywhere.
 */

/** Value noise shared by the step and display passes. */
const NOISE = `
    float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), fr = fract(p);
      vec2 u = fr * fr * (3.0 - 2.0 * fr);
      return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
                 mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    // Drifting storm cells. A forcing with a history, not a picture of
    // weather: the clock is advanced one tick per simulation step and
    // wrapped, so the drift never becomes a function of refresh rate and the
    // hash never runs out to where sin() goes flat. The drift constants are
    // in STORM-CELL units, because they are subtracted after the frequency
    // scale — 0.11 at uRainFreq 3.2 is about 0.034 world units per second,
    // so a cell crosses the mountain in roughly half a minute.
    float rainAt(vec2 uv, float t, float freq, float base, float asp) {
      vec2 q = uv * vec2(freq * asp, freq) - vec2(t * 0.11, t * 0.03);
      // Three octaves and a wide threshold. Two octaves of value noise put
      // the underlying lattice on screen: the cells came out with straight
      // vertical and horizontal edges and the storm shadow read as a dark
      // rectangle sitting on the mountain. This is shaping the spectrum of a
      // forcing field, not hiding a period — the field has no period to hide.
      float g = vnoise(q) * 0.56
              + vnoise(q * 2.31 + vec2(11.3, 4.7)) * 0.30
              + vnoise(q * 5.07 + vec2(3.9, 27.1)) * 0.14;
      return base + smoothstep(0.38, 0.95, g);
    }`;

/** Hand-written bilinear tap, so nothing depends on float texture filtering. */
const BILERP = `
    vec4 texB(sampler2D T, vec2 uv, vec2 sz) {
      vec2 p = uv * sz - 0.5;
      vec2 i = floor(p), f = p - i;
      vec2 b0 = (i + 0.5) / sz, px = 1.0 / sz;
      return mix(mix(texture(T, b0), texture(T, b0 + vec2(px.x, 0.0)), f.x),
                 mix(texture(T, b0 + vec2(0.0, px.y)), texture(T, b0 + px), f.x), f.y);
    }`;

/**
 * Virtual-pipe flux update.
 *
 * Each face carries an outflow in world depth per second, accelerated by the
 * depth-integrated shallow-water momentum term against the head `b + w`.
 * `uFDamp` is the bed friction.
 *
 * The clamp at the end is what makes the scheme safe at any step size: a
 * cell can never send away more water than it holds. Because the CLAMPED
 * value is what gets stored, the neighbour reads back the same number as
 * inflow and mass stays conserved across the pair of passes.
 *
 * An open edge is a cliff — the ghost cell outside sits one cell-size lower
 * with no water on it. That matters more than it sounds: with the outside
 * bed at the same height the head difference is only the local depth, which
 * is an order of magnitude under the head differences the terrain slope
 * produces inside, so the interior feeds the rim faster than the rim can
 * drain and the whole table floods.
 */
export const FLUX_FS = `#version 300 es
    precision highp float;
    out vec4 fragColor;
    uniform sampler2D uTer, uFlx;
    uniform vec2 uSim;
    uniform float uDt, uGrav, uFDamp, uDx;
    void main() {
      ivec2 C = ivec2(gl_FragCoord.xy);
      ivec2 N = ivec2(uSim) - 1;
      vec4 c = texelFetch(uTer, C, 0);
      vec4 f = texelFetch(uFlx, C, 0);
      float wc = c.y;
      float h = c.x + wc;
      float edge = wc + uDx;
      vec4 tL = texelFetch(uTer, ivec2(max(C.x - 1, 0), C.y), 0);
      vec4 tR = texelFetch(uTer, ivec2(min(C.x + 1, N.x), C.y), 0);
      vec4 tB = texelFetch(uTer, ivec2(C.x, max(C.y - 1, 0)), 0);
      vec4 tT = texelFetch(uTer, ivec2(C.x, min(C.y + 1, N.y)), 0);
      vec4 d = vec4(
        C.x > 0     ? h - (tL.x + tL.y) : edge,
        C.x < N.x   ? h - (tR.x + tR.y) : edge,
        C.y > 0     ? h - (tB.x + tB.y) : edge,
        C.y < N.y   ? h - (tT.x + tT.y) : edge);
      // dx SQUARED: the pipe carries depth per second while the momentum
      // equation is written for discharge per unit width, and those differ
      // by a cell size; the head difference needs the other one to become a
      // slope. Drop either and flow speed scales with the grid.
      float kw = uDt * uGrav * wc / (uDx * uDx);
      vec4 nf = max(vec4(0.0), f * uFDamp + kw * d);
      float want = (nf.x + nf.y + nf.z + nf.w) * uDt;
      if (want > wc) nf *= wc / max(want, 1e-30);
      fragColor = nf;
    }`;

/**
 * Water, sediment, terrain and snow.
 *
 * Order matters: route the water, measure how fast it is moving, advect the
 * sediment that was already in flight, then settle the exchange between the
 * flow and the bed against whatever arrived. Capacity goes as slope times
 * speed, so it collapses the moment a channel reaches the flats — which is
 * why the load drops out there as a fan, with nobody having drawn one.
 */
export const STEP_FS = `#version 300 es
    precision highp float;
    out vec4 fragColor;
    uniform sampler2D uTer, uFlx, uB0;
    uniform vec2 uSim;
    uniform float uDt, uDx, uAsp, uT;
    uniform float uKc, uKs, uKd, uWCap, uMinSlope, uEvap, uCreep;
    uniform float uRepose, uMaxDrop;
    uniform float uRain, uRainBase, uRainFreq, uOro;
    uniform float uRelief, uSnowLine, uSnowBand, uMelt, uSnowMax;
    uniform float uUplift, uUpMax;
    ${NOISE}
    ${BILERP}
    void main() {
      ivec2 C = ivec2(gl_FragCoord.xy);
      ivec2 N = ivec2(uSim) - 1;
      vec4 c = texelFetch(uTer, C, 0);
      vec4 fo = texelFetch(uFlx, C, 0);
      // Inflow is the neighbour's pipe pointing this way. Off the edge of the
      // domain nothing flows in, which is what makes the rim a sink.
      float inL = C.x > 0   ? texelFetch(uFlx, ivec2(C.x - 1, C.y), 0).y : 0.0;
      float inR = C.x < N.x ? texelFetch(uFlx, ivec2(C.x + 1, C.y), 0).x : 0.0;
      float inB = C.y > 0   ? texelFetch(uFlx, ivec2(C.x, C.y - 1), 0).w : 0.0;
      float inT = C.y < N.y ? texelFetch(uFlx, ivec2(C.x, C.y + 1), 0).z : 0.0;

      float wOld = c.y;
      float wNew = max(0.0, wOld + uDt * (inL + inR + inB + inT
                                        - fo.x - fo.y - fo.z - fo.w));
      float wAvg = 0.5 * (wOld + wNew);
      float den = max(wAvg, 1e-7);
      // Net flux through the cell, turned into a velocity by dividing by the
      // depth it is passing through.
      float ux = 0.5 * (inL - fo.x + fo.y - inR) * uDx / den;
      float uy = 0.5 * (inB - fo.z + fo.w - inT) * uDx / den;
      float vel = length(vec2(ux, uy));

      float bc = c.x;
      float bL = texelFetch(uTer, ivec2(max(C.x - 1, 0), C.y), 0).x;
      float bR = texelFetch(uTer, ivec2(min(C.x + 1, N.x), C.y), 0).x;
      float bB = texelFetch(uTer, ivec2(C.x, max(C.y - 1, 0)), 0).x;
      float bT = texelFetch(uTer, ivec2(C.x, min(C.y + 1, N.y)), 0).x;
      vec2 gb = vec2(bR - bL, bT - bB) / (2.0 * uDx);
      // Slope ALONG THE FLOW, not the magnitude of the gradient. Capacity
      // taken from |grad b| is largest on the steep WALLS of a nascent
      // channel, where the water is running parallel to the contour and
      // doing nothing, so the walls cut back as fast as the floor and every
      // channel washes flat as soon as it starts. Stream power is discharge
      // times the downslope gradient in the direction of travel, which is
      // zero across a wall, so the floor wins and the channel deepens.
      vec2 dir = vel > 1e-9 ? vec2(ux, uy) / vel : vec2(0.0);
      float down = max(0.0, -dot(dir, gb));
      float sinA = down / sqrt(1.0 + down * down);
      float cap = uKc * max(sinA, uMinSlope) * vel * min(wAvg, uWCap);

      // Sediment already in the water arrives from upstream. Semi-Lagrangian,
      // so a CFL above one smears rather than detonating.
      vec2 uvC = (vec2(C) + 0.5) / uSim;
      vec2 back = uvC - vec2(ux / uAsp, uy) * uDt;
      float sAdv = texB(uTer, back, uSim).z;

      float d = cap - sAdv;
      // Positive dep lays material down, negative cuts into the bed.
      float dep = (d > 0.0 ? -uKs : -uKd) * d * uDt;
      dep = min(dep, sAdv);           // cannot drop more than is being carried
      float sNew = max(0.0, sAdv - dep);
      float bNew = bc + dep;

      // Hillslope creep — the other half of the landscape-evolution
      // equation. Stream power alone cuts channels exactly one cell wide,
      // because the feedback is strongest at whichever single cell is
      // deepest, and the result is a grid of slot canyons that reads as
      // stair-stepped rubbish however it is shaded. Soil creep is what makes
      // real hillslopes convex and real valleys V-shaped. Carried as the
      // diffusion Courant number so stability does not move with the grid;
      // the explicit five-point stencil is stable to 0.25 and the control
      // is clamped below that.
      bNew += uCreep * (bL + bR + bB + bT - 4.0 * bc);

      // Slope failure. Capacity goes as the slope along the flow, so a cell
      // that cuts deeper gets a steeper approach and cuts faster still —
      // a feedback with no limiter in it. Measured at a 128-cell grid it
      // runs away outright: the deepest cell drilled to twelve times the
      // relief of the whole mountain and the field stopped being finite.
      // Ground past the angle of repose does not stand up; it slides. Each
      // pair exchanges whatever exceeds the limit, written from both sides
      // with the same magnitude, so mass is conserved without a third pass.
      vec4 nb = vec4(bL, bR, bB, bT) - bc;
      vec4 giv = max(vec4(0.0), -nb - uMaxDrop);
      vec4 got = max(vec4(0.0), nb - uMaxDrop);
      vec4 net = got - giv;
      bNew += uRepose * (net.x + net.y + net.z + net.w);

      // Precipitation. Mountains make their own weather, so the orographic
      // term rains hardest on the high ground: the terrain decides where the
      // water that reshapes it lands.
      float fall = rainAt(uvC, uT, uRainFreq, uRainBase, uAsp) * uRain
                 * (1.0 + uOro * min(1.4, bNew / max(uRelief, 1e-6))) * uDt;
      float lineLo = (uSnowLine - uSnowBand) * uRelief;
      float lineHi = (uSnowLine + uSnowBand) * uRelief;
      float sn = c.w;
      float toSnow = min(fall * smoothstep(lineLo, lineHi, bNew),
                         max(0.0, uSnowMax - sn));
      sn += toSnow;
      wNew += fall - toSnow;
      // Melt runs fastest at the bottom of the transition band and stops
      // above it, so a peak holds its cap until erosion drops it through the
      // line — and then the cap is gone and the meltwater is a pulse.
      float below = clamp((lineHi - bNew) / max(lineHi - lineLo, 1e-9), 0.0, 1.0);
      float melt = min(sn, uMelt * below * uDt);
      sn -= melt;
      wNew += melt;

      wNew *= exp(-uEvap * uDt);

      // Tectonics. Without it the table erodes to a plane and an ambient page
      // ends on one; with it, erosion and uplift settle into the dynamic
      // equilibrium that real drainage networks live in. The taper stops a
      // high setting inflating the range without bound.
      float b0 = texelFetch(uB0, C, 0).x;
      float shape = smoothstep(0.15, 0.6, b0 / max(uRelief, 1e-6));
      float room = clamp(1.0 - (bNew - b0) / max(uUpMax, 1e-9), 0.0, 1.0);
      bNew += uUplift * shape * room * uDt;

      fragColor = vec4(bNew, wNew, sNew, sn);
    }`;

/**
 * Cursor and rain bursts, blended additively onto the live state texture.
 *
 * `uAdd` is a whole vec4, so the same pass drops water on the mountain or
 * pushes the bed up under it depending on which channel the brush writes to.
 */
export const SPLAT_FS = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform vec2 uC, uSim;
    uniform float uRad;
    uniform vec4 uAdd;
    void main() {
      vec2 d = (vUV - uC) * uSim;
      fragColor = uAdd * exp(-dot(d, d) / (uRad * uRad));
    }`;

/**
 * Everything visible, derived from the one field.
 *
 * The shading, the colour of the rock, where the snow is, how bright the
 * streams run and where the contours sit are all projections of `uTer` and
 * `uB0`. Nothing here has a clock of its own except the storm shadows, and
 * those run on the simulation's forcing clock — the same number the rain is
 * computed from — so the rivers swell behind the cloud that filled them.
 */
export const DISPLAY_FS = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uTer, uFlx, uB0;
    uniform vec2 uSim;
    uniform float uDx, uAsp, uT, uExag, uRelief, uSnowMax;
    uniform float uStreams, uContours, uRainFreq, uRainBase;
    // Display scales, kept separate from the simulation's own constants:
    // .x the depth at which water goes opaque, .y the sediment load that
    // fully browns it, .z the stream power that reads as a lit channel.
    // Tying these to the physics cap would mean a tuning change to one
    // silently restyling the other.
    uniform vec3 uScale;
    uniform vec3 uRockLo, uRockHi, uBare, uSilt, uSnowC, uWater, uSiltW, uSun, uSky, uGlow;
    ${NOISE}
    ${BILERP}
    void main() {
      vec2 px = 1.0 / uSim;
      vec4 T = texB(uTer, vUV, uSim);
      float b = T.x, w = T.y, sed = T.z, sn = T.w;
      float b0 = texB(uB0, vUV, uSim).x;
      float rel = max(uRelief, 1e-6);
      float bn = b / rel;

      // Surface normal. The exaggeration is a display knob only — the
      // simulation always ran on the true relief, so the slopes that drove
      // the erosion are not the slopes being drawn.
      // A cell and a half, not one. Bilinear interpolation is continuous in
      // height but not in slope, so a one-cell difference picks up the jump
      // at every cell boundary and the hillshade comes out faceted. Widening
      // the stencil averages across the seam.
      vec2 e = px * 1.5;
      float hl = texB(uTer, vUV - vec2(e.x, 0.0), uSim).x;
      float hr = texB(uTer, vUV + vec2(e.x, 0.0), uSim).x;
      float hb = texB(uTer, vUV - vec2(0.0, e.y), uSim).x;
      float ht = texB(uTer, vUV + vec2(0.0, e.y), uSim).x;
      vec2 g = vec2(hr - hl, ht - hb) / (3.0 * uDx) * uExag;
      vec3 n = normalize(vec3(-g, 1.0));
      float slope = clamp(length(g) * 0.55, 0.0, 1.0);

      // Low sun from the north-west, the convention every relief map uses,
      // because the eye reads a lit-from-above scene as raised and a
      // lit-from-below one as a hole.
      vec3 sunDir = normalize(vec3(-0.62, 0.58, 0.53));
      float lam = max(0.0, dot(n, sunDir));
      // Storm shadow: the same rain field the step pass is forced by. It is
      // here so the cause is visible — you watch the cell cross the ridge and
      // the streams come up behind it.
      float cloud = rainAt(vUV, uT, uRainFreq, uRainBase, uAsp);
      float shade = 1.0 - 0.22 * smoothstep(0.30, 1.15, cloud);
      float sky = 0.40 + 0.60 * n.z;

      // ---- the bed, and its history
      // What the water took away and what it put back. This is the whole
      // record of the run: clean terrain reads as a render, a cut and
      // refilled one reads as a place that weather has happened to.
      float cut = b0 - b;
      // Gentle thresholds on purpose. Set tight, these read as switches
      // rather than as weathering: the first trace of erosion flipped the
      // rock to its bare colour, so a cursor stroke left a black scar
      // instead of a fresh channel.
      float inc = smoothstep(0.0, rel * 0.055, cut);
      float fill = smoothstep(0.0, rel * 0.012, -cut);

      vec3 rock = mix(uRockLo, uRockHi, smoothstep(0.12, 0.92, bn));
      rock = mix(rock, uRockHi * 1.06, slope * 0.55);      // steep ground is bare
      rock = mix(rock, uBare, inc * 0.6);                  // freshly incised
      rock = mix(rock, uSilt, fill * 0.75);                // outwash and fans
      // Skylight is doing real work here, not just lifting the exposure. A
      // mountain lit only by a low sun loses its whole shaded flank to
      // black, and on a cone that is half the subject. The sky term is
      // scaled by n.z, so it is a sky-view factor rather than a flat lift:
      // slopes that face away from the sun still show their relief, and
      // valley floors that can see less sky still sit deeper.
      vec3 col = rock * (uSky * sky * 1.25 + uSun * lam * shade * 1.05);

      // ---- contours, cut into the live surface so they crawl as it erodes
      if (uContours > 0.0) {
        float iv = rel / 22.0;
        float cph = b / iv;
        float fw = max(fwidth(cph), 1e-5);
        // Distance to the nearest contour, measured in pixels. The earlier
        // version compared a distance in phase against a width in phase and
        // saturated to solid wherever the ground was steep, which painted
        // black spikes down every headwall.
        float d = abs(fract(cph) - 0.5) / fw;
        float line = 1.0 - smoothstep(0.5, 1.5, d);
        float di = abs(fract(cph / 5.0) - 0.5) * 5.0 / fw;   // index contours
        float idx = 1.0 - smoothstep(0.5, 1.5, di);
        // Fade them out once the lines would be closer together than they
        // can be drawn. Contours that cannot resolve are not contours, they
        // are a grey wash, and on a cone that is most of the mountain.
        float fade = 1.0 - smoothstep(0.30, 0.9, fw);
        col *= 1.0 - uContours * fade * (0.20 * line + 0.18 * idx);
      }

      // ---- water
      // Depth sets opacity, sediment sets colour. A torrent coming off a
      // fresh cut runs brown and clears as it drops its load.
      float load = clamp(sed / max(uScale.y, 1e-9), 0.0, 1.0);
      vec3 wc = mix(uWater, uSiltW, load);
      float wa = 1.0 - exp(-w / max(uScale.x, 1e-9));
      col = mix(col, wc * (uSky * 0.6 + uSun * (0.35 + 0.65 * lam) * shade), wa * 0.88);
      // A sheen along the streams, from the same sun.
      float spec = pow(max(0.0, dot(reflect(-sunDir, n), vec3(0.0, 0.0, 1.0))), 28.0);
      col += uSun * spec * wa * 0.55 * shade;

      // ---- the measured quantity, made visible
      // Stream power: depth times speed. This is what distinguishes a
      // drainage network from a wet hillside, and it is a number the
      // simulation computed, not a texture anyone drew.
      vec4 f = texture(uFlx, vUV);
      float fx = 0.5 * (f.y - f.x), fy = 0.5 * (f.w - f.z);
      float flow = length(vec2(fx, fy)) * uDx;    // depth * speed, near enough
      float power = smoothstep(0.0, 1.0, flow / max(uScale.z, 1e-9));
      col += uGlow * power * uStreams * 0.30;

      // ---- snow, over everything, shaded by the same normal
      float sc = smoothstep(0.0, uSnowMax * 0.30, sn);
      vec3 snowCol = uSnowC * (uSky * 0.30 + uSun * (0.30 + 0.70 * lam) * shade);
      col = mix(col, snowCol, sc * (1.0 - wa * 0.6));

      fragColor = vec4(col, 1.0);
    }`;

export const FLUX_UNIFORMS = [
  'uTer',
  'uFlx',
  'uSim',
  'uDt',
  'uGrav',
  'uFDamp',
  'uDx',
] as const;

export const STEP_UNIFORMS = [
  'uTer',
  'uFlx',
  'uB0',
  'uSim',
  'uDt',
  'uDx',
  'uAsp',
  'uT',
  'uKc',
  'uKs',
  'uKd',
  'uWCap',
  'uMinSlope',
  'uEvap',
  'uCreep',
  'uRepose',
  'uMaxDrop',
  'uRain',
  'uRainBase',
  'uRainFreq',
  'uOro',
  'uRelief',
  'uSnowLine',
  'uSnowBand',
  'uMelt',
  'uSnowMax',
  'uUplift',
  'uUpMax',
] as const;

export const SPLAT_UNIFORMS = ['uC', 'uSim', 'uRad', 'uAdd'] as const;

export const DISP_UNIFORMS = [
  'uTer',
  'uFlx',
  'uB0',
  'uSim',
  'uDx',
  'uAsp',
  'uT',
  'uExag',
  'uRelief',
  'uSnowMax',
  'uScale',
  'uStreams',
  'uContours',
  'uRainFreq',
  'uRainBase',
  'uRockLo',
  'uRockHi',
  'uBare',
  'uSilt',
  'uSnowC',
  'uWater',
  'uSiltW',
  'uSun',
  'uSky',
  'uGlow',
] as const;

export interface Palette {
  rockLo: [number, number, number];
  rockHi: [number, number, number];
  bare: [number, number, number];
  silt: [number, number, number];
  snow: [number, number, number];
  water: [number, number, number];
  siltW: [number, number, number];
  sun: [number, number, number];
  sky: [number, number, number];
  glow: [number, number, number];
}

/**
 * Every palette keeps the ground dark enough for the stream glow to climb
 * out of it. Additive light is only as legible as the headroom under it, and
 * a palette that erases the thing the simulation computed is worse than one
 * that never had it.
 */
export const TINTS: Palette[] = [
  {
    // Cascade. Wet basalt, alpine rock, glacial outwash.
    rockLo: [0.15, 0.2, 0.16],
    rockHi: [0.42, 0.41, 0.42],
    bare: [0.27, 0.22, 0.19],
    silt: [0.55, 0.5, 0.41],
    snow: [0.95, 0.96, 1.0],
    water: [0.1, 0.3, 0.38],
    siltW: [0.42, 0.31, 0.18],
    sun: [1.0, 0.95, 0.86],
    sky: [0.3, 0.4, 0.55],
    glow: [0.75, 0.9, 1.0],
  },
  {
    // Ochre. Badlands, where the incision is the whole landscape.
    rockLo: [0.28, 0.17, 0.12],
    rockHi: [0.46, 0.31, 0.21],
    bare: [0.34, 0.15, 0.1],
    silt: [0.66, 0.56, 0.4],
    snow: [0.93, 0.92, 0.9],
    water: [0.22, 0.24, 0.22],
    siltW: [0.48, 0.33, 0.17],
    sun: [1.0, 0.9, 0.74],
    sky: [0.38, 0.3, 0.3],
    glow: [1.0, 0.85, 0.6],
  },
  {
    // Slate. A survey sheet that happens to be running.
    rockLo: [0.2, 0.22, 0.25],
    rockHi: [0.55, 0.57, 0.6],
    bare: [0.2, 0.21, 0.24],
    silt: [0.6, 0.6, 0.58],
    snow: [0.97, 0.98, 1.0],
    water: [0.1, 0.26, 0.42],
    siltW: [0.3, 0.3, 0.3],
    sun: [1.0, 1.0, 1.0],
    sky: [0.32, 0.36, 0.44],
    glow: [0.55, 0.78, 1.0],
  },
  {
    // Night. The darkest ground, so the drainage network reads as light.
    rockLo: [0.035, 0.045, 0.065],
    rockHi: [0.1, 0.11, 0.15],
    bare: [0.05, 0.05, 0.07],
    silt: [0.16, 0.16, 0.17],
    snow: [0.55, 0.62, 0.78],
    water: [0.03, 0.08, 0.14],
    siltW: [0.1, 0.09, 0.08],
    sun: [0.55, 0.62, 0.8],
    sky: [0.06, 0.09, 0.16],
    glow: [0.4, 0.8, 1.0],
  },
];
