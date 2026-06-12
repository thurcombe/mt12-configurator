import { AppShell } from './components/layout/AppShell.tsx';
import { ModelList } from './pages/ModelList.tsx';
import { ModelEditor } from './pages/ModelEditor.tsx';
import { RadioSettings } from './pages/RadioSettings.tsx';
import { VehicleTypesPage } from './pages/VehicleTypesPage.tsx';
import { useState } from 'react';
import { useEditorStore } from './store/useEditorStore.ts';
import css from './App.module.css';

export type Route =
  | { page: 'list' }
  | { page: 'editor'; modelKey: string }
  | { page: 'radio' }
  | { page: 'vehicle-types' };

export default function App() {
  const [route, setRoute] = useState<Route>({ page: 'list' });
  const [pendingNav, setPendingNav] = useState<Route | null>(null);
  // Persists across navigation within the session
  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false);

  const dirty = useEditorStore((s) => s.dirty);
  const models = useEditorStore((s) => s.models);
  const freshModelKeys = useEditorStore((s) => s.freshModelKeys);
  const discardFreshModel = useEditorStore((s) => s.discardFreshModel);
  const revertModel = useEditorStore((s) => s.revertModel);
  const revertRadio = useEditorStore((s) => s.revertRadio);

  function navigate(next: Route) {
    if (route.page === 'editor' && dirty.has(route.modelKey)) {
      if (next.page === 'editor' && next.modelKey === route.modelKey) {
        setRoute(next);
        return;
      }
      setPendingNav(next);
      return;
    }
    if (route.page === 'radio' && dirty.has('radio')) {
      setPendingNav(next);
      return;
    }
    setRoute(next);
  }

  function confirmLeave() {
    if (!pendingNav) return;
    if (route.page === 'editor') {
      if (freshModelKeys.has(route.modelKey)) {
        discardFreshModel(route.modelKey);
      } else {
        revertModel(route.modelKey);
      }
    } else if (route.page === 'radio') {
      revertRadio();
    }
    setRoute(pendingNav);
    setPendingNav(null);
  }

  function cancelLeave() {
    setPendingNav(null);
  }

  let leaveMessage = 'You have unsaved changes. Leave and discard them?';
  if (pendingNav && route.page === 'editor') {
    const name = models[route.modelKey]?.header?.name;
    leaveMessage = `Unsaved changes in "${name || route.modelKey}" will be lost. Leave anyway?`;
  } else if (pendingNav && route.page === 'radio') {
    leaveMessage = 'Unsaved changes to Radio Settings will be lost. Leave anyway?';
  }

  return (
    <AppShell route={route} navigate={navigate}>
      {route.page === 'list' && (
        <ModelList
          navigate={navigate}
          offlineBannerDismissed={offlineBannerDismissed}
          onDismissOfflineBanner={() => setOfflineBannerDismissed(true)}
        />
      )}
      {route.page === 'editor' && <ModelEditor modelKey={route.modelKey} navigate={navigate} />}
      {route.page === 'radio' && <RadioSettings navigate={navigate} />}
      {route.page === 'vehicle-types' && <VehicleTypesPage navigate={navigate} />}

      {pendingNav && (
        <div className={css.leaveOverlay}>
          <div className={css.leaveDialog}>
            <p className={css.leaveMsg}>{leaveMessage}</p>
            <div className={css.leaveActions}>
              <button className="btn btn-ghost btn-sm" onClick={cancelLeave}>Stay</button>
              <button className="btn btn-danger btn-sm" onClick={confirmLeave}>Leave</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
