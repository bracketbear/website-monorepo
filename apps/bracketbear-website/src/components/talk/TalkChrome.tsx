import { formatCounter } from '../../talks/talk-model';
import { u, mono, INK, CREAM, ORANGE } from './layouts';

interface Props {
  title: string;
  index: number;
  count: number;
  light: boolean;
  animationName: string | null;
}

/** Running header and footer. Same elements the storyboard canvas shows. */
export default function TalkChrome({
  title,
  index,
  count,
  light,
  animationName,
}: Props) {
  const muted = light ? 'rgba(17, 10, 8, 0.6)' : 'rgba(255, 243, 227, 0.55)';
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: u(56),
          left: u(72),
          right: u(72),
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <div style={{ ...mono, fontSize: u(18), color: muted }}>{title}</div>
        <div style={{ ...mono, fontSize: u(18), color: muted }}>
          {formatCounter(index, count)}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: u(56),
          left: u(72),
          right: u(72),
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontFamily: "'Archivo Black', 'Helvetica Neue', sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            fontSize: u(18),
            color: light ? INK : CREAM,
          }}
        >
          [BB] BRACKET BEAR
        </div>
        {animationName && (
          <div
            style={{
              ...mono,
              fontSize: u(14),
              color: light ? CREAM : INK,
              background: light ? INK : ORANGE,
              padding: `${u(8)} ${u(14)} ${u(7)}`,
              clipPath:
                'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
            }}
          >
            FLATERALUS · {animationName.toUpperCase()}
          </div>
        )}
      </div>
    </>
  );
}
