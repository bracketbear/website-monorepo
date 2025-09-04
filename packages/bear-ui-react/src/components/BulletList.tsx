import React from 'react';
import { clsx } from 'clsx';
import { marked } from 'marked';

export interface BulletListItem {
  title: string;
  content: string; // markdown supported
}

export interface BulletListProps {
  title: string;
  items: BulletListItem[];
  variant?: 'numbered' | 'bulleted';
  className?: string;
}

/**
 * BulletList component for displaying lists of items with consistent styling
 * Used for "How I Work" and "Values" sections
 *
 * New design: Wide card layout with number/bullet on left, content on right
 */
export function BulletList({
  title,
  items,
  variant = 'numbered',
  className,
}: BulletListProps) {
  return (
    <section className={clsx('px-content mt-40 mb-8', className)}>
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="font-heading text-foreground mb-8 text-5xl tracking-tight uppercase">
          {title}
        </h2>
      </div>
      <div className="mx-auto max-w-4xl">
        <div className="space-y-4">
          {items.map((item: BulletListItem, index: number) => (
            <div
              key={index}
              className="border-border/20 bg-card/20 rounded-lg border p-6 shadow-[0_2px_8px_0_rgba(31,38,135,0.1)] backdrop-blur-md md:p-8"
            >
              <div className="flex items-center gap-6">
                {/* Left column: Number or bullet */}
                <div className="flex-shrink-0">
                  {variant === 'numbered' ? (
                    <div className="bg-primary text-primary-foreground flex aspect-square w-12 items-center justify-center rounded-full text-lg font-bold md:w-14 md:text-xl">
                      {index + 1}
                    </div>
                  ) : null}
                </div>

                {/* Right column: Content */}
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-foreground mb-3 text-xl font-semibold tracking-tight uppercase md:text-2xl">
                    {item.title}
                  </h3>
                  <div className="prose prose-lg prose-headings:text-foreground prose-p:text-foreground/80 prose-strong:text-foreground prose-em:text-foreground/90 max-w-prose">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: marked.parse(item.content),
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
