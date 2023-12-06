import { Sprite } from './sprite';

export class CustomPath extends Sprite {
  constructor(
    context: CanvasRenderingContext2D,
    public paths: Path2D[],
  ) {
    super(context);
  }

  render(): void {
    this.paths.forEach((path: Path2D) => {
      this.canvasContext.fill(path);
    });
  }
}
