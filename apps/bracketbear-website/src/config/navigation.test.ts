import { describe, expect, it } from 'vitest';
import { isCurrent, navItems } from './navigation';

describe('navItems', () => {
  it('lists the five pages in order', () => {
    expect(navItems.map((i) => i.href)).toEqual([
      '/platforms',
      '/td-brackets',
      '/community',
      '/about',
      '/contact',
    ]);
    expect(navItems.map((i) => i.name)).toEqual([
      'Platforms',
      'TD Brackets',
      'Community',
      'About',
      'Contact',
    ]);
  });
});

describe('isCurrent', () => {
  it('marks Community current on /talks and below', () => {
    expect(isCurrent('/community', '/talks')).toBe(true);
    expect(isCurrent('/community', '/talks/everything-is-an-experience')).toBe(
      true
    );
  });
  it('marks a page current on itself', () => {
    expect(isCurrent('/platforms', '/platforms')).toBe(true);
  });
  it('does not match unrelated pages or prefixes', () => {
    expect(isCurrent('/lab', '/')).toBe(false);
    expect(isCurrent('/lab', '/laboratory')).toBe(false);
    expect(isCurrent('/platforms', '/talks')).toBe(false);
  });
});
