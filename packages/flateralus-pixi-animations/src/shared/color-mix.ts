/**
 * Colour blending for animations that tint per frame.
 *
 * Works on packed 0xRRGGBB integers because that is what PIXI tints and
 * fills take, so nothing has to round-trip through a string.
 */

/** Linear blend between two packed RGB colours, `t` in 0..1. */
export function lerpColor(a: number, b: number, t: number): number {
  const ar = a >> 16;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = b >> 16;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  return (
    (Math.round(ar + (br - ar) * t) << 16) +
    (Math.round(ag + (bg - ag) * t) << 8) +
    Math.round(ab + (bb - ab) * t)
  );
}
