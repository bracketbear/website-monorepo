import { Pointer } from '../types'

export interface BaseAnimationConfig {}

/**
 * BaseAnimation is an abstract class which represents the basic structure of an animation.
 */
export abstract class BaseAnimation {
  /**
   * A reference to the 2D rendering context to use for drawing the animation.
   */
  protected context: CanvasRenderingContext2D

  /**
   * The configuration object for this animation. Subclasses can define their own configuration interfaces and extend this one.
   */
  protected config: BaseAnimationConfig | null

  /**
   * Constructor for BaseAnimation class.
   *
   * @param context - The 2D rendering context to use for drawing the animation.
   * @param config - The configuration object for this animation.
   */
  constructor (context: CanvasRenderingContext2D, config?: BaseAnimationConfig) {
    this.context = context
    this.config = config ?? null
  }

  /**
   * setup is called once before the animation starts.
   * Use this method to prepare any necessary initial state or pre-calculate values for the animation.
   */
  abstract setup(): void;

  /**
   * animate is called repeatedly by the requestAnimationFrame API to draw each frame of the animation.
   * This method should contain the logic for updating the animation's state and drawing each frame.
   *
   * @param timestamp - The timestamp passed from the requestAnimationFrame API. This can be used to calculate elapsed time for time-based animation calculations.
   * @param pointer - The object providing current position of the mouse on the canvas. Useful for animations that react to mouse position.
   */
  abstract animate(timestamp: number, pointer: Pointer): void;

  /**
   * reset is called when the animation needs to be stopped and restarted.
   * This method should contain the logic for cleaning up the current state of the animation and returning it to the state it was in after setup was called.
   * Consider what variables or properties might need to be reset to their initial values for the animation to start cleanly again.
   */
  abstract reset(): void;
}
