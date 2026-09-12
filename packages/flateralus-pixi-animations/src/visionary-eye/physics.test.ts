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
  isWiping,
  lidCoverage,
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
  const wet = () => new Float32Array(size * size).fill(1);

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
    const t = new Float32Array(size * size).fill(-1);
    expect(breakupFraction(t)).toBe(1);
  });

  it('ignores dry tiles that fall outside the cornea', () => {
    const t = wet();
    t[0] = -1; // a corner, off the cap
    expect(breakupFraction(t)).toBe(0);
  });

  it('uses the dry threshold, not the sign of h', () => {
    const t = wet();
    const c = (size / 2) * size + size / 2;
    t[c] = DRY_H + 0.01; // thinning, not yet torn
    expect(breakupFraction(t)).toBe(0);
    t[c] = DRY_H - 0.01;
    expect(breakupFraction(t)).toBeGreaterThan(0);
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
