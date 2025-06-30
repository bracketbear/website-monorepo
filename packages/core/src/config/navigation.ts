import type { NavigationConfig, NavItem } from '../types/navigation.js';

// Default navigation for portfolio sites
export const portfolioNavigation: NavigationConfig = {
  items: [
    { name: 'Home', href: '/' },
    { name: 'About Me', href: '/about/me' },
    { name: 'Work History', href: '/work' },
    { name: 'Reach Out', href: '/contact' },
  ],
  branding: {
    name: 'Harrison Callahan',
    href: '/',
  },
};

// Default navigation for Bracket Bear company site
export const bracketBearNavigation: NavigationConfig = {
  items: [
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
  ],
  branding: {
    name: 'Bracket Bear',
    href: '/',
  },
  socialLinks: {
    linkedin: 'https://www.linkedin.com/in/bracketbear/',
    github: 'https://github.com/bracketbear',
    twitter: 'https://twitter.com/bracketbear',
  },
};

// Generic default navigation
export const defaultNavigation: NavigationConfig = {
  items: [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ],
  branding: {
    name: 'Brand',
    href: '/',
  },
}; 