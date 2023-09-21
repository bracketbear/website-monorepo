interface Link {
  label: string
  to: string | { name: string }
  alt: string
  emphasized?: boolean
}

interface SocialLink extends Link {
  iconComponent?: Component,
  iconPath?: string,
  to: string
}

const links: Link[] = [
  { label: 'About', to: '/about', alt: 'Learn more about who I am and where I come from' },
  { label: 'Projects', to: { name: 'projects' }, alt: "Check out some projects that I've worked on" },
  { label: 'Reach Out!', to: '/#contact', alt: 'Contact us to chat about what I can do for you', emphasized: true },
]

const socialLinks: SocialLink[] = [
  { label: 'LinkedIn - Harrison', iconPath: '/svg/linkedin.svg', to: 'https://www.linkedin.com/in/harrison-callahan', alt: 'Visit My LinkedIn page' },
  { label: 'LinkedIn - Bracket Bear', iconPath: '/svg/linkedin.svg', to: 'https://www.linkedin.com/company/bracketbear', alt: "Visit Bracket Bear's LinkedIn Page" },
  { label: 'GitHub', iconPath: '/svg/linkedin.svg', to: 'https://github.com/bracketbear', alt: "Visit Bracket Bear's LinkedIn Page" },
]

export { links, socialLinks }
