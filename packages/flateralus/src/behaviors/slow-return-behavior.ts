import { Behavior, Sprite } from "..";
import type { DrawContext } from "../types";

export class SlowReturnBehavior implements Behavior<undefined> {
  execute(sprite: Sprite, _config: undefined, _ctx: DrawContext): void {
    const { originalPosition } = sprite;
  
    sprite.position.x += (originalPosition.x - sprite.position.x) / 10;
    sprite.position.y += (originalPosition.y - sprite.position.y) / 10;
  }
}