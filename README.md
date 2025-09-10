# Bracket Bear Monorepo

## Overview

This is a monorepo containing all Bracket Bear applications and shared packages. The repository includes portfolio websites, content management systems, and reusable component libraries.

## Table of Contents

### Applications

- [bracketbear-website](/apps/bracketbear-website/) - Main company website for Bracket Bear, built with Astro and integrated CMS
- [cms](/apps/cms/) - Keystatic CMS for Bracket Bear
- [portfolio](/apps/portfolio/) - Personal portfolio website showcasing projects, work history, and skills

### Packages

- [astro-content](/packages/astro-content/) - Content management utilities for Astro with CMS integration, image handling, and Vite plugin support
- [bear-ui](/packages/bear-ui/) - Core UI system for BracketBear applications
- [bear-ui-react](/packages/bear-ui-react/) - React components for BracketBear UI system
- [bear-ui-tailwind](/packages/bear-ui-tailwind/) - Tailwind CSS styles and utilities for BracketBear UI components
- [core](/packages/core/) - Core utilities and Astro components for BracketBear applications
- [flateralus](/packages/flateralus/) - Flateralus animation engine. TypeScript-first, but works in JS.
- [flateralus-p5](/packages/flateralus-p5/) - p5.js adapter for Flateralus animation framework.
- [flateralus-p5-animations](/packages/flateralus-p5-animations/) - p5.js animations for Flateralus framework
- [flateralus-pixi](/packages/flateralus-pixi/) - PIXI.js adapter for Flateralus animation framework.
- [flateralus-pixi-animations](/packages/flateralus-pixi-animations/) - PIXI.js animations for Flateralus framework
- [flateralus-react](/packages/flateralus-react/) - React bindings for Flateralus animation engine.
- [tw-pattern-analyzer](/packages/tw-pattern-analyzer/) - Tailwind CSS pattern analyzer for identifying and optimizing CSS usage across the monorepo

### Repository Map

The repository structure is automatically generated and maintained. See the [source code page](/apps/portfolio/source-code) for an interactive view of all apps and packages.

**Total Items**: 15 (3 apps, 12 packages)
**Last Updated**: 9/10/2025

## Requirements

- Node.js (v18 or higher)
- npm (v8 or higher)

## Installation

To install all dependencies across the monorepo:

```bash
npm install
```

## Development

To start development for all applications:

```bash
npm run dev
```

This will run the front-end and back-end applications simultaneously and output all messages in one terminal window.

### Individual Development

You can also run individual applications by navigating to their directories and running their specific dev commands:

```bash
# Portfolio
cd apps/portfolio && npm run dev

# Bracket Bear Website
cd apps/bracketbear-website && npm run dev

# CMS
cd apps/cms && npm run dev
```

## Build

To build all applications:

```bash
npm run build
```

## Version Management

This monorepo uses synchronized versioning across all packages and applications. All package.json files are kept in sync automatically.

### Version Commands

```bash
# Bump version and sync across all packages
npm run version:patch    # 1.0.0 → 1.0.1
npm run version:minor    # 1.0.0 → 1.1.0
npm run version:major    # 1.0.0 → 2.0.0

# Manual version sync (if you edit package.json directly)
npm run sync:versions

# Set a specific version
npm version 1.2.3 --no-git-tag-version && npm run sync:versions
```

### Deployment & Release Management

```bash
# Deploy with automatic git tagging
npm run deploy:all
npm run deploy:portfolio
npm run deploy:bracketbear

# Rollback to previous release
npm run rollback
```

### How It Works

1. **Version Sync**: The `scripts/sync-versions.js` script automatically updates all package.json files to match the root version
2. **Git Tagging**: Each deployment creates a git tag (e.g., `v1.0.1`) for release tracking
3. **Rollback**: The rollback command can revert to any previous tagged release
4. **Quality Gates**: All deployments run comprehensive checks (tests, linting, type checking, security audits)

## TypeScript

This project uses TypeScript for type safety across all applications and packages. The TypeScript configuration is maintained at the monorepo level with workspace-specific overrides as needed.

## Project Structure

```
bracketbear/
├── apps/                      # Applications
│   ├── portfolio/             # Personal portfolio
│   ├── bracketbear-website/   # Company website
│   └── cms/                   # Content management system for both websites
├── packages/                  # Shared packages
│   ├── core/                  # Core components & utilities
│   ├── astro-content/         # Astro content utilities
│   └── flateralus/            # Graphics library (Major WIP)
└── docs/                      # Documentation
```
