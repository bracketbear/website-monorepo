import {
  type ManifestToControlValues,
  type AnyControlValue,
} from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import * as PIXI from 'pixi.js';
import { createManifest } from '@bracketbear/flateralus';

// ============================================================================
// ANIMATION CONSTANTS
// ============================================================================

const PARTICLE_COUNT = 120;
const PARTICLE_BASE_SIZE = 2.2;
const PARTICLE_SIZE_VARIATION = 1.2;
const PARTICLE_CONNECTION_DISTANCE = 80;
const PARTICLE_GLOW_RADIUS = 18;
const ATTRACTION_STRENGTH = 0.015;
const CURSOR_ATTRACTION_RADIUS = 120;
const CURSOR_ATTRACTION_STRENGTH = 0.09;
const ANIMATION_SPEED = 1.0;

// ============================================================================
// PARTICLE INTERFACE
// ============================================================================

interface Particle {
  graphics: PIXI.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  opacity: number;
  fadeIn: boolean;
  isInteraction?: boolean;
  debugZeroCount?: number;
  glowGraphics?: PIXI.Graphics;
}

interface ParticleNetworkSystem {
  particles: Particle[];
  graphics: PIXI.Graphics;
  mouseX: number;
  mouseY: number;
  isMouseActive: boolean;
  time: number;
}

const MANIFEST = createManifest({
  id: 'curious-particle-network',
  name: 'Curious Particle Network',
  description:
    'A network of particles that connect and interact, with attract and interactive modes.',
  controls: [
    {
      name: 'particleCount',
      type: 'number',
      label: 'Particle Count',
      description: 'Number of particles in the network',
      min: 40,
      max: 200,
      step: 10,
      defaultValue: PARTICLE_COUNT,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'connectionDistance',
      type: 'number',
      label: 'Connection Distance',
      description: 'Max distance for drawing connections',
      min: 0,
      max: 160,
      step: 5,
      defaultValue: PARTICLE_CONNECTION_DISTANCE,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'lineThickness',
      type: 'number',
      label: 'Line Thickness',
      description: 'Thickness of connection lines',
      min: 0.1,
      max: 5,
      step: 0.1,
      defaultValue: 1.1,
      debug: true,
    },
    {
      name: 'particleBaseSize',
      type: 'number',
      label: 'Base Particle Size',
      description: 'Base size of particles',
      min: 1.0,
      max: 4.0,
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
      max: 2.0,
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
      max: 2.0,
      step: 0.05,
      defaultValue: ANIMATION_SPEED,
      debug: true,
    },
    {
      name: 'attractionStrength',
      type: 'number',
      label: 'Attraction Strength',
      description: 'Strength of particle attraction',
      min: 0.005,
      max: 0.05,
      step: 0.001,
      defaultValue: ATTRACTION_STRENGTH,
      debug: true,
    },
    {
      name: 'cursorAttractionRadius',
      type: 'number',
      label: 'Cursor Attraction Radius',
      description: 'Radius for cursor interaction',
      min: 40,
      max: 200,
      step: 5,
      defaultValue: CURSOR_ATTRACTION_RADIUS,
      debug: true,
    },
    {
      name: 'cursorAttractionStrength',
      type: 'number',
      label: 'Cursor Attraction Strength',
      description: 'Strength of attraction to cursor',
      min: 0.01,
      max: 0.2,
      step: 0.005,
      defaultValue: CURSOR_ATTRACTION_STRENGTH,
      debug: true,
    },
    {
      name: 'particleGlowRadius',
      type: 'number',
      label: 'Particle Glow Radius',
      description: 'Glow radius for interactive particles',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: PARTICLE_GLOW_RADIUS,
      debug: true,
    },
    {
      name: 'particleColors',
      type: 'group',
      value: 'color',
      label: 'Particle Colors',
      description: 'Colors for the particles',
      items: [
        {
          name: 'color',
          type: 'color',
          label: 'Color',
          defaultValue: '#fffbe0',
          debug: true,
        },
      ],
      defaultValue: [
        { type: 'color', value: '#fffbe0', metadata: { alpha: 1.0 } },
        { type: 'color', value: '#ff4b3e', metadata: { alpha: 1.0 } },
        { type: 'color', value: '#4b9fff', metadata: { alpha: 1.0 } },
        { type: 'color', value: '#eaeaea', metadata: { alpha: 1.0 } },
        { type: 'color', value: '#ffe066', metadata: { alpha: 1.0 } },
      ],
      minItems: 1,
      maxItems: 10,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'keepInBounds',
      type: 'boolean',
      label: 'Keep Particles In Bounds',
      description:
        'If checked, particles bounce off the edges. If unchecked, they wrap around.',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'connectionColor',
      type: 'color',
      label: 'Connection Color',
      description: 'Color of connecting lines',
      defaultValue: '#eaeaea',
      debug: true,
    },
    {
      name: 'glowColor',
      type: 'color',
      label: 'Glow Color',
      description: 'Glow color for interactive particles',
      defaultValue: '#fffbe0',
      debug: true,
    },
    {
      name: 'debugLogging',
      type: 'boolean',
      label: 'Debug Logging',
      description: 'Enable debug logging',
      defaultValue: false,
      debug: true,
    },
  ],
});

type ParticleNetworkControlValues = ManifestToControlValues<typeof MANIFEST>;
export type { ParticleNetworkControlValues };

function createParticle(
  app: PIXI.Application,
  width: number,
  height: number,
  controls: ParticleNetworkControlValues,
  colorIndex: number,
  isInteraction = false
): Particle {
  const graphics = new PIXI.Graphics();

  // Extract color values from discriminated objects
  const colorPalette = Array.isArray(controls.particleColors)
    ? (controls.particleColors as AnyControlValue[])
        .filter((item) => item.type === 'color')
        .map((item) => ({
          color: item.value as string,
          alpha: (item.metadata?.alpha as number) ?? 1.0,
        }))
    : [
        {
          color: '#fffbe0',
          alpha: 1.0,
        },
      ];

  const colorData = colorPalette[colorIndex % colorPalette.length] || {
    color: '#fffbe0',
    alpha: 1.0,
  };
  const color = colorData.color;
  const alpha = colorData.alpha;
  const radius = isInteraction
    ? 0 // invisible
    : Math.random() * Number(controls.particleSizeVariation) +
      Number(controls.particleBaseSize);
  const x = Math.random() * width;
  const y = Math.random() * height;
  let angle = Math.random() * Math.PI * 2;
  let speed = 0.5 + Math.random() * 0.7;
  let vx = Math.cos(angle) * speed;
  let vy = Math.sin(angle) * speed;
  // Ensure non-zero velocity for non-interaction particles
  if (!isInteraction && Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01) {
    angle += Math.PI / 4;
    vx = Math.cos(angle) * speed;
    vy = Math.sin(angle) * speed;
  }
  graphics.zIndex = 2;
  app.stage.addChild(graphics);

  // Create glow graphics if glow radius is set
  let glowGraphics: PIXI.Graphics | undefined;
  if (controls.particleGlowRadius && controls.particleGlowRadius > 0) {
    glowGraphics = new PIXI.Graphics();
    glowGraphics.zIndex = 1; // Behind the main particle
    app.stage.addChild(glowGraphics);
  }

  return {
    graphics,
    x,
    y,
    vx: isInteraction ? 0 : vx,
    vy: isInteraction ? 0 : vy,
    radius,
    color,
    opacity: alpha, // Use the alpha from the color metadata
    fadeIn: !isInteraction,
    isInteraction,
    debugZeroCount: 0,
    glowGraphics,
  };
}

class CuriousParticleNetworkAnimation extends PixiAnimation<
  typeof MANIFEST,
  ParticleNetworkControlValues
> {
  private system: ParticleNetworkSystem | null = null;
  private linesGraphics: PIXI.Graphics | null = null;
  private interactionParticle: Particle | null = null;

  constructor(initialControls?: ParticleNetworkControlValues) {
    super(MANIFEST, initialControls);
  }

  onInit(app: PIXI.Application, controls: ParticleNetworkControlValues): void {
    const particleCount = controls.particleCount;

    // Create graphics for lines
    this.linesGraphics = new PIXI.Graphics();
    this.linesGraphics.zIndex = 1;
    app.stage.addChild(this.linesGraphics);

    // Initialize system
    this.system = {
      particles: [],
      graphics: this.linesGraphics,
      mouseX: app.renderer.width / 2,
      mouseY: app.renderer.height / 2,
      isMouseActive: false,
      time: 0,
    };
    // Always clear interaction particle on reset
    this.interactionParticle = null;

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      const particle = createParticle(
        app,
        app.renderer.width,
        app.renderer.height,
        controls,
        i
      );
      this.system.particles.push(particle);
    }

    // Mouse interaction
    app.stage.eventMode = 'static';
    app.stage.on('pointermove', (event) => {
      if (this.system) {
        this.system.mouseX = event.global.x;
        this.system.mouseY = event.global.y;
        this.system.isMouseActive = true;
        if (!this.interactionParticle) {
          this.interactionParticle = createParticle(
            app,
            app.renderer.width,
            app.renderer.height,
            controls,
            0,
            true
          );
          this.system.particles.push(this.interactionParticle);
        }
        this.interactionParticle.x = event.global.x;
        this.interactionParticle.y = event.global.y;
      }
    });
    app.stage.on('pointerout', () => {
      if (this.system && this.interactionParticle) {
        // Remove interaction particle
        if (this.interactionParticle.graphics.parent) {
          this.interactionParticle.graphics.parent.removeChild(
            this.interactionParticle.graphics
          );
        }
        const idx = this.system.particles.indexOf(this.interactionParticle);
        if (idx > -1) this.system.particles.splice(idx, 1);
        this.interactionParticle = null;
        this.system.isMouseActive = false;
      }
    });
  }

  onUpdate(
    app: PIXI.Application,
    controls: ParticleNetworkControlValues,
    deltaTime: number
  ): void {
    if (!this.system || !this.linesGraphics) return;
    const { particles } = this.system;
    this.system.time += deltaTime * controls.animationSpeed;

    // Draw lines first
    this.linesGraphics.clear();
    const lineThickness = controls.lineThickness ?? 1.1;
    const connectionDistance = Math.max(0, controls.connectionDistance ?? 0);
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        // Quick check
        let distance = Math.min(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
        if (connectionDistance === 0 || distance > connectionDistance) continue;
        // Precise check
        distance = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
        if (connectionDistance === 0 || distance > connectionDistance) continue;
        const alpha =
          ((connectionDistance - distance) / connectionDistance) *
          (p1.opacity * p2.opacity);
        // Mouse interactivity: highlight if either particle is near the mouse
        let highlight = false;
        if (this.system.isMouseActive) {
          const mouseDist1 = Math.sqrt(
            (p1.x - this.system.mouseX) ** 2 + (p1.y - this.system.mouseY) ** 2
          );
          const mouseDist2 = Math.sqrt(
            (p2.x - this.system.mouseX) ** 2 + (p2.y - this.system.mouseY) ** 2
          );
          if (mouseDist1 < 40 || mouseDist2 < 40) {
            highlight = true;
          }
        }
        this.linesGraphics.stroke({
          width: highlight ? lineThickness * 2 : lineThickness,
          color: highlight
            ? 0xffffff
            : new PIXI.Color(controls.connectionColor).toNumber(),
          alpha: highlight ? 0.8 : alpha,
        });
        this.linesGraphics.moveTo(p1.x, p1.y);
        this.linesGraphics.lineTo(p2.x, p2.y);
      }
    }

    // Update and draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      // Fade in
      if (p.fadeIn && p.opacity < 1) {
        p.opacity += 0.02;
        if (p.opacity > 1) p.opacity = 1;
      }

      // Update position (skip for interaction particle)
      if (!p.isInteraction) {
        p.x += p.vx * controls.animationSpeed;
        p.y += p.vy * controls.animationSpeed;

        // Handle bounds based on keepInBounds setting
        if (controls.keepInBounds) {
          // Bounce off edges
          const buffer = 100;
          if (p.x > app.renderer.width + buffer || p.x < -buffer) p.vx *= -1;
          if (p.y > app.renderer.height + buffer || p.y < -buffer) p.vy *= -1;
        } else {
          // Wrap around edges
          if (p.x > app.renderer.width + 50) p.x = -50;
          if (p.x < -50) p.x = app.renderer.width + 50;
          if (p.y > app.renderer.height + 50) p.y = -50;
          if (p.y < -50) p.y = app.renderer.height + 50;
        }

        // Mouse interactivity: attract particles to mouse if within radius
        if (this.system.isMouseActive) {
          const dx = this.system.mouseX - p.x;
          const dy = this.system.mouseY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const attractionRadius = controls.cursorAttractionRadius ?? 120;
          if (dist < attractionRadius) {
            // Smooth falloff for attraction using the control value
            const strength =
              ((attractionRadius - dist) / attractionRadius) *
              (controls.cursorAttractionStrength ?? 0.18);
            p.vx += (dx / dist) * strength;
            p.vy += (dy / dist) * strength;
          }
        }

        // Apply attraction between particles if attractionStrength is set
        if (controls.attractionStrength && controls.attractionStrength > 0) {
          for (let j = 0; j < particles.length; j++) {
            if (i === j || particles[j].isInteraction) continue;
            const p2 = particles[j];
            const dx = p2.x - p.x;
            const dy = p2.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0 && dist < 100) {
              // Attraction within 100px
              const force = (controls.attractionStrength / (dist * dist)) * 0.1;
              p.vx += (dx / dist) * force;
              p.vy += (dy / dist) * force;
            }
          }
        }
      }
      // Debug: log if velocity is zero for more than 10 frames
      if (controls.debugLogging && !p.isInteraction) {
        if (Math.abs(p.vx) < 0.0001 && Math.abs(p.vy) < 0.0001) {
          p.debugZeroCount = (p.debugZeroCount || 0) + 1;
          if (p.debugZeroCount === 10) {
            console.warn(
              `[Particle ${i}] Stuck at (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) with velocity (${p.vx.toFixed(3)}, ${p.vy.toFixed(3)})`
            );
          }
        } else {
          p.debugZeroCount = 0;
        }
      }

      // Draw glow effect if enabled
      if (
        p.glowGraphics &&
        controls.particleGlowRadius &&
        controls.particleGlowRadius > 0
      ) {
        p.glowGraphics.clear();
        p.glowGraphics.circle(0, 0, controls.particleGlowRadius);
        p.glowGraphics.fill({
          color: new PIXI.Color(controls.glowColor ?? '#fffbe0').toNumber(),
          alpha: p.opacity * 0.3, // Subtle glow
        });
        p.glowGraphics.x = p.x;
        p.glowGraphics.y = p.y;
      }

      // Draw main particle
      p.graphics.clear();
      p.graphics.circle(0, 0, p.radius);
      // Mouse interactivity: highlight particle if near mouse
      let highlight = false;
      if (this.system.isMouseActive) {
        const mouseDist = Math.sqrt(
          (p.x - this.system.mouseX) ** 2 + (p.y - this.system.mouseY) ** 2
        );
        if (mouseDist < 40) highlight = true;
      }
      p.graphics.fill({
        color: highlight ? 0xffffff : new PIXI.Color(p.color).toNumber(),
        alpha: p.opacity,
      });
      p.graphics.x = p.x;
      p.graphics.y = p.y;
    }
  }

  onDestroy(): void {
    if (this.system) {
      // Remove and destroy all particle graphics
      for (const p of this.system.particles) {
        if (p.graphics) {
          if (p.graphics.parent) {
            p.graphics.parent.removeChild(p.graphics);
          }
          p.graphics.destroy({ children: true, texture: true });
        }
        // Clean up glow graphics
        if (p.glowGraphics) {
          if (p.glowGraphics.parent) {
            p.glowGraphics.parent.removeChild(p.glowGraphics);
          }
          p.glowGraphics.destroy({ children: true, texture: true });
        }
      }
      // Remove and destroy lines graphics
      if (this.linesGraphics) {
        if (this.linesGraphics.parent) {
          this.linesGraphics.parent.removeChild(this.linesGraphics);
        }
        this.linesGraphics.destroy({ children: true, texture: true });
        this.linesGraphics = null;
      }
      this.system = null;
    }
  }

  protected onReset(
    app: PIXI.Application,
    controls: ParticleNetworkControlValues
  ): void {
    // Remove and destroy all particle graphics
    if (this.system) {
      for (const p of this.system.particles) {
        if (p.graphics) {
          if (p.graphics.parent) {
            p.graphics.parent.removeChild(p.graphics);
          }
          p.graphics.destroy({ children: true, texture: true });
        }
        // Clean up glow graphics
        if (p.glowGraphics) {
          if (p.glowGraphics.parent) {
            p.glowGraphics.parent.removeChild(p.glowGraphics);
          }
          p.glowGraphics.destroy({ children: true, texture: true });
        }
      }
      this.system.particles = [];
    }
    // Remove and destroy lines graphics
    if (this.linesGraphics) {
      if (this.linesGraphics.parent) {
        this.linesGraphics.parent.removeChild(this.linesGraphics);
      }
      this.linesGraphics.destroy({ children: true, texture: true });
      this.linesGraphics = null;
    }
    // Cap particle count for performance
    const width = app.renderer.width;
    const height = app.renderer.height;
    const particleCount = Math.min(controls.particleCount, 300);
    // Create new lines graphics
    this.linesGraphics = new PIXI.Graphics();
    this.linesGraphics.zIndex = 1;
    app.stage.addChild(this.linesGraphics);
    // Re-initialize system
    if (this.system) {
      this.system.graphics = this.linesGraphics;
      this.system.particles = [];
      this.system.time = 0;
      this.system.isMouseActive = false;
      this.system.mouseX = width / 2;
      this.system.mouseY = height / 2;
    } else {
      this.system = {
        particles: [],
        graphics: this.linesGraphics,
        mouseX: width / 2,
        mouseY: height / 2,
        isMouseActive: false,
        time: 0,
      };
    }
    this.interactionParticle = null;
    // Create new particles
    for (let i = 0; i < particleCount; i++) {
      const particle = createParticle(app, width, height, controls, i);
      this.system.particles.push(particle);
    }
  }
}

export { CuriousParticleNetworkAnimation };

export function createCuriousParticleNetworkAnimation(
  initialControls?: ParticleNetworkControlValues
): CuriousParticleNetworkAnimation {
  return new CuriousParticleNetworkAnimation(initialControls);
}
