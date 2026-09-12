import { describe, it, expect } from 'vitest';
import {
  BLINK_FRACTION,
  CAUSTIC_MAX,
  CORNEA_ETA,
  FILM_LENS,
  TEAR_FILM_MM,
  MM_PER_UNIT,
  JACOBIAN_STEP,
  N_CORNEA,
  IRIS_DEPTH,
  causticFocus,
  cornealMagnification,
  irisJacobian,
  irisPoint,
  refract,
  CLOSE_TIME,
  CORNEA_ANG,
  CORNEA_L,
  DELTA,
  DOMAIN,
  DRY_H,
  EVAP,
  FILM_REACH,
  FILM_REACH_FADE,
  FILM_SLOPE,
  DRY_DIM,
  WET_H,
  filmReach,
  surfaceDim,
  wetness,
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

/**
 * Where the specular lands, in the tangent frame the film lives in.
 *
 * `eyeW` lights the globe with `normalize(vec3(-0.45, -0.55, 0.85))` and the
 * sharp term is `pow(dot(n, ld), 48.0)`, so the highlight peaks exactly where
 * the surface normal equals the light. At rest the gaze frame is the identity
 * (pinned by 'is the identity when the eye looks straight out'), so the
 * tangent coordinate of that point is just the light's own xy.
 */
const LIGHT = (() => {
  const v = [-0.45, -0.55, 0.85];
  const n = Math.hypot(v[0], v[1], v[2]);
  return { x: v[0] / n, y: v[1] / n, z: v[2] / n };
})();

/** The specular lobe is down to half here: 0.5^(1/48) = cos(0.169 rad). */
const LOBE_HALF = Math.acos(Math.pow(0.5, 1 / 48));

describe('the film reaches the catchlight', () => {
  it('puts the catchlight outside the corneal cap, which is why the mask is a square', () => {
    // The finding the whole shape of `filmReach` rests on. If this ever stops
    // being true — the light moves, or the cap grows — the square mask has no
    // reason to exist and a circular one is the simpler thing.
    const lr = Math.hypot(LIGHT.x, LIGHT.y);
    const ang = Math.acos(LIGHT.z);
    expect(lr).toBeCloseTo(0.64, 2);
    expect(ang).toBeCloseTo(0.696, 2);
    expect(ang).toBeGreaterThan(CORNEA_ANG);
    expect(lr).toBeGreaterThan(CORNEA_L);
    // And no streak-free circular mask reaches it either: the largest circle
    // that never leaves the square domain has radius DOMAIN/2.
    expect(lr).toBeGreaterThan(DOMAIN / 2);
  });

  it('reads the film at full strength at the centre of the highlight', () => {
    expect(filmReach(LIGHT.x, LIGHT.y)).toBeGreaterThan(0.98);
  });

  it('carries the film across most of the lobe, not just its peak', () => {
    // Integrate pow(dot(n, ld), 48.0) over the visible globe and ask what
    // share of the catchlight's energy the mask actually lets the film drive.
    // A peak-only assertion would pass with a mask that clipped everything
    // around it, which is the failure that reads as a hard-edged highlight.
    const N = 600;
    let total = 0;
    let filmed = 0;
    for (let a = 0; a < N; a++) {
      for (let b = 0; b < N; b++) {
        const lx = -1 + (2 * (a + 0.5)) / N;
        const ly = -1 + (2 * (b + 0.5)) / N;
        const r2 = lx * lx + ly * ly;
        if (r2 >= 1) continue;
        const d = lx * LIGHT.x + ly * LIGHT.y + Math.sqrt(1 - r2) * LIGHT.z;
        if (d <= 0) continue;
        const w = Math.pow(d, 48);
        total += w;
        filmed += w * filmReach(lx, ly);
      }
    }
    // Measured 0.649 at these constants. The rest is the lobe's outer tail
    // running off the field's square, where it keeps the painted highlight.
    expect(filmed / total).toBeGreaterThan(0.6);
  });
});

describe('the film mask', () => {
  it('never lets a tap leave the texels the simulation wrote', () => {
    // The outermost texel centre, and the three taps the display takes: the
    // value and two forward differences one cell out. FILM_REACH is derived
    // to make the furthest of those land exactly on the last centre, so this
    // is an equality and not a margin.
    const lastCentre = DOMAIN / 2 - DELTA / 2;
    expect(FILM_REACH + DELTA).toBeCloseTo(lastCentre, 12);
    // Past the reach the mask is off, so nothing samples the clamp.
    expect(filmReach(FILM_REACH, 0)).toBe(0);
    expect(filmReach(0, FILM_REACH)).toBe(0);
    expect(filmReach(DOMAIN, DOMAIN)).toBe(0);
  });

  it('fades rather than cliff-edges', () => {
    // A cliff would draw the mask's own boundary into the sheen. Walk the
    // fade and require every step to be small: over a tenth of the fade width
    // the mask may not move by more than a fifth.
    let prev = filmReach(FILM_REACH - FILM_REACH_FADE * 1.2, 0);
    let worst = 0;
    for (let k = 1; k <= 60; k++) {
      const m =
        FILM_REACH - FILM_REACH_FADE * 1.2 + (k / 60) * FILM_REACH_FADE * 1.4;
      const v = filmReach(m, 0);
      worst = Math.max(worst, Math.abs(v - prev));
      expect(v).toBeLessThanOrEqual(prev + 1e-12);
      prev = v;
    }
    expect(worst).toBeLessThan(0.2);
    // Half way through the fade it is half on, which is what makes the
    // boundary a gradient a dry patch can straddle.
    expect(filmReach(FILM_REACH - FILM_REACH_FADE / 2, 0)).toBeCloseTo(0.5, 6);
    // And it is several cells wide, so the boundary is a gradient across a
    // handful of texels rather than one.
    expect(FILM_REACH_FADE / DELTA).toBeGreaterThanOrEqual(3);
  });

  it('is fully on across the iris and the limbus, in every direction', () => {
    // The mask may eat the outer sliver of the corneal cap — the field is only
    // 6% wider than the cap, so along the axes there is nothing to spare — but
    // it must not touch the limbus or anything inside it. eye.ts rings the
    // limbus at ang = 0.56, which is |l| = sin(0.56).
    const limbusL = Math.sin(0.56);
    expect(limbusL).toBeLessThan(CORNEA_L);
    for (let k = 0; k < 720; k++) {
      const a = (k / 720) * Math.PI * 2;
      expect(filmReach(Math.cos(a) * limbusL, Math.sin(a) * limbusL)).toBe(1);
    }
    // Which is exactly the constraint that sets the fade width: the fade may
    // not begin before the limbus.
    expect(FILM_REACH - FILM_REACH_FADE).toBeGreaterThanOrEqual(limbusL);
    // And what it costs is the annulus out to CORNEA_ANG, where the limbus
    // glow and the corneal shadow ring already live.
    expect(filmReach(CORNEA_L, 0)).toBeLessThan(1);
    expect(CORNEA_ANG).toBeGreaterThan(0.56);
  });
});

describe('wetness', () => {
  it('reads the wells as fully wet and fully dry', () => {
    expect(wetness(1)).toBe(1);
    expect(wetness(-1)).toBe(0);
  });

  it('goes dark at exactly the threshold the measurement counts as torn', () => {
    // The tie that makes the eye honest: a patch the reduction pass counts
    // toward BLINK_FRACTION is exactly a patch that has lost its sheen. If
    // these drifted apart the lid would fire on something nobody can see.
    expect(wetness(DRY_H)).toBe(0);
    expect(wetness(DRY_H - 0.01)).toBe(0);
    expect(wetness(DRY_H + 0.01)).toBeGreaterThan(0);
    expect(wetness(WET_H)).toBe(1);
  });

  it('rises monotonically and only across the interface', () => {
    let prev = -1;
    for (let k = 0; k <= 200; k++) {
      const h = -1 + (k / 200) * 2;
      const w = wetness(h);
      expect(w).toBeGreaterThanOrEqual(prev);
      prev = w;
    }
    // The ramp lives between the wells, not on the flat film either side:
    // fresh film at h = 1 and a settled dry patch at h = -1 are both
    // saturated, so the sheen only changes where the film is actually
    // breaking.
    expect(WET_H).toBeLessThan(1);
    expect(DRY_H).toBeGreaterThan(-1);
  });
});

describe('the film slope', () => {
  /**
   * Gradient magnitudes measured on a CPU mirror of the two shipped passes at
   * PRIME_SECONDS, over the cornea, with the one-cell forward difference the
   * display uses. See FILM_SLOPE.
   */
  const WET_G = { p50: 2.05, p90: 14.82, p99: 42.08 };

  it('leaves the shape of the wet sheet alone', () => {
    // The median of the wet film must not move the highlight: a catchlight
    // that dissolved into noise everywhere would read as a broken shader, not
    // as a wet eye. A tenth of the lobe's half-width is the budget.
    expect(WET_G.p50 * FILM_SLOPE).toBeLessThan(LOBE_HALF * 0.15);
  });

  it('cuts the highlight apart at the rims of the dry patches', () => {
    // And the p90 and above, which is the raised rim around each dry spot,
    // must carry the normal clear of the lobe. This is the difference between
    // a film that tears visibly and one that only tears in the debug view.
    expect(WET_G.p90 * FILM_SLOPE).toBeGreaterThan(LOBE_HALF * 0.5);
    expect(WET_G.p99 * FILM_SLOPE).toBeGreaterThan(LOBE_HALF);
  });

  it('never folds the normal over', () => {
    // Even the worst gradient the field can hold — a full well-to-well step
    // across one cell — has to stay a tilt rather than flipping the normal
    // through the surface, where the specular would come back inverted.
    expect((2 / DELTA) * FILM_SLOPE).toBeLessThan(Math.PI / 2);
  });
});

describe('the smooth-bilinear fetch', () => {
  /** The display's reconstruction: filmUV's smoothstep, then LINEAR. */
  const smooth = (t: number[], p: number) => {
    const i = Math.floor(p);
    const f0 = p - i;
    const f = f0 * f0 * (3 - 2 * f0);
    return t[i] * (1 - f) + t[i + 1] * f;
  };
  /** What a plain fetch would give, for contrast. */
  const linear = (t: number[], p: number) => {
    const i = Math.floor(p);
    const f = p - i;
    return t[i] * (1 - f) + t[i + 1] * f;
  };
  const slope = (
    fn: (t: number[], p: number) => number,
    t: number[],
    p: number
  ) => {
    const e = 1e-5;
    return (fn(t, p + e) - fn(t, p - e)) / (2 * e);
  };
  // A kink at texel 2: the gradient a plain fetch reports jumps from 1 to 2
  // across the boundary, and pow(dot, 48.0) would draw that jump.
  const T = [0, 0, 1, 3, 3];

  it('reproduces the field exactly at the texel centres', () => {
    for (let i = 0; i < T.length - 1; i++)
      expect(smooth(T, i)).toBeCloseTo(T[i], 12);
  });

  it('is C1 at the cell boundary where a plain fetch is not', () => {
    const l = slope(smooth, T, 2 - 1e-3);
    const r = slope(smooth, T, 2 + 1e-3);
    expect(Math.abs(l - r)).toBeLessThan(0.02);
    // The failure it is there to prevent, asserted so the comparison is real.
    const ll = slope(linear, T, 2 - 1e-3);
    const lr = slope(linear, T, 2 + 1e-3);
    expect(Math.abs(ll - lr)).toBeCloseTo(1, 6);
  });

  it('costs at most half a cell of extra blur', () => {
    // Smoothstep pulls the sample toward the nearer texel centre. The pull is
    // bounded by a quarter cell, so the field is softened, not displaced --
    // a bigger shift would move the dry patches away from where the
    // measurement says they are.
    let worst = 0;
    for (let k = 0; k <= 100; k++) {
      const f = k / 100;
      worst = Math.max(worst, Math.abs(f * f * (3 - 2 * f) - f));
    }
    expect(worst).toBeLessThanOrEqual(0.25 + 1e-9);
  });
});

/**
 * The sclera, shaded on the CPU exactly as `eyeW` shades it, so the question
 * "does a dry patch actually change the pixel" can be answered in a number
 * instead of a screenshot.
 *
 * The texture terms — the vein fbm and the grain — collapse into one `noise`
 * parameter in [0, 1]; `noise = 0` is the brightest the sclera ever gets,
 * which is the pixel this is about. `visionary()` is not ported, so rows on
 * the iris stand in a mid-tone for it and are indicative only.
 */
function scleraPixel(
  lx: number,
  ly: number,
  wet: number,
  noise: number,
  dim: number = DRY_DIM
) {
  const CREAM = [1.0, 243 / 255, 227 / 255];
  const ELEC = [0.3, 0.55, 1.0];
  const ss = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const mix3 = (a: number[], b: number[], t: number) =>
    a.map((x, i) => x + (b[i] - x) * t);
  const lz = Math.sqrt(Math.max(0, 1 - lx * lx - ly * ly));
  const ang = Math.acos(lz);
  const vd = ss(0.55, 1.35, ang);
  let sc = [0.965, 0.95, 0.925];
  sc = mix3(sc, [0.74, 0.18, 0.15], noise * vd * 0.55);
  sc = mix3(sc, [0.84, 0.36, 0.3], noise * vd * 0.3);
  sc = mix3(sc, [0.99, 0.85, 0.79], vd * vd * 0.28);
  sc = mix3(sc, [0.9, 0.86, 0.74], ss(0.95, 1.5, ang) * 0.22);
  sc = sc.map((x, i) => x - [0.025, 0.03, 0.02][i] * noise);
  sc = sc.map((x) => x * (1 - ss(0.9, 1.5, ang) * 0.18));
  const irisM = ss(0.62, 0.5, ang);
  let eye = mix3(sc, [0.35, 0.45, 0.75], irisM);
  eye = eye.map(
    (x) => x * (1 - ss(0.72, 0.56, ang) * ss(0.5, 0.58, ang) * 0.35)
  );
  const lim = [0.58, 0.711, 0.9564].map(
    (x) => x * Math.exp(-Math.abs(ang - 0.56) * 26) * 0.35
  );
  eye = eye.map((x, i) => x + lim[i]);
  const dif = Math.min(
    1,
    Math.max(0, lx * LIGHT.x + ly * LIGHT.y + lz * LIGHT.z)
  );
  const diffuse = eye.map(
    (x) => x * (0.55 + 0.6 * dif) * (1 - dim * (1 - wet))
  );
  const sharp = CREAM.map((x) => x * Math.pow(dif, 48) * 0.9 * wet);
  const broad = CREAM.map(
    (x) => x * Math.pow(dif, 7) * 0.07 * (1 - irisM) * wet
  );
  const rim = ELEC.map((x) => x * Math.pow(1 - lz, 3) * 0.18);
  const total = diffuse.map((x, i) => x + sharp[i] + broad[i] + rim[i]);
  return { ang, diffuse, sharp, broad, rim, total };
}

const lum = (c: number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
/** What the framebuffer keeps: finish() adds grain and a vignette, no tone map. */
const clipped = (c: number[]) => lum(c.map((x) => Math.min(1, Math.max(0, x))));
/** Step from the specular peak toward the globe's centre by `d` in tangent units. */
const towardCentre = (d: number): [number, number] => {
  const s = 1 - d / Math.hypot(LIGHT.x, LIGHT.y);
  return [LIGHT.x * s, LIGHT.y * s];
};

describe('a dry patch has to survive the clamp', () => {
  it('finds the surface already past white before any specular is added', () => {
    // The whole reason gating only the added light did nothing. If this ever
    // stops being true — the sclera is darkened, or a tone map appears — then
    // DRY_DIM is no longer load-bearing and should be reconsidered.
    const p = scleraPixel(LIGHT.x, LIGHT.y, 1, 0);
    for (const c of p.diffuse) expect(c).toBeGreaterThan(1);
    // And the sharp lobe is not a small term, it is an invisible one: 43% of
    // the unclipped sum, all of it above the clamp.
    const t = lum(p.total);
    expect(lum(p.sharp) / t).toBeGreaterThan(0.4);
    expect(lum(p.diffuse) / t).toBeGreaterThan(0.5);
    expect(lum(p.broad) / t).toBeLessThan(0.05);
  });

  it('shows nothing at the highlight if only the added light is gated', () => {
    // The bug, pinned. With dim = 0 the dry patch is computed correctly and
    // thrown away: 2.010 and 1.081 both clip to 1.0.
    const wet = scleraPixel(LIGHT.x, LIGHT.y, 1, 0, 0);
    const dry = scleraPixel(LIGHT.x, LIGHT.y, 0, 0, 0);
    expect(lum(wet.total)).toBeGreaterThan(lum(dry.total) * 1.8);
    expect(clipped(wet.total) - clipped(dry.total)).toBe(0);
  });

  it('dims a dry patch visibly everywhere the film can reach', () => {
    // Measured dips in the clipped framebuffer at the shipped DRY_DIM. The
    // peak is the hardest case, because it is the most saturated.
    const dip = (l: [number, number], noise: number) =>
      clipped(scleraPixel(l[0], l[1], 1, noise).total) -
      clipped(scleraPixel(l[0], l[1], 0, noise).total);
    expect(dip([LIGHT.x, LIGHT.y], 0)).toBeGreaterThan(0.05);
    expect(dip([LIGHT.x, LIGHT.y], 0.5)).toBeGreaterThan(0.08);
    expect(dip(towardCentre(0.25), 0)).toBeGreaterThan(0.1);
    expect(dip(towardCentre(0.5), 0)).toBeGreaterThan(0.05);
    // But not so far that a dry patch reads as a hole punched in the eye.
    for (const d of [0, 0.1, 0.25, 0.35, 0.5]) {
      const l =
        d === 0 ? ([LIGHT.x, LIGHT.y] as [number, number]) : towardCentre(d);
      expect(dip(l, 0)).toBeLessThan(0.45);
    }
  });

  it('leaves a wet eye byte-identical to one with no film at all', () => {
    // surfaceDim(1) must be exactly 1, not 0.9999999: this multiplies every
    // pixel of the globe on the no-float-target fallback.
    expect(surfaceDim(1)).toBe(1);
    expect(surfaceDim(0)).toBeCloseTo(1 - DRY_DIM, 15);
    for (const d of [0, 0.1, 0.25, 0.5]) {
      const l =
        d === 0 ? ([LIGHT.x, LIGHT.y] as [number, number]) : towardCentre(d);
      const withFilm = scleraPixel(l[0], l[1], 1, 0);
      const without = scleraPixel(l[0], l[1], 1, 0, 0);
      for (let i = 0; i < 3; i++) {
        expect(withFilm.total[i]).toBe(without.total[i]);
      }
    }
  });
});

describe('the wet curve against a real interface', () => {
  /**
   * A settled dry patch's equilibrium profile, which is what `film.ts` stamps
   * and what the Cahn-Hilliard energy relaxes back to: h = tanh(d - r / w).
   * Asserting against this rather than against a numerical run keeps the test
   * fast and ties it to the physics rather than to one seed.
   */
  const profile = (d: number, radius: number) =>
    Math.tanh((d - radius) / interfaceWidth());
  /** Measured on the CPU reference at PRIME_SECONDS. */
  const PATCH_CELLS = 12.6;
  const H_MIN = -1.008;
  const H_MAX = 0.942;

  it('reads the interior of a real patch as fully dry, not as a smudge', () => {
    const radius = (PATCH_CELLS / 2) * DELTA;
    // Area share of the patch's disc that is fully unwet. A ramp that ate the
    // patch would make the holes soft and grey instead of dark.
    let dark = 0;
    let total = 0;
    const N = 400;
    for (let k = 0; k < N; k++) {
      const d = ((k + 0.5) / N) * radius;
      const w = 2 * Math.PI * d; // annulus weight
      total += w;
      if (wetness(profile(d, radius)) === 0) dark += w;
    }
    expect(dark / total).toBeGreaterThan(0.8);
  });

  it('puts the whole ramp inside the interface', () => {
    const radius = (PATCH_CELLS / 2) * DELTA;
    // Where wetness leaves 0 and where it reaches 1, as a distance from the
    // patch's nominal edge. Both must be inside a couple of interface widths,
    // or the sheen is fading across flat film rather than across the edge.
    let lo = radius;
    let hi = radius;
    for (let k = 0; k <= 2000; k++) {
      const d = (k / 2000) * radius * 3;
      const w = wetness(profile(d, radius));
      if (w === 0) lo = d;
      if (w < 1) hi = d;
    }
    expect(Math.abs(lo - radius)).toBeLessThan(2 * interfaceWidth());
    expect(Math.abs(hi - radius)).toBeLessThan(2 * interfaceWidth());
  });

  it('saturates at both ends of the field the simulation actually produces', () => {
    // The measured range, not the nominal wells: an overshoot below -1 must
    // still read dry and the wet plateau at 0.942 must still read fully wet.
    expect(wetness(H_MIN)).toBe(0);
    expect(wetness(H_MAX)).toBe(1);
    expect(H_MAX).toBeGreaterThan(WET_H);
    expect(H_MIN).toBeLessThan(DRY_H);
  });
});

/* ================================================================== *
 * Task 11: the cornea as a lens, and the caustic that is its Jacobian
 * ================================================================== */

/** A film that is perfectly flat. The reference every claim is against. */
const FLAT = () => 0;
/** `h = c/2 * |l|^2`: a paraboloid, i.e. a lens of constant power `c`. */
const lens = (c: number) => (x: number, y: number) => (c / 2) * (x * x + y * y);
/**
 * The film's own interface, as `film.ts` actually produces it: a tanh front of
 * half-width `interfaceWidth()` with dry on the left and wet on the right.
 */
const front = (at: number) => (x: number) =>
  Math.tanh((x - at) / (IFACE_CELLS * DELTA));

/**
 * Analytic small-angle prediction for the Jacobian of a constant-power film.
 *
 * A surface tilted by `d` deflects the ray by `(1 - eta) * d` — Snell at small
 * angles — and that lands `IRIS_DEPTH * (1 - eta) * d` off to the side. With
 * `h = c/2 |l|^2` the tilt is `FILM_SLOPE * c * l`, so the whole map scales
 * linearly and its determinant is the square of one factor. This is the check
 * that the shipped stencil is measuring refraction and not its own arithmetic.
 */
const lensRatio = (c: number) => {
  const k = (1 - CORNEA_ETA) * IRIS_DEPTH;
  return Math.pow(1 + k * FILM_LENS * c, 2);
};

/**
 * Pupil radius in the map's own coordinates.
 *
 * `eyeW` samples `visionary(f0 * 0.62)`, and `visionary` puts the pupil edge at
 * `r = 0.055 * pd` with `pd = 1 + uPupil * 1.1`. So in the tangent units the
 * refraction map works in, the pupil is this wide — and any displacement the
 * map applies is measured against it.
 */
const pupilRadius = (uPupil: number) => (0.055 * (1 + uPupil * 1.1)) / 0.62;

describe('the corneal refraction map', () => {
  it('refracts by Snell at the index the cornea actually has', () => {
    for (const deg of [5, 15, 30, 45, 60]) {
      const th = (deg * Math.PI) / 180;
      // Incident ray at th to the surface normal, normal along +z.
      const i: [number, number, number] = [Math.sin(th), 0, -Math.cos(th)];
      const r = refract(i, [0, 0, 1], CORNEA_ETA);
      const out = Math.atan2(r[0], -r[2]);
      expect(Math.sin(th) / Math.sin(out)).toBeCloseTo(N_CORNEA, 6);
      expect(Math.hypot(r[0], r[1], r[2])).toBeCloseTo(1, 12);
    }
  });

  it('magnifies the iris by about what a real cornea does', () => {
    // Clinically the pupil and iris look 1.12-1.15x their true size through
    // the cornea. One refracting sphere lands a little under that, because the
    // real cornea is aspheric and has a second surface; if this ever leaves
    // the bracket, the map has stopped being an eye.
    const m = cornealMagnification();
    expect(m).toBeGreaterThan(1.08);
    expect(m).toBeLessThan(1.15);
    // Which is the same statement as: the lookup is pulled in toward the axis.
    expect(irisPoint(0.3, 0, 0, 0)[0]).toBeLessThan(0.3);
  });

  it('contracts harder at the limbus than on axis, which is the thick glass', () => {
    // The tilt of the surface grows faster than the tangent coordinate does,
    // so the iris crowds toward the rim. A drawn ring cannot do this; it is
    // the whole visual difference between a limbus and a circle.
    const ratio = (r: number) => irisPoint(r, 0, 0, 0)[0] / r;
    const axis = ratio(0.05);
    const limbus = ratio(Math.sin(0.56));
    expect(limbus).toBeLessThan(axis);
    expect(axis - limbus).toBeGreaterThan(0.01);
    // Monotone all the way out: no reversal anywhere on the cornea.
    let prev = axis;
    for (let k = 1; k <= 40; k++) {
      const v = ratio(0.05 + (k / 40) * (Math.sin(0.62) - 0.05));
      expect(v).toBeLessThanOrEqual(prev + 1e-12);
      prev = v;
    }
  });

  it('never leans on the grazing-ray clamp anywhere the iris is drawn', () => {
    // `max(0.2, -rr.z)` is a guard against the silhouette, not a shaper. If it
    // ever bit on the iris it would flatten the magnification without saying
    // so.
    for (let k = 0; k <= 40; k++) {
      const l = (k / 40) * Math.sin(0.62);
      const n = Math.sqrt(1 - l * l);
      const r = refract([0, 0, -1], [l, 0, n], CORNEA_ETA);
      expect(-r[2]).toBeGreaterThan(0.9);
    }
  });

  it('displaces nothing at the axis and a tenth of a radius at the limbus', () => {
    // **The shape of a magnification, and the regression that made this test
    // exist.** Magnification is a radial stretch: it has to vanish on the
    // optical axis and grow outward. The first pass fed the map FILM_SLOPE,
    // an 82.9-micron bump amplitude, and the film's own term was a
    // near-constant offset that survived to the axis at 45% of a pupil
    // radius. The pupil came apart, and it deserved to.
    const displaced = (l: number) => Math.abs(irisPoint(l, 0, 0, 0)[0] - l);
    expect(displaced(0)).toBe(0);
    let prev = -1;
    for (const l of [0.02, 0.05, 0.1, 0.2, 0.3, 0.4, Math.sin(0.56)]) {
      const frac = displaced(l) / l;
      // Between 9% and 11% of the radius, everywhere — the clinical figure
      // for how much larger the cornea makes the iris look.
      expect(frac).toBeGreaterThan(0.09);
      expect(frac).toBeLessThan(0.11);
      // And growing outward, because the surface tilts faster than l does.
      expect(frac).toBeGreaterThan(prev);
      prev = frac;
    }
  });

  it('keeps the films own throw far inside the pupil it draws', () => {
    // The film's term, unlike the cornea's, is an offset rather than a
    // stretch: it does not vanish at the axis, so the only thing keeping it
    // off the pupil is its size. Measured against the pupil the shader
    // actually draws, at the steepest slope the grid can resolve.
    const steepest = 1 / (IFACE_CELLS * DELTA);
    const at = (slope: number) =>
      Math.abs(
        irisPoint(0.05, 0, slope * steepest, 0)[0] - irisPoint(0.05, 0, 0, 0)[0]
      );
    const undilated = pupilRadius(0);
    // Shipped: 1% of a pupil radius, and a fifteenth of a cell.
    expect(at(FILM_LENS) / undilated).toBeLessThan(0.02);
    expect(at(FILM_LENS) / DELTA).toBeLessThan(0.1);
    // What it was: 45%, which is what the Lab render showed.
    expect(at(FILM_SLOPE) / undilated).toBeGreaterThan(0.4);
    // The two couplings differ by the ratio of two thicknesses, nothing else.
    expect(FILM_SLOPE / FILM_LENS).toBeCloseTo(47.4, 1);
    expect(FILM_LENS * MM_PER_UNIT * 2).toBeCloseTo(TEAR_FILM_MM, 12);
    // FILM_SLOPE read as a height is 82.9 microns of tear film, which is not
    // a tear film. As a bump amplitude that is unremarkable; as a
    // displacement it is the bug.
    expect(FILM_SLOPE * MM_PER_UNIT * 1000).toBeGreaterThan(80);
  });

  it('stays square to the gaze axis, not to the screen', () => {
    // The map is built in the gaze-local frame, so it must not care which way
    // round the eye is looking: same radius in, same radius out.
    const at = (a: number) => {
      const p = irisPoint(0.4 * Math.cos(a), 0.4 * Math.sin(a), 0, 0);
      return Math.hypot(p[0], p[1]);
    };
    const r0 = at(0);
    for (let k = 1; k < 12; k++) {
      expect(at((k * Math.PI) / 6)).toBeCloseTo(r0, 12);
    }
  });
});

describe('the caustic is the Jacobian of that map', () => {
  it('derives the difference step from the cell size and nothing else', () => {
    expect(JACOBIAN_STEP).toBe(DELTA);
    expect(JACOBIAN_STEP).toBe(DOMAIN / GRID);
    // Not shorter: below a cell the difference reads the curvature of
    // filmUV's reconstruction rather than the film's.
    expect(JACOBIAN_STEP).toBeGreaterThanOrEqual(DELTA);
    // Not longer: the interface is 1.5 cells wide and is the entire subject.
    expect(JACOBIAN_STEP).toBeLessThan(IFACE_CELLS * DELTA);
  });

  it('keeps every tap inside the texels the simulation wrote', () => {
    // FILM_REACH reserves exactly one cell of margin. The stencil is centred
    // and one cell wide, in both axes and on the diagonal, so it fits — which
    // is why the Hessian is taken from a centred stencil and not by
    // re-differencing the field at l + e, which would need two.
    const furthest = FILM_REACH + JACOBIAN_STEP;
    expect(furthest).toBeLessThanOrEqual(DOMAIN / 2 - DELTA / 2 + 1e-12);
    // The diagonal tap is the same one cell away in Chebyshev, which is the
    // metric filmReach is written in.
    expect(Math.max(JACOBIAN_STEP, JACOBIAN_STEP)).toBe(JACOBIAN_STEP);
  });

  it('bounds the brightening by how far the film can throw light', () => {
    // CAUSTIC_MAX is not a taste number. Rebuild it from its four factors.
    const throwCells =
      ((1 - CORNEA_ETA) * IRIS_DEPTH * FILM_LENS) /
      (IFACE_CELLS * DELTA) /
      DELTA;
    expect(CAUSTIC_MAX).toBeCloseTo(1 + throwCells, 12);
    // The `1 +` is the light that was landing in the cell anyway. Leaving it
    // out only looks harmless while the throw is large compared to a cell: at
    // the film's real thickness the throw is 0.068 of one, and the bound
    // without it would be 0.068 — a caustic that darkens everything by 93%.
    expect(throwCells).toBeLessThan(0.1);
    expect(CAUSTIC_MAX).toBeGreaterThan(1);
    expect(CAUSTIC_MAX).toBeLessThan(1.1);
    // And the dark side is its reciprocal: the light has to come from
    // somewhere, and it is the same somewhere.
    expect(causticFocus(1e9, 1)).toBeCloseTo(1 / CAUSTIC_MAX - 1, 12);
    expect(causticFocus(1e-9, 1)).toBeCloseTo(CAUSTIC_MAX - 1, 12);
  });

  it('is exactly zero on a flat film, by arithmetic and not by rounding', () => {
    // This is the uFilmOK = 0 fallback. `focus` multiplies the light on every
    // iris pixel, so a last bit here would tint the whole eye on the path a
    // driver without float render targets takes.
    for (const l of [0, 0.1, 0.3, 0.5]) {
      const j = irisJacobian(l, l * 0.3, FLAT);
      expect(j.J).toBe(j.J0);
      expect(j.focus).toBe(0);
    }
    // And with the slope gated off, any field at all collapses the same way.
    for (const l of [0, 0.2, 0.45]) {
      const j = irisJacobian(l, 0, (x, y) => front(0.2)(x) + y * 13, 0);
      expect(j.J).toBe(j.J0);
      expect(j.focus).toBe(0);
    }
  });

  it('removes the corneas own magnification instead of reading it as focus', () => {
    // J0 is not constant: it runs 0.82 on axis to 0.75 at the limbus. Divided
    // out, a flat film is flat everywhere; left in, the middle of every iris
    // would carry a permanent glow that has nothing to do with the film.
    const axis = irisJacobian(0, 0, FLAT).J0;
    const limbus = irisJacobian(Math.sin(0.56), 0, FLAT).J0;
    expect(axis).toBeGreaterThan(limbus);
    expect(axis).toBeCloseTo(0.819, 2);
    expect(limbus).toBeCloseTo(0.766, 2);
  });

  it('matches Snell on a film of known, constant curvature', () => {
    // The synthetic film with an answer: a paraboloid is a thin lens, and its
    // Jacobian is the square of a linear factor. Agreement is a statement
    // about the stencil, since nothing in `irisJacobian` knows this formula.
    // At the film's real thickness every tilt in play is well under a degree,
    // so the linearisation is very good — which is itself the check that the
    // film is now a weak perturbation on the cornea rather than a rival to it.
    for (const c of [-2000, -800, -200, 200, 800, 2000]) {
      const j = irisJacobian(0, 0, lens(c));
      expect(Math.abs(j.J / j.J0 / lensRatio(c) - 1)).toBeLessThan(0.01);
    }
  });

  it('does Snell exactly, and so parts company with the linear version', () => {
    // The formula above is a small-angle reading of Snell. Drive the film at
    // the bump amplitude the specular uses — 47x the real one — and the tilt
    // reaches a third of a radian, where sin stops being its argument. The
    // shipped map calls `refract` and keeps the difference; a linearised map
    // would agree and be wrong. This also fails loudly if FILM_SLOPE is ever
    // wired back into the map.
    const c = -800;
    const k = (1 - CORNEA_ETA) * IRIS_DEPTH;
    const j = irisJacobian(0, 0, lens(c), FILM_SLOPE);
    const linear = Math.pow(1 + k * FILM_SLOPE * c, 2);
    expect(Math.abs(j.J / j.J0 / linear - 1)).toBeGreaterThan(0.2);
  });

  it('brightens on crests and dims in troughs, never the other way round', () => {
    // A local maximum of h is a bump on the outer surface, which is a
    // converging lens. A dip spreads. Getting this backwards would light up
    // the dry patches themselves rather than their rims.
    for (const c of [-6000, -3000, -1000]) {
      expect(irisJacobian(0.1, 0, lens(c)).focus).toBeGreaterThan(0);
    }
    for (const c of [1000, 3000, 6000]) {
      expect(irisJacobian(0.1, 0, lens(c)).focus).toBeLessThan(0);
    }
  });

  it('does not fold, because a real tear film is a very weak lens', () => {
    // This is the finding, and it reversed when the map got the film's real
    // thickness. The curvature that sends J through zero is
    // 1/((1-eta)*IRIS_DEPTH*FILM_LENS) = 62000 per tangent unit. A resolved
    // interface carries about 2200 — a factor of 28 short. At the 82.9-micron
    // bump amplitude the specular uses, the fold sat at 1300 and the film
    // cleared it easily, which is why the first pass read as a strong caustic.
    const foldPower = -1 / ((1 - CORNEA_ETA) * IRIS_DEPTH * FILM_LENS);
    expect(Math.abs(foldPower)).toBeGreaterThan(50000);
    const w = IFACE_CELLS * DELTA;
    const interfaceCurvature = 0.77 / (w * w); // max |h''| of tanh(x/w)
    expect(Math.abs(foldPower) / interfaceCurvature).toBeGreaterThan(20);
    // And if one ever did fold, the number stays finite and pinned.
    for (const f of [0.97, 1.0, 1.03]) {
      const j = irisJacobian(0.1, 0, lens(foldPower * f));
      expect(Number.isFinite(j.focus)).toBe(true);
      expect(j.focus).toBeLessThanOrEqual(CAUSTIC_MAX - 1 + 1e-12);
    }
  });

  it('draws a hairline on the wet side of a real front and a shadow on the dry', () => {
    // The shape of the thing, on the interface film.ts actually produces.
    const at = 0.2;
    const h = front(at);
    const sample = (cells: number) =>
      irisJacobian(at + cells * DELTA, 0, (x) => h(x)).focus;
    // Wet side (h rising to +1): the crest of the front focuses. The shape is
    // right and the magnitude is 3%, which is what a 3.5-micron film does.
    expect(sample(2)).toBeGreaterThan(0.02);
    // Dry side (h falling to -1): the trough spreads the same light.
    expect(sample(-1)).toBeLessThan(-0.01);
    // Both die within a handful of cells — it is a filigree, not a wash.
    expect(Math.abs(sample(8))).toBeLessThan(0.002);
    expect(Math.abs(sample(-8))).toBeLessThan(0.002);
    // And dead flat in the middle of a patch, where there is nothing to bend.
    expect(Math.abs(sample(20))).toBeLessThan(0.0005);
  });

  it('says nothing at all about a quiet wet sheet', () => {
    // The measured wet film is p50 |dh/dl| = 2.0 over lengths of many cells.
    // If that produced a caustic the eye would sparkle all the time and the
    // term would be decoration. A long-wavelength ripple of that slope:
    const k = 2 * Math.PI * 4; // four cycles across the 1.2-unit domain
    const quiet = (x: number) => (2.0 / k) * Math.sin(k * x);
    let worst = 0;
    for (let i = 0; i <= 400; i++) {
      const x = -0.5 + i / 400;
      worst = Math.max(worst, Math.abs(irisJacobian(x, 0, quiet).focus));
    }
    // Five percent of the directional light, which is about two percent of the
    // pixel: under the film grain, and forty-odd times weaker than what a
    // tearing front does at the same slope. The caustic is a signal that the
    // film is breaking, not that it exists.
    expect(worst).toBeLessThan(0.002);
    let front2 = 0;
    for (let i = -400; i <= 400; i++) {
      front2 = Math.max(
        front2,
        irisJacobian(0.2 + (i / 40) * DELTA, 0, (x) => front(0.2)(x)).focus
      );
    }
    expect(front2 / worst).toBeGreaterThan(25);
  });

  it('leaves the iris where it was when the film is flat, and moves it when it is not', () => {
    // f0 is the lookup, not just the Jacobian's scaffolding. A flat film still
    // magnifies — that is the cornea — but the film alone displaces it too.
    const flat = irisJacobian(0.25, 0, FLAT).f0;
    const bent = irisJacobian(0.25, 0, front(0.25)).f0;
    expect(Math.hypot(flat[0] - 0.25, flat[1])).toBeGreaterThan(0.02);
    const moved = Math.hypot(bent[0] - flat[0], bent[1] - flat[1]);
    // Bounded by the same throw budget CAUSTIC_MAX is derived from — the film
    // cannot move the lookup further than it can move the light. A sixteenth
    // of a cell: the iris ripples under the film at a scale nothing resolves,
    // which is the whole point. At the bump amplitude this was 2.9 cells, and
    // it tore the pupil apart.
    expect(moved).toBeGreaterThan(0);
    expect(moved).toBeLessThan((CAUSTIC_MAX - 1) * DELTA);
  });
});

/**
 * `visionary()` and the iris half of `eyeW`, on the CPU.
 *
 * Task 10 learned the hard way that a term can be computed correctly and then
 * clipped away, and its own mirror stopped at the sclera — `visionary()` was
 * "not ported, so rows on the iris stand in a mid-tone for it". The caustic
 * lands on the iris, so the mid-tone will not do: this is the real mandala,
 * every term of it, so the question "is there room for the measurement to be
 * seen" has an answer instead of a hope.
 *
 * The hashes run in float64 here and in float32 on the GPU, so the *particular*
 * grain differs. Nothing below asks about a particular pixel; it asks about the
 * distribution over twenty thousand of them, which the precision does not move.
 */
const V_IND = [0.09, 0.05, 0.2];
const V_ELEC = [0.3, 0.55, 1.0];
const V_VMAG = [0.85, 0.2, 0.75];
const V_CREAM = [1.0, 243 / 255, 227 / 255];
const V_INK = [17 / 255, 10 / 255, 8 / 255];
const V_SUN = [1.0, 194 / 255, 74 / 255];

const gclamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const gfract = (x: number) => x - Math.floor(x);
const gmod = (x: number, y: number) => x - y * Math.floor(x / y);
const gss = (a: number, b: number, x: number) => {
  const t = gclamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const gmix = (a: number[], b: number[], t: number) =>
  a.map((x, i) => x + (b[i] - x) * t);
const ghash = (x: number, y: number) =>
  gfract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123);
function gvnoise(px: number, py: number): number {
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  const fx = px - ix;
  const fy = py - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = ghash(ix, iy) + (ghash(ix + 1, iy) - ghash(ix, iy)) * ux;
  const b =
    ghash(ix, iy + 1) + (ghash(ix + 1, iy + 1) - ghash(ix, iy + 1)) * ux;
  return a + (b - a) * uy;
}
function gfbm(px: number, py: number): number {
  let v = 0;
  let a = 0.5;
  let x = px;
  let y = py;
  for (let i = 0; i < 4; i++) {
    v += a * gvnoise(x, y);
    x = x * 2.03 + 17.0;
    y = y * 2.03 + 9.2;
    a *= 0.5;
  }
  return v;
}
function gstars(qx: number, qy: number, density: number, t: number): number {
  const gx = qx * density;
  const gy = qy * density;
  const cx = Math.floor(gx);
  const cy = Math.floor(gy);
  const h = ghash(cx, cy);
  if (h < 0.93) return 0;
  const d = Math.hypot(
    gfract(gx) - ghash(cx + 11.3, cy + 11.3),
    gfract(gy) - ghash(cx + 27.7, cy + 27.7)
  );
  const sz = 0.06 + 0.14 * ghash(cx + 41.2, cy + 41.2);
  const s = gss(sz, 0, d);
  return (
    s *
    s *
    (0.45 +
      0.55 * Math.sin(t * (1.2 + 1.5 * ghash(cx + 3, cy + 3)) + h * 40) * 0.5 +
      0.275)
  );
}
/** `visionary()`, term for term. */
function visionary(qx: number, qy: number, t: number, pupil: number): number[] {
  const breath = 0.9 + 0.1 * Math.sin(t * 0.45);
  const r = Math.hypot(qx, qy) / breath + 1e-4;
  const a = Math.atan2(qy, qx);
  const sec = 6.28318 / 12;
  const af = Math.abs(gmod(a + t * 0.04, sec) - sec * 0.5);
  let col = V_IND.map(
    (x) => x * (0.7 + 0.5 * gfbm(qx * 2 + t * 0.05, qy * 2 + t * 0.05))
  );
  const fil = gfbm(af * 14 + gfbm(r * 6, t * 0.2) * 2.5, r * 9 - t * 0.5);
  const lines = Math.pow(gclamp(1 - Math.abs(fil * 2 - 1) * 2.2, 0, 1), 3);
  const spec = gmix(
    V_ELEC,
    V_VMAG,
    0.5 + 0.5 * Math.sin(r * 9 - t * 0.8 + af * 6)
  );
  const pd = 1 + pupil * 1.1;
  col = col.map(
    (x, i) => x + spec[i] * lines * gss(0.065 * pd, 0.18, r) * 0.85
  );
  const ring = Math.abs(gfract(r * 5.5 - t * 0.16) - 0.5);
  const rc = gmix(V_VMAG, V_ELEC, 0.5 + 0.5 * Math.sin(t * 0.4));
  col = col.map(
    (x, i) => x + rc[i] * gss(0.09, 0, ring) * Math.exp(-r * 1.5) * 0.45
  );
  const l1 = Math.sin(Math.hypot(qx - 0.16, qy) * 34 - t * 0.6);
  const l2 = Math.sin(Math.hypot(qx + 0.16, qy) * 34 - t * 0.6);
  const l3 = Math.sin(Math.hypot(qx, qy - 0.16) * 34 - t * 0.6);
  const lat = Math.pow(gclamp(l1 * l2 * l3 * 0.5 + 0.5, 0, 1), 6);
  col = col.map((x, i) => x + V_SUN[i] * lat * Math.exp(-r * 1.2) * 0.35);
  const iris = gss(0.22, 0.06 * pd, r);
  const spokes =
    0.5 + 0.5 * Math.sin(a * 24 + gfbm(a * 4, r * 20) * 5 + t * 0.5);
  col = col.map(
    (x, i) => x + V_ELEC[i] * iris * gss(0.05 * pd, 0.1 * pd, r) * spokes * 0.4
  );
  col = col.map((x, i) => x + V_VMAG[i] * iris * 0.15);
  const pr = 0.055 * pd;
  col = gmix(
    col,
    V_INK.map((x) => x * 0.35),
    gss(pr + 0.006, pr - 0.006, r)
  );
  const pg = gmix(V_ELEC, V_CREAM, 0.35);
  col = col.map((x, i) => x + pg[i] * Math.exp(-Math.abs(r - pr) * 110) * 0.55);
  col = col.map(
    (x, i) => x + V_ELEC[i] * gss(pr + 0.05, pr, r) * (r >= pr ? 1 : 0) * 0.2
  );
  const st = gstars(qx, qy, 50, t);
  col = col.map((x, i) => x + V_CREAM[i] * st * 0.3 * gss(0.3, 0.7, r));
  return col.map((x) => x * breath);
}
function genergyH(lx: number, ly: number, ang: number, t: number): number {
  const s = Math.max(Math.sin(ang), 1e-3);
  const off = gfbm(ang * 5, t * 0.15) * 2;
  const f = gfbm(
    (lx / s) * 2.6 + off,
    (ly / s) * 2.6 + ang * 7 - t * 0.2 + off
  );
  return Math.pow(gclamp(1 - Math.abs(f * 2 - 1) * 2.6, 0, 1), 3);
}
/**
 * `eyeW`'s iris path at a straight-ahead gaze, where the gaze-local frame is
 * the world frame. The film is wet and flat, which is the case the caustic has
 * to be visible against.
 */
function irisPixel(lx: number, ly: number, focus: number, t = 7.0) {
  const PUPIL = 0.15; // the value onInit sets and the rest hover around
  const BUMP = 0.8; // the shipped Energy Relief default
  const lz = Math.sqrt(Math.max(0, 1 - lx * lx - ly * ly));
  const ang = Math.acos(gclamp(lz, -1, 1));
  const sd = Math.max(Math.sin(ang), 1e-3);
  const sdx = lx / sd;
  const sdy = ly / sd;
  const vl = genergyH(lx, ly, ang, t);
  const sa2 = Math.atan2(sdy, sdx);
  const o1 = gfbm(sdx * 3.5, sdy * 3.5) * 1.8;
  const vein = Math.pow(
    gclamp(
      1 - Math.abs(gfbm(sa2 * 5 + o1, ang * 2.2 + o1) * 2 - 1) * 3.4,
      0,
      1
    ),
    4
  );
  const o2 = gfbm(sdx * 6, sdy * 6) * 1.2;
  const vein2 = Math.pow(
    gclamp(
      1 - Math.abs(gfbm(sa2 * 13 + 7.3 + o2, ang * 4.5 + o2) * 2 - 1) * 5.5,
      0,
      1
    ),
    6
  );
  const vd = gss(0.55, 1.35, ang);
  let sc = [0.965, 0.95, 0.925];
  sc = gmix(sc, [0.74, 0.18, 0.15], vein * vd * 0.55);
  sc = gmix(sc, [0.84, 0.36, 0.3], vein2 * vd * 0.3);
  sc = gmix(sc, [0.99, 0.85, 0.79], vd * vd * 0.28);
  sc = gmix(sc, [0.9, 0.86, 0.74], gss(0.95, 1.5, ang) * 0.22);
  const gr = gfbm(sdx * 5, sdy * 5 + ang * 3);
  sc = sc.map((x, i) => x - [0.025, 0.03, 0.02][i] * gr);
  sc = sc.map((x) => x * (1 - gss(0.9, 1.5, ang) * 0.18));
  const ee = 0.06;
  const pm = gss(0.14, 0.32, ang) * gss(0.68, 0.54, ang);
  const dhx = ((genergyH(lx + ee, ly, ang, t) - vl) / ee) * pm;
  const dhy = ((genergyH(lx, ly + ee, ang, t) - vl) / ee) * pm;
  const nbv = [lx - dhx * BUMP * 0.045, ly - dhy * BUMP * 0.045, lz];
  const nn = Math.hypot(nbv[0], nbv[1], nbv[2]);
  const nb = nbv.map((x) => x / nn);
  // Seen through the cornea, on a flat film: the map with no tilt.
  const f0 = irisPoint(lx, ly, 0, 0);
  const ir = visionary(
    (f0[0] - dhx * BUMP * 0.012) * 0.62,
    (f0[1] - dhy * BUMP * 0.012) * 0.62,
    t,
    PUPIL
  );
  const irisM = gss(0.62, 0.5, ang);
  let eye = gmix(sc, ir, irisM);
  eye = eye.map(
    (x) => x * (1 - gss(0.72, 0.56, ang) * gss(0.5, 0.58, ang) * 0.35)
  );
  const lim = gmix(V_ELEC, V_CREAM, 0.4);
  eye = eye.map(
    (x, i) => x + lim[i] * Math.exp(-Math.abs(ang - 0.56) * 26) * 0.35
  );
  const dif = gclamp(nb[0] * LIGHT.x + nb[1] * LIGHT.y + nb[2] * LIGHT.z, 0, 1);
  let total = eye.map((x) => x * (0.55 + 0.6 * dif * (1 + focus * irisM)));
  total = total.map((x, i) => x + V_CREAM[i] * Math.pow(dif, 48) * 0.9);
  total = total.map(
    (x, i) => x + V_CREAM[i] * Math.pow(dif, 7) * 0.07 * (1 - irisM)
  );
  const l2n = Math.hypot(0.3, -0.2, 1.0);
  const d2 = gclamp((nb[0] * 0.3 + nb[1] * -0.2 + nb[2] * 1.0) / l2n, 0, 1);
  total = total.map(
    (x, i) => x + V_ELEC[i] * vl * Math.pow(d2, 8) * BUMP * 0.55 * irisM
  );
  total = total.map((x, i) => x + V_ELEC[i] * Math.pow(1 - lz, 3) * 0.18);
  return { total, irisM };
}

/** Every pixel of the painted iris, once. */
const IRIS_FIELD = (() => {
  const rad = Math.sin(0.5); // irisM == 1 inside here
  const pts: [number, number][] = [];
  for (let i = 0; i < 160; i++) {
    for (let j = 0; j < 160; j++) {
      const lx = ((i + 0.5) / 160) * 2 * rad - rad;
      const ly = ((j + 0.5) / 160) * 2 * rad - rad;
      if (Math.hypot(lx, ly) <= rad) pts.push([lx, ly]);
    }
  }
  return pts;
})();
const pct = (a: number[], f: number) =>
  a.slice().sort((x, y) => x - y)[Math.floor(f * (a.length - 1))];

describe('the headroom the caustic lands in', () => {
  const base = IRIS_FIELD.map(([x, y]) => irisPixel(x, y, 0).total);

  it('finds the iris nowhere near the clamp the sclera sits on', () => {
    // The opposite of the sclera, and the reason the spec puts the caustic
    // here and the wetness dim there. The sclera's diffuse term alone is
    // (1.094, 1.078, 1.053) before any specular — past white. The iris is a
    // fifth of that.
    const L = base.map((c) => lum(c.map((x) => Math.min(1, Math.max(0, x)))));
    expect(pct(L, 0.5)).toBeGreaterThan(0.1);
    expect(pct(L, 0.5)).toBeLessThan(0.3);
    expect(pct(L, 0.9)).toBeLessThan(0.6);
    // And very little of it is already clipped, unlike the sclera, where
    // essentially all of it is.
    const over = base.filter((c) => c.some((x) => x >= 1)).length;
    expect(over / base.length).toBeLessThan(0.06);
    // Per channel there is more than half a unit of room at the median.
    const head = base.map((c) => 1 - Math.max(c[0], c[1], c[2]));
    expect(pct(head, 0.5)).toBeGreaterThan(0.5);
  });

  it('shows a measured caustic in the framebuffer, not just in the maths', () => {
    // The Task 10 test that failed, asked again where the answer is different.
    // Nothing here is tuned to make it pass: `focus` goes into the light term
    // at a gain of exactly one.
    const dip = (focus: number) => {
      const d = IRIS_FIELD.map(
        ([x, y], i) =>
          lum(
            irisPixel(x, y, focus).total.map((v) => Math.min(1, Math.max(0, v)))
          ) - lum(base[i].map((v) => Math.min(1, Math.max(0, v))))
      );
      return { p10: pct(d, 0.1), p50: pct(d, 0.5), p90: pct(d, 0.9) };
    };
    // The brightest the real film can get, which is the bound CAUSTIC_MAX
    // puts on it. It moves the pixel, and it moves it by four thousandths.
    const peak = dip(CAUSTIC_MAX - 1);
    expect(peak.p50).toBeGreaterThan(0.002);
    expect(peak.p50).toBeLessThan(0.01);
    // **And that is under the grain the shader itself adds.** `finish()` puts
    // +/-0.025 of hash noise on every pixel, so the caustic at full strength is
    // six times below the eye's own film grain. It is computed correctly, it
    // survives the clamp, and it is invisible. Task 12 cannot fix this by
    // quieting the iris; only a larger film can, and the film is 3.5 microns.
    expect(peak.p50).toBeLessThan(0.025);
    // The dark companion is the same size, on the other side.
    const dark = dip(1 / CAUSTIC_MAX - 1);
    expect(dark.p50).toBeLessThan(-0.002);
    // For scale: what the term would do if it were free to be as strong as the
    // first pass made it, which is what tore the pupil apart.
    expect(dip(2.241).p50).toBeGreaterThan(0.1);
  });

  it('does not blow the iris out at the brightest the film can get', () => {
    // Restraint is also a measurement. At full fold the iris roughly doubles
    // in the light term and still keeps most of its detail out of the clamp;
    // if this ever fails, the caustic has stopped reporting and started
    // painting.
    const peak = IRIS_FIELD.map(
      ([x, y]) => irisPixel(x, y, CAUSTIC_MAX - 1).total
    );
    const over = peak.filter((c) => c.some((v) => v >= 1)).length;
    // 2.9% measured, against 2.4% unfocused: the real film barely touches the
    // clamp. Restraint is also a measurement, and here it is not a choice.
    expect(over / peak.length).toBeLessThan(0.05);
  });

  it('leaves the pixel untouched when the film is flat', () => {
    // focus = 0 is the uFilmOK = 0 fallback and the whole quiet film. It has
    // to be exact, because it multiplies every iris pixel of the eye.
    for (const [x, y] of [
      [0, 0],
      [0.2, -0.1],
      [0.4, 0.25],
    ] as [number, number][]) {
      const a = irisPixel(x, y, 0).total;
      const b = irisPixel(x, y, causticFocus(0.8, 0.8)).total;
      for (let i = 0; i < 3; i++) expect(b[i]).toBe(a[i]);
    }
  });
});

/**
 * Peak `focus` across a tanh front of width `W`, at a coupling small enough
 * that nothing clips, normalised by that coupling. This is what the **shipped
 * stencil** reports, not what calculus says — which is the whole point.
 */
const peakAcrossFront = (W: number) => {
  const s = FILM_LENS * 1e-3;
  let hi = 0;
  for (let i = -800; i <= 800; i++) {
    hi = Math.max(
      hi,
      irisJacobian(
        0.2 + (i / 80) * DELTA,
        0,
        (x) => Math.tanh((x - 0.2) / W),
        s
      ).focus
    );
  }
  return hi / s;
};
/** Interface width in tangent units, from a width in microns. */
const umToUnits = (um: number) => um / 1000 / MM_PER_UNIT;
const W_SIM = IFACE_CELLS * DELTA;

describe('why the shortfall is not a grid artifact', () => {
  it('reads curvature as 1/W^2 only while the stencil can see the interface', () => {
    // The naive argument for a sub-grid correction is that curvature goes as
    // 1/W^2, so a grid that smears the interface under-reports by (Wsim/Wr)^2.
    // That is true, and it stops being true at exactly the width where the
    // correction would start to matter.
    const expo = (a: number, b: number) =>
      Math.log(peakAcrossFront(b * DELTA) / peakAcrossFront(a * DELTA)) /
      Math.log(b / a);
    // Comfortably resolved: the algebra is exact.
    expect(expo(8, 4)).toBeLessThan(-1.9);
    expect(expo(4, 3)).toBeLessThan(-1.9);
    // At this film's own interface it has already started to roll off.
    expect(expo(2, 1.5)).toBeGreaterThan(-1.9);
    // Below one cell — where every defensible W_real lives — it is gone.
    expect(expo(0.5, 0.35)).toBeGreaterThan(-1.0);
    expect(expo(0.35, 0.25)).toBeGreaterThan(-0.6);
  });

  it('saturates, so a sub-grid multiplier past a cell is a gain not a correction', () => {
    // The difference baseline is one cell. Sharpen the interface past that and
    // the measured response stops moving, however much sharper it gets.
    const base = peakAcrossFront(W_SIM);
    const at = (um: number) => peakAcrossFront(umToUnits(um)) / base;
    const naive = (um: number) => Math.pow(W_SIM / umToUnits(um), 2);
    // A ceiling, not a ramp: 30um and 10um differ by 9x in the algebra and by
    // almost nothing in the pipeline.
    expect(at(10) / at(30)).toBeLessThan(1.1);
    expect(at(10)).toBeLessThan(7);
    // And the algebra over-states by more and more, without bound.
    expect(naive(50) / at(50)).toBeGreaterThan(2);
    expect(naive(20) / at(20)).toBeGreaterThan(10);
    expect(naive(10) / at(10)).toBeGreaterThan(40);
    // The grid cannot store a 50um interface either: it is under half a cell.
    expect(umToUnits(50) / DELTA).toBeLessThan(0.5);
  });

  it('lets the pupil cap any multiplier below what a sharper interface would want', () => {
    // One coupling drives the displacement and the curvature together, so the
    // correction has to pass the same pupil test FILM_LENS exists to pass.
    const steepest = 1 / W_SIM;
    const throwFrac = (mult: number) =>
      Math.abs(
        irisPoint(0.05, 0, FILM_LENS * mult * steepest, 0)[0] -
          irisPoint(0.05, 0, 0, 0)[0]
      ) / pupilRadius(0);
    expect(throwFrac(1)).toBeLessThan(0.01);
    // What the naive correction would cost at the two ends of the defensible
    // range for a dewetting rim. The second is the original bug, restored.
    expect(throwFrac(15.1)).toBeGreaterThan(0.14);
    expect(throwFrac(41.8)).toBeGreaterThan(0.39);
    // Largest multiplier that keeps the throw a modulation rather than a smear.
    let cap = 1;
    while (throwFrac(cap * 1.001) < 0.05) cap *= 1.001;
    expect(cap).toBeGreaterThan(5);
    expect(cap).toBeLessThan(5.5);
  });

  it('draws the filigree ahead of the rim, which is the part that is right', () => {
    // Morphology is not what the honest coupling costs. On a real front the
    // bright line leads on the wet side and the dark companion trails on the
    // dry side, a cell out either way — the shape the spec asked for.
    const front = (x: number) => Math.tanh((x - 0.2) / W_SIM);
    let hi = 0;
    let hiAt = 0;
    let lo = 0;
    let loAt = 0;
    for (let i = -800; i <= 800; i++) {
      const x = 0.2 + (i / 80) * DELTA;
      const f = irisJacobian(x, 0, front).focus;
      if (f > hi) {
        hi = f;
        hiAt = x;
      }
      if (f < lo) {
        lo = f;
        loAt = x;
      }
    }
    expect((hiAt - 0.2) / DELTA).toBeGreaterThan(0.8); // wet side
    expect((hiAt - 0.2) / DELTA).toBeLessThan(1.5);
    expect((loAt - 0.2) / DELTA).toBeLessThan(-0.8); // dry side
    expect((loAt - 0.2) / DELTA).toBeGreaterThan(-1.5);
    expect(hi).toBeGreaterThan(-lo); // the crest gathers more than the slope loses
  });
});
