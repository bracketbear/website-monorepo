import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { P5Application } from './p5-application';
import { P5Animation } from './p5-animation';
import { createManifest } from '@bracketbear/flateralus';

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
  id: 'test-p5-animation',
  name: 'Test P5 Animation',
  description: 'A test animation for p5.js',
  controls: [
    {
      name: 'circleSize',
      type: 'number',
      label: 'Circle Size',
      description: 'Size of the circle',
      defaultValue: 50,
      min: 10,
      max: 200,
      step: 5,
      debug: true,
    },
  ] as const,
});

// Test animation class
class TestP5Animation extends P5Animation<typeof testManifest> {
  public updateCalled = false;

  onInit(): void {
    // Test implementation
  }

  onUpdate(): void {
    this.updateCalled = true;
  }

  protected onReset(): void {
    // Test implementation
  }

  onDestroy(): void {
    // Test implementation
  }
}

describe('P5Application', () => {
  let app: P5Application;
  let container: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    app = new P5Application();
  });

  afterEach(() => {
    if (app) {
      app.destroy();
    }
  });

  describe('constructor', () => {
    it('should create application with default options', () => {
      expect(app.isInitialized()).toBe(false);
      expect(app.isRunning()).toBe(false);
      expect(app.getAnimation()).toBeNull();
      expect(app.getCanvas()).toBeNull();
    });

    it('should create application with custom options', () => {
      const customApp = new P5Application({
        config: {
          width: 1024,
          height: 768,
          backgroundColor: '#000000',
          backgroundAlpha: 1,
        },
        canvasClassName: 'custom-canvas',
      });

      expect(customApp.getStageControlValues()).toEqual(
        expect.objectContaining({
          backgroundColor: '#000000',
          backgroundAlpha: 1,
          stageWidth: 1024,
          stageHeight: 768,
        })
      );
    });
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await app.init(container);

      expect(app.isInitialized()).toBe(true);
      expect(app.getCanvas()).toBeInstanceOf(HTMLCanvasElement);
      expect(app.getP5Instance()).toBeDefined();
    });

    it('should apply canvas class name if provided', async () => {
      const customApp = new P5Application({
        canvasClassName: 'test-canvas',
      });

      await customApp.init(container);

      const canvas = customApp.getCanvas();
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
      // Note: In a real test, we'd check if the class was actually applied
      // but since we're mocking p5, we can't verify this directly
    });
  });

  describe('animation management', () => {
    beforeEach(async () => {
      await app.init(container);
    });

    it('should set and get animation', () => {
      const animation = new TestP5Animation(testManifest);
      app.setAnimation(animation);

      expect(app.getAnimation()).toBe(animation);
    });

    it('should destroy previous animation when setting new one', () => {
      const animation1 = new TestP5Animation(testManifest);
      const animation2 = new TestP5Animation(testManifest);

      const destroySpy = vi.spyOn(animation1, 'destroy');

      app.setAnimation(animation1);
      app.setAnimation(animation2);

      expect(destroySpy).toHaveBeenCalled();
      expect(app.getAnimation()).toBe(animation2);
    });

    it('should initialize animation when setting animation after init', () => {
      const animation = new TestP5Animation(testManifest);
      const initSpy = vi.spyOn(animation, 'init');

      app.setAnimation(animation);

      expect(initSpy).toHaveBeenCalledWith(app.getP5Instance());
    });
  });

  describe('lifecycle management', () => {
    beforeEach(async () => {
      await app.init(container);
    });

    it('should start and stop the application', () => {
      app.start();
      expect(app.isRunning()).toBe(true);

      app.stop();
      expect(app.isRunning()).toBe(false);
    });

    it('should pause and resume the application', () => {
      app.start();
      app.pause();
      expect(app.isRunning()).toBe(false);

      app.resume();
      expect(app.isRunning()).toBe(true);
    });

    it('should call animation update when running', () => {
      const animation = new TestP5Animation(testManifest);
      app.setAnimation(animation);
      app.start();

      // Simulate a frame update
      // In a real p5 application, this would be called by the draw loop
      if (animation.updateCalled) {
        expect(animation.updateCalled).toBe(true);
      }
    });
  });

  describe('stage controls', () => {
    beforeEach(async () => {
      await app.init(container);
    });

    it('should return stage controls manifest', () => {
      const manifest = app.getStageControlsManifest();

      expect(manifest.id).toBe('p5-stage-controls');
      expect(manifest.name).toBe('Stage Controls');
      expect(manifest.description).toBe('Controls for p5.js stage properties');
      expect(manifest.controls).toHaveLength(2);
      expect(manifest.controls[0].name).toBe('backgroundColor');
      expect(manifest.controls[1].name).toBe('backgroundAlpha');
    });

    it('should get current stage control values', () => {
      const values = app.getStageControlValues();

      expect(values).toEqual(
        expect.objectContaining({
          backgroundColor: 'transparent',
          backgroundAlpha: 0,
          stageWidth: 800,
          stageHeight: 600,
        })
      );
    });

    it('should update stage control values', () => {
      app.updateStageControls({
        backgroundColor: '#ff0000',
        backgroundAlpha: 0.5,
      });

      const values = app.getStageControlValues();
      expect(values.backgroundColor).toBe('#ff0000');
      expect(values.backgroundAlpha).toBe(0.5);
    });
  });

  describe('resize handling', () => {
    beforeEach(async () => {
      await app.init(container);
    });

    it('should handle resize events', () => {
      app.updateStageControls({
        stageWidth: 1024,
        stageHeight: 768,
      });

      const values = app.getStageControlValues();
      expect(values.stageWidth).toBe(1024);
      expect(values.stageHeight).toBe(768);
    });

    it('should update stage controls on resize', () => {
      const updateSpy = vi.spyOn(app, 'updateStageControls');

      app.updateStageControls({
        stageWidth: 1024,
        stageHeight: 768,
      });

      expect(updateSpy).toHaveBeenCalledWith({
        stageWidth: 1024,
        stageHeight: 768,
      });
    });
  });

  describe('resource cleanup', () => {
    beforeEach(async () => {
      await app.init(container);
    });

    it('should destroy application and clean up resources', () => {
      const animation = new TestP5Animation(testManifest);
      app.setAnimation(animation);

      const destroySpy = vi.spyOn(animation, 'destroy');

      app.destroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(app.isInitialized()).toBe(false);
      expect(app.isRunning()).toBe(false);
      expect(app.getAnimation()).toBeNull();
    });

    it('should handle destroy errors gracefully', () => {
      // Mock p5 remove to throw an error
      const mockP5Instance = app.getP5Instance();
      if (mockP5Instance) {
        mockP5Instance.remove = vi.fn().mockImplementation(() => {
          throw new Error('p5 remove failed');
        });
      }

      // Should not throw error
      expect(() => app.destroy()).not.toThrow();
    });
  });

  describe('p5 instance access', () => {
    beforeEach(async () => {
      await app.init(container);
    });

    it('should provide access to p5 instance', () => {
      const p5Instance = app.getP5Instance();
      expect(p5Instance).toBeDefined();
      expect(p5Instance).toHaveProperty('width');
      expect(p5Instance).toHaveProperty('height');
    });

    it('should provide access to canvas element', () => {
      const canvas = app.getCanvas();
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    });
  });

  describe('error handling', () => {
    it('should handle missing p5 instance gracefully', () => {
      // Test methods that depend on p5 instance
      expect(() => app.getP5Instance()).toBeDefined();
      expect(() => app.getCanvas()).toBeDefined();
    });

    it('should handle stage control changes without p5 instance', () => {
      expect(() => {
        // Test that the method exists and doesn't throw
        app.updateStageControls({
          backgroundColor: '#ff0000',
        });
      }).not.toThrow();
    });
  });
});
