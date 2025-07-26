import { Application as PixiApp } from 'pixi.js';
import {
  BaseApplication,
  type ApplicationConfig,
} from '@bracketbear/flateralus';

/**
 * PixiApplication extends BaseApplication to provide PIXI.js-specific functionality.
 * It can work with both React refs and direct canvas/container elements.
 */
export class PixiApplication extends BaseApplication<PixiApp> {
  private pixiApp: PixiApp | null = null;

  /**
   * Create and configure a PIXI.js application
   */
  protected async createContext(config: ApplicationConfig): Promise<PixiApp> {
    const app = new PixiApp();

    await app.init({
      width: config.width,
      height: config.height,
      backgroundAlpha: config.backgroundAlpha,
      antialias: config.antialias,
      resolution: config.resolution,
      autoDensity: config.autoDensity,
    });

    this.pixiApp = app;
    return app;
  }

  /**
   * Start the PIXI render loop
   */
  protected startRenderLoop(): void {
    if (!this.pixiApp) return;

    // PIXI handles its own render loop through the ticker
    this.pixiApp.ticker.add(this.updateAnimation, this);
    this.pixiApp.ticker.start();
  }

  /**
   * Stop the PIXI render loop
   */
  protected stopRenderLoop(): void {
    if (!this.pixiApp) return;

    this.pixiApp.ticker.remove(this.updateAnimation, this);
    this.pixiApp.ticker.stop();
  }

  /**
   * Handle resize events for PIXI
   */
  protected handleResize(width: number, height: number): void {
    if (!this.pixiApp) return;

    this.pixiApp.renderer.resize(width, height);

    // Re-initialize animation with new dimensions if needed
    if (this.animation) {
      // You might want to call a resize method on the animation
      // or re-initialize it depending on your needs
    }
  }

  /**
   * Get the PIXI canvas element
   */
  public getCanvas(): HTMLCanvasElement | null {
    return this.pixiApp?.canvas || null;
  }

  /**
   * Get the PIXI Application instance
   */
  public getPixiApp(): PixiApp | null {
    return this.pixiApp;
  }

  /**
   * Override destroy to properly clean up PIXI resources
   */
  public destroy(): void {
    if (this.pixiApp) {
      try {
        this.pixiApp.destroy(true, { children: true, texture: true });
      } catch (error) {
        console.warn('Error destroying PIXI app:', error);
      }
      this.pixiApp = null;
    }

    super.destroy();
  }
}
