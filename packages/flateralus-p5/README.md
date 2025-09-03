# @bracketbear/flateralus-p5

p5.js adapter for Flateralus animation framework.

## Installation

```bash
npm install @bracketbear/flateralus-p5
```

## Usage

```typescript
import { P5Application, P5Animation } from '@bracketbear/flateralus-p5';
import { createManifest } from '@bracketbear/flateralus';

// Define your animation manifest
const animationManifest = createManifest({
  id: 'my-p5-animation',
  name: 'My P5 Animation',
  description: 'A simple p5.js animation',
  controls: [
    {
      name: 'circleSize',
      type: 'number',
      label: 'Circle Size',
      description: 'Size of the animated circle',
      defaultValue: 50,
      min: 10,
      max: 200,
      step: 5,
      debug: true,
    },
    {
      name: 'circleColor',
      type: 'color',
      label: 'Circle Color',
      description: 'Color of the animated circle',
      defaultValue: '#ff6b35',
      debug: true,
    },
  ] as const,
});

// Create your p5 animation class
class MyP5Animation extends P5Animation<typeof animationManifest> {
  private x = 0;
  private y = 0;
  private speed = 2;

  onInit(p: p5, controls: any): void {
    this.x = p.width / 2;
    this.y = p.height / 2;
  }

  onUpdate(p: p5, controls: any, deltaTime: number): void {
    // Update position
    this.x += this.speed;
    if (this.x > p.width + controls.circleSize) {
      this.x = -controls.circleSize;
    }

    // Draw the circle
    p.fill(controls.circleColor);
    p.noStroke();
    p.circle(this.x, this.y, controls.circleSize);
  }

  protected onReset(p: p5, controls: any): void {
    this.x = p.width / 2;
    this.y = p.height / 2;
  }

  onDestroy(): void {
    // Clean up any resources
  }
}

// Create and use the application
const app = new P5Application({
  width: 800,
  height: 600,
  backgroundAlpha: 0,
  antialias: true,
  resolution: 1,
  autoDensity: true,
});

// Initialize with a container
const container = document.getElementById('animation-container');
if (container) {
  await app.init(container);

  // Create and set the animation
  const animation = new MyP5Animation(animationManifest);
  app.setAnimation(animation);

  // Start the animation
  app.start();
}
```

## Features

- **TypeScript-first design**: Full type safety with proper TypeScript support
- **Framework-agnostic animation logic**: Core animation logic works with any rendering framework
- **p5.js-specific rendering**: Optimized for p5.js lifecycle and API
- **Full Flateralus integration**: Works seamlessly with the Flateralus animation system
- **Stage controls**: Built-in support for background color, alpha, and other stage properties
- **Auto-resize support**: Automatically handles window resize events
- **Resource management**: Proper cleanup of p5.js resources

## API Reference

### P5Application

Extends `BaseApplication<p5>` to provide p5.js-specific functionality.

#### Constructor

```typescript
new P5Application(options?: ApplicationOptions)
```

#### Methods

- `getP5Instance(): p5 | null` - Get the p5 instance
- `getCanvas(): HTMLCanvasElement | null` - Get the canvas element
- `getStageControlsManifest(): StageControlsManifest` - Get stage controls manifest

### P5Animation

Abstract class for creating p5.js animations.

#### Lifecycle Methods

- `onInit(p: p5, controls: TControlValues): void` - Initialize the animation
- `onUpdate(p: p5, controls: TControlValues, deltaTime: number): void` - Update each frame
- `protected onReset(p: p5, controls: TControlValues): void` - Reset animation state
- `onDestroy(): void` - Clean up resources

## Stage Controls

The p5 adapter provides built-in stage controls:

- **Background Color**: Set the stage background color
- **Background Alpha**: Control background transparency (0-1)

These controls are automatically applied to the p5 canvas and can be accessed through the Flateralus debug UI.
