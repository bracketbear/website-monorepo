import { useEffect, useState } from 'react';
import { P5Application } from '@bracketbear/flateralus-p5';
import { AnimationStage } from '@bracketbear/flateralus-react';
import {
  RandomWalkerAnimation,
  randomWalkerManifest,
} from '@bracketbear/flateralus-p5-animations';

export default function RandomWalkerStage() {
  const [application, setApplication] = useState<P5Application | null>(null);
  const [animation, setAnimation] = useState<RandomWalkerAnimation | null>(
    null
  );
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client before creating p5 application
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only create p5 application on the client side
    if (!isClient) return;

    // Create the p5 application
    const app = new P5Application({
      config: {
        width: 800,
        height: 600,
        backgroundColor: '#000000',
        backgroundAlpha: 0,
      },
    });

    // Create the random walker animation
    const walkerAnimation = new RandomWalkerAnimation(randomWalkerManifest);

    setApplication(app);
    setAnimation(walkerAnimation);

    // Cleanup on unmount
    return () => {
      if (app) {
        app.destroy();
      }
    };
  }, [isClient]);

  useEffect(() => {
    if (application && animation) {
      application.setAnimation(animation);
    }
  }, [application, animation]);

  // Don't render anything until we're on the client
  if (!isClient) {
    return <div className="h-full w-full bg-black" />;
  }

  return (
    <AnimationStage
      application={application}
      showDebugControls={true}
      className="h-full w-full"
      canvasClassName="rounded-lg"
    />
  );
}
