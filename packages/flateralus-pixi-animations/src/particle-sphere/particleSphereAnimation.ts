import {
  BaseAnimation,
  createManifest,
  type ManifestToControlValues,
} from '@bracketbear/flateralus';
import * as PIXI from 'pixi.js';

// ============================================================================
// ANIMATION CONSTANTS
// ============================================================================

const PARTICLE_COUNT = 200;
const PARTICLE_SIZE = 3;

// ============================================================================
// PARTICLE INTERFACE
// ============================================================================

interface Particle {
  sprite: PIXI.Graphics;
  originalX: number;
  originalY: number;
  originalZ: number;
  currentX: number;
  currentY: number;
  currentZ: number;
  size: number;
  baseSize: number;
  pulseOffset: number;
  waveOffset: number;
  color: number;
  baseAlpha: number;
  currentAlpha: number;
}

// ============================================================================
// ANIMATION MANIFEST
// ============================================================================

export const PARTICLE_SPHERE_MANIFEST = createManifest({
  id: 'particle-sphere',
  name: 'Particle Sphere',
  description: 'A rotating sphere of square particles that pulse and wave',
  controls: [
    {
      name: 'particleCount',
      type: 'number',
      label: 'Particle Count',
      description: 'Number of particles in the sphere',
      min: 50,
      max: 500,
      step: 10,
      defaultValue: PARTICLE_COUNT,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'sphereRadius',
      type: 'number',
      label: 'Sphere Radius',
      description: 'Radius of the particle sphere (relative to container size)',
      min: 0.1,
      max: 5.0,
      step: 0.1,
      defaultValue: 0.6,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'particleSize',
      type: 'number',
      label: 'Particle Size',
      description: 'Base size of individual particles',
      min: 1,
      max: 8,
      step: 0.5,
      defaultValue: PARTICLE_SIZE,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'rotationSpeed',
      type: 'number',
      label: 'Rotation Speed',
      description: 'Speed of sphere rotation',
      min: 0.01,
      max: 0.5,
      step: 0.01,
      defaultValue: 0.01,
      debug: true,
    },
    {
      name: 'pulseSpeed',
      type: 'number',
      label: 'Pulse Speed',
      description: 'Speed of particle pulsing',
      min: 0.1,
      max: 3.0,
      step: 0.1,
      defaultValue: 1.3,
      debug: true,
    },
    {
      name: 'waveCount',
      type: 'number',
      label: 'Wave Count',
      description: 'Number of waves across the sphere',
      min: 1,
      max: 8,
      step: 1,
      defaultValue: 2,
      debug: true,
    },
    {
      name: 'waveAmplitude',
      type: 'number',
      label: 'Wave Amplitude',
      description: 'Amplitude of the wave effect',
      min: 0,
      max: 50,
      step: 1,
      defaultValue: 50,
      debug: true,
    },
    {
      name: 'pulseAmplitude',
      type: 'number',
      label: 'Pulse Amplitude',
      description: 'Amplitude of particle pulsing',
      min: 0,
      max: 2,
      step: 0.1,
      defaultValue: 1.5,
      debug: true,
    },
    {
      name: 'particleColor',
      type: 'color',
      label: 'Particle Color',
      description: 'Color of the particles',
      defaultValue: '#010101',
      debug: true,
    },
    {
      name: 'opacity',
      type: 'number',
      label: 'Opacity',
      description: 'Overall opacity of particles',
      min: 0.1,
      max: 1.0,
      step: 0.1,
      defaultValue: 0.9,
      debug: true,
    },
    {
      name: 'showConnections',
      type: 'boolean',
      label: 'Show Connections',
      description: 'Draw lines between nearby particles',
      defaultValue: false,
      debug: true,
    },
    {
      name: 'connectionDistance',
      type: 'number',
      label: 'Connection Distance',
      description: 'Maximum distance for connections',
      min: 0,
      max: 100,
      step: 5,
      defaultValue: 30,
      debug: true,
    },
    {
      name: 'connectionColor',
      type: 'color',
      label: 'Connection Color',
      description: 'Color of connection lines',
      defaultValue: '#00ff88',
      debug: true,
    },
    {
      name: 'rotationAxis',
      type: 'select',
      label: 'Rotation Axis',
      description: 'Axis of rotation',
      options: [
        { value: 'xyz', label: 'All Axes' },
        { value: 'x', label: 'X Axis' },
        { value: 'y', label: 'Y Axis' },
        { value: 'z', label: 'Z Axis' },
        { value: 'xy', label: 'X & Y' },
        { value: 'xz', label: 'X & Z' },
        { value: 'yz', label: 'Y & Z' },
      ],
      defaultValue: 'xyz',
      debug: true,
    },
  ],
});

type ParticleSphereControlValues = ManifestToControlValues<
  typeof PARTICLE_SPHERE_MANIFEST
>;

// ============================================================================
// PARTICLE SPHERE ANIMATION CLASS
// ============================================================================

export class ParticleSphereAnimation extends BaseAnimation<
  typeof PARTICLE_SPHERE_MANIFEST,
  ParticleSphereControlValues
> {
  private particles: Particle[] = [];
  private container!: PIXI.Container;
  private connectionsGraphics!: PIXI.Graphics;
  private time: number = 0;
  private rotationX: number = 0;
  private rotationY: number = 0;
  private rotationZ: number = 0;

  constructor(initialControls?: Partial<ParticleSphereControlValues>) {
    super(PARTICLE_SPHERE_MANIFEST, initialControls);
  }

  onInit(
    context: PIXI.Application,
    controls: ParticleSphereControlValues
  ): void {
    this.container = new PIXI.Container();
    this.connectionsGraphics = new PIXI.Graphics();

    context.stage.addChild(this.container);
    context.stage.addChild(this.connectionsGraphics);

    this.createParticles(context, controls);
    this.centerSphere(context);
  }

  onUpdate(
    context: PIXI.Application,
    controls: ParticleSphereControlValues,
    deltaTime: number
  ): void {
    this.time += deltaTime;

    // Update rotations based on axis selection
    this.updateRotations(controls, deltaTime);

    // Update particle positions and properties
    this.updateParticles(context, controls, deltaTime);

    // Update connections if enabled
    if (controls.showConnections) {
      this.updateConnections(controls);
    }
  }

  onDestroy(): void {
    if (this.container && this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    if (this.connectionsGraphics && this.connectionsGraphics.parent) {
      this.connectionsGraphics.parent.removeChild(this.connectionsGraphics);
    }

    this.particles.forEach((particle) => {
      if (particle.sprite && particle.sprite.parent) {
        particle.sprite.parent.removeChild(particle.sprite);
      }
    });

    this.particles = [];
  }

  protected onReset(
    context: PIXI.Application,
    controls: ParticleSphereControlValues
  ): void {
    // Clear existing particles
    this.container.removeChildren();
    this.connectionsGraphics.clear();
    this.particles = [];

    // Recreate particles with new controls
    this.createParticles(context, controls);
    this.centerSphere(context);
  }

  protected onDynamicControlsChange(
    controls: ParticleSphereControlValues,
    previousControls: ParticleSphereControlValues,
    changedControls: string[]
  ): void {
    // Update particle colors
    if (changedControls.includes('particleColor')) {
      this.updateParticleColors(controls.particleColor);
    }

    // Update opacity
    if (changedControls.includes('opacity')) {
      this.updateOpacity(controls.opacity);
    }

    // Update connection color
    if (changedControls.includes('connectionColor')) {
      // Connections will be redrawn in next update
    }
  }

  private createParticles(
    context: PIXI.Application,
    controls: ParticleSphereControlValues
  ): void {
    const particleCount = controls.particleCount;
    // Calculate radius relative to container size
    const minDimension = Math.min(context.screen.width, context.screen.height);
    const radius = controls.sphereRadius * minDimension;
    const particleSize = controls.particleSize;

    for (let i = 0; i < particleCount; i++) {
      // Generate random points on sphere surface
      const phi = Math.acos(2 * Math.random() - 1); // 0 to π
      const theta = 2 * Math.PI * Math.random(); // 0 to 2π

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      // Create particle graphics
      const sprite = new PIXI.Graphics();
      sprite
        .rect(-particleSize / 2, -particleSize / 2, particleSize, particleSize)
        .fill({
          color: this.hexToNumber(controls.particleColor),
          alpha: controls.opacity,
        });

      this.container.addChild(sprite);

      this.particles.push({
        sprite,
        originalX: x,
        originalY: y,
        originalZ: z,
        currentX: x,
        currentY: y,
        currentZ: z,
        size: particleSize,
        baseSize: particleSize,
        pulseOffset: Math.random() * Math.PI * 2,
        waveOffset: Math.random() * Math.PI * 2,
        color: this.hexToNumber(controls.particleColor),
        baseAlpha: controls.opacity,
        currentAlpha: controls.opacity,
      });
    }
  }

  private updateRotations(
    controls: ParticleSphereControlValues,
    deltaTime: number
  ): void {
    const speed = controls.rotationSpeed * deltaTime * 60; // 60fps normalization

    switch (controls.rotationAxis) {
      case 'x':
        this.rotationX += speed;
        break;
      case 'y':
        this.rotationY += speed;
        break;
      case 'z':
        this.rotationZ += speed;
        break;
      case 'xy':
        this.rotationX += speed;
        this.rotationY += speed;
        break;
      case 'xz':
        this.rotationX += speed;
        this.rotationZ += speed;
        break;
      case 'yz':
        this.rotationY += speed;
        this.rotationZ += speed;
        break;
      case 'xyz':
      default:
        this.rotationX += speed;
        this.rotationY += speed;
        this.rotationZ += speed;
        break;
    }
  }

  private updateParticles(
    context: PIXI.Application,
    controls: ParticleSphereControlValues,
    _deltaTime: number
  ): void {
    // Calculate current radius for depth calculations
    const minDimension = Math.min(context.screen.width, context.screen.height);
    const currentRadius = controls.sphereRadius * minDimension;

    this.particles.forEach((particle) => {
      // Apply 3D rotations
      let x = particle.originalX;
      let y = particle.originalY;
      let z = particle.originalZ;

      // Rotate around X axis
      const cosX = Math.cos(this.rotationX);
      const sinX = Math.sin(this.rotationX);
      const newY = y * cosX - z * sinX;
      const newZ = y * sinX + z * cosX;
      y = newY;
      z = newZ;

      // Rotate around Y axis
      const cosY = Math.cos(this.rotationY);
      const sinY = Math.sin(this.rotationY);
      const newX = x * cosY + z * sinY;
      const newZ2 = -x * sinY + z * cosY;
      x = newX;
      z = newZ2;

      // Rotate around Z axis
      const cosZ = Math.cos(this.rotationZ);
      const sinZ = Math.sin(this.rotationZ);
      const newX2 = x * cosZ - y * sinZ;
      const newY2 = x * sinZ + y * cosZ;
      x = newX2;
      y = newY2;

      // Apply wave effect
      const wavePhase = this.time * controls.pulseSpeed + particle.waveOffset;
      const waveEffect =
        Math.sin(wavePhase * controls.waveCount) * controls.waveAmplitude;

      // Apply wave displacement along the radius
      const distance = Math.sqrt(x * x + y * y + z * z);
      if (distance > 0) {
        const scale = (distance + waveEffect) / distance;
        x *= scale;
        y *= scale;
        z *= scale;
      }

      // Apply pulsing effect
      const pulsePhase = this.time * controls.pulseSpeed + particle.pulseOffset;
      const pulseEffect = 1 + Math.sin(pulsePhase) * controls.pulseAmplitude;
      particle.size = particle.baseSize * pulseEffect;

      // Update particle position (project to 2D)
      particle.currentX = x;
      particle.currentY = y;
      particle.currentZ = z;

      // Update sprite position and size
      particle.sprite.x = x;
      particle.sprite.y = y;
      particle.sprite.scale.set(pulseEffect);

      // Update alpha based on depth (z-coordinate)
      const depthAlpha = Math.max(0.3, 1 - Math.abs(z) / currentRadius);
      particle.currentAlpha = particle.baseAlpha * depthAlpha;
      particle.sprite.alpha = particle.currentAlpha;
    });
  }

  private updateConnections(controls: ParticleSphereControlValues): void {
    this.connectionsGraphics.clear();

    const connectionColor = this.hexToNumber(controls.connectionColor);
    const maxDistance = controls.connectionDistance;

    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];

      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];

        const dx = p1.currentX - p2.currentX;
        const dy = p1.currentY - p2.currentY;
        const dz = p1.currentZ - p2.currentZ;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < maxDistance) {
          const alpha = (maxDistance - distance) / maxDistance;
          this.connectionsGraphics
            .setStrokeStyle({
              width: 1,
              color: connectionColor,
              alpha: alpha * 0.5,
            })
            .moveTo(p1.currentX, p1.currentY)
            .lineTo(p2.currentX, p2.currentY);
        }
      }
    }
  }

  private centerSphere(context: PIXI.Application): void {
    this.container.x = context.screen.width / 2;
    this.container.y = context.screen.height / 2;
    this.connectionsGraphics.x = context.screen.width / 2;
    this.connectionsGraphics.y = context.screen.height / 2;
  }

  private updateParticleColors(color: string | number): void {
    const colorNumber = this.hexToNumber(color);
    this.particles.forEach((particle) => {
      particle.color = colorNumber;
      particle.sprite.clear();
      particle.sprite
        .rect(
          -particle.baseSize / 2,
          -particle.baseSize / 2,
          particle.baseSize,
          particle.baseSize
        )
        .fill({ color: colorNumber, alpha: particle.currentAlpha });
    });
  }

  private updateOpacity(opacity: number): void {
    this.particles.forEach((particle) => {
      particle.baseAlpha = opacity;
    });
  }

  private hexToNumber(hex: string | number): number {
    if (typeof hex === 'number') {
      return hex;
    }
    if (typeof hex === 'string') {
      return parseInt(hex.replace('#', ''), 16);
    }
    return 0xffffff;
  }
}

export function createParticleSphereAnimation(
  initialControls?: Partial<ParticleSphereControlValues>
): ParticleSphereAnimation {
  return new ParticleSphereAnimation(initialControls);
}
