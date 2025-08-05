import type { ComponentProps } from 'react';
import MailIcon from '../assets/mail-icon.svg?react';
import GithubIcon from '../assets/github-icon.svg?react';
import LinkedInIcon from '../assets/linkedin-icon.svg?react';
import PhoneIcon from '../assets/phone-icon.svg?react';
import TwitterIcon from '../assets/twitter-icon.svg?react';
import WebsiteIcon from '../assets/website-icon.svg?react';

type ContactIconName =
  | 'mail'
  | 'github'
  | 'linkedin'
  | 'phone'
  | 'twitter'
  | 'website';

interface ContactIconProps extends Omit<ComponentProps<'svg'>, 'children'> {
  name: ContactIconName;
}

const iconMap = {
  mail: MailIcon,
  github: GithubIcon,
  linkedin: LinkedInIcon,
  phone: PhoneIcon,
  twitter: TwitterIcon,
  website: WebsiteIcon,
};

export function ContactIcon({ name, ...props }: ContactIconProps) {
  const IconComponent = iconMap[name];

  if (!IconComponent) {
    console.warn(`Unknown contact icon: ${name}`);
    return null;
  }

  return <IconComponent {...props} />;
}
