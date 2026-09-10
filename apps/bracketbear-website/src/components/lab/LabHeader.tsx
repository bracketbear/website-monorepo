import { THEMES, hx, type ThemeId } from '@bracketbear/flateralus';
import LabLogo from './LabLogo';
import type { SectionKey } from './sections';

const MONO = "'JetBrains Mono', ui-monospace, monospace";

interface Props {
  ready: boolean;
  count: number;
  section: SectionKey;
  theme: ThemeId;
  onTheme: (id: ThemeId) => void;
  inContext: boolean;
  onView: (inContext: boolean) => void;
  onRandomize: () => void;
  onReset: () => void;
}

function segStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: MONO,
    fontSize: '0.6rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    fontWeight: 700,
    border: 0,
    cursor: 'pointer',
    padding: '0.45rem 0.8rem',
    background: active ? '#fff3e3' : 'transparent',
    color: active ? '#110a08' : 'rgba(255,243,227,0.55)',
  };
}

const buttonBase: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: '0.64rem',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  fontWeight: 700,
  padding: '0.5rem 0.9rem',
  cursor: 'pointer',
};

export default function LabHeader({
  ready,
  count,
  section,
  theme,
  onTheme,
  inContext,
  onView,
  onRandomize,
  onReset,
}: Props) {
  const status = ready
    ? `${count} animations registered · ${section.toUpperCase()} section`
    : 'Booting flateralus…';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.2rem',
        padding: '0 1.2rem',
        height: 54,
        flexShrink: 0,
        borderBottom: '2px solid #ff7a33',
        background: '#110a08',
      }}
    >
      <div
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}
      >
        <LabLogo />
        <span
          style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: '0.95rem',
            letterSpacing: '0.015em',
            textTransform: 'uppercase',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          Bracket&nbsp;Bear
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: '0.62rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#d8ff3d',
            border: '1px solid #d8ff3d',
            padding: '0.2rem 0.45rem',
            borderRadius: 999,
            whiteSpace: 'nowrap',
          }}
        >
          Animation Lab
        </span>
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.7rem',
          fontFamily: MONO,
          fontSize: '0.68rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(255,243,227,0.55)',
        }}
      >
        <span
          className="status-dot"
          style={{
            width: 7,
            height: 7,
            flexShrink: 0,
            background: '#d8ff3d',
            borderRadius: '50%',
          }}
        />
        <span
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {status}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            marginRight: '0.4rem',
          }}
        >
          {(Object.keys(THEMES) as ThemeId[]).map((id) => {
            const t = THEMES[id];
            const active = id === theme;
            return (
              <button
                key={id}
                type="button"
                className="lab-theme-dot"
                title={t.label}
                aria-label={t.label}
                aria-pressed={active}
                onClick={() => onTheme(id)}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  padding: 0,
                  background: `linear-gradient(135deg, ${hx(t.colors.orange)} 0 34%, ${hx(t.colors.sun)} 34% 67%, ${hx(t.colors.deep)} 67%)`,
                  border: active
                    ? '2px solid #fff3e3'
                    : '2px solid rgba(255,243,227,0.18)',
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            border: '1px solid rgba(255,243,227,0.3)',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            className="lab-seg"
            onClick={() => onView(false)}
            style={segStyle(!inContext)}
          >
            Bare
          </button>
          <button
            type="button"
            className="lab-seg"
            onClick={() => onView(true)}
            style={segStyle(inContext)}
          >
            In context
          </button>
        </div>

        <button
          type="button"
          className="lab-randomize notch-8"
          onClick={onRandomize}
          style={{
            ...buttonBase,
            background: '#ff7a33',
            color: '#110a08',
            border: 0,
          }}
        >
          Randomize
        </button>
        <button
          type="button"
          className="lab-reset"
          onClick={onReset}
          style={{
            ...buttonBase,
            background: 'transparent',
            color: '#fff3e3',
            border: '1px solid rgba(255,243,227,0.4)',
          }}
        >
          Reset
        </button>
      </div>
    </header>
  );
}
