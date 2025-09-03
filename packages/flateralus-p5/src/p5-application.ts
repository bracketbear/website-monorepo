import p5 from 'p5';
import {
  BaseApplication,
  type ApplicationConfig,
  type StageControlValues,
  type StageControlsManifest,
} from '@bracketbear/flateralus';

/**
 * P5Application extends BaseApplication to provide p5.js-specific functionality.
 */
export class P5Application extends BaseApplication<p5> {
  private p5Instance: p5 | null = null;
  private sketch: ((p: p5) => void) | null = null;

  /**
   * Create and configure a p5.js application
   */
  protected async createContext(config: ApplicationConfig): Promise<p5> {
    return new Promise((resolve) => {
      this.sketch = (p: p5) => {
        // Store the p5 instance
        this.p5Instance = p;

        // Setup function - called once at the beginning
        p.setup = () => {
          const canvas = p.createCanvas(
            config.width || 800,
            config.height || 600
          );

          // Apply canvas classes if specified
          if (this.canvasClassName) {
            canvas.addClass(this.canvasClassName);
          }

          // Set canvas properties
          if (config.antialias !== false) {
            p.smooth();
          }

          // Store canvas reference
          this.canvas = canvas.elt as HTMLCanvasElement;

          // Resolve the promise with the p5 instance
          resolve(p);
        };

        // Draw function - called each frame
        p.draw = () => {
          // Update stage controls
          this.updateStageControlsFromP5(p);

          // Update animation if exists
          if (this.animation) {
            this.animation.update();
          }
        };

        // Window resize handler
        p.windowResized = () => {
          if (this.config.autoResize) {
            p.resizeCanvas(p.windowWidth, p.windowHeight);
            this.handleResize(p.width, p.height);
          }
        };
      };

      // Create p5 instance
      new p5(this.sketch);
    });
  }

  /**
   * Start the p5 render loop
   */
  protected startRenderLoop(): void {
    if (!this.p5Instance) return;

    // p5 handles its own render loop through the draw() function
    // No additional setup needed
  }

  /**
   * Stop the p5 render loop
   */
  protected stopRenderLoop(): void {
    if (!this.p5Instance) return;

    // p5 doesn't have a direct way to stop the loop, but we can pause it
    this.p5Instance.noLoop();
  }

  /**
   * Resume the p5 render loop
   */
  protected resumeRenderLoop(): void {
    if (!this.p5Instance) return;

    this.p5Instance.loop();
  }

  /**
   * Handle resize events for p5
   */
  protected handleResize(width: number, height: number): void {
    if (!this.p5Instance) return;

    // Update stage controls
    this.updateStageControls({
      stageWidth: width,
      stageHeight: height,
    });
  }

  /**
   * Get the p5 canvas element
   */
  public getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  /**
   * Get the p5 instance
   */
  public getP5Instance(): p5 | null {
    return this.p5Instance;
  }

  /**
   * Get stage controls manifest for p5
   */
  public getStageControlsManifest(): StageControlsManifest {
    return {
      id: 'p5-stage-controls',
      name: 'Stage Controls',
      description: 'Controls for p5.js stage properties',
      controls: [
        {
          name: 'backgroundColor',
          type: 'color',
          label: 'Background Color',
          description: 'Stage background color',
          defaultValue: '#ff6b35',
          debug: true,
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
        },
      ],
    };
  }

  /**
   * Update stage controls from p5 instance
   */
  private updateStageControlsFromP5(p: p5): void {
    // Update background color and alpha
    if (this.stageControls.backgroundColor !== 'transparent') {
      const bgColor = this.stageControls.backgroundColor;
      const bgAlpha = this.stageControls.backgroundAlpha;

      if (bgAlpha && bgAlpha < 1 && bgColor) {
        // Convert hex color to RGB and apply alpha
        const hex = bgColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        p.background(r, g, b, Math.floor(bgAlpha * 255));
      } else if (bgColor) {
        p.background(bgColor);
      }
    } else if (this.stageControls.backgroundAlpha === 0) {
      p.clear();
    }
  }

  /**
   * Handle stage control changes for p5
   */
  protected onStageControlsChange(
    _controls: StageControlValues,
    _previousControls: StageControlValues
  ): void {
    if (!this.p5Instance) return;

    // Background changes are handled in updateStageControlsFromP5
    // Additional stage control logic can be added here
  }

  /**
   * Override destroy to properly clean up p5 resources
   */
  public destroy(): void {
    if (this.p5Instance) {
      try {
        // Remove the canvas from the DOM
        this.p5Instance.remove();
      } catch (error) {
        console.warn('Error destroying p5 instance:', error);
      }
      this.p5Instance = null;
    }

    super.destroy();
  }
}
