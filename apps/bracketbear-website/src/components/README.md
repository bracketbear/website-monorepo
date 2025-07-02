# Components

## ParticleLogoBackground

A modular particle background system using PixiJS that creates an interactive particle version of the Bracket Bear logo. The system is designed to work with both Astro and React components.

### Architecture

The system consists of three parts:

1. **`ParticleLogoManager`** (`src/utils/particleLogo.ts`) - Core logic and PixiJS implementation
2. **`ParticleLogoBackground.astro`** - Astro component wrapper
3. **`ParticleLogoBackground.tsx`** - React component wrapper

### Features

- **Logo-shaped particles**: Particles are distributed to form the Bracket Bear logo shape
- **15-degree rotation**: The logo is rotated 15 degrees counter-clockwise as requested
- **Mouse repulsion**: Particles move away from the mouse cursor when it gets close
- **Return behavior**: Particles smoothly return to their original positions when the mouse moves away
- **Responsive**: Automatically adjusts to window size changes
- **Touch support**: Works on touch devices as well as mouse
- **PixiJS v8 compatible**: Uses the latest PixiJS API

### Usage

#### Astro Component
```astro
---
import ParticleLogoBackground from '@/components/ParticleLogoBackground.astro';
---

<header class="relative">
  <ParticleLogoBackground />
  <!-- Your content here -->
</header>
```

#### React Component
```tsx
import ParticleLogoBackground from '@/components/ParticleLogoBackground';

export default function MyComponent() {
  return (
    <header className="relative">
      <ParticleLogoBackground />
      {/* Your content here */}
    </header>
  );
}
```

#### Direct Usage
```tsx
import { ParticleLogoManager } from '@/utils/particleLogo';

const canvas = document.getElementById('my-canvas') as HTMLCanvasElement;
const manager = new ParticleLogoManager(canvas, {
  particleCount: 300,
  repulsionRadius: 100,
  // ... other options
});

// Cleanup when done
manager.destroy();
```

### Configuration Options

The `ParticleLogoManager` accepts these configuration options:

- `particleCount`: Number of particles (default: 300)
- `repulsionRadius`: Distance at which particles start repelling (default: 100px)
- `repulsionForce`: Strength of repulsion (default: 0.1)
- `returnForce`: Strength of return to original position (default: 0.05)
- `scale`: Logo scale factor (default: 0.6)
- `alpha`: Base transparency (default: 0.3)

### Technical Details

- Uses PixiJS v8 for high-performance 2D rendering
- Creates particles using simplified geometric shapes that approximate the logo
- Implements physics-based repulsion and return forces
- Optimized for performance with proper cleanup and memory management
- Fallback to simple particles if logo creation fails
- Modular design allows easy integration into different frameworks

### Performance

- Optimized particle count for smooth 60fps performance
- Efficient WebGL rendering with PixiJS
- Proper memory management and cleanup
- Responsive design that adapts to screen size 