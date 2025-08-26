import React, { useMemo, useState, useEffect } from 'react';
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
  const [isClient, setIsClient] = useState(false);
  const [isAnimationReady, setIsAnimationReady] = useState(false);

  // Ensure we're on the client before rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Create the application and animation only once
  const application = useMemo(() => {
    if (!isClient) return null;

    const app = new PixiApplication({
      config: {
        autoResize: true,
        backgroundAlpha: 0,
        antialias: true,
      },
    });

    const animation = createBlobAnimation({
      scaleFactor: 0.4,
      surfaceTension: 0.2,
      centerAttractionStrength: 0.008,
      mouseInfluenceRadius: 50,
      mouseRepulsionStrength: 4.3,
      particleCount: 225,
      particleBaseSize: 2.5,
      particleSizeVariation: 0.6,
      animationSpeed: 2.8,
      showTrails: true,
      trailLength: 4,
      particleColor: '#47200a',
      interactiveColor: '#1f0e05',
    });

    app.setAnimation(animation);

    // Mark animation as ready after a short delay to ensure smooth mounting
    setTimeout(() => setIsAnimationReady(true), 100);

    return app;
  }, [isClient]);

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
              className="prose prose-lg lg:prose-xl prose-p:text-foreground/80 max-w-prose drop-shadow-lg"
              dangerouslySetInnerHTML={{
                __html: content ? marked.parse(content) : '',
              }}
            />
          </div>
          {/* Animation Stage - right side */}
          <div className="order-1 lg:order-2">
            <div className="relative h-[30rem] w-full rounded-2xl lg:h-[40rem]">
              {/* Animation stage - only render when ready */}
              {isClient && isAnimationReady && application && (
                <AnimationStage
                  application={application}
                  showDebugControls={true}
                  enableLuminanceDetection={false}
                  layoutClassName="absolute inset-0"
                  canvasClassName="rounded-2xl"
                  debugControlsClassName="absolute top-20 right-4 z-50 max-w-none rounded-2xl"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
