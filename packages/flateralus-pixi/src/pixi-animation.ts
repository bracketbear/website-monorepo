import { Application as PixiApplication } from 'pixi.js';
import { BaseAnimation } from '@bracketbear/flateralus';
import type {
  AnimationManifest,
  ManifestToControlValues,
} from '@bracketbear/flateralus';

/**
 * PixiAnimation is a PIXI.js-specific adapter for Flateralus animations.
 * It extends the rendering-agnostic BaseAnimation, using PixiApplication as the context.
 */
export abstract class PixiAnimation<
  TManifest extends AnimationManifest,
  TControlValues extends
    ManifestToControlValues<TManifest> = ManifestToControlValues<TManifest>,
> extends BaseAnimation<TManifest, TControlValues, PixiApplication> {
  /**
   * Initialize the animation with a PIXI Application context.
   * Calls the user-defined onInit lifecycle method.
   */
  onInit(_context: PixiApplication, _controls: TControlValues): void {
    // To be implemented by subclasses
  }

  /**
   * Update the animation each frame.
   * Calls the user-defined onUpdate lifecycle method.
   */
  onUpdate(
    _context: PixiApplication,
    _controls: TControlValues,
    _deltaTime: number
  ): void {
    // To be implemented by subclasses
  }

  /**
   * Handle animation reset logic.
   * Calls the user-defined onReset lifecycle method.
   */
  protected onReset(
    _context: PixiApplication,
    _controls: TControlValues
  ): void {
    // To be implemented by subclasses
  }

  /**
   * Clean up the animation and PIXI resources.
   */
  onDestroy(): void {
    // To be implemented by subclasses
  }
}
