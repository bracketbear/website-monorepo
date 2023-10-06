import { CircleSprite } from '../sprites/circle'
import BaseSprite from '../sprites/base-sprite'
import RepulsionBehavior from '../behaviors/repulsion-behavior'
import { Pointer } from '../types'
import { BehaviorContext } from '../behaviors'
import { BaseAnimation } from './base-animation'

export interface ParticleGridConfig {
  particleWidth?: number
  particleColor?: string | number | CanvasGradient | CanvasPattern
  xPad?: number
  yPad?: number
  mouseRadius?: number
  repulsionStrength?: number
  driftSpeed?: number
  noiseStrength?: number
}

const defaultConfig: ParticleGridConfig = {
  particleWidth: 10,
  particleColor: '#000000',
  xPad: 10,
  yPad: 10,
  mouseRadius: 100,
  repulsionStrength: 0.1,
  driftSpeed: 1,
  noiseStrength: 1,
}

export class ParticleGridAnimation extends BaseAnimation {
  private particles: BaseSprite[] = []
  private repulsionBehavior: RepulsionBehavior

  config: ParticleGridConfig

  constructor (context: CanvasRenderingContext2D, config: ParticleGridConfig = {}) {
    super(context)
    this.config = { ...defaultConfig, ...config } // merge default values with passed config

    // Initialize behaviors with their respective configurations
    this.repulsionBehavior = new RepulsionBehavior({
      mouseRadius: this.config.mouseRadius,
      repulsionStrength: this.config.repulsionStrength,
    }).setReactionCondition((particle: BaseSprite, context: BehaviorContext) => {
      if (!context.pointer) {
        console.warn('No pointer found in context. Skipping reaction condition.')
        return false
      }

      const distanceToMouse = Math.hypot(context.pointer.x - particle.position.x, context.pointer.y - particle.position.y)
      return distanceToMouse < this.config.mouseRadius
    })
  }

  setup () {
    const canvasWidth = this.context.canvas.width
    const canvasHeight = this.context.canvas.height
    const availableWidth = canvasWidth - this.config.xPad
    const availableHeight = canvasHeight - this.config.yPad
    const columns = Math.floor(availableWidth / (this.config.particleWidth + this.config.xPad))
    const rows = Math.floor(availableHeight / (this.config.particleWidth + this.config.yPad))

    for (let x = 0; x < columns; x++) {
      for (let y = 0; y < rows; y++) {
        const posX = x * (this.config.particleWidth + this.config.xPad) + this.config.xPad / 2
        const posY = y * (this.config.particleWidth + this.config.yPad) + this.config.yPad / 2

        const particle = new CircleSprite(
          this.context,
          this.config.particleWidth / 2,
          { x: posX, y: posY },
        )

        particle.position = { x: posX, y: posY }
        particle.fillColor = this.config.particleColor ?? '#000000'
        this.particles.push(particle)
      }
    }
  }

  animate (timestamp: number, pointer: Pointer) {
    this.particles.forEach((particle) => {
      this.repulsionBehavior.performBehavior(particle, { pointer, timestamp })

      particle.draw()
    })
  }

  reset () {
    this.particles = []
    this.setup()
  }
}
