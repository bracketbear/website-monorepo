import { Vec2D } from '../types'

/**
 * Determines whether two points in a 2D space are within a specified distance of each other.
 */
export function isWithinRadius (point1: Vec2D, point2: Vec2D, radius: number): boolean {
  const dx = point1.x - point2.x
  const dy = point1.y - point2.y

  // Calculate the distance using the Pythagorean theorem
  const distance = Math.sqrt(dx * dx + dy * dy)

  // Check if the distance is less than or equal to the radius
  return distance <= radius
}

export function degreesToRadians (degrees: number): number {
  return degrees * Math.PI / 180
}
