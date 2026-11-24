/**
 * Marching-squares contour rings, ported from d3-contour.
 *
 * The prototype called `d3.contours()` from the d3 bundle its host page
 * loaded from a CDN. This package has no d3 dependency and the contour
 * path is the only part of d3 the terrain animations touched, so the
 * algorithm lives here instead.
 *
 * It is a faithful port, not a re-derivation: the case table, the stitching
 * of segments into rings, the linear smoothing onto sample positions and
 * the hole assignment all match d3, so the rings come out point for point
 * identical and the ported animations look like the prototype.
 */

export type ContourPoint = [number, number];
export type ContourRing = ContourPoint[];

export interface ContourLevel {
  /** The threshold this level was traced at. */
  value: number;
  /** One entry per polygon: its exterior ring first, then any holes. */
  polygons: ContourRing[][];
}

/** A partially stitched ring, keyed in the maps by its two open ends. */
interface Fragment {
  start: number;
  end: number;
  ring: ContourRing;
}

/**
 * The sixteen marching-squares cases, indexed by the four corners of a
 * cell. Each entry lists the segments that case emits, in cell-local
 * coordinates.
 */
const CASES: number[][][][] = [
  [],
  [
    [
      [1.0, 1.5],
      [0.5, 1.0],
    ],
  ],
  [
    [
      [1.5, 1.0],
      [1.0, 1.5],
    ],
  ],
  [
    [
      [1.5, 1.0],
      [0.5, 1.0],
    ],
  ],
  [
    [
      [1.0, 0.5],
      [1.5, 1.0],
    ],
  ],
  [
    [
      [1.0, 1.5],
      [0.5, 1.0],
    ],
    [
      [1.0, 0.5],
      [1.5, 1.0],
    ],
  ],
  [
    [
      [1.0, 0.5],
      [1.0, 1.5],
    ],
  ],
  [
    [
      [1.0, 0.5],
      [0.5, 1.0],
    ],
  ],
  [
    [
      [0.5, 1.0],
      [1.0, 0.5],
    ],
  ],
  [
    [
      [1.0, 1.5],
      [1.0, 0.5],
    ],
  ],
  [
    [
      [0.5, 1.0],
      [1.0, 0.5],
    ],
    [
      [1.5, 1.0],
      [1.0, 1.5],
    ],
  ],
  [
    [
      [1.5, 1.0],
      [1.0, 0.5],
    ],
  ],
  [
    [
      [0.5, 1.0],
      [1.5, 1.0],
    ],
  ],
  [
    [
      [1.0, 1.5],
      [1.5, 1.0],
    ],
  ],
  [
    [
      [0.5, 1.0],
      [1.0, 1.5],
    ],
  ],
  [],
];

/** Twice the signed area of a ring; the sign is what sorts rings from holes. */
function ringArea(ring: ContourRing): number {
  const n = ring.length;
  let area = ring[n - 1][1] * ring[0][0] - ring[n - 1][0] * ring[0][1];
  for (let i = 1; i < n; i++) {
    area += ring[i - 1][1] * ring[i][0] - ring[i - 1][0] * ring[i][1];
  }
  return area;
}

function within(p: number, q: number, r: number): boolean {
  return (p <= q && q <= r) || (r <= q && q <= p);
}

function collinear(a: ContourPoint, b: ContourPoint, c: ContourPoint): boolean {
  return (b[0] - a[0]) * (c[1] - a[1]) === (c[0] - a[0]) * (b[1] - a[1]);
}

function segmentContains(
  a: ContourPoint,
  b: ContourPoint,
  c: ContourPoint
): boolean {
  const i = a[0] === b[0] ? 1 : 0;
  return collinear(a, b, c) && within(a[i], c[i], b[i]);
}

/** 1 inside, -1 outside, 0 on the boundary. */
function ringContains(ring: ContourRing, point: ContourPoint): number {
  const x = point[0];
  const y = point[1];
  let contained = -1;
  for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
    const pi = ring[i];
    const xi = pi[0];
    const yi = pi[1];
    const pj = ring[j];
    const xj = pj[0];
    const yj = pj[1];
    if (segmentContains(pi, pj, point)) return 0;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      contained = -contained;
    }
  }
  return contained;
}

function ringContainsRing(ring: ContourRing, hole: ContourRing): number {
  for (const point of hole) {
    const c = ringContains(ring, point);
    if (c !== 0) return c;
  }
  return 0;
}

/**
 * Walk the grid cell by cell, emitting segments per the case table and
 * stitching them into closed rings as their ends meet.
 */
function isorings(
  values: ArrayLike<number>,
  dx: number,
  dy: number,
  value: number,
  callback: (ring: ContourRing) => void
): void {
  const fragmentByStart = new Map<number, Fragment>();
  const fragmentByEnd = new Map<number, Fragment>();
  let x = -1;
  let y = -1;
  let t0 = 0;
  let t1 = 0;
  let t2 = 0;
  let t3 = 0;

  /** Unique key for a half-integer point on the cell lattice. */
  const index = (p: ContourPoint): number => p[0] * 2 + p[1] * (dx + 1) * 4;

  const stitch = (line: number[][]): void => {
    const start: ContourPoint = [line[0][0] + x, line[0][1] + y];
    const end: ContourPoint = [line[1][0] + x, line[1][1] + y];
    const startIndex = index(start);
    const endIndex = index(end);

    const f = fragmentByEnd.get(startIndex);
    if (f) {
      const g = fragmentByStart.get(endIndex);
      if (g) {
        fragmentByEnd.delete(f.end);
        fragmentByStart.delete(g.start);
        if (f === g) {
          // Both ends of the same fragment: the ring just closed.
          f.ring.push(end);
          callback(f.ring);
        } else {
          const merged: Fragment = {
            start: f.start,
            end: g.end,
            ring: f.ring.concat(g.ring),
          };
          fragmentByStart.set(merged.start, merged);
          fragmentByEnd.set(merged.end, merged);
        }
      } else {
        fragmentByEnd.delete(f.end);
        f.ring.push(end);
        f.end = endIndex;
        fragmentByEnd.set(endIndex, f);
      }
      return;
    }

    // d3 checks `fragmentByEnd[startIndex]` again inside this branch, but
    // that is the lookup that just missed, so only these two cases run.
    const g = fragmentByStart.get(endIndex);
    if (g) {
      fragmentByStart.delete(g.start);
      g.ring.unshift(start);
      g.start = startIndex;
      fragmentByStart.set(startIndex, g);
      return;
    }
    const fresh: Fragment = {
      start: startIndex,
      end: endIndex,
      ring: [start, end],
    };
    fragmentByStart.set(startIndex, fresh);
    fragmentByEnd.set(endIndex, fresh);
  };

  const above = (i: number): number => (values[i] >= value ? 1 : 0);
  const emit = (c: number): void => {
    for (const line of CASES[c]) stitch(line);
  };

  // First row: y is -1, so the two upper corners are always below.
  t1 = above(0);
  emit(t1 << 1);
  while (++x < dx - 1) {
    t0 = t1;
    t1 = above(x + 1);
    emit(t0 | (t1 << 1));
  }
  emit(t1);

  // Intermediate rows.
  while (++y < dy - 1) {
    x = -1;
    t1 = above(y * dx + dx);
    t2 = above(y * dx);
    emit((t1 << 1) | (t2 << 2));
    while (++x < dx - 1) {
      t0 = t1;
      t1 = above(y * dx + dx + x + 1);
      t3 = t2;
      t2 = above(y * dx + x + 1);
      emit(t0 | (t1 << 1) | (t2 << 2) | (t3 << 3));
    }
    emit(t1 | (t2 << 3));
  }

  // Last row: y is dy - 1, so the two lower corners are always below.
  x = -1;
  t2 = above(y * dx);
  emit(t2 << 2);
  while (++x < dx - 1) {
    t3 = t2;
    t2 = above(y * dx + x + 1);
    emit((t2 << 2) | (t3 << 3));
  }
  emit(t2 << 3);
}

/**
 * Slide each ring point off the lattice and onto the position where the
 * threshold actually falls between the two samples it sits between. This
 * is what turns blocky stair-steps into smooth contours.
 */
function smoothLinear(
  ring: ContourRing,
  values: ArrayLike<number>,
  dx: number,
  dy: number,
  value: number
): void {
  for (const point of ring) {
    const x = point[0];
    const y = point[1];
    const xt = x | 0;
    const yt = y | 0;
    const v1 = values[yt * dx + xt];
    if (x > 0 && x < dx && xt === x) {
      const v0 = values[yt * dx + xt - 1];
      point[0] = x + (value - v0) / (v1 - v0) - 0.5;
    }
    if (y > 0 && y < dy && yt === y) {
      const v0 = values[(yt - 1) * dx + xt];
      point[1] = y + (value - v0) / (v1 - v0) - 0.5;
    }
  }
}

function contour(
  values: ArrayLike<number>,
  dx: number,
  dy: number,
  value: number
): ContourLevel {
  const polygons: ContourRing[][] = [];
  const holes: ContourRing[] = [];

  isorings(values, dx, dy, value, (ring) => {
    smoothLinear(ring, values, dx, dy, value);
    if (ringArea(ring) > 0) polygons.push([ring]);
    else holes.push(ring);
  });

  for (const hole of holes) {
    for (const polygon of polygons) {
      if (ringContainsRing(polygon[0], hole) !== -1) {
        polygon.push(hole);
        break;
      }
    }
  }

  return { value, polygons };
}

/**
 * Trace one set of rings per threshold through a `dx` by `dy` row-major
 * grid of samples.
 */
export function contourLines(
  values: ArrayLike<number>,
  dx: number,
  dy: number,
  thresholds: readonly number[]
): ContourLevel[] {
  return thresholds
    .slice()
    .sort((a, b) => a - b)
    .map((value) => contour(values, dx, dy, value));
}
