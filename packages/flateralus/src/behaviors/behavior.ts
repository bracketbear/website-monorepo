import { Sprite, DrawContext } from '..';

export abstract class Behavior<TConfig> {
  abstract execute (sprite: Sprite, config: TConfig, ctx: DrawContext): void;
} 
