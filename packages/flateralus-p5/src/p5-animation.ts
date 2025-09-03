import p5 from 'p5';
import { BaseAnimation } from '@bracketbear/flateralus';
import type {
  AnimationManifest,
  ManifestToControlValues,
} from '@bracketbear/flateralus';

/**
 * P5Animation is a p5.js-specific adapter for Flateralus animations.
 * It extends the rendering-agnostic BaseAnimation, using p5 as the context.
 */
export abstract class P5Animation<
  TManifest extends AnimationManifest,
  TControlValues extends
    ManifestToControlValues<TManifest> = ManifestToControlValues<TManifest>,
> extends BaseAnimation<TManifest, TControlValues, p5> {
  /**
   * Initialize the animation with a p5 instance context.
   * Calls the user-defined onInit lifecycle method.
   */
  onInit(_context: p5, _controls: TControlValues): void {
    // To be implemented by subclasses
  }

  /**
   * Update the animation each frame.
   * Calls the user-defined onUpdate lifecycle method.
   */
  onUpdate(_context: p5, _controls: TControlValues, _deltaTime: number): void {
    // To be implemented by subclasses
  }

  /**
   * Handle animation reset logic.
   * Calls the user-defined onReset lifecycle method.
   */
  protected onReset(_context: p5, _controls: TControlValues): void {
    // To be implemented by subclasses
  }

  /**
   * Clean up the animation and p5 resources.
   */
  onDestroy(): void {
    // To be implemented by subclasses
  }
}
