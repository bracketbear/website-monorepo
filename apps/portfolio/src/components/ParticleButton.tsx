import { forwardRef, useRef, useEffect } from 'react';
import * as PIXI from 'pixi.js';
import { clsx } from '@bracketbear/core';

interface ParticleButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  particleCount?: number;
  particleSize?: number;
  particleSpeed?: number;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
}

class ButtonParticleBackground {
  private app: PIXI.Application | null = null;
  private particles: Particle[] = [];
  private isHovered: boolean = false;
  private particleCount: number;
  private particleSize: number;
  private particleSpeed: number;
  private emissionTimer: number = 0;
  private emissionRate: number = 2;
  private animationId: number | null = null;
  private isDestroyed: boolean = false;

  constructor(
    canvas: HTMLCanvasElement,
    options: {
      particleCount: number;
      particleSize: number;
      particleSpeed: number;
    }
  ) {
    this.particleCount = options.particleCount;
    this.particleSize = options.particleSize;
    this.particleSpeed = options.particleSpeed;

    this.initPixi(canvas);
  }

  private async initPixi(canvas: HTMLCanvasElement): Promise<void> {
    try {
      this.app = new PIXI.Application();
      await this.app.init({
        canvas: canvas,
        width: canvas.width,
        height: canvas.height,
        backgroundColor: 0x000000,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
      });

      // Start animation loop
      this.animate();
    } catch (error) {
      console.error('Failed to initialize PixiJS:', error);
    }
  }

  setHovered(hovered: boolean): void {
    if (this.isDestroyed) return;
    this.isHovered = hovered;
  }

  private createParticle(): Particle {
    // Brand colors: dark (#111) and brand red (#bb4430)
    const colors = [0x111111, 0xbb4430];
    return {
      x: Math.random() * (this.app?.screen.width || 300),
      y: Math.random() * (this.app?.screen.height || 60),
      vx: (Math.random() - 0.5) * this.particleSpeed,
      vy: (Math.random() - 0.5) * this.particleSpeed,
      life: 0,
      maxLife: Math.random() * 120 + 60, // 60-180 frames
      size: Math.random() * this.particleSize + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  }

  private animate = (): void => {
    if (!this.app || this.isDestroyed) return;

    // Emit particles when hovered
    if (this.isHovered) {
      this.emissionTimer++;
      if (this.emissionTimer >= this.emissionRate) {
        this.emissionTimer = 0;

        // Create multiple particles for more density
        for (let i = 0; i < 3; i++) {
          if (this.particles.length < this.particleCount) {
            this.particles.push(this.createParticle());
          }
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life++;

      // Wrap around edges
      if (particle.x < 0) particle.x = this.app!.screen.width;
      if (particle.x > this.app!.screen.width) particle.x = 0;
      if (particle.y < 0) particle.y = this.app!.screen.height;
      if (particle.y > this.app!.screen.height) particle.y = 0;

      // Remove dead particles
      if (particle.life >= particle.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Clear and redraw
    this.app.stage.removeChildren();

    this.particles.forEach((particle) => {
      const graphics = new PIXI.Graphics();
      const lifeProgress = particle.life / particle.maxLife;
      const alpha = 0.3 + 0.7 * (1 - lifeProgress); // Start more visible, fade out
      const scale = 0.5 + 1.5 * lifeProgress; // Start small, grow

      graphics.circle(0, 0, particle.size * scale).fill({
        color: particle.color,
        alpha: alpha,
      });
      graphics.position.set(particle.x, particle.y);
      this.app!.stage.addChild(graphics);
    });

    if (!this.isDestroyed) {
      this.animationId = requestAnimationFrame(this.animate);
    }
  };

  resize(width: number, height: number): void {
    if (this.app && this.app.renderer && !this.isDestroyed) {
      this.app.renderer.resize(width, height);
    }
  }

  destroy(): void {
    this.isDestroyed = true;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.app) {
      try {
        this.app.destroy(true);
      } catch (error) {
        console.warn('Error destroying PixiJS app:', error);
      }
      this.app = null;
    }

    this.particles = [];
  }
}

export const ParticleButton = forwardRef<
  HTMLButtonElement,
  ParticleButtonProps
>(
  (
    {
      children,
      className = '',
      onClick,
      particleCount = 50,
      particleSize = 6,
      particleSpeed = 2,
      type = 'button',
      disabled = false,
    },
    ref
  ) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const effectRef = useRef<ButtonParticleBackground | null>(null);

    // Forward the ref
    if (ref) {
      (ref as React.MutableRefObject<HTMLButtonElement | null>).current =
        buttonRef.current;
    }

    useEffect(() => {
      if (!canvasRef.current || !buttonRef.current) return;

      const canvas = canvasRef.current;
      const button = buttonRef.current;

      // Set canvas size to match button
      const resizeCanvas = () => {
        if (!button || !canvas) return;
        const rect = button.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        if (effectRef.current) {
          effectRef.current.resize(rect.width, rect.height);
        }
      };

      // Initialize effect
      effectRef.current = new ButtonParticleBackground(canvas, {
        particleCount,
        particleSize,
        particleSpeed,
      });

      // Wait a bit for PixiJS to initialize, then resize
      setTimeout(resizeCanvas, 100);

      // Handle window resize
      const handleResize = () => {
        resizeCanvas();
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (effectRef.current) {
          effectRef.current.destroy();
          effectRef.current = null;
        }
      };
    }, [particleCount, particleSize, particleSpeed]);

    const handleMouseEnter = () => {
      if (effectRef.current) {
        effectRef.current.setHovered(true);
      }
    };

    const handleMouseLeave = () => {
      if (effectRef.current) {
        effectRef.current.setHovered(false);
      }
    };

    return (
      <button
        ref={buttonRef}
        className={clsx(
          'font-heading bg-dark relative z-10 overflow-hidden border-2 border-[#111] bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] font-bold text-white uppercase shadow-[3px_3px_0_#111] transition-all duration-200 text-shadow-lg not-[disabled]:cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-gradient-to-l hover:shadow-[1px_1px_0_#111]',
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        type={type}
        disabled={disabled}
      >
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 z-0"
        />
        <span className="relative z-10">{children}</span>
      </button>
    );
  }
);

ParticleButton.displayName = 'ParticleButton';

// Vite HMR fix - prevent crashes during hot reloads
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    // Clean up any remaining PixiJS instances
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach((canvas) => {
      if (canvas.getContext('webgl')) {
        const gl = canvas.getContext('webgl');
        if (gl) {
          gl.getExtension('WEBGL_lose_context')?.loseContext();
        }
      }
    });
  });
}
