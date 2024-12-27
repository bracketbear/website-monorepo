// src/behaviors/particle-repulsion-behavior.ts
import BaseSprite from '../sprites/base-sprite'
import { BaseBehavior, BehaviorContext } from './base-behavior'

export interface RepulsionBehaviorConfig {
  mouseRadius: number
  repulsionStrength: number
}

export class RepulsionBehavior extends BaseBehavior<RepulsionBehaviorConfig> {
  constructor (config: RepulsionBehaviorConfig) {
    super(config)
  }

  protected perform (particle: BaseSprite, context: BehaviorContext): void {
    const distanceToMouse = Math.hypot(context.pointer.x - particle.position.x, context.pointer.y - particle.position.y)
    const maxDistance = this.config.mouseRadius
    const angle = Math.atan2(particle.position.y - context.pointer.y, particle.position.x - context.pointer.x)
    const influence = (maxDistance - distanceToMouse) / maxDistance

    particle.position.x += Math.cos(angle) * this.config.repulsionStrength * influence
    particle.position.y += Math.sin(angle) * this.config.repulsionStrength * influence
  }
}

export default RepulsionBehavior
