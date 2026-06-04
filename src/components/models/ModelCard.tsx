import type { Model } from '../../types/model.ts';
import { parseSubType, protocolName } from '../../codec/protocols.ts';
import css from './ModelCard.module.css';

interface Props {
  modelKey: string;
  model: Model;
  isDirty: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
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

export function ModelCard({ modelKey, model, isDirty, onEdit, onDuplicate, onDelete, onHistory }: Props) {
  const name = model.header?.name;

  return (
    <div className={`${css.card} ${isDirty ? css.dirty : ''}`}>
      <div className={css.header}>
        <span className={`${css.name} ${!name ? css.empty : ''}`}>
          {name || '(unnamed)'}
        </span>
        <span className={css.slotKey}>{modelKey}</span>
      </div>

      <div className={css.meta}>
        <span className="badge badge-accent">{protocolBadge(model)}</span>
        {isDirty && <span className="badge badge-warning">unsaved</span>}
        {model.mixData?.length > 0 && (
          <span className="badge">{model.mixData.length} mix{model.mixData.length !== 1 ? 'es' : ''}</span>
        )}
      </div>

      <div className={css.actions}>
        <button className="btn btn-primary btn-sm" onClick={onEdit}>Edit</button>
        <button className="btn btn-ghost btn-sm" onClick={onDuplicate}>Duplicate</button>
        {onHistory && <button className="btn btn-ghost btn-sm" onClick={onHistory}>History</button>}
        <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}
