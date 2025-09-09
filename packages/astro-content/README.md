# @bracketbear/astro-content

## Overview

A package in the Bracket Bear monorepo.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Development](#development)
- [Build](#build)
- [Back to Monorepo](../../README.md)

## Features

- **TypeScript**: Full type safety and IntelliSense support
- **Modular Design**: Clean, reusable components and utilities
- **Framework Agnostic**: Works with multiple frameworks
- **Content Collections**: Type-safe JSON-based content collections
- **Image Management**: Automatic image copying and hot reloading
- **Schema Organization**: Modular Zod schemas by content type

## Installation

Install the package:

```bash
npm install @bracketbear/astro-content
```

## Development

To start development:

```bash
# From monorepo root
npm run dev --workspace=packages/astro-content

# Or from astro-content directory
cd packages/astro-content && npm run dev
```

## Build

To build for production:

```bash
# From monorepo root
npm run build --workspace=packages/astro-content

# Or from astro-content directory
cd packages/astro-content && npm run build
```

## Version

Current version: **1.0.1**

## Technologies Used

- **TypeScript**: Type safety and modern JavaScript features
- **Zod**: Schema validation
- **Vite**: Build tool and plugin system
