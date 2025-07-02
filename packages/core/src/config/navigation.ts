import type { NavigationConfig } from '../types/navigation';

export const defaultNavigation: NavigationConfig = {
  items: [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Work', href: '/work' },
    { name: 'Contact', href: '/contact' },
  ],
  branding: {
    name: 'BracketBear',
    href: '/',
  },
  socialLinks: {
    github: 'https://github.com/bracketbear',
    linkedin: 'https://linkedin.com/in/bracketbear',
  },
};

export const portfolioNavigation: NavigationConfig = {
  items: [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Work', href: '/work' },
    { name: 'Contact', href: '/contact' },
  ],
  branding: {
    name: 'Portfolio',
    href: '/',
  },
  socialLinks: {
    github: 'https://github.com/bracketbear',
    linkedin: 'https://linkedin.com/in/bracketbear',
  },
};

export const bracketBearNavigation: NavigationConfig = {
  items: [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Services', href: '/services' },
    { name: 'Contact', href: '/contact' },
  ],
  branding: {
    name: 'BracketBear',
    href: '/',
  },
  socialLinks: {
    github: 'https://github.com/bracketbear',
    linkedin: 'https://linkedin.com/in/bracketbear',
  },
}; 