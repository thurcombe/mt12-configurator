import { useEffect, useRef, useState } from 'react';
import { Toast } from '../components/shared/Toast.tsx';
import type { Route } from '../App.tsx';
import { useEditorStore } from '../store/useEditorStore.ts';
import { findFreeSlot } from '../codec/modelTemplate.ts';
import { ModelCard } from '../components/models/ModelCard.tsx';
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
  const dirty = useEditorStore((s) => s.dirty);
  const loadAllModels = useEditorStore((s) => s.loadAllModels);
  const createModel = useEditorStore((s) => s.createModel);
  const duplicateModel = useEditorStore((s) => s.duplicateModel);
  const deleteModel = useEditorStore((s) => s.deleteModel);
  const backupModel = useEditorStore((s) => s.backupModel);
  const listBackupsForModel = useEditorStore((s) => s.listBackups);
  const deleteBackupEntry = useEditorStore((s) => s.deleteBackup);
  const importModelFromYaml = useEditorStore((s) => s.importModelFromYaml);

  const [loading, setLoading] = useState(false);
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
            const vehicleTypeId = modelMeta[key]?.vehicleType;
            const vehicleTypeName = vehicleTypeId
              ? vehicleCategories.find((c) => c.id === vehicleTypeId)?.name
              : undefined;
            const vehicleTypeImageUrl = vehicleTypeId ? vehicleTypeImages[vehicleTypeId] : undefined;
            return (
              <ModelCard
                key={key}
                modelKey={key}
                model={models[key]}
                isDirty={dirty.has(key)}
                imageUrl={modelImages[key]}
                scale={modelMeta[key]?.scale}
                vehicleTypeName={vehicleTypeName}
                power={modelMeta[key]?.power}
                vehicleTypeImageUrl={vehicleTypeImageUrl}
                onEdit={() => navigate({ page: 'editor', modelKey: key })}
                onDuplicate={() => handleDuplicate(key)}
                onDelete={() => setConfirmDelete(key)}
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
