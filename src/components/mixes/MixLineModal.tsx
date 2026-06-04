import { useState } from 'react';
import type { MixLine } from '../../types/model.ts';
import { SrcRawPicker } from '../shared/SrcRawPicker.tsx';
import { SwitchPicker } from '../shared/SwitchPicker.tsx';
import { WeightSlider } from '../shared/WeightSlider.tsx';
import { FlightModeCheckboxes } from '../shared/FlightModeCheckboxes.tsx';
import { Tooltip } from '../shared/Tooltip.tsx';
import css from './MixLineModal.module.css';

const MLTPX_OPTIONS = [
  { value: 'ADD', label: 'Add (+)' },
  { value: 'MUL', label: 'Multiply (×)' },
  { value: 'REPL', label: 'Replace (=)' },
];

interface Props {
  line: MixLine;
  onSave: (line: MixLine) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function MixLineModal({ line, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState<MixLine>({ ...line });
  const ch = draft.destCh + 1; // display as 1-based

  function field<K extends keyof MixLine>(key: K, value: MixLine[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleSave() {
    onSave(draft);
    onClose();
  }

  return (
    <div className={css.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={css.modal}>
        <div className={css.header}>
          <span className={css.title}>Mix line — CH{ch}</span>
          <button className={css.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={css.body}>
          <div className={css.grid}>
            <label className={css.label}>Name <Tooltip text="Short label shown in the mix list. Optional." /></label>
            <input
              type="text"
              className={css.input}
              value={draft.name ?? ''}
              maxLength={10}
              onChange={(e) => field('name', e.target.value)}
            />

            <label className={css.label}>Source <Tooltip text="The input that drives this channel — a stick, switch, pot, or another channel's output." /></label>
            <SrcRawPicker value={draft.srcRaw} onChange={(v) => field('srcRaw', v)} style={{ width: '100%' }} />

            <label className={css.label}>Multiplexer <Tooltip text="How this line combines with earlier lines on the same channel: Add (+) stacks on top; Replace (=) overrides all previous lines; Multiply (×) scales the running total." /></label>
            <select
              className={css.select}
              value={draft.mltpx}
              onChange={(e) => field('mltpx', e.target.value)}
            >
              {MLTPX_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <label className={css.label}>Weight <Tooltip text="How much of the source to apply. 100 = full range, 50 = half range. Negative flips direction." /></label>
            <WeightSlider value={draft.weight} onChange={(v) => field('weight', v)} min={-100} max={100} hardMin={-500} hardMax={500} />

            <label className={css.label}>Offset <Tooltip text="Shifts the output up or down by a fixed amount regardless of stick position." /></label>
            <WeightSlider value={draft.offset} onChange={(v) => field('offset', v)} min={-100} max={100} />

            <label className={css.label}>Switch <Tooltip text="Only apply this mix line when a specific switch is active. Leave as 'None' to always apply." /></label>
            <SwitchPicker value={draft.swtch ?? 'NONE'} onChange={(v) => field('swtch', v)} />

            <label className={css.label}>Flight modes <Tooltip text="Tick the flight modes where this line is active. An unticked mode means the line is excluded (ignored) in that mode." /></label>
            <FlightModeCheckboxes
              value={draft.flightModes}
              onChange={(v) => field('flightModes', v)}
            />

            <label className={css.label}>Delay up (×0.1s) <Tooltip text="Wait this long before the output starts increasing. 10 = 1 second delay." /></label>
            <input
              type="number"
              className={css.inputSm}
              value={draft.delayUp ?? 0}
              min={0}
              max={250}
              onChange={(e) => field('delayUp', parseInt(e.target.value, 10) || 0)}
            />

            <label className={css.label}>Delay down (×0.1s) <Tooltip text="Wait this long before the output starts decreasing." /></label>
            <input
              type="number"
              className={css.inputSm}
              value={draft.delayDown ?? 0}
              min={0}
              max={250}
              onChange={(e) => field('delayDown', parseInt(e.target.value, 10) || 0)}
            />

            <label className={css.label}>Speed up (×0.1s) <Tooltip text="How fast the output ramps up. 0 = instant; 10 = takes 1 second to reach full deflection." /></label>
            <input
              type="number"
              className={css.inputSm}
              value={draft.speedUp ?? 0}
              min={0}
              max={250}
              onChange={(e) => field('speedUp', parseInt(e.target.value, 10) || 0)}
            />

            <label className={css.label}>Speed down (×0.1s) <Tooltip text="How fast the output ramps down. Useful for gentle throttle release in kid mode." /></label>
            <input
              type="number"
              className={css.inputSm}
              value={draft.speedDown ?? 0}
              min={0}
              max={250}
              onChange={(e) => field('speedDown', parseInt(e.target.value, 10) || 0)}
            />

            <label className={css.label}>Carry trim <Tooltip text="Include the trim adjustment from the expo/input stage in this channel's output." /></label>
            <label className={css.checkLabel}>
              <input
                type="checkbox"
                checked={!!draft.carryTrim}
                onChange={(e) => field('carryTrim', e.target.checked ? 1 : 0)}
              />
              Pass trim from expo
            </label>

            <label className={css.label}>Mix warning <Tooltip text="Play a warning sound when this mix is active (optional safety reminder)." /></label>
            <select
              className={css.select}
              value={draft.mixWarn ?? 0}
              onChange={(e) => field('mixWarn', parseInt(e.target.value, 10))}
            >
              <option value={0}>None</option>
              <option value={1}>Warn 1</option>
              <option value={2}>Warn 2</option>
              <option value={3}>Warn 3</option>
            </select>
          </div>
        </div>

        <div className={css.footer}>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => { onDelete(); onClose(); }}
          >
            Delete line
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
