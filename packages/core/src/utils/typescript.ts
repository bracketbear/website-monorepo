/**
 * TypeScript utilities for object operations and type safety.
 */

// Type utilities for object operations
export type ObjectKeys<T> = T extends Record<infer K, any> ? K : never;
export type ObjectValues<T> = T extends Record<any, infer V> ? V : never;
export type ObjectEntries<T> =
  T extends Record<infer K, infer V> ? [K, V][] : never;

export function objectEntries<T extends Record<string, any>>(
  obj: T
): Array<[keyof T, T[keyof T]]> {
  return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
}

// Utility for checking if an object has a specific key
export function hasObjectKey<T extends Record<string, any>, K extends string>(
  obj: T,
  key: K
): obj is T & Record<K, any> {
  return key in obj;
}

// Class name utility (similar to clsx/cn)
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
