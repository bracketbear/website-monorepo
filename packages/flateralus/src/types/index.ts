import { BehaviorContext } from "..";

export interface Animation {
  animate(timestamp: number): void;
}

export interface Vec2D {
  x: number,
  y: number,
}

export interface Drawable {
  width: number;
  height: number;
  draw(ctx: BehaviorContext): void;
}

/**
 * The Pointer interface represents a generic pointer input, such as a mouse cursor on a desktop device or a finger on a touch device.
 */
export interface Pointer {
  active: boolean;
  pressure?: number;
  type?: 'mouse' | 'touch' | 'pen';
  button?: 'left' | 'middle' | 'right';
  position: Vec2D;
}
