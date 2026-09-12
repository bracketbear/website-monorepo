import { describe, it, expect } from 'vitest';
import {
  CORNEA_L,
  DELTA,
  DOMAIN,
  GRID,
  IFACE_CELLS,
  KAPPA,
  MOBILITY,
  SAFETY,
  STEP,
  clampMobility,
  efoldSeconds,
  mobilityLimit,
  patchWavelength,
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
