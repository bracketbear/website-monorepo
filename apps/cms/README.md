# Bracket Bear CMS

A Keystatic-based content management system for managing shared content across Bracket Bear websites.

## Overview

This CMS manages shared content for both the portfolio and company websites. All content is stored in the `content/` directory within this app, which serves as the single source of truth for shared content across all Bracket Bear applications.

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

Both Astro apps (`apps/astro` and `apps/portfolio`) consume content through the `@bracketbear/astro-content` package, which imports from this CMS's content directory.

## Architecture

```
apps/cms/ (This app)
├── content/          # Content files (managed by Keystatic)
├── keystatic.config.tsx  # CMS configuration
└── src/              # Next.js app for admin UI

packages/portfolio-content/
└── index.ts          # Exports content collections for Astro apps

apps/astro/ & apps/portfolio/
└── src/content.config.ts  # Imports from portfolio-content package
```

## Features

- **Local Storage**: Content is stored as JSON files in the repository
- **Type Safety**: Full TypeScript support with generated types
- **Rich Text Editing**: Text fields with markdown support
- **Image Management**: Built-in image upload and management
- **Relationships**: Link content between collections
- **Validation**: Required fields and pattern validation

# 🚀 Getting started with Strapi

Strapi comes with a full featured [Command Line Interface](https://docs.strapi.io/developer-docs/latest/developer-resources/cli/CLI.html) (CLI) which lets you scaffold and manage your project in seconds.

### `develop`

Start your Strapi application with autoReload enabled. [Learn more](https://docs.strapi.io/developer-docs/latest/developer-resources/cli/CLI.html#strapi-develop)

```
npm run develop
# or
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled. [Learn more](https://docs.strapi.io/developer-docs/latest/developer-resources/cli/CLI.html#strapi-start)

```
npm run start
# or
yarn start
```

### `build`

Build your admin panel. [Learn more](https://docs.strapi.io/developer-docs/latest/developer-resources/cli/CLI.html#strapi-build)

```
npm run build
# or
yarn build
```

## ⚙️ Deployment

Strapi gives you many possible deployment options for your project. Find the one that suits you on the [deployment section of the documentation](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/deployment.html).

## 📚 Learn more

- [Resource center](https://strapi.io/resource-center) - Strapi resource center.
- [Strapi documentation](https://docs.strapi.io) - Official Strapi documentation.
- [Strapi tutorials](https://strapi.io/tutorials) - List of tutorials made by the core team and the community.
- [Strapi blog](https://docs.strapi.io) - Official Strapi blog containing articles made by the Strapi team and the community.
- [Changelog](https://strapi.io/changelog) - Find out about the Strapi product updates, new features and general improvements.

Feel free to check out the [Strapi GitHub repository](https://github.com/strapi/strapi). Your feedback and contributions are welcome!

## ✨ Community

- [Discord](https://discord.strapi.io) - Come chat with the Strapi community including the core team.
- [Forum](https://forum.strapi.io/) - Place to discuss, ask questions and find answers, show your Strapi project and get feedback or just talk with other Community members.
- [Awesome Strapi](https://github.com/strapi/awesome-strapi) - A curated list of awesome things related to Strapi.

---

<sub>🤫 Psst! [Strapi is hiring](https://strapi.io/careers).</sub>
