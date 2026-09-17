/**
 * Pure numeric core of the sandbox.
 *
 * A CPU mirror of the single simulation pass that runs in GLSL — saltation,
 * slope failure, creep and drying — plus the two tools that write into the
 * field. It exists so the model can be exercised headlessly: does mass
 * stay put, do ripples actually EMERGE and at the wavelength the stability
 * analysis says, does damp sand stand where dry sand slumps, and how long
 * does a furrow survive the wind. Those are the claims the spec makes, and
 * "verified by eye" has no floor under it otherwise.
 *
 * It is a mirror, not a port: `Math.sin` and GLSL's `sin` disagree in the
 * last bits, so the two diverge sample by sample. What is asserted here is
 * behaviour of the scheme, which both share.
 *
 * ## Units
 *
 * The domain is `asp` world units wide and exactly 1 tall. Sand height is
 * carried in world units above the box floor; cells are square, `dx = 1/H`.
 * Flux is height moved across a unit face per step. Time is real: one step
 * is 1/60 s, and the drying constant is in seconds.
 */

/** Simulation step. Explicit diffusion and the repose exchange both want a fixed one. */
export const STEP = 1 / 60;

/** Accumulator cap, in steps, so a stall cannot spiral. */
export const MAX_STEPS_PER_FRAME = 3;

export interface SandParams {
  /** Cell size in world units. Square cells: 1 / gridH. */
  dx: number;
  /** Domain width in world units (= aspect ratio); height is 1. */
  asp: number;
  /** Seconds per step. */
  dt: number;
  /**
   * Transport coefficient: height moved across a face per step at unit
   * gust and unit flux factor. Every wind rate inherits it — ripple growth
   * and furrow erasure both scale with it, which is the named tension.
   */
  Q: number;
  /**
   * Flux factor on flat sand. The constant part of the flux has zero
   * divergence on the interior so it moves nothing you can see, but it is
   * what ripples grow around: with it at zero the response to a
   * perturbation is rectified and half as strong.
   */
  c: number;
  /**
   * Exposure gain, per unit of slope. The nonlocal term: flux here is set
   * by how much higher the sand is one hop upwind, because that is where
   * the grains landing here were dislodged.
   */
  beta: number;
  /**
   * Carrying-capacity cap on the flux factor. Wind can only carry so much;
   * without the cap a steep furrow wall drives the flux up with its slope
   * and a track disappears in seconds while ripples, which are gentle,
   * grow at the same rate as before. This is the lever that separates the
   * two timescales.
   */
  cap: number;
  /** Hop length, in cells. Ripples come out between L and 2L. */
  hop: number;
  /** Gust strength multiplier, the Wind control. */
  gust: number;
  /**
   * Wind direction rotation rate, rad/s, plus a wander. Ripples migrate
   * downwind, which is a mean transport toward one wall; a rotating wind
   * is what stops the box tilting its sand to one side over an hour.
   */
  windRot: number;
  windWander: number;
  /**
   * Test hook. When set, direction is this and gusts are uniform 1, so a
   * measurement is of the scheme rather than of the weather.
   */
  steadyDir?: [number, number];
  /**
   * Creep diffusion, as a Courant number. Stable below 0.25, and kept two
   * orders of magnitude under it: diffusion spreads as `sqrt(2·creep·steps)`,
   * so 3e-4 reaches a cell and a half in a minute — enough to keep the
   * plow's walls from being pixel-sharp, too little to erase the track.
   * Wavelength selection does not lean on it; see HOP_SPREAD.
   */
  creep: number;
  /** Angle of repose of dry sand, as a gradient. 0.65 is about 33 degrees. */
  reposeDry: number;
  /**
   * Angle of repose of freshly turned sand, as a gradient. Damp sand has
   * capillary cohesion and stands near 60 degrees; that is why a bucket
   * castle holds, and why it crumbles as it dries.
   */
  reposeWet: number;
  /**
   * Fraction of the excess relaxed per step, per neighbour. Eight
   * neighbours can each take a share, so a cell must not be asked for more
   * than it holds: at 0.2 an isolated column lost 1.6x its height in one
   * step, the floor clamp caught it, and the box gained sand every time
   * the finger cut a sharp wall. 0.12 keeps the sum under one.
   */
  reposeRate: number;
  /** Drying time constant, seconds. Turned sand goes from dark to pale. */
  dryTau: number;
  /** Forcing clock, advanced per step by the caller. Never wall time. */
  t: number;
}

/**
 * Measured on a 64-cell patch of the production grid under a steady,
 * full-strength cross wind — the worst case for a track, since the real
 * wind gusts at about half strength on average and rotates: ripples reach
 * visible amplitude in under 30 s at a 9-cell wavelength and saturate at
 * the dry repose slope; a plowed furrow keeps half its depth after a
 * minute and more than half its volume after five. `physics.test.ts` holds
 * both ends of that. Q was halved after watching it: at twice this the
 * ripples were eating a track inside half a minute, and memory is why the
 * box exists.
 */
export const DEFAULT_PARAMS: Omit<SandParams, 'dx' | 'asp'> = {
  dt: STEP,
  Q: 0.75e-5,
  c: 0.15,
  beta: 12,
  cap: 0.4,
  hop: 7,
  gust: 1,
  windRot: (2 * Math.PI) / 300,
  windWander: 0.9,
  creep: 0.0003,
  reposeDry: 0.65,
  reposeWet: 1.7,
  reposeRate: 0.12,
  dryTau: 40,
  t: 0,
};

/**
 * Sand depth the box opens with, world units.
 *
 * Shallow on purpose. Dry sand cannot hold a narrow hole: a pit can only be
 * as deep as its radius times the repose slope, so at 0.06 nobody would ever
 * reach the floor with a fingertip, and finding the bottom of the box is
 * half the point of digging in one.
 */
export const DEPTH0 = 0.03;

/** Explicit diffusion is stable to 0.25; leave margin and never exceed it. */
export const CREEP_MAX = 0.2;

export function clampCreep(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(CREEP_MAX, Math.max(0, v));
}

export interface SandField {
  W: number;
  H: number;
  /** Sand height above the floor. */
  h: Float32Array;
  /** Moisture, 0 dry to 1 freshly turned. */
  m: Float32Array;
  /** Face fluxes: east face of each cell, north face of each cell. */
  fx: Float32Array;
  fy: Float32Array;
  /** Back buffers. */
  h2: Float32Array;
  m2: Float32Array;
}

export function createField(W: number, H: number, depth = DEPTH0): SandField {
  const n = W * H;
  const h = new Float32Array(n);
  h.fill(depth);
  return {
    W,
    H,
    h,
    m: new Float32Array(n),
    fx: new Float32Array(n),
    fy: new Float32Array(n),
    h2: new Float32Array(n),
    m2: new Float32Array(n),
  };
}

/* ------------------------------------------------------------------ noise */

/** Mirror of the GLSL hash. Precision differs; the statistics do not. */
export function hash21(x: number, y: number): number {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return v - Math.floor(v);
}

export function vnoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash21(ix, iy);
  const b = hash21(ix + 1, iy);
  const c = hash21(ix, iy + 1);
  const d = hash21(ix + 1, iy + 1);
  return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0 || 1e-9)));
  return t * t * (3 - 2 * t);
}

/**
 * Seed roughness for the opening state, so the ripple instability has
 * something to bite on. Judged in slope, not height: at 3e-5 across one
 * cell of a 488-cell grid the facet is under one degree, well below what
 * the shading can resolve — the erosion table's 0.4%-of-relief seed came
 * out as a field of 23-degree blocks.
 */
export function seedNoise(x: number, y: number): number {
  return (hash21(x + 0.37, y + 0.91) - 0.5) * 6e-5;
}

/* ------------------------------------------------------------------- wind */

/**
 * Wind direction at clock `t`: a slow full rotation plus a wander, so the
 * ripples re-orient over minutes and the mean transport averages out.
 */
export function windDir(
  t: number,
  p: Pick<SandParams, 'windRot' | 'windWander' | 'steadyDir'>
): [number, number] {
  if (p.steadyDir) return p.steadyDir;
  const a = t * p.windRot + p.windWander * (vnoise(t * 0.05, 3.7) - 0.5) * 2;
  return [Math.cos(a), Math.sin(a)];
}

/**
 * Gust strength at a point: cells of stronger wind drifting downwind, so the
 * ripples form patchily rather than as one grating. The drift constant is in
 * GUST-CELL units — it is subtracted after the frequency scale.
 */
export function gustAt(
  u: number,
  v: number,
  dir: [number, number],
  p: Pick<SandParams, 'asp' | 'gust' | 'steadyDir' | 't'>
): number {
  if (p.steadyDir) return p.gust;
  const qx = u * p.asp * 9 - dir[0] * p.t * 0.25;
  const qy = v * 9 - dir[1] * p.t * 0.25;
  const g =
    vnoise(qx, qy) * 0.6 + vnoise(qx * 2.13 + 5.1, qy * 2.13 + 8.3) * 0.4;
  return p.gust * (0.25 + 0.75 * smoothstep(0.35, 0.75, g));
}

/* ----------------------------------------------------------------- passes */

/**
 * Grains do not all hop the same distance. The exposure tap is averaged
 * over hop lengths `L-2 .. L+2`, and that spread is what selects the
 * wavelength: against a perturbation `e^{ikx}` it multiplies the growth by
 * `(1 + 2cos k + 2cos 2k) / 5`, which is 0.48 at the ripple band and
 * NEGATIVE across every shorter band. Without it the shorter bands have to
 * be killed with creep, and creep strong enough to do that diffuses six
 * cells a minute — which erases a plowed track in the same minute. Memory
 * is why the box exists, so the selection comes from the physics instead.
 */
export const HOP_SPREAD = 2;

/**
 * Face fluxes from saltation.
 *
 * `fx[i]` is the flux across the east face of cell `i`, `fy[i]` across its
 * north face. Both are computed once per face from the same taps, and the
 * update below charges each cell minus the divergence, so mass is conserved
 * by construction.
 *
 * Transport is PERIODIC: the flux leaving the east edge arrives at the west.
 * Ripples migrate downwind, and a box with real walls collects all its sand
 * against the lee wall within minutes — honest, and useless for a page that
 * runs for hours. The walls still exist for the light; the sand behaves as
 * a window onto a longer beach.
 */
export function fluxPass(F: SandField, p: SandParams): void {
  const { W, H, h, fx, fy } = F;
  const dir = windDir(p.t, p);
  const L = Math.max(HOP_SPREAD + 1, p.hop);
  const invLdx = 1 / (L * p.dx);
  const at = (x: number, y: number) => {
    // Nearest cell, wrapped. Continuous coordinates: cell i spans [i, i+1).
    let cx = Math.floor(x) % W;
    let cy = Math.floor(y) % H;
    if (cx < 0) cx += W;
    if (cy < 0) cy += H;
    return h[cy * W + cx];
  };
  const upwind = (x: number, y: number) => {
    let s = 0;
    for (let k = -HOP_SPREAD; k <= HOP_SPREAD; k++)
      s += at(x - (L + k) * dir[0], y - (L + k) * dir[1]);
    return s / (2 * HOP_SPREAD + 1);
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const hc = h[i];
      // East face at (x+1, y+0.5).
      {
        const j = y * W + ((x + 1) % W);
        const hf = 0.5 * (hc + h[j]);
        const e = (upwind(x + 1, y + 0.5) - hf) * invLdx;
        const f = Math.min(p.cap, Math.max(0, p.c + p.beta * e));
        const w = gustAt((x + 1) / W, (y + 0.5) / H, dir, p);
        fx[i] = p.Q * w * dir[0] * f;
      }
      // North face at (x+0.5, y+1).
      {
        const j = ((y + 1) % H) * W + x;
        const hf = 0.5 * (hc + h[j]);
        const e = (upwind(x + 0.5, y + 1) - hf) * invLdx;
        const f = Math.min(p.cap, Math.max(0, p.c + p.beta * e));
        const w = gustAt((x + 0.5) / W, (y + 1) / H, dir, p);
        fy[i] = p.Q * w * dir[1] * f;
      }
    }
  }
}

/**
 * Apply the fluxes, then creep, slope failure and drying.
 *
 * Slope failure is the erosion table's, on eight neighbours rather than
 * four: each pair exchanges what exceeds the repose drop, written from both
 * sides with the same magnitude. The diagonals matter — on four neighbours
 * a pit slumps into a diamond, because the stencil only knows Manhattan
 * distance. The drop depends on the pair's mean moisture, which is what
 * lets a damp castle stand over a dry slope that has already slumped.
 *
 * Repose and creep use CLAMPED neighbours — the walls are real for the sand
 * that is already at them; only the wind's transport wraps.
 */
export function sandPass(F: SandField, p: SandParams): void {
  const { W, H, h, m, fx, fy, h2, m2 } = F;
  const creep = clampCreep(p.creep);
  const reposeRate = Math.min(0.24, Math.max(0, p.reposeRate));
  const dryMul = Math.exp(-p.dt / Math.max(1e-3, p.dryTau));
  const dropDry = Math.max(0, p.reposeDry) * p.dx;
  const dropWet = Math.max(0, p.reposeWet) * p.dx;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const hc = h[i];
      const mc = m[i];
      const inW = fx[y * W + ((x + W - 1) % W)];
      const inS = fy[((y + H - 1) % H) * W + x];
      let hn = hc - (fx[i] - inW) - (fy[i] - inS);

      const iL = x > 0 ? i - 1 : i;
      const iR = x < W - 1 ? i + 1 : i;
      const iB = y > 0 ? i - W : i;
      const iT = y < H - 1 ? i + W : i;
      const hL = h[iL];
      const hR = h[iR];
      const hB = h[iB];
      const hT = h[iT];

      if (creep > 0) hn += creep * (hL + hR + hB + hT - 4 * hc);

      if (reposeRate > 0) {
        const ex = (j: number, diag: boolean) => {
          const drop =
            (dropDry + (dropWet - dropDry) * 0.5 * (mc + m[j])) *
            (diag ? Math.SQRT2 : 1);
          const d = h[j] - hc;
          if (d > drop) return d - drop;
          if (d < -drop) return d + drop;
          return 0;
        };
        const xl = x > 0 ? x - 1 : x;
        const xr = x < W - 1 ? x + 1 : x;
        const yb = y > 0 ? y - 1 : y;
        const yt = y < H - 1 ? y + 1 : y;
        hn +=
          reposeRate *
          (ex(iL, false) +
            ex(iR, false) +
            ex(iB, false) +
            ex(iT, false) +
            ex(yb * W + xl, true) +
            ex(yb * W + xr, true) +
            ex(yt * W + xl, true) +
            ex(yt * W + xr, true));
      }

      if (hn < 0) hn = 0;
      h2[i] = hn;
      m2[i] = mc * dryMul;
    }
  }
  h.set(h2);
  m.set(m2);
}

/** One full step. */
export function step(F: SandField, p: SandParams): void {
  fluxPass(F, p);
  sandPass(F, p);
}

/* ------------------------------------------------------------------ tools */

/**
 * Discrete volume ratios for the two tools, so the sand they put back is
 * exactly the sand they took. The analytic estimates (a ring of radius
 * 1.6r and width 0.6r holds 3.4x less per unit height than the gaussian it
 * replaces) are off by a few percent on a grid, and a few percent per
 * stroke is a box that slowly gains sand. Summed once per radius on the
 * same stencil the tool uses; the GPU splat gets the same number as a
 * uniform, so the mirror and the shader conserve identically.
 */
export function plowRatio(radCells: number): number {
  const r = Math.max(0.5, radCells);
  const rho = 1.6 * r;
  const s = 0.6 * r;
  const reach = Math.ceil(rho + 3 * s);
  let g = 0;
  let ring = 0;
  for (let y = -reach; y <= reach; y++)
    for (let x = -reach; x <= reach; x++) {
      const d = Math.hypot(x + 0.5, y + 0.5);
      g += Math.exp(-(d * d) / (r * r));
      ring += Math.exp(-((d - rho) * (d - rho)) / (s * s));
    }
  return g / ring;
}

export function castleRatio(radCells: number): number {
  const r = Math.max(1, radCells);
  const moatIn = 1.15 * r;
  const moatOut = 2.15 * r;
  const reach = Math.ceil(moatOut + 2);
  let top = 0;
  let moat = 0;
  for (let y = -reach; y <= reach; y++)
    for (let x = -reach; x <= reach; x++) {
      const d = Math.hypot(x + 0.5, y + 0.5);
      top += 1 - smoothstep(r - 0.75, r + 0.75, d);
      moat +=
        smoothstep(moatIn - 0.75, moatIn + 0.75, d) *
        (1 - smoothstep(moatOut - 0.75, moatOut + 0.75, d));
    }
  return top / moat;
}

/** Least sand in the square window of half-width `half` cells about a point. */
export function minOver(
  F: SandField,
  cx: number,
  cy: number,
  half: number
): number {
  const { W, H, h } = F;
  const n = Math.ceil(half);
  const x0 = Math.max(0, Math.floor(cx) - n);
  const x1 = Math.min(W - 1, Math.floor(cx) + n);
  const y0 = Math.max(0, Math.floor(cy) - n);
  const y1 = Math.min(H - 1, Math.floor(cy) + n);
  let m = Infinity;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) m = Math.min(m, h[y * W + x]);
  return m === Infinity ? 0 : m;
}

/**
 * The plow: a fingertip pressed into the sand and moved. Sand under it is
 * displaced, never deleted — the gaussian taken from the centre is put back
 * as a ring around it, weighted `1 + cos φ` toward the direction of motion
 * so nothing lands behind the finger and a bow wave builds ahead. That
 * weighting is what makes it a plow: the next stamp picks the deposit up
 * again and carries it on, so a stroke delivers its sand to where it ends.
 * The ring is then the repose pass's problem, and what it slumps into is
 * the berm.
 *
 * The ring sits at 1.6r with width 0.6r; `plowRatio` says how much per unit
 * height it holds against the gaussian. The bias `(1 + k cos φ)` integrates
 * to the same total over a full turn.
 *
 * Sand removed is damp underneath, so moisture is added where it was taken.
 */
export function plow(
  F: SandField,
  u: number,
  v: number,
  radCells: number,
  amp: number,
  dirx: number,
  diry: number,
  bias = 1.0
): void {
  const { W, H, h, m } = F;
  const cx = u * W;
  const cy = v * H;
  const r = Math.max(0.5, radCells);
  // The finger reads the sand under it — the least of it anywhere under
  // the fingertip, not just at the centre, because a stamp on a pit's wall
  // reaches sand thinner than the sand it is centred on. Near the floor it
  // digs less and at the floor it scrapes plastic and moves nothing;
  // otherwise the removal clamps at zero while the ring still lands, and
  // the box gains sand. A stroke's stamps overlap about 3.5 deep, so a
  // quarter of the least sand is the most one stamp may take.
  amp = Math.min(amp, Math.max(0, minOver(F, cx, cy, r) - 0.001) * 0.25);
  if (amp <= 0) return;
  const rho = 1.6 * r;
  const s = 0.6 * r;
  const b = amp * plowRatio(r);
  const reach = Math.ceil(rho + 3 * s);
  const x0 = Math.max(0, Math.floor(cx - reach));
  const x1 = Math.min(W - 1, Math.ceil(cx + reach));
  const y0 = Math.max(0, Math.floor(cy - reach));
  const y1 = Math.min(H - 1, Math.ceil(cy + reach));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const ddx = x + 0.5 - cx;
      const ddy = y + 0.5 - cy;
      const d = Math.hypot(ddx, ddy);
      const g = Math.exp(-(d * d) / (r * r));
      const cosPhi = d > 1e-6 ? (ddx * dirx + ddy * diry) / d : 0;
      const ring =
        Math.exp(-((d - rho) * (d - rho)) / (s * s)) * (1 + bias * cosPhi);
      const i = y * W + x;
      h[i] = Math.max(0, h[i] - amp * g + b * ring);
      m[i] = Math.min(1, m[i] + 0.9 * g);
    }
  }
}

/**
 * The bucket: a turret of damp sand whose fill is dug from the annulus
 * around it, so the moat is the bucket's own volume. The turret gets
 * moisture 1, so it stands at the wet repose angle until it dries.
 *
 * Plateau area is about `π r²`; the moat is a ring of width `r` starting at
 * `1.15 r`, area `π ((2.15r)² − (1.15r)²) = 3.3 π r²`, so its depth is near
 * the turret height over 3.3 — `castleRatio` has the exact discrete figure.
 */
export function castle(
  F: SandField,
  u: number,
  v: number,
  radCells: number,
  height: number
): void {
  const { W, H, h, m } = F;
  const cx = u * W;
  const cy = v * H;
  const r = Math.max(1, radCells);
  // A bucket can only be filled from sand that is there: over thin sand
  // the moat would clamp at the floor and the turret would be sand from
  // nowhere, so the castle shrinks with the least sand under its moat.
  const ratio = castleRatio(r);
  height = Math.min(
    height,
    Math.max(0, minOver(F, cx, cy, 2.15 * r + 1) - 0.002) / ratio
  );
  if (height <= 0) return;
  const moatIn = 1.15 * r;
  const moatOut = 2.15 * r;
  const moatDepth = height * ratio;
  const reach = Math.ceil(moatOut + 2);
  const x0 = Math.max(0, Math.floor(cx - reach));
  const x1 = Math.min(W - 1, Math.ceil(cx + reach));
  const y0 = Math.max(0, Math.floor(cy - reach));
  const y1 = Math.min(H - 1, Math.ceil(cy + reach));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const i = y * W + x;
      const top = 1 - smoothstep(r - 0.75, r + 0.75, d);
      const moat =
        smoothstep(moatIn - 0.75, moatIn + 0.75, d) *
        (1 - smoothstep(moatOut - 0.75, moatOut + 0.75, d));
      h[i] = Math.max(0, h[i] + height * top - moatDepth * moat);
      m[i] = Math.min(1, m[i] + top + 0.5 * moat);
    }
  }
}

/* ------------------------------------------------------------ diagnostics */

/** Total sand in the box. */
export function totalSand(F: SandField): number {
  let t = 0;
  for (let i = 0; i < F.h.length; i++) t += F.h[i];
  return t;
}

/** Standard deviation of height about its mean. */
export function relief(F: SandField): number {
  const n = F.h.length;
  let s = 0;
  let s2 = 0;
  for (let i = 0; i < n; i++) {
    s += F.h[i];
    s2 += F.h[i] * F.h[i];
  }
  return Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2));
}

/**
 * Dominant wavelength along x, in cells: the peak of the row-averaged power
 * spectrum. This is how the test checks the ripples the stability analysis
 * promises — between the hop length and twice it.
 */
export function dominantWavelengthX(F: SandField): number {
  const { W, H, h } = F;
  const power = new Float64Array(Math.floor(W / 2) + 1);
  const row = new Float64Array(W);
  for (let y = 0; y < H; y++) {
    let mean = 0;
    for (let x = 0; x < W; x++) mean += h[y * W + x];
    mean /= W;
    for (let x = 0; x < W; x++) row[x] = h[y * W + x] - mean;
    for (let k = 1; k < power.length; k++) {
      let re = 0;
      let im = 0;
      for (let x = 0; x < W; x++) {
        const a = (2 * Math.PI * k * x) / W;
        re += row[x] * Math.cos(a);
        im -= row[x] * Math.sin(a);
      }
      power[k] += re * re + im * im;
    }
  }
  let best = 1;
  for (let k = 2; k < power.length; k++) if (power[k] > power[best]) best = k;
  return W / best;
}

/** Steepest gradient anywhere, rise over run. */
export function maxSlope(F: SandField, dx: number): number {
  const { W, H, h } = F;
  let s = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W - 1; x++) {
      const i = y * W + x;
      s = Math.max(s, Math.abs(h[i + 1] - h[i]) / dx);
      if (y < H - 1) s = Math.max(s, Math.abs(h[i + W] - h[i]) / dx);
    }
  return s;
}

/** True if every cell is finite and sand is non-negative. */
export function isHealthy(F: SandField): boolean {
  for (let i = 0; i < F.h.length; i++) {
    if (!Number.isFinite(F.h[i]) || F.h[i] < 0) return false;
    if (!Number.isFinite(F.m[i]) || F.m[i] < 0) return false;
  }
  return true;
}
