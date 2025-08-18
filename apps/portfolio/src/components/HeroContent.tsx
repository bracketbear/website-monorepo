import { Button } from '@bracketbear/core/react';

interface HeroContentProps {
  title: string;
  subtitle: string;
  description?: string;
}

/**
 * Center content component for hero sections
 */
export function HeroContent({
  title,
  subtitle,
  description,
}: HeroContentProps) {
  return (
    <div className="relative z-10 mb-8 flex h-full flex-col items-center justify-center p-4">
      {description && (
        <p className="text-2xl font-bold tracking-tight text-white/90 uppercase drop-shadow-lg">
          {description}
        </p>
      )}
      <h1 className="font-heading text-center text-6xl font-black tracking-tight text-white uppercase text-shadow-lg lg:text-8xl">
        {title}
      </h1>
      <p className="mt-6 text-center text-xl font-bold tracking-tight text-white/90 uppercase text-shadow-lg lg:text-2xl">
        {subtitle}
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
  );
}
