import React, { useRef, useEffect, useState, ReactNode } from 'react';
import clsx from 'clsx';

interface GradientFadeScrollProps {
  direction?: 'vertical' | 'horizontal';
  className?: string;
  children: ReactNode;
  /** Tailwind class name for the fade color. @default 'to-white' */
  fadeColor?: string;
}

export const GradientFadeScroll: React.FC<GradientFadeScrollProps> = ({
  direction = 'vertical',
  className = '',
  children,
  fadeColor = 'from-white',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showStartFade, setShowStartFade] = useState(false);
  const [showEndFade, setShowEndFade] = useState(false);

  const isVertical = direction === 'vertical';

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const updateFades = () => {
      if (isVertical) {
        setShowStartFade(el.scrollTop > 0);
        setShowEndFade(el.scrollHeight - el.scrollTop > el.clientHeight + 1);
      } else {
        setShowStartFade(el.scrollLeft > 0);
        setShowEndFade(el.scrollWidth - el.scrollLeft > el.clientWidth + 1);
      }
    };
    updateFades();
    el.addEventListener('scroll', updateFades);
    window.addEventListener('resize', updateFades);
    return () => {
      el.removeEventListener('scroll', updateFades);
      window.removeEventListener('resize', updateFades);
    };
  }, [isVertical]);

  // Fade gradient classes
  const fadeStartClass = isVertical
    ? `pointer-events-none absolute top-0 left-0 w-full h-6 bg-gradient-to-b ${fadeColor} to-transparent`
    : `pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r {} to-transparent`;
  const fadeEndClass = isVertical
    ? `pointer-events-none absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t {} to-transparent`
    : `pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l {} to-transparent`;

  return (
    <div className={clsx('bb-gradient-fade-scroll relative', className)}>
      <div
        ref={scrollRef}
        className={clsx(
          'custom-scrollbar-hide',
          isVertical
            ? 'overflow-y-auto max-h-full'
            : 'overflow-x-auto max-w-full',
          'focus:outline-none'
        )}
        tabIndex={0}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </div>
      {showStartFade && (
        <div className={fadeStartClass} style={{ display: 'block' }} />
      )}
      {showEndFade && (
        <div className={fadeEndClass} style={{ display: 'block' }} />
      )}
    </div>
  );
};

export default GradientFadeScroll;
