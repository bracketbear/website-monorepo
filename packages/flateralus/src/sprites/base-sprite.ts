import { Behavior, BehaviorContext, degreesToRadians } from '..'
import { BehaviorCondition } from '../behaviors/behavior-condition'
import { Drawable, Vec2D } from '../types'

export abstract class BaseSprite implements Drawable {
  width: number = 0
  height: number = 0
  fillColor: string | CanvasGradient | CanvasPattern = 'black'
  position: Vec2D = { x: 0, y: 0 }
  originalPosition: Vec2D = { x: 0, y: 0 }
  scale: Vec2D = { x: 1, y: 1 }
  rotation: number = 0 // Rotation in radians
  behaviorConditions: BehaviorCondition[] = []
  children: BaseSprite[] = []
  parent?: BaseSprite
  
  flags = {
    hasSetInitialWidth: false,
    hasSetInitialHeight: false,
    hasSetInitialPosition: false,
  }

  constructor (
    protected context: CanvasRenderingContext2D,
  ) {
    if (!context) throw new Error('No context provided.')
    
    this.context = context
  }

  /**
   * How to draw the sprite onto the canvas.
   */
  render (): void {}
  
  reset(): void {}

  /**
   * Draw the sprite onto the canvas with position.
   */
  draw (ctx: BehaviorContext): void {
    if (!ctx) {
      console.log(this)
      throw new Error('No context found.')
    }
    this.context.save()
    this.handleEvents(ctx)
    this.update(ctx)
    this.context.translate(this.position.x, this.position.y)
    this.context.rotate(this.rotation);
    this.context.scale(this.scale.x, this.scale.y);
    this.render()
    this.context.fill()
    this.drawChildren(ctx)
    this.context.restore()
  }
  
  setup(): void {
    // Default behavior does nothing.
  }
  
  update(ctx: BehaviorContext): void {
    // Default behavior does nothing.
  }
  
  setWidth(width: number) {
    if(this.width === 0 && !this.flags.hasSetInitialWidth) {
      this.width = width;
      this.flags.hasSetInitialWidth = true;
    } else {
      this.scale.x = width / this.width;
    }
  }
  
  setHeight(height: number) {
    if(this.height === 0 && !this.flags.hasSetInitialHeight) {
      this.height = height;
      this.flags.hasSetInitialHeight = true;
    } else {
      this.scale.y = height / this.height;
    }
  }
  
  setSize(width: number, height: number) {
    this.setWidth(width)
    this.setHeight(height)
  }
  
  setScale(scale: number) {
    this.scale = { x: scale, y: scale }
  }
  
  setRotation(angleInDegrees: number): void {
    this.rotation = degreesToRadians(angleInDegrees)
  }
  
  rotate(angleInDegrees: number): void {
    this.rotation += degreesToRadians(angleInDegrees)
  }
  
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
  
  setFillColor(color: string | CanvasGradient | CanvasPattern) {
    this.fillColor = color
    this.context.fillStyle = color
  }
  
  addBehavior(behavior: Behavior<any>, config?: any): BehaviorCondition {
    const condition = new BehaviorCondition(behavior);
    this.behaviorConditions.push(condition);
    
    return condition;
  }
  
  handleEvents(ctx: BehaviorContext): void {
    this.behaviorConditions.forEach(condition => {
      condition.checkAndExecute(this, ctx)
    });
  }
  
  getPosition(): Vec2D {
    return this.position
  }
  
  addChild(child: BaseSprite): void {
    child.setParent(this)
    this.children.push(child)
  }
  
  removeChild(child: BaseSprite): void {
    this.children = this.children.filter(c => c !== child);
    child.clearParent();
  }
  
  setChildren(children: BaseSprite[]): void {
    children.forEach(child => this.addChild(child))
  }
  
  removeAllChildren(): void {
    this.children = []
  }
  
  getChildren(): BaseSprite[] {
    return this.children
  }
  
  drawChildren(ctx: BehaviorContext): void {
    this.getChildren().forEach(child => child.draw(ctx))
  }
  
  setParent(parent: BaseSprite): void {
    this.parent = parent
  }
  
  clearParent(): void {
    this.parent = undefined
  }
  
  hasParent(): boolean {
    return this.parent !== undefined
  }
}
