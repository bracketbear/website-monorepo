/**
 * Frost growing into a letter, as a cellular model of vapour and ice.
 *
 * Pure arithmetic — no DOM, no GL. The sim shader in frostLineAnimation.ts
 * is a port of `stepFrost` and interpolates the constants below.
 *
 * After Reiter's snow-crystal automaton. The letter is a cold pane holding
 * water vapour. A cell beside ice is *receptive*: it keeps whatever water
 * reaches it and freezes once it holds THETA. Every other cell is vapour and
 * diffuses. A tip that reaches further into the vapour collects faster, grows
 * faster, and leaves its neighbours in a depleted shadow — the Mullins–Sekerka
 * instability, which is where the feathers come from. Nothing draws a branch.
 *
 * The lattice is hexagonal, stored as offset rows, so the six-fold habit of
 * ice is in the neighbourhood rather than in a term.
 *
 * Diffusion is written as pairwise flux, not as an average, so that water is
 * conserved exactly: what one cell loses its neighbour gains.
 */

/**
 * Steps per second. The feathers take 120–240 steps to reach depletion
 * whatever else is tuned, so this is what sets how long they can be watched:
 * a second or two here, which is the arrival.
 */
export const SPS = 120;
/** Diffusion weight: a pair of vapour cells exchanges ALPHA/12 of their difference. */
export const ALPHA = 1;
/** Vapour in the letter to begin with, as a fraction of what a cell needs to freeze. */
export const RHO = 0.5;
/** Water a cell must hold to freeze. */
export const THETA = 1;
/**
 * Humidity reaching each receptive cell per step: the sinter. Feathers alone
 * stop at depletion with about RHO of the letter frozen, which is a feather
 * and not a heading. This slow feed thickens what grew until the letter reads
 * solid, a layer every 1/GAMMA steps. Measured on a 28-cell stroke: 0.64 of
 * the letter frozen at 2.5 s, 0.95 at 6 s.
 */
export const GAMMA = 0.004;
/** About one nucleation site per this many cells of the letter's edge. */
export const SEED_EVERY = 12;
/** Warmth left by a fingertip decays by this per step; ice cannot form above 0.1. */
export const WARM_DECAY = 0.985;

export interface Frost {
  gw: number;
  gh: number;
  /** The letter: cold where ≥ 0.5. */
  cold: Float32Array;
  ice: Uint8Array;
  /** Water in the cell, whatever its phase. */
  water: Float32Array;
  /** Steps since the cell froze. */
  age: Float32Array;
  warm: Float32Array;
  /** Everything the sinter has added, so conservation can be audited. */
  fed: number;
  gamma: number;
  /** Scratch. */
  next: Float32Array;
  rec: Uint8Array;
}

/** A stable per-cell hash in 0..1. */
function hash(k: number, seed: number): number {
  let h = (k * 374761393 + seed * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** The six neighbours of (i, j) on the offset-row hex lattice, -1 where off-grid. */
export function hexNeighbours(
  i: number,
  j: number,
  gw: number,
  gh: number,
  out: Int32Array
): void {
  const s = j & 1 ? 1 : -1;
  const put = (n: number, x: number, y: number) => {
    out[n] = x < 0 || y < 0 || x >= gw || y >= gh ? -1 : x + y * gw;
  };
  put(0, i - 1, j);
  put(1, i + 1, j);
  put(2, i, j - 1);
  put(3, i, j + 1);
  put(4, i + s, j - 1);
  put(5, i + s, j + 1);
}

export function makeFrost(
  cold: Float32Array,
  gw: number,
  gh: number,
  opts: { seedEvery?: number; gamma?: number; seed?: number } = {}
): Frost {
  const n = gw * gh;
  const seedEvery = opts.seedEvery ?? SEED_EVERY;
  const seed = opts.seed ?? 1;
  const f: Frost = {
    gw,
    gh,
    cold,
    ice: new Uint8Array(n),
    water: new Float32Array(n),
    age: new Float32Array(n),
    warm: new Float32Array(n),
    fed: 0,
    gamma: opts.gamma ?? GAMMA,
    next: new Float32Array(n),
    rec: new Uint8Array(n),
  };
  const nb = new Int32Array(6);
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const k = i + j * gw;
      if (cold[k] < 0.5) continue;
      // A little unevenness in the vapour, or every tip is identical.
      f.water[k] = RHO * (0.9 + 0.2 * hash(k, seed));
      hexNeighbours(i, j, gw, gh, nb);
      let onEdge = false;
      for (let q = 0; q < 6; q++)
        if (nb[q] < 0 || cold[nb[q]] < 0.5) onEdge = true;
      // Frost starts at the edge of the letter, at scattered sites. A flat
      // front is unstable too, so seeding every edge cell still fingers —
      // but into a short even fur, every strand starving the next before
      // any of them gets anywhere. Scattered sites have room to become
      // feathers that run to the middle of the stroke.
      if (onEdge && hash(k, seed + 7) < 1 / seedEvery) {
        f.ice[k] = 1;
        f.water[k] = THETA;
      }
    }
  }
  return f;
}

export function stepFrost(f: Frost): void {
  const { gw, gh, cold, ice, water, age, warm, next, rec } = f;
  const a = ALPHA / 12;
  const nb = new Int32Array(6);

  // Who is receptive this step.
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const k = i + j * gw;
      rec[k] = 0;
      if (cold[k] < 0.5 || ice[k] || warm[k] > 0.1) continue;
      hexNeighbours(i, j, gw, gh, nb);
      for (let q = 0; q < 6; q++) {
        if (nb[q] >= 0 && ice[nb[q]]) {
          rec[k] = 1;
          break;
        }
      }
    }
  }

  // Move the vapour.
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const k = i + j * gw;
      next[k] = water[k];
      if (cold[k] < 0.5 || ice[k]) continue;
      hexNeighbours(i, j, gw, gh, nb);
      let w = water[k];
      for (let q = 0; q < 6; q++) {
        const m = nb[q];
        // Ice and the warm room outside the letter are walls.
        if (m < 0 || cold[m] < 0.5 || ice[m]) continue;
        if (rec[k]) {
          // Keeps what it has; takes a share from vapour beside it.
          if (!rec[m]) w += a * water[m];
        } else if (rec[m]) {
          w -= a * water[k];
        } else {
          w += a * (water[m] - water[k]);
        }
      }
      if (rec[k]) {
        w += f.gamma;
        f.fed += f.gamma;
      }
      next[k] = w;
    }
  }

  for (let k = 0; k < gw * gh; k++) {
    water[k] = next[k];
    if (ice[k]) age[k] += 1;
    else if (rec[k] && water[k] >= THETA) {
      ice[k] = 1;
      age[k] = 0;
    }
    warm[k] *= WARM_DECAY;
  }
}

/** A warm fingertip. The ice goes back to vapour where it lies. */
export function melt(f: Frost, ci: number, cj: number, r: number): void {
  const { gw, gh } = f;
  for (
    let j = Math.max(0, Math.floor(cj - r));
    j <= Math.min(gh - 1, cj + r);
    j++
  ) {
    for (
      let i = Math.max(0, Math.floor(ci - r));
      i <= Math.min(gw - 1, ci + r);
      i++
    ) {
      if ((i - ci) ** 2 + (j - cj) ** 2 > r * r) continue;
      const k = i + j * gw;
      if (f.cold[k] < 0.5) continue;
      f.ice[k] = 0;
      f.age[k] = 0;
      f.warm[k] = 1;
    }
  }
}

/** Frozen cells over cold cells. */
export function fillFraction(f: Frost): number {
  let ice = 0;
  let cold = 0;
  for (let k = 0; k < f.cold.length; k++) {
    if (f.cold[k] >= 0.5) {
      cold++;
      if (f.ice[k]) ice++;
    }
  }
  return cold ? ice / cold : 0;
}

export function totalWater(f: Frost): number {
  let w = 0;
  for (let k = 0; k < f.water.length; k++) w += f.water[k];
  return w;
}

/** Depth of every cold cell from the letter's edge, in hex steps; -1 outside. */
export function depthMap(f: Frost): Int32Array {
  const { gw, gh, cold } = f;
  const depth = new Int32Array(gw * gh).fill(-1);
  const nb = new Int32Array(6);
  let frontier: number[] = [];
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const k = i + j * gw;
      if (cold[k] < 0.5) continue;
      hexNeighbours(i, j, gw, gh, nb);
      for (let q = 0; q < 6; q++) {
        if (nb[q] < 0 || cold[nb[q]] < 0.5) {
          depth[k] = 0;
          frontier.push(k);
          break;
        }
      }
    }
  }
  while (frontier.length) {
    const next: number[] = [];
    for (const k of frontier) {
      hexNeighbours(k % gw, Math.floor(k / gw), gw, gh, nb);
      for (let q = 0; q < 6; q++) {
        const m = nb[q];
        if (m >= 0 && cold[m] >= 0.5 && depth[m] < 0) {
          depth[m] = depth[k] + 1;
          next.push(m);
        }
      }
    }
    frontier = next;
  }
  return depth;
}

/**
 * The share of the ice lying at least `d` cells inside the letter. Feathers
 * carry ice inward; fur piles it up at the edge and leaves the middle bare.
 */
export function deepShare(f: Frost, d: number): number {
  const depth = depthMap(f);
  let deep = 0;
  let all = 0;
  for (let k = 0; k < depth.length; k++) {
    if (!f.ice[k]) continue;
    all++;
    if (depth[k] >= d) deep++;
  }
  return all ? deep / all : 0;
}
