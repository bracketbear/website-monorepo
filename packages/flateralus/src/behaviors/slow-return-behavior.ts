import { Behavior, BaseSprite, DrawContext } from "..";

export class SlowReturnBehavior extends Behavior<undefined> {
  execute(sprite: BaseSprite, _config: undefined, _ctx: DrawContext): void {
    const { originalPosition } = sprite;
  
    sprite.position.x += (originalPosition.x - sprite.position.x) / 10;
    sprite.position.y += (originalPosition.y - sprite.position.y) / 10;
  }
}