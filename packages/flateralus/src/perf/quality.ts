/**
 * One thing an animation is willing to trade for frame rate.
 *
 * Endpoints rather than a cost model: the author states the cheapest they
 * will let the scene run and the best they know how to make it look, and the
 * framework moves between them. A single scalar drives every lever, which
 * keeps the behaviour predictable and debuggable — a solver that picked
 * levers per frame would be neither.
 */
export interface QualityLever {
  /** Value at quality 0 — the cheapest this animation will ever run. */
  min: number;
  /** Value at quality 1 — the best it knows how to look. */
  max: number;
  /** Snap to this increment. March counts and tap counts need integers. */
  step?: number;
  /**
   * Reshape the response. Defaults to linear. A lever whose cost goes as an
   * area may want `q => q * q` so that quality falls off evenly in cost
   * rather than evenly in value.
   */
  curve?: (q: number) => number;
}

export type QualityLevers = Record<string, QualityLever>;

/**
 * The value a lever takes at quality `q`.
 *
 * `max` below `min` is allowed and runs the lever backwards, which is how a
 * lever that gets *cheaper* as it rises — a dither or downsample amount —
 * is expressed without needing a curve.
 */
export function resolveLever(lever: QualityLever, q: number): number {
  const t = (lever.curve ?? ((x: number) => x))(Math.min(1, Math.max(0, q)));
  const v = lever.min + (lever.max - lever.min) * t;
  if (lever.step && lever.step > 0) {
    return Math.round(v / lever.step) * lever.step;
  }
  return v;
}

/** Resolve a whole declaration at once. */
export function resolveLevers<T extends QualityLevers>(
  levers: T,
  q: number
): Record<keyof T, number> {
  const out = {} as Record<keyof T, number>;
  for (const k of Object.keys(levers) as (keyof T)[]) {
    out[k] = resolveLever(levers[k], q);
  }
  return out;
}

/**
 * The lever the framework owns for every animation, so adaptive resolution
 * needs no opt-in. The floor is well above zero because a scene rendered
 * much below this stops being recognisable rather than merely soft.
 */
export const DEFAULT_RENDER_SCALE_LEVER: QualityLever = {
  min: 0.35,
  max: 1,
};
