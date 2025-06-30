export interface NavItem {
  name: string;
  href: string;
  icon?: string;
  children?: NavItem[];
  /** Optional property for link target (_blank, _self, etc.) */
  target?: string;
  /** Optional property for link relationship (noopener, noreferrer, etc.) */
  rel?: string;
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
}
