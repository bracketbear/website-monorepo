import type { Meta, Section } from './types';
import { MAILTO } from './shared';

export const meta: Meta = {
  title:
    'TD Brackets: an open-source framework for TouchDesigner apps | Bracket Bear',
  description:
    'TD Brackets gives TouchDesigner apps tested Python logic, a network you can review in git, and a one-command check. Open source, from Bracket Bear.',
};

export const header: Section = {
  label: 'TD BRACKETS',
  headline: 'A framework for TouchDesigner apps you can test, review and ship.',
  body: "TD Brackets is an open-source framework for building TouchDesigner apps. It gives each app the same layout, Python logic you can test without opening TD, and a network you can read in a git diff. We use it for client work, and it's free for yours.",
  links: [
    {
      label: 'View on GitHub',
      href: 'https://github.com/bracketbear/td-brackets',
    },
    { label: 'Read the quickstart', href: '#quickstart' },
  ],
};

/** Bodies keep their backticks; the page renders them as inline code. */
export const features: Section[] = [
  {
    headline: 'Python you can test.',
    body: "An app's logic lives in plain Python files with tests that run outside TouchDesigner. Portal Mark's TouchDesigner app runs 98 of them in a tenth of a second.",
  },
  {
    headline: 'A network you can review.',
    body: '`tdb dump` writes the network out as text, so a pull request shows the expression that changed or the shader that went stale.',
  },
  {
    headline: 'One command to check an app.',
    body: '`tdb td smoke` opens the app headless, checks it and measures its frame rate at each output size the app declares. A git hook runs it before each push.',
  },
  {
    headline: 'A new app in under a minute.',
    body: '`tdb new` took `td_noise` from an empty folder to a passing smoke check in 27 seconds.',
  },
];

export const quickstart: { headline: string; commands: string[] } = {
  headline: 'Quickstart',
  commands: ['tdb new demo', 'cd demo', 'tdb td smoke'],
};

export const appsHeadline = 'Built on TD Brackets.';

/** `video` and `repo` stay unset until a clip is captured or a repo is public. */
export const apps: {
  name: string;
  body: string;
  video?: string;
  repo?: string;
}[] = [
  {
    name: 'Portal Mark.',
    body: 'Fourteen worlds inside the Bracket Bear mark, with audio reactivity, god rays and GPU particles, played from a Launchpad Pro.',
  },
  {
    name: "Hyperquake's welcome wall.",
    body: "A lobby wall [PLACEHOLDER: confirm it stands in a lobby] whose message, colors and background video producers change from Hyperquake's CMS.",
  },
  {
    name: 'Brick Your Face Off.',
    body: "Breakout, with every brick a glass block holding one of Portal Mark's worlds: aurora, caustics, embers or signal.",
  },
  {
    name: 'Cyberpunk wall.',
    body: '[PLACEHOLDER: one line on what it is]',
  },
  {
    name: 'Crystal effect.',
    body: '[PLACEHOLDER: one line on what it is]',
  },
  {
    name: '3D voxel matrix.',
    body: '[PLACEHOLDER: one line on what it is]',
  },
];

export const hire: Section = {
  headline: 'Hire us to build your TouchDesigner app.',
  body: 'We build installations on TD Brackets for agencies: the app, its controls, and the checks that run before it ships. You get a project your own team can open, test and change after we hand it over. [PLACEHOLDER: confirm the hand-over is a commitment on every TD Brackets job] If the content has to change after opening, we build the platform for that too.',
  links: [
    { label: 'Say hello', href: MAILTO },
    { label: 'See platforms', href: '/platforms' },
  ],
};
