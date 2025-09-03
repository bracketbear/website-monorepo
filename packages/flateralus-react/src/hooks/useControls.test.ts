import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useControls } from './useControls';
import type {
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
    updateControls: vi.fn((newValues: Partial<ControlValues>) => {
      currentValues = { ...currentValues, ...newValues };
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
const createMockManifest = (): AnimationManifest => ({
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
});

describe('useControls', () => {
  let mockAnimation: Animation;
  let mockManifest: AnimationManifest;
  let initialValues: ControlValues;

  beforeEach(() => {
    initialValues = {
      speed: 5,
      color: '#ff0000',
      enabled: true,
    };
    mockAnimation = createMockAnimation(initialValues);
    mockManifest = createMockManifest();
  });

  describe('basic functionality', () => {
    it('should initialize with initial values', () => {
      const { result } = renderHook(() =>
        useControls({
          animation: mockAnimation,
          manifest: mockManifest,
          initialControlValues: initialValues,
        })
      );

      expect(result.current).toBeDefined();
      expect(result.current.controlValues).toEqual(initialValues);
      expect(typeof result.current.handleControlsChange).toBe('function');
      expect(result.current.showResetToast).toBe(false);
    });

    it('should handle simple control change', async () => {
      const { result } = renderHook(() =>
        useControls({
          animation: mockAnimation,
          manifest: mockManifest,
          initialControlValues: initialValues,
        })
      );

      await act(async () => {
        await result.current.handleControlsChange({ speed: 9 });
      });

      expect(result.current.controlValues.speed).toBe(9);
      expect(mockAnimation.updateControls).toHaveBeenCalledWith({ speed: 9 });
    });

    it('should sync with external animation changes', () => {
      const { result } = renderHook(() =>
        useControls({
          animation: mockAnimation,
          manifest: mockManifest,
          initialControlValues: initialValues,
        })
      );

      // Simulate external change
      act(() => {
        mockAnimation.updateControls({ speed: 8, enabled: false });
      });

      // Wait for the next tick to allow the effect to run
      act(() => {
        // This should trigger the sync effect
      });

      expect(result.current.controlValues).toEqual({
        speed: 8,
        color: '#ff0000',
        enabled: false,
      });
    });
  });

  describe('randomization scenario', () => {
    it('should maintain control values after randomization when manually adjusting', async () => {
      const { result } = renderHook(() =>
        useControls({
          animation: mockAnimation,
          manifest: mockManifest,
          initialControlValues: initialValues,
        })
      );

      // Step 1: Randomize controls (external change)
      act(() => {
        mockAnimation.updateControls({
          speed: 7,
          color: '#00ff00',
          enabled: false,
        });
      });

      // Step 2: Verify debug controls reflect randomized values
      expect(result.current.controlValues).toEqual({
        speed: 7,
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

      // Step 5: Verify animation was updated with only the changed control
      expect(mockAnimation.updateControls).toHaveBeenCalledWith({ speed: 2 });
    });

    it('should handle multiple manual adjustments after randomization', async () => {
      const { result } = renderHook(() =>
        useControls({
          animation: mockAnimation,
          manifest: mockManifest,
          initialControlValues: initialValues,
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

      // Step 2: Verify randomized values
      expect(result.current.controlValues).toEqual({
        speed: 6,
        color: '#00ff00',
        enabled: false,
      });

      // Step 3: Adjust speed
      await act(async () => {
        await result.current.handleControlsChange({ speed: 3 });
      });

      // Step 4: Adjust enabled
      await act(async () => {
        await result.current.handleControlsChange({ enabled: true });
      });

      // Step 5: Verify final state maintains all changes
      expect(result.current.controlValues).toEqual({
        speed: 3,
        color: '#00ff00',
        enabled: true,
      });

      // Step 6: Verify animation was updated with each change individually
      expect(mockAnimation.updateControls).toHaveBeenCalledWith({ speed: 3 });
      expect(mockAnimation.updateControls).toHaveBeenCalledWith({
        enabled: true,
      });
    });

    it('should handle control changes that require animation reset', async () => {
      const { result } = renderHook(() =>
        useControls({
          animation: mockAnimation,
          manifest: mockManifest,
          initialControlValues: initialValues,
        })
      );

      // Step 1: Randomize controls
      act(() => {
        mockAnimation.updateControls({
          speed: 8,
          color: '#00ff00',
          enabled: false,
        });
      });

      // Step 2: Change a control that requires reset (color)
      await act(async () => {
        await result.current.handleControlsChange({ color: '#0000ff' });
      });

      // Step 3: Should show reset toast
      expect(result.current.showResetToast).toBe(true);

      // Step 4: Should call reset with merged values
      expect(mockAnimation.reset).toHaveBeenCalledWith({
        speed: 8,
        color: '#0000ff',
        enabled: false,
      });
    });

    it('should not reset when changing controls that do not require reset', async () => {
      const { result } = renderHook(() =>
        useControls({
          animation: mockAnimation,
          manifest: mockManifest,
          initialControlValues: initialValues,
        })
      );

      // Step 1: Randomize controls
      act(() => {
        mockAnimation.updateControls({
          speed: 7,
          color: '#00ff00',
          enabled: false,
        });
      });

      // Step 2: Change a control that doesn't require reset
      await act(async () => {
        await result.current.handleControlsChange({ speed: 4 });
      });

      // Step 3: Should not show reset toast
      expect(result.current.showResetToast).toBe(false);

      // Step 4: Should call updateControls, not reset
      expect(mockAnimation.updateControls).toHaveBeenCalledWith({ speed: 4 });
      expect(mockAnimation.reset).not.toHaveBeenCalled();
    });
  });

  describe('control synchronization', () => {
    it('should sync with animation control values on mount', () => {
      const { result } = renderHook(() =>
        useControls({
          animation: mockAnimation,
          manifest: mockManifest,
          initialControlValues: initialValues,
        })
      );

      expect(result.current.controlValues).toEqual(initialValues);
    });

    it('should update local state when animation controls change externally', () => {
      const { result } = renderHook(() =>
        useControls({
          animation: mockAnimation,
          manifest: mockManifest,
          initialControlValues: initialValues,
        })
      );

      // Simulate external control change (e.g., from randomization)
      act(() => {
        mockAnimation.updateControls({ speed: 8, enabled: false });
      });

      // The local state should reflect the animation's current values
      expect(result.current.controlValues).toEqual({
        speed: 8,
        color: '#ff0000',
        enabled: false,
      });
    });

    it('should handle manual control changes without resetting all controls', async () => {
      const { result } = renderHook(() =>
        useControls({
          animation: mockAnimation,
          manifest: mockManifest,
          initialControlValues: initialValues,
        })
      );

      // First, simulate randomization (external change)
      act(() => {
        mockAnimation.updateControls({
          speed: 8,
          color: '#00ff00',
          enabled: false,
        });
      });

      // Verify the controls reflect the randomized values
      expect(result.current.controlValues).toEqual({
        speed: 8,
        color: '#00ff00',
        enabled: false,
      });

      // Now simulate manual control change (only one control)
      await act(async () => {
        await result.current.handleControlsChange({ speed: 3 });
      });

      // Only the changed control should be updated, others should remain the same
      expect(result.current.controlValues).toEqual({
        speed: 3,
        color: '#00ff00',
        enabled: false,
      });

      // Verify the animation was updated with only the changed control
      expect(mockAnimation.updateControls).toHaveBeenCalledWith({ speed: 3 });
    });
  });

  describe('control change handling', () => {
    it('should merge partial control changes with existing values', async () => {
      const { result } = renderHook(() =>
        useControls({
          animation: mockAnimation,
          manifest: mockManifest,
          initialControlValues: initialValues,
        })
      );

      await act(async () => {
        await result.current.handleControlsChange({ speed: 9 });
      });

      expect(result.current.controlValues).toEqual({
        speed: 9,
        color: '#ff0000',
        enabled: true,
      });
    });

    it('should handle multiple control changes in sequence', async () => {
      const { result } = renderHook(() =>
        useControls({
          animation: mockAnimation,
          manifest: mockManifest,
          initialControlValues: initialValues,
        })
      );

      // First change
      await act(async () => {
        await result.current.handleControlsChange({ speed: 6 });
      });

      // Second change
      await act(async () => {
        await result.current.handleControlsChange({ enabled: false });
      });

      expect(result.current.controlValues).toEqual({
        speed: 6,
        color: '#ff0000',
        enabled: false,
      });
    });
  });

  describe('reset behavior', () => {
    it('should show reset toast when changing controls that require reset', async () => {
      const { result } = renderHook(() =>
        useControls({
          animation: mockAnimation,
          manifest: mockManifest,
          initialControlValues: initialValues,
        })
      );

      await act(async () => {
        await result.current.handleControlsChange({ color: '#00ff00' });
      });

      expect(result.current.showResetToast).toBe(true);
    });

    it('should not show reset toast for controls that do not require reset', async () => {
      const { result } = renderHook(() =>
        useControls({
          animation: mockAnimation,
          manifest: mockManifest,
          initialControlValues: initialValues,
        })
      );

      await act(async () => {
        await result.current.handleControlsChange({ speed: 8 });
      });

      expect(result.current.showResetToast).toBe(false);
    });
  });
});
