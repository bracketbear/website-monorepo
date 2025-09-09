# Best Practices

This guide covers best practices for developing effective Flateralus animations, from performance optimization to code organization.

## Performance Optimization

### 1. Control Design

#### Use `resetsAnimation` Judiciously

Only mark controls as `resetsAnimation: true` when they require expensive recalculations:

```typescript
// ✅ Good - expensive recalculation
{
  name: 'particleCount',
  type: 'number',
  defaultValue: 100,
  resetsAnimation: true, // Recreates all particles
}

// ✅ Good - smooth interpolation
{
  name: 'speed',
  type: 'number',
  defaultValue: 1,
  // No resetsAnimation - updates smoothly
}

// ❌ Bad - unnecessary reset
{
  name: 'color',
  type: 'color',
  defaultValue: '#ff0000',
  resetsAnimation: true, // Color can change smoothly
}
```

#### Optimize Control Updates

Batch control updates when possible:

```typescript
class OptimizedAnimation extends BaseAnimation<typeof manifest> {
  private updateQueue: Partial<Controls> = {};
  private updateTimeout: number | null = null;

  updateControls(values: Partial<Controls>): void {
    // Batch updates
    Object.assign(this.updateQueue, values);

    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(() => {
      super.updateControls(this.updateQueue);
      this.updateQueue = {};
    }, 16); // ~60fps
  }
}
```

### 2. Render Loop Optimization

#### Use Delta Time

Always use delta time for frame-rate independent animations:

```typescript
class FrameRateIndependentAnimation extends BaseAnimation<typeof manifest> {
  onUpdate(context: TContext, controls: Controls, deltaTime: number) {
    // ✅ Good - frame-rate independent
    this.position += this.velocity * deltaTime;

    // ❌ Bad - frame-rate dependent
    this.position += this.velocity;
  }
}
```

#### Throttle Expensive Operations

Throttle expensive operations to maintain smooth frame rates:

```typescript
class ThrottledAnimation extends BaseAnimation<typeof manifest> {
  private lastExpensiveUpdate = 0;
  private expensiveUpdateInterval = 100; // 10fps for expensive operations

  onUpdate(context: TContext, controls: Controls, deltaTime: number) {
    const now = Date.now();

    // Lightweight operations every frame
    this.updatePosition(deltaTime);

    // Expensive operations throttled
    if (now - this.lastExpensiveUpdate > this.expensiveUpdateInterval) {
      this.performExpensiveUpdate();
      this.lastExpensiveUpdate = now;
    }
  }
}
```

#### Use Object Pooling

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

### 3. Memory Management

#### Proper Cleanup

Always implement proper cleanup in `onDestroy()`:

```typescript
class MemoryManagedAnimation extends BaseAnimation<typeof manifest> {
  private resources: Map<string, any> = new Map();
  private eventListeners: Array<() => void> = [];

  onInit(context: TContext, controls: Controls) {
    // Create resources
    const texture = this.createTexture();
    this.resources.set('texture', texture);

    // Add event listeners
    const removeListener = this.addEventListener();
    this.eventListeners.push(removeListener);
  }

  onDestroy() {
    // Clean up resources
    this.resources.forEach((resource, key) => {
      if (resource && typeof resource.destroy === 'function') {
        resource.destroy();
      }
    });
    this.resources.clear();

    // Remove event listeners
    this.eventListeners.forEach((remove) => remove());
    this.eventListeners = [];
  }
}
```

#### Monitor Memory Usage

Monitor memory usage in development:

```typescript
class MemoryMonitoredAnimation extends BaseAnimation<typeof manifest> {
  private memoryCheckInterval: number | null = null;

  onInit(context: TContext, controls: Controls) {
    // Monitor memory in development
    if (process.env.NODE_ENV === 'development') {
      this.memoryCheckInterval = setInterval(() => {
        if (performance.memory) {
          console.log('Memory usage:', {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
          });
        }
      }, 5000);
    }
  }

  onDestroy() {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }
}
```

## Code Organization

### 1. Separation of Concerns

#### Separate Animation Logic from UI

```typescript
// ✅ Good - separated concerns
class ParticleSystem {
  private particles: Particle[] = [];

  update(deltaTime: number, controls: Controls) {
    // Pure animation logic
  }

  render(graphics: PIXI.Graphics, controls: Controls) {
    // Pure rendering logic
  }
}

class ParticleSystemAnimation extends BaseAnimation<typeof manifest> {
  private particleSystem: ParticleSystem;

  onUpdate(context: TContext, controls: Controls, deltaTime: number) {
    this.particleSystem.update(deltaTime, controls);
    this.particleSystem.render(this.graphics, controls);
  }
}
```

#### Use Meaningful Names

```typescript
// ✅ Good - descriptive names
class FluidSimulationAnimation extends BaseAnimation<typeof manifest> {
  private fluidGrid: FluidGrid;
  private velocityField: VelocityField;
  private pressureSolver: PressureSolver;

  private updateFluidDynamics(deltaTime: number) {
    // Implementation
  }
}

// ❌ Bad - unclear names
class Animation1 extends BaseAnimation<typeof manifest> {
  private grid: any;
  private field: any;
  private solver: any;

  private update(deltaTime: number) {
    // Implementation
  }
}
```

### 2. Error Handling

#### Graceful Error Handling

```typescript
class RobustAnimation extends BaseAnimation<typeof manifest> {
  onInit(context: TContext, controls: Controls) {
    try {
      this.initializeResources(controls);
    } catch (error) {
      console.error('Failed to initialize animation:', error);
      this.handleInitializationError(error);
    }
  }

  onUpdate(context: TContext, controls: Controls, deltaTime: number) {
    try {
      this.updateAnimation(deltaTime, controls);
    } catch (error) {
      console.error('Animation update error:', error);
      this.handleUpdateError(error);
    }
  }

  private handleInitializationError(error: Error) {
    // Fallback initialization
    this.initializeFallbackResources();
  }

  private handleUpdateError(error: Error) {
    // Skip problematic update
    this.skipUpdate();
  }
}
```

#### Validate Inputs

```typescript
class ValidatedAnimation extends BaseAnimation<typeof manifest> {
  onUpdate(context: TContext, controls: Controls, deltaTime: number) {
    // Validate inputs
    if (!this.isValidDeltaTime(deltaTime)) {
      console.warn('Invalid delta time:', deltaTime);
      return;
    }

    if (!this.isValidControls(controls)) {
      console.warn('Invalid controls:', controls);
      return;
    }

    // Proceed with update
    this.updateAnimation(deltaTime, controls);
  }

  private isValidDeltaTime(deltaTime: number): boolean {
    return deltaTime > 0 && deltaTime < 1; // Reasonable range
  }

  private isValidControls(controls: Controls): boolean {
    return controls.speed > 0 && controls.speed < 100;
  }
}
```

### 3. Type Safety

#### Use Proper Type Constraints

```typescript
// ✅ Good - proper type constraints
class TypedAnimation<
  TManifest extends AnimationManifest,
  TControlValues extends ManifestToControlValues<TManifest>,
> extends BaseAnimation<TManifest, TControlValues> {
  onUpdate(context: TContext, controls: TControlValues, deltaTime: number) {
    // Fully typed controls
    this.updateWithTypedControls(controls);
  }
}

// ❌ Bad - loose typing
class UntypedAnimation extends BaseAnimation<any, any> {
  onUpdate(context: any, controls: any, deltaTime: number) {
    // No type safety
    this.updateWithUntypedControls(controls);
  }
}
```

#### Leverage Type Inference

```typescript
// ✅ Good - leverage type inference
const manifest = createManifest({
  controls: [
    { name: 'speed', type: 'number', defaultValue: 1 },
    { name: 'color', type: 'color', defaultValue: '#ff0000' },
  ] as const,
} as const);

// TypeScript automatically infers:
// type Controls = { speed: number; color: string; }
```

## User Experience

### 1. Control Design

#### Provide Helpful Descriptions

```typescript
const userFriendlyManifest = createManifest({
  controls: [
    {
      name: 'particleCount',
      type: 'number',
      label: 'Particle Count',
      description:
        'Number of particles in the simulation. Higher values create more detail but may impact performance.',
      defaultValue: 100,
      min: 10,
      max: 1000,
      step: 10,
    },
    {
      name: 'damping',
      type: 'number',
      label: 'Damping',
      description:
        'How quickly particles slow down. Lower values create more fluid motion.',
      defaultValue: 0.95,
      min: 0.8,
      max: 0.99,
      step: 0.01,
    },
  ] as const,
} as const);
```

#### Use Appropriate Control Types

```typescript
// ✅ Good - appropriate control types
{
  name: 'animationMode',
  type: 'select',
  options: [
    { value: 'bounce', label: 'Bounce' },
    { value: 'float', label: 'Float' },
    { value: 'spin', label: 'Spin' },
  ],
  defaultValue: 'bounce',
}

// ❌ Bad - number for discrete options
{
  name: 'animationMode',
  type: 'number',
  defaultValue: 0,
  min: 0,
  max: 2,
  step: 1,
}
```

#### Set Sensible Defaults

```typescript
// ✅ Good - sensible defaults
{
  name: 'speed',
  type: 'number',
  defaultValue: 1, // Normal speed
  min: 0.1,
  max: 10,
}

// ❌ Bad - extreme defaults
{
  name: 'speed',
  type: 'number',
  defaultValue: 0.001, // Too slow
  min: 0.001,
  max: 1000,
}
```

### 2. Performance Considerations

#### Use Visibility-Based Pausing

```typescript
// ✅ Good - pause when not visible
<AnimationStage
  application={application}
  pauseWhenHidden={true}
  visibilityThreshold={0.1}
/>
```

#### Optimize for Mobile

```typescript
class MobileOptimizedAnimation extends BaseAnimation<typeof manifest> {
  private isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  private particleCount: number;

  onInit(context: TContext, controls: Controls) {
    // Reduce particle count on mobile
    this.particleCount = this.isMobile
      ? Math.min(controls.particleCount, 50)
      : controls.particleCount;
  }
}
```

## Testing

### 1. Unit Testing

#### Test Control Validation

```typescript
import { describe, it, expect } from 'vitest';
import { createManifest } from '@bracketbear/flateralus';

describe('Animation Controls', () => {
  it('should validate control values', () => {
    const manifest = createManifest({
      controls: [
        { name: 'speed', type: 'number', defaultValue: 1, min: 0, max: 10 },
      ] as const,
    } as const);

    const animation = new MyAnimation(manifest);

    // Test valid values
    expect(() => animation.updateControls({ speed: 5 })).not.toThrow();

    // Test invalid values
    expect(() => animation.updateControls({ speed: 15 })).toThrow();
    expect(() => animation.updateControls({ speed: -5 })).toThrow();
  });
});
```

#### Test Animation Lifecycle

```typescript
describe('Animation Lifecycle', () => {
  it('should initialize and destroy properly', () => {
    const animation = new MyAnimation(manifest);
    const context = createMockContext();

    // Test initialization
    animation.init(context);
    expect(animation.isInitialized).toBe(true);

    // Test destruction
    animation.destroy();
    expect(animation.isInitialized).toBe(false);
  });
});
```

### 2. Integration Testing

#### Test React Integration

```typescript
import { render, screen } from '@testing-library/react';
import { AnimationStage } from '@bracketbear/flateralus-react';

describe('React Integration', () => {
  it('should render animation stage', () => {
    const application = new PixiApplication();
    const animation = new MyAnimation(manifest);
    application.setAnimation(animation);

    render(<AnimationStage application={application} />);

    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});
```

### 3. Performance Testing

#### Test Frame Rates

```typescript
describe('Performance', () => {
  it('should maintain 60fps', async () => {
    const animation = new MyAnimation(manifest);
    const context = createMockContext();

    animation.init(context);

    const startTime = performance.now();
    let frameCount = 0;

    const testDuration = 1000; // 1 second

    while (performance.now() - startTime < testDuration) {
      animation.update();
      frameCount++;
      await new Promise((resolve) => setTimeout(resolve, 16)); // ~60fps
    }

    const fps = frameCount / (testDuration / 1000);
    expect(fps).toBeGreaterThan(55); // Allow some variance
  });
});
```

## Debugging

### 1. Debug Controls

#### Use Debug Flags

```typescript
const debugManifest = createManifest({
  controls: [
    {
      name: 'showDebugInfo',
      type: 'boolean',
      label: 'Show Debug Info',
      defaultValue: false,
      debug: true,
    },
    {
      name: 'debugLevel',
      type: 'select',
      label: 'Debug Level',
      options: [
        { value: 'none', label: 'None' },
        { value: 'basic', label: 'Basic' },
        { value: 'detailed', label: 'Detailed' },
      ],
      defaultValue: 'none',
      debug: true,
    },
  ] as const,
} as const);
```

#### Add Debug Visualization

```typescript
class DebuggableAnimation extends BaseAnimation<typeof manifest> {
  onUpdate(context: TContext, controls: Controls, deltaTime: number) {
    // Main animation logic
    this.updateAnimation(deltaTime, controls);

    // Debug visualization
    if (controls.showDebugInfo) {
      this.drawDebugInfo(context, controls);
    }
  }

  private drawDebugInfo(context: TContext, controls: Controls) {
    // Draw debug information
    this.graphics!.lineStyle(1, 0xff0000);
    this.graphics!.drawRect(10, 10, 200, 100);

    // Add debug text
    const debugText = `FPS: ${Math.round(1 / deltaTime)}
Particles: ${this.particles.length}
Memory: ${this.getMemoryUsage()}MB`;

    // Draw debug text
    this.drawDebugText(debugText, 20, 20);
  }
}
```

### 2. Logging

#### Use Structured Logging

```typescript
class LoggedAnimation extends BaseAnimation<typeof manifest> {
  private logger = {
    info: (message: string, data?: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Animation] ${message}`, data);
      }
    },
    warn: (message: string, data?: any) => {
      console.warn(`[Animation] ${message}`, data);
    },
    error: (message: string, data?: any) => {
      console.error(`[Animation] ${message}`, data);
    },
  };

  onInit(context: TContext, controls: Controls) {
    this.logger.info('Initializing animation', { controls });
    // Initialization logic
  }

  onUpdate(context: TContext, controls: Controls, deltaTime: number) {
    if (deltaTime > 0.1) {
      this.logger.warn('High delta time detected', { deltaTime });
    }
    // Update logic
  }
}
```

## Documentation

### 1. Code Documentation

#### Document Complex Algorithms

```typescript
class DocumentedAnimation extends BaseAnimation<typeof manifest> {
  /**
   * Updates the particle system using Verlet integration.
   * Verlet integration provides better stability for particle systems
   * compared to Euler integration, especially with large time steps.
   *
   * @param deltaTime - Time step in seconds
   * @param controls - Current control values
   */
  private updateParticlesVerlet(deltaTime: number, controls: Controls) {
    this.particles.forEach((particle) => {
      // Store previous position
      const prevX = particle.x;
      const prevY = particle.y;

      // Calculate acceleration
      const acceleration = this.calculateAcceleration(particle, controls);

      // Verlet integration: x(t+dt) = 2*x(t) - x(t-dt) + a*dt^2
      particle.x =
        2 * particle.x -
        particle.prevX +
        acceleration.x * deltaTime * deltaTime;
      particle.y =
        2 * particle.y -
        particle.prevY +
        acceleration.y * deltaTime * deltaTime;

      // Update previous position
      particle.prevX = prevX;
      particle.prevY = prevY;
    });
  }
}
```

#### Document Control Behavior

```typescript
const wellDocumentedManifest = createManifest({
  controls: [
    {
      name: 'particleCount',
      type: 'number',
      label: 'Particle Count',
      description:
        'Number of particles in the simulation. Increasing this value will create more visual detail but may impact performance. The animation will reset when this value changes.',
      defaultValue: 100,
      min: 10,
      max: 1000,
      step: 10,
      resetsAnimation: true, // Documented behavior
    },
  ] as const,
} as const);
```

### 2. README Documentation

#### Provide Clear Examples

```typescript
// Example usage in README
const exampleManifest = createManifest({
  id: 'example-animation',
  name: 'Example Animation',
  description: 'A simple example animation',
  controls: [
    {
      name: 'speed',
      type: 'number',
      label: 'Speed',
      description: 'Animation speed multiplier',
      defaultValue: 1,
      min: 0.1,
      max: 10,
      step: 0.1,
    },
  ] as const,
} as const);

class ExampleAnimation extends BaseAnimation<typeof exampleManifest> {
  onInit(context: TContext, controls: Controls) {
    // Initialize your animation
  }

  onUpdate(context: TContext, controls: Controls, deltaTime: number) {
    // Update your animation
  }

  onDestroy() {
    // Clean up resources
  }
}
```

## Conclusion

Following these best practices will help you create:

- **Performant animations** that run smoothly at 60fps
- **Maintainable code** that's easy to understand and modify
- **User-friendly controls** that provide a great experience
- **Robust applications** that handle errors gracefully
- **Well-tested code** that works reliably

Remember to:

1. **Profile your animations** to identify performance bottlenecks
2. **Test on different devices** to ensure compatibility
3. **Document complex algorithms** for future maintenance
4. **Use TypeScript** for better type safety and developer experience
5. **Follow the principle of least surprise** in your API design

For more specific guidance, check out the [Examples](./examples.md) and [API Reference](./api-reference.md) sections.
