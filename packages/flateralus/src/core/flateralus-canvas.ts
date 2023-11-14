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
  private pointer: Pointer = {
    position: {
      x: -1000,
      y: -1000,
    },
    active: false,
  }
  private sprite: BaseSprite;
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
              this.handleResize(entry.contentRect);
          }
      });

      this.intersectionObserver = new IntersectionObserver(entries => {
          for (let entry of entries) {
              this.isIntersecting = entry.isIntersecting;
              if (this.isIntersecting) {
                console.log('intersecting')
                  this.startAnimation();
              } else {
                console.log('not intersecting')
                  this.stopAnimation();
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

  private handleResize(contentRect: DOMRectReadOnly): void {
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
      if (!this.animationFrameId) {
          this.animationFrameId = requestAnimationFrame(this.animate);
      }
  }

  private stopAnimation(): void {
      if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = -1;
      }
  }

  private animate(): void {
      if (this.isIntersecting) {
          this.render();
          this.animationFrameId = requestAnimationFrame(this.animate);
      }
  }

  render(): void {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.sprite.draw(this.getDrawContext());
      // console.log('rendinging flateralus canvas')
  }
  
  reset(): void {
    this.sprite?.reset()
    this.animate()
    console.log('resetting flateralus canvas', this.canvas)
  }

  cleanup(): void {
      this.resizeObserver.disconnect();
      this.intersectionObserver.disconnect();
      this.stopAnimation();
  }

  // setupPointerEvents(): void {
  //   console.log('setting up pointer events')
    
  //   this.canvas.addEventListener('mousemove', this.handlePointerMove.bind(this));
  //   this.canvas.addEventListener('mousedown', this.handlePointerDown.bind(this));
  //   this.canvas.addEventListener('mouseup', this.handlePointerUp.bind(this));
    
  //   this.canvas.addEventListener('touchmove', this.handlePointerMove.bind(this));
  //   this.canvas.addEventListener('touchstart', this.handlePointerDown.bind(this));
  //   this.canvas.addEventListener('touchend', this.handlePointerUp.bind(this));
    
  //   console.log('done setting up pointer events', this.canvas)
  // }

  // Method to handle pointer (mouse or touch) movement
  handlePointerMove(event: MouseEvent | TouchEvent): void {
    // Implement logic for handling pointer movement
    console.log('pointer move')
    
    if (event instanceof MouseEvent) {
      this.pointer.position.x = event.clientX
      this.pointer.position.y = event.clientY
    } else if (event instanceof TouchEvent) {
      this.pointer.position.x = event.touches[0].clientX
      this.pointer.position.y = event.touches[0].clientY
    }
  }
  
  handlePointerLeave(event: MouseEvent): void {
    // Implement logic for handling mouse leave
    console.log('mouse leave')
    
    this.pointer.active = false
    this.pointer.position.x = -1000
    this.pointer.position.y = -1000
  }

  // Method to handle pointer down (mouse down or touch start)
  handlePointerDown(_event: MouseEvent | TouchEvent): void {
    // Implement logic for handling pointer down
    console.log('pointer down')
    
    this.pointer.active = true
  }

  // Method to handle pointer up (mouse up or touch end)
  handlePointerUp(_event: MouseEvent | TouchEvent): void {
    // Implement logic for handling pointer up
    console.log('pointer up')
    
    this.pointer.active = false
  }
  
  getDrawContext(): DrawContext {
    // Implement logic for getting the draw context
    return {
      pointer: this.pointer,
      timestamp: 0,
    }
  }
}
