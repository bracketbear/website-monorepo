import { AnimationStage } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import {
  createCuriousParticleNetworkAnimation,
  createParticleWaveAnimation,
  createBlobAnimation,
  createRetroGridAnimation,
} from '@bracketbear/flateralus-animations';
import { getRandomControlValues } from '@bracketbear/flateralus';
import { clsx, Stats, type LabelValue } from '@bracketbear/core';
import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { HeroContent } from './HeroContent';

const BACKGROUND_CLASS = 'bg-background' as const;

export type HeaderStat = LabelValue;

export interface HeroSectionProps {
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
  /** Stats to display */
  stats?: HeaderStat[];
  /** Custom content to render over the animation */
  children?: ReactNode;
  /** Whether to show action buttons (defaults to false for non-index pages) */
  showActions?: boolean;
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
  enableLuminanceDetection = true,
  title = 'Harrison',
  subtitle = 'and I build software for creative technologists.',
  description,
  stats,
  children,
  showActions = false,
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

      app.setAnimation(animation);

      // Mark animation as ready after a short delay to ensure smooth mounting
      setTimeout(() => setIsAnimationReady(true), 100);

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

  // Server-side render (no animation)
  if (!isClient) {
    return (
      <div className={clsx(BACKGROUND_CLASS, className)}>{heroContent}</div>
    );
  }

  // Client-side render (with animation)
  return (
    <div
      className={clsx(
        'relative h-[70vh] min-h-120 w-full',
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

      {/* Animation stage - only render when ready */}
      {isAnimationReady && application && (
        <AnimationStage
          application={application}
          showDebugControls={showDebugControls}
          enableLuminanceDetection={enableLuminanceDetection}
          debugControlsClassName="top-24 right-4 z-50"
          layoutClassName="absolute inset-0"
          onRandomize={handleRandomize}
        >
          {/* Render text content immediately to prevent jumping */}
          <div className="relative z-10 flex h-full w-full items-center justify-center">
            {heroContent}
          </div>
        </AnimationStage>
      )}

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
    </div>
  );
}
