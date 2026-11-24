import type { Link } from './types';

export const CONTACT_EMAIL = 'hello@bracketbear.com';
export const MAILTO = 'mailto:hello@bracketbear.com';

export const close: { headline: string; button: Link } = {
  headline: 'Come say hello.',
  button: { label: 'Say hello', href: MAILTO },
};

export const footer = {
  line: 'Rooted in Pittsburgh, based in Portland. Now booking.',
};

export const bookend = "Welcome to Bracket Bear. We're happy you're here.";
