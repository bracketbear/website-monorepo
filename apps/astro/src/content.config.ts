import { collections as portfolioCollections } from '@bracketbear/astro-content';

// Re-export collections with adjusted base paths for the astro app
export const collections = {
  ...portfolioCollections,
};
