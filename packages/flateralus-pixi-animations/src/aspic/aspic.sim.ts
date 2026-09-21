/**
 * A slab of gel, as a small grid of displacements.
 *
 * Pure arithmetic — no DOM, no GL. The sim shader in aspicAnimation.ts is a
 * port of `stepGel` and interpolates the constants below, so what is tested
 * here is what runs on the GPU.
 *
 * The model is linear elasticity (Navier–Cauchy) with a restoring spring and
 * viscous damping, in per-step units:
 *
 *   a = CS2·∇²u + (CP2 − CS2)·∇(∇·u) − W2·u − G·v + NU·∇²v
 *   v += a      u += v
 *
 * Two wave speeds, because a gel has two: compression runs ahead at CP and
 * the visible wobble follows as shear at CS. The spring is what brings the
 * type back to where it was set; without it the slab would come to rest
 * wherever the last poke left it.
 *
 * Displacement is in grid cells. Row 0 is the bottom of the slab and is
 * pinned — it sits on the plate — and the other three edges are free.
 */

/** Steps per second. */
export const SPS = 480;
/**
 * (P-wave cells/step)². 0.57 cells/step is 274 cells/s, which crosses a
 * 96-cell slab in 0.35 s, and sits under the 1/√2 CFL bound of the stencil.
 */
export const CP2 = 0.325;
/** (S-wave cells/step)². 0.4 cells/step: shear trails compression. */
export const CS2 = 0.16;
/**
 * (ω₀/SPS)². The slab's own lowest shear mode is only c/4H ≈ 0.8 Hz at
 * H = 60; the spring adds in quadrature to bring the sway to about 3 Hz.
 */
export const W2 = (18.2 / SPS) ** 2;
/** γ/SPS with γ = 6.5 s⁻¹: amplitude decays as e^(−γt/2), 2 % at 1.2 s. */
export const G = 6.5 / SPS;
/**
 * Kelvin–Voigt viscosity, per step. Damping that grows with the square of
 * the wavenumber: it takes the grid-scale ringing out in a few steps and
 * barely touches the slab-sized sway, which is how a gel behaves and why it
 * jiggles rather than buzzes. Without it a drop leaves the slab striped with
 * two-cell compression modes that G alone takes a second to clear.
 */
export const NU = 0.06;
/** Seconds after the last input by which motion is under a part in 10³. */
export const SLEEP_AFTER = (2 * Math.log(1e3)) / 6.5;

export interface Gel {
  gw: number;
  gh: number;
  ux: Float32Array;
  uy: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  /** Scratch for the step, so reads never see this step's writes. */
  nx: Float32Array;
  ny: Float32Array;
}

export function makeGel(gw: number, gh: number): Gel {
  const n = gw * gh;
  return {
    gw,
    gh,
    ux: new Float32Array(n),
    uy: new Float32Array(n),
    vx: new Float32Array(n),
    vy: new Float32Array(n),
    nx: new Float32Array(n),
    ny: new Float32Array(n),
  };
}

export function stepGel(g: Gel): void {
  const { gw, gh, ux, uy, vx, vy, nx, ny } = g;
  const K = CP2 - CS2;
  for (let j = 1; j < gh; j++) {
    const jm = j - 1;
    const jp = Math.min(gh - 1, j + 1);
    for (let i = 0; i < gw; i++) {
      const im = Math.max(0, i - 1);
      const ip = Math.min(gw - 1, i + 1);
      const c = i + j * gw;
      const l = im + j * gw;
      const r = ip + j * gw;
      const d = i + jm * gw;
      const u = i + jp * gw;

      const uxx_x = ux[l] + ux[r] - 2 * ux[c];
      const uyy_x = ux[d] + ux[u] - 2 * ux[c];
      const uxx_y = uy[l] + uy[r] - 2 * uy[c];
      const uyy_y = uy[d] + uy[u] - 2 * uy[c];
      // Mixed derivative: the four corners, over four.
      const a = ip + jp * gw;
      const b = im + jp * gw;
      const e = ip + jm * gw;
      const f = im + jm * gw;
      const uxy_x = (ux[a] - ux[b] - ux[e] + ux[f]) * 0.25;
      const uxy_y = (uy[a] - uy[b] - uy[e] + uy[f]) * 0.25;

      const lvx = vx[l] + vx[r] + vx[d] + vx[u] - 4 * vx[c];
      const lvy = vy[l] + vy[r] + vy[d] + vy[u] - 4 * vy[c];

      const ax =
        CS2 * (uxx_x + uyy_x) +
        K * (uxx_x + uxy_y) -
        W2 * ux[c] -
        G * vx[c] +
        NU * lvx;
      const ay =
        CS2 * (uxx_y + uyy_y) +
        K * (uxy_x + uyy_y) -
        W2 * uy[c] -
        G * vy[c] +
        NU * lvy;
      nx[c] = vx[c] + ax;
      ny[c] = vy[c] + ay;
    }
  }
  for (let j = 1; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const c = i + j * gw;
      vx[c] = nx[c];
      vy[c] = ny[c];
      ux[c] += vx[c];
      uy[c] += vy[c];
    }
  }
}

/** A finger: velocity added under a gaussian of radius `r` cells. */
export function poke(
  g: Gel,
  ci: number,
  cj: number,
  r: number,
  fx: number,
  fy: number
): void {
  const { gw, gh } = g;
  const R = Math.ceil(r * 3);
  for (
    let j = Math.max(1, Math.floor(cj - R));
    j <= Math.min(gh - 1, cj + R);
    j++
  ) {
    for (
      let i = Math.max(0, Math.floor(ci - R));
      i <= Math.min(gw - 1, ci + R);
      i++
    ) {
      const w = Math.exp(-((i - ci) ** 2 + (j - cj) ** 2) / (r * r));
      g.vx[i + j * gw] += fx * w;
      g.vy[i + j * gw] += fy * w;
    }
  }
}

/**
 * The arrival: the slab lands. Everything above the base is moving down, the
 * top fastest, with a little lean so it does not land dead square.
 */
export function drop(g: Gel, v: number, lean = 0.6): void {
  const { gw, gh } = g;
  for (let j = 1; j < gh; j++) {
    // Smoothstep in height: no kink at the pinned base or the free top, so
    // the landing excites the sway and not every plane mode above it.
    const t = j / (gh - 1);
    const h = t * t * (3 - 2 * t);
    for (let i = 0; i < gw; i++) {
      g.vy[i + j * gw] -= v * h;
      g.vx[i + j * gw] += v * lean * h;
    }
  }
}

/** Kinetic, spring and elastic energy, summed over the slab. */
export function gelEnergy(g: Gel): number {
  const { gw, gh, ux, uy, vx, vy } = g;
  let e = 0;
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const c = i + j * gw;
      e += 0.5 * (vx[c] * vx[c] + vy[c] * vy[c]);
      e += 0.5 * W2 * (ux[c] * ux[c] + uy[c] * uy[c]);
      if (i + 1 < gw && j + 1 < gh) {
        const r = c + 1;
        const u = c + gw;
        const dxx = ux[r] - ux[c];
        const dxy = ux[u] - ux[c];
        const dyx = uy[r] - uy[c];
        const dyy = uy[u] - uy[c];
        e += 0.5 * CS2 * (dxx * dxx + dxy * dxy + dyx * dyx + dyy * dyy);
        const div = dxx + dyy;
        e += 0.5 * (CP2 - CS2) * div * div;
      }
    }
  }
  return e;
}
