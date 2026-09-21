/** Pointer input is scaled by this under prefers-reduced-motion. */
export const REDUCED_INPUT_SCALE = 0.35;

/**
 * Whether the viewer has asked for less motion. Read at seed time rather
 * than cached at module load, so a changed setting takes effect the next
 * time an effect is seeded.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}
