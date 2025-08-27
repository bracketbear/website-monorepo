import { useMemo, useState, useEffect } from 'react';
import { AnimationStage } from '@bracketbear/flateralus-react';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import { createRetroGridAnimation } from '@bracketbear/flateralus-animations';
import { ContactContent } from './ContactContent';

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
  const [isApplicationInitialized, setIsApplicationInitialized] =
    useState(false);

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
      setIsApplicationInitialized(true);

      return app;
    } catch (error) {
      console.error('Failed to create PIXI application:', error);
      return null;
    }
  }, [isClient]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (application) {
        try {
          application.destroy();
        } catch (error) {
          console.error('Error destroying PIXI application:', error);
        }
      }
      // Reset state on cleanup
      setIsAnimationReady(false);
      setIsApplicationInitialized(false);
    };
  }, [application]);

  // Server-side render (no animation) - match client-side styles exactly
  if (!isClient) {
    return (
      <section
        className={`px-content relative min-h-[600px] overflow-hidden py-12 ${className}`}
      >
        <ContactContent title={title} text={text} />
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
        {isAnimationReady && isApplicationInitialized && application && (
          <AnimationStage
            application={application}
            className="absolute inset-0 h-full w-full"
            canvasClassName="pointer-events-none"
            enableLuminanceDetection={false}
            pauseWhenHidden={true}
            visibilityThreshold={0.1}
            showDebugControls={true}
            debugControlsClassName="z-50 container-content top-4 right-4"
          />
        )}
      </div>

      <ContactContent title={title} text={text} />
    </section>
  );
}
