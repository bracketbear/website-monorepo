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

    return app;
  }, [isClient]);

  // Don't render anything on the server
  if (!isClient) {
    return (
      <div className={clsx('absolute inset-0 h-full w-full', className)} />
    );
  }

  if (!application) return null;

  return (
    <AnimationStage
      application={application}
      className={clsx('absolute inset-0 h-full w-full', className)}
      showDebugControls
      layoutClassName="absolute inset-0"
    >
      {children}
    </AnimationStage>
  );
}
