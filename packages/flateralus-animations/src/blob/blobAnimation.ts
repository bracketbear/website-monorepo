import {
  type ManifestToControlValues,
  BaseAnimation,
} from '@bracketbear/flateralus';
import * as PIXI from 'pixi.js';
import { createManifest } from '@bracketbear/flateralus';

// ============================================================================
// ANIMATION CONSTANTS
// ============================================================================

/** Number of particles */
const PARTICLE_COUNT = 200;
/** Base particle size */
const PARTICLE_BASE_SIZE = 2.5;
/** Particle size variation */
const PARTICLE_SIZE_VARIATION = 1.5;
/** Blob radius */
const BLOB_RADIUS = 200;
/** Surface tension strength */
const SURFACE_TENSION = 0.8;
/** Center attraction strength */
const CENTER_ATTRACTION_STRENGTH = 0.02;
/** Mouse influence radius */
const MOUSE_INFLUENCE_RADIUS = 150;
/** Mouse repulsion strength */
const MOUSE_REPULSION_STRENGTH = 1.6;
/** Animation speed */
const ANIMATION_SPEED = 1.0;

// ============================================================================
// PARTICLE INTERFACE
// ============================================================================

interface Particle {
  sprite: PIXI.Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  targetX: number;
  targetY: number;
  originalX: number;
  originalY: number;
  color: number | string;
  alpha: number;
  targetAlpha: number;
  pulsePhase: number;
  pulseSpeed: number;
  isInteractive: boolean;
  trail?: Array<{ x: number; y: number; alpha: number }>;
  lastUpdateTime?: number;
}

interface BlobSystem {
  particles: Particle[];
  centerX: number;
  centerY: number;
  mouseX: number;
  mouseY: number;
  isMouseActive: boolean;
  time: number;
}

/**
 * Blob animation manifest with const assertion for better type inference
 */
const MANIFEST = createManifest({
  id: 'black-hole-sun',
  name: 'Black Hole Sun',
  description:
    'A spherical blob that maintains its shape while responding to mouse interaction',
  controls: [
    {
      name: 'radius',
      type: 'number',
      label: 'Blob Radius',
      description: 'Radius of the blob sphere',
      min: 50,
      max: 400,
      step: 10,
      defaultValue: BLOB_RADIUS,
      debug: true,
    },
    {
      name: 'surfaceTension',
      type: 'number',
      label: 'Surface Tension',
      description: 'How strongly particles stick to the surface',
      min: 0.1,
      max: 2.0,
      step: 0.1,
      defaultValue: SURFACE_TENSION,
      debug: true,
    },
    {
      name: 'centerAttractionStrength',
      type: 'number',
      label: 'Center Attraction',
      description: 'Strength of attraction to blob center',
      min: 0.001,
      max: 0.1,
      step: 0.001,
      defaultValue: CENTER_ATTRACTION_STRENGTH,
      debug: true,
    },
    {
      name: 'mouseInfluenceRadius',
      type: 'number',
      label: 'Mouse Influence Radius',
      description: 'Radius of mouse interaction',
      min: 50,
      max: 300,
      step: 10,
      defaultValue: MOUSE_INFLUENCE_RADIUS,
      debug: true,
    },
    {
      name: 'mouseRepulsionStrength',
      type: 'number',
      label: 'Mouse Repulsion Strength',
      description: 'Strength of mouse repulsion',
      min: 0.1,
      max: 5.0,
      step: 0.1,
      defaultValue: MOUSE_REPULSION_STRENGTH,
      debug: true,
    },
    {
      name: 'particleCount',
      type: 'number',
      label: 'Particle Count',
      description: 'Number of particles in the blob',
      min: 50,
      max: 500,
      step: 25,
      defaultValue: PARTICLE_COUNT,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'particleBaseSize',
      type: 'number',
      label: 'Base Particle Size',
      description: 'Base size of particles',
      min: 1.0,
      max: 5.0,
      step: 0.1,
      defaultValue: PARTICLE_BASE_SIZE,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'particleSizeVariation',
      type: 'number',
      label: 'Particle Size Variation',
      description: 'Variation in particle sizes',
      min: 0.5,
      max: 3.0,
      step: 0.1,
      defaultValue: PARTICLE_SIZE_VARIATION,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'animationSpeed',
      type: 'number',
      label: 'Animation Speed',
      description: 'Overall animation speed',
      min: 0.1,
      max: 3.0,
      step: 0.1,
      defaultValue: ANIMATION_SPEED,
      debug: true,
    },
    {
      name: 'showTrails',
      type: 'boolean',
      label: 'Show Particle Trails',
      description: 'Display particle trails',
      defaultValue: false,
      debug: true,
    },
    {
      name: 'trailLength',
      type: 'number',
      label: 'Trail Length',
      description: 'Length of particle trails',
      min: 0,
      max: 20,
      step: 1,
      defaultValue: 8,
      debug: true,
    },
    {
      name: 'particleColor',
      type: 'color',
      label: 'Particle Color',
      description: 'Color of normal particles',
      defaultValue: '#000000',
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'interactiveColor',
      type: 'color',
      label: 'Interactive Color',
      description: 'Color of particles near mouse',
      defaultValue: '#ff4b3e',
      debug: true,
      resetsAnimation: true,
    },
  ],
});

type BlobControlValues = ManifestToControlValues<typeof MANIFEST>;

/**
 * Create a particle texture with glow effect
 */
const createParticleTexture = (): PIXI.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext('2d')!;

  // Create a glowing particle
  const gradient = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.7)');
  gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.2)');
  gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 24, 24);

  // Add a bright core
  const coreGradient = ctx.createRadialGradient(12, 12, 0, 12, 12, 3);
  coreGradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  coreGradient.addColorStop(1.0, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = coreGradient;
  ctx.fillRect(0, 0, 24, 24);

  return PIXI.Texture.from(canvas);
};

/**
 * Create a blob particle positioned on a sphere surface
 */
const createBlobParticle = (
  app: PIXI.Application,
  texture: PIXI.Texture,
  centerX: number,
  centerY: number,
  radius: number,
  controls: BlobControlValues
): Particle => {
  const sprite = new PIXI.Sprite(texture);
  sprite.anchor.set(0.5);
  sprite.blendMode = 'add';
  const size =
    Math.random() * Number(controls.particleSizeVariation) +
    Number(controls.particleBaseSize);
  sprite.scale.set(size);

  // Position particle on sphere surface using spherical coordinates
  const phi = Math.acos(2 * Math.random() - 1); // Latitude
  const theta = 2 * Math.PI * Math.random(); // Longitude

  const x = centerX + radius * Math.sin(phi) * Math.cos(theta);
  const y = centerY + radius * Math.sin(phi) * Math.sin(theta);

  const particle: Particle = {
    sprite,
    x,
    y,
    vx: 0,
    vy: 0,
    size,
    targetX: x,
    targetY: y,
    originalX: x,
    originalY: y,
    color: controls.particleColor,
    alpha: 0.6 + Math.random() * 0.3,
    targetAlpha: 0.6 + Math.random() * 0.3,
    pulsePhase: Math.random() * Math.PI * 2,
    pulseSpeed: 0.02 + Math.random() * 0.01,
    isInteractive: false,
  };

  // Add trail if enabled
  if (controls.showTrails) {
    particle.trail = [];
    particle.lastUpdateTime = 0;
  }

  sprite.tint = particle.color;
  sprite.alpha = particle.alpha;

  app.stage.addChild(sprite);
  return particle;
};

/**
 * Calculate forces acting on a particle
 */
const calculateParticleForces = (
  particle: Particle,
  blob: BlobSystem,
  controls: BlobControlValues
) => {
  let forceX = 0;
  let forceY = 0;

  // 1. Center attraction (keeps blob together)
  const dx = blob.centerX - particle.x;
  const dy = blob.centerY - particle.y;
  const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

  if (distanceFromCenter > controls.radius) {
    const centerForce =
      (distanceFromCenter - controls.radius) *
      controls.centerAttractionStrength;
    forceX += (dx / distanceFromCenter) * centerForce;
    forceY += (dy / distanceFromCenter) * centerForce;
  }

  // 2. Surface tension (attraction to nearby particles)
  blob.particles.forEach((otherParticle) => {
    if (otherParticle === particle) return;

    const dx = otherParticle.x - particle.x;
    const dy = otherParticle.y - particle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0 && distance < 20) {
      // Only affect nearby particles
      const tensionForce =
        (20 - distance) * Number(controls.surfaceTension) * 0.001;
      forceX += (dx / distance) * tensionForce;
      forceY += (dy / distance) * tensionForce;
    }
  });

  // 3. Mouse repulsion (creates deformation)
  if (blob.isMouseActive) {
    const dx = blob.mouseX - particle.x;
    const dy = blob.mouseY - particle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (
      typeof controls.mouseInfluenceRadius === 'number' &&
      distance < controls.mouseInfluenceRadius
    ) {
      const repulsionForce =
        (Number(controls.mouseInfluenceRadius) - distance) *
        Number(controls.mouseRepulsionStrength) *
        0.001;
      forceX -= (dx / distance) * repulsionForce;
      forceY -= (dy / distance) * repulsionForce;

      // Make particle more interactive
      if (!particle.isInteractive) {
        particle.isInteractive = true;
        particle.color = controls.interactiveColor;
        particle.targetAlpha = 0.9;
        particle.sprite.tint = particle.color;
      }
    } else {
      // Return to normal state
      if (particle.isInteractive) {
        particle.isInteractive = false;
        particle.color = controls.particleColor;
        particle.targetAlpha = 0.6 + Math.random() * 0.3;
        particle.sprite.tint = particle.color;
      }
    }
  }

  // 4. Subtle organic movement
  const time = blob.time * controls.animationSpeed;
  const organicX = Math.sin(time * 0.5 + particle.originalX * 0.01) * 0.5;
  const organicY = Math.cos(time * 0.3 + particle.originalY * 0.01) * 0.5;
  forceX += organicX;
  forceY += organicY;

  return { x: forceX, y: forceY };
};

/**
 * Update particle visual effects
 */
const updateParticleVisuals = (
  particle: Particle,
  _time: number,
  controls: BlobControlValues
) => {
  // Update pulse
  particle.pulsePhase += particle.pulseSpeed * controls.animationSpeed;
  const pulseScale = 1 + Math.sin(particle.pulsePhase) * 0.15;
  particle.sprite.scale.set(particle.size * pulseScale);

  // Update trail if enabled
  if (controls.showTrails && particle.trail) {
    const now = Date.now();
    if (now - (particle.lastUpdateTime || 0) > 50) {
      particle.trail.push({
        x: particle.x,
        y: particle.y,
        alpha: particle.alpha,
      });
      if (particle.trail.length > controls.trailLength) {
        particle.trail.shift();
      }
      particle.lastUpdateTime = now;
    }
  }
};

/**
 * Blob Animation Class
 * Extends BaseAnimation and implements lifecycle hooks
 */
class BlobAnimation extends BaseAnimation<typeof MANIFEST, BlobControlValues> {
  private blobSystem: BlobSystem | null = null;
  private particleTexture: PIXI.Texture | null = null;

  constructor(initialControls?: BlobControlValues) {
    super(MANIFEST, initialControls);
  }

  onInit(app: PIXI.Application, _controls: BlobControlValues): void {
    // Create particle texture
    this.particleTexture = createParticleTexture();

    // Initialize blob system
    this.blobSystem = {
      particles: [],
      centerX: app.screen.width / 2,
      centerY: app.screen.height / 2,
      mouseX: 0,
      mouseY: 0,
      isMouseActive: false,
      time: 0,
    };

    // Initialize blob particles in a sphere
    for (let i = 0; i < this.getControls().particleCount; i++) {
      const particle = createBlobParticle(
        app,
        this.particleTexture,
        this.blobSystem.centerX,
        this.blobSystem.centerY,
        this.getControls().radius,
        this.getControls()
      );
      this.blobSystem.particles.push(particle);
    }

    // Set up mouse interaction
    app.stage.eventMode = 'static';
    app.stage.on('pointermove', (event) => {
      if (this.blobSystem) {
        this.blobSystem.mouseX = event.global.x;
        this.blobSystem.mouseY = event.global.y;
        this.blobSystem.isMouseActive = true;
      }
    });
  }

  onUpdate(app: PIXI.Application, controls: BlobControlValues, deltaTime: number): void {
    if (!this.blobSystem || !this.getContext()) {
      return;
    }

    this.blobSystem.time += deltaTime;

    // Update each particle
    this.blobSystem.particles.forEach((particle) => {
      // Calculate forces
      const forces = calculateParticleForces(
        particle,
        this.blobSystem!,
        controls
      );

      // Apply forces
      particle.vx += forces.x;
      particle.vy += forces.y;

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Apply damping
      particle.vx *= 0.95;
      particle.vy *= 0.95;

      // Update visual effects
      updateParticleVisuals(particle, this.blobSystem!.time, controls);

      // Update sprite
      particle.sprite.x = particle.x;
      particle.sprite.y = particle.y;

      // Smooth alpha transition
      particle.alpha += (particle.targetAlpha - particle.alpha) * 0.1;
      particle.sprite.alpha = particle.alpha;
    });
  }

  /**
   * Handle animation reset when reset controls change
   */
  protected onReset(app: PIXI.Application, controls: BlobControlValues): void {
    if (!this.blobSystem) return;

    // Remove existing particles
    this.blobSystem.particles.forEach((particle) => {
      app.stage.removeChild(particle.sprite);
    });

    // Create new particles
    this.blobSystem.particles = [];
    for (let i = 0; i < controls.particleCount; i++) {
      const particle = createBlobParticle(
        app,
        this.particleTexture!,
        this.blobSystem!.centerX,
        this.blobSystem!.centerY,
        controls.radius,
        controls
      );
      this.blobSystem.particles.push(particle);
    }
  }

  onDestroy(): void {
    if (this.blobSystem && this.getContext()) {
      const app = this.getContext() as PIXI.Application;

      // Remove all particles
      this.blobSystem.particles.forEach((particle) => {
        if (particle.sprite && particle.sprite.parent) {
          particle.sprite.parent.removeChild(particle.sprite);
        }
      });

      // Remove event listeners
      if (app.stage) {
        app.stage.off('pointermove');
      }

      this.blobSystem = null;
      this.particleTexture = null;
    }
  }
}

/**
 * Create a blob animation instance
 */
export function createBlobAnimation(
  initialControls?: BlobControlValues
): BlobAnimation {
  return new BlobAnimation(initialControls);
}
