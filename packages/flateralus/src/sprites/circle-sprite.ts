import { Sprite } from './sprite'

/**
 * A simple circle sprite. The circle is drawn centered at the provided offset.
 */
export class CircleSprite extends Sprite {
  constructor (context: CanvasRenderingContext2D, radius: number) {
    super(context)
    this.width = radius * 2
    this.height = radius * 2
  }

  render (): void {
    this.canvasContext.beginPath()
    this.canvasContext.arc(this.width / 2, this.height / 2, this.width / 2, 0, Math.PI * 2)
    this.canvasContext.fillStyle = this.fillColor
    this.canvasContext.fill()
  }
}
