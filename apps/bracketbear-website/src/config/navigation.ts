import type { NavigationConfig, NavItem } from '@bracketbear/core/astro';
import BracketBearLogoSvg from '@bracketbear/core/assets/bracket-bear-logo.svg?url';

export const navItems: NavItem[] = [
  { name: 'Home', href: '/' },
  { name: 'Work History', href: '/work' },
  {
    name: 'Learn About',
    href: '/about',
    children: [
      { name: 'About Me', href: '/about/me' },
      { name: 'About Bracket Bear', href: '/about/bracket-bear' },
      { name: 'About This App', href: '/about/site' },
    ],
  },
  { name: 'Reach Out', href: '/contact' },
] as const;

export const navigationConfig: NavigationConfig = {
  items: navItems,
  branding: {
    logo: BracketBearLogoSvg,
    name: 'Bracket Bear',
    href: '/',
  },
  socialLinks: {
    linkedin: 'https://www.linkedin.com/in/bracketbear/',
    github: 'https://github.com/bracketbear',
    twitter: 'https://twitter.com/bracketbear',
  },
};
