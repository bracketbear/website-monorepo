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
  MOBILITY,
  OPEN_TIME,
  PRIME_SECONDS,
  REDUCE,
  REFRACTORY,
  SAFETY,
  SEED_AMPLITUDE,
  STEP,
  TRANSIENT_GAIN_C,
  availableEfolds,
  breakupFraction,
  clampMobility,
  efoldSeconds,
  gazeFrame,
  isWiping,
  lidCoverage,
  mobilityLimit,
  newBlinkState,
  patchWavelength,
  spinodalResidence,
  stepBlink,
  tileInsideCornea,
  worldToLocal,
  type BlinkState,
} from './physics';

describe('tear film constants', () => {
  it('derives the cell size from the domain and grid', () => {
    expect(DOMAIN).toBe(1.2);
    expect(GRID).toBe(128);
    expect(DELTA).toBeCloseTo(0.009375, 12);
  });

  it('lays a seed that survives the traverse at an amplitude that reads', () => {
    // THE invariant. The traverse cannot manufacture structure: integrating
    // sigma(k, t) from the start of the descent — including the stretch above
    // the spinodal band, where the film is STABLE and actively damps the seed
    // — caps the gain at availableEfolds(), which here is 0.27, a factor of
    // 1.31. So whatever the seed is worth on the way in is essentially what
    // the patches are worth on the way out, and the seed must therefore be
    // large enough on its own.
    //
    // Two earlier revisions failed exactly here, both with a 3% seed: the disc
    // thinned evenly and never tore. Nothing in the rendering is wrong when
    // that happens, which is what makes it expensive to find. 0.5 is the
    // amplitude a patch needs to read against the well depth of 1.0.
    expect(SEED_AMPLITUDE * Math.exp(availableEfolds())).toBeGreaterThanOrEqual(
      0.5
    );
  });

  it('measures the growth budget from the integrated rate, not the residence', () => {
    // spinodalResidence()/efoldSeconds() is the seductive wrong answer: it
    // assumes sigma_max applies for the whole traverse and ignores the damping
    // before the band. It overstates the budget by about 5x here, which is the
    // difference between a film that tears and one that does not.
    expect(availableEfolds()).toBeCloseTo(
      (TRANSIENT_GAIN_C * MOBILITY) / (KAPPA * EVAP),
      12
    );
    expect(availableEfolds()).toBeLessThan(
      spinodalResidence() / efoldSeconds()
    );
    // The constant is the maximum of x*((2/(3*sqrt(3)))*(1-x)^1.5 - x); pin it
    // so a transcription slip cannot pass as a tuning change.
    let c = 0;
    for (let x = 0.0001; x < 1; x += 0.00001) {
      const g = x * ((2 / (3 * Math.sqrt(3))) * Math.pow(1 - x, 1.5) - x);
      if (g > c) c = g;
    }
    expect(TRANSIENT_GAIN_C).toBeCloseTo(c, 6);
  });

  it('primes into the window where patches exist and film remains', () => {
    // Transport is conservative, so the spatial mean falls at exactly EVAP
    // while film remains. Priming past the point where the mean reaches the
    // dry well hands the viewer a uniformly dry field on the first frame,
    // which renders as a black disc and reads as a dead shader — the first
    // failure this task hit.
    const meanAtSeed = 1 - SEED_AMPLITUDE / 2;
    expect(PRIME_SECONDS).toBeLessThan((meanAtSeed + 1) / EVAP);
    // And it must land after the mean has entered the spinodal band, or the
    // patches have not separated yet and priming has bought nothing.
    expect(PRIME_SECONDS).toBeGreaterThan(
      (meanAtSeed - 1 / Math.sqrt(3)) / EVAP
    );
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

  it('lands the derived timescale and patch size the spec argued for', () => {
    // e-fold = 32*dt*n^4/s at the spinodal; the spec's table says 1.78s.
    expect(efoldSeconds()).toBeCloseTo(1.778, 2);
    // patch wavelength = 2*pi*n*delta; 0.1178 tangent units = 1.22mm.
    expect(patchWavelength()).toBeCloseTo(0.1178, 4);
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
