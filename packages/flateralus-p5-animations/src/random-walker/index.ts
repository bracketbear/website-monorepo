import { P5Animation } from '@bracketbear/flateralus-p5';
import { createManifest } from '@bracketbear/flateralus';
import type p5 from 'p5';

// Random Walker Animation Manifest
const randomWalkerManifest = createManifest({
  id: 'random-walker',
  name: 'Random Walker',
  description: 'A particle that walks randomly across the screen',
  controls: [
    {
      name: 'walkerCount',
      type: 'number',
      label: 'Walker Count',
      description: 'Number of walkers to display',
      defaultValue: 5,
      min: 1,
      max: 50,
      step: 1,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'walkerSize',
      type: 'number',
      label: 'Walker Size',
      description: 'Size of each walker',
      defaultValue: 8,
      min: 2,
      max: 20,
      step: 1,
      debug: true,
    },
    {
      name: 'walkerColor',
      type: 'color',
      label: 'Walker Color',
      description: 'Color of the walkers',
      defaultValue: '#ff6b35',
      debug: true,
    },
    {
      name: 'trailLength',
      type: 'number',
      label: 'Trail Length',
      description: 'Number of trail points to keep',
      defaultValue: 50,
      min: 0,
      max: 200,
      step: 5,
      debug: true,
    },
    {
      name: 'trailOpacity',
      type: 'number',
      label: 'Trail Opacity',
      description: 'Opacity of the trail (0-1)',
      defaultValue: 0.3,
      min: 0,
      max: 1,
      step: 0.05,
      debug: true,
    },
    {
      name: 'stepSize',
      type: 'number',
      label: 'Step Size',
      description: 'How far each walker moves per step',
      defaultValue: 3,
      min: 0.5,
      max: 10,
      step: 0.5,
      debug: true,
    },
    {
      name: 'stepSpeed',
      type: 'number',
      label: 'Step Speed',
      description: 'How often walkers take steps (steps per second)',
      defaultValue: 30,
      min: 1,
      max: 120,
      step: 1,
      debug: true,
    },
    {
      name: 'maxTurnAngle',
      type: 'number',
      label: 'Max Turn Angle',
      description: 'Maximum angle the walker can turn (degrees)',
      defaultValue: 45,
      min: 0,
      max: 180,
      step: 5,
      debug: true,
    },
    {
      name: 'trailSmoothing',
      type: 'number',
      label: 'Trail Smoothing',
      description: 'Smoothing factor for trail curves (0-1)',
      defaultValue: 0.3,
      min: 0,
      max: 1,
      step: 0.1,
      debug: true,
    },
    {
      name: 'showTrails',
      type: 'boolean',
      label: 'Show Trails',
      description: 'Whether to show walker trails',
      defaultValue: true,
      debug: true,
    },
  ] as const,
});

// Walker class for individual walkers
class Walker {
  public x: number;
  public y: number;
  public trail: Array<{ x: number; y: number }> = [];
  private lastAngle: number = 0;
  private lastStepTime: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.lastAngle = Math.random() * Math.PI * 2; // Random initial direction
    this.lastStepTime = 0;
  }

  update(
    stepSize: number,
    maxTurnAngle: number,
    stepSpeed: number,
    currentTime: number,
    p: p5
  ): void {
    // Calculate time between steps based on speed
    const stepInterval = 1000 / stepSpeed; // Convert steps per second to milliseconds

    // Only take a step if enough time has passed
    if (currentTime - this.lastStepTime < stepInterval) {
      return;
    }

    // Update step time
    this.lastStepTime = currentTime;

    // Calculate maximum turn in radians
    const maxTurnRadians = (maxTurnAngle * Math.PI) / 180;

    // Generate a random angle change within the limit
    const angleChange = p.random(-maxTurnRadians, maxTurnRadians);
    const newAngle = this.lastAngle + angleChange;

    // Update position based on new angle
    this.x += p.cos(newAngle) * stepSize;
    this.y += p.sin(newAngle) * stepSize;

    // Wrap around screen edges
    if (this.x < 0) this.x = p.width;
    if (this.x > p.width) this.x = 0;
    if (this.y < 0) this.y = p.height;
    if (this.y > p.height) this.y = 0;

    // Store the new angle for next frame
    this.lastAngle = newAngle;

    // Add current position to trail
    this.trail.push({ x: this.x, y: this.y });
  }

  draw(
    p: p5,
    size: number,
    color: string,
    trailLength: number,
    trailOpacity: number,
    showTrails: boolean,
    trailSmoothing: number,
    stepSize: number
  ): void {
    // Draw trail
    if (showTrails && this.trail.length > 1) {
      p.push();
      p.stroke(color);
      p.strokeWeight(size * 0.5);
      p.noFill();

      // Set trail opacity
      const alpha = Math.floor(trailOpacity * 255);
      p.stroke(
        p.color(
          p.red(p.color(color)),
          p.green(p.color(color)),
          p.blue(p.color(color)),
          alpha
        )
      );

      // Draw trail as individual points to avoid wrap-around artifacts
      if (trailSmoothing > 0 && this.trail.length > 2) {
        // Draw smooth curves between nearby points only
        for (let i = 0; i < this.trail.length - 1; i++) {
          const current = this.trail[i];
          const next = this.trail[i + 1];

          // Check if points are close enough to draw a line (not wrapping)
          const distance = p.dist(current.x, current.y, next.x, next.y);
          const maxDistance = stepSize * 2; // Don't draw lines longer than 2x step size

          if (distance < maxDistance) {
            // Draw a short curved segment
            p.beginShape();
            p.curveVertex(current.x, current.y);
            p.curveVertex(current.x, current.y);
            p.curveVertex(next.x, next.y);
            p.curveVertex(next.x, next.y);
            p.endShape();
          }
        }
      } else {
        // Draw individual line segments between nearby points
        for (let i = 0; i < this.trail.length - 1; i++) {
          const current = this.trail[i];
          const next = this.trail[i + 1];

          // Check if points are close enough to draw a line (not wrapping)
          const distance = p.dist(current.x, current.y, next.x, next.y);
          const maxDistance = stepSize * 2; // Don't draw lines longer than 2x step size

          if (distance < maxDistance) {
            p.line(current.x, current.y, next.x, next.y);
          }
        }
      }
      p.pop();
    }

    // Draw walker
    p.push();
    p.fill(color);
    p.noStroke();
    p.circle(this.x, this.y, size);
    p.pop();

    // Trim trail to specified length
    if (this.trail.length > trailLength) {
      this.trail = this.trail.slice(-trailLength);
    }
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.trail = [];
    this.lastAngle = Math.random() * Math.PI * 2; // Random new direction
  }
}

// Random Walker Animation Class
export class RandomWalkerAnimation extends P5Animation<
  typeof randomWalkerManifest
> {
  private walkers: Walker[] = [];

  onInit(p: p5, controls: any): void {
    this.walkers = [];

    // Create initial walkers
    for (let i = 0; i < controls.walkerCount; i++) {
      const x = p.random(p.width * 0.2, p.width * 0.8);
      const y = p.random(p.height * 0.2, p.height * 0.8);
      this.walkers.push(new Walker(x, y));
    }
  }

  onUpdate(p: p5, controls: any, _deltaTime: number): void {
    // Clear background with slight transparency for trails
    if (controls.showTrails) {
      p.push();
      p.fill(0, 0, 0, 10);
      p.rect(0, 0, p.width, p.height);
      p.pop();
    } else {
      p.background(0);
    }

    // Update and draw all walkers
    this.walkers.forEach((walker) => {
      walker.update(
        controls.stepSize,
        controls.maxTurnAngle,
        controls.stepSpeed,
        p.millis(),
        p
      );
      walker.draw(
        p,
        controls.walkerSize,
        controls.walkerColor,
        controls.trailLength,
        controls.trailOpacity,
        controls.showTrails,
        controls.trailSmoothing,
        controls.stepSize
      );
    });
  }

  protected onReset(p: p5, controls: any): void {
    // Reset all walkers to new random positions
    this.walkers = [];
    for (let i = 0; i < controls.walkerCount; i++) {
      const x = p.random(p.width * 0.2, p.width * 0.8);
      const y = p.random(p.height * 0.2, p.height * 0.8);
      this.walkers.push(new Walker(x, y));
    }
  }

  onDestroy(): void {
    this.walkers = [];
  }
}

export { randomWalkerManifest };
