import type { NavigationConfig, NavItem } from '@bracketbear/core';

export const navItems: NavItem[] = [
  { name: 'Home', href: '/', desktop: false, key: 'home' },
  { name: 'About', href: '/about', key: 'about' },
  { name: 'Source Code', href: '/source-code', key: 'source-code' },
  { name: 'Work History', href: '/work', key: 'work' },
  { name: 'Projects', href: '/projects', key: 'project' },
  { name: 'Contact', href: '/contact', key: 'contact' },
] as const;

export const navigationConfig: NavigationConfig = {
  items: navItems,
  branding: {
    name: 'Harrison Callahan',
    href: '/',
  },
};
