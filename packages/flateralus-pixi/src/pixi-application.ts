import { Application as PixiApp } from 'pixi.js';
import {
  BaseApplication,
  type ApplicationConfig,
  type StageControlValues,
  type StageControlsManifest,
} from '@bracketbear/flateralus';

/**
 * PixiApplication extends BaseApplication to provide PIXI.js-specific functionality.
 * It implements the Application interface and can work with React, vanilla JS, or any other framework.
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
   * Get stage controls manifest for PIXI
   */
  public getStageControlsManifest(): StageControlsManifest {
    return {
      id: 'pixi-stage-controls',
      name: 'Stage Controls',
      description: 'Controls for PIXI.js stage properties',
      controls: [
        {
          name: 'backgroundColor',
          type: 'color',
          label: 'Background Color',
          description: 'Stage background color',
          defaultValue: '#ff6b35',
          debug: true,
          isStageControl: true,
          category: 'background',
        },
        {
          name: 'backgroundAlpha',
          type: 'number',
          label: 'Background Alpha',
          description: 'Background transparency (0-1)',
          defaultValue: 0,
          min: 0,
          max: 1,
          step: 0.01,
          debug: true,
          isStageControl: true,
          category: 'background',
        } as any,
      ],
    };
  }

  /**
   * Handle stage control changes for PIXI
   */
  protected onStageControlsChange(
    controls: StageControlValues,
    previousControls: StageControlValues
  ): void {
    if (!this.pixiApp) return;

    // Update background
    if (
      controls.backgroundColor !== previousControls.backgroundColor ||
      controls.backgroundAlpha !== previousControls.backgroundAlpha
    ) {
      // Convert hex color to number for PIXI
      const bgColor = controls.backgroundColor || '#ff6b35';
      this.pixiApp.renderer.background.color = parseInt(
        bgColor.replace('#', ''),
        16
      );
      this.pixiApp.renderer.background.alpha = controls.backgroundAlpha || 0;
    }
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
