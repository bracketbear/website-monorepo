# Flateralus P5 Animations

A collection of p5.js animations for the Flateralus framework.

## Installation

```bash
npm install @bracketbear/flateralus-p5-animations
```

## Usage

```typescript
import {
  RandomWalkerAnimation,
  randomWalkerManifest,
} from '@bracketbear/flateralus-p5-animations';
import { P5Application } from '@bracketbear/flateralus-p5';

const app = new P5Application({ config: { width: 800, height: 600 } });
const animation = new RandomWalkerAnimation(randomWalkerManifest);
app.setAnimation(animation);
```
