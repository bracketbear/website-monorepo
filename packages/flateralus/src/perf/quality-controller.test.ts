import { describe, it, expect } from 'vitest';
import { QualityController } from './quality-controller';
import type { FrameStats } from './frame-monitor';

/** Stats with enough samples to be actionable. */
function stats(p95: number, p50 = p95): FrameStats {
  return { count: 60, p50, p95, fps: p50 > 0 ? 1000 / p50 : 0 };
}

const BUDGET = 16.7;

describe('QualityController', () => {
  it('starts at full quality', () => {
    expect(new QualityController().quality).toBe(1);
  });

  it('drops quality when the 95th percentile is over budget', () => {
    const c = new QualityController({ budget: BUDGET });
    const q = c.update(stats(40), 1000);
    expect(q).toBeLessThan(1);
  });

  it('waits out the cooldown before dropping again', () => {
    const c = new QualityController({ budget: BUDGET, downCooldown: 250 });
    const first = c.update(stats(40), 1000);
    // Same frame-ish: a slow frame must not be counted three times and slide
    // the scene to its floor before the change has had a chance to help.
    expect(c.update(stats(40), 1050)).toBe(first);
    expect(c.update(stats(40), 1100)).toBe(first);
    expect(c.update(stats(40), 1300)).toBeLessThan(first);
  });

  it('climbs back when comfortably under budget, slower than it dropped', () => {
    const c = new QualityController({ budget: BUDGET });
    const dropped = c.update(stats(40), 1000);
    const drop = 1 - dropped;
    // Well under budget, past both cooldowns.
    const climbed = c.update(stats(6), 10000);
    expect(climbed).toBeGreaterThan(dropped);
    expect(climbed - dropped).toBeLessThan(drop);
  });

  it('holds inside the deadband', () => {
    const c = new QualityController({ budget: BUDGET });
    // Just under budget: not over, not comfortably under. This band is what
    // stops the loop from hunting.
    const q = c.update(stats(BUDGET * 0.95), 5000);
    expect(q).toBe(1);
    expect(c.update(stats(BUDGET * 1.05), 9000)).toBe(1);
  });

  it('never leaves the [minQuality, 1] range', () => {
    const c = new QualityController({ budget: BUDGET, minQuality: 0.3 });
    let t = 1000;
    for (let i = 0; i < 200; i++) c.update(stats(5000), (t += 500));
    expect(c.quality).toBeGreaterThanOrEqual(0.3);
    for (let i = 0; i < 400; i++) c.update(stats(1), (t += 2000));
    expect(c.quality).toBeLessThanOrEqual(1);
  });

  it('does nothing until there are enough samples', () => {
    const c = new QualityController({ budget: BUDGET, minSamples: 20 });
    const few: FrameStats = { count: 5, p50: 90, p95: 90, fps: 11 };
    expect(c.update(few, 1000)).toBe(1);
  });

  it('ignores the monitor entirely when pinned', () => {
    const c = new QualityController({ budget: BUDGET });
    c.setQuality(0.5);
    c.mode = 'fixed';
    let t = 1000;
    for (let i = 0; i < 50; i++) c.update(stats(400), (t += 500));
    expect(c.quality).toBe(0.5);
  });

  it('quantises quality so resolution changes in discrete steps', () => {
    const c = new QualityController({ budget: BUDGET, quantum: 0.05 });
    let t = 1000;
    for (let i = 0; i < 12; i++) {
      const q = c.update(stats(40), (t += 400));
      expect(Math.abs(q / 0.05 - Math.round(q / 0.05))).toBeLessThan(1e-9);
    }
  });

  it('settles instead of oscillating when frame time responds to quality', () => {
    // The failure mode this whole design exists to avoid: drop resolution,
    // get faster, raise resolution, get slower, forever. Cost goes as the
    // square of quality because resolution drives area, and C is chosen so
    // the equilibrium sits at q = 0.6.
    const C = BUDGET / (0.6 * 0.6);
    const c = new QualityController({ budget: BUDGET });
    let t = 1000;
    const history: number[] = [];
    for (let i = 0; i < 3000; i++) {
      const frame = C * c.quality * c.quality;
      history.push(c.update(stats(frame), (t += 20)));
    }
    const tail = history.slice(-600);
    const lo = Math.min(...tail);
    const hi = Math.max(...tail);
    // Settles near the analytic equilibrium, and stops moving around.
    expect(lo).toBeGreaterThan(0.45);
    expect(hi).toBeLessThan(0.7);
    expect(hi - lo).toBeLessThanOrEqual(0.05);
  });
});
