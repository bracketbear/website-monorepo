# Control System

The Flateralus control system is the heart of the framework, providing a schema-driven approach to animation parameters. This guide covers all aspects of the control system, from basic controls to advanced group controls.

## Overview

The control system consists of several key components:

- **Control Schemas**: Define the structure and validation rules for controls
- **Control Types**: Different types of controls (number, boolean, color, select, group)
- **Control Values**: The actual data associated with controls
- **Control Behavior**: How controls affect animations (reset vs dynamic)
- **Validation**: Runtime and compile-time validation of control values

## Control Types

### Number Controls

Number controls handle numeric values with optional constraints:

```typescript
{
  name: 'speed',
  type: 'number',
  label: 'Speed',
  description: 'Animation speed multiplier',
  defaultValue: 1,
  min: 0.1,
  max: 10,
  step: 0.1,
  debug: true,
  resetsAnimation: false,
}
```

**Properties:**

- `min`: Minimum allowed value
- `max`: Maximum allowed value
- `step`: Step size for UI controls
- `defaultValue`: Initial value

**TypeScript Type:** `number`

### Boolean Controls

Boolean controls handle true/false values:

```typescript
{
  name: 'enableTrails',
  type: 'boolean',
  label: 'Enable Trails',
  description: 'Show particle trails',
  defaultValue: false,
  debug: true,
  resetsAnimation: false,
}
```

**Properties:**

- `defaultValue`: Initial boolean value

**TypeScript Type:** `boolean`

### Color Controls

Color controls handle color values:

```typescript
{
  name: 'particleColor',
  type: 'color',
  label: 'Particle Color',
  description: 'Color of the particles',
  defaultValue: '#ff6b35',
  debug: true,
  resetsAnimation: false,
}
```

**Properties:**

- `defaultValue`: Initial color (hex string or numeric)

**TypeScript Type:** `string | number`

### Select Controls

Select controls provide dropdown options:

```typescript
{
  name: 'animationMode',
  type: 'select',
  label: 'Animation Mode',
  description: 'Type of animation to play',
  options: [
    { value: 'bounce', label: 'Bounce' },
    { value: 'float', label: 'Float' },
    { value: 'spin', label: 'Spin' },
    { value: 'pulse', label: 'Pulse' },
  ],
  defaultValue: 'bounce',
  debug: true,
  resetsAnimation: true,
}
```

**Properties:**

- `options`: Array of value/label pairs
- `defaultValue`: Initial selected value

**TypeScript Type:** `string`

### Group Controls

Group controls allow arrays of related controls. There are two types:

#### Homogeneous Groups

All items in the group have the same control type:

```typescript
{
  name: 'particleSizes',
  type: 'group',
  label: 'Particle Sizes',
  description: 'Array of particle sizes',
  value: 'number', // All items are numbers
  items: [
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
    { type: 'number', value: 5, metadata: { min: 1, max: 20 } },
    { type: 'number', value: 10, metadata: { min: 1, max: 20 } },
    { type: 'number', value: 15, metadata: { min: 1, max: 20 } },
  ],
  minItems: 1,
  maxItems: 10,
  static: false,
  debug: true,
  resetsAnimation: true,
}
```

#### Mixed Groups

Items can have different control types:

```typescript
{
  name: 'particleConfigs',
  type: 'group',
  label: 'Particle Configurations',
  description: 'Complex particle configurations',
  value: 'mixed',
  items: [
    {
      name: 'color',
      controlType: 'color',
      defaultValue: '#ffffff',
    },
    {
      name: 'size',
      controlType: 'number',
      defaultValue: 5,
    },
    {
      name: 'enabled',
      controlType: 'boolean',
      defaultValue: true,
    },
  ],
  defaultValue: [
    { type: 'color', value: '#ffffff' },
    { type: 'number', value: 5 },
    { type: 'boolean', value: true },
  ],
  minItems: 1,
  maxItems: 5,
  debug: true,
  resetsAnimation: true,
}
```

**Group Properties:**

- `value`: Type of group ('number', 'boolean', 'color', 'select', or 'mixed')
- `items`: Template for group items
- `defaultValue`: Initial array of values
- `minItems`: Minimum number of items
- `maxItems`: Maximum number of items
- `static`: Whether the group size is fixed

**TypeScript Type:** `Array<ControlValue>`

## Control Behavior

### Reset Controls

Controls marked with `resetsAnimation: true` trigger a complete animation reset when changed:

```typescript
{
  name: 'particleCount',
  type: 'number',
  defaultValue: 100,
  resetsAnimation: true, // Animation resets when this changes
}
```

**When to use reset controls:**

- Parameters that require expensive recalculations
- Changes that affect the fundamental structure of the animation
- Parameters that can't be smoothly interpolated

**Examples:**

- Particle count
- Grid resolution
- Complex geometry changes
- Algorithm selection

### Dynamic Controls

Controls without `resetsAnimation` (or with `resetsAnimation: false`) update the animation in real-time:

```typescript
{
  name: 'speed',
  type: 'number',
  defaultValue: 1,
  // No resetsAnimation - updates smoothly
}
```

**When to use dynamic controls:**

- Parameters that can be smoothly interpolated
- Visual properties that don't require recalculation
- Parameters that affect ongoing behavior

**Examples:**

- Colors
- Speeds and rates
- Opacity and transparency
- Scale and rotation

## Control Validation

### Schema Validation

All control values are validated using Zod schemas:

```typescript
import { z } from 'zod';

const NumberControlSchema = z.object({
  name: z.string(),
  type: z.literal('number'),
  defaultValue: z.number(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
});

const manifest = createManifest({
  controls: [
    {
      name: 'speed',
      type: 'number',
      defaultValue: 1,
      min: 0,
      max: 10,
    },
  ] as const,
} as const);
```

### Runtime Validation

Control values are validated at runtime:

```typescript
class MyAnimation extends BaseAnimation<typeof manifest> {
  updateControls(values: Partial<Controls>) {
    // Values are automatically validated
    // Invalid values will throw an error
    super.updateControls(values);
  }
}
```

### Type Safety

TypeScript provides compile-time type safety:

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

## Working with Control Values

### Accessing Control Values

```typescript
class MyAnimation extends BaseAnimation<typeof manifest> {
  onUpdate(context: TContext, controls: Controls, deltaTime: number) {
    // Access individual control values
    const speed = controls.speed;
    const color = controls.color;

    // Use control values in your animation logic
    this.updateAnimation(speed, color);
  }
}
```

### Updating Control Values

```typescript
// Update controls programmatically
animation.updateControls({
  speed: 2,
  color: '#00ff00',
});

// Update single control
animation.updateControls({
  speed: 3,
});
```

### Control Change Detection

```typescript
class MyAnimation extends BaseAnimation<typeof manifest> {
  protected onDynamicControlsChange(
    controls: Controls,
    previousControls: Controls,
    changedControls: string[]
  ) {
    // Handle specific control changes
    if (changedControls.includes('speed')) {
      this.updateSpeed(controls.speed);
    }

    if (changedControls.includes('color')) {
      this.updateColor(controls.color);
    }
  }

  protected onReset(context: TContext, controls: Controls) {
    // Handle animation reset
    this.recreateParticles(controls.particleCount);
  }
}
```

## Advanced Control Patterns

### Conditional Controls

Create controls that depend on other controls:

```typescript
const conditionalManifest = createManifest({
  id: 'conditional-controls',
  name: 'Conditional Controls',
  description: 'Controls that depend on other controls',
  controls: [
    {
      name: 'enableAdvanced',
      type: 'boolean',
      label: 'Enable Advanced',
      defaultValue: false,
    },
    {
      name: 'advancedSetting',
      type: 'number',
      label: 'Advanced Setting',
      defaultValue: 1,
      min: 0,
      max: 10,
      // This control is only relevant when enableAdvanced is true
    },
  ] as const,
} as const);

class ConditionalAnimation extends BaseAnimation<typeof conditionalManifest> {
  protected onDynamicControlsChange(
    controls: Controls,
    previousControls: Controls,
    changedControls: string[]
  ) {
    if (changedControls.includes('enableAdvanced')) {
      // Show/hide advanced controls in UI
      this.updateAdvancedControls(controls.enableAdvanced);
    }

    if (
      changedControls.includes('advancedSetting') &&
      controls.enableAdvanced
    ) {
      // Only apply advanced setting if enabled
      this.applyAdvancedSetting(controls.advancedSetting);
    }
  }
}
```

### Control Groups and Categories

Organize related controls:

```typescript
const categorizedManifest = createManifest({
  id: 'categorized-controls',
  name: 'Categorized Controls',
  description: 'Controls organized by category',
  controls: [
    // Appearance controls
    {
      name: 'color',
      type: 'color',
      label: 'Color',
      defaultValue: '#ff0000',
      category: 'appearance',
    },
    {
      name: 'opacity',
      type: 'number',
      label: 'Opacity',
      defaultValue: 1,
      min: 0,
      max: 1,
      step: 0.01,
      category: 'appearance',
    },

    // Behavior controls
    {
      name: 'speed',
      type: 'number',
      label: 'Speed',
      defaultValue: 1,
      min: 0,
      max: 10,
      category: 'behavior',
    },
    {
      name: 'direction',
      type: 'select',
      label: 'Direction',
      options: [
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' },
        { value: 'up', label: 'Up' },
        { value: 'down', label: 'Down' },
      ],
      defaultValue: 'right',
      category: 'behavior',
    },
  ] as const,
} as const);
```

### Control Presets

Create preset control configurations:

```typescript
const presetManifest = createManifest({
  id: 'preset-controls',
  name: 'Preset Controls',
  description: 'Controls with preset configurations',
  controls: [
    {
      name: 'preset',
      type: 'select',
      label: 'Preset',
      options: [
        { value: 'default', label: 'Default' },
        { value: 'fast', label: 'Fast' },
        { value: 'slow', label: 'Slow' },
        { value: 'colorful', label: 'Colorful' },
      ],
      defaultValue: 'default',
      resetsAnimation: true,
    },
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

class PresetAnimation extends BaseAnimation<typeof presetManifest> {
  protected onReset(context: TContext, controls: Controls) {
    // Apply preset configuration
    switch (controls.preset) {
      case 'fast':
        this.updateControls({ speed: 5, color: '#00ff00' });
        break;
      case 'slow':
        this.updateControls({ speed: 0.5, color: '#0000ff' });
        break;
      case 'colorful':
        this.updateControls({ speed: 2, color: '#ff00ff' });
        break;
      default:
        this.updateControls({ speed: 1, color: '#ff0000' });
    }
  }
}
```

## Control Utilities

### Control Helpers

Flateralus provides utility functions for working with controls:

```typescript
import {
  getManifestDefaultControlValues,
  createControlValuesSchema,
  validateManifest,
  randomizeControls,
} from '@bracketbear/flateralus';

// Get default values from manifest
const defaults = getManifestDefaultControlValues(manifest);

// Create validation schema
const schema = createControlValuesSchema(manifest);

// Validate manifest
const isValid = validateManifest(manifest);

// Randomize control values
const randomized = randomizeControls(manifest);
```

### Control Serialization

Serialize and deserialize control values:

```typescript
// Save control values
const controlValues = animation.getControlValues();
localStorage.setItem('animationControls', JSON.stringify(controlValues));

// Load control values
const saved = localStorage.getItem('animationControls');
if (saved) {
  const parsed = JSON.parse(saved);
  animation.updateControls(parsed);
}
```

## Best Practices

### 1. Control Design

- Use descriptive names and labels
- Provide helpful descriptions
- Set appropriate min/max values
- Use consistent naming conventions

### 2. Control Behavior

- Use `resetsAnimation` judiciously
- Group related controls
- Provide sensible defaults
- Consider user experience

### 3. Performance

- Minimize control changes
- Use efficient validation
- Cache expensive calculations
- Optimize control update logic

### 4. Type Safety

- Use `as const` for manifests
- Leverage TypeScript inference
- Validate at runtime
- Handle edge cases gracefully

## Next Steps

- Learn about [Creating Animations](./creating-animations.md) for implementation details
- Explore [Applications](./applications.md) for rendering backend details
- Check out [React Integration](./react-integration.md) for React-specific features
- See [Examples](./examples.md) for practical examples
