export type ObjectKeys<T> = T extends Record<infer K, any> ? K : never;
export type ObjectValues<T> = T extends Record<any, infer V> ? V : never;
export type ObjectEntries<T> =
  T extends Record<infer K, infer V> ? [K, V][] : never;
