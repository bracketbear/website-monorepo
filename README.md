# Bracket Bear Monorepo

## Overview

This is a monorepo containing all Bracket Bear applications and shared packages. The repository includes portfolio websites, content management systems, and reusable component libraries.

## Table of Contents

### Applications

- [Portfolio](/apps/portfolio/README.md) - Personal portfolio website built with Astro
- [Bracket Bear Website](/apps/bracketbear-website/README.md) - Main company website
- [CMS](/apps/cms/README.md) - Content management system for managing site content

### Packages

- [Core](/packages/core/README.md) - Shared components, layouts, and utilities
- [Astro Content](/packages/astro-content/README.md) - Content management utilities for Astro
- [Flateralus](/packages/flateralus/README.md) - Interactive graphics and animation library

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
