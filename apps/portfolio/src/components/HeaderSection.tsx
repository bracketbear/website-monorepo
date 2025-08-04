import { type ReactNode } from 'react';
import { AnimationStage } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import {
  createCuriousParticleNetworkAnimation,
  createParticleWaveAnimation,
} from '@bracketbear/flateralus-animations';
import { clsx } from '@bracketbear/core';

export interface HeaderStat {
  /** Stat label */
  label: string;
  /** Stat value */
  value: string;
  /** Optional description */
  description?: string;
}

export interface HeaderSectionProps {
  /** Animation preset to use */
  preset?: 'curious-particle-network' | 'particle-wave' | 'topographic-lines';
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
export default function HeaderSection({
  preset = 'curious-particle-network',
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
        console.log('Creating curious particle network animation');
        animation = createCuriousParticleNetworkAnimation();
        break;
      case 'particle-wave':
        console.log('Creating particle wave animation');
        animation = createParticleWaveAnimation({
          waveCount: 2,
          verticalOffset: 60,
          phaseOffset: 6.28,
          depthRange: 100,
          baseOpacity: 0.4,
          depthOpacityRange: 0.3,
          waveDirection: 'horizontal',
          waveShape: 'sine',
          particleCount: 40,
          particleSize: 3.0,
          waveAmplitude: 20,
          waveFrequency: 0.18,
          waveSpeed: 0.5,
          lineThickness: 1.2,
          particleColor: '#ffffff',
          lineColor: '#ffffff',
          backgroundColor: '#000000',
        });
        break;
      default:
        console.log('Using default curious particle network animation');
        animation = createCuriousParticleNetworkAnimation();
    }

    console.log('Animation created:', animation);
    app.setAnimation(animation);
    return app;
  };

  return (
    <div
      className={clsx(
        'bg-brand-dark relative min-h-[60vh] w-full lg:min-h-[70vh]',
        className
      )}
    >
      <AnimationStage
        application={createApplication()}
        showDebugControls={showDebugControls}
        enableLuminanceDetection={enableLuminanceDetection}
        debugControlsClassName="top-20"
        layoutClassName="absolute inset-0"
      >
        {/* Default hero content if no children provided */}
        {!children && (
          <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 py-24 text-center">
            <div className="mx-auto max-w-4xl">
              {title && (
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-6 text-lg leading-8 text-white/90">
                  {subtitle}
                </p>
              )}
              {description && (
                <p className="mt-6 max-w-2xl text-lg text-white/80 md:text-xl">
                  {description}
                </p>
              )}
              {ctaText && ctaHref && (
                <div className="mt-10">
                  <a
                    href={ctaHref}
                    className="text-brand-dark inline-flex items-center justify-center rounded-md bg-white px-8 py-3 text-lg font-semibold shadow-sm hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {ctaText}
                  </a>
                </div>
              )}
            </div>

            {/* Stats section */}
            {stats && stats.length > 0 && (
              <div className="mx-auto mt-16 max-w-7xl px-6 lg:px-8">
                <dl className="grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-3">
                  {stats.map((stat, index) => (
                    <div
                      key={index}
                      className="mx-auto flex max-w-xs flex-col gap-y-4"
                    >
                      <dt className="text-base leading-7 text-white/60">
                        {stat.label}
                      </dt>
                      <dd className="order-first text-3xl font-bold tracking-tight text-white sm:text-5xl">
                        {stat.value}
                      </dd>
                      {stat.description && (
                        <dd className="text-base leading-7 text-white/60">
                          {stat.description}
                        </dd>
                      )}
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        )}

        {/* Custom children content */}
        {children && <div className="relative z-10">{children}</div>}
      </AnimationStage>
    </div>
  );
}
