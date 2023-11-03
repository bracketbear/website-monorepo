import { BaseGenerator, BaseGeneratorConfig, GeneratorGetSprite } from ".";
import { BaseSprite } from "..";

export interface FibonacciSpiralGeneratorConfig extends BaseGeneratorConfig {
  totalSprites: number; // Total number of sprites to generate
  initialRadius: number; // Initial radius of the spiral
  scaleDownFactor: number; // Factor to scale down the sprite size as it moves inward
}

const defaultConfig: FibonacciSpiralGeneratorConfig = {
  totalSprites: 1000,
  initialRadius: 25,
  scaleDownFactor: 0.99, // 1% reduction per sprite
};

export class FibonacciSpiralGenerator extends BaseGenerator<FibonacciSpiralGeneratorConfig> {
  constructor(context: CanvasRenderingContext2D, config: Partial<FibonacciSpiralGeneratorConfig> = {}) {
    const configWithDefaults = { ...defaultConfig, ...config };
    super(context, configWithDefaults);
  }

  generate(getSprite: GeneratorGetSprite): BaseSprite[] {
    const sprites: BaseSprite[] = [];
    const { totalSprites, initialRadius, scaleDownFactor } = this.config;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const angleIncrement = Math.PI * 2 * goldenRatio;

    for (let i = 0; i < totalSprites; i++) {
      const angle = i * angleIncrement;
      const radius = initialRadius * Math.sqrt(i); // Radius grows with the square root of the index
      const posX = radius * Math.cos(angle);
      const posY = radius * Math.sin(angle);

      const sprite = getSprite(this.context);
      // Scale down the sprite size as it moves inward
      const scaleFactor = Math.pow(scaleDownFactor, i);
      sprite.setScale(scaleFactor);
      sprite.setPosition(posX, posY);

      sprites.push(sprite);
    }

    return sprites;
  }
}
