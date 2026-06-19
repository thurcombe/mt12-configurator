import { useEffect, useRef, useState } from 'react';
import { Toast } from '../components/shared/Toast.tsx';
import type { Route } from '../App.tsx';
import { useEditorStore } from '../store/useEditorStore.ts';
import { findFreeSlot } from '../codec/modelTemplate.ts';
import { BUILT_IN_CATEGORIES } from '../data/vehicleTypes.ts';
import { ModelCard } from '../components/models/ModelCard.tsx';
import { ModelImagePicker } from '../components/models/ModelImagePicker.tsx';
import { BackupHistory } from '../components/models/BackupHistory.tsx';
import css from './ModelList.module.css';

interface Props {
  navigate: (r: Route) => void;
  offlineBannerDismissed: boolean;
  onDismissOfflineBanner: () => void;
}

export function ModelList({ navigate, offlineBannerDismissed, onDismissOfflineBanner }: Props) {
  const sdRoot = useEditorStore((s) => s.sdRoot);
  const models = useEditorStore((s) => s.models);
  const modelImages = useEditorStore((s) => s.modelImages);
  const modelMeta = useEditorStore((s) => s.modelMeta);
  const vehicleCategories = useEditorStore((s) => s.vehicleCategories);
  const vehicleTypeImages = useEditorStore((s) => s.vehicleTypeImages);
  const kidPresets = useEditorStore((s) => s.kidPresets);
  const dirty = useEditorStore((s) => s.dirty);
  const loadAllModels = useEditorStore((s) => s.loadAllModels);
  const createModel = useEditorStore((s) => s.createModel);
  const duplicateModel = useEditorStore((s) => s.duplicateModel);
  const deleteModel = useEditorStore((s) => s.deleteModel);
  const backupModel = useEditorStore((s) => s.backupModel);
  const listBackupsForModel = useEditorStore((s) => s.listBackups);
  const deleteBackupEntry = useEditorStore((s) => s.deleteBackup);
  const importModelFromYaml = useEditorStore((s) => s.importModelFromYaml);
  const saveModel = useEditorStore((s) => s.saveModel);
  const revertModelImage = useEditorStore((s) => s.revertModelImage);
  const pendingModelImageFiles = useEditorStore((s) => s.pendingModelImageFiles);

  const [loading, setLoading] = useState(false);
  const [imagePickerFor, setImagePickerFor] = useState<{ key: string; name: string } | null>(null);
  const imagePickerSnapshot = useRef<{ prevFile: File | null; wasAlreadyDirty: boolean } | null>(null);
  const [historyFor, setHistoryFor] = useState<{ key: string; name: string } | null>(null);
  const [restoreAllOpen, setRestoreAllOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteBackupsToo, setConfirmDeleteBackupsToo] = useState(false);
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sdRoot) return;
    setLoading(true);
    loadAllModels().finally(() => setLoading(false));
  }, [sdRoot, loadAllModels]);

  const modelKeys = Object.keys(models).sort();

  function handleAddModel() {
    const slot = findFreeSlot(modelKeys);
    if (!slot) return;
    createModel(slot, '');
    navigate({ page: 'editor', modelKey: slot });
  }

  async function handleDuplicate(sourceKey: string) {
    const slot = findFreeSlot(modelKeys);
    if (!slot) return;
    await duplicateModel(sourceKey, slot);
  }

  async function handleDeleteConfirm() {
    if (!confirmDelete) return;
    if (confirmDeleteBackupsToo) {
      const modelName = models[confirmDelete]?.header?.name ?? 'unknown';
      const backups = await listBackupsForModel(modelName);
      for (const backup of backups) {
        await deleteBackupEntry(backup);
      }
    } else {
      await backupModel(confirmDelete);
    }
    deleteModel(confirmDelete);
    setConfirmDelete(null);
    setConfirmDeleteBackupsToo(false);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const slot = findFreeSlot(modelKeys);
    if (!slot) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const yaml = ev.target?.result as string;
      await importModelFromYaml(slot, yaml);
      navigate({ page: 'editor', modelKey: slot });
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className={css.page}>
      {/* Offline info banner */}
      {!sdRoot && !offlineBannerDismissed && (
        <div className={css.offlineBanner}>
          <span>💾</span>
          <span style={{ flex: 1 }}>
            No SD card connected — you can still create and edit models.
            Saving will download the YAML file to your computer instead of writing to the card.
            Use the <strong>Connect SD card</strong> button in the header when ready.
          </span>
          <button
            onClick={onDismissOfflineBanner}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <div className={css.toolbar}>
        <span className={css.toolbarTitle}>Models</span>
        {sdRoot && (
          <>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setRestoreAllOpen(true)}
            >
              Manage backups
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const modelDirty = [...dirty].some(k => k !== 'radio');
                if (modelDirty) { setConfirmRefresh(true); return; }
                setLoading(true);
                loadAllModels().finally(() => setLoading(false));
              }}
            >
              Refresh from card
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div className={css.loading}>Loading models…</div>
      ) : (
        <div className={css.grid}>
          {modelKeys.map((key) => {
            const meta = modelMeta[key];
            const vehicleTypeId = meta?.vehicleType;
            const currentCat = vehicleTypeId ? vehicleCategories.find((c) => c.id === vehicleTypeId) : undefined;
            const vehicleTypeName = currentCat?.name;
            const vehicleTypeImageUrl = vehicleTypeId ? vehicleTypeImages[vehicleTypeId] : undefined;
            const snap = meta?.kidSnapshot;
            const kidPresetName = snap ? kidPresets.find(p => p.id === snap.presetId)?.name : undefined;
            const kidActive = !!models[key]?.flightModeData?.['1'];
            let kidStale = false;
            if (kidActive && currentCat) {
              if (snap) {
                kidStale = currentCat.steeringCharacter !== snap.steeringCharacter ||
                           currentCat.powerDelivery     !== snap.powerDelivery;
              } else {
                const defaultCat = BUILT_IN_CATEGORIES.find(c => c.id === vehicleTypeId);
                if (defaultCat) {
                  kidStale = currentCat.steeringCharacter !== defaultCat.steeringCharacter ||
                             currentCat.powerDelivery     !== defaultCat.powerDelivery;
                }
              }
            }
            return (
              <ModelCard
                key={key}
                modelKey={key}
                model={models[key]}
                isDirty={dirty.has(key)}
                imageUrl={modelImages[key]}
                scale={meta?.scale}
                vehicleTypeName={vehicleTypeName}
                power={meta?.power}
                kidPresetName={kidPresetName}
                kidStale={kidStale}
                vehicleTypeImageUrl={vehicleTypeImageUrl}
                onEdit={() => navigate({ page: 'editor', modelKey: key })}
                onDuplicate={() => handleDuplicate(key)}
                onDelete={() => setConfirmDelete(key)}
                onChangeImage={() => {
                  imagePickerSnapshot.current = {
                    prevFile: pendingModelImageFiles[key] ?? null,
                    wasAlreadyDirty: dirty.has(key),
                  };
                  setImagePickerFor({ key, name: models[key]?.header?.name ?? key });
                }}
                onBackup={sdRoot ? async () => {
                  await backupModel(key);
                  setToast(`Backed up: ${models[key]?.header?.name || key}`);
                } : undefined}
                onHistory={sdRoot ? () => setHistoryFor({ key, name: models[key]?.header?.name ?? key }) : undefined}
              />
            );
          })}

          {/* New model card */}
          {modelKeys.length < 60 && (
            <button className={css.newModelPrompt} onClick={handleAddModel}>
              <span className={css.newModelPlus}>＋</span>
              <span>New model</span>
            </button>
          )}

          {/* Import YAML card */}
          {modelKeys.length < 60 && (
            <button className={css.newModelPrompt} onClick={() => importRef.current?.click()}>
              <span className={css.newModelPlus}>⬆</span>
              <span>Import YAML</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.7 }}>from file</span>
            </button>
          )}

          {/* Hidden file input */}
          <input
            ref={importRef}
            type="file"
            accept=".yml,.yaml"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </div>
      )}

      {historyFor && (
        <BackupHistory
          modelKey={historyFor.key}
          modelName={historyFor.name}
          onClose={() => setHistoryFor(null)}
        />
      )}

      {restoreAllOpen && (
        <BackupHistory onClose={() => setRestoreAllOpen(false)} />
      )}

      {imagePickerFor && (
        <div className={css.confirmOverlay}>
          <div className={css.confirmBox} style={{ width: 480, maxWidth: '95vw' }}>
            <div className={css.confirmTitle}>Change image — {imagePickerFor.name}</div>
            <ModelImagePicker modelKey={imagePickerFor.key as import('../store/useEditorStore.ts').ModelKey} extraVisible={1} />
            <div className={css.confirmActions}>
              <button className="btn btn-ghost btn-sm" onClick={async () => {
                const snap = imagePickerSnapshot.current;
                if (snap) await revertModelImage(imagePickerFor.key as import('../store/useEditorStore.ts').ModelKey, snap.prevFile, snap.wasAlreadyDirty);
                setImagePickerFor(null);
              }}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={async () => {
                if (sdRoot) await saveModel(imagePickerFor.key as import('../store/useEditorStore.ts').ModelKey);
                setImagePickerFor(null);
              }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {confirmRefresh && (
        <div className={css.confirmOverlay}>
          <div className={css.confirmBox}>
            <div className={css.confirmTitle}>Discard unsaved changes?</div>
            <div className={css.confirmMsg}>
              You have unsaved changes. Refreshing will reload all models from the card and discard them.
            </div>
            <div className={css.confirmActions}>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRefresh(false)}>Cancel</button>
              <button className="btn btn-danger btn-sm" onClick={() => {
                setConfirmRefresh(false);
                setLoading(true);
                loadAllModels().finally(() => setLoading(false));
              }}>Discard and refresh</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className={css.confirmOverlay}>
          <div className={css.confirmBox}>
            <div className={css.confirmTitle}>Delete model?</div>
            <div className={css.confirmMsg}>
              This will permanently delete <strong>{models[confirmDelete]?.header?.name || confirmDelete}</strong> from the SD card immediately. This cannot be undone.
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', marginTop: 8 }}>
              <input
                type="checkbox"
                checked={confirmDeleteBackupsToo}
                onChange={(e) => setConfirmDeleteBackupsToo(e.target.checked)}
              />
              Also delete all backups for this model
            </label>
            <div className={css.confirmActions}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setConfirmDelete(null); setConfirmDeleteBackupsToo(false); }}>Cancel</button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
