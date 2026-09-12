import { describe, it, expect } from 'vitest';
import {
  BLINK_FRACTION,
  CLOSE_TIME,
  CORNEA_L,
  DELTA,
  DOMAIN,
  DRY_H,
  EVAP,
  GRID,
  IFACE_CELLS,
  KAPPA,
  MAX_SUBSTEPS,
  MOBILITY,
  NUCLEATION_MEAN,
  NUCLEUS_SITES,
  NUCLEUS_R_MAX_CELLS,
  NUCLEUS_R_MIN_CELLS,
  OPEN_TIME,
  PRIME_SECONDS,
  REDUCE,
  REFRACTORY,
  SAFETY,
  SPINODAL_ONSET_FRACTION,
  STEP,
  breakupFraction,
  clampMobility,
  criticalRadius,
  criticalRadiusCells,
  gazeFrame,
  filmTick,
  isWiping,
  lidCoverage,
  FALLBACK_BLINK_SECONDS,
  fallbackFraction,
  LID_SPLATS_MAX,
  LID_TRAVEL,
  lidFrame,
  lidSweep,
  mobilityLimit,
  newBlinkState,
  interfaceWidth,
  surfaceTension,
  stepBlink,
  tileInsideCornea,
  worldToLocal,
  type BlinkState,
} from './physics';

describe('tear film constants', () => {
  it('derives the cell size from the domain and grid', () => {
    expect(DOMAIN).toBe(1.2);
    expect(GRID).toBe(96);
    expect(DELTA).toBeCloseTo(0.0125, 12);
    // The reduction tiles must divide the grid exactly, or breakupFraction is
    // measuring tiles of unequal area.
    expect(GRID % REDUCE).toBe(0);
  });

  it('holds the physical interface width while the grid changes', () => {
    // IFACE_CELLS*DELTA — the interface width in tangent units — is the
    // invariant, not either factor. It is what KAPPA and therefore the patch
    // size depend on, so (128, 2.0) and (96, 1.5) are the same physics: the
    // coarser grid buys n^-4 of growth budget and changes nothing visible.
    expect(IFACE_CELLS * DELTA).toBeCloseTo(0.01875, 12);
    expect(IFACE_CELLS * DELTA).toBeCloseTo(2 * (1.2 / 128), 12);
    expect(Math.sqrt(2 * KAPPA)).toBeCloseTo(IFACE_CELLS * DELTA, 12);
  });

  it('caps substeps above what a 60fps frame needs', () => {
    // Derived from the step rate, never a literal: 1.5x a 60fps frame, which
    // is also half of the most the harness's 0.05s dt clamp can ask for, so a
    // slow frame runs the film at reduced speed instead of spiralling.
    expect(MAX_SUBSTEPS).toBe(43);
    expect(MAX_SUBSTEPS * STEP).toBeGreaterThan(1 / 60);
    expect(MAX_SUBSTEPS * STEP).toBeLessThan(0.05);
  });

  it('derives a critical nucleus radius the defects straddle', () => {
    // R* = sigma/dOmega. It must land INSIDE the seeded radius range, or the
    // threshold is never exercised: entirely above and every defect heals,
    // entirely below and every defect survives, which is painting.
    const rStar = criticalRadiusCells(NUCLEATION_MEAN);
    expect(rStar).toBeGreaterThan(NUCLEUS_R_MIN_CELLS);
    expect(rStar).toBeLessThan(NUCLEUS_R_MAX_CELLS);
    // Measured against the reference: seeded defects below ~3.2 cells healed
    // completely and those above ~4.1 survived, at a mean where R* = 3.55.
    expect(criticalRadiusCells(0.92)).toBeCloseTo(3.55, 1);
    expect(criticalRadiusCells(0.95)).toBeCloseTo(5.4, 1);
  });

  it('resolves the critical nucleus on the grid', () => {
    // R* below the interface width is not a nucleus, it is a rounding error,
    // and the threshold stops being sharp. It diverges at the binodal and
    // collapses at the spinodal, so the operating mean has to sit between.
    expect(criticalRadius(NUCLEATION_MEAN)).toBeGreaterThan(interfaceWidth());
    expect(interfaceWidth()).toBeCloseTo(IFACE_CELLS * DELTA, 12);
    expect(surfaceTension()).toBeCloseTo(
      ((4 / 3) * KAPPA) / interfaceWidth(),
      12
    );
  });

  it('holds the film out of the spinodal, where only labyrinths live', () => {
    // The whole point of nucleation here: stay metastable. If the mean ever
    // crossed 1/sqrt(3) the sheet would decompose and the morphology would be
    // the labyrinth that SPINODAL_ONSET_FRACTION documents.
    expect(NUCLEATION_MEAN).toBeGreaterThan(1 / Math.sqrt(3));
    expect((1 - NUCLEATION_MEAN) / 2).toBeLessThan(SPINODAL_ONSET_FRACTION);
  });

  it('primes inside the measured droplet window', () => {
    // Measured on the CPU reference at these constants: dry fraction crosses
    // 10% at t = 0.85 and 30% at t = 3.85, and inside that span the spots are
    // isolated (largest component ~10% of dry area), round (circularity
    // 0.56-0.61 against 0.52 for a perfect digital disc) and isotropic
    // (spectral anisotropy -0.04 to +0.04). Before it they have not grown;
    // after it they percolate into a labyrinth.
    const WINDOW_OPENS = 0.85;
    const WINDOW_CLOSES = 3.85;
    expect(PRIME_SECONDS).toBeGreaterThan(WINDOW_OPENS);
    expect(PRIME_SECONDS).toBeLessThan(WINDOW_CLOSES);
    // And it should not sit against either edge, since EVAP moves the window.
    expect(PRIME_SECONDS).toBeGreaterThan(WINDOW_OPENS + 0.5);
    expect(PRIME_SECONDS).toBeLessThan(WINDOW_CLOSES - 0.5);
    // The window scales as 1/EVAP — the lever-rule estimate 0.4/EVAP is 2.67s
    // against the 3.0s measured. Raising EVAP shrinks it, and these bounds
    // would then have to be re-measured rather than widened.
    expect(0.4 / EVAP).toBeGreaterThan(2);
  });

  it('sets kappa from the interface width in cells', () => {
    // Interface half-width is sqrt(2*kappa); we want it to be IFACE_CELLS cells.
    expect(Math.sqrt(2 * KAPPA)).toBeCloseTo(IFACE_CELLS * DELTA, 12);
  });

  it('keeps the mobility below the explicit biharmonic stability limit', () => {
    // Explicit Euler on -M*kappa*grad^4: the 5-point Laplacian has eigenvalues
    // in [-8/d^2, 0], so grad^4 reaches 64/d^4, and stability needs
    // dt*M*kappa*64/d^4 <= 2, i.e. M <= d^4 / (32*dt*kappa).
    const limit = Math.pow(DELTA, 4) / (32 * STEP * KAPPA);
    expect(mobilityLimit()).toBeCloseTo(limit, 15);
    expect(MOBILITY).toBeLessThan(limit);
    expect(MOBILITY).toBeCloseTo(SAFETY * limit, 15);
  });

  it('clamps mobility from above, below and from garbage', () => {
    expect(clampMobility(1)).toBeCloseTo(mobilityLimit(), 15);
    expect(clampMobility(MOBILITY)).toBeCloseTo(MOBILITY, 15);
    expect(clampMobility(-5)).toBeGreaterThan(0);
    expect(clampMobility(Number.NaN)).toBeCloseTo(MOBILITY, 15);
  });

  it('resolves the three lengths the mechanism depends on', () => {
    // GRID is justified by what has to fit on it, not by a growth budget.
    // Interface < critical nucleus < site spacing, all resolved, in that
    // order — if they collide the threshold stops being sharp.
    const iface = interfaceWidth() / DELTA;
    const rStar = criticalRadiusCells(NUCLEATION_MEAN);
    const spacing = DOMAIN / NUCLEUS_SITES / DELTA;
    expect(iface).toBeCloseTo(1.5, 6);
    expect(rStar).toBeGreaterThan(iface);
    expect(spacing).toBeGreaterThan(4 * rStar);
    expect(spacing).toBeCloseTo(13.7, 1);
  });

  it('puts the cornea inside the domain with margin', () => {
    expect(CORNEA_L).toBeCloseTo(Math.sin(0.6), 12);
    expect(CORNEA_L).toBeLessThan(DOMAIN / 2);
  });
});

describe('break-up fraction', () => {
  const size = REDUCE;
  const TILE = GRID / size;
  /** Every input texel is one tile's dry area share, so wet film is all zeros. */
  const wet = () => new Float32Array(size * size);

  /**
   * The reduction pass, on the CPU: reduce a full GRID^2 field of `h` to the
   * per-tile dry means the GPU pass emits, so the statistic can be checked
   * against a field whose dry area is known exactly rather than against
   * hand-written tile values.
   */
  const reduce = (h: Float32Array) => {
    const t = new Float32Array(size * size);
    for (let tj = 0; tj < size; tj++) {
      for (let ti = 0; ti < size; ti++) {
        let dry = 0;
        for (let j = 0; j < TILE; j++) {
          for (let i = 0; i < TILE; i++) {
            if (h[(tj * TILE + j) * GRID + (ti * TILE + i)] <= DRY_H) dry++;
          }
        }
        t[tj * size + ti] = dry / (TILE * TILE);
      }
    }
    return t;
  };

  it('counts only tiles whose centre lies on the cornea', () => {
    // Corner tiles sit outside the cap and must never be counted.
    expect(tileInsideCornea(0, 0, size)).toBe(false);
    expect(tileInsideCornea(size - 1, size - 1, size)).toBe(false);
    // Centre tiles are always on it.
    expect(tileInsideCornea(size / 2, size / 2, size)).toBe(true);
  });

  it('is zero for a fully wet film', () => {
    expect(breakupFraction(wet())).toBe(0);
  });

  it('is one when every corneal tile has torn', () => {
    expect(breakupFraction(new Float32Array(size * size).fill(1))).toBe(1);
  });

  it('ignores dry area that falls outside the cornea', () => {
    const t = wet();
    t[0] = 1; // a corner, off the cap
    expect(breakupFraction(t)).toBe(0);
  });

  it('uses the dry threshold, not the sign of h', () => {
    const h = new Float32Array(GRID * GRID).fill(1);
    const centre = (GRID / 2) * GRID + GRID / 2;
    h[centre] = DRY_H + 0.01; // thinning, not yet torn
    expect(breakupFraction(reduce(h))).toBe(0);
    h[centre] = DRY_H - 0.01;
    expect(breakupFraction(reduce(h))).toBeGreaterThan(0);
  });

  /**
   * **The statistic is an exact area fraction, and that is the point.** The
   * first draft took `min(h)` per tile, so one patch anywhere in a 12x12 tile
   * marked all 144 cells dry. Against patches about 12.6 cells across that
   * saturates to ~1.0 while the cornea is nearer a tenth dry, and shrinking
   * the tiles saturates it harder. Here a synthetic field with a known dry
   * area is reduced by the shipped tile arithmetic and has to come back as
   * that area, to the resolution of a cell.
   */
  it('reads back the true dry area of a synthetic field', () => {
    // Dry every cell whose tangent radius is under r, and count how many of
    // those fall in tiles the measurement actually looks at, so the expected
    // value is the same corneal region breakupFraction() averages over.
    for (const r of [0.1, 0.2, 0.3, CORNEA_L]) {
      const h = new Float32Array(GRID * GRID).fill(1);
      let dry = 0;
      let on = 0;
      for (let j = 0; j < GRID; j++) {
        for (let i = 0; i < GRID; i++) {
          const inTile = tileInsideCornea(
            Math.floor(i / TILE),
            Math.floor(j / TILE),
            size
          );
          if (inTile) on++;
          const x = DOMAIN * ((i + 0.5) / GRID - 0.5);
          const y = DOMAIN * ((j + 0.5) / GRID - 0.5);
          if (Math.hypot(x, y) <= r) {
            h[j * GRID + i] = -1;
            if (inTile) dry++;
          }
        }
      }
      // Exact up to storage: both sides are the same count of cells over the
      // same count of cells, and the only slack is that the tile fractions
      // arrive in a Float32Array — which is what the readback hands back too.
      expect(breakupFraction(reduce(h))).toBeCloseTo(dry / on, 8);
    }
  });

  it('stays an area mean where a minimum would saturate', () => {
    // One dry cell per tile: a per-tile minimum reads 1.0, an area mean reads
    // 1/144. This is the failure the statistic was changed to remove.
    const h = new Float32Array(GRID * GRID).fill(1);
    for (let tj = 0; tj < size; tj++) {
      for (let ti = 0; ti < size; ti++) {
        h[tj * TILE * GRID + ti * TILE] = -1;
      }
    }
    expect(breakupFraction(reduce(h))).toBeCloseTo(1 / (TILE * TILE), 8);
  });

  it('returns zero rather than NaN for a degenerate grid', () => {
    expect(breakupFraction(new Float32Array(0), 0)).toBe(0);
  });
});

describe('blink state machine', () => {
  const run = (s: BlinkState, seconds: number, fraction: number) => {
    let cur = s;
    const dt = 1 / 60;
    for (let i = 0; i < Math.round(seconds / dt); i++) {
      cur = stepBlink(cur, dt, fraction);
    }
    return cur;
  };

  it('starts open and stays open while the film holds', () => {
    const s = run(newBlinkState(), 30, 0);
    expect(s.phase).toBe('open');
    expect(lidCoverage(s)).toBe(0);
  });

  it('closes once the measured fraction crosses the threshold', () => {
    const s = stepBlink(newBlinkState(), 1 / 60, BLINK_FRACTION + 0.01);
    expect(s.phase).toBe('closing');
  });

  it('does not close one tick below the threshold', () => {
    const s = stepBlink(newBlinkState(), 1 / 60, BLINK_FRACTION - 0.01);
    expect(s.phase).toBe('open');
  });

  it('reaches full coverage at the end of the closing phase', () => {
    let s = stepBlink(newBlinkState(), 1 / 60, 1);
    s = run(s, CLOSE_TIME, 1);
    expect(lidCoverage(s)).toBeCloseTo(1, 1);
  });

  it('re-opens and returns to rest', () => {
    let s = stepBlink(newBlinkState(), 1 / 60, 1);
    s = run(s, CLOSE_TIME + OPEN_TIME + 0.05, 0);
    expect(s.phase).toBe('open');
    expect(lidCoverage(s)).toBe(0);
  });

  // NOTE: this walk is 0.29s at dt=1/60 = 17 steps, and the opening phase ends
  // at 11/60 = 0.18333 against OPEN_TIME = 0.18 — true by 3ms, which floating
  // point summation of 1/60 six times erodes (it lands a hair under
  // CLOSE_TIME, costing an extra step). Widened to 0.02 so the wait always
  // covers the drifted 18-step cycle; do NOT move OPEN_TIME to suit it.
  it('refuses to re-blink inside the refractory window', () => {
    // Hold the fraction pinned high the whole time: a chattering measurement
    // must not produce a chattering lid.
    let s = stepBlink(newBlinkState(), 1 / 60, 1);
    s = run(s, CLOSE_TIME + OPEN_TIME + 0.02, 1);
    expect(s.phase).toBe('open');
    const before = s.since;
    s = run(s, REFRACTORY * 0.5, 1);
    expect(s.phase).toBe('open');
    expect(s.since).toBeGreaterThan(before);
    // NOT a further full REFRACTORY: from `before` (~0.3s) that leaves ~45
    // spare steps after the retrigger — enough to run an entire close/open
    // cycle (18 steps) and land back on 'open', which would look identical
    // to "never re-blinked". 0.5s clears the REFRACTORY threshold
    // (before + REFRACTORY*0.5 + 0.5 > REFRACTORY) with room to spare, but
    // ends inside the closing phase, catching the retrigger itself.
    s = run(s, 0.5, 1);
    expect(s.phase).toBe('closing');
  });

  it('wipes only while the lid is travelling', () => {
    expect(isWiping(newBlinkState())).toBe(false);
    const s = stepBlink(newBlinkState(), 1 / 60, 1);
    expect(isWiping(s)).toBe(true);
  });
});

describe('gaze frame', () => {
  it('is the identity when the eye looks straight out', () => {
    const { tx, ty, gd } = gazeFrame(0, 0);
    expect(gd).toEqual([0, 0, 1]);
    expect(tx[0]).toBeCloseTo(1, 12);
    expect(tx[1]).toBeCloseTo(0, 12);
    expect(ty[0]).toBeCloseTo(0, 12);
    expect(ty[1]).toBeCloseTo(1, 12);
    expect(worldToLocal(0, 1, 0, 0)[1]).toBeCloseTo(1, 12);
    expect(worldToLocal(1, 0, 0, 0)[0]).toBeCloseTo(1, 12);
  });

  it('keeps the basis orthonormal at an off-axis gaze', () => {
    const { tx, ty, gd } = gazeFrame(0.5, -0.3);
    const dot = (a: number[], b: number[]) =>
      a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    expect(dot(tx, tx)).toBeCloseTo(1, 12);
    expect(dot(ty, ty)).toBeCloseTo(1, 12);
    expect(dot(gd, gd)).toBeCloseTo(1, 12);
    expect(dot(tx, ty)).toBeCloseTo(0, 12);
    expect(dot(tx, gd)).toBeCloseTo(0, 12);
    expect(dot(ty, gd)).toBeCloseTo(0, 12);
  });

  it('never lengthens a world vector', () => {
    // A projection onto a tangent plane can only shorten.
    const [lx, ly] = worldToLocal(0, 1, 0.6, 0.4);
    expect(Math.hypot(lx, ly)).toBeLessThanOrEqual(1 + 1e-12);
  });

  it('foreshortens gravity as the eye looks up', () => {
    // tx = cross([0,1,0], gd) has y-component a2*b0 - a0*b2 = 0 identically, so
    // tx[1] is always 0 and a world-down vector can never pick up a local-x
    // component. Under this basis gravity foreshortens; it never shears.
    const [lx, ly] = worldToLocal(0, 1, 0, 0.8);
    expect(lx).toBeCloseTo(0, 12);
    expect(ly).toBeCloseTo(0.8418, 3);
    expect(ly).toBeLessThan(1);
  });

  it('foreshortens a sideways vector as the eye looks aside', () => {
    const [lx] = worldToLocal(1, 0, 0.8, 0);
    expect(lx).toBeCloseTo(0.8423, 3);
    expect(lx).toBeLessThan(1);
  });
});

describe('lid geometry', () => {
  it('clears the field at both ends of the travel', () => {
    // Half the diagonal, so the half-plane covers the square corners and not
    // only the disc, whatever angle the gaze leaves the sweep at.
    expect(LID_TRAVEL).toBeGreaterThan(DOMAIN / 2);
    const open = lidFrame(0, 0, 0);
    const shut = lidFrame(1, 0, 0);
    expect(open.edge[1]).toBeCloseTo(-LID_TRAVEL, 12);
    expect(shut.edge[1]).toBeCloseTo(LID_TRAVEL, 12);
    // Nothing is covered at 0: the whole field is in front of the edge.
    const corner: [number, number] = [DOMAIN / 2, -DOMAIN / 2];
    const ahead =
      (corner[0] - open.edge[0]) * open.normal[0] +
      (corner[1] - open.edge[1]) * open.normal[1];
    expect(ahead).toBeLessThan(0);
  });

  it('crosses the middle of the field at half coverage', () => {
    const mid = lidFrame(0.5, 0.4, -0.2);
    expect(mid.edge[0]).toBeCloseTo(0, 12);
    expect(mid.edge[1]).toBeCloseTo(0, 12);
  });

  it('points the normal at the side already swept', () => {
    // World down is (0, 1), so the covered side is up and the normal is -y.
    const { normal } = lidFrame(0.5, 0, 0);
    expect(normal[0]).toBeCloseTo(0, 12);
    expect(normal[1]).toBeCloseTo(-1, 12);
  });

  it('keeps the normal a unit vector at every gaze', () => {
    // Renormalised after the projection: worldToLocal foreshortens, and a
    // short normal would shorten the sweep instead of tilting it.
    for (const [gx, gy] of [
      [0, 0],
      [0.75, 0],
      [0, -0.7],
      [-0.6, 0.5],
    ]) {
      const { normal } = lidFrame(0.5, gx, gy);
      expect(Math.hypot(normal[0], normal[1])).toBeCloseTo(1, 12);
    }
  });

  it('holds the sweep square to the world at every gaze', () => {
    // The basis is built with tx = cross(worldUp, gaze), so tx[1] is
    // identically zero and world down projects onto ty alone. The lid's local
    // normal therefore comes out (0, -1) for every gaze — which is the whole
    // reason the band reads as horizontal on screen while the eye moves. It is
    // an invariant of the basis, not a coincidence: build tx any other way and
    // this test is what fails.
    for (const [gx, gy] of [
      [0.75, 0],
      [0, -0.7],
      [-0.6, 0.5],
    ]) {
      const { normal } = lidFrame(0.5, gx, gy);
      expect(normal[0]).toBeCloseTo(0, 12);
      expect(normal[1]).toBeCloseTo(-1, 12);
    }
  });

  it('does not let the projection foreshorten the travel', () => {
    // worldToLocal shortens world down as the eye looks up — 0.84 at gy = 0.8.
    // Left unnormalised the lid would stop short of the far corner and leave a
    // crescent of stale film behind it.
    expect(Math.hypot(...worldToLocal(0, 1, 0, 0.8))).toBeLessThan(0.9);
    expect(lidFrame(1, 0, 0.8).edge[1]).toBeCloseTo(LID_TRAVEL, 12);
  });

  it('steps the sweep finely enough that the soft front never jumps', () => {
    // A 60fps closing frame moves the edge about a sixth of the travel.
    const poses = lidSweep(0, 1 / 6, 0, 0);
    expect(poses.length).toBeGreaterThan(1);
    for (let k = 1; k < poses.length; k++) {
      const step = Math.hypot(
        poses[k].edge[0] - poses[k - 1].edge[0],
        poses[k].edge[1] - poses[k - 1].edge[1]
      );
      // Inside the ~3-cell soft front, so successive splats overlap.
      expect(step).toBeLessThanOrEqual(2 * DELTA + 1e-12);
    }
  });

  it('ends the sweep exactly where the frame ended', () => {
    const poses = lidSweep(0.2, 0.8, 0, 0);
    const last = poses[poses.length - 1];
    expect(last.edge[1]).toBeCloseTo(lidFrame(0.8, 0, 0).edge[1], 12);
  });

  it('caps the sweep so a stalled frame degrades instead of spending', () => {
    expect(lidSweep(0, 1, 0, 0).length).toBeLessThanOrEqual(LID_SPLATS_MAX);
    expect(lidSweep(0, 1, 0, 0).length).toBe(LID_SPLATS_MAX);
  });

  it('still lays one splat when the lid did not move', () => {
    expect(lidSweep(0.5, 0.5, 0, 0)).toHaveLength(1);
  });
});

describe('the film clock', () => {
  it('buys less film time than wall time once frames are slow', () => {
    // The invariant the blink depends on. A 60fps frame is integrated whole; a
    // slower one is capped, so the field falls behind the wall by a factor
    // that changes with the frame rate. Everything below exists because that
    // factor is not 1.
    const cap = MAX_SUBSTEPS * STEP;
    expect(filmTick(0, 1 / 60).ran).toBeCloseTo(1 / 60, 3);
    expect(filmTick(0, 1 / 15).ran).toBeCloseTo(cap, 6);
    expect(filmTick(0, 0.05).ran).toBeCloseTo(cap, 6);
    expect(cap).toBeLessThan(0.05);
  });

  it('carries the remainder rather than dropping or inventing time', () => {
    let acc = 0;
    let ran = 0;
    for (let k = 0; k < 600; k++) {
      const t = filmTick(acc, 1 / 60);
      acc = t.acc;
      ran += t.ran;
    }
    // Ten seconds of 60fps frames, all under the cap, so none is lost: the
    // total is the elapsed time to within the backlog still in hand.
    expect(ran).toBeGreaterThan(10 - STEP * 2);
    expect(ran).toBeLessThanOrEqual(10);
    expect(acc).toBeLessThan(STEP);
  });

  it('never integrates more than the cap in one frame', () => {
    // A stalled frame degrades instead of taking the next frame's budget with
    // it, which is what keeps a slow machine slow rather than stuck.
    expect(filmTick(0, 10).steps).toBeLessThanOrEqual(MAX_SUBSTEPS);
    expect(filmTick(1, 1).steps).toBeLessThanOrEqual(MAX_SUBSTEPS);
  });
});

/**
 * Drive the shipped pieces exactly as `simulate()` does on the **degraded**
 * path — `filmTick` for the clock, `fallbackFraction` for the trigger,
 * `stepBlink` for the lid, with the film time carried one frame the way the
 * animation carries it.
 *
 * The measured path cannot be driven without a GL context, so what these tests
 * pin is the wiring the two paths share: that the lid runs on the film's clock
 * and not the wall's, which was a real bug. The measured path's own cadence is
 * verified against the CPU reference — see `BLINK_FRACTION`.
 *
 * Deterministic, and it needs no GL context, no paint and no foreground tab.
 */
function runBlinks(
  dt: number,
  seconds: number
): { wall: number; film: number }[] {
  // The harness clamps its own frame time before the animation sees it.
  const clamped = Math.min(0.05, dt);
  let blink: BlinkState = newBlinkState();
  let acc = 0;
  let filmDt = 0;
  let film = PRIME_SECONDS;
  let wall = 0;
  const fires: { wall: number; film: number }[] = [];
  for (let k = 0; k < Math.round(seconds / dt); k++) {
    const before = blink;
    blink = stepBlink(before, filmDt, fallbackFraction(before.since));
    if (before.phase === 'open' && blink.phase !== 'open') {
      fires.push({ wall, film });
    }
    const tick = filmTick(acc, clamped);
    acc = tick.acc;
    filmDt = tick.ran;
    film += tick.ran;
    wall += dt;
  }
  return fires;
}

describe('blink cadence', () => {
  it('lets the primed field be seen before the first sweep', () => {
    // Spec D11: the eye loads mid-cycle with real structure, and a lid that
    // fired on the first frame would wipe that structure away before anyone
    // saw it. `since` starts at REFRACTORY, so the degraded path's first blink
    // lands FALLBACK_BLINK_SECONDS - REFRACTORY film seconds after load — a
    // beat of primed field first, and short of a full interval, which is right
    // for a field that is already PRIME_SECONDS old when it appears.
    const [first] = runBlinks(1 / 60, 60);
    expect(first.film).toBeGreaterThan(PRIME_SECONDS);
    expect(first.film - PRIME_SECONDS).toBeCloseTo(
      FALLBACK_BLINK_SECONDS - REFRACTORY,
      1
    );
    expect(first.wall).toBeGreaterThan(0);
  });

  it('fires while the dry phase is still a minority', () => {
    // **The constraint the threshold exists to satisfy.** Under nucleation the
    // film goes isolated droplets -> coarsening -> percolation, and a lid that
    // fires after percolation holds it there forever, because every cycle
    // starts from the same wipe. The window is the trace in PRIME_SECONDS'
    // comment: dry 0.104 at t = 0.85 when it opens, 0.295 at t = 3.85 when the
    // spots start merging.
    expect(BLINK_FRACTION).toBeGreaterThan(0.104);
    expect(BLINK_FRACTION).toBeLessThan(0.295);
    // And above the dryness the primed field already carries at load, or the
    // eye is wiped before anyone has seen it.
    expect(BLINK_FRACTION).toBeGreaterThan(0.194);
  });

  it('holds a steady interblink interval at every frame time', () => {
    // The interval is the claim, not the absolute time of the nth blink:
    // `since` resets to zero on a trigger and discards whatever overshot the
    // threshold, so a coarse clock's leftovers accumulate as a slow drift in
    // when the nth blink lands. The gap between blinks does not drift, which
    // is what a cadence means.
    for (const dt of [1 / 60, 1 / 30, 1 / 15, 1 / 8]) {
      const fires = runBlinks(dt, 60);
      expect(fires.length).toBeGreaterThan(3);
      for (let k = 1; k < fires.length; k++) {
        const gap = fires[k].film - fires[k - 1].film;
        // At worst two of the coarse clock's own frames of overshoot: the
        // threshold can only be crossed on a substep boundary, and the film
        // time reaches the lid a frame late — the same lag the gaze has.
        expect(gap).toBeGreaterThanOrEqual(FALLBACK_BLINK_SECONDS);
        expect(gap).toBeLessThan(
          FALLBACK_BLINK_SECONDS + 2 * MAX_SUBSTEPS * STEP
        );
      }
    }
  });

  it('keeps the interval in FILM time when the frame time changes', () => {
    // **This is the regression.** The blink stands in for a measurement of the
    // field, so it has to age with the field. Driven from `dt` instead, the
    // trigger's clock and the film's clock are throttled by different factors
    // and the lid fires at a dryness that depends on the frame rate. Measured
    // against the old wiring: at 1/15 the interval collapses to 1.57 film
    // seconds against 3.03 at 1/60, and the first blink moves by 0.29 — 58x
    // and 11x this tolerance respectively.
    const gapOf = (dt: number) => {
      const f = runBlinks(dt, 60);
      return (f[f.length - 1].film - f[0].film) / (f.length - 1);
    };
    const fine = gapOf(1 / 60);
    for (const dt of [1 / 30, 1 / 15, 1 / 8]) {
      expect(Math.abs(gapOf(dt) - fine)).toBeLessThan(MAX_SUBSTEPS * STEP);
    }
    // And the first blink lands at the same dryness, to within two frames of
    // the coarse clock: the threshold can only be crossed on a substep
    // boundary, and the film time reaches the lid a frame late. The bug this
    // pins moved it by 0.29 — nearly six times this tolerance.
    expect(
      Math.abs(runBlinks(1 / 15, 60)[0].film - runBlinks(1 / 60, 60)[0].film)
    ).toBeLessThan(2 * MAX_SUBSTEPS * STEP);
  });

  it('takes longer in WALL time when the frame time changes, and must', () => {
    // The other half of the same fact, asserted so the invariance test above
    // cannot pass by the clocks having quietly become the same thing again.
    const fast = runBlinks(1 / 60, 60);
    const slow = runBlinks(1 / 15, 60);
    expect(slow[0].wall).toBeGreaterThan(fast[0].wall * 1.5);
    expect(slow.length).toBeLessThan(fast.length);
  });
});
