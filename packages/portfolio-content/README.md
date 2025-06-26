# Portfolio Content Package

This package provides shared content configuration for Bracket Bear websites. It imports content from the CMS app and provides a unified interface for Astro applications.

## Structure

```
packages/portfolio-content/
├── index.ts          # Exports content collections
└── README.md         # This file

apps/cms/
├── content/          # Actual content files (managed by Keystatic)
│   ├── work/         # Work experience content
│   ├── blog/         # Shared blog posts
│   └── pages/        # Shared pages
└── keystatic.config.tsx  # CMS configuration

apps/astro/ & apps/portfolio/
├── src/content.config.ts  # Imports from @bracketbear/portfolio-content
└── src/content/          # Site-specific content (if any)
```

## Content Types

### Shared Content (from CMS)
- **Work Companies**: Company information and logos
- **Work Jobs**: Job experience and details
- **Work Skills**: Technical skills and expertise
- **Work Skill Categories**: Organization of skills
- **Work Project Categories**: Project organization
- **Work Projects**: Detailed project information
- **Blog Posts**: Shared blog content
- **Pages**: Shared page content

### Site-Specific Content
Each Astro app can have its own `src/content/` directory for site-specific content that doesn't need to be shared.

## Usage

In Astro apps, import the shared collections:

```ts
// src/content.config.ts
import { collections as sharedCollections } from '@bracketbear/portfolio-content';

export const collections = {
  ...sharedCollections,
  // Add site-specific collections here
};
```

## Content Management

All shared content is managed through the Keystatic CMS at `apps/cms`. The CMS writes to `apps/cms/content/`, and this package imports from there.

## Development

1. **Edit content**: Use the CMS at `http://localhost:3000/keystatic`
2. **Content is automatically available**: Both Astro apps will see changes immediately
3. **Site-specific content**: Add to each app's `src/content/` directory 