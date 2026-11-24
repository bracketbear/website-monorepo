import { describe, it, expect } from 'vitest';
import { letterbox, alphaToGrid } from './mask-grid';

describe('letterbox', () => {
  it('fits a wide image to the grid width and centres it', () => {
    const [x, y, w, h] = letterbox(1600, 400, 200, 100, 1);
    expect(w).toBeCloseTo(200);
    expect(h).toBeCloseTo(50);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(25);
  });

  it('fits a tall image to the grid height', () => {
    const [x, , w, h] = letterbox(100, 400, 200, 100, 1);
    expect(h).toBeCloseTo(100);
    expect(w).toBeCloseTo(25);
    expect(x).toBeCloseTo(87.5);
  });

  it('applies scale about the centre', () => {
    const [x, y, w, h] = letterbox(200, 100, 200, 100, 0.5);
    expect([x, y, w, h]).toEqual([50, 25, 100, 50]);
  });
});

describe('alphaToGrid', () => {
  it('flips rows so index 0 is the bottom of the image', () => {
    // 1×2 image: top pixel opaque, bottom pixel clear.
    const rgba = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 0]);
    const g = alphaToGrid(rgba, 1, 2);
    expect(g[0]).toBe(0); // bottom
    expect(g[1]).toBe(1); // top
  });
});
