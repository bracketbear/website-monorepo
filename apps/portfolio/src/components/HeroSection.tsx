import { AnimationStage } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import { createRetroGridAnimation } from '@bracketbear/flateralus-animations';
import { getRandomControlValues } from '@bracketbear/flateralus';
import { clsx } from '@bracketbear/core';
import { useMemo, useState, useEffect } from 'react';
import { HeroContent } from './HeroContent';

const BACKGROUND_CLASS = 'bg-background' as const;

interface HeroSectionProps {
  className?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  showParticleBackground?: boolean;
}

export default function HeroSection({
  className,
  title = 'Harrison',
  subtitle = 'and I build software for creative technologists.',
  description,
}: HeroSectionProps) {
  const [isClient, setIsClient] = useState(false);

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

      const animation = createRetroGridAnimation({
        gridSize: 50,
        squareSize: 6,
        gridAngle: 15,
        gap: 1,
        skewX: 3,
        skewY: 0,
        perspectiveX: 0.15,
        perspectiveY: 0,
        particleShape: 'circle',
        cornerRoundness: 0.3,
        animationSpeed: 1.0,
        pattern: 'wave',
        squareColor: '#ff69b4',
        showGridLines: true,
        gridLineColor: '#ff1493',
        opacity: 0.9,
        waveAmplitude: 0.7,
        waveFrequency: 0.6,
        rippleSpeed: 1.2,
        scanlineSpeed: 1.8,
      });

      app.setAnimation(animation);

      return app;
    } catch {
      return null;
    }
  }, [isClient]);

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

  // Create the hero content once
  const heroContent = (
    <HeroContent
      title={title}
      subtitle={subtitle}
      description={description}
      onGetWeird={handleRandomize}
      onRandomizeAll={handleRandomizeAll}
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
    <AnimationStage
      application={application}
      className={clsx(BACKGROUND_CLASS, className)}
      showDebugControls
      debugControlsClassName="top-32"
      layoutClassName="relative flex h-full w-full items-end"
      onRandomize={handleRandomize}
    >
      {heroContent}
    </AnimationStage>
  );
}
