/**
 * A pinhole camera on a tower south of the corner, looking down into the
 * crossing with the north approach receding up the frame. One projection
 * for everything: road, vehicles, lights, and the same lights mirrored
 * through the road plane, which is what a wet street does to them.
 */

export interface Camera {
  pos: [number, number, number];
  /** Orthonormal basis: forward, right, up. */
  f: [number, number, number];
  r: [number, number, number];
  u: [number, number, number];
  /** tan(fovY / 2). */
  tanH: number;
  aspect: number;
}

export interface Projected {
  /** Fraction across the frame, 0 left. */
  u: number;
  /** Fraction down the frame, 0 top. */
  v: number;
  /** Distance along the view axis, m. */
  depth: number;
}

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: V3): V3 => {
  const m = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / m, a[1] / m, a[2] / m];
};

/**
 * A tower south of the corner, high enough and far enough back that the
 * north and the east queues both climb into the frame instead of one of
 * them sweeping past the lens: aimed north-east, across the box, so the
 * north approach climbs the middle of the frame and the east approach
 * climbs its right side. A mast planted at the curb sits inside the south
 * queue's own length, so a car passing the mast's latitude balloons; this
 * is pulled back enough that a seven-car queue (the longest a stress run
 * holding one approach for a minute built) stays in front of the lens at
 * a sane size. A portrait frame gets a taller field of view, so both queues
 * still reach the edges.
 */
export function makeCamera(aspect: number): Camera {
  const pos: V3 = [-8, -46, 40];
  const target: V3 = [4, -4, 0.5];
  const f = norm(sub(target, pos));
  const r = norm(cross(f, [0, 0, 1]));
  const u = cross(r, f);
  const fovY = aspect < 1 ? 1.1 : 0.85;
  return { pos, f, r, u, tanH: Math.tan(fovY / 2), aspect };
}

export function cameraPos(cam: Camera): [number, number, number] {
  return cam.pos;
}

export function project(
  cam: Camera,
  x: number,
  y: number,
  z: number
): Projected | null {
  const d = sub([x, y, z], cam.pos);
  const depth = dot(d, cam.f);
  if (depth < 0.2) return null;
  const px = dot(d, cam.r) / (depth * cam.tanH * cam.aspect);
  const py = dot(d, cam.u) / (depth * cam.tanH);
  return { u: 0.5 + 0.5 * px, v: 0.5 - 0.5 * py, depth };
}

/** The same point seen in the wet road: mirrored through z = 0. */
export function projectMirror(
  cam: Camera,
  x: number,
  y: number,
  z: number
): Projected | null {
  return project(cam, x, y, -z);
}

/** Where a ray through a frame point meets the road plane. */
export function groundHit(
  cam: Camera,
  u: number,
  v: number
): { x: number; y: number } | null {
  const px = (u - 0.5) * 2 * cam.tanH * cam.aspect;
  const py = (0.5 - v) * 2 * cam.tanH;
  const dir: V3 = [
    cam.f[0] + cam.r[0] * px + cam.u[0] * py,
    cam.f[1] + cam.r[1] * px + cam.u[1] * py,
    cam.f[2] + cam.r[2] * px + cam.u[2] * py,
  ];
  if (dir[2] >= -1e-6) return null;
  const t = -cam.pos[2] / dir[2];
  return { x: cam.pos[0] + dir[0] * t, y: cam.pos[1] + dir[1] * t };
}
