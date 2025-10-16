import type { NavigationConfig, NavItem } from '@bracketbear/core';
import BracketBearLogoSvg from '@bracketbear/core/assets/bracket-bear-logo.svg?url';

export const navItems: NavItem[] = [
  {
    name: 'About',
    href: '/about',
  },
  {
    name: 'Services',
    href: '/services',
  },
] as const;

export const navigationConfig: NavigationConfig = {
  items: navItems,
  branding: {
    logo: BracketBearLogoSvg,
    name: 'Bracket Bear',
    href: '/',
  },
  socialLinks: {},
};
