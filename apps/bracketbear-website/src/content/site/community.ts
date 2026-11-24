import type { Link, Meta, Section } from './types';

export const meta: Meta = {
  title: 'Community | Bracket Bear',
  description:
    'The Bracket Bear Run Club, talks, TD Brackets as open source, and the lab.',
};

export const header: Section = {
  label: 'COMMUNITY',
  headline: 'Runs, talks and open source from Bracket Bear.',
  body: 'Bracket Bear puts time into the experiential industry and the cities it works in, whether or not a project comes of it. You can run with us, hear a talk, build on our code, or play with the lab.',
};

export const run: Section = {
  headline: 'Bracket Bear Run Club',
  body: 'At SEGD 2026 in Kansas City, the run club went from the Marriott Downtown to the Liberty Memorial and back, with coffee after. All runners are welcome at the next one.',
  links: [{ label: 'See the route', href: '/run' }],
};

export const talks: Section = {
  headline: 'Everything Is an Experience',
  body: 'The case for putting care into everything a business or a personal brand puts out, from the invoices to the software. It runs on creative technology, as a working example of a presentation people remember.',
  links: [{ label: 'See the talks', href: '/talks' }],
};

export const openSource: Section = {
  headline: 'TD Brackets',
  body: 'Our framework for TouchDesigner apps is free under the MIT license. Use it for your own work, and send issues and pull requests.',
  links: [
    {
      label: 'View on GitHub',
      href: 'https://github.com/bracketbear/td-brackets',
    },
    { label: 'See TD Brackets', href: '/td-brackets' },
  ],
};

export const lab: Section = {
  headline: 'The lab',
  body: 'Simulations we build in the browser and leave open to play with: a protoplanetary disc you throw planets into, a Chladni plate, and a run traced over downtown Kansas City.',
  links: [{ label: 'Open the lab', href: '/lab' }],
};

/** Both the handle and the URL are placeholders until the account is confirmed. */
export const instagram: { body: string; link: Link } = {
  body: 'We post our own creative work on Instagram. [PLACEHOLDER: handle]',
  link: { label: 'Follow along', href: '[PLACEHOLDER: URL]' },
};
