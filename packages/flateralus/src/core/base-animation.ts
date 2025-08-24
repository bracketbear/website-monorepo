import type {
  Animation,
  AnimationManifest,
  ManifestToControlValues,
} from '../types';
import { getManifestDefaultControlValues } from '../utils/get-manifest-default-control-values';
import { createControlValuesSchema } from '../utils/create-control-values-schema';

// ============================================================================
// BASE ANIMATION CLASS
// ============================================================================

/**
 * BaseAnimation is an abstract, rendering-agnostic class for schema-driven, controllable animations.
 *
 * @template TManifest - The animation manifest type (deeply readonly, describes controls)
 * @template TControlValues - The inferred control values type from the manifest
 * @template TContext - The rendering or animation context (e.g., PIXI Application, Canvas, etc.)
 *
 * Extend this class and implement the lifecycle methods to create a new animation.
 * Use an adapter (e.g., PixiAnimation) for framework-specific logic.
 */
export abstract class BaseAnimation<
  TManifest extends AnimationManifest,
  TControlValues extends
    ManifestToControlValues<TManifest> = ManifestToControlValues<TManifest>,
  TContext = unknown,
> implements Animation<TControlValues, TContext>
{
  protected context: TContext | null = null;
  protected controlValues: TControlValues;
  protected previousControlValues: TControlValues;
  protected isInitialized = false;
  protected lastUpdateTime = 0;
  protected manifest: TManifest;
  protected isResetting = false;
  private onControlsUpdated?: (values: TControlValues) => void;

  /**
   * @param manifest The animation manifest (type-safe, deeply readonly)
   * @param initialControls The initial control values
   * @param onControlsUpdated Optional callback when controls are updated
   */
  constructor(
    manifest: TManifest,
    initialControls?: Partial<TControlValues>,
    onControlsUpdated?: (values: TControlValues) => void
  ) {
    this.manifest = manifest;
    this.onControlsUpdated = onControlsUpdated;
    const schema = createControlValuesSchema(manifest);
    const merged = {
      ...getManifestDefaultControlValues(manifest),
      ...initialControls,
    };
    const result = schema.safeParse(merged);
    if (!result.success) {
      throw new Error('Invalid control values: ' + result.error.message);
    }
    this.controlValues = result.data as TControlValues;
    this.previousControlValues = { ...this.controlValues };
  }

  /**
   * Get the animation manifest
   */
  getManifest(): TManifest {
    return this.manifest;
  }

  /**
   * Handle control changes - can be overridden for custom logic
   * Base implementation automatically handles resetsAnimation controls
   */
  onControlsChange(
    controls: TControlValues,
    previousControls: TControlValues
  ): void {
    const manifest = this.getManifest();
    const changedControls = this.getChangedControls(controls, previousControls);

    // Check if any reset controls have changed
    const hasResetChanges = changedControls.some((controlName) => {
      const control = manifest.controls.find((control) => {
        return control.name === controlName;
      });
      return control?.resetsAnimation === true;
    });

    // If reset controls changed, call the reset hook
    if (hasResetChanges && this.context) {
      this.reset(controls);
    }

    // Call the dynamic update hook for all changed controls
    if (changedControls.length > 0) {
      this.onDynamicControlsChange(controls, previousControls, changedControls);
    }
  }

  /**
   * Hook for handling dynamic control changes (non-reset controls)
   * Override this for custom dynamic update logic
   */
  protected onDynamicControlsChange(
    _controls: TControlValues,
    _previousControls: TControlValues,
    _changedControls: string[]
  ): void {
    // Default implementation does nothing
    // Override in derived classes for custom dynamic update logic
  }

  /**
   * Hook for handling animation resets when reset controls change
   * Override this to recreate animation state
   */
  protected onReset(_context: TContext, _controls: TControlValues): void {
    // Default implementation does nothing
    // Override in derived classes to handle animation resets
  }

  /**
   * Animation update lifecycle method (must be implemented by subclass)
   */
  abstract onUpdate(
    context: TContext,
    controls: TControlValues,
    deltaTime: number
  ): void;

  /**
   * Animation initialization lifecycle method (must be implemented by subclass)
   */
  abstract onInit(context: TContext, controls: TControlValues): void;

  /**
   * Animation destroy lifecycle method (must be implemented by subclass)
   */
  abstract onDestroy(): void;

  /**
   * Get current control values
   */
  getControlValues(): TControlValues {
    return { ...this.controlValues };
  }

  /**
   * Set the controls updated callback
   */
  setOnControlsUpdated(callback?: (values: TControlValues) => void): void {
    this.onControlsUpdated = callback;
  }

  /**
   * Update control values and trigger lifecycle hooks
   */
  updateControls(values: Partial<TControlValues>): void {
    // Store previous values for comparison
    this.previousControlValues = { ...this.controlValues };

    // Merge new values
    const mergedValues = { ...this.controlValues };
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined) {
        (mergedValues as any)[key] = value;
      }
    });

    // Validate merged values
    const schema = createControlValuesSchema(this.manifest);
    const result = schema.safeParse(mergedValues);
    if (!result.success) {
      throw new Error('Invalid control values: ' + result.error.message);
    }
    this.controlValues = result.data as TControlValues;

    // Call lifecycle hook if implemented
    this.onControlsChange(this.controlValues, this.previousControlValues);

    // Notify callback after controls are updated
    if (this.onControlsUpdated) {
      this.onControlsUpdated(this.controlValues);
    }
  }

  /**
   * Initialize the animation
   */
  init(context: TContext): void {
    this.context = context;
    this.isInitialized = true;
    this.lastUpdateTime = Date.now();

    // Call lifecycle hook
    this.onInit(context, this.controlValues);
  }

  /**
   * Update the animation each frame
   */
  update(): void {
    if (!this.isInitialized || !this.context) return;

    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = currentTime;

    // Call lifecycle hook if implemented
    this.onUpdate(this.context, this.controlValues, deltaTime);
  }

  /**
   * Reset the animation
   */
  reset(controls?: Partial<TControlValues>): void {
    if (!this.context) return;

    // Get default values from manifest
    const defaultControls = getManifestDefaultControlValues(this.manifest);

    // Merge provided controls with defaults
    const resetControls = controls
      ? { ...defaultControls, ...controls }
      : defaultControls;

    // Validate reset controls
    const schema = createControlValuesSchema(this.manifest);
    const result = schema.safeParse(resetControls);
    if (!result.success) {
      throw new Error('Invalid control values: ' + result.error.message);
    }
    // Update control values to the reset values
    this.controlValues = result.data as TControlValues;
    this.previousControlValues = { ...this.controlValues };

    this.isResetting = true;
    this.onReset(this.context, this.controlValues);
    this.isResetting = false;

    // Notify callback after reset
    if (this.onControlsUpdated) {
      this.onControlsUpdated(this.controlValues);
    }
  }

  /**
   * Destroy the animation
   */
  destroy(): void {
    // Call lifecycle hook if implemented
    this.onDestroy();

    this.context = null;
    this.isInitialized = false;
  }

  /**
   * Helper method to get the rendering context
   */
  protected getContext(): TContext | null {
    return this.context;
  }

  /**
   * Helper method to get current control values
   */
  protected getControls(): TControlValues {
    return this.controlValues;
  }

  /**
   * Helper method to check if a control value has changed
   */
  protected hasControlChanged<K extends keyof TControlValues>(key: K): boolean {
    return this.controlValues[key] !== this.previousControlValues[key];
  }

  /**
   * Helper method to get all changed control names
   */
  protected getChangedControls(
    controls: TControlValues,
    previousControls: TControlValues
  ): string[] {
    const changed: string[] = [];
    Object.keys(controls).forEach((key) => {
      if (
        controls[key as keyof TControlValues] !==
        previousControls[key as keyof TControlValues]
      ) {
        changed.push(key);
      }
    });
    return changed;
  }
}
