import { Sprite } from '.'

export interface WaveSpriteConfig {
  amplitude: number; // The height of the wave
  frequency: number; // The number of oscillations per unit of time
  phase: number; // The offset of the wave from its standard position
  speed: number; // The speed at which the wave moves across the screen
}

export class WaveSprite extends Sprite {
  config: WaveSpriteConfig;

  constructor(context: CanvasRenderingContext2D, config: Partial<WaveSpriteConfig> = {}) {
    super(context);
    this.config = {
      amplitude: 100,
      frequency: 1,
      phase: 0,
      speed: 1,
      ...config,
    };
  }

  draw(): void {
    const { amplitude, frequency, phase, speed } = this.config;

    this.canvasContext.beginPath();
    for (let x = 0; x < this.canvasContext.canvas.width; x++) {
      const y = amplitude * Math.sin((frequency * x + phase) * Math.PI / 180);
      this.canvasContext.lineTo(x, y);
    }
    this.canvasContext.stroke();
    this.config.phase += speed;
  }
}