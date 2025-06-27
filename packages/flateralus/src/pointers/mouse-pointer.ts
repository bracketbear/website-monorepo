import { Pointer } from '.';

export class MousePointer extends Pointer {
  updatePosition(event: MouseEvent): void {
    const rect = this.element.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    this.position.x = offsetX;
    this.position.y = offsetY;
  }
}
