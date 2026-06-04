// Combined number input + range slider for weight/offset fields.
// When the range spans negative values, a tick mark at 0 shows the neutral midpoint.

import { useId } from 'react';

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;      // slider visual lower bound
  max?: number;      // slider visual upper bound
  hardMin?: number;  // number input absolute lower bound (overrides min for typing)
  hardMax?: number;  // number input absolute upper bound (overrides max for typing)
  label?: string;
  id?: string;
}

export function WeightSlider({ value, onChange, min = -100, max = 100, hardMin, hardMax, id }: Props) {
  const uid = useId();
  const listId = `${uid}-ticks`;
  const numMin = hardMin ?? min;
  const numMax = hardMax ?? max;
  const sliderValue = Math.max(min, Math.min(max, value));
  const bipolar = min < 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          id={id}
          type="number"
          value={value}
          min={numMin}
          max={numMax}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v)) onChange(Math.max(numMin, Math.min(numMax, v)));
          }}
          style={{
            width: 68,
            background: 'var(--bg)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 13,
            fontFamily: 'var(--font)',
          }}
        />
        <div style={{ flex: 1, minWidth: 80, maxWidth: 200 }}>
          <input
            type="range"
            value={sliderValue}
            min={min}
            max={max}
            list={bipolar ? listId : undefined}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          {bipolar && (
            <datalist id={listId}>
              <option value="0" />
            </datalist>
          )}
          {bipolar && (
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 10, color: 'var(--text-muted)', marginTop: 1,
              paddingRight: 2,
            }}>
              <span>{min}</span>
              <span>0</span>
              <span>+{max}</span>
            </div>
          )}
        </div>
        <span style={{ width: 36, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
          {value}%
        </span>
      </div>
    </div>
  );
}
