import { describe, expect, it } from 'vitest';
import {
  collectStrings,
  countPlaceholders,
  findViolations,
} from './copy-rules';

describe('findViolations', () => {
  it('flags an em dash', () => {
    expect(findViolations(['Built at Downstream — 2020'])).toEqual([
      { rule: 'em-dash', text: 'Built at Downstream — 2020' },
    ]);
  });

  it('flags British spelling', () => {
    const found = findViolations(['the colour of']);
    expect(found).toHaveLength(1);
    expect(found[0].rule).toBe('british');
  });

  it('flags headcount claims', () => {
    expect(findViolations(['our team of four']).map((v) => v.rule)).toContain(
      'headcount'
    );
  });

  it('passes clean copy', () => {
    expect(findViolations(['TouchDesigner apps you can test'])).toEqual([]);
  });
});

describe('collectStrings', () => {
  it('walks objects and arrays and keeps only strings', () => {
    expect(collectStrings({ a: ['x', { b: 'y' }], n: 3 })).toEqual(['x', 'y']);
  });
});

describe('site copy modules', () => {
  const modules = Object.entries(
    import.meta.glob('./*.ts', { eager: true })
  ).filter(
    ([path]) =>
      !/\/(types|copy-rules)\.ts$/.test(path) && !/\.test\.ts$/.test(path)
  );

  it('finds at least one module', () => {
    expect(modules.length).toBeGreaterThan(0);
  });

  it.each(modules)('%s has no copy violations', (_path, mod) => {
    expect(findViolations(collectStrings(mod))).toEqual([]);
  });

  it('placeholders do not grow past the ones tracked in the project notes', () => {
    const all = modules.flatMap(([, mod]) => collectStrings(mod));
    expect(countPlaceholders(all)).toBeLessThanOrEqual(8);
  });
});
