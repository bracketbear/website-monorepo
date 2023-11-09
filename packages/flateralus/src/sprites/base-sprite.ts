import { Behavior, BehaviorContext, Pointer, Vec2D, degreesToRadians } from '..'
import { BehaviorCondition } from '../behaviors/behavior-condition'

export abstract class BaseSprite {
  // Properties
  width: number = 0
  height: number = 0
  fillColor: string | CanvasGradient | CanvasPattern = 'black'
  position: Vec2D = { x: 0, y: 0 }
  originalPosition: Vec2D = { x: 0, y: 0 }
  scale: Vec2D = { x: 1, y: 1 }
  rotation: number = 0 // Rotation in radians
  behaviorConditions: BehaviorCondition<any>[] = []
  children: BaseSprite[] = []
  parent?: BaseSprite
  
  flags = {
    hasSetInitialWidth: false,
    hasSetInitialHeight: false,
    hasSetInitialPosition: false,
  }

  /**
   * Creates a new instance of the `BaseSprite` class.
   * 
   * @param context - The canvas rendering context to use for drawing the sprite.
   * 
   * @throws An error is thrown if no context is provided.
   */
  constructor (
    protected context: CanvasRenderingContext2D,
  ) {
    if (!context) throw new Error('No context provided.')
    
    this.context = context
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
   * @param ctx - The behavior context to use for handling events.
   * 
   * @throws An error is thrown if no context is found.
   */
  draw (ctx: BehaviorContext): void {
    if (!ctx) {
      console.log(this)
      throw new Error('No context found.')
    }
    
    const globalPos = this.getGlobalPosition();
    const globalScale = this.getGlobalScale();
    const globalRotation = this.getGlobalRotation();
    
    this.context.save()
    this.handleEvents(ctx)
    this.update(ctx)
    this.context.translate(globalPos.x, globalPos.y)
    this.context.rotate(globalRotation);
    this.context.scale(globalScale.x, globalScale.y);
    this.render()
    this.context.fill()
    this.drawChildren(ctx)
    this.context.restore()
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
  update(ctx: BehaviorContext): void {
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
  
  getGlobalScale(): Vec2D {
    let globalScale = { ...this.scale };
    const parentGlobalScale = this.parent?.getGlobalScale();

    if (parentGlobalScale) {
      globalScale.x *= parentGlobalScale.x;
      globalScale.y *= parentGlobalScale.y;
    }

    return globalScale;
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
  
  getGlobalRotation(): number {
    let globalRotation = this.rotation;
    let parentGlobalRotation = this.parent?.getGlobalRotation();

    if (parentGlobalRotation) {
      globalRotation += parentGlobalRotation;
    }

    return globalRotation;
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
  
  getGlobalPosition(): Vec2D {
    let globalPos = { ...this.position };
    const parent = this.parent;
    const parentPos = parent?.getGlobalPosition();

    if (parentPos) {
      globalPos.x += parentPos.x;
      globalPos.y += parentPos.y;
    }

    return globalPos;
  }
  
  /**
   * Sets the fill color of the sprite.
   * 
   * @param color - The new fill color of the sprite.
   */
  setFillColor(color: string | CanvasGradient | CanvasPattern) {
    this.fillColor = color
    this.context.fillStyle = color
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
  handleEvents(ctx: BehaviorContext): void {
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
  
  isPointerOver(pointer: Vec2D, pointerRadius: number): boolean {
    // Get the global position, scale, and rotation of the sprite
    const globalPos = this.getGlobalPosition();
    const globalScale = this.getGlobalScale();
    const globalRotation = this.getGlobalRotation();
    
    // Transform the pointer coordinates into the local coordinate space of the sprite
    let localPointer = {
      x: (pointer.x - globalPos.x) / globalScale.x,
      y: (pointer.y - globalPos.y) / globalScale.y,
    };
    if (globalRotation !== 0) {
      const cos = Math.cos(-globalRotation);
      const sin = Math.sin(-globalRotation);
      localPointer = {
        x: localPointer.x * cos - localPointer.y * sin,
        y: localPointer.x * sin + localPointer.y * cos,
      };
    }
    
    // Now check if the localPointer is within the bounds of the sprite
    // Assuming the sprite's origin is at the top-left corner, adjust as needed
    const isWithinBounds = 
      localPointer.x >= 0 &&
      localPointer.y >= 0 &&
      localPointer.x <= this.width &&
      localPointer.y <= this.height;

    // Optionally, you can also check if the localPointer is within a certain radius of the sprite's center
    const dx = localPointer.x - this.width / 2;
    const dy = localPointer.y - this.height / 2;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const isWithinRadius = distance <= pointerRadius;

    return isWithinBounds && isWithinRadius;
  }
  
  /**
   * Adds a child sprite to the sprite.
   * 
   * @param child - The child sprite to add.
   */
  addChild(child: BaseSprite): void {
    child.setParent(this)
    this.children.push(child)
  }
  
  /**
   * Removes a child sprite from the sprite.
   * 
   * @param child - The child sprite to remove.
   */
  removeChild(child: BaseSprite): void {
    this.children = this.children.filter(c => c !== child);
    child.clearParent();
  }
  
  /**
   * Sets the children of the sprite.
   * 
   * @param children - The new children of the sprite.
   */
  setChildren(children: BaseSprite[]): void {
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
  getChildren(): BaseSprite[] {
    return this.children
  }
  
  /**
   * Draws the children of the sprite.
   * 
   * @param ctx - The behavior context to use for handling events.
   */
  drawChildren(ctx: BehaviorContext): void {
    this.getChildren().forEach(child => child.draw(ctx))
  }
  
  /**
   * Sets the parent of the sprite.
   * 
   * @param parent - The new parent of the sprite.
   */
  setParent(parent: BaseSprite): void {
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
