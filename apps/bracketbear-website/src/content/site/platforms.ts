import type { Meta, Section } from './types';
import { MAILTO } from './shared';

export const meta: Meta = {
  title:
    'Platforms: the CMS, agents and integrations behind installations | Bracket Bear',
  description:
    'Bracket Bear builds experience platforms for agencies: a CMS for producers, an agent on each exhibit machine, and receivers for TouchDesigner, Unity, Unreal, Godot, Electron, Python and C++.',
};

export const header: Section = {
  label: 'PLATFORMS',
  headline:
    'The CMS, the agents and the integrations behind your installations, built as one platform.',
  body: 'An installation needs more than its app. Someone has to change the content after opening, keep the app running on its machine, and find out when it stops. We build the platform that does those jobs.',
};

export const parts: Section[] = [
  {
    headline: 'The CMS.',
    body: "Your producers edit an exhibit's text, media, schedules and collections in a browser. A JSON manifest defines each exhibit's fields, so a new exhibit starts as a manifest.",
  },
  {
    headline: 'The agent.',
    body: 'A program on each exhibit machine starts the app, restarts it when it crashes, syncs media with checksums, and reports CPU, memory and uptime back to the CMS.',
  },
  {
    headline: 'The receivers.',
    body: 'Libraries for TouchDesigner, Unity, Unreal, Godot, Electron, Python and C++ that hand the app its content as it changes.',
  },
];

export type HistoryPlatform = {
  name: string;
  company: string;
  role: string;
  years: string;
  body: string;
  image?: { src: string; alt: string };
};

/** Images stay absent until their provenance is confirmed (spec section 6). */
export const history: {
  headline: string;
  intro: string;
  platforms: HistoryPlatform[];
} = {
  headline: 'Three platforms since 2020.',
  intro:
    'Our founder, Harrison Callahan, has worked on experience platforms for six years. Each one carried an idea into the next.',
  platforms: [
    {
      name: 'Bridge',
      company: 'Downstream',
      years: '2020–2022',
      role: 'Lead front-end engineer',
      body: 'Downstream built Bridge so a new installation joined the platform through a JSON manifest, which cut the hours it took to prototype a project. Harrison led the front end, moving it to Vue 3, TypeScript and Vite over a Rust back end.',
    },
    {
      name: 'Gumband',
      company: 'Deeplocal',
      years: '2024–2025',
      role: 'Full-stack engineer',
      body: "Gumband was Deeplocal's CMS for experiential teams, built for reliability. Harrison worked across the platform and prototyped a TouchDesigner integration for building Gumband apps without code.",
    },
    {
      name: "Hyperquake's Experience Platform",
      company: 'Bracket Bear',
      years: '2025–',
      role: 'Architect',
      body: "Harrison architected Hyperquake's Experience Platform: the CMS, the agent on each exhibit machine, and receivers for seven runtimes. It brings both earlier ideas together: exhibits defined by manifests, as in Bridge, and the TouchDesigner integration first prototyped at Gumband.",
    },
  ],
};

export const offer: Section = {
  headline: 'A platform for your agency, or the part your setup is missing.',
  body: 'We build a full platform, or one piece of one: an agent for your exhibit machines, a receiver for the runtime your team uses, or a CMS for your producers. If the app runs on TouchDesigner, we can build that too, on TD Brackets.',
  links: [
    { label: 'Say hello', href: MAILTO },
    { label: 'See TD Brackets', href: '/td-brackets' },
  ],
};
