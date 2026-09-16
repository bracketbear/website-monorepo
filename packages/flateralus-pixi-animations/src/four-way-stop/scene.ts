import * as PIXI from 'pixi.js';
import {
  B,
  LANE,
  L_APPROACH,
  L_EXIT,
  APPROACHES,
  heading,
  rightOf,
} from './geometry';
import { type Camera, project } from './camera';
import type { TrafficState } from './traffic';
import type { Tint } from './manifest';

/**
 * Everything drawn, as PIXI Graphics layers redrawn each frame from the
 * traffic state. Backdrop and road are static and redrawn only on resize
 * or a tint change; everything else is cleared and rebuilt every frame,
 * which at sixty vehicles is cheap.
 */
export class Scene {
  readonly backdrop = new PIXI.Graphics();
  readonly road = new PIXI.Graphics();
  readonly history = new PIXI.Graphics();
  readonly reflections = new PIXI.Graphics();
  readonly cones = new PIXI.Graphics();
  readonly vehicles = new PIXI.Graphics();
  readonly lamps = new PIXI.Graphics();
  readonly cop = new PIXI.Graphics();
  readonly rain = new PIXI.Graphics();

  private w = 1;
  private h = 1;
  private staticTint: Tint | null = null;
  /** Seeded once so the skyline and the lit windows do not change per frame. */
  private seed = 7;

  constructor(root: PIXI.Container) {
    this.reflections.blendMode = 'add';
    this.cones.blendMode = 'add';
    this.lamps.blendMode = 'add';
    root.addChild(
      this.backdrop,
      this.road,
      this.history,
      this.reflections,
      this.cones,
      this.vehicles,
      this.lamps,
      this.cop,
      this.rain
    );
  }

  /** Frame fraction to pixels. */
  px(p: { u: number; v: number }): [number, number] {
    return [p.u * this.w, p.v * this.h];
  }

  private rnd(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  resize(w: number, h: number, cam: Camera, tint: Tint): void {
    this.w = w;
    this.h = h;
    this.staticTint = tint;
    this.drawBackdrop(cam, tint);
    this.drawRoad(cam, tint);
  }

  needsStatic(tint: Tint): boolean {
    return this.staticTint !== tint;
  }

  /** A quad on the ground, projected. Skipped if any corner is behind the camera. */
  private groundQuad(
    g: PIXI.Graphics,
    cam: Camera,
    pts: [number, number][]
  ): boolean {
    const P = pts.map((q) => project(cam, q[0], q[1], 0));
    if (P.some((p) => !p)) return false;
    const [a, ...rest] = P.map((p) => this.px(p!));
    g.moveTo(a[0], a[1]);
    for (const r of rest) g.lineTo(r[0], r[1]);
    g.closePath();
    return true;
  }

  /**
   * Sky, then row houses along the far sides of the north and east roads,
   * with a few lit windows, then the four street lamps on the corners.
   */
  private drawBackdrop(cam: Camera, tint: Tint): void {
    const g = this.backdrop;
    g.clear();
    this.seed = 7;
    g.rect(0, 0, this.w, this.h * 0.55).fill(tint.sky);
    g.rect(0, this.h * 0.4, this.w, this.h * 0.6).fill(tint.skyLow);
    // Row houses: boxes set back from the road along two sides.
    const houses: {
      x: number;
      y: number;
      w: number;
      d: number;
      hgt: number;
    }[] = [];
    for (let i = 0; i < 9; i++) {
      const w = 7 + this.rnd() * 3;
      houses.push({
        x: -B / 2 - 9 - w,
        y: B / 2 + 4 + i * 10.5,
        w,
        d: 9,
        hgt: 8 + this.rnd() * 3,
      });
      houses.push({
        x: B / 2 + 9,
        y: B / 2 + 4 + i * 10.5,
        w,
        d: 9,
        hgt: 8 + this.rnd() * 3,
      });
    }
    for (let i = 0; i < 7; i++) {
      const w = 7 + this.rnd() * 3;
      houses.push({
        x: B / 2 + 6 + i * 10.5,
        y: B / 2 + 9,
        w,
        d: 9,
        hgt: 8 + this.rnd() * 3,
      });
    }
    houses.sort((a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y));
    for (const hs of houses) {
      const c = [
        [hs.x, hs.y],
        [hs.x + hs.w, hs.y],
        [hs.x + hs.w, hs.y + hs.d],
        [hs.x, hs.y + hs.d],
      ] as [number, number][];
      const top = c.map((q) => project(cam, q[0], q[1], hs.hgt));
      const bot = c.map((q) => project(cam, q[0], q[1], 0));
      if (top.some((p) => !p) || bot.some((p) => !p)) continue;
      // Front face (the one facing the box) and the roof.
      const face = [bot[0], bot[1], top[1], top[0]].map((p) => this.px(p!));
      g.moveTo(face[0][0], face[0][1]);
      for (const f of face.slice(1)) g.lineTo(f[0], f[1]);
      g.closePath().fill(0x0d0f16);
      const roof = top.map((p) => this.px(p!));
      g.moveTo(roof[0][0], roof[0][1]);
      for (const r of roof.slice(1)) g.lineTo(r[0], r[1]);
      g.closePath().fill(0x101320);
      // Lit windows, a few per face.
      for (let k = 0; k < 3; k++) {
        if (this.rnd() > 0.45) continue;
        const fx = 0.2 + this.rnd() * 0.6;
        const fz = 0.25 + this.rnd() * 0.5;
        const p = project(cam, hs.x + hs.w * fx, hs.y, hs.hgt * fz);
        if (!p) continue;
        const [x, y] = this.px(p);
        const s = Math.max(2, 40 / p.depth);
        g.rect(x - s / 2, y - s * 0.7, s, s * 1.4).fill({
          color: tint.window,
          alpha: 0.85,
        });
      }
    }
    // Street lamps on the four corners of the intersection.
    for (const [sx, sy] of [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ]) {
      const x = sx * (B / 2 + 2.5);
      const y = sy * (B / 2 + 2.5);
      const foot = project(cam, x, y, 0);
      const head = project(cam, x, y, 6.5);
      if (!foot || !head) continue;
      const [fx, fy] = this.px(foot);
      const [hx, hy] = this.px(head);
      g.moveTo(fx, fy)
        .lineTo(hx, hy)
        .stroke({ color: 0x1a1c24, width: Math.max(1, 30 / foot.depth) });
      const r = Math.max(4, 90 / head.depth);
      g.circle(hx, hy, r).fill({ color: tint.lamp, alpha: 0.9 });
      g.circle(hx, hy, r * 3).fill({ color: tint.lamp, alpha: 0.12 });
    }
  }

  /**
   * Asphalt for the four roads and the box, curbs beside them, a dashed
   * centre line up each approach, a stop line at each line, and the
   * crosswalks: white bars, worn along the two wheel paths.
   */
  private drawRoad(cam: Camera, tint: Tint): void {
    const g = this.road;
    g.clear();
    const half = LANE * 2;
    const far = L_APPROACH + 5;
    const farOut = L_EXIT + 5;
    // Curbs first, wider than the road.
    for (const a of APPROACHES) {
      const h = heading(a);
      const r = rightOf(h);
      const q = (u: number, w: number): [number, number] => [
        -h[0] * u + r[0] * w,
        -h[1] * u + r[1] * w,
      ];
      const reach =
        a % 2 === 0 ? (a === 0 ? far : farOut) : a === 1 ? far : farOut;
      if (
        this.groundQuad(g, cam, [
          q(B / 2, -half - 2.2),
          q(reach, -half - 2.2),
          q(reach, half + 2.2),
          q(B / 2, half + 2.2),
        ])
      )
        g.fill(tint.curb);
    }
    g.rect(0, 0, 0, 0);
    // Asphalt.
    for (const a of APPROACHES) {
      const h = heading(a);
      const r = rightOf(h);
      const q = (u: number, w: number): [number, number] => [
        -h[0] * u + r[0] * w,
        -h[1] * u + r[1] * w,
      ];
      const reach = far;
      if (
        this.groundQuad(g, cam, [
          q(B / 2, -half),
          q(reach, -half),
          q(reach, half),
          q(B / 2, half),
        ])
      )
        g.fill(tint.asphalt);
    }
    if (
      this.groundQuad(g, cam, [
        [-B / 2, -B / 2],
        [B / 2, -B / 2],
        [B / 2, B / 2],
        [-B / 2, B / 2],
      ])
    )
      g.fill(tint.asphalt);
    // A broad wet sheen under the far sky, brightest away from the camera.
    if (
      this.groundQuad(g, cam, [
        [-half, B / 2],
        [half, B / 2],
        [half, far],
        [-half, far],
      ])
    )
      g.fill({ color: tint.wetSheen, alpha: 0.22 });
    // Centre lines, stop lines, crosswalks.
    for (const a of APPROACHES) {
      const h = heading(a);
      const r = rightOf(h);
      const q = (u: number, w: number): [number, number] => [
        -h[0] * u + r[0] * w,
        -h[1] * u + r[1] * w,
      ];
      for (let u = B / 2 + 6; u < far; u += 6)
        if (
          this.groundQuad(g, cam, [
            q(u, -0.08),
            q(u + 2.5, -0.08),
            q(u + 2.5, 0.08),
            q(u, 0.08),
          ])
        )
          g.fill({ color: tint.paint, alpha: 0.5 });
      // Stop line across the inbound lane, 0.5 m wide.
      if (
        this.groundQuad(g, cam, [
          q(B / 2 + 0.2, 0.1),
          q(B / 2 + 0.7, 0.1),
          q(B / 2 + 0.7, half),
          q(B / 2 + 0.2, half),
        ])
      )
        g.fill({ color: tint.paint, alpha: 0.8 });
      // Crosswalk: bars across the whole road, just outside the box.
      for (let w = -half + 0.3; w < half - 0.3; w += 1.0) {
        const wear = Math.abs(Math.abs(w) - LANE) < 0.9 ? 0.35 : 0.85;
        if (
          this.groundQuad(g, cam, [
            q(B / 2 + 1.0, w),
            q(B / 2 + 3.4, w),
            q(B / 2 + 3.4, w + 0.55),
            q(B / 2 + 1.0, w + 0.55),
          ])
        )
          g.fill({ color: tint.paint, alpha: wear });
      }
    }
  }

  /** Per-frame drawing. Task 8 fills this in. */
  draw(
    _S: TrafficState,
    _cam: Camera,
    _dt: number,
    _tint: Tint,
    _rain: number
  ): void {
    void _S;
    void _cam;
    void _dt;
    void _tint;
    void _rain;
  }
}
