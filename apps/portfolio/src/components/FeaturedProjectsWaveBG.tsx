import { AnimationStage } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import { createParticleWaveAnimation } from '@bracketbear/flateralus-animations';
import { clsx } from '@bracketbear/core';
import { useMemo, useState, useEffect } from 'react';

interface FeaturedProjectsWaveBGProps {
  className?: string;
  children?: React.ReactNode;
}

export default function FeaturedProjectsWaveBG({
  className,
  children,
}: FeaturedProjectsWaveBGProps) {
  const [isClient, setIsClient] = useState(false);
  const [isAnimationReady, setIsAnimationReady] = useState(false);

  // Ensure we're on the client before rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Create application and animation only once
  const application = useMemo(() => {
    if (!isClient) return null;

    const app = new PixiApplication({
      config: {
        autoResize: true,
        backgroundAlpha: 0,
        antialias: true,
      },
    });

    const animation = createParticleWaveAnimation();
    app.setAnimation(animation);

    // Mark animation as ready after a short delay to ensure smooth mounting
    setTimeout(() => setIsAnimationReady(true), 100);

    return app;
  }, [isClient]);

  // Always render the container to prevent layout jumping
  return (
    <div className={clsx('w-full', className)}>
      {/* Background wave animation */}
      <div className="relative z-10">{children}</div>

      {/* Animation stage - only render when ready */}
      {isClient && isAnimationReady && application && (
        <AnimationStage
          application={application}
          className={clsx('pointer-events-none absolute inset-0 h-full w-full')}
          layoutClassName="absolute inset-0"
        />
      )}
    </div>
  );
}
