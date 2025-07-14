import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Find the monorepo root (assume this file is in packages/astro-content/src)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MONOREPO_ROOT = resolve(__dirname, '../../../');
const CMS_CONTENT_PATH = join(MONOREPO_ROOT, 'apps/cms/content');
const PUBLIC_CONTENT_PATH = join(MONOREPO_ROOT, 'apps/portfolio/public');

/**
 * Triggers a hot reload by touching a file that Vite is watching
 *
 * This is a legacy approach to trigger hot reloading when images are copied.
 * The Vite plugin approach is preferred as it's more reliable and integrated.
 *
 * @deprecated Use the contentImagePlugin instead for better hot reloading
 */
function triggerHotReload() {
  if (process.env.NODE_ENV === 'development') {
    try {
      const touchFile = join(
        MONOREPO_ROOT,
        'apps/portfolio/src/pages/project/[project].astro'
      );
      if (existsSync(touchFile)) {
        const fs = require('fs');
        const stats = fs.statSync(touchFile);
        fs.utimesSync(touchFile, stats.atime, new Date());
      }
    } catch (error) {
      console.debug('Hot reload trigger failed:', error);
    }
  }
}

/**
 * Ensure a content image is copied from CMS to public directory
 *
 * This function copies an image from the CMS content directory to the public
 * directory if it doesn't already exist. It's a legacy approach that should
 * be replaced with the contentImagePlugin for better performance and reliability.
 *
 * @deprecated Use contentImagePlugin and getContentImageUrl instead
 * @param contentType - The content type (e.g., 'work/projects')
 * @param contentId - The unique identifier for the content item
 * @param imagePath - The path to the image relative to the content item
 * @returns The public URL for the image
 *
 * @example
 * ```typescript
 * // Legacy usage (not recommended)
 * const imageUrl = ensureContentImage('work/projects', 'ds-bridge', 'coverImage.jpg');
 *
 * // Recommended approach
 * import { contentImagePlugin, getContentImageUrl } from '@bracketbear/astro-content';
 * // Configure plugin in astro.config.mjs
 * const imageUrl = getContentImageUrl('work/projects', 'ds-bridge', 'coverImage.jpg');
 * ```
 */
export function ensureContentImage(
  contentType: string,
  contentId: string,
  imagePath: string
): string {
  const cleanPath = imagePath.replace(
    new RegExp(`^/${contentType.replace('/', '\\/')}/[^\\/]+/`),
    ''
  );
  const sourcePath = join(CMS_CONTENT_PATH, contentType, contentId, cleanPath);
  const destDir = join(
    PUBLIC_CONTENT_PATH,
    contentType,
    contentId,
    dirname(cleanPath)
  );
  const destPath = join(PUBLIC_CONTENT_PATH, contentType, contentId, cleanPath);

  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  if (!existsSync(destPath) && existsSync(sourcePath)) {
    copyFileSync(sourcePath, destPath);
    console.log(`Copied content image: ${sourcePath} -> ${destPath}`);
    triggerHotReload();
  } else if (!existsSync(sourcePath)) {
    console.warn(`Source content image not found: ${sourcePath}`);
  }

  return `/${contentType}/${contentId}/${cleanPath}`;
}

/**
 * Ensure a project image is copied from CMS to public directory
 *
 * Convenience function for project images that delegates to ensureContentImage.
 *
 * @deprecated Use getProjectImageUrl instead
 * @param projectId - The project identifier
 * @param imagePath - The path to the image relative to the project
 * @returns The public URL for the project image
 *
 * @example
 * ```typescript
 * // Legacy usage (not recommended)
 * const imageUrl = ensureProjectImage('ds-bridge', 'coverImage.jpg');
 *
 * // Recommended approach
 * const imageUrl = getProjectImageUrl('ds-bridge', 'coverImage.jpg');
 * ```
 */
export function ensureProjectImage(
  projectId: string,
  imagePath: string
): string {
  return ensureContentImage('work/projects', projectId, imagePath);
}

/**
 * Ensure a media image is copied from CMS to public directory
 *
 * Convenience function for media images that delegates to ensureContentImage.
 * This is an alias for project images.
 *
 * @deprecated Use getMediaImageUrl instead
 * @param projectId - The project identifier
 * @param imagePath - The path to the image relative to the project
 * @returns The public URL for the media image
 *
 * @example
 * ```typescript
 * // Legacy usage (not recommended)
 * const imageUrl = ensureMediaImage('ds-bridge', 'coverImage.jpg');
 *
 * // Recommended approach
 * const imageUrl = getMediaImageUrl('ds-bridge', 'coverImage.jpg');
 * ```
 */
export function ensureMediaImage(projectId: string, imagePath: string): string {
  return ensureContentImage('work/projects', projectId, imagePath);
}
