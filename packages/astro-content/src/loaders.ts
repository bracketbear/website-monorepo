import type { Loader } from 'astro/loaders';
import { glob } from 'astro/loaders';
import {
  existsSync,
  readdirSync,
  copyFileSync,
  mkdirSync,
  unlinkSync,
  statSync,
} from 'fs';
import { join, dirname, resolve, extname, relative } from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';

// Find the monorepo root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MONOREPO_ROOT = resolve(__dirname, '../../../');

/**
 * Configuration options for the content image loader
 */
interface ContentImageLoaderOptions {
  /** Path to the CMS content directory (defaults to apps/cms/content) */
  cmsContentPath?: string;
  /** File extensions to treat as images (defaults to ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']) */
  imageExtensions?: string[];
  /** Whether to enable hot reloading for development (defaults to true) */
  hotReload?: boolean;
}

/**
 * Find the nearest public directory up from the current working directory
 */
function findPublicDir(): string {
  let dir = process.cwd();
  while (dir !== '/' && !existsSync(join(dir, 'public'))) {
    dir = dirname(dir);
  }
  return join(dir, 'public');
}

/**
 * Copy image to public directory and return public URL
 */
function copyImageToPublic(
  realPath: string,
  contentType: string,
  contentId: string,
  imageName: string
): string {
  const publicDir = join(
    findPublicDir(),
    'content-images',
    contentType,
    contentId
  );
  const publicPath = join(publicDir, imageName);

  // Create directory if it doesn't exist (including nested directories for imageName)
  const imageDir = dirname(publicPath);
  if (!existsSync(imageDir)) {
    mkdirSync(imageDir, { recursive: true });
  }

  // Check if destination already exists and is a file
  if (existsSync(publicPath)) {
    const destStat = statSync(publicPath);
    if (!destStat.isFile()) {
      // If it's not a file (e.g., it's a directory), remove it
      unlinkSync(publicPath);
    }
  }

  // Copy file if it doesn't exist or if source is newer
  let shouldCopy = true;
  if (existsSync(publicPath)) {
    const srcStat = statSync(realPath);
    const destStat = statSync(publicPath);
    shouldCopy = srcStat.mtimeMs > destStat.mtimeMs;
  }

  if (shouldCopy) {
    try {
      copyFileSync(realPath, publicPath);
    } catch (error) {
      console.error(error);
    }
  }

  // Return public URL
  return `/content-images/${contentType}/${contentId}/${imageName}`;
}

/**
 * Remove an image from the public directory
 */
function removeImageFromPublic(
  contentType: string,
  contentId: string,
  imageName: string
) {
  const publicPath = join(
    findPublicDir(),
    'content-images',
    contentType,
    contentId,
    imageName
  );
  if (existsSync(publicPath)) {
    unlinkSync(publicPath);
  }
}

/**
 * Recursively discover all images in a content type directory and copy them
 */
function discoverAndCopyAllImages(
  cmsContentPath: string,
  imageExtensions: string[]
) {
  if (!existsSync(cmsContentPath)) return;

  const walk = (dir: string, relPath = '') => {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const newRelPath = relPath ? join(relPath, entry.name) : entry.name;

        if (entry.isDirectory()) {
          walk(fullPath, newRelPath);
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase().slice(1);
          if (imageExtensions.includes(ext)) {
            // Parse the relative path to extract content type, content ID, and image name
            // Example: "work/projects/dl-gumband/coverImage.jpg" or "work/projects/dl-gumband/media/0/image.jpg"
            // Or: "sites/portfolio/about-page/testimonials/0/avatar.jpeg"
            const pathParts = newRelPath.split('/');

            if (pathParts.length >= 3) {
              const contentType = `${pathParts[0]}/${pathParts[1]}`; // e.g., "work/projects" or "sites/portfolio"
              const contentId = pathParts[2]; // e.g., "dl-gumband" or "about-page"

              // Handle nested files (e.g., media/0/image.jpg or testimonials/0/avatar.jpeg)
              let imageName: string;
              if (pathParts[3] === 'media' && pathParts.length >= 6) {
                // For media files: work/projects/ds-elekta/media/0/image.jpg
                // Extract the full media path: media/0/image.jpg
                imageName = pathParts.slice(3).join('/');
              } else if (pathParts.length >= 4) {
                // For nested files: sites/portfolio/about-page/testimonials/0/avatar.jpeg
                // Extract the full nested path: testimonials/0/avatar.jpeg
                imageName = pathParts.slice(3).join('/');
              } else {
                imageName = '';
              }

              if (contentType && contentId && imageName) {
                copyImageToPublic(fullPath, contentType, contentId, imageName);
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn(
        `[content-image-loader] Error scanning directory ${dir}:`,
        error
      );
    }
  };

  walk(cmsContentPath);
}

/**
 * Watch the CMS content directory for image changes and sync public directory
 */
function watchCmsImages(cmsContentPath: string, imageExtensions: string[]) {
  const publicDir = join(findPublicDir(), 'content-images');

  // Track recent events to prevent duplicates
  const recentEvents = new Map<string, number>();
  const DEBOUNCE_MS = 1000; // 1 second debounce

  // Watch both CMS content directory and public directory
  const cmsWatcher = chokidar.watch(cmsContentPath, {
    ignoreInitial: true,
    persistent: true,
    depth: 4,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 100,
    },
  });

  const publicWatcher = chokidar.watch(publicDir, {
    ignoreInitial: true,
    persistent: true,
    depth: 4,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 100,
    },
  });

  const isDuplicateEvent = (key: string): boolean => {
    const now = Date.now();
    const lastTime = recentEvents.get(key);
    if (lastTime && now - lastTime < DEBOUNCE_MS) {
      return true;
    }
    recentEvents.set(key, now);

    // Clean up old entries to prevent memory leaks
    if (recentEvents.size > 1000) {
      const cutoff = now - DEBOUNCE_MS * 2;
      for (const [eventKey, timestamp] of recentEvents.entries()) {
        if (timestamp < cutoff) {
          recentEvents.delete(eventKey);
        }
      }
    }

    return false;
  };

  const handleCmsImageChange = (file: string, event: string) => {
    const rel = relative(cmsContentPath, file);
    const ext = extname(file).toLowerCase().slice(1);
    if (imageExtensions.includes(ext)) {
      // Parse the relative path to extract content type, content ID, and image name
      // Example: "work/projects/dl-gumband/coverImage.jpg" or "sites/portfolio/about-page/testimonials/0/avatar.jpeg"
      const pathParts = rel.split('/');

      if (pathParts.length >= 3) {
        const contentType = `${pathParts[0]}/${pathParts[1]}`; // e.g., "work/projects" or "sites/portfolio"
        const contentId = pathParts[2]; // e.g., "dl-gumband" or "about-page"

        // Handle nested files (e.g., media/0/image.jpg or testimonials/0/avatar.jpeg)
        let imageName: string;
        if (pathParts[3] === 'media' && pathParts.length >= 6) {
          // For media files: work/projects/ds-elekta/media/0/image.jpg
          // Extract the full media path: media/0/image.jpg
          imageName = pathParts.slice(3).join('/');
        } else if (pathParts.length >= 4) {
          // For nested files: sites/portfolio/about-page/testimonials/0/avatar.jpeg
          // Extract the full nested path: testimonials/0/avatar.jpeg
          imageName = pathParts.slice(3).join('/');
        } else {
          imageName = '';
        }

        if (contentType && contentId && imageName) {
          const eventKey = `cms-${event}-${contentType}/${contentId}/${imageName}`;
          if (!isDuplicateEvent(eventKey)) {
            if (event === 'unlink') {
              removeImageFromPublic(contentType, contentId, imageName);
            } else {
              copyImageToPublic(file, contentType, contentId, imageName);
            }
          }
        }
      }
    }
  };

  const handlePublicImageChange = (file: string, event: string) => {
    const rel = relative(publicDir, file);
    const ext = extname(file).toLowerCase().slice(1);
    if (imageExtensions.includes(ext)) {
      const eventKey = `public-${event}-${rel}`;
      if (!isDuplicateEvent(eventKey)) {
        // Trigger Vite reload when images are added/changed in public directory
        if (event === 'add' || event === 'change') {
          try {
            // Try to trigger reload via global server object (available in Vite plugin context)
            const viteServer = (globalThis as any).__vite_server;
            if (viteServer && viteServer.ws) {
              viteServer.ws.send({ type: 'full-reload', path: '*' });
            }
          } catch (err) {
            console.debug(
              '[content-image-loader] Could not trigger reload:',
              err
            );
          }
        }
      }
    }
  };

  cmsWatcher.on('add', (file) => handleCmsImageChange(file, 'add'));
  cmsWatcher.on('change', (file) => handleCmsImageChange(file, 'change'));
  cmsWatcher.on('unlink', (file) => handleCmsImageChange(file, 'unlink'));

  publicWatcher.on('add', (file) => handlePublicImageChange(file, 'add'));
  publicWatcher.on('change', (file) => handlePublicImageChange(file, 'change'));
  publicWatcher.on('unlink', (file) => handlePublicImageChange(file, 'unlink'));
}

/**
 * Creates a content image loader that automatically handles images when content is loaded
 *
 * This loader wraps Astro's built-in glob loader and automatically discovers and copies
 * images associated with content entries to the public directory.
 * We do this so that we can use the images in the content layer without having to
 * manually copy them to the public directory.
 *
 * @param options - Configuration options for the loader
 * @returns A custom Astro loader that handles both content and images
 */
export function createContentImageLoader(
  options: ContentImageLoaderOptions = {}
): (globOptions: Parameters<typeof glob>[0]) => Loader {
  const {
    cmsContentPath = join(MONOREPO_ROOT, 'apps/cms/content'),
    imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    hotReload = true,
  } = options;

  // On startup, copy all images
  if (existsSync(cmsContentPath)) {
    discoverAndCopyAllImages(cmsContentPath, imageExtensions);
    if (hotReload && process.env.NODE_ENV !== 'production') {
      watchCmsImages(cmsContentPath, imageExtensions);
    }
  }

  return (globOptions) => {
    // Create the base glob loader
    const baseLoader = glob(globOptions);

    // Extract content type from the base path
    const basePath = (globOptions.base || '').toString();
    const contentType = basePath
      .replace(cmsContentPath, '')
      .replace(/^\/+/, '');

    return {
      name: `content-image-loader-${contentType}`,

      async load(context) {
        // First, load all content using the base loader
        await baseLoader.load(context);

        // Note: Images are already discovered and copied by discoverAndCopyAllImages on startup
        // No need to call discoverImagesForEntry here as it would create duplicates
        // The file watcher will handle any new/changed images automatically
      },
    };
  };
}

/**
 * Extract relative path from a full CMS image path
 *
 * @param imagePath - The full image path from CMS
 * @param contentType - The content type (e.g., 'work/projects')
 * @returns The relative path after removing the content type prefix and content ID
 */
function extractRelativePath(imagePath: string, contentType: string): string {
  const contentTypePrefix = `/${contentType}/`;

  if (imagePath.startsWith(contentTypePrefix)) {
    const pathParts = imagePath.split('/');
    if (pathParts.length >= 4) {
      // Skip: "", contentType parts, contentId, and take the rest
      // For 'work/projects', skip: "", "work", "projects", contentId
      // For 'work/personal-projects', skip: "", "work", "personal-projects", contentId
      const contentTypeDepth = contentType.split('/').length + 1; // +1 for the leading slash
      return pathParts.slice(contentTypeDepth + 1).join('/');
    }
  }

  return imagePath; // Return as-is if it doesn't match the expected pattern
}

/**
 * Utility function to get public URL for a content image
 *
 * This function returns the public URL for an image that has been copied
 * to the public directory by the content image loader. If the image is missing,
 * it will attempt to copy it from the CMS content directory immediately.
 * In development mode, the file watcher will automatically trigger a Vite
 * full-reload when images are copied to the public directory.
 *
 * @param contentType - The content type (e.g., 'work/projects')
 * @param contentId - The unique identifier for the content item
 * @param imagePath - The path to the image relative to the content item
 * @returns The public URL for the image
 *
 * @example
 * ```typescript
 * // In an Astro component
 * const imageUrl = getContentImageUrl('work/projects', 'ds-bridge', 'coverImage.jpg');
 * // Returns: '/content-images/work/projects/ds-bridge/coverImage.jpg'
 * ```
 */
export function getContentImageUrl(
  contentType: string,
  contentId: string,
  imagePath: string
): string {
  // Handle both full paths and relative paths from CMS
  // If it's a full path like /work/projects/ds-elekta/media/0/image.jpg,
  // extract the relative part: media/0/image.jpg
  const relativePath = extractRelativePath(imagePath, contentType);
  // If it's a relative path like media/0/image.jpg, preserve the full structure
  const publicPath = join(
    findPublicDir(),
    'content-images',
    contentType,
    contentId,
    relativePath
  );

  if (!existsSync(publicPath)) {
    // Try to copy from CMS
    const cmsContentPath = join(
      MONOREPO_ROOT,
      'apps/cms/content',
      contentType,
      contentId,
      relativePath
    );
    if (existsSync(cmsContentPath)) {
      try {
        // Ensure parent directory exists
        const publicDir = dirname(publicPath);
        if (!existsSync(publicDir)) {
          mkdirSync(publicDir, { recursive: true });
        }
        copyFileSync(cmsContentPath, publicPath);
      } catch (error) {
        console.error(
          `[content-image-loader] Failed on-demand copy ${cmsContentPath} to ${publicPath}:`,
          error
        );
      }
    }
  }

  return `/content-images/${contentType}/${contentId}/${relativePath}`;
}

/**
 * Convenience function to get project image public URL
 *
 * @param projectId - The project identifier
 * @param imagePath - The path to the image relative to the project
 * @returns The public URL for the project image
 *
 * @example
 * ```typescript
 * const imageUrl = getProjectImageUrl('ds-bridge', 'coverImage.jpg');
 * // Returns: '/content-images/work/projects/ds-bridge/coverImage.jpg'
 * ```
 */
export function getProjectImageUrl(
  projectId: string,
  imagePath: string
): string {
  return getContentImageUrl('work/projects', projectId, imagePath);
}

/**
 * Convenience function to get media image public URL
 *
 * @param projectId - The project identifier
 * @param imagePath - The path to the image relative to the project
 * @returns The public URL for the media image
 *
 * @example
 * ```typescript
 * const imageUrl = getMediaImageUrl('ds-bridge', 'coverImage.jpg');
 * // Returns: '/content-images/work/projects/ds-bridge/coverImage.jpg'
 * ```
 */
export function getMediaImageUrl(projectId: string, imagePath: string): string {
  return getContentImageUrl('work/projects', projectId, imagePath);
}

/**
 * Convenience function to get personal project image public URL
 *
 * @param projectId - The personal project identifier
 * @param imagePath - The path to the image relative to the project
 * @returns The public URL for the personal project image
 *
 * @example
 * ```typescript
 * const imageUrl = getPersonalProjectImageUrl('portfolio-website', 'coverImage.png');
 * // Returns: '/content-images/work/personal-projects/portfolio-website/coverImage.png'
 * ```
 */
export function getPersonalProjectImageUrl(
  projectId: string,
  imagePath: string
): string {
  return getContentImageUrl('work/personal-projects', projectId, imagePath);
}
