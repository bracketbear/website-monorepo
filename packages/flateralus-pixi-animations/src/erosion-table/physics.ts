/**
 * Pure numeric core of the erosion table.
 *
 * This is a CPU mirror of the two simulation passes that run in GLSL — the
 * virtual-pipe flux update and the water/sediment/terrain update. It exists
 * so the model can be exercised headlessly: mass conservation, non-negative
 * water, long-run stability and, most importantly, whether flow actually
 * CHANNELISES. "Verified by eye" has no floor under it otherwise, and the
 * Chladni post-mortem is a record of what that costs.
 *
 * It is a mirror, not a port: `Math.sin` and GLSL's `sin` disagree in the
 * last bits, so the two will diverge sample by sample. What is asserted here
 * is behaviour of the scheme, which both share.
 *
 * ## Units
 *
 * The domain is `asp` world units wide and exactly 1 world unit tall, where
 * one world unit is the ground span of the baked elevation crop — about
 * 13.7 km for Mt Hood. Heights, water depth and suspended sediment are all
 * carried as depths in those same world units, so `b`, `w` and `s` add and
 * subtract without conversion.
 *
 * Time is NOT real. `GRAV` below is a tuned acceleration, roughly 28000x
 * real gravity expressed in these units, which is what compresses an
 * orogeny into something a person will sit and watch. Every rate constant
 * inherits that compression; none of them are geologic.
 */

/**
 * Simulation step. The pipe model tolerates a coarse step because the
 * outflow clamp keeps water non-negative whatever happens, but sediment
 * advection and the velocity estimate both want CFL below 1: at the default
 * flow speed of ~0.25 world/s on a 488-cell grid this lands at ~0.51.
 */
export const STEP = 1 / 240;

/** Steps per rendered frame at 60fps, and the accumulator cap in steps. */
export const MAX_STEPS_PER_FRAME = 12;

/** Water depths below this are treated as dry when dividing to get velocity. */
export const W_EPS = 1e-7;

export interface ErosionParams {
  /** Cell size in world units. Square cells: 1 / gridH. */
  dx: number;
  /** Domain width in world units (= aspect ratio); height is 1. */
  asp: number;
  /** Seconds per step. */
  dt: number;
  /** Tuned flow acceleration, world units/s^2. Not real gravity — see above. */
  grav: number;
  /** Per-step momentum retention in the pipes. This is the friction model. */
  fDamp: number;
  /** Sediment capacity coefficient. C = kc * sin(a) * |u| * min(w, wCap). */
  kc: number;
  /**
   * Dissolving rate, 1/s.
   *
   * Nearly saturated: suspended load reaches capacity within a step or two,
   * so the response to this is strongly sublinear — five times the rate
   * bought about a quarter more incision when measured, and a stiffer
   * integrator along with it. Capacity is the lever, which is why the
   * Erosion Rate control scales `kc` instead. There is a test holding this.
   */
  ks: number;
  /** Deposition rate, 1/s. */
  kd: number;
  /**
   * Capacity saturates at this depth so standing lakes stop cutting.
   *
   * It has to sit well ABOVE the depth channels actually run at. Set below
   * it, the cap bites hardest on exactly the deepest flow — which is the
   * feedback that concentrates water in the first place — and the model
   * quietly loses its ability to channelise at all.
   */
  wCap: number;
  /** Floor under sin(a) so dead-flat ground still carries a little load. */
  minSlope: number;
  /**
   * Hillslope creep, as the diffusion Courant number `K * dt / dx^2`.
   *
   * The other half of the standard landscape-evolution equation, and not
   * optional: stream power on its own cuts channels exactly one cell wide,
   * because the feedback is strongest at whichever single cell is deepest.
   * The result is a grid of slot canyons that reads as stair-stepped
   * rubbish however it is shaded. Soil creep and small landslides are what
   * make real hillslopes convex and real valleys V-shaped, and adding them
   * lets a channel widen into a valley instead of boring straight down.
   *
   * Carried dimensionless rather than as a diffusivity so stability does
   * not move with the grid: the explicit five-point stencil is stable up to
   * 0.25, and `clampCreep` holds it below that.
   *
   * The useful values are nowhere near that cap, and the window is narrow.
   * Diffusion spreads as `sqrt(2 * creep * steps)`, so over the ~7200 steps
   * that carve a valley, 6e-5 reaches about one cell — enough to stop a
   * one-cell slot, little enough to leave the mountain alone. Anywhere near
   * the stability limit it reaches thirty cells and melts the terrain into
   * blobs; even at 3e-4 it has already won, which shows up as the
   * correlation between incision and discharge going NEGATIVE, because
   * diffusion lowers ridges and fills valleys and that is the opposite
   * signature to running water.
   *
   * Note this is a cell-scale regulariser, not a fixed diffusivity: holding
   * the number constant holds the smoothing constant in CELLS, so its
   * physical reach shrinks as the grid gets finer. That is what is wanted
   * here — the thing being suppressed is also measured in cells — but it
   * does mean a coarse test grid sees far more of it than production does.
   */
  creep: number;
  /**
   * Angle of repose, as a gradient (rise over run).
   *
   * Ground steeper than this fails and the material slides. Without it the
   * incision feedback has no limiter at all: capacity goes as the slope
   * along the flow, so a cell that cuts deeper gets a steeper approach, and
   * a steeper approach cuts faster. Measured at a 128-cell grid, that runs
   * away completely — the deepest cell drilled to twelve times the relief
   * of the whole mountain and the field stopped being finite.
   *
   * Heavy hillslope creep suppresses it too, but at the cost of smoothing
   * everything: run high enough to hold the singularity, diffusion outruns
   * stream power and the valleys stop being the story. Slope failure only
   * touches ground that is already past standing up, so the gentle terrain
   * keeps whatever the water did to it.
   *
   * 0.7 is about 35 degrees.
   */
  repose: number;
  /** Fraction of the excess relaxed per step. Stable below 0.25. */
  reposeRate: number;
  /** Evaporation rate, 1/s. */
  evap: number;
  /** Precipitation rate at full storm intensity, world depth/s. */
  rain: number;
  /** Fraction of `rain` that falls everywhere, all the time. */
  rainBase: number;
  /** Storm cells across the domain. */
  rainFreq: number;
  /** Orographic gain: precipitation multiplier at the top of the relief. */
  oro: number;
  /** Total relief of the baked terrain, world units. Sets the snow line. */
  relief: number;
  /** Snow line as a fraction of relief. */
  snowLine: number;
  /** Half-width of the rain/snow transition, fraction of relief. */
  snowBand: number;
  /** Melt rate at the bottom of the transition band, world depth/s. */
  melt: number;
  /** Snowpack saturates here; above it precipitation just runs off. */
  snowMax: number;
  /** Tectonic uplift rate, world units/s. */
  uplift: number;
  /** Uplift tapers to zero once the surface is this far above its original. */
  upliftMax: number;
  /** Open edges drain to base level. Closed edges are a bathtub, for tests. */
  openBoundary: boolean;
  /** Forcing clock, advanced per step by the caller. Never wall time. */
  t: number;
}

export const DEFAULT_PARAMS: Omit<ErosionParams, 'dx' | 'asp' | 'relief'> = {
  dt: STEP,
  grav: 20,
  fDamp: 0.9,
  kc: 4,
  ks: 40,
  kd: 20,
  wCap: 2e-2,
  minSlope: 0.005,
  creep: 6e-5,
  repose: 0.7,
  reposeRate: 0.2,
  evap: 0.15,
  rain: 2.5e-4,
  rainBase: 0.22,
  rainFreq: 3.2,
  oro: 1.4,
  snowLine: 0.62,
  snowBand: 0.09,
  melt: 3e-4,
  snowMax: 0.01,
  uplift: 2e-6,
  upliftMax: 0.05,
  openBoundary: true,
  t: 0,
};

/** Explicit diffusion is stable to 0.25; leave margin and never exceed it. */
export const CREEP_MAX = 0.2;

export function clampCreep(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(CREEP_MAX, Math.max(0, v));
}

/**
 * One cell of state, as four parallel grids plus the four outflow pipes.
 * `b0` is the terrain as it was baked and never changes: the display reads
 * it to show what has been cut away and what has been laid down, and the
 * uplift term reads it to know where the range is.
 */
export interface ErosionField {
  W: number;
  H: number;
  /** Terrain height. */
  b: Float32Array;
  /** Water depth. */
  w: Float32Array;
  /** Suspended sediment, as a depth of rock. */
  s: Float32Array;
  /** Snowpack depth. */
  snow: Float32Array;
  /** Outflow per face, world depth/s: 4 per cell as L, R, B, T. */
  f: Float32Array;
  /** Baked terrain, immutable. */
  b0: Float32Array;
  /** Back buffers. */
  b2: Float32Array;
  w2: Float32Array;
  s2: Float32Array;
  snow2: Float32Array;
  f2: Float32Array;
}

export function createField(
  W: number,
  H: number,
  b0: Float32Array
): ErosionField {
  const n = W * H;
  if (b0.length !== n)
    throw new Error(`b0 must be ${n} long, got ${b0.length}`);
  return {
    W,
    H,
    b: Float32Array.from(b0),
    w: new Float32Array(n),
    s: new Float32Array(n),
    snow: new Float32Array(n),
    f: new Float32Array(n * 4),
    b0: Float32Array.from(b0),
    b2: new Float32Array(n),
    w2: new Float32Array(n),
    s2: new Float32Array(n),
    snow2: new Float32Array(n),
    f2: new Float32Array(n * 4),
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
 * Precipitation as a drifting field of storm cells, not a uniform drizzle.
 *
 * This is the erosion table's answer to the pool's wind: a forcing with a
 * history rather than a picture of weather. The clock is advanced per step
 * by the caller and wrapped, so the drift never depends on refresh rate and
 * the hash never runs out into the range where sin() goes flat.
 *
 * The drift constants are in STORM-CELL units, because they are subtracted
 * after the frequency scale. At rainFreq 3.2 across a 1-world-unit domain,
 * 0.11 cells/s is ~0.034 world units/s: a storm crosses the mountain in
 * about half a minute.
 */
export function rainAt(
  u: number,
  v: number,
  p: Pick<ErosionParams, 'asp' | 'rainFreq' | 'rainBase' | 't'>
): number {
  const qx = u * p.rainFreq * p.asp - p.t * 0.11;
  const qy = v * p.rainFreq - p.t * 0.03;
  const g =
    vnoise(qx, qy) * 0.56 +
    vnoise(qx * 2.31 + 11.3, qy * 2.31 + 4.7) * 0.3 +
    vnoise(qx * 5.07 + 3.9, qy * 5.07 + 27.1) * 0.14;
  return p.rainBase + smoothstep(0.38, 0.95, g);
}

/* ------------------------------------------------------------------ passes */

/**
 * Virtual-pipe flux update.
 *
 * Each face carries an outflow in world depth per second. The acceleration
 * is the depth-integrated shallow-water momentum term, `d(uw)/dt = g w dh/dx`
 * against the head `b + w`, and `fDamp` stands in for bed friction.
 *
 * The clamp at the end is what makes the scheme safe: outflow is scaled so a
 * cell can never send away more water than it holds. Because the scaled
 * value is what gets STORED, the neighbour reading it back as inflow sees
 * the same number, and mass stays conserved across the pair of passes.
 */
export function fluxPass(F: ErosionField, p: ErosionParams): void {
  const { W, H, b, w, f, f2 } = F;
  // dx SQUARED, and the second one is not decoration.
  //
  // The pipe carries `f` in depth per second, while the momentum equation is
  // written for discharge per unit width, `q = u * w`. Those differ by a
  // factor of the cell size (`q = f * dx`), and the head difference `d` has
  // to be divided by another to become a slope. Drop either and flow speed
  // comes out proportional to dx — which still looks like a plausible river
  // at whatever grid you happened to test on, and then runs seven times
  // slower on the production grid for no visible reason.
  const k = (p.dt * p.grav) / (p.dx * p.dx);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const o = i * 4;
      const wc = w[i];
      const h = b[i] + wc;
      // An open edge is a cliff: the ghost cell outside sits one cell-size
      // lower with no water on it, so the head difference is the local depth
      // plus that drop. Using `dx` makes the boundary a 45-degree fall
      // whatever the grid, which is steeper than anything on the mountain,
      // so water always leaves rather than damming up along the rim.
      //
      // The first version used `dh = w` — the outside bed at the same height
      // — and that is a weir, not an edge: head differences inside the
      // domain come from the terrain slope and are an order of magnitude
      // larger, so the interior fed the rim faster than the rim could drain
      // and the whole table flooded.
      const edge = p.openBoundary ? wc + p.dx : 0;
      const dL = x > 0 ? h - (b[i - 1] + w[i - 1]) : edge;
      const dR = x < W - 1 ? h - (b[i + 1] + w[i + 1]) : edge;
      const dB = y > 0 ? h - (b[i - W] + w[i - W]) : edge;
      const dT = y < H - 1 ? h - (b[i + W] + w[i + W]) : edge;
      const kw = k * wc;
      let fL = f[o] * p.fDamp + kw * dL;
      let fR = f[o + 1] * p.fDamp + kw * dR;
      let fB = f[o + 2] * p.fDamp + kw * dB;
      let fT = f[o + 3] * p.fDamp + kw * dT;
      if (fL < 0) fL = 0;
      if (fR < 0) fR = 0;
      if (fB < 0) fB = 0;
      if (fT < 0) fT = 0;
      const sum = fL + fR + fB + fT;
      if (sum > 0) {
        const want = sum * p.dt;
        if (want > wc) {
          const sc = wc / want;
          fL *= sc;
          fR *= sc;
          fB *= sc;
          fT *= sc;
        }
      }
      f2[o] = fL;
      f2[o + 1] = fR;
      f2[o + 2] = fB;
      f2[o + 3] = fT;
    }
  }
  F.f.set(f2);
}

/** Bilinear sample of a grid in uv, clamped at the edges. */
export function bilerp(
  g: Float32Array,
  W: number,
  H: number,
  u: number,
  v: number
): number {
  const fx = Math.min(W - 1, Math.max(0, u * W - 0.5));
  const fy = Math.min(H - 1, Math.max(0, v * H - 0.5));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(W - 1, x0 + 1);
  const y1 = Math.min(H - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const a = g[y0 * W + x0];
  const b = g[y0 * W + x1];
  const c = g[y1 * W + x0];
  const d = g[y1 * W + x1];
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}

/**
 * Water, sediment, terrain and snow.
 *
 * Order inside the pass: route water, measure velocity, advect the sediment
 * that was already in flight, then settle the exchange between the flow and
 * the bed against whatever arrived. Erosion happens where the flow has more
 * capacity than load and deposition where it has less, which is the whole
 * mechanism — capacity goes as slope times speed, so it collapses the
 * moment a channel reaches the flats and the load drops out as a fan.
 */
export function terrainPass(F: ErosionField, p: ErosionParams): void {
  const { W, H, b, w, s, snow, f, b0, b2, w2, s2, snow2 } = F;
  const reliefSafe = Math.max(1e-6, p.relief);
  const lineLo = (p.snowLine - p.snowBand) * reliefSafe;
  const lineHi = (p.snowLine + p.snowBand) * reliefSafe;
  const evapMul = Math.exp(-p.evap * p.dt);
  const creep = clampCreep(p.creep);
  const reposeRate = Math.min(0.24, Math.max(0, p.reposeRate));
  const maxDrop = Math.max(0, p.repose) * p.dx;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const o = i * 4;
      const outL = f[o];
      const outR = f[o + 1];
      const outB = f[o + 2];
      const outT = f[o + 3];
      // Inflow is the neighbour's pipe pointing this way. Off the edge of
      // the domain nothing flows in, which is what makes the edges a sink.
      const inL = x > 0 ? f[(i - 1) * 4 + 1] : 0;
      const inR = x < W - 1 ? f[(i + 1) * 4] : 0;
      const inB = y > 0 ? f[(i - W) * 4 + 3] : 0;
      const inT = y < H - 1 ? f[(i + W) * 4 + 2] : 0;
      const wOld = w[i];
      let wNew =
        wOld + p.dt * (inL + inR + inB + inT - outL - outR - outB - outT);
      if (wNew < 0) wNew = 0;
      const wAvg = 0.5 * (wOld + wNew);
      const denom = Math.max(wAvg, W_EPS);
      // Net flux through the cell, converted from depth/s to a velocity by
      // dividing by the depth the flow is passing through.
      const ux = (0.5 * (inL - outL + outR - inR) * p.dx) / denom;
      const uy = (0.5 * (inB - outB + outT - inT) * p.dx) / denom;
      const vel = Math.hypot(ux, uy);

      const bc = b[i];
      const bL = x > 0 ? b[i - 1] : bc;
      const bR = x < W - 1 ? b[i + 1] : bc;
      const bB = y > 0 ? b[i - W] : bc;
      const bT = y < H - 1 ? b[i + W] : bc;
      const gx = (bR - bL) / (2 * p.dx);
      const gy = (bT - bB) / (2 * p.dx);
      // Slope ALONG THE FLOW, not the magnitude of the gradient.
      //
      // This is the difference between a drainage network and a sanded-down
      // hillside. Capacity taken from |grad b| is largest on the steep WALLS
      // of a nascent channel, where water is running parallel to the contour
      // and doing nothing — so the walls cut back as fast as the floor and
      // every channel washes flat as soon as it starts. Stream power is
      // discharge times the DOWNSLOPE gradient in the direction of travel,
      // which is zero across a wall, so the floor wins and the channel
      // deepens into itself.
      const dirx = vel > 1e-9 ? ux / vel : 0;
      const diry = vel > 1e-9 ? uy / vel : 0;
      const down = Math.max(0, -(dirx * gx + diry * gy));
      const sinA = down / Math.sqrt(1 + down * down);
      const cap =
        p.kc * Math.max(sinA, p.minSlope) * vel * Math.min(wAvg, p.wCap);

      // Sediment already in the water arrives from upstream. Semi-Lagrangian,
      // so a CFL above 1 degrades into smearing rather than detonating.
      const du = (ux * p.dt) / p.asp;
      const dv = uy * p.dt;
      const sAdv = bilerp(s, W, H, (x + 0.5) / W - du, (y + 0.5) / H - dv);

      const d = cap - sAdv;
      // `dep` is the change to the bed: negative cuts, positive lays down.
      let dep = d > 0 ? -p.ks * d * p.dt : -p.kd * d * p.dt;
      if (dep > sAdv) dep = sAdv; // cannot drop more than is being carried
      let sNew = sAdv - dep;
      if (sNew < 0) sNew = 0;
      let bNew = bc + dep;

      // Hillslope creep. Mass-conserving on the interior: what leaves one
      // cell arrives in its neighbour, because the stencil is symmetric.
      if (creep > 0) bNew += creep * (bL + bR + bB + bT - 4 * bc);

      // Slope failure. Each neighbour pair exchanges whatever exceeds the
      // angle of repose, and the exchange is written from both sides with
      // the same magnitude, so it conserves mass without needing a pass of
      // its own.
      if (reposeRate > 0) {
        const over = (d: number) => (d > maxDrop ? d - maxDrop : 0);
        bNew +=
          reposeRate *
          (over(bL - bc) -
            over(bc - bL) +
            over(bR - bc) -
            over(bc - bR) +
            over(bB - bc) -
            over(bc - bB) +
            over(bT - bc) -
            over(bc - bT));
      }

      // Precipitation. Mountains make their own weather: the orographic
      // term means the high ground is rained on hardest, so the terrain
      // decides where the water that reshapes it lands.
      const u01 = (x + 0.5) / W;
      const v01 = (y + 0.5) / H;
      const fall =
        rainAt(u01, v01, p) *
        p.rain *
        (1 + p.oro * Math.min(1.4, bNew / reliefSafe)) *
        p.dt;
      let sn = snow[i];
      const frozen = smoothstep(lineLo, lineHi, bNew);
      const toSnow = Math.min(fall * frozen, Math.max(0, p.snowMax - sn));
      sn += toSnow;
      wNew += fall - toSnow;
      // Melt runs fastest at the bottom of the transition band and stops
      // above it, so a peak holds its cap until erosion drops it through
      // the line — and then the cap is gone and the meltwater is a pulse.
      const below = Math.max(
        0,
        (lineHi - bNew) / Math.max(lineHi - lineLo, 1e-9)
      );
      const melt = Math.min(sn, p.melt * Math.min(1, below) * p.dt);
      sn -= melt;
      wNew += melt;

      wNew *= evapMul;

      // Tectonics. Without it the table erodes to a plane and an ambient
      // page ends on one; with it erosion and uplift settle into the
      // dynamic equilibrium that real drainage networks live in. It tapers
      // off once the surface has been pushed upMax above its original, so
      // a high uplift setting cannot inflate the range without bound.
      if (p.uplift !== 0) {
        const shape = smoothstep(0.15, 0.6, b0[i] / reliefSafe);
        const room = Math.min(
          1,
          Math.max(0, 1 - (bNew - b0[i]) / Math.max(p.upliftMax, 1e-9))
        );
        bNew += p.uplift * shape * room * p.dt;
      }

      b2[i] = bNew;
      w2[i] = wNew;
      s2[i] = sNew;
      snow2[i] = sn;
    }
  }
  F.b.set(b2);
  F.w.set(w2);
  F.s.set(s2);
  F.snow.set(snow2);
}

/** One full step: route, then rewrite. */
export function step(F: ErosionField, p: ErosionParams): void {
  fluxPass(F, p);
  terrainPass(F, p);
}

/* ------------------------------------------------------- diagnostics */

/** Total water on the table. */
export function totalWater(F: ErosionField): number {
  let t = 0;
  for (let i = 0; i < F.w.length; i++) t += F.w[i];
  return t;
}

/**
 * Discharge per unit width, `|f| * dx` — the transport term of stream power,
 * and exactly what the display pass lights the channels with.
 */
export function dischargeField(F: ErosionField, dx: number): Float32Array {
  const q = new Float32Array(F.b.length);
  for (let i = 0; i < q.length; i++) {
    const o = i * 4;
    const fx = 0.5 * (F.f[o + 1] - F.f[o]);
    const fy = 0.5 * (F.f[o + 3] - F.f[o + 2]);
    q[i] = Math.hypot(fx, fy) * dx;
  }
  return q;
}

/**
 * How dissected the surface is: the spread of terrain height about a local
 * average of it.
 *
 * This is the measure that survived. The obvious one — how concentrated the
 * water is — turned out to track the weather instead of the landscape: storm
 * cells land patchily and then even out, so the number falls over the first
 * minute whether the bed is erodible or made of glass. Dissection asks the
 * question directly. Valleys cutting into a surface raise it; a surface
 * being sanded flat lowers it; a rigid bed does not move it at all.
 */
export function dissection(
  b: Float32Array,
  W: number,
  H: number,
  r = 3
): number {
  let sum = 0;
  let sum2 = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let acc = 0;
      let n = 0;
      for (let j = -r; j <= r; j++)
        for (let i = -r; i <= r; i++) {
          const xx = Math.min(W - 1, Math.max(0, x + i));
          const yy = Math.min(H - 1, Math.max(0, y + j));
          acc += b[yy * W + xx];
          n++;
        }
      const d = b[y * W + x] - acc / n;
      sum += d;
      sum2 += d * d;
    }
  }
  const n = W * H;
  return Math.sqrt(Math.max(0, sum2 / n - (sum / n) ** 2));
}

/** Pearson correlation of two equal-length grids. */
export function correlate(a: Float32Array, b: Float32Array): number {
  const n = a.length;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= n;
  mb /= n;
  let sab = 0;
  let sa = 0;
  let sb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma;
    const db = b[i] - mb;
    sab += da * db;
    sa += da * da;
    sb += db * db;
  }
  return sab / Math.max(1e-30, Math.sqrt(sa * sb));
}

/** True if every cell is finite and water is non-negative. */
export function isHealthy(F: ErosionField): boolean {
  for (let i = 0; i < F.b.length; i++) {
    if (!Number.isFinite(F.b[i])) return false;
    if (!Number.isFinite(F.w[i]) || F.w[i] < 0) return false;
    if (!Number.isFinite(F.s[i]) || F.s[i] < 0) return false;
    if (!Number.isFinite(F.snow[i])) return false;
  }
  for (let i = 0; i < F.f.length; i++) {
    if (!Number.isFinite(F.f[i]) || F.f[i] < 0) return false;
  }
  return true;
}
