import React, { useRef, useEffect } from 'react';
import * as PIXI from 'pixi.js';

interface MouseState {
  x: number;
  y: number;
  isDown: boolean;
  dx: number;
  dy: number;
}

// Spinning Ring Effect Class
class SpinningRingEffect {
  private container: PIXI.Container;
  private ring: PIXI.Container;
  private frameCount: number = 0;

  constructor(parent: PIXI.Container) {
    this.container = new PIXI.Container();
    parent.addChild(this.container);
    
    this.ring = this.createRing();
    this.container.addChild(this.ring);
  }

  private createRing(): PIXI.Container {
    const ring = new PIXI.Container();
    const dotCount = 12;
    const radius = 12;
    const dotSize = 2;

    for (let i = 0; i < dotCount; i++) {
      const angle = (i * 2 * Math.PI) / dotCount;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const dot = new PIXI.Graphics();
      dot.beginFill(0xf4ce14); // brand orange
      dot.drawCircle(0, 0, dotSize);
      dot.endFill();
      dot.position.set(x, y);

      ring.addChild(dot);
    }

    return ring;
  }

  update(mouseX: number, mouseY: number): void {
    this.frameCount++;
    this.ring.rotation = (this.frameCount * 0.01) % (Math.PI * 2);
    this.ring.position.set(mouseX, mouseY);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

// Particle Effect Class
class ParticleEffect {
  private container: PIXI.Container;
  private particles: Particle[] = [];

  constructor(parent: PIXI.Container) {
    this.container = new PIXI.Container();
    parent.addChild(this.container);
  }

  createParticles(x: number, y: number, dx: number, dy: number): void {
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 2) {
      const particleCount = Math.floor(Math.random() * 3) + 2;

      for (let i = 0; i < particleCount; i++) {
        const particle = new Particle(
          x + (Math.random() - 0.5) * 8,
          y + (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3
        );

        this.particles.push(particle);
        this.container.addChild(particle);
      }
    }
  }

  update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      if (!particle.update()) {
        this.container.removeChild(particle);
        this.particles.splice(i, 1);
      }
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

// Individual Particle Class
class Particle extends PIXI.Container {
  public vx: number;
  public vy: number;
  public life: number;
  public maxLife: number;

  constructor(x: number, y: number, vx: number, vy: number) {
    super();
    this.position.set(x, y);
    this.vx = vx;
    this.vy = vy;
    this.life = 0;
    this.maxLife = Math.random() * 60 + 30; // 30-90 frames

    // Create graphics - dark gray circles only
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0x2c2c2c);
    graphics.drawCircle(0, 0, 3);
    graphics.endFill();
    this.addChild(graphics);
  }

  update(): boolean {
    this.x += this.vx;
    this.y += this.vy;
    this.life++;

    // Scale up slightly over time
    const scale = 1 + (this.life / this.maxLife) * 0.3;
    this.scale.set(scale);

    // Fade out
    this.alpha = 1 - this.life / this.maxLife;

    return this.life < this.maxLife;
  }
}

/**
 * PointerFX renders PixiJS-based pointer effects with a spinning dotted ring and movement-based particles.
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
    spinningRing: SpinningRingEffect | null;
    particles: ParticleEffect | null;
  }>({
    spinningRing: null,
    particles: null,
  });

  useEffect(() => {
    let destroyed = false;
    (async () => {
      if (!containerRef.current) return;

      // PixiJS v8: use new Application(), then await app.init(options)
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

      // Create effect instances
      effectsRef.current.spinningRing = new SpinningRingEffect(app.stage);
      effectsRef.current.particles = new ParticleEffect(app.stage);

      // Use PixiJS's built-in event system for proper coordinate handling
      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;
      app.renderer.resolution = 1;

      // Mouse event handlers using PixiJS events
      const handlePointerMove = (event: PIXI.FederatedPointerEvent) => {
        const x = event.global.x;
        const y = event.global.y;

        mouseRef.current.dx = x - lastMousePos.current.x;
        mouseRef.current.dy = y - lastMousePos.current.y;
        mouseRef.current.x = x;
        mouseRef.current.y = y;
        lastMousePos.current = { x, y };

        // Create particles when moving
        if (effectsRef.current.particles) {
          effectsRef.current.particles.createParticles(x, y, mouseRef.current.dx, mouseRef.current.dy);
        }
      };

      const handlePointerDown = () => {
        mouseRef.current.isDown = true;
      };

      const handlePointerUp = () => {
        mouseRef.current.isDown = false;
      };

      // Add event listeners to the stage
      app.stage.on('pointermove', handlePointerMove);
      app.stage.on('pointerdown', handlePointerDown);
      app.stage.on('pointerup', handlePointerUp);

      // Animation loop
      const animate = () => {
        // Update spinning ring
        if (effectsRef.current.spinningRing) {
          effectsRef.current.spinningRing.update(mouseRef.current.x, mouseRef.current.y);
        }

        // Update particles
        if (effectsRef.current.particles) {
          effectsRef.current.particles.update();
        }

        requestAnimationFrame(animate);
      };

      // Handle resize
      const handleResize = () => {
        app.renderer.resize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', handleResize);

      // Start animation
      animate();

      // Cleanup
      return () => {
        destroyed = true;

        // Remove PixiJS event listeners
        app.stage.off('pointermove', handlePointerMove);
        app.stage.off('pointerdown', handlePointerDown);
        app.stage.off('pointerup', handlePointerUp);

        window.removeEventListener('resize', handleResize);

        // Destroy effects
        if (effectsRef.current.spinningRing) {
          effectsRef.current.spinningRing.destroy();
        }
        if (effectsRef.current.particles) {
          effectsRef.current.particles.destroy();
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