/**
 * Column-major 3x3 helpers for a body that rolls.
 *
 * A ball that translates without turning reads as a sticker sliding on
 * glass, so the toys that roll carry a real orientation: angular velocity
 * from the contact point, integrated as an axis-angle rotation onto the
 * body-to-world matrix each frame, re-orthonormalised so the incremental
 * products do not drift. Shared by the pool's beach ball and the sandbox's.
 */

export type Mat3 = number[];

export function identity3(): Mat3 {
  return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

export function mul3(A: Mat3, B: Mat3): Mat3 {
  const C = new Array<number>(9);
  for (let c = 0; c < 3; c++)
    for (let r = 0; r < 3; r++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += A[k * 3 + r] * B[c * 3 + k];
      C[c * 3 + r] = s;
    }
  return C;
}

export function axisAngle3(x: number, y: number, z: number, th: number): Mat3 {
  const c = Math.cos(th);
  const s = Math.sin(th);
  const t = 1 - c;
  return [
    c + t * x * x,
    t * x * y + s * z,
    t * x * z - s * y,
    t * x * y - s * z,
    c + t * y * y,
    t * y * z + s * x,
    t * x * z + s * y,
    t * y * z - s * x,
    c + t * z * z,
  ];
}

/** Re-orthonormalize in place — repeated incremental rotations drift. */
export function ortho3(M: Mat3): void {
  let l = Math.hypot(M[0], M[1], M[2]);
  M[0] /= l;
  M[1] /= l;
  M[2] /= l;
  const d = M[0] * M[3] + M[1] * M[4] + M[2] * M[5];
  M[3] -= d * M[0];
  M[4] -= d * M[1];
  M[5] -= d * M[2];
  l = Math.hypot(M[3], M[4], M[5]);
  M[3] /= l;
  M[4] /= l;
  M[5] /= l;
  M[6] = M[1] * M[5] - M[2] * M[4];
  M[7] = M[2] * M[3] - M[0] * M[5];
  M[8] = M[0] * M[4] - M[1] * M[3];
}

/**
 * Advance a rolling body's orientation by one frame.
 *
 * Angular velocity comes from translation as contact-point rolling —
 * the axis is perpendicular to the velocity in the plane — with a little
 * slip on a soft surface, plus any spin about the vertical. `vx`, `vy` are
 * in the same length units as `r`.
 */
export function roll3(
  M: Mat3,
  vx: number,
  vy: number,
  r: number,
  spinZ: number,
  dt: number,
  slip = 0.85
): Mat3 {
  const bs = Math.hypot(vx, vy);
  let wx = 0;
  let wy = 0;
  if (bs > 1e-4) {
    const w = (bs / r) * slip;
    wx = (-vy / bs) * w;
    wy = (vx / bs) * w;
  }
  const wm = Math.hypot(wx, wy, spinZ);
  if (wm <= 1e-5) return M;
  const R = mul3(axisAngle3(wx / wm, wy / wm, spinZ / wm, wm * dt), M);
  ortho3(R);
  return R;
}
