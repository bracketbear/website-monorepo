import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PointerService } from './pointer-service';

// jsdom does not implement PointerEvent. MouseEvent dispatches under the
// same type strings and carries the clientX/clientY the service reads.

function makeHost() {
  const el = document.createElement('div');
  el.getBoundingClientRect = () =>
    ({ left: 10, top: 20, width: 100, height: 100 }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

describe('PointerService', () => {
  let host: HTMLElement;
  let svc: PointerService;

  beforeEach(() => {
    host = makeHost();
    svc = new PointerService();
    svc.attach(host);
  });
  afterEach(() => {
    svc.detach();
    host.remove();
  });

  it('starts inactive at the origin', () => {
    expect(svc.mouse).toEqual({ x: 0, y: 0, active: false });
    expect(svc.clicks).toHaveLength(0);
  });

  it('records pointer position relative to the host', () => {
    host.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 60, clientY: 70, bubbles: true })
    );
    expect(svc.mouse.x).toBe(50);
    expect(svc.mouse.y).toBe(50);
    expect(svc.mouse.active).toBe(true);
  });

  it('goes inactive on pointerleave but keeps the last position', () => {
    host.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 60, clientY: 70, bubbles: true })
    );
    host.dispatchEvent(new MouseEvent('pointerleave', { bubbles: true }));
    expect(svc.mouse.active).toBe(false);
    expect(svc.mouse.x).toBe(50);
  });

  it('queues clicks for animations to consume', () => {
    host.dispatchEvent(
      new MouseEvent('pointerdown', { clientX: 30, clientY: 40, bubbles: true })
    );
    host.dispatchEvent(
      new MouseEvent('pointerdown', { clientX: 15, clientY: 25, bubbles: true })
    );
    expect(svc.clicks).toEqual([
      { x: 20, y: 20 },
      { x: 5, y: 5 },
    ]);
  });

  it('keeps mouse and clicks identity stable across clearClicks', () => {
    const held = svc.clicks;
    host.dispatchEvent(
      new MouseEvent('pointerdown', { clientX: 30, clientY: 40, bubbles: true })
    );
    svc.clearClicks();
    expect(held).toBe(svc.clicks);
    expect(held).toHaveLength(0);
  });

  it('stops listening after detach', () => {
    svc.detach();
    host.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 99, clientY: 99, bubbles: true })
    );
    expect(svc.mouse.active).toBe(false);
  });

  it('does not double-subscribe when attached twice', () => {
    const second = makeHost();
    svc.attach(second);
    host.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 60, clientY: 70, bubbles: true })
    );
    expect(svc.mouse.active).toBe(false);
    second.remove();
  });
});
