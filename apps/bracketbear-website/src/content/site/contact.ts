import type { NeedValue } from '../../components/contact/contact-schema';
import { CONTACT_EMAIL, MAILTO } from './shared';
import type { Link, Meta, Section } from './types';

export const meta: Meta = {
  title: 'Contact | Bracket Bear',
  description:
    'Tell Bracket Bear about your platform or TouchDesigner project. Email hello@bracketbear.com or use the form.',
};

export const header: Section = {
  label: 'CONTACT',
  headline: "Tell us what you're building and when it opens.",
  body: "A platform for your exhibits, one piece of one, or a TouchDesigner app: send what you know so far. We'll reply with questions and where we'd start.",
};

export const form: {
  fields: {
    name: string;
    email: string;
    company: string;
    need: string;
    opens: string;
    message: string;
    messageHint: string;
  };
  needOptions: { value: NeedValue; label: string }[];
  errors: { name: string; email: string; need: string; message: string };
  button: 'Send';
  sent: string;
  failed: string;
  noscript: string;
} = {
  fields: {
    name: 'Name',
    email: 'Email',
    company: 'Agency or company (optional)',
    need: 'What do you need?',
    opens: 'When does it open? (optional)',
    message: 'Tell us about it',
    messageHint:
      'The venue, the runtime, and what your team will change after launch.',
  },
  needOptions: [
    { value: 'platform', label: 'A platform' },
    {
      value: 'platform-piece',
      label: 'One piece of a platform: an agent, a receiver or a CMS',
    },
    { value: 'td-app', label: 'A TouchDesigner app' },
    {
      value: 'app-and-platform',
      label: 'The app and the platform it runs on',
    },
    { value: 'other', label: 'A talk, a run, or something else' },
  ],
  errors: {
    name: 'Add your name.',
    email: 'Add an email we can reply to.',
    need: 'Pick what you need.',
    message: 'Tell us a little more.',
  },
  button: 'Send',
  sent: `Thanks. We'll reply from ${CONTACT_EMAIL}.`,
  failed: `That didn't send. Email ${CONTACT_EMAIL} and we'll pick it up from there.`,
  noscript: `The form needs JavaScript. Email ${CONTACT_EMAIL} instead.`,
};

export const other: { email: Link; linkedin: Link; line: string } = {
  email: { label: CONTACT_EMAIL, href: MAILTO },
  linkedin: {
    label: 'linkedin.com/company/bracketbear',
    href: 'https://linkedin.com/company/bracketbear',
  },
  line: 'Rooted in Pittsburgh, based in Portland.',
};
