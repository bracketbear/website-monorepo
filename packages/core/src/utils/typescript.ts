/**
 * TypeScript utilities for object operations and type safety.
 */

// Type utilities for object operations
export type ObjectKeys<T> = T extends Record<infer K, any> ? K : never;
export type ObjectValues<T> = T extends Record<any, infer V> ? V : never;
export type ObjectEntries<T> = T extends Record<infer K, infer V> ? [K, V][] : never;

// Runtime utilities that provide type safety
export function objectKeys<T extends Record<string, any>>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof T>;
}

export function objectValues<T extends Record<string, any>>(obj: T): Array<T[keyof T]> {
  return Object.values(obj) as Array<T[keyof T]>;
}

export function objectEntries<T extends Record<string, any>>(obj: T): Array<[keyof T, T[keyof T]]> {
  return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
}

// Utility for safe object property access
export function getObjectProperty<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  key: K
): T[K] {
  return obj[key];
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