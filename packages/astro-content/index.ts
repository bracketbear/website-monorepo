/**
 * @bracketbear/astro-content
 *
 * A comprehensive content management package for Astro applications that provides:
 * - Content schemas and validation
 * - Virtual module system for direct image imports from CMS
 * - Vite plugin for automatic image discovery and hot reloading
 * - Utility functions for content path resolution
 *
 * This package is designed to work with a CMS-based content structure where
 * content files are stored in a separate CMS app and need to be accessed
 * by Astro applications with proper image handling.
 *
 * @example
 * ```typescript
 * // Basic usage in astro.config.mjs
 * import { contentImagePlugin } from '@bracketbear/astro-content';
 *
 * export default defineConfig({
 *   vite: {
 *     plugins: [contentImagePlugin()]
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Using virtual module imports in Astro components
 * import { getProjectImageVirtualId } from '@bracketbear/astro-content';
 *
 * const virtualId = getProjectImageVirtualId('ds-bridge', 'coverImage.jpg');
 * const imageModule = await import(virtualId);
 * const imageUrl = imageModule.default;
 * ```
 */

// Export image copy utilities (legacy - consider using Vite plugin instead)
export {
  ensureContentImage,
  ensureProjectImage,
  ensureMediaImage,
} from './src/image-copy';

// Export content image loader (recommended - automatically handles images when content is loaded)
export {
  createContentImageLoader,
  getContentImageUrl,
  getProjectImageUrl,
  getMediaImageUrl,
} from './src/loaders';

// Export utility functions
export { generateRelativeImagePath, contentPath, workPath } from './src/utils';

// Export schemas
export * from './src/schemas';

// Export types
export * from './src/types';

// Export collection configurations
export {
  workCollections,
  contentCollections,
  allCollections,
} from './src/collections';
