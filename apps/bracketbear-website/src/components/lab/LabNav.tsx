import { SECTIONS } from './sections';
import { REGISTRY } from './registry';

const MONO = "'JetBrains Mono', ui-monospace, monospace";

interface Props {
  activeId: string;
  onSelect: (id: string) => void;
}

export default function LabNav({ activeId, onSelect }: Props) {
  return (
    <nav
      className="lab-scroll"
      aria-label="Animations"
      style={{
        width: 236,
        // 236px is the spec'd total, padding included.
        boxSizing: 'border-box',
        flexShrink: 0,
        borderRight: '1px solid rgba(255,243,227,0.14)',
        padding: '1rem 0.8rem 2rem 0.8rem',
        background: '#1c130e',
      }}
    >
      {SECTIONS.map(({ key, label }) => {
        const items = REGISTRY.filter((e) => e.section === key);
        if (items.length === 0) return null;
        return (
          <div key={key} style={{ marginBottom: '1.1rem' }}>
            <p
              style={{
                fontFamily: MONO,
                fontSize: '0.58rem',
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'rgba(255,243,227,0.42)',
                margin: '0 0 0.4rem 0.4rem',
                fontWeight: 700,
              }}
            >
              {label}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {items.map((entry) => {
                const active = entry.id === activeId;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    className={active ? 'notch-8' : 'lab-nav-item'}
                    aria-current={active ? 'true' : undefined}
                    onClick={() => onSelect(entry.id)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      textAlign: 'left',
                      border: 0,
                      cursor: 'pointer',
                      fontFamily: MONO,
                      fontSize: '0.68rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      padding: '0.5rem 0.6rem',
                      background: active ? '#ff7a33' : 'transparent',
                      color: active ? '#110a08' : 'rgba(255,243,227,0.6)',
                    }}
                  >
                    <span>{entry.name}</span>
                    <span
                      style={{
                        fontSize: '0.56rem',
                        letterSpacing: '0.14em',
                        opacity: 0.6,
                      }}
                    >
                      {entry.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
