import { Button } from '@bracketbear/core/react';
import { AnimationStage } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import { createCuriousParticleNetworkAnimation } from '@bracketbear/flateralus-animations';
import { clsx } from '@bracketbear/core';
import { useMemo, useState, useEffect } from 'react';

interface HeroSectionProps {
  className?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  showParticleBackground?: boolean;
}

export default function HeroSection({ 
  className, 
  title = "Harrison",
  subtitle = "and I build software for creative technologists.",
  description,
  showParticleBackground = true 
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

      const animation = createCuriousParticleNetworkAnimation();
      app.setAnimation(animation);

      return app;
    } catch (error) {
      return null;
    }
  }, [isClient]);

  // Don't render the animation on the server
  if (!isClient) {
    return (
      <div
        className={clsx(
          'bg-brand-orange from-brand-orange via-brand-red/20 to-brand-red/90 bg-radial',
          className
        )}
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
      </div>
    );
  }

  return (
    <AnimationStage
      application={application}
      className={clsx(
        'bg-brand-orange from-brand-orange via-brand-red/20 to-brand-red/90 bg-radial',
        className
      )}
      showDebugControls
      debugControlsClassName="top-32"
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
