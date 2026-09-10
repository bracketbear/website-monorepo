import { PAL, hx } from '@bracketbear/flateralus';

export type SectionKey =
  | 'hero'
  | 'statement'
  | 'intro'
  | 'work'
  | 'receipts'
  | 'values'
  | 'about'
  | 'cta'
  | 'toys';

export const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'hero', label: '01 · Hero' },
  { key: 'statement', label: '02 · Statement' },
  { key: 'intro', label: '03 · Approach' },
  { key: 'work', label: '04 · Work' },
  { key: 'receipts', label: '05 · Receipts' },
  { key: 'values', label: '06 · Values' },
  { key: 'about', label: '07 · About' },
  { key: 'cta', label: '08 · Contact' },
  { key: 'toys', label: '09 · Toys' },
];

/**
 * Stage background for a section, read from the live palette so a theme
 * switch recolors the ground as well as the animation.
 */
export function sectionBackground(key: SectionKey): string {
  switch (key) {
    case 'hero':
      return `radial-gradient(ellipse 90% 70% at 50% 30%, ${hx(PAL.sun)} 0%, ${hx(PAL.bright)} 32%, ${hx(PAL.orange)} 62%, ${hx(PAL.orange)} 100%)`;
    case 'statement':
    case 'about':
    case 'toys':
      return hx(PAL.ink);
    case 'intro':
    case 'values':
    case 'cta':
      return hx(PAL.bright);
    case 'work':
    case 'receipts':
      return hx(PAL.orange);
  }
}

/** Sections whose ground is dark, so stage chrome flips to cream. */
export function isDarkSection(key: SectionKey): boolean {
  return key === 'about' || key === 'statement' || key === 'toys';
}
