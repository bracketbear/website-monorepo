import type { Link, Meta, Section } from './types';

export const meta: Meta = {
  title: 'About | Bracket Bear',
  description:
    "Bracket Bear is Harrison Callahan's studio for experiential software: platforms for agencies, and TouchDesigner apps on TD Brackets. Rooted in Pittsburgh, based in Portland.",
};

export const header: Section = {
  label: 'ABOUT',
  headline:
    "Bracket Bear is Harrison Callahan's studio for experiential software.",
  body: "Harrison started Bracket Bear in 2025, after building experience platforms at Downstream and Deeplocal. The studio builds platforms for experiential agencies and TouchDesigner apps on TD Brackets. It's rooted in Pittsburgh and based in Portland.",
};

export const founder: { headline: string; body: string[]; photo: string } = {
  headline: 'Harrison Callahan, founder',
  body: [
    "Harrison has built websites and software since 2012, and software for experiential work since 2020: the front end of Bridge at Downstream, full-stack work on Gumband at Deeplocal, and Hyperquake's Experience Platform at Bracket Bear. He gives a talk on care and creative technology, Everything Is an Experience.",
  ],
  photo: '[PLACEHOLDER: a photo of Harrison, or none]',
};

/** The personal portfolio, served by apps/portfolio. */
export const portfolio: Link = {
  label: 'Full work history',
  href: 'https://harrisoncallahan.com/',
};

/** `label` names the group an item belongs to; items in a group are adjacent. */
export const howWeWork: { headline: string; intro: string; items: Section[] } =
  {
    headline: 'How a project runs here',
    intro:
      'Welcome to Bracket Bear is how we treat a project, from the first email to the invoice. The care that goes into the platform architecture goes into the invoice we put our name on.',
    items: [
      {
        label: 'On platform work',
        headline: 'Guides your team can follow.',
        body: 'A release that changes how your producers work comes with an illustrated guide. We take the screenshots from a full run on a copy of your system before you touch the real one.',
      },
      {
        label: 'On platform work',
        headline: 'Changes checked against your real content.',
        body: 'Before a change to a live platform merges, we run it read-only against the content of every exhibit you have, so a change that would break one shows up first.',
      },
      {
        label: 'On TouchDesigner work',
        headline: 'Apps that pass their checks before they ship.',
        body: 'Every app we build on TD Brackets passes its smoke check before it leaves our hands: it opens, runs and reports its frame rate at each output size it declares.',
      },
      {
        label: 'On both',
        headline: 'Invoices you can check.',
        body: 'Each line on an invoice traces back to a meeting or a commit.',
      },
    ],
  };
