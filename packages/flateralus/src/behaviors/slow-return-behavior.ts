import type { Behavior } from ".";

export const slowReturnBehavior: Behavior<any> = (sprite) => {
  const { originalPosition } = sprite;

  sprite.position.x += (originalPosition.x - sprite.position.x) / 10;
  sprite.position.y += (originalPosition.y - sprite.position.y) / 10;
}