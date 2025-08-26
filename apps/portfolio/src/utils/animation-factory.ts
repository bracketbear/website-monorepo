import { PixiApplication } from '@bracketbear/flateralus-pixi';
import type { Application } from '@bracketbear/flateralus';

/**
 * Factory function to create PixiApplication instances
 * This provides the applicationFactory prop for AnimationStage
 */
export const createPixiApplication = (options?: any): Application => {
  return new PixiApplication(options);
};
