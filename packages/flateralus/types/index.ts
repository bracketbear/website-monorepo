/**
 * @packageDocumentation
 * @module @flateralus/types
 * 
 * This module contains some of the types used throughout the Flateralus library that don't currently have homes.
 * This will probably be moved to a more appropriate location in the future.
 */
import { BehaviorContext } from "../src";

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
