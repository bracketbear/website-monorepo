/**
 * The animation host bleeds outside the stage so a piece that composes to its
 * own center still fills the slide. Sizing it is imperative rather than a
 * render prop because the surface has to be at its new size *before* the next
 * animation is created: animations bake their layout at init, and one built
 * against a stage-sized surface paints only that corner of a bled-out one.
 */

/** Negative inset that grows the host to `cover` x the stage, centered. */
export function bleedInset(cover: number): string {
  const over = Math.max(1, cover);
  // Rounded because 1.6 lands on -30.000000000000004 otherwise.
  return `${Math.round((-(over - 1) / 2) * 1e6) / 1e4}%`;
}

/** What `sizeStageFor` needs from the application. */
interface Resizable {
  resizeToContainer(): void;
}

/** Bleed the host out for `cover`, then hand the new box to the surface. */
export function sizeStageFor(
  host: HTMLElement,
  app: Resizable | null,
  cover: number
): void {
  host.style.inset = bleedInset(cover);
  app?.resizeToContainer();
}
