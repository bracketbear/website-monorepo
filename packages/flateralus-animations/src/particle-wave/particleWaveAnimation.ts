import { type ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import * as PIXI from 'pixi.js';
import { createManifest } from '@bracketbear/flateralus';

const PARTICLE_COUNT = 60;
const PARTICLE_SIZE = 3.0;
const WAVE_AMPLITUDE = 32;
const WAVE_FREQUENCY = 0.18;
const WAVE_SPEED = 1.0;
const LINE_THICKNESS = 1.2;
const PARTICLE_COLOR = '#151515';
const BG_COLOR = '#000000'; // Changed from 'transparent' to valid hex
const WAVE_COUNT = 3;
const VERTICAL_OFFSET = 40;
const PHASE_OFFSET = 6.28;
const DEPTH_RANGE = 100;
const BASE_OPACITY = 0.8;
const DEPTH_OPACITY_RANGE = 0.7;

interface WaveParticle {
  graphics: PIXI.Graphics;
  x: number;
  y: number;
  baseY: number;
  color: string;
  size: number;
  waveIndex: number;
  depth: number;
}

interface ParticleWaveSystem {
  particles: WaveParticle[];
  waveGraphics: PIXI.Graphics[]; // Separate graphics for each wave
  time: number;
  waveCount: number;
}

const MANIFEST = createManifest({
  id: 'particle-wave',
  name: 'Particle Wave',
  description:
    'A smooth sine wave of particles, customizable and visually rich.',
  controls: [
    {
      name: 'waveCount',
      type: 'number',
      label: 'Wave Count',
      description: 'Number of overlapping waves',
      min: 1,
      max: 80,
      step: 1,
      defaultValue: WAVE_COUNT,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'verticalOffset',
      type: 'number',
      label: 'Vertical Offset',
      description: 'Vertical spacing between waves',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: VERTICAL_OFFSET,
      debug: true,
    },
    {
      name: 'phaseOffset',
      type: 'number',
      label: 'Phase Offset',
      description: 'Phase difference between waves (0-2π)',
      min: 0,
      max: 6.28,
      step: 0.1,
      defaultValue: PHASE_OFFSET,
      debug: true,
    },
    {
      name: 'depthRange',
      type: 'number',
      label: 'Depth Range',
      description: 'Range of depth variation for waves',
      min: 0,
      max: 200,
      step: 1,
      defaultValue: DEPTH_RANGE,
      debug: true,
    },
    {
      name: 'baseOpacity',
      type: 'number',
      label: 'Base Opacity',
      description: 'Base opacity for waves (0-1)',
      min: 0.1,
      max: 1.0,
      step: 0.05,
      defaultValue: BASE_OPACITY,
      debug: true,
    },
    {
      name: 'depthOpacityRange',
      type: 'number',
      label: 'Depth Opacity Range',
      description: 'How much opacity varies with depth (0-1)',
      min: 0,
      max: 1.0,
      step: 0.05,
      defaultValue: DEPTH_OPACITY_RANGE,
      debug: true,
    },
    {
      name: 'waveDirection',
      type: 'select',
      label: 'Wave Direction',
      description: 'Direction of wave movement',
      options: [
        { value: 'horizontal', label: 'Horizontal' },
        { value: 'vertical', label: 'Vertical' },
        { value: 'diagonal', label: 'Diagonal' },
      ],
      defaultValue: 'horizontal',
      debug: true,
    },
    {
      name: 'waveShape',
      type: 'select',
      label: 'Wave Shape',
      description: 'Shape of the wave pattern',
      options: [
        { value: 'sine', label: 'Sine' },
        { value: 'cosine', label: 'Cosine' },
        { value: 'triangle', label: 'Triangle' },
        { value: 'square', label: 'Square' },
      ],
      defaultValue: 'sine',
      debug: true,
    },
    {
      name: 'particleCount',
      type: 'number',
      label: 'Particle Count',
      description: 'Number of particles per wave',
      min: 10,
      max: 200,
      step: 1,
      defaultValue: PARTICLE_COUNT,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'particleSize',
      type: 'number',
      label: 'Particle Size',
      description: 'Size of each particle',
      min: 1,
      max: 12,
      step: 0.1,
      defaultValue: PARTICLE_SIZE,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'waveAmplitude',
      type: 'number',
      label: 'Wave Amplitude',
      description: 'Height of the wave',
      min: 4,
      max: 120,
      step: 1,
      defaultValue: WAVE_AMPLITUDE,
      debug: true,
    },
    {
      name: 'waveFrequency',
      type: 'number',
      label: 'Wave Frequency',
      description: 'How many waves fit in the width',
      min: 0.01,
      max: 1.0,
      step: 0.01,
      defaultValue: WAVE_FREQUENCY,
      debug: true,
    },
    {
      name: 'waveSpeed',
      type: 'number',
      label: 'Wave Speed',
      description: 'Speed of the wave animation',
      min: 0.01,
      max: 4.0,
      step: 0.01,
      defaultValue: WAVE_SPEED,
      debug: true,
    },
    {
      name: 'lineThickness',
      type: 'number',
      label: 'Line Thickness',
      description:
        'Thickness of the connecting line. Currently does not work. TODO: Fix',
      min: 0.1,
      max: 8.0,
      step: 0.1,
      defaultValue: LINE_THICKNESS,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'particleColor',
      type: 'color',
      label: 'Particle Color',
      description: 'Color of the particles',
      defaultValue: PARTICLE_COLOR,
      debug: true,
    },
    {
      name: 'lineColor',
      type: 'color',
      label: 'Line Color',
      description:
        'Color of the connecting line. Lines do not currently work. TODO: Fix',
      defaultValue: PARTICLE_COLOR,
      debug: true,
    },
    {
      name: 'backgroundColor',
      type: 'color',
      label: 'Background Color',
      description: 'Background color of the animation',
      defaultValue: BG_COLOR,
      debug: true,
    },
  ],
});

type ParticleWaveControlValues = ManifestToControlValues<typeof MANIFEST>;
export type { ParticleWaveControlValues };

function createWaveParticle(
  app: PIXI.Application,
  x: number,
  y: number,
  color: string,
  size: number,
  waveIndex: number,
  depth: number
): WaveParticle {
  const graphics = new PIXI.Graphics();
  graphics.zIndex = 2 + depth; // Higher depth = higher z-index (closer to viewer)
  app.stage.addChild(graphics);
  return {
    graphics,
    x,
    y,
    baseY: y,
    color,
    size,
    waveIndex,
    depth,
  };
}

// Helper function to calculate wave value based on shape
function calculateWaveValue(phase: number, shape: string): number {
  switch (shape) {
    case 'sine':
      return Math.sin(phase);
    case 'cosine':
      return Math.cos(phase);
    case 'triangle':
      return (
        2 * Math.abs(phase / Math.PI - Math.floor(phase / Math.PI + 0.5)) - 1
      );
    case 'square':
      return Math.sin(phase) > 0 ? 1 : -1;
    default:
      return Math.sin(phase);
  }
}

class ParticleWaveAnimation extends PixiAnimation<
  typeof MANIFEST,
  ParticleWaveControlValues
> {
  private system: ParticleWaveSystem | null = null;

  constructor(initialControls?: ParticleWaveControlValues) {
    super(MANIFEST, initialControls);
  }

  onInit(app: PIXI.Application, controls: ParticleWaveControlValues): void {
    const {
      particleCount,
      particleSize,
      particleColor,
      waveCount,
      verticalOffset,
      depthRange,
    } = controls;
    const width = app.renderer.width;
    const height = app.renderer.height;
    const centerY = height / 2;

    this.system = {
      particles: [],
      waveGraphics: [],
      time: 0,
      waveCount,
    };

    // Create separate graphics objects for each wave
    for (let waveIndex = 0; waveIndex < waveCount; waveIndex++) {
      const waveGraphics = new PIXI.Graphics();
      waveGraphics.zIndex = 1;
      app.stage.addChild(waveGraphics);
      this.system.waveGraphics.push(waveGraphics);
    }

    // Create particles for each wave
    for (let waveIndex = 0; waveIndex < waveCount; waveIndex++) {
      const waveOffset = (waveIndex - (waveCount - 1) / 2) * verticalOffset;
      const waveCenterY = centerY + waveOffset;
      const depth = (waveIndex / (waveCount - 1)) * depthRange;

      for (let i = 0; i < particleCount; i++) {
        const x = (width / (particleCount - 1)) * i;
        const y = waveCenterY;
        const particle = createWaveParticle(
          app,
          x,
          y,
          particleColor,
          particleSize,
          waveIndex,
          depth
        );
        this.system.particles.push(particle);
      }
    }
  }

  onUpdate(
    app: PIXI.Application,
    controls: ParticleWaveControlValues,
    deltaTime: number
  ): void {
    if (!this.system) return;
    const { particles, waveGraphics } = this.system;
    this.system.time += deltaTime * controls.waveSpeed;
    const width = app.renderer.width;
    const height = app.renderer.height;
    const centerY = height / 2;

    // Clear all wave graphics
    waveGraphics.forEach((graphics) => graphics.clear());

    // Group particles by wave
    const waves: WaveParticle[][] = [];
    for (let i = 0; i < controls.waveCount; i++) {
      waves.push(particles.filter((p) => p.waveIndex === i));
    }

    // Calculate opacity scaling based on wave count
    const opacityScale = Math.min(1, 4 / controls.waveCount); // Scale opacity for high wave counts

    // Update and draw each wave
    waves.forEach((waveParticles, waveIndex) => {
      const waveOffset =
        (waveIndex - (controls.waveCount - 1) / 2) * controls.verticalOffset;
      const waveCenterY = centerY + waveOffset;
      const phaseOffset =
        (waveIndex / controls.waveCount) * controls.phaseOffset;
      const depth =
        (waveIndex / (controls.waveCount - 1)) * controls.depthRange;

      // Calculate depth-based effects
      const depthFactor = depth / controls.depthRange; // 0 to 1
      const sizeMultiplier = 1 + depthFactor * 0.5; // Closer waves are larger
      const baseOpacity = controls.baseOpacity * opacityScale;
      const depthOpacity = Math.min(
        1.0,
        baseOpacity + depthFactor * controls.depthOpacityRange
      ); // Clamp alpha to 1.0

      // Update particle positions for this wave
      for (let i = 0; i < waveParticles.length; i++) {
        const p = waveParticles[i];
        const phase = (i / (waveParticles.length - 1)) * Math.PI * 2;
        p.x = (width / (waveParticles.length - 1)) * i;

        // Calculate wave value based on shape and direction
        const waveValue = calculateWaveValue(
          phase + this.system!.time * controls.waveFrequency + phaseOffset,
          controls.waveShape
        );

        if (controls.waveDirection === 'horizontal') {
          p.y = waveCenterY + waveValue * controls.waveAmplitude;
        } else if (controls.waveDirection === 'vertical') {
          p.x = waveCenterY + waveValue * controls.waveAmplitude;
          p.y = (height / (waveParticles.length - 1)) * i;
        } else if (controls.waveDirection === 'diagonal') {
          p.x =
            (width / (waveParticles.length - 1)) * i +
            waveValue * controls.waveAmplitude * 0.5;
          p.y = waveCenterY + waveValue * controls.waveAmplitude * 0.5;
        }
      }

      // Draw connecting line for this wave with individual stroke style
      const currentWaveGraphics = waveGraphics[waveIndex];
      const lineThickness = controls.lineThickness; // Use raw line thickness, not multiplied by sizeMultiplier
      const lineColor = new PIXI.Color(controls.lineColor).toNumber();

      // Only draw lines if thickness > 0 and we have particles
      if (waveParticles.length > 1) {
        // if (lineThickness > 0 && waveParticles.length > 1) {
        currentWaveGraphics.stroke({
          width: lineThickness,
          color: lineColor,
          alpha: depthOpacity,
        });
        currentWaveGraphics.moveTo(waveParticles[0].x, waveParticles[0].y);
        for (let i = 1; i < waveParticles.length; i++) {
          currentWaveGraphics.lineTo(waveParticles[i].x, waveParticles[i].y);
        }
      }

      // Draw particles for this wave
      for (const p of waveParticles) {
        p.graphics.clear();
        p.graphics.circle(0, 0, controls.particleSize * sizeMultiplier);
        p.graphics.fill({
          color: new PIXI.Color(controls.particleColor).toNumber(),
          alpha: depthOpacity,
        });
        p.graphics.x = p.x;
        p.graphics.y = p.y;
      }
    });

    // Set background color if needed
    const bgColor =
      controls.backgroundColor === 'transparent'
        ? '#000000'
        : controls.backgroundColor;
    app.renderer.background.color = new PIXI.Color(bgColor).toNumber();
  }

  onDestroy(): void {
    if (this.system) {
      for (const p of this.system.particles) {
        if (p.graphics && p.graphics.parent) {
          p.graphics.parent.removeChild(p.graphics);
          p.graphics.destroy();
        }
      }
      // Clean up wave graphics
      for (const graphics of this.system.waveGraphics) {
        if (graphics && graphics.parent) {
          graphics.parent.removeChild(graphics);
          graphics.destroy();
        }
      }
      this.system = null;
    }
  }

  protected onReset(
    app: PIXI.Application,
    controls: ParticleWaveControlValues
  ): void {
    this.onDestroy();
    this.onInit(app, controls);
  }
}

export { ParticleWaveAnimation };

export function createParticleWaveAnimation(
  initialControls?: ParticleWaveControlValues
): ParticleWaveAnimation {
  return new ParticleWaveAnimation(initialControls);
}
