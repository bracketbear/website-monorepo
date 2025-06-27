interface NavItem {
  name: string;
  href: string;
  icon?: string;
  children?: NavItem[];
  /** Optional property for link target (_blank, _self, etc.) */
  target?: string;
  /** Optional property for link relationship (noopener, noreferrer, etc.) */
  rel?: string;
}

export const navItems: NavItem[] = [
  { name: "Home", href: "/" },
  { name: "Work History", href: "/work" },
  {
    name: "Learn About",
    href: "/about",
    children: [
      { name: "About Me", href: "/about/me" },
      { name: "About Bracket Bear", href: "/about/bracket-bear" },
      { name: "About This App", href: "/about/site" }
    ]
  },
  { name: "Reach Out", href: "/contact" },
] as const;