import { clsx } from 'clsx';
import type { LabelValue } from '../types';

export type Stat = LabelValue;

export interface StatsProps {
  stats: Stat[];
  variant?: 'light' | 'dark';
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
        },
        className
      )}
    >
      {/* Stats */}
      {stats.map((stat, index) => (
        <div
          key={index}
          className="flex flex-grow-1 flex-col border-solid border-white/20 px-8 py-6 not-last:border-b not-last:md:border-r not-last:md:border-b-0"
        >
          <h4 className="font-heading text-text-primary/70 mb-1 text-sm font-black tracking-widest uppercase">
            {stat.label}
          </h4>
          <div className="font-heading text-text-primary mt-2 text-2xl font-bold tracking-tight">
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
};
