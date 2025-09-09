import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDebugControls } from './useDebugControls';
import type {
  Application,
  Animation,
  AnimationManifest,
  ControlValues,
} from '@bracketbear/flateralus';

// Mock animation implementation
const createMockAnimation = (initialValues: ControlValues = {}) => {
  let currentValues = { ...initialValues };
  let onControlsUpdated: ((values: ControlValues) => void) | undefined;

  return {
    getControlValues: vi.fn(() => currentValues),
    getManifest: vi.fn(() => mockManifest),
    updateControls: vi.fn((newValues: Partial<ControlValues>) => {
      currentValues = { ...currentValues, ...newValues } as ControlValues;
      onControlsUpdated?.(currentValues);
    }),
    reset: vi.fn((values?: ControlValues) => {
      currentValues = values || { ...initialValues };
      onControlsUpdated?.(currentValues);
    }),
    setOnControlsUpdated: vi.fn(
      (callback: ((values: ControlValues) => void) | undefined) => {
        onControlsUpdated = callback;
      }
    ),
  } as unknown as Animation;
};

// Mock manifest
const mockManifest: AnimationManifest = {
  id: 'test-animation',
  name: 'Test Animation',
  description: 'A test animation',
  controls: [
    {
      name: 'speed',
      type: 'number',
      label: 'Speed',
      min: 0,
      max: 10,
      defaultValue: 5,
      debug: true,
      resetsAnimation: false,
    },
    {
      name: 'color',
      type: 'color',
      label: 'Color',
      defaultValue: '#ff0000',
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'enabled',
      type: 'boolean',
      label: 'Enabled',
      defaultValue: true,
      debug: true,
      resetsAnimation: false,
    },
  ],
};

// Mock application
const createMockApplication = (animation: Animation) => {
  return {
    getAnimation: vi.fn(() => animation),
    getStageControlsManifest: vi.fn(() => null),
    getStageControlValues: vi.fn(() => ({})),
    updateStageControls: vi.fn(),
  } as unknown as Application;
};

describe('useDebugControls', () => {
  let mockAnimation: Animation;
  let mockApplication: Application;
  let initialValues: ControlValues;

  beforeEach(() => {
    initialValues = {
      speed: 5,
      color: '#ff0000',
      enabled: true,
    };
    mockAnimation = createMockAnimation(initialValues);
    mockApplication = createMockApplication(mockAnimation);
  });

  describe('basic functionality', () => {
    it('should initialize with animation control values', () => {
      const { result } = renderHook(() =>
        useDebugControls({
          showDebugControls: true,
          application: mockApplication,
        })
      );

      expect(result.current.controlValues).toEqual(initialValues);
      expect(result.current.isVisible).toBe(true);
      expect(result.current.debugControlsProps.manifest).toEqual(mockManifest);
    });

    it('should handle control changes', async () => {
      const { result } = renderHook(() =>
        useDebugControls({
          showDebugControls: true,
          application: mockApplication,
        })
      );

      await act(async () => {
        await result.current.handleControlsChange({ speed: 9 });
      });

      expect(result.current.controlValues.speed).toBe(9);
    });
  });

  describe('randomization scenario', () => {
    it('should sync with animation after randomization', () => {
      const { result } = renderHook(() =>
        useDebugControls({
          showDebugControls: true,
          application: mockApplication,
        })
      );

      // Simulate randomization (external change)
      act(() => {
        mockAnimation.updateControls({
          speed: 7,
          color: '#00ff00',
          enabled: false,
        });
      });

      // Debug controls should reflect the randomized values
      expect(result.current.controlValues).toEqual({
        speed: 7,
        color: '#00ff00',
        enabled: false,
      });
    });

    it('should handle manual control changes after randomization', async () => {
      const { result } = renderHook(() =>
        useDebugControls({
          showDebugControls: true,
          application: mockApplication,
        })
      );

      // Step 1: Randomize controls
      act(() => {
        mockAnimation.updateControls({
          speed: 6,
          color: '#00ff00',
          enabled: false,
        });
      });

      // Step 2: Verify debug controls reflect randomized values
      expect(result.current.controlValues).toEqual({
        speed: 6,
        color: '#00ff00',
        enabled: false,
      });

      // Step 3: Manually adjust one control
      await act(async () => {
        await result.current.handleControlsChange({ speed: 2 });
      });

      // Step 4: Verify only the adjusted control changed, others remain randomized
      expect(result.current.controlValues).toEqual({
        speed: 2,
        color: '#00ff00',
        enabled: false,
      });
    });

    it('should provide randomize functions', () => {
      const { result } = renderHook(() =>
        useDebugControls({
          showDebugControls: true,
          application: mockApplication,
        })
      );

      expect(
        typeof result.current.debugControlsProps.randomizeAllControls
      ).toBe('function');
      expect(
        typeof result.current.debugControlsProps.randomizeStageControls
      ).toBe('function');
    });

    it('should call randomizeAllControls when triggered', () => {
      const { result } = renderHook(() =>
        useDebugControls({
          showDebugControls: true,
          application: mockApplication,
        })
      );

      act(() => {
        result.current.debugControlsProps.randomizeAllControls();
      });

      // The animation should have been updated with random values
      expect(mockAnimation.updateControls).toHaveBeenCalled();
    });
  });

  describe('stage controls', () => {
    it('should handle stage controls when available', () => {
      const mockStageManifest = {
        id: 'stage-controls',
        name: 'Stage Controls',
        description: 'Stage-level controls',
        controls: [
          {
            name: 'backgroundColor',
            type: 'color',
            label: 'Background Color',
            defaultValue: '#000000',
            debug: true,
            resetsAnimation: false,
          },
        ],
      };

      const mockApplicationWithStage = {
        ...mockApplication,
        getStageControlsManifest: vi.fn(() => mockStageManifest),
        getStageControlValues: vi.fn(() => ({ backgroundColor: '#000000' })),
      } as unknown as Application;

      const { result } = renderHook(() =>
        useDebugControls({
          showDebugControls: true,
          application: mockApplicationWithStage,
        })
      );

      expect(result.current.debugControlsProps.stageControls).toBeDefined();
      expect(result.current.debugControlsProps.stageControls?.manifest).toEqual(
        mockStageManifest
      );
    });
  });
});
