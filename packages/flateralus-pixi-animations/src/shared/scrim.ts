import * as PIXI from 'pixi.js';
import { PAL } from '@bracketbear/flateralus';

/**
 * Full-bleed ink wash the dark lab animations sit on.
 *
 * Overdrawn by 4px on every side so a sub-pixel stage size never leaves a
 * bright hairline at the edge of the canvas.
 */
export function scrim(
  root: PIXI.Container,
  w: number,
  h: number
): PIXI.Graphics {
  const g = new PIXI.Graphics();
  g.rect(-4, -4, w + 8, h + 8);
  g.fill({ color: PAL.ink2, alpha: 0.88 });
  root.addChild(g);
  return g;
}
