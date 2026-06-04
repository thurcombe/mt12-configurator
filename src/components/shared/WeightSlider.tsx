// Combined number input + range slider for weight/offset fields.

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;          // slider + number input lower bound
  max?: number;          // slider + number input upper bound
  hardMin?: number;      // number input absolute lower bound (overrides min for typing)
  hardMax?: number;      // number input absolute upper bound (overrides max for typing)
  label?: string;
  id?: string;
}

export function WeightSlider({ value, onChange, min = -100, max = 100, hardMin, hardMax, id }: Props) {
  const numMin = hardMin ?? min;
  const numMax = hardMax ?? max;
  const sliderValue = Math.max(min, Math.min(max, value));

  return (
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
      <input
        type="range"
        value={sliderValue}
        min={min}
        max={max}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{ flex: 1, minWidth: 80, maxWidth: 200, accentColor: 'var(--accent)' }}
      />
      <span style={{ width: 36, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
        {value}%
      </span>
    </div>
  );
}
