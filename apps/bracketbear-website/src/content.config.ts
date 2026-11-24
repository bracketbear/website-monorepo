import { defineCollection } from 'astro:content';
import {
  allCollections,
  createContentImageLoader,
} from '@bracketbear/astro-content';

/**
 * Creates a typed JSON-based collection using Astro's defineCollection and glob loaders.
 * Now with automatic image handling via the content image loader.
 */
function createJsonCollection({
  base,
  schema,
  pattern,
}: {
  base: string;
  schema: any;
  pattern?: string;
}) {
  // Create the content image loader that automatically handles images
  const contentImageLoader = createContentImageLoader();

  return defineCollection({
    type: 'content_layer',
    loader: contentImageLoader({
      base,
      pattern: pattern || '**/*.json',
      generateId: (entry) => `${entry.entry.replace(/\.json$/, '')}`, // Generate ID from the entry path
    }),
    schema,
  });
}

// The v2 page collections were retired with the v2 pages. Their config stays in
// @bracketbear/astro-content because apps/portfolio and apps/cms still use it.
const retired = new Set([
  'bracketbearIndexPage',
  'bracketbearAboutPage',
  'bracketbearContactPage',
  'bracketbearContactMethods',
  'bracketbearServicesPage',
]);

// Create collections from configurations
export const collections = Object.fromEntries(
  Object.entries(allCollections)
    .filter(([key]) => !retired.has(key))
    .map(([key, config]) => [key, createJsonCollection(config)])
);
