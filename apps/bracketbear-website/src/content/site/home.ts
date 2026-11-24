import type { Link, Meta, Section } from './types';
import { MAILTO } from './shared';

export const meta: Meta = {
  title:
    'Bracket Bear: platforms and TouchDesigner apps for experiential agencies',
  description:
    'Bracket Bear builds the CMS, machine agents and integrations behind interactive installations, and TouchDesigner apps on TD Brackets, our open-source framework.',
};

/** Five beats, shown with a diamond between them. */
export const ticker: string[] = [
  'Welcome to Bracket Bear',
  'Platforms and TouchDesigner apps for experiential agencies',
  'TD Brackets is open source',
  'Rooted in Pittsburgh, based in Portland',
  'Now booking',
];

export const hero: {
  eyebrow: string;
  headline: string;
  lede: string;
  button: Link;
} = {
  eyebrow: 'Welcome to Bracket Bear.',
  headline:
    'We build the software that keeps your installations running long after opening day.',
  lede: 'Bracket Bear builds two things for experiential agencies: the platform behind your exhibits, and the TouchDesigner apps that run on it. Hire us for one, or both.',
  button: { label: 'Tell us about your project', href: '/contact' },
};

export const doors: [Section, Section] = [
  {
    label: 'PLATFORMS',
    headline:
      'Update an exhibit from a browser, and know when a machine goes down.',
    body: "A Bracket Bear platform is a CMS your producers use, an agent on each exhibit machine that restarts the app when it crashes and reports the machine's health, and receivers for TouchDesigner, Unity, Unreal, Godot and Electron. Our founder, Harrison Callahan, led the front end of Bridge at Downstream and was a full-stack engineer on Gumband at Deeplocal. At Bracket Bear, he architected Hyperquake's Experience Platform.",
    links: [{ label: 'See the three platforms', href: '/platforms' }],
  },
  {
    label: 'TD BRACKETS',
    headline: 'TouchDesigner apps you can test and review in git.',
    body: "TD Brackets is our open-source framework for TouchDesigner. An app's logic is plain Python with tests that run outside TD, its network lives in git as text, and one command opens the app, checks it and measures its frame rate. We build apps on it for agencies, and you can build on it yourself.",
    links: [
      { label: 'See TD Brackets', href: '/td-brackets' },
      {
        label: 'View on GitHub',
        href: 'https://github.com/bracketbear/td-brackets',
      },
    ],
  },
];

export const both: Section = {
  label: 'BOTH',
  headline: 'Hire us for the app and the platform it runs on.',
  body: "Hyperquake's welcome wall is a TD Brackets app that gets its content from Hyperquake's CMS. We built the app on the wall and the receiver that connects it to the CMS, so when someone changes the message, the colors or the background video in a browser, the wall updates without anyone opening TouchDesigner.",
  links: [{ label: 'Tell us about your project', href: '/contact' }],
};

/** body[0..2] pair with links[0..2]; links[3] is the section's own link. */
export const community: Section = {
  label: 'COMMUNITY',
  headline: 'Run with us, hear a talk, or build on TD Brackets.',
  body: [
    'The Bracket Bear Run Club ran the SEGD 2026 route through downtown Kansas City, with coffee after.',
    'Everything Is an Experience, on care in a business and the creative technology that makes a talk memorable.',
    'Simulations we build in the browser and leave open to play with.',
  ],
  links: [
    { label: 'See the route', href: '/run' },
    { label: 'See the talks', href: '/talks' },
    { label: 'Open the lab', href: '/lab' },
    { label: 'See the community', href: '/community' },
  ],
};

export const contact: { headline: string; body: string; button: Link } = {
  headline: 'Come say hello.',
  body: "Email hello@bracketbear.com with what you're building and when it opens. We'll reply with questions and where we'd start.",
  button: { label: 'Say hello', href: MAILTO },
};
