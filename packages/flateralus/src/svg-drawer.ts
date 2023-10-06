import { Drawable } from './types'

/**
 * A class that draws an SVG path onto a CanvasRenderingContext2D.
 */
export class SvgDrawer implements Drawable {
  private path: Path2D
  private originalWidth: number // Keep track of the original width
  private originalHeight: number // Keep track of the original height
  width = 0
  height = 0

  constructor (private context: CanvasRenderingContext2D, pathStrings: string[]) {
    this.path = new Path2D()

    // Create a temporary canvas to calculate width and height
    const tempCanvas = document.createElement('canvas')
    const tempContext = tempCanvas.getContext('2d')

    if (tempContext) {
      tempContext.fillStyle = 'black'
      const bounds = {
        min: { x: Infinity, y: Infinity },
        max: { x: 0, y: 0 },
      }

      pathStrings.forEach((pathString) => {
        const subPath = new Path2D(pathString)
        this.path.addPath(subPath)
        tempContext.fill(subPath)

        const imageData = tempContext.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
        for (let y = 0; y < imageData.height; y++) {
          for (let x = 0; x < imageData.width; x++) {
            const pixel = imageData.data[(y * imageData.width + x) * 4]
            if (pixel !== 0) { // If pixel is not transparent
              bounds.min.x = Math.min(bounds.min.x, x)
              bounds.min.y = Math.min(bounds.min.y, y)
              bounds.max.x = Math.max(bounds.max.x, x)
              bounds.max.y = Math.max(bounds.max.y, y)
            }
          }
        }
      })

      this.width = bounds.max.x - bounds.min.x
      this.height = bounds.max.y - bounds.min.y
    }

    this.originalWidth = this.width // Set the original width
    this.originalHeight = this.height // Set the original height
  }

  draw (offset: {x: number, y: number}): void {
    this.context.save()

    // Calculate scale factors
    const scaleX = this.width / this.originalWidth
    const scaleY = this.height / this.originalHeight

    this.context.translate(offset.x, offset.y)
    this.context.scale(scaleX, scaleY) // Scale the context
    this.context.stroke(this.path, 'evenodd')

    this.context.restore()
  }
}
