import { describe, it, expect } from 'vitest';
import {
  BOOT_S,
  EASE_OUT,
  baseAlpha,
  bezierEase,
  bootFraction,
  createTrace,
  cumulative,
  prefixAt,
  restartTrace,
  stepTrace,
  type Timing,
} from './trace';

const TM: Timing = { trace: 4, hold: 3, loop: true };
const run = (
  s: ReturnType<typeof createTrace>,
  secs: number,
  tm = TM,
  dt = 1 / 60
) => {
  for (let k = 0; k < Math.round(secs / dt); k++) stepTrace(s, dt, tm);
};
const length = (pts: [number, number][]) => {
  let L = 0;
  for (let i = 1; i < pts.length; i++)
    L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
};
const square: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];

describe('ease', () => {
  it('pins the endpoints and runs ahead of linear', () => {
    expect(EASE_OUT(0)).toBeCloseTo(0, 6);
    expect(EASE_OUT(1)).toBeCloseTo(1, 6);
    expect(EASE_OUT(0.5)).toBeGreaterThan(0.8);
    let prev = 0;
    for (let i = 1; i <= 100; i++) {
      const v = EASE_OUT(i / 100);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });

  it('reduces to the identity for the straight-line control points', () => {
    const lin = bezierEase(1 / 3, 1 / 3, 2 / 3, 2 / 3);
    expect(lin(0.25)).toBeCloseTo(0.25, 4);
    expect(lin(0.8)).toBeCloseTo(0.8, 4);
  });
});

describe('geometry', () => {
  it('accumulates arc length from zero', () => {
    const cum = cumulative(square);
    expect(Array.from(cum)).toEqual([0, 10, 20, 30, 40]);
  });

  it('cuts a prefix whose length is the asked fraction, with an interpolated head', () => {
    const cum = cumulative(square);
    const half = prefixAt(square, cum, 0.5);
    expect(length(half)).toBeCloseTo(20, 9);
    expect(half[half.length - 1]).toEqual([10, 10]);
    const bit = prefixAt(square, cum, 0.125);
    expect(bit).toEqual([
      [0, 0],
      [5, 0],
    ]);
    expect(prefixAt(square, cum, 0)).toEqual([[0, 0]]);
    expect(prefixAt(square, cum, 1)).toEqual(square);
  });

  it('survives repeated consecutive points without NaN', () => {
    const pts: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 0],
      [10, 10],
    ];
    const cum = cumulative(pts);
    for (const f of [0.49, 0.5, 0.51, 0.75]) {
      for (const [x, y] of prefixAt(pts, cum, f)) {
        expect(Number.isNaN(x)).toBe(false);
        expect(Number.isNaN(y)).toBe(false);
      }
    }
    expect(length(prefixAt(pts, cum, 0.5))).toBeCloseTo(10, 9);
  });
});

describe('phases', () => {
  it('boots for 1.6 s, eased, then traces linearly', () => {
    const s = createTrace(false);
    expect(s.phase).toBe('boot');
    expect(bootFraction(s)).toBe(0);
    run(s, 0.8);
    expect(bootFraction(s)).toBeGreaterThan(0.8);
    run(s, 0.81);
    expect(s.phase).toBe('trace');
    expect(bootFraction(s)).toBe(1);
    run(s, TM.trace / 2);
    expect(s.progress).toBeCloseTo(0.5, 2);
  });

  it('holds, then loops; the streets are not re-booted', () => {
    const s = createTrace(false);
    run(s, BOOT_S + TM.trace + 0.1);
    expect(s.phase).toBe('hold');
    expect(s.progress).toBe(1);
    run(s, TM.hold);
    expect(s.phase).toBe('trace');
    expect(s.progress).toBeLessThan(0.1);
    expect(bootFraction(s)).toBe(1);
  });

  it('with loop off, holds forever', () => {
    const s = createTrace(false);
    run(s, BOOT_S + TM.trace + 30, { ...TM, loop: false });
    expect(s.phase).toBe('hold');
    expect(s.progress).toBe(1);
  });

  it('hold 0 restarts at once instead of sticking', () => {
    const s = createTrace(false);
    const tm = { ...TM, hold: 0 };
    run(s, BOOT_S + TM.trace + 0.05, tm);
    expect(s.phase).toBe('trace');
    expect(s.progress).toBeLessThan(0.05);
  });

  it('keeps its progress when the trace duration changes mid-trace', () => {
    const s = createTrace(false);
    run(s, BOOT_S + 2);
    const before = s.progress;
    stepTrace(s, 1 / 60, { ...TM, trace: 12 });
    expect(s.progress).toBeGreaterThan(before);
    expect(s.progress - before).toBeLessThan(0.01);
  });

  it('restarts from a click during trace or hold, never during boot', () => {
    const s = createTrace(false);
    run(s, 0.5);
    restartTrace(s);
    expect(s.phase).toBe('boot');
    run(s, BOOT_S + 2);
    restartTrace(s);
    expect(s.phase).toBe('trace');
    expect(s.progress).toBe(0);
    run(s, TM.trace + 0.1);
    restartTrace(s);
    expect(s.phase).toBe('trace');
    expect(s.progress).toBe(0);
  });

  it('starts finished under reduced motion, and a click still replays', () => {
    const s = createTrace(true);
    expect(s.phase).toBe('hold');
    expect(s.progress).toBe(1);
    expect(bootFraction(s)).toBe(1);
    run(s, 10, { ...TM, loop: false });
    expect(s.progress).toBe(1);
    restartTrace(s);
    expect(s.phase).toBe('trace');
    expect(s.progress).toBe(0);
  });

  it('under reduced motion, never loops on its own, even when loop is on', () => {
    const s = createTrace(true);
    run(s, 20, { ...TM, loop: true });
    expect(s.phase).toBe('hold');
    expect(s.progress).toBe(1);
    // A click is the viewer asking: trace once, then hold again.
    restartTrace(s);
    run(s, TM.trace + TM.hold + 5, { ...TM, loop: true });
    expect(s.phase).toBe('hold');
    expect(s.progress).toBe(1);
  });
});

describe('baseAlpha', () => {
  it('is 0.42 at desktop scale and fades toward 0.22 on a phone', () => {
    expect(baseAlpha(9.4)).toBeCloseTo(0.42, 6);
    expect(baseAlpha(3.5)).toBeCloseTo(0.42, 6);
    expect(baseAlpha(2.75)).toBeCloseTo(0.32, 6);
    expect(baseAlpha(2)).toBeCloseTo(0.22, 6);
    expect(baseAlpha(1)).toBeCloseTo(0.22, 6);
  });
});
