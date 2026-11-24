import { describe, it, expect } from 'vitest';
import {
  SPS,
  bodiesOf,
  drop,
  gelEnergy,
  inkColumns,
  insideDistance,
  land,
  lettersOf,
  makeGel,
  poke,
  poseAt,
  stepGel,
  type Gel,
} from './aspic.sim';

const GW = 96;
const GH = 60;
const at = (i: number, j: number) => i + j * GW;
const run = (g: Gel, secs: number, each?: (k: number) => void) => {
  for (let k = 0; k < Math.round(secs * SPS); k++) {
    stepGel(g);
    each?.(k);
  }
};

describe('aspic gel', () => {
  it('is stable for 10^4 steps after a hard poke', () => {
    const g = makeGel(GW, GH);
    poke(g, 48, 40, 5, 0.4, 0.2);
    for (let k = 0; k < 10000; k++) stepGel(g);
    expect(Number.isFinite(gelEnergy(g))).toBe(true);
    expect(gelEnergy(g)).toBeLessThan(1e-6);
  });

  it('loses energy, never gains it', () => {
    const g = makeGel(GW, GH);
    drop(g, 0.05, (k) => Math.floor(k / GW) / (GH - 1));
    let last = gelEnergy(g);
    expect(last).toBeGreaterThan(0);
    for (let k = 0; k < 20; k++) {
      run(g, 0.1);
      const e = gelEnergy(g);
      expect(e).toBeLessThanOrEqual(last * 1.001);
      last = e;
    }
  });

  it('keeps its base on the plate', () => {
    const g = makeGel(GW, GH);
    drop(g, 0.05, (k) => Math.floor(k / GW) / (GH - 1));
    poke(g, 20, 3, 6, 0.3, 0.3);
    run(g, 0.5);
    for (let i = 0; i < GW; i++) {
      expect(g.ux[at(i, 0)]).toBe(0);
      expect(g.uy[at(i, 0)]).toBe(0);
    }
  });

  it('sways near 3 Hz and is back to 2% inside 1.4 s', () => {
    const g = makeGel(GW, GH);
    // A sideways shove of the whole slab, growing with height, excites the
    // fundamental: base pinned, top free.
    for (let j = 1; j < GH; j++) {
      for (let i = 0; i < GW; i++) g.vx[at(i, j)] = 0.02 * (j / GH);
    }
    const probe = at(48, GH - 1);
    let peak = 0;
    let crossings = 0;
    let prev = 0;
    let settledAt = Infinity;
    run(g, 2.5, (k) => {
      const x = g.ux[probe];
      peak = Math.max(peak, Math.abs(x));
      if (k / SPS < 1 && prev !== 0 && Math.sign(x) !== Math.sign(prev)) {
        crossings++;
      }
      if (x !== 0) prev = x;
      if (Math.abs(x) > 0.02 * peak) settledAt = Infinity;
      else if (settledAt === Infinity) settledAt = k / SPS;
    });
    // Two zero crossings to a cycle, counted over the first second.
    const hz = crossings / 2;
    expect(hz).toBeGreaterThanOrEqual(2.5);
    expect(hz).toBeLessThanOrEqual(3.5);
    expect(settledAt).toBeLessThanOrEqual(1.4);
  });

  it('rings down its grid-scale modes long before its sway', () => {
    // A two-cell checker in velocity is the worst stripe the grid can hold.
    const g = makeGel(GW, GH);
    for (let j = 1; j < GH; j++) {
      for (let i = 0; i < GW; i++) g.vy[at(i, j)] = j % 2 ? 0.02 : -0.02;
    }
    const e0 = gelEnergy(g);
    run(g, 0.1);
    expect(gelEnergy(g) / e0).toBeLessThan(1e-3);

    // The sway, over the same tenth of a second, has barely started to fade.
    const s = makeGel(GW, GH);
    for (let j = 1; j < GH; j++) {
      for (let i = 0; i < GW; i++) s.vx[at(i, j)] = 0.02 * (j / GH);
    }
    const s0 = gelEnergy(s);
    run(s, 0.1);
    expect(gelEnergy(s) / s0).toBeGreaterThan(0.3);
  });

  it('carries a poke across the slab in about a third of a second', () => {
    const g = makeGel(GW, GH);
    poke(g, 6, 30, 4, 0.3, 0);
    const far = at(GW - 7, 30);
    let arrived = Infinity;
    run(g, 1, (k) => {
      if (arrived === Infinity && Math.hypot(g.ux[far], g.uy[far]) > 1e-4) {
        arrived = k / SPS;
      }
    });
    expect(arrived).toBeGreaterThan(0.15);
    expect(arrived).toBeLessThan(0.7);
  });

  describe('letters as bodies', () => {
    const BASE = 6;
    const CAP = 36;
    const twoBars = () => {
      const letters = new Float32Array(GW * GH);
      for (const x0 of [10, 54]) {
        for (let j = BASE; j < BASE + CAP; j++) {
          for (let i = x0; i < x0 + 20; i++) letters[i + j * GW] = 1;
        }
      }
      return letters;
    };
    const height = (k: number) => (Math.floor(k / GW) - BASE) / (CAP - 1);
    /**
     * Two 20×36 bars, 24 cells apart, standing on a baseline at row 6.
     * Nailed: the plate cannot move. Otherwise it is a body on its mat.
     */
    const twoLetters = (plate: 'nailed' | 'free' = 'free') => {
      const body = bodiesOf(twoBars(), GW, GH, 3, [BASE], 2);
      if (plate === 'nailed') for (const pl of body.plates) pl.mass = 0;
      return makeGel(GW, GH, body);
    };

    it('grows each letter into a hull and pins its foot', () => {
      const g = twoLetters();
      // Margin: three cells left of the first bar are gel...
      expect(g.hull[at(8, 20)]).toBe(1);
      // ...and the gap between the bars is air.
      expect(g.hull[at(40, 20)]).toBe(0);
      // Foot pinned, body free.
      expect(g.pinned[at(15, 7)]).toBe(1);
      expect(g.pinned[at(15, 12)]).toBe(0);
      // Both stand on the one plate, pivoted between them.
      expect(g.plateOf[at(15, 20)]).toBe(0);
      expect(g.plateOf[at(60, 20)]).toBe(0);
      expect(g.plates[0].cx).toBeCloseTo((7 + 76) / 2);
      expect(g.plates[0].base).toBe(BASE);
    });

    it('cannot pass a poke from one letter to another through the gel', () => {
      const g = twoLetters('nailed');
      poke(g, 18, 30, 3, 0.4, 0.1);
      let far = 0;
      run(g, 1, () => {
        far = Math.max(
          far,
          Math.abs(g.ux[at(64, 30)]),
          Math.abs(g.uy[at(64, 30)])
        );
      });
      expect(far).toBe(0);
      // The poked letter itself certainly moved.
      expect(Math.abs(g.ux[at(12, 40)])).toBeGreaterThan(1e-3);
    });

    it('passes a poke from one letter to another through the plate, later and smaller', () => {
      const g = twoLetters();
      poke(g, 18, 30, 3, 0.4, 0.1);
      const far = at(64, 30);
      let arrived = Infinity;
      let farPeak = 0;
      let nearPeak = 0;
      run(g, 1.5, (k) => {
        const f = Math.hypot(g.ux[far], g.uy[far]);
        if (arrived === Infinity && f > 1e-3) arrived = k / SPS;
        farPeak = Math.max(farPeak, f);
        nearPeak = Math.max(
          nearPeak,
          Math.hypot(g.ux[at(20, 41)], g.uy[at(20, 41)])
        );
      });
      // Down the letter as compression, then along the rigid plate: a few
      // steps' worth, not the third of a second a slab takes.
      expect(arrived).toBeGreaterThan(0.005);
      expect(arrived).toBeLessThan(0.1);
      // Two bars are most of what this plate carries, so the far one gets a
      // good share; on a line of twelve it is about a sixth.
      expect(farPeak).toBeGreaterThan(0.01 * nearPeak);
      expect(farPeak).toBeLessThan(0.75 * nearPeak);
    });

    it('sways from its foot and settles, like the slab did', () => {
      const g = twoLetters();
      drop(g, 0.2, height);
      const top = at(20, 41);
      let peak = 0;
      let settledAt = Infinity;
      let crossings = 0;
      let prev = 0;
      run(g, 3, (k) => {
        const x = Math.hypot(g.ux[top], g.uy[top]);
        peak = Math.max(peak, x);
        if (x > 0.02 * peak) settledAt = Infinity;
        else if (settledAt === Infinity) settledAt = k / SPS;
        // The sway proper: the top's lean over the plate.
        const s = g.ux[top];
        if (k / SPS < 1 && prev !== 0 && Math.sign(s) !== Math.sign(prev)) {
          crossings++;
        }
        if (s !== 0) prev = s;
      });
      expect(peak).toBeGreaterThan(0.5);
      expect(settledAt).toBeLessThan(2.5);
      // The plate's far end moves the spring's far end, so the sway runs a
      // little quick of the nailed 3 Hz; not so quick it reads as a buzz.
      expect(crossings / 2).toBeGreaterThanOrEqual(2.5);
      expect(crossings / 2).toBeLessThanOrEqual(4.5);
    });

    it('carries its foot with the plate', () => {
      const g = twoLetters();
      poke(g, 18, 30, 3, 0.4, 0.1);
      run(g, 0.3);
      const pl = g.plates[0];
      expect(Math.abs(pl.x) + Math.abs(pl.y) + Math.abs(pl.th)).toBeGreaterThan(
        1e-4
      );
      // The field is over the plate: the foot reads zero, and stands
      // exactly where the plate's pose puts it.
      const k = at(15, BASE);
      expect(g.ux[k]).toBe(0);
      expect(g.uy[k]).toBe(0);
      const [px, py] = poseAt(pl, 15, BASE);
      expect(px).toBeCloseTo(pl.x - pl.th * (BASE - pl.base), 6);
      expect(py).toBeCloseTo(pl.y + pl.th * (15 - pl.cx), 6);
    });

    it('brings the plate home', () => {
      const g = twoLetters();
      poke(g, 18, 30, 3, 0.4, 0.1);
      let peak = 0;
      run(g, 0.5, () => {
        peak = Math.max(peak, Math.abs(g.plates[0].x));
      });
      run(g, 3);
      const pl = g.plates[0];
      expect(Math.abs(pl.x)).toBeLessThan(0.01 * peak);
      expect(Math.abs(pl.vx)).toBeLessThan(1e-4);
    });

    it('keeps its energy inside the gel and the plate', () => {
      const g = twoLetters();
      poke(g, 18, 30, 3, 0.4, 0.1);
      let last = gelEnergy(g);
      for (let k = 0; k < 20; k++) {
        run(g, 0.1);
        const e = gelEnergy(g);
        expect(e).toBeLessThanOrEqual(last * 1.001);
        last = e;
      }
    });

    it('is stable for 10^4 steps with the plate loose', () => {
      const g = twoLetters();
      poke(g, 18, 30, 3, 0.4, 0.2);
      land(g, { plate: 0, x0: 40, x1: GW }, 0.9, 0.2, height);
      for (let k = 0; k < 10000; k++) stepGel(g);
      expect(Number.isFinite(gelEnergy(g))).toBe(true);
      expect(gelEnergy(g)).toBeLessThan(1e-5);
    });

    it('lands one letter, and the other feels the thump', () => {
      const g = twoLetters();
      land(g, { plate: 0, x0: 40, x1: GW }, 0.9, 0.2, height);
      const pl = g.plates[0];
      // The right bar came down: the plate's right end dips.
      expect(pl.vy).toBeLessThan(0);
      expect(pl.om).toBeLessThan(0);
      // The left bar was at rest, and is not for long.
      const top = at(20, 41);
      expect(g.ux[top]).toBe(0);
      let moved = Infinity;
      run(g, 0.2, (k) => {
        if (moved === Infinity && Math.hypot(g.ux[top], g.uy[top]) > 0.05) {
          moved = k / SPS;
        }
      });
      expect(moved).toBeLessThan(0.1);
    });

    it('keeps two lines set tighter than the margin as separate bodies', () => {
      // Two bars, one above the other, with a 3-cell gap under a 3-cell
      // margin: the hulls overlap, the bodies must not.
      const letters = new Float32Array(GW * GH);
      for (let j = 6; j < 26; j++)
        for (let i = 20; i < 40; i++) letters[at(i, j)] = 1;
      for (let j = 29; j < 49; j++)
        for (let i = 20; i < 40; i++) letters[at(i, j)] = 1;
      const g = makeGel(GW, GH, bodiesOf(letters, GW, GH, 3, [29, 6], 2, 20));
      // The top of the lower bar is the lower bar's, and stands free.
      expect(g.plateOf[at(30, 25)]).toBe(1);
      expect(g.pinned[at(30, 25)]).toBe(0);
      expect(g.plateOf[at(30, 29)]).toBe(0);
      expect(g.pinned[at(30, 29)]).toBe(1);
      // Nail the plates: through the gel alone, the lower bar hears nothing.
      for (const pl of g.plates) pl.mass = 0;
      poke(g, 30, 40, 3, 0.4, 0.1);
      let far = 0;
      run(g, 1, () => {
        far = Math.max(
          far,
          Math.abs(g.ux[at(30, 15)]),
          Math.abs(g.uy[at(30, 15)])
        );
      });
      expect(far).toBe(0);
    });

    it('finds the letters as column runs, split at the gaps', () => {
      const body = bodiesOf(twoBars(), GW, GH, 3, [BASE], 2);
      const ink = inkColumns(twoBars(), GW, GH, body.plateOf, 1);
      expect(lettersOf(ink, GW)).toEqual([
        { plate: 0, x0: 0, x1: 42 },
        { plate: 0, x0: 42, x1: GW },
      ]);
      expect(lettersOf(ink, GW, 1)).toEqual([{ plate: 0, x0: 0, x1: GW }]);
    });
  });

  it('measures how far under the surface a point of a stroke is', () => {
    const letters = new Float32Array(GW * GH);
    // A 21-wide bar: the middle column is 11 cells from either edge.
    for (let j = 10; j < 50; j++)
      for (let i = 30; i < 51; i++) letters[at(i, j)] = 1;
    const d = insideDistance(letters, GW, GH, 8);
    expect(d[at(30, 30)]).toBe(1);
    expect(d[at(33, 30)]).toBe(4);
    expect(d[at(40, 30)]).toBe(8); // capped
    expect(d[at(20, 30)]).toBe(0); // air
    expect(d[at(40, 10)]).toBe(1); // bottom edge
  });
});
