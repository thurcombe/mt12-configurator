import type { Model } from '../../types/model.ts';
import { parseSubType, protocolName } from '../../codec/protocols.ts';
import type { ExpansionConflict } from './expansionConflict.ts';
import { expansionConflictLabel } from './expansionConflict.ts';
import css from './ModelCard.module.css';

interface Props {
  modelKey: string;
  model: Model;
  isDirty: boolean;
  imageUrl?: string;
  scale?: string;
  vehicleTypeName?: string;
  vehicleTypeImageUrl?: string;
  power?: 'battery' | 'fuel';
  kidPresetName?: string;
  kidStale?: boolean;
  expansionConflict?: ExpansionConflict | null;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onBackup?: () => void;
  onHistory?: () => void;
  onChangeImage?: () => void;
}

function protocolBadge(model: Model): string {
  const mod = model.moduleData?.['0'];
  if (!mod) return 'No module';
  if (mod.type === 'TYPE_CROSSFIRE') return 'CROSSFIRE';
  if (mod.type === 'TYPE_MULTIMODULE') {
    const { protocol } = parseSubType(mod.subType);
    return protocolName(protocol);
  }
  return mod.type.replace('TYPE_', '');
}

export function ModelCard({ modelKey, model, isDirty, imageUrl, scale, vehicleTypeName, vehicleTypeImageUrl, power, kidPresetName, kidStale, expansionConflict, onEdit, onDuplicate, onDelete, onBackup, onHistory, onChangeImage }: Props) {
  const name = model.header?.name;
  const displayImageUrl = imageUrl ?? vehicleTypeImageUrl;
  const isRealPhoto = !!imageUrl;
  const isPlaceholder = !displayImageUrl;
  const kidActive = !!model.flightModeData?.['1'];

  return (
    <div className={`${css.card} ${isDirty ? css.dirty : ''} ${kidStale || expansionConflict ? css.stale : ''}`}>
      <div
        className={`${css.imageWrap} ${!isRealPhoto ? css.imageWrapDefault : ''}`}
        onClick={onEdit}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onEdit()}
      >
        <img
          src={displayImageUrl ?? '/model-default.png'}
          alt={name || modelKey}
          className={`${css.image} ${!isRealPhoto ? css.imageContain : ''} ${isPlaceholder ? css.imageDefault : ''}`}
        />
        {(kidStale || expansionConflict) && (
          <div className={css.staleIndicator} title={expansionConflict ? expansionConflictLabel(expansionConflict) : 'KidControl settings need review'}>⚠</div>
        )}
        {onChangeImage && (
          <button
            className={css.editImageBtn}
            onClick={(e) => { e.stopPropagation(); onChangeImage(); }}
            title="Change image"
            aria-label="Change model image"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.5 1.5L12.5 4.5L4.5 12.5H1.5V9.5L9.5 1.5Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M8 3L11 6" stroke="white" strokeWidth="1.4"/>
            </svg>
          </button>
        )}
      </div>
      <div className={css.header}>
        <span className={`${css.name} ${!name ? css.empty : ''}`}>
          {name || '(unnamed)'}
        </span>
        <span className={css.slotKey}>{modelKey}</span>
      </div>

      <div className={css.meta}>
        <span className="badge badge-accent" title="RF protocol / module type">{protocolBadge(model)}</span>
        {scale && <span className="badge" title="Scale">{scale}</span>}
        {vehicleTypeName && <span className="badge" title="Vehicle type">{vehicleTypeName}</span>}
        {power === 'battery' && <span className="badge" title="Power source">🔋 Electric</span>}
        {power === 'fuel' && <span className="badge" title="Power source">⛽ Fuel</span>}
        {kidActive && (
          <span
            className={`badge ${kidStale ? 'badge-warning' : 'badge-green'}`}
            title={kidStale ? 'KidControl settings need review — vehicle properties have changed' : 'KidControl is active on this model'}
          >
            {kidStale && '⚠ '}KidControl{kidPresetName ? ` · ${kidPresetName}` : ''}
          </span>
        )}
        {expansionConflict && (
          <span className="badge badge-warning" title={expansionConflictLabel(expansionConflict)}>
            ⚠ {expansionConflict.controls.join(', ')}
          </span>
        )}
        {isDirty && <span className="badge badge-warning" title="This model has unsaved changes">unsaved</span>}
        {model.mixData?.length > 0 && (
          <span className="badge" title="Number of mix lines configured">{model.mixData.length} mix{model.mixData.length !== 1 ? 'es' : ''}</span>
        )}
      </div>

      <div className={css.actions}>
        <button className="btn btn-primary btn-sm" onClick={onEdit}>Edit</button>
        <button className="btn btn-ghost btn-sm" onClick={onDuplicate}>Duplicate</button>
        {onBackup && <button className="btn btn-ghost btn-sm" onClick={onBackup}>Backup</button>}
        {onHistory && <button className="btn btn-ghost btn-sm" onClick={onHistory}>History</button>}
        <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}
