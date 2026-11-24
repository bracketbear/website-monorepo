export type Violation = { rule: string; text: string };

const RULES: { rule: string; pattern: RegExp }[] = [
  { rule: 'em-dash', pattern: /—/ },
  { rule: 'emoji', pattern: /\p{Extended_Pictographic}/u },
  {
    rule: 'british',
    pattern:
      /\b(behaviour|colour|favour|honour|organis|centre|cancelled|labelled|licence)\w*/i,
  },
  { rule: 'headcount', pattern: /\b(our team|our engineers|team of)\b/i },
];

/** Walks any object, array or string and returns every string found. */
export function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

export function findViolations(strings: string[]): Violation[] {
  return strings.flatMap((text) =>
    RULES.filter(({ pattern }) => pattern.test(text)).map(({ rule }) => ({
      rule,
      text,
    }))
  );
}

export function countPlaceholders(strings: string[]): number {
  return strings.reduce(
    (total, s) => total + s.split('[PLACEHOLDER').length - 1,
    0
  );
}
