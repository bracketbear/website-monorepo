import { describe, it, expect } from 'vitest';
import {
  BETA_MAX,
  GRID,
  OMEGA_MAX,
  OMEGA_MIN,
  STEP,
  TAU,
  clampStiffness,
  decayPerStep,
  driveOmega,
  envelopeAlpha,
  modeOmega,
  wrapPhase,
} from './physics';

describe('chladni physics', () => {
  it('keeps the stiffness clamp below the leapfrog stability limit', () => {
    // beta * lambda_max <= 4, and the discrete grad^4 operator has
    // lambda_max = 64. Nothing in the manifest may reach past this.
    expect(BETA_MAX * 64).toBeLessThanOrEqual(4);
  });

  it('clamps stiffness from above, below and from garbage', () => {
    expect(clampStiffness(10)).toBe(BETA_MAX);
    expect(clampStiffness(0.04)).toBe(0.04);
    expect(clampStiffness(-1)).toBeGreaterThan(0);
    expect(clampStiffness(Number.NaN)).toBe(0.04);
  });

  it('maps the cursor linearly onto the drive band', () => {
    expect(driveOmega(0)).toBeCloseTo(OMEGA_MIN, 12);
    expect(driveOmega(1)).toBeCloseTo(OMEGA_MAX, 12);
    expect(driveOmega(0.5)).toBeCloseTo((OMEGA_MIN + OMEGA_MAX) / 2, 12);
    // Out of range must not escape the band.
    expect(driveOmega(-3)).toBe(OMEGA_MIN);
    expect(driveOmega(9)).toBe(OMEGA_MAX);
  });

  it('wraps phase into [0, TAU) from either direction', () => {
    expect(wrapPhase(0)).toBe(0);
    expect(wrapPhase(TAU + 0.25)).toBeCloseTo(0.25, 12);
    expect(wrapPhase(-0.25)).toBeCloseTo(TAU - 0.25, 12);
    expect(wrapPhase(1000 * TAU + 1)).toBeGreaterThanOrEqual(0);
    expect(wrapPhase(1000 * TAU + 1)).toBeLessThan(TAU);
  });

  it('turns a ring-down time into a per-step multiplier just under one', () => {
    const short = decayPerStep(0.5);
    const long = decayPerStep(30);
    expect(short).toBeGreaterThan(0);
    expect(short).toBeLessThan(1);
    expect(long).toBeGreaterThan(short);
    expect(long).toBeLessThan(1);
    // A 4s ring-down should lose 1/e over 4s worth of steps.
    expect(decayPerStep(4) ** (4 / STEP)).toBeCloseTo(Math.exp(-1), 6);
  });

  it('ties the envelope to three drive periods', () => {
    expect(envelopeAlpha(OMEGA_MIN)).toBeLessThan(envelopeAlpha(OMEGA_MAX));
    expect(envelopeAlpha(OMEGA_MIN)).toBeCloseTo(OMEGA_MIN / (TAU * 3), 12);
  });

  it('reproduces the dispersion table in the spec', () => {
    // Spec D3a: m half-waves across GRID cells at beta = 0.04.
    const w = (m: number) => modeOmega(0.04, (m * Math.PI) / GRID);
    expect(w(8)).toBeCloseTo(0.00769, 5);
    expect(w(16)).toBeCloseTo(0.03045, 5);
    // The drive band must actually contain the legible modes, or the
    // cursor sweeps across nothing.
    expect(w(8)).toBeGreaterThan(OMEGA_MIN);
    expect(w(22)).toBeLessThan(OMEGA_MAX);
  });
});
