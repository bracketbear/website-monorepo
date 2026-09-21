/**
 * Getting a mask canvas onto a simulation grid.
 *
 * The sim effects seed their state on the CPU from a rasterized mask, and
 * sample the same mask at full resolution in their display pass. Both halves
 * have to agree on where the mask sits, so the letterbox lives here once.
 *
 * Grids are bottom-up — row 0 is the bottom of the stage — because that is
 * how GL addresses the texture they are uploaded into.
 */

/** [x, y, w, h] of a srcW×srcH image letterboxed at `scale` in a gw×gh grid. */
export function letterbox(
  srcW: number,
  srcH: number,
  gw: number,
  gh: number,
  scale: number
): [number, number, number, number] {
  const ar = srcW / srcH;
  const w = Math.min(gw, gh * ar) * scale;
  const h = w / ar;
  return [(gw - w) / 2, (gh - h) / 2, w, h];
}

/** Alpha of top-down RGBA bytes as a bottom-up 0..1 grid. */
export function alphaToGrid(
  rgba: Uint8ClampedArray,
  gw: number,
  gh: number
): Float32Array {
  const out = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) {
    const src = (gh - 1 - j) * gw;
    for (let i = 0; i < gw; i++) {
      out[i + j * gw] = rgba[(src + i) * 4 + 3] / 255;
    }
  }
  return out;
}

/** Rasterize `mask` letterboxed into a gw×gh grid. Needs a real canvas. */
export function maskToGrid(
  mask: HTMLCanvasElement,
  gw: number,
  gh: number,
  scale: number
): Float32Array {
  const cv = document.createElement('canvas');
  cv.width = gw;
  cv.height = gh;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  const [x, y, w, h] = letterbox(mask.width, mask.height, gw, gh, scale);
  g.imageSmoothingQuality = 'high';
  g.drawImage(mask, x, y, w, h);
  return alphaToGrid(g.getImageData(0, 0, gw, gh).data, gw, gh);
}

/**
 * Upload a mask canvas as an RGBA8 texture on `unit`. Pass `into` to replace
 * the pixels of a texture that already exists, which is how a retyped phrase
 * reaches the GPU without rebuilding the context.
 */
export function uploadMask(
  gl: WebGL2RenderingContext,
  mask: HTMLCanvasElement,
  unit: number,
  into?: WebGLTexture | null
): WebGLTexture {
  const tx = into ?? gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.activeTexture(gl.TEXTURE0);
  return tx;
}
