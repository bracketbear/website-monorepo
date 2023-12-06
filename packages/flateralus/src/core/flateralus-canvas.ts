import { BaseSprite, DrawContext, Pointer } from "..";

export interface FlateralusCanvasConfig {
  // Define any additional configuration properties needed
  animationSprite: BaseSprite;
  animationSpriteConfig: BaseSprite
  intersectionThreshold?: number;
  resetOnResize?: boolean;
}

const defaultConfig: Partial<FlateralusCanvasConfig> = {
  intersectionThreshold: 0,
  resetOnResize: true,
}

export class FlateralusCanvas {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private config: FlateralusCanvasConfig;
  private pointers: Pointer[] = []
  private sprite: InstanceType<BaseSprite>;
  private animationFrameId: number = -1;
  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;
  private isIntersecting: boolean = true; // Assume canvas is visible initially

  constructor(canvasElement: HTMLCanvasElement, config: FlateralusCanvasConfig) {
      this.canvas = canvasElement;
      this.context = canvasElement.getContext('2d')!;
      this.config = { ...defaultConfig, ...config };
      this.sprite = this.setupAnimation()

      this.resizeObserver = new ResizeObserver(entries => {
          for (let entry of entries) {
              this.handleResize();
          }
      });

      this.intersectionObserver = new IntersectionObserver(entries => {
        for (let entry of entries) {
          this.isIntersecting = entry.isIntersecting;
          if (this.isIntersecting) {
            this.startAnimation();
          } else {
            this.stopAnimation();
            this.resetPointers(); // Add this line
          }
        }
      }, { threshold: config.intersectionThreshold });
  
      this.animate = this.animate.bind(this);
  }

  setupCanvas(): void {
    this.resizeObserver.observe(this.canvas);
    this.intersectionObserver.observe(this.canvas);
    // this.setupPointerEvents();
    this.setupAnimation();
    this.startAnimation();
  }
  
  private setupAnimation(): BaseSprite {
    return new this.config.animationSprite(this.context, this.config.animationSpriteConfig)
  }

  private handleResize(): void {
    console.log('resizing flateralus canvas')
    const dpr = window.devicePixelRatio
    const rect = this.canvas.getBoundingClientRect()

    // Set the "actual" size of the canvas
    this.canvas.width = rect.width * dpr
    this.canvas.height = rect.height * dpr

    // Scale the context to ensure correct drawing operations
    this.context.scale(dpr, dpr)

    if (this.config.resetOnResize) {
      this.reset()
    }
  }

  private startAnimation(): void {
    if (this.animationFrameId === -1) { // Changed to check for -1 explicitly
      this.animationFrameId = requestAnimationFrame(this.animate);
    }
  }

  private stopAnimation(): void {
    if (this.animationFrameId !== -1) { // Check if an animation frame is active
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = -1; // Reset the frame ID
    }
  }

  private animate(): void {
    if (this.isIntersecting) {
      this.render();
      this.animationFrameId = requestAnimationFrame(this.animate);
    } else {
      this.stopAnimation(); // Ensure that the animation is stopped if not intersecting
    }
  }

  render(): void {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.sprite.draw(this.getDrawContext());
  }
  
  reset(): void {
    this.sprite?.reset()
    this.animate()
  }

  cleanup(): void {
      this.resizeObserver.disconnect();
      this.intersectionObserver.disconnect();
      this.stopAnimation();
  }
  
  registerPointer(pointer: Pointer): void {
    this.pointers.push(pointer);
  }
  
  getDrawContext(): DrawContext {
    // Implement logic for getting the draw context
    return {
      pointer: this.pointers[0],
      timestamp: 0,
    }
  }
  
  resetPointers(): void {
    this.pointers.forEach(pointer => pointer.resetPosition());
  }
}
