import {
  CAUSTIC_MAX,
  CORNEA_ETA,
  DOMAIN,
  DRY_DIM,
  DRY_H,
  FILM_REACH,
  FILM_REACH_FADE,
  FILM_SLOPE,
  IRIS_DEPTH,
  WET_H,
} from './physics';

/**
 * The raytraced globe. Lives here rather than in the SDF harness because
 * visionary-eye is its only consumer — portal-mark imports SHARED_EYE for
 * visionary() alone, at portalMarkAnimation.ts:464.
 *
 * Concatenate after SHARED_EYE, which still supplies the uniforms, stars()
 * and visionary().
 *
 * Every number the film contributes comes from `physics.ts`, interpolated in
 * the way `film.ts` already interpolates the simulation's own constants, so
 * the display and the simulation cannot drift apart.
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
      /**
       * The film, fetched smoothly.
       *
       * 96 cells across roughly 600 screen pixels is about six pixels a cell,
       * and hardware bilinear is only C0: its gradient is constant inside a
       * cell and jumps at every boundary. A colour can carry that. A specular
       * cannot: pow(dot, 48.0) turns each of those jumps into a visible facet
       * edge. Smoothstepping the fractional coordinate before the fetch makes
       * the interpolant C1 at the cell boundaries, because the smoothstep's
       * own derivative is zero at both ends of the cell.
       *
       * The field's texels are LINEAR-filterable by construction: film.ts only
       * takes RGBA32F when OES_texture_float_linear is present, and otherwise
       * falls back to RGBA16F, which core WebGL2 filters.
       */
      vec2 filmUV(vec2 l) {
        vec2 p = (l / ${DOMAIN.toFixed(6)} + 0.5) * uFilmN - 0.5;
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return (i + f + 0.5) / uFilmN;
      }
      /**
       * 1 where the film may be read, 0 before a fetch would leave its domain.
       *
       * A Chebyshev radius, because the field is a square and the failure this
       * prevents is CLAMP_TO_EDGE extrapolating the boundary texel outward
       * into long radial streaks. See FILM_REACH in physics.ts for why this is
       * not the corneal cap: the catchlight sits at |l| = 0.64, outside the
       * cap's inscribed circle, and a circular mask large enough to be
       * streak-free would delete the highlight the film exists to drive.
       */
      float filmReach(vec2 l) {
        return 1.0 - smoothstep(
          ${(FILM_REACH - FILM_REACH_FADE).toFixed(6)},
          ${FILM_REACH.toFixed(6)},
          max(abs(l.x), abs(l.y)));
      }
      /**
       * The corneal refraction map: where the ray through the tangent point
       * l lands on the iris plane, in the same tangent coordinates.
       *
       * This is the eye's real optics and not a warp chosen to look like
       * them. The ray enters air-to-cornea at n = 1.376 and travels
       * IRIS_DEPTH — 3.6mm — to the plane the iris sits on, and the iris is
       * then read at where it comes out. On axis that contracts the lookup by
       * a factor 0.905, so the iris **looks 1.10x larger than it is**, which
       * is the magnification a real cornea gives, and the contraction tightens
       * toward the limbus, which is what makes the rim read as the edge of a
       * thick lens rather than a drawn ring.
       *
       * tilt is the film's contribution to the surface normal — the height
       * gradient already scaled by FILM_SLOPE and the reach — so a zero tilt is
       * the bare corneal sphere and the film leaves the map by arithmetic
       * rather than by a branch.
       *
       * v is the view direction in the gaze-local frame. The 0.2 floor
       * catches rays that come out grazing near the silhouette; over the iris
       * the true value never drops below about 0.91, so it shapes nothing
       * anyone sees.
       */
      vec2 irisUV(vec2 l, vec2 tilt, vec3 v) {
        vec3 n = normalize(vec3(l - tilt, sqrt(max(1.0 - dot(l, l), 1e-4))));
        vec3 rr = refract(v, n, ${CORNEA_ETA.toFixed(8)});
        return l + rr.xy * (${IRIS_DEPTH.toFixed(8)} / max(0.2, -rr.z));
      }
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
        // control rather than living in a branch. Deliberately unmasked and
        // unsmoothed: it shows the raw field, clamped streaks and all, which
        // is what an instrument should do.
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
          // The catchlight, reflected off the film rather than painted on.
          //
          // fw is the only gate, and it is written so that fw = 0 collapses
          // every line below, term by term, back onto the painted specular
          // this replaced: nf becomes nb, wet becomes 1, and dsp becomes dif.
          // That matters because fw = 0 is a shipped path and not a
          // hypothetical - a driver that refuses float render targets leaves
          // uFilmOK at 0 and the eye has to look exactly as it did.
          vec2 fl = vec2(lx, ly);
          float fw = uFilmOK * filmReach(fl);
          // One cell, the field's own Nyquist -- see JACOBIAN_STEP. Every tap
          // below is within one cell of fl, which is exactly the margin
          // FILM_REACH reserves.
          float e = uDelta;
          float hC = texture(uFilm, filmUV(fl)).x;
          // The gradient taps go through filmUV too. Smoothing the value and
          // not the gradient would smooth the colour and facet the light,
          // which is the one artefact the smoothing exists to prevent.
          float h10 = texture(uFilm, filmUV(fl + vec2(e, 0.0))).x;
          float h01 = texture(uFilm, filmUV(fl + vec2(0.0, e))).x;
          vec2 gH = (vec2(h10, h01) - hC) / e;
          vec3 nf = fw > 0.0
            ? normalize(nb - (tx * gH.x + ty * gH.y) * (${FILM_SLOPE.toFixed(6)} * fw))
            : nb;
          // Subtractive: a dry patch is a dull mark, not a bright one. It
          // gates all three terms below -- the two highlights it withholds,
          // and the diffuse it dims, which is the one that actually shows.
          float wet = mix(1.0, smoothstep(${DRY_H.toFixed(6)}, ${WET_H.toFixed(6)}, hC), fw);

          // ---- The cornea as a lens, and the caustic that is its Jacobian.
          //
          // Three taps beyond the gradient's own -- one back in each axis and
          // one on the diagonal -- give the film's Hessian on a stencil that
          // never leaves the one cell FILM_REACH reserves. The Hessian is what
          // the caustic is made of: the map bends light by an amount
          // proportional to dh/dl, so how hard it *concentrates* light is the
          // derivative of that, and a film with a uniform slope focuses
          // nothing.
          float hm0 = texture(uFilm, filmUV(fl - vec2(e, 0.0))).x;
          float h0m = texture(uFilm, filmUV(fl - vec2(0.0, e))).x;
          float h11 = texture(uFilm, filmUV(fl + vec2(e, e))).x;
          // Centred, unlike gH above, which stays exactly as the catchlight
          // was tuned against it. The two differ by half a cell of shift --
          // below what either term resolves -- and centring is what lets the
          // second differences fit inside the reach.
          vec2 gC = vec2(h10 - hm0, h01 - h0m) / (2.0 * e);
          float hxx = (h10 - 2.0 * hC + hm0) / (e * e);
          float hyy = (h01 - 2.0 * hC + h0m) / (e * e);
          float hxy = (h11 - h10 - h01 + hC) / (e * e);
          // The view ray, projected onto the gaze-local frame the film lives
          // in. The globe is drawn orthographically, so in world terms this is
          // always (0, 0, -1); off-axis gaze is the whole reason it has to be
          // carried into the local frame rather than assumed.
          vec3 vw = -vec3(tx.z, ty.z, gd.z);
          // fw rides on the tilt, so at fw = 0 every irisUV below is called
          // with a tilt of exactly zero and f0/fx/fy are bit-for-bit b0/bx/by:
          // J equals J0, the caustic is exactly 0, and what is left is the
          // bare cornea, which is there with or without a film.
          float s = ${FILM_SLOPE.toFixed(6)} * fw;
          vec2 f0 = irisUV(fl, gC * s, vw);
          vec2 fxu = irisUV(fl + vec2(e, 0.0), (gC + vec2(hxx, hxy) * e) * s, vw);
          vec2 fyu = irisUV(fl + vec2(0.0, e), (gC + vec2(hxy, hyy) * e) * s, vw);
          float J = ((fxu.x - f0.x) * (fyu.y - f0.y)
                   - (fxu.y - f0.y) * (fyu.x - f0.x)) / (e * e);
          // The same map with the film taken out. Dividing by it rather than
          // by 1 is what removes the cornea's own magnification -- which runs
          // 0.82 on axis to 0.75 at the limbus and would otherwise read as a
          // permanent glow in the middle of the iris -- and leaves only what
          // the film did.
          vec2 b0 = irisUV(fl, vec2(0.0), vw);
          vec2 bxu = irisUV(fl + vec2(e, 0.0), vec2(0.0), vw);
          vec2 byu = irisUV(fl + vec2(0.0, e), vec2(0.0), vw);
          float J0 = ((bxu.x - b0.x) * (byu.y - b0.y)
                    - (bxu.y - b0.y) * (byu.x - b0.x)) / (e * e);
          // Signed: negative where the film spreads the light it piled onto
          // the crest next door. Both bounds are the same statement of how far
          // the film can throw light -- see CAUSTIC_MAX.
          float focus = clamp(J0 / max(abs(J), 1e-6),
            ${(1 / CAUSTIC_MAX).toFixed(8)}, ${CAUSTIC_MAX.toFixed(8)}) - 1.0;

          // The iris, seen through the cornea rather than looked up straight.
          // ridges refract the iris slightly where they run
          vec3 ir = visionary((f0 - vec2(dhx, dhy) * uBump * 0.012) * 0.62, t);
          float irisM = smoothstep(0.62, 0.5, ang);
          vec3 eye = mix(sc, ir, irisM);
          // corneal shadow ring where the iris meets the white
          eye *= 1.0 - smoothstep(0.72, 0.56, ang) * smoothstep(0.5, 0.58, ang) * 0.35;
          eye += mix(ELEC, uCream, 0.4) * exp(-abs(ang - 0.56) * 26.0) * 0.35;
          vec3 ld = normalize(vec3(-0.45, -0.55, 0.85));
          float dif = clamp(dot(nb, ld), 0.0, 1.0);
          // Diffuse stays on nb: the energy relief still shapes the shading,
          // and the highlight is the only thing that moves onto the film's
          // normal. What the film does to this term is dim it, and that is
          // not decoration.
          //
          // Measured, this pixel at the specular peak: the diffuse term alone
          // is (1.094, 1.078, 1.053), already past white before a single
          // specular term is added, and finish() tone-maps nothing. So wet = 1
          // totals 2.010 and wet = 0 totals 1.081 and both clip to the same
          // pure white -- the dry patches were computed correctly and thrown
          // away by the clamp. Nothing additive can darken a pixel that is
          // already over 1, which is why this multiplies instead. See DRY_DIM.
          //
          // wet = 1 leaves it exactly 1.0, so the fallback is untouched.
          //
          // The caustic rides the same term, and for the same reason. It is a
          // *ratio* of irradiance -- how much more or less light the film put
          // here than it would have flat -- so the honest place for it is
          // multiplying the light that is already falling on this pixel, which
          // is the 0.6 * dif. Adding a coloured glow instead would be adding
          // light the film does not have, and would clip away on the sclera
          // exactly as the dry patches did before DRY_DIM. There is no gain in
          // front of it: (1.0 + focus) is the measurement, unscaled. The 0.55
          // ambient stays out of it because diffuse fill does not focus.
          //
          // irisM is the gate because a caustic needs something to land on,
          // and behind the sclera there is no iris plane 3.6mm down.
          //
          // Measured on the painted iris: median clipped luminance 0.184, only
          // 2.4% of iris pixels clipping in any channel. So unlike the sclera,
          // there is room here for the term to be seen.
          eye *= (0.55 + 0.6 * dif * (1.0 + focus * irisM))
               * (1.0 - ${DRY_DIM.toFixed(6)} * (1.0 - wet));
          float dsp = clamp(dot(nf, ld), 0.0, 1.0);
          eye += uCream * pow(dsp, 48.0) * 0.9 * wet;
          eye += uCream * pow(dsp, 7.0) * 0.07 * (1.0 - irisM) * wet; // broad wet sheen on the white
          eye += ELEC * vl * pow(clamp(dot(nb, normalize(vec3(0.3, -0.2, 1.0))), 0.0, 1.0), 8.0) * uBump * 0.55 * irisM;
          eye += ELEC * pow(1.0 - nz / R, 3.0) * 0.18;
          col = eye;
        }
        return col;
      }
  `;
