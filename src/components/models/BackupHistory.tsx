import { useEffect, useState, useMemo, useRef } from 'react';
import type { BackupEntry } from '../../fs/backup.ts';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { readBackup } from '../../fs/backup.ts';
import { serialiseModel } from '../../codec/model-codec.ts';
import { serialiseRadio } from '../../codec/radio-codec.ts';
import { findFreeSlot } from '../../codec/modelTemplate.ts';
import { downloadYaml } from '../../fs/download.ts';
import css from './BackupHistory.module.css';

type DiffLine = { type: 'same' | 'add' | 'remove'; line: string };

function diffLines(currentYaml: string, backupYaml: string): DiffLine[] {
  const a = currentYaml.split('\n');
  const b = backupYaml.split('\n');
  if (a.length * b.length > 120_000) return b.map(line => ({ type: 'same', line }));
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const result: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: 'same', line: a[i - 1] }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'add', line: b[j - 1] }); j--;
    } else {
      result.unshift({ type: 'remove', line: a[i - 1] }); i--;
    }
  }
  return result;
}

interface Props {
  /** Set for per-model history view (from model card History button). */
  modelKey?: string;
  modelName?: string;
  /** Set to show only radio backups (from Transmitter Settings page). */
  radioOnly?: boolean;
  onClose: () => void;
}

export function BackupHistory({ modelKey, modelName, radioOnly, onClose }: Props) {
  const sdRoot = useEditorStore((s) => s.sdRoot);
  const models = useEditorStore((s) => s.models);
  const radio = useEditorStore((s) => s.radio);
  const listBackups = useEditorStore((s) => s.listBackups);
  const listAllBackups = useEditorStore((s) => s.listAllBackups);
  const restoreBackup = useEditorStore((s) => s.restoreBackup);
  const restoreRadioBackup = useEditorStore((s) => s.restoreRadioBackup);
  const deleteBackupEntry = useEditorStore((s) => s.deleteBackup);
  const settings = useEditorStore((s) => s.settings);
  const updateSettings = useEditorStore((s) => s.updateSettings);

  // Mode: per-model | radio-only | all-models
  const perModelMode = !!modelKey;
  const allModelsMode = !modelKey && !radioOnly;

  const modelKeys = Object.keys(models).sort();
  const nextFreeSlot = findFreeSlot(modelKeys) ?? '';

  const [entries, setEntries] = useState<BackupEntry[]>([]);
  const [selected, setSelected] = useState<BackupEntry | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoredSlot, setRestoredSlot] = useState<string | null>(null);
  const [targetKey, setTargetKey] = useState<string>(modelKey ?? nextFreeSlot);
  const [showRaw, setShowRaw] = useState(false);

  // Manage (delete) mode
  const [manageMode, setManageMode] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [batchConfirm, setBatchConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Expanded groups in all-models mode
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [confirmRestore, setConfirmRestore] = useState(false);

  useEffect(() => {
    if (!models[targetKey] && nextFreeSlot) {
      setTargetKey(nextFreeSlot);
    }
  }, [nextFreeSlot, models, targetKey]);

  useEffect(() => {
    if (perModelMode) {
      listBackups(modelName ?? modelKey!).then(setEntries);
    } else if (radioOnly) {
      listBackups('radio').then(setEntries);
    } else {
      // All-models mode: exclude radio backups
      listAllBackups().then(all => setEntries(all.filter(e => e.modelName !== 'radio')));
    }
  }, [modelKey, modelName, radioOnly, perModelMode, listBackups, listAllBackups]);

  useEffect(() => {
    if (!selected || !sdRoot) { setPreviewContent(null); return; }
    readBackup(sdRoot, selected).then(setPreviewContent).catch(() => setPreviewContent('(error reading backup)'));
  }, [selected, sdRoot]);

  useEffect(() => { setRestoredSlot(null); }, [selected]);

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = checked.size > 0 && checked.size < entries.length;
  }, [checked, entries]);

  // Group entries by model name for all-models mode
  const groups = useMemo(() => {
    if (!allModelsMode) return null;
    const map: Record<string, BackupEntry[]> = {};
    for (const entry of entries) {
      if (!map[entry.modelName]) map[entry.modelName] = [];
      map[entry.modelName].push(entry);
    }
    return map;
  }, [allModelsMode, entries]);
  const groupNames = groups ? Object.keys(groups).sort() : [];

  const targetCurrentYaml = useMemo(() => {
    if (radioOnly) {
      if (!radio) return null;
      try { return serialiseRadio(radio); } catch { return null; }
    }
    const model = models[targetKey];
    if (!model) return null;
    try { return serialiseModel(model); } catch { return null; }
  }, [radioOnly, radio, models, targetKey]);

  const diffResult = useMemo((): DiffLine[] | null => {
    if (!previewContent || !targetCurrentYaml || showRaw) return null;
    return diffLines(targetCurrentYaml, previewContent);
  }, [previewContent, targetCurrentYaml, showRaw]);

  const addCount = diffResult?.filter(l => l.type === 'add').length ?? 0;
  const removeCount = diffResult?.filter(l => l.type === 'remove').length ?? 0;
  const hasDiff = addCount > 0 || removeCount > 0;
  const isIdentical = previewContent !== null && targetCurrentYaml !== null && previewContent === targetCurrentYaml;

  function handleItemClick(entry: BackupEntry) {
    if (manageMode) {
      setChecked(prev => {
        const next = new Set(prev);
        next.has(entry.filename) ? next.delete(entry.filename) : next.add(entry.filename);
        return next;
      });
      setBatchConfirm(false);
    } else {
      setSelected(entry);
      setRestoredSlot(null);
    }
  }

  function toggleGroup(name: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function toggleAll() {
    setBatchConfirm(false);
    setChecked(checked.size === entries.length ? new Set() : new Set(entries.map(e => e.filename)));
  }

  function exitManageMode() {
    setManageMode(false);
    setChecked(new Set());
    setBatchConfirm(false);
    if (allModelsMode) setExpandedGroups(new Set());
  }

  async function handleBatchDelete() {
    setDeleting(true);
    for (const entry of entries.filter(e => checked.has(e.filename))) {
      await deleteBackupEntry(entry);
    }
    setEntries(prev => prev.filter(e => !checked.has(e.filename)));
    if (selected && checked.has(selected.filename)) {
      setSelected(null);
      setPreviewContent(null);
    }
    setChecked(new Set());
    setBatchConfirm(false);
    setDeleting(false);
  }

  async function handleRestore() {
    if (!selected) return;
    setConfirmRestore(false);
    setRestoring(true);
    setRestoredSlot(null);
    if (radioOnly) {
      await restoreRadioBackup(selected);
      setRestoredSlot('radio');
    } else {
      await restoreBackup(targetKey as any, selected);
      setRestoredSlot(targetKey);
      if (perModelMode) onClose();
    }
    setRestoring(false);
  }

  function requestRestore() {
    if (!selected) return;
    const isExistingSlot = !radioOnly && targetKey !== nextFreeSlot && !!models[targetKey];
    if (isExistingSlot) {
      setConfirmRestore(true);
    } else {
      handleRestore();
    }
  }

  function formatTimestamp(ts: string): string {
    try {
      const [date, time] = ts.split('T');
      return `${date}  ${time?.replace(/-/g, ':') ?? ''}`;
    } catch { return ts; }
  }

  const title = radioOnly
    ? 'Radio backup history'
    : perModelMode
      ? `Backup history — ${modelName || modelKey}`
      : 'Manage backups';

  function renderEntry(entry: BackupEntry, indent = false) {
    return (
      <div
        key={entry.filename}
        className={[
          css.backupItem,
          indent ? css.indented : '',
          !manageMode && selected?.filename === entry.filename ? css.selected : '',
          manageMode && checked.has(entry.filename) ? css.checkedItem : '',
        ].join(' ')}
        onClick={() => handleItemClick(entry)}
      >
        {manageMode && (
          <input type="checkbox" className={css.itemCheckbox} checked={checked.has(entry.filename)} onChange={() => {}} />
        )}
        <div className={css.itemBody}>
          <div className={css.backupTs}>{formatTimestamp(entry.timestamp)}</div>
          <div className={css.backupName}>{entry.filename}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={css.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={css.panel}>
        <div className={css.panelHeader}>
          <span className={css.panelTitle}>{title}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        {allModelsMode && (
          <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-muted)' }}>
            <label htmlFor="bh-backup-count" style={{ flexShrink: 0 }}>Max backups per model</label>
            <input
              id="bh-backup-count"
              type="number"
              min={1}
              max={50}
              value={settings.backupCount}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 1) updateSettings({ backupCount: Math.min(50, v) });
              }}
              style={{ width: 56, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 6px', fontSize: 13, fontFamily: 'var(--font)', textAlign: 'right' }}
            />
            <span style={{ fontSize: 12 }}>Older backups are pruned automatically on save.</span>
          </div>
        )}

        <div className={css.body}>
          {/* Sidebar */}
          <div className={css.sidebar}>
            <div className={css.sidebarHeader}>
              {manageMode ? (
                <>
                  <label className={css.selectAllLabel}>
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={checked.size === entries.length && entries.length > 0}
                      onChange={toggleAll}
                    />
                    {checked.size > 0 ? `${checked.size} selected` : 'Select all'}
                  </label>
                  {batchConfirm ? (
                    <>
                      <span className={css.confirmMsg}>Delete {checked.size}?</span>
                      <button className="btn btn-danger btn-sm" disabled={deleting} onClick={handleBatchDelete}>
                        {deleting ? '…' : 'Yes'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setBatchConfirm(false)}>No</button>
                    </>
                  ) : (
                    <>
                      {checked.size > 0 && (
                        <button className="btn btn-danger btn-sm" onClick={() => setBatchConfirm(true)}>
                          Delete {checked.size}
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={exitManageMode}>Done</button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <span className={css.entryCount}>{entries.length} backup{entries.length !== 1 ? 's' : ''}</span>
                  {entries.length > 0 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                      if (allModelsMode) setExpandedGroups(new Set(groupNames));
                      setManageMode(true);
                    }}>Manage</button>
                  )}
                </>
              )}
            </div>

            {entries.length === 0 ? (
              <div className={css.empty}>No backups found</div>
            ) : allModelsMode && groups ? (
              // Grouped view
              groupNames.map(name => (
                <div key={name}>
                  <div className={css.groupHeader} onClick={() => !manageMode && toggleGroup(name)}>
                    <span className={css.groupChevron}>{expandedGroups.has(name) ? '▼' : '▶'}</span>
                    <span className={css.groupName}>{name}</span>
                    <span className={css.groupCount}>{groups[name].length}</span>
                  </div>
                  {expandedGroups.has(name) && groups[name].map(entry => renderEntry(entry, true))}
                </div>
              ))
            ) : (
              // Flat view (per-model or radio-only)
              entries.map(entry => renderEntry(entry, false))
            )}
          </div>

          {/* Preview pane */}
          <div className={css.preview}>
            {selected && !manageMode ? (
              <>
                <div className={css.previewHeader}>
                  <div className={css.previewHeaderRow}>
                    {radioOnly ? (
                      <>
                        <span className={css.radioNote}>Radio settings</span>
                        {targetCurrentYaml && (
                          <label className={css.diffToggle}>
                            <input type="checkbox" checked={!showRaw} onChange={(e) => setShowRaw(!e.target.checked)} />
                            Diff
                          </label>
                        )}
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={!previewContent}
                          onClick={() => previewContent && downloadYaml(selected.filename, previewContent)}
                        >
                          Download
                        </button>
                        {restoredSlot ? (
                          <span className={css.restoredNote}>Restored — save to apply</span>
                        ) : (
                          <button className="btn btn-primary btn-sm" disabled={restoring || isIdentical} onClick={requestRestore}>
                            {restoring ? 'Restoring…' : 'Restore'}
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <label className={css.targetLabel}>Restore to</label>
                        <select
                          className={css.slotPicker}
                          value={targetKey}
                          onChange={(e) => { setTargetKey(e.target.value); setRestoredSlot(null); }}
                        >
                          {nextFreeSlot && <option value={nextFreeSlot}>New slot ({nextFreeSlot})</option>}
                          {modelKeys.map(k => (
                            <option key={k} value={k}>
                              {k}{models[k]?.header?.name ? ` — ${models[k].header.name}` : ''}
                            </option>
                          ))}
                        </select>
                        {targetCurrentYaml && (
                          <label className={css.diffToggle}>
                            <input type="checkbox" checked={!showRaw} onChange={(e) => setShowRaw(!e.target.checked)} />
                            Diff
                          </label>
                        )}
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={!previewContent}
                          onClick={() => previewContent && downloadYaml(selected.filename, previewContent)}
                        >
                          Download
                        </button>
                        {restoredSlot ? (
                          <span className={css.restoredNote}>Restored to <strong>{restoredSlot}</strong></span>
                        ) : (
                          <button className="btn btn-primary btn-sm" disabled={restoring || !targetKey || isIdentical} onClick={requestRestore}>
                            {restoring ? 'Restoring…' : 'Restore'}
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {(isIdentical || (diffResult && !showRaw)) && (
                    <div className={css.diffSummary}>
                      {hasDiff ? (
                        <>
                          <span className={css.diffAdded}>+{addCount}</span>
                          <span className={css.diffRemoved}>−{removeCount}</span>
                          <span className={css.diffLabel}>lines vs current</span>
                        </>
                      ) : (
                        <span className={css.diffUnchanged}>Identical to current version</span>
                      )}
                    </div>
                  )}
                </div>

                <div className={css.previewContent}>
                  {diffResult ? (
                    <pre>
                      {diffResult.map((l, i) => (
                        <span key={i} className={l.type === 'add' ? css.lineAdd : l.type === 'remove' ? css.lineRemove : css.lineSame}>
                          {l.type === 'add' ? '+ ' : l.type === 'remove' ? '- ' : '  '}{l.line}{'\n'}
                        </span>
                      ))}
                    </pre>
                  ) : (
                    <pre>{previewContent ?? 'Loading…'}</pre>
                  )}
                </div>
              </>
            ) : (
              <div className={css.empty}>
                {manageMode ? 'Select backups to delete' : 'Select a backup to preview'}
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmRestore && selected && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 'inherit' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', maxWidth: 380, width: '90%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>Overwrite model?</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              This will replace <strong style={{ color: 'var(--text)' }}>{models[targetKey]?.header?.name || targetKey}</strong> with the backup from {formatTimestamp(selected.timestamp)}. The current version will be backed up first.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRestore(false)}>Cancel</button>
              <button className="btn btn-danger btn-sm" onClick={handleRestore}>Overwrite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
