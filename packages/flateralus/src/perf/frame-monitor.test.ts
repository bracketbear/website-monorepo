import { describe, it, expect } from 'vitest';
import { FrameMonitor } from './frame-monitor';

/** Feed a series of frame intervals, starting from an arbitrary clock. */
function feed(m: FrameMonitor, intervals: number[], t0 = 1000): number {
  let t = t0;
  m.record(t);
  for (const dt of intervals) {
    t += dt;
    m.record(t);
  }
  return t;
}

describe('FrameMonitor', () => {
  it('reports the median and 95th percentile of the intervals it saw', () => {
    const m = new FrameMonitor({ warmup: 0 });
    // 100 samples: ninety at 10ms, ten at 100ms.
    feed(m, [...Array(90).fill(10), ...Array(10).fill(100)]);
    const s = m.stats();
    expect(s.count).toBe(100);
    expect(s.p50).toBeCloseTo(10, 5);
    expect(s.p95).toBeCloseTo(100, 5);
  });

  it('derives fps from the median rather than the mean', () => {
    const m = new FrameMonitor({ warmup: 0 });
    // A hitching scene: mostly 10ms with occasional 500ms stalls. The mean
    // is 59ms and reports a tolerable-sounding 17fps; the median says the
    // typical frame is fine and the p95 is what exposes the stalls.
    feed(m, [...Array(90).fill(10), ...Array(10).fill(500)]);
    const s = m.stats();
    expect(s.fps).toBeCloseTo(100, 0);
    expect(s.p95).toBeGreaterThan(400);
  });

  it('reports nothing until the warmup frames have passed', () => {
    const m = new FrameMonitor({ warmup: 10 });
    feed(m, Array(8).fill(16));
    expect(m.stats().count).toBe(0);
    feed(m, Array(20).fill(16), 9000);
    expect(m.stats().count).toBeGreaterThan(0);
  });

  it('discards a stall longer than the outlier ceiling', () => {
    const m = new FrameMonitor({ warmup: 0, maxSample: 1000 });
    // A four-second stall is a breakpoint or a throttled tab, not a slow
    // scene, and it must not drag the statistics with it.
    feed(m, [16, 16, 4000, 16, 16]);
    const s = m.stats();
    expect(s.count).toBe(4);
    expect(s.p95).toBeLessThan(100);
  });

  it('discards the interval that spans a declared discontinuity', () => {
    const m = new FrameMonitor({ warmup: 0, maxSample: 1e9 });
    feed(m, [16, 16]);
    // The tab went away for a minute and came back.
    m.discontinuity();
    m.record(70000);
    m.record(70016);
    const s = m.stats();
    expect(s.count).toBe(3);
    expect(s.p95).toBeLessThan(100);
  });

  it('keeps only the most recent window once the ring wraps', () => {
    const m = new FrameMonitor({ window: 10, warmup: 0 });
    // Ten slow frames then ten fast ones: only the fast ones should remain.
    feed(m, [...Array(10).fill(100), ...Array(10).fill(5)]);
    const s = m.stats();
    expect(s.count).toBe(10);
    expect(s.p50).toBeCloseTo(5, 5);
  });

  it('can be told to discard several intervals, not just one', () => {
    const m = new FrameMonitor({ warmup: 0, maxSample: 1e9 });
    feed(m, [10, 10]);
    // Reallocating a render target can cost more than one frame, so a
    // discontinuity has to be able to cover the whole disturbance.
    m.discontinuity(3);
    let t = 100000;
    m.record(t);
    for (const dt of [800, 700, 600, 10, 10]) m.record((t += dt));
    const s = m.stats();
    // The three expensive frames are gone; the two settled ones are kept.
    expect(s.count).toBe(4);
    expect(s.p95).toBeLessThan(100);
  });

  it('starts over after a reset', () => {
    const m = new FrameMonitor({ warmup: 0 });
    feed(m, Array(20).fill(100));
    m.reset();
    expect(m.stats().count).toBe(0);
    feed(m, Array(20).fill(8), 50000);
    expect(m.stats().p50).toBeCloseTo(8, 5);
  });

  it('treats the first recorded frame as a baseline, not a sample', () => {
    const m = new FrameMonitor({ warmup: 0 });
    m.record(5000);
    expect(m.stats().count).toBe(0);
  });
});
