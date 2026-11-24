import * as PIXI from 'pixi.js';
import {
  B,
  LANE,
  L_APPROACH,
  L_EXIT,
  APPROACHES,
  heading,
  rightOf,
  type Approach,
} from './geometry';
import { type Camera, project, projectMirror, cameraPos } from './camera';
import {
  KINDS,
  bodyPoseOf,
  poseOf,
  type TrafficState,
  type Vehicle,
} from './traffic';
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
  /** Wheel tracks in the wet film, refilled by rain. */
  private tracks: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    age: number;
    /** The rain-derived lifetime this track was recorded with, so it fades
     * out over its own span rather than a span that no longer matches the
     * current rain. */
    life: number;
  }[] = [];
  /** Skid marks, kept for the session. */
  private skids: { x: number; y: number; hx: number; hy: number }[] = [];
  /** Where each vehicle's last recorded track segment ended. */
  private lastPose = new Map<number, { x: number; y: number }>();
  private time = 0;
  /** Metres a vehicle travels between recorded track segments. */
  private static readonly TRACK_STEP = 1;
  private static readonly BODY = [
    0x2c3140, 0x4a2f2a, 0x1f3a4a, 0x3a3a3a, 0x5a4a30, 0x2a4a3a, 0x50505a,
    0x3a2a4a,
  ];

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

  /**
   * Every frame. Order matters for the painter: tracks on the road, then
   * the mirrored lights, then the light cones on the ground, then the
   * vehicles far to near, then the lamps themselves (they sit above the
   * bodies), then the cop, then the rain.
   */
  draw(
    S: TrafficState,
    cam: Camera,
    dt: number,
    tint: Tint,
    rain: number
  ): void {
    this.time += dt;
    this.recordHistory(S, dt, rain);
    this.drawHistory(cam);
    const sorted = [...S.vehicles].sort((a, b) => {
      const pa = poseOf(a);
      const pb = poseOf(b);
      const c = cameraPos(cam);
      return (
        Math.hypot(pb.x - c[0], pb.y - c[1]) -
        Math.hypot(pa.x - c[0], pa.y - c[1])
      );
    });
    this.reflections.clear();
    this.cones.clear();
    this.vehicles.clear();
    this.lamps.clear();
    for (const v of sorted) this.drawVehicle(v, cam, tint, rain);
    this.drawCop(S, cam, tint);
    this.drawRain(rain, tint);
  }

  /**
   * Wheel tracks: two lines per vehicle per metre travelled, at ±0.4 of
   * its width, that the rain refills over about a minute. Recorded per
   * metre since the last recorded pose, not per frame, so the cap holds
   * about a minute of the corner and a track lives out its `life`
   * instead of being culled at five seconds. Skids come from the core's
   * events and stay.
   */
  private recordHistory(S: TrafficState, dt: number, rain: number): void {
    const life = 25 + 50 * rain;
    for (const v of S.vehicles) {
      const q = poseOf(v);
      const last = this.lastPose.get(v.id);
      if (!last) {
        this.lastPose.set(v.id, { x: q.x, y: q.y });
        continue;
      }
      if (Math.hypot(q.x - last.x, q.y - last.y) >= Scene.TRACK_STEP) {
        const k = KINDS[v.kind];
        const rx = q.hy * k.width * 0.4;
        const ry = -q.hx * k.width * 0.4;
        this.tracks.push({
          x1: last.x + rx,
          y1: last.y + ry,
          x2: q.x + rx,
          y2: q.y + ry,
          age: 0,
          life,
        });
        this.tracks.push({
          x1: last.x - rx,
          y1: last.y - ry,
          x2: q.x - rx,
          y2: q.y - ry,
          age: 0,
          life,
        });
        this.lastPose.set(v.id, { x: q.x, y: q.y });
      }
    }
    for (const id of [...this.lastPose.keys()])
      if (!S.vehicles.some((v) => v.id === id)) this.lastPose.delete(id);
    for (const t of this.tracks) t.age += dt;
    this.tracks = this.tracks.filter((t) => t.age < t.life);
    if (this.tracks.length > 6000)
      this.tracks.splice(0, this.tracks.length - 6000);
    for (const e of S.events)
      if (e.type === 'skid') {
        this.skids.push({ x: e.x, y: e.y, hx: e.hx, hy: e.hy });
        if (this.skids.length > 160) this.skids.shift();
      }
  }

  private drawHistory(cam: Camera): void {
    const g = this.history;
    g.clear();
    for (const t of this.tracks) {
      const a = project(cam, t.x1, t.y1, 0);
      const b = project(cam, t.x2, t.y2, 0);
      if (!a || !b) continue;
      const [x1, y1] = this.px(a);
      const [x2, y2] = this.px(b);
      g.moveTo(x1, y1)
        .lineTo(x2, y2)
        .stroke({
          color: 0x07080c,
          alpha: 0.3 * (1 - t.age / t.life),
          width: Math.max(1, 14 / a.depth),
        });
    }
    for (const s of this.skids) {
      const a = project(cam, s.x - s.hx * 7, s.y - s.hy * 7, 0);
      const b = project(cam, s.x, s.y, 0);
      if (!a || !b) continue;
      const [x1, y1] = this.px(a);
      const [x2, y2] = this.px(b);
      g.moveTo(x1, y1)
        .lineTo(x2, y2)
        .stroke({
          color: 0x050608,
          alpha: 0.55,
          width: Math.max(1.5, 22 / a.depth),
        });
    }
  }

  /**
   * A vehicle is a box with a cab, projected corner by corner. Side faces
   * are drawn only when they face the camera; the roof always. Headlights
   * are two additive discs at the front corners with a cone on the road
   * ahead; tail lights two red discs at the rear, brighter and larger
   * while braking, which the IDM decides. Every disc is drawn again
   * mirrored through the road, smeared downward: the reflection is the
   * light's own geometry, and nothing is painted under a car.
   */
  private drawVehicle(v: Vehicle, cam: Camera, tint: Tint, rain: number): void {
    const k = KINDS[v.kind];
    // The body's own axis, not the front's tangent: in a bend the rear
    // tracks inside the curve, and the core's bodies are these.
    const q = bodyPoseOf(v);
    const rx = q.hy;
    const ry = -q.hx;
    const corner = (ds: number, dw: number, z: number) =>
      project(cam, q.x - q.hx * ds + rx * dw, q.y - q.hy * ds + ry * dw, z);
    const hw = k.width / 2;
    const roofH = k.height;
    const body = this.vehicles;
    const c0 = corner(0, -hw, 0);
    const c1 = corner(0, hw, 0);
    const c2 = corner(k.len, hw, 0);
    const c3 = corner(k.len, -hw, 0);
    const t0 = corner(0, -hw, roofH);
    const t1 = corner(0, hw, roofH);
    const t2 = corner(k.len, hw, roofH);
    const t3 = corner(k.len, -hw, roofH);
    if (!c0 || !c1 || !c2 || !c3 || !t0 || !t1 || !t2 || !t3) return;
    const base = Scene.BODY[v.color % Scene.BODY.length];
    const shade = (c: number, f: number) => {
      const r = Math.min(255, ((c >> 16) & 255) * f);
      const gg = Math.min(255, ((c >> 8) & 255) * f);
      const b = Math.min(255, (c & 255) * f);
      return (r << 16) | (gg << 8) | b;
    };
    const cp = cameraPos(cam);
    const faces: {
      pts: [number, number][];
      n: [number, number];
      mid: [number, number];
      col: number;
    }[] = [
      // front (glass), right side, rear, left side
      {
        pts: [this.px(c0), this.px(c1), this.px(t1), this.px(t0)],
        n: [q.hx, q.hy],
        mid: [q.x, q.y],
        col: shade(base, 0.55),
      },
      {
        pts: [this.px(c1), this.px(c2), this.px(t2), this.px(t1)],
        n: [rx, ry],
        mid: [
          q.x - q.hx * k.len * 0.5 + rx * hw,
          q.y - q.hy * k.len * 0.5 + ry * hw,
        ],
        col: shade(base, 0.8),
      },
      {
        pts: [this.px(c2), this.px(c3), this.px(t3), this.px(t2)],
        n: [-q.hx, -q.hy],
        mid: [q.x - q.hx * k.len, q.y - q.hy * k.len],
        col: shade(base, 0.7),
      },
      {
        pts: [this.px(c3), this.px(c0), this.px(t0), this.px(t3)],
        n: [-rx, -ry],
        mid: [
          q.x - q.hx * k.len * 0.5 - rx * hw,
          q.y - q.hy * k.len * 0.5 - ry * hw,
        ],
        col: shade(base, 0.8),
      },
    ];
    for (const f of faces) {
      const toCam = [cp[0] - f.mid[0], cp[1] - f.mid[1]];
      if (toCam[0] * f.n[0] + toCam[1] * f.n[1] <= 0) continue;
      body.moveTo(f.pts[0][0], f.pts[0][1]);
      for (const p of f.pts.slice(1)) body.lineTo(p[0], p[1]);
      body.closePath().fill(f.col);
    }
    const roof = [this.px(t0), this.px(t1), this.px(t2), this.px(t3)];
    body.moveTo(roof[0][0], roof[0][1]);
    for (const p of roof.slice(1)) body.lineTo(p[0], p[1]);
    body.closePath().fill(shade(base, 1.15 + 0.25 * rain));
    // Lights.
    const gain = tint.lightGain;
    const braking = v.accel < -0.6 || (v.v < 0.2 && v.phase === 'approach');
    const lamp = (
      ds: number,
      dw: number,
      z: number,
      color: number,
      r: number,
      alpha: number
    ) => {
      const p = corner(ds, dw, z);
      if (!p) return;
      const [x, y] = this.px(p);
      const rad = Math.max(1.5, (r * 60) / p.depth);
      this.lamps.circle(x, y, rad).fill({ color, alpha: alpha * gain });
      this.lamps
        .circle(x, y, rad * 2.6)
        .fill({ color, alpha: alpha * 0.18 * gain });
      const m = projectMirror(
        cam,
        q.x - q.hx * ds + rx * dw,
        q.y - q.hy * ds + ry * dw,
        z
      );
      if (!m) return;
      const [mx, my] = this.px(m);
      const smear = rad * (3 + 6 * rain);
      this.reflections
        .ellipse(mx, my + smear * 0.4, rad * 0.8, smear)
        .fill({ color, alpha: alpha * (0.18 + 0.3 * rain) * gain });
    };
    const isBike = v.kind === 'bike';
    if (isBike) {
      lamp(0, 0, 0.9, tint.headlight, 0.6, 0.9);
      lamp(k.len, 0, 0.8, tint.tail, 0.5, braking ? 1 : 0.6);
    } else {
      lamp(0, -hw * 0.75, 0.65, tint.headlight, 1, 0.95);
      lamp(0, hw * 0.75, 0.65, tint.headlight, 1, 0.95);
      const tr = braking ? 1.35 : 0.9;
      const ta = braking ? 1 : 0.55;
      lamp(k.len, -hw * 0.75, 0.85, tint.tail, tr, ta);
      lamp(k.len, hw * 0.75, 0.85, tint.tail, tr, ta);
      // Headlight cone on the road: a quad from the front corners forward.
      const reach = 6 + v.v * 0.9;
      const a = corner(0, -hw, 0);
      const b = corner(0, hw, 0);
      const c = corner(-reach, hw + 2.2, 0);
      const d = corner(-reach, -hw - 2.2, 0);
      if (a && b && c && d) {
        const P = [a, b, c, d].map((p) => this.px(p));
        this.cones.moveTo(P[0][0], P[0][1]);
        for (const p of P.slice(1)) this.cones.lineTo(p[0], p[1]);
        this.cones
          .closePath()
          .fill({ color: tint.headlight, alpha: (0.05 + 0.05 * rain) * gain });
      }
    }
  }

  /**
   * The cop: a silhouette with a lit vest and one arm that poses. Up toward
   * a held approach, sweeping for a wave, both out for a clear. Absent, the
   * cop stands on the corner.
   */
  private drawCop(S: TrafficState, cam: Camera, tint: Tint): void {
    const g = this.cop;
    g.clear();
    const c = S.cop;
    const at: [number, number] = c.present
      ? [0, 0]
      : [B / 2 + 1.8, -B / 2 - 1.8];
    const P = (dx: number, dy: number, z: number) =>
      project(cam, at[0] + dx, at[1] + dy, z);
    const foot = P(0, 0, 0);
    const shoulder = P(0, 0, 1.45);
    const head = P(0, 0, 1.7);
    if (!foot || !shoulder || !head) return;
    const w = Math.max(2, 60 / foot.depth);
    const [fx, fy] = this.px(foot);
    const [sx, sy] = this.px(shoulder);
    const [hx, hy] = this.px(head);
    g.moveTo(fx, fy)
      .lineTo(sx, sy)
      .stroke({ color: 0x0a0b10, width: w * 1.6 });
    g.circle(hx, hy, w * 0.9).fill(0x0a0b10);
    // The vest, lit.
    const v1 = P(0, 0, 0.95);
    const v2 = P(0, 0, 1.35);
    if (v1 && v2) {
      const [ax, ay] = this.px(v1);
      const [bx, by] = this.px(v2);
      g.moveTo(ax, ay)
        .lineTo(bx, by)
        .stroke({ color: tint.lamp, width: w * 1.7, alpha: 0.9 });
    }
    // The arm.
    let dir: [number, number] | null = null;
    let lift = 0;
    let both = false;
    if (c.present) {
      if (c.clearing) both = true;
      else if (c.waved !== null) {
        const h = heading(c.waved);
        const sweep = Math.sin(this.time * 5);
        dir = [
          -h[0] * Math.cos(sweep) - h[1] * Math.sin(sweep),
          -h[1] * Math.cos(sweep) + h[0] * Math.sin(sweep),
        ];
        lift = 0.2;
      } else {
        const a = c.held.findIndex((x) => x);
        if (a >= 0) {
          const h = heading(a as Approach);
          dir = [-h[0], -h[1]];
          lift = 0.6;
        }
      }
    }
    const arm = (d: [number, number], z: number) => {
      const tip = P(d[0] * 0.75, d[1] * 0.75, 1.4 + z);
      if (!tip) return;
      const [tx, ty] = this.px(tip);
      g.moveTo(sx, sy)
        .lineTo(tx, ty)
        .stroke({ color: 0x0a0b10, width: w * 0.9 });
    };
    if (both) {
      arm([1, 0], 0);
      arm([-1, 0], 0);
    } else if (dir) arm(dir, lift);
  }

  /** Streaks in the near field, redrawn each frame. */
  private drawRain(rain: number, tint: Tint): void {
    const g = this.rain;
    g.clear();
    if (rain <= 0) return;
    const n = Math.round(90 * rain);
    let s = (this.time * 1000) | 0;
    const r = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    for (let i = 0; i < n; i++) {
      const x = r() * this.w;
      const y = r() * this.h;
      const len = 8 + r() * 18;
      g.moveTo(x, y)
        .lineTo(x + 1.5, y + len)
        .stroke({ color: tint.headlight, alpha: 0.07 + 0.08 * r(), width: 1 });
    }
  }
}
