# Examples

This section provides practical examples of Flateralus animations, from simple to complex. Each example includes complete code and explanations.

## Basic Examples

### 1. Simple Bouncing Ball

A basic bouncing ball animation with customizable properties.

```typescript
import { BaseAnimation, createManifest } from '@bracketbear/flateralus';
import { Application as PixiApp } from 'pixi.js';

const bouncingBallManifest = createManifest({
  id: 'bouncing-ball',
  name: 'Bouncing Ball',
  description: 'A simple bouncing ball animation',
  controls: [
    {
      name: 'speed',
      type: 'number',
      label: 'Speed',
      defaultValue: 2,
      min: 0.1,
      max: 10,
      step: 0.1,
    },
    {
      name: 'ballColor',
      type: 'color',
      label: 'Ball Color',
      defaultValue: '#ff6b35',
    },
    {
      name: 'ballSize',
      type: 'number',
      label: 'Ball Size',
      defaultValue: 20,
      min: 5,
      max: 50,
      step: 1,
    },
    {
      name: 'gravity',
      type: 'number',
      label: 'Gravity',
      defaultValue: 0.5,
      min: 0,
      max: 2,
      step: 0.1,
    },
  ] as const,
} as const);

class BouncingBallAnimation extends BaseAnimation<typeof bouncingBallManifest> {
  private ball: PIXI.Graphics | null = null;
  private velocityY = 0;
  private ballY = 0;

  onInit(context: PixiApp, controls: Controls) {
    this.ball = new PIXI.Graphics();
    context.stage.addChild(this.ball);
    this.ballY = 100;
    this.velocityY = 0;
  }

  onUpdate(context: PixiApp, controls: Controls, deltaTime: number) {
    if (!this.ball) return;

    // Apply gravity
    this.velocityY += controls.gravity * deltaTime * 60;

    // Update position
    this.ballY += this.velocityY * controls.speed * deltaTime * 60;

    // Bounce off the bottom
    if (this.ballY > context.screen.height - controls.ballSize) {
      this.ballY = context.screen.height - controls.ballSize;
      this.velocityY = -this.velocityY * 0.8; // Damping
    }

    // Bounce off the top
    if (this.ballY < controls.ballSize) {
      this.ballY = controls.ballSize;
      this.velocityY = Math.abs(this.velocityY);
    }

    // Clear and redraw the ball
    this.ball.clear();
    this.ball.beginFill(controls.ballColor);
    this.ball.drawCircle(
      context.screen.width / 2,
      this.ballY,
      controls.ballSize
    );
    this.ball.endFill();
  }

  onDestroy() {
    if (this.ball) {
      this.ball.destroy();
      this.ball = null;
    }
  }
}
```

### 2. Rotating Shapes

An animation with multiple rotating shapes.

```typescript
const rotatingShapesManifest = createManifest({
  id: 'rotating-shapes',
  name: 'Rotating Shapes',
  description: 'Multiple shapes rotating around a center point',
  controls: [
    {
      name: 'rotationSpeed',
      type: 'number',
      label: 'Rotation Speed',
      defaultValue: 1,
      min: 0,
      max: 5,
      step: 0.1,
    },
    {
      name: 'shapeCount',
      type: 'number',
      label: 'Shape Count',
      defaultValue: 6,
      min: 3,
      max: 12,
      step: 1,
      resetsAnimation: true,
    },
    {
      name: 'shapeColor',
      type: 'color',
      label: 'Shape Color',
      defaultValue: '#00ff00',
    },
    {
      name: 'shapeSize',
      type: 'number',
      label: 'Shape Size',
      defaultValue: 30,
      min: 10,
      max: 100,
      step: 5,
    },
  ] as const,
} as const);

class RotatingShapesAnimation extends BaseAnimation<
  typeof rotatingShapesManifest
> {
  private shapes: PIXI.Graphics[] = [];
  private time = 0;

  onInit(context: PixiApp, controls: Controls) {
    this.createShapes(controls, context);
  }

  onUpdate(context: PixiApp, controls: Controls, deltaTime: number) {
    this.time += deltaTime;

    this.shapes.forEach((shape, index) => {
      const angle =
        this.time * controls.rotationSpeed +
        (index * Math.PI * 2) / controls.shapeCount;
      const centerX = context.screen.width / 2;
      const centerY = context.screen.height / 2;
      const radius = Math.min(context.screen.width, context.screen.height) / 3;

      shape.x = centerX + Math.cos(angle) * radius;
      shape.y = centerY + Math.sin(angle) * radius;
      shape.rotation = angle;
    });
  }

  onDestroy() {
    this.shapes.forEach((shape) => shape.destroy());
    this.shapes = [];
  }

  private createShapes(controls: Controls, context: PixiApp) {
    this.shapes.forEach((shape) => shape.destroy());
    this.shapes = [];

    for (let i = 0; i < controls.shapeCount; i++) {
      const shape = new PIXI.Graphics();
      shape.beginFill(controls.shapeColor);
      shape.drawRect(
        -controls.shapeSize / 2,
        -controls.shapeSize / 2,
        controls.shapeSize,
        controls.shapeSize
      );
      shape.endFill();

      context.stage.addChild(shape);
      this.shapes.push(shape);
    }
  }

  protected onReset(context: PixiApp, controls: Controls) {
    this.createShapes(controls, context);
  }
}
```

## Intermediate Examples

### 3. Particle System

A configurable particle system with physics.

```typescript
const particleSystemManifest = createManifest({
  id: 'particle-system',
  name: 'Particle System',
  description: 'A configurable particle system with physics',
  controls: [
    {
      name: 'particleCount',
      type: 'number',
      label: 'Particle Count',
      defaultValue: 100,
      min: 10,
      max: 1000,
      step: 10,
      resetsAnimation: true,
    },
    {
      name: 'speed',
      type: 'number',
      label: 'Speed',
      defaultValue: 2,
      min: 0.1,
      max: 10,
      step: 0.1,
    },
    {
      name: 'particleColor',
      type: 'color',
      label: 'Particle Color',
      defaultValue: '#ff6b35',
    },
    {
      name: 'particleSize',
      type: 'number',
      label: 'Particle Size',
      defaultValue: 3,
      min: 1,
      max: 20,
      step: 0.5,
    },
    {
      name: 'gravity',
      type: 'number',
      label: 'Gravity',
      defaultValue: 0.1,
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      name: 'enableTrails',
      type: 'boolean',
      label: 'Enable Trails',
      defaultValue: false,
    },
    {
      name: 'trailLength',
      type: 'number',
      label: 'Trail Length',
      defaultValue: 10,
      min: 1,
      max: 50,
      step: 1,
    },
  ] as const,
} as const);

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
}

class ParticleSystemAnimation extends BaseAnimation<
  typeof particleSystemManifest
> {
  private particles: Particle[] = [];
  private graphics: PIXI.Graphics | null = null;

  onInit(context: PixiApp, controls: Controls) {
    this.graphics = new PIXI.Graphics();
    context.stage.addChild(this.graphics);
    this.createParticles(controls);
  }

  onUpdate(context: PixiApp, controls: Controls, deltaTime: number) {
    if (!this.graphics) return;

    // Update particles
    this.particles.forEach((particle, index) => {
      // Apply gravity
      particle.vy += controls.gravity * deltaTime * 60;

      // Update position
      particle.x += particle.vx * controls.speed * deltaTime * 60;
      particle.y += particle.vy * controls.speed * deltaTime * 60;

      // Update trail
      if (controls.enableTrails) {
        particle.trail.push({ x: particle.x, y: particle.y, alpha: 1 });
        if (particle.trail.length > controls.trailLength) {
          particle.trail.shift();
        }
      }

      // Decrease life
      particle.life -= deltaTime;

      // Remove dead particles
      if (particle.life <= 0) {
        this.particles.splice(index, 1);
        this.createParticle(
          controls,
          context.screen.width,
          context.screen.height
        );
      }
    });

    // Draw particles
    this.drawParticles(controls);
  }

  onDestroy() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    this.particles = [];
  }

  private createParticles(controls: Controls) {
    this.particles = [];
    for (let i = 0; i < controls.particleCount; i++) {
      this.createParticle(controls, 800, 600);
    }
  }

  private createParticle(controls: Controls, width: number, height: number) {
    const particle: Particle = {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: Math.random() * 5 + 2,
      maxLife: Math.random() * 5 + 2,
      trail: [],
    };
    this.particles.push(particle);
  }

  private drawParticles(controls: Controls) {
    if (!this.graphics) return;

    this.graphics.clear();

    this.particles.forEach((particle) => {
      const alpha = particle.life / particle.maxLife;

      // Draw trail
      if (controls.enableTrails && particle.trail.length > 1) {
        this.graphics.lineStyle(1, controls.particleColor, alpha * 0.3);
        this.graphics.moveTo(particle.trail[0].x, particle.trail[0].y);
        for (let i = 1; i < particle.trail.length; i++) {
          const trailAlpha = (i / particle.trail.length) * alpha * 0.3;
          this.graphics.lineStyle(1, controls.particleColor, trailAlpha);
          this.graphics.lineTo(particle.trail[i].x, particle.trail[i].y);
        }
      }

      // Draw particle
      this.graphics.beginFill(controls.particleColor, alpha);
      this.graphics.drawCircle(
        particle.x,
        particle.y,
        controls.particleSize * alpha
      );
      this.graphics.endFill();
    });
  }

  protected onReset(context: PixiApp, controls: Controls) {
    this.createParticles(controls);
  }
}
```

### 4. Wave Animation

A sine wave animation with customizable parameters.

```typescript
const waveManifest = createManifest({
  id: 'wave-animation',
  name: 'Wave Animation',
  description: 'A sine wave animation with customizable parameters',
  controls: [
    {
      name: 'amplitude',
      type: 'number',
      label: 'Amplitude',
      defaultValue: 50,
      min: 10,
      max: 200,
      step: 5,
    },
    {
      name: 'frequency',
      type: 'number',
      label: 'Frequency',
      defaultValue: 0.02,
      min: 0.001,
      max: 0.1,
      step: 0.001,
    },
    {
      name: 'speed',
      type: 'number',
      label: 'Speed',
      defaultValue: 1,
      min: 0,
      max: 5,
      step: 0.1,
    },
    {
      name: 'waveColor',
      type: 'color',
      label: 'Wave Color',
      defaultValue: '#00ff00',
    },
    {
      name: 'lineWidth',
      type: 'number',
      label: 'Line Width',
      defaultValue: 3,
      min: 1,
      max: 20,
      step: 1,
    },
    {
      name: 'showDots',
      type: 'boolean',
      label: 'Show Dots',
      defaultValue: false,
    },
    {
      name: 'dotSize',
      type: 'number',
      label: 'Dot Size',
      defaultValue: 5,
      min: 1,
      max: 20,
      step: 1,
    },
  ] as const,
} as const);

class WaveAnimation extends BaseAnimation<typeof waveManifest> {
  private graphics: PIXI.Graphics | null = null;
  private time = 0;

  onInit(context: PixiApp, controls: Controls) {
    this.graphics = new PIXI.Graphics();
    context.stage.addChild(this.graphics);
  }

  onUpdate(context: PixiApp, controls: Controls, deltaTime: number) {
    if (!this.graphics) return;

    this.time += deltaTime * controls.speed;

    this.graphics.clear();

    const centerY = context.screen.height / 2;
    const points: Array<{ x: number; y: number }> = [];

    // Generate wave points
    for (let x = 0; x < context.screen.width; x += 2) {
      const y =
        centerY +
        Math.sin(x * controls.frequency + this.time) * controls.amplitude;
      points.push({ x, y });
    }

    // Draw wave line
    this.graphics.lineStyle(controls.lineWidth, controls.waveColor);
    this.graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.graphics.lineTo(points[i].x, points[i].y);
    }

    // Draw dots if enabled
    if (controls.showDots) {
      this.graphics.beginFill(controls.waveColor);
      for (let i = 0; i < points.length; i += 10) {
        this.graphics.drawCircle(points[i].x, points[i].y, controls.dotSize);
      }
      this.graphics.endFill();
    }
  }

  onDestroy() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }
}
```

## Advanced Examples

### 5. Fractal Tree

A recursive fractal tree with customizable parameters.

```typescript
const fractalTreeManifest = createManifest({
  id: 'fractal-tree',
  name: 'Fractal Tree',
  description: 'A recursive fractal tree animation',
  controls: [
    {
      name: 'depth',
      type: 'number',
      label: 'Depth',
      defaultValue: 8,
      min: 1,
      max: 15,
      step: 1,
      resetsAnimation: true,
    },
    {
      name: 'angle',
      type: 'number',
      label: 'Branch Angle',
      defaultValue: 0.5,
      min: 0.1,
      max: 1.5,
      step: 0.1,
    },
    {
      name: 'lengthRatio',
      type: 'number',
      label: 'Length Ratio',
      defaultValue: 0.7,
      min: 0.3,
      max: 0.9,
      step: 0.05,
    },
    {
      name: 'treeColor',
      type: 'color',
      label: 'Tree Color',
      defaultValue: '#8B4513',
    },
    {
      name: 'animationSpeed',
      type: 'number',
      label: 'Animation Speed',
      defaultValue: 1,
      min: 0,
      max: 3,
      step: 0.1,
    },
    {
      name: 'showLeaves',
      type: 'boolean',
      label: 'Show Leaves',
      defaultValue: true,
    },
    {
      name: 'leafColor',
      type: 'color',
      label: 'Leaf Color',
      defaultValue: '#00ff00',
    },
  ] as const,
} as const);

interface Branch {
  x: number;
  y: number;
  length: number;
  angle: number;
  depth: number;
}

class FractalTreeAnimation extends BaseAnimation<typeof fractalTreeManifest> {
  private graphics: PIXI.Graphics | null = null;
  private time = 0;

  onInit(context: PixiApp, controls: Controls) {
    this.graphics = new PIXI.Graphics();
    context.stage.addChild(this.graphics);
  }

  onUpdate(context: PixiApp, controls: Controls, deltaTime: number) {
    if (!this.graphics) return;

    this.time += deltaTime * controls.animationSpeed;

    this.graphics.clear();

    const startX = context.screen.width / 2;
    const startY = context.screen.height - 50;
    const initialLength =
      Math.min(context.screen.width, context.screen.height) / 4;

    this.drawBranch(
      startX,
      startY,
      initialLength,
      -Math.PI / 2,
      controls.depth,
      controls
    );
  }

  onDestroy() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }

  private drawBranch(
    x: number,
    y: number,
    length: number,
    angle: number,
    depth: number,
    controls: Controls
  ) {
    if (depth === 0) return;

    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;

    // Draw branch
    this.graphics!.lineStyle(Math.max(1, depth), controls.treeColor);
    this.graphics!.moveTo(x, y);
    this.graphics!.lineTo(endX, endY);

    // Draw leaves at the end
    if (depth === 1 && controls.showLeaves) {
      this.graphics!.beginFill(controls.leafColor);
      this.graphics!.drawCircle(endX, endY, 3);
      this.graphics!.endFill();
    }

    // Recursively draw child branches
    if (depth > 1) {
      const newLength = length * controls.lengthRatio;
      const leftAngle = angle - controls.angle;
      const rightAngle = angle + controls.angle;

      this.drawBranch(endX, endY, newLength, leftAngle, depth - 1, controls);
      this.drawBranch(endX, endY, newLength, rightAngle, depth - 1, controls);
    }
  }
}
```

### 6. Interactive Particle Field

An interactive particle field that responds to mouse movement.

```typescript
const interactiveFieldManifest = createManifest({
  id: 'interactive-field',
  name: 'Interactive Particle Field',
  description: 'A particle field that responds to mouse interaction',
  controls: [
    {
      name: 'particleCount',
      type: 'number',
      label: 'Particle Count',
      defaultValue: 200,
      min: 50,
      max: 500,
      step: 10,
      resetsAnimation: true,
    },
    {
      name: 'particleColor',
      type: 'color',
      label: 'Particle Color',
      defaultValue: '#00ffff',
    },
    {
      name: 'particleSize',
      type: 'number',
      label: 'Particle Size',
      defaultValue: 2,
      min: 1,
      max: 10,
      step: 0.5,
    },
    {
      name: 'mouseInfluence',
      type: 'number',
      label: 'Mouse Influence',
      defaultValue: 100,
      min: 0,
      max: 300,
      step: 10,
    },
    {
      name: 'mouseStrength',
      type: 'number',
      label: 'Mouse Strength',
      defaultValue: 5,
      min: 0,
      max: 20,
      step: 0.5,
    },
    {
      name: 'damping',
      type: 'number',
      label: 'Damping',
      defaultValue: 0.95,
      min: 0.8,
      max: 0.99,
      step: 0.01,
    },
    {
      name: 'showConnections',
      type: 'boolean',
      label: 'Show Connections',
      defaultValue: true,
    },
    {
      name: 'connectionDistance',
      type: 'number',
      label: 'Connection Distance',
      defaultValue: 100,
      min: 50,
      max: 200,
      step: 10,
    },
  ] as const,
} as const);

interface InteractiveParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  originalX: number;
  originalY: number;
}

class InteractiveFieldAnimation extends BaseAnimation<
  typeof interactiveFieldManifest
> {
  private particles: InteractiveParticle[] = [];
  private graphics: PIXI.Graphics | null = null;
  private mouseX = 0;
  private mouseY = 0;

  onInit(context: PixiApp, controls: Controls) {
    this.graphics = new PIXI.Graphics();
    context.stage.addChild(this.graphics);

    // Set up mouse interaction
    context.stage.interactive = true;
    context.stage.on('pointermove', (event) => {
      this.mouseX = event.global.x;
      this.mouseY = event.global.y;
    });

    this.createParticles(controls, context);
  }

  onUpdate(context: PixiApp, controls: Controls, deltaTime: number) {
    if (!this.graphics) return;

    // Update particles
    this.particles.forEach((particle) => {
      // Calculate distance to mouse
      const dx = this.mouseX - particle.x;
      const dy = this.mouseY - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Apply mouse influence
      if (distance < controls.mouseInfluence) {
        const force =
          (controls.mouseInfluence - distance) / controls.mouseInfluence;
        particle.vx += (dx / distance) * force * controls.mouseStrength;
        particle.vy += (dy / distance) * force * controls.mouseStrength;
      }

      // Apply damping
      particle.vx *= controls.damping;
      particle.vy *= controls.damping;

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Return to original position
      const returnForce = 0.1;
      particle.vx += (particle.originalX - particle.x) * returnForce;
      particle.vy += (particle.originalY - particle.y) * returnForce;
    });

    // Draw particles and connections
    this.drawParticles(controls);
  }

  onDestroy() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    this.particles = [];
  }

  private createParticles(controls: Controls, context: PixiApp) {
    this.particles = [];

    for (let i = 0; i < controls.particleCount; i++) {
      const particle: InteractiveParticle = {
        x: Math.random() * context.screen.width,
        y: Math.random() * context.screen.height,
        vx: 0,
        vy: 0,
        originalX: Math.random() * context.screen.width,
        originalY: Math.random() * context.screen.height,
      };
      this.particles.push(particle);
    }
  }

  private drawParticles(controls: Controls) {
    if (!this.graphics) return;

    this.graphics.clear();

    // Draw connections
    if (controls.showConnections) {
      this.graphics.lineStyle(1, controls.particleColor, 0.3);
      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < this.particles.length; j++) {
          const dx = this.particles[i].x - this.particles[j].x;
          const dy = this.particles[i].y - this.particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < controls.connectionDistance) {
            this.graphics.moveTo(this.particles[i].x, this.particles[i].y);
            this.graphics.lineTo(this.particles[j].x, this.particles[j].y);
          }
        }
      }
    }

    // Draw particles
    this.graphics.beginFill(controls.particleColor);
    this.particles.forEach((particle) => {
      this.graphics!.drawCircle(particle.x, particle.y, controls.particleSize);
    });
    this.graphics.endFill();
  }

  protected onReset(context: PixiApp, controls: Controls) {
    this.createParticles(controls, context);
  }
}
```

## React Integration Examples

### 7. React Component with Custom Controls

A React component that uses custom control UI.

```typescript
import React, { useMemo, useState } from 'react';
import { AnimationStage, useControls } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import { BouncingBallAnimation, bouncingBallManifest } from './BouncingBallAnimation';

function CustomControlPanel({ application }) {
  const { controlValues, updateControls } = useControls(application);

  return (
    <div className="control-panel p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Animation Controls</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Speed: {controlValues.speed}
          </label>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={controlValues.speed}
            onChange={(e) => updateControls({ speed: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Ball Color
          </label>
          <input
            type="color"
            value={controlValues.ballColor}
            onChange={(e) => updateControls({ ballColor: e.target.value })}
            className="w-full h-10 rounded border"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Ball Size: {controlValues.ballSize}
          </label>
          <input
            type="range"
            min="5"
            max="50"
            step="1"
            value={controlValues.ballSize}
            onChange={(e) => updateControls({ ballSize: parseInt(e.target.value) })}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Gravity: {controlValues.gravity}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={controlValues.gravity}
            onChange={(e) => updateControls({ gravity: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

function BouncingBallDemo() {
  const [showCustomControls, setShowCustomControls] = useState(false);

  const application = useMemo(() => {
    const app = new PixiApplication({
      config: {
        autoResize: true,
        backgroundAlpha: 0,
        antialias: true,
      },
    });

    const animation = new BouncingBallAnimation(bouncingBallManifest);
    app.setAnimation(animation);

    return app;
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Bouncing Ball Demo</h2>
        <button
          onClick={() => setShowCustomControls(!showCustomControls)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showCustomControls ? 'Hide' : 'Show'} Custom Controls
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AnimationStage
            application={application}
            showDebugControls={!showCustomControls}
            className="h-96 w-full rounded-lg border-2 border-gray-300"
          />
        </div>

        {showCustomControls && (
          <div>
            <CustomControlPanel application={application} />
          </div>
        )}
      </div>
    </div>
  );
}

export default BouncingBallDemo;
```

### 8. Multiple Animation Switcher

A component that allows switching between multiple animations.

```typescript
import React, { useMemo, useState } from 'react';
import { AnimationStage } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import { BouncingBallAnimation, bouncingBallManifest } from './BouncingBallAnimation';
import { RotatingShapesAnimation, rotatingShapesManifest } from './RotatingShapesAnimation';
import { ParticleSystemAnimation, particleSystemManifest } from './ParticleSystemAnimation';

type AnimationType = 'bouncing-ball' | 'rotating-shapes' | 'particle-system';

function AnimationSwitcher() {
  const [activeAnimation, setActiveAnimation] = useState<AnimationType>('bouncing-ball');

  const applications = useMemo(() => {
    const bouncingBallApp = new PixiApplication();
    const bouncingBallAnimation = new BouncingBallAnimation(bouncingBallManifest);
    bouncingBallApp.setAnimation(bouncingBallAnimation);

    const rotatingShapesApp = new PixiApplication();
    const rotatingShapesAnimation = new RotatingShapesAnimation(rotatingShapesManifest);
    rotatingShapesApp.setAnimation(rotatingShapesAnimation);

    const particleSystemApp = new PixiApplication();
    const particleSystemAnimation = new ParticleSystemAnimation(particleSystemManifest);
    particleSystemApp.setAnimation(particleSystemAnimation);

    return {
      'bouncing-ball': bouncingBallApp,
      'rotating-shapes': rotatingShapesApp,
      'particle-system': particleSystemApp,
    };
  }, []);

  const currentApplication = applications[activeAnimation];

  const animationInfo = {
    'bouncing-ball': {
      name: 'Bouncing Ball',
      description: 'A simple bouncing ball with customizable physics',
    },
    'rotating-shapes': {
      name: 'Rotating Shapes',
      description: 'Multiple shapes rotating around a center point',
    },
    'particle-system': {
      name: 'Particle System',
      description: 'A configurable particle system with physics and trails',
    },
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">
          {animationInfo[activeAnimation].name}
        </h2>
        <p className="text-gray-600">
          {animationInfo[activeAnimation].description}
        </p>
      </div>

      <div className="flex justify-center space-x-4">
        {Object.entries(animationInfo).map(([key, info]) => (
          <button
            key={key}
            onClick={() => setActiveAnimation(key as AnimationType)}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeAnimation === key
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {info.name}
          </button>
        ))}
      </div>

      <div className="h-96 w-full">
        <AnimationStage
          application={currentApplication}
          showDebugControls={true}
          className="rounded-lg border-2 border-gray-300"
        />
      </div>
    </div>
  );
}

export default AnimationSwitcher;
```

## Best Practices

### 1. Performance Optimization

- Use `resetsAnimation` judiciously
- Implement efficient update loops
- Use object pooling for frequently created objects
- Monitor frame rates

### 2. Code Organization

- Separate animation logic from UI
- Use meaningful variable names
- Add comments for complex algorithms
- Handle edge cases gracefully

### 3. User Experience

- Provide helpful control descriptions
- Use appropriate control types
- Set sensible default values
- Handle errors gracefully

### 4. Testing

- Test with different control values
- Verify cleanup on destroy
- Test control change behavior
- Check performance with many controls

## Next Steps

- Explore the [Control System](./control-system.md) for advanced control features
- Learn about [Creating Animations](./creating-animations.md) for implementation details
- Check out [React Integration](./react-integration.md) for React-specific features
- See [Best Practices](./best-practices.md) for optimization tips
