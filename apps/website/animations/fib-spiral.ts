import { BaseSprite, CircleSprite, FibonacciSpiralGenerator, rotationBehavior } from 'flateralus'
import type { GeneratorGetSprite, FibonacciSpiralGeneratorConfig } from 'flateralus'

export interface FibonacciSpiralAnimationConfig extends FibonacciSpiralGeneratorConfig {
  getSprite: GeneratorGetSprite
}

const defaultConfig: FibonacciSpiralGeneratorConfig = {
  totalSprites: 1000,
  initialRadius: 25,
  scaleDownFactor: 0.99, // 1% reduction per sprite
  getSprite: (context: CanvasRenderingContext2D) => new CircleSprite(context, 10),
}

export class FibonacciSpiral extends BaseSprite {
  config: FibonacciSpiralAnimationConfig
  generator: FibonacciSpiralGenerator

  constructor (context: CanvasRenderingContext2D, config: Partial<FibonacciSpiralAnimationConfig> = {}) {
    super(context)
    this.config = { ...defaultConfig, ...config } // merge default values with passed config
    this.generator = new FibonacciSpiralGenerator(context, this.config)
    this.setup()
  }

  setup (): void {
    const sprites = this.generator.generate(this.config.getSprite)
    console.log('sprites', sprites)
    this.setChildren(sprites)
    this.setPosition(this.context.canvas.width / 4, this.context.canvas.height / 4)
    this.addBehavior(rotationBehavior)
  }

  reset (): void {
    this.removeAllChildren()
    this.setup()
  }
}
