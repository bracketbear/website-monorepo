import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { P5Application } from './p5-application';
import { P5Animation } from './p5-animation';
import { createManifest } from '@bracketbear/flateralus';
import type p5 from 'p5';

// Mock p5
const mockP5 = {
  width: 800,
  height: 600,
  fill: vi.fn(),
  noStroke: vi.fn(),
  circle: vi.fn(),
  background: vi.fn(),
  clear: vi.fn(),
  smooth: vi.fn(),
  createCanvas: vi.fn(() => ({
    elt: document.createElement('canvas'),
    addClass: vi.fn(),
  })),
  remove: vi.fn(),
  noLoop: vi.fn(),
  loop: vi.fn(),
  resizeCanvas: vi.fn(),
  windowResized: vi.fn(),
  setup: vi.fn(),
  draw: vi.fn(),
};

// Mock p5 constructor
vi.mock('p5', () => {
  return {
    default: vi.fn((sketch) => {
      // Simulate p5 instance creation with proper promise resolution
      const p = { ...mockP5 };

      // Call the sketch function to set up the p5 instance
      if (sketch && typeof sketch === 'function') {
        sketch(p);

        // Simulate the setup function being called immediately to resolve the promise
        if (p.setup && typeof p.setup === 'function') {
          p.setup();
        }
      }

      return p;
    }),
  };
});

// Test animation manifest
const testManifest = createManifest({
  id: 'integration-test-animation',
  name: 'Integration Test Animation',
  description: 'A test animation for integration testing',
  controls: [
    {
      name: 'particleCount',
      type: 'number',
      label: 'Particle Count',
      description: 'Number of particles to render',
      defaultValue: 100,
      min: 1,
      max: 1000,
      step: 10,
      debug: true,
    },
    {
      name: 'particleColor',
      type: 'color',
      label: 'Particle Color',
      description: 'Color of the particles',
      defaultValue: '#ff6b35',
      debug: true,
    },
    {
      name: 'animationSpeed',
      type: 'number',
      label: 'Animation Speed',
      description: 'Speed of the animation',
      defaultValue: 1.0,
      min: 0.1,
      max: 5.0,
      step: 0.1,
      debug: true,
    },
  ] as const,
});

// Integration test animation class
class IntegrationTestAnimation extends P5Animation<typeof testManifest> {
  public particles: Array<{ x: number; y: number; vx: number; vy: number }> =
    [];
  public initCalled = false;
  public updateCalled = false;
  public resetCalled = false;
  public destroyCalled = false;

  onInit(p: p5, controls: any): void {
    this.initCalled = true;
    this.particles = [];

    // Create particles based on control values
    for (let i = 0; i < controls.particleCount; i++) {
      this.particles.push({
        x: Math.random() * p.width,
        y: Math.random() * p.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
      });
    }
  }

  onUpdate(p: p5, controls: any, deltaTime: number): void {
    this.updateCalled = true;

    // Update particle positions
    this.particles.forEach((particle) => {
      particle.x += particle.vx * controls.animationSpeed * deltaTime;
      particle.y += particle.vy * controls.animationSpeed * deltaTime;

      // Wrap around screen
      if (particle.x < 0) particle.x = p.width;
      if (particle.x > p.width) particle.x = 0;
      if (particle.y < 0) particle.y = p.height;
      if (particle.y > p.height) particle.y = 0;
    });

    // Draw particles
    p.fill(controls.particleColor);
    p.noStroke();
    this.particles.forEach((particle) => {
      p.circle(particle.x, particle.y, 5);
    });
  }

  protected onReset(p: p5, controls: any): void {
    this.resetCalled = true;
    this.onInit(p, controls);
  }

  onDestroy(): void {
    this.destroyCalled = true;
    this.particles = [];
  }
}

describe('P5 Flateralus Integration', () => {
  let app: P5Application;
  let animation: IntegrationTestAnimation;
  let container: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    app = new P5Application({
      config: {
        width: 800,
        height: 600,
        backgroundColor: '#000000',
        backgroundAlpha: 0,
      },
    });
    animation = new IntegrationTestAnimation(testManifest);
  });

  afterEach(async () => {
    if (app) {
      app.destroy();
    }
  });

  describe('full workflow', () => {
    it('should complete full animation lifecycle', async () => {
      // 1. Initialize application
      await app.init(container);
      expect(app.isInitialized()).toBe(true);
      expect(app.getP5Instance()).toBeDefined();

      // 2. Set animation
      app.setAnimation(animation);
      expect(app.getAnimation()).toBe(animation);
      expect(animation.initCalled).toBe(true);

      // 3. Start animation
      app.start();
      expect(app.isRunning()).toBe(true);

      // 4. Update controls
      app.getAnimation()?.updateControls({
        particleCount: 50,
        particleColor: '#00ff00',
        animationSpeed: 2.0,
      });

      expect(animation.getControlValues()).toEqual({
        particleCount: 50,
        particleColor: '#00ff00',
        animationSpeed: 2.0,
      });

      // 5. Reset animation
      app.getAnimation()?.reset();
      expect(animation.resetCalled).toBe(true);

      // 6. Stop animation
      app.stop();
      expect(app.isRunning()).toBe(false);

      // 7. Destroy everything
      app.destroy();
      expect(animation.destroyCalled).toBe(true);
      expect(app.isInitialized()).toBe(false);
    });

    it('should handle control updates during animation', async () => {
      await app.init(container);
      app.setAnimation(animation);
      app.start();

      // Update controls multiple times
      const controls = [
        { particleCount: 25, particleColor: '#ff0000' },
        { particleCount: 75, particleColor: '#0000ff' },
        { animationSpeed: 0.5 },
        { animationSpeed: 3.0 },
      ];

      controls.forEach((controlUpdate) => {
        app.getAnimation()?.updateControls(controlUpdate);
        const currentValues = app.getAnimation()?.getControlValues();
        expect(currentValues).toMatchObject(controlUpdate);
      });
    });

    it('should handle stage control updates', async () => {
      await app.init(container);
      app.setAnimation(animation);
      app.start();

      // Update stage controls
      app.updateStageControls({
        backgroundColor: '#ffffff',
        backgroundAlpha: 0.5,
      });

      const stageValues = app.getStageControlValues();
      expect(stageValues.backgroundColor).toBe('#ffffff');
      expect(stageValues.backgroundAlpha).toBe(0.5);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle rapid start/stop cycles', async () => {
      await app.init(container);
      app.setAnimation(animation);

      // Rapid start/stop cycles
      for (let i = 0; i < 10; i++) {
        app.start();
        expect(app.isRunning()).toBe(true);
        app.stop();
        expect(app.isRunning()).toBe(false);
      }
    });

    it('should handle multiple animation switches', async () => {
      await app.init(container);

      const animations = [
        new IntegrationTestAnimation(testManifest),
        new IntegrationTestAnimation(testManifest),
        new IntegrationTestAnimation(testManifest),
      ];

      animations.forEach((anim) => {
        app.setAnimation(anim);
        expect(app.getAnimation()).toBe(anim);
        expect(anim.initCalled).toBe(true);
      });

      // All previous animations should be destroyed
      animations.slice(0, -1).forEach((anim) => {
        expect(anim.destroyCalled).toBe(true);
      });
    });

    it('should handle invalid control values gracefully', async () => {
      await app.init(container);
      app.setAnimation(animation);

      // Try to set invalid control values
      expect(() => {
        app.getAnimation()?.updateControls({
          particleCount: 'invalid' as any,
        });
      }).toThrow('Invalid control values');
    });

    it('should handle application destruction with running animation', async () => {
      await app.init(container);
      app.setAnimation(animation);
      app.start();

      // Destroy while running
      app.destroy();

      expect(animation.destroyCalled).toBe(true);
      expect(app.isRunning()).toBe(false);
      expect(app.isInitialized()).toBe(false);
    });
  });

  describe('performance and memory', () => {
    it('should not leak memory during control updates', async () => {
      await app.init(container);
      app.setAnimation(animation);
      app.start();

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Perform many control updates
      for (let i = 0; i < 1000; i++) {
        app.getAnimation()?.updateControls({
          particleCount: Math.floor(Math.random() * 100) + 1,
          animationSpeed: Math.random() * 4.9 + 0.1, // Ensure it's within the valid range
        });
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Memory usage should be reasonable (allow for some variance)
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
    });

    it('should handle large particle counts efficiently', async () => {
      await app.init(container);
      app.setAnimation(animation);
      app.start();

      // Set a large particle count and reset to apply it
      app.getAnimation()?.reset({
        particleCount: 1000,
      });

      expect(animation.particles).toHaveLength(1000);

      // Should still be able to update controls
      app.getAnimation()?.updateControls({
        particleColor: '#ff0000',
      });

      expect(animation.getControlValues().particleColor).toBe('#ff0000');
    });
  });

  describe('type safety', () => {
    it('should maintain type safety throughout the workflow', async () => {
      await app.init(container);
      app.setAnimation(animation);

      const values = animation.getControlValues();

      // TypeScript should infer correct types
      expect(typeof values.particleCount).toBe('number');
      expect(typeof values.particleColor).toBe('string');
      expect(typeof values.animationSpeed).toBe('number');

      // Should not allow invalid assignments
      // @ts-expect-error: particleCount should be number
      values.particleCount = 'invalid';

      // @ts-expect-error: particleColor should be string
      values.particleColor = 123;

      // @ts-expect-error: animationSpeed should be number
      values.animationSpeed = 'fast';
    });

    it('should provide proper typing for control updates', async () => {
      await app.init(container);
      app.setAnimation(animation);

      // Should allow partial updates
      animation.updateControls({
        particleCount: 50,
      });

      // Should allow full updates
      animation.updateControls({
        particleCount: 75,
        particleColor: '#00ff00',
        animationSpeed: 2.0,
      });

      // Should not allow invalid control names
      animation.updateControls({
        invalidControl: 'value',
      } as any);
    });
  });
});
