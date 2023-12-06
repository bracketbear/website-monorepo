import { Behavior } from "."
import { Sprite, DrawContext } from ".."

export interface RepulsionBehaviorConfig {
  mouseRadius: number
  repulsionStrength: number
}

export class RepulsionBehavior extends Behavior<RepulsionBehaviorConfig> {
  execute(sprite: Sprite, config: RepulsionBehaviorConfig, context: DrawContext): void {
    const { pointer } = context
    const defaultConfig: RepulsionBehaviorConfig = {
      mouseRadius: 100,
      repulsionStrength: 1.5,
    }
    const newConfig: RepulsionBehaviorConfig = {...defaultConfig, ...config}
    const distanceToPointer = Math.hypot(pointer.position.x - sprite.position.x, pointer.position.y - sprite.position.y)
    const maxDistance = pointer.diameter * newConfig.mouseRadius
    const angle = Math.atan2(sprite.position.y - pointer.position.y, sprite.position.x - pointer.position.x)
    const influence = (maxDistance - distanceToPointer) / maxDistance
  
    sprite.position.x += Math.cos(angle) * newConfig.repulsionStrength * influence
    sprite.position.y += Math.sin(angle) * newConfig.repulsionStrength * influence
  }
}
