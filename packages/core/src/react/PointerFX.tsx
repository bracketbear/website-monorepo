import React, { useRef, useEffect } from 'react';
import * as PIXI from 'pixi.js';

/**
 * Represents the current state of mouse/touch input
 */
interface MouseState {
  /** Current X coordinate of the mouse cursor */
  x: number;
  /** Current Y coordinate of the mouse cursor */
  y: number;
  /** Whether the mouse button is currently pressed */
  isDown: boolean;
  /** Change in X position since last frame */
  dx: number;
  /** Change in Y position since last frame */
  dy: number;
}

/**
 * Individual round energy particle with orbital motion
 * Creates particles that orbit around a center point while expanding and fading out
 */
class EnergyParticle extends PIXI.Container {
  /** Horizontal velocity component of the particle */
  public vx: number;
  /** Vertical velocity component of the particle */
  public vy: number;
  /** Current age of the particle in frames */
  public life: number;
  /** Maximum lifetime of the particle in frames */
  public maxLife: number;
  /** How much the particle expands as it ages (0.4 = 40% larger at death) */
  private expansion: number = 0.4;
  /** Distance from center for orbital motion */
  private orbitRadius: number;
  /** Speed of orbital rotation in radians per frame */
  private orbitSpeed: number;
  /** Current angle in the orbital path */
  private orbitAngle: number;
  /** X coordinate of the orbital center */
  private centerX: number;
  /** Y coordinate of the orbital center */
  private centerY: number;

  /**
   * Creates a new energy particle with orbital motion
   * @param x - Initial X position
   * @param y - Initial Y position
   * @param vx - Initial horizontal velocity
   * @param vy - Initial vertical velocity
   * @param centerX - X coordinate of orbital center
   * @param centerY - Y coordinate of orbital center
   * @param orbitRadius - Distance from center for orbital motion
   */
  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    centerX: number,
    centerY: number,
    orbitRadius: number
  ) {
    super();
    this.position.set(x, y);
    this.vx = vx;
    this.vy = vy;
    this.life = 0;
    this.maxLife = Math.random() * 40 + 30; // 30-70 frames
    this.centerX = centerX;
    this.centerY = centerY;
    this.orbitRadius = orbitRadius;
    this.orbitSpeed = (Math.random() - 0.5) * 0.1 + 0.05; // Random orbital speed
    this.orbitAngle = Math.random() * Math.PI * 2; // Random starting angle

    const graphics = new PIXI.Graphics();
    const size = Math.random() * 3 + 2; // 2-5px dots

    // Color palette: black, brand-red, brand-orange, white
    const colors = [
      0x000000, // Black
      0xbb4430, // Brand Red
      0xffc15e, // Brand Orange
      0xffffff, // White
    ];
    const selectedColor = colors[Math.floor(Math.random() * colors.length)];

    // Create round dot with difference blending and 50% transparency
    graphics.circle(0, 0, size).fill({ color: selectedColor, alpha: 0.3 });
    graphics.blendMode = 'difference';

    this.addChild(graphics);
  }

  /**
   * Updates the particle's position, rotation, and life cycle
   * @returns true if particle is still alive, false if it should be destroyed
   */
  update(): boolean {
    // Update orbital motion
    this.orbitAngle += this.orbitSpeed;

    // Calculate orbital position
    const orbitX = this.centerX + Math.cos(this.orbitAngle) * this.orbitRadius;
    const orbitY = this.centerY + Math.sin(this.orbitAngle) * this.orbitRadius;

    // Blend orbital motion with outward velocity
    this.x = orbitX + this.vx * (this.life / this.maxLife);
    this.y = orbitY + this.vy * (this.life / this.maxLife);

    // Gradually reduce outward velocity
    this.vx *= 0.98;
    this.vy *= 0.98;

    this.life++;

    const lifeProgress = this.life / this.maxLife;
    this.alpha = 1 - lifeProgress;
    this.scale.set(1 + lifeProgress * this.expansion);

    return this.life < this.maxLife;
  }
}

/**
 * Energy particle system that emits round particles with orbital motion
 * Manages the creation, updating, and cleanup of energy particles
 */
class EnergyEffect {
  /** Container that holds all energy particles */
  private container: PIXI.Container;
  /** Array of active energy particles */
  private particles: EnergyParticle[] = [];
  /** Maximum number of particles allowed at once (higher = denser effect, more performance cost) */
  private maxParticles: number = 500;
  /** How many frames to wait between particle emissions (lower = more frequent) */
  private emissionRate: number = 1;
  /** Counter for tracking emission timing */
  private emissionTimer: number = 32;

  /**
   * Creates a new energy effect system
   * @param parent - Parent container to add the effect to
   */
  constructor(parent: PIXI.Container) {
    this.container = new PIXI.Container();
    parent.addChild(this.container);
  }

  /**
   * Creates energy particles at the specified position
   * @param x - X coordinate for particle emission
   * @param y - Y coordinate for particle emission
   * @param circleRadius - Radius of the circle to emit particles from
   */
  createEnergy(x: number, y: number, circleRadius: number): void {
    if (this.particles.length < this.maxParticles) {
      this.emissionTimer++;

      if (this.emissionTimer >= this.emissionRate) {
        this.emissionTimer = 0;

        // Create multiple particles in a ring pattern
        const numParticles = 3; // Emit 3 particles at once for intensity
        for (let i = 0; i < numParticles; i++) {
          const angle = (Math.PI * 2 * i) / numParticles + Math.random() * 0.5;

          // Position particle on the outer edge of the circle
          const edgeX = x + Math.cos(angle) * circleRadius;
          const edgeY = y + Math.sin(angle) * circleRadius;

          // Calculate velocity outward from the circle's center
          const speed = Math.random() * 2 + 1;
          const particleVx = Math.cos(angle) * speed;
          const particleVy = Math.sin(angle) * speed;

          const particle = new EnergyParticle(
            edgeX,
            edgeY,
            particleVx,
            particleVy,
            x, // center X for orbital motion
            y, // center Y for orbital motion
            circleRadius * 0.8 // orbital radius slightly smaller than circle
          );

          this.particles.push(particle);
          this.container.addChild(particle);
        }
      }
    }
  }

  /**
   * Updates all active particles and removes dead ones
   */
  update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      if (!particle.update()) {
        this.container.removeChild(particle);
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Cleans up all particles and removes the container
   */
  destroy(): void {
    this.container.destroy({ children: true });
  }
}

/**
 * Manages the visual cursor effects including the main dot and black hole sun
 * with particle emission and interactive element scaling
 */
class MouseCursorEffect {
  /** Container that holds all cursor effect elements */
  private container: PIXI.Container;
  /** Graphics object for the main cursor dot */
  private cursorDot: PIXI.Graphics;
  /** Current X position of the trailing effect */
  private trailingX: number = 0;
  /** Current Y position of the trailing effect */
  private trailingY: number = 0;
  /** Horizontal velocity of the trailing effect */
  private velocityX: number = 0;
  /** Vertical velocity of the trailing effect */
  private velocityY: number = 0;
  /** Strength of the spring force that pulls the trailing effect toward the cursor (higher = tighter following) */
  private springStrength: number = 0.04;
  /** Damping factor that reduces velocity over time (0.85 = 15% velocity loss per frame) */
  private damping: number = 0.85;
  /** Base radius of the effect when not hovering over interactive elements */
  private baseRadius: number = 16; // Increased from 8 for larger hover effect
  /** Target radius that the effect is trying to reach */
  private targetRadius: number = 16;
  /** Current radius of the effect (interpolates toward targetRadius) */
  private currentRadius: number = 16;
  /** Speed of radius interpolation (0.18 = 18% of the way to target each frame) */
  private radiusLerpSpeed: number = 0.18;
  /** Maximum scale multiplier when hovering over large interactive elements */
  private maxScaleMultiplier: number = 32; // Increased from 16 for larger hover effect
  /** Energy effect system for particle emission */
  private energyEffect: EnergyEffect;

  /**
   * Creates a new mouse cursor effect
   * @param parent - Parent container to add the effect to
   */
  constructor(parent: PIXI.Container) {
    this.container = new PIXI.Container();
    parent.addChild(this.container);

    this.cursorDot = new PIXI.Graphics();
    this.cursorDot.circle(0, 0, 3).fill({ color: 0x2c2c2c, alpha: 0.8 });
    this.container.addChild(this.cursorDot);

    this.energyEffect = new EnergyEffect(this.container);
  }

  /**
   * Detects if the cursor is hovering over interactive elements and calculates scaling
   * @param x - Current X position
   * @param y - Current Y position
   * @returns Scale multiplier (1.0 = no scaling, higher = larger circle)
   */
  private detectButtonHover(x: number, y: number): number {
    const interactiveElements = document.querySelectorAll(
      'button:not([disabled]), a, [role="button"], input[type="button"]:not([disabled]), input[type="submit"]:not([disabled]), .btn, .button, [data-interactive]'
    );
    let maxScale = 1;

    interactiveElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        const minDimension = Math.min(rect.width, rect.height);
        const scaleFactor = Math.min(
          this.maxScaleMultiplier,
          minDimension / this.baseRadius
        );
        maxScale = Math.max(maxScale, scaleFactor);
      }
    });

    return maxScale;
  }

  /**
   * Updates the cursor effect position and physics
   * @param mouseX - Current mouse X position
   * @param mouseY - Current mouse Y position
   */
  update(mouseX: number, mouseY: number): void {
    this.cursorDot.position.set(mouseX, mouseY);

    const dx = mouseX - this.trailingX;
    const dy = mouseY - this.trailingY;

    this.velocityX += dx * this.springStrength;
    this.velocityY += dy * this.springStrength;
    this.velocityX *= this.damping;
    this.velocityY *= this.damping;

    this.trailingX += this.velocityX;
    this.trailingY += this.velocityY;

    const hoverScale = this.detectButtonHover(this.trailingX, this.trailingY);
    this.targetRadius = this.baseRadius * hoverScale;
    this.currentRadius +=
      (this.targetRadius - this.currentRadius) * this.radiusLerpSpeed;

    // Create energy particles to define the black hole sun circle
    this.energyEffect.createEnergy(
      this.trailingX,
      this.trailingY,
      this.currentRadius
    );
    this.energyEffect.update();
  }

  /**
   * Cleans up resources when the effect is destroyed
   */
  destroy(): void {
    this.energyEffect.destroy();
    this.container.destroy({ children: true });
  }
}

/**
 * PointerFX Component
 *
 * Renders PixiJS-based pointer effects with:
 * - A small dark cursor dot that follows the mouse directly
 * - A black hole sun effect defined by dense triangular particle emission
 * - Particles that emanate from the circle's edge to clearly define its shape
 * - Spring physics for smooth trailing motion
 * - Automatic scaling when hovering over interactive elements
 *
 * The black hole sun effect uses dense particle emission with orbital motion to create a visible circle shape
 * without a solid graphic. Particles are white dots with difference blending that orbit around the cursor
 * while expanding and fading out, creating an intense, noticeable effect.
 *
 * @example
 * ```tsx
 * <PointerFX />
 * ```
 */
const PointerFX: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const mouseRef = useRef<MouseState>({
    x: 0,
    y: 0,
    isDown: false,
    dx: 0,
    dy: 0,
  });
  const lastMousePos = useRef({ x: 0, y: 0 });
  const effectsRef = useRef<{
    cursor: MouseCursorEffect | null;
  }>({
    cursor: null,
  });

  useEffect(() => {
    let destroyed = false;

    (async () => {
      if (!containerRef.current) return;

      const app = new PIXI.Application();
      await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x000000,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
      });

      if (destroyed) return;

      containerRef.current.appendChild(app.canvas);
      appRef.current = app;

      effectsRef.current.cursor = new MouseCursorEffect(app.stage);

      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;
      app.renderer.resolution = 1;

      const handlePointerMove = (event: PIXI.FederatedPointerEvent) => {
        const x = event.global.x;
        const y = event.global.y;

        mouseRef.current.dx = x - lastMousePos.current.x;
        mouseRef.current.dy = y - lastMousePos.current.y;
        mouseRef.current.x = x;
        mouseRef.current.y = y;
        lastMousePos.current = { x, y };
      };

      const handlePointerDown = () => {
        mouseRef.current.isDown = true;
      };

      const handlePointerUp = () => {
        mouseRef.current.isDown = false;
      };

      app.stage.on('pointermove', handlePointerMove);
      app.stage.on('pointerdown', handlePointerDown);
      app.stage.on('pointerup', handlePointerUp);

      const animate = () => {
        if (effectsRef.current.cursor) {
          effectsRef.current.cursor.update(
            mouseRef.current.x,
            mouseRef.current.y
          );
        }

        requestAnimationFrame(animate);
      };

      const handleResize = () => {
        app.renderer.resize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', handleResize);

      animate();

      return () => {
        destroyed = true;

        app.stage.off('pointermove', handlePointerMove);
        app.stage.off('pointerdown', handlePointerDown);
        app.stage.off('pointerup', handlePointerUp);

        window.removeEventListener('resize', handleResize);

        if (effectsRef.current.cursor) {
          effectsRef.current.cursor.destroy();
        }

        if (appRef.current) {
          appRef.current.destroy(true);
          appRef.current = null;
        }
      };
    })();
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-20 pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};

export default PointerFX;
