import { clsx } from 'clsx';
import type { LabelValue } from '../types';

export type Stat = LabelValue;

export interface StatsProps {
  stats: Stat[];
  variant?: 'light' | 'dark' | 'glass';
  className?: string;
}

export const Stats = ({
  stats,
  variant = 'dark',
  className = '',
}: StatsProps) => {
  return (
    <div
      className={clsx(
        'flex flex-col gap-4 p-0 md:flex-row',
        {
          'card-dark': variant === 'dark',
          card: variant === 'light',
          'glass-bg-light glass-shadow glass-border rounded-lg border-2':
            variant === 'glass',
        },
        className
      )}
    >
      {/* Stats */}
      {stats.map((stat, index) => (
        <div
          key={index}
          className={clsx(
            'flex flex-grow-1 flex-col px-3 py-3 not-last:border-b not-last:md:border-r not-last:md:border-b-0 lg:px-4 lg:py-3',
            variant === 'glass'
              ? 'border-white/20'
              : 'border-solid border-white/20'
          )}
        >
          <h4
            className={clsx(
              'font-heading mb-0 text-xs font-black tracking-widest uppercase lg:mb-0 lg:text-sm',
              variant === 'glass' ? 'glass-text-muted' : 'text-brand-yellow/70'
            )}
          >
            {stat.label}
          </h4>
          <div
            className={clsx(
              'font-heading mt-0.5 text-lg font-bold tracking-tight lg:mt-0.5 lg:text-2xl',
              variant === 'glass' ? 'glass-text' : 'text-brand-yellow'
            )}
          >
            {stat.label.toLowerCase() === 'status'
              ? stat.value.charAt(0).toUpperCase() +
                stat.value.slice(1).toLowerCase()
              : stat.value}
          </div>
        </div>
      ))}
    </div>
  );
};
