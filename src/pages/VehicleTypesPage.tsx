import { useRef, useState } from 'react';
import type { Route } from '../App.tsx';
import { useEditorStore } from '../store/useEditorStore.ts';
import { BUILT_IN_CATEGORIES, type VehicleCategory } from '../data/vehicleTypes.ts';
import { Icon } from '../components/shared/Icon.tsx';
import { faGauge, faArrowsLeftRight, faLock } from '@fortawesome/free-solid-svg-icons';
import css from './VehicleTypesPage.module.css';

interface Props {
  navigate: (r: Route) => void;
  from?: Route;
}

const BUILT_IN_IDS = new Set(BUILT_IN_CATEGORIES.map((c) => c.id));

function blankCustom(): VehicleCategory {
  return {
    id: '',
    name: '',
    icon: '🚗',
    description: '',
    speedMin: 20,
    speedMax: 50,
    steeringCharacter: 50,
    powerDelivery: 50,
  };
}

export function VehicleTypesPage({ navigate, from }: Props) {
  const vehicleCategories = useEditorStore((s) => s.vehicleCategories);
  const vehicleTypeImages = useEditorStore((s) => s.vehicleTypeImages);
  const saveVehicleCategory = useEditorStore((s) => s.saveVehicleCategory);
  const resetVehicleCategoryToDefault = useEditorStore((s) => s.resetVehicleCategoryToDefault);
  const deleteCustomVehicleCategory = useEditorStore((s) => s.deleteCustomVehicleCategory);
  const uploadVehicleTypeImage = useEditorStore((s) => s.uploadVehicleTypeImage);
  const sdRoot = useEditorStore((s) => s.sdRoot);
  const models    = useEditorStore((s) => s.models);
  const modelMeta = useEditorStore((s) => s.modelMeta);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [draft, setDraft] = useState<VehicleCategory>(blankCustom());
  const [idError, setIdError] = useState('');
  const [kidWarningModels, setKidWarningModels] = useState<{ key: string; name: string }[]>([]);
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
    if (addingNew) {
      const id = draft.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (!id) { setIdError('Name is required'); return; }
      if (vehicleCategories.some((c) => c.id === id)) {
        setIdError('A type with this ID already exists');
        return;
      }
      saveVehicleCategory({ ...draft, id });
    } else {
      const original = vehicleCategories.find((c) => c.id === draft.id);
      const characterChanged = original && (
        draft.steeringCharacter !== original.steeringCharacter ||
        draft.powerDelivery     !== original.powerDelivery
      );
      saveVehicleCategory(draft);
      if (characterChanged) {
        const affected = Object.entries(modelMeta)
          .filter(([key, meta]) => meta.vehicleType === draft.id && !!models[key]?.flightModeData?.['1'])
          .map(([key, _]) => ({ key, name: models[key]?.header?.name ?? key }));
        if (affected.length > 0) setKidWarningModels(affected);
      }
    }
    cancelEdit();
  }

  function handleReset(id: string) {
    resetVehicleCategoryToDefault(id);
    if (editingId === id) cancelEdit();
  }

  const builtIn = vehicleCategories.filter((c) => BUILT_IN_IDS.has(c.id));
  const custom = vehicleCategories.filter((c) => !BUILT_IN_IDS.has(c.id));

  return (
    <div className={css.page}>
      <div className={css.topBar}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(from ?? { page: 'list' })}>← Back</button>
        <span className={css.topBarTitle}>Vehicle Types</span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={startAdd}>+ Add custom type</button>
      </div>
      <div className={css.body}>
      <div className={css.content}>
        <p className={css.toolbarSub}>
          Define the types of vehicles you drive. The type appears as a badge on the model list
          and informs KidControl limit calculations when setting up a new model.
          {!sdRoot && <span className={css.noSd}> Connect an SD card to persist changes and images.</span>}
        </p>

      <div className={css.section}>
        <h3 className={css.sectionTitle}>Built-in types</h3>
        <div className={css.grid}>
          {builtIn.map((cat) =>
            editingId === cat.id ? (
              <TypeForm
                key={cat.id}
                draft={draft}
                idError={idError}
                isNew={false}
                isBuiltIn
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
                onReset={
                  JSON.stringify(cat) !== JSON.stringify(BUILT_IN_CATEGORIES.find(b => b.id === cat.id))
                    ? () => handleReset(cat.id)
                    : undefined
                }
              />
            )
          )}
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
                  isBuiltIn={false}
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
                isBuiltIn={false}
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
      </div>

      {/* KidControl review modal */}
      {kidWarningModels.length > 0 && (
        <div className={css.modalBackdrop}>
          <div className={css.modal}>
            <h3 className={css.modalTitle}>KidControl review needed</h3>
            <p className={css.modalBody}>
              The following {kidWarningModels.length === 1 ? 'model uses' : 'models use'} this vehicle
              type and already have KidControl active. The updated steering and power delivery values
              will affect the recommended limits — the settings for {kidWarningModels.length === 1 ? 'this model' : 'these models'} should be reviewed.
            </p>
            <ul className={css.modalList}>
              {kidWarningModels.map(({ key, name }) => (
                <li key={key}>{name}</li>
              ))}
            </ul>
            <div className={css.modalActions}>
              <button className="btn btn-primary btn-sm" onClick={() => setKidWarningModels([])}>Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Type card ─────────────────────────────────────────────────────────────────

interface TypeCardProps {
  cat: VehicleCategory;
  imageUrl?: string;
  onUploadImage: (file: File) => void;
  imageRef: (el: HTMLInputElement | null) => void;
  onRequestUpload: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReset?: () => void;
}

function steeringLabel(value: number): string {
  if (value <= 20) return 'Forgiving';
  if (value <= 40) return 'Easy';
  if (value <= 60) return 'Moderate';
  if (value <= 80) return 'Responsive';
  return 'Sharp';
}

function powerLabel(value: number): string {
  if (value <= 20) return 'Gentle';
  if (value <= 40) return 'Progressive';
  if (value <= 60) return 'Moderate';
  if (value <= 80) return 'Strong';
  return 'Aggressive';
}

function TypeCard({ cat, imageUrl, onUploadImage, imageRef, onRequestUpload, onEdit, onDelete, onReset }: TypeCardProps) {
  const src = imageUrl ?? '/model-default.png';
  const isBuiltIn = BUILT_IN_IDS.has(cat.id);
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
          {isBuiltIn && <span className={css.builtInBadge}><Icon icon={faLock} size={10} />built-in</span>}
        </div>
        <p className={css.cardDesc}>{cat.description}</p>
        <div className={css.cardMeta}>
          <span className="badge" title="Typical top speed range for this vehicle type"><Icon icon={faGauge} size={11} />{cat.speedMin}–{cat.speedMax} mph</span>
          <span className="badge" title="Steering character — how sharply the vehicle responds to steering input"><Icon icon={faArrowsLeftRight} size={11} />{steeringLabel(cat.steeringCharacter)}</span>
          <span className="badge" title="Power delivery — how instantly the motor responds to throttle input"><Icon icon={faGauge} size={11} />{powerLabel(cat.powerDelivery)}</span>
        </div>
        <div className={css.cardActions}>
          {onEdit && <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>}
          {onReset && <button className="btn btn-ghost btn-sm" onClick={onReset}>Reset</button>}
          {onDelete && <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>}
        </div>
      </div>
    </div>
  );
}

// ── Type form (add / edit) ─────────────────────────────────────────────────────

interface TypeFormProps {
  draft: VehicleCategory;
  idError: string;
  isNew: boolean;
  isBuiltIn: boolean;
  onChange: (p: Partial<VehicleCategory>) => void;
  onSave: () => void;
  onCancel: () => void;
}

function TypeForm({ draft, idError, isNew, isBuiltIn, onChange, onSave, onCancel }: TypeFormProps) {
  const inputStyle = {
    background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 4, padding: '4px 8px', fontSize: 13, fontFamily: 'var(--font)', width: '100%',
  } as const;

  return (
    <div className={`${css.card} ${css.formCard}`}>
      <div className={css.cardBody}>
        <p className={css.formTitle}>{isNew ? 'New custom type' : isBuiltIn ? 'Edit built-in type' : 'Edit type'}</p>
        {isBuiltIn && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
            Changes to built-in types are saved to your SD card and can be reset to defaults at any time.
          </p>
        )}
        <div className={css.formRow}>
          <label className={css.formLabel}>Name</label>
          <input
            style={inputStyle}
            placeholder="e.g. Rock Racer"
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            autoFocus={isNew}
            readOnly={!isNew && isBuiltIn}
          />
          {idError && <p style={{ color: 'var(--danger)', fontSize: 11, margin: '2px 0 0' }}>{idError}</p>}
        </div>
        {!isBuiltIn && (
          <div className={css.formRow}>
            <label className={css.formLabel}>Icon</label>
            <input
              style={{ ...inputStyle, width: 60 }}
              value={draft.icon}
              onChange={(e) => onChange({ icon: e.target.value })}
              maxLength={4}
            />
          </div>
        )}
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
          <label className={css.formLabel}>Steering character</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 42 }}>Stable</span>
            <input
              type="range"
              min={0}
              max={100}
              value={draft.steeringCharacter}
              onChange={(e) => onChange({ steeringCharacter: parseInt(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 42, textAlign: 'right' }}>Twitchy</span>
            <span style={{ fontSize: 12, fontFamily: 'var(--mono)', minWidth: 28, textAlign: 'right' }}>{draft.steeringCharacter}</span>
          </div>
        </div>
        <div className={css.formRow}>
          <label className={css.formLabel}>Power delivery</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 42 }}>Smooth</span>
            <input
              type="range"
              min={0}
              max={100}
              value={draft.powerDelivery}
              onChange={(e) => onChange({ powerDelivery: parseInt(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 42, textAlign: 'right' }}>Punchy</span>
            <span style={{ fontSize: 12, fontFamily: 'var(--mono)', minWidth: 28, textAlign: 'right' }}>{draft.powerDelivery}</span>
          </div>
        </div>
        <div className={css.formActions}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
