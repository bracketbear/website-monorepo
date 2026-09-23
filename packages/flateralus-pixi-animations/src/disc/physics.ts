/**
 * The disc, on the CPU. This is the twin of `shaders.ts`: the same
 * operator split on the same log-polar grid, run small so the tests can
 * measure what the GPU cannot be asked. Every stencil here has to match
 * the shader's exactly — clamped i, wrapped j, the same one-sided edges —
 * or the mirror stops being a mirror.
 *
 * Units: GM★ = 1 and r = 1 is the middle of the disc. The orbit there
 * takes 2π units.
 */

export const R_IN = 0.25;
export const R_OUT = 2.0;
/** Fixed simulation step, and the most substeps a frame may take. */
export const STEP = 0.02;
export const MAX_STEPS_PER_FRAME = 4;
/** Wall-clock rate: the orbit at r = 1 takes 4 s. */
export const UNITS_PER_SECOND = 1.57;
export const MAX_PLANETS = 8;
/** A thrown seed, about the Earth against the Sun. */
export const SEED_Q = 1e-5;
/** Past this a planet has left the scene. Inside R_IN it has fallen in. */
export const R_ESCAPE = 2.2;

export interface DiscParams {
  dt: number;
  /** H/r. Sets c_s, the softening, the wake's pitch and the colour. */
  h: number;
  /** Shakura–Sunyaev α: ν = α c_s H. */
  alpha: number;
  /** Disc mass as a fraction of the star's. */
  discMass: number;
  /** 1/τ_acc: the fraction of Σ inside a sink removed per unit time. */
  accRate: number;
  /** A sink is never smaller than this many cells, so a fresh seed eats. */
  sinkFloorCells: number;
}

export const DEFAULT_PARAMS: DiscParams = {
  dt: STEP,
  h: 0.05,
  alpha: 3e-3,
  discMass: 0.02,
  accRate: 0.03,
  sinkFloorCells: 1.5,
};

export interface Planet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Mass as a fraction of the star's. */
  q: number;
  age: number;
  /** Acceleration from the disc, held from the last reduce. */
  ax: number;
  ay: number;
}

export interface Disc {
  nr: number;
  nphi: number;
  dlnr: number;
  dphi: number;
  /** Cell-centre radii (nr), face radii (nr + 1), cell areas (nr). */
  r: Float32Array;
  rf: Float32Array;
  area: Float32Array;
  sig: Float32Array;
  vr: Float32Array;
  vp: Float32Array;
  eat: Float32Array;
  /** The other half of the ping-pong pair. */
  sig2: Float32Array;
  vr2: Float32Array;
  vp2: Float32Array;
  eat2: Float32Array;
  /** Σ at r = 1 before the tapers, and the density floor. */
  sigma0: number;
  floor: number;
  /** Mass that has left through the domain faces. */
  outflow: number;
}

/** Locally isothermal: c_s = h v_K, so c_s² = h²/r. */
export function cs2(r: number, h: number): number {
  return (h * h) / r;
}

function smooth01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** Σ ∝ 1/r, eased in over the first 0.06 and out over the last 10 %. */
export function sigmaProfile(r: number, sigma0: number): number {
  const tin = smooth01((r - R_IN) / 0.06);
  const tout = 1 - smooth01((r - 0.9 * R_OUT) / (0.1 * R_OUT));
  return (sigma0 / r) * tin * tout;
}

/**
 * The radial-gradient stencil shared by the opening state and the step:
 * central in the interior, one-sided at the two edges. Takes the three
 * neighbouring values so callers on a hot loop pay no closure.
 */
export function gradRStencil(
  Pm: number,
  P0: number,
  Pp: number,
  r: Float32Array,
  i: number,
  nr: number
): number {
  if (i === 0) return (Pp - P0) / (r[1] - r[0]);
  if (i === nr - 1) return (P0 - Pm) / (r[i] - r[i - 1]);
  return (Pp - Pm) / (r[i + 1] - r[i - 1]);
}

/**
 * Radial gradient of a ring quantity with the stencil the step uses:
 * central in the interior, one-sided at the two edges. `get(i)` must
 * clamp i itself where it is asked beyond the grid.
 */
export function gradR(
  get: (i: number) => number,
  r: Float32Array,
  i: number,
  nr: number
): number {
  return gradRStencil(get(i - 1), get(i), get(i + 1), r, i, nr);
}

export function createDisc(nr: number, nphi: number, p: DiscParams): Disc {
  const dlnr = Math.log(R_OUT / R_IN) / nr;
  const dphi = (2 * Math.PI) / nphi;
  const r = new Float32Array(nr);
  const rf = new Float32Array(nr + 1);
  const area = new Float32Array(nr);
  for (let i = 0; i <= nr; i++) rf[i] = R_IN * Math.exp(i * dlnr);
  for (let i = 0; i < nr; i++) {
    r[i] = R_IN * Math.exp((i + 0.5) * dlnr);
    area[i] = 0.5 * (rf[i + 1] * rf[i + 1] - rf[i] * rf[i]) * dphi;
  }
  const n = nr * nphi;
  const sigma0 = p.discMass / (2 * Math.PI * (R_OUT - R_IN));
  const floor = 1e-4 * sigma0;

  const prof = new Float64Array(nr);
  for (let i = 0; i < nr; i++)
    prof[i] = Math.max(floor, sigmaProfile(r[i], sigma0));
  // Equilibrium rotation from the discrete pressure gradient, so the disc
  // opens balanced against the operator it will be stepped with rather
  // than against the analytic profile.
  const P = (i: number) => {
    const ii = Math.max(0, Math.min(nr - 1, i));
    return cs2(r[ii], p.h) * prof[ii];
  };
  const vpr = new Float64Array(nr);
  for (let i = 0; i < nr; i++) {
    const dPdr = gradR(P, r, i, nr);
    const v2 = r[i] * (1 / (r[i] * r[i]) + dPdr / prof[i]);
    vpr[i] = Math.sqrt(Math.max(0, v2));
  }

  const D: Disc = {
    nr,
    nphi,
    dlnr,
    dphi,
    r,
    rf,
    area,
    sig: new Float32Array(n),
    vr: new Float32Array(n),
    vp: new Float32Array(n),
    eat: new Float32Array(n),
    sig2: new Float32Array(n),
    vr2: new Float32Array(n),
    vp2: new Float32Array(n),
    eat2: new Float32Array(n),
    sigma0,
    floor,
    outflow: 0,
  };
  for (let i = 0; i < nr; i++)
    for (let j = 0; j < nphi; j++) {
      const k = i * nphi + j;
      D.sig[k] = prof[i];
      D.vp[k] = vpr[i];
    }
  return D;
}

// ---- measures

/** The ring whose centre is nearest r. */
export function ringIndex(D: Disc, r: number): number {
  const f = Math.log(r / R_IN) / D.dlnr - 0.5;
  return Math.max(0, Math.min(D.nr - 1, Math.round(f)));
}

export function ringMean(D: Disc, i: number): number {
  let s = 0;
  for (let j = 0; j < D.nphi; j++) s += D.sig[i * D.nphi + j];
  return s / D.nphi;
}

export function totalMass(D: Disc): number {
  let m = 0;
  for (let i = 0; i < D.nr; i++) {
    let s = 0;
    for (let j = 0; j < D.nphi; j++) s += D.sig[i * D.nphi + j];
    m += s * D.area[i];
  }
  return m;
}

/**
 * RMS relative perturbation of Σ around ring i: the wake's contrast. Not
 * a Fourier mode — at one ring the wake is a single peak about H wide,
 * whose low-m coefficients carry only a few percent of it.
 */
export function wakeRms(D: Disc, i: number): number {
  const mean = ringMean(D, i);
  if (mean <= 0) return 0;
  let s = 0;
  for (let j = 0; j < D.nphi; j++) {
    const d = D.sig[i * D.nphi + j] / mean - 1;
    s += d * d;
  }
  return Math.sqrt(s / D.nphi);
}

/** Mean wake contrast two scale heights inside and outside r_p. */
export function wakeAmplitude(D: Disc, rp: number, h: number): number {
  const H = h * rp;
  return (
    0.5 *
    (wakeRms(D, ringIndex(D, rp - 2 * H)) +
      wakeRms(D, ringIndex(D, rp + 2 * H)))
  );
}

/** Azimuth of the densest cell on ring i. */
export function peakPhi(D: Disc, i: number): number {
  let best = -Infinity;
  let at = 0;
  for (let j = 0; j < D.nphi; j++) {
    const v = D.sig[i * D.nphi + j];
    if (v > best) {
      best = v;
      at = j;
    }
  }
  return (at + 0.5) * D.dphi;
}

export function isHealthy(D: Disc): boolean {
  for (let k = 0; k < D.sig.length; k++) {
    if (!Number.isFinite(D.sig[k]) || D.sig[k] < 0) return false;
    if (!Number.isFinite(D.vr[k]) || !Number.isFinite(D.vp[k])) return false;
  }
  return true;
}

// ---- the operator split

export function swap(D: Disc): void {
  [D.sig, D.sig2] = [D.sig2, D.sig];
  [D.vr, D.vr2] = [D.vr2, D.vr];
  [D.vp, D.vp2] = [D.vp2, D.vp];
  [D.eat, D.eat2] = [D.eat2, D.eat];
}

export function hillRadius(pl: Planet): number {
  return Math.hypot(pl.x, pl.y) * Math.cbrt(pl.q / 3);
}

/** Plummer softening at 0.6 H, the convention the gap thresholds assume. */
export function softening(pl: Planet, h: number): number {
  return 0.6 * h * Math.hypot(pl.x, pl.y);
}

/**
 * Pressure gradient, star and planet gravity, centrifugal and Coriolis
 * terms, viscosity, and the accretion sink. Semi-implicit Euler: v_φ
 * first, then v_r with the new v_φ. Same stencils as `uPass == 0`.
 */
export function sourcePass(
  D: Disc,
  p: DiscParams,
  planets: readonly Planet[],
  clearEat: boolean
): void {
  const { nr, nphi, dlnr, dphi, r, sig, vr, vp, eat } = D;
  const h = p.h;
  const dt = p.dt;
  const accK = 1 - Math.exp(-p.accRate * dt);
  const at = (i: number, j: number) =>
    Math.max(0, Math.min(nr - 1, i)) * nphi + (((j % nphi) + nphi) % nphi);
  const np = planets.length;
  const px = new Float64Array(np);
  const py = new Float64Array(np);
  const pq = new Float64Array(np);
  const peps2 = new Float64Array(np);
  const prs = new Float64Array(np);
  for (let k = 0; k < np; k++) {
    const pl = planets[k];
    px[k] = pl.x;
    py[k] = pl.y;
    pq[k] = pl.q;
    const e = softening(pl, h);
    peps2[k] = e * e;
    prs[k] = 0.5 * hillRadius(pl);
  }

  for (let i = 0; i < nr; i++) {
    const ri = r[i];
    const rinv = 1 / ri;
    const c2 = cs2(ri, h);
    const c2p = cs2(r[Math.min(nr - 1, i + 1)], h);
    const c2m = cs2(r[Math.max(0, i - 1)], h);
    const nu = p.alpha * h * h * Math.sqrt(ri);
    for (let j = 0; j < nphi; j++) {
      const k = i * nphi + j;
      const s = Math.max(sig[k], D.floor);
      const P0 = c2 * sig[k];
      const Pp = c2p * sig[at(i + 1, j)];
      const Pm = c2m * sig[at(i - 1, j)];
      const dPdr = gradRStencil(Pm, P0, Pp, r, i, nr);
      const dPdphi =
        (c2 * (sig[at(i, j + 1)] - sig[at(i, j - 1)])) / (2 * dphi);

      const phi = (j + 0.5) * dphi;
      const cp = Math.cos(phi);
      const sp = Math.sin(phi);
      const x = ri * cp;
      const y = ri * sp;
      let fx = 0;
      let fy = 0;
      let s1 = sig[k];
      let removed = 0;
      for (let m = 0; m < np; m++) {
        const dx = x - px[m];
        const dy = y - py[m];
        const d2 = dx * dx + dy * dy;
        const d2e = d2 + peps2[m];
        const inv = pq[m] / (d2e * Math.sqrt(d2e));
        fx -= dx * inv;
        fy -= dy * inv;
        const rs = Math.max(prs[m], p.sinkFloorCells * ri * dphi);
        if (d2 < rs * rs) {
          const rem = s1 * accK;
          s1 -= rem;
          removed += rem;
        }
      }
      const arp = fx * cp + fy * sp;
      const app = -fx * sp + fy * cp;

      const vrC = vr[k];
      const vpC = vp[k];
      const lapVr =
        ((vr[at(i + 1, j)] - 2 * vrC + vr[at(i - 1, j)]) / (dlnr * dlnr) +
          (vr[at(i, j + 1)] - 2 * vrC + vr[at(i, j - 1)]) / (dphi * dphi)) *
        rinv *
        rinv;
      const lapVp =
        ((vp[at(i + 1, j)] - 2 * vpC + vp[at(i - 1, j)]) / (dlnr * dlnr) +
          (vp[at(i, j + 1)] - 2 * vpC + vp[at(i, j - 1)]) / (dphi * dphi)) *
        rinv *
        rinv;

      const vp1 =
        vpC + dt * (-vrC * vpC * rinv - dPdphi / (s * ri) + app + nu * lapVp);
      const vr1 =
        vrC +
        dt * (vp1 * vp1 * rinv - rinv * rinv - dPdr / s + arp + nu * lapVr);

      D.sig2[k] = s1;
      D.vr2[k] = vr1;
      D.vp2[k] = vp1;
      D.eat2[k] = clearEat ? removed : eat[k] + removed;
    }
  }
  swap(D);
}

/** Van Leer's harmonic-mean slope limiter: monotone, second order. */
export function vanLeer(am: number, a0: number, ap: number): number {
  const d1 = a0 - am;
  const d2 = ap - a0;
  const pr = d1 * d2;
  return pr > 0 ? (2 * pr) / (d1 + d2) : 0;
}

/** Upwind face value: the donor cell's value, extrapolated by its slope. */
export function faceValue(
  aL: number,
  sL: number,
  aR: number,
  sR: number,
  c: number
): number {
  return c > 0 ? aL + 0.5 * sL * (1 - c) : aR - 0.5 * sR * (1 + c);
}

const clampC = (c: number) => Math.max(-0.9, Math.min(0.9, c));

/**
 * Azimuthal transport with orbital advection (Masset 2000). Each ring is
 * shifted by the nearest whole number of cells to Ω dt / Δφ — an exact
 * permutation — and the remainder, plus the real deviation from Keplerian,
 * transports Σ, Σ v_r and Σ r v_φ in flux form. Same as `uPass == 1`.
 */
export function phiPass(D: Disc, p: DiscParams): void {
  const { nr, nphi, dphi, r, sig, vr, vp, eat } = D;
  const dt = p.dt;
  const q0 = new Float64Array(nphi);
  const q1 = new Float64Array(nphi);
  const q2 = new Float64Array(nphi);
  const u = new Float64Array(nphi);
  const F0 = new Float64Array(nphi);
  const F1 = new Float64Array(nphi);
  const F2 = new Float64Array(nphi);
  for (let i = 0; i < nr; i++) {
    const ri = r[i];
    const base = i * nphi;
    const om = Math.pow(ri, -1.5);
    const n = Math.round((om * dt) / dphi);
    const kres = (n * dphi * ri) / dt;
    const dx = ri * dphi;
    for (let j = 0; j < nphi; j++) {
      const k = base + j;
      q0[j] = sig[k];
      q1[j] = sig[k] * vr[k];
      q2[j] = sig[k] * ri * vp[k];
      u[j] = vp[k] - kres;
    }
    // Flux through the face between j and j+1.
    for (let j = 0; j < nphi; j++) {
      const jm = (j + nphi - 1) % nphi;
      const jp = (j + 1) % nphi;
      const jpp = (j + 2) % nphi;
      const c = clampC((0.5 * (u[j] + u[jp]) * dt) / dx);
      F0[j] =
        c *
        faceValue(
          q0[j],
          vanLeer(q0[jm], q0[j], q0[jp]),
          q0[jp],
          vanLeer(q0[j], q0[jp], q0[jpp]),
          c
        );
      F1[j] =
        c *
        faceValue(
          q1[j],
          vanLeer(q1[jm], q1[j], q1[jp]),
          q1[jp],
          vanLeer(q1[j], q1[jp], q1[jpp]),
          c
        );
      F2[j] =
        c *
        faceValue(
          q2[j],
          vanLeer(q2[jm], q2[j], q2[jp]),
          q2[jp],
          vanLeer(q2[j], q2[jp], q2[jpp]),
          c
        );
    }
    for (let j = 0; j < nphi; j++) {
      const jm = (j + nphi - 1) % nphi;
      const n0 = q0[j] - (F0[j] - F0[jm]);
      const n1 = q1[j] - (F1[j] - F1[jm]);
      const n2 = q2[j] - (F2[j] - F2[jm]);
      const dst = base + ((j + n) % nphi);
      const sg = Math.max(D.floor, n0);
      D.sig2[dst] = sg;
      D.vr2[dst] = n1 / sg;
      D.vp2[dst] = n2 / (sg * ri);
      D.eat2[dst] = eat[base + j];
    }
  }
  swap(D);
}

/**
 * Radial transport in flux form on the non-uniform cells, with mass fluxes
 * through faces of radius r_f so the area weighting is exact. Domain faces
 * are outflow: flux leaves with the upwind value, nothing enters. Same as
 * `uPass == 2`.
 */
export function rPass(D: Disc, p: DiscParams): void {
  const { nr, nphi, dphi, r, rf, area, sig, vr, vp, eat } = D;
  const dt = p.dt;
  const q0 = new Float64Array(nr);
  const q1 = new Float64Array(nr);
  const q2 = new Float64Array(nr);
  const F0 = new Float64Array(nr + 1);
  const F1 = new Float64Array(nr + 1);
  const F2 = new Float64Array(nr + 1);
  const dr = (i: number) => rf[i + 1] - rf[i];
  const cl = (i: number) => Math.max(0, Math.min(nr - 1, i));
  for (let j = 0; j < nphi; j++) {
    for (let i = 0; i < nr; i++) {
      const k = i * nphi + j;
      q0[i] = sig[k];
      q1[i] = sig[k] * vr[k];
      q2[i] = sig[k] * r[i] * vp[k];
    }
    const Q0 = (i: number) => q0[cl(i)];
    const Q1 = (i: number) => q1[cl(i)];
    const Q2 = (i: number) => q2[cl(i)];
    for (let f = 0; f <= nr; f++) {
      let w: number;
      let a0: number;
      let a1: number;
      let a2: number;
      if (f === 0) {
        w = Math.min(vr[j], 0);
        a0 = q0[0];
        a1 = q1[0];
        a2 = q2[0];
      } else if (f === nr) {
        w = Math.max(vr[(nr - 1) * nphi + j], 0);
        a0 = q0[nr - 1];
        a1 = q1[nr - 1];
        a2 = q2[nr - 1];
      } else {
        w = 0.5 * (vr[(f - 1) * nphi + j] + vr[f * nphi + j]);
        const c = clampC((w * dt) / (w > 0 ? dr(f - 1) : dr(f)));
        a0 = faceValue(
          Q0(f - 1),
          vanLeer(Q0(f - 2), Q0(f - 1), Q0(f)),
          Q0(f),
          vanLeer(Q0(f - 1), Q0(f), Q0(f + 1)),
          c
        );
        a1 = faceValue(
          Q1(f - 1),
          vanLeer(Q1(f - 2), Q1(f - 1), Q1(f)),
          Q1(f),
          vanLeer(Q1(f - 1), Q1(f), Q1(f + 1)),
          c
        );
        a2 = faceValue(
          Q2(f - 1),
          vanLeer(Q2(f - 2), Q2(f - 1), Q2(f)),
          Q2(f),
          vanLeer(Q2(f - 1), Q2(f), Q2(f + 1)),
          c
        );
      }
      const g = w * dt * rf[f] * dphi;
      F0[f] = g * a0;
      F1[f] = g * a1;
      F2[f] = g * a2;
    }
    D.outflow += -F0[0] + F0[nr];
    for (let i = 0; i < nr; i++) {
      const k = i * nphi + j;
      const n0 = q0[i] - (F0[i + 1] - F0[i]) / area[i];
      const n1 = q1[i] - (F1[i + 1] - F1[i]) / area[i];
      const n2 = q2[i] - (F2[i + 1] - F2[i]) / area[i];
      const sg = Math.max(D.floor, n0);
      D.sig2[k] = sg;
      D.vr2[k] = n1 / sg;
      D.vp2[k] = n2 / (sg * r[i]);
      D.eat2[k] = eat[k];
    }
  }
  swap(D);
}

/** One substep: sources and sink, azimuthal transport, radial transport. */
export function step(
  D: Disc,
  p: DiscParams,
  planets: readonly Planet[],
  clearEat: boolean
): void {
  sourcePass(D, p, planets, clearEat);
  phiPass(D, p);
  rPass(D, p);
}

// ---- the planets

/** Prograde circular velocity at (x, y). */
export function circularVelocity(x: number, y: number): [number, number] {
  const r = Math.hypot(x, y);
  const vK = 1 / Math.sqrt(r);
  return [(-y / r) * vK, (x / r) * vK];
}

function bodyAccel(
  planets: readonly Planet[],
  k: number,
  h: number
): [number, number] {
  const a = planets[k];
  const r = Math.hypot(a.x, a.y);
  const r3 = r * r * r;
  let ax = -a.x / r3 + a.ax;
  let ay = -a.y / r3 + a.ay;
  const e = softening(a, h);
  const e2 = e * e;
  for (let m = 0; m < planets.length; m++) {
    if (m === k) continue;
    const b = planets[m];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d2 = dx * dx + dy * dy + e2;
    const inv = b.q / (d2 * Math.sqrt(d2));
    ax += dx * inv;
    ay += dy * inv;
  }
  return [ax, ay];
}

/**
 * Kick-drift-kick leapfrog in the star's potential plus each other's, plus
 * the disc force held on each planet from the last reduce. Symplectic, so
 * the energy oscillates within (ω dt)²/8 and does not walk.
 */
export function stepBodies(planets: Planet[], dt: number, h: number): void {
  const n = planets.length;
  const acc: [number, number][] = [];
  for (let k = 0; k < n; k++) acc.push(bodyAccel(planets, k, h));
  for (let k = 0; k < n; k++) {
    const p = planets[k];
    p.vx += 0.5 * acc[k][0] * dt;
    p.vy += 0.5 * acc[k][1] * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (let k = 0; k < n; k++) {
    const [ax, ay] = bodyAccel(planets, k, h);
    const p = planets[k];
    p.vx += 0.5 * ax * dt;
    p.vy += 0.5 * ay * dt;
    p.age += dt;
  }
}

export function orbitEnergy(pl: Planet): number {
  return 0.5 * (pl.vx * pl.vx + pl.vy * pl.vy) - 1 / Math.hypot(pl.x, pl.y);
}

export interface Elements {
  bound: boolean;
  /** Semi-major axis; Infinity when unbound. */
  a: number;
  e: number;
  /** Argument of periapsis. */
  w: number;
  /** Semi-latus rectum, L². */
  p: number;
  L: number;
}

/** Orbital elements of a throw, from its position and velocity. */
export function elementsOf(
  x: number,
  y: number,
  vx: number,
  vy: number
): Elements {
  const r = Math.hypot(x, y);
  const E = 0.5 * (vx * vx + vy * vy) - 1 / r;
  const L = x * vy - y * vx;
  // Eccentricity vector: (v × L ẑ)/μ − r̂, with μ = 1.
  const ex = vy * L - x / r;
  const ey = -vx * L - y / r;
  const e = Math.hypot(ex, ey);
  return {
    bound: E < 0,
    a: E < 0 ? -1 / (2 * E) : Infinity,
    e,
    w: Math.atan2(ey, ex),
    p: L * L,
    L,
  };
}

/**
 * The conic r(θ) = p / (1 + e cos(θ − w)), sampled as xy pairs. A bound
 * orbit is the whole ellipse; an unbound one is the arc that stays inside
 * 1.5 R_ESCAPE, which is as far as the stage shows.
 */
export function orbitPath(el: Elements, n: number): Float32Array {
  const out: number[] = [];
  const limit = 1.5 * R_ESCAPE;
  let from = 0;
  let to = 2 * Math.PI;
  if (!el.bound) {
    const tInf = Math.acos(-1 / el.e);
    from = el.w - tInf;
    to = el.w + tInf;
  }
  for (let m = 0; m <= n; m++) {
    const th = from + ((to - from) * m) / n;
    const den = 1 + el.e * Math.cos(th - el.w);
    if (den <= 1e-6) continue;
    const r = el.p / den;
    if (r > limit) continue;
    out.push(r * Math.cos(th), r * Math.sin(th));
  }
  return Float32Array.from(out);
}

export type DiscEvent =
  | { type: 'merge'; q: number }
  | { type: 'fell'; q: number }
  | { type: 'escape'; q: number };

/**
 * Merge pairs inside the larger Hill radius, drop what has crossed the
 * cavity into the star, forget what has left. Mutates the array.
 */
export function settle(planets: Planet[], h: number): DiscEvent[] {
  void h;
  const events: DiscEvent[] = [];
  for (let a = 0; a < planets.length; a++) {
    for (let b = a + 1; b < planets.length; b++) {
      const A = planets[a];
      const B = planets[b];
      const d = Math.hypot(A.x - B.x, A.y - B.y);
      if (d < Math.max(hillRadius(A), hillRadius(B))) {
        const q = A.q + B.q;
        A.x = (A.x * A.q + B.x * B.q) / q;
        A.y = (A.y * A.q + B.y * B.q) / q;
        A.vx = (A.vx * A.q + B.vx * B.q) / q;
        A.vy = (A.vy * A.q + B.vy * B.q) / q;
        A.age = Math.max(A.age, B.age);
        A.q = q;
        planets.splice(b, 1);
        events.push({ type: 'merge', q });
        b--;
      }
    }
  }
  for (let k = planets.length - 1; k >= 0; k--) {
    const r = Math.hypot(planets[k].x, planets[k].y);
    if (r < R_IN) {
      events.push({ type: 'fell', q: planets[k].q });
      planets.splice(k, 1);
    } else if (r > R_ESCAPE) {
      events.push({ type: 'escape', q: planets[k].q });
      planets.splice(k, 1);
    }
  }
  return events;
}

// ---- what the disc hands back: the CPU twins of the reduce pass

/** Acceleration of a planet from the gas, softened as the gas is. */
export function discForce(D: Disc, pl: Planet, h: number): [number, number] {
  const e = softening(pl, h);
  const e2 = e * e;
  let ax = 0;
  let ay = 0;
  for (let i = 0; i < D.nr; i++) {
    const A = D.area[i];
    const ri = D.r[i];
    for (let j = 0; j < D.nphi; j++) {
      const phi = (j + 0.5) * D.dphi;
      const dx = ri * Math.cos(phi) - pl.x;
      const dy = ri * Math.sin(phi) - pl.y;
      const d2 = dx * dx + dy * dy + e2;
      const inv = (D.sig[i * D.nphi + j] * A) / (d2 * Math.sqrt(d2));
      ax += dx * inv;
      ay += dy * inv;
    }
  }
  return [ax, ay];
}

/** The eat channel, summed within the sink plus two cells of slop. */
export function eatenBy(D: Disc, pl: Planet, p: DiscParams): number {
  let m = 0;
  for (let i = 0; i < D.nr; i++) {
    const ri = D.r[i];
    const rs =
      Math.max(0.5 * hillRadius(pl), p.sinkFloorCells * ri * D.dphi) +
      2 * ri * D.dphi;
    for (let j = 0; j < D.nphi; j++) {
      const phi = (j + 0.5) * D.dphi;
      const dx = ri * Math.cos(phi) - pl.x;
      const dy = ri * Math.sin(phi) - pl.y;
      if (dx * dx + dy * dy < rs * rs) m += D.eat[i * D.nphi + j] * D.area[i];
    }
  }
  return m;
}

/** Mass per unit time through the cavity edge; negative is inward. */
export function innerFlux(D: Disc): number {
  let f = 0;
  for (let j = 0; j < D.nphi; j++)
    f += D.sig[j] * Math.min(D.vr[j], 0) * D.rf[0] * D.dphi;
  return f;
}

/** Component of an acceleration along the planet's prograde direction. */
export function tangentialForce(pl: Planet, ax: number, ay: number): number {
  const r = Math.hypot(pl.x, pl.y);
  return (-pl.y * ax + pl.x * ay) / r;
}
