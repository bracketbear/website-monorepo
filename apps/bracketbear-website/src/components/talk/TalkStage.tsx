import type { ReactNode, RefObject } from 'react';
import { PAL, hx } from '@bracketbear/flateralus';

interface Props {
  stageRef: RefObject<HTMLDivElement | null>;
  hostRef: RefObject<HTMLDivElement | null>;
  light: boolean;
  fading: boolean;
  children: ReactNode;
}

/** The sunset ground the lab paints under hero-section animations. */
function background(light: boolean): string {
  if (!light) return hx(PAL.ink);
  return `radial-gradient(ellipse 90% 70% at 50% 30%, ${hx(PAL.sun)} 0%, ${hx(PAL.bright)} 32%, ${hx(PAL.orange)} 62%, ${hx(PAL.orange)} 100%)`;
}

/**
 * Letterboxed 16:9 box. Pointer input listens on the stage wrapper because
 * BaseApplication sets pointer-events: none on the canvas it appends.
 */
export default function TalkStage({
  stageRef,
  hostRef,
  light,
  fading,
  children,
}: Props) {
  return (
    <div ref={stageRef} className="bb-talk-stage">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: background(light),
        }}
      />
      <div
        ref={hostRef}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      />
      <div
        className="bb-talk-fade"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          opacity: fading ? 0 : 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}
