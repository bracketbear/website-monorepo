# React Integration

Flateralus provides seamless React integration through dedicated components and hooks. This guide covers how to use Flateralus animations in React applications.

## Overview

The React integration consists of:

- **AnimationStage Component**: Main component for hosting animations
- **DebugControls Component**: Automatic debug UI generation
- **Hooks**: Custom hooks for animation management
- **Control Components**: Individual control UI components

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
# Core packages
npm install @bracketbear/flateralus @bracketbear/flateralus-pixi @bracketbear/flateralus-react
```

## Basic Usage

### AnimationStage Component

The `AnimationStage` component is the main way to embed Flateralus animations in React:

```typescript
import React, { useMemo } from 'react';
import { AnimationStage } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
// Note: This example assumes you have a blob animation factory function
// import { createBlobAnimation } from '@bracketbear/flateralus-pixi-animations';

function MyAnimationComponent() {
  const application = useMemo(() => {
    const app = new PixiApplication({
      config: {
        autoResize: true,
        backgroundAlpha: 0,
        antialias: true,
      },
    });

    // Create your custom animation here
    // const animation = createBlobAnimation({
    //   scaleFactor: 0.4,
    //   surfaceTension: 0.2,
    //   particleCount: 225,
    //   particleColor: '#47200a',
    // });

    // app.setAnimation(animation);
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
```

### AnimationStage Props

| Prop                     | Type                                   | Default                                   | Description                              |
| ------------------------ | -------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| `application`            | `Application \| null`                  | **required**                              | The animation application instance       |
| `showDebugControls`      | `boolean`                              | `false`                                   | Whether to show debug controls           |
| `showDownloadButton`     | `boolean`                              | `true`                                    | Show download button in debug controls   |
| `className`              | `string`                               | -                                         | Additional CSS classes for the container |
| `debugControlsClassName` | `string`                               | -                                         | CSS classes for debug controls           |
| `canvasClassName`        | `string`                               | -                                         | CSS classes for the canvas element       |
| `pauseWhenHidden`        | `boolean`                              | `true`                                    | Pause animation when not visible         |
| `visibilityThreshold`    | `number`                               | `0.1`                                     | Threshold for visibility detection (0-1) |
| `visibilityRootMargin`   | `string`                               | `'0px'`                                   | Root margin for visibility detection     |
| `layoutClassName`        | `string`                               | `'relative flex h-full w-full items-end'` | Layout classes for main container        |
| `onRandomize`            | `() => void`                           | -                                         | Callback when randomization is triggered |
| `stageControls`          | `Partial<StageControlValues>`          | -                                         | Stage control values                     |
| `onStageControlsChange`  | `(values: StageControlValues) => void` | -                                         | Callback when stage controls change      |

## Hooks

### useAnimationStage

The `useAnimationStage` hook manages the animation lifecycle:

```typescript
import { useAnimationStage } from '@bracketbear/flateralus-react';

function MyComponent() {
  const {
    containerRef,
    application,
    controlValues,
    manifest,
    isInitialized,
    isRunning,
    isVisible,
  } = useAnimationStage({
    application: myApplication,
    pauseWhenHidden: true,
    visibilityThreshold: 0.1,
    canvasClassName: 'my-canvas',
  });

  return (
    <div ref={containerRef} className="h-96 w-full">
      {isInitialized && (
        <div className="absolute top-4 left-4 text-white">
          Status: {isRunning ? 'Running' : 'Paused'}
        </div>
      )}
    </div>
  );
}
```

### useDebugControls

The `useDebugControls` hook manages debug control UI:

```typescript
import { useDebugControls } from '@bracketbear/flateralus-react';

function MyComponent() {
  const {
    debugControlsProps,
    showResetToast,
  } = useDebugControls({
    showDebugControls: true,
    showDownloadButton: true,
    application: myApplication,
    onRandomize: () => console.log('Randomized'),
    stageControls: { backgroundColor: '#000000' },
    onStageControlsChange: (values) => console.log('Stage controls changed', values),
  });

  return (
    <div>
      {debugControlsProps.isVisible && (
        <DebugControls {...debugControlsProps} />
      )}
      {showResetToast && (
        <div className="toast">Animation reset</div>
      )}
    </div>
  );
}
```

### useControls

The `useControls` hook provides access to animation control values:

```typescript
import { useControls } from '@bracketbear/flateralus-react';

function MyComponent() {
  const {
    controlValues,
    updateControls,
    manifest,
  } = useControls(myApplication);

  const handleSpeedChange = (newSpeed: number) => {
    updateControls({ speed: newSpeed });
  };

  return (
    <div>
      <label>
        Speed: {controlValues.speed}
        <input
          type="range"
          min={0}
          max={10}
          step={0.1}
          value={controlValues.speed}
          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
        />
      </label>
    </div>
  );
}
```

## Control Components

### Individual Control Components

Flateralus provides individual control components for custom UI:

```typescript
import {
  NumberControl,
  BooleanControl,
  ColorControl,
  SelectControl,
  GroupControl,
} from '@bracketbear/flateralus-react';

function CustomControlPanel({ application }) {
  const { controlValues, updateControls, manifest } = useControls(application);

  return (
    <div className="control-panel">
      <NumberControl
        control={manifest.controls.find(c => c.name === 'speed')}
        value={controlValues.speed}
        onChange={(value) => updateControls({ speed: value })}
      />

      <ColorControl
        control={manifest.controls.find(c => c.name === 'color')}
        value={controlValues.color}
        onChange={(value) => updateControls({ color: value })}
      />

      <BooleanControl
        control={manifest.controls.find(c => c.name === 'enabled')}
        value={controlValues.enabled}
        onChange={(value) => updateControls({ enabled: value })}
      />
    </div>
  );
}
```

### Control Component Props

All control components accept these props:

```typescript
interface ControlComponentProps {
  control: Control; // The control definition from manifest
  value: any; // Current control value
  onChange: (value: any) => void; // Callback when value changes
  disabled?: boolean; // Whether the control is disabled
  className?: string; // Additional CSS classes
}
```

## Advanced Usage

### Custom Animation Creation

Create custom animations with React integration:

```typescript
import React, { useMemo } from 'react';
import { BaseAnimation, createManifest } from '@bracketbear/flateralus';
import { AnimationStage } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';

const customManifest = createManifest({
  id: 'custom-animation',
  name: 'Custom Animation',
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
    {
      name: 'color',
      type: 'color',
      label: 'Color',
      defaultValue: '#ff0000',
    },
  ] as const,
} as const);

class CustomAnimation extends BaseAnimation<typeof customManifest> {
  private graphics: PIXI.Graphics | null = null;

  onInit(context: PIXI.Application, controls: Controls) {
    this.graphics = new PIXI.Graphics();
    context.stage.addChild(this.graphics);
  }

  onUpdate(context: PIXI.Application, controls: Controls, deltaTime: number) {
    if (!this.graphics) return;

    this.graphics.clear();
    this.graphics.beginFill(controls.color);
    this.graphics.drawCircle(
      context.screen.width / 2,
      context.screen.height / 2,
      50 * controls.speed
    );
    this.graphics.endFill();
  }

  onDestroy() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }
}

function CustomAnimationComponent() {
  const application = useMemo(() => {
    const app = new PixiApplication();
    const animation = new CustomAnimation(customManifest);
    app.setAnimation(animation);
    return app;
  }, []);

  return (
    <AnimationStage
      application={application}
      showDebugControls={true}
      className="h-96 w-full"
    />
  );
}
```

### Stage Controls

Use stage controls for global stage properties:

```typescript
function StageControlledAnimation() {
  const [stageControls, setStageControls] = useState({
    backgroundColor: '#000000',
    backgroundAlpha: 0.5,
    enableGrid: true,
    gridColor: '#ffffff',
    gridOpacity: 0.2,
  });

  const application = useMemo(() => {
    const app = new PixiApplication({
      config: {
        autoResize: true,
        backgroundAlpha: stageControls.backgroundAlpha,
      },
    });

    const animation = createBlobAnimation({
      particleColor: '#ff6b35',
    });

    app.setAnimation(animation);
    return app;
  }, []);

  const handleStageControlsChange = (newControls: StageControlValues) => {
    setStageControls(newControls);
  };

  return (
    <AnimationStage
      application={application}
      showDebugControls={true}
      stageControls={stageControls}
      onStageControlsChange={handleStageControlsChange}
      className="h-96 w-full"
    />
  );
}
```

### Multiple Animations

Handle multiple animations in a single component:

```typescript
function MultipleAnimationsComponent() {
  const [activeAnimation, setActiveAnimation] = useState('blob');

  const applications = useMemo(() => {
    const blobApp = new PixiApplication();
    const blobAnimation = createBlobAnimation({
      particleColor: '#ff6b35',
    });
    blobApp.setAnimation(blobAnimation);

    const particleApp = new PixiApplication();
    const particleAnimation = createParticleAnimation({
      particleColor: '#00ff00',
    });
    particleApp.setAnimation(particleAnimation);

    return {
      blob: blobApp,
      particle: particleApp,
    };
  }, []);

  const currentApplication = applications[activeAnimation];

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => setActiveAnimation('blob')}
          className={activeAnimation === 'blob' ? 'active' : ''}
        >
          Blob Animation
        </button>
        <button
          onClick={() => setActiveAnimation('particle')}
          className={activeAnimation === 'particle' ? 'active' : ''}
        >
          Particle Animation
        </button>
      </div>

      <AnimationStage
        application={currentApplication}
        showDebugControls={true}
        className="h-96 w-full"
      />
    </div>
  );
}
```

## Performance Optimization

### Memoization

Use `useMemo` to prevent unnecessary re-creation of applications:

```typescript
function OptimizedAnimationComponent() {
  const application = useMemo(() => {
    const app = new PixiApplication();
    const animation = createBlobAnimation({
      particleCount: 100,
    });
    app.setAnimation(animation);
    return app;
  }, []); // Empty dependency array - create once

  return (
    <AnimationStage
      application={application}
      showDebugControls={true}
    />
  );
}
```

### Conditional Rendering

Only render animations when needed:

```typescript
function ConditionalAnimationComponent({ showAnimation }: { showAnimation: boolean }) {
  const application = useMemo(() => {
    if (!showAnimation) return null;

    const app = new PixiApplication();
    const animation = createBlobAnimation();
    app.setAnimation(animation);
    return app;
  }, [showAnimation]);

  if (!showAnimation || !application) {
    return <div>Animation not available</div>;
  }

  return (
    <AnimationStage
      application={application}
      showDebugControls={true}
    />
  );
}
```

### Visibility-Based Pausing

Use visibility-based pausing for better performance:

```typescript
function VisibilityOptimizedAnimation() {
  const application = useMemo(() => {
    const app = new PixiApplication();
    const animation = createBlobAnimation();
    app.setAnimation(animation);
    return app;
  }, []);

  return (
    <AnimationStage
      application={application}
      showDebugControls={true}
      pauseWhenHidden={true}
      visibilityThreshold={0.1}
      visibilityRootMargin="0px"
    />
  );
}
```

## Error Handling

### Graceful Error Handling

Handle application creation errors gracefully:

```typescript
function ErrorHandledAnimationComponent() {
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<Application | null>(null);

  useEffect(() => {
    try {
      const app = new PixiApplication();
      const animation = createBlobAnimation();
      app.setAnimation(animation);
      setApplication(app);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  if (error) {
    return (
      <div className="error">
        <h3>Animation Error</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Reload Page
        </button>
      </div>
    );
  }

  if (!application) {
    return <div>Loading animation...</div>;
  }

  return (
    <AnimationStage
      application={application}
      showDebugControls={true}
    />
  );
}
```

## Best Practices

### 1. Application Management

- Use `useMemo` for application creation
- Handle application lifecycle properly
- Clean up resources on unmount
- Handle errors gracefully

### 2. Performance

- Use visibility-based pausing
- Memoize expensive calculations
- Avoid unnecessary re-renders
- Optimize control updates

### 3. User Experience

- Provide loading states
- Handle errors gracefully
- Use appropriate control types
- Provide helpful descriptions

### 4. Code Organization

- Separate animation logic from UI
- Use custom hooks for complex logic
- Keep components focused
- Use TypeScript for type safety

## Next Steps

- Learn about [Creating Animations](./creating-animations.md) for animation implementation
- Explore [Control System](./control-system.md) for advanced control features
- Check out [Applications](./applications.md) for rendering backend details
- See [Examples](./examples.md) for practical examples
