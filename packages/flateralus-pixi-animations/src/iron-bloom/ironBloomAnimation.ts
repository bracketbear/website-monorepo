import type * as PIXI from 'pixi.js';
import { createManifest } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import type { QualityLever, QualityLevers } from '@bracketbear/flateralus';
import { HarnessShaderAnimation } from '../shared/harness-shader-animation';
import type { ShaderContext } from '../shared/shader-harness';
import { TOYS_COMMON_UNIFORMS, TOYS_PRE } from '../shared/toys-harness';

const MANIFEST = createManifest({
  id: 'iron-bloom',
  name: 'Iron Bloom (GLSL)',
  description:
    'A sunflower head cast in black metal. Seeds sit on a real phyllotaxis lattice — golden angle, radius by square root — and each one carries a hexagonal socket that tips further out of the plane the further it sits from the axis. The spiral arms you see are the parastichies, and their count climbs outward on its own because the lattice says so. Almost nothing is lit: the faces stay black and the picture is carried by Fresnel on the socket rims catching two hard softboxes. Interactive: the cursor presses the sockets open where it rests, and a click sends a ring of opening travelling out through the head. Ambient: the bloom breathes on its own.',
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
      name: 'seeds',
      type: 'number',
      label: 'Seed Count',
      min: 300,
      max: 6000,
      step: 100,
      defaultValue: 2200,
      debug: true,
    },
    {
      name: 'cell',
      type: 'number',
      label: 'Socket Size',
      min: 0.7,
      max: 1.35,
      step: 0.05,
      defaultValue: 1.05,
      debug: true,
    },
    {
      name: 'aniso',
      type: 'number',
      label: 'Socket Stretch',
      min: 1,
      max: 2.6,
      step: 0.1,
      defaultValue: 1.7,
      debug: true,
    },
    {
      name: 'tilt',
      type: 'number',
      label: 'Tilt Out Of Plane',
      min: 0,
      max: 1.3,
      step: 0.05,
      defaultValue: 0.85,
      debug: true,
    },
    {
      name: 'open',
      type: 'number',
      label: 'Aperture',
      min: 0.15,
      max: 0.85,
      step: 0.05,
      defaultValue: 0.52,
      debug: true,
    },
    {
      name: 'depth',
      type: 'number',
      label: 'Bowl Depth',
      min: 0,
      max: 0.6,
      step: 0.05,
      defaultValue: 0.3,
      debug: true,
    },
    {
      name: 'rough',
      type: 'number',
      label: 'Roughness',
      min: 0.02,
      max: 0.6,
      step: 0.02,
      defaultValue: 0.16,
      debug: true,
    },
    {
      name: 'expose',
      type: 'number',
      label: 'Exposure',
      min: 0.4,
      max: 2.2,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'spin',
      type: 'number',
      label: 'Spin',
      min: 0,
      max: 2,
      step: 0.1,
      defaultValue: 0.6,
      debug: true,
    },
    {
      name: 'grain',
      type: 'boolean',
      label: 'Grain',
      defaultValue: true,
      debug: true,
    },
  ],
} as const);

export type IronBloomControlValues = ManifestToControlValues<typeof MANIFEST>;

/**
 * The lattice search mirrors `shared/phyllotaxis.ts`, which is unit-tested
 * against a brute-force sweep of the whole field. Keep the two in step: the
 * nine candidates are only enough because they straddle the solution of the
 * lattice system, not the index at the same radius.
 */
const FRAG = `
      uniform vec2 uRes2;
      uniform float uCount;
      uniform float uRmax;
      uniform float uCell;
      uniform float uAniso;
      uniform float uTilt;
      uniform float uOpen;
      uniform float uDepth;
      uniform float uRough;
      uniform float uExpose;
      uniform float uSpinA;
      uniform float uWave;
      uniform vec2 uMouse;
      uniform float uPoke;
      uniform float uSteps;
      uniform float uWaveK;
      uniform float uPokeInv;
      uniform float uSurgeInv;
      uniform vec3 uCamA;
      uniform vec3 uSurge0;
      uniform vec3 uSurge1;
      uniform vec3 uSurge2;

      #define TAU 6.283185307179586

      // The golden angle as a turn fraction, 1/phi^2, split so the product
      // with an integer index stays exact in 32-bit float. i * K_HI needs at
      // most 24 mantissa bits for i below 4096, so fract() of it is exact;
      // without the split, i * GOLDEN_ANGLE loses the fraction we need by
      // i ~ 2000 and the lattice visibly shears.
      const float K_HI = 0.3819580078125;
      const float K_LO = 0.00000800345010515;

      float fracIK(float i) {
        return fract(fract(i * K_HI) + i * K_LO);
      }

      /** Angle of seed i in the lattice frame. */
      float seedAngle(float i) { return TAU * fracIK(i); }

      // The Fibonacci strides and their angular hops, precomputed. The hops
      // are the golden angle's continued-fraction convergents collapsing —
      // 2.40, -1.48, 0.92, -0.57 ... 0.0028 — which is the fact the whole
      // nine-candidate search rests on. Computed at build time because
      // recovering them per call put a fract and a multiply inside the
      // innermost loop in the shader.
      const float FIB[15] = float[15](
        1.0, 2.0, 3.0, 5.0, 8.0, 13.0, 21.0, 34.0, 55.0,
        89.0, 144.0, 233.0, 377.0, 610.0, 987.0);
      const float FDA[15] = float[15](
        2.39996323, -1.48325885, 0.91670438, -0.56655447, 0.35014992,
        -0.21640455, 0.13374537, -0.08265918, 0.05108618, -0.03157300,
        0.01951319, -0.01205981, 0.00745337, -0.00460644, 0.00284694);

      float wrapPi(float t) {
        return t - TAU * floor(t / TAU + 0.5);
      }



      /**
       * The two consecutive Fibonacci strides that span the lattice most
       * squarely at radius r. These are the parastichies — the spiral arms
       * actually visible — so this function changing its mind outward is why
       * the arm count climbs.
       */
      void parastichy(
        float r, out float fa, out float fb, out float da, out float db
      ) {
        // Closed form, mirroring parastichyIndex in shared/phyllotaxis.ts:
        // the two hops match in length when phi^(2n) == 4*pi*r^2. The nine
        // candidates stay correct a step either side of the true argmin, so
        // the fourteen-iteration search this replaces was buying nothing —
        // and it was running once per field evaluation. The -0.9 matches the
        // 1.4 offset in the helper, chosen because smaller values miss in
        // the core.
        // 1.7724539 = sqrt(pi), 2.0780869 = 1 / log(phi).
        int bi;
        if (r < 7.0) {
          // The innermost seeds are not on a regular lattice yet, and the
          // closed form can pick a basis there that the straddle cannot
          // recover from. Only pixels near the axis pay for this.
          float best = 1e20;
          bi = 0;
          for (int n = 0; n < 14; n++) {
            float a0 = FIB[n] / (2.0 * r), b0 = r * FDA[n];
            float a1 = FIB[n + 1] / (2.0 * r), b1 = r * FDA[n + 1];
            float cost = max(a0 * a0 + b0 * b0, a1 * a1 + b1 * b1);
            if (cost < best) { best = cost; bi = n; }
          }
        } else {
          bi = clamp(
            int(floor(log(2.0 * r * 1.7724539) * 2.0780869 - 0.9)), 0, 13);
        }
        fa = FIB[bi]; fb = FIB[bi + 1];
        da = FDA[bi]; db = FDA[bi + 1];
      }

      /** The bowl the lattice sits on, and its slope. */
      float bowlH(float r) { return uDepth * r * r / uRmax; }
      float bowlDH(float r) { return 2.0 * uDepth * r / uRmax; }

      /** iq's hexagonal prism, extruded along z. */
      float sdHexPrism(vec3 p, vec2 h) {
        const vec3 k = vec3(-0.8660254, 0.5, 0.57735);
        p = abs(p);
        p.xy -= 2.0 * min(dot(k.xy, p.xy), 0.0) * k.xy;
        vec2 d = vec2(
          length(p.xy - vec2(clamp(p.x, -k.z * h.x, k.z * h.x), h.x)) *
            sign(p.y - h.x),
          p.z - h.y);
        return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
      }

      /**
       * One socket: a thin hexagonal tray with a hexagonal bite taken out of
       * its top. open widens the bite, so the aperture is a real hole in a
       * real shell rather than a ring drawn on a plate.
       *
       * x is divided by the stretch before the hex is evaluated. The smallest
       * scale factor on the axes stays 1, so the result is still a lower
       * bound on the true distance and sphere tracing remains safe.
       */
      float sdSocket(vec3 p, float rad, float open) {
        vec3 q = vec3(p.x / uAniso, p.y, p.z);
        // Deep enough to be a cup rather than a tray. A shallow bite gives
        // each cell one flat bright stripe on its rim, which reads as a
        // sticker; the bright shape in the reference is a tall concave inner
        // wall, and it needs the height to gather a gradient.
        float th = rad * 0.78;
        float outer = sdHexPrism(q, vec2(rad, th)) - rad * 0.05;
        float inner = sdHexPrism(
          q - vec3(0.0, 0.0, th * 0.52),
          vec2(rad * clamp(open, 0.08, 0.94), th));
        return max(outer, -inner);
      }

      /**
       * The cursor and each live surge, landed on the bowl in lattice
       * coordinates. They arrive as screen positions and are cast onto the
       * bowl in main(), so a surge expands across the head from the socket
       * that was actually clicked rather than from the middle.
       */
      vec3 gPoke;
      vec3 gSurge[3];
      float gRing[3];
      float gSurgeAmp[3];

      /**
       * How far open socket i sits. A wave travels outward through the head,
       * jittered per seed so it is a spreading bloom rather than a clean
       * concentric ring; the cursor presses sockets open where it rests, and
       * each surge is a ring of opening expanding from where it was clicked.
       */
      /**
       * A compact bump with the same shape as exp(-x*x) but no transcendental
       * in it. This is evaluated nine times per march step, so an exp() here
       * costs more than everything else in the shader put together.
       */
      float bump(float d2, float inv) {
        float q = 1.0 - d2 * inv;
        return q > 0.0 ? q * q * q : 0.0;
      }

      float aperture(float i, float ri, vec2 cen) {
        float o = uOpen * (1.0 + 0.5 *
          sin(uWave - ri * uWaveK + fracIK(i * 7.0) * 5.4));

        vec2 dp = cen - gPoke.xy;
        o += uPoke * 0.85 * bump(dot(dp, dp), uPokeInv);

        for (int k = 0; k < 3; k++) {
          if (gSurge[k].z <= 0.0) continue;
          // gSurge.z carries the ring radius and gSurge.w-equivalent decay is
          // folded in on the CPU, so nothing here needs an exponential.
          vec2 ds = cen - gSurge[k].xy;
          float dd = length(ds) - gRing[k];
          o += gSurgeAmp[k] * bump(dd * dd, uSurgeInv);
        }
        return clamp(o, 0.08, 0.94);
      }

      /**
       * Distance to the nearest socket. i0 is the seed sharing this radius,
       * but the nearest seed can be a hundred indices away, so the nine
       * candidates straddle where the lattice basis says the point falls.
       */
      float mapField(vec3 p) {
        float r = length(p.xy);
        if (r < 0.8) r = 0.8;
        float a = atan(p.y, p.x);

        float i0 = floor(r * r + 0.5);
        float fa, fb, da, db;
        parastichy(r, fa, fb, da, db);
        float det = fa * db - fb * da;
        if (abs(det) < 1e-9) return 1e9;

        float psi = wrapPi(a - seedAngle(i0));
        float u = floor(-fb * psi / det + 0.5);
        float v = floor(fa * psi / det + 0.5);

        float rad = uCell * 0.886;   // half the mean lattice spacing
        float best = 1e9;
        float rmax = uRmax;

        for (int du = -1; du <= 1; du++) {
          for (int dv = -1; dv <= 1; dv++) {
            float i = i0 + (u + float(du)) * fa + (v + float(dv)) * fb;
            if (i < 1.0 || i > uCount) continue;

            float ri = sqrt(i);
            float ai = seedAngle(i);
            float ca = cos(ai), sa = sin(ai);
            vec3 cen = vec3(ri * ca, ri * sa, bowlH(ri));

            // Surface frame, then the socket axis tipped out of it. The tilt
            // ramps in off the axis so the middle of the head stays flat.
            float dh = bowlDH(ri);
            vec3 ez0 = normalize(vec3(-dh * ca, -dh * sa, 1.0));
            vec3 tang = vec3(-sa, ca, 0.0);
            vec3 outw = normalize(cross(tang, ez0));
            float ph = uTilt * smoothstep(0.0, 0.22, ri / rmax);
            vec3 ez = normalize(ez0 * cos(ph) + outw * sin(ph));
            vec3 ex = normalize(tang - dot(tang, ez) * ez);
            vec3 ey = cross(ez, ex);

            vec3 d = p - cen;
            vec3 q = vec3(dot(d, ex), dot(d, ey), dot(d, ez));
            float s = sdSocket(q, rad, aperture(i, ri, cen.xy));
            best = min(best, s);
          }
        }
        return best;
      }

      /** Tetrahedral gradient: four taps rather than six, same normal. */
      /**
       * A lower bound on the distance to the slab every socket lives in.
       * Marching the whole bounding cylinder at socket resolution spends most
       * of its steps in open air, and every one of those steps costs nine
       * socket evaluations; this lets a ray jump to the shell instead. The
       * vertical gap is divided by the slope so the result stays a bound on
       * the perpendicular distance rather than overshooting it.
       */
      float shellGap(vec3 p) {
        float r = length(p.xy);
        float dh = bowlDH(r);
        return abs(p.z - bowlH(r)) * inversesqrt(1.0 + dh * dh)
             - uCell * 2.0;
      }

      vec3 fieldNormal(vec3 p, float e) {
        const vec2 k = vec2(1.0, -1.0);
        float d1 = mapField(p + k.xyy * e);
        float d2 = mapField(p + k.yyx * e);
        float d3 = mapField(p + k.yxy * e);
        float d4 = mapField(p + k.xxx * e);
        return normalize(vec3(
           d1 - d2 - d3 + d4,
          -d1 - d2 + d3 + d4,
          -d1 + d2 - d3 + d4));
      }

      /**
       * Occlusion, sampled inside one socket rather than across several. The
       * radius has to be a fraction of the socket, not a fixed distance: at a
       * radius wider than a cell every point on the field reports itself
       * fully occluded, and the whole render turns to matte clay lit by
       * nothing but this term.
       */
      float fieldAO(vec3 p, vec3 n, float rad) {
        float o = 0.0, w = 1.0;
        for (int i = 1; i <= 3; i++) {
          float h = rad * 0.085 * float(i);
          o += (h - mapField(p + n * h)) * w;
          w *= 0.62;
        }
        return clamp(1.0 - 2.1 * o, 0.22, 1.0);
      }

      /**
       * The studio. Almost the whole sphere is unlit, and that is the point:
       * the palette is warm all the way through except ink, so any broad
       * gradient turns the whole picture into one brown wash. Value structure
       * instead — a near-black room with three small hard sources, whose
       * reflections are the only bright thing in the frame.
       */
      /**
       * The room: a dark gradient with enough luminance that form reads on
       * the faces. Tinted with paper only — deep and sun are warm mid
       * accents, and either one in a broad term turns the frame to one brown
       * wash.
       */
      vec3 envBase(vec3 d) {
        // Kept low on purpose. Ambient is what washes the blacks to grey,
        // and the reference's blacks are actually black — the contrast has to
        // come from the softboxes, not from lifting the whole room.
        vec3 dim = mix(uInk, uCream, 0.035);
        vec3 lift = mix(uInk, uCream, 0.12);
        vec3 base = mix(uInk * 0.25, dim, smoothstep(-1.0, 0.15, d.z));
        return mix(base, lift, smoothstep(0.10, 1.0, d.z) * 0.85);
      }

      /**
       * Three small hard sources. Their reflections are the whole picture —
       * the warm slashes down the socket walls and the white edge-lights on
       * the rims — so they are kept out of envBase and never multiplied by
       * occlusion.
       */
      /**
       * A softbox: a spherical cap, so it is broad but still has a hard
       * edge. A pow() lobe tight enough to read as crisp covers so little of
       * the sphere that only a handful of rims in the frame ever catch it —
       * the density of highlights in the reference comes from sources with
       * real area.
       */
      float softbox(vec3 d, vec3 dir, float cosR, float soft) {
        return smoothstep(cosR - soft, cosR + soft, dot(d, normalize(dir)));
      }

      vec3 envKeys(vec3 d) {
        float key  = softbox(d, vec3(0.38, 0.22, 0.90), 0.951, 0.022);
        float rim  = softbox(d, vec3(-0.15, 0.88, 0.45), 0.990, 0.006);
        float edge = softbox(d, vec3(0.80, -0.50, 0.33), 0.995, 0.005);
        float fill = softbox(d, vec3(-0.72, -0.30, 0.62), 0.766, 0.110);
        return uOrange * key * 4.5
             + uCream * rim * 9.0
             + uSun * edge * 7.0
             + uDeep * fill * 0.55;
      }

      vec3 env(vec3 d) { return envBase(d) + envKeys(d); }

      /** Ray against the cylinder-and-slab the whole head fits inside. */
      bool bounds(vec3 ro, vec3 rd, out float t0, out float t1) {
        float rmax = uRmax * 1.04;
        float zlo = -uCell * 1.6;
        float zhi = bowlH(rmax) + uCell * 2.2;

        float a = dot(rd.xy, rd.xy);
        float b = dot(ro.xy, rd.xy);
        float c = dot(ro.xy, ro.xy) - rmax * rmax;
        float lo = 0.0, hi = 1e9;
        if (a < 1e-9) {
          if (c > 0.0) return false;
        } else {
          float disc = b * b - a * c;
          if (disc < 0.0) return false;
          float sq = sqrt(disc);
          lo = max(lo, (-b - sq) / a);
          hi = min(hi, (-b + sq) / a);
        }
        if (abs(rd.z) < 1e-9) {
          if (ro.z < zlo || ro.z > zhi) return false;
        } else {
          float ta = (zlo - ro.z) / rd.z;
          float tb = (zhi - ro.z) / rd.z;
          lo = max(lo, min(ta, tb));
          hi = min(hi, max(ta, tb));
        }
        t0 = max(lo, 0.0);
        t1 = hi;
        return t1 > t0;
      }

      /** Ray against the bowl itself — a quadratic, used to place the cursor. */
      float bowlHit(vec3 ro, vec3 rd) {
        // z = k r^2  =>  k(ox+t dx)^2 + k(oy+t dy)^2 - (oz + t dz) = 0
        float k = uDepth / uRmax;
        float a = k * dot(rd.xy, rd.xy);
        float b = 2.0 * k * dot(ro.xy, rd.xy) - rd.z;
        float c = k * dot(ro.xy, ro.xy) - ro.z;
        if (abs(a) < 1e-9) return abs(b) < 1e-9 ? -1.0 : -c / b;
        float disc = b * b - 4.0 * a * c;
        if (disc < 0.0) return -1.0;
        float sq = sqrt(disc);
        float t0 = (-b - sq) / (2.0 * a);
        float t1 = (-b + sq) / (2.0 * a);
        return t0 > 0.0 ? t0 : t1;
      }

      void main() {
        vec2 uvS = vec2(vUV.x, 1.0 - vUV.y);
        vec2 sc = (uvS * 2.0 - 1.0) * vec2(uRes.x / uRes.y, 1.0);
        float rmax = uRmax;

        // Camera: close in and looking across the head rather than down at
        // it, which is what lets the sockets overlap into scales.
        float orb = uCamA.x;
        vec3 ta = vec3(cos(orb) * rmax * 0.45, sin(orb) * rmax * 0.45, 0.0);
        ta.z = bowlH(length(ta.xy)) + uCell * 0.4;
        float el = 0.60 + uCamA.z;
        vec3 off = vec3(cos(orb + uCamA.y) * cos(el), sin(orb + uCamA.y) * cos(el), sin(el));
        float dist = rmax * 0.95;
        vec3 ro = ta + off * dist;
        vec3 fw = normalize(ta - ro);
        vec3 rt = normalize(cross(vec3(0.0, 0.0, 1.0), fw));
        vec3 upv = cross(fw, rt);
        const float FOV = 2.3;
        vec3 rd = normalize(fw * FOV + rt * sc.x + upv * sc.y);

        // Undo the lattice spin by turning the camera instead, so the whole
        // head rotates without the lattice math ever seeing an angle offset.
        float cs = cos(uSpinA), ss = sin(uSpinA);
        mat2 R = mat2(cs, -ss, ss, cs);
        ro.xy = R * ro.xy;
        rd.xy = R * rd.xy;

        // Cast a screen position onto the bowl, in lattice coordinates.
        vec2 ar = vec2(uRes.x / uRes.y, 1.0);
        vec3 pk;
        {
          vec2 mn = (uMouse / uRes2 * 2.0 - 1.0) * ar;
          vec3 mrd = normalize(fw * FOV + rt * mn.x + upv * mn.y);
          mrd.xy = R * mrd.xy;
          float mt = bowlHit(ro, mrd);
          pk = mt > 0.0 ? ro + mrd * mt : vec3(1e6);
        }
        gPoke = pk;

        vec3 sg[3];
        sg[0] = uSurge0; sg[1] = uSurge1; sg[2] = uSurge2;
        for (int k = 0; k < 3; k++) {
          if (sg[k].z <= 0.0) {
            gSurge[k] = vec3(0.0); gRing[k] = 0.0; gSurgeAmp[k] = 0.0;
            continue;
          }
          vec2 sn = (sg[k].xy / uRes2 * 2.0 - 1.0) * ar;
          vec3 srd = normalize(fw * FOV + rt * sn.x + upv * sn.y);
          srd.xy = R * srd.xy;
          float st = bowlHit(ro, srd);
          vec3 sp = st > 0.0 ? ro + srd * st : vec3(1e6);
          gSurge[k] = vec3(sp.xy, sg[k].z);
          gRing[k] = sg[k].z * uRmax * 0.85;
          gSurgeAmp[k] = 0.7 * max(0.0, 1.0 - sg[k].z * 0.25);
        }

        vec3 col = uInk * 0.035;
        float t0, t1;
        if (bounds(ro, rd, t0, t1)) {
          float t = t0;
          // One pixel in lattice units at the target distance, derived from
          // the view so it cannot go stale when the camera changes.
          float px = (2.0 * dist / FOV) / uRes.y;
          float eps = max(px * 0.6, rmax * 1e-4);
          float md = 1e9;
          float tBest = t;
          bool hit = false;
          for (int i = 0; i < 72; i++) {
            // A constant bound with a uniform early-out: some drivers
            // deoptimise badly on a non-constant loop bound.
            if (i >= int(uSteps)) break;
            vec3 pp = ro + rd * t;
            float g = shellGap(pp);
            if (g > uCell * 0.5) {
              t += g;
              if (t > t1) break;
              continue;
            }
            float d = mapField(pp);
            if (d < md) { md = d; tBest = t; }
            if (d < eps) { hit = true; break; }
            t += max(d * 0.85, eps * 0.6);
            if (t > t1) break;
          }

          // Coverage off the closest approach, so silhouettes get a real
          // one-pixel edge instead of a stair.
          float cov = hit ? 1.0 : 1.0 - smoothstep(eps, eps + 1.6 * px, md);
          if (cov > 0.004) {
            vec3 hp = ro + rd * (hit ? t : tBest);
            vec3 n = fieldNormal(hp, eps * 0.7);
            float rad = uCell * 0.886;
            vec3 rfl = reflect(rd, n);
            float f = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 5.0);

            // A metal with a very dark tint, not black lacquer. F0 is that
            // tint, so faces still reflect a tenth of the room and form
            // reads on them, while Fresnel hands the rims the whole
            // environment at grazing angles. No diffuse term: the reference
            // has none either.
            vec3 F0 = mix(uInk, vec3(0.16), 0.75);
            vec3 fres = F0 + (1.0 - F0) * f;
            float rough = clamp(uRough, 0.0, 1.0);

            // The room is what occlusion applies to. The hard sources are
            // not: a specular highlight multiplied by an occlusion term is
            // how a metal ends up looking like unfired clay.
            float ao = fieldAO(hp, n, rad);
            vec3 soft = mix(envBase(rfl), envBase(n), rough * 0.9);
            vec3 hard = envKeys(normalize(mix(rfl, n, rough * 0.3)));
            col = (soft * ao + hard) * fres;

            // Distance falls off toward the void; no real depth of field in
            // one pass, so this is what separates near from far.
            float fog = 1.0 - exp(-max(t - rmax * 0.18, 0.0) * (1.1 / rmax));
            col = mix(col, uInk * 0.03, fog * 0.72);
            col = mix(uInk * 0.035, col, cov);
          }
        }

        col *= uExpose;
        col = col / (1.0 + col);            // Reinhard, keeps the rims hot
        col = pow(max(col, 0.0), vec3(0.4545));
        fragColor = vec4(finish(col, uvS, uvS * uRes), 1.0);
      }
    `;

export class IronBloomAnimation extends HarnessShaderAnimation<
  typeof MANIFEST
> {
  protected readonly frag = TOYS_PRE + FRAG;
  protected readonly extraUniforms = [
    'uRes2',
    'uCount',
    'uRmax',
    'uCell',
    'uAniso',
    'uTilt',
    'uOpen',
    'uDepth',
    'uRough',
    'uExpose',
    'uSpinA',
    'uWave',
    'uMouse',
    'uPoke',
    'uSteps',
    'uWaveK',
    'uPokeInv',
    'uSurgeInv',
    'uCamA',
    'uSurge0',
    'uSurge1',
    'uSurge2',
  ] as const;
  protected readonly commonUniforms = TOYS_COMMON_UNIFORMS;
  protected readonly needsMask = false;

  /**
   * Nine socket evaluations per march step, and a socket is not cheap, so
   * this cannot reach device resolution. Rather than pinning a scale that is
   * wrong on most machines, it declares the range it can work across and
   * lets the quality controller find what the hardware sustains.
   */
  protected readonly renderScaleLever: QualityLever = { min: 0.3, max: 0.9 };

  /** March depth is the other thing worth trading before resolution goes. */
  protected readonly qualityLevers: QualityLevers = {
    marchSteps: { min: 26, max: 72, step: 1 },
  };

  /** Accumulated lattice rotation and aperture-wave phase. */
  private spinA = 0;
  private wave = 0;
  /** How hard the cursor is pressing, eased so it does not snap on. */
  private poke = 0;
  /** Expanding rings of opening, oldest culled by age. */
  private surges: { x: number; y: number; age: number }[] = [];

  constructor(initialControls?: Partial<IronBloomControlValues>) {
    super(MANIFEST, initialControls);
  }

  protected mask(): null {
    return null;
  }

  onInit(app: PIXI.Application, controls: IronBloomControlValues): void {
    super.onInit(app, controls);
    this.spinA = 0;
    this.wave = 0;
    this.poke = 0;
    this.surges = [];
  }

  protected setUniforms(
    gl: WebGL2RenderingContext,
    locs: Record<string, WebGLUniformLocation | null>,
    _ctx: ShaderContext,
    controls: IronBloomControlValues,
    dt: number,
    app: PIXI.Application
  ): void {
    const interactive = Number(controls.mode) > 0.5;
    const pointer = this.pointer;
    const w = app.screen.width;
    const h = app.screen.height;

    let mx = w * 0.5;
    let my = h * 0.5;
    const m = pointer?.mouse;
    const resting = interactive && !!m?.active;
    if (resting) {
      mx = m!.x;
      my = m!.y;
    }

    if (pointer) {
      while (pointer.clicks.length) {
        const c = pointer.clicks.shift()!;
        // The coordinate is the only spatial variable there is, so the surge
        // starts where it was clicked rather than at the middle.
        if (interactive) this.surges.push({ x: c.x, y: c.y, age: 0.0001 });
      }
    }

    // Cull by age. Culling by recency would throw away the ring someone is
    // still watching cross the head.
    for (const s of this.surges) s.age += dt;
    this.surges = this.surges.filter((s) => s.age < 4).slice(-3);

    this.poke += ((resting ? 1 : 0) - this.poke) * Math.min(1, dt * 4.5);
    this.spinA += dt * 0.055 * controls.spin;
    this.wave += dt * 0.85;

    const t = this.time;
    gl.uniform2f(locs.uRes2!, w, h);
    gl.uniform1f(locs.uCount!, controls.seeds);
    // Per-frame scalars the shader would otherwise recompute nine times per
    // march step. rmax in particular was a sqrt in the innermost loop.
    const rmax = Math.sqrt(controls.seeds);
    gl.uniform1f(locs.uRmax!, rmax);
    gl.uniform1f(locs.uWaveK!, 5.0 / rmax);
    gl.uniform1f(locs.uPokeInv!, 1 / (rmax * rmax * 0.006));
    gl.uniform1f(locs.uSurgeInv!, 1 / (rmax * rmax * 0.004));
    gl.uniform1f(locs.uCell!, controls.cell);
    gl.uniform1f(locs.uAniso!, controls.aniso);
    gl.uniform1f(locs.uTilt!, controls.tilt);
    gl.uniform1f(locs.uOpen!, controls.open);
    gl.uniform1f(locs.uDepth!, controls.depth);
    gl.uniform1f(locs.uRough!, controls.rough);
    gl.uniform1f(locs.uExpose!, controls.expose);
    gl.uniform1f(locs.uSpinA!, this.spinA);
    gl.uniform1f(locs.uWave!, this.wave);
    gl.uniform2f(locs.uMouse!, mx, my);
    gl.uniform1f(locs.uPoke!, this.poke);
    gl.uniform1f(locs.uSteps!, this.getResolvedLevers().marchSteps ?? 72);
    // Camera drift: orbit, a lean on the approach angle, and elevation.
    gl.uniform3f(
      locs.uCamA!,
      t * 0.031 + 0.7,
      0.34 * Math.sin(t * 0.077),
      0.1 * Math.sin(t * 0.053 + 1.3)
    );

    const slots = [locs.uSurge0!, locs.uSurge1!, locs.uSurge2!];
    for (let i = 0; i < 3; i++) {
      const s = this.surges[i];
      if (!s) {
        gl.uniform3f(slots[i], 0, 0, 0);
        continue;
      }
      // Surge positions travel to the shader in screen space and land on the
      // bowl there, the same way the cursor does.
      gl.uniform3f(slots[i], s.x, s.y, s.age);
    }
  }
}

export function createIronBloomAnimation(
  initialControls?: Partial<IronBloomControlValues>
): IronBloomAnimation {
  return new IronBloomAnimation(initialControls);
}
