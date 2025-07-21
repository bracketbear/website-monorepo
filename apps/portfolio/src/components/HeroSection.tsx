import { Button } from '@bracketbear/core/react';
import AnimationStage from './AnimationStage';
import { createBlobAnimation } from './animations/blobAnimation';

interface HeroSectionProps {
  className?: string;
}

export default function HeroSection({ className }: HeroSectionProps) {
  return (
    <AnimationStage
      animation={createBlobAnimation}
      className={className}
      showDebugControls
    >
      <div className="mb-8 flex h-full flex-col items-center justify-center">
        <p className="text-2xl font-bold tracking-tight text-white/80 uppercase drop-shadow-lg">
          Hi, I'm
        </p>
        <h1 className="font-heading text-7xl font-black tracking-tight text-white uppercase lg:text-8xl">
          Harrison
        </h1>
        <p className="mt-6 text-2xl font-bold tracking-tight text-white uppercase">
          Experienced Full-Stack Developer & <br /> Supporter of Creative
          Technologists
        </p>
        <a href="/contact">
          <Button variant="primary" size="lg" className="mt-4">
            Available for work
          </Button>
        </a>
      </div>
    </AnimationStage>
  );
}
