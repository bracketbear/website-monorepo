import BaseSprite from './base-sprite'

/**
 * A simple circle sprite. The circle is drawn centered at the provided offset.
 */
export class CircleSprite extends BaseSprite {
  constructor (context: CanvasRenderingContext2D, radius: number, offset: {x: number, y: number}) {
    super(context, offset)
    this.width = radius * 2
    this.height = radius * 2
  }

  onDraw (): void {
    this.context.beginPath()
    this.context.arc(this.width / 2, this.height / 2, this.width / 2, 0, Math.PI * 2)
    this.context.fillStyle = this.fillColor
    this.context.fill()
  }
}
