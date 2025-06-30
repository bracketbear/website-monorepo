import type { NavigationConfig, NavItem } from '@bracketbear/core/astro';

export const navItems: NavItem[] = [
  { name: 'Home', href: '/' },
  { name: 'About Me', href: '/about/me' },
  { name: 'Work History', href: '/work' },
  { name: 'Reach Out', href: '/contact' },
] as const;

export const navigationConfig: NavigationConfig = {
  items: navItems,
  branding: {
    name: 'Harrison Callahan',
    href: '/',
  },
};
