# Applications

Applications in Flateralus manage the rendering context and animation lifecycle. This guide covers how to work with different rendering backends and create custom applications.

## Overview

Applications in Flateralus are responsible for:

- **Context Management**: Creating and managing rendering contexts
- **Render Loop**: Controlling the animation update cycle
- **Resize Handling**: Responding to container size changes
- **Stage Controls**: Managing global stage properties
- **Lifecycle Management**: Initializing, starting, stopping, and destroying applications

## Built-in Applications

### PIXI.js Application

The PIXI.js application provides high-performance 2D graphics:

```typescript
import { PixiApplication } from '@bracketbear/flateralus-pixi';

const app = new PixiApplication({
  config: {
    width: 800,
    height: 600,
    autoResize: true,
    backgroundAlpha: 0,
    antialias: true,
    resolution: 2,
  },
  pauseWhenHidden: true,
  enableLuminanceDetection: true,
});

// Initialize with a container
await app.init(containerElement);

// Set and start animation
app.setAnimation(animation);
app.start();
```

**PIXI.js Features:**

- WebGL acceleration
- Rich graphics API
- High performance
- Good for complex visual effects

### p5.js Application

The p5.js application provides a creative coding friendly interface:

```typescript
import { P5Application } from '@bracketbear/flateralus-p5';

const app = new P5Application({
  config: {
    width: 800,
    height: 600,
    autoResize: true,
    antialias: true,
  },
  pauseWhenHidden: true,
});

// Initialize with a container
await app.init(containerElement);

// Set and start animation
app.setAnimation(animation);
app.start();
```

**p5.js Features:**

- Simple API
- Creative coding friendly
- Good for generative art
- Canvas-based rendering

## Application Configuration

### ApplicationConfig

Configure the rendering context:

```typescript
interface ApplicationConfig {
  /** Initial width of the application */
  width?: number;
  /** Initial height of the application */
  height?: number;
  /** Whether to enable automatic resizing */
  autoResize?: boolean;
  /** Background color (transparent by default) */
  backgroundColor?: string;
  /** Background alpha (0 for transparent) */
  backgroundAlpha?: number;
  /** Whether to enable antialiasing */
  antialias?: boolean;
  /** Device pixel ratio (auto-detected by default) */
  resolution?: number;
  /** Whether to enable auto density */
  autoDensity?: boolean;
}
```

### ApplicationOptions

Configure application behavior:

```typescript
interface ApplicationOptions {
  /** Configuration for the application */
  config?: ApplicationConfig;
  /** Whether to pause when not visible */
  pauseWhenHidden?: boolean;
  /** Visibility threshold for pausing */
  visibilityThreshold?: number;
  /** Whether to enable luminance detection */
  enableLuminanceDetection?: boolean;
  /** Initial stage control values */
  stageControls?: Partial<StageControlValues>;
  /** CSS classes to apply to the canvas element */
  canvasClassName?: string;
}
```

## Creating Custom Applications

### Extending BaseApplication

Create custom applications by extending `BaseApplication`:

```typescript
import {
  BaseApplication,
  type ApplicationConfig,
} from '@bracketbear/flateralus';

class Canvas2DApplication extends BaseApplication<CanvasRenderingContext2D> {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;

  protected async createContext(
    config: ApplicationConfig
  ): Promise<CanvasRenderingContext2D> {
    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.width = config.width || 800;
    this.canvas.height = config.height || 600;

    // Get 2D context
    this.context = this.canvas.getContext('2d')!;

    // Configure context
    if (config.antialias !== false) {
      this.context.imageSmoothingEnabled = true;
    }

    return this.context;
  }

  protected startRenderLoop(): void {
    if (!this.context) return;

    const render = () => {
      this.updateAnimation();
      this.animationFrameId = requestAnimationFrame(render);
    };

    this.animationFrameId = requestAnimationFrame(render);
  }

  protected stopRenderLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  protected handleResize(width: number, height: number): void {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  public getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  public getStageControlsManifest(): StageControlsManifest {
    return {
      id: 'canvas2d-stage-controls',
      name: 'Canvas 2D Stage Controls',
      description: 'Controls for Canvas 2D stage properties',
      controls: [
        {
          name: 'backgroundColor',
          type: 'color',
          label: 'Background Color',
          description: 'Stage background color',
          defaultValue: '#ffffff',
          debug: true,
        },
        {
          name: 'backgroundAlpha',
          type: 'number',
          label: 'Background Alpha',
          description: 'Background transparency (0-1)',
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.01,
          debug: true,
        },
      ],
    };
  }

  protected onStageControlsChange(
    controls: StageControlValues,
    previousControls: StageControlValues
  ): void {
    if (!this.context) return;

    // Update background
    if (
      controls.backgroundColor !== previousControls.backgroundColor ||
      controls.backgroundAlpha !== previousControls.backgroundAlpha
    ) {
      const bgColor = controls.backgroundColor || '#ffffff';
      const bgAlpha = controls.backgroundAlpha || 1;

      this.context.fillStyle = bgColor;
      this.context.globalAlpha = bgAlpha;
      this.context.fillRect(0, 0, this.canvas!.width, this.canvas!.height);
    }
  }

  public destroy(): void {
    this.stopRenderLoop();

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    this.canvas = null;
    this.context = null;

    super.destroy();
  }
}
```

### WebGL Application

Create a WebGL-based application:

```typescript
class WebGLApplication extends BaseApplication<WebGLRenderingContext> {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private animationFrameId: number | null = null;

  protected async createContext(
    config: ApplicationConfig
  ): Promise<WebGLRenderingContext> {
    this.canvas = document.createElement('canvas');
    this.canvas.width = config.width || 800;
    this.canvas.height = config.height || 600;

    this.gl =
      this.canvas.getContext('webgl') ||
      this.canvas.getContext('experimental-webgl');
    if (!this.gl) {
      throw new Error('WebGL not supported');
    }

    // Configure WebGL
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    return this.gl;
  }

  protected startRenderLoop(): void {
    if (!this.gl) return;

    const render = () => {
      // Clear the canvas
      this.gl!.clear(this.gl!.COLOR_BUFFER_BIT);

      this.updateAnimation();
      this.animationFrameId = requestAnimationFrame(render);
    };

    this.animationFrameId = requestAnimationFrame(render);
  }

  protected stopRenderLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  protected handleResize(width: number, height: number): void {
    if (this.canvas && this.gl) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl.viewport(0, 0, width, height);
    }
  }

  public getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  public getStageControlsManifest(): StageControlsManifest {
    return {
      id: 'webgl-stage-controls',
      name: 'WebGL Stage Controls',
      description: 'Controls for WebGL stage properties',
      controls: [
        {
          name: 'backgroundColor',
          type: 'color',
          label: 'Background Color',
          description: 'Stage background color',
          defaultValue: '#000000',
          debug: true,
        },
        {
          name: 'backgroundAlpha',
          type: 'number',
          label: 'Background Alpha',
          description: 'Background transparency (0-1)',
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.01,
          debug: true,
        },
      ],
    };
  }

  protected onStageControlsChange(
    controls: StageControlValues,
    previousControls: StageControlValues
  ): void {
    if (!this.gl) return;

    // Update background color
    if (
      controls.backgroundColor !== previousControls.backgroundColor ||
      controls.backgroundAlpha !== previousControls.backgroundAlpha
    ) {
      const bgColor = controls.backgroundColor || '#000000';
      const bgAlpha = controls.backgroundAlpha || 1;

      // Convert hex color to RGB
      const hex = bgColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;

      this.gl.clearColor(r, g, b, bgAlpha);
    }
  }

  public destroy(): void {
    this.stopRenderLoop();

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    this.canvas = null;
    this.gl = null;

    super.destroy();
  }
}
```

## Stage Controls

Stage controls manage global properties of the rendering stage:

### Stage Control Values

```typescript
interface StageControlValues {
  // Background controls
  backgroundColor?: string;
  backgroundAlpha?: number;

  // Stage dimensions
  stageWidth?: number;
  stageHeight?: number;

  // Grid controls
  enableGrid?: boolean;
  gridColor?: string;
  gridOpacity?: number;
  gridSize?: number;

  // Shadow controls
  enableShadows?: boolean;
  shadowColor?: string;
  shadowOpacity?: number;
}
```

### Implementing Stage Controls

```typescript
class MyApplication extends BaseApplication<TContext> {
  public getStageControlsManifest(): StageControlsManifest {
    return {
      id: 'my-stage-controls',
      name: 'My Stage Controls',
      description: 'Controls for my application stage',
      controls: [
        {
          name: 'backgroundColor',
          type: 'color',
          label: 'Background Color',
          description: 'Stage background color',
          defaultValue: '#ffffff',
          debug: true,
        },
        {
          name: 'enableGrid',
          type: 'boolean',
          label: 'Enable Grid',
          description: 'Show a grid overlay',
          defaultValue: false,
          debug: true,
        },
        {
          name: 'gridSize',
          type: 'number',
          label: 'Grid Size',
          description: 'Size of grid cells',
          defaultValue: 50,
          min: 10,
          max: 200,
          step: 10,
          debug: true,
        },
      ],
    };
  }

  protected onStageControlsChange(
    controls: StageControlValues,
    previousControls: StageControlValues
  ): void {
    // Update background
    if (controls.backgroundColor !== previousControls.backgroundColor) {
      this.updateBackground(controls.backgroundColor);
    }

    // Update grid
    if (
      controls.enableGrid !== previousControls.enableGrid ||
      controls.gridSize !== previousControls.gridSize
    ) {
      this.updateGrid(controls.enableGrid, controls.gridSize);
    }
  }

  private updateBackground(color: string) {
    // Implement background update
  }

  private updateGrid(enabled: boolean, size: number) {
    // Implement grid update
  }
}
```

## Application Lifecycle

### Initialization

```typescript
const app = new MyApplication({
  config: {
    width: 800,
    height: 600,
    autoResize: true,
  },
});

// Initialize with container
await app.init(containerElement);

// Check if initialized
if (app.isInitialized()) {
  console.log('Application is ready');
}
```

### Animation Management

```typescript
// Set animation
app.setAnimation(animation);

// Get current animation
const currentAnimation = app.getAnimation();

// Start/stop application
app.start();
app.stop();

// Pause/resume
app.pause();
app.resume();

// Check running state
if (app.isRunning()) {
  console.log('Application is running');
}
```

### Cleanup

```typescript
// Destroy application and clean up resources
app.destroy();
```

## Performance Considerations

### Render Loop Optimization

```typescript
class OptimizedApplication extends BaseApplication<TContext> {
  private lastFrameTime = 0;
  private targetFPS = 60;
  private frameInterval = 1000 / this.targetFPS;

  protected startRenderLoop(): void {
    const render = (currentTime: number) => {
      const deltaTime = currentTime - this.lastFrameTime;

      if (deltaTime >= this.frameInterval) {
        this.updateAnimation();
        this.lastFrameTime = currentTime;
      }

      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
  }
}
```

### Memory Management

```typescript
class MemoryManagedApplication extends BaseApplication<TContext> {
  private resources: Map<string, any> = new Map();

  protected async createContext(config: ApplicationConfig): Promise<TContext> {
    // Create context and resources
    const context = await this.createRenderingContext(config);
    this.createResources();
    return context;
  }

  private createResources() {
    // Create and store resources
    const texture = this.createTexture();
    this.resources.set('texture', texture);
  }

  public destroy(): void {
    // Clean up resources
    this.resources.forEach((resource, key) => {
      if (resource && typeof resource.destroy === 'function') {
        resource.destroy();
      }
    });
    this.resources.clear();

    super.destroy();
  }
}
```

## Error Handling

### Graceful Error Handling

```typescript
class RobustApplication extends BaseApplication<TContext> {
  protected async createContext(config: ApplicationConfig): Promise<TContext> {
    try {
      return await this.createRenderingContext(config);
    } catch (error) {
      console.error('Failed to create rendering context:', error);
      throw new Error('Rendering context creation failed');
    }
  }

  protected startRenderLoop(): void {
    try {
      this.startRenderLoopInternal();
    } catch (error) {
      console.error('Render loop error:', error);
      this.stopRenderLoop();
    }
  }

  private startRenderLoopInternal(): void {
    // Implementation
  }
}
```

## Best Practices

### 1. Resource Management

- Always clean up resources in `destroy()`
- Use proper resource disposal methods
- Avoid memory leaks
- Monitor resource usage

### 2. Error Handling

- Handle context creation failures
- Gracefully handle render loop errors
- Provide meaningful error messages
- Implement fallback mechanisms

### 3. Performance

- Optimize render loops
- Use efficient update mechanisms
- Minimize unnecessary calculations
- Monitor frame rates

### 4. Configuration

- Provide sensible defaults
- Validate configuration values
- Handle edge cases
- Document configuration options

## Next Steps

- Learn about [Creating Animations](./creating-animations.md) for animation implementation
- Explore [React Integration](./react-integration.md) for React-specific features
- Check out [Control System](./control-system.md) for advanced control features
- See [Examples](./examples.md) for practical examples
