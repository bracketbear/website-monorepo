import { describe, it, expect } from 'vitest';
import {
  SPS,
  burning,
  frontX,
  ignite,
  makeSheet,
  stepSheet,
  type Sheet,
} from './slowBurn.sim';

const GW = 384;
const GH = 40;
const ROW = 20;
/** Bars of type 16 cells tall, on a sheet of paper. */
const bars = (spans: [number, number][]) => {
  const l = new Float32Array(GW * GH);
  for (const [a, b] of spans) {
    for (let j = 12; j < 28; j++) for (let i = a; i < b; i++) l[i + j * GW] = 1;
  }
  return l;
};
const runUntil = (s: Sheet, maxSecs: number, done: () => boolean) => {
  let k = 0;
  while (k < maxSecs * SPS && !done()) {
    stepSheet(s);
    k++;
  }
  return k / SPS;
};

describe('slow burn', () => {
  it('only ever loses fuel', () => {
    const s = makeSheet(bars([[10, 200]]), GW, GH);
    ignite(s, 12, ROW);
    for (let k = 0; k < 600; k++) {
      const before = Float32Array.from(s.fuel);
      stepSheet(s);
      for (let n = 0; n < before.length; n += 97) {
        expect(s.fuel[n]).toBeLessThanOrEqual(before[n]);
        expect(s.fuel[n]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('walks through type at about 60 cells a second, not all at once', () => {
    const s = makeSheet(bars([[10, 374]]), GW, GH);
    ignite(s, 12, ROW);
    const t0 = runUntil(s, 20, () => frontX(s, ROW) >= 60);
    const t1 = runUntil(s, 20, () => frontX(s, ROW) >= 300);
    const v = 240 / t1;
    expect(t0).toBeLessThan(3);
    expect(v).toBeGreaterThan(40);
    expect(v).toBeLessThan(75);
    // The flash-over guard: the far end catches seconds after the near end.
    expect(t1).toBeGreaterThan(3);
  });

  it('crosses a word space on the paper, slower than it crosses type', () => {
    const s = makeSheet(
      bars([
        [10, 120],
        [136, 260],
      ]),
      GW,
      GH
    );
    ignite(s, 12, ROW);
    runUntil(s, 20, () => frontX(s, ROW) >= 118);
    const gap = runUntil(s, 20, () => frontX(s, ROW) >= 140);
    // It gets there...
    expect(gap).toBeLessThan(3);
    // ...and not at type speed, which would take 22 cells in 0.37 s. This
    // floor was 0.6 s when the paper was expected to run at a quarter of
    // the type's speed; measured, a front that slow is past extinction (see
    // the header of slowBurn.sim.ts), and half is what there is.
    expect(gap).toBeGreaterThan(0.45);
  });

  it('stalls at the gap if the paper cannot burn — which is why the paper burns', () => {
    const s = makeSheet(
      bars([
        [10, 120],
        [136, 260],
      ]),
      GW,
      GH,
      0
    );
    ignite(s, 12, ROW);
    runUntil(s, 30, () => !burning(s));
    expect(frontX(s, ROW)).toBeLessThan(136);
  });

  it('keeps the paper smouldering, never flaming', () => {
    const s = makeSheet(bars([]), GW, GH);
    ignite(s, 100, ROW);
    let hottest = 0;
    for (let k = 0; k < 4 * SPS; k++) {
      stepSheet(s);
      for (let i = 130; i < GW; i += 3) {
        hottest = Math.max(hottest, s.temp[i + ROW * GW]);
      }
    }
    // It does carry a front...
    expect(frontX(s, ROW)).toBeGreaterThan(160);
    expect(hottest).toBeGreaterThan(0.2);
    // ...well under where the display starts drawing flame.
    expect(hottest).toBeLessThan(0.6);
  });

  it('burns out', () => {
    const s = makeSheet(bars([[10, 374]]), GW, GH);
    ignite(s, 12, ROW);
    const t = runUntil(s, 40, () => !burning(s));
    expect(t).toBeGreaterThan(6);
    expect(t).toBeLessThan(14);
  });

  it('leaves embers that outlast the flame, glow hotter when fanned, and go out', () => {
    const CELL = 65 + ROW * GW;
    // Timed from the moment the front passes the cell, not from the end of
    // the fire: by then the middle of the bar burned seconds ago.
    const passed = () => {
      const s = makeSheet(bars([[10, 120]]), GW, GH);
      ignite(s, 12, ROW);
      runUntil(s, 30, () => frontX(s, ROW) >= 65);
      return s;
    };
    const still = passed();
    const fanned = passed();
    for (let k = 0; k < SPS; k++) {
      stepSheet(still);
      stepSheet(fanned, { ci: 65, cj: ROW, r: 14, k: 2 });
      if (k === SPS / 2 - 1) {
        // Half a second in, moving air has the ember far hotter.
        expect(fanned.temp[CELL]).toBeGreaterThan(still.temp[CELL] * 1.5);
      }
    }
    // A second after the flame, with no embers, this cell reads 0.01.
    expect(still.temp[CELL]).toBeGreaterThan(0.25);
    // Fanned char is spent sooner.
    expect(fanned.char[CELL]).toBeLessThan(still.char[CELL] * 0.6);
    // And they do go out.
    for (let k = 0; k < 5 * SPS; k++) stepSheet(still);
    expect(still.temp[CELL]).toBeLessThan(0.03);
  });
});
