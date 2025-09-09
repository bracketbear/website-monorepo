# @bracketbear/flateralus

## Overview

Flateralus is a TypeScript-first, schema-driven animation engine that provides a unified API for creating controllable animations across multiple rendering backends. It's designed to be framework-agnostic while providing seamless React integration.

> **Development Status**: This package is currently in active development and not yet published to npm. All packages are available locally in this monorepo.

## Table of Contents

- [@bracketbear/flateralus](#bracketbearflateralus)
  - [Overview](#overview)
  - [Table of Contents](#table-of-contents)
  - [Getting Started](#getting-started)
    - [Quick Example](#quick-example)
    - [Next Steps](#next-steps)
  - [Features](#features)
  - [Installation](#installation)
    - [Why Not Available Yet?](#why-not-available-yet)
    - [Package Structure (Coming Soon)](#package-structure-coming-soon)
    - [Future Installation](#future-installation)
  - [Documentation](#documentation)
  - [Development](#development)
    - [Working with the Monorepo](#working-with-the-monorepo)
    - [Using Packages in Your Code](#using-packages-in-your-code)
  - [Build](#build)
  - [Version](#version)
  - [Technologies Used](#technologies-used)

## Getting Started

### Quick Example

```typescript
import { BaseAnimation, createManifest } from '@bracketbear/flateralus';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import { AnimationStage } from '@bracketbear/flateralus-react';

// Define your animation manifest
const manifest = createManifest({
  id: 'bouncing-ball',
  name: 'Bouncing Ball',
  description: 'A simple bouncing ball animation',
  controls: [
    {
      name: 'speed',
      type: 'number',
      label: 'Speed',
      defaultValue: 1,
      min: 0.1,
      max: 10,
      step: 0.1,
    },
    {
      name: 'color',
      type: 'color',
      label: 'Ball Color',
      defaultValue: '#ff6b35',
    },
  ] as const,
} as const);

// Create your animation class
class BouncingBallAnimation extends BaseAnimation<typeof manifest> {
  onInit(context: PIXI.Application, controls: Controls) {
    // Initialize your animation
  }

  onUpdate(context: PIXI.Application, controls: Controls, deltaTime: number) {
    // Update animation each frame
  }

  onDestroy() {
    // Clean up resources
  }
}

// Use in React
function MyComponent() {
  const app = new PixiApplication();
  const animation = new BouncingBallAnimation(manifest);

  app.setAnimation(animation);

  return (
    <AnimationStage
      application={app}
      showDebugControls={true}
    />
  );
}
```

### Next Steps

- 📖 [Complete Getting Started Guide](./docs/getting-started.md) - Step-by-step tutorial
- 🏗️ [Core Concepts](./docs/core-concepts.md) - Understanding the framework architecture
- 🎨 [Creating Animations](./docs/creating-animations.md) - How to build custom animations
- ⚙️ [Control System](./docs/control-system.md) - Schema-driven control system
- 🖥️ [Applications](./docs/applications.md) - Working with different rendering backends
- ⚛️ [React Integration](./docs/react-integration.md) - Using Flateralus in React
- 📚 [API Reference](./docs/api-reference.md) - Complete API documentation
- 💡 [Examples](./docs/examples.md) - Code examples and tutorials
- 🎯 [Best Practices](./docs/best-practices.md) - Guidelines for effective development

## Features

- **Schema-Driven Controls**: Define animation parameters using TypeScript schemas
- **Multiple Renderers**: Support for PIXI.js, p5.js, and custom rendering backends
- **Type Safety**: Full TypeScript support with compile-time validation
- **React Integration**: Seamless integration with React applications
- **Debug Controls**: Automatic UI generation for animation parameters
- **Performance**: Optimized for smooth 60fps animations
- **Framework Agnostic**: Works with any JavaScript framework

## Installation

> **🚧 Coming Soon**: Flateralus packages are currently in active development and will be published to npm once stable.

### Why Not Available Yet?

The Flateralus ecosystem is still being refined with:

- **API Stabilization**: Core interfaces and types are being finalized
- **Performance Optimization**: Ensuring smooth 60fps animations across all backends
- **Documentation Completion**: Comprehensive guides and examples
- **Testing Coverage**: Ensuring reliability across different environments
- **Package Publishing**: Setting up proper npm publishing workflows

### Package Structure (Coming Soon)

The Flateralus ecosystem will consist of several packages:

- **`@bracketbear/flateralus`** - Core animation framework
- **`@bracketbear/flateralus-pixi`** - PIXI.js integration
- **`@bracketbear/flateralus-p5`** - p5.js integration
- **`@bracketbear/flateralus-react`** - React components and hooks
- **`@bracketbear/flateralus-pixi-animations`** - Pre-built PIXI animations
- **`@bracketbear/flateralus-p5-animations`** - Pre-built p5 animations

### Future Installation

Once published, installation will be:

```bash
# Core package (required)
npm install @bracketbear/flateralus

# Choose your rendering backend
npm install @bracketbear/flateralus-pixi    # PIXI.js integration
npm install @bracketbear/flateralus-p5     # p5.js integration

# React integration (optional)
npm install @bracketbear/flateralus-react
```

## Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) folder:

- **[Getting Started](./docs/getting-started.md)** - Quick start guide and first animation
- **[Core Concepts](./docs/core-concepts.md)** - Understanding the framework architecture
- **[Creating Animations](./docs/creating-animations.md)** - How to build custom animations
- **[Control System](./docs/control-system.md)** - Schema-driven control system
- **[Applications](./docs/applications.md)** - Working with different rendering backends
- **[React Integration](./docs/react-integration.md)** - Using Flateralus in React applications
- **[API Reference](./docs/api-reference.md)** - Complete API documentation
- **[Examples](./docs/examples.md)** - Code examples and tutorials
- **[Best Practices](./docs/best-practices.md)** - Guidelines for effective animation development

## Development

### Working with the Monorepo

Since the packages aren't published yet, you'll work with them locally:

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Start development mode (watches for changes)
npm run dev

# Build specific package
npm run build --workspace=packages/flateralus
```

### Using Packages in Your Code

The packages are linked internally, so you can import them directly:

```typescript
// These imports work within the monorepo
import { BaseAnimation, createManifest } from '@bracketbear/flateralus';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import { AnimationStage } from '@bracketbear/flateralus-react';
```

## Build

To build for production:

```bash
# From monorepo root
npm run build --workspace=packages/flateralus

# Or from flateralus directory
cd packages/flateralus && npm run build
```

## Version

Current version: **1.0.1**

## Technologies Used

- **TypeScript**: Type safety and modern JavaScript features
- **PIXI.js**: High-performance 2D graphics library
- **p5.js**: Creative coding library
- **Zod**: Runtime validation and schema definition
- **React**: UI framework integration
