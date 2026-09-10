export interface PointerState {
  x: number;
  y: number;
  active: boolean;
}

export interface ClickPoint {
  x: number;
  y: number;
}

/**
 * Host-relative pointer state shared by every animation on a stage.
 *
 * `mouse` and `clicks` are stable object identities that animations hold
 * across frames, so this class always mutates them in place and never
 * reassigns. Animations consume clicks by shifting or splicing entries out
 * of the queue.
 *
 * Listeners go on the host element rather than the PIXI stage because
 * BaseApplication sets `pointer-events: none` on the canvas it appends.
 */
export class PointerService {
  readonly mouse: PointerState = { x: 0, y: 0, active: false };
  readonly clicks: ClickPoint[] = [];

  private el: HTMLElement | null = null;

  private onMove = (e: PointerEvent) => {
    if (!this.el) return;
    const r = this.el.getBoundingClientRect();
    this.mouse.x = e.clientX - r.left;
    this.mouse.y = e.clientY - r.top;
    this.mouse.active = true;
  };

  private onLeave = () => {
    this.mouse.active = false;
  };

  private onDown = (e: PointerEvent) => {
    if (!this.el) return;
    const r = this.el.getBoundingClientRect();
    this.clicks.push({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  attach(el: HTMLElement): void {
    this.detach();
    this.el = el;
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerleave', this.onLeave);
    el.addEventListener('pointerdown', this.onDown);
  }

  detach(): void {
    if (!this.el) return;
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerleave', this.onLeave);
    this.el.removeEventListener('pointerdown', this.onDown);
    this.el = null;
    this.mouse.active = false;
  }

  clearClicks(): void {
    this.clicks.length = 0;
  }
}
