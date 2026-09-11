/**
 * 4x4 ordered (Bayer) dither matrix. Compare `BAYER[y % 4][x % 4] / 16`
 * against a 0..1 threshold to decide whether a cell is on.
 */
export const BAYER: readonly (readonly number[])[] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Sample the matrix with wrapping that is correct for negative inputs. */
export function bayerAt(x: number, y: number): number {
  return BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4] / 16;
}

/** Linear blend between two packed integer colors. */
export function mixColor(a: number, b: number, t: number): number {
  const r = Math.round(
    ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t
  );
  const g = Math.round(
    ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t
  );
  const bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * t);
  return (r << 16) + (g << 8) + bl;
}
