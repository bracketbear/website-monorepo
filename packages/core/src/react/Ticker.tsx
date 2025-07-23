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
    <div className={`bg-brand-dark w-full overflow-hidden ${className}`}>
      <div
        ref={tickerRef}
        className="flex w-full items-center gap-4 overflow-x-hidden py-8 whitespace-nowrap"
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
            className={`text-brand-light flex flex-shrink-0 items-center gap-4 ${itemClassName} ${
              item.link
                ? 'cursor-pointer transition-opacity hover:opacity-80'
                : ''
            }`}
            onClick={() => handleItemClick(item)}
          >
            <span className="text-xl font-bold">{item.title}</span>
            {item.icon && (
              <div className="bg-brand-orange flex aspect-square w-6 items-center justify-center rounded-full p-1">
                <item.icon
                  className={`text-brand-dark -rotate-12 ${iconClassName}`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
