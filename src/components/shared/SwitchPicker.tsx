// Custom dropdown for selecting an MT12 switch position.
// Fires per-option hover so the diagram highlights the physical switch as the user browses.
// Produces raw EdgeTX switch strings like "SA0", "SC1", "NONE", "ON".

import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../../store/useEditorStore.ts';

const POS_LABEL: Record<number, string> = { 0: '↑', 1: '—', 2: '↓' };

interface SwitchOption {
  value: string;
  label: string;
  group: string;
  control: string | null;
}

function buildOptions(switches: { key: string; name: string; type: string }[]): SwitchOption[] {
  const opts: SwitchOption[] = [
    { value: 'NONE', label: 'None',       group: '',    control: null },
    { value: 'ON',   label: 'Always ON',  group: '',    control: null },
  ];
  for (const s of switches) {
    const positions = s.type === '3POS' ? 3 : 2;
    const displayLabel = `${s.name !== s.key ? `${s.key} (${s.name})` : s.key} (${s.type === '3POS' ? '3-pos' : '2-pos'})`;
    for (let p = 0; p < positions; p++) {
      opts.push({
        value: `${s.key}${p}`,
        label: `${displayLabel} ${POS_LABEL[p] ?? p}`,
        group: displayLabel,
        control: s.key,
      });
    }
  }
  return opts;
}

// Strip position digit to get physical control name: "SC2" → "SC"
function switchToControl(sw: string): string | null {
  if (!sw || sw === 'NONE' || sw === 'ON') return null;
  const s = sw.startsWith('!') ? sw.slice(1) : sw;
  return s.replace(/\d$/, '') || null;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  style?: React.CSSProperties;
  warn?: boolean;          // amber-highlight the control (e.g. references a missing expansion input)
  warnTitle?: string;      // tooltip explaining the warning
  inUse?: Record<string, string[]>;  // switch key → usage labels, shown in dropdown
}

export function SwitchPicker({ value, onChange, id, style, warn, warnTitle, inUse }: Props) {
  const [open, setOpen] = useState(false);
  const setHighlight = useEditorStore(s => s.setDiagramHighlight);
  const availableSwitches = useEditorStore(s => s.availableSwitches);
  const ref = useRef<HTMLDivElement>(null);

  const options = buildOptions(availableSwitches());
  const groups = ['', ...Array.from(new Set(options.filter(o => o.group).map(o => o.group)))];

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open) setHighlight(null);
  }, [open, setHighlight]);

  const selected = options.find(o => o.value === value) ?? (value ? { value, label: value, group: '', control: switchToControl(value) } : null);

  return (
    <div ref={ref} id={id} style={{ position: 'relative', display: 'inline-block', minWidth: 160, ...style }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => { if (value) setHighlight(switchToControl(value)); }}
        onMouseLeave={() => { if (!open) setHighlight(null); }}
        title={warn ? warnTitle : undefined}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          background: 'var(--bg)', color: selected ? 'var(--text)' : 'var(--text-muted)',
          border: warn ? '1px solid #f59e0b' : '1px solid var(--border)', borderRadius: 4,
          padding: '4px 8px', fontSize: 13, fontFamily: 'var(--font)', cursor: 'pointer',
        }}
      >
        <span>{warn && <span style={{ color: '#f59e0b', marginRight: 4 }}>⚠</span>}{selected ? selected.label : '— select —'}</span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 2px)', left: 0, zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)', minWidth: '100%', overflow: 'hidden',
        }}>
          {groups.map((group, gi) => {
            const opts = options.filter(o => o.group === group);
            if (!opts.length) return null;
            return (
              <div key={group || '__special__'}>
                {group && (
                  <div style={{ padding: '4px 8px 2px', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {group}
                  </div>
                )}
                {opts.map(opt => {
                  const isSelected = opt.value === value;
                  return (
                    <div
                      key={opt.value}
                      onMouseEnter={() => setHighlight(opt.control)}
                      onMouseLeave={() => setHighlight(null)}
                      onClick={() => { onChange(opt.value); setOpen(false); setHighlight(null); }}
                      style={{
                        padding: '5px 10px', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13,
                        background: isSelected ? 'var(--accent)' : undefined,
                        color: isSelected ? '#fff' : 'var(--text)',
                      }}
                      onMouseOver={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-hover, rgba(255,255,255,0.06))'; }}
                      onMouseOut={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = ''; }}
                    >
                      {opt.label}
                      {(() => {
                        const usages = inUse?.[opt.value];
                        if (!usages?.length) return null;
                        return (
                          <div style={{ fontSize: 11, color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginTop: 1 }}>
                            In use: {usages.join(', ')}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
                {gi < groups.length - 1 && groups[gi + 1] && (
                  <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
