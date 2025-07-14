# Portfolio

## Overview
Personal portfolio website built with Astro, showcasing projects, work history, and skills. Features a brutalist design aesthetic with interactive elements and modern web technologies.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Development](#development)
- [Build](#build)
- [Documentation](#documentation)
  - [ContentLayout Hero Section](/packages/core/src/astro/layout/README.md)
- [Back to Monorepo](../../README.md)

## Features

- **Brutalist Design**: Bold, high-contrast design with comic-book style colors
- **Interactive Elements**: PixiJS-powered graphics and animations
- **Content Management**: Integrated with Keystatic CMS
- **Responsive Design**: Mobile-first approach with responsive layouts
- **Performance Optimized**: Static site generation with Astro
- **TypeScript**: Full type safety across the application

## Installation

The portfolio app is part of the Bracket Bear monorepo. To install dependencies:

```bash
# From monorepo root
npm install

# Or from portfolio directory
cd apps/portfolio && npm install
```

## Development

To start the development server:

```bash
# From monorepo root
npm run dev --workspace=apps/portfolio

# Or from portfolio directory
cd apps/portfolio && npm run dev
```

The development server will start on `http://localhost:4321` (or the next available port).

## Build

To build the portfolio for production:

```bash
# From monorepo root
npm run build --workspace=apps/portfolio

# Or from portfolio directory
cd apps/portfolio && npm run build
```

The built site will be output to `dist/`.

## Project Structure

```
apps/portfolio/
├── src/
│   ├── components/         # React and Astro components
│   ├── layouts/           # Page layouts
│   ├── pages/             # Astro pages
│   ├── styles/            # Global styles
│   └── utils/             # Utility functions
├── public/                # Static assets
└── content/               # Content collections
```

## Technologies Used

- **Astro**: Static site generator
- **React**: Interactive components
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **PixiJS**: Interactive graphics
- **Keystatic**: Content management
- **@bracketbear/core**: Shared components and utilities

## Content Management

The portfolio uses Keystatic CMS for content management. Content is stored in JSON files in the `content/` directory and managed through the CMS interface.

## Design System

The portfolio uses the shared design system from `@bracketbear/core`, including:
- Brutalist card components
- Custom Tailwind utilities
- Tangible design effects
- Halftone patterns and shadows 