# PixiJS Inverse Blend Mode

This directory contains custom inverse blend mode implementations for PixiJS v8.

## Files

- `InverseBlendFilter.ts` - Custom filter implementations for inverse blending
- `InverseBlendExample.tsx` - Example component demonstrating different inverse blend modes
- `PointerFX.tsx` - Updated pointer effects component with inverse blend support

## Usage

### Basic Inverse Blend Mode

```tsx
import { PointerFX } from './PointerFX';

// Use default difference blend mode
<PointerFX />

// Enable advanced inverse blend filter
<PointerFX useInverseBlend={true} inverseIntensity={0.8} />
```

### Custom Inverse Blend Filter

```tsx
import { AdvancedInverseBlendFilter } from './InverseBlendFilter';

const graphics = new PIXI.Graphics()
  .circle(100, 100, 50)
  .fill(0xffffff);

const inverseFilter = new AdvancedInverseBlendFilter(0.8);
graphics.filters = [inverseFilter];

// Animate the intensity
app.ticker.add(() => {
  const intensity = 0.5 + 0.5 * Math.sin(Date.now() * 0.001);
  inverseFilter.setIntensity(intensity);
});
```

### Simple Inverse Blend (Performance Optimized)

```tsx
import { SimpleInverseBlend } from './InverseBlendFilter';

const graphics = new PIXI.Graphics()
  .circle(100, 100, 50)
  .fill(0xffffff);

SimpleInverseBlend.apply(graphics);
```

## Blend Mode Options

1. **Difference Blend Mode** (Default) - Uses PixiJS's built-in `difference` blend mode
2. **Advanced Inverse Filter** - Custom shader-based inverse effect with controllable intensity
3. **Custom Inverse Filter** - More complex filter that can sample background textures

## Performance Considerations

- **Difference Blend Mode**: Fastest, uses GPU blending
- **Advanced Inverse Filter**: Moderate performance impact, customizable
- **Custom Inverse Filter**: Highest performance impact, most flexible

## Examples

See `InverseBlendExample.tsx` for a complete demonstration of all inverse blend modes. 