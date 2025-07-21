import { useEffect, useRef, useState } from 'react';
import { useIntersectionObserver } from './hooks';

const DEFAULT_SCROLL_SPEED = 0.5 as const;
const DEFAULT_REFRESH_INTERVAL = 20 as const;

export interface TickerItem {
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  link?: string;
}

interface TickerProps {
  items: TickerItem[];
  className?: string;
  itemClassName?: string;
  iconClassName?: string;
  speed?: number;
  refreshInterval?: number;
  onItemClick?: (item: TickerItem) => void;
}

export default function Ticker({
  items,
  className = '',
  itemClassName = '',
  iconClassName = '',
  speed = DEFAULT_SCROLL_SPEED,
  refreshInterval = DEFAULT_REFRESH_INTERVAL,
  onItemClick,
}: TickerProps) {
  const tickerRef = useRef<HTMLDivElement>(null);
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  const { lastItemRef } = useIntersectionObserver({
    root: tickerRef.current,
    threshold: 0.1,
    onIntersect: () => {
      // When the last item becomes visible, add another set of items
      setTickerItems((prev) => [...prev, ...items]);
    },
  });

  // Initialize ticker items
  useEffect(() => {
    setTickerItems([...items]);
  }, [items]);

  // Setup scrolling animation
  useEffect(() => {
    const ticker = tickerRef.current;
    if (!ticker) {
      return;
    }

    const scrollTicker = () => {
      if (!ticker || isFocused) return;

      // Check if we've reached the end and need to reset
      if (ticker.scrollLeft >= ticker.scrollWidth - ticker.clientWidth) {
        ticker.scrollLeft = 0;
      } else {
        ticker.scrollLeft += speed;
      }
    };

    const interval = setInterval(scrollTicker, refreshInterval);
    return () => clearInterval(interval);
  }, [isFocused]);

  const handleItemClick = (item: TickerItem) => {
    if (item.link && onItemClick) {
      onItemClick(item);
    }
  };

  return (
    <div className={`bg-brand-dark overflow-hidden w-full ${className}`}>
      <div
        ref={tickerRef}
        className="flex items-center gap-4 py-8 overflow-x-hidden whitespace-nowrap w-full"
        style={{ scrollBehavior: 'auto' }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onMouseEnter={() => setIsFocused(true)}
        onMouseLeave={() => setIsFocused(false)}
      >
        {tickerItems.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            ref={index === tickerItems.length - 1 ? lastItemRef : undefined}
            className={`flex items-center gap-4 text-brand-light flex-shrink-0 ${itemClassName} ${
              item.link
                ? 'cursor-pointer hover:opacity-80 transition-opacity'
                : ''
            }`}
            onClick={() => handleItemClick(item)}
          >
            <span className="text-xl font-bold">{item.title}</span>
            {item.icon && (
              <div className="flex items-center justify-center bg-brand-orange p-1 rounded-full w-6 aspect-square">
                <item.icon
                  className={`-rotate-12 text-brand-dark ${iconClassName}`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
