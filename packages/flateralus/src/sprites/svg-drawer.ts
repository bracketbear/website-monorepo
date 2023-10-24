import BaseSprite from './base-sprite'

/**
 * A class that draws an SVG path onto a CanvasRenderingContext2D.
 */
export class SvgDrawer extends BaseSprite {
  private path: Path2D
  private originalWidth: number // Keep track of the original width
  private originalHeight: number // Keep track of the original height

  constructor(context: CanvasRenderingContext2D, svgString: string) {
    super(context, { x: 0, y: 0 });  // Call the constructor of the BaseSprite class
    
    const pathDataArray = this.parseSvgPaths(svgString);  // Parse the SVG string to get path data
    
    this.path = new Path2D();  // Create a new Path2D object
    
    pathDataArray.forEach(pathData => {
      const subPath = new Path2D(pathData);  // Create a new Path2D object for each path data string
      this.path.addPath(subPath);  // Add each subPath to the main Path2D object
    });
    
    // Create a temporary canvas to calculate width and height
    const tempCanvas = document.createElement('canvas');
    const tempContext = tempCanvas.getContext('2d');
    
    if (tempContext) {
      tempContext.fillStyle = 'black';
      const bounds = {
        min: { x: Infinity, y: Infinity },
        max: { x: 0, y: 0 },
      };
    
      // Draw each subPath to the temporary canvas to calculate bounds
      pathDataArray.forEach(pathData => {
        const subPath = new Path2D(pathData);
        tempContext.fill(subPath);
        
        const imageData = tempContext.getImageData(0, 0, tempCanvas.width, tempCanvas.height, {});
        
        for (let y = 0; y < imageData.height; y++) {
          for (let x = 0; x < imageData.width; x++) {
            const pixel = imageData.data[(y * imageData.width + x) * 4];
            if (pixel !== 0) {  // If pixel is not transparent
              bounds.min.x = Math.min(bounds.min.x, x);
              bounds.min.y = Math.min(bounds.min.y, y);
              bounds.max.x = Math.max(bounds.max.x, x);
              bounds.max.y = Math.max(bounds.max.y, y);
            }
          }
        }
      });
      
      this.width = bounds.max.x - bounds.min.x;  // Set the width
      this.height = bounds.max.y - bounds.min.y;  // Set the height
    }
    
    this.originalWidth = this.width;  // Set the original width
    this.originalHeight = this.height;  // Set the original height
  }
  
  render (): void {
    this.context.stroke(this.path)
    this.context.fillStyle = this.fillColor
    this.context.fill()
  }
  
  private parseSvgPaths(svgString: string) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const paths = svgDoc.querySelectorAll('path');
    return Array.from(paths).map(path => path.getAttribute('d'));
  }
}
