import { useEffect, useRef, useState } from 'react';
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
  const dirty = useEditorStore((s) => s.dirty);
  const loadAllModels = useEditorStore((s) => s.loadAllModels);
  const createModel = useEditorStore((s) => s.createModel);
  const duplicateModel = useEditorStore((s) => s.duplicateModel);
  const deleteModel = useEditorStore((s) => s.deleteModel);
  const importModelFromYaml = useEditorStore((s) => s.importModelFromYaml);

  const [loading, setLoading] = useState(false);
  const [historyFor, setHistoryFor] = useState<{ key: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
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

  function handleDuplicate(sourceKey: string) {
    const slot = findFreeSlot(modelKeys);
    if (!slot) return;
    duplicateModel(sourceKey, slot);
  }

  function handleDeleteConfirm() {
    if (!confirmDelete) return;
    deleteModel(confirmDelete);
    setConfirmDelete(null);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const slot = findFreeSlot(modelKeys);
    if (!slot) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const yaml = ev.target?.result as string;
      importModelFromYaml(slot, yaml);
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
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setLoading(true); loadAllModels().finally(() => setLoading(false)); }}
          >
            Refresh from card
          </button>
        )}
      </div>

      {loading ? (
        <div className={css.loading}>Loading models…</div>
      ) : (
        <div className={css.grid}>
          {modelKeys.map((key) => (
            <ModelCard
              key={key}
              modelKey={key}
              model={models[key]}
              isDirty={dirty.has(key)}
              onEdit={() => navigate({ page: 'editor', modelKey: key })}
              onDuplicate={() => handleDuplicate(key)}
              onDelete={() => setConfirmDelete(key)}
              onHistory={sdRoot ? () => setHistoryFor({ key, name: models[key]?.header?.name ?? key }) : undefined}
            />
          ))}

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

      {confirmDelete && (
        <div className={css.confirmOverlay}>
          <div className={css.confirmBox}>
            <div className={css.confirmTitle}>Delete model?</div>
            <div className={css.confirmMsg}>
              This removes <strong>{models[confirmDelete]?.header?.name || confirmDelete}</strong> from the app.
              The file on the SD card is not deleted until you save. This cannot be undone in the current session.
            </div>
            <div className={css.confirmActions}>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
