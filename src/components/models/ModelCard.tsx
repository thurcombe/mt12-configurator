import type { Model } from '../../types/model.ts';
import { parseSubType, protocolName } from '../../codec/protocols.ts';
import css from './ModelCard.module.css';

interface Props {
  modelKey: string;
  model: Model;
  isDirty: boolean;
  imageUrl?: string;
  scale?: string;
  vehicleTypeName?: string;
  vehicleTypeImageUrl?: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onBackup?: () => void;
  onHistory?: () => void;
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

export function ModelCard({ modelKey, model, isDirty, imageUrl, scale, vehicleTypeName, vehicleTypeImageUrl, onEdit, onDuplicate, onDelete, onBackup, onHistory }: Props) {
  const name = model.header?.name;
  const displayImageUrl = imageUrl ?? vehicleTypeImageUrl;
  const isRealPhoto = !!imageUrl;
  const isPlaceholder = !displayImageUrl;

  return (
    <div className={`${css.card} ${isDirty ? css.dirty : ''}`}>
      <div className={`${css.imageWrap} ${!isRealPhoto ? css.imageWrapDefault : ''}`}>
        <img src={displayImageUrl ?? '/model-default.png'} alt={name || modelKey} className={`${css.image} ${!isRealPhoto ? css.imageContain : ''} ${isPlaceholder ? css.imageDefault : ''}`} />
      </div>
      <div className={css.header}>
        <span className={`${css.name} ${!name ? css.empty : ''}`}>
          {name || '(unnamed)'}
        </span>
        <span className={css.slotKey}>{modelKey}</span>
      </div>

      <div className={css.meta}>
        <span className="badge badge-accent">{protocolBadge(model)}</span>
        {scale && <span className="badge">{scale}</span>}
        {vehicleTypeName && <span className="badge">{vehicleTypeName}</span>}
        {model.flightModeData?.['1'] && <span className="badge badge-green">KidControl</span>}
        {isDirty && <span className="badge badge-warning">unsaved</span>}
        {model.mixData?.length > 0 && (
          <span className="badge">{model.mixData.length} mix{model.mixData.length !== 1 ? 'es' : ''}</span>
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
