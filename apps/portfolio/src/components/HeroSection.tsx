import { Button } from '@bracketbear/core/react';
import { AnimationStage } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import { createCuriousParticleNetworkAnimation } from '@bracketbear/flateralus-animations';
import { clsx } from '@bracketbear/core';
import { useMemo, useState, useEffect } from 'react';

const BACKGROUND_CLASS =
  'bg-brand-orange from-brand-yellow to-brand-orange/90 bg-radial' as const;

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
      console.log('HeroSection: Not on client yet');
      return null;
    }

    console.log('HeroSection: Creating application...');

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
        // @ts-expect-error - TODO: Groups are not typed properly yet.
        particleColors: [
          {
            color: '#9ce8e9',
          },
          {
            color: '#db53ce',
          },
          {
            color: '#0dc37a',
          },
          {
            color: '#802ff8',
          },
          {
            color: '#c9d019',
          },
          {
            color: '#9823c7',
          },
          {
            color: '#c1fc2e',
          },
          {
            color: '#33a5e6',
          },
        ],
        keepInBounds: true,
        connectionColor: '#06c26c',
        glowColor: '#147a8c',
        debugLogging: false,
      });
      app.setAnimation(animation);

      return app;
    } catch {
      return null;
    }
  }, [isClient]);

  // Don't render the animation on the server
  if (!isClient) {
    return (
      <div className={clsx(BACKGROUND_CLASS, className)}>
        <div className="relative z-10 mb-8 flex h-full flex-col items-center justify-center">
          {description && (
            <p className="text-2xl font-bold tracking-tight text-white/90 uppercase drop-shadow-lg">
              {description}
            </p>
          )}
          <h1 className="font-heading text-7xl font-black tracking-tight text-white uppercase drop-shadow-lg lg:text-8xl">
            {title}
          </h1>
          <p className="mt-6 text-2xl font-bold tracking-tight text-white/90 uppercase drop-shadow-lg">
            {subtitle}
          </p>
          <a href="/contact">
            <Button
              variant="primary"
              size="lg"
              className="mt-8 shadow-lg hover:shadow-xl"
            >
              Get in touch
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <AnimationStage
      application={application}
      className={clsx(BACKGROUND_CLASS, className)}
      showDebugControls
      debugControlsClassName="top-32"
      layoutClassName="relative flex h-full w-full items-end"
    >
      <div className="relative z-10 mb-8 flex h-full flex-col items-center justify-center">
        {description && (
          <p className="text-2xl font-bold tracking-tight text-white/90 uppercase drop-shadow-lg">
            {description}
          </p>
        )}
        <h1 className="font-heading text-7xl font-black tracking-tight text-white uppercase drop-shadow-lg lg:text-8xl">
          {title}
        </h1>
        <p className="mt-6 text-2xl font-bold tracking-tight text-white/90 uppercase drop-shadow-lg">
          {subtitle}
        </p>
        <a href="/contact">
          <Button
            variant="primary"
            size="lg"
            className="mt-8 shadow-lg hover:shadow-xl"
          >
            Get in touch
          </Button>
        </a>
      </div>
    </AnimationStage>
  );
}
