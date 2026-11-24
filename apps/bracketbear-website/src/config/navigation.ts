import type { NavigationConfig, NavItem } from '@bracketbear/core';
import BracketBearLogoSvg from '@bracketbear/core/assets/bracket-bear-logo.svg?url';

export const navItems: NavItem[] = [
  { name: 'Platforms', href: '/platforms' },
  { name: 'TD Brackets', href: '/td-brackets' },
  { name: 'Lab', href: '/lab' },
  { name: 'Community', href: '/community' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
];

export const navigationConfig: NavigationConfig = {
  items: navItems,
  branding: {
    logo: BracketBearLogoSvg,
    name: 'Bracket Bear',
    href: '/',
  },
  socialLinks: {},
};
