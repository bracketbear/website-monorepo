import type {
  Animation,
  Application,
  StageControlValues,
  StageControlsManifest,
} from '../types';

// ============================================================================
// BASE APPLICATION CLASS
// ============================================================================

export interface ApplicationConfig {
  /** Initial width of the application */
  width?: number;
  /** Initial height of the application */
  height?: number;
  /** Whether to enable automatic resizing */
  autoResize?: boolean;
  /** Background color (transparent by default) */
  backgroundColor?: string;
  /** Background alpha (0 for transparent) */
  backgroundAlpha?: number;
  /** Whether to enable antialiasing */
  antialias?: boolean;
  /** Device pixel ratio (auto-detected by default) */
  resolution?: number;
  /** Whether to enable auto density */
  autoDensity?: boolean;
}

export interface ApplicationOptions {
  /** Configuration for the application */
  config?: ApplicationConfig;
  /** Whether to pause when not visible */
  pauseWhenHidden?: boolean;
  /** Visibility threshold for pausing */
  visibilityThreshold?: number;
  /** Whether to enable luminance detection */
  enableLuminanceDetection?: boolean;
  /** Initial stage control values */
  stageControls?: Partial<StageControlValues>;
  /** CSS classes to apply to the canvas element */
  canvasClassName?: string;
}

/**
 * BaseApplication is an abstract, rendering-agnostic class for managing animation applications.
 * It implements the Application interface and handles common application lifecycle.
 *
 * @template TContext - The rendering context type (e.g., PIXI.Application, Canvas2DContext, etc.)
 */
export abstract class BaseApplication<TContext = unknown>
  implements Application<Animation<any, TContext>>
{
  protected context: TContext | null = null;
  protected animation: Animation<any, TContext> | null = null;
  protected container: HTMLElement | null = null;
  protected canvas: HTMLCanvasElement | null = null;
  protected config: ApplicationConfig;
  protected options: ApplicationOptions;
  protected stageControls: StageControlValues;
  protected canvasClassName?: string;
  protected _isInitialized = false;
  protected _isRunning = false;
  protected resizeObserver: ResizeObserver | null = null;
  /** The box the surface was last drawn at, shared by every resize path. */
  private lastResize = { width: 0, height: 0 };

  constructor(options: ApplicationOptions = {}) {
    this.config = {
      width: 800,
      height: 600,
      autoResize: true,
      backgroundColor: 'transparent',
      backgroundAlpha: 0,
      antialias: true,
      // Safe for SSR - will be updated when init() is called
      resolution: 1,
      autoDensity: true,
      ...options.config,
    };
    this.options = {
      pauseWhenHidden: true,
      visibilityThreshold: 0.1,
      enableLuminanceDetection: true,
      ...options,
    };
    this.canvasClassName = options.canvasClassName;

    // Initialize stage controls with defaults
    this.stageControls = {
      backgroundColor: this.config.backgroundColor || 'transparent',
      backgroundAlpha: this.config.backgroundAlpha || 0,
      stageWidth: this.config.width || 800,
      stageHeight: this.config.height || 600,
      enableGrid: false,
      gridColor: '#ffffff',
      gridOpacity: 0.1,
      gridSize: 50,
      enableShadows: false,
      shadowColor: '#000000',
      shadowOpacity: 0.3,
      ...options.stageControls,
    };
  }

  // ============================================================================
  // ABSTRACT METHODS (must be implemented by subclasses)
  // ============================================================================

  /**
   * Initialize the application context (must be implemented by subclass)
   */
  protected abstract createContext(
    config: ApplicationConfig
  ): Promise<TContext>;

  /**
   * Start the render loop (must be implemented by subclass)
   */
  protected abstract startRenderLoop(): void;

  /**
   * Stop the render loop (must be implemented by subclass)
   */
  protected abstract stopRenderLoop(): void;

  /**
   * Handle resize events (must be implemented by subclass)
   */
  protected abstract handleResize(width: number, height: number): void;

  // ============================================================================
  // APPLICATION INTERFACE IMPLEMENTATION
  // ============================================================================

  /**
   * Get the rendering context
   */
  public getContext(): TContext {
    return this.context!;
  }

  /**
   * Get canvas element (must be implemented by subclass)
   */
  public abstract getCanvas(): HTMLCanvasElement | null;

  /**
   * Initialize the application with a container element
   */
  public async init(container: HTMLElement | HTMLCanvasElement): Promise<void> {
    if (this._isInitialized) {
      throw new Error('Application already initialized');
    }

    // Update resolution with actual device pixel ratio (now safe to access window)
    if (typeof window !== 'undefined') {
      this.config.resolution = Math.min(window.devicePixelRatio || 1, 2);
    }

    // Handle both container div and direct canvas
    if (container instanceof HTMLCanvasElement) {
      this.canvas = container;
      this.container = container.parentElement;
    } else {
      this.container = container;
    }

    // Get dimensions from container
    const rect = (this.container || container).getBoundingClientRect();
    this.config.width = rect.width || this.config.width;
    this.config.height = rect.height || this.config.height;
    this.lastResize = {
      width: this.config.width!,
      height: this.config.height!,
    };

    // Create the rendering context
    this.context = await this.createContext(this.config);
    this._isInitialized = true;

    // Initialize animation if it was set before context creation
    if (this.animation && this.context) {
      this.animation.init(this.context);
    }

    // Setup resize observer if auto-resize is enabled
    if (this.config.autoResize && this.container) {
      this.setupResizeObserver();
    }

    // Setup canvas if it was created by the context
    const canvas = this.getCanvas();
    if (canvas && this.container && !this.canvas) {
      this.container.appendChild(canvas);
      this.setupCanvasStyles(canvas);
    }
  }

  /**
   * Get the current animation
   */
  public getAnimation(): Animation<any, TContext> | null {
    return this.animation;
  }

  /**
   * Set the animation to be rendered
   */
  public setAnimation(animation: Animation<any, TContext> | null): void {
    // Destroy existing animation
    if (this.animation) {
      this.animation.destroy();
    }

    this.animation = animation;

    if (this.animation && this.context) {
      this.animation.init(this.context);
    }
  }

  /**
   * Start the application
   */
  public start(): void {
    if (!this._isInitialized) {
      throw new Error('Application not initialized');
    }

    if (this._isRunning) return;

    this._isRunning = true;
    this.startRenderLoop();
  }

  /**
   * Stop the application
   */
  public stop(): void {
    if (!this._isRunning) return;

    this._isRunning = false;
    this.stopRenderLoop();
  }

  /**
   * Pause the application
   */
  public pause(): void {
    this.stop();
  }

  /**
   * Resume the application
   */
  public resume(): void {
    this.start();
  }

  /**
   * Check if the application is running
   */
  public isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Check if the application is initialized
   */
  public isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * Destroy the application and clean up resources
   */
  public destroy(): void {
    this.stop();

    if (this.animation) {
      this.animation.destroy();
      this.animation = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.context = null;
    this.container = null;
    this.canvas = null;
    this._isInitialized = false;
    this._isRunning = false;
  }

  // ============================================================================
  // STAGE CONTROLS
  // ============================================================================

  /**
   * Get stage controls manifest (must be implemented by subclass)
   */
  public abstract getStageControlsManifest(): StageControlsManifest;

  /**
   * Get current stage control values
   */
  public getStageControlValues(): StageControlValues {
    return { ...this.stageControls };
  }

  /**
   * Update stage control values
   */
  public updateStageControls(values: Partial<StageControlValues>): void {
    const previousControls = { ...this.stageControls };
    this.stageControls = { ...this.stageControls, ...values };

    // Apply changes to rendering context
    this.onStageControlsChange(this.stageControls, previousControls);
  }

  /**
   * Handle stage control changes (must be implemented by subclass)
   */
  protected abstract onStageControlsChange(
    controls: StageControlValues,
    previousControls: StageControlValues
  ): void;

  // ============================================================================
  // PROTECTED METHODS
  // ============================================================================

  /**
   * Update the animation (called each frame)
   */
  protected updateAnimation(): void {
    if (this.animation && this._isRunning) {
      this.animation.update();
    }
  }

  /**
   * Setup canvas styles for proper positioning
   */
  protected setupCanvasStyles(canvas: HTMLCanvasElement): void {
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';

    // Apply canvas classes if provided
    if (this.canvasClassName) {
      canvas.className = this.canvasClassName;
    }
  }

  /**
   * Setup resize observer for automatic resizing
   */
  protected setupResizeObserver(): void {
    if (!this.container) return;

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.container) return;

      // Debounce resize events
      clearTimeout((this.resizeObserver as any)?.timeout);
      (this.resizeObserver as any).timeout = setTimeout(() => {
        const rect = this.container!.getBoundingClientRect();

        // Only resize if dimensions changed significantly
        if (
          Math.abs(rect.width - this.lastResize.width) > 10 ||
          Math.abs(rect.height - this.lastResize.height) > 10
        ) {
          this.resizeSurface(rect.width, rect.height);
        }
      }, 100);
    });

    this.resizeObserver.observe(this.container);
  }

  /**
   * Draw at the container's current box, now, without waiting for the
   * observer's debounce. Callers that resize the container and then mount an
   * animation need this in between: animations bake their layout from the
   * surface they are handed at init, so one mounted against the old box
   * leaves the new one partly unpainted.
   */
  public resizeToContainer(): void {
    if (!this.container || !this._isInitialized) return;
    const rect = this.container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.resizeSurface(rect.width, rect.height);
  }

  /** The one place the surface size changes, so every path shares a baseline. */
  private resizeSurface(width: number, height: number): void {
    if (width === this.lastResize.width && height === this.lastResize.height) {
      return;
    }
    this.lastResize = { width, height };
    this.handleResize(width, height);
  }
}
