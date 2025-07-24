import { Button } from '@bracketbear/core/react';
import { AnimationStage } from '@bracketbear/flateralus-react';
import { createCuriousParticleNetworkAnimation } from '@bracketbear/flateralus-animations';

interface HeroSectionProps {
  className?: string;
}

export default function HeroSection({ className }: HeroSectionProps) {
  return (
    <AnimationStage
      animation={createCuriousParticleNetworkAnimation as any}
      className={className}
      showDebugControls
      debugControlsClassName="top-32"
    >
      <div className="relative z-10 mb-8 flex h-full flex-col items-center justify-center">
        <p className="text-2xl font-bold tracking-tight text-white/90 uppercase drop-shadow-lg">
          Hi, I'm
        </p>
        <h1 className="font-heading text-7xl font-black tracking-tight text-white uppercase drop-shadow-lg lg:text-8xl">
          Harrison
        </h1>
        <p className="mt-6 text-2xl font-bold tracking-tight text-white/90 uppercase drop-shadow-lg">
          and I build software for creative technologists.
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
