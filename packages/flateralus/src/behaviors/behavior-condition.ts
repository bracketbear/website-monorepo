import { Behavior, BehaviorContext } from ".";
import { BaseSprite } from "../sprites";

export class BehaviorCondition {
  private behavior: Behavior<any>;
  private condition: (sprite: BaseSprite, ctx: BehaviorContext) => boolean;
  private config: any;

  constructor(behavior: Behavior<any>) {
    this.behavior = behavior;
    this.condition = () => true;
  }

  when(condition: (sprite: BaseSprite, ctx: BehaviorContext) => boolean): BehaviorCondition {
    this.condition = condition;
    return this;
  }

  checkCondition(sprite: BaseSprite, ctx: BehaviorContext): boolean {
    return this.condition(sprite, ctx);
  }
  
  checkAndExecute(sprite: BaseSprite, ctx: BehaviorContext): void {
    if (this.checkCondition(sprite, ctx)) {
      this.behavior(sprite, this.config, ctx);
    }
  }

  getBehavior(): Behavior<any> {
    return this.behavior;
  }
}