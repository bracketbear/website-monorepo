import { AnimationStage } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import {
  createCuriousParticleNetworkAnimation,
  createParticleWaveAnimation,
  createBlobAnimation,
  createRetroGridAnimation,
  createParticleSphereAnimation,
} from '@bracketbear/flateralus-pixi-animations';
import { getRandomControlValues } from '@bracketbear/flateralus';
import { clsx } from '@bracketbear/bear-ui';
import { useMemo, useState, useEffect, type ReactNode } from 'react';

// Animation control value constants
const ANIMATION_CONTROLS = {
  curiousParticleNetwork: {
    particleCount: 150,
    connectionDistance: 80,
    lineThickness: 2.0,
    particleBaseSize: 2,
    particleSizeVariation: 0.8,
    animationSpeed: 0.65,
    attractionStrength: 0.011,
    cursorAttractionRadius: 90,
    cursorAttractionStrength: 0.17500000000000002,
    particleGlowRadius: 5,
    particleColors: [
      { type: 'color' as const, value: '#f97316', metadata: { alpha: 1.0 } }, // Orange
      { type: 'color' as const, value: '#ea580c', metadata: { alpha: 1.0 } }, // Dark orange
      { type: 'color' as const, value: '#fed7aa', metadata: { alpha: 1.0 } }, // Light orange
      { type: 'color' as const, value: '#ffffff', metadata: { alpha: 1.0 } }, // White
      { type: 'color' as const, value: '#1f2937', metadata: { alpha: 1.0 } }, // Dark gray
    ],
    keepInBounds: true,
    connectionColor: '#f97316',
    glowColor: '#ea580c',
    debugLogging: false,
  },
  particleWave: {
    waveCount: 2,
    verticalOffset: 30,
    phaseOffset: 3.14,
    depthRange: 80,
    baseOpacity: 0.4,
    depthOpacityRange: 0.3,
    waveDirection: 'horizontal',
    waveShape: 'sine',
    particleCount: 35,
    particleSize: 2.5,
    waveAmplitude: 15,
    waveFrequency: 0.08,
    waveSpeed: 0.5,
    lineThickness: 1.2,
    particleColor: '#f97316',
    lineColor: '#f97316',
    backgroundColor: '#000000',
  },
  blob: {
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
    interactiveColor: '#f97316',
  },
  retroGrid: {
    gridSize: 32,
    squareSize: 12,
    gridAngle: 0,
    gap: 1,
    skewX: 0,
    skewY: 0,
    perspectiveX: 0.05,
    perspectiveY: 0.05,
    particleShape: 'square',
    cornerRoundness: 0.15,
    animationSpeed: 2.5,
    pattern: 'random',
    squareColor: '#f97316',
    showGridLines: false,
    gridLineColor: '#f97316',
    opacity: 0.9,
    waveAmplitude: 0.8,
    waveFrequency: 1.2,
    rippleSpeed: 3.0,
    scanlineSpeed: 4.0,
  },
  enhancedWave: {
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
    particleColor: '#f97316',
    lineColor: '#f97316',
    backgroundColor: '#000000',
  },
  particleSphere: {
    particleCount: 200,
    sphereRadius: 0.6,
    particleSize: 3,
    rotationSpeed: 0.01,
    pulseSpeed: 1.3,
    waveCount: 2,
    waveAmplitude: 50,
    pulseAmplitude: 2,
    particleColor: '#f97316',
    opacity: 0.9,
    showConnections: false,
    connectionDistance: 30,
    connectionColor: '#ea580c',
    rotationAxis: 'xyz',
  },
};

export interface HeroSectionProps {
  /** Animation preset to use */
  preset?:
    | 'curious-particle-network'
    | 'particle-wave'
    | 'blob'
    | 'enhanced-wave'
    | 'retro-grid'
    | 'particle-sphere';
  /** Additional CSS classes */
  className?: string;
  /** Whether to show debug controls */
  showDebugControls?: boolean;
  /** Hero title */
  title?: string;
  /** Hero subtitle */
  subtitle?: string;
  /** Hero description */
  description?: string;
  /** Custom content to render over the animation */
  children?: ReactNode;
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Whether to account for navigation bar */
  accountForNavigation?: boolean;
  /** Whether to account for breadcrumbs */
  accountForBreadcrumbs?: boolean;
  /** Whether this is the index page (affects height - full screen vs compact) */
  isIndexPage?: boolean;
}

/**
 * HeroSection - React component for hero sections with Flateralus animations
 * Adapted for the Bracket Bear website with orange/brand colors
 */
export function HeroSection({
  preset = 'curious-particle-network',
  className = '',
  showDebugControls = false,
  title = 'Page Title',
  subtitle = '',
  description,
  children,
  showActions = false,
  accountForNavigation = false,
  accountForBreadcrumbs = true,
  isIndexPage = false,
}: HeroSectionProps) {
  const [isClient, setIsClient] = useState(false);
  const [isAnimationReady, setIsAnimationReady] = useState(false);

  // Ensure we're on the client before rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Create application and animation only once
  const application = useMemo(() => {
    if (!isClient) {
      return null;
    }

    try {
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
            ...ANIMATION_CONTROLS.curiousParticleNetwork,
          });
          break;
        case 'particle-wave':
          animation = createParticleWaveAnimation({
            ...ANIMATION_CONTROLS.particleWave,
          });
          break;
        case 'blob':
          animation = createBlobAnimation({
            ...ANIMATION_CONTROLS.blob,
          });
          break;
        case 'retro-grid':
          animation = createRetroGridAnimation({
            ...ANIMATION_CONTROLS.retroGrid,
          });
          break;
        case 'particle-sphere':
          animation = createParticleSphereAnimation({
            ...ANIMATION_CONTROLS.particleSphere,
          });
          break;
        case 'enhanced-wave':
        default:
          // Enhanced particle wave with better visual appeal
          animation = createParticleWaveAnimation({
            ...ANIMATION_CONTROLS.enhancedWave,
          });
          break;
      }

      app.setAnimation(animation);

      // Mark animation as ready immediately to prevent flicker
      setIsAnimationReady(true);

      return app;
    } catch {
      return null;
    }
  }, [isClient, preset]);

  // Handle randomization from external source
  const handleRandomize = () => {
    if (application?.getAnimation()) {
      const animation = application.getAnimation();
      if (animation) {
        const manifest = animation.getManifest();
        if (manifest) {
          const randomValues = getRandomControlValues(manifest);
          animation.updateControls(randomValues);
        }
      }
    }
  };

  // Enhanced background classes based on preset - monotone warm theme
  const backgroundClasses = useMemo(() => {
    switch (preset) {
      case 'curious-particle-network':
        return 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200/50';
      case 'particle-wave':
        return 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200/30';
      case 'blob':
        return 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200/50';
      case 'retro-grid':
        return 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200/50';
      case 'particle-sphere':
        return 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200/50';
      case 'enhanced-wave':
      default:
        return 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200/30';
    }
  }, [preset]);

  // Get height classes based on whether this is an index page
  const heightClasses = useMemo(() => {
    return isIndexPage ? 'h-screen' : 'h-[60vh] min-h-[500px]';
  }, [isIndexPage]);

  // Calculate margin classes to go underneath navbar/breadcrumbs
  const marginClasses = useMemo(() => {
    if (accountForNavigation && accountForBreadcrumbs) {
      return '-mt-28';
    } else if (accountForNavigation) {
      return '-mt-20';
    }
    return ''; // No negative margin needed
  }, [accountForNavigation, accountForBreadcrumbs]);

  // Create the hero content
  const heroContent = children || (
    <div className="text-center">
      {title && (
        <h1 className="font-heading text-foreground mb-8 text-4xl font-bold tracking-tight uppercase lg:text-6xl">
          {title}
        </h1>
      )}
      {subtitle && (
        <p className="text-foreground/90 mx-auto mb-8 max-w-4xl text-lg leading-7 lg:text-xl">
          {subtitle}
        </p>
      )}
      {description && (
        <p className="text-foreground/80 mx-auto max-w-2xl text-base leading-6 lg:text-lg">
          {description}
        </p>
      )}
      {showActions && (
        <div className="mt-8">
          <button
            onClick={handleRandomize}
            className="bg-primary text-primary-foreground hover:bg-primary-hover rounded-lg px-6 py-3 font-semibold shadow-lg transition-colors"
          >
            Get Weird
          </button>
        </div>
      )}
    </div>
  );

  // Server-side render (no animation) - match client-side styles exactly
  if (!isClient) {
    return (
      <div
        className={clsx(
          'relative w-full',
          heightClasses,
          backgroundClasses,
          marginClasses,
          className
        )}
      >
        {/* Combined background container with multiple layers - same as client */}
        <div className="absolute inset-0 bg-gradient-to-t from-orange-200/30 via-transparent to-transparent opacity-100" />

        {/* Render text content with same positioning */}
        <div
          className={clsx(
            'relative z-10 flex h-full w-full items-center justify-center',
            accountForNavigation && accountForBreadcrumbs
              ? 'pt-30'
              : accountForNavigation
                ? 'pt-24'
                : ''
          )}
        >
          {heroContent}
        </div>
      </div>
    );
  }

  // Client-side render (with animation)
  return (
    <div
      className={clsx(
        'relative w-full',
        heightClasses,
        backgroundClasses,
        marginClasses,
        className
      )}
    >
      {/* Combined background container with multiple layers */}
      <div className="absolute inset-0 bg-gradient-to-t from-orange-200/30 via-transparent to-transparent opacity-100" />

      {/* Animation stage - background layer only */}
      {isAnimationReady && application && (
        <div className="absolute inset-0 z-0">
          <AnimationStage
            application={application}
            showDebugControls={showDebugControls}
            debugControlsClassName={clsx(
              'z-50 container mx-auto px-4',
              accountForNavigation && accountForBreadcrumbs
                ? 'top-32'
                : accountForNavigation
                  ? 'top-24'
                  : ''
            )}
            layoutClassName="absolute inset-0"
            onRandomize={handleRandomize}
          />
        </div>
      )}

      {/* Content layer - always on top */}
      <div
        className={clsx(
          'relative z-10 flex h-full w-full items-center justify-center',
          accountForNavigation && accountForBreadcrumbs
            ? 'pt-30'
            : accountForNavigation
              ? 'pt-24'
              : ''
        )}
      >
        {heroContent}
      </div>
    </div>
  );
}
