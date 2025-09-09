# Core Concepts

Understanding the core concepts of Flateralus will help you build more effective animations and make better use of the framework's features.

## Architecture Overview

Flateralus follows a layered architecture that separates concerns and enables framework-agnostic animation development:

```
┌─────────────────────────────────────┐
│           React Integration         │
│     (AnimationStage, Hooks)        │
├─────────────────────────────────────┤
│         Rendering Backends          │
│    (PIXI.js, p5.js, Custom)        │
├─────────────────────────────────────┤
│         Core Framework              │
│  (BaseApplication, BaseAnimation)   │
├─────────────────────────────────────┤
│        Control System               │
│    (Schemas, Validation, Types)     │
└─────────────────────────────────────┘
```

## Key Components

### 1. Animation Manifest

The **manifest** is a schema that defines your animation's controls and metadata. It serves as the single source of truth for:

- Available control parameters
- Control types and validation rules
- Default values
- UI labels and descriptions
- Control behavior (reset vs dynamic)

```typescript
const manifest = createManifest({
  id: 'my-animation',
  name: 'My Animation',
  description: 'A custom animation',
  controls: [
    {
      name: 'speed',
      type: 'number',
      label: 'Speed',
      defaultValue: 1,
      min: 0,
      max: 10,
    },
    // ... more controls
  ] as const,
} as const);
```

### 2. BaseAnimation

**BaseAnimation** is the abstract base class that all animations extend. It provides:

- Control value management and validation
- Lifecycle hooks (`onInit`, `onUpdate`, `onDestroy`)
- Control change handling
- Reset vs dynamic update logic

```typescript
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

### 3. BaseApplication

**BaseApplication** manages the rendering context and animation lifecycle. It provides:

- Context creation and management
- Render loop control
- Resize handling
- Stage controls (background, grid, etc.)

```typescript
class MyApplication extends BaseApplication<PIXI.Application> {
  protected async createContext(
    config: ApplicationConfig
  ): Promise<PIXI.Application> {
    // Create and configure rendering context
  }

  protected startRenderLoop(): void {
    // Start the render loop
  }

  protected stopRenderLoop(): void {
    // Stop the render loop
  }

  protected handleResize(width: number, height: number): void {
    // Handle resize events
  }
}
```

## Control System

### Control Types

Flateralus supports five control types:

1. **Number**: Numeric values with min/max/step constraints
2. **Boolean**: True/false values
3. **Color**: Color values (hex strings or numeric)
4. **Select**: Dropdown selections
5. **Group**: Arrays of homogeneous or mixed controls

### Control Behavior

Controls can have two types of behavior:

#### Reset Controls (`resetsAnimation: true`)

- Trigger a complete animation reset when changed
- Use for parameters that require expensive recalculations
- Example: particle count, complex geometry changes

```typescript
{
  name: 'particleCount',
  type: 'number',
  defaultValue: 100,
  resetsAnimation: true, // Animation resets when this changes
}
```

#### Dynamic Controls (default)

- Update the animation in real-time
- Use for parameters that can be smoothly interpolated
- Example: colors, speeds, positions

```typescript
{
  name: 'speed',
  type: 'number',
  defaultValue: 1,
  // No resetsAnimation - updates smoothly
}
```

### Control Validation

All control values are validated using Zod schemas:

- Type safety at compile time
- Runtime validation
- Automatic error handling
- Default value fallbacks

## Rendering Backends

Flateralus supports multiple rendering backends through the adapter pattern:

### PIXI.js Integration

- High-performance 2D graphics
- WebGL acceleration
- Rich graphics API
- Good for complex visual effects

### p5.js Integration

- Creative coding friendly
- Simple API
- Good for generative art
- Canvas-based rendering

### Custom Backends

You can create custom rendering backends by extending `BaseApplication`:

```typescript
class Canvas2DApplication extends BaseApplication<CanvasRenderingContext2D> {
  protected async createContext(
    config: ApplicationConfig
  ): Promise<CanvasRenderingContext2D> {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    return context;
  }

  // ... implement other abstract methods
}
```

## React Integration

The React integration provides components and hooks for seamless integration:

### AnimationStage Component

- Hosts animations in React applications
- Automatic debug controls
- Visibility-based pausing
- Accessibility features

### Hooks

- `useAnimationStage`: Manage animation lifecycle
- `useDebugControls`: Handle debug UI
- `useControls`: Access control values

## Type Safety

Flateralus is built with TypeScript-first principles:

### Manifest-to-Types

Control types are automatically inferred from manifests:

```typescript
const manifest = createManifest({
  controls: [
    { name: 'speed', type: 'number', defaultValue: 1 },
    { name: 'color', type: 'color', defaultValue: '#ff0000' },
  ] as const,
} as const);

// TypeScript automatically infers:
type Controls = {
  speed: number;
  color: string;
};
```

### Generic Constraints

All classes use proper generic constraints for type safety:

```typescript
class MyAnimation<
  TManifest extends AnimationManifest,
  TControlValues extends ManifestToControlValues<TManifest>,
  TContext = unknown,
> extends BaseAnimation<TManifest, TControlValues, TContext> {
  // Fully typed methods and properties
}
```

## Performance Considerations

### Render Loop Optimization

- Animations only update when the application is running
- Automatic pausing when not visible
- Efficient delta time calculations

### Memory Management

- Proper cleanup in `onDestroy` methods
- Automatic resource disposal
- Garbage collection friendly

### Control Updates

- Batched control updates
- Minimal re-renders
- Efficient change detection

## Best Practices

### Manifest Design

- Use descriptive names and labels
- Provide helpful descriptions
- Set appropriate min/max values
- Use `resetsAnimation` judiciously

### Animation Implementation

- Keep `onUpdate` lightweight
- Use delta time for frame-rate independence
- Implement proper cleanup
- Handle edge cases gracefully

### Control Organization

- Group related controls
- Use consistent naming conventions
- Provide sensible defaults
- Consider user experience

## Next Steps

- Learn about [Creating Animations](./creating-animations.md) for implementation details
- Explore the [Control System](./control-system.md) for advanced control features
- Check out [Applications](./applications.md) for rendering backend details
- See [React Integration](./react-integration.md) for React-specific features
