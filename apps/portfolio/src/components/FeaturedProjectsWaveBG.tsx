import { AnimationStage } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import { createParticleWaveAnimation } from '@bracketbear/flateralus-animations';
import type { ParticleWaveControlValues } from '@bracketbear/flateralus-animations';
import { clsx } from '@bracketbear/core';
import { useMemo } from 'react';

interface FeaturedProjectsWaveBGProps {
  className?: string;
  children?: React.ReactNode;
}

export default function FeaturedProjectsWaveBG({
  className,
  children,
}: FeaturedProjectsWaveBGProps) {
  // Create application and animation only once
  const application = useMemo(() => {
    if (typeof window === 'undefined') return null;

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
  }, []);

  return (
    <AnimationStage
      application={application}
      className={clsx('absolute inset-0 h-full w-full', className)}
      showDebugControls
    >
      {children}
    </AnimationStage>
  );
}
