import type { Breadcrumb } from './breadcrumb.js';

export interface NavItem {
  name: string;
  href: string;
  icon?: string;
  children?: NavItem[];
  /** Optional property for link target (_blank, _self, etc.) */
  target?: string;
  /** Optional property for link relationship (noopener, noreferrer, etc.) */
  rel?: string;
  /** Whether to show this item on desktop navigation (defaults to true) */
  desktop?: boolean;
  /** Whether to show this item on mobile navigation (defaults to true) */
  mobile?: boolean;
  /** Optional key for active page detection - can be exact match or category prefix */
  key?: string;
}

export interface NavigationConfig {
  items: NavItem[];
  branding?: {
    logo?: string;
    name: string;
    href: string;
  };
  socialLinks?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
  };
  breadcrumbs?: Breadcrumb[];
  /** Current page key for active navigation highlighting */
  currentPage?: string;
}
