import type { NavigationConfig, NavItem } from '@bracketbear/core/astro';
import BracketBearLogoSvg from '@bracketbear/core/assets/bracket-bear-logo.svg?url';

export const navItems: NavItem[] = [] as const;

export const navigationConfig: NavigationConfig = {
  items: navItems,
  branding: {
    logo: BracketBearLogoSvg,
    name: 'Bracket Bear',
    href: '/',
  },
  socialLinks: {},
};
