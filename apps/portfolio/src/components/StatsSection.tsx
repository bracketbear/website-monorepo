/**
 * Stats item interface for the stats section
 */
export interface StatsItem {
  label: string;
  value: string;
  description?: string;
}

/**
 * Props for the StatsSection component
 */
export interface StatsSectionProps {
  stats: StatsItem[];
  className?: string;
}

/**
 * StatsSection Component
 *
 * A reusable component for displaying statistics in a grid layout.
 * Used across multiple pages to show key metrics and achievements.
 *
 * @example
 * ```tsx
 * <StatsSection
 *   stats={[
 *     { label: "Total Projects", value: "6", description: "Completed work" },
 *     { label: "Featured Projects", value: "2", description: "Highlighted work" },
 *     { label: "Technologies", value: "30+", description: "Skills utilized" }
 *   ]}
 * />
 * ```
 */
export default function StatsSection({
  stats,
  className = '',
}: StatsSectionProps) {
  return (
    <section className={`px-content mb-40 ${className}`}>
      <div className="container mx-auto">
        <div className="grid gap-8 md:grid-cols-3">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="font-heading text-text-primary mb-2 text-4xl font-black">
                {stat.value}
              </div>
              <div className="text-text-primary/90 mb-1 text-xl font-bold">
                {stat.label}
              </div>
              {stat.description && (
                <div className="text-text-primary/70">{stat.description}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
