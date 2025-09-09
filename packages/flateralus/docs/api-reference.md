# API Reference

Complete API reference for the Flateralus animation framework.

## Core Types

### AnimationManifest

```typescript
interface AnimationManifest {
  id: string;
  name: string;
  description: string;
  controls: ReadonlyArray<Control>;
}
```

### Control Types

```typescript
type Control =
  | NumberControl
  | BooleanControl
  | ColorControl
  | SelectControl
  | GroupControl;

interface NumberControl {
  name: string;
  type: 'number';
  label?: string;
  description?: string;
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
  debug?: boolean;
  resetsAnimation?: boolean;
}

interface BooleanControl {
  name: string;
  type: 'boolean';
  label?: string;
  description?: string;
  defaultValue: boolean;
  debug?: boolean;
  resetsAnimation?: boolean;
}

interface ColorControl {
  name: string;
  type: 'color';
  label?: string;
  description?: string;
  defaultValue: string | number;
  debug?: boolean;
  resetsAnimation?: boolean;
}

interface SelectControl {
  name: string;
  type: 'select';
  label?: string;
  description?: string;
  options: Array<{ value: string; label: string }>;
  defaultValue: string;
  debug?: boolean;
  resetsAnimation?: boolean;
}

interface GroupControl {
  name: string;
  type: 'group';
  label?: string;
  description?: string;
  value: 'number' | 'boolean' | 'color' | 'select' | 'mixed';
  items: ReadonlyArray<Control>;
  defaultValue: ReadonlyArray<ControlValue>;
  minItems?: number;
  maxItems?: number;
  static?: boolean;
  debug?: boolean;
  resetsAnimation?: boolean;
}
```

### Control Values

```typescript
interface ControlValue {
  type: string;
  value: string | number | boolean;
  metadata?: Record<string, any>;
}

type ControlValues = Record<string, ControlValueTypes>;
type ControlValueTypes =
  | string
  | number
  | boolean
  | ReadonlyArray<ControlValue>;
```

## Core Classes

### BaseAnimation

Abstract base class for all animations.

```typescript
abstract class BaseAnimation<
  TManifest extends AnimationManifest,
  TControlValues extends ManifestToControlValues<TManifest> = ManifestToControlValues<TManifest>,
  TContext = unknown
> implements Animation<TControlValues, TContext>
```

#### Constructor

```typescript
constructor(
  manifest: TManifest,
  initialControls?: Partial<TControlValues>,
  onControlsUpdated?: (values: TControlValues) => void
)
```

#### Methods

```typescript
// Lifecycle methods (must be implemented)
abstract onInit(context: TContext, controls: TControlValues): void;
abstract onUpdate(context: TContext, controls: TControlValues, deltaTime: number): void;
abstract onDestroy(): void;

// Control management
getManifest(): TManifest;
getControlValues(): TControlValues;
updateControls(values: Partial<TControlValues>): void;
setOnControlsUpdated(callback?: (values: TControlValues) => void): void;

// Animation lifecycle
init(context: TContext): void;
update(): void;
reset(controls?: Partial<TControlValues>): void;
destroy(): void;

// Control change handling (can be overridden)
onControlsChange(controls: TControlValues, previousControls: TControlValues): void;
protected onDynamicControlsChange(
  controls: TControlValues,
  previousControls: TControlValues,
  changedControls: string[]
): void;
protected onReset(context: TContext, controls: TControlValues): void;
```

### BaseApplication

Abstract base class for all applications.

```typescript
abstract class BaseApplication<TContext = unknown>
  implements Application<Animation<any, TContext>>
```

#### Constructor

```typescript
constructor(options: ApplicationOptions = {})
```

#### Methods

```typescript
// Abstract methods (must be implemented)
protected abstract createContext(config: ApplicationConfig): Promise<TContext>;
protected abstract startRenderLoop(): void;
protected abstract stopRenderLoop(): void;
protected abstract handleResize(width: number, height: number): void;
public abstract getCanvas(): HTMLCanvasElement | null;
public abstract getStageControlsManifest(): StageControlsManifest;
protected abstract onStageControlsChange(
  controls: StageControlValues,
  previousControls: StageControlValues
): void;

// Application lifecycle
init(container: HTMLElement | HTMLCanvasElement): Promise<void>;
start(): void;
stop(): void;
pause(): void;
resume(): void;
destroy(): void;

// State queries
isRunning(): boolean;
isInitialized(): boolean;

// Animation management
getAnimation(): Animation<any, TContext> | null;
setAnimation(animation: Animation<any, TContext> | null): void;

// Context access
getContext(): TContext;

// Stage controls
getStageControlValues(): StageControlValues;
updateStageControls(values: Partial<StageControlValues>): void;
```

## Utility Functions

### Manifest Creation

```typescript
function createManifest<T extends AnimationManifest>(manifest: T): T;
```

Creates a deeply readonly manifest with proper type inference.

### Control Value Management

```typescript
function getManifestDefaultControlValues<TManifest extends AnimationManifest>(
  manifest: TManifest
): ManifestToControlValues<TManifest>;

function createControlValuesSchema<TManifest extends AnimationManifest>(
  manifest: TManifest
): z.ZodSchema<ManifestToControlValues<TManifest>>;

function validateManifest(manifest: AnimationManifest): boolean;

function randomizeControls<TManifest extends AnimationManifest>(
  manifest: TManifest
): ManifestToControlValues<TManifest>;
```

### Control Helpers

```typescript
function getChangedControls(
  controls: ControlValues,
  previousControls: ControlValues
): string[];

function hasControlChanged<K extends keyof ControlValues>(
  controls: ControlValues,
  previousControls: ControlValues,
  key: K
): boolean;
```

## Rendering Backends

### PixiApplication

PIXI.js implementation of BaseApplication.

```typescript
class PixiApplication extends BaseApplication<PixiApp>
```

#### Constructor

```typescript
constructor(options: ApplicationOptions = {})
```

#### Methods

```typescript
getPixiApp(): PixiApp | null;
getCanvas(): HTMLCanvasElement | null;
getStageControlsManifest(): StageControlsManifest;
```

### P5Application

p5.js implementation of BaseApplication.

```typescript
class P5Application extends BaseApplication<p5>
```

#### Constructor

```typescript
constructor(options: ApplicationOptions = {})
```

#### Methods

```typescript
getP5Instance(): p5 | null;
getCanvas(): HTMLCanvasElement | null;
getStageControlsManifest(): StageControlsManifest;
```

## React Integration

### AnimationStage Component

```typescript
interface AnimationStageProps {
  application: Application | null;
  showDebugControls?: boolean;
  showDownloadButton?: boolean;
  className?: string;
  debugControlsClassName?: string;
  canvasClassName?: string;
  pauseWhenHidden?: boolean;
  visibilityThreshold?: number;
  visibilityRootMargin?: string;
  layoutClassName?: string;
  onRandomize?: () => void;
  stageControls?: Partial<StageControlValues>;
  onStageControlsChange?: (values: StageControlValues) => void;
}

function AnimationStage(props: AnimationStageProps): JSX.Element;
```

### Hooks

#### useAnimationStage

```typescript
interface UseAnimationStageOptions {
  application: Application | null;
  pauseWhenHidden?: boolean;
  visibilityThreshold?: number;
  visibilityRootMargin?: string;
  canvasClassName?: string;
}

interface UseAnimationStageReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  application: Application | null;
  controlValues: ControlValues;
  manifest: AnimationManifest | undefined;
  isInitialized: boolean;
  isRunning: boolean;
  isVisible: boolean;
}

function useAnimationStage(
  options: UseAnimationStageOptions
): UseAnimationStageReturn;
```

#### useDebugControls

```typescript
interface UseDebugControlsOptions {
  showDebugControls: boolean;
  showDownloadButton?: boolean;
  application: Application;
  onRandomize?: () => void;
  stageControls?: Partial<StageControlValues>;
  onStageControlsChange?: (values: StageControlValues) => void;
}

interface UseDebugControlsReturn {
  debugControlsProps: DebugControlsProps;
  showResetToast: boolean;
}

function useDebugControls(
  options: UseDebugControlsOptions
): UseDebugControlsReturn;
```

#### useControls

```typescript
interface UseControlsReturn {
  controlValues: ControlValues;
  updateControls: (values: Partial<ControlValues>) => void;
  manifest: AnimationManifest | undefined;
  isInitialized: boolean;
}

function useControls(application: Application | null): UseControlsReturn;
```

### Control Components

#### NumberControl

```typescript
interface NumberControlProps {
  control: NumberControl;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

function NumberControl(props: NumberControlProps): JSX.Element;
```

#### BooleanControl

```typescript
interface BooleanControlProps {
  control: BooleanControl;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
}

function BooleanControl(props: BooleanControlProps): JSX.Element;
```

#### ColorControl

```typescript
interface ColorControlProps {
  control: ColorControl;
  value: string | number;
  onChange: (value: string | number) => void;
  disabled?: boolean;
  className?: string;
}

function ColorControl(props: ColorControlProps): JSX.Element;
```

#### SelectControl

```typescript
interface SelectControlProps {
  control: SelectControl;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

function SelectControl(props: SelectControlProps): JSX.Element;
```

#### GroupControl

```typescript
interface GroupControlProps {
  control: GroupControl;
  value: ReadonlyArray<ControlValue>;
  onChange: (value: ReadonlyArray<ControlValue>) => void;
  disabled?: boolean;
  className?: string;
}

function GroupControl(props: GroupControlProps): JSX.Element;
```

## Type Utilities

### ManifestToControlValues

```typescript
type ManifestToControlValues<TManifest extends AnimationManifest> = {
  [TControl in TManifest['controls'][number] as TControl['name']]: ControlValueType<TControl>;
};
```

### ControlValueType

```typescript
type ControlValueType<C extends HasControlType> =
  C['type'] extends keyof ControlTypeToValueTypeMap
    ? ControlTypeToValueTypeMap[C['type']]
    : never;
```

### AnimationFactory

```typescript
type AnimationFactory<TAnimation extends Animation> = (
  controls?: Partial<AnimationControlValues<TAnimation>>
) => TAnimation;
```

### ApplicationFactory

```typescript
type ApplicationFactory<TApplication extends Application> = (
  options?: any
) => TApplication;
```

## Error Handling

### Common Errors

#### Invalid Control Values

```typescript
// Thrown when control values don't match the manifest schema
class ValidationError extends Error {
  constructor(
    message: string,
    public errors: z.ZodError
  ) {
    super(message);
  }
}
```

#### Application Not Initialized

```typescript
// Thrown when trying to use an uninitialized application
class ApplicationNotInitializedError extends Error {
  constructor() {
    super('Application not initialized');
  }
}
```

#### Context Creation Failed

```typescript
// Thrown when rendering context creation fails
class ContextCreationError extends Error {
  constructor(
    message: string,
    public originalError: Error
  ) {
    super(message);
  }
}
```

## Performance Considerations

### Memory Management

- Always call `destroy()` on applications and animations
- Implement proper cleanup in `onDestroy()` methods
- Use object pooling for frequently created/destroyed objects
- Monitor memory usage in development

### Render Loop Optimization

- Use delta time for frame-rate independent animations
- Throttle expensive operations
- Only update when necessary
- Use visibility-based pausing

### Control Updates

- Use `resetsAnimation` judiciously
- Batch control updates when possible
- Minimize unnecessary re-renders
- Cache expensive calculations

## Best Practices

### 1. Type Safety

- Use `as const` for manifests
- Leverage TypeScript inference
- Validate at runtime
- Handle edge cases gracefully

### 2. Performance

- Optimize render loops
- Use efficient update mechanisms
- Implement proper cleanup
- Monitor frame rates

### 3. Error Handling

- Handle context creation failures
- Gracefully handle render loop errors
- Provide meaningful error messages
- Implement fallback mechanisms

### 4. Code Organization

- Separate concerns (rendering, logic, data)
- Use meaningful variable names
- Add comments for complex algorithms
- Handle edge cases gracefully
