import { Drawable } from '../types'

abstract class BaseSprite implements Drawable {
  width = 0
  height = 0
  fillColor: string | number | CanvasGradient | CanvasPattern = 'black'
  originalPosition = { x: 0, y: 0 }

  constructor (
    protected context: CanvasRenderingContext2D,
    public position: {x: number, y: number},
  ) {
    this.context = context
    this.originalPosition = position
  }

  /**
   * Draw the sprite onto the canvas.
   */
  abstract onDraw (): void

  /**
   * Draw the sprite onto the canvas with position.
   */
  draw (): void {
    this.context.save()
    this.context.translate(this.position.x, this.position.y)
    this.onDraw()
    this.context.restore()
  }
}

export default BaseSprite
