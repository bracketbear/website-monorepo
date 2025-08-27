import { useMemo, useState, useEffect } from 'react';
import { AnimationStage } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import { createRetroGridAnimation } from '@bracketbear/flateralus-animations';
import { ContactForm } from './ContactForm';

interface ContactSectionProps {
  title: string;
  text?: string;
  className?: string;
}

/**
 * Contact Section with subtle retro grid animation background
 *
 * Matches the existing design system while adding a subtle animated background
 */
export function ContactSection({
  title,
  text,
  className = '',
}: ContactSectionProps) {
  const [isClient, setIsClient] = useState(false);
  const [isAnimationReady, setIsAnimationReady] = useState(false);

  // Ensure we're on the client before rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Create the application and animation only once
  const application = useMemo(() => {
    if (!isClient) return null;

    try {
      const app = new PixiApplication({
        config: {
          autoResize: true,
          backgroundAlpha: 0,
          antialias: true,
        },
      });

      const animation = createRetroGridAnimation({
        gridSize: 78,
        squareSize: 9,
        gridAngle: 0,
        animationSpeed: 2.4,
        pattern: 'random',
        squareColor: '#000000',
        gap: 8,
        skewX: 0,
        skewY: 45,
        perspectiveX: 0,
        perspectiveY: 0,
        particleShape: 'square',
        cornerRoundness: 0.7,
        showGridLines: true,
        gridLineColor: '#ad9bb9',
        opacity: 1,
        waveAmplitude: 1,
        waveFrequency: 1.1,
        rippleSpeed: 2.3,
        scanlineSpeed: 4.5,
      });

      app.setAnimation(animation);

      // Mark animation as ready immediately to prevent flicker
      setIsAnimationReady(true);

      return app;
    } catch {
      return null;
    }
  }, [isClient]);

  // Server-side render (no animation) - match client-side styles exactly
  if (!isClient) {
    return (
      <section
        className={`px-content relative min-h-[600px] overflow-hidden py-12 ${className}`}
      >
        {/* Content - glass morphism design */}
        <div className="relative z-10 container mx-auto">
          <div className="mx-auto max-w-4xl">
            {/* Single glass container with title, text, and form */}
            <div className="glass-bg-frosted glass-border-frosted glass-shadow-lg rounded-2xl border-2 p-6">
              {/* Title and text */}
              <div className="mb-6 text-center">
                <h2 className="font-heading text-brand-dark mb-3 text-4xl leading-tight font-black tracking-tight uppercase md:text-5xl">
                  {title}
                </h2>
                {text && (
                  <div
                    className="prose prose-lg prose-p:text-brand-dark/80 mx-auto max-w-2xl"
                    dangerouslySetInnerHTML={{ __html: text }}
                  />
                )}
              </div>

              {/* Contact form */}
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Client-side render (with animation)
  return (
    <section
      className={`px-content relative min-h-[600px] overflow-hidden py-12 ${className}`}
    >
      {/* Animation stage - always render container to prevent layout shift */}
      <div className="absolute inset-0">
        {isAnimationReady && application && (
          <AnimationStage
            application={application}
            className="absolute inset-0 h-full w-full"
            canvasClassName="pointer-events-none"
            enableLuminanceDetection={false}
            pauseWhenHidden={false}
            showDebugControls={true}
            debugControlsClassName="z-50 container-content top-4 right-4"
          />
        )}
      </div>

      {/* Content - glass morphism design */}
      <div className="relative z-10 container mx-auto">
        <div className="mx-auto max-w-4xl">
          {/* Single glass container with title, text, and form */}
          <div className="glass-bg-frosted glass-border-frosted glass-shadow-lg rounded-2xl border-2 p-6">
            {/* Title and text */}
            <div className="mb-6 text-center">
              <h2 className="font-heading text-brand-dark mb-3 text-4xl leading-tight font-black tracking-tight uppercase md:text-5xl">
                {title}
              </h2>
              {text && (
                <div
                  className="prose prose-lg prose-p:text-brand-dark/80 mx-auto max-w-2xl"
                  dangerouslySetInnerHTML={{ __html: text }}
                />
              )}
            </div>

            {/* Contact form */}
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
