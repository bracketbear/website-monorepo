import { AnimationStage } from '@bracketbear/flateralus-react';
import { createParticleWaveAnimation } from '@bracketbear/flateralus-animations';
import type { ParticleWaveControlValues } from '@bracketbear/flateralus-animations/src/particle-wave/particleWaveAnimation';
import { clsx } from '@bracketbear/core';

interface FeaturedProjectsWaveBGProps {
  className?: string;
  children?: React.ReactNode;
}

export default function FeaturedProjectsWaveBG({
  className,
  children,
}: FeaturedProjectsWaveBGProps) {
  return (
    <AnimationStage<ParticleWaveControlValues>
      animation={createParticleWaveAnimation}
      className={clsx('absolute inset-0 h-full w-full', className)}
      showDebugControls
    >
      {children}
    </AnimationStage>
  );
}
