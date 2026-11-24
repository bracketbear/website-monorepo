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

  it('does not flag "your team"', () => {
    expect(findViolations(['what your team will change'])).toEqual([]);
  });

  it('flags emoji', () => {
    expect(findViolations(['Hello 🔥']).map((v) => v.rule)).toEqual(['emoji']);
  });

  it('passes clean copy', () => {
    expect(findViolations(['TouchDesigner apps you can test'])).toEqual([]);
  });
});

describe('countPlaceholders', () => {
  it('counts every occurrence, not every string', () => {
    expect(countPlaceholders(['[PLACEHOLDER: a] and [PLACEHOLDER: b]'])).toBe(
      2
    );
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

  it.each(modules)('%s has at most one exclamation point', (_path, mod) => {
    const bangs = collectStrings(mod).join('').split('!').length - 1;
    expect(bangs).toBeLessThanOrEqual(1);
  });

  it('placeholders do not grow past the ones tracked in the project notes', () => {
    const all = modules.flatMap(([, mod]) => collectStrings(mod));
    expect(countPlaceholders(all)).toBeLessThanOrEqual(8);
  });
});

describe('platforms', () => {
  it('are told in order, and never call Downstream or Deeplocal clients', async () => {
    const { history } = await import('./platforms');
    expect(history.platforms.map((p) => p.name)).toEqual([
      'Bridge',
      'Gumband',
      "Hyperquake's Experience Platform",
    ]);
    for (const p of history.platforms) {
      expect(p.body).not.toMatch(/\bclients?\b/i);
    }
  });
});

describe('td-brackets', () => {
  it('has four features, the quickstart commands and five placeholders', async () => {
    const m = await import('./td-brackets');
    expect(m.features).toHaveLength(4);
    expect(m.quickstart.commands).toEqual([
      'tdb new demo',
      'cd demo',
      'tdb td smoke',
    ]);
    const all = [m.header, m.hire]
      .map((s) => String(s.body))
      .concat(m.apps.map((a) => a.body));
    expect(countPlaceholders(all)).toBe(5);
    expect(m.header.links![0].href).toBe(
      'https://github.com/bracketbear/td-brackets'
    );
  });
});
