import { describe, it, expect } from 'vitest';
import { makeCamera, project, projectMirror, groundHit } from './camera';

describe('camera', () => {
  const cam = makeCamera(0.75);

  it('puts the box in the frame with north up', () => {
    const c = project(cam, 0, 0, 0)!;
    expect(c).not.toBeNull();
    expect(c.u).toBeGreaterThan(0.2);
    expect(c.u).toBeLessThan(0.8);
    expect(c.v).toBeGreaterThan(0.3);
    expect(c.v).toBeLessThan(0.9);
    const far = project(cam, 0, 40, 0)!;
    expect(far.v).toBeLessThan(c.v); // further north is higher in the frame
    expect(far.depth).toBeGreaterThan(c.depth);
  });

  it('mirrors a light through the road plane to below its foot', () => {
    const foot = project(cam, 3, 3, 0)!;
    const lamp = project(cam, 3, 3, 1)!;
    const refl = projectMirror(cam, 3, 3, 1)!;
    expect(lamp.v).toBeLessThan(foot.v);
    expect(refl.v).toBeGreaterThan(foot.v);
    expect(Math.abs(refl.u - foot.u)).toBeLessThan(0.02);
  });

  it('unprojects a screen point back to the ground it came from', () => {
    for (const [x, y] of [
      [0, 0],
      [-2.6, 20],
      [8, -3],
    ]) {
      const s = project(cam, x, y, 0)!;
      const g = groundHit(cam, s.u, s.v)!;
      expect(g.x).toBeCloseTo(x, 3);
      expect(g.y).toBeCloseTo(y, 3);
    }
  });

  it('rejects points behind the camera', () => {
    expect(project(cam, 200, -200, 0)).toBeNull();
  });
});
