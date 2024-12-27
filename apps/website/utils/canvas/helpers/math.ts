import { Point } from '../types'

/**
 * Determines whether two points in a 2D space are within a specified distance of each other.
 */
export function isWithinRadius (point1: Point, point2: Point, radius: number): boolean {
  const dx = point1.x - point2.x
  const dy = point1.y - point2.y

  // Calculate the distance using the Pythagorean theorem
  const distance = Math.sqrt(dx * dx + dy * dy)

  // Check if the distance is less than or equal to the radius
  return distance <= radius
}
