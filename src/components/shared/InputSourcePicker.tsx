// Custom dropdown for selecting a physical MT12 input source.
// Fires per-option hover events so the diagram highlights as the user browses.

import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../../store/useEditorStore.ts';

export interface InputSourceOption {
  value: string;
  label: string;
  group: string;
  conflict?: string;  // e.g. "speed limiter" — shown as a warning
}

interface Props {
  value: string;
  options: InputSourceOption[];
  placeholder?: string;
  onChange: (v: string) => void;
  warn?: boolean;          // amber-highlight the control (e.g. references a missing expansion input)
  warnTitle?: string;      // tooltip explaining the warning
}

export function InputSourcePicker({ value, options, placeholder = '— select —', onChange, warn, warnTitle }: Props) {
  const [open, setOpen] = useState(false);
  const setHighlight = useEditorStore(s => s.setDiagramHighlight);
  const ref = useRef<HTMLDivElement>(null);

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

  const selected = options.find(o => o.value === value);
  const groups = Array.from(new Set(options.map(o => o.group)));

  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block', minWidth:160 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => { if (value) setHighlight(value); }}
        onMouseLeave={() => { if (!open) setHighlight(null); }}
        title={warn ? warnTitle : undefined}
        style={{
          width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
          background:'var(--bg)', color: selected ? 'var(--text)' : 'var(--text-muted)',
          border: warn ? '1px solid #f59e0b' : '1px solid var(--border)', borderRadius:4,
          padding:'4px 8px', fontSize:13, fontFamily:'var(--font)', cursor:'pointer',
        }}
      >
        <span>{warn && <span style={{ color:'#f59e0b', marginRight:4 }}>⚠</span>}{selected ? selected.label : placeholder}</span>
        <span style={{ fontSize:10, opacity:0.6 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 2px)', left:0, zIndex:200,
          background:'var(--surface)', border:'1px solid var(--border)', borderRadius:4,
          boxShadow:'0 4px 12px rgba(0,0,0,0.4)', minWidth:'100%', maxHeight:'var(--picker-max-height)', overflowY:'auto',
        }}>
          {groups.map((group, gi) => (
            <div key={group}>
              {groups.length > 1 && (
                <div style={{ padding:'4px 8px 2px', fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                  {group}
                </div>
              )}
              {options.filter(o => o.group === group).map(opt => {
                const isSelected = opt.value === value;
                const isDisabled = !!(opt.conflict && !isSelected);
                return (
                  <div
                    key={opt.value}
                    onMouseEnter={() => !isDisabled && setHighlight(opt.value)}
                    onMouseLeave={() => setHighlight(null)}
                    onClick={() => {
                      if (isDisabled) return;
                      onChange(opt.value); setOpen(false); setHighlight(null);
                    }}
                    style={{
                      padding:'5px 10px', cursor: isDisabled ? 'not-allowed' : 'pointer', fontFamily:'var(--font)',
                      background: isSelected ? 'var(--accent)' : undefined,
                      color: isSelected ? '#fff' : isDisabled ? 'var(--text-muted)' : 'var(--text)',
                      opacity: isDisabled ? 0.6 : 1,
                    }}
                    onMouseOver={(e) => { if (!isSelected && !isDisabled) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-hover, rgba(255,255,255,0.06))'; }}
                    onMouseOut={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = ''; }}
                  >
                    <div style={{ fontSize:13 }}>{opt.label}</div>
                    {opt.conflict && (
                      <div style={{ fontSize:11, color: isSelected ? 'rgba(255,255,255,0.75)' : '#ef4444' }}>
                        In use by: {opt.conflict}
                      </div>
                    )}
                  </div>
                );
              })}
              {gi < groups.length - 1 && (
                <div style={{ height:1, background:'var(--border)', margin:'2px 0' }} />
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
