import { Behavior } from ".";

export interface RotationBehaviorConfig {
  rotationSpeed: number;  // Rotation speed where 100 is a full rotation clockwise in one second
}

export const rotationBehavior: Behavior<RotationBehaviorConfig> = (
  sprite,
  config,
  ctx
) => {
  const rotationSpeed = config?.rotationSpeed || 0.005;
  
  // Calculate the rotation amount based on the time elapsed and the rotation speed
  const rotationAmount = (rotationSpeed / 1000) * ctx.deltaTime * 360;
  
  // Rotate the sprite by the calculated amount
  sprite.rotate(rotationAmount);
};
