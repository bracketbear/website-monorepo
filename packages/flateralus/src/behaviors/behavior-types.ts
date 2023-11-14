import { BaseSprite, Pointer } from '..';

export interface DrawContext {
  pointer: Pointer
  timestamp: number
  // Any other data that might be relevant to your behaviors
  [key: string]: any
}

export type Behavior<TConfig> = (sprite: BaseSprite, config: TConfig, ctx: DrawContext) => void;
