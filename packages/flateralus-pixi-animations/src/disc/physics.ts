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
  if (i === 0) return (get(1) - get(0)) / (r[1] - r[0]);
  if (i === nr - 1) return (get(i) - get(i - 1)) / (r[i] - r[i - 1]);
  return (get(i + 1) - get(i - 1)) / (r[i + 1] - r[i - 1]);
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

/** Relative m = 2 Fourier amplitude of Σ around ring i: the wake's signature. */
export function wakeM2(D: Disc, i: number): number {
  let c = 0;
  let s = 0;
  let m = 0;
  for (let j = 0; j < D.nphi; j++) {
    const phi = (j + 0.5) * D.dphi;
    const v = D.sig[i * D.nphi + j];
    c += v * Math.cos(2 * phi);
    s += v * Math.sin(2 * phi);
    m += v;
  }
  return Math.hypot(c, s) / Math.max(m, 1e-30);
}

/** Mean wake amplitude two scale heights inside and outside r_p. */
export function wakeAmplitude(D: Disc, rp: number, h: number): number {
  const H = h * rp;
  return (
    0.5 *
    (wakeM2(D, ringIndex(D, rp - 2 * H)) + wakeM2(D, ringIndex(D, rp + 2 * H)))
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
      let dPdr: number;
      if (i === 0) dPdr = (Pp - P0) / (r[1] - r[0]);
      else if (i === nr - 1) dPdr = (P0 - Pm) / (r[i] - r[i - 1]);
      else dPdr = (Pp - Pm) / (r[i + 1] - r[i - 1]);
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
