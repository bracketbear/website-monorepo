/**
 * A sheet of paper with type printed on it, burning.
 *
 * Pure arithmetic — no DOM, no GL. The sim shader in slowBurnAnimation.ts is
 * a port of `stepSheet` and interpolates the constants below.
 *
 * Two fields do the work. Fuel burns where it is hot; burning releases heat;
 * heat diffuses, rises, and is lost to the room:
 *
 *   rate  = A · fuel · smoothstep(T_IGN, T_IGN + T_BAND, T)
 *   T    += D·∇²T + LIFT·(T_below − T) + Q·rate − COOL·T
 *   fuel -= rate
 *
 * That is a reaction–diffusion front. Through the ink-heavy type it runs at
 * about 60 cells a second and pins the temperature at T_MAX; across bare
 * paper it runs at about half that and peaks near 0.27 — a dull red crawl
 * beside a white-hot one. One equation, set by what is printed where.
 *
 * The contrast is mostly in temperature, not speed, and that is forced. A
 * front near extinction does not slow toward zero: it keeps a minimum speed
 * and then goes out. Measured here, paper runs at 27 cells/s with
 * T_IGN = 0.09 and is dead at 0.10. A paper front four times slower than
 * the type's does not exist in this chemistry, so T_IGN sits at 0.08, a
 * clear margin under the cliff, and the paper is slow by half.
 *
 * The paper has to burn at all, and the tests say why: heat alone does not
 * cross a word space, and turning the heat up until it does makes the whole
 * block go at once.
 */

/** Steps per second. */
export const SPS = 120;
/** Fuel in bare paper. Letters are 1. */
export const PAPER = 0.15;
/** Reaction rate per step at full fuel and full heat. */
export const A = 0.3;
/** Ignition temperature, and the band over which burning turns on. */
export const T_IGN = 0.08;
export const T_BAND = 0.06;
/** Heat diffusion per step. The five-point stencil is stable to 0.25. */
export const D = 0.2;
/** Upward transport: flames lick up the strokes. LIFT + 4D must stay under 1. */
export const LIFT = 0.1;
/** Heat released per unit of fuel burned. */
export const Q = 3;
/** Heat lost to the room per step. */
export const COOL = 0.05;
/**
 * Embers: char oxidising to ash, slowly, giving back heat. It turns on well
 * under the flame's threshold and holds a burned stroke glowing for about
 * two seconds — measured at one cell, 0.57, 0.41, 0.31, 0.21 at half-second
 * marks, then out — and moving air multiplies the rate, so a fanned ember
 * runs at nearly twice the temperature and is ash sooner.
 *
 * The heat per unit of char has to be large. The obvious estimate, balancing
 * it against COOL alone, is several times too small: a glowing stroke loses
 * most of its heat sideways by diffusion into the cold burned sheet around
 * it, not to the room. Paper leaves too little char (0.15) to hold itself
 * above E_LO: it does not ember, it just goes brown.
 */
export const A_E = 0.004;
export const Q_E = 8;
export const E_LO = 0.05;
export const E_HI = 0.2;
/** Temperature is capped here; it is what the Planck curve's top maps to. */
export const T_MAX = 1.5;

export interface BurnParams {
  A: number;
  T_IGN: number;
  T_BAND: number;
  D: number;
  LIFT: number;
  Q: number;
  COOL: number;
}

export const PARAMS: BurnParams = { A, T_IGN, T_BAND, D, LIFT, Q, COOL };

export interface Sheet {
  gw: number;
  gh: number;
  fuel: Float32Array;
  /** Fuel the cell started with: char and scorch are read against it. */
  fuel0: Float32Array;
  temp: Float32Array;
  /** Hottest the cell has been: the scorch. */
  peak: Float32Array;
  /** Char lying here: fuel burned, less what has since gone to ash. */
  char: Float32Array;
  next: Float32Array;
}

export function makeSheet(
  letters: Float32Array,
  gw: number,
  gh: number,
  paper = PAPER
): Sheet {
  const n = gw * gh;
  const fuel = new Float32Array(n);
  for (let k = 0; k < n; k++) fuel[k] = Math.max(letters[k], paper);
  return {
    gw,
    gh,
    fuel,
    fuel0: Float32Array.from(fuel),
    temp: new Float32Array(n),
    peak: new Float32Array(n),
    char: new Float32Array(n),
    next: new Float32Array(n),
  };
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface Fan {
  ci: number;
  cj: number;
  r: number;
  k: number;
}

export function stepSheet(s: Sheet, fan?: Fan, p: BurnParams = PARAMS): void {
  const { gw, gh, fuel, temp, peak, char, next } = s;
  for (let j = 0; j < gh; j++) {
    const jm = Math.max(0, j - 1);
    const jp = Math.min(gh - 1, j + 1);
    for (let i = 0; i < gw; i++) {
      const im = Math.max(0, i - 1);
      const ip = Math.min(gw - 1, i + 1);
      const k = i + j * gw;
      const T = temp[k];
      const below = temp[i + jm * gw];
      const lap =
        temp[im + j * gw] +
        temp[ip + j * gw] +
        below +
        temp[i + jp * gw] -
        4 * T;
      const rate = p.A * fuel[k] * smooth(p.T_IGN, p.T_IGN + p.T_BAND, T);
      let air = 1;
      if (fan) {
        const d2 = (i - fan.ci) ** 2 + (j - fan.cj) ** 2;
        air += fan.k * Math.exp(-d2 / (fan.r * fan.r));
      }
      const rateE = Math.min(
        char[k],
        A_E * char[k] * smooth(E_LO, E_HI, T) * air
      );
      let nt =
        T +
        p.D * lap +
        p.LIFT * (below - T) +
        p.Q * rate +
        Q_E * rateE -
        p.COOL * T;
      nt = Math.min(T_MAX, Math.max(0, nt));
      next[k] = nt;
      fuel[k] -= rate;
      char[k] += rate - rateE;
    }
  }
  for (let k = 0; k < gw * gh; k++) {
    temp[k] = next[k];
    if (temp[k] > peak[k]) peak[k] = temp[k];
  }
}

/** Touch a match to it. */
export function ignite(s: Sheet, ci: number, cj: number, r = 3): void {
  const { gw, gh } = s;
  for (
    let j = Math.max(0, Math.floor(cj - r));
    j <= Math.min(gh - 1, cj + r);
    j++
  ) {
    for (
      let i = Math.max(0, Math.floor(ci - r));
      i <= Math.min(gw - 1, ci + r);
      i++
    ) {
      if ((i - ci) ** 2 + (j - cj) ** 2 <= r * r) s.temp[i + j * gw] = 1;
    }
  }
}

/** Whether anything is still alight. */
export function burning(s: Sheet, p: BurnParams = PARAMS): boolean {
  for (let k = 0; k < s.temp.length; k++) {
    if (s.temp[k] > p.T_IGN && s.fuel[k] > 0.01) return true;
  }
  return false;
}

/** The rightmost cell of row `j` that has burned past half its fuel; -1 if none. */
export function frontX(s: Sheet, j: number): number {
  for (let i = s.gw - 1; i >= 0; i--) {
    const k = i + j * s.gw;
    if (s.fuel[k] < s.fuel0[k] * 0.5) return i;
  }
  return -1;
}
