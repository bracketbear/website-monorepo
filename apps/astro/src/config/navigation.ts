interface NavItem {
  name: string;
  href: string;
  icon?: string;
  /** Optional property for link target (_blank, _self, etc.) */
  target?: string; // 
  /** Optional property for link relationship (noopener, noreferrer, etc.) */
  rel?: string;
}

export const navItems: NavItem[] = [
  { name: "Home", href: "/" },
  { name: "Work", href: "/work" },
  { name: "Projects", href: "/projects" },
  { name: "About", href: "/about" },
  { name: "Hire Me", href: "/contact" },
] as const;