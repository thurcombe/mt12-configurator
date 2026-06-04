import { useEffect, useState } from 'react';
import type { BackupEntry } from '../../fs/backup.ts';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { readBackup } from '../../fs/backup.ts';
import css from './BackupHistory.module.css';

interface Props {
  modelKey: string;
  modelName: string;
  onClose: () => void;
}

export function BackupHistory({ modelKey, modelName, onClose }: Props) {
  const sdRoot = useEditorStore((s) => s.sdRoot);
  const listBackups = useEditorStore((s) => s.listBackups);
  const restoreBackup = useEditorStore((s) => s.restoreBackup);

  const [entries, setEntries] = useState<BackupEntry[]>([]);
  const [selected, setSelected] = useState<BackupEntry | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    listBackups(modelName).then(setEntries);
  }, [modelName, listBackups]);

  useEffect(() => {
    if (!selected || !sdRoot) { setPreviewContent(null); return; }
    readBackup(sdRoot, selected).then(setPreviewContent).catch(() => setPreviewContent('(error reading backup)'));
  }, [selected, sdRoot]);

  async function handleRestore() {
    if (!selected) return;
    setRestoring(true);
    await restoreBackup(modelKey, selected);
    setRestoring(false);
    onClose();
  }

  function formatTimestamp(ts: string): string {
    // "2026-06-04T14-30-00" → "04 Jun 2026  14:30:00"
    try {
      const [date, time] = ts.split('T');
      const timeFormatted = time?.replace(/-/g, ':') ?? '';
      return `${date}  ${timeFormatted}`;
    } catch {
      return ts;
    }
  }

  return (
    <div className={css.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={css.panel}>
        <div className={css.panelHeader}>
          <span className={css.panelTitle}>Backup history — {modelName || modelKey}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>

        <div className={css.body}>
          <div className={css.sidebar}>
            {entries.length === 0 ? (
              <div className={css.empty}>No backups found</div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.filename}
                  className={`${css.backupItem} ${selected?.filename === entry.filename ? css.selected : ''}`}
                  onClick={() => setSelected(entry)}
                >
                  <div className={css.backupTs}>{formatTimestamp(entry.timestamp)}</div>
                  <div className={css.backupName}>{entry.filename}</div>
                </div>
              ))
            )}
          </div>

          <div className={css.preview}>
            {selected ? (
              <>
                <div className={css.previewHeader}>
                  <span style={{ flex: 1 }}>{selected.filename}</span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleRestore}
                    disabled={restoring}
                  >
                    {restoring ? 'Restoring…' : 'Restore this backup'}
                  </button>
                </div>
                <div className={css.previewContent}>
                  <pre>{previewContent ?? 'Loading…'}</pre>
                </div>
              </>
            ) : (
              <div className={css.empty}>Select a backup to preview</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
