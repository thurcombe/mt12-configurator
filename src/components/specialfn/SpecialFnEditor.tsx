import type { Model, CustomFn } from '../../types/model.ts';
import { SwitchPicker } from '../shared/SwitchPicker.tsx';
import { Tooltip } from '../shared/Tooltip.tsx';
import { buildSwitchUsageMap } from '../../codec/modelSummary.ts';
import css from './SpecialFnEditor.module.css';

interface Props {
  model: Model;
  onChange: (updater: (m: Model) => Model) => void;
}

// Common special function names in EdgeTX.
const COMMON_FUNCS = [
  'PLAY_TRACK',
  'PLAY_VALUE',
  'PLAY_BOTH',
  'PLAY_HAPTIC',
  'RGB_LED',
  'SET_TIMER',
  'RESET_TIMER',
  'RESET_FLIGHT',
  'RESET_TELEM',
  'SET_FAILSAFE',
  'SCREENSHOT',
  'BACKLIGHT',
  'VOLUME',
  'PLAY_SCRIPT',
  'BG_MUSIC',
  'BG_MUSIC_PAUSE',
  'VARIO',
  'LOGS',
  'DISABLE_SWITCHES',
];

function blankCustomFn(): CustomFn {
  return { swtch: 'NONE', func: 'PLAY_TRACK', def: '' };
}

function nextKey(record: Record<string, unknown>): string {
  let i = 0;
  while (record[String(i)] !== undefined) i++;
  return String(i);
}

interface RowProps {
  fnKey: string;
  fn: CustomFn;
  onChange: (fn: CustomFn) => void;
  onDelete: () => void;
  inUse?: Record<string, string[]>;
}

function SpecialFnRow({ fnKey, fn, onChange, onDelete, inUse }: RowProps) {
  return (
    <tr className={css.row}>
      <td className={css.idx}>#{parseInt(fnKey) + 1}</td>

      <td>
        <SwitchPicker value={fn.swtch || 'NONE'} onChange={(v) => onChange({ ...fn, swtch: v })} style={{ fontSize: 12 }} inUse={inUse} />
      </td>

      <td>
        <select
          className={css.selectSm}
          value={fn.func}
          onChange={(e) => onChange({ ...fn, func: e.target.value })}
        >
          {COMMON_FUNCS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
          {!COMMON_FUNCS.includes(fn.func) && (
            <option value={fn.func}>{fn.func}</option>
          )}
        </select>
      </td>

      <td>
        <input
          type="text"
          className={css.defInput}
          value={fn.def ?? ''}
          placeholder="parameters…"
          onChange={(e) => onChange({ ...fn, def: e.target.value })}
        />
      </td>

      <td>
        <button className={css.deleteBtn} onClick={onDelete} title="Delete">✕</button>
      </td>
    </tr>
  );
}

export function SpecialFnEditor({ model, onChange }: Props) {
  const fnData = model.customFn ?? {};
  const entries = Object.entries(fnData).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  const inUse = buildSwitchUsageMap(model);

  function updateFn(key: string, fn: CustomFn) {
    onChange((m) => ({ ...m, customFn: { ...m.customFn, [key]: fn } }));
  }

  function deleteFn(key: string) {
    onChange((m) => {
      const s = { ...m.customFn };
      delete s[key];
      return { ...m, customFn: s };
    });
  }

  function addFn() {
    onChange((m) => {
      const key = nextKey(m.customFn);
      return { ...m, customFn: { ...m.customFn, [key]: blankCustomFn() } };
    });
  }

  return (
    <div className={css.root}>
      <div className={css.toolbar}>
        <span className={css.hint}>{entries.length} special function{entries.length !== 1 ? 's' : ''}</span>
        <button className="btn btn-ghost btn-sm" onClick={addFn}>+ Add</button>
      </div>

      {entries.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No special functions configured.</p>
      )}

      {entries.length > 0 && (
        <div className={css.tableWrap}>
          <table className={css.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Switch <Tooltip text="The trigger that activates this function." /></th>
                <th>Function <Tooltip text="What the radio does when triggered: play a sound, change a GVar, control backlight, etc." /></th>
                <th>Parameters <Tooltip text="Extra parameters for the function, like which audio file to play." /></th>
                <th />
              </tr>
            </thead>
            <tbody>
              {entries.map(([key, fn]) => (
                <SpecialFnRow
                  key={key}
                  fnKey={key}
                  fn={fn}
                  onChange={(f) => updateFn(key, f)}
                  onDelete={() => deleteFn(key)}
                  inUse={inUse}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className={css.note}>
        The <em>Parameters</em> field is function-specific. Example: <code>PLAY_TRACK</code> uses <code>filename,repeat,flags</code>.
      </p>
    </div>
  );
}
