import { useEffect, useRef, useState, useCallback } from 'react';
import type { CollectionEntry } from 'astro:content';
import BracketBearLogo from '@/assets/bracket-bear-logo.svg?react';

interface SkillsTickerProps {
  skills: CollectionEntry<'workSkills'>[];
}

export default function SkillsTicker({ skills }: SkillsTickerProps) {
  const tickerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const [tickerItems, setTickerItems] = useState<CollectionEntry<'workSkills'>[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  
  const lastItemRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      // Disconnect the old observer
      observerRef.current.disconnect();
    }

    if (node) {
      // Create new observer for the new last item
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // When the last item becomes visible, add another set of skills
              setTickerItems((prev) => [...prev, ...skills]);
            }
          });
        },
        {
          root: tickerRef.current,
          threshold: 0.1,
        }
      );

      observerRef.current.observe(node);
    }
  }, [skills]);

  // Initialize ticker items
  useEffect(() => {
    setTickerItems([...skills]);
  }, [skills]);

  // Setup scrolling animation
  useEffect(() => {
    const ticker = tickerRef.current;
    if (!ticker) return;

    const scrollTicker = () => {
      if (!ticker || isFocused) return;
      ticker.scrollLeft += 1;
    };

    const interval = setInterval(scrollTicker, 20);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-dark overflow-hidden">
      <div className="container mx-auto">
        <div 
          ref={tickerRef}
          className="flex items-center gap-4 py-8 overflow-x-hidden whitespace-nowrap"
          style={{ scrollBehavior: 'smooth' }}
          onFocus={() => {
            setIsFocused(true);
            console.log('Focus gained');
          }}
          onBlur={() => {
            setIsFocused(false);
            console.log('Focus lost');
          }}
          onMouseEnter={() => {
            setIsFocused(true);
            console.log('Mouse entering ticker');
          }}
          onMouseLeave={() => {
            setIsFocused(false);
            console.log('Mouse leaving ticker');
          }}
        >
          {tickerItems.map((skill, index) => (
            <div 
              key={`${skill.id}-${index}`} 
              ref={index === tickerItems.length - 1 ? lastItemRef : undefined}
              className="flex items-center gap-4 text-background"
            >
              <span className="text-xl font-bold">
                {skill.data.title}
              </span>
              <div className="flex items-center justify-center bg-secondary p-1 rounded-full w-6 aspect-square">
                <BracketBearLogo className="-rotate-12 text-dark" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 