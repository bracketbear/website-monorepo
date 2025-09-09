# Flateralus Documentation

Welcome to the Flateralus animation framework documentation. Flateralus is a TypeScript-first, schema-driven animation engine that provides a unified API for creating controllable animations across multiple rendering backends.

## Table of Contents

- [Getting Started](./getting-started.md) - Quick start guide
- [Core Concepts](./core-concepts.md) - Understanding the framework architecture
- [Creating Animations](./creating-animations.md) - How to build custom animations
- [Control System](./control-system.md) - Understanding the schema-driven control system
- [Applications](./applications.md) - Working with different rendering backends
- [React Integration](./react-integration.md) - Using Flateralus in React applications
- [API Reference](./api-reference.md) - Complete API documentation
- [Examples](./examples.md) - Code examples and tutorials
- [Best Practices](./best-practices.md) - Guidelines for effective animation development

## What is Flateralus?

Flateralus is a framework-agnostic animation engine that provides:

- **Schema-driven controls**: Define animation parameters using TypeScript schemas
- **Multiple renderers**: Support for PIXI.js, p5.js, and custom rendering backends
- **Type safety**: Full TypeScript support with compile-time validation
- **React integration**: Seamless integration with React applications
- **Debug controls**: Automatic UI generation for animation parameters
- **Performance**: Optimized for smooth 60fps animations

## Quick Example

```typescript
import { BaseAnimation, createManifest } from '@bracketbear/flateralus';
import { PixiApplication } from '@bracketbear/flateralus-pixi';

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
      max: 5,
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
  onInit(context: PIXI.Application, controls: ManifestToControlValues<typeof manifest>) {
    // Initialize your animation
  }

  onUpdate(context: PIXI.Application, controls: ManifestToControlValues<typeof manifest>, deltaTime: number) {
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

## Package Ecosystem

> **🚧 Coming Soon**: Flateralus packages are currently in active development and will be published to npm once stable.

Flateralus will consist of several packages:

- **`@bracketbear/flateralus`** - Core animation framework
- **`@bracketbear/flateralus-pixi`** - PIXI.js integration
- **`@bracketbear/flateralus-p5`** - p5.js integration
- **`@bracketbear/flateralus-react`** - React components and hooks
- **`@bracketbear/flateralus-pixi-animations`** - Pre-built PIXI animations
- **`@bracketbear/flateralus-p5-animations`** - Pre-built p5 animations

### Why Not Available Yet?

The packages are still being refined with API stabilization, performance optimization, comprehensive documentation, and testing coverage before npm publication.

## Next Steps

Ready to get started? Check out the [Getting Started Guide](./getting-started.md) to create your first animation!
