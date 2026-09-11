/**
 * The BB mark as path data, plus the two rasterizations animations need:
 * a white-on-transparent canvas for shader masks, and a binary bitmask for
 * the pixel-grid pieces.
 */

/** The BB mark, as SVG path data in a 400.89 x 249.73 viewBox. */
const LOGO_PATHS = [
  'm69.98,172.24v-94.76c0-4.14,3.36-7.5,7.5-7.5h15.14c1.66,0,3-1.34,3-3V3C95.62,1.34,94.28,0,92.62,0H15C6.72,0,0,6.72,0,15v219.73c0,8.28,6.72,15,15,15h77.62c1.66,0,3-1.34,3-3v-63.99c0-1.66-1.34-3-3-3h-15.14c-4.14,0-7.5-3.36-7.5-7.5Z',
  'm174.98,117.27c12.14,16.38,20.1,28.95,19.83,56.54-.73,66.7-62.49,74.8-77.35,75.78-1.73.11-3.19-1.26-3.19-2.99v-84.29c0-1.66-1.34-3-3-3h-19.68c-1.66,0-3-1.34-3-3v-64.05c0-1.66,1.34-3,3-3h19.68c1.66,0,3-1.34,3-3V3.05c0-1.72,1.44-3.08,3.16-3,12.12.59,55.68,6.48,69.61,59.96,7.61,29.23-3.42,50.36-12.06,57.26z',
  'm323.41,179.74h-15.14c-1.66,0-3,1.34-3,3v63.99c0,1.66,1.34,3,3,3h77.62c8.28,0,15-6.72,15-15V15C400.89,6.72,394.18,0,385.89,0h-77.62c-1.66,0-3,1.34-3,3v63.99c0,1.66,1.34,3,3,3h15.14c4.14,0,7.5,3.36,7.5,7.5v94.76c0,4.14-3.36,7.5-7.5,7.5Z',
  'm225.92,117.28c-8.64-6.9-19.67-28.03-12.06-57.26C227.79,6.53,271.35.64,283.47.05c1.72-.08,3.16,1.28,3.16,3v83.21c0,1.66,1.34,3,3,3h19.68c1.66,0,3,1.34,3,3v64.05c0,1.66-1.34,3-3,3h-19.68c-1.66,0-3,1.34-3,3v84.29c0,1.73-1.46,3.11-3.19,2.99-14.86-.98-76.62-9.08-77.35-75.78-.27-27.6,7.69-40.17,19.83-56.54z',
];

const LOGO_VIEWBOX = { w: 400.89, h: 249.73 };

/**
 * Draw the mark filled white into a 2D context already scaled to fit.
 *
 * The source SVG marks two of these paths fill-rule="evenodd", but none of
 * them self-intersects, so nonzero and evenodd produce identical coverage.
 * Measured at 48 and 60 cells wide, both rules agree to the pixel.
 */
function fillPaths(g: CanvasRenderingContext2D): void {
  g.fillStyle = '#ffffff';
  for (const d of LOGO_PATHS) g.fill(new Path2D(d));
}

let logoCanvas: HTMLCanvasElement | null = null;

/**
 * The BB mark rasterized white on transparent, alpha is the mask.
 *
 * Drawn from path data rather than an SVG data URL, so it is synchronous
 * and needs no image decode before the first frame.
 */
export function logoMask(width = 720, height = 450): HTMLCanvasElement {
  if (
    logoCanvas &&
    logoCanvas.width === width &&
    logoCanvas.height === height
  ) {
    return logoCanvas;
  }
  const cv = document.createElement('canvas');
  cv.width = width;
  cv.height = height;
  const g = cv.getContext('2d')!;
  g.scale(width / LOGO_VIEWBOX.w, height / LOGO_VIEWBOX.h);
  fillPaths(g);
  logoCanvas = cv;
  return cv;
}

export interface LogoBitmask {
  w: number;
  h: number;
  /** One byte per cell, 1 where the mark is solid. */
  m: Uint8Array;
}

/**
 * The mark as a coarse binary grid, for the pixel-grid animations. `cells`
 * is the width in cells; the height follows the mark's aspect.
 */
export function logoBitmask(cells: number): LogoBitmask {
  const w = Math.max(10, cells);
  const h = Math.max(4, Math.round((cells * LOGO_VIEWBOX.h) / LOGO_VIEWBOX.w));
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.scale(w / LOGO_VIEWBOX.w, h / LOGO_VIEWBOX.h);
  fillPaths(ctx);
  const data = ctx.getImageData(0, 0, w, h).data;
  const m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) m[i] = data[i * 4 + 3] > 110 ? 1 : 0;
  return { w, h, m };
}

const imageDataCache = new Map<string, ImageData>();

/**
 * The mark as raw pixels, for animations that sample alpha per cell rather
 * than using the canvas as a texture.
 */
export function logoImageData(width = 240, height = 150): ImageData {
  const key = `${width}x${height}`;
  const hit = imageDataCache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = width;
  cv.height = height;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  g.scale(width / LOGO_VIEWBOX.w, height / LOGO_VIEWBOX.h);
  fillPaths(g);
  const data = g.getImageData(0, 0, width, height);
  imageDataCache.set(key, data);
  return data;
}
