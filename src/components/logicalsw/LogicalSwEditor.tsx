import type { Model, LogicalSw } from '../../types/model.ts';
import { decodeDef, encodeDef, defArgCount } from '../../codec/logicalSwDef.ts';
import { SrcRawPicker } from '../shared/SrcRawPicker.tsx';
import { SwitchPicker } from '../shared/SwitchPicker.tsx';
import { Tooltip } from '../shared/Tooltip.tsx';
import { buildSwitchUsageMap } from '../../codec/modelSummary.ts';
import css from './LogicalSwEditor.module.css';

interface Props {
  model: Model;
  onChange: (updater: (m: Model) => Model) => void;
}

const LS_FUNCS = [
  { value: 'FUNC_VEQUAL', label: 'a = x', category: 'Comparison' },
  { value: 'FUNC_VNEG',   label: 'a < x', category: 'Comparison' },
  { value: 'FUNC_VPOS',   label: 'a > x', category: 'Comparison' },
  { value: 'FUNC_APOS',   label: '|a| > x', category: 'Comparison' },
  { value: 'FUNC_ANEG',   label: '|a| < x', category: 'Comparison' },
  { value: 'FUNC_AND',    label: 'AND', category: 'Logic' },
  { value: 'FUNC_OR',     label: 'OR', category: 'Logic' },
  { value: 'FUNC_XOR',    label: 'XOR', category: 'Logic' },
  { value: 'FUNC_DPOS',   label: 'd > 0 (rising)', category: 'Delta' },
  { value: 'FUNC_DNEG',   label: 'd < 0 (falling)', category: 'Delta' },
  { value: 'FUNC_STICKY', label: 'Sticky', category: 'Latch' },
  { value: 'FUNC_LATCH',  label: 'Latch', category: 'Latch' },
  { value: 'FUNC_EDGE',   label: 'Edge', category: 'Edge' },
  { value: 'FUNC_TIMER',  label: 'Timer', category: 'Timer' },
  { value: 'FUNC_DELTA',  label: 'Delta', category: 'Timer' },
];

const FUNC_CATEGORIES = ['Comparison', 'Logic', 'Delta', 'Latch', 'Edge', 'Timer'];

// Which arg positions take a switch vs srcRaw vs a number?
type ArgKind = 'switch' | 'srcraw' | 'number';

function argKinds(func: string): ArgKind[] {
  switch (func) {
    case 'FUNC_AND':
    case 'FUNC_OR':
    case 'FUNC_XOR':
      return ['switch', 'switch'];
    case 'FUNC_STICKY':
    case 'FUNC_LATCH':
      return ['switch', 'switch'];
    case 'FUNC_EDGE':
      return ['switch', 'number', 'number'];
    case 'FUNC_DPOS':
    case 'FUNC_DNEG':
      return ['srcraw'];
    case 'FUNC_VEQUAL':
    case 'FUNC_VNEG':
    case 'FUNC_VPOS':
    case 'FUNC_APOS':
    case 'FUNC_ANEG':
      return ['srcraw', 'number'];
    case 'FUNC_TIMER':
    case 'FUNC_DELTA':
      return ['number', 'number'];
    default:
      return ['number', 'number'];
  }
}

const ARG_LABELS: Record<string, string[]> = {
  FUNC_AND:    ['Switch A', 'Switch B'],
  FUNC_OR:     ['Switch A', 'Switch B'],
  FUNC_XOR:    ['Switch A', 'Switch B'],
  FUNC_STICKY: ['Set (S)', 'Reset (R)'],
  FUNC_LATCH:  ['Set (S)', 'Reset (R)'],
  FUNC_EDGE:   ['Switch', 'Low (ms)', 'High (ms)'],
  FUNC_DPOS:   ['Source'],
  FUNC_DNEG:   ['Source'],
  FUNC_VEQUAL: ['Source', 'Value'],
  FUNC_VNEG:   ['Source', 'Value'],
  FUNC_VPOS:   ['Source', 'Value'],
  FUNC_APOS:   ['Source', 'Value'],
  FUNC_ANEG:   ['Source', 'Value'],
  FUNC_TIMER:  ['Timer 1 (s)', 'Timer 2 (s)'],
  FUNC_DELTA:  ['Source', 'Delta'],
};

function blankLs(): LogicalSw {
  return { func: 'FUNC_AND', def: 'NONE,NONE', andsw: 'NONE', delay: 0, duration: 0 };
}

function nextKey(record: Record<string, unknown>): string {
  let i = 0;
  while (record[String(i)] !== undefined) i++;
  return String(i);
}

interface RowProps {
  lsKey: string;
  ls: LogicalSw;
  onChange: (ls: LogicalSw) => void;
  onDelete: () => void;
  inUse?: Record<string, string[]>;
}

function LogicalSwRow({ lsKey, ls, onChange, onDelete, inUse }: RowProps) {
  const decoded = decodeDef(ls.func, ls.def);
  const kinds = argKinds(ls.func);
  const labels = ARG_LABELS[ls.func] ?? kinds.map((_, i) => `Arg ${i + 1}`);
  const count = defArgCount(ls.func);

  function setArg(i: number, val: string) {
    const args = [...decoded.args];
    while (args.length <= i) args.push('');
    args[i] = val;
    onChange({ ...ls, def: encodeDef(ls.func, args.slice(0, count)) });
  }

  function setFunc(func: string) {
    // Reset def when function changes.
    const newCount = defArgCount(func);
    const newKinds = argKinds(func);
    const defaults = newKinds.map((k) => k === 'switch' ? 'NONE' : k === 'srcraw' ? 'TH' : '0');
    onChange({ ...ls, func, def: encodeDef(func, defaults.slice(0, newCount)) });
  }

  return (
    <tr className={css.row}>
      <td className={css.lsLabel}>L{parseInt(lsKey) + 1}</td>

      <td>
        <select
          className={css.selectSm}
          value={ls.func}
          onChange={(e) => setFunc(e.target.value)}
        >
          {FUNC_CATEGORIES.map((cat) => (
            <optgroup key={cat} label={cat}>
              {LS_FUNCS.filter((f) => f.category === cat).map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </td>

      {/* Render arg cells (up to 3) */}
      {Array.from({ length: 3 }, (_, i) => {
        if (i >= count) return <td key={i} />;
        const kind = kinds[i] ?? 'number';
        const val = decoded.args[i] ?? '';
        const label = labels[i] ?? `Arg ${i + 1}`;
        return (
          <td key={i} title={label}>
            {kind === 'switch' && (
              <SwitchPicker value={val || 'NONE'} onChange={(v) => setArg(i, v)} style={{ fontSize: 12 }} inUse={inUse} />
            )}
            {kind === 'srcraw' && (
              <SrcRawPicker value={val || 'TH'} onChange={(v) => setArg(i, v)} style={{ fontSize: 12 }} />
            )}
            {kind === 'number' && (
              <input
                type="text"
                className={css.numInput}
                value={val}
                placeholder="0"
                onChange={(e) => setArg(i, e.target.value)}
              />
            )}
          </td>
        );
      })}

      <td>
        <SwitchPicker value={ls.andsw || 'NONE'} onChange={(v) => onChange({ ...ls, andsw: v })} style={{ fontSize: 12 }} inUse={inUse} />
      </td>

      <td>
        <input
          type="number"
          className={css.numInput}
          value={ls.delay ?? 0}
          min={0}
          style={{ width: 52 }}
          onChange={(e) => onChange({ ...ls, delay: parseInt(e.target.value, 10) || 0 })}
        />
      </td>

      <td>
        <input
          type="number"
          className={css.numInput}
          value={ls.duration ?? 0}
          min={0}
          style={{ width: 52 }}
          onChange={(e) => onChange({ ...ls, duration: parseInt(e.target.value, 10) || 0 })}
        />
      </td>

      <td>
        <button className={css.deleteBtn} onClick={onDelete} title="Delete">✕</button>
      </td>
    </tr>
  );
}

export function LogicalSwEditor({ model, onChange }: Props) {
  const lsData = model.logicalSw ?? {};
  const entries = Object.entries(lsData).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  const inUse = buildSwitchUsageMap(model);

  function updateLs(key: string, ls: LogicalSw) {
    onChange((m) => ({ ...m, logicalSw: { ...m.logicalSw, [key]: ls } }));
  }

  function deleteLs(key: string) {
    onChange((m) => {
      const s = { ...m.logicalSw };
      delete s[key];
      return { ...m, logicalSw: s };
    });
  }

  function addLs() {
    onChange((m) => {
      const key = nextKey(m.logicalSw);
      return { ...m, logicalSw: { ...m.logicalSw, [key]: blankLs() } };
    });
  }

  return (
    <div className={css.root}>
      <div className={css.toolbar}>
        <span className={css.hint}>{entries.length} logical switch{entries.length !== 1 ? 'es' : ''}</span>
        <button className="btn btn-ghost btn-sm" onClick={addLs}>+ Add</button>
      </div>

      {entries.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No logical switches configured.</p>
      )}

      {entries.length > 0 && (
        <div className={css.tableWrap}>
          <table className={css.table}>
            <thead>
              <tr>
                <th>L#</th>
                <th>Function <Tooltip text="The condition type. Comparisons check if a value is above/below a threshold. AND/OR combine two switches. Sticky latches on when triggered and stays on until reset." /></th>
                <th>Arg 1</th>
                <th>Arg 2</th>
                <th>Arg 3</th>
                <th>AND sw <Tooltip text="An extra condition that must also be true for this logical switch to activate. Leave as 'None' to ignore." /></th>
                <th>Delay <Tooltip text="How long (in 0.1s) the condition must be continuously true before the switch activates." /></th>
                <th>Duration <Tooltip text="How long (in 0.1s) the switch stays active after triggering, then automatically resets." /></th>
                <th />
              </tr>
            </thead>
            <tbody>
              {entries.map(([key, ls]) => (
                <LogicalSwRow
                  key={key}
                  lsKey={key}
                  ls={ls}
                  onChange={(l) => updateLs(key, l)}
                  onDelete={() => deleteLs(key)}
                  inUse={inUse}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
