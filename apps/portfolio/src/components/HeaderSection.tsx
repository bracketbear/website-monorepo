import React, { type ReactNode } from 'react';
import { AnimationStage } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import {
  createCuriousParticleNetworkAnimation,
  createParticleWaveAnimation,
  createBlobAnimation,
} from '@bracketbear/flateralus-animations';
import { clsx, Stats, type LabelValue } from '@bracketbear/core';

export type HeaderStat = LabelValue;

export interface HeaderSectionProps {
  /** Animation preset to use */
  preset?:
    | 'curious-particle-network'
    | 'particle-wave'
    | 'blob'
    | 'enhanced-wave';
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
  preset = 'enhanced-wave',
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
          particleCount: 80,
          connectionDistance: 100,
          lineThickness: 1.5,
          particleBaseSize: 2.5,
          particleSizeVariation: 1.0,
          particleGlowRadius: 20,
          attractionStrength: 0.02,
          cursorAttractionRadius: 140,
          cursorAttractionStrength: 0.12,
          animationSpeed: 1.2,
          particleColors: [
            { type: 'color', value: '#ffffff', metadata: { alpha: 1.0 } },
            { type: 'color', value: '#ff4b3e', metadata: { alpha: 1.0 } },
            { type: 'color', value: '#4b9fff', metadata: { alpha: 1.0 } },
          ],
          keepInBounds: true,
          connectionColor: '#ffffff',
          glowColor: '#ffffff',
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
          radius: 180,
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
        return 'bg-gradient-to-br from-brand-dark via-brand-dark/95 to-brand-red/20 bg-header-pattern';
      case 'particle-wave':
        return 'bg-gradient-to-br from-brand-dark via-brand-dark/90 to-brand-blue/15 bg-header-pattern';
      case 'blob':
        return 'bg-gradient-to-br from-brand-dark via-brand-dark/95 to-brand-orange/20 bg-header-pattern';
      case 'enhanced-wave':
      default:
        return 'bg-gradient-to-br from-brand-dark via-brand-dark/90 to-brand-green/20 bg-header-pattern';
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
      <div className="from-brand-dark/50 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />

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
                <h1 className="font-heading text-shadow-header text-4xl font-bold tracking-tight text-white uppercase sm:text-6xl lg:text-7xl">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-6 text-lg leading-8 font-medium text-white text-shadow-lg sm:text-xl lg:text-2xl">
                  {subtitle}
                </p>
              )}
              {description && (
                <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/80 md:text-xl lg:text-2xl">
                  {description}
                </p>
              )}
              {ctaText && ctaHref && (
                <div className="mt-10">
                  <a
                    href={ctaHref}
                    className="text-brand-dark inline-flex transform items-center justify-center rounded-md bg-white px-8 py-3 text-lg font-semibold shadow-[4px_4px_0_rgba(0,0,0,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-[6px_6px_0_rgba(0,0,0,0.4)] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-white"
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
