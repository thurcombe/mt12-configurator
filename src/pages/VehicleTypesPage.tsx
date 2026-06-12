import { useRef, useState } from 'react';
import type { Route } from '../App.tsx';
import { useEditorStore } from '../store/useEditorStore.ts';
import { BUILT_IN_CATEGORIES, type VehicleCategory } from '../data/vehicleTypes.ts';
import { VEHICLE_LABELS } from '../components/kidmode/kidDefaults.ts';
import css from './VehicleTypesPage.module.css';

interface Props {
  navigate: (r: Route) => void;
}

const KID_TYPE_LABELS: Record<string, string> = {
  crawler: 'Crawler preset',
  sport: 'Sport preset',
  rally: 'Rally preset',
  highspeed: 'High-speed preset',
};

const KID_TYPE_OPTIONS = Object.entries(VEHICLE_LABELS).map(([id, label]) => ({ id, label }));

const BUILT_IN_IDS = new Set(BUILT_IN_CATEGORIES.map((c) => c.id));

function blankCustom(): VehicleCategory {
  return {
    id: '',
    name: '',
    icon: '🚗',
    description: '',
    speedMin: 20,
    speedMax: 50,
    kidType: 'sport',
    custom: true,
  };
}

export function VehicleTypesPage({ navigate }: Props) {
  const vehicleCategories = useEditorStore((s) => s.vehicleCategories);
  const vehicleTypeImages = useEditorStore((s) => s.vehicleTypeImages);
  const saveCustomVehicleCategory = useEditorStore((s) => s.saveCustomVehicleCategory);
  const deleteCustomVehicleCategory = useEditorStore((s) => s.deleteCustomVehicleCategory);
  const uploadVehicleTypeImage = useEditorStore((s) => s.uploadVehicleTypeImage);
  const sdRoot = useEditorStore((s) => s.sdRoot);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [draft, setDraft] = useState<VehicleCategory>(blankCustom());
  const [idError, setIdError] = useState('');
  const imageRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function startEdit(cat: VehicleCategory) {
    setDraft({ ...cat });
    setEditingId(cat.id);
    setAddingNew(false);
    setIdError('');
  }

  function startAdd() {
    setDraft(blankCustom());
    setAddingNew(true);
    setEditingId(null);
    setIdError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setAddingNew(false);
    setIdError('');
  }

  function patchDraft(p: Partial<VehicleCategory>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function saveEdit() {
    const id = draft.id.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!id) { setIdError('Name is required'); return; }
    if (addingNew && vehicleCategories.some((c) => c.id === id)) {
      setIdError('A type with this ID already exists');
      return;
    }
    const cat: VehicleCategory = { ...draft, id, custom: true };
    saveCustomVehicleCategory(cat);
    cancelEdit();
  }

  const builtIn = vehicleCategories.filter((c) => !c.custom);
  const custom = vehicleCategories.filter((c) => c.custom);

  return (
    <div className={css.page}>
      <div className={css.toolbar}>
        <div>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }} onClick={() => navigate({ page: 'list' })}>
            ← Back to models
          </button>
          <div className={css.toolbarTitle}>Vehicle Types</div>
          <p className={css.toolbarSub}>
            Define the types of vehicles you drive. The type appears as a badge on the model list
            and pre-selects KidControl limits when setting up a new model.
            {!sdRoot && <span className={css.noSd}> Connect an SD card to persist custom types and images.</span>}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={startAdd}>+ Add custom type</button>
      </div>

      <div className={css.section}>
        <h3 className={css.sectionTitle}>Built-in types</h3>
        <div className={css.grid}>
          {builtIn.map((cat) => (
            <TypeCard
              key={cat.id}
              cat={cat}
              imageUrl={vehicleTypeImages[cat.id]}
              onUploadImage={(file) => uploadVehicleTypeImage(cat.id, file)}
              imageRef={(el) => { imageRefs.current[cat.id] = el; }}
              onRequestUpload={() => imageRefs.current[cat.id]?.click()}
              readOnly
            />
          ))}
        </div>
      </div>

      {(custom.length > 0 || addingNew) && (
        <div className={css.section}>
          <h3 className={css.sectionTitle}>Custom types</h3>
          <div className={css.grid}>
            {custom.map((cat) =>
              editingId === cat.id ? (
                <TypeForm
                  key={cat.id}
                  draft={draft}
                  idError={idError}
                  isNew={false}
                  onChange={patchDraft}
                  onSave={saveEdit}
                  onCancel={cancelEdit}
                />
              ) : (
                <TypeCard
                  key={cat.id}
                  cat={cat}
                  imageUrl={vehicleTypeImages[cat.id]}
                  onUploadImage={(file) => uploadVehicleTypeImage(cat.id, file)}
                  imageRef={(el) => { imageRefs.current[cat.id] = el; }}
                  onRequestUpload={() => imageRefs.current[cat.id]?.click()}
                  onEdit={() => startEdit(cat)}
                  onDelete={() => deleteCustomVehicleCategory(cat.id)}
                />
              )
            )}
            {addingNew && (
              <TypeForm
                draft={draft}
                idError={idError}
                isNew
                onChange={patchDraft}
                onSave={saveEdit}
                onCancel={cancelEdit}
              />
            )}
          </div>
        </div>
      )}

      {!addingNew && custom.length === 0 && (
        <p className={css.emptyHint}>No custom types yet — click "Add custom type" to create one.</p>
      )}
    </div>
  );
}

// ── Type card ─────────────────────────────────────────────────────────────────

interface TypeCardProps {
  cat: VehicleCategory;
  imageUrl?: string;
  readOnly?: boolean;
  onUploadImage: (file: File) => void;
  imageRef: (el: HTMLInputElement | null) => void;
  onRequestUpload: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function TypeCard({ cat, imageUrl, readOnly, onUploadImage, imageRef, onRequestUpload, onEdit, onDelete }: TypeCardProps) {
  const src = imageUrl ?? '/model-default.png';
  return (
    <div className={css.card}>
      <div className={css.cardImage}>
        <img src={src} alt={cat.name} className={`${css.cardImg} ${!imageUrl ? css.cardImgDefault : ''}`} />
        <button className={css.uploadBtn} onClick={onRequestUpload} title="Set type image">📷</button>
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          ref={imageRef}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadImage(f);
            e.target.value = '';
          }}
        />
      </div>
      <div className={css.cardBody}>
        <div className={css.cardName}>
          <span className={css.cardNameIcon}>{cat.icon}</span>
          {cat.name}
          {BUILT_IN_IDS.has(cat.id) && <span className={css.builtInBadge}>built-in</span>}
        </div>
        <p className={css.cardDesc}>{cat.description}</p>
        <div className={css.cardMeta}>
          <span className="badge">{cat.speedMin}–{cat.speedMax} mph</span>
          <span className="badge badge-accent">{KID_TYPE_LABELS[cat.kidType]}</span>
        </div>
        {!readOnly && (
          <div className={css.cardActions}>
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Type form (add / edit custom) ─────────────────────────────────────────────

interface TypeFormProps {
  draft: VehicleCategory;
  idError: string;
  isNew: boolean;
  onChange: (p: Partial<VehicleCategory>) => void;
  onSave: () => void;
  onCancel: () => void;
}

function TypeForm({ draft, idError, isNew, onChange, onSave, onCancel }: TypeFormProps) {
  const inputStyle = {
    background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 4, padding: '4px 8px', fontSize: 13, fontFamily: 'var(--font)', width: '100%',
  } as const;

  return (
    <div className={`${css.card} ${css.formCard}`}>
      <div className={css.cardBody}>
        <p className={css.formTitle}>{isNew ? 'New custom type' : 'Edit type'}</p>
        <div className={css.formRow}>
          <label className={css.formLabel}>Name</label>
          <input
            style={inputStyle}
            placeholder="e.g. Rock Racer"
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            autoFocus={isNew}
          />
          {idError && <p style={{ color: 'var(--danger)', fontSize: 11, margin: '2px 0 0' }}>{idError}</p>}
        </div>
        <div className={css.formRow}>
          <label className={css.formLabel}>Icon</label>
          <input
            style={{ ...inputStyle, width: 60 }}
            value={draft.icon}
            onChange={(e) => onChange({ icon: e.target.value })}
            maxLength={4}
          />
        </div>
        <div className={css.formRow}>
          <label className={css.formLabel}>Description</label>
          <input
            style={inputStyle}
            placeholder="Short description"
            value={draft.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </div>
        <div className={css.formRow}>
          <label className={css.formLabel}>Speed range (mph)</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              style={{ ...inputStyle, width: 60 }}
              type="number"
              min={0}
              max={200}
              value={draft.speedMin}
              onChange={(e) => onChange({ speedMin: parseInt(e.target.value) || 0 })}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
            <input
              style={{ ...inputStyle, width: 60 }}
              type="number"
              min={0}
              max={200}
              value={draft.speedMax}
              onChange={(e) => onChange({ speedMax: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div className={css.formRow}>
          <label className={css.formLabel}>KidControl preset</label>
          <select
            style={{ ...inputStyle, width: 'auto' }}
            value={draft.kidType}
            onChange={(e) => onChange({ kidType: e.target.value as VehicleCategory['kidType'] })}
          >
            {KID_TYPE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className={css.formActions}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={onSave}>Save type</button>
        </div>
      </div>
    </div>
  );
}
