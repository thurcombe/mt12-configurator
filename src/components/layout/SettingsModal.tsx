import { useEditorStore } from '../../store/useEditorStore.ts';
import css from './SettingsModal.module.css';

interface Props {
  onClose: () => void;
}

export function SettingsModal({ onClose }: Props) {
  const settings = useEditorStore((s) => s.settings);
  const updateSettings = useEditorStore((s) => s.updateSettings);

  return (
    <div className={css.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={css.modal}>
        <div className={css.header}>
          <span className={css.title}>App Settings</span>
          <button className={css.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={css.body}>
          <div className={css.grid}>
            <label className={css.label} htmlFor="backup-count">
              Max backups per model
            </label>
            <div className={css.inputRow}>
              <input
                id="backup-count"
                type="number"
                className={css.input}
                value={settings.backupCount}
                min={1}
                max={50}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1) updateSettings({ backupCount: Math.min(50, v) });
                }}
              />
              <span className={css.hint}>
                Older backups are pruned automatically. Files are written to{' '}
                <code>BACKUP/</code> on the SD card.
              </span>
            </div>
          </div>
        </div>

        <div className={css.footer}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
