import type { NavigationConfig, NavItem } from '@bracketbear/core';
import BracketBearLogoSvg from '@bracketbear/core/assets/bracket-bear-logo.svg?url';

export const navItems: NavItem[] = [
  { name: 'Platforms', href: '/platforms' },
  { name: 'TD Brackets', href: '/td-brackets' },
  { name: 'Community', href: '/community' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
];

/** A nav item is current on its own page and below it. Talks live under Community. */
export function isCurrent(href: string, path: string): boolean {
  const on = (base: string) => path === base || path.startsWith(base + '/');
  if (href === '/community' && on('/talks')) return true;
  return on(href);
}

export const navigationConfig: NavigationConfig = {
  items: navItems,
  branding: {
    logo: BracketBearLogoSvg,
    name: 'Bracket Bear',
    href: '/',
  },
  socialLinks: {},
};
