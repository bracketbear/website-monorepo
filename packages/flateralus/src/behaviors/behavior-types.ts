import { BaseSprite, Pointer } from '..';

export interface BehaviorContext {
  pointer: Pointer
  timestamp: number
  deltaTime: number
  // Any other data that might be relevant to your behaviors
  [key: string]: any
}

export type Behavior<TConfig> = (sprite: BaseSprite, config: TConfig, ctx: BehaviorContext) => void;
