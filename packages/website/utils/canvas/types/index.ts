export interface Animation {
  animate(timestamp: number): void;
}

export interface Drawable {
  width: number;
  height: number;
  draw(offset: {x: number, y: number}): void;
}

export interface Point {
  x: number,
  y: number,
}

/**
 * The Pointer interface represents a generic pointer input, such as a mouse cursor on a desktop device or a finger on a touch device.
 */
export interface Pointer extends Point {
  x: number;
  y: number;
  active: boolean;
  pressure?: number;
  type?: 'mouse' | 'touch' | 'pen';
  button?: 'left' | 'middle' | 'right';
}
