import * as PIXI from 'pixi.js';

/**
 * Monospace labels baked into a canvas texture.
 *
 * The lab animations set their labels in tracked-out caps, and PIXI's text
 * style has no letter-spacing, so the glyphs are drawn through a 2D canvas
 * instead. Everything is rendered at 2x and scaled back down so the type
 * stays crisp on high-DPI displays.
 */

export interface LabelOptions {
  /** Font size in CSS pixels, before the 2x supersample. */
  size: number;
  weight?: string;
  letterSpacing?: number;
  lineHeight?: number;
  /** CSS colour; use `hx()` from the palette to pass a palette value. */
  fill?: string;
}

/** `letterSpacing` is still missing from some TS dom libs. */
type SpacedContext = CanvasRenderingContext2D & { letterSpacing?: string };

export function labelSprite(str: string, o: LabelOptions): PIXI.Sprite {
  const sc = 2;
  const pad = 4;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d') as SpacedContext;
  const font = `${o.weight ?? '400'} ${o.size * sc}px "JetBrains Mono", monospace`;
  const setup = (): void => {
    ctx.font = font;
    ctx.textBaseline = 'top';
    if ('letterSpacing' in ctx) {
      ctx.letterSpacing = `${(o.letterSpacing ?? 0) * sc}px`;
    }
  };

  setup();
  const lines = String(str).split('\n');
  const w =
    Math.ceil(Math.max(...lines.map((t) => ctx.measureText(t).width))) +
    pad * 2;
  const lh = (o.lineHeight ?? o.size * 1.4) * sc;
  cv.width = Math.max(2, w);
  cv.height = Math.ceil(lh * lines.length) + pad * 2;
  // Resizing a canvas resets its context, so the font has to be set again.
  setup();
  ctx.fillStyle = o.fill ?? '#ffffff';
  lines.forEach((ln, i) => ctx.fillText(ln, pad, pad + i * lh));

  const sp = new PIXI.Sprite(PIXI.Texture.from(cv));
  sp.scale.set(1 / sc);
  return sp;
}
