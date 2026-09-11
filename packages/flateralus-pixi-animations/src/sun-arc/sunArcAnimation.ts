import * as PIXI from 'pixi.js';
import { createManifest, PAL, hx } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { labelSprite } from '../shared/label-sprite';

const MANIFEST = createManifest({
  id: 'sun-arc',
  name: 'Solar Day',
  description:
    'Today’s actual sun path, computed from the real date and the city’s coordinates — sunrise, sunset, and day length are the true numbers, and the moon in the corner shows tonight’s real phase. A NOW tick marks where the sun is this second. Click to pause the day.',
  controls: [
    {
      name: 'city',
      type: 'select',
      label: 'City',
      options: [
        { label: 'Pittsburgh', value: 'pgh' },
        { label: 'Portland', value: 'pdx' },
      ],
      defaultValue: 'pgh',
      debug: true,
      resetsAnimation: true,
    },
    {
      // The solar math needs a date. The prototype read the wall clock,
      // which makes the arc, the sunrise/sunset numbers and the moon phase
      // drift day to day; pinning it here keeps the piece reproducible.
      name: 'dayOfYear',
      type: 'number',
      label: 'Day Of Year',
      min: 1,
      max: 365,
      step: 1,
      defaultValue: 253,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'cycle',
      type: 'number',
      label: 'Day Length (s)',
      min: 8,
      max: 120,
      step: 1,
      defaultValue: 36,
      debug: true,
    },
    {
      name: 'moon',
      type: 'boolean',
      label: 'Show Moon',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'now',
      type: 'boolean',
      label: 'Show NOW',
      defaultValue: true,
      debug: true,
    },
  ],
} as const);

export type SunArcControlValues = ManifestToControlValues<typeof MANIFEST>;

/** City coordinates the solar position is computed for. */
const CITY = {
  pgh: { lat: 40.4406, lon: -79.9959, name: 'PITTSBURGH, PA' },
  pdx: { lat: 45.5152, lon: -122.6784, name: 'PORTLAND, OR' },
};

/**
 * The year the pinned day-of-year is resolved against. Fixed and non-leap,
 * so day 253 is always September 10 and the moon phase never moves.
 */
const PINNED_YEAR = 2026;

/** Refraction-corrected horizon: the sun is "up" above -0.833 degrees. */
const HORIZON_ALT = -0.833;
/** Synodic month, and the Julian day of a known new moon. */
const SYNODIC_MONTH = 29.530588853;
const NEW_MOON_JD = 2451550.1;

const MOON_NAMES = [
  'NEW MOON',
  'WAXING CRESCENT',
  'FIRST QUARTER',
  'WAXING GIBBOUS',
  'FULL MOON',
  'WANING GIBBOUS',
  'LAST QUARTER',
  'WANING CRESCENT',
];

export class SunArcAnimation extends PixiAnimation<typeof MANIFEST> {
  private t = 0;
  private paused = false;
  /** Hour of the simulated day, 0..24. */
  private h = 6;

  private lat = 0;
  private lon = 0;
  private tz = 0;
  private doy = 1;
  private rise: number | null = null;
  private set: number | null = null;

  /** Plot box: left edge, width, horizon line and vertical amplitude. */
  private mx = 0;
  private mw = 0;
  private hy = 0;
  private amp = 0;

  private pathG: PIXI.Graphics | null = null;
  private horiz: PIXI.Graphics | null = null;
  private sun: PIXI.Graphics | null = null;
  private fx: PIXI.Graphics | null = null;
  private title: PIXI.Sprite | null = null;
  private moonSp: PIXI.Sprite | null = null;
  private moonLbl: PIXI.Sprite | null = null;
  private nowLbl: PIXI.Sprite | null = null;

  constructor(initialControls?: Partial<SunArcControlValues>) {
    super(MANIFEST, initialControls);
  }

  /**
   * Solar altitude in degrees at a local clock hour, by the NOAA
   * approximation: solar declination and the equation of time from the
   * fractional year, then the hour angle for this longitude.
   */
  private altAt(hLocal: number): number {
    const gamma = ((2 * Math.PI) / 365) * (this.doy - 1 + (hLocal - 12) / 24);
    const decl =
      0.006918 -
      0.399912 * Math.cos(gamma) +
      0.070257 * Math.sin(gamma) -
      0.006758 * Math.cos(2 * gamma) +
      0.000907 * Math.sin(2 * gamma) -
      0.002697 * Math.cos(3 * gamma) +
      0.00148 * Math.sin(3 * gamma);
    const eqt =
      229.18 *
      (0.000075 +
        0.001868 * Math.cos(gamma) -
        0.032077 * Math.sin(gamma) -
        0.014615 * Math.cos(2 * gamma) -
        0.040849 * Math.sin(2 * gamma));
    const tst = hLocal * 60 + eqt + 4 * this.lon - 60 * this.tz;
    const ha = ((tst / 4 - 180) * Math.PI) / 180;
    const lat = (this.lat * Math.PI) / 180;
    return (
      (Math.asin(
        Math.sin(lat) * Math.sin(decl) +
          Math.cos(lat) * Math.cos(decl) * Math.cos(ha)
      ) *
        180) /
      Math.PI
    );
  }

  /** Clock hour to stage x. */
  private X(h: number): number {
    return this.mx + (h / 24) * this.mw;
  }

  /** Altitude in degrees to stage y. */
  private Y(alt: number): number {
    return this.hy - (alt / 90) * this.amp;
  }

  onInit(app: PIXI.Application, controls: SunArcControlValues): void {
    const root = this.getRoot();
    const w = app.screen.width;
    const h = app.screen.height;

    this.t = 0;
    this.paused = false;
    this.h = 6;

    const cityId = controls.city === 'pdx' ? 'pdx' : 'pgh';
    const cfg = CITY[cityId];
    this.lat = cfg.lat;
    this.lon = cfg.lon;
    this.doy = Math.round(controls.dayOfYear);

    const date = new Date(PINNED_YEAR, 0, this.doy);
    // DST-aware enough for a sun path: March through November.
    const mo = date.getMonth();
    const dst = mo >= 2 && mo <= 10;
    this.tz = cityId === 'pgh' ? (dst ? -4 : -5) : dst ? -7 : -8;

    // Sunrise and sunset by scanning the altitude curve for the crossings.
    let rise: number | null = null;
    let set: number | null = null;
    let prev = this.altAt(0);
    for (let hh = 0.02; hh <= 24; hh += 0.02) {
      const a = this.altAt(hh);
      if (prev < HORIZON_ALT && a >= HORIZON_ALT) rise = hh;
      if (prev >= HORIZON_ALT && a < HORIZON_ALT) set = hh;
      prev = a;
    }
    this.rise = rise;
    this.set = set;

    const fmt = (hour: number | null): string => {
      if (hour == null) return '—';
      const hh = Math.floor(hour);
      const mm = Math.round((hour - hh) * 60);
      const h12 = ((hh + 11) % 12) + 1;
      return `${h12}:${String(mm).padStart(2, '0')}${hh < 12 ? ' AM' : ' PM'}`;
    };

    this.mx = w * 0.08;
    this.mw = w * 0.84;
    this.hy = h * 0.62;
    this.amp = h * 0.4;

    this.pathG = new PIXI.Graphics();
    this.horiz = new PIXI.Graphics();
    this.horiz.moveTo(this.mx - 20, this.hy);
    this.horiz.lineTo(this.mx + this.mw + 20, this.hy);
    this.horiz.stroke({ width: 1.5, color: PAL.cream, alpha: 0.35 });
    // Ground hatch under the horizon line.
    for (let x = this.mx - 20; x < this.mx + this.mw + 20; x += 14) {
      this.horiz.moveTo(x, this.hy + 4);
      this.horiz.lineTo(x - 6, this.hy + 10);
    }
    this.horiz.stroke({ width: 1, color: PAL.cream, alpha: 0.12 });

    this.sun = new PIXI.Graphics();
    this.sun.circle(0, 0, 26);
    this.sun.fill({ color: 0xffffff, alpha: 0.13 });
    this.sun.circle(0, 0, 11);
    this.sun.fill({ color: 0xffffff });
    this.fx = new PIXI.Graphics();
    root.addChild(this.horiz, this.pathG, this.fx, this.sun);

    const dayLen = rise != null && set != null ? set - rise : 0;
    const dl = `${Math.floor(dayLen)}H ${Math.round((dayLen % 1) * 60)}M OF DAYLIGHT`;
    const dateLabel = date
      .toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      .toUpperCase();
    this.title = labelSprite(
      `${cfg.name} — ${dateLabel}\n↑ ${fmt(rise)}   ↓ ${fmt(set)}\n${dl}`,
      {
        size: 10,
        weight: '700',
        letterSpacing: 2,
        lineHeight: 16,
        fill: hx(PAL.cream),
      }
    );
    this.title.x = this.mx;
    this.title.y = h * 0.06;
    root.addChild(this.title);

    // Moon, at the phase of the pinned date.
    const jd = date.getTime() / 86400000 + 2440587.5;
    let ph = ((jd - NEW_MOON_JD) / SYNODIC_MONTH) % 1;
    if (ph < 0) ph += 1;
    const illum = (1 - Math.cos(2 * Math.PI * ph)) / 2;
    const name = MOON_NAMES[Math.round(ph * 8) % 8];
    const mcv = document.createElement('canvas');
    mcv.width = 96;
    mcv.height = 96;
    const mctx = mcv.getContext('2d')!;
    const r = 40;
    const cx0 = 48;
    const cy0 = 48;
    mctx.fillStyle = 'rgba(255,255,255,0.14)';
    mctx.beginPath();
    mctx.arc(cx0, cy0, r, 0, 7);
    mctx.fill();
    mctx.fillStyle = '#ffffff';
    const waxing = ph < 0.5;
    // Terminator: 1 at new moon, -1 at full. The lit shape is a half disc
    // closed off by an ellipse whose width is the terminator position.
    const term = Math.cos(2 * Math.PI * ph);
    mctx.beginPath();
    mctx.arc(cx0, cy0, r, -Math.PI / 2, Math.PI / 2, !waxing);
    mctx.ellipse(
      cx0,
      cy0,
      Math.abs(term) * r,
      r,
      0,
      Math.PI / 2,
      -Math.PI / 2,
      term > 0 === waxing ? !waxing : waxing
    );
    mctx.fill();
    this.moonSp = new PIXI.Sprite(PIXI.Texture.from(mcv));
    this.moonSp.anchor.set(0.5);
    this.moonSp.x = w * 0.86;
    this.moonSp.y = h * 0.18;
    root.addChild(this.moonSp);
    this.moonLbl = labelSprite(`${name} · ${Math.round(illum * 100)}%`, {
      size: 9,
      weight: '500',
      letterSpacing: 2,
      fill: hx(PAL.cream),
    });
    this.moonLbl.anchor.set(0.5, 0);
    this.moonLbl.x = this.moonSp.x;
    this.moonLbl.y = this.moonSp.y + 52;
    this.moonLbl.alpha = 0.7;
    root.addChild(this.moonLbl);

    this.nowLbl = labelSprite('NOW', {
      size: 9,
      weight: '700',
      letterSpacing: 2,
      fill: hx(PAL.cyan),
    });
    this.nowLbl.anchor.set(0.5, 0);
    root.addChild(this.nowLbl);
  }

  onUpdate(
    app: PIXI.Application,
    controls: SunArcControlValues,
    deltaTime: number
  ): void {
    const pathG = this.pathG;
    const sun = this.sun;
    const fx = this.fx;
    const nowLbl = this.nowLbl;
    if (!pathG || !sun || !fx || !nowLbl) return;

    const dt = Math.min(0.05, deltaTime);
    this.t += dt;

    const h = app.screen.height;
    const pointer = this.pointer;
    if (pointer) {
      while (pointer.clicks.length) {
        pointer.clicks.shift();
        this.paused = !this.paused;
      }
    }
    if (!this.paused) {
      this.h = (this.h + (dt * 24) / controls.cycle) % 24;
    }

    // The arc traces on over the first two seconds, then stays.
    const boot = Math.min(1, this.t / 2);
    pathG.clear();
    let first = true;
    for (let hh = 0; hh <= 24 * boot; hh += 0.15) {
      const x = this.X(hh);
      const y = this.Y(this.altAt(hh));
      if (first) {
        pathG.moveTo(x, y);
        first = false;
      } else pathG.lineTo(x, y);
    }
    pathG.stroke({ width: 2, color: PAL.sun, alpha: 0.8 });

    const alt = this.altAt(this.h);
    sun.x = this.X(this.h);
    sun.y = this.Y(alt);
    sun.tint = alt > 0 ? PAL.sun : PAL.deep;
    // Still visible through civil twilight, then dimmed.
    sun.alpha = alt > -12 ? 1 : 0.55;

    fx.clear();
    for (const hh of [this.rise, this.set]) {
      if (hh == null) continue;
      fx.moveTo(this.X(hh), this.hy - 8);
      fx.lineTo(this.X(hh), this.hy + 8);
    }
    fx.stroke({ width: 2, color: PAL.cream, alpha: 0.6 });

    if (controls.now) {
      // The date is pinned by the control, but the NOW tick is the one live
      // element: it marks the current clock time on the pinned day's arc.
      const now = new Date();
      const hNow = now.getHours() + now.getMinutes() / 60;
      const yNow = this.Y(this.altAt(hNow));
      fx.moveTo(this.X(hNow), yNow - 14);
      fx.lineTo(this.X(hNow), yNow + 14);
      fx.stroke({ width: 1.5, color: PAL.cyan, alpha: 0.9 });
      nowLbl.visible = true;
      nowLbl.x = this.X(hNow);
      nowLbl.y = yNow + 18;
    } else nowLbl.visible = false;

    if (this.moonSp && this.moonLbl) {
      this.moonSp.visible = controls.moon;
      this.moonLbl.visible = controls.moon;
      this.moonSp.tint = PAL.cream;
      this.moonSp.y = h * 0.18 + Math.sin(this.t * 0.5) * 4;
      this.moonLbl.y = this.moonSp.y + 52;
    }
  }

  onDestroy(): void {
    this.pathG = null;
    this.horiz = null;
    this.sun = null;
    this.fx = null;
    this.title = null;
    this.moonSp = null;
    this.moonLbl = null;
    this.nowLbl = null;
    super.onDestroy();
  }
}

export function createSunArcAnimation(
  initialControls?: Partial<SunArcControlValues>
): SunArcAnimation {
  return new SunArcAnimation(initialControls);
}
