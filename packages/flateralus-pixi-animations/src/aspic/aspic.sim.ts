/**
 * Letters set in gel, as a small grid of displacements.
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
 * type back to where it was set; without it a letter would come to rest
 * wherever the last poke left it.
 *
 * The gel is the type. Each letterform, grown by a small margin, is its own
 * elastic body — the `hull` — and its edge is free: a neighbour outside the
 * hull is taken to be the cell itself, which is zero traction to first
 * order. Two letters that do not touch cannot feel each other. A body is
 * held to the plate along its `pinned` cells, the foot of the letter, and
 * sways from there.
 *
 * Displacement is in grid cells. Row 0 is the bottom of the grid.
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
  /** 1 where there is gel. */
  hull: Uint8Array;
  /** 1 where the gel is held to the plate. */
  pinned: Uint8Array;
  /** Scratch for the step, so reads never see this step's writes. */
  nx: Float32Array;
  ny: Float32Array;
}

/**
 * A gel on a grid. With no hull the whole grid is one slab pinned along its
 * bottom row, which is what the wave and settle tests measure on.
 */
export function makeGel(
  gw: number,
  gh: number,
  body?: { hull: Uint8Array; pinned: Uint8Array }
): Gel {
  const n = gw * gh;
  let hull = body?.hull;
  let pinned = body?.pinned;
  if (!hull || !pinned) {
    hull = new Uint8Array(n).fill(1);
    pinned = new Uint8Array(n);
    for (let i = 0; i < gw; i++) pinned[i] = 1;
  }
  return {
    gw,
    gh,
    ux: new Float32Array(n),
    uy: new Float32Array(n),
    vx: new Float32Array(n),
    vy: new Float32Array(n),
    hull,
    pinned,
    nx: new Float32Array(n),
    ny: new Float32Array(n),
  };
}

/**
 * The bodies a phrase makes. Every letter grown by `margin` cells is a hull,
 * so a lean carries the silhouette into cells that hold displacement; and
 * every hull cell within `foot` rows above a baseline (or below it, in the
 * margin) is pinned — the letter stands on its plate along its foot, and a
 * round-bottomed letter stands on the margin's flat skirt like a jelly
 * turned out of a mould.
 */
export function bodiesOf(
  letters: Float32Array,
  gw: number,
  gh: number,
  margin: number,
  baselineRows: number[],
  foot: number
): { hull: Uint8Array; pinned: Uint8Array } {
  const n = gw * gh;
  const hull = new Uint8Array(n);
  const pinned = new Uint8Array(n);
  const R = Math.ceil(margin);
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      if (letters[i + j * gw] < 0.5) continue;
      for (let dj = -R; dj <= R; dj++) {
        for (let di = -R; di <= R; di++) {
          if (di * di + dj * dj > margin * margin) continue;
          const x = i + di;
          const y = j + dj;
          if (x >= 0 && y >= 0 && x < gw && y < gh) hull[x + y * gw] = 1;
        }
      }
    }
  }
  for (const b of baselineRows) {
    const lo = Math.max(0, Math.floor(b - margin));
    const hi = Math.min(gh - 1, Math.ceil(b + foot));
    for (let j = lo; j <= hi; j++) {
      for (let i = 0; i < gw; i++) {
        if (hull[i + j * gw]) pinned[i + j * gw] = 1;
      }
    }
  }
  return { hull, pinned };
}

export function stepGel(g: Gel): void {
  const { gw, gh, ux, uy, vx, vy, nx, ny, hull, pinned } = g;
  const K = CP2 - CS2;
  // A neighbour outside the gel reads as the cell itself: a free edge.
  const at = (c: number, x: number, y: number) => {
    if (x < 0 || y < 0 || x >= gw || y >= gh) return c;
    const k = x + y * gw;
    return hull[k] ? k : c;
  };
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const c = i + j * gw;
      if (!hull[c] || pinned[c]) continue;
      const l = at(c, i - 1, j);
      const r = at(c, i + 1, j);
      const d = at(c, i, j - 1);
      const u = at(c, i, j + 1);
      const a = at(c, i + 1, j + 1);
      const b = at(c, i - 1, j + 1);
      const e = at(c, i + 1, j - 1);
      const f = at(c, i - 1, j - 1);

      const uxx_x = ux[l] + ux[r] - 2 * ux[c];
      const uyy_x = ux[d] + ux[u] - 2 * ux[c];
      const uxx_y = uy[l] + uy[r] - 2 * uy[c];
      const uyy_y = uy[d] + uy[u] - 2 * uy[c];
      // Mixed derivative: the four corners, over four.
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
  for (let c = 0; c < gw * gh; c++) {
    if (!hull[c] || pinned[c]) continue;
    vx[c] = nx[c];
    vy[c] = ny[c];
    ux[c] += vx[c];
    uy[c] += vy[c];
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
 * The arrival: the gel lands. Every free cell is moving down, faster the
 * higher it stands above its plate, with a little lean so nothing lands
 * dead square. `height` is how far above its foot a cell is, 0..1, so a
 * letter on the second line drops onto its own plate and not the floor.
 */
export function drop(
  g: Gel,
  v: number,
  height: (k: number) => number,
  lean = 0.6
): void {
  for (let k = 0; k < g.gw * g.gh; k++) {
    if (!g.hull[k] || g.pinned[k]) continue;
    // Smoothstep in height: no kink at the foot or the top.
    const t = Math.min(1, Math.max(0, height(k)));
    const h = t * t * (3 - 2 * t);
    g.vy[k] -= v * h;
    g.vx[k] += v * lean * h;
  }
}

/** Kinetic, spring and elastic energy, summed over the slab. */
export function gelEnergy(g: Gel): number {
  const { gw, gh, ux, uy, vx, vy, hull } = g;
  let e = 0;
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const c = i + j * gw;
      if (!hull[c]) continue;
      e += 0.5 * (vx[c] * vx[c] + vy[c] * vy[c]);
      e += 0.5 * W2 * (ux[c] * ux[c] + uy[c] * uy[c]);
      const r = i + 1 < gw && hull[c + 1] ? c + 1 : c;
      const u = j + 1 < gh && hull[c + gw] ? c + gw : c;
      const dxx = ux[r] - ux[c];
      const dxy = ux[u] - ux[c];
      const dyx = uy[r] - uy[c];
      const dyy = uy[u] - uy[c];
      e += 0.5 * CS2 * (dxx * dxx + dxy * dxy + dyx * dyx + dyy * dyy);
      const div = dxx + dyy;
      e += 0.5 * (CP2 - CS2) * div * div;
    }
  }
  return e;
}

/**
 * Distance from each letter cell to the nearest air cell, in cells, capped
 * at `cap`: a chamfer pass down and up the grid. This is the letter's
 * cross-section — how far under the surface a point of the stroke is — and
 * the display raises the gel's dome on it.
 */
export function insideDistance(
  letters: Float32Array,
  gw: number,
  gh: number,
  cap: number
): Float32Array {
  const d = new Float32Array(gw * gh);
  for (let k = 0; k < gw * gh; k++) d[k] = letters[k] >= 0.5 ? cap : 0;
  const relax = (k: number, n: number, w: number) => {
    if (n >= 0 && n < gw * gh && d[n] + w < d[k]) d[k] = d[n] + w;
  };
  const D = Math.SQRT2;
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const k = i + j * gw;
      if (!d[k]) continue;
      if (i > 0) relax(k, k - 1, 1);
      if (j > 0) relax(k, k - gw, 1);
      if (i > 0 && j > 0) relax(k, k - gw - 1, D);
      if (i < gw - 1 && j > 0) relax(k, k - gw + 1, D);
      if (i === 0 || j === 0) d[k] = Math.min(d[k], 1);
    }
  }
  for (let j = gh - 1; j >= 0; j--) {
    for (let i = gw - 1; i >= 0; i--) {
      const k = i + j * gw;
      if (!d[k]) continue;
      if (i < gw - 1) relax(k, k + 1, 1);
      if (j < gh - 1) relax(k, k + gw, 1);
      if (i < gw - 1 && j < gh - 1) relax(k, k + gw + 1, D);
      if (i > 0 && j < gh - 1) relax(k, k + gw - 1, D);
      if (i === gw - 1 || j === gh - 1) d[k] = Math.min(d[k], 1);
    }
  }
  return d;
}
