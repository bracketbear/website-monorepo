import { Button } from '@bracketbear/core/react';
import { AnimationStage } from '@bracketbear/flateralus-react';
import { createCuriousParticleNetworkAnimation } from '@bracketbear/flateralus-animations';
import type { ParticleNetworkControlValues } from '@bracketbear/flateralus-animations/src/curious-particle-network/curiousParticleNetworkAnimation';
import { clsx } from '@bracketbear/core';

interface HeroSectionProps {
  className?: string;
}

const initialControls: Partial<ParticleNetworkControlValues> = {
  particleCount: 120,
  connectionDistance: 80,
  lineThickness: 1.1,
  particleBaseSize: 2.2,
  particleSizeVariation: 1.2,
  animationSpeed: 1,
  attractionStrength: 0.015,
  cursorAttractionRadius: 120,
  cursorAttractionStrength: 0.09,
  particleGlowRadius: 18,
  particleColors: [
    { color: '#fffbe0' },
    { color: '#ff4b3e' },
    { color: '#4b9fff' },
    { color: '#eaeaea' },
    { color: '#ffe066' },
  ] as ParticleNetworkControlValues['particleColors'],
  keepInBounds: true,
  connectionColor: '#eaeaea',
  glowColor: '#fffbe0',
  debugLogging: false,
};

export default function HeroSection({ className }: HeroSectionProps) {
  return (
    <AnimationStage<ParticleNetworkControlValues>
      animation={createCuriousParticleNetworkAnimation}
      className={clsx(
        'bg-brand-orange from-brand-orange via-brand-red/20 to-brand-red/90 bg-radial',
        className
      )}
      showDebugControls
      debugControlsClassName="top-32"
      initialControls={initialControls}
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
