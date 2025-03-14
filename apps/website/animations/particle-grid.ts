import { Sprite, CircleSprite, GridGenerator } from 'flateralus'
import type { GeneratorGetSprite, GridGeneratorConfig } from 'flateralus'

export interface ParticleGridConfig extends GridGeneratorConfig {
  getSprite: GeneratorGetSprite,
  fillContainer: boolean,
}

const defaultConfig: ParticleGridConfig = {
  fillContainer: false,
  width: 100,
  height: 100,
  spriteWidth: 10,
  spriteHeight: 10,
  gap: 100,
  getSprite: (context: CanvasRenderingContext2D) => new CircleSprite(context, 10),
}

export class ParticleGridSprite extends Sprite {
  config: ParticleGridConfig
  generator: GridGenerator

  constructor (context: CanvasRenderingContext2D, config: Partial<ParticleGridConfig> = {}) {
    super(context)
    this.config = { ...defaultConfig, ...config } // merge default values with passed config
    this.generator = new GridGenerator(context, this.config)
    this.setup()
  }

  override setup (): void {
    const sprites = this.generator.generate(this.config.getSprite)
    this.setChildren(sprites)
  }

  override reset (): void {
    this.removeAllChildren()
    this.setup()
  }
}
