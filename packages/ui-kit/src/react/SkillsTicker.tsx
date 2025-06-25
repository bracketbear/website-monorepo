import { useEffect, useRef, useState, useCallback } from 'react';
import type { CollectionEntry } from 'astro:content';

interface SkillsTickerProps {
  skills: CollectionEntry<'workSkills'>[];
  LogoComponent?: React.ComponentType<{ className?: string }>;
}

export default function SkillsTicker({ skills, LogoComponent }: SkillsTickerProps) {
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
    if (!ticker) {
      console.log('Ticker not found');
      return;
    }

    console.log('Setting up ticker animation');
    console.log('Initial scrollWidth:', ticker.scrollWidth);
    console.log('Initial clientWidth:', ticker.clientWidth);
    console.log('Initial scrollLeft:', ticker.scrollLeft);

    const scrollTicker = () => {
      if (!ticker || isFocused) return;
      
      // Check if we've reached the end and need to reset
      if (ticker.scrollLeft >= ticker.scrollWidth - ticker.clientWidth) {
        console.log('Resetting scroll position');
        ticker.scrollLeft = 0;
      } else {
        ticker.scrollLeft += 1;
        console.log('Scrolling to:', ticker.scrollLeft);
      }
      
    };

    const interval = setInterval(scrollTicker, 20);
    return () => clearInterval(interval);
  }, [isFocused]); // Add isFocused as dependency

  return (
    <div className="bg-gray-900 overflow-hidden w-full">
      <div 
        ref={tickerRef}
        className="flex items-center gap-4 py-8 overflow-x-hidden whitespace-nowrap w-full"
        style={{ scrollBehavior: 'auto' }} // Change from 'smooth' to 'auto' for better performance
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
            className="flex items-center gap-4 text-white flex-shrink-0"
          >
            <span className="text-xl font-bold">
              {skill.data.title}
            </span>
            <div className="flex items-center justify-center bg-red-500 p-1 rounded-full w-6 aspect-square">
              {LogoComponent && <LogoComponent className="-rotate-12 text-white" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 