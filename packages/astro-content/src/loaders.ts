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
 * Cache for discovered images to avoid repeated file system operations
 */
const imageCache = new Map<string, string>();

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

  // Create directory if it doesn't exist
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
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
            // Example: "work/projects/dl-gumband/coverImage.jpg"
            const pathParts = newRelPath.split('/');

            if (pathParts.length >= 3) {
              const contentType = `${pathParts[0]}/${pathParts[1]}`; // e.g., "work/projects"
              const contentId = pathParts[2]; // e.g., "dl-gumband"
              const imageName = pathParts[3]; // e.g., "coverImage.jpg"

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
      // Example: "work/projects/dl-gumband/coverImage.jpg"
      const pathParts = rel.split('/');

      if (pathParts.length >= 3) {
        const contentType = `${pathParts[0]}/${pathParts[1]}`; // e.g., "work/projects"
        const contentId = pathParts[2]; // e.g., "dl-gumband"
        const imageName = pathParts[3]; // e.g., "coverImage.jpg"

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
 * Discover and copy images for a specific content entry
 */
function discoverImagesForEntry(
  entryPath: string,
  contentType: string,
  contentId: string,
  imageExtensions: string[]
): void {
  const rootDir = dirname(entryPath);

  if (!existsSync(rootDir)) {
    return;
  }

  const walk = (dir: string) => {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase().slice(1);
          if (imageExtensions.includes(ext)) {
            const cacheKey = `${contentType}/${contentId}/${entry.name}`;
            if (!imageCache.has(cacheKey)) {
              const publicUrl = copyImageToPublic(
                fullPath,
                contentType,
                contentId,
                entry.name
              );
              imageCache.set(cacheKey, publicUrl);
            }
          }
        }
      }
    } catch (error) {
      console.warn(
        `[content-image-loader] Failed to scan directory for images: ${dir}`,
        error
      );
    }
  };

  walk(rootDir);
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

        // Then, discover and copy images for each entry
        const entries = context.store.entries();

        for (const [id, entry] of entries) {
          if (entry.filePath) {
            // Discover images for this content entry
            discoverImagesForEntry(
              entry.filePath,
              contentType,
              id,
              imageExtensions
            );
          }
        }
      },
    };
  };
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
  // Extract just the filename from the imagePath, handling both full paths and filenames
  const imageName = imagePath.includes('/')
    ? imagePath.split('/').pop()!
    : imagePath;

  const publicPath = join(
    findPublicDir(),
    'content-images',
    contentType,
    contentId,
    imageName
  );
  if (!existsSync(publicPath)) {
    // Try to copy from CMS
    const cmsContentPath = join(
      MONOREPO_ROOT,
      'apps/cms/content',
      contentType,
      contentId,
      imageName
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

  return `/content-images/${contentType}/${contentId}/${imageName}`;
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
