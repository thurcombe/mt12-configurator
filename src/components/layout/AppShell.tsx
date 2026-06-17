import { useState, useEffect, type ReactNode } from 'react';
import type { Route } from '../../App.tsx';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { AboutModal } from './AboutModal.tsx';
import { HelpModal } from './HelpModal.tsx';
import css from './AppShell.module.css';
import { exportToZip } from '../../fs/memoryFs.ts';
import type { MemoryDirHandle } from '../../fs/memoryFs.ts';

interface Props {
  children: ReactNode;
  route: Route;
  navigate: (r: Route) => void;
}

function isDemoMode(): boolean {
  return new URLSearchParams(window.location.search).has('demo');
}

async function downloadDemoZip(root: unknown) {
  const zip = await exportToZip(root as MemoryDirHandle);
  const blob = new Blob([zip.buffer as ArrayBuffer], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mt12-sdcard.zip';
  a.click();
  URL.revokeObjectURL(url);
}

export function AppShell({ children, route, navigate }: Props) {
  const sdRoot = useEditorStore((s) => s.sdRoot);
  const dirty = useEditorStore((s) => s.dirty);
  const lastError = useEditorStore((s) => s.lastError);
  const warnings = useEditorStore((s) => s.warnings);
  const clearError = useEditorStore((s) => s.clearError);
  const clearWarnings = useEditorStore((s) => s.clearWarnings);
  const connectSdCard = useEditorStore((s) => s.connectSdCard);
  const disconnectSdCard = useEditorStore((s) => s.disconnectSdCard);

  const [showAbout, setShowAbout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const demo = isDemoMode();
  const dirtyCount = dirty.size;

  // Auto-connect the virtual SD card when entering demo mode.
  useEffect(() => {
    if (demo && !sdRoot) {
      connectSdCard();
    }
  }, [demo]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={css.shell}>
      {demo && (
        <div style={{
          background: 'color-mix(in srgb, var(--accent) 18%, transparent)',
          borderBottom: '1px solid var(--accent)',
          padding: '6px 20px',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: 'var(--accent)',
        }}>
          <strong>Demo mode</strong> — changes are in-memory only and will be lost on refresh.
          {sdRoot && (
            <button
              className="btn btn-sm"
              style={{ marginLeft: 'auto', fontSize: 11, borderColor: 'var(--accent)', color: 'var(--accent)' }}
              onClick={() => downloadDemoZip(sdRoot)}
            >
              Download SD card ↓
            </button>
          )}
        </div>
      )}

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

<button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate({ page: 'radio' })}
          style={route.page === 'radio' ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
        >
          Transmitter Settings
        </button>

        <button
          className={`btn btn-ghost btn-sm ${css.headerSecondary}`}
          onClick={() => navigate({ page: 'vehicle-types' })}
          style={route.page === 'vehicle-types' ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
        >
          Vehicle Types
        </button>

        <button
          className={`btn btn-ghost btn-sm ${css.headerSecondary}`}
          onClick={() => setShowHelp(true)}
          style={{ fontSize: 12 }}
        >
          Help
        </button>

        <button
          className={`btn btn-ghost btn-sm ${css.headerSecondary}`}
          onClick={() => setShowAbout(true)}
          style={{ fontSize: 12 }}
        >
          About
        </button>

        <div className={css.sdStatus}>
          <span className={`${css.dot} ${sdRoot ? css.connected : css.disconnected}`} />
          {sdRoot ? (
            <>
              <span>{demo ? 'Demo loaded' : 'SD card connected'}</span>
              {!demo && (
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={disconnectSdCard}>
                  Disconnect
                </button>
              )}
            </>
          ) : (
            !demo && (
              <button className="btn btn-ghost btn-sm" onClick={connectSdCard}>
                Connect SD card
              </button>
            )
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

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
