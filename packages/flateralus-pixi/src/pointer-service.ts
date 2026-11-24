export interface PointerState {
  x: number;
  y: number;
  active: boolean;
  /** A button is held. Cleared by pointerup, pointercancel or leaving. */
  down: boolean;
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
  readonly mouse: PointerState = { x: 0, y: 0, active: false, down: false };
  readonly clicks: ClickPoint[] = [];
  /** Where each hold ended, host-relative. Consumed like `clicks`. */
  readonly releases: ClickPoint[] = [];

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
    this.mouse.down = false;
  };

  private onDown = (e: PointerEvent) => {
    if (!this.el) return;
    const r = this.el.getBoundingClientRect();
    this.clicks.push({ x: e.clientX - r.left, y: e.clientY - r.top });
    this.mouse.down = true;
  };

  private onUp = (e: PointerEvent) => {
    if (!this.el || !this.mouse.down) return;
    const r = this.el.getBoundingClientRect();
    this.mouse.down = false;
    this.releases.push({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  private onCancel = () => {
    this.mouse.down = false;
  };

  attach(el: HTMLElement): void {
    this.detach();
    this.el = el;
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerleave', this.onLeave);
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onCancel);
  }

  detach(): void {
    if (!this.el) return;
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerleave', this.onLeave);
    this.el.removeEventListener('pointerdown', this.onDown);
    this.el.removeEventListener('pointerup', this.onUp);
    this.el.removeEventListener('pointercancel', this.onCancel);
    this.el = null;
    this.mouse.active = false;
    this.mouse.down = false;
  }

  clearClicks(): void {
    this.clicks.length = 0;
  }

  clearReleases(): void {
    this.releases.length = 0;
  }
}
