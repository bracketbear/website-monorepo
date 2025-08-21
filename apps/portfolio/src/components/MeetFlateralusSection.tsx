import React from 'react';
import { AnimationStage } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import { createBlobAnimation } from '@bracketbear/flateralus-animations';
import { Pill } from '@bracketbear/core/react';
import { marked } from 'marked';

interface MeetFlateralusSectionProps {
  title?: string;
  content?: string;
}

export function MeetFlateralusSection({
  title = 'Meet Flateralus',
  content = '## A powerful schema for connecting experiential apps to everything.',
}: MeetFlateralusSectionProps) {
  // Create the application and animation on the client side
  const createApplication = () => {
    if (typeof window === 'undefined') return null;

    const app = new PixiApplication({
      config: {
        autoResize: true,
        backgroundAlpha: 0,
        antialias: true,
      },
    });

    const animation = createBlobAnimation({
      radius: 90,
      surfaceTension: 0.2,
      centerAttractionStrength: 0.008,
      mouseInfluenceRadius: 50,
      mouseRepulsionStrength: 4.3,
      particleCount: 225,
      particleBaseSize: 2.5,
      particleSizeVariation: 0.6,
      animationSpeed: 2.8000000000000003,
      showTrails: true,
      trailLength: 4,
      particleColor: '#47200a',
      interactiveColor: '#1f0e05',
    });

    app.setAnimation(animation);
    return app;
  };

  return (
    <section className="px-content py-12 lg:py-16">
      <div className="container mx-auto">
        {/* Content and Animation - side by side */}
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Text Content - left side */}
          <div className="order-2 lg:order-1">
            {/* Pill above title */}
            <Pill variant="brand-green" size="sm" className="mb-4">
              {title}
            </Pill>
            <div
              className="prose prose-lg lg:prose-xl prose-p:text-brand-dark/80 max-w-prose drop-shadow-[0_2px_4px_var(--color-brand-orange-light)]"
              dangerouslySetInnerHTML={{
                __html: content ? marked.parse(content) : '',
              }}
            />
          </div>
          {/* Animation Stage - right side */}
          <div className="order-1 lg:order-2">
            <div className="relative h-[30rem] w-full lg:h-[40rem]">
              <AnimationStage
                application={createApplication()}
                showDebugControls={true}
                enableLuminanceDetection={false}
                layoutClassName="absolute inset-0"
                debugControlsClassName="absolute top-4 right-4 z-50 max-w-none"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
