import * as PIXI from 'pixi.js';
import { createManifest, PAL, hx } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { labelSprite } from '../shared/label-sprite';
import { scrim } from '../shared/scrim';

const MANIFEST = createManifest({
  id: 'rust-machine',
  name: 'Rust Machine',
  description:
    'Industrial decay — a corroding spiral of strokes grinding downward on a machine beat. Every bar the whole frame slams, static bands crawl, tears rip the signal sideways, and a distressed ticker mutters at the bottom. Cursor magnetizes the grain and bends the spiral; click for a full strobe SLAM.',
  controls: [
    {
      name: 'bpm',
      type: 'number',
      label: 'Machine BPM',
      min: 60,
      max: 160,
      step: 2,
      defaultValue: 96,
      debug: true,
    },
    {
      name: 'grain',
      type: 'number',
      label: 'Static Grain',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.55,
      debug: true,
    },
    {
      name: 'decay',
      type: 'number',
      label: 'Corrosion',
      min: 0,
      max: 0.9,
      step: 0.05,
      defaultValue: 0.35,
      debug: true,
    },
    {
      name: 'strobe',
      type: 'boolean',
      label: 'Strobe On Click',
      defaultValue: true,
      debug: true,
    },
  ],
} as const);

export type RustMachineControlValues = ManifestToControlValues<typeof MANIFEST>;

interface Seg {
  /** Angle along the log spiral, and its radius. */
  a: number;
  r: number;
  /** Per-segment phase, hashed into the corrosion flicker. */
  ph: number;
}

interface Tear {
  y: number;
  h: number;
  dx: number;
  life: number;
}

interface Band {
  y: number;
  v: number;
}

const PHRASES = [
  'THE MACHINE KEEPS RUNNING',
  'SIGNAL OVER NOISE',
  'EVERYTHING ERODES',
  'STILL. TURNING.',
];

/** Cursor magnet radius for the grain and the spiral. */
const MAGNET = 90;

export class RustMachineAnimation extends PixiAnimation<typeof MANIFEST> {
  private t = 0;
  /** Beat slam and strobe, both decaying exponentially. */
  private kick = 0;
  private strobeV = 0;
  private beatN = 0;
  private tear: Tear | null = null;
  private tearT = 1.2;

  private grp: PIXI.Container | null = null;
  private cx = 0;
  private cy = 0;
  private S = 1;
  private segs: Seg[] = [];
  private spiral: PIXI.Graphics | null = null;
  private staticG: PIXI.Graphics | null = null;
  private fx: PIXI.Graphics | null = null;
  private white: PIXI.Graphics | null = null;
  private tickers: PIXI.Sprite[] = [];
  private bands: Band[] = [];

  constructor(initialControls?: Partial<RustMachineControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(app: PIXI.Application): void {
    const root = this.getRoot();
    const w = app.screen.width;
    const h = app.screen.height;

    this.t = 0;
    this.kick = 0;
    this.strobeV = 0;
    this.beatN = 0;
    this.tear = null;
    this.tearT = 1.2;

    scrim(root, w, h).alpha = 0.95;
    this.grp = new PIXI.Container();
    root.addChild(this.grp);
    this.cx = w / 2;
    this.cy = h / 2;
    const S = Math.min(w, h);
    this.S = S;

    // Logarithmic spiral, wound tight and cut off before it leaves the frame.
    this.segs = [];
    for (let a = 0.5; a < Math.PI * 7; a += 0.085) {
      const r = S * 0.015 * Math.exp(a * 0.155);
      if (r > S * 0.44) break;
      this.segs.push({ a, r, ph: Math.random() * 100 });
    }

    this.spiral = new PIXI.Graphics();
    this.staticG = new PIXI.Graphics();
    this.fx = new PIXI.Graphics();
    this.grp.addChild(this.spiral, this.staticG, this.fx);

    this.tickers = PHRASES.map((p) => {
      const sp = labelSprite(p, {
        size: 10,
        weight: '700',
        letterSpacing: 5,
        fill: hx(PAL.cream),
      });
      const maxW = w * 0.86;
      if (sp.width > maxW) sp.scale.set(maxW / (sp.width / sp.scale.x));
      sp.x = w / 2 - sp.width / 2;
      sp.y = h * 0.9;
      sp.alpha = 0;
      this.grp!.addChild(sp);
      return sp;
    });

    this.bands = [
      { y: Math.random(), v: 0.02 },
      { y: Math.random(), v: -0.013 },
      { y: Math.random(), v: 0.03 },
    ];

    this.white = new PIXI.Graphics();
    this.white.rect(0, 0, w, h);
    this.white.fill({ color: 0xffffff });
    this.white.alpha = 0;
    root.addChild(this.white);
  }

  onUpdate(
    app: PIXI.Application,
    controls: RustMachineControlValues,
    deltaTime: number
  ): void {
    const grp = this.grp;
    const spiral = this.spiral;
    const staticG = this.staticG;
    const fx = this.fx;
    const white = this.white;
    if (!grp || !spiral || !staticG || !fx || !white) return;

    const dt = Math.min(0.05, deltaTime);
    this.t += dt;

    const w = app.screen.width;
    const h = app.screen.height;
    const mouse = this.pointer?.mouse;

    // Beat clock: every bar lands harder than the beats inside it.
    const beat = (this.t * controls.bpm) / 60;
    if (Math.floor(beat) > this.beatN) {
      this.beatN = Math.floor(beat);
      this.kick = this.beatN % 4 === 0 ? 1 : 0.45;
      if (Math.random() < 0.3) {
        this.tear = {
          y: Math.random() * h,
          h: 8 + Math.random() * 30,
          dx: (Math.random() - 0.5) * 26,
          life: 0.12,
        };
      }
    }

    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        pointer.clicks.shift();
        this.kick = 1.5;
        if (controls.strobe) this.strobeV = 1;
        this.tear = {
          y: Math.random() * h,
          h: 20 + Math.random() * 50,
          dx: (Math.random() - 0.5) * 40,
          life: 0.16,
        };
      }
    }

    this.kick *= Math.exp(-dt * 7);
    this.strobeV *= Math.exp(-dt * 11);
    white.alpha = this.strobeV * 0.85;

    this.tearT -= dt;
    if (this.tearT <= 0) {
      this.tearT = 1.2 + Math.random() * 2.2;
      if (!this.tear) {
        this.tear = {
          y: Math.random() * h,
          h: 6 + Math.random() * 24,
          dx: (Math.random() - 0.5) * 18,
          life: 0.1,
        };
      }
    }
    let tearDx = 0;
    if (this.tear) {
      this.tear.life -= dt;
      tearDx = this.tear.dx;
      if (this.tear.life <= 0) this.tear = null;
    }

    grp.x = tearDx + (Math.random() - 0.5) * this.kick * 7;
    grp.y = (Math.random() - 0.5) * this.kick * 7;
    grp.alpha = 0.9 + this.kick * 0.1 - Math.random() * 0.06;

    spiral.clear();
    const rot = -this.t * 0.35;
    // Corrosion is quantized to a 9Hz tick so segments blink out in frames
    // rather than shimmering continuously.
    const tick = Math.floor(this.t * 9);
    const mx = (mouse?.x ?? 0) - this.cx;
    const my = (mouse?.y ?? 0) - this.cy;
    for (let i = 1; i < this.segs.length; i++) {
      const sg = this.segs[i];
      const pv = this.segs[i - 1];
      const flick = Math.sin(sg.ph * 91.7 + tick * 13.3) * 0.5 + 0.5;
      if (flick < controls.decay) continue;
      const a1 = pv.a + rot;
      const a2 = sg.a + rot;
      const x1 = Math.cos(a1) * pv.r;
      const y1 = Math.sin(a1) * pv.r;
      let x2 = Math.cos(a2) * sg.r;
      let y2 = Math.sin(a2) * sg.r;
      if (mouse?.active) {
        const dd = Math.hypot(x2 - mx, y2 - my);
        if (dd < MAGNET) {
          const f = (1 - dd / MAGNET) * 14;
          x2 += (Math.random() - 0.5) * f;
          y2 += (Math.random() - 0.5) * f;
        }
      }
      spiral.moveTo(this.cx + x1, this.cy + y1);
      spiral.lineTo(this.cx + x2, this.cy + y2);
      const outer = sg.r / (this.S * 0.44);
      spiral.stroke({
        width: 1 + outer * 2.4,
        color: outer > 0.75 ? PAL.rust : outer > 0.4 ? PAL.deep : PAL.cream,
        alpha: 0.35 + outer * 0.45 + this.kick * 0.2,
      });
    }
    spiral.circle(this.cx, this.cy, 5 + this.kick * 5);
    spiral.fill({ color: 0xffffff, alpha: 0.85 });

    // Static grain: a third of it crawls in bands, a third sticks to the cursor.
    staticG.clear();
    for (const b of this.bands) b.y = (b.y + b.v * dt * 8 + 1) % 1;
    const n = Math.round(controls.grain * 220 + this.kick * 160);
    for (let i = 0; i < n; i++) {
      let x = Math.random() * w;
      let y = Math.random() * h;
      const band = this.bands[i % 3];
      if (i % 2) y = (band.y + (Math.random() - 0.5) * 0.06) * h;
      if (mouse?.active && i % 3 === 0) {
        x = mouse.x + (Math.random() - 0.5) * 130;
        y = mouse.y + (Math.random() - 0.5) * 130;
      }
      staticG.rect(x, y, 2, 2);
    }
    staticG.fill({ color: 0xffffff, alpha: 0.22 + this.kick * 0.2 });

    fx.clear();
    if (this.tear) {
      fx.moveTo(0, this.tear.y);
      fx.lineTo(w, this.tear.y);
      fx.moveTo(0, this.tear.y + this.tear.h);
      fx.lineTo(w, this.tear.y + this.tear.h);
      fx.stroke({ width: 1.5, color: 0xffffff, alpha: 0.5 });
    }

    const which = Math.floor(this.t / 4.5) % this.tickers.length;
    this.tickers.forEach((tk, i) => {
      // The live phrase drops out for a frame now and then, like bad contact.
      const want = i === which ? (Math.random() < 0.06 ? 0.15 : 0.85) : 0;
      tk.alpha += (want - tk.alpha) * Math.min(1, dt * 8);
      tk.y = h * 0.9 + (Math.random() - 0.5) * this.kick * 4;
      tk.x =
        w / 2 - tk.width / 2 + (Math.random() - 0.5) * (1.5 + this.kick * 5);
    });
  }

  onDestroy(): void {
    this.grp = null;
    this.spiral = null;
    this.staticG = null;
    this.fx = null;
    this.white = null;
    this.segs = [];
    this.tickers = [];
    this.bands = [];
    this.tear = null;
    super.onDestroy();
  }
}

export function createRustMachineAnimation(
  initialControls?: Partial<RustMachineControlValues>
): RustMachineAnimation {
  return new RustMachineAnimation(initialControls);
}
