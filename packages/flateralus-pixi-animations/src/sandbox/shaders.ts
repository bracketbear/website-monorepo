/**
 * The sandbox's three passes.
 *
 * `STEP_FS` is a line-for-line mirror of `fluxPass` + `sandPass` in
 * `physics.ts`, which is the version that gets tested. When one changes the
 * other has to, and the test is the arbiter of whether ripples still form
 * and tracks still last.
 *
 * State is one float render target:
 *
 *   uH  .x sand height above the box floor, world units   .y moisture 0..1
 *
 * RGBA32F with NEAREST filtering. 32-bit is required: a step of saltation
 * moves the bed by parts in 10^5 of the sand depth, and half-float has
 * thrown that away before it reaches the texture. NEAREST because float32
 * filtering is an extension not every driver has; the display pass writes
 * its bilinear taps out by hand.
 */

/** Value noise shared by the step and display passes. */
const NOISE = `
    float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), fr = fract(p);
      vec2 u = fr * fr * (3.0 - 2.0 * fr);
      return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
                 mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
    }`;

/**
 * Saltation, creep, slope failure and drying, in that order.
 *
 * Every face flux is computed once per face from the same taps by both
 * cells that share it — the face coordinate, the mean height across it and
 * the gust at it are all functions of the face, not the cell — so charging
 * each cell minus its divergence conserves mass exactly. Transport wraps at
 * the edges (see physics.ts for why); creep and repose clamp, because the
 * walls are real for the sand already sitting at them.
 */
export const STEP_FS = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uH;
    uniform vec2 uSim, uDir;
    uniform float uDx, uAsp, uQ, uC, uBeta, uCap, uHop, uGust, uClock;
    uniform float uCreep, uReposeDry, uReposeWet, uReposeRate, uDryMul;
    ${NOISE}
    // Gust strength at a point: cells of stronger wind drifting downwind, so
    // the ripples form patchily rather than as one grating. The drift
    // constant is in GUST-CELL units — it is subtracted after the scale.
    float gustAt(vec2 uv) {
      vec2 q = vec2(uv.x * uAsp, uv.y) * 9.0 - uDir * uClock * 0.25;
      float g = vnoise(q) * 0.6 + vnoise(q * 2.13 + vec2(5.1, 8.3)) * 0.4;
      return uGust * (0.25 + 0.75 * smoothstep(0.35, 0.75, g));
    }
    // Nearest cell at a continuous coordinate (cell i spans [i, i+1)), wrapped.
    float hAt(vec2 c) {
      // Float mod: integer % is undefined for a negative operand in ESSL.
      vec2 w = mod(floor(c), uSim);
      return texelFetch(uH, ivec2(w), 0).x;
    }
    // Grains do not all hop the same distance: the exposure tap is the mean
    // over hop lengths L-2..L+2. That spread is what selects the ripple
    // wavelength — it multiplies the growth by (1 + 2cos k + 2cos 2k)/5,
    // positive at the ripple band and negative at every shorter one — so
    // creep does not have to, and can stay small enough to leave a track alone.
    float upwind(vec2 face, float L) {
      float s = 0.0;
      for (int k = -2; k <= 2; k++) s += hAt(face - (L + float(k)) * uDir);
      return s * 0.2;
    }
    // What one neighbour pair exchanges: the excess over the repose drop,
    // with the drop set by the pair's mean moisture.
    float repose(vec4 nb, float hc, float mc, float span) {
      float drop = mix(uReposeDry, uReposeWet, 0.5 * (mc + nb.y)) * uDx * span;
      float d = nb.x - hc;
      return d > drop ? d - drop : (d < -drop ? d + drop : 0.0);
    }
    float faceFlux(vec2 face, float hf, float dirComp) {
      float L = max(3.0, uHop);
      float e = (upwind(face, L) - hf) / (L * uDx);
      float f = clamp(uC + uBeta * e, 0.0, uCap);
      return uQ * gustAt(face / uSim) * dirComp * f;
    }
    void main() {
      ivec2 s = ivec2(uSim);
      ivec2 ij = ivec2(gl_FragCoord.xy);
      vec4 c = texelFetch(uH, ij, 0);
      float hc = c.x;
      float mc = c.y;
      // Transport neighbours, wrapped.
      float hE = texelFetch(uH, ivec2((ij.x + 1) % s.x, ij.y), 0).x;
      float hW = texelFetch(uH, ivec2((ij.x + s.x - 1) % s.x, ij.y), 0).x;
      float hN = texelFetch(uH, ivec2(ij.x, (ij.y + 1) % s.y), 0).x;
      float hS = texelFetch(uH, ivec2(ij.x, (ij.y + s.y - 1) % s.y), 0).x;
      vec2 o = vec2(ij);
      float fE = faceFlux(o + vec2(1.0, 0.5), 0.5 * (hc + hE), uDir.x);
      float fW = faceFlux(o + vec2(0.0, 0.5), 0.5 * (hW + hc), uDir.x);
      float fN = faceFlux(o + vec2(0.5, 1.0), 0.5 * (hc + hN), uDir.y);
      float fS = faceFlux(o + vec2(0.5, 0.0), 0.5 * (hS + hc), uDir.y);
      float hn = hc - (fE - fW) - (fN - fS);
      // Clamped neighbours for the local terms.
      vec4 L = texelFetch(uH, ivec2(max(ij.x - 1, 0), ij.y), 0);
      vec4 R = texelFetch(uH, ivec2(min(ij.x + 1, s.x - 1), ij.y), 0);
      vec4 B = texelFetch(uH, ivec2(ij.x, max(ij.y - 1, 0)), 0);
      vec4 T = texelFetch(uH, ivec2(ij.x, min(ij.y + 1, s.y - 1)), 0);
      hn += uCreep * (L.x + R.x + B.x + T.x - 4.0 * hc);
      // Slope failure, on eight neighbours. Each pair exchanges what exceeds
      // the repose drop, written from both sides with the same magnitude;
      // the diagonals are what keep a pit round rather than diamond-shaped.
      // The drop depends on the pair's mean moisture: damp sand stands
      // steeper, which is why a bucket castle holds and crumbles as it dries.
      int xl = max(ij.x - 1, 0), xr = min(ij.x + 1, s.x - 1);
      int yb = max(ij.y - 1, 0), yt = min(ij.y + 1, s.y - 1);
      float ex = repose(L, hc, mc, 1.0) + repose(R, hc, mc, 1.0)
               + repose(B, hc, mc, 1.0) + repose(T, hc, mc, 1.0)
               + repose(texelFetch(uH, ivec2(xl, yb), 0), hc, mc, 1.41421356)
               + repose(texelFetch(uH, ivec2(xr, yb), 0), hc, mc, 1.41421356)
               + repose(texelFetch(uH, ivec2(xl, yt), 0), hc, mc, 1.41421356)
               + repose(texelFetch(uH, ivec2(xr, yt), 0), hc, mc, 1.41421356);
      hn += uReposeRate * ex;
      fragColor = vec4(max(hn, 0.0), min(mc, 1.0) * uDryMul, 0.0, 1.0);
    }`;

/**
 * The tools, blended additively onto the live texture.
 *
 * Shape 0 is the plow (and the ball's rut): a gaussian taken from the
 * centre and put back as a ring around it, biased along uDir so a bow wave
 * builds ahead of the motion. Shape 1 is the bucket: a plateau added, its
 * fill dug from the annulus around it. uRatio is the discrete volume ratio
 * from `plowRatio` / `castleRatio`, so what is put back is exactly what was
 * taken. Moisture goes into .y where sand was turned; the step clamps it.
 */
export const SPLAT_FS = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform vec2 uC, uSim, uDir;
    uniform float uAmp, uRad, uRatio, uBias, uMoist, uShape;
    void main() {
      vec2 dv = (vUV - uC) * uSim;
      float d = length(dv);
      float r = uRad;
      if (uShape < 0.5) {
        float rho = 1.6 * r, s = 0.6 * r;
        float g = exp(-d * d / (r * r));
        float cosPhi = d > 1e-6 ? dot(dv, uDir) / d : 0.0;
        float ring = exp(-(d - rho) * (d - rho) / (s * s)) * (1.0 + uBias * cosPhi);
        fragColor = vec4(-uAmp * g + uAmp * uRatio * ring, uMoist * g, 0.0, 0.0);
      } else {
        float top = 1.0 - smoothstep(r - 0.75, r + 0.75, d);
        float moatIn = 1.15 * r, moatOut = 2.15 * r;
        float moat = smoothstep(moatIn - 0.75, moatIn + 0.75, d)
                   * (1.0 - smoothstep(moatOut - 0.75, moatOut + 0.75, d));
        fragColor = vec4(uAmp * top - uAmp * uRatio * moat, uMoist * (top + 0.5 * moat), 0.0, 0.0);
      }
    }`;

/**
 * The picture. Everything here is a projection of the one field: the
 * normal is its gradient, the shadows are marched across it toward the
 * sun, the ball's shadow lands on it where it actually is, and the dark
 * patches are the moisture channel. Nothing is painted on.
 */
export const DISPLAY_FS = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uH;
    uniform sampler2D uLogo;
    uniform vec2 uSim, uMarkBox;
    uniform float uDx, uAsp, uTime, uGlint, uWall, uExpose;
    uniform vec3 uSunDir, uSunCol, uSky, uSand, uSandWet, uFloor, uMark, uBallA, uBallB;
    uniform vec4 uBall;     // x,y centre (uv), z radius (world), w surface height under it
    uniform mat3 uBallM;    // ball orientation (body -> world) — it rolls
    ${NOISE}
    // Hand-written bilinear tap, so nothing depends on float texture filtering.
    vec2 hm(vec2 uv) {
      vec2 p = uv * uSim - 0.5;
      vec2 i = floor(p), f = p - i;
      ivec2 s = ivec2(uSim);
      ivec2 i0 = clamp(ivec2(i), ivec2(0), s - 1);
      ivec2 i1 = clamp(ivec2(i) + 1, ivec2(0), s - 1);
      vec2 a = texelFetch(uH, ivec2(i0.x, i0.y), 0).xy;
      vec2 b = texelFetch(uH, ivec2(i1.x, i0.y), 0).xy;
      vec2 c = texelFetch(uH, ivec2(i0.x, i1.y), 0).xy;
      vec2 d = texelFetch(uH, ivec2(i1.x, i1.y), 0).xy;
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    // Slope in world units — the gradient over one cell either side.
    vec2 slope(vec2 uv) {
      vec2 px = 1.0 / uSim;
      float L = hm(uv - vec2(px.x, 0.0)).x;
      float R = hm(uv + vec2(px.x, 0.0)).x;
      float B = hm(uv - vec2(0.0, px.y)).x;
      float T = hm(uv + vec2(0.0, px.y)).x;
      return vec2(R - L, T - B) / (2.0 * uDx);
    }
    // Shadow the sand throws on itself: march toward the sun across the
    // height field. The ray climbs at tan(elevation) per world unit; where
    // the sand is above it, this point is in shadow. Penumbra widens with
    // distance to the occluder, as it does.
    float sandShadow(vec2 uv, float h0, vec2 sxy, float tanE) {
      float sh = 1.0;
      for (int i = 1; i <= 26; i++) {
        float t = float(i) * 1.4;
        vec2 p = uv + sxy * t / uSim;
        if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) break;
        float hr = h0 + t * uDx * tanE;
        float hs = hm(p).x;
        sh = min(sh, clamp((hr - hs) / (0.0015 + t * uDx * 0.12), 0.0, 1.0));
        if (sh <= 0.0) break;
      }
      return sh;
    }
    // The box has a rim, and the rim on the sun side throws a band across
    // the sand. Distance along the sun's ground direction to the edge, then
    // whether the ray has climbed above the rim by the time it gets there.
    float wallShadow(vec2 uv, float h0, vec2 sxy, float tanE) {
      vec2 P = vec2(uv.x * uAsp, uv.y);
      float tx = sxy.x > 1e-5 ? (uAsp - P.x) / sxy.x : (sxy.x < -1e-5 ? -P.x / sxy.x : 1e9);
      float ty = sxy.y > 1e-5 ? (1.0 - P.y) / sxy.y : (sxy.y < -1e-5 ? -P.y / sxy.y : 1e9);
      float tEdge = min(tx, ty);
      float clear = h0 + tEdge * tanE - uWall;
      return smoothstep(-0.004, 0.006, clear);
    }
    // The ball's shadow, by ray-sphere test from the surface point toward
    // the sun. It stretches at a low sun because that is what the geometry
    // does; nothing about it is drawn.
    float ballShadow(vec2 uv, float h0) {
      if (uBall.z < 1e-4) return 1.0;
      float R = uBall.z;
      vec3 P = vec3(uv.x * uAsp, uv.y, h0);
      vec3 C = vec3(uBall.x * uAsp, uBall.y, uBall.w + R * 0.9);
      vec3 oc = C - P;
      float b = dot(oc, uSunDir);
      if (b <= 0.0) return 1.0;
      float d = sqrt(max(dot(oc, oc) - b * b, 0.0));
      return 1.0 - 0.9 * (1.0 - smoothstep(R * 0.86, R * 1.06, d));
    }
    // The beach ball. Orthographic, looking down with a 17-degree lean so a
    // sphere seen from overhead still shows its volume. A sphere's
    // silhouette is a circle from every angle and its surface is closed
    // form, so one quadratic gives an exact hit and an exact normal.
    vec4 drawBall(vec2 uv) {
      if (uBall.z < 1e-4) return vec4(0.0);
      float fwid = fwidth(uv.y);
      vec2 p = (uv - uBall.xy) * vec2(uAsp, 1.0) / uBall.z;
      if (length(p) > 1.3) return vec4(0.0);
      float pw = fwid / uBall.z;
      float ct = 0.955, st = 0.296;
      vec3 camZ = vec3(0.0, -st, ct);
      vec3 ro = vec3(p.x, 0.0, 0.0) + vec3(0.0, ct, st) * p.y + camZ * 2.6;
      vec3 rd = -camZ;
      vec3 cen = vec3(0.0, 0.0, 0.9);          // it sinks a little into the sand
      vec3 oc = ro - cen;
      float bb = dot(oc, rd);
      float h2 = dot(oc, oc) - bb * bb;
      float a = 1.0 - smoothstep(-0.9 * pw, 0.9 * pw, sqrt(max(h2, 0.0)) - 1.0);
      if (a <= 0.004) return vec4(0.0);
      vec3 hp = ro + rd * (-bb - sqrt(max(1.0 - h2, 0.0)));
      vec3 n = normalize(hp - cen);
      // Six gores on the body frame, so they turn as it rolls.
      vec3 d = transpose(uBallM) * n;
      float ang = fract(atan(d.y, d.x) / 6.2831853 + 0.5);
      float seg = floor(ang * 6.0);
      vec3 white = vec3(0.90, 0.885, 0.85);
      vec3 acc = seg < 2.0 ? uBallA : (seg < 4.0 ? uBallB : vec3(1.0, 0.82, 0.26));
      vec3 col = mod(seg, 2.0) < 0.5 ? white : acc;
      float cap = smoothstep(0.955, 0.988, abs(d.z));
      col = mix(col, white, cap);
      // Welded seams lift where two sheets join: a ridge, not a dark line.
      float fs = fract(ang * 6.0);
      float sdS = fs < 0.5 ? fs : fs - 1.0;
      col *= 0.90 + 0.10 * smoothstep(0.0, 0.26, abs(sdS));
      vec3 tA = cross(vec3(0.0, 0.0, 1.0), d);
      float tl = length(tA);
      if (tl > 1e-4) {
        float q = sdS / 0.055;
        n = normalize(n + uBallM * (tA / tl) * (q * exp(-0.5 * q * q)) * 0.085 * (1.0 - cap));
      }
      // Sand dusts the underside where it sat.
      float dust = smoothstep(0.1, -0.6, n.z);
      col = mix(col, uSand * 0.8, dust * 0.5);
      float dif = max(dot(n, uSunDir), 0.0);
      vec3 hv = normalize(uSunDir + vec3(0.0, 0.0, 1.0));
      float spec = pow(max(dot(n, hv), 0.0), 70.0);
      float sheen = pow(max(dot(n, hv), 0.0), 7.0);
      float rim = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.5);
      col = col * (uSunCol * dif + uSky * (0.55 + 0.45 * n.z))
          + uSunCol * spec * 0.6 + uSunCol * sheen * 0.12 + uSky * rim * 0.25;
      return vec4(col, a);
    }
    void main() {
      vec2 uv = vUV;
      vec2 f = hm(uv);
      float h = f.x;
      float m = f.y;
      vec2 g = slope(uv);
      vec3 n = normalize(vec3(-g, 1.0));
      float sunUp = uSunDir.z;
      vec2 sxy = length(uSunDir.xy) > 1e-5 ? normalize(uSunDir.xy) : vec2(1.0, 0.0);
      float tanE = sunUp / max(length(uSunDir.xy), 1e-4);
      float shadow = sunUp > 0.02
        ? sandShadow(uv, h, sxy, tanE) * wallShadow(uv, h, sxy, tanE) * ballShadow(uv, h)
        : 0.0;
      // Contact darkening under the ball, just outside its silhouette.
      if (uBall.z > 1e-4) {
        float dB = length((uv - uBall.xy) * vec2(uAsp, 1.0));
        shadow *= 1.0 - 0.5 * smoothstep(1.7 * uBall.z, 1.0 * uBall.z, dB);
      }
      // Sand. Turned sand is dark because it is damp; it dries pale.
      vec3 alb = mix(uSand, uSandWet, m);
      float dif = max(dot(n, uSunDir), 0.0) * shadow;
      vec3 col = alb * (uSunCol * dif + uSky * (0.55 + 0.45 * n.z));
      // Glints: a few grains per cell present a facet to the sun. Fixed per
      // cell, so they shift only as the surface under them does.
      vec2 cid = floor(uv * uSim * 1.5);
      float hg = hash21(cid);
      if (hg > 0.9 && sunUp > 0.02) {
        vec3 nf = normalize(n + (vec3(hash21(cid + 1.3), hash21(cid + 7.1), hash21(cid + 3.3)) - 0.5) * 1.1);
        vec3 hv = normalize(uSunDir + vec3(0.0, 0.0, 1.0));
        float sp = pow(max(dot(nf, hv), 0.0), 48.0);
        col += uSunCol * sp * uGlint * shadow * (1.0 - 0.7 * m) * 0.9;
      }
      // The floor of the box, where the sand has been dug away.
      float fl = 1.0 - smoothstep(0.0, 0.006, h);
      if (fl > 0.001) {
        vec2 q = (uv - 0.5) * vec2(uAsp, 1.0);
        vec2 luv = q / uMarkBox + 0.5;
        float mk = 0.0;
        if (luv.x > 0.0 && luv.x < 1.0 && luv.y > 0.0 && luv.y < 1.0)
          mk = texture(uLogo, vec2(luv.x, 1.0 - luv.y)).a;
        // Moulded plastic: a faint texture, and the print worn where feet went.
        float wear = 0.75 + 0.25 * vnoise(q * 40.0);
        vec3 fcol = mix(uFloor, uMark, mk * 0.92 * wear);
        fcol = fcol * (uSunCol * max(sunUp, 0.0) * shadow * 0.9 + uSky * 0.6);
        col = mix(col, fcol, fl);
      }
      col *= 0.94 + 0.06 * smoothstep(1.9, 0.3, dot(uv * 2.0 - 1.0, uv * 2.0 - 1.0));
      vec4 bc = drawBall(uv);
      col = mix(col, bc.rgb, bc.a);
      // Soft shoulder rather than a clip, so the lit slopes at a low sun keep
      // their colour instead of going to paper.
      col = 1.0 - exp(-col * uExpose);
      fragColor = vec4(col, 1.0);
    }`;

export const STEP_UNIFORMS = [
  'uH',
  'uSim',
  'uDir',
  'uDx',
  'uAsp',
  'uQ',
  'uC',
  'uBeta',
  'uCap',
  'uHop',
  'uGust',
  'uClock',
  'uCreep',
  'uReposeDry',
  'uReposeWet',
  'uReposeRate',
  'uDryMul',
] as const;

export const SPLAT_UNIFORMS = [
  'uC',
  'uSim',
  'uDir',
  'uAmp',
  'uRad',
  'uRatio',
  'uBias',
  'uMoist',
  'uShape',
] as const;

export const DISP_UNIFORMS = [
  'uH',
  'uLogo',
  'uSim',
  'uMarkBox',
  'uDx',
  'uAsp',
  'uTime',
  'uGlint',
  'uWall',
  'uExpose',
  'uSunDir',
  'uSunCol',
  'uSky',
  'uSand',
  'uSandWet',
  'uFloor',
  'uMark',
  'uBallA',
  'uBallB',
  'uBall',
  'uBallM',
] as const;

export interface Palette {
  /** Direct sun, already scaled for the elevation it is meant for. */
  sun: [number, number, number];
  /** Sky fill: what the shadows are lit by. */
  sky: [number, number, number];
  sand: [number, number, number];
  sandWet: [number, number, number];
  floor: [number, number, number];
  mark: [number, number, number];
  glint: number;
  expose: number;
}

/**
 * Check every one of these with the box running. Direct light is additive
 * on top of the sky fill, so the sand has to sit dark enough under the sky
 * alone that a lit slope has somewhere to climb — which is what makes a
 * ripple field read at a low sun.
 */
export const PALETTES: Palette[] = [
  {
    // 0 Golden Hour: sun near the rim, long blue shadows, warm glints. The
    // sky is held well under the sun so flat sand stays warm; matched, the
    // two averaged to grey.
    sun: [2.7, 1.8, 1.05],
    sky: [0.3, 0.36, 0.5],
    sand: [0.9, 0.78, 0.58],
    sandWet: [0.42, 0.34, 0.24],
    floor: [0.1, 0.11, 0.13],
    mark: [1.0, 0.373, 0.122],
    glint: 1.2,
    expose: 1.15,
  },
  {
    // 1 Overcast: the sun is a bright patch of cloud, so shadows go soft
    // and the relief is carried by the sky's own falloff on the slopes.
    sun: [0.55, 0.54, 0.52],
    sky: [0.66, 0.68, 0.72],
    sand: [0.86, 0.79, 0.65],
    sandWet: [0.42, 0.36, 0.28],
    floor: [0.1, 0.11, 0.13],
    mark: [1.0, 0.373, 0.122],
    glint: 0.0,
    expose: 1.05,
  },
  {
    // 2 Blue Hour: the sun is a dusk glow just off the rim; the sky does the work.
    sun: [0.7, 0.42, 0.36],
    sky: [0.34, 0.44, 0.72],
    sand: [0.86, 0.78, 0.66],
    sandWet: [0.36, 0.32, 0.3],
    floor: [0.08, 0.09, 0.12],
    mark: [1.0, 0.373, 0.122],
    glint: 0.3,
    expose: 1.3,
  },
];
