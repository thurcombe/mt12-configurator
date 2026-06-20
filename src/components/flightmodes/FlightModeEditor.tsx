import { useState } from 'react';
import type { Model, FlightModeData } from '../../types/model.ts';
import { SwitchPicker } from '../shared/SwitchPicker.tsx';
import { Tooltip } from '../shared/Tooltip.tsx';
import { buildSwitchUsageMap } from '../../codec/modelSummary.ts';
import css from './FlightModeEditor.module.css';

interface Props {
  model: Model;
  onChange: (updater: (m: Model) => Model) => void;
}

const TRIM_MODES = [
  { value: 0, label: 'Own' },
  { value: 1, label: 'Use FM0' },
  { value: 2, label: 'Use FM1' },
  { value: 3, label: 'Use FM2' },
  { value: 4, label: 'Use FM3' },
  { value: 5, label: 'Use FM4' },
  { value: 6, label: 'Use FM5' },
  { value: 7, label: 'Use FM6' },
  { value: 8, label: 'Use FM7' },
];

const FADE_STEP = 0.1; // each unit = 0.1s

function fmLabel(idx: string, fm: FlightModeData) {
  const n = parseInt(idx, 10);
  const name = fm.name?.trim();
  if (n === 0) return name ? `FM0 — ${name} (Default)` : 'FM0 — Default';
  return name ? `FM${n} — ${name}` : `FM${n}`;
}

const MAX_FM = 9;

const DEFAULT_FM: FlightModeData = {
  name: '',
  swtch: 'NONE',
  fadeIn: 0,
  fadeOut: 0,
  trim: {},
  gvars: {},
};

interface FmPanelProps {
  idx: string;
  fm: FlightModeData;
  isDefault: boolean;
  onChange: (fm: FlightModeData) => void;
  onRemove?: () => void;
  initialOpen?: boolean;
  inUse?: Record<string, string[]>;
}

function FmPanel({ idx, fm, isDefault, onChange, onRemove, initialOpen, inUse }: FmPanelProps) {
  const [open, setOpen] = useState(initialOpen ?? idx === '0');
  const trimEntries = Object.entries(fm.trim ?? {});
  const gvarEntries = Object.entries(fm.gvars ?? {});

  return (
    <div className={css.panel}>
      <button className={css.panelHeader} onClick={() => setOpen((o) => !o)}>
        <span className={css.caret}>{open ? '▾' : '▸'}</span>
        <span className={css.panelTitle}>{fmLabel(idx, fm)}</span>
        {isDefault && <span className="badge" title="This flight mode is always active when no other is triggered">default</span>}
        {!isDefault && fm.swtch && fm.swtch !== 'NONE' && (
          <span className="badge badge-accent" title="Switch that activates this flight mode">{fm.swtch}</span>
        )}
        {(fm.fadeIn || fm.fadeOut) ? (
          <span className={css.fadeHint}>fade {fm.fadeIn * FADE_STEP}s / {fm.fadeOut * FADE_STEP}s</span>
        ) : null}
      </button>

      {open && (
        <div className={css.body}>
          <div className={css.grid}>
            <label className={css.label}>Name <Tooltip text="Label for this flight mode. Shown on screen when the mode is active." /></label>
            <input
              type="text"
              className={css.input}
              value={fm.name ?? ''}
              maxLength={10}
              onChange={(e) => onChange({ ...fm, name: e.target.value })}
            />

            {!isDefault && (
              <>
                <label className={css.label}>Switch <Tooltip text="The physical switch that activates this flight mode. When flipped, the radio instantly switches to these settings." /></label>
                <SwitchPicker value={fm.swtch ?? 'NONE'} onChange={(v) => onChange({ ...fm, swtch: v })} inUse={inUse} />
              </>
            )}

            <label className={css.label}>Fade in (× 0.1s) <Tooltip text="How long to blend in when entering this mode. 0 = instant snap; 5 = half-second smooth transition." /></label>
            <input
              type="number"
              className={css.input}
              value={fm.fadeIn ?? 0}
              min={0}
              max={25}
              onChange={(e) => onChange({ ...fm, fadeIn: parseInt(e.target.value, 10) || 0 })}
            />

            <label className={css.label}>Fade out (× 0.1s) <Tooltip text="How long to blend out when leaving this mode." /></label>
            <input
              type="number"
              className={css.input}
              value={fm.fadeOut ?? 0}
              min={0}
              max={25}
              onChange={(e) => onChange({ ...fm, fadeOut: parseInt(e.target.value, 10) || 0 })}
            />
          </div>

          {trimEntries.length > 0 && (
            <>
              <h4 className={css.sectionTitle}>Trims</h4>
              <div className={css.grid}>
                {trimEntries.map(([trimKey, trim]) => (
                  <div key={trimKey} className={css.trimRow}>
                    <span className={css.trimLabel}>{trimKey.toUpperCase()}</span>
                    <select
                      className={css.selectSm}
                      value={trim.mode ?? 0}
                      onChange={(e) => {
                        const mode = parseInt(e.target.value, 10);
                        onChange({
                          ...fm,
                          trim: { ...fm.trim, [trimKey]: { ...trim, mode } },
                        });
                      }}
                    >
                      {TRIM_MODES.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <Tooltip text="'Use FM0' borrows FM0's trim value instead of having a separate one for this mode." />
                    {(trim.mode ?? 0) === 0 && (
                      <input
                        type="number"
                        className={css.inputSm}
                        value={trim.value ?? 0}
                        min={-125}
                        max={125}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10) || 0;
                          onChange({
                            ...fm,
                            trim: { ...fm.trim, [trimKey]: { ...trim, value } },
                          });
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {gvarEntries.length > 0 && (
            <>
              <h4 className={css.sectionTitle}>GVars</h4>
              <div className={css.gvarGrid}>
                {gvarEntries.map(([gvKey, gv]) => (
                  <div key={gvKey} className={css.gvarRow}>
                    <span className={css.gvarLabel}>GV{parseInt(gvKey) + 1}</span>
                    <input
                      type="number"
                      className={css.inputSm}
                      value={gv.val ?? 0}
                      min={-1024}
                      max={1024}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        onChange({
                          ...fm,
                          gvars: { ...fm.gvars, [gvKey]: { ...gv, val } },
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {!isDefault && onRemove && (
            <div className={css.removeRow}>
              <button className="btn btn-danger btn-sm" onClick={onRemove}>Remove drive mode</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FlightModeEditor({ model, onChange }: Props) {
  const fms = model.flightModeData ?? {};
  const [newIdx, setNewIdx] = useState<string | null>(null);
  const entries = Object.entries(fms).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  const canAdd = entries.length < MAX_FM;
  const inUse = buildSwitchUsageMap(model);

  function updateFm(idx: string, fm: FlightModeData) {
    onChange((m) => ({
      ...m,
      flightModeData: { ...m.flightModeData, [idx]: fm },
    }));
  }

  function addFm() {
    const used = new Set(Object.keys(fms));
    const nextIdx = Array.from({ length: MAX_FM }, (_, i) => String(i)).find((i) => !used.has(i));
    if (!nextIdx) return;
    const fm0 = fms['0'];
    const trim: FlightModeData['trim'] = {};
    for (const key of Object.keys(fm0?.trim ?? {})) {
      trim[key] = { value: 0, mode: 1 };
    }
    setNewIdx(nextIdx);
    onChange((m) => ({
      ...m,
      flightModeData: { ...m.flightModeData, [nextIdx]: { ...DEFAULT_FM, trim } },
    }));
  }

  function removeFm(idx: string) {
    onChange((m) => {
      const next = { ...m.flightModeData };
      delete next[idx];
      return { ...m, flightModeData: next };
    });
  }

  return (
    <div className={css.root}>
      {entries.length === 0 && (
        <p style={{ color: 'var(--text-muted)', padding: '4px 0' }}>No drive modes configured.</p>
      )}
      {entries.map(([idx, fm]) => (
        <FmPanel
          key={idx}
          idx={idx}
          fm={fm}
          isDefault={idx === '0'}
          onChange={(f) => updateFm(idx, f)}
          onRemove={idx !== '0' ? () => removeFm(idx) : undefined}
          initialOpen={idx === newIdx}
          inUse={inUse}
        />
      ))}
      {canAdd && (
        <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={addFm}>
          + Add drive mode
        </button>
      )}
    </div>
  );
}
