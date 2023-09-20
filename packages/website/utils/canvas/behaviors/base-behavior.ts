import BaseSprite from '../sprites/base-sprite'
import { Pointer } from '../types'

export interface BehaviorContext {
  pointer: Pointer
  timestamp: number
  // Any other data that might be relevant to your behaviors
}

/**
 * BaseBehavior is an abstract class which represents the basic structure of a behavior.
 * Behaviors define how sprites move and interact within an animation.
 */
export abstract class BaseBehavior<TConfig> {
  /**
   * Configuration for this behavior. Subclasses can define their own configuration interfaces and extend the base one.
   */
  protected config: TConfig

  private reactionCondition?: (sprite: BaseSprite, context: BehaviorContext) => boolean

  /**
   * Next behavior to perform after this one.
   */
  private next?: BaseBehavior<any>

  /**
   * Constructor for BaseBehavior class.
   *
   * @param config - The configuration object for this behav  ior.
   */
  constructor (config: TConfig) {
    this.config = config
  }

  /**
   * Determine if the behavior should be performed on a given sprite.
   *
   * @param sprite - The sprite on which the behavior might be performed.
   * @param context - The context in which the behavior is being performed.
   * @returns A boolean indicating if the behavior should be performed.
   */
  public setReactionCondition (condition: (sprite: BaseSprite, context: BehaviorContext) => boolean): BaseBehavior<TConfig> {
    this.reactionCondition = condition
    return this
  }

  protected shouldPerform (sprite: BaseSprite, context: BehaviorContext): boolean {
    if (this.reactionCondition) {
      return this.reactionCondition(sprite, context)
    }

    // By default, always perform the behavior.
    return true
  }

  /**
   * Set the next behavior in the chain.
   *
   * @param next - The next behavior to be performed.
   * @returns The current behavior instance.
   */
  setNext (next: BaseBehavior<any>): BaseBehavior<any> {
    this.next = next
    return this
  }

  /**
   * Perform the behavior if shouldPerform returns true.
   *
   * @param sprite - The sprite this behavior should be applied to.
   * @param context - The context in which the behavior is being performed.
   */
  performBehavior (sprite: BaseSprite, context: BehaviorContext): void {
    if (this.shouldPerform(sprite, context)) {
      this.perform(sprite, context)
    }

    if (this.next) {
      this.next.performBehavior(sprite, context)
    }
  }

  /**
   * Perform the behavior. This method should contain the logic for applying the behavior to the sprite.
   *
   * @param sprite - The sprite this behavior should be applied to.
   * @param context - The context in which the behavior is being performed.
   */
  protected abstract perform(sprite: BaseSprite, context: BehaviorContext): void
}
