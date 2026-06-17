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
}

export function InputSourcePicker({ value, options, placeholder = '— select —', onChange }: Props) {
  const [open, setOpen] = useState(false);
  const setHighlight = useEditorStore(s => s.setDiagramHighlight);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Stop highlighting when dropdown closes.
  useEffect(() => {
    if (!open) setHighlight(null);
  }, [open, setHighlight]);

  const selected = options.find(o => o.value === value);

  // Group options.
  const groups = Array.from(new Set(options.map(o => o.group)));

  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block', minWidth:160 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => { if (value) setHighlight(value); }}
        onMouseLeave={() => { if (!open) setHighlight(null); }}
        style={{
          width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
          background:'var(--bg)', color: selected ? 'var(--text)' : 'var(--text-muted)',
          border:'1px solid var(--border)', borderRadius:4,
          padding:'4px 8px', fontSize:13, fontFamily:'var(--font)', cursor:'pointer',
        }}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <span style={{ fontSize:10, opacity:0.6 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 2px)', left:0, zIndex:200,
          background:'var(--surface)', border:'1px solid var(--border)', borderRadius:4,
          boxShadow:'0 4px 12px rgba(0,0,0,0.4)', minWidth:'100%', overflow:'hidden',
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
                return (
                  <div
                    key={opt.value}
                    onMouseEnter={() => setHighlight(opt.value)}
                    onMouseLeave={() => setHighlight(null)}
                    onClick={() => { onChange(opt.value); setOpen(false); setHighlight(null); }}
                    style={{
                      padding:'5px 10px', cursor:'pointer', fontFamily:'var(--font)',
                      background: isSelected ? 'var(--accent)' : undefined,
                      color: isSelected ? '#fff' : 'var(--text)',
                    }}
                    onMouseOver={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-hover, rgba(255,255,255,0.06))'; }}
                    onMouseOut={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = ''; }}
                  >
                    <div style={{ fontSize:13 }}>{opt.label}</div>
                    {opt.conflict && (
                      <div style={{ fontSize:11, color: isSelected ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)' }}>
                        Already used by {opt.conflict}
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
