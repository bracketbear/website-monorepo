import { Behavior, DrawContext, Vec2D, degreesToRadians } from '..'
import { BehaviorCondition } from '../behaviors/behavior-condition'

export abstract class Sprite {
  // Properties
  width: number = 0
  height: number = 0
  fillColor: string | CanvasGradient | CanvasPattern = 'black'
  position: Vec2D = { x: 0, y: 0 }
  originalPosition: Vec2D = { x: 0, y: 0 }
  scale: Vec2D = { x: 1, y: 1 }
  rotation: number = 0 // Rotation in radians
  behaviorConditions: BehaviorCondition<any>[] = []
  children: Sprite[] = []
  parent?: Sprite
  
  flags = {
    hasSetInitialWidth: false,
    hasSetInitialHeight: false,
    hasSetInitialPosition: false,
  }

  /**
   * Creates a new instance of the `Sprite` class.
   * 
   * @param canvasContext - The canvas rendering context to use for drawing the sprite.
   * 
   * @throws An error is thrown if no context is provided.
   */
  constructor (
    protected canvasContext: CanvasRenderingContext2D,
  ) {
    if (!canvasContext) throw new Error('No canvas context provided.')
    
    this.canvasContext = canvasContext
  }

  // Methods

  /**
   * How to draw the sprite onto the canvas.
   */
  render (): void {}
  
  /**
   * Resets the sprite to its initial state.
   */
  reset(): void {}

  /**
   * Draw the sprite onto the canvas with position.
   * 
   * @param drawContext - The context to use for handling events.
   * 
   * @throws An error is thrown if no context is found.
   */
  draw (drawContext: DrawContext): void {
    if (!drawContext) {
      throw new Error('No draw context found.')
    }
    
    this.canvasContext.save()
    this.handleEvents(drawContext)
    this.update(drawContext)
    this.canvasContext.translate(this.position.x, this.position.y)
    this.canvasContext.rotate(this.rotation);
    this.canvasContext.scale(this.scale.x, this.scale.y);
    this.render()
    this.canvasContext.fill()
    this.drawChildren(drawContext)
    this.canvasContext.restore()
  }
  
  /**
   * Sets up the sprite.
   */
  setup(): void {
    // Default behavior does nothing.
  }
  
  /**
   * Updates the sprite.
   * 
   * @param ctx - The behavior context to use for handling events.
   */
  update(ctx: DrawContext): void {
    // Default behavior does nothing.
  }
  
  /**
   * Sets the width of the sprite.
   * 
   * @param width - The new width of the sprite.
   */
  setWidth(width: number) {
    if(this.width === 0 && !this.flags.hasSetInitialWidth) {
      this.width = width;
      this.flags.hasSetInitialWidth = true;
    } else {
      this.scale.x = width / this.width;
    }
  }
  
  /**
   * Sets the height of the sprite.
   * 
   * @param height - The new height of the sprite.
   */
  setHeight(height: number) {
    if(this.height === 0 && !this.flags.hasSetInitialHeight) {
      this.height = height;
      this.flags.hasSetInitialHeight = true;
    } else {
      this.scale.y = height / this.height;
    }
  }
  
  /**
   * Sets the size of the sprite.
   * 
   * @param width - The new width of the sprite.
   * @param height - The new height of the sprite.
   */
  setSize(width: number, height: number) {
    this.setWidth(width)
    this.setHeight(height)
  }
  
  /**
   * Sets the scale of the sprite.
   * 
   * @param scale - The new scale of the sprite.
   */
  setScale(scale: number) {
    this.scale = { x: scale, y: scale }
  }
  
  /**
   * Sets the rotation of the sprite.
   * 
   * @param angleInDegrees - The new rotation angle of the sprite in degrees.
   */
  setRotation(angleInDegrees: number): void {
    this.rotation = degreesToRadians(angleInDegrees)
  }
  
  /**
   * Rotates the sprite by a given angle.
   * 
   * @param angleInDegrees - The angle to rotate the sprite by in degrees.
   */
  rotate(angleInDegrees: number): void {
    this.rotation += degreesToRadians(angleInDegrees)
  }
  
  /**
   * Sets the position of the sprite.
   * 
   * @param xOrVec2D - The x coordinate of the position or a `Vec2D` object representing the position.
   * @param y - The y coordinate of the position (if `xOrVec2D` is a number).
   */
  setPosition({ x, y }: Vec2D): void;
  setPosition(x: number, y: number): void;
  setPosition(xOrVec2D: number | Vec2D, y?: number): void {
    if (typeof xOrVec2D === 'object') {
      this.position = xOrVec2D
    } else {
      this.position = { x: xOrVec2D, y: y! }
    }
    
    if (!this.flags.hasSetInitialPosition) {
      this.originalPosition = { ...this.position }
      this.flags.hasSetInitialPosition = true
    }
  }
  
  /**
   * Sets the fill color of the sprite.
   * 
   * @param color - The new fill color of the sprite.
   */
  setFillColor(color: string | CanvasGradient | CanvasPattern) {
    this.fillColor = color
    this.canvasContext.fillStyle = color
  }
  
  /**
   * Adds a behavior to the sprite.
   * 
   * @param behavior - The behavior to add to the sprite.
   * @param config - The configuration for the behavior.
   * 
   * @returns The behavior condition that was added.
   */
  addBehavior(behavior: Behavior<any>, config?: any): BehaviorCondition<typeof behavior> {
    const condition = new BehaviorCondition(behavior);
    this.behaviorConditions.push(condition);
    
    return condition;
  }
  
  /**
   * Handles events for the sprite.
   * 
   * @param ctx - The behavior context to use for handling events.
   */
  handleEvents(ctx: DrawContext): void {
    this.behaviorConditions.forEach(condition => {
      condition.checkAndExecute(this, ctx)
    });
  }
  
  /**
   * Gets the position of the sprite.
   * 
   * @returns The position of the sprite.
   */
  getPosition(): Vec2D {
    return this.position
  }
  
  /**
   * Adds a child sprite to the sprite.
   * 
   * @param child - The child sprite to add.
   */
  addChild(child: Sprite): void {
    child.setParent(this)
    this.children.push(child)
  }
  
  /**
   * Removes a child sprite from the sprite.
   * 
   * @param child - The child sprite to remove.
   */
  removeChild(child: Sprite): void {
    this.children = this.children.filter(c => c !== child);
    child.clearParent();
  }
  
  /**
   * Sets the children of the sprite.
   * 
   * @param children - The new children of the sprite.
   */
  setChildren(children: Sprite[]): void {
    children.forEach(child => this.addChild(child))
  }
  
  /**
   * Removes all children from the sprite.
   */
  removeAllChildren(): void {
    this.children.forEach(child => this.removeChild(child))
  }
  
  /**
   * Gets the children of the sprite.
   * 
   * @returns The children of the sprite.
   */
  getChildren(): Sprite[] {
    return this.children
  }
  
  /**
   * Draws the children of the sprite.
   * 
   * @param ctx - The behavior context to use for handling events.
   */
  drawChildren(ctx: DrawContext): void {
    this.getChildren().forEach(child => child.draw(ctx))
  }
  
  /**
   * Sets the parent of the sprite.
   * 
   * @param parent - The new parent of the sprite.
   */
  setParent(parent: Sprite): void {
    this.parent = parent
  }
  
  /**
   * Clears the parent of the sprite.
   */
  clearParent(): void {
    this.parent = undefined
  }
  
  /**
   * Checks if the sprite has a parent.
   * 
   * @returns `true` if the sprite has a parent, `false` otherwise.
   */
  hasParent(): boolean {
    return this.parent !== undefined
  }
}
