import type { Model } from '../../types/model.ts';
import { buildModelSummary } from '../../codec/modelSummary.ts';
import css from './ModelSummary.module.css';

interface Props {
  model: Model;
  onHoverControl?: (name: string | null) => void;
}

const ROLE_ICON: Record<string, string> = {
  Throttle: '⚡',
  Steering: '↔',
  Unknown:  '•',
};

export function ModelSummary({ model, onHoverControl }: Props) {
  const s = buildModelSummary(model);
  const name = model.header?.name || 'Unnamed model';

  function ControlChip({ ctrl }: { ctrl: string }) {
    return (
      <span
        className={css.controlChip}
        onMouseEnter={() => onHoverControl?.(ctrl)}
        onMouseLeave={() => onHoverControl?.(null)}
        title={`${ctrl} — hover to highlight on the MT12 diagram`}
      >
        {ctrl}
      </span>
    );
  }

  return (
    <div className={css.root}>
      <div className={css.header}>
        <h3 className={css.modelName}>{name}</h3>
        <span className={css.protocol}>{s.protocol}</span>
      </div>

      <p className={css.lead}>
        This profile controls {s.channels.length} channel{s.channels.length !== 1 ? 's' : ''}.
        {s.kidMode.active
          ? ` KidControl is active — FM1 "${model.flightModeData?.['1']?.name ?? 'Kid'}" triggered by ${s.kidMode.triggerSwitch ?? 'unknown switch'}.`
          : ' KidControl is not configured.'}
      </p>

      {/* Channels */}
      {s.channels.map((ch) => (
        <div key={ch.ch} className={css.channelCard}>
          <div className={css.channelHeader}>
            <span className={css.chIcon}>{ROLE_ICON[ch.role]}</span>
            <span className={css.chLabel}>
              CH{ch.ch}
              {ch.name && ch.name !== ch.role ? ` — ${ch.name}` : ch.role !== 'Unknown' ? ` — ${ch.role}` : ''}
            </span>
          </div>
          <ul className={css.lineList}>
            {ch.lines.map((l, i) => (
              <li key={i} className={`${css.lineItem} ${l.kidMode ? css.kidLine : ''}`}>
                <span className={css.lineName}>{l.friendlyName || l.detail}</span>
                {/* Hoverable control chips */}
                {l.controls.map((ctrl) => <ControlChip key={ctrl} ctrl={ctrl} />)}
                {l.friendlyName && <span className={css.lineDetail}>{l.detail}</span>}
                {l.switch && <span className={css.lineTag}>{l.switch}</span>}
                {l.kidMode && <span className={css.kidTag}>kid mode</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Expo rates */}
      {s.expos.length > 0 && (
        <div className={css.section}>
          <div className={css.sectionTitle}>Input rates &amp; expo</div>
          <div className={css.expoGrid}>
            {s.expos.map((e, i) => (
              <div key={i} className={css.expoRow}>
                <span className={css.expoSrc}>{e.source}</span>
                <span className={css.expoRate}>{e.rate}% rate</span>
                <span className={css.expoExpo}>{e.expo !== 0 ? `expo ${e.expo}` : 'linear'}</span>
                {e.switch && <span className={css.lineTag}>{e.switch}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KidControl status */}
      <div className={`${css.kidSection} ${s.kidMode.active ? css.kidActive : ''}`}>
        <span className={css.kidIcon}>{s.kidMode.active ? '🔒' : '🔓'}</span>
        <div>
          <div className={css.kidTitle}>
            {s.kidMode.active ? 'KidControl active' : 'KidControl not configured'}
          </div>
          <div className={css.kidHint}>
            {s.kidMode.active
              ? `FM1 reduces throttle and steering limits. Triggered by ${s.kidMode.triggerSwitch ?? 'a switch'}. Remove via the KidControl tab.`
              : 'Open the KidControl tab to set up reduced throttle and steering limits for younger drivers.'}
          </div>
        </div>
      </div>
    </div>
  );
}
