import { describe, it, expect } from 'vitest';
import {
  EASE_OUT,
  arrivalAt,
  baseAlpha,
  beats,
  bezierEase,
  bounce,
  BOUNCE_S,
  routeHits,
  createTrace,
  cumulative,
  pointAt,
  prefixAt,
  progressAt,
  restartTrace,
  stepTrace,
  type Timing,
} from './trace';

const TM: Timing = { bpm: 125, hold: 3, loop: true };
const B = beats(125);
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

  it('finds the point at a share of the arc', () => {
    const cum = cumulative(square);
    expect(pointAt(square, cum, 0)).toEqual([0, 0]);
    expect(pointAt(square, cum, 0.375)).toEqual([10, 5]);
    expect(pointAt(square, cum, 1)).toEqual([0, 0]);
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

describe('beats', () => {
  it('sits on a 125 BPM bar: boot one bar, turn at three, home at five, landed two beats on', () => {
    expect(B.beat).toBeCloseTo(0.48, 9);
    expect(B.boot).toBeCloseTo(1.92, 9);
    expect(B.turn).toBeCloseTo(5.76, 9);
    expect(B.home).toBeCloseTo(9.6, 9);
    expect(B.landed).toBeCloseTo(10.56, 9);
  });

  it('gives each leg two bars, the turn on its downbeat', () => {
    const tf = 0.47;
    expect(progressAt(0, B, tf)).toBe(0);
    expect(progressAt(B.boot, B, tf)).toBe(0);
    expect(progressAt(B.turn, B, tf)).toBeCloseTo(tf, 9);
    expect(progressAt(B.home, B, tf)).toBe(1);
    expect(progressAt(Infinity, B, tf)).toBe(1);
    for (const f of [0, 0.2, tf, 0.8, 1]) {
      expect(progressAt(arrivalAt(f, B, tf), B, tf)).toBeCloseTo(f, 9);
    }
  });
});

describe('clock', () => {
  it('holds once landed, then loops as a replay', () => {
    const s = createTrace(false);
    run(s, B.landed + TM.hold - 0.05);
    expect(s.replay).toBe(false);
    run(s, 0.1);
    expect(s.replay).toBe(true);
    expect(s.t).toBeLessThan(0.1);
  });

  it('with loop off, holds forever', () => {
    const s = createTrace(false);
    run(s, B.landed + 30, { ...TM, loop: false });
    expect(s.t).toBeGreaterThan(B.landed + 29);
    expect(s.replay).toBe(false);
  });

  it('restarts from a click, but not while the streets are still booting', () => {
    const s = createTrace(false);
    run(s, 0.5);
    restartTrace(s);
    expect(s.t).toBeGreaterThan(0.4);
    run(s, B.boot + 2);
    restartTrace(s);
    expect(s.t).toBe(0);
    expect(s.replay).toBe(true);
    // A replay can be clicked again at once.
    run(s, 0.2);
    restartTrace(s);
    expect(s.t).toBe(0);
  });

  it('starts finished under reduced motion and never loops; a click traces once', () => {
    const s = createTrace(true);
    expect(progressAt(s.t, B, 0.5)).toBe(1);
    run(s, 20);
    expect(progressAt(s.t, B, 0.5)).toBe(1);
    restartTrace(s);
    expect(s.t).toBe(0);
    run(s, B.landed + TM.hold + 5);
    expect(s.t).toBeGreaterThan(B.landed + TM.hold);
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

describe('route cells', () => {
  // A 6×6 grid with one street along row 2.
  const g = 6;
  const cells = new Array(g * g).fill(0);
  for (let x = 0; x < g; x++) cells[2 * g + x] = 1;

  it('snaps the route onto the street in the order it is run', () => {
    // Runs down the seam between rows 2 and 3: row 2 is the street.
    const pts: [number, number][] = [
      [0.5, 3],
      [5.5, 3],
    ];
    const hits = routeHits(pts, cumulative(pts), cells, g, 1);
    expect(hits.map((h) => h.cell)).toEqual([12, 13, 14, 15, 16, 17]);
    expect(hits.every((h) => h.first)).toBe(true);
    for (let i = 1; i < hits.length; i++)
      expect(hits[i].frac).toBeGreaterThan(hits[i - 1].frac);
  });

  it('marks the way back as a second arrival, not a new cell', () => {
    const pts: [number, number][] = [
      [0.5, 2.5],
      [5.5, 2.5],
      [0.5, 2.5],
    ];
    const hits = routeHits(pts, cumulative(pts), cells, g, 1);
    const firsts = hits.filter((h) => h.first).map((h) => h.cell);
    expect(new Set(firsts).size).toBe(6);
    expect(firsts).toHaveLength(6);
    expect(hits.filter((h) => !h.first).length).toBeGreaterThanOrEqual(5);
  });

  it('leaves no hole when the route crosses ground with no street', () => {
    const pts: [number, number][] = [
      [0.5, 0.5],
      [5.5, 5.5],
    ];
    const hits = routeHits(pts, cumulative(pts), cells, g, 1);
    for (let i = 1; i < hits.length; i++) {
      const a = hits[i - 1].cell;
      const b = hits[i].cell;
      const step = Math.max(
        Math.abs((a % g) - (b % g)),
        Math.abs(Math.floor(a / g) - Math.floor(b / g))
      );
      expect(step).toBeLessThanOrEqual(1);
    }
  });
});

describe('bounce', () => {
  it('rests before and after, peaks at 1, and dips only a hair', () => {
    expect(bounce(0)).toBe(0);
    expect(bounce(-1)).toBe(0);
    expect(bounce(BOUNCE_S * 2)).toBe(0);
    let peak = -Infinity;
    let low = Infinity;
    for (let t = 0; t < BOUNCE_S * 2; t += 0.001) {
      peak = Math.max(peak, bounce(t));
      low = Math.min(low, bounce(t));
    }
    expect(peak).toBeCloseTo(1, 3);
    expect(low).toBeLessThan(0);
    expect(low).toBeGreaterThan(-0.1);
    expect(Math.abs(bounce(BOUNCE_S * 1.9))).toBeLessThan(0.01);
  });
});
