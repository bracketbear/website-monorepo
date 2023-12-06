import { Behavior } from ".";
import { Sprite, DrawContext } from "..";

/**
 * Represents a behavior condition that can be used to execute a behavior based on a certain condition.
 * @template T - The type of the behavior.
 */
export class BehaviorCondition<T> {
  private behavior: Behavior<T>;
  private condition: (sprite: Sprite, ctx: DrawContext) => boolean;
  private config: any;

  /**
   * Creates a new instance of the `BehaviorCondition` class.
   * @param behavior - The behavior to execute.
   */
  constructor(Behavior: new () => Behavior<T>) {
    this.behavior = new Behavior();
    this.condition = () => true;
  }

  /**
   * Sets the condition that must be met for the behavior to execute.
   * @param condition - The condition to check.
   * @returns The current instance of the `BehaviorCondition` class.
   */
  when(condition: (sprite: Sprite, ctx: DrawContext) => boolean): BehaviorCondition<T> {
    this.condition = condition;
    return this;
  }

  /**
   * Checks if the condition is met for the behavior to execute.
   * @param sprite - The sprite to check the condition against.
   * @param ctx - The context of the behavior.
   * @returns A boolean indicating whether the condition is met.
   */
  checkCondition(sprite: Sprite, ctx: DrawContext): boolean {
    return this.condition(sprite, ctx);
  }
  
  /**
   * Checks if the condition is met and executes the behavior if it is.
   * @param sprite - The sprite to check the condition against.
   * @param ctx - The draw context.
   */
  checkAndExecute(sprite: Sprite, ctx: DrawContext): void {
    if (this.checkCondition(sprite, ctx)) {
      this.behavior.execute(sprite, this.config, ctx);
    }
  }

  /**
   * Gets the behavior associated with this `BehaviorCondition`.
   * @returns The behavior associated with this `BehaviorCondition`.
   */
  getBehavior(): Behavior<T> {
    return this.behavior;
  }
}