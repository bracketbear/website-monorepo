import { GRID } from './physics';
import { sdfMaskInfo } from '../shared/sdf-harness';

/**
 * The plate's boundary as a GRID x GRID canvas: white inside, black outside.
 *
 * This is sampled by three passes as the simply-supported boundary condition
 * (spec D2): w = 0 and grad^2 w = 0 hold wherever this is black, both by
 * construction with no ghost cells anywhere.
 *
 * A margin of three cells is left clear on every side so the 13-point
 * biharmonic stencil never reaches past the texture edge, where CLAMP_TO_EDGE
 * would silently mirror the interior back in and impose a boundary nobody
 * chose.
 */
export function boundaryCanvas(kind: 0 | 1 | 2): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = GRID;
  cv.height = GRID;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, GRID, GRID);
  g.fillStyle = '#fff';

  const M = 3; // cells of clearance, >= the 2-cell stencil reach
  const S = GRID - M * 2;

  if (kind === 0) {
    g.fillRect(M, M, S, S);
  } else if (kind === 1) {
    g.beginPath();
    g.arc(GRID / 2, GRID / 2, S / 2, 0, Math.PI * 2);
    g.fill();
  } else {
    // The mark's own outline. sdfMaskInfo already rasterizes the lockup and
    // hands back a binary interior mask, so the plate is literally the
    // letterforms and its modes belong to the brand's geometry.
    const info = sdfMaskInfo();
    const img = g.createImageData(GRID, GRID);
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const inMargin = x < M || y < M || x >= GRID - M || y >= GRID - M;
        const u = (x - M) / (S - 1);
        const v = (y - M) / (S - 1);
        const sx = Math.min(
          info.W - 1,
          Math.max(0, Math.floor(u * (info.W - 1)))
        );
        const sy = Math.min(
          info.H - 1,
          Math.max(0, Math.floor(v * (info.H - 1)))
        );
        const on = !inMargin && !!info.bin[sy * info.W + sx];
        const o = (y * GRID + x) * 4;
        const c = on ? 255 : 0;
        img.data[o] = c;
        img.data[o + 1] = c;
        img.data[o + 2] = c;
        img.data[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }
  return cv;
}
