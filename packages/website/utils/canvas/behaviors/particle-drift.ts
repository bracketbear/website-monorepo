import { CircleSprite } from '../sprites/circle'
import BaseSprite from '../sprites/base-sprite'
import { BaseBehavior, BehaviorContext } from './base-behavior'

export interface ParticleDriftBehaviorConfig {
  driftSpeed: number
}

export class ParticleDriftBehavior extends BaseBehavior<ParticleDriftBehaviorConfig> {
  constructor (config: ParticleDriftBehaviorConfig) {
    super(config)
  }

  perform (sprite: BaseSprite, _context: BehaviorContext): void {
    sprite.position.x += (sprite.originalPosition.x - sprite.position.x) * this.config.driftSpeed
    sprite.position.y += (sprite.originalPosition.y - sprite.position.y) * this.config.driftSpeed
  }
}
