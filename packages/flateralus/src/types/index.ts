/**
 * @packageDocumentation
 * @module @flateralus/types
 * 
 * This module contains some of the types used throughout the Flateralus library that don't currently have homes.
 * This will probably be moved to a more appropriate location in the future.
 */

import type { Pointer } from "../pointers"


export interface Vec2D {
  x: number,
  y: number,
}

export interface DrawContext {
  pointer: Pointer
  timestamp: number
  // Any other data that might be relevant to your behaviors
  [key: string]: any
}
