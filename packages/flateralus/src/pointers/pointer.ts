import { Vec2D } from "..";

export abstract class Pointer {
  position: Vec2D;
  active: boolean;
  element: HTMLElement;
  diameter: number;

  constructor(element: HTMLElement, diameter: number = 1) {
      this.position = { x: -1000, y: -1000 };
      this.active = false;
      this.element = element;
      this.diameter = diameter > 0 ? diameter : 1;
      this.setupPointerEvents()
  }

  abstract updatePosition(event: MouseEvent | TouchEvent): void;

  setupPointerEvents(): void {
      this.element.addEventListener('mousemove', (e) => {
          if (e instanceof MouseEvent) {
              this.updatePosition(e);
          }
      });

      this.element.addEventListener('touchmove', (e) => {
          if (e instanceof TouchEvent) {
              this.updatePosition(e);
          }
      });

      // Additional event listeners for 'mousedown', 'touchstart', etc.
  }
  
  getBoundingBox(): { x: number, y: number, width: number, height: number } {
    return {
        x: this.position.x - this.diameter / 2,
        y: this.position.y - this.diameter / 2,
        width: this.diameter,
        height: this.diameter
    };
}
}
