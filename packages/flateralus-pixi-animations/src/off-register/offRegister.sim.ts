/**
 * The three printing plates of Off Register, as masses on springs.
 *
 * Pure arithmetic — no DOM, no GL — so the landing order and the rest test
 * can be checked headlessly. The animation steps these and hands the poses
 * to the shader as uniforms.
 *
 * Every plate shares one spring and one damper and differs only in mass.
 * Energy decays as e^(-Ct/m), so the time to settle is linear in mass:
 * 8m/C takes the energy to e^-8 and the amplitude to about 2 %. That is
 * what lands the key first and the sun plate last.
 */

/** Spring constant, kg/s². With m = 1 this is ω = 19 rad/s. */
export const K = 361;
/** Damping, kg/s. ζ = 0.35 for the key plate, less for the heavier two. */
export const C = 13.3;
/** Fixed timestep. ω·STEP = 0.16 for the stiffest plate, far inside 2. */
export const STEP = 1 / 120;
/** Key, orange, sun. */
export const MASSES = [1, 1.6, 2.4] as const;

/**
 * Lever arm, px, that puts rotation in the same units as translation so one
 * K and C serve both: a plate turned by `a` has moved `a * ARM` at the arm.
 */
const ARM = 400;

export interface Plate {
  x: number;
  y: number;
  /** Rotation, radians. */
  a: number;
  vx: number;
  vy: number;
  va: number;
  m: number;
  /** Rest pose. */
  rx: number;
  ry: number;
  ra: number;
}

/** Seconds for a plate of mass `m` to settle to ~2 % amplitude. */
export const settleTime = (m: number): number => (8 * m) / C;

/**
 * Three plates at rest. The key sits true; the colour plates rest fanned
 * out by `register` px, because in perfect register they hide under the key
 * and the effect has no resting face.
 */
export function makePlates(register: number): Plate[] {
  const rest: [number, number][] = [
    [0, 0],
    [register, -register * 0.6],
    [-register * 0.8, register * 0.7],
  ];
  return MASSES.map((m, i) => ({
    x: rest[i][0],
    y: rest[i][1],
    a: 0,
    vx: 0,
    vy: 0,
    va: 0,
    m,
    rx: rest[i][0],
    ry: rest[i][1],
    ra: 0,
  }));
}

/** Move the rest poses without disturbing where the plates are now. */
export function setRegister(plates: Plate[], register: number): void {
  const fresh = makePlates(register);
  plates.forEach((p, i) => {
    p.rx = fresh[i].rx;
    p.ry = fresh[i].ry;
  });
}

/** Displace every plate from rest and stop it: the start of an arrival. */
export function scatter(
  plates: Plate[],
  rng: () => number,
  px: number,
  rad: number
): void {
  for (const p of plates) {
    const t = rng() * Math.PI * 2;
    const r = px * (0.5 + 0.5 * rng());
    p.x = p.rx + Math.cos(t) * r;
    p.y = p.ry + Math.sin(t) * r;
    p.a = p.ra + (rng() * 2 - 1) * rad;
    p.vx = p.vy = p.va = 0;
  }
}

/** An impulse to every plate. The same blow moves a heavy plate less. */
export function knock(
  plates: Plate[],
  rng: () => number,
  v: number,
  w: number
): void {
  for (const p of plates) {
    const t = rng() * Math.PI * 2;
    const s = v * (0.6 + 0.4 * rng());
    p.vx += (Math.cos(t) * s) / p.m;
    p.vy += (Math.sin(t) * s) / p.m;
    p.va += ((rng() * 2 - 1) * w) / p.m;
  }
}

/** A hand on the stack: the pointer's velocity, px/s, and how hard it grips. */
export interface Hand {
  vx: number;
  vy: number;
  grip: number;
}

/**
 * Semi-implicit Euler: velocity first, then position from the new velocity.
 *
 * A `hand` is a viscous coupling toward the pointer's velocity, summed with
 * the spring and damper as one force. Applying it as a separate velocity
 * update first leaves a C·STEP/m bias in where the plate is held — up to
 * 11 % for the key plate, and different for each mass.
 *
 * Mass does not change how far a plate is eventually pulled: a steady drag
 * holds every plate at grip·v/K, and m cancels. It changes when. The light
 * plate answers first, the heavy one lags, and they come home at different
 * rates afterwards. The stack is pulled apart in time, not in distance.
 */
export function stepPlate(p: Plate, hand?: Hand): void {
  const s = STEP / p.m;
  const hx = hand ? hand.grip * (hand.vx - p.vx) : 0;
  const hy = hand ? hand.grip * (hand.vy - p.vy) : 0;
  p.vx += (-K * (p.x - p.rx) - C * p.vx + hx) * s;
  p.vy += (-K * (p.y - p.ry) - C * p.vy + hy) * s;
  p.va += (-K * (p.a - p.ra) - C * p.va) * s;
  p.x += p.vx * STEP;
  p.y += p.vy * STEP;
  p.a += p.va * STEP;
}

/** Kinetic plus potential, with rotation measured at the lever arm. */
export function energy(p: Plate): number {
  const dx = p.x - p.rx;
  const dy = p.y - p.ry;
  const da = (p.a - p.ra) * ARM;
  const wa = p.va * ARM;
  return (
    0.5 * p.m * (p.vx * p.vx + p.vy * p.vy + wa * wa) +
    0.5 * K * (dx * dx + dy * dy + da * da)
  );
}

/**
 * Whether the whole stack has stopped. The default is well under a tenth of
 * a pixel of displacement: ½·K·x² = 0.02 puts x near 0.01 px.
 */
export function atRest(plates: Plate[], eps = 0.02): boolean {
  return plates.every((p) => energy(p) < eps);
}
