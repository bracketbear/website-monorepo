# Bracket Bear CMS

## Overview
A Keystatic-based content management system for managing shared content across Bracket Bear websites. This CMS manages content for both the portfolio and company websites, serving as the single source of truth for shared content.

## Table of Contents

- [Overview](#overview)
- [Content Structure](#content-structure)
- [Development](#development)
- [Content Storage](#content-storage)
- [Integration](#integration)
- [Architecture](#architecture)
- [Features](#features)
- [Back to Monorepo](../../README.md)

## Content Structure

The CMS manages the following content types:

### Work Content
- **Companies**: Company information and logos
- **Jobs**: Work experience and job details
- **Skills**: Technical skills and expertise
- **Skill Categories**: Organization of skills into categories
- **Project Categories**: Categories for organizing projects
- **Projects**: Detailed project information with media

### Shared Content
- **Blog Posts**: Blog content that can be shared across sites
- **Pages**: General pages that can be used on either site
- **Contact Info**: Contact information singleton
- **Site Settings**: Global site configuration

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Content Storage

All content is stored in `content/` and follows this structure:

```
content/
├── work/
│   ├── companies/
│   ├── jobs/
│   ├── skills/
│   ├── skill-categories/
│   ├── project-categories/
│   └── projects/
├── blog/
├── pages/
├── contact-info.json
└── site-settings.json
```

## Integration

Both Astro apps (`apps/bracketbear-website` and `apps/portfolio`) consume content through the `@bracketbear/astro-content` package, which imports from this CMS's content directory.

## Architecture

```
apps/cms/ (This app)
├── content/          # Content files (managed by Keystatic)
├── keystatic.config.tsx  # CMS configuration
└── src/              # Next.js app for admin UI

packages/astro-content/
└── index.ts          # Exports content collections for Astro apps

apps/bracketbear-website/ & apps/portfolio/
└── src/content.config.ts  # Imports from astro-content package
```

## Features

- **Local Storage**: Content is stored as JSON files in the repository
- **Type Safety**: Full TypeScript support with generated types
- **Rich Text Editing**: Text fields with markdown support
- **Image Management**: Built-in image upload and management
- **Relationships**: Link content between collections
- **Validation**: Required fields and pattern validation
- **Version Control**: All content changes are tracked in Git
- **Multi-site Support**: Single CMS manages content for multiple websites
