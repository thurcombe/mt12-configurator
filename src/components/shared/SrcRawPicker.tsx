// Source raw picker for EdgeTX mix/expo source fields.
// Groups: sticks/pots, switches, constants, inputs, channels, logical sw.

import { srcRawLabel } from '../../codec/srcRaw.ts';
import { useEditorStore } from '../../store/useEditorStore.ts';

const DIAGRAM_CONTROLS = new Set(['SA','SB','SC','SD','FL1','FL2','P1','P2','P3','P4','TH']);

const STICK_POTS = ['TH', 'ST', 'P1', 'P2', 'P3', 'P4'];
const SWITCHES_SRC = ['SA', 'SB', 'SC', 'SD', 'FL1', 'FL2'];
const CONSTANTS = ['MAX', 'HALF', 'NONE'];

// Build a flat list of all known srcRaw identifiers for the MT12.
function buildOptions(): { value: string; label: string; group: string }[] {
  const opts: { value: string; label: string; group: string }[] = [];

  for (const s of STICK_POTS) {
    opts.push({ value: s, label: srcRawLabel(s), group: 'Sticks & Pots' });
  }
  for (const s of SWITCHES_SRC) {
    opts.push({ value: s, label: srcRawLabel(s), group: 'Switches' });
  }
  for (const s of CONSTANTS) {
    opts.push({ value: s, label: srcRawLabel(s), group: 'Constants' });
  }
  for (let i = 0; i < 16; i++) {
    opts.push({ value: `I${i}`, label: `Input ${i + 1}`, group: 'Inputs' });
  }
  for (let i = 1; i <= 16; i++) {
    opts.push({ value: `CH${i}`, label: `CH${i}`, group: 'Channels' });
  }
  for (let i = 1; i <= 32; i++) {
    opts.push({ value: `ls(${i})`, label: `L${i}`, group: 'Logical Sw' });
  }

  return opts;
}

const ALL_OPTIONS = buildOptions();
const GROUPS = ['Sticks & Pots', 'Switches', 'Constants', 'Inputs', 'Channels', 'Logical Sw'];

interface Props {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  style?: React.CSSProperties;
}

export function SrcRawPicker({ value, onChange, id, style }: Props) {
  const known = ALL_OPTIONS.find((o) => o.value === value);
  const setHighlight = useEditorStore(s => s.setDiagramHighlight);
  const control = DIAGRAM_CONTROLS.has(value) ? value : null;
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onMouseEnter={() => control && setHighlight(control)}
      onMouseLeave={() => setHighlight(null)}
      style={{
        background: 'var(--surface)',
        color: 'var(--text)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '3px 6px',
        fontSize: 13,
        fontFamily: 'var(--font)',
        ...style,
      }}
    >
      {!known && <option value={value}>{value}</option>}
      {GROUPS.map((g) => (
        <optgroup key={g} label={g}>
          {ALL_OPTIONS.filter((o) => o.group === g).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
