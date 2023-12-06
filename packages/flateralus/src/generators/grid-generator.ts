import { BaseGenerator, BaseGeneratorConfig, GeneratorGetSprite } from ".";
import { Sprite } from "..";

/**
 * Configuration options for the GridGenerator.
 */
export interface GridGeneratorConfig extends BaseGeneratorConfig {
  /** If true, width and height are ignored. */
  fillContainer: boolean
  /** Width of the area to fill. */
  width: number;
  /** Height of the area to fill. */
  height: number;
  /** Width of each sprite. */
  spriteWidth: number;
  /** Height of each sprite. */
  spriteHeight: number;
  /** Gap between sprites, applies to both X and Y axis. */
  gap: number;
}

const defaultConfig: GridGeneratorConfig = {
  fillContainer: false,
  width: 1000,
  height: 1000,
  spriteWidth: 100,
  spriteHeight: 100,
  gap: 10,
}


export class GridGenerator extends BaseGenerator<GridGeneratorConfig> {
  constructor(context: CanvasRenderingContext2D, config: Partial<GridGeneratorConfig> = {}) {
    const configWithDefaults = { ...defaultConfig, ...config };
    super(context, configWithDefaults);
  }

  generate(getSprite: GeneratorGetSprite): Sprite[] {
    const sprites: Sprite[] = [];
    const { width, height, spriteWidth, spriteHeight, gap, fillContainer } = this.config;
    const computedWidth = fillContainer ? this.canvasContext.canvas.width : width
    const computedHeight = fillContainer ? this.canvasContext.canvas.height : height

    // Calculate the number of columns and rows based on the provided dimensions, sprite size and gap.
    const columns = Math.floor((computedWidth + gap) / (spriteWidth + gap));
    const rows = Math.floor((computedHeight + gap) / (spriteHeight + gap));

    for (let x = 0; x < columns; x++) {
      for (let y = 0; y < rows; y++) {
        const posX = x * (spriteWidth + gap);
        const posY = y * (spriteHeight + gap);
        const sprite = getSprite(this.canvasContext);
        sprite.setPosition(posX, posY);
        
        sprites.push(sprite);
      }
    }

    return sprites;
  }
}