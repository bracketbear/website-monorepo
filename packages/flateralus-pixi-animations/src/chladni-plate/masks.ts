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

/** Maximum drivers the step shader will read. Must match uDriveP's size. */
export const MAX_DRIVERS = 8;

/**
 * One driving point per connected region of the plate, in normalized uv.
 *
 * The mark is four disconnected pieces — two brackets and two counters of the
 * B — and a disconnected plate is four plates: nothing propagates across the
 * gaps. Worse, the geometric centre of the lockup falls in the gap BETWEEN
 * the two inner pieces, so a single centre driver sits outside the plate
 * entirely and the whole boundary stays dead.
 *
 * So every region gets its own driver, all in phase. For the square and the
 * circle there is exactly one region and its point is the centre, which is
 * the centre driver the spec argues for (D8) — the rule is uniform and the
 * single-region case is unchanged. For the mark it is a plate assembly on one
 * shaker table, which is a real object and not a fudge.
 *
 * Each point is the deepest cell of its region — the local maximum of the
 * distance to the outside — so a driver is never perched on an edge where a
 * gaussian would spill half its energy off the plate.
 */
export function driverPoints(kind: 0 | 1 | 2): [number, number][] {
  const g = boundaryCanvas(kind).getContext('2d')!;
  const px = g.getImageData(0, 0, GRID, GRID).data;
  const N = GRID * GRID;
  const inside = new Uint8Array(N);
  for (let i = 0; i < N; i++) inside[i] = px[i * 4] > 127 ? 1 : 0;

  // Multi-source BFS from every outside cell: dist[i] is how deep cell i sits.
  const dist = new Int32Array(N).fill(-1);
  let queue: number[] = [];
  for (let i = 0; i < N; i++) {
    if (!inside[i]) {
      dist[i] = 0;
      queue.push(i);
    }
  }
  while (queue.length) {
    const next: number[] = [];
    for (const i of queue) {
      const x = i % GRID;
      const y = (i / GRID) | 0;
      const d = dist[i] + 1;
      if (x > 0 && dist[i - 1] < 0) {
        dist[i - 1] = d;
        next.push(i - 1);
      }
      if (x < GRID - 1 && dist[i + 1] < 0) {
        dist[i + 1] = d;
        next.push(i + 1);
      }
      if (y > 0 && dist[i - GRID] < 0) {
        dist[i - GRID] = d;
        next.push(i - GRID);
      }
      if (y < GRID - 1 && dist[i + GRID] < 0) {
        dist[i + GRID] = d;
        next.push(i + GRID);
      }
    }
    queue = next;
  }

  // Flood fill each region, keeping its deepest cell.
  const seen = new Uint8Array(N);
  const found: { depth: number; i: number }[] = [];
  for (let start = 0; start < N; start++) {
    if (!inside[start] || seen[start]) continue;
    let best = start;
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      if (dist[i] > dist[best]) best = i;
      const x = i % GRID;
      const y = (i / GRID) | 0;
      const push = (j: number) => {
        if (inside[j] && !seen[j]) {
          seen[j] = 1;
          stack.push(j);
        }
      };
      if (x > 0) push(i - 1);
      if (x < GRID - 1) push(i + 1);
      if (y > 0) push(i - GRID);
      if (y < GRID - 1) push(i + GRID);
    }
    found.push({ depth: dist[best], i: best });
  }

  // Deepest regions first, so a boundary with more pieces than MAX_DRIVERS
  // keeps the ones that can actually hold a mode.
  found.sort((a, b) => b.depth - a.depth);
  return found
    .slice(0, MAX_DRIVERS)
    .map(
      ({ i }) =>
        [((i % GRID) + 0.5) / GRID, (((i / GRID) | 0) + 0.5) / GRID] as [
          number,
          number,
        ]
    );
}
