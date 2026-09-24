/**
 * Dust grains, on the CPU. The twin of `GRAIN_STEP_FS` in shaders.ts:
 * the same bilinear sample of the gas, the same terminal-velocity drift,
 * the same integration in (ln r, φ). Grains ride the gas and drift toward
 * pressure maxima; they do not act on the gas.
 */
import { R_IN, R_OUT, cs2, type Disc, type DiscParams } from './physics';

export const N_GRAINS = 65536;
export const GRAIN_W = 256;
/** Stokes numbers, log-uniform. 0.2 clears a lane edge in tens of seconds; 0.02 lingers for minutes. */
export const ST_MIN = 0.02;
export const ST_MAX = 0.2;
/** Grains are seeded uniform in r on this range: Σ ∝ 1/r makes that uniform in mass. */
const SEED_R_MIN = 0.3;
const SEED_R_MAX = 1.9;
const TAU = 2 * Math.PI;

/** A small seeded PRNG so Collapse A, B and C draw different dust. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedGrains(n: number, rng: () => number): Float32Array {
  const g = new Float32Array(n * 4);
  const lnMin = Math.log(ST_MIN);
  const lnMax = Math.log(ST_MAX);
  for (let k = 0; k < n; k++) {
    const r = SEED_R_MIN + (SEED_R_MAX - SEED_R_MIN) * rng();
    g[k * 4] = Math.log(r);
    g[k * 4 + 1] = TAU * rng();
    g[k * 4 + 2] = Math.exp(lnMin + (lnMax - lnMin) * rng());
    g[k * 4 + 3] = 1;
  }
  return g;
}

/**
 * Bilinear in (i, j) with i clamped and j wrapped — the display shader's
 * sampleDisc, and the shader's gas(). φ may be outside [0, 2π).
 */
export function sampleGas(
  D: Disc,
  lnr: number,
  phi: number
): [number, number, number] {
  const { nr, nphi, dlnr, dphi, sig, vr, vp } = D;
  const fi = (lnr - Math.log(R_IN)) / dlnr - 0.5;
  const fj = phi / dphi - 0.5;
  const i0 = Math.floor(fi);
  const j0 = Math.floor(fj);
  const ti = fi - i0;
  const tj = fj - j0;
  const ia = Math.max(0, Math.min(nr - 1, i0));
  const ib = Math.max(0, Math.min(nr - 1, i0 + 1));
  const ja = ((j0 % nphi) + nphi) % nphi;
  const jb = (ja + 1) % nphi;
  const k00 = ia * nphi + ja;
  const k01 = ia * nphi + jb;
  const k10 = ib * nphi + ja;
  const k11 = ib * nphi + jb;
  const lerp = (a: Float32Array) => {
    const top = a[k00] + (a[k01] - a[k00]) * tj;
    const bot = a[k10] + (a[k11] - a[k10]) * tj;
    return top + (bot - top) * ti;
  };
  return [lerp(sig), lerp(vr), lerp(vp)];
}

/**
 * One grain, one step. Terminal-velocity drift: Δv = t_s ∇P / Σ with
 * t_s = St / Ω_K, clamped to the sound speed; then (ln r, φ) advance by
 * (v_gas + Δv) / r · dt, which makes a circular orbit exact at any step.
 */
function stepGrain(D: Disc, p: DiscParams, g: Float32Array, o: number): void {
  if (g[o + 3] === 0) return;
  const { dlnr, dphi, floor } = D;
  const h = p.h;
  const dt = p.dt;
  const lnr = g[o];
  const phi = g[o + 1];
  const st = g[o + 2];
  const r = Math.exp(lnr);
  const om = Math.pow(r, -1.5);
  const [s0, vr, vp] = sampleGas(D, lnr, phi);
  const sig = Math.max(s0, floor);
  const rp = Math.exp(lnr + dlnr);
  const rm = Math.exp(lnr - dlnr);
  const sp = Math.max(sampleGas(D, lnr + dlnr, phi)[0], floor);
  const sm = Math.max(sampleGas(D, lnr - dlnr, phi)[0], floor);
  const dPdr = (cs2(rp, h) * sp - cs2(rm, h) * sm) / (rp - rm);
  const jp = sampleGas(D, lnr, phi + dphi)[0];
  const jm = sampleGas(D, lnr, phi - dphi)[0];
  const dPdphi = (cs2(r, h) * (jp - jm)) / (2 * dphi);
  const ts = st / om;
  let dvr = (ts * dPdr) / sig;
  let dvp = (ts * dPdphi) / (sig * r);
  const cs = h / Math.sqrt(r);
  const m = Math.hypot(dvr, dvp);
  if (m > cs) {
    dvr *= cs / m;
    dvp *= cs / m;
  }
  const lnr1 = lnr + ((vr + dvr) / r) * dt;
  let phi1 = phi + ((vp + dvp) / r) * dt;
  phi1 -= TAU * Math.floor(phi1 / TAU);
  g[o] = lnr1;
  g[o + 1] = phi1;
  g[o + 3] = lnr1 < Math.log(R_IN) || lnr1 > Math.log(R_OUT) ? 0 : 1;
}

export function stepGrains(D: Disc, p: DiscParams, g: Float32Array): void {
  for (let o = 0; o < g.length; o += 4) stepGrain(D, p, g, o);
}

/**
 * The analytic radial drift at r for a grain of Stokes number st, from the
 * discrete ring profile: St · (∂P/∂r) / (Σ Ω). Negative in a disc whose
 * pressure falls outward.
 */
export function driftRate(
  D: Disc,
  p: DiscParams,
  r: number,
  st: number
): number {
  const lnr = Math.log(r);
  const rp = Math.exp(lnr + D.dlnr);
  const rm = Math.exp(lnr - D.dlnr);
  const sig = Math.max(sampleGas(D, lnr, 0)[0], D.floor);
  const sp = Math.max(sampleGas(D, lnr + D.dlnr, 0)[0], D.floor);
  const sm = Math.max(sampleGas(D, lnr - D.dlnr, 0)[0], D.floor);
  const dPdr = (cs2(rp, p.h) * sp - cs2(rm, p.h) * sm) / (rp - rm);
  const om = Math.pow(r, -1.5);
  return (st * dPdr) / (sig * om);
}
