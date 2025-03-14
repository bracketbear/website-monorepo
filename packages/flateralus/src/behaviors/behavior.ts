import { Sprite } from '..';
import type { DrawContext } from '../types';

export interface Behavior<TConfig> {
  execute (sprite: Sprite, config: TConfig, ctx: DrawContext): void;
} 
