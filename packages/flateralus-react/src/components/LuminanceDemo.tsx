import React from 'react';
import AnimationStage from './AnimationStage';
import type { Animation, ControlValues } from '@bracketbear/flateralus';

interface LuminanceDemoProps {
  animationFactory: (
    controls?: Partial<ControlValues>
  ) => Animation<ControlValues>;
  initialControls?: Partial<ControlValues>;
  className?: string;
}

/**
 * Demo component that showcases the luminance detection feature
 *
 * This component demonstrates how text colors automatically adapt
 * to the background luminance of the animation for optimal readability.
 */
export default function LuminanceDemo({
  animationFactory,
  initialControls,
  className,
}: LuminanceDemoProps) {
  return (
    <AnimationStage
      animation={animationFactory}
      initialControls={initialControls}
      showDebugControls={true}
      enableLuminanceDetection={true}
      className={className}
    >
      {/* Overlay content that will automatically adjust text colors */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-8">
        <div className="space-y-4 text-center">
          <h1 className="text-brand-dark text-6xl font-bold">Dynamic Text</h1>
          <p className="text-brand-dark/80 max-w-md text-xl">
            This text automatically adjusts its color based on the background
            luminance to maintain optimal readability and meet WCAG 2.1 AA
            contrast standards.
          </p>
          <div className="text-brand-dark/60 text-sm">
            Watch the text color change as you adjust the animation controls!
          </div>
        </div>

        {/* Status indicator */}
        <div className="bg-background/80 border-foreground/20 absolute top-4 left-4 rounded-lg border p-3 backdrop-blur-sm">
          <div className="text-brand-dark font-mono text-sm">
            Luminance Detection: Active
          </div>
          <div className="text-brand-dark/80 text-xs">
            Text colors adapt automatically
          </div>
        </div>
      </div>
    </AnimationStage>
  );
}
