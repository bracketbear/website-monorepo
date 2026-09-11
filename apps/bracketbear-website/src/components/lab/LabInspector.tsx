import { hx, type AnimationManifest } from '@bracketbear/flateralus';
import type { LabEntry } from './registry';

const MONO = "'JetBrains Mono', ui-monospace, monospace";

type Value = string | number | boolean;

interface Props {
  entry: LabEntry;
  manifest: AnimationManifest;
  values: Record<string, unknown>;
  onChange: (name: string, value: Value) => void;
}

const labelRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: '0.5rem',
  fontFamily: MONO,
  fontSize: '0.62rem',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  fontWeight: 700,
  color: 'rgba(255,243,227,0.75)',
  marginBottom: '0.4rem',
};

function optStyle(active: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontFamily: MONO,
    fontSize: '0.6rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontWeight: 700,
    padding: '0.32rem 0.55rem',
    cursor: 'pointer',
    border: `1px solid ${active ? '#ff7a33' : 'rgba(255,243,227,0.25)'}`,
    background: active ? '#ff7a33' : 'transparent',
    color: active ? '#110a08' : 'rgba(255,243,227,0.7)',
  };
}

/** What the value readout shows for a control's current value. */
function display(
  control: AnimationManifest['controls'][number],
  value: unknown
) {
  let text: string;
  if (control.type === 'boolean') text = value ? 'ON' : 'OFF';
  else if (control.type === 'select') {
    const opt = control.options.find((o) => o.value === value);
    text = opt ? opt.label : String(value);
  } else text = String(value);
  return control.resetsAnimation ? `${text} ⟲` : text;
}

export default function LabInspector({
  entry,
  manifest,
  values,
  onChange,
}: Props) {
  return (
    <aside
      className="lab-scroll"
      aria-label="Manifest"
      style={{
        width: 296,
        // 296px is the spec'd total, padding included.
        boxSizing: 'border-box',
        flexShrink: 0,
        borderLeft: '1px solid rgba(255,243,227,0.14)',
        background: '#1c130e',
        padding: '1rem 1rem 2rem 1rem',
      }}
    >
      <p
        style={{
          fontFamily: MONO,
          fontSize: '0.58rem',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          fontWeight: 700,
          color: 'rgba(255,243,227,0.42)',
          margin: 0,
        }}
      >
        Manifest / {entry.id}
      </p>
      <h1
        style={{
          fontFamily: "'Anton', sans-serif",
          fontWeight: 400,
          fontSize: '1.6rem',
          lineHeight: 0.95,
          textTransform: 'uppercase',
          color: '#ff7a33',
          margin: '0.5rem 0 0',
        }}
      >
        {entry.name}
      </h1>
      <p
        style={{
          fontSize: '0.8rem',
          lineHeight: 1.5,
          color: 'rgba(255,243,227,0.6)',
          margin: '0.6rem 0 0',
        }}
      >
        {entry.blurb}
      </p>

      <hr
        style={{
          border: 0,
          borderTop: '1px solid rgba(255,243,227,0.14)',
          margin: '1rem 0',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.05rem' }}>
        {manifest.controls.map((control) => {
          const value = values[control.name];
          const inputId = `lab-control-${control.name}`;
          return (
            <div key={control.name}>
              <label htmlFor={inputId} style={labelRow}>
                <span>{control.label ?? control.name}</span>
                <span style={{ color: '#ffc24a', whiteSpace: 'nowrap' }}>
                  {display(control, value)}
                </span>
              </label>

              {control.type === 'number' && (
                <input
                  id={inputId}
                  type="range"
                  // The visible label also carries the value readout, so
                  // name the input explicitly for assistive tech.
                  aria-label={control.label ?? control.name}
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={value as number}
                  onChange={(e) =>
                    onChange(control.name, parseFloat(e.target.value))
                  }
                />
              )}

              {control.type === 'boolean' && (
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {[
                    { label: 'On', v: true },
                    { label: 'Off', v: false },
                  ].map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      className="lab-opt"
                      onClick={() => onChange(control.name, o.v)}
                      style={optStyle(value === o.v)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}

              {control.type === 'select' && (
                <div
                  style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}
                >
                  {control.options.map((o) => {
                    // A numeric option value is a color; show it.
                    const isColor = typeof o.value === 'number';
                    return (
                      <button
                        key={String(o.value)}
                        type="button"
                        className="lab-opt"
                        onClick={() => onChange(control.name, o.value)}
                        style={optStyle(value === o.value)}
                      >
                        {isColor && (
                          <span
                            data-testid={`swatch-${control.name}-${o.value}`}
                            style={{
                              width: 10,
                              height: 10,
                              flexShrink: 0,
                              backgroundColor: hx(o.value as number),
                            }}
                          />
                        )}
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p
        style={{
          fontSize: '0.56rem',
          lineHeight: 1.6,
          color: 'rgba(255,243,227,0.3)',
          margin: '1.4rem 0 0',
        }}
      >
        Controls marked ⟲ rebuild the scene when changed. Everything else
        updates live.
      </p>
    </aside>
  );
}
