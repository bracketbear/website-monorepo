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
import { clsx, type LabelValue } from '@bracketbear/bear-ui';
import { Stats } from '@bracketbear/bear-ui-react';
import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { HeroContent } from './HeroContent';

// Animation control value constants
const ANIMATION_CONTROLS = {
  curiousParticleNetwork: {
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
      { type: 'color' as const, value: '#9ce8e9', metadata: { alpha: 1.0 } },
      { type: 'color' as const, value: '#ff4b3e', metadata: { alpha: 1.0 } },
      { type: 'color' as const, value: '#4b9fff', metadata: { alpha: 1.0 } },
      { type: 'color' as const, value: '#eaeaea', metadata: { alpha: 1.0 } },
      { type: 'color' as const, value: '#ffe066', metadata: { alpha: 1.0 } },
    ],
    keepInBounds: true,
    connectionColor: '#000000',
    glowColor: '#f1880d',
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
    particleColor: '#404040',
    lineColor: '#404040',
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
    interactiveColor: '#ff4b3e',
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
    squareColor: '#ffffff',
    showGridLines: false,
    gridLineColor: '#ffffff',
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
    particleColor: '#262626',
    lineColor: '#262626',
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
    particleColor: '#010101',
    opacity: 0.9,
    showConnections: false,
    connectionDistance: 30,
    connectionColor: '#00ff88',
    rotationAxis: 'xyz',
  },
};

export type HeaderStat = LabelValue;

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
  /** Stats to display */
  stats?: HeaderStat[];
  /** Custom content to render over the animation */
  children?: ReactNode;
  /** Whether to show action buttons (defaults to false for non-index pages) */
  showActions?: boolean;
  /** Whether to account for navigation bar (defaults to false since nav is usually absolutely positioned) */
  accountForNavigation?: boolean;
  /** Whether to account for breadcrumbs (defaults to true) */
  accountForBreadcrumbs?: boolean;
  /** Whether this is the index page (affects height - full screen vs compact) */
  isIndexPage?: boolean;
}

/**
 * HeroSection - Unified React component for hero sections with Flateralus animations
 *
 * Combines the best of both HeroSection and HeaderSection:
 * - Stable client-side rendering to prevent layout jumping
 * - Comprehensive animation registry system
 * - Flexible content rendering options
 */
export function HeroSection({
  preset = 'retro-grid',
  className = '',
  showDebugControls = true,
  title = 'Page Title',
  subtitle = '',
  description,
  stats,
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

  // Handle randomization of all controls (both animation and stage)
  const handleRandomizeAll = () => {
    if (application) {
      // Randomize animation controls
      if (application.getAnimation()) {
        const animation = application.getAnimation();
        if (animation) {
          const manifest = animation.getManifest();
          if (manifest) {
            const randomValues = getRandomControlValues(manifest);
            animation.updateControls(randomValues);
          }
        }
      }

      // Randomize stage controls
      if (
        application.getStageControlsManifest &&
        application.updateStageControls
      ) {
        const stageManifest = application.getStageControlsManifest();
        if (stageManifest) {
          const randomStageValues: Record<string, any> = {};

          stageManifest.controls.forEach((control: any) => {
            switch (control.type) {
              case 'number':
                const min = (control as any).min || 0;
                const max = (control as any).max || 1;
                randomStageValues[control.name] =
                  Math.random() * (max - min) + min;
                break;
              case 'boolean':
                randomStageValues[control.name] = Math.random() < 0.5;
                break;
              case 'color':
                const randomHex =
                  '#' +
                  Math.floor(Math.random() * 16777215)
                    .toString(16)
                    .padStart(6, '0');
                randomStageValues[control.name] = randomHex;
                break;
              case 'select':
                if (
                  (control as any).options &&
                  Array.isArray((control as any).options)
                ) {
                  const randomIndex = Math.floor(
                    Math.random() * (control as any).options.length
                  );
                  randomStageValues[control.name] = (control as any).options[
                    randomIndex
                  ].value;
                }
                break;
              default:
                randomStageValues[control.name] = (control as any).defaultValue;
            }
          });

          application.updateStageControls(randomStageValues);
        }
      }
    }
  };

  // Enhanced background classes based on preset
  const backgroundClasses = useMemo(() => {
    switch (preset) {
      case 'curious-particle-network':
        return 'bg-gradient-to-br from-muted via-muted/95 to-secondary/20 bg-header-pattern';
      case 'particle-wave':
        return 'bg-gradient-to-br from-muted via-muted/90 to-muted/15 bg-header-pattern';
      case 'blob':
        return 'bg-gradient-to-br from-muted via-muted/95 to-primary/20 bg-header-pattern';
      case 'retro-grid':
        return 'bg-gradient-to-br from-muted via-muted/95 to-muted/20 bg-header-pattern';
      case 'particle-sphere':
        return 'bg-gradient-to-br from-muted via-muted/95 to-primary/20 bg-header-pattern';
      case 'enhanced-wave':
      default:
        return 'bg-gradient-to-br from-muted via-muted/90 to-muted/15 bg-header-pattern';
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

  // Create the hero content once
  const heroContent = children || (
    <HeroContent
      title={title}
      subtitle={subtitle}
      description={description}
      onGetWeird={handleRandomize}
      onRandomizeAll={handleRandomizeAll}
      showActions={showActions}
    />
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
        <div className="bg-noise bg-header-glow from-muted/50 absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-100" />

        {/* Render text content with same positioning */}
        <div
          className={clsx(
            'z-10 flex h-full w-full items-center justify-center',
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
      <div className="bg-noise bg-header-glow from-muted/50 absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-100" />

      {/* Animation stage - always render container to prevent layout shift */}
      <div className="absolute inset-0">
        {isAnimationReady && application && (
          <AnimationStage
            application={application}
            showDebugControls={showDebugControls}
            debugControlsClassName={clsx(
              'z-50 container-content',
              accountForNavigation && accountForBreadcrumbs
                ? 'top-32'
                : accountForNavigation
                  ? 'top-24'
                  : ''
            )}
            layoutClassName="absolute inset-0"
            onRandomize={handleRandomize}
          >
            {/* Render text content immediately to prevent jumping */}
            <div
              className={clsx(
                'z-10 flex h-full w-full items-center justify-center',
                // Base margin for navigation bar (5rem) + extra margin for debug menu (1rem)
                // Additional margin for breadcrumbs when both are present
                accountForNavigation && accountForBreadcrumbs
                  ? 'pt-30'
                  : accountForNavigation
                    ? 'pt-24'
                    : ''
              )}
            >
              {heroContent}
            </div>
          </AnimationStage>
        )}

        {/* Always render text content to prevent layout shift */}
        {(!isAnimationReady || !application) && (
          <div
            className={clsx(
              'z-10 flex h-full w-full items-center justify-center',
              accountForNavigation && accountForBreadcrumbs
                ? 'pt-30'
                : accountForNavigation
                  ? 'pt-24'
                  : ''
            )}
          >
            {heroContent}
          </div>
        )}
      </div>

      {/* Stats section - positioned as overlay */}
      {stats && stats.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 z-20 container mx-auto w-full">
          <div className="-mb-16">
            <Stats
              stats={stats}
              className="drop-shadow-xl drop-shadow-black/30"
            />
          </div>
        </div>
      )}
    </div>
  );
}
