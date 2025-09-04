import { clsx, type ClassValue } from 'clsx';

/**
 * Utility function to combine class names with clsx
 * This is a wrapper around clsx for consistent class name handling
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
