/**
 * Phyllotaxis lattice math, shared by the CPU side and mirrored in GLSL.
 *
 * Seed `i` sits at radius `c * sqrt(i)` and angle `i * GOLDEN_ANGLE`. Asking
 * "which seed is nearest this point" naively means testing every seed, which
 * a fragment shader cannot afford. The way out: the golden angle's continued
 * fraction has the Fibonacci numbers as its convergents, so `wrap(F * gamma)`
 * collapses toward zero for Fibonacci F. Stepping the index by a Fibonacci
 * number therefore moves you a short hop across the lattice rather than
 * flinging you to the far side — which makes two consecutive Fibonacci
 * strides a lattice basis, and turns the search into nine candidates.
 *
 * Those same two strides are the parastichies: the spiral arms you actually
 * see. They change with radius, which is why the arm count climbs outward.
 */

/** 2*pi / phi^2 — the angle between consecutive seeds. */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Index strides that stay short in angle. Beyond this the field is denser than we draw. */
export const FIBS: readonly number[] = [
  1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987,
];

const PHI = (1 + Math.sqrt(5)) / 2;

/** Below this radius the lattice is searched exactly rather than solved. */
export const CORE_RADIUS = 7;

/**
 * Squared length of the lattice hop an index stride takes at radius `r`,
 * in lattice units: radially `dr/di * f`, tangentially the arc the wrapped
 * angle sweeps. This is the criterion the closed form solves.
 */
function hopLengthSq(f: number, r: number): number {
  const dr = f / (2 * r);
  const arc = r * wrapPi(f * GOLDEN_ANGLE);
  return dr * dr + arc * arc;
}

/** Fold an angle into (-pi, pi]. */
function wrapPi(t: number): number {
  const m = (((t + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return m - Math.PI;
}

/** Polar center of seed `i` on a lattice of scale `c`. */
export function seedPolar(i: number, c: number): { r: number; a: number } {
  return { r: c * Math.sqrt(i), a: i * GOLDEN_ANGLE };
}

/**
 * Which Fibonacci stride pair spans the lattice at radius `r`, in closed
 * form. The two hops are equal in length when `F/(2r) == r*|delta_F|`, and
 * with `F_n ~ phi^n/sqrt(5)` and `|delta_n| ~ 2*pi/(phi^n*sqrt(5))` that
 * reduces to `phi^(2n) == 4*pi*r^2`.
 *
 * The nine-candidate straddle stays correct whether this lands on the true
 * argmin or a step to either side, so searching for the exact minimum was
 * wasted work — which matters because the shader calls this once per field
 * evaluation, nine deep inside a raymarch. The 1.4 is not arbitrary: offsets
 * below about 1.25 start missing in the core, where the spiral has not
 * settled into a regular lattice yet and area-weighted sampling barely
 * visits. Both bands are pinned by tests.
 */
export function parastichyIndex(r: number): number {
  if (!(r > 1e-6)) return 0;
  // The innermost seeds are not on a regular lattice yet, and there the
  // closed form can land on a basis the straddle cannot recover from. That
  // region is small enough to search exactly.
  if (r < CORE_RADIUS) {
    let best = 0;
    let bestCost = Infinity;
    for (let n = 0; n < FIBS.length - 1; n++) {
      const cost = Math.max(
        hopLengthSq(FIBS[n], r),
        hopLengthSq(FIBS[n + 1], r)
      );
      if (cost < bestCost) {
        bestCost = cost;
        best = n;
      }
    }
    return best;
  }
  const n = Math.log(2 * r * Math.sqrt(Math.PI)) / Math.log(PHI) - 1.4;
  return Math.max(0, Math.min(FIBS.length - 2, Math.round(n)));
}

/** The two consecutive Fibonacci strides that span the lattice at radius `r`. */
export function parastichyPair(r: number, c: number): [number, number] {
  const n = parastichyIndex(r / c);
  return [FIBS[n], FIBS[n + 1]];
}

/**
 * Seed indices worth testing for a point at polar `(r, a)`. The nearest seed
 * is guaranteed to be among them; `phyllotaxis.test.ts` holds that guarantee
 * against a brute-force sweep of the whole field.
 *
 * The nearest seed can be a hundred indices away from the one at the same
 * radius, so the nine candidates cannot simply straddle `i0`. Instead, solve
 * for where the lattice basis says the query point falls — index offset zero,
 * angle on target — and straddle that.
 */
export function candidateIndices(r: number, a: number, c: number): number[] {
  const i0 = Math.round((r / c) * (r / c));
  const [fa, fb] = parastichyPair(r, c);
  const da = wrapPi(fa * GOLDEN_ANGLE);
  const db = wrapPi(fb * GOLDEN_ANGLE);

  // How far the seed sharing this radius sits from the query angle.
  const psi = wrapPi(a - i0 * GOLDEN_ANGLE);

  // Offsets u*fa + v*fb that close that angle while leaving the radius alone.
  const det = fa * db - fb * da;
  const out: number[] = [];
  if (Math.abs(det) > 1e-12) {
    const u = Math.round((-fb * psi) / det);
    const v = Math.round((fa * psi) / det);
    for (let du = -1; du <= 1; du++) {
      for (let dv = -1; dv <= 1; dv++) {
        const i = i0 + (u + du) * fa + (v + dv) * fb;
        if (i >= 0 && !out.includes(i)) out.push(i);
      }
    }
  }
  return out;
}
