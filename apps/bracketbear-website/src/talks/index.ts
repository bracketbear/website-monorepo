import type { Talk } from './types';
import { EVERYTHING_IS_AN_EXPERIENCE } from './everything-is-an-experience';

export const TALKS: Talk[] = [EVERYTHING_IS_AN_EXPERIENCE];

export function findTalk(slug: string): Talk | undefined {
  return TALKS.find((t) => t.slug === slug);
}

export type { Talk, Slide } from './types';
