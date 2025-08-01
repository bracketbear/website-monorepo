import { defineCollection } from 'astro:content';
import {
  workCollections,
  createContentImageLoader,
} from '@bracketbear/astro-content';
import type { Schema } from 'astro:schema';

/**
 * Creates a typed JSON-based collection using Astro's defineCollection and glob loaders.
 * Now with automatic image handling via the content image loader.
 */
function createJsonCollection({
  base,
  schema,
}: {
  base: string;
  schema: Schema;
}) {
  // Create the content image loader that automatically handles images
  const contentImageLoader = createContentImageLoader();

  return defineCollection({
    type: 'content_layer',
    loader: contentImageLoader({
      base,
      pattern: '**/*.json',
      generateId: (entry) => `${entry.entry.replace(/\.json$/, '')}`, // Generate ID from the entry path
    }),
    schema,
  });
}

// Create collections from configurations
export const collections = Object.fromEntries(
  Object.entries(workCollections).map(([key, config]) => [
    key,
    createJsonCollection(config),
  ])
);
