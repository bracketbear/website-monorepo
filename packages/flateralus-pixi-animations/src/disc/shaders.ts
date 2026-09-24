import {
  MAX_PLANETS,
  R_DAMP_IN,
  R_DAMP_OUT,
  TAU_DAMP_IN,
  TAU_DAMP_OUT,
} from './physics';

/**
 * Each ring is summed in chunks so the reduce has enough fragments to
 * fill the GPU: 1,728 fragments each summing 512 cells cost more than a
 * whole step pass. Column k * REDUCE_CHUNKS + c is planet k, chunk c; the
 * star's chunks follow the last planet slot.
 */
export const REDUCE_CHUNKS = 8;
export const REDUCE_W = (MAX_PLANETS + 1) * REDUCE_CHUNKS;

/**
 * Shared prelude: the log-polar grid, clamped-and-wrapped fetch, the van
 * Leer pieces. `S(i, j)` is `at(i, j)` in physics.ts; `rAt`, `rfAt`,
 * `areaAt` are `D.r`, `D.rf`, `D.area`.
 */
const GRID = `
    uniform sampler2D uState;
    uniform float uRIn, uDlnr, uDphi;
    ivec2 G;
    vec4 S(int i, int j) {
      j = ((j % G.x) + G.x) % G.x;
      i = clamp(i, 0, G.y - 1);
      return texelFetch(uState, ivec2(j, i), 0);
    }
    float rAt(int i) { return uRIn * exp((float(i) + 0.5) * uDlnr); }
    float rfAt(int i) { return uRIn * exp(float(i) * uDlnr); }
    float areaAt(int i) { float a = rfAt(i), b = rfAt(i + 1); return 0.5 * (b * b - a * a) * uDphi; }
    float drAt(int i) { return rfAt(i + 1) - rfAt(i); }
    float vanLeer(float am, float a0, float ap) {
      float d1 = a0 - am, d2 = ap - a0, pr = d1 * d2;
      return pr > 0.0 ? 2.0 * pr / (d1 + d2) : 0.0;
    }
    float faceValue(float aL, float sL, float aR, float sR, float c) {
      return c > 0.0 ? aL + 0.5 * sL * (1.0 - c) : aR - 0.5 * sR * (1.0 + c);
    }
    float clampC(float c) { return clamp(c, -0.9, 0.9); }
`;

export const STEP_FS = `#version 300 es
    precision highp float;
    precision highp int;
    in vec2 vUV;
    out vec4 fragColor;
    ${GRID}
    uniform int uPass;
    uniform float uDt, uH, uAlpha, uAccK, uSinkFloor, uFloor, uROut, uSigma0;
    uniform int uClearEat;
    uniform int uPlanetN;
    uniform vec4 uPlanet[${MAX_PLANETS}];
    float cs2At(int i) { return uH * uH / rAt(clamp(i, 0, G.y - 1)); }

    // The opening state, recomputed where the damping zones need it:
    // sigmaProfile() and the rotation curve createDisc() solves from the
    // discrete pressure gradient.
    float smooth01(float t) { float x = clamp(t, 0.0, 1.0); return x * x * (3.0 - 2.0 * x); }
    float prof(int i) {
      float r = rAt(clamp(i, 0, G.y - 1));
      float tin = exp(-3.0 * (1.0 - smooth01((r - uRIn) / 0.12)));
      float tout = 1.0 - smooth01((r - 0.9 * uROut) / (0.1 * uROut));
      return max(uFloor, uSigma0 / r * tin * tout);
    }
    float vp0At(int i) {
      float r = rAt(i);
      float P0 = cs2At(i) * prof(i), Pp = cs2At(i + 1) * prof(i + 1), Pm = cs2At(i - 1) * prof(i - 1);
      float dPdr;
      if (i == 0) dPdr = (Pp - P0) / (rAt(1) - rAt(0));
      else if (i == G.y - 1) dPdr = (P0 - Pm) / (rAt(i) - rAt(i - 1));
      else dPdr = (Pp - Pm) / (rAt(i + 1) - rAt(i - 1));
      return sqrt(max(0.0, r * (1.0 / (r * r) + dPdr / prof(i))));
    }
    // dampRate(): the wave-damping zones at each edge.
    float dampRate(float r) {
      if (r < ${R_DAMP_IN}) { float x = (${R_DAMP_IN} - r) / (${R_DAMP_IN} - uRIn); return x * x / ${TAU_DAMP_IN}; }
      if (r > ${R_DAMP_OUT}) { float x = (r - ${R_DAMP_OUT}) / (uROut - ${R_DAMP_OUT}); return x * x / ${TAU_DAMP_OUT}; }
      return 0.0;
    }

    // sourcePass()
    vec4 sources(int i, int j) {
      vec4 c = S(i, j);
      float r = rAt(i), rinv = 1.0 / r;
      float s = max(c.x, uFloor);
      float P0 = cs2At(i) * c.x;
      float Pp = cs2At(i + 1) * S(i + 1, j).x;
      float Pm = cs2At(i - 1) * S(i - 1, j).x;
      float dPdr;
      if (i == 0) dPdr = (Pp - P0) / (rAt(1) - rAt(0));
      else if (i == G.y - 1) dPdr = (P0 - Pm) / (rAt(i) - rAt(i - 1));
      else dPdr = (Pp - Pm) / (rAt(i + 1) - rAt(i - 1));
      float dPdphi = cs2At(i) * (S(i, j + 1).x - S(i, j - 1).x) / (2.0 * uDphi);

      float phi = (float(j) + 0.5) * uDphi;
      float cp = cos(phi), sp = sin(phi);
      vec2 x = vec2(r * cp, r * sp);
      vec2 f = vec2(0.0);
      float s1 = c.x, removed = 0.0;
      for (int m = 0; m < ${MAX_PLANETS}; m++) {
        if (m >= uPlanetN) break;
        vec4 pl = uPlanet[m];
        float eps = 0.6 * uH * pl.w;
        vec2 d = x - pl.xy;
        float d2 = dot(d, d);
        float d2e = d2 + eps * eps;
        f -= pl.z * d / (d2e * sqrt(d2e));
        float rh = pl.w * pow(pl.z / 3.0, 1.0 / 3.0);
        float rs = max(0.5 * rh, uSinkFloor * r * uDphi);
        if (d2 < rs * rs) { float rem = s1 * uAccK; s1 -= rem; removed += rem; }
      }
      float arp = f.x * cp + f.y * sp;
      float app = -f.x * sp + f.y * cp;

      float nu = uAlpha * uH * uH * sqrt(r);
      vec4 ip = S(i + 1, j), im = S(i - 1, j), jp = S(i, j + 1), jm = S(i, j - 1);
      float lapVr = ((ip.y - 2.0 * c.y + im.y) / (uDlnr * uDlnr) + (jp.y - 2.0 * c.y + jm.y) / (uDphi * uDphi)) * rinv * rinv;
      float lapVp = ((ip.z - 2.0 * c.z + im.z) / (uDlnr * uDlnr) + (jp.z - 2.0 * c.z + jm.z) / (uDphi * uDphi)) * rinv * rinv;
      float vp1 = c.z + uDt * (-c.y * c.z * rinv - dPdphi / (s * r) + app + nu * lapVp);
      float vr1 = c.y + uDt * (vp1 * vp1 * rinv - rinv * rinv - dPdr / s + arp + nu * lapVr);
      float kd = dampRate(r) * uDt;
      if (kd > 0.0) {
        s1 += (prof(i) - s1) * kd;
        vr1 -= vr1 * kd;
        vp1 += (vp0At(i) - vp1) * kd;
      }
      float eat = uClearEat == 1 ? removed : c.w + removed;
      return vec4(s1, vr1, vp1, eat);
    }

    // phiPass(): the output cell j took its value from js = j - n.
    vec4 phiPass(int i, int j) {
      float r = rAt(i);
      float shift = pow(r, -1.5) * uDt / uDphi;
      int n = int(floor(shift + 0.5));
      float kres = float(n) * uDphi * r / uDt;
      float dx = r * uDphi;
      int js = j - n;
      vec4 s[5];
      float q0[5], q1[5], q2[5], u[5];
      for (int m = 0; m < 5; m++) {
        s[m] = S(i, js - 2 + m);
        q0[m] = s[m].x;
        q1[m] = s[m].x * s[m].y;
        q2[m] = s[m].x * r * s[m].z;
        u[m] = s[m].z - kres;
      }
      float cL = clampC(0.5 * (u[1] + u[2]) * uDt / dx);
      float cR = clampC(0.5 * (u[2] + u[3]) * uDt / dx);
      float n0 = q0[2] - (cR * faceValue(q0[2], vanLeer(q0[1], q0[2], q0[3]), q0[3], vanLeer(q0[2], q0[3], q0[4]), cR)
                        - cL * faceValue(q0[1], vanLeer(q0[0], q0[1], q0[2]), q0[2], vanLeer(q0[1], q0[2], q0[3]), cL));
      float n1 = q1[2] - (cR * faceValue(q1[2], vanLeer(q1[1], q1[2], q1[3]), q1[3], vanLeer(q1[2], q1[3], q1[4]), cR)
                        - cL * faceValue(q1[1], vanLeer(q1[0], q1[1], q1[2]), q1[2], vanLeer(q1[1], q1[2], q1[3]), cL));
      float n2 = q2[2] - (cR * faceValue(q2[2], vanLeer(q2[1], q2[2], q2[3]), q2[3], vanLeer(q2[2], q2[3], q2[4]), cR)
                        - cL * faceValue(q2[1], vanLeer(q2[0], q2[1], q2[2]), q2[2], vanLeer(q2[1], q2[2], q2[3]), cL));
      float sg = max(n0, uFloor);
      return vec4(sg, n1 / sg, n2 / (sg * r), s[2].w);
    }

    // rPass(): faces i (below) and i + 1 (above); domain faces are outflow.
    vec4 rPass(int i, int j) {
      vec4 s[5];
      float q0[5], q1[5], q2[5];
      for (int m = 0; m < 5; m++) {
        int ii = clamp(i - 2 + m, 0, G.y - 1);
        s[m] = S(ii, j);
        q0[m] = s[m].x;
        q1[m] = s[m].x * s[m].y;
        q2[m] = s[m].x * rAt(ii) * s[m].z;
      }
      float wL, aL0, aL1, aL2;
      if (i == 0) {
        wL = min(s[2].y, 0.0); aL0 = q0[2]; aL1 = q1[2]; aL2 = q2[2];
      } else {
        wL = 0.5 * (s[1].y + s[2].y);
        float c = clampC(wL * uDt / (wL > 0.0 ? drAt(i - 1) : drAt(i)));
        aL0 = faceValue(q0[1], vanLeer(q0[0], q0[1], q0[2]), q0[2], vanLeer(q0[1], q0[2], q0[3]), c);
        aL1 = faceValue(q1[1], vanLeer(q1[0], q1[1], q1[2]), q1[2], vanLeer(q1[1], q1[2], q1[3]), c);
        aL2 = faceValue(q2[1], vanLeer(q2[0], q2[1], q2[2]), q2[2], vanLeer(q2[1], q2[2], q2[3]), c);
      }
      float wR, aR0, aR1, aR2;
      if (i == G.y - 1) {
        wR = max(s[2].y, 0.0); aR0 = q0[2]; aR1 = q1[2]; aR2 = q2[2];
      } else {
        wR = 0.5 * (s[2].y + s[3].y);
        float c = clampC(wR * uDt / (wR > 0.0 ? drAt(i) : drAt(i + 1)));
        aR0 = faceValue(q0[2], vanLeer(q0[1], q0[2], q0[3]), q0[3], vanLeer(q0[2], q0[3], q0[4]), c);
        aR1 = faceValue(q1[2], vanLeer(q1[1], q1[2], q1[3]), q1[3], vanLeer(q1[2], q1[3], q1[4]), c);
        aR2 = faceValue(q2[2], vanLeer(q2[1], q2[2], q2[3]), q2[3], vanLeer(q2[2], q2[3], q2[4]), c);
      }
      float gL = wL * uDt * rfAt(i) * uDphi;
      float gR = wR * uDt * rfAt(i + 1) * uDphi;
      float A = areaAt(i);
      float n0 = q0[2] - (gR * aR0 - gL * aL0) / A;
      float n1 = q1[2] - (gR * aR1 - gL * aL1) / A;
      float n2 = q2[2] - (gR * aR2 - gL * aL2) / A;
      float sg = max(n0, uFloor);
      return vec4(sg, n1 / sg, n2 / (sg * rAt(i)), s[2].w);
    }

    void main() {
      G = textureSize(uState, 0);
      ivec2 ij = ivec2(gl_FragCoord.xy);
      int j = ij.x, i = ij.y;
      fragColor = uPass == 0 ? sources(i, j) : (uPass == 1 ? phiPass(i, j) : rPass(i, j));
    }`;

export const STEP_UNIFORMS = [
  'uState',
  'uPass',
  'uROut',
  'uSigma0',
  'uDt',
  'uH',
  'uAlpha',
  'uAccK',
  'uSinkFloor',
  'uFloor',
  'uClearEat',
  'uPlanetN',
  'uPlanet',
  'uRIn',
  'uDlnr',
  'uDphi',
] as const;

/**
 * One row per ring, REDUCE_CHUNKS columns per planet slot plus the star's.
 * Planet slot m < uPlanetN: (ax, ay, eaten, 0) — discForce() and eatenBy()
 * over that ring's chunk. The star's columns: (innerFlux on row 0, mass,
 * 0, 0). The CPU sums rows and chunks.
 */
export const REDUCE_FS = `#version 300 es
    precision highp float;
    precision highp int;
    in vec2 vUV;
    out vec4 fragColor;
    ${GRID}
    uniform float uH, uSinkFloor;
    uniform int uPlanetN;
    uniform vec4 uPlanet[${MAX_PLANETS}];
    void main() {
      G = textureSize(uState, 0);
      int col = int(gl_FragCoord.x);
      int slot = col / ${REDUCE_CHUNKS};
      int chunk = col - slot * ${REDUCE_CHUNKS};
      int span = G.x / ${REDUCE_CHUNKS};
      int j0 = chunk * span, j1 = j0 + span;
      int i = int(gl_FragCoord.y);
      float r = rAt(i), A = areaAt(i);
      vec4 acc = vec4(0.0);
      if (slot < uPlanetN) {
        vec4 pl = uPlanet[slot];
        float eps = 0.6 * uH * pl.w;
        float eps2 = eps * eps;
        float rh = pl.w * pow(pl.z / 3.0, 1.0 / 3.0);
        float rs = max(0.5 * rh, uSinkFloor * r * uDphi) + 2.0 * r * uDphi;
        for (int j = j0; j < j1; j++) {
          vec4 c = S(i, j);
          float phi = (float(j) + 0.5) * uDphi;
          vec2 d = vec2(r * cos(phi), r * sin(phi)) - pl.xy;
          float d2 = dot(d, d);
          float d2e = d2 + eps2;
          acc.xy += (c.x * A) * d / (d2e * sqrt(d2e));
          if (d2 < rs * rs) acc.z += c.w * A;
        }
      } else if (slot == ${MAX_PLANETS}) {
        for (int j = j0; j < j1; j++) {
          vec4 c = S(i, j);
          acc.y += c.x * A;
          if (i == 0) acc.x += c.x * min(c.y, 0.0) * rfAt(0) * uDphi;
        }
      }
      fragColor = acc;
    }`;

export const REDUCE_UNIFORMS = [
  'uState',
  'uH',
  'uSinkFloor',
  'uPlanetN',
  'uPlanet',
  'uRIn',
  'uDlnr',
  'uDphi',
] as const;

/** Blackbody chromaticity, Helland's fit, valid 1000–40000 K. */
const KELVIN = `
    vec3 kelvin(float T) {
      float t = clamp(T, 1000.0, 40000.0) / 100.0;
      vec3 c;
      c.r = t <= 66.0 ? 1.0 : clamp(1.2929 * pow(t - 60.0, -0.1332), 0.0, 1.0);
      c.g = t <= 66.0 ? clamp(0.3901 * log(t) - 0.6318, 0.0, 1.0)
                      : clamp(1.1298 * pow(t - 60.0, -0.0755), 0.0, 1.0);
      c.b = t >= 66.0 ? 1.0 : (t <= 19.0 ? 0.0 : clamp(0.5432 * log(t - 10.0) - 1.1963, 0.0, 1.0));
      return c;
    }
`;

/**
 * Everything on screen is a projection of Σ and v. Colour is the disc's
 * temperature T = 3000 K · r^-½ through a Planck fit, brightened where the
 * gas is being compressed (the wake is a weak shock); brightness is the
 * optical depth 1 − exp(−κΣ). The star's light is its accretion flux plus
 * a flare when a planet falls in. Planets are dots.
 */
export const DISPLAY_FS = `#version 300 es
    precision highp float;
    precision highp int;
    in vec2 vUV;
    out vec4 fragColor;
    ${GRID}
    uniform vec2 uRes;
    uniform float uTime, uGrain, uROut, uKappa, uView, uStarL;
    uniform int uPlanetN;
    uniform vec4 uPlanet[${MAX_PLANETS}];
    uniform vec3 uInk, uOrange;
    const float TAU = 6.28318530718;
    const float T0 = 3000.0;

    float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

    // Bilinear in (ln r, φ), wrapping in φ by hand: the seam must not show.
    vec4 sampleDisc(float r, float phi) {
      float fi = log(r / uRIn) / uDlnr - 0.5;
      float fj = phi / uDphi - 0.5;
      int i0 = int(floor(fi)), j0 = int(floor(fj));
      float ti = fi - float(i0), tj = fj - float(j0);
      vec4 a = mix(S(i0, j0), S(i0, j0 + 1), tj);
      vec4 b = mix(S(i0 + 1, j0), S(i0 + 1, j0 + 1), tj);
      return mix(a, b, ti);
    }

    ${KELVIN}

    void main() {
      G = textureSize(uState, 0);
      vec3 ground = luma(uInk) < luma(uOrange) ? uInk : uOrange;
      // The disc fills the shorter screen dimension, as toDisc() assumes.
      vec2 asp = uRes.x >= uRes.y ? vec2(uRes.x / uRes.y, 1.0) : vec2(1.0, uRes.y / uRes.x);
      vec2 p = (vUV - 0.5) * asp * 2.0 * uView;
      float r = length(p);
      float phi = atan(p.y, p.x);
      if (phi < 0.0) phi += TAU;

      vec3 col = ground;
      if (r > uRIn && r < uROut) {
        vec4 c = sampleDisc(r, phi);
        float rp = r * exp(uDlnr), rm = r * exp(-uDlnr);
        vec4 cp = sampleDisc(min(rp, uROut * 0.999), phi);
        vec4 cm = sampleDisc(max(rm, uRIn * 1.001), phi);
        vec4 jp = sampleDisc(r, mod(phi + uDphi, TAU));
        vec4 jm = sampleDisc(r, mod(phi - uDphi + TAU, TAU));
        float div = (rp * cp.y - rm * cm.y) / ((rp - rm) * r) + (jp.z - jm.z) / (2.0 * uDphi * r);
        float om = pow(r, -1.5);
        float T = T0 * inversesqrt(r) * (1.0 + 0.5 * max(0.0, -div / om));
        float tau = 1.0 - exp(-uKappa * c.x);
        float L = pow(T / T0, 4.0);
        L = L / (1.0 + L);
        // 1.6 keeps the mid disc as bright as it was at the old opacity.
        vec3 emit = kelvin(T) * L * 1.6;
        // The outer taper fades into the ground so there is no rim.
        float edge = smoothstep(uROut, uROut * 0.92, r);
        col = mix(ground, emit, tau * edge);
      }

      // The star: a core and a glare whose strength is the accretion flux.
      float core = smoothstep(0.05, 0.02, r);
      float glare = uStarL * 0.003 / (r * r + 0.003);
      col += vec3(1.0, 0.93, 0.8) * (core + glare);

      for (int m = 0; m < ${MAX_PLANETS}; m++) {
        if (m >= uPlanetN) break;
        vec4 pl = uPlanet[m];
        float d = length(p - pl.xy);
        float dot_ = smoothstep(pl.z, pl.z * 0.5, d);
        float halo = 0.25 * pl.z * pl.z / (d * d + pl.z * pl.z);
        col += vec3(0.85, 0.9, 1.0) * (dot_ + halo);
      }

      col += (hash21(floor(gl_FragCoord.xy * 0.9) + vec2(fract(uTime * 7.0) * 13.0)) - 0.5) * 0.05 * uGrain;
      vec2 v = vUV * 2.0 - 1.0;
      col *= 0.92 + 0.08 * smoothstep(1.7, 0.3, dot(v, v));
      fragColor = vec4(col, 1.0);
    }`;

export const DISP_UNIFORMS = [
  'uState',
  'uRes',
  'uTime',
  'uGrain',
  'uROut',
  'uKappa',
  'uView',
  'uStarL',
  'uPlanetN',
  'uPlanet',
  'uInk',
  'uOrange',
  'uRIn',
  'uDlnr',
  'uDphi',
] as const;

/**
 * One grain per texel: (ln r, φ, St, alive). Samples the gas bilinearly
 * with φ wrapped by hand, takes the gas velocity plus the terminal-velocity
 * drift t_s ∇P / Σ clamped to c_s, and advances (ln r, φ) — the twin of
 * stepGrain() in grains.ts. A grain past either edge is dead and stays so.
 */
export const GRAIN_STEP_FS = `#version 300 es
    precision highp float;
    precision highp int;
    out vec4 fragColor;
    uniform sampler2D uParticles;
    uniform int uPW;
    ${GRID}
    uniform float uROut, uH, uDt, uFloor;
    const float TAU = 6.28318530718;
    vec4 gas(float lnr, float phi) {
      float fi = (lnr - log(uRIn)) / uDlnr - 0.5;
      float fj = phi / uDphi - 0.5;
      int i0 = int(floor(fi)), j0 = int(floor(fj));
      float ti = fi - float(i0), tj = fj - float(j0);
      vec4 a = mix(S(i0, j0), S(i0, j0 + 1), tj);
      vec4 b = mix(S(i0 + 1, j0), S(i0 + 1, j0 + 1), tj);
      return mix(a, b, ti);
    }
    void main() {
      G = textureSize(uState, 0);
      vec4 g = texelFetch(uParticles, ivec2(gl_FragCoord.xy), 0);
      if (g.w == 0.0) { fragColor = g; return; }
      float lnr = g.x, phi = g.y, st = g.z;
      float r = exp(lnr), om = pow(r, -1.5);
      vec4 c = gas(lnr, phi);
      float sig = max(c.x, uFloor);
      float rp = exp(lnr + uDlnr), rm = exp(lnr - uDlnr);
      float sp = max(gas(lnr + uDlnr, phi).x, uFloor);
      float sm = max(gas(lnr - uDlnr, phi).x, uFloor);
      float dPdr = (uH * uH / rp * sp - uH * uH / rm * sm) / (rp - rm);
      float jp = gas(lnr, phi + uDphi).x, jm = gas(lnr, phi - uDphi).x;
      float dPdphi = uH * uH / r * (jp - jm) / (2.0 * uDphi);
      float ts = st / om;
      vec2 dv = vec2(ts * dPdr / sig, ts * dPdphi / (sig * r));
      float cs = uH / sqrt(r);
      float m = length(dv);
      if (m > cs) dv *= cs / m;
      float lnr1 = lnr + (c.y + dv.x) / r * uDt;
      float phi1 = phi + (c.z + dv.y) / r * uDt;
      phi1 -= TAU * floor(phi1 / TAU);
      float alive = (lnr1 < log(uRIn) || lnr1 > log(uROut)) ? 0.0 : 1.0;
      fragColor = vec4(lnr1, phi1, st, alive);
    }`;

export const GRAIN_STEP_UNIFORMS = [
  'uState',
  'uRIn',
  'uROut',
  'uDlnr',
  'uDphi',
  'uH',
  'uDt',
  'uFloor',
] as const;

/**
 * Each point fetches its grain by gl_VertexID and lands it with the
 * display pass's mapping (the disc fills the shorter side). Dead grains
 * go off-screen. Colour is the disc's temperature at the grain's radius.
 */
export const GRAIN_VERT = `#version 300 es
    precision highp float;
    precision highp int;
    uniform sampler2D uParticles;
    uniform int uPW;
    uniform vec2 uRes;
    uniform float uView, uSize;
    out float vT;
    out vec2 vNdc;
    void main() {
      ivec2 ij = ivec2(gl_VertexID % uPW, gl_VertexID / uPW);
      vec4 g = texelFetch(uParticles, ij, 0);
      float r = exp(g.x);
      vec2 p = r * vec2(cos(g.y), sin(g.y));
      vec2 asp = uRes.x >= uRes.y ? vec2(uRes.x / uRes.y, 1.0) : vec2(1.0, uRes.y / uRes.x);
      vec2 uv = p / (2.0 * uView * asp) + 0.5;
      vNdc = uv * 2.0 - 1.0;
      gl_Position = vec4(g.w > 0.0 ? vNdc : vec2(-2.0), 0.0, 1.0);
      gl_PointSize = uSize;
      vT = 3000.0 * inversesqrt(r);
    }`;

export const GRAIN_FRAG = `#version 300 es
    precision highp float;
    in float vT;
    in vec2 vNdc;
    uniform float uDust;
    out vec4 fragColor;
    ${KELVIN}
    void main() {
      // The display's vignette, so the corners do not fill with dust.
      float vig = 0.92 + 0.08 * smoothstep(1.7, 0.3, dot(vNdc, vNdc));
      fragColor = vec4(kelvin(vT) * uDust * vig, 1.0);
    }`;

export const GRAIN_DRAW_UNIFORMS = ['uRes', 'uView', 'uSize', 'uDust'] as const;
