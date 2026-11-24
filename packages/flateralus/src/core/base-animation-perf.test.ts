import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseAnimation } from './base-animation';
import { createManifest } from '../utils/create-manifest';
import type { QualityLevers } from '../perf/quality';

const MANIFEST = createManifest({
  id: 'perf-probe',
  name: 'Perf Probe',
  description: 'A do-nothing animation, for exercising the timing plumbing.',
  controls: [],
} as const);

class Probe extends BaseAnimation<typeof MANIFEST, never, object> {
  /** deltaTime handed to onUpdate on each call, in seconds. */
  deltas: number[] = [];
  protected readonly qualityLevers: QualityLevers = {
    marchSteps: { min: 24, max: 72, step: 1 },
  };
  constructor() {
    super(MANIFEST as never);
  }
  onInit(): void {}
  onUpdate(_c: object, _v: never, dt: number): void {
    this.deltas.push(dt);
  }
  onDestroy(): void {}
}

/** Drive the animation's clock without waiting in real time. */
let clock = 0;
beforeEach(() => {
  clock = 10_000;
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
});
afterEach(() => vi.restoreAllMocks());

function tick(p: Probe, ms: number, times: number) {
  for (let i = 0; i < times; i++) {
    clock += ms;
    p.update();
  }
}

describe('BaseAnimation performance plumbing', () => {
  it('measures on the same clock it hands to onUpdate', () => {
    const p = new Probe();
    p.init({});
    tick(p, 16, 3);
    // If init seeded lastUpdateTime from a different epoch than update reads,
    // the first delta would be astronomical rather than 16ms.
    expect(p.deltas[0]).toBeCloseTo(0.016, 6);
    expect(Math.max(...p.deltas)).toBeLessThan(1);
  });

  it('reports frame statistics once past warmup', () => {
    const p = new Probe();
    p.init({});
    tick(p, 20, 200);
    const s = p.getFrameStats();
    expect(s.count).toBeGreaterThan(0);
    expect(s.p50).toBeCloseTo(20, 0);
    expect(s.fps).toBeCloseTo(50, 0);
  });

  it('starts at full quality and gives it up when frames run long', () => {
    const p = new Probe();
    p.init({});
    expect(p.getQuality()).toBe(1);
    tick(p, 120, 400);
    expect(p.getQuality()).toBeLessThan(1);
  });

  it('holds quality where it is put when pinned', () => {
    const p = new Probe();
    p.init({});
    p.setQualityMode('fixed', 0.5);
    tick(p, 500, 400);
    expect(p.getQuality()).toBe(0.5);
  });

  it('resolves declared levers against the live quality', () => {
    const p = new Probe();
    p.init({});
    expect(p.getResolvedLevers().marchSteps).toBe(72);
    p.setQualityMode('fixed', 0);
    expect(p.getResolvedLevers().marchSteps).toBe(24);
  });

  it('does not measure the gap across a discontinuity', () => {
    const p = new Probe();
    p.init({});
    tick(p, 16, 200);
    const before = p.getFrameStats().p95;
    // The tab went away for a minute.
    p.notifyDiscontinuity();
    clock += 60_000;
    p.update();
    tick(p, 16, 5);
    expect(p.getFrameStats().p95).toBeCloseTo(before, 0);
  });

  it('does not measure the frames in which it changed quality', () => {
    const p = new Probe();
    p.init({});
    // Long frames, so the controller keeps lowering quality.
    tick(p, 60, 200);
    const q1 = p.getQuality();
    expect(q1).toBeLessThan(1);
    // Now every frame that follows a change is expensive, the way a render
    // target reallocation is. If those land in the window, the controller
    // reads its own adjustment as evidence the scene got slower and chases
    // itself down to the floor.
    const before = p.getFrameStats().p95;
    tick(p, 16, 300);
    expect(p.getFrameStats().p95).toBeLessThanOrEqual(before);
  });

  it('forgets its measurements when re-initialised', () => {
    const p = new Probe();
    p.init({});
    tick(p, 200, 300);
    expect(p.getQuality()).toBeLessThan(1);
    p.init({});
    expect(p.getQuality()).toBe(1);
    expect(p.getFrameStats().count).toBe(0);
  });
});
