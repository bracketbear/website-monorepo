# Getting Started with Flateralus

This guide will walk you through creating your first Flateralus animation. We'll build a simple bouncing ball animation using PIXI.js and React.

## Prerequisites

- Basic knowledge of TypeScript/JavaScript
- Familiarity with React (for the React integration example)
- Node.js and npm installed

## Installation

> **🚧 Coming Soon**: Flateralus packages are currently in active development and will be published to npm once stable.

### Why Not Available Yet?

The Flateralus ecosystem is still being refined with:

- **API Stabilization**: Core interfaces and types are being finalized
- **Performance Optimization**: Ensuring smooth 60fps animations across all backends
- **Documentation Completion**: Comprehensive guides and examples
- **Testing Coverage**: Ensuring reliability across different environments
- **Package Publishing**: Setting up proper npm publishing workflows

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

## Step 1: Define Your Animation Manifest

The manifest is the heart of any Flateralus animation. It defines what controls are available and their types.

```typescript
import { createManifest } from '@bracketbear/flateralus';

const bouncingBallManifest = createManifest({
  id: 'bouncing-ball',
  name: 'Bouncing Ball',
  description: 'A simple bouncing ball animation with customizable properties',
  controls: [
    {
      name: 'speed',
      type: 'number',
      label: 'Speed',
      description: 'How fast the ball bounces',
      defaultValue: 2,
      min: 0.1,
      max: 10,
      step: 0.1,
    },
    {
      name: 'ballColor',
      type: 'color',
      label: 'Ball Color',
      description: 'Color of the bouncing ball',
      defaultValue: '#ff6b35',
    },
    {
      name: 'ballSize',
      type: 'number',
      label: 'Ball Size',
      description: 'Radius of the ball',
      defaultValue: 20,
      min: 5,
      max: 50,
      step: 1,
    },
    {
      name: 'gravity',
      type: 'number',
      label: 'Gravity',
      description: 'Strength of gravity',
      defaultValue: 0.5,
      min: 0,
      max: 2,
      step: 0.1,
    },
  ] as const,
} as const);
```

## Step 2: Create Your Animation Class

Extend `BaseAnimation` and implement the required lifecycle methods:

```typescript
import {
  BaseAnimation,
  ManifestToControlValues,
} from '@bracketbear/flateralus';
import { Application as PixiApp } from 'pixi.js';

class BouncingBallAnimation extends BaseAnimation<typeof bouncingBallManifest> {
  private ball: PIXI.Graphics | null = null;
  private velocityY = 0;
  private ballY = 0;

  onInit(
    context: PixiApp,
    controls: ManifestToControlValues<typeof bouncingBallManifest>
  ) {
    // Create the ball graphics object
    this.ball = new PIXI.Graphics();
    context.stage.addChild(this.ball);

    // Initialize position
    this.ballY = 100;
    this.velocityY = 0;
  }

  onUpdate(
    context: PixiApp,
    controls: ManifestToControlValues<typeof bouncingBallManifest>,
    deltaTime: number
  ) {
    if (!this.ball) return;

    // Apply gravity
    this.velocityY += controls.gravity * deltaTime * 60;

    // Update position
    this.ballY += this.velocityY * controls.speed * deltaTime * 60;

    // Bounce off the bottom
    if (this.ballY > context.screen.height - controls.ballSize) {
      this.ballY = context.screen.height - controls.ballSize;
      this.velocityY = -this.velocityY * 0.8; // Damping
    }

    // Bounce off the top
    if (this.ballY < controls.ballSize) {
      this.ballY = controls.ballSize;
      this.velocityY = Math.abs(this.velocityY);
    }

    // Clear and redraw the ball
    this.ball.clear();
    this.ball.beginFill(controls.ballColor);
    this.ball.drawCircle(
      context.screen.width / 2,
      this.ballY,
      controls.ballSize
    );
    this.ball.endFill();
  }

  onDestroy() {
    if (this.ball) {
      this.ball.destroy();
      this.ball = null;
    }
  }
}
```

## Step 3: Use in React

Now let's create a React component that uses our animation:

```typescript
import React, { useMemo } from 'react';
import { AnimationStage } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import { bouncingBallManifest, BouncingBallAnimation } from './bouncing-ball';

function BouncingBallDemo() {
  // Create application and animation instances
  const application = useMemo(() => {
    const app = new PixiApplication({
      config: {
        autoResize: true,
        backgroundAlpha: 0, // Transparent background
        antialias: true,
      },
    });

    const animation = new BouncingBallAnimation(bouncingBallManifest);
    app.setAnimation(animation);

    return app;
  }, []);

  return (
    <div className="h-96 w-full">
      <AnimationStage
        application={application}
        showDebugControls={true}
        className="rounded-lg border-2 border-gray-300"
      />
    </div>
  );
}

export default BouncingBallDemo;
```

## Step 4: Understanding Control Types

Flateralus supports several control types:

### Number Controls

```typescript
{
  name: 'speed',
  type: 'number',
  label: 'Speed',
  defaultValue: 1,
  min: 0,
  max: 10,
  step: 0.1,
}
```

### Boolean Controls

```typescript
{
  name: 'enableTrails',
  type: 'boolean',
  label: 'Enable Trails',
  defaultValue: false,
}
```

### Color Controls

```typescript
{
  name: 'backgroundColor',
  type: 'color',
  label: 'Background Color',
  defaultValue: '#ffffff',
}
```

### Select Controls

```typescript
{
  name: 'animationMode',
  type: 'select',
  label: 'Animation Mode',
  options: [
    { value: 'bounce', label: 'Bounce' },
    { value: 'float', label: 'Float' },
    { value: 'spin', label: 'Spin' },
  ],
  defaultValue: 'bounce',
}
```

### Group Controls

```typescript
{
  name: 'particles',
  type: 'group',
  label: 'Particles',
  value: 'number', // Homogeneous group
  items: [
    {
      name: 'count',
      type: 'number',
      label: 'Count',
      defaultValue: 10,
      min: 1,
      max: 100,
    },
  ],
  defaultValue: [
    { type: 'number', value: 10, metadata: { min: 1, max: 100 } },
  ],
  minItems: 1,
  maxItems: 5,
}
```

## Step 5: Control Behavior

### Reset Controls

Controls marked with `resetsAnimation: true` will trigger a complete animation reset when changed:

```typescript
{
  name: 'particleCount',
  type: 'number',
  defaultValue: 50,
  resetsAnimation: true, // Animation will reset when this changes
}
```

### Dynamic Controls

Controls without `resetsAnimation` will update the animation in real-time:

```typescript
{
  name: 'speed',
  type: 'number',
  defaultValue: 1,
  // No resetsAnimation - updates smoothly
}
```

## Next Steps

- Check out the [Core Concepts](./core-concepts.md) guide to understand the framework architecture
- Learn about [Creating Animations](./creating-animations.md) for more advanced techniques
- Explore the [React Integration](./react-integration.md) guide for React-specific features
- Browse [Examples](./examples.md) for more animation ideas

## Troubleshooting

### Common Issues

**Animation not starting**: Make sure you call `application.start()` after initialization.

**Controls not updating**: Ensure your animation class properly handles control changes in `onUpdate`.

**TypeScript errors**: Make sure your manifest is properly typed with `as const`.

**Performance issues**: Use `resetsAnimation: true` for controls that require expensive recalculations.

### Getting Help

- Check the [API Reference](./api-reference.md) for detailed method documentation
- Look at the [Examples](./examples.md) for working code samples
- Review [Best Practices](./best-practices.md) for optimization tips
