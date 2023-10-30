import { degreesToRadians } from '..'
import { Drawable, Vec2D } from '../types'

abstract class BaseSprite implements Drawable {
  width = 0
  height = 0
  fillColor: string | CanvasGradient | CanvasPattern = 'black'
  position: Vec2D = { x: 0, y: 0 }
  originalPosition: Vec2D = { x: 0, y: 0 }
  scale: Vec2D = { x: 1, y: 1 }
  rotation: number = 0 // Rotation in radians
  
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
  abstract render (): void

  /**
   * Draw the sprite onto the canvas with position.
   */
  draw (): void {
    if (!this.context) {
      console.log(this)
      throw new Error('No context found.')
    }
    this.context.save()
    this.context.translate(this.position.x, this.position.y)
    this.context.rotate(this.rotation);
    this.context.scale(this.scale.x, this.scale.y);
    this.context.fill()
    this.render()
    this.context.restore()
  }
  
  setWidth(width: number) {
    this.scale.x = width / this.width
    
    if (!this.flags.hasSetInitialWidth) {
      this.width = width
      this.flags.hasSetInitialWidth = true
    }
  }
  
  setHeight(height: number) {
    this.scale.y = height / this.height
    
    if (!this.flags.hasSetInitialHeight) {
      this.height = height
      this.flags.hasSetInitialHeight = true
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
  
  setPosition(x: number, y: number): void {
    this.position = { x, y }
    
    if (!this.flags.hasSetInitialPosition) {
      this.originalPosition = { x, y }
      this.flags.hasSetInitialPosition = true
    }
  }
  
  setFillColor(color: string | CanvasGradient | CanvasPattern) {
    this.fillColor = color
    this.context.fillStyle = color
  }
}

export default BaseSprite
