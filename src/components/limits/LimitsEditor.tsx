import type { Model, LimitData } from '../../types/model.ts';
import { Tooltip } from '../shared/Tooltip.tsx';
import css from './LimitsEditor.module.css';

interface Props {
  model: Model;
  onChange: (updater: (m: Model) => Model) => void;
}

const DEFAULT_LIMIT: LimitData = { min: -100, max: 100, offset: 0, invert: 0, name: '' };
const NUM_CHANNELS = 16;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function LimitsEditor({ model, onChange }: Props) {
  const limits: LimitData[] = model.limitData ?? [];

  function getLimit(ch: number): LimitData {
    return limits[ch] ?? { ...DEFAULT_LIMIT };
  }

  function updateLimit(ch: number, limit: LimitData) {
    onChange((m) => {
      const data: LimitData[] = m.limitData ? [...m.limitData] : Array.from({ length: NUM_CHANNELS }, () => ({ ...DEFAULT_LIMIT }));
      while (data.length < NUM_CHANNELS) data.push({ ...DEFAULT_LIMIT });
      data[ch] = limit;
      return { ...m, limitData: data };
    });
  }

  // Extended limits allow ±125, standard ±100.
  const extended = !!model.extendedLimits;
  const limitBound = extended ? 125 : 100;

  return (
    <div className={css.root}>
      <div className={css.hint}>
        Extended limits: <strong>{extended ? 'enabled (±125%)' : 'disabled (±100%)'}</strong>
      </div>

      <table className={css.table}>
        <thead>
          <tr>
            <th>CH</th>
            <th>Name</th>
            <th>Min <Tooltip text="Minimum servo output (%). -100 = full reverse. Prevents the servo from going past this point." /></th>
            <th>Max <Tooltip text="Maximum servo output (%). 100 = full forward." /></th>
            <th>Subtrim <Tooltip text="Fine-tune the servo centre position. Use this if the servo isn't perfectly centred with trim at zero." /></th>
            <th>Invert <Tooltip text="Reverse the servo direction for this channel." /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: NUM_CHANNELS }, (_, ch) => {
            const lim = getLimit(ch);
            return (
              <tr key={ch} className={css.row}>
                <td className={css.chCell}>CH{ch + 1}</td>

                <td>
                  <input
                    type="text"
                    className={css.nameInput}
                    value={lim.name ?? ''}
                    maxLength={6}
                    placeholder="—"
                    onChange={(e) => updateLimit(ch, { ...lim, name: e.target.value })}
                  />
                </td>

                <td>
                  <input
                    type="number"
                    className={css.numInput}
                    value={lim.min}
                    min={-limitBound}
                    max={0}
                    onChange={(e) => {
                      const v = clamp(parseInt(e.target.value, 10) || 0, -limitBound, 0);
                      updateLimit(ch, { ...lim, min: v });
                    }}
                  />
                </td>

                <td>
                  <input
                    type="number"
                    className={css.numInput}
                    value={lim.max}
                    min={0}
                    max={limitBound}
                    onChange={(e) => {
                      const v = clamp(parseInt(e.target.value, 10) || 0, 0, limitBound);
                      updateLimit(ch, { ...lim, max: v });
                    }}
                  />
                </td>

                <td>
                  <input
                    type="number"
                    className={css.numInput}
                    value={lim.offset}
                    min={-100}
                    max={100}
                    onChange={(e) => {
                      const v = clamp(parseInt(e.target.value, 10) || 0, -100, 100);
                      updateLimit(ch, { ...lim, offset: v });
                    }}
                  />
                </td>

                <td className={css.invertCell}>
                  <input
                    type="checkbox"
                    checked={!!lim.invert}
                    onChange={(e) => updateLimit(ch, { ...lim, invert: e.target.checked ? 1 : 0 })}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
