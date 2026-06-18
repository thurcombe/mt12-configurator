import { useState, useEffect, useMemo } from 'react';
import type { Model } from '../../types/model.ts';
import { serialiseModel } from '../../codec/model-codec.ts';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { readTextFile } from '../../fs/sdcard.ts';
import { downloadYaml } from '../../fs/download.ts';
import css from './YamlViewer.module.css';

type DiffLine = { type: 'same' | 'add' | 'remove'; line: string };

function diffLines(a: string, b: string): DiffLine[] {
  const la = a.split('\n'), lb = b.split('\n');
  const m = la.length, n = lb.length;
  if (m * n > 120_000) return lb.map(line => ({ type: 'same', line }));
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = la[i-1] === lb[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
  const result: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && la[i-1] === lb[j-1]) {
      result.unshift({ type: 'same', line: la[i-1] }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      result.unshift({ type: 'add', line: lb[j-1] }); j--;
    } else {
      result.unshift({ type: 'remove', line: la[i-1] }); i--;
    }
  }
  return result;
}

interface Props {
  model: Model;
  modelKey: string;
}

export function YamlViewer({ model, modelKey }: Props) {
  const sdRoot = useEditorStore(s => s.sdRoot);
  const dirty = useEditorStore(s => s.dirty);
  const isDirty = dirty.has(modelKey);

  const [showDiff, setShowDiff] = useState(false);
  const [savedYaml, setSavedYaml] = useState<string | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentYaml = useMemo(() => {
    try { return serialiseModel(model); } catch { return '(serialisation error)'; }
  }, [model]);

  useEffect(() => {
    if (!showDiff || !isDirty || !sdRoot) { setSavedYaml(null); return; }
    setLoadingDiff(true);
    readTextFile(sdRoot, `MODELS/${modelKey}.yml`)
      .then(setSavedYaml)
      .catch(() => setSavedYaml(null))
      .finally(() => setLoadingDiff(false));
  }, [showDiff, isDirty, sdRoot, modelKey]);

  const diffResult = useMemo((): DiffLine[] | null => {
    if (!showDiff || !isDirty || !savedYaml) return null;
    return diffLines(savedYaml, currentYaml);
  }, [showDiff, isDirty, savedYaml, currentYaml]);

  const addCount = diffResult?.filter(l => l.type === 'add').length ?? 0;
  const removeCount = diffResult?.filter(l => l.type === 'remove').length ?? 0;

  function handleCopy() {
    navigator.clipboard.writeText(currentYaml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className={css.root}>
      <div className={css.toolbar}>
        <div className={css.toggleWrap}>
          <label className={css.diffToggle}>
            <input
              type="checkbox"
              checked={showDiff}
              onChange={e => setShowDiff(e.target.checked)}
              disabled={!isDirty}
            />
            Diff vs saved
          </label>
          {!isDirty && <span className={css.noChanges}>No unsaved changes</span>}
        </div>

        {showDiff && isDirty && diffResult && (
          <div className={css.diffStats}>
            {addCount === 0 && removeCount === 0 ? (
              <span className={css.noYamlChange}>No YAML changes (metadata or image differs)</span>
            ) : (
              <>
                <span className={css.added}>+{addCount}</span>
                <span className={css.removed}>−{removeCount}</span>
                <span className={css.diffLabel}>lines changed</span>
              </>
            )}
          </div>
        )}

        <div className={css.actions}>
          <button className="btn btn-ghost btn-sm" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => downloadYaml(`${modelKey}.yml`, currentYaml)}
          >
            Download
          </button>
        </div>
      </div>

      <div className={css.codeWrap}>
        {loadingDiff ? (
          <pre className={css.code}>Loading…</pre>
        ) : diffResult && (addCount > 0 || removeCount > 0) ? (
          <pre className={css.code}>
            {diffResult.map((l, i) => (
              <span
                key={i}
                className={l.type === 'add' ? css.lineAdd : l.type === 'remove' ? css.lineRemove : css.lineSame}
              >
                {l.type === 'add' ? '+ ' : l.type === 'remove' ? '- ' : '  '}{l.line}{'\n'}
              </span>
            ))}
          </pre>
        ) : (
          <pre className={css.code}>{currentYaml}</pre>
        )}
      </div>
    </div>
  );
}
