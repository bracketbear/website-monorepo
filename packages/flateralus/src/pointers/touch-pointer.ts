import { Pointer } from ".";

export class TouchPointer extends Pointer {
  updatePosition(event: TouchEvent): void {
      if (event.touches.length > 0) {
          this.position.x = event.touches[0].clientX;
          this.position.y = event.touches[0].clientY;
      }
  }
}