import { describe, it, expect } from 'vitest';
import { resolveLever, resolveLevers, type QualityLever } from './quality';

describe('resolveLever', () => {
  const march: QualityLever = { min: 24, max: 72, step: 1 };

  it('gives max at full quality and min at zero', () => {
    expect(resolveLever(march, 1)).toBe(72);
    expect(resolveLever(march, 0)).toBe(24);
  });

  it('interpolates linearly by default', () => {
    expect(resolveLever({ min: 0, max: 10 }, 0.5)).toBeCloseTo(5, 10);
  });

  it('snaps to the step, because march counts cannot be fractional', () => {
    const v = resolveLever(march, 0.5);
    expect(Number.isInteger(v)).toBe(true);
    expect(v).toBe(48);
  });

  it('applies a curve when one is given', () => {
    // Resolution is an area, so an author may want cost to fall off as the
    // square rather than linearly.
    const lever: QualityLever = { min: 0, max: 1, curve: (q) => q * q };
    expect(resolveLever(lever, 0.5)).toBeCloseTo(0.25, 10);
  });

  it('clamps quality outside [0, 1]', () => {
    expect(resolveLever(march, 5)).toBe(72);
    expect(resolveLever(march, -2)).toBe(24);
  });

  it('runs backwards when max is below min', () => {
    // Some levers get cheaper by going up — a dither or downsample amount —
    // and inverting the endpoints should be enough to say so.
    const dither: QualityLever = { min: 1, max: 0 };
    expect(resolveLever(dither, 1)).toBeCloseTo(0, 10);
    expect(resolveLever(dither, 0)).toBeCloseTo(1, 10);
    expect(resolveLever(dither, 0.25)).toBeCloseTo(0.75, 10);
  });
});

describe('resolveLevers', () => {
  it('resolves every declared lever at once', () => {
    const out = resolveLevers(
      {
        renderScale: { min: 0.35, max: 1 },
        marchSteps: { min: 24, max: 72, step: 1 },
        aoTaps: { min: 1, max: 5, step: 1 },
      },
      0
    );
    expect(out).toEqual({ renderScale: 0.35, marchSteps: 24, aoTaps: 1 });
  });

  it('returns an empty set for an animation that declares nothing', () => {
    expect(resolveLevers({}, 0.5)).toEqual({});
  });
});
