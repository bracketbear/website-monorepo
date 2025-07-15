import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Path to the CMS content directory
 *
 * This constant points to the root of the CMS content directory where all
 * content files (JSON, images, etc.) are stored. It's used as a base path
 * for resolving content file locations.
 *
 * @example
 * ```typescript
 * import { contentPath } from '@bracketbear/astro-content';
 * console.log(contentPath);
 * // Output: /path/to/apps/cms/content
 * ```
 */
export const contentPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../apps/cms/content'
);

/**
 * Generate a path within the work content directory
 *
 * This utility function creates paths relative to the work content directory,
 * which contains project information, job history, and related content.
 *
 * @param paths - Additional path segments to append to the work directory
 * @returns The full path to the specified location within the work directory
 *
 * @example
 * ```typescript
 * import { workPath } from '@bracketbear/astro-content';
 *
 * const projectPath = workPath('projects', 'ds-bridge');
 * // Returns: /path/to/apps/cms/content/work/projects/ds-bridge
 *
 * const jobPath = workPath('jobs', 'dl-full-stack-software-engineer');
 * // Returns: /path/to/apps/cms/content/work/jobs/dl-full-stack-software-engineer
 * ```
 */
export const workPath = (...paths: string[]) =>
  join(contentPath, 'work', ...paths);

/**
 * Generate a relative path from the current location to an image file
 *
 * This function calculates the relative path from a current working directory
 * to an image file located in the CMS content directory. It's useful for
 * creating relative references to images in content files.
 *
 * @param currentPath - The current working directory path
 * @param imagePath - The path to the image relative to the CMS content directory
 * @returns The relative path from currentPath to the image file
 *
 * @example
 * ```typescript
 * import { generateRelativeImagePath } from '@bracketbear/astro-content';
 *
 * const relativePath = generateRelativeImagePath(
 *   '/path/to/current/file',
 *   'work/projects/ds-bridge/coverImage.jpg'
 * );
 * // Returns: ../../../apps/cms/content/work/projects/ds-bridge/coverImage.jpg
 * ```
 */
export const generateRelativeImagePath = (
  currentPath: string,
  imagePath: string
) => {
  const fullPath = join(contentPath, imagePath);
  const relativePath = relative(currentPath, fullPath);

  return relativePath;
};
