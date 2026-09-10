import { Application as PixiApplication, Container } from 'pixi.js';
import { BaseAnimation } from '@bracketbear/flateralus';
import type {
  AnimationManifest,
  ManifestToControlValues,
} from '@bracketbear/flateralus';
import type { PointerService } from './pointer-service';

/**
 * PixiAnimation is a PIXI.js-specific adapter for Flateralus animations.
 * It extends the rendering-agnostic BaseAnimation, using PixiApplication as
 * the context.
 *
 * The context is the raw PIXI Application, so this class owns a
 * per-animation `root` container: it is added to the stage on init and
 * destroyed on teardown. That is what makes mount -> unmount -> mount
 * leak-free, and it is the contract every ported animation relies on.
 */
export abstract class PixiAnimation<
  TManifest extends AnimationManifest,
  TControlValues extends
    ManifestToControlValues<TManifest> = ManifestToControlValues<TManifest>,
> extends BaseAnimation<TManifest, TControlValues, PixiApplication> {
  /** Per-animation container. Everything an animation draws goes in here. */
  protected root: Container = new Container();

  /**
   * Optional cap on render resolution for expensive shaders, e.g. 1.2.
   * Subclasses override it as a field; the host reads it before init.
   */
  readonly dpr?: number;

  private pointerService: PointerService | null = null;

  /** Give the animation access to shared host-relative pointer state. */
  setPointerService(svc: PointerService): void {
    this.pointerService = svc;
  }

  protected get pointer(): PointerService | null {
    return this.pointerService;
  }

  /**
   * The animation's container, attached to the stage on demand.
   *
   * Attachment is lazy rather than done once in `init` because animations
   * legitimately call `onDestroy` then `onInit` to reset themselves. That
   * cycle allocates a fresh root, and re-attaching here is what stops the
   * new one from being orphaned off-stage.
   */
  protected getRoot(): Container {
    if (!this.root.parent) {
      this.getContext()?.stage.addChild(this.root);
    }
    return this.root;
  }

  /**
   * Attach the root to the stage, then run the normal init lifecycle.
   */
  init(context: PixiApplication): void {
    context.stage.addChild(this.root);
    super.init(context);
  }

  /**
   * Initialize the animation with a PIXI Application context. Abstract so a
   * subclass that forgets it fails to compile rather than silently drawing
   * nothing.
   */
  abstract onInit(context: PixiApplication, controls: TControlValues): void;

  /**
   * Advance the animation one frame. Abstract for the same reason as onInit.
   */
  abstract onUpdate(
    context: PixiApplication,
    controls: TControlValues,
    deltaTime: number
  ): void;

  /**
   * Handle animation reset logic.
   */
  protected onReset(
    _context: PixiApplication,
    _controls: TControlValues
  ): void {
    // To be implemented by subclasses
  }

  /**
   * Tear down the root container. Subclasses that hold GL resources of
   * their own must override this and call `super.onDestroy()` so the root
   * still gets destroyed. A fresh root is allocated so the same instance
   * can be re-initialized.
   */
  onDestroy(): void {
    this.root.parent?.removeChild(this.root);
    this.root.destroy({ children: true });
    this.root = new Container();
  }
}
