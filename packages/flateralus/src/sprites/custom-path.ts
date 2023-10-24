import BaseSprite from './base-sprite';

export class CustomPath extends BaseSprite {
  constructor(
    context: CanvasRenderingContext2D,
    public paths: Path2D[],
  ) {
    super(context);
  }

  render(): void {
    this.paths.forEach((path: Path2D) => {
      this.context.fill(path);
    });
  }
}
