import { describe, it, expect } from 'vitest';
import {
  B,
  LANE,
  L_APPROACH,
  PATHS,
  APPROACHES,
  TURNS,
  destination,
  entryPoint,
  exitPoint,
  pathPose,
  approachPose,
  conflictBetween,
} from './geometry';

describe('destinations', () => {
  it('straight crosses, right and left turn the way right-hand traffic does', () => {
    // From north (heading south): right turn heads west, exits on the west road.
    expect(destination(0, 'straight')).toBe(2);
    expect(destination(0, 'right')).toBe(3);
    expect(destination(0, 'left')).toBe(1);
    // From east (heading west): right turn heads north.
    expect(destination(1, 'right')).toBe(0);
    expect(destination(1, 'left')).toBe(2);
  });
});

describe('paths', () => {
  it('a straight path is a line the length of the box', () => {
    const p = PATHS[0].straight;
    expect(p.len).toBeCloseTo(B, 3);
    const e = entryPoint(0);
    const x = exitPoint(2);
    // Inbound lane from the north sits on the west side of its road.
    expect(e.x).toBeCloseTo(-LANE, 6);
    expect(e.y).toBeCloseTo(B / 2, 6);
    expect(x.x).toBeCloseTo(-LANE, 6);
    expect(x.y).toBeCloseTo(-B / 2, 6);
  });

  it('turns are longer than a right turn and shorter than the box perimeter', () => {
    for (const a of APPROACHES) {
      expect(PATHS[a].right.len).toBeGreaterThan(2);
      expect(PATHS[a].left.len).toBeGreaterThan(PATHS[a].right.len);
      expect(PATHS[a].left.len).toBeLessThan(4 * B);
    }
  });

  it('a pose at the end of a path is the exit point, heading out', () => {
    for (const a of APPROACHES)
      for (const t of TURNS) {
        const p = PATHS[a][t];
        const end = pathPose(p, p.len);
        const x = exitPoint(destination(a, t));
        expect(end.x).toBeCloseTo(x.x, 2);
        expect(end.y).toBeCloseTo(x.y, 2);
        expect(Math.hypot(end.hx, end.hy)).toBeCloseTo(1, 4);
      }
  });

  it('the approach lane ends at the entry point', () => {
    const p = approachPose(1, L_APPROACH);
    const e = entryPoint(1);
    expect(p.x).toBeCloseTo(e.x, 6);
    expect(p.y).toBeCloseTo(e.y, 6);
    expect(p.hx).toBeCloseTo(-1, 6); // from the east, heading west
  });
});

describe('conflicts', () => {
  it('crossing straights conflict near the middle of both', () => {
    const c = conflictBetween(PATHS[0].straight, PATHS[1].straight);
    expect(c).not.toBeNull();
    expect(c!.sa).toBeGreaterThan(2);
    expect(c!.sa).toBeLessThan(B - 2);
    expect(c!.sb).toBeGreaterThan(2);
    expect(c!.sb).toBeLessThan(B - 2);
  });

  it('opposing straights do not conflict', () => {
    expect(conflictBetween(PATHS[0].straight, PATHS[2].straight)).toBeNull();
  });

  it('opposing right turns do not conflict', () => {
    expect(conflictBetween(PATHS[0].right, PATHS[2].right)).toBeNull();
  });

  it('a left yields to the oncoming straight because their paths cross', () => {
    expect(conflictBetween(PATHS[0].left, PATHS[2].straight)).not.toBeNull();
  });

  it('two paths to the same exit lane conflict at their ends', () => {
    // North straight and west right both leave by the south road.
    const c = conflictBetween(PATHS[0].straight, PATHS[3].right);
    expect(c).not.toBeNull();
    expect(c!.sa).toBeGreaterThan(PATHS[0].straight.len - 1.5);
    expect(c!.sb).toBeGreaterThan(PATHS[3].right.len - 1.5);
  });

  it('is symmetric', () => {
    const ab = conflictBetween(PATHS[0].straight, PATHS[1].left)!;
    const ba = conflictBetween(PATHS[1].left, PATHS[0].straight)!;
    expect(ab.sa).toBeCloseTo(ba.sb, 6);
    expect(ab.sb).toBeCloseTo(ba.sa, 6);
  });
});
