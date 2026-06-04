// Simple switch selector for MT12 switches.
// Produces raw EdgeTX switch strings like "SA0", "SA2", "!SB0", "NONE", "ON".

const MT12_SWITCHES = [
  { sw: 'SA', positions: 3, label: 'SA (3-pos)' },
  { sw: 'SB', positions: 2, label: 'SB (2-pos)' },
  { sw: 'SC', positions: 2, label: 'SC (2-pos)' },
  { sw: 'SD', positions: 2, label: 'SD (2-pos)' },
  { sw: 'FL1', positions: 2, label: 'FL1 (latch)' },
  { sw: 'FL2', positions: 2, label: 'FL2 (latch)' },
];

const POS_LABEL: Record<number, string> = { 0: '↑', 1: '—', 2: '↓' };

function buildOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [
    { value: 'NONE', label: 'None' },
    { value: 'ON', label: 'Always ON' },
  ];
  for (const s of MT12_SWITCHES) {
    for (let p = 0; p < s.positions; p++) {
      opts.push({ value: `${s.sw}${p}`, label: `${s.label} ${POS_LABEL[p] ?? p}` });
    }
  }
  return opts;
}

const OPTIONS = buildOptions();

interface Props {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  style?: React.CSSProperties;
}

export function SwitchPicker({ value, onChange, id, style }: Props) {
  return (
    <select
      id={id}
      value={value || 'NONE'}
      onChange={(e) => onChange(e.target.value)}
      style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 6px', fontSize: 13, fontFamily: 'var(--font)', ...style }}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
      {/* If current value not in list, show it anyway */}
      {value && value !== 'NONE' && value !== 'ON' && !OPTIONS.find((o) => o.value === value) && (
        <option value={value}>{value}</option>
      )}
    </select>
  );
}
