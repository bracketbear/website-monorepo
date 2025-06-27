export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * A helper class for working with SVGs.
 */
export class SvgHelper {
  /**
   * Extracts an array of Path2D objects from an SVG string.
   * @param svgString - The SVG string to extract paths from.
   * @returns An array of Path2D objects, or undefined if the window object is not available.
   */
  static extractPaths(svgString: string): Path2D[] | undefined {
    if (!window) return;

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const paths = svgDoc.querySelectorAll('path');

    return Array.from(paths).map((pathData) => {
      const path = new Path2D(pathData.getAttribute('d') || '');
      return path;
    });
  }

  /**
   * Computes the bounding box of an array of Path2D objects.
   * @param paths - The array of Path2D objects.
   * @returns The bounding box of the paths.
   */
  static computeBoundingBox(paths: Path2D[]): BoundingBox {
    // Create an off-screen canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Set a preliminary large canvas size to ensure the paths fit
    // (you might need to adjust this size based on your specific use case)
    canvas.width = 2000;
    canvas.height = 2000;

    // Draw the paths to the off-screen canvas
    paths.forEach((path) => {
      ctx.fill(path);
    });

    // Get the image data from the off-screen canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = 0;
    let maxY = 0;

    // Iterate through the image data to find the bounding box
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4;
        const alpha = imageData[index + 3];
        if (alpha > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // Compute the width and height
    const width = maxX - minX;
    const height = maxY - minY;

    return { minX, minY, maxX, maxY, width, height };
  }
}
