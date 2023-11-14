import { BaseSprite, CircleSprite, GridGenerator } from 'flateralus'
import type { GeneratorGetSprite, GridGeneratorConfig } from 'flateralus'

export interface ParticleGridConfig extends GridGeneratorConfig {
  getSprite: GeneratorGetSprite
}

const defaultConfig: ParticleGridConfig = {
  fillContainer: false,
  width: 1000,
  height: 1000,
  spriteWidth: 100,
  spriteHeight: 100,
  gap: 10,
  getSprite: (context: CanvasRenderingContext2D) => new CircleSprite(context, 10),
}

export class ParticleGridSprite extends BaseSprite {
  config: ParticleGridConfig
  generator: GridGenerator

  constructor (context: CanvasRenderingContext2D, config: Partial<ParticleGridConfig> = {}) {
    super(context)
    this.config = { ...defaultConfig, ...config } // merge default values with passed config
    this.generator = new GridGenerator(context, this.config)
    this.setup()
  }

  setup (): void {
    const sprites = this.generator.generate(this.config.getSprite)
    this.setChildren(sprites)
  }

  reset (): void {
    this.removeAllChildren()
    this.setup()
  }
}
