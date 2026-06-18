import { useState } from 'react';
import type { Model, Timer } from '../../types/model.ts';
import { SwitchPicker } from '../shared/SwitchPicker.tsx';
import { Tooltip } from '../shared/Tooltip.tsx';
import css from './TimerEditor.module.css';

interface Props {
  model: Model;
  onChange: (updater: (m: Model) => Model) => void;
}

const TIMER_MODES: { value: string | number; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 1, label: 'Abs. (absolute)' },
  { value: 2, label: 'Thrn (throttle notch)' },
  { value: 3, label: 'THp (throttle %)' },
  { value: 4, label: 'THt (throttle time)' },
  { value: 5, label: 'Elap (elapsed)' },
  { value: 6, label: 'Swtch' },
];

function secondsToHMS(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

const MAX_TIMERS = 3;

const DEFAULT_TIMER: Timer = {
  name: '',
  mode: 0,
  swtch: 'NONE',
  value: 0,
  start: 0,
  countdownBeep: 0,
  minuteBeep: 0,
  persistent: 0,
  countdownStart: 5,
  showElapsed: 0,
  extraHaptic: 0,
};

function TimerRow({ idx, timer, onChange, onRemove, initialOpen }: { idx: string; timer: Timer; onChange: (t: Timer) => void; onRemove: () => void; initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen ?? false);
  const title = timer.name?.trim() || `Timer ${parseInt(idx) + 1}`;

  return (
    <div className={css.panel}>
      <button className={css.panelHeader} onClick={() => setOpen((o) => !o)}>
        <span className={css.chevron}>{open ? '▾' : '▸'}</span>
        <span className={css.panelTitle}>{title}</span>
        <span className={css.hint}>{timer.value ? secondsToHMS(timer.value) : '—'}</span>
      </button>

      {open && (
        <>
          <div className={css.grid}>
            <label className={css.label}>Name</label>
            <input
              type="text"
              className={css.input}
              value={timer.name ?? ''}
              maxLength={10}
              onChange={(e) => onChange({ ...timer, name: e.target.value })}
            />

            <label className={css.label}>Mode <Tooltip text="When the timer runs: Off = disabled; Absolute = always counts; THp = counts while throttle is applied; Swtch = counts while the chosen switch is on." /></label>
            <select
              className={css.select}
              value={timer.mode}
              onChange={(e) => {
                const v = e.target.value;
                const parsed = parseInt(v, 10);
                onChange({ ...timer, mode: isNaN(parsed) ? v : parsed });
              }}
            >
              {TIMER_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
              {!TIMER_MODES.find((m) => String(m.value) === String(timer.mode)) && (
                <option value={timer.mode}>{timer.mode}</option>
              )}
            </select>

            <label className={css.label}>Switch <Tooltip text="The switch that starts/stops the timer (only used when Mode is 'Swtch')." /></label>
            <SwitchPicker value={timer.swtch ?? 'NONE'} onChange={(v) => onChange({ ...timer, swtch: v })} />

            <label className={css.label}>Start value (s) <Tooltip text="Countdown start time in seconds. Set to 0 for a count-up timer." /></label>
            <input
              type="number"
              className={css.input}
              value={timer.start ?? 0}
              min={0}
              onChange={(e) => onChange({ ...timer, start: parseInt(e.target.value, 10) || 0 })}
            />

            <label className={css.label}>Countdown beep <Tooltip text="Audible warning as the timer approaches zero — None, Beeps, Voice, or Haptic." /></label>
            <select
              className={css.select}
              value={timer.countdownBeep ?? 0}
              onChange={(e) => onChange({ ...timer, countdownBeep: parseInt(e.target.value, 10) })}
            >
              <option value={0}>None</option>
              <option value={1}>Beeps</option>
              <option value={2}>Voice</option>
              <option value={3}>Haptic</option>
            </select>

            <label className={css.label}>Minute beep <Tooltip text="Beep once every minute while the timer is running." /></label>
            <label className={css.checkLabel}>
              <input
                type="checkbox"
                checked={!!timer.minuteBeep}
                onChange={(e) => onChange({ ...timer, minuteBeep: e.target.checked ? 1 : 0 })}
              />
              Beep every minute
            </label>

            <label className={css.label}>Persistent <Tooltip text="Remember the timer value when the radio is switched off and back on." /></label>
            <label className={css.checkLabel}>
              <input
                type="checkbox"
                checked={!!timer.persistent}
                onChange={(e) => onChange({ ...timer, persistent: e.target.checked ? 1 : 0 })}
              />
              Save value across power cycles
            </label>
          </div>

          <div className={css.removeRow}>
            <button className="btn btn-danger btn-sm" onClick={onRemove}>Remove timer</button>
          </div>
        </>
      )}
    </div>
  );
}

export function TimerEditor({ model, onChange }: Props) {
  const timers = model.timers ?? {};
  const [newIdx, setNewIdx] = useState<string | null>(null);

  function updateTimer(idx: string, timer: Timer) {
    onChange((m) => ({
      ...m,
      timers: { ...m.timers, [idx]: timer },
    }));
  }

  function addTimer() {
    const used = new Set(Object.keys(timers));
    const nextIdx = ['0', '1', '2'].find((i) => !used.has(i));
    if (!nextIdx) return;
    setNewIdx(nextIdx);
    onChange((m) => ({
      ...m,
      timers: { ...m.timers, [nextIdx]: { ...DEFAULT_TIMER } },
    }));
  }

  function removeTimer(idx: string) {
    onChange((m) => {
      const next = { ...m.timers };
      delete next[idx];
      return { ...m, timers: next };
    });
  }

  const entries = Object.entries(timers).sort(([a], [b]) => parseInt(a) - parseInt(b));
  const canAdd = entries.length < MAX_TIMERS;

  return (
    <div className={css.root}>
      {entries.length === 0 && (
        <p style={{ color: 'var(--text-muted)', padding: '12px 0' }}>No timers configured.</p>
      )}
      {entries.map(([idx, timer]) => (
        <TimerRow
          key={idx}
          idx={idx}
          timer={timer}
          onChange={(t) => updateTimer(idx, t)}
          onRemove={() => removeTimer(idx)}
          initialOpen={idx === newIdx}
        />
      ))}
      {canAdd && (
        <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={addTimer}>
          + Add timer
        </button>
      )}
    </div>
  );
}
