import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
};

// Mock p5 constructor
vi.mock('p5', () => {
  return {
    default: vi.fn((sketch) => {
      // Simulate p5 instance creation
      const p = { ...mockP5 };
      sketch(p);
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
    {
      name: 'circleColor',
      type: 'color',
      label: 'Circle Color',
      description: 'Color of the circle',
      defaultValue: '#ff6b35',
      debug: true,
    },
  ] as const,
});

// Concrete test animation class
class TestP5Animation extends P5Animation<typeof testManifest> {
  public initCalled = false;
  public updateCalled = false;
  public resetCalled = false;
  public destroyCalled = false;
  public lastContext: any = null;
  public lastControls: any = null;
  public lastDeltaTime = 0;

  onInit(context: any, controls: any): void {
    this.initCalled = true;
    this.lastContext = context;
    this.lastControls = controls;
  }

  onUpdate(context: any, controls: any, deltaTime: number): void {
    this.updateCalled = true;
    this.lastContext = context;
    this.lastControls = controls;
    this.lastDeltaTime = deltaTime;
  }

  protected onReset(context: any, controls: any): void {
    this.resetCalled = true;
    this.lastContext = context;
    this.lastControls = controls;
  }

  onDestroy(): void {
    this.destroyCalled = true;
  }
}

describe('P5Animation', () => {
  let animation: TestP5Animation;

  beforeEach(() => {
    vi.clearAllMocks();
    animation = new TestP5Animation(testManifest);
  });

  afterEach(() => {
    if (animation) {
      animation.destroy();
    }
  });

  describe('constructor', () => {
    it('should create animation with manifest', () => {
      expect(animation.getManifest()).toBe(testManifest);
      expect(animation.getControlValues()).toEqual({
        circleSize: 50,
        circleColor: '#ff6b35',
      });
    });

    it('should create animation with custom initial controls', () => {
      const customAnimation = new TestP5Animation(testManifest, {
        circleSize: 100,
        circleColor: '#00ff00',
      });

      expect(customAnimation.getControlValues()).toEqual({
        circleSize: 100,
        circleColor: '#00ff00',
      });
    });

    it('should throw error for invalid control values', () => {
      expect(() => {
        new TestP5Animation(testManifest, {
          circleSize: 'invalid' as any,
        });
      }).toThrow('Invalid control values');
    });
  });

  describe('lifecycle methods', () => {
    it('should call onInit when init is called', () => {
      animation.init(mockP5 as any);

      expect(animation.initCalled).toBe(true);
      expect(animation.lastContext).toBe(mockP5);
      expect(animation.lastControls).toEqual({
        circleSize: 50,
        circleColor: '#ff6b35',
      });
    });

    it('should call onUpdate when update is called', () => {
      animation.init(mockP5 as any);
      animation.update();

      expect(animation.updateCalled).toBe(true);
      expect(animation.lastContext).toBe(mockP5);
      expect(animation.lastControls).toEqual({
        circleSize: 50,
        circleColor: '#ff6b35',
      });
    });

    it('should call onReset when reset is called', () => {
      animation.init(mockP5 as any);
      animation.reset();

      expect(animation.resetCalled).toBe(true);
      expect(animation.lastContext).toBe(mockP5);
      expect(animation.lastControls).toEqual({
        circleSize: 50,
        circleColor: '#ff6b35',
      });
    });

    it('should call onDestroy when destroy is called', () => {
      animation.destroy();

      expect(animation.destroyCalled).toBe(true);
    });
  });

  describe('control management', () => {
    it('should update control values', () => {
      animation.updateControls({
        circleSize: 75,
        circleColor: '#0000ff',
      });

      expect(animation.getControlValues()).toEqual({
        circleSize: 75,
        circleColor: '#0000ff',
      });
    });

    it('should call onControlsUpdated callback when controls are updated', () => {
      const callback = vi.fn();
      animation.setOnControlsUpdated(callback);

      animation.updateControls({
        circleSize: 100,
      });

      expect(callback).toHaveBeenCalledWith({
        circleSize: 100,
        circleColor: '#ff6b35',
      });
    });

    it('should reset to default values when reset is called without parameters', () => {
      // Initialize the animation first
      animation.init(mockP5 as any);

      animation.updateControls({
        circleSize: 100,
        circleColor: '#0000ff',
      });

      animation.reset();

      expect(animation.getControlValues()).toEqual({
        circleSize: 50,
        circleColor: '#ff6b35',
      });
    });

    it('should reset to specified values when reset is called with parameters', () => {
      // Initialize the animation first
      animation.init(mockP5 as any);

      animation.reset({
        circleSize: 25,
        circleColor: '#ffff00',
      });

      expect(animation.getControlValues()).toEqual({
        circleSize: 25,
        circleColor: '#ffff00',
      });
    });
  });

  describe('type safety', () => {
    it('should maintain type safety for control values', () => {
      const values = animation.getControlValues();

      // TypeScript should infer the correct types
      expect(typeof values.circleSize).toBe('number');
      expect(typeof values.circleColor).toBe('string');

      // Should not allow invalid types
      // @ts-expect-error: circleSize should be number
      values.circleSize = 'invalid';

      // @ts-expect-error: circleColor should be string
      values.circleColor = 123;
    });
  });
});
