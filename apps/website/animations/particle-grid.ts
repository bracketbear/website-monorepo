import { BaseSprite, BaseAnimation, CircleSprite } from 'flateralus'
import type { Pointer } from 'flateralus'

export interface ParticleGridConfig {
  particleWidth: number
  particleColor: string | number | CanvasGradient | CanvasPattern
  xPad: number
  yPad: number
  mouseRadius: number
  repulsionStrength: number
  driftSpeed: number
  noiseStrength: number
  getSprite: (context: CanvasRenderingContext2D, config: ParticleGridConfig) => BaseSprite,
}

const defaultConfig: ParticleGridConfig = {
  particleWidth: 100,
  particleColor: 'red',
  xPad: 10,
  yPad: 10,
  mouseRadius: 100,
  repulsionStrength: 0.1,
  driftSpeed: 1,
  noiseStrength: 1,
  getSprite: (context, config) => new CircleSprite(context, config.particleWidth ?? 10, { x: 0, y: 0 }),
}

export class ParticleGridAnimation extends BaseAnimation {
  private particles: BaseSprite[] = []

  config: ParticleGridConfig

  constructor (context: CanvasRenderingContext2D, config: Partial<ParticleGridConfig> = {}) {
    super(context)
    this.config = { ...defaultConfig, ...config } // merge default values with passed config
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
        const particle = this.config.getSprite(this.context, this.config)
        particle.setPosition(posX, posY)

        this.particles.push(particle)
      }
    }
  }

  animate (timestamp: number, pointer: Pointer) {
    const ctx = { timestamp, pointer }

    this.particles.forEach((particle) => {
      particle.draw(ctx)
    })
  }

  reset () {
    this.particles = []
    this.setup()
  }
}
