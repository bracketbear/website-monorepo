import { Behavior, Sprite } from '..';
import type { DrawContext } from '../types';

const SPEED = 10 as const;

export class SlowReturnBehavior implements Behavior<undefined> {
  execute(sprite: Sprite, _config: undefined, _ctx: DrawContext): void {
    const { originalPosition } = sprite;

    sprite.position.x += (originalPosition.x - sprite.position.x) / SPEED;
    sprite.position.y += (originalPosition.y - sprite.position.y) / SPEED;
  }
}
