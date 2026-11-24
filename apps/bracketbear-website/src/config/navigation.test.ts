import { describe, expect, it } from 'vitest';
import { navItems } from './navigation';

describe('navItems', () => {
  it('lists the six pages in order', () => {
    expect(navItems.map((i) => i.href)).toEqual([
      '/platforms',
      '/td-brackets',
      '/lab',
      '/community',
      '/about',
      '/contact',
    ]);
    expect(navItems.map((i) => i.name)).toEqual([
      'Platforms',
      'TD Brackets',
      'Lab',
      'Community',
      'About',
      'Contact',
    ]);
  });
});
