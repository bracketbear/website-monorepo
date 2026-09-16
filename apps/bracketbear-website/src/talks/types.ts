import type { ReactNode } from 'react';
import type { PaletteColors } from '@bracketbear/flateralus';

/** A reference to a lab-registered animation, by id, plus optional controls. */
export interface SlideAnimation {
  id: string;
  controls?: Record<string, unknown>;
  /**
   * Palette roles to override for this slide only, on top of the sunset
   * theme. Animations read PAL live, so the override holds while the
   * slide is up and the next slide restores the brand.
   */
  palette?: Partial<PaletteColors>;
}

export interface Slide {
  /** Stable handle, used for `?slide=` and React keys. */
  id: string;
  /** The slide's foreground. Chrome (header/footer) is drawn by the runner. */
  render: () => ReactNode;
  animation?: SlideAnimation;
  /** Ink type on an orange stage (the two sunset slides). */
  light?: boolean;
  /** Speaker beat shown in the notes drawer. */
  notes?: string;
}

export interface Talk {
  slug: string;
  title: string;
  slides: Slide[];
}
