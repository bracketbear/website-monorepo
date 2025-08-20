import React from 'react';
import { AnimationStage } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import { createBlobAnimation } from '@bracketbear/flateralus-animations';
import { marked } from 'marked';

interface MeetFlateralusSectionProps {
  title?: string;
  content?: string;
}

export function MeetFlateralusSection({
  title = 'Meet Flateralus',
  content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
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
      radius: 140,
      surfaceTension: 1.5000000000000002,
      centerAttractionStrength: 0.089,
      mouseInfluenceRadius: 160,
      mouseRepulsionStrength: 1.8000000000000003,
      particleCount: 400,
      particleBaseSize: 1.4,
      particleSizeVariation: 0.9,
      animationSpeed: 2.2,
      showTrails: true,
      trailLength: 1,
      particleColor: '#17517c',
      interactiveColor: '#6a5ee8',
    });

    app.setAnimation(animation);
    return app;
  };

  return (
    <section className="px-content pt-24 pb-12">
      <div className="relative z-10 mx-auto mb-8 max-w-4xl text-center">
        <h2 className="font-heading text-brand-dark mb-8 inline-block p-6 text-5xl font-black tracking-tight uppercase">
          {title}
        </h2>
        <div
          className="prose prose-xl prose-p:text-brand-dark/80 mx-auto max-w-2xl drop-shadow-[0_2px_4px_var(--color-brand-orange-light)]"
          dangerouslySetInnerHTML={{
            __html: content ? marked.parse(content) : '',
          }}
        />
      </div>

      <div className="relative -mt-[12.5rem] h-[50rem] w-full">
        <AnimationStage
          application={createApplication()}
          showDebugControls={true}
          enableLuminanceDetection={false}
          layoutClassName="absolute inset-0"
          debugControlsClassName="container-content top-[12rem] right-4 z-50 max-w-none"
        />
      </div>
    </section>
  );
}
