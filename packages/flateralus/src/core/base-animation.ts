import { Application as PixiApplication } from 'pixi.js';
import type {
  Animation,
  AnimationManifest,
  Control,
  ManifestToControlValues,
} from '../types';
import { getManifestDefaultControlValues } from '../utils/getManifestDefaultControlValues';

// ============================================================================
// BASE ANIMATION CLASS
// ============================================================================

/**
 * Base animation class that handles common animation logic
 * Derived animations should extend this and implement lifecycle hooks
 * Now accepts a manifest and infers control types from it.
 */
export abstract class BaseAnimation<
  TManifest extends AnimationManifest,
  TControlValues extends
    ManifestToControlValues<TManifest> = ManifestToControlValues<TManifest>,
> implements Animation<TControlValues>
{
  protected app: PixiApplication | null = null;
  protected controlValues: TControlValues;
  protected previousControlValues: TControlValues;
  protected isInitialized = false;
  protected lastUpdateTime = 0;
  protected manifest: TManifest;

  /**
   * @param manifest The animation manifest (type-safe, deeply readonly)
   * @param initialControls The initial control values
   */
  constructor(manifest: TManifest, initialControls?: Partial<TControlValues>) {
    this.manifest = manifest;
    this.controlValues = {
      ...getManifestDefaultControlValues(manifest),
      ...initialControls,
    } as TControlValues;
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
      const control = manifest.controls.find(
        (control: Control) => control.name === controlName
      );
      return control?.resetsAnimation === true;
    });

    // If reset controls changed, call the reset hook
    if (hasResetChanges && this.app) {
      this.onReset(this.app, controls);
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
  protected onReset(_app: PixiApplication, _controls: TControlValues): void {
    // Default implementation does nothing
    // Override in derived classes to handle animation resets
  }

  abstract onUpdate(
    width: number,
    height: number,
    controls: TControlValues,
    deltaTime: number
  ): void;

  abstract onInit(
    app: PixiApplication,
    width: number,
    height: number,
    controls: TControlValues
  ): void;

  abstract onDestroy(): void;

  /**
   * Get current control values
   */
  getControlValues(): TControlValues {
    return { ...this.controlValues };
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

    this.controlValues = mergedValues;

    // Call lifecycle hook if implemented
    this.onControlsChange(this.controlValues, this.previousControlValues);
  }

  /**
   * Initialize the animation
   */
  init(app: PixiApplication, width: number, height: number): void {
    this.app = app;
    this.isInitialized = true;
    this.lastUpdateTime = Date.now();

    // Call lifecycle hook
    this.onInit(app, width, height, this.controlValues);
  }

  /**
   * Update the animation each frame
   */
  update(width: number, height: number): void {
    if (!this.isInitialized || !this.app) return;

    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = currentTime;

    // Call lifecycle hook if implemented
    this.onUpdate(width, height, this.controlValues, deltaTime);
  }

  /**
   * Destroy the animation
   */
  destroy(): void {
    // Call lifecycle hook if implemented
    this.onDestroy();

    this.app = null;
    this.isInitialized = false;
  }

  /**
   * Helper method to get the PIXI application
   */
  protected getApp(): PixiApplication | null {
    return this.app;
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
  private getChangedControls(
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
