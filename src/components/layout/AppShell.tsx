import { useState, type ReactNode } from 'react';
import type { Route } from '../../App.tsx';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { SettingsModal } from './SettingsModal.tsx';
import css from './AppShell.module.css';

interface Props {
  children: ReactNode;
  route: Route;
  navigate: (r: Route) => void;
}

export function AppShell({ children, route, navigate }: Props) {
  const sdRoot = useEditorStore((s) => s.sdRoot);
  const dirty = useEditorStore((s) => s.dirty);
  const lastError = useEditorStore((s) => s.lastError);
  const warnings = useEditorStore((s) => s.warnings);
  const clearError = useEditorStore((s) => s.clearError);
  const clearWarnings = useEditorStore((s) => s.clearWarnings);
  const connectSdCard = useEditorStore((s) => s.connectSdCard);
  const saveAll = useEditorStore((s) => s.saveAll);

  const [showSettings, setShowSettings] = useState(false);

  const dirtyCount = dirty.size;

  return (
    <div className={css.shell}>
      <header className={css.header}>
        <button
          className={css.title}
          style={{ background: 'none', border: 'none', cursor: route.page !== 'list' ? 'pointer' : 'default', color: 'inherit' }}
          onClick={() => navigate({ page: 'list' })}
        >
          EdgeTX Editor
          <span className={css.titleSub}>MT12</span>
        </button>

        <div className={css.spacer} />

        {sdRoot && dirtyCount > 0 && (
          <button className="btn btn-primary btn-sm" onClick={saveAll} title={`Save all ${dirtyCount} unsaved item${dirtyCount !== 1 ? 's' : ''}`}>
            Save all ({dirtyCount})
          </button>
        )}

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate({ page: 'radio' })}
          style={route.page === 'radio' ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
        >
          Radio Settings
        </button>

        <a
          href="https://manual.edgetx.org/"
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost btn-sm"
          title="EdgeTX documentation"
          style={{ fontSize: 12 }}
        >
          EdgeTX docs
        </a>

        <a
          href="https://cdn.shopify.com/s/files/1/0701/8066/7584/files/MT12_A1.4.pdf?v=1770617495"
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost btn-sm"
          title="Radiomaster MT12 user manual (PDF)"
          style={{ fontSize: 12 }}
        >
          MT12 manual
        </a>

        <button
          className="btn btn-ghost btn-sm"
          title="App settings"
          onClick={() => setShowSettings(true)}
          style={{ padding: '4px 8px', fontSize: 16 }}
        >
          ⚙
        </button>

        <div className={css.sdStatus}>
          <span className={`${css.dot} ${sdRoot ? css.connected : css.disconnected}`} />
          {sdRoot ? (
            <span>SD card connected</span>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={connectSdCard}>
              Connect SD card
            </button>
          )}
        </div>
      </header>

      {lastError && (
        <div style={{
          background: 'color-mix(in srgb, var(--danger) 15%, transparent)',
          borderBottom: '1px solid var(--danger)',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 13,
          color: 'var(--danger)',
        }}>
          <span style={{ flex: 1 }}>{lastError}</span>
          <button className="btn btn-sm" style={{ background: 'transparent', color: 'inherit', border: '1px solid currentColor' }} onClick={clearError}>
            Dismiss
          </button>
        </div>
      )}

      {warnings.length > 0 && (
        <div style={{
          background: 'color-mix(in srgb, var(--warning, #e6a817) 12%, transparent)',
          borderBottom: '1px solid var(--warning, #e6a817)',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          fontSize: 13,
          color: 'var(--warning, #e6a817)',
        }}>
          <div style={{ flex: 1 }}>
            {warnings.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
          <button className="btn btn-sm" style={{ background: 'transparent', color: 'inherit', border: '1px solid currentColor', flexShrink: 0 }} onClick={clearWarnings}>
            Dismiss
          </button>
        </div>
      )}

      <main className={css.main}>{children}</main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
