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
    if (!window) return
    
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const paths = svgDoc.querySelectorAll('path');
    
    return Array.from(paths).map(pathData => {
      const path = new Path2D(pathData.getAttribute('d') || '');
      return path;
    });
  }
}
