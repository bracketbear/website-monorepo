import type { NavigationConfig, NavItem } from '@bracketbear/core';

export const navItems: NavItem[] = [
  { name: 'Home', href: '/', desktop: false },
  { name: 'About Me', href: '/about' },
  { name: 'Work History', href: '/work' },
  { name: 'Projects', href: '/projects' },
  { name: 'Reach Out', href: '/contact' },
] as const;

export const navigationConfig: NavigationConfig = {
  items: navItems,
  branding: {
    name: 'Harrison Callahan',
    href: '/',
  },
};
