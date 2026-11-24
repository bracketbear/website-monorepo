import type { Link, Meta } from './types';

export const meta: Meta = {
  title: 'Not found | Bracket Bear',
  description: "This page isn't here.",
};

export const notFound: { headline: string; link: Link } = {
  headline: "This page isn't here.",
  link: { label: 'Back to the front page', href: '/' },
};
