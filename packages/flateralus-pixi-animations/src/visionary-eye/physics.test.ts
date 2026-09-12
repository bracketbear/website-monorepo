import { describe, it, expect } from 'vitest';
import {
  BLINK_FRACTION,
  CLOSE_TIME,
  CORNEA_L,
  DELTA,
  DOMAIN,
  DRY_H,
  GRID,
  IFACE_CELLS,
  KAPPA,
  MOBILITY,
  OPEN_TIME,
  REDUCE,
  REFRACTORY,
  SAFETY,
  STEP,
  breakupFraction,
  clampMobility,
  efoldSeconds,
  isWiping,
  lidCoverage,
  mobilityLimit,
  newBlinkState,
  patchWavelength,
  stepBlink,
  tileInsideCornea,
  type BlinkState,
} from './physics';

describe('tear film constants', () => {
  it('derives the cell size from the domain and grid', () => {
    expect(DOMAIN).toBe(1.2);
    expect(GRID).toBe(128);
    expect(DELTA).toBeCloseTo(0.009375, 12);
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
