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
 *   a = CS2·∇²u + (CP2 − CS2)·∇(∇·u) − W2·(u − p) − G·(v − ṗ) + NU·∇²v
 *   v += a      u += v
 *
 * Two wave speeds, because a gel has two: compression runs ahead at CP and
 * the visible wobble follows as shear at CS.
 *
 * The gel is the type. Each letterform, grown by a small margin, is its own
 * elastic body — the `hull` — and its edge is free: a neighbour outside the
 * hull is taken to be the cell itself, which is zero traction to first
 * order. Two letters that do not touch cannot feel each other through the
 * gel. A body is held to the plate along its `pinned` cells, the foot of
 * the letter, and sways from there.
 *
 * The plate is a body too. `p` above is the plate's rigid pose at the cell:
 * the spring is the jelly's contact with the plate under its whole face (a
 * 2D slice of a 3D jelly stands on the plate along all of its silhouette,
 * not only its foot), so it pulls the type back to where it was set *on the
 * plate*, and by the same token it pulls the plate. Each plate slides, dips
 * and tilts on a soft mat, driven by the traction at the feet and the
 * reaction of that spring. Letters on one plate feel each other through it
 * — later and smaller than a poke carries through gel, and never across
 * air.
 *
 * The field is kept *relative to the cell's own plate*: `u` here is the
 * elastic displacement over the plate's pose, the pinned cells are zero,
 * and the plate's acceleration enters the free cells as the fictitious
 * force of a moving frame. A rigid pose is a linear field, so the stencil
 * cannot tell the difference — but the display samples the field between
 * cells, and where two plates' cells meet, a field that held each plate's
 * absolute motion would blend two poses into a displacement neither body
 * has. The absolute displacement is `u + pose`.
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

/**
 * Plate mass, per cell of gel standing on it. Heavier and the plate is a
 * table: nothing a letter does reaches its neighbours. Lighter and the
 * plate is paper: it is slaved to the jelly, and the sway speeds up, since
 * the spring's far end now moves too (a two-body oscillator at
 * ω²·(1 + 1/ρ)). At 5 the sway keeps within 10 % of its pinned-plate pitch
 * and a landing still visibly rocks the line.
 */
export const PLATE_RHO = 5;
/** The mat under the plate: (2π·Hz/SPS)² for slide, dip and tilt. */
export const PLATE_WX2 = ((2 * Math.PI * 1.0) / SPS) ** 2;
export const PLATE_WY2 = ((2 * Math.PI * 2.0) / SPS) ** 2;
export const PLATE_WT2 = ((2 * Math.PI * 2.5) / SPS) ** 2;
/** γ/SPS for the plate: a slower ring-down than the gel, so the line is the last thing moving. */
export const PLATE_G = 5 / SPS;
/** Seconds after the last input by which motion is under a part in 10³. */
export const SLEEP_AFTER = (2 * Math.log(1e3)) / 5;

/** No plate under this cell. */
export const NO_PLATE = 255;

export interface Plate {
  /** Pivot: the centre column of the line's ink and its baseline row, cells. */
  cx: number;
  base: number;
  /** Cells of gel on it, times PLATE_RHO; and the rod inertia that gives. */
  mass: number;
  inertia: number;
  /** Pose: slide, dip (up positive), tilt (radians, anticlockwise). */
  x: number;
  y: number;
  th: number;
  vx: number;
  vy: number;
  om: number;
}

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
  /** Which plate each hull cell stands on; NO_PLATE for a plate that cannot move. */
  plateOf: Uint8Array;
  plates: Plate[];
  /** Scratch for the step, so reads never see this step's writes. */
  nx: Float32Array;
  ny: Float32Array;
}

export interface Bodies {
  hull: Uint8Array;
  pinned: Uint8Array;
  plateOf: Uint8Array;
  plates: Plate[];
}

/**
 * A gel on a grid. With no bodies the whole grid is one slab pinned along
 * its bottom row to a plate that cannot move, which is what the wave and
 * settle tests measure on.
 */
export function makeGel(gw: number, gh: number, body?: Bodies): Gel {
  const n = gw * gh;
  let hull = body?.hull;
  let pinned = body?.pinned;
  let plateOf = body?.plateOf;
  if (!hull || !pinned || !plateOf) {
    hull = new Uint8Array(n).fill(1);
    pinned = new Uint8Array(n);
    for (let i = 0; i < gw; i++) pinned[i] = 1;
    plateOf = new Uint8Array(n).fill(NO_PLATE);
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
    plateOf,
    plates: body?.plates ?? [],
    nx: new Float32Array(n),
    ny: new Float32Array(n),
  };
}

/** The plate's rigid displacement at a cell: what `u` is measured over. */
export function poseAt(pl: Plate, i: number, j: number): [number, number] {
  return [pl.x - pl.th * (j - pl.base), pl.y + pl.th * (i - pl.cx)];
}

/** ...and its rate. */
export function poseRateAt(pl: Plate, i: number, j: number): [number, number] {
  return [pl.vx - pl.om * (j - pl.base), pl.vy + pl.om * (i - pl.cx)];
}

/**
 * The bodies a phrase makes. Every letter grown by `margin` cells is a hull,
 * so a lean carries the silhouette into cells that hold displacement; and
 * every hull cell within `foot` rows above a baseline (or below it, in the
 * margin) is pinned — the letter stands on its plate along its foot, and a
 * round-bottomed letter stands on the margin's flat skirt like a jelly
 * turned out of a mould.
 *
 * Each baseline is a plate. Ink belongs to the nearest baseline at or below
 * it, and a margin cell to the plate of the nearest ink — lines are set
 * tighter than the margin, so the rule "whatever is under this baseline"
 * would hand the top of the second line to the first. Two cells on
 * different plates are different bodies whatever the hulls do: the stencil
 * reads a neighbour on another plate as a free edge. The plate's mass and
 * pivot come from the cells it carries.
 */
export function bodiesOf(
  letters: Float32Array,
  gw: number,
  gh: number,
  margin: number,
  baselineRows: number[],
  foot: number,
  capRows = 0
): Bodies {
  const n = gw * gh;
  const hull = new Uint8Array(n);
  const pinned = new Uint8Array(n);
  const plateOf = new Uint8Array(n).fill(NO_PLATE);
  const near = new Float32Array(n).fill(Infinity);
  const R = Math.ceil(margin);
  // Which line an ink cell is on. A row that only one line's cap band
  // covers is that line's. Lines can be set touching, and a row on a
  // baseline then holds the foot of one line and the top of the next: ink
  // there goes with the ink it touches, so a round letter's overshoot
  // under its own baseline stays with its letter. Ink no band covers goes
  // to the nearest baseline at or below it.
  const inkPlate = new Int16Array(n).fill(-1);
  const candidates = (j: number) =>
    baselineRows
      .map((r, k) => (r - 0.5 <= j && j <= r + capRows + 0.5 ? k : -1))
      .filter((k) => k >= 0);
  const nearestBelow = (j: number) => {
    let p = -1;
    let best = -Infinity;
    baselineRows.forEach((r, k) => {
      if (r <= j + 0.5 && r > best) {
        best = r;
        p = k;
      }
    });
    return p < 0 ? baselineRows.length - 1 : p;
  };
  const queue: number[] = [];
  for (let j = 0; j < gh; j++) {
    const c = candidates(j);
    for (let i = 0; i < gw; i++) {
      const k = i + j * gw;
      if (letters[k] < 0.5) continue;
      if (c.length === 1) inkPlate[k] = c[0];
      else if (c.length === 0) inkPlate[k] = nearestBelow(j);
      if (inkPlate[k] >= 0) queue.push(k);
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const k = queue[q];
    const i = k % gw;
    for (const nb of [k - 1, k + 1, k - gw, k + gw]) {
      if (nb < 0 || nb >= n) continue;
      if ((nb === k - 1 && i === 0) || (nb === k + 1 && i === gw - 1)) continue;
      if (letters[nb] < 0.5 || inkPlate[nb] >= 0) continue;
      inkPlate[nb] = inkPlate[k];
      queue.push(nb);
    }
  }
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const k = i + j * gw;
      if (letters[k] >= 0.5 && inkPlate[k] < 0) {
        inkPlate[k] = Math.max(...candidates(j));
      }
    }
  }
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      if (letters[i + j * gw] < 0.5) continue;
      const p = inkPlate[i + j * gw];
      for (let dj = -R; dj <= R; dj++) {
        for (let di = -R; di <= R; di++) {
          const d2 = di * di + dj * dj;
          if (d2 > margin * margin) continue;
          const x = i + di;
          const y = j + dj;
          if (x < 0 || y < 0 || x >= gw || y >= gh) continue;
          const k = x + y * gw;
          hull[k] = 1;
          if (d2 < near[k]) {
            near[k] = d2;
            plateOf[k] = p;
          }
        }
      }
    }
  }
  baselineRows.forEach((b, p) => {
    const lo = Math.max(0, Math.floor(b - margin));
    const hi = Math.min(gh - 1, Math.ceil(b + foot));
    for (let j = lo; j <= hi; j++) {
      for (let i = 0; i < gw; i++) {
        const k = i + j * gw;
        if (hull[k] && plateOf[k] === p) pinned[k] = 1;
      }
    }
  });
  const plates: Plate[] = baselineRows.map((b) => ({
    cx: 0,
    base: b,
    mass: 0,
    inertia: 0,
    x: 0,
    y: 0,
    th: 0,
    vx: 0,
    vy: 0,
    om: 0,
  }));
  const lo = plates.map(() => Infinity);
  const hi = plates.map(() => -Infinity);
  const count = plates.map(() => 0);
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const k = i + j * gw;
      if (!hull[k]) continue;
      const p = plateOf[k];
      count[p]++;
      lo[p] = Math.min(lo[p], i);
      hi[p] = Math.max(hi[p], i);
    }
  }
  plates.forEach((pl, p) => {
    if (!count[p]) return;
    pl.cx = (lo[p] + hi[p]) / 2;
    pl.mass = PLATE_RHO * count[p];
    const half = Math.max(1, (hi[p] - lo[p]) / 2);
    pl.inertia = (pl.mass * half * half) / 3;
  });
  return { hull, pinned, plateOf, plates };
}

/** Which columns of the grid carry ink, per plate. */
export function inkColumns(
  letters: Float32Array,
  gw: number,
  gh: number,
  plateOf: Uint8Array,
  nPlates: number
): Uint8Array[] {
  const ink = Array.from({ length: nPlates }, () => new Uint8Array(gw));
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const k = i + j * gw;
      if (letters[k] >= 0.5 && plateOf[k] < nPlates) ink[plateOf[k]][i] = 1;
    }
  }
  return ink;
}

/**
 * The letters of a phrase as column runs of ink on each plate, left to
 * right, each run widened to the middle of the gap either side of it so
 * every column of the plate lands with some letter. `ink[p][i]` says
 * whether column `i` (of `cols`) carries ink on plate `p`; the runs come
 * back in the same columns, so a caller with a finer count of columns
 * than the grid can split letters the grid would merge. At most `max`
 * runs: past that, the runs with the narrowest gaps between them are
 * joined.
 */
export function lettersOf(
  ink: Uint8Array[],
  cols: number,
  max = Infinity
): { plate: number; x0: number; x1: number }[] {
  const out: { plate: number; x0: number; x1: number }[] = [];
  ink.forEach((col, p) => {
    const runs: [number, number][] = [];
    for (let i = 0; i < cols; i++) {
      if (!col[i]) continue;
      if (runs.length && runs[runs.length - 1][1] === i) {
        runs[runs.length - 1][1] = i + 1;
      } else runs.push([i, i + 1]);
    }
    while (runs.length > max) {
      let at = 1;
      let gap = Infinity;
      for (let r = 1; r < runs.length; r++) {
        const g = runs[r][0] - runs[r - 1][1];
        if (g < gap) {
          gap = g;
          at = r;
        }
      }
      runs[at - 1][1] = runs[at][1];
      runs.splice(at, 1);
    }
    runs.forEach(([a, b], r) => {
      const x0 = r === 0 ? 0 : Math.floor((runs[r - 1][1] + a) / 2);
      const x1 =
        r === runs.length - 1 ? cols : Math.floor((b + runs[r + 1][0]) / 2);
      out.push({ plate: p, x0, x1 });
    });
  });
  return out;
}

export function stepGel(g: Gel): void {
  const { gw, gh, ux, uy, vx, vy, nx, ny, hull, pinned, plateOf, plates } = g;
  const K = CP2 - CS2;
  // A neighbour outside the gel, or on another plate, reads as the cell
  // itself: a free edge.
  const at = (c: number, x: number, y: number) => {
    if (x < 0 || y < 0 || x >= gw || y >= gh) return c;
    const k = x + y * gw;
    return hull[k] && plateOf[k] === plateOf[c] ? k : c;
  };
  // Net force and torque on each plate, gathered as we go.
  const fx = plates.map(() => 0);
  const fy = plates.map(() => 0);
  const tq = plates.map(() => 0);
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const c = i + j * gw;
      if (!hull[c]) continue;
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

      // What the neighbours do to this cell.
      const ex = CS2 * (uxx_x + uyy_x) + K * (uxx_x + uxy_y) + NU * lvx;
      const ey = CS2 * (uxx_y + uyy_y) + K * (uxy_x + uyy_y) + NU * lvy;

      const p = plateOf[c];
      const pl = p === NO_PLATE ? null : plates[p];
      if (pinned[c]) {
        // The foot passes the traction on to the plate.
        if (pl) {
          fx[p] += ex;
          fy[p] += ey;
          tq[p] += (i - pl.cx) * ey - (j - pl.base) * ex;
        }
        continue;
      }
      const sx = W2 * ux[c] + G * vx[c];
      const sy = W2 * uy[c] + G * vy[c];
      nx[c] = vx[c] + ex - sx;
      ny[c] = vy[c] + ey - sy;
      // ...and the spring's far end is on the plate.
      if (pl) {
        fx[p] += sx;
        fy[p] += sy;
        tq[p] += (i - pl.cx) * sy - (j - pl.base) * sx;
      }
    }
  }
  // The plates move; what they gain in rate this step is what the gel
  // on them feels as a force the other way.
  const before = plates.map((pl) => [pl.vx, pl.vy, pl.om]);
  plates.forEach((pl, p) => stepPlate(pl, fx[p], fy[p], tq[p]));
  const acc = plates.map((pl, p) => [
    pl.vx - before[p][0],
    pl.vy - before[p][1],
    pl.om - before[p][2],
  ]);
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const c = i + j * gw;
      if (!hull[c] || pinned[c]) continue;
      const p = plateOf[c];
      if (p !== NO_PLATE) {
        const [ax, ay, al] = acc[p];
        const pl = plates[p];
        nx[c] -= ax - al * (j - pl.base);
        ny[c] -= ay + al * (i - pl.cx);
      }
      vx[c] = nx[c];
      vy[c] = ny[c];
      ux[c] += vx[c];
      uy[c] += vy[c];
    }
  }
}

/** One step of a plate on its mat under a net force and torque from the gel. */
export function stepPlate(pl: Plate, fx: number, fy: number, tq: number): void {
  if (!pl.mass) return;
  pl.vx += fx / pl.mass - PLATE_WX2 * pl.x - PLATE_G * pl.vx;
  pl.vy += fy / pl.mass - PLATE_WY2 * pl.y - PLATE_G * pl.vy;
  pl.om += tq / pl.inertia - PLATE_WT2 * pl.th - PLATE_G * pl.om;
  pl.x += pl.vx;
  pl.y += pl.vy;
  pl.th += pl.om;
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

export interface Range {
  plate: number;
  x0: number;
  x1: number;
}

/**
 * The arrival: the gel lands. Every free cell is moving down, faster the
 * higher it stands above its plate, with a little lean so nothing lands
 * dead square. `height` is how far above its foot a cell is, 0..1, so a
 * letter on the second line drops onto its own plate and not the floor.
 * With a `range`, only the columns of one letter land.
 */
export function drop(
  g: Gel,
  v: number,
  height: (k: number) => number,
  lean = 0.6,
  range?: Range
): void {
  for (let k = 0; k < g.gw * g.gh; k++) {
    if (!g.hull[k] || g.pinned[k]) continue;
    if (range && !inRange(g, k, range)) continue;
    // Smoothstep in height: no kink at the foot or the top.
    const t = Math.min(1, Math.max(0, height(k)));
    const h = t * t * (3 - 2 * t);
    g.vy[k] -= v * h;
    g.vx[k] += v * lean * h;
  }
}

function inRange(g: Pick<Gel, 'gw' | 'plateOf'>, k: number, r: Range): boolean {
  const i = k % g.gw;
  return g.plateOf[k] === r.plate && i >= r.x0 && i < r.x1;
}

/**
 * A letter lands on its plate. It arrives at `vImpact` and its foot is
 * pinned on contact; the free part keeps what `drop` gives it, and the
 * momentum the foot absorbed — all of it at the foot, the balance up the
 * body — goes into the plate. That thump is what the other letters on the
 * line feel.
 */
export function land(
  g: Gel,
  range: Range,
  vImpact: number,
  v: number,
  height: (k: number) => number,
  lean = 0.6
): void {
  drop(g, v, height, lean, range);
  thump(
    g.plates[range.plate],
    landImpulse(g, range, vImpact, v, height, lean),
    g
  );
}

export interface Impulse {
  jx: number;
  jy: number;
  jt: number;
}

/** The momentum a landing hands the plate. Geometry only: no state is read. */
export function landImpulse(
  g: Pick<Gel, 'gw' | 'gh' | 'hull' | 'pinned' | 'plateOf' | 'plates'>,
  range: Range,
  vImpact: number,
  v: number,
  height: (k: number) => number,
  lean = 0.6
): Impulse {
  const pl = g.plates[range.plate];
  const out = { jx: 0, jy: 0, jt: 0 };
  if (!pl) return out;
  for (let k = 0; k < g.gw * g.gh; k++) {
    if (!g.hull[k] || !inRange(g, k, range)) continue;
    let kept = 0;
    if (!g.pinned[k]) {
      const t = Math.min(1, Math.max(0, height(k)));
      kept = v * t * t * (3 - 2 * t);
    }
    const d = vImpact - kept;
    const dx = d * lean;
    const dy = -d;
    const i = k % g.gw;
    const j = Math.floor(k / g.gw);
    out.jx += dx;
    out.jy += dy;
    out.jt += (i - pl.cx) * dy - (j - pl.base) * dx;
  }
  return out;
}

/**
 * An impulse on a plate. With the gel given, its free cells on that plate
 * take the equal and opposite kick, since their frame just moved.
 */
export function thump(
  pl: Plate | undefined,
  j: Impulse,
  g?: Pick<
    Gel,
    'gw' | 'gh' | 'hull' | 'pinned' | 'plateOf' | 'plates' | 'vx' | 'vy'
  >
): void {
  if (!pl || !pl.mass) return;
  const dvx = j.jx / pl.mass;
  const dvy = j.jy / pl.mass;
  const dom = j.jt / pl.inertia;
  pl.vx += dvx;
  pl.vy += dvy;
  pl.om += dom;
  if (!g) return;
  const p = g.plates.indexOf(pl);
  for (let k = 0; k < g.gw * g.gh; k++) {
    if (!g.hull[k] || g.pinned[k] || g.plateOf[k] !== p) continue;
    const i = k % g.gw;
    const jj = Math.floor(k / g.gw);
    g.vx[k] -= dvx - dom * (jj - pl.base);
    g.vy[k] -= dvy + dom * (i - pl.cx);
  }
}

/** Kinetic, spring and elastic energy of the gel, plus the plates' own. */
export function gelEnergy(g: Gel): number {
  const { gw, gh, ux, uy, vx, vy, hull, pinned, plateOf, plates } = g;
  let e = 0;
  const same = (c: number, k: number) => hull[k] && plateOf[k] === plateOf[c];
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const c = i + j * gw;
      if (!hull[c]) continue;
      if (!pinned[c]) {
        const p = plateOf[c];
        const [qx, qy] = p === NO_PLATE ? [0, 0] : poseRateAt(plates[p], i, j);
        e += 0.5 * ((vx[c] + qx) ** 2 + (vy[c] + qy) ** 2);
        e += 0.5 * W2 * (ux[c] * ux[c] + uy[c] * uy[c]);
      }
      const r = i + 1 < gw && same(c, c + 1) ? c + 1 : c;
      const u = j + 1 < gh && same(c, c + gw) ? c + gw : c;
      const dxx = ux[r] - ux[c];
      const dxy = ux[u] - ux[c];
      const dyx = uy[r] - uy[c];
      const dyy = uy[u] - uy[c];
      e += 0.5 * CS2 * (dxx * dxx + dxy * dxy + dyx * dyx + dyy * dyy);
      const div = dxx + dyy;
      e += 0.5 * (CP2 - CS2) * div * div;
    }
  }
  for (const pl of plates) {
    if (!pl.mass) continue;
    e += 0.5 * pl.mass * (pl.vx * pl.vx + pl.vy * pl.vy);
    e += 0.5 * pl.inertia * pl.om * pl.om;
    e += 0.5 * pl.mass * (PLATE_WX2 * pl.x * pl.x + PLATE_WY2 * pl.y * pl.y);
    e += 0.5 * pl.inertia * PLATE_WT2 * pl.th * pl.th;
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
