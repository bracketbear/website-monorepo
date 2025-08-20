import { AnimationStage } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import { createCuriousParticleNetworkAnimation } from '@bracketbear/flateralus-animations';
import { getRandomControlValues } from '@bracketbear/flateralus';
import { clsx } from '@bracketbear/core';
import { useMemo, useState, useEffect } from 'react';
import { HeroContent } from './HeroContent';

const BACKGROUND_CLASS = 'bg-brand-orange-light' as const;

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

      const animation = createCuriousParticleNetworkAnimation({
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

  // Create the hero content once
  const heroContent = (
    <HeroContent 
      title={title} 
      subtitle={subtitle} 
      description={description} 
      onGetWeird={handleRandomize}
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
