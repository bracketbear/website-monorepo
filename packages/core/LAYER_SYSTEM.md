# Layered Layout System

A type-safe, three-layer layout system for Astro + React applications with strict z-index management and accessibility considerations.

## Overview

The layered layout system provides a structured approach to managing visual layers in web applications, ensuring consistent z-index values and proper content organization.

## Layer Types

The system uses three distinct layers:

1. **Background Layer** (`LAYERS.background`): Fixed positioning, pointer-events: none
   - Used for background effects, particles, and decorative elements
   - Z-index: 0

2. **Content Layer** (`LAYERS.content`): Relative positioning, main page content
   - Contains all primary page content, navigation, and interactive elements
   - Z-index: 10

3. **Foreground Layer** (`LAYERS.foreground`): Fixed positioning, pointer-events: none
   - Used for overlays, modals, tooltips, and UI effects
   - Z-index: 20

## Usage

### TypeScript Types

```typescript
import { LAYERS, type LayerKey, type LayerZ } from '@bracketbear/core';

// Access layer z-index values
const backgroundZ = LAYERS.background; // 0
const contentZ = LAYERS.content;       // 10
const foregroundZ = LAYERS.foreground; // 20

// Type-safe layer operations
type ValidLayer = LayerKey; // 'background' | 'content' | 'foreground'
type ValidZIndex = LayerZ;  // 0 | 10 | 20
```

### Astro Layout

```astro
---
import { LayeredLayout, LAYERS } from '@bracketbear/core';
---

<LayeredLayout>
  <!-- Background slot for effects -->
  <div slot="background" class="z-layer-background">
    <!-- Background effects, particles, etc. -->
  </div>

  <!-- Content slot for main page content -->
  <div slot="content" class="z-layer-content">
    <!-- Navigation, main content, etc. -->
  </div>

  <!-- Foreground slot for overlays -->
  <div slot="foreground" class="z-layer-foreground">
    <!-- Modals, tooltips, notifications, etc. -->
  </div>
</LayeredLayout>
```

### Tailwind CSS Utilities

The system provides Tailwind utilities for each layer:

```html
<div class="z-layer-background">Background content</div>
<div class="z-layer-content">Main content</div>
<div class="z-layer-foreground">Overlay content</div>
```

### React Components

For React components that need to render into specific layers:

```tsx
import { LAYERS } from '@bracketbear/core';

// Use the LAYERS constant for inline styles
<div style={{ zIndex: LAYERS.foreground }}>
  Modal content
</div>
```

## Best Practices

1. **Always use the LAYERS constant** instead of hardcoded z-index values
2. **Keep background effects lightweight** - they shouldn't interfere with user interaction
3. **Use foreground layer sparingly** - only for truly important overlays
4. **Test accessibility** - ensure screen readers can navigate content properly
5. **Consider performance** - background effects should be optimized for smooth animation

## Integration

The layered layout system integrates seamlessly with:

- **Astro**: Use `LayeredLayout.astro` for consistent page structure
- **React**: Use `LAYERS` constant for type-safe z-index management
- **Tailwind CSS**: Use provided utility classes for quick styling
- **TypeScript**: Full type safety for layer operations

## Migration from Old System

If migrating from the previous complex layer system:

1. Replace old layer references with the new three-layer system
2. Update z-index values to use `LAYERS.background`, `LAYERS.content`, or `LAYERS.foreground`
3. Use Tailwind utilities `z-layer-background`, `z-layer-content`, `z-layer-foreground`
4. Remove any references to the old layer variables 