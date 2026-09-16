import { describe, it, expect } from 'vitest';
import { bleedInset, sizeStageFor } from './stage-cover';

describe('bleedInset', () => {
  it('fits the stage exactly at cover 1', () => {
    expect(bleedInset(1)).toBe('0%');
  });

  it('bleeds half the overhang off each edge', () => {
    // 1.8x around a 1920x1080 stage: 3456x1944, hanging 768/432 off each side.
    expect(bleedInset(1.8)).toBe('-40%');
    expect(bleedInset(1.6)).toBe('-30%');
  });

  it('never shrinks the host inside the stage', () => {
    expect(bleedInset(0.5)).toBe('0%');
  });
});

describe('sizeStageFor', () => {
  it('bleeds the host out by the cover factor', () => {
    const host = document.createElement('div');
    sizeStageFor(host, null, 1.8);
    expect(host.style.inset).toBe('-40%');
  });

  it('resizes the surface only after the host has taken its new size', () => {
    // The bug this guards: an animation mounted against the old, smaller
    // surface bakes its layout at that size and leaves the stage uncovered.
    const host = document.createElement('div');
    const seen: string[] = [];
    const app = { resizeToContainer: () => seen.push(host.style.inset) };

    sizeStageFor(host, app, 1.8);

    expect(seen).toEqual(['-40%']);
  });

  it('returns the host to the stage box for a slide with no animation', () => {
    const host = document.createElement('div');
    sizeStageFor(host, null, 1.8);
    sizeStageFor(host, null, 1);
    expect(host.style.inset).toBe('0%');
  });
});
