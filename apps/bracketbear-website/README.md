# Bracket Bear Website

## Overview
Main company website for Bracket Bear, built with Astro. Showcases services, company information, and client work with a modern, brutalist design aesthetic.

## Table of Contents

- [Bracket Bear Website](#bracket-bear-website)
  - [Overview](#overview)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Installation](#installation)
  - [Development](#development)
  - [Build](#build)
  - [Project Structure](#project-structure)
  - [Technologies Used](#technologies-used)
  - [Design System](#design-system)

## Features

- **Company Showcase**: Services, about, and contact information
- **Brutalist Design**: Bold, high-contrast design with comic-book style colors
- **Interactive Elements**: Dynamic components and animations
- **Responsive Design**: Mobile-first approach with responsive layouts
- **Performance Optimized**: Static site generation with Astro
- **TypeScript**: Full type safety across the application

## Installation

The Bracket Bear website is part of the Bracket Bear monorepo. To install dependencies:

```bash
# From monorepo root
npm install

# Or from website directory
cd apps/bracketbear-website && npm install
```

## Development

To start the development server:

```bash
# From monorepo root
npm run dev --workspace=apps/bracketbear-website

# Or from website directory
cd apps/bracketbear-website && npm run dev
```

The development server will start on `http://localhost:4321` (or the next available port).

## Build

To build the website for production:

```bash
# From monorepo root
npm run build --workspace=apps/bracketbear-website

# Or from website directory
cd apps/bracketbear-website && npm run build
```

The built site will be output to `dist/`.

## Project Structure

```
apps/bracketbear-website/
├── src/
│   ├── components/        # Astro and React components
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
- **@bracketbear/core**: Shared components and utilities

## Design System

The website uses the shared design system from `@bracketbear/core`, including:
- Brutalist card components
- Custom Tailwind utilities
- Tangible design effects
- Halftone patterns and shadows
