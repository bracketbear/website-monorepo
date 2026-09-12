/**
 * The raytraced globe. Lives here rather than in the SDF harness because
 * visionary-eye is its only consumer — portal-mark imports SHARED_EYE for
 * visionary() alone, at portalMarkAnimation.ts:464.
 *
 * Concatenate after SHARED_EYE, which still supplies the uniforms, stars()
 * and visionary().
 */
export const EYE_GLOBE = `
      // The tear film, in corneal-local tangent coordinates. uFilmOK is 0
      // whenever the simulation could not be built, so every consumer of the
      // field has one place to fall back from.
      uniform sampler2D uFilm;
      uniform float uFilmN;
      uniform float uDelta;
      uniform float uShowFilm;
      uniform float uFilmOK;
      float energyH(float lx, float ly, float ang, float t) {
        vec2 dir = vec2(lx, ly) / max(sin(ang), 1e-3);
        float f = fbm(dir * 2.6 + vec2(0.0, ang * 7.0 - t * 0.2) + fbm(vec2(ang * 5.0, t * 0.15)) * 2.0);
        return pow(clamp(1.0 - abs(f * 2.0 - 1.0) * 2.6, 0.0, 1.0), 3.0);
      }
      vec3 eyeW(vec2 q, float t) {
        vec3 IND = vec3(0.09, 0.05, 0.20);
        vec3 ELEC = vec3(0.30, 0.55, 1.0);
        vec3 VMAG = vec3(0.85, 0.20, 0.75);
        float R = 0.36;
        float r = length(q);
        // gaze from CPU (saccades + pursuit) plus fixation micro-tremor
        vec2 gz = uGaze + vec2(vnoise(vec2(t * 3.5, 1.0)) - 0.5, vnoise(vec2(4.0, t * 3.5)) - 0.5) * 0.025;
        gz = clamp(gz, -0.8, 0.8);
        vec3 gd = normalize(vec3(gz * 0.8, 1.0));
        // Debug view: the film height straight onto the cornea, h = -1 black
        // through h = +1 white. This is the verification instrument for the
        // simulation tasks, so it stays in the shipped shader behind a debug
        // control rather than living in a branch.
        if (uShowFilm > 0.5 && uFilmOK > 0.5 && r < R) {
          float nz = sqrt(max(R * R - r * r, 0.0));
          vec3 n = vec3(q, nz) / R;
          vec3 tx = normalize(cross(vec3(0.0, 1.0, 0.0), gd));
          vec3 ty = cross(gd, tx);
          vec2 l = vec2(dot(n, tx), dot(n, ty));
          float h = texture(uFilm, l / 1.2 + 0.5).x;
          return vec3(0.5 + 0.5 * h);
        }
        vec3 col = IND * (0.55 + 0.45 * fbm(q * 2.2 + t * 0.05));
        float a = atan(q.y, q.x);
        float fil = fbm(vec2(a * 5.0, r * 6.0 - t * 0.45));
        float lines = pow(clamp(1.0 - abs(fil * 2.0 - 1.0) * 2.4, 0.0, 1.0), 3.0);
        col += mix(ELEC, VMAG, 0.5 + 0.5 * sin(r * 8.0 - t * 0.7)) * lines * smoothstep(R, R + 0.25, r) * 0.55;
        col += uCream * stars(q, 55.0, 1.5) * 0.4 * step(R, r);
        col += mix(VMAG, ELEC, 0.5 + 0.5 * sin(t * 0.5)) * exp(-abs(r - R) * 22.0) * 0.6;
        if (r < R) {
          float nz = sqrt(max(R * R - r * r, 0.0));
          vec3 n = vec3(q, nz) / R;
          vec3 tx = normalize(cross(vec3(0.0, 1.0, 0.0), gd));
          vec3 ty = cross(gd, tx);
          float lx = dot(n, tx), ly = dot(n, ty), lz = dot(n, gd);
          float ang = acos(clamp(lz, -1.0, 1.0));
          vec2 sdir = vec2(lx, ly) / max(sin(ang), 1e-3);
          // white sclera: warm wet white, radial capillaries branching in from the rim
          vec3 sc = vec3(0.965, 0.95, 0.925);
          float vl = energyH(lx, ly, ang, t);
          float sa2 = atan(sdir.y, sdir.x);
          // primary veins run radially (constant angle around gaze axis), wobbled by fbm
          float vf = fbm(vec2(sa2 * 5.0, ang * 2.2) + fbm(sdir * 3.5) * 1.8);
          float vein = pow(clamp(1.0 - abs(vf * 2.0 - 1.0) * 3.4, 0.0, 1.0), 4.0);
          // finer secondary capillaries
          float vf2 = fbm(vec2(sa2 * 13.0 + 7.3, ang * 4.5) + fbm(sdir * 6.0) * 1.2);
          float vein2 = pow(clamp(1.0 - abs(vf2 * 2.0 - 1.0) * 5.5, 0.0, 1.0), 6.0);
          float vd = smoothstep(0.55, 1.35, ang);
          sc = mix(sc, vec3(0.74, 0.18, 0.15), vein * vd * 0.55);
          sc = mix(sc, vec3(0.84, 0.36, 0.30), vein2 * vd * 0.3);
          // subsurface flush toward the rim, slight yellow cast at the far edge
          sc = mix(sc, vec3(0.99, 0.85, 0.79), vd * vd * 0.28);
          sc = mix(sc, vec3(0.9, 0.86, 0.74), smoothstep(0.95, 1.5, ang) * 0.22);
          sc -= vec3(0.025, 0.03, 0.02) * fbm(sdir * 5.0 + vec2(0.0, ang * 3.0));
          // soft ambient occlusion where the sclera curves away
          sc *= 1.0 - smoothstep(0.9, 1.5, ang) * 0.18;
          // energy relief: filaments displace the surface normal (faded near the pupil so it stays round)
          float ee = 0.06;
          float pm = smoothstep(0.14, 0.32, ang) * smoothstep(0.68, 0.54, ang); // relief on the iris only; sclera stays smooth
          float dhx = (energyH(lx + ee, ly, ang, t) - vl) / ee * pm;
          float dhy = (energyH(lx, ly + ee, ang, t) - vl) / ee * pm;
          vec3 nb = normalize(n - (tx * dhx + ty * dhy) * uBump * 0.045);
          // ridges refract the iris slightly where they run
          vec3 ir = visionary((vec2(lx, ly) - vec2(dhx, dhy) * uBump * 0.012) * 0.62, t);
          float irisM = smoothstep(0.62, 0.5, ang);
          vec3 eye = mix(sc, ir, irisM);
          // corneal shadow ring where the iris meets the white
          eye *= 1.0 - smoothstep(0.72, 0.56, ang) * smoothstep(0.5, 0.58, ang) * 0.35;
          eye += mix(ELEC, uCream, 0.4) * exp(-abs(ang - 0.56) * 26.0) * 0.35;
          vec3 ld = normalize(vec3(-0.45, -0.55, 0.85));
          float dif = clamp(dot(nb, ld), 0.0, 1.0);
          eye *= 0.55 + 0.6 * dif;
          eye += uCream * pow(dif, 48.0) * 0.9;
          eye += uCream * pow(dif, 7.0) * 0.07 * (1.0 - irisM); // broad wet sheen on the white
          eye += ELEC * vl * pow(clamp(dot(nb, normalize(vec3(0.3, -0.2, 1.0))), 0.0, 1.0), 8.0) * uBump * 0.55 * irisM;
          eye += ELEC * pow(1.0 - nz / R, 3.0) * 0.18;
          col = eye;
        }
        return col;
      }
  `;
