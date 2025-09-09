# Type-Safe Group Controls

The Flateralus control system now supports type-safe group controls that can be constrained to only accept specific types of child controls.

## Overview

Group controls allow you to create collections of related controls (e.g., a color palette, dimension settings, feature flags). With the new type-safe system, you can specify what types of controls a group can contain, and TypeScript will enforce this at compile time.

## Basic Usage

### Creating Type-Safe Group Controls

Use the `createGroupControl` factory function to create a group that only accepts specific control types:

```typescript
import { createGroupControl } from '@bracketbear/flateralus/schemas';

// Create a color-only group
const colorPalette = createGroupControl('color', {
  name: 'colorPalette',
  label: 'Color Palette',
  items: [
    {
      name: 'primary',
      type: 'color',
      label: 'Primary Color',
      defaultValue: '#ff0000',
    },
    {
      name: 'secondary',
      type: 'color',
      label: 'Secondary Color',
      defaultValue: '#00ff00',
    },
  ],
  defaultValue: ['#ff0000', '#00ff00'],
});
```

### Pre-built Group Control Schemas

For convenience, pre-built schemas are available for each control type:

```typescript
import {
  ColorGroupControlSchema,
  NumberGroupControlSchema,
  BooleanGroupControlSchema,
  SelectGroupControlSchema,
} from '@bracketbear/flateralus/schemas';

// Use directly
const colorGroup = ColorGroupControlSchema.parse({
  name: 'colors',
  type: 'group',
  value: 'color',
  label: 'Colors',
  items: [
    {
      name: 'main',
      type: 'color',
      label: 'Main Color',
      defaultValue: '#000000',
    },
  ],
  defaultValue: ['#000000'],
});
```

## Supported Group Types

### Color Groups (`value: 'color'`)
- Can only contain color controls
- Useful for color palettes, theme colors, etc.

### Number Groups (`value: 'number'`)
- Can only contain number controls
- Useful for dimensions, positions, sizes, etc.

### Boolean Groups (`value: 'boolean'`)
- Can only contain boolean controls
- Useful for feature flags, toggles, etc.

### Select Groups (`value: 'select'`)
- Can only contain select controls
- Useful for grouped options, themes, etc.

## Type Safety Features

### Compile-Time Type Checking

TypeScript will enforce that group items match the group's value type:

```typescript
const colorGroup = createGroupControl('color', {
  name: 'colors',
  label: 'Colors',
  items: [],
  defaultValue: [],
});

// TypeScript knows this is a color group
const groupType: 'color' = colorGroup.value;

// TypeScript knows items can only be color controls
const firstItem = colorGroup.items[0];
if (firstItem.type === 'color') {
  // TypeScript knows this is a color control
  const colorValue: string = firstItem.defaultValue;
}
```

### Runtime Validation

The schemas also provide runtime validation:

```typescript
import { GroupControlSchema } from '@bracketbear/flateralus/schemas';

function validateGroupControl(control: unknown) {
  const result = GroupControlSchema.safeParse(control);
  
  if (!result.success) {
    console.error('Invalid group control:', result.error);
    return null;
  }

  const groupControl = result.data;
  
  // Validate that items match the group type
  const mismatchedItems = groupControl.items.filter(
    item => item.type !== groupControl.value
  );
  
  if (mismatchedItems.length > 0) {
    console.warn('Found items that don\'t match group type:', mismatchedItems);
  }
  
  return groupControl;
}
```

## Advanced Usage

### Custom Group Control Creation

You can create custom group controls with specific constraints:

```typescript
// Create a dimension group with specific number constraints
const dimensionGroup = createGroupControl('number', {
  name: 'dimensions',
  label: 'Dimensions',
  items: [
    {
      name: 'width',
      type: 'number',
      label: 'Width',
      defaultValue: 100,
      min: 0,
      max: 1000,
      step: 1,
    },
    {
      name: 'height',
      type: 'number',
      label: 'Height',
      defaultValue: 100,
      min: 0,
      max: 1000,
      step: 1,
    },
  ],
  defaultValue: [100, 100],
  minItems: 2,
  maxItems: 4,
});
```

### Animation Manifest Integration

Group controls integrate seamlessly with animation manifests:

```typescript
import { AnimationManifestSchema } from '@bracketbear/flateralus/schemas';

const manifest = AnimationManifestSchema.parse({
  id: 'my-animation',
  name: 'My Animation',
  description: 'An animation with type-safe group controls',
  controls: [
    // Individual controls
    {
      name: 'speed',
      type: 'number',
      label: 'Speed',
      defaultValue: 1.0,
    },
    // Group controls
    colorPalette,
    dimensionGroup,
  ],
});
```

## Type Exports

The following types are available for advanced usage:

```typescript
import type {
  GroupControl,
  GroupControlValue,
  GroupControlItems,
  Control,
  AnimationManifest,
} from '@bracketbear/flateralus/schemas';

// Extract the value type from a group control
type MyGroupValue = GroupControlValue<typeof myGroupControl>;

// Extract the item type from a group control
type MyGroupItem = GroupControlItems<typeof myGroupControl>;
```

## Migration from Legacy Group Controls

If you have existing group controls, you can migrate them by adding the `value` field:

```typescript
// Before (legacy)
const oldGroup = {
  name: 'colors',
  type: 'group',
  label: 'Colors',
  items: [...],
  defaultValue: [...],
};

// After (type-safe)
const newGroup = createGroupControl('color', {
  name: 'colors',
  label: 'Colors',
  items: [...],
  defaultValue: [...],
});
```

## Best Practices

1. **Use the factory function**: `createGroupControl()` provides the best type safety
2. **Be specific with value types**: Choose the most restrictive value that fits your use case
3. **Validate at runtime**: Use the schemas for runtime validation in addition to compile-time checking
4. **Group related controls**: Use groups to organize related controls logically
5. **Set appropriate constraints**: Use `minItems` and `maxItems` to control group size

## Examples

See `controls.example.ts` for comprehensive examples of how to use the type-safe group control system.
