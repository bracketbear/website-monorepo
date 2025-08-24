import React, { type ReactNode } from 'react';
import { AnimationStage } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import {
  createCuriousParticleNetworkAnimation,
  createParticleWaveAnimation,
  createBlobAnimation,
  createRetroGridAnimation,
} from '@bracketbear/flateralus-animations';
import { clsx, Stats, type LabelValue } from '@bracketbear/core';

export type HeaderStat = LabelValue;

export interface HeaderSectionProps {
  /** Animation preset to use */
  preset?:
    | 'curious-particle-network'
    | 'particle-wave'
    | 'blob'
    | 'enhanced-wave'
    | 'retro-grid';
  /** Additional CSS classes */
  className?: string;
  /** Whether to show debug controls */
  showDebugControls?: boolean;
  /** Whether to enable luminance detection */
  enableLuminanceDetection?: boolean;
  /** Hero title */
  title?: string;
  /** Hero subtitle */
  subtitle?: string;
  /** Hero description */
  description?: string;
  /** CTA button text */
  ctaText?: string;
  /** CTA button href */
  ctaHref?: string;
  /** Stats to display */
  stats?: HeaderStat[];
  /** Custom content to render over the animation */
  children?: ReactNode;
}

/**
 * HeaderSection - React component for header sections with Flateralus animations
 *
 * Provides a standardized way to create header sections with animated backgrounds
 * across different pages and applications. Based on Tailwind CSS header with stats design.
 */
export function HeaderSection({
  preset = 'retro-grid',
  className = '',
  showDebugControls = true,
  enableLuminanceDetection = true,
  title,
  subtitle,
  description,
  ctaText,
  ctaHref,
  stats,
  children,
}: HeaderSectionProps) {
  // Create the application and animation on the client side
  const createApplication = () => {
    if (typeof window === 'undefined') return null;

    console.log('Creating animation with preset:', preset);

    const app = new PixiApplication({
      config: {
        autoResize: true,
        backgroundAlpha: 0,
        antialias: true,
      },
    });

    let animation;
    switch (preset) {
      case 'curious-particle-network':
        animation = createCuriousParticleNetworkAnimation({
          particleCount: 190,
          connectionDistance: 60,
          lineThickness: 2.3000000000000003,
          particleBaseSize: 2,
          particleSizeVariation: 0.8,
          animationSpeed: 0.65,
          attractionStrength: 0.011,
          cursorAttractionRadius: 90,
          cursorAttractionStrength: 0.17500000000000002,
          particleGlowRadius: 5,
          particleColors: [
            { type: 'color', value: '#9ce8e9', metadata: { alpha: 1.0 } },
          ],
          keepInBounds: true,
          connectionColor: '#000000',
          glowColor: '#f1880d',
          debugLogging: false,
        });
        break;
      case 'particle-wave':
        animation = createParticleWaveAnimation({
          waveCount: 3,
          verticalOffset: 50,
          phaseOffset: 4.71,
          depthRange: 120,
          baseOpacity: 0.6,
          depthOpacityRange: 0.4,
          waveDirection: 'horizontal',
          waveShape: 'sine',
          particleCount: 50,
          particleSize: 3.5,
          waveAmplitude: 25,
          waveFrequency: 0.15,
          waveSpeed: 0.8,
          lineThickness: 1.8,
          particleColor: 'hsl(200, 0%, 15%)',
          lineColor: 'hsl(200, 0%, 15%)',
          backgroundColor: '#000000',
        });
        break;
      case 'blob':
        animation = createBlobAnimation({
          scaleFactor: 0.4,
          surfaceTension: 1.2,
          centerAttractionStrength: 0.025,
          mouseInfluenceRadius: 160,
          mouseRepulsionStrength: 2.0,
          animationSpeed: 1.1,
          particleCount: 150,
          particleBaseSize: 3.0,
          particleSizeVariation: 1.2,
          showTrails: false,
          trailLength: 8,
          particleColor: '#ffffff',
          interactiveColor: '#ff4b3e',
        });
        break;
      case 'retro-grid':
        animation = createRetroGridAnimation({
          gridSize: 40,
          squareSize: 8,
          gridAngle: 15,
          gap: 2,
          skewX: 5,
          skewY: 0,
          perspectiveX: 0.1,
          perspectiveY: 0,
          particleShape: 'square',
          cornerRoundness: 0.2,
          animationSpeed: 1.2,
          pattern: 'wave',
          squareColor: '#ff69b4',
          showGridLines: true,
          gridLineColor: '#ff1493',
          opacity: 0.8,
          waveAmplitude: 0.6,
          waveFrequency: 0.8,
          rippleSpeed: 1.5,
          scanlineSpeed: 2.0,
        });
        break;
      case 'enhanced-wave':
      default:
        // Enhanced particle wave with better visual appeal
        animation = createParticleWaveAnimation({
          waveCount: 4,
          verticalOffset: 45,
          phaseOffset: 3.14,
          depthRange: 150,
          baseOpacity: 0.7,
          depthOpacityRange: 0.5,
          waveDirection: 'horizontal',
          waveShape: 'sine',
          particleCount: 60,
          particleSize: 4.0,
          waveAmplitude: 30,
          waveFrequency: 0.12,
          waveSpeed: 0.6,
          lineThickness: 2.0,
          particleColor: 'hsl(200, 0%, 15%)',
          lineColor: 'hsl(200, 0%, 15%)',
          backgroundColor: '#000000',
        });
        break;
    }

    console.log('Animation created:', animation);
    app.setAnimation(animation);
    return app;
  };

  // Enhanced background classes based on preset
  const getBackgroundClasses = () => {
    switch (preset) {
      case 'curious-particle-network':
        return 'bg-gradient-to-br from-muted via-muted/95 to-secondary/20 bg-header-pattern';
      case 'particle-wave':
        return 'bg-gradient-to-br from-muted via-muted/90 to-muted/15 bg-header-pattern';
      case 'blob':
        return 'bg-gradient-to-br from-muted via-muted/95 to-primary/20 bg-header-pattern';
      case 'retro-grid':
        return 'bg-gradient-to-br from-muted via-muted/95 to-muted/20 bg-header-pattern';
      case 'enhanced-wave':
      default:
        return 'bg-gradient-to-br from-muted via-muted/90 to-muted/15 bg-header-pattern';
    }
  };

  return (
    <div
      className={clsx(
        'relative min-h-[60vh] w-full lg:min-h-[70vh]',
        getBackgroundClasses(),
        className
      )}
    >
      {/* Enhanced background overlay with subtle texture */}
      <div className="bg-noise absolute inset-0 opacity-5" />

      {/* Animated grid pattern for subtle movement */}
      <div className="bg-animated-grid absolute inset-0 opacity-10" />

      {/* Enhanced glow effect */}
      <div className="bg-header-glow absolute inset-0" />

      {/* Gradient overlay for better text contrast */}
      <div className="from-muted/50 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />

      <AnimationStage
        application={createApplication()}
        showDebugControls={showDebugControls}
        enableLuminanceDetection={enableLuminanceDetection}
        debugControlsClassName="top-24 right-4 z-50"
        layoutClassName="absolute inset-0"
      >
        {/* Default hero content if no children provided */}
        {!children && (
          <div className="px-content relative z-10 flex h-full flex-col items-center justify-center py-24 text-center">
            <div className="mx-auto max-w-4xl">
              {title && (
                <h1 className="font-heading text-shadow-header text-text-primary text-4xl font-bold tracking-tight uppercase sm:text-6xl lg:text-7xl">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-text-primary mt-6 text-lg leading-8 font-medium text-shadow-lg sm:text-xl lg:text-2xl">
                  {subtitle}
                </p>
              )}
              {description && (
                <p className="text-text-primary/80 mx-auto mt-6 max-w-2xl text-lg leading-relaxed md:text-xl lg:text-2xl">
                  {description}
                </p>
              )}
              {ctaText && ctaHref && (
                <div className="mt-10">
                  <a
                    href={ctaHref}
                    className="bg-card text-card-foreground hover:bg-card/90 inline-flex transform items-center justify-center rounded-md px-8 py-3 text-lg font-semibold shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {ctaText}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom children content */}
        {children && <div className="relative z-10">{children}</div>}

        {/* Stats section - positioned as overlay */}
        {stats && stats.length > 0 && (
          <div className="absolute inset-x-0 bottom-0 z-20 container mx-auto w-full">
            <div className="relative -mb-16">
              <Stats
                stats={stats}
                className="drop-shadow-xl drop-shadow-black/30"
              />
            </div>
          </div>
        )}
      </AnimationStage>
    </div>
  );
}
