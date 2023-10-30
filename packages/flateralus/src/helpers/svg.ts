export class SvgHelper {
  static extractPaths(svgString: string): Path2D[] {
    if (!window && !window.DOMParser) return
    
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const paths = svgDoc.querySelectorAll('path');
    
    return Array.from(paths).map(pathData => {
      const path = new Path2D(pathData.getAttribute('d') || '');
      return path;
    });
  }
}
