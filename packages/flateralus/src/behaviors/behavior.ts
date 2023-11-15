import { BaseSprite, DrawContext } from '..';

export abstract class Behavior<TConfig> {
  abstract execute (sprite: BaseSprite, config: TConfig, ctx: DrawContext): void;
} 
