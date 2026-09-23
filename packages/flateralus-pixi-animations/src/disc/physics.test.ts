import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PARAMS,
  R_IN,
  R_OUT,
  createDisc,
  ringIndex,
  ringMean,
  totalMass,
  isHealthy,
  type DiscParams,
} from './physics';

const NR = 48;
const NPHI = 96;

function params(over: Partial<DiscParams> = {}): DiscParams {
  return { ...DEFAULT_PARAMS, ...over };
}

describe('the opening disc', () => {
  it('holds about discMass, less the tapers', () => {
    const D = createDisc(NR, NPHI, params());
    const m = totalMass(D);
    expect(m).toBeGreaterThan(0.85 * DEFAULT_PARAMS.discMass);
    expect(m).toBeLessThan(1.0 * DEFAULT_PARAMS.discMass);
    expect(isHealthy(D)).toBe(true);
  });

  it('rotates sub-Keplerian by the pressure gradient', () => {
    const p = params();
    const D = createDisc(NR, NPHI, p);
    const i = ringIndex(D, 1.0);
    const r = D.r[i];
    const vK = 1 / Math.sqrt(r);
    // Σ ∝ 1/r and c_s² = h²/r give v_φ² = (1 − 2h²) v_K² analytically.
    const want = vK * Math.sqrt(1 - 2 * p.h * p.h);
    expect(Math.abs(D.vp[i * NPHI] - want) / vK).toBeLessThan(2e-3);
    expect(D.vr[i * NPHI]).toBe(0);
  });

  it('is uniform along φ and falls as 1/r in the body', () => {
    const D = createDisc(NR, NPHI, params());
    const a = ringIndex(D, 0.6);
    const b = ringIndex(D, 1.4);
    expect(ringMean(D, a) * D.r[a]).toBeCloseTo(ringMean(D, b) * D.r[b], 6);
    for (let j = 1; j < NPHI; j++)
      expect(D.sig[a * NPHI + j]).toBe(D.sig[a * NPHI]);
  });

  it('spans the cavity to the edge with same-shaped cells', () => {
    const D = createDisc(NR, NPHI, params());
    expect(D.rf[0]).toBeCloseTo(R_IN, 9);
    expect(D.rf[NR]).toBeCloseTo(R_OUT, 9);
    expect(D.dlnr).toBeCloseTo(Math.log(R_OUT / R_IN) / NR, 12);
    expect(D.dphi).toBeCloseTo((2 * Math.PI) / NPHI, 12);
  });
});
