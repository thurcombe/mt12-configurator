import { useState } from 'react';
import type { Model, ExpoLine } from '../../types/model.ts';
import { SrcRawPicker } from '../shared/SrcRawPicker.tsx';
import { SwitchPicker } from '../shared/SwitchPicker.tsx';
import { WeightSlider } from '../shared/WeightSlider.tsx';
import { FlightModeCheckboxes } from '../shared/FlightModeCheckboxes.tsx';
import { srcRawLabel } from '../../codec/srcRaw.ts';
import { switchLabel } from '../../codec/switches.ts';
import { Tooltip } from '../shared/Tooltip.tsx';
import { buildSwitchUsageMap } from '../../codec/modelSummary.ts';
import type { ExpansionConflict } from '../models/expansionConflict.ts';
import { warnForRef } from '../models/expansionConflict.ts';
import css from './ExpoEditor.module.css';

interface Props {
  model: Model;
  onChange: (updater: (m: Model) => Model) => void;
  expansionConflict?: ExpansionConflict | null;
}

// ExpoLine.mode: bit 1 = positive, bit 2 = negative. 3 = both directions.
const MODE_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 1, label: '+ve only' },
  { value: 2, label: '−ve only' },
  { value: 3, label: 'Both' },
];

// curve.type: 0 = no curve, 1 = expo (simple value), 2+ = named curve
const CURVE_TYPES = [
  { value: 0, label: 'No curve' },
  { value: 1, label: 'Expo' },
];

function blankExpoLine(): ExpoLine {
  return {
    mode: 3,
    scale: 0,
    trimSource: 0,
    srcRaw: 'ST',
    chn: 0,
    swtch: 'NONE',
    flightModes: '000000000',
    weight: 100,
    name: '',
    offset: 0,
    curve: { type: 1, value: 0 },
  };
}

interface RowProps {
  line: ExpoLine;
  idx: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (l: ExpoLine) => void;
  onDelete: () => void;
  inUse?: Record<string, string[]>;
  expansionConflict?: ExpansionConflict | null;
}

function ExpoRow({ line, idx, expanded, onToggle, onChange, onDelete, inUse, expansionConflict }: RowProps) {
  const sw = line.swtch && line.swtch !== 'NONE' ? switchLabel(line.swtch) : null;
  const modeLabel = MODE_OPTIONS.find((m) => m.value === line.mode)?.label ?? String(line.mode);

  return (
    <div className={css.row}>
      <button className={css.rowHeader} onClick={onToggle}>
        <span className={css.caret}>{expanded ? '▾' : '▸'}</span>
        <span className={css.idx}>#{idx + 1}</span>
        <span className={css.src}>{srcRawLabel(line.srcRaw)}</span>
        <span className={css.weight}>{line.weight}%</span>
        {line.curve.type === 1 && line.curve.value !== 0 && (
          <span className={css.expo}>exp {line.curve.value}</span>
        )}
        <span className={css.mode}>{modeLabel}</span>
        {sw && <span className={css.sw}>{sw}</span>}
      </button>

      {expanded && (
        <div className={css.body}>
          <div className={css.grid}>
            <label className={css.label}>Name <Tooltip text="Short label for this dual-rate line. Optional." /></label>
            <input
              type="text"
              className={css.input}
              value={line.name ?? ''}
              maxLength={10}
              onChange={(e) => onChange({ ...line, name: e.target.value })}
            />

            <label className={css.label}>Source <Tooltip text="Which physical control this dual-rate applies to." /></label>
            <SrcRawPicker value={line.srcRaw} onChange={(v) => onChange({ ...line, srcRaw: v })} {...warnForRef(line.srcRaw, expansionConflict ?? null)} />

            <label className={css.label}>Direction <Tooltip text="Whether to apply these rates to positive stick, negative stick, or both directions." /></label>
            <select
              className={css.select}
              value={line.mode}
              onChange={(e) => onChange({ ...line, mode: parseInt(e.target.value, 10) })}
            >
              {MODE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <label className={css.label}>Weight (rate %) <Tooltip text="Maximum stick travel as a percentage. 100 = full range, 60 = 60% of full range (makes it less responsive at the extremes)." /></label>
            <WeightSlider value={line.weight} onChange={(v) => onChange({ ...line, weight: v })} min={-100} max={100} />

            <label className={css.label}>Offset <Tooltip text="Shift the centre point of this input by a fixed amount." /></label>
            <WeightSlider value={line.offset} onChange={(v) => onChange({ ...line, offset: v })} min={-100} max={100} />

            <label className={css.label}>Curve type <Tooltip text="Shape of the response. 'Expo' gives a gentle centre with snappier edges; 'No curve' is linear." /></label>
            <select
              className={css.select}
              value={line.curve.type}
              onChange={(e) => onChange({ ...line, curve: { ...line.curve, type: parseInt(e.target.value, 10) } })}
            >
              {CURVE_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {line.curve.type === 1 && (
              <>
                <label className={css.label}>Expo value <Tooltip text="Amount of curve. 0 = perfectly linear, 100 = very gentle around centre. Higher values make the stick less sensitive near the middle." /></label>
                <WeightSlider
                  value={line.curve.value}
                  onChange={(v) => onChange({ ...line, curve: { ...line.curve, value: v } })}
                  min={-100}
                  max={100}
                />
              </>
            )}

            <label className={css.label}>Switch <Tooltip text="Only use these rates when this switch is active — good for a 'race mode' vs 'normal mode'." /></label>
            <SwitchPicker value={line.swtch ?? 'NONE'} onChange={(v) => onChange({ ...line, swtch: v })} inUse={inUse} {...warnForRef(line.swtch, expansionConflict ?? null)} />

            <label className={css.label}>Flight modes <Tooltip text="Which flight modes this rate line is active in." /></label>
            <FlightModeCheckboxes value={line.flightModes} onChange={(v) => onChange({ ...line, flightModes: v })} />
          </div>

          <div className={css.rowFooter}>
            <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExpoEditor({ model, onChange, expansionConflict }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const expoData = model.expoData ?? [];
  const inUse = buildSwitchUsageMap(model);

  function toggle(i: number) {
    setExpanded((s) => {
      const n = new Set(s);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  }

  function updateLine(i: number, line: ExpoLine) {
    onChange((m) => {
      const data = [...m.expoData];
      data[i] = line;
      return { ...m, expoData: data };
    });
  }

  function deleteLine(i: number) {
    onChange((m) => ({ ...m, expoData: m.expoData.filter((_, idx) => idx !== i) }));
    setExpanded((s) => {
      const n = new Set<number>();
      for (const k of s) { if (k < i) n.add(k); else if (k > i) n.add(k - 1); }
      return n;
    });
  }

  function addLine() {
    onChange((m) => ({ ...m, expoData: [...m.expoData, blankExpoLine()] }));
  }

  return (
    <div className={css.root}>
      <div className={css.toolbar}>
        <span className={css.hint}>{expoData.length} expo line{expoData.length !== 1 ? 's' : ''}</span>
        <button className="btn btn-ghost btn-sm" onClick={addLine}>+ Add expo line</button>
      </div>

      {expoData.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No expo/dual-rate lines configured.</p>
      )}

      <div className={css.list}>
        {expoData.map((line, i) => (
          <ExpoRow
            key={i}
            idx={i}
            line={line}
            expanded={expanded.has(i)}
            onToggle={() => toggle(i)}
            onChange={(l) => updateLine(i, l)}
            onDelete={() => deleteLine(i)}
            inUse={inUse}
            expansionConflict={expansionConflict}
          />
        ))}
      </div>
    </div>
  );
}
