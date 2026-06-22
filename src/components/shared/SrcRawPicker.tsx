// Custom dropdown for EdgeTX mix/expo source fields.
// Replaces the native <select> to support per-option diagram highlighting on hover.

import { useState, useEffect, useRef } from 'react';
import { srcRawLabel } from '../../codec/srcRaw.ts';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { TRIMS } from '../../hardware/mt12.ts';

const CONSTANTS = ['MAX', 'HALF', 'NONE'];

// Controls that appear on the MT12 diagram and can be highlighted on hover.
const DIAGRAM_CONTROLS = new Set(['SA', 'SB', 'SC', 'SD', 'FL1', 'FL2', 'P1', 'P2', 'P3', 'P4', 'TH', 'T1', 'T2', 'T3', 'T4', 'T5']);

type SrcOpt = { value: string; label: string; group: string; control: string | null };

const GROUPS = ['Sticks & Pots', 'Switches', 'Trims', 'Constants', 'Inputs', 'Channels', 'Logical Sw'];

interface Props {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  style?: React.CSSProperties;
  warn?: boolean;
  warnTitle?: string;
}

export function SrcRawPicker({ value, onChange, id, style, warn, warnTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const setHighlight = useEditorStore(s => s.setDiagramHighlight);
  const availableSwitches = useEditorStore(s => s.availableSwitches);
  const availablePots = useEditorStore(s => s.availablePots);
  const ref = useRef<HTMLDivElement>(null);

  const switches = availableSwitches();
  const pots = availablePots();

  const opts: SrcOpt[] = [];

  opts.push({ value: 'TH', label: srcRawLabel('TH'), group: 'Sticks & Pots', control: 'TH' });
  opts.push({ value: 'ST', label: srcRawLabel('ST'), group: 'Sticks & Pots', control: null });
  for (const p of pots) {
    const label = p.name !== p.key ? `${p.key} (${p.name})` : srcRawLabel(p.key);
    opts.push({ value: p.key, label, group: 'Sticks & Pots', control: DIAGRAM_CONTROLS.has(p.key) ? p.key : null });
  }

  for (const s of switches) {
    const label = s.name !== s.key ? `${s.key} (${s.name})` : srcRawLabel(s.key);
    opts.push({ value: s.key, label, group: 'Switches', control: DIAGRAM_CONTROLS.has(s.key) ? s.key : null });
  }

  for (const t of TRIMS) {
    opts.push({ value: t, label: srcRawLabel(t), group: 'Trims', control: DIAGRAM_CONTROLS.has(t) ? t : null });
  }

  for (const c of CONSTANTS) {
    opts.push({ value: c, label: srcRawLabel(c), group: 'Constants', control: null });
  }

  for (let i = 0; i < 16; i++) {
    opts.push({ value: `I${i}`, label: `Input ${i + 1}`, group: 'Inputs', control: null });
  }

  for (let i = 1; i <= 16; i++) {
    opts.push({ value: `CH${i}`, label: `CH${i}`, group: 'Channels', control: null });
  }

  for (let i = 1; i <= 32; i++) {
    opts.push({ value: `ls(${i})`, label: `L${i}`, group: 'Logical Sw', control: null });
  }

  const selected = opts.find(o => o.value === value);
  const displayLabel = selected?.label ?? value;

  // Only groups that actually have options — used for divider logic.
  const renderedGroups = GROUPS.filter(g => opts.some(o => o.group === g));

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Clear highlight and focused index when dropdown closes.
  useEffect(() => {
    if (!open) { setFocusedIdx(-1); setHighlight(null); }
  }, [open, setHighlight]);

  function openDropdown() {
    const selIdx = opts.findIndex(o => o.value === value);
    setFocusedIdx(selIdx >= 0 ? selIdx : 0);
    setOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = Math.min(focusedIdx + 1, opts.length - 1);
        setFocusedIdx(next);
        setHighlight(opts[next]?.control ?? null);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = Math.max(focusedIdx - 1, 0);
        setFocusedIdx(prev);
        setHighlight(opts[prev]?.control ?? null);
        break;
      }
      case 'Enter':
        if (focusedIdx >= 0 && focusedIdx < opts.length) {
          e.preventDefault();
          onChange(opts[focusedIdx].value);
          setOpen(false);
          setHighlight(null);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setHighlight(null);
        break;
      case 'Tab':
        // Close and clear without preventing Tab — let focus move naturally.
        setOpen(false);
        setHighlight(null);
        break;
    }
  }

  // Flat option index counter — reset each render, incremented per rendered option.
  let flatIdx = 0;

  return (
    <div ref={ref} id={id} style={{ position: 'relative', display: 'inline-block', minWidth: 160, ...style }}>
      <button
        type="button"
        onClick={() => { if (open) setOpen(false); else openDropdown(); }}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => { if (selected?.control) setHighlight(selected.control); }}
        onMouseLeave={() => { if (!open) setHighlight(null); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={warn ? warnTitle : undefined}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          background: 'var(--bg)', color: 'var(--text)',
          border: warn ? '1px solid #f59e0b' : '1px solid var(--border)', borderRadius: 4,
          padding: '4px 8px', fontSize: 13, fontFamily: 'var(--font)', cursor: 'pointer',
        }}
      >
        <span>{displayLabel}</span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 2px)', left: 0, zIndex: 200,
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)', minWidth: '100%',
            maxHeight: 280, overflowY: 'auto',
          }}
        >
          {renderedGroups.map((group, ri) => {
            const groupOpts = opts.filter(o => o.group === group);
            return (
              <div key={group}>
                <div style={{
                  padding: '4px 8px 2px', fontSize: 10, color: 'var(--text-muted)',
                  fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {group}
                </div>
                {groupOpts.map(opt => {
                  const myIdx = flatIdx++;
                  const isSelected = opt.value === value;
                  const isFocused = myIdx === focusedIdx;
                  return (
                    <div
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      ref={(el) => { if (el && isFocused) el.scrollIntoView({ block: 'nearest' }); }}
                      onMouseEnter={() => {
                        setFocusedIdx(myIdx);
                        setHighlight(opt.control ?? null);
                      }}
                      onMouseLeave={() => setHighlight(null)}
                      onClick={() => { onChange(opt.value); setOpen(false); setHighlight(null); }}
                      style={{
                        padding: '5px 10px', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13,
                        background: isSelected ? 'var(--accent)' : isFocused ? 'var(--surface-hover, rgba(255,255,255,0.06))' : undefined,
                        color: isSelected ? '#fff' : 'var(--text)',
                      }}
                    >
                      {opt.label}
                    </div>
                  );
                })}
                {ri < renderedGroups.length - 1 && (
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
