# Creating Animations

This guide covers how to create custom animations using Flateralus. We'll explore different animation patterns, advanced control types, and best practices.

## Basic Animation Structure

Every Flateralus animation extends `BaseAnimation` and implements three core lifecycle methods:

```typescript
import { BaseAnimation, createManifest } from '@bracketbear/flateralus';

const manifest = createManifest({
  id: 'my-animation',
  name: 'My Animation',
  description: 'A custom animation',
  controls: [
    // Define your controls here
  ] as const,
} as const);

class MyAnimation extends BaseAnimation<typeof manifest> {
  onInit(context: TContext, controls: Controls) {
    // Initialize animation resources
  }

  onUpdate(context: TContext, controls: Controls, deltaTime: number) {
    // Update animation each frame
  }

  onDestroy() {
    // Clean up resources
  }
}
```

## Animation Patterns

### 1. Particle Systems

Particle systems are common in Flateralus animations. Here's a complete example:

```typescript
import { BaseAnimation, createManifest } from '@bracketbear/flateralus';
import { Application as PixiApp } from 'pixi.js';

const particleManifest = createManifest({
  id: 'particle-system',
  name: 'Particle System',
  description: 'A configurable particle system',
  controls: [
    {
      name: 'particleCount',
      type: 'number',
      label: 'Particle Count',
      defaultValue: 100,
      min: 10,
      max: 1000,
      step: 10,
      resetsAnimation: true, // Reset when count changes
    },
    {
      name: 'speed',
      type: 'number',
      label: 'Speed',
      defaultValue: 2,
      min: 0.1,
      max: 10,
      step: 0.1,
    },
    {
      name: 'particleColor',
      type: 'color',
      label: 'Particle Color',
      defaultValue: '#ff6b35',
    },
    {
      name: 'particleSize',
      type: 'number',
      label: 'Particle Size',
      defaultValue: 3,
      min: 1,
      max: 20,
      step: 0.5,
    },
    {
      name: 'gravity',
      type: 'number',
      label: 'Gravity',
      defaultValue: 0.1,
      min: 0,
      max: 1,
      step: 0.01,
    },
  ] as const,
} as const);

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

class ParticleSystemAnimation extends BaseAnimation<typeof particleManifest> {
  private particles: Particle[] = [];
  private graphics: PIXI.Graphics | null = null;

  onInit(context: PixiApp, controls: Controls) {
    this.graphics = new PIXI.Graphics();
    context.stage.addChild(this.graphics);
    this.createParticles(controls);
  }

  onUpdate(context: PixiApp, controls: Controls, deltaTime: number) {
    if (!this.graphics) return;

    // Update particles
    this.particles.forEach((particle, index) => {
      // Apply gravity
      particle.vy += controls.gravity * deltaTime * 60;

      // Update position
      particle.x += particle.vx * controls.speed * deltaTime * 60;
      particle.y += particle.vy * controls.speed * deltaTime * 60;

      // Decrease life
      particle.life -= deltaTime;

      // Remove dead particles
      if (particle.life <= 0) {
        this.particles.splice(index, 1);
        this.createParticle(
          controls,
          context.screen.width,
          context.screen.height
        );
      }
    });

    // Draw particles
    this.drawParticles(controls);
  }

  onDestroy() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    this.particles = [];
  }

  private createParticles(controls: Controls) {
    this.particles = [];
    for (let i = 0; i < controls.particleCount; i++) {
      this.createParticle(controls, 800, 600);
    }
  }

  private createParticle(controls: Controls, width: number, height: number) {
    const particle: Particle = {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: Math.random() * 5 + 2,
      maxLife: Math.random() * 5 + 2,
    };
    this.particles.push(particle);
  }

  private drawParticles(controls: Controls) {
    if (!this.graphics) return;

    this.graphics.clear();

    this.particles.forEach((particle) => {
      const alpha = particle.life / particle.maxLife;
      this.graphics!.beginFill(controls.particleColor, alpha);
      this.graphics!.drawCircle(
        particle.x,
        particle.y,
        controls.particleSize * alpha
      );
      this.graphics!.endFill();
    });
  }

  // Handle control changes
  protected onDynamicControlsChange(
    controls: Controls,
    previousControls: Controls,
    changedControls: string[]
  ) {
    // Handle dynamic updates (speed, color, size, gravity)
    if (
      changedControls.includes('speed') ||
      changedControls.includes('particleColor') ||
      changedControls.includes('particleSize') ||
      changedControls.includes('gravity')
    ) {
      // These controls update smoothly without reset
    }
  }

  protected onReset(context: PixiApp, controls: Controls) {
    // Reset particles when particleCount changes
    this.createParticles(controls);
  }
}
```

### 2. Procedural Animations

Procedural animations generate content algorithmically:

```typescript
const proceduralManifest = createManifest({
  id: 'procedural-shapes',
  name: 'Procedural Shapes',
  description: 'Algorithmically generated shapes',
  controls: [
    {
      name: 'shapeCount',
      type: 'number',
      label: 'Shape Count',
      defaultValue: 5,
      min: 1,
      max: 20,
      step: 1,
      resetsAnimation: true,
    },
    {
      name: 'rotationSpeed',
      type: 'number',
      label: 'Rotation Speed',
      defaultValue: 1,
      min: 0,
      max: 5,
      step: 0.1,
    },
    {
      name: 'scale',
      type: 'number',
      label: 'Scale',
      defaultValue: 1,
      min: 0.1,
      max: 3,
      step: 0.1,
    },
    {
      name: 'colorMode',
      type: 'select',
      label: 'Color Mode',
      options: [
        { value: 'rainbow', label: 'Rainbow' },
        { value: 'monochrome', label: 'Monochrome' },
        { value: 'random', label: 'Random' },
      ],
      defaultValue: 'rainbow',
    },
  ] as const,
} as const);

class ProceduralShapesAnimation extends BaseAnimation<
  typeof proceduralManifest
> {
  private shapes: PIXI.Graphics[] = [];
  private time = 0;

  onInit(context: PixiApp, controls: Controls) {
    this.createShapes(controls, context);
  }

  onUpdate(context: PixiApp, controls: Controls, deltaTime: number) {
    this.time += deltaTime;

    this.shapes.forEach((shape, index) => {
      const angle =
        this.time * controls.rotationSpeed +
        (index * Math.PI * 2) / controls.shapeCount;
      const scale = controls.scale + Math.sin(this.time + index) * 0.2;

      shape.rotation = angle;
      shape.scale.set(scale);

      // Update color based on mode
      this.updateShapeColor(shape, index, controls);
    });
  }

  onDestroy() {
    this.shapes.forEach((shape) => shape.destroy());
    this.shapes = [];
  }

  private createShapes(controls: Controls, context: PixiApp) {
    // Clear existing shapes
    this.shapes.forEach((shape) => shape.destroy());
    this.shapes = [];

    const centerX = context.screen.width / 2;
    const centerY = context.screen.height / 2;
    const radius = Math.min(context.screen.width, context.screen.height) / 3;

    for (let i = 0; i < controls.shapeCount; i++) {
      const shape = new PIXI.Graphics();
      const angle = (i * Math.PI * 2) / controls.shapeCount;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      shape.x = x;
      shape.y = y;

      // Create different shapes based on index
      if (i % 3 === 0) {
        // Circle
        shape.beginFill(0xffffff);
        shape.drawCircle(0, 0, 20);
        shape.endFill();
      } else if (i % 3 === 1) {
        // Square
        shape.beginFill(0xffffff);
        shape.drawRect(-15, -15, 30, 30);
        shape.endFill();
      } else {
        // Triangle
        shape.beginFill(0xffffff);
        shape.drawPolygon([0, -20, -17, 15, 17, 15]);
        shape.endFill();
      }

      context.stage.addChild(shape);
      this.shapes.push(shape);
    }
  }

  private updateShapeColor(
    shape: PIXI.Graphics,
    index: number,
    controls: Controls
  ) {
    let color: number;

    switch (controls.colorMode) {
      case 'rainbow':
        color = this.hslToHex((index * 360) / controls.shapeCount, 100, 50);
        break;
      case 'monochrome':
        color = 0xffffff;
        break;
      case 'random':
        color = Math.random() * 0xffffff;
        break;
      default:
        color = 0xffffff;
    }

    shape.tint = color;
  }

  private hslToHex(h: number, s: number, l: number): number {
    const c = ((1 - Math.abs((2 * l) / 100 - 1)) * s) / 100;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l / 100 - c / 2;

    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    return (
      (Math.floor((r + m) * 255) << 16) |
      (Math.floor((g + m) * 255) << 8) |
      Math.floor((b + m) * 255)
    );
  }

  protected onReset(context: PixiApp, controls: Controls) {
    this.createShapes(controls, context);
  }
}
```

## Advanced Control Types

### Group Controls

Group controls allow you to create arrays of related controls:

```typescript
const groupManifest = createManifest({
  id: 'group-example',
  name: 'Group Control Example',
  description: 'Demonstrates group controls',
  controls: [
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
        {
          name: 'size',
          type: 'number',
          label: 'Size',
          defaultValue: 5,
          min: 1,
          max: 20,
        },
      ],
      defaultValue: [
        { type: 'number', value: 10, metadata: { min: 1, max: 100 } },
        { type: 'number', value: 5, metadata: { min: 1, max: 20 } },
      ],
      minItems: 1,
      maxItems: 10,
      resetsAnimation: true,
    },
  ] as const,
} as const);
```

### Mixed Group Controls

For complex configurations, use mixed groups:

```typescript
const mixedGroupManifest = createManifest({
  id: 'mixed-group',
  name: 'Mixed Group Example',
  description: 'Demonstrates mixed group controls',
  controls: [
    {
      name: 'configs',
      type: 'group',
      label: 'Configurations',
      value: 'mixed',
      items: [
        {
          name: 'color',
          controlType: 'color',
          defaultValue: '#ff0000',
        },
        {
          name: 'size',
          controlType: 'number',
          defaultValue: 10,
        },
        {
          name: 'enabled',
          controlType: 'boolean',
          defaultValue: true,
        },
      ],
      defaultValue: [
        { type: 'color', value: '#ff0000' },
        { type: 'number', value: 10 },
        { type: 'boolean', value: true },
      ],
      minItems: 1,
      maxItems: 5,
    },
  ] as const,
} as const);
```

## Animation Lifecycle Management

### Control Change Handling

Override control change methods for custom behavior:

```typescript
class MyAnimation extends BaseAnimation<typeof manifest> {
  // Handle dynamic control changes (non-reset controls)
  protected onDynamicControlsChange(
    controls: Controls,
    previousControls: Controls,
    changedControls: string[]
  ) {
    // Handle smooth updates for non-reset controls
    if (changedControls.includes('speed')) {
      this.updateSpeed(controls.speed);
    }
    if (changedControls.includes('color')) {
      this.updateColor(controls.color);
    }
  }

  // Handle animation resets (reset controls)
  protected onReset(context: TContext, controls: Controls) {
    // Recreate expensive resources
    this.recreateParticles(controls.particleCount);
    this.rebuildGeometry(controls.complexity);
  }
}
```

### Resource Management

Proper resource management is crucial for performance:

```typescript
class ResourceManagedAnimation extends BaseAnimation<typeof manifest> {
  private resources: Map<string, any> = new Map();

  onInit(context: TContext, controls: Controls) {
    // Create resources
    this.createResources(controls);
  }

  onDestroy() {
    // Clean up all resources
    this.resources.forEach((resource, key) => {
      if (resource && typeof resource.destroy === 'function') {
        resource.destroy();
      }
    });
    this.resources.clear();
  }

  private createResources(controls: Controls) {
    // Create and store resources
    const texture = this.createTexture();
    this.resources.set('texture', texture);

    const geometry = this.createGeometry();
    this.resources.set('geometry', geometry);
  }

  private createTexture() {
    // Create texture resource
    return new PIXI.Texture();
  }

  private createGeometry() {
    // Create geometry resource
    return new PIXI.Graphics();
  }
}
```

## Performance Optimization

### Efficient Updates

Optimize your update loops for better performance:

```typescript
class OptimizedAnimation extends BaseAnimation<typeof manifest> {
  private lastUpdateTime = 0;
  private updateInterval = 16; // ~60fps

  onUpdate(context: TContext, controls: Controls, deltaTime: number) {
    const now = Date.now();

    // Throttle expensive operations
    if (now - this.lastUpdateTime < this.updateInterval) {
      return;
    }

    this.lastUpdateTime = now;

    // Only update what's necessary
    if (this.needsUpdate(controls)) {
      this.performExpensiveUpdate(controls);
    }
  }

  private needsUpdate(controls: Controls): boolean {
    // Check if update is actually needed
    return controls.someProperty !== this.lastKnownValue;
  }

  private performExpensiveUpdate(controls: Controls) {
    // Expensive operation
  }
}
```

### Memory Management

Use object pooling for frequently created/destroyed objects:

```typescript
class PooledAnimation extends BaseAnimation<typeof manifest> {
  private particlePool: Particle[] = [];
  private activeParticles: Particle[] = [];

  private getParticle(): Particle {
    if (this.particlePool.length > 0) {
      return this.particlePool.pop()!;
    }
    return this.createNewParticle();
  }

  private returnParticle(particle: Particle) {
    this.resetParticle(particle);
    this.particlePool.push(particle);
  }

  private createNewParticle(): Particle {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
    };
  }

  private resetParticle(particle: Particle) {
    particle.x = 0;
    particle.y = 0;
    particle.vx = 0;
    particle.vy = 0;
    particle.life = 0;
  }
}
```

## Best Practices

### 1. Control Design

- Use descriptive names and labels
- Provide helpful descriptions
- Set appropriate min/max values
- Use `resetsAnimation` judiciously

### 2. Performance

- Keep `onUpdate` lightweight
- Use delta time for frame-rate independence
- Implement proper cleanup
- Use object pooling for frequent allocations

### 3. Code Organization

- Separate concerns (rendering, logic, data)
- Use meaningful variable names
- Add comments for complex algorithms
- Handle edge cases gracefully

### 4. Testing

- Test with different control values
- Verify cleanup on destroy
- Test control change behavior
- Check performance with many controls

## Next Steps

- Explore the [Control System](./control-system.md) for advanced control features
- Learn about [Applications](./applications.md) for rendering backend details
- Check out [React Integration](./react-integration.md) for React-specific features
- See [Examples](./examples.md) for more animation ideas
