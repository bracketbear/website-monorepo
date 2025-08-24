import { Button } from '@bracketbear/core/react';

interface HeroContentProps {
  title: string;
  subtitle: string;
  description?: string;
  onGetWeird?: () => void;
  onRandomizeAll?: () => void;
}

/**
 * Center content component for hero sections
 */
export function HeroContent({
  title,
  subtitle,
  description,
  onGetWeird,
  onRandomizeAll,
}: HeroContentProps) {
  return (
    <div className="relative z-10 mb-8 flex h-full flex-col items-center justify-center p-4">
      {description && (
        <p className="foreground/90 text-2xl font-bold tracking-tight uppercase drop-shadow-lg">
          {description}
        </p>
      )}
      <h1 className="font-heading text-foreground text-center text-6xl font-black tracking-tight uppercase text-shadow-lg lg:text-8xl">
        {title}
      </h1>
      <p className="text-foreground/90 mt-6 text-center text-xl font-bold tracking-tight uppercase text-shadow-lg lg:text-2xl">
        {subtitle}
      </p>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:gap-6">
        <a href="/contact">
          <Button
            variant="dark"
            size="lg"
            className="shadow-lg hover:shadow-xl"
          >
            Get in touch
          </Button>
        </a>
        {(onGetWeird || onRandomizeAll) && (
          <Button
            variant="trippy"
            size="lg"
            onClick={onRandomizeAll || onGetWeird}
            className="shadow-lg [--pulse-duration:6s] hover:shadow-xl"
          >
            Get Weird
          </Button>
        )}
      </div>
    </div>
  );
}
