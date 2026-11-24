import { describe, it, expect } from 'vitest';
import {
  C,
  K,
  MASSES,
  STEP,
  atRest,
  energy,
  knock,
  makePlates,
  scatter,
  settleTime,
  stepPlate,
  type Plate,
} from './offRegister.sim';

const lcg =
  (s = 1) =>
  () =>
    (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;

const run = (p: Plate, secs: number) => {
  for (let i = 0; i < Math.round(secs / STEP); i++) stepPlate(p);
};

describe('off-register plates', () => {
  it('settle in mass order, at 8m/C', () => {
    expect(MASSES.map(settleTime)).toEqual(MASSES.map((m) => (8 * m) / C));
    for (const [i, m] of MASSES.entries()) {
      const p = makePlates(3)[i];
      p.x = p.rx + 40;
      const e0 = energy(p);
      run(p, settleTime(m));
      // The energy envelope is e^(-Ct/m); at t = 8m/C that is e^-8.
      const ratio = energy(p) / e0;
      expect(ratio, `mass ${m}`).toBeLessThan(Math.exp(-6.5));
      expect(ratio, `mass ${m}`).toBeGreaterThan(Math.exp(-9.5));
    }
  });

  it('never gains energy on its own', () => {
    const plates = makePlates(3);
    scatter(plates, lcg(7), 60, 0.12);
    for (const p of plates) {
      let last = energy(p);
      for (let k = 0; k < 30; k++) {
        run(p, 0.1);
        const e = energy(p);
        expect(e).toBeLessThanOrEqual(last * 1.001);
        last = e;
      }
    }
  });

  it('returns to its rest pose after a knock, and says so', () => {
    const plates = makePlates(3);
    knock(plates, lcg(3), 900, 2);
    expect(atRest(plates)).toBe(false);
    for (const p of plates) run(p, 4);
    expect(atRest(plates)).toBe(true);
    for (const p of plates) {
      expect(p.x).toBeCloseTo(p.rx, 1);
      expect(p.y).toBeCloseTo(p.ry, 1);
      expect(p.a).toBeCloseTo(p.ra, 3);
    }
  });

  it('rests with the plates fanned by `register`, and together at zero', () => {
    const d = (ps: Plate[]) =>
      Math.hypot(ps[1].rx - ps[2].rx, ps[1].ry - ps[2].ry);
    expect(d(makePlates(0))).toBe(0);
    expect(d(makePlates(3))).toBeGreaterThan(2);
  });

  it('lets a dragging hand move the light plate first', () => {
    const plates = makePlates(3);
    // 50 ms in: well inside the key plate's quarter period (83 ms), so
    // nothing has started back yet and the order is purely who got going.
    for (let k = 0; k < 6; k++) {
      for (const p of plates) {
        stepPlate(p, { vx: 600, vy: 0, grip: 12 });
      }
    }
    const [key, orange, sun] = plates.map((p) => p.x - p.rx);
    expect(key).toBeGreaterThan(orange);
    expect(orange).toBeGreaterThan(sun);
    expect(sun).toBeGreaterThan(0);
  });

  it('holds every plate the same distance under a steady drag', () => {
    const plates = makePlates(3);
    for (let k = 0; k < 6 / STEP; k++) {
      for (const p of plates) {
        stepPlate(p, { vx: 600, vy: 0, grip: 12 });
      }
    }
    // grip·v/K, with the mass cancelled: 12 · 600 / 361.
    for (const p of plates) expect(p.x - p.rx).toBeCloseTo((12 * 600) / K, 0);
  });
});
