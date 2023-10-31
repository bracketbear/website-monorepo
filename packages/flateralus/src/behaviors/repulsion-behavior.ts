// src/behaviors/particle-repulsion-behavior.ts
import BaseSprite from '../sprites/base-sprite'
import { BaseBehavior, Behavior, BehaviorContext } from './base-behavior'

export interface RepulsionBehaviorConfig {
  mouseRadius: number
  repulsionStrength: number
}

export const RepulsionBehavior: Behavior<RepulsionBehaviorConfig> = (particle, config, context) => {
  const { pointer } = context
  const defaultConfig: RepulsionBehaviorConfig = {
    mouseRadius: 100,
    repulsionStrength: 1.5,
  }
  const newConfig: RepulsionBehaviorConfig = {...defaultConfig, ...config}
  const distanceToMouse = Math.hypot(pointer.position.x - particle.position.x, pointer.position.y - particle.position.y)
  const maxDistance = newConfig.mouseRadius
  const angle = Math.atan2(particle.position.y - pointer.position.y, particle.position.x - pointer.position.x)
  const influence = (maxDistance - distanceToMouse) / maxDistance

  particle.position.x += Math.cos(angle) * newConfig.repulsionStrength * influence
  particle.position.y += Math.sin(angle) * newConfig.repulsionStrength * influence
}
