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
        gridSize: 25, // Smaller for subtle background
        squareSize: 6, // Slightly larger to be more visible
        gridAngle: 12, // More visible angle
        animationSpeed: 0.8, // More noticeable animation
        pattern: 'wave',
        squareColor: '#ffdb8f', // Warm yellow matching brand
        gap: 1,
        skewX: 2, // More visible skew
        skewY: 0,
        perspectiveX: 0.1, // More visible perspective
        perspectiveY: 0,
        particleShape: 'circle',
        cornerRoundness: 0.3,
        showGridLines: true,
        gridLineColor: '#ff1493', // Bright pink for contrast
        opacity: 0.4, // More visible background
        waveAmplitude: 0.6, // More visible wave
        waveFrequency: 0.4, // More noticeable wave frequency
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
        {/* Content - matches original design */}
        <div className="relative z-10 container mx-auto">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-heading text-foreground mb-8 p-6 text-5xl font-black tracking-tight uppercase">
              {title}
            </h2>
            {text && (
              <div
                className="prose prose-lg prose-p:text-foreground/80 mx-auto mb-12 max-w-2xl"
                dangerouslySetInnerHTML={{ __html: text }}
              />
            )}
            <div className="card">
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
            canvasClassName="opacity-60 pointer-events-none"
            enableLuminanceDetection={false}
            pauseWhenHidden={false}
            showDebugControls={true}
            debugControlsClassName="z-50 container-content top-4 right-4"
          />
        )}
      </div>

      {/* Content - matches original design */}
      <div className="relative z-10 container mx-auto">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-heading text-foreground mb-8 p-6 text-5xl font-black tracking-tight uppercase">
            {title}
          </h2>
          {text && (
            <div
              className="prose prose-lg prose-p:text-foreground/80 mx-auto mb-12 max-w-2xl"
              dangerouslySetInnerHTML={{ __html: text }}
            />
          )}
          <div className="card">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
