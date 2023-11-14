import { BaseSprite } from "..";

/** 
 * The base configuration for generators. Subclasses can extend this to include additional configuration options. 
 * Note: Might not be necessary.
 * */ 
export interface BaseGeneratorConfig {}

/** 
 * A function that returns a BaseSprite. Used as a callback in the generate method.
 * */ 
export type GeneratorGetSprite = (context: CanvasRenderingContext2D) => BaseSprite;

/** 
 * The abstract BaseGenerator class.
 * Provides a base implementation for generating and arranging sprites.
 * Subclasses should implement the generate method to create and arrange sprites.
 * */ 
export abstract class BaseGenerator<TConfig extends BaseGeneratorConfig> {
  /** 
   * The canvas rendering context used for drawing sprites.
   * */ 
  protected canvasContext: CanvasRenderingContext2D;
  
  /** 
   * The configuration object for the generator.
   * */ 
  protected config: TConfig;

  /** 
   * Creates a new instance of the BaseGenerator class.
   * @param context - The canvas rendering context used for drawing sprites.
   * @param config - The configuration object for the generator.
   * */ 
  constructor(context: CanvasRenderingContext2D, config: TConfig) {
    this.canvasContext = context;
    this.config = config;
  }

  /** 
   * Generates and arranges sprites.
   * This method should be implemented by subclasses.
   * @param getSprite - A callback function that returns a BaseSprite.
   * @returns An array of BaseSprites.
   * */ 
  abstract generate(getSprite: GeneratorGetSprite): BaseSprite[];
}