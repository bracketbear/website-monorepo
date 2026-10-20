import { describe, it, expect } from 'vitest';
import { cameraTrack } from './camera';
import type { View } from './camera';
import { beats, cumulative } from './trace';

const B = beats(125);
// Out along x and back.
const points: [number, number][] = [
  [10, 50],
  [90, 50],
  [10, 50],
];
const cum = cumulative(points);
const wide: View = { cx: 50, cy: 50, k: 4 };
const spec = { points, cum, turnFrac: 0.5, beats: B, close: 30, wide };
const FPS = 1 / 60;

describe('route-trace camera', () => {
  it('opens on the lobby, close and at rest', () => {
    const at = cameraTrack({ ...spec, mode: 'first' });
    const v = at(0);
    expect(v.cx).toBeCloseTo(10, 6);
    expect(v.cy).toBeCloseTo(50, 6);
    expect(v.k).toBeCloseTo(30, 6);
    expect(at(FPS).cx - v.cx).toBeLessThan(0.01);
  });

  it('follows at the close scale until the turn, then pulls out', () => {
    const at = cameraTrack({ ...spec, mode: 'first' });
    expect(at(B.turn - 0.5).k).toBeCloseTo(30, 6);
    // Following: the centre is out past the lobby by the turn.
    expect(at(B.turn).cx).toBeGreaterThan(60);
    expect(at((B.turn + B.landed) / 2).k).toBeLessThan(20);
  });

  it('lands exactly on the wide frame two beats after home and stays', () => {
    const at = cameraTrack({ ...spec, mode: 'first' });
    for (const t of [B.landed - 1e-3, B.landed, B.landed + 5, Infinity]) {
      const v = at(t);
      expect(v.cx).toBeCloseTo(50, 2);
      expect(v.cy).toBeCloseTo(50, 2);
      expect(v.k).toBeCloseTo(4, 2);
    }
  });

  it('never jumps between frames', () => {
    const at = cameraTrack({ ...spec, mode: 'first' });
    let prev = at(0);
    for (let t = FPS; t < B.landed + 1; t += FPS) {
      const v = at(t);
      // Screen motion of the centre, in pixels at the current scale.
      expect(Math.hypot(v.cx - prev.cx, v.cy - prev.cy) * v.k).toBeLessThan(40);
      expect(Math.abs(Math.log(v.k / prev.k))).toBeLessThan(0.05);
      prev = v;
    }
  });

  it('a replay starts wide and pushes in to the lobby over the first bar', () => {
    const at = cameraTrack({ ...spec, mode: 'replay' });
    expect(at(0).k).toBeCloseTo(4, 6);
    expect(at(0).cx).toBeCloseTo(50, 6);
    expect(at(B.boot).k).toBeCloseTo(30, 3);
    expect(at(B.boot).cx).toBeLessThan(15);
  });

  it('holds the wide frame throughout when still', () => {
    const at = cameraTrack({ ...spec, mode: 'still' });
    for (const t of [0, B.turn, Infinity]) expect(at(t)).toEqual(wide);
  });
});
