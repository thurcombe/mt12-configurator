// Source raw picker for EdgeTX mix/expo source fields.
// Groups: sticks/pots, switches, trims, constants, inputs, channels, logical sw.

import { srcRawLabel } from '../../codec/srcRaw.ts';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { TRIMS } from '../../hardware/mt12.ts';

const CONSTANTS = ['MAX', 'HALF', 'NONE'];
const DIAGRAM_SWITCH_CONTROLS = new Set(['SA', 'SB', 'SC', 'SD', 'FL1', 'FL2']);
const DIAGRAM_POT_CONTROLS = new Set(['P1', 'P2', 'P3', 'P4']);

interface Props {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  style?: React.CSSProperties;
}

export function SrcRawPicker({ value, onChange, id, style }: Props) {
  const availableSwitches = useEditorStore(s => s.availableSwitches);
  const availablePots = useEditorStore(s => s.availablePots);
  const setHighlight = useEditorStore(s => s.setDiagramHighlight);

  const switches = availableSwitches();
  const pots = availablePots();

  type Opt = { value: string; label: string; group: string };
  const opts: Opt[] = [];

  // Sticks & Pots
  opts.push({ value: 'TH', label: srcRawLabel('TH'), group: 'Sticks & Pots' });
  opts.push({ value: 'ST', label: srcRawLabel('ST'), group: 'Sticks & Pots' });
  for (const p of pots) {
    const label = p.name !== p.key ? `${p.key} (${p.name})` : srcRawLabel(p.key);
    opts.push({ value: p.key, label, group: 'Sticks & Pots' });
  }

  // Switches
  for (const s of switches) {
    const label = s.name !== s.key ? `${s.key} (${s.name})` : srcRawLabel(s.key);
    opts.push({ value: s.key, label, group: 'Switches' });
  }

  // Trims
  for (const t of TRIMS) {
    opts.push({ value: t, label: srcRawLabel(t), group: 'Trims' });
  }

  // Constants
  for (const c of CONSTANTS) {
    opts.push({ value: c, label: srcRawLabel(c), group: 'Constants' });
  }

  // Inputs
  for (let i = 0; i < 16; i++) {
    opts.push({ value: `I${i}`, label: `Input ${i + 1}`, group: 'Inputs' });
  }

  // Channels
  for (let i = 1; i <= 16; i++) {
    opts.push({ value: `CH${i}`, label: `CH${i}`, group: 'Channels' });
  }

  // Logical Sw
  for (let i = 1; i <= 32; i++) {
    opts.push({ value: `ls(${i})`, label: `L${i}`, group: 'Logical Sw' });
  }

  const GROUPS = ['Sticks & Pots', 'Switches', 'Trims', 'Constants', 'Inputs', 'Channels', 'Logical Sw'];
  const known = opts.find((o) => o.value === value);

  const diagramControl = DIAGRAM_SWITCH_CONTROLS.has(value) ? value
    : DIAGRAM_POT_CONTROLS.has(value) ? value
    : null;

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onMouseEnter={() => diagramControl && setHighlight(diagramControl)}
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
          {opts.filter((o) => o.group === g).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
