# Flateralus

## Overview
A library for adding character to the web through interactive graphics, animations, and visual effects. Built with PixiJS and TypeScript for high-performance web graphics.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Development](#development)
- [Back to Monorepo](../../README.md)

## Features

- **Interactive Graphics**: Mouse and touch interaction support
- **Performance Optimized**: Built on PixiJS for smooth animations
- **TypeScript**: Full type safety and IntelliSense support
- **Modular Design**: Composable sprites, behaviors, and generators
- **Responsive**: Adapts to different screen sizes and input methods
- **Customizable**: Extensive configuration options for visual effects

## Installation

```bash
npm install @bracketbear/flateralus
```

## Quick Start

```typescript
import { FlateralusCanvas } from '@bracketbear/flateralus';

const canvas = new FlateralusCanvas({
  container: document.getElementById('canvas-container'),
  width: 800,
  height: 600
});

// Add interactive elements
canvas.addSprite(new CircleSprite({
  x: 400,
  y: 300,
  radius: 50,
  color: 0xff0000
}));

canvas.start();
```

## API Reference

### Core Classes
- `FlateralusCanvas`: Main canvas manager
- `Sprite`: Base class for visual elements
- `Behavior`: Base class for sprite behaviors
- `Generator`: Base class for sprite generators

### Sprites
- `CircleSprite`: Circular sprites with physics
- `CustomPathSprite`: Sprites with custom SVG paths

### Behaviors
- `RepulsionBehavior`: Sprites that repel from each other
- `SlowReturnBehavior`: Sprites that slowly return to original position

### Generators
- `GridGenerator`: Generate sprites in a grid pattern
- `FibonacciSpiralGenerator`: Generate sprites in a spiral pattern

## Examples

See the examples in the `examples/` directory for more detailed usage patterns.

## Development

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Build for production
npm run build
```
