/**
 * Tells a real resize from the ResizeObserver's opening notification.
 *
 * `observe()` reports the element's current size at once; acting on that
 * would rebuild the animation a quarter-second into its boot on every page
 * load. The first call records the size, and only a change in whole pixels
 * after that counts.
 */
export class SizeGate {
  private last: { w: number; h: number } | null = null;

  changed(width: number, height: number): boolean {
    const w = Math.round(width);
    const h = Math.round(height);
    if (this.last === null) {
      this.last = { w, h };
      return false;
    }
    if (w === this.last.w && h === this.last.h) return false;
    this.last = { w, h };
    return true;
  }
}
