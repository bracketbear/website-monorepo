import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type Redirect = {
  from?: string;
  to?: string;
  status?: string;
  force?: string;
};

const toml = readFileSync(join(__dirname, '..', 'netlify.toml'), 'utf8');

// A small parser for the [[redirects]] blocks. It reads key = "value" pairs
// until the next table header, so it needs no TOML dependency.
function parseRedirects(source: string): Redirect[] {
  return source
    .split(/^\[\[redirects\]\]\s*$/m)
    .slice(1)
    .map((block) => {
      const body = block.split(/^\[/m)[0];
      const rule: Record<string, string> = {};
      for (const m of body.matchAll(/^(\w+)\s*=\s*"?([^"\n]*?)"?\s*$/gm)) {
        rule[m[1]] = m[2];
      }
      return rule as Redirect;
    });
}

const redirects = parseRedirects(toml);

describe('netlify.toml redirects', () => {
  it('redirects /services and /services/ to / with a 301', () => {
    for (const from of ['/services', '/services/']) {
      const rule = redirects.find((r) => r.from === from);
      expect(rule, `rule for ${from}`).toBeDefined();
      expect(rule?.to).toBe('/');
      expect(rule?.status).toBe('301');
    }
  });

  it('puts the /services redirects before every other rule', () => {
    expect(redirects[0].from).toBe('/services');
    expect(redirects[1].from).toBe('/services/');
  });

  it('has no /* catch-all, so Netlify serves the static 404.html', () => {
    expect(redirects.filter((r) => r.from === '/*')).toEqual([]);
  });

  it('keeps the /draft/* 404 and the /run/* passthrough from holding', () => {
    const draft = redirects.find((r) => r.from === '/draft/*');
    expect(draft).toMatchObject({
      to: '/404.html',
      status: '404',
      force: 'true',
    });
    const run = redirects.find((r) => r.from === '/run/*');
    expect(run).toMatchObject({ to: '/run/:splat', status: '200' });
  });
});
