# @bracketbear/astro-content

A comprehensive content management solution for Astro projects with CMS integration, image handling, and Vite plugin support.

## Features

- **Content Collections**: Type-safe JSON-based content collections for Astro
- **Image Management**: Automatic image copying and hot reloading via Vite plugin
- **Schema Organization**: Modular Zod schemas by content type
- **Hot Reloading**: Automatic image updates during development
- **Legacy Support**: Backward compatibility with older image copying methods

## Usage

### 1. Content Collections

Import and use the predefined collections:

```typescript
import { getCollection } from 'astro:content';
import { collections } from '@bracketbear/astro-content';

// Use collections in your Astro config
export default defineConfig({
  integrations: [
    content({
      collections,
    }),
  ],
});
```

### 2. Image Handling

#### Option A: Vite Plugin (Recommended)

Add the Vite plugin to your `astro.config.mjs`:

```typescript
import { defineConfig } from 'astro/config';
import { contentImagePlugin } from '@bracketbear/astro-content';

export default defineConfig({
  vite: {
    plugins: [
      contentImagePlugin({
        // Optional configuration
        contentTypes: ['work/projects', 'blog', 'services'],
        imageExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
        hotReload: true,
      }),
    ],
  },
});
```

Then use the utility functions in your components:

```astro
---
import { getProjectImageUrl } from '@bracketbear/astro-content';

const imageUrl = getProjectImageUrl('ds-bridge', 'coverImage.jpg');
---

<img src={imageUrl} alt="Project cover" />
```

#### Option B: Legacy Image Copy (Deprecated but Supported)

```astro
---
import { ensureContentImage } from '@bracketbear/astro-content';

const imageUrl = ensureContentImage('work/projects', 'ds-bridge', 'coverImage.jpg');
---

<img src={imageUrl} alt="Project cover" />
```

**Note**: The legacy image copy functions are deprecated. Use the Vite plugin approach for better performance and reliability.

### 3. Schemas

Import and use individual schemas:

```typescript
import { workProjectSchema, blogSchema } from '@bracketbear/astro-content';

// Use schemas in your own collections
const customProjectCollection = defineCollection({
  schema: workProjectSchema.extend({
    customField: z.string(),
  }),
});
```

## Architecture

### File Structure

```
src/
├── schemas/
│   ├── work.ts          # Work-related schemas (companies, jobs, skills, projects)
│   ├── content.ts       # Blog, pages, services schemas
│   └── index.ts         # Schema exports
├── utils.ts            # Utility functions for path resolution
├── image-copy.ts       # Legacy image copying (deprecated)
├── vite-plugin.ts      # Vite plugin for image handling (recommended)
└── index.ts            # Main exports
```

### Content Types

- **Work**: Companies, jobs, skills, projects
- **Blog**: Blog posts with rich content
- **Pages**: Static pages
- **Services**: Service offerings

## Vite Plugin Configuration

The `contentImagePlugin` accepts the following options:

```typescript
interface ContentImagePluginOptions {
  cmsContentPath?: string;      // Path to CMS content directory (defaults to apps/cms/content)
  publicPath?: string;          // Path to public directory (defaults to apps/portfolio/public)
  contentTypes?: string[];      // Content types to watch (defaults to ['work/projects', 'blog', 'services'])
  imageExtensions?: string[];   // Image file extensions (defaults to ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'])
  hotReload?: boolean;          // Enable hot reloading (defaults to true)
}
```

### Plugin Features

- **Automatic Image Copying**: Copies images from CMS to public directory during build
- **Hot Reloading**: Automatically updates images during development using Vite's `import.meta.hot` API
- **Fallback Support**: Gracefully falls back to websocket-based reloading if `import.meta.hot` is not available
- **Recursive Scanning**: Finds images in nested directories
- **Error Handling**: Graceful error handling with logging
- **Configurable**: Customizable content types and image extensions

## Available Functions

### Image URL Utilities

```typescript
// Get image URL for any content type
getContentImageUrl(contentType: string, contentId: string, imagePath: string): string

// Convenience functions for specific content types
getProjectImageUrl(projectId: string, imagePath: string): string
getMediaImageUrl(projectId: string, imagePath: string): string
```

### Utility Functions

```typescript
// Path utilities
contentPath: string                    // Path to CMS content directory
workPath(...paths: string[]): string   // Generate work directory paths
generateRelativeImagePath(currentPath: string, imagePath: string): string
```

### Schemas

```typescript
// Work schemas
workCompanySchema: ZodSchema
workJobSchema: ZodSchema
workSkillSchema: ZodSchema
workSkillCategorySchema: ZodSchema
workProjectCategorySchema: ZodSchema
workProjectSchema: ZodSchema

// Content schemas
blogSchema: ZodSchema
pageSchema: ZodSchema
serviceSchema: ZodSchema
```

## Migration Guide

### From Legacy Image Copy to Vite Plugin

1. **Add the Vite plugin** to your Astro config
2. **Replace function calls**:
   ```typescript
   // Old (deprecated)
   const imageUrl = ensureContentImage('work/projects', 'project-id', 'image.jpg');
   
   // New (recommended)
   const imageUrl = getProjectImageUrl('project-id', 'image.jpg');
   ```

3. **Remove manual image copying** - the plugin handles it automatically

## Development

### Running Tests

```bash
npm test
```

### Building

```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT 