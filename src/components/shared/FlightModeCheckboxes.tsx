// 9 checkboxes for the EdgeTX flightModes string.
// Convention: '0' = FM is ACTIVE for this mix, '1' = excluded.
// So '000000000' = active in all FMs.

interface Props {
  value: string;
  onChange: (v: string) => void;
  numFMs?: number;
}

export function FlightModeCheckboxes({ value, onChange, numFMs = 9 }: Props) {
  const bits = value.padEnd(9, '0').split('');

  function toggle(i: number) {
    const next = [...bits];
    next[i] = next[i] === '0' ? '1' : '0';
    onChange(next.join(''));
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {Array.from({ length: numFMs }, (_, i) => {
        const active = bits[i] === '0';
        return (
          <label
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              cursor: 'pointer',
              fontSize: 11,
              color: active ? 'var(--text)' : 'var(--text-muted)',
            }}
          >
            <input
              type="checkbox"
              checked={active}
              onChange={() => toggle(i)}
              style={{ accentColor: 'var(--accent)' }}
            />
            FM{i}
          </label>
        );
      })}
    </div>
  );
}
