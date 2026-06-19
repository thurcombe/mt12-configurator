import { useState, useEffect } from 'react';
import type { Route } from '../App.tsx';
import { BackupHistory } from '../components/models/BackupHistory.tsx';
import { Toast } from '../components/shared/Toast.tsx';
import { useEditorStore } from '../store/useEditorStore.ts';
import { Mt12Diagram, BUILTIN_PLACED_CONTROLS } from '../components/radio/Mt12Diagram.tsx';
import type { Tab } from '../components/layout/TabBar.tsx';
import { TabBar } from '../components/layout/TabBar.tsx';
import { BASE_SWITCHES, EXPANSION_MODULES, TRIMS } from '../hardware/mt12.ts';
import type { ExpansionModuleType } from '../hardware/mt12.ts';
import css from './RadioSettings.module.css';

interface Props {
  navigate: (r: Route) => void;
}

const TABS: Tab[] = [
  { id: 'audio', label: 'Audio' },
  { id: 'display', label: 'Display' },
  { id: 'hardware', label: 'Input Hardware' },
];

const BACKLIGHT_MODES = ['off', 'keys', 'sticks', 'both', 'on'];
const BEEP_MODES = ['quiet', 'alarms', 'nokey', 'all'];
const HAPTIC_MODES = ['off', 'alarms', 'nokey', 'all'];
const SWITCH_TYPES = ['2POS', '3POS', 'TOGGLE', 'MULTIPOS'];
const POT_TYPES = ['with_detent', 'without_detent', 'SLIDER', 'MULTIPOS_SWITCH', 'axis_x', 'axis_y'];
const POT_TYPE_LABEL: Record<string, string> = {
  with_detent: 'Pot (with detent)',
  without_detent: 'Pot (no detent)',
  SLIDER: 'Slider',
  MULTIPOS_SWITCH: 'Multi-position',
  axis_x: 'Joystick X axis',
  axis_y: 'Joystick Y axis',
};

// ── Audio tab ──────────────────────────────────────────────────────────────
function AudioTab() {
  const radio = useEditorStore((s) => s.radio);
  const updateRadio = useEditorStore((s) => s.updateRadio);
  if (!radio) return null;

  function set(key: string, value: unknown) {
    updateRadio((r) => ({ ...r, [key]: value }));
  }

  return (
    <div className={css.section}>
      <h3 className={css.sectionTitle}>Volumes</h3>
      <div className={css.grid}>
        {([
          ['Speaker volume', 'speakerVolume', 0, 23],
          ['Beep volume', 'beepVolume', 0, 23],
          ['WAV volume', 'wavVolume', 0, 23],
          ['Vario volume', 'varioVolume', 0, 23],
          ['Background volume', 'backgroundVolume', 0, 23],
        ] as [string, keyof typeof radio, number, number][]).map(([label, key, min, max]) => (
          <>
            <label key={`l-${key}`} className={css.label}>{label}</label>
            <div key={`v-${key}`} className={css.sliderRow}>
              <input
                type="range"
                min={min}
                max={max}
                value={(radio[key] as number) ?? 0}
                onChange={(e) => set(key, parseInt(e.target.value, 10) as never)}
                style={{ accentColor: 'var(--accent)', flex: 1 }}
              />
              <span className={css.sliderVal}>{radio[key] as number}</span>
            </div>
          </>
        ))}

        <label className={css.label}>Speaker pitch</label>
        <div className={css.sliderRow}>
          <input type="range" min={0} max={20} value={radio.speakerPitch ?? 0}
            onChange={(e) => set('speakerPitch', parseInt(e.target.value, 10))}
            style={{ accentColor: 'var(--accent)', flex: 1 }} />
          <span className={css.sliderVal}>{radio.speakerPitch}</span>
        </div>
      </div>

      <h3 className={css.sectionTitle}>Beep & Haptic</h3>
      <div className={css.grid}>
        <label className={css.label}>Beep mode</label>
        <select className={css.select} value={radio.beepMode ?? 'all'}
          onChange={(e) => set('beepMode', e.target.value)}>
          {BEEP_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <label className={css.label}>Beep length</label>
        <input type="number" className={css.input} value={radio.beepLength ?? 0}
          min={0} max={5} onChange={(e) => set('beepLength', parseInt(e.target.value, 10) || 0)} />

        <label className={css.label}>Haptic mode</label>
        <select className={css.select} value={radio.hapticMode ?? 'off'}
          onChange={(e) => set('hapticMode', e.target.value)}>
          {HAPTIC_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <label className={css.label}>Haptic strength</label>
        <input type="number" className={css.input} value={radio.hapticStrength ?? 0}
          min={0} max={5} onChange={(e) => set('hapticStrength', parseInt(e.target.value, 10) || 0)} />

        <label className={css.label}>Haptic length</label>
        <input type="number" className={css.input} value={radio.hapticLength ?? 0}
          min={0} max={5} onChange={(e) => set('hapticLength', parseInt(e.target.value, 10) || 0)} />
      </div>
    </div>
  );
}

// ── Display tab ────────────────────────────────────────────────────────────
function DisplayTab() {
  const radio = useEditorStore((s) => s.radio);
  const updateRadio = useEditorStore((s) => s.updateRadio);
  if (!radio) return null;

  function set(key: string, value: unknown) {
    updateRadio((r) => ({ ...r, [key]: value }));
  }

  return (
    <div className={css.section}>
      <h3 className={css.sectionTitle}>Backlight</h3>
      <div className={css.grid}>
        <label className={css.label}>Mode</label>
        <select className={css.select} value={radio.backlightMode ?? 'on'}
          onChange={(e) => set('backlightMode', e.target.value)}>
          {BACKLIGHT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <label className={css.label}>Brightness</label>
        <div className={css.sliderRow}>
          <input type="range" min={0} max={100} value={radio.backlightBright ?? 80}
            onChange={(e) => set('backlightBright', parseInt(e.target.value, 10))}
            style={{ accentColor: 'var(--accent)', flex: 1 }} />
          <span className={css.sliderVal}>{radio.backlightBright}</span>
        </div>

        <label className={css.label}>Colour (0–65535)</label>
        <input type="number" className={css.input} value={radio.backlightColor ?? 0}
          min={0} max={65535}
          onChange={(e) => set('backlightColor', parseInt(e.target.value, 10) || 0)} />

        <label className={css.label}>Auto-off (×5s, 0=never)</label>
        <input type="number" className={css.input} value={radio.lightAutoOff ?? 0}
          min={0} max={600}
          onChange={(e) => set('lightAutoOff', parseInt(e.target.value, 10) || 0)} />

        <label className={css.label}>Keys backlight</label>
        <label className={css.checkLabel}>
          <input type="checkbox" checked={!!radio.keysBacklight}
            onChange={(e) => set('keysBacklight', e.target.checked ? 1 : 0)}
            style={{ accentColor: 'var(--accent)' }} />
          Illuminate navigation keys
        </label>
      </div>

      <h3 className={css.sectionTitle}>Other</h3>
      <div className={css.grid}>
        <label className={css.label}>Contrast</label>
        <input type="number" className={css.input} value={radio.contrast ?? 25}
          min={0} max={45}
          onChange={(e) => set('contrast', parseInt(e.target.value, 10) || 0)} />

        <label className={css.label}>Inactivity timer (min)</label>
        <input type="number" className={css.input} value={radio.inactivityTimer ?? 10}
          min={0} max={250}
          onChange={(e) => set('inactivityTimer', parseInt(e.target.value, 10) || 0)} />
      </div>
    </div>
  );
}

// ── Switches tab ───────────────────────────────────────────────────────────
function SwitchesTab({ onHover }: { onHover: (sw: string | null) => void }) {
  const radio = useEditorStore((s) => s.radio);
  const updateRadio = useEditorStore((s) => s.updateRadio);
  if (!radio) return null;

  const cfg = radio.switchConfig ?? {};

  function updateSwitch(key: string, field: 'type' | 'name', value: string) {
    updateRadio((r) => ({
      ...r,
      switchConfig: {
        ...r.switchConfig,
        [key]: { ...(r.switchConfig?.[key] ?? { type: 'NONE', name: '' }), [field]: value },
      },
    }));
  }

  return (
    <div className={css.section}>
      <p className={css.hint}>Hover a row to highlight the switch on the diagram.</p>
      <table className={css.table}>
        <thead>
          <tr>
            <th>Switch</th>
            <th>Type</th>
            <th>Custom name</th>
          </tr>
        </thead>
        <tbody>
          {BASE_SWITCHES.map((s) => {
            const swCfg = cfg[s.key] ?? { type: s.type, name: '' };
            const unplaced = !BUILTIN_PLACED_CONTROLS.has(s.key);
            return (
              <tr key={s.key} className={css.tableRow}
                onMouseEnter={() => onHover(s.key)}
                onMouseLeave={() => onHover(null)}
                title={unplaced ? 'Not positioned on the diagram — use ⚙ Place control labels to add it' : undefined}
                style={unplaced ? { borderLeft: '3px solid #f59e0b' } : undefined}>
                <td className={css.swLabel}>
                  {s.key}
                  {unplaced && (
                    <span style={{ marginLeft: 6, color: '#f59e0b', fontSize: 22, verticalAlign: 'middle' }}>⚠</span>
                  )}
                </td>
                <td>
                  <select className={css.selectSm} value={swCfg.type}
                    onChange={(e) => updateSwitch(s.key, 'type', e.target.value)}>
                    {SWITCH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    {!SWITCH_TYPES.includes(swCfg.type) && <option value={swCfg.type}>{swCfg.type}</option>}
                  </select>
                </td>
                <td>
                  <input type="text" className={css.nameInput}
                    value={swCfg.name ?? ''} maxLength={10} placeholder="—"
                    onChange={(e) => updateSwitch(s.key, 'name', e.target.value)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Pots tab ───────────────────────────────────────────────────────────────

function PotsTab({ onHover }: { onHover: (pot: string | null) => void }) {
  const radio = useEditorStore((s) => s.radio);
  const updateRadio = useEditorStore((s) => s.updateRadio);
  if (!radio) return null;

  const cfg = radio.potsConfig ?? {};

  function updatePot(key: string, field: 'type' | 'name', value: string) {
    updateRadio((r) => ({
      ...r,
      potsConfig: {
        ...r.potsConfig,
        [key]: { ...(r.potsConfig?.[key] ?? { type: 'NONE', inv: 0, name: '' }), [field]: value },
      },
    }));
  }

  function updateInv(key: string, inv: number) {
    updateRadio((r) => ({
      ...r,
      potsConfig: {
        ...r.potsConfig,
        [key]: { ...(r.potsConfig?.[key] ?? { type: 'NONE', inv: 0, name: '' }), inv },
      },
    }));
  }

  function potTypeLabel(type: string) { return POT_TYPE_LABEL[type] ?? type; }

  return (
    <div className={css.section}>
      <p className={css.hint}>Scroll dials — built-in hardware. Hover a row to highlight on the diagram.</p>
      <table className={css.table}>
        <thead>
          <tr>
            <th>Pot</th>
            <th>Type</th>
            <th>Inverted</th>
            <th>Custom name</th>
          </tr>
        </thead>
        <tbody>
          {(['P1', 'P2'] as const).map((pot) => {
            const potCfg = cfg[pot] ?? { type: 'NONE', inv: 0, name: '' };
            return (
              <tr key={pot} className={css.tableRow}
                onMouseEnter={() => onHover(pot)}
                onMouseLeave={() => onHover(null)}>
                <td className={css.swLabel}>{pot}</td>
                <td>
                  <select className={css.selectSm} value={potCfg.type}
                    onChange={(e) => updatePot(pot, 'type', e.target.value)}>
                    {[...POT_TYPES, ...(!POT_TYPES.includes(potCfg.type) ? [potCfg.type] : [])].map((t) =>
                      <option key={t} value={t}>{potTypeLabel(t)}</option>
                    )}
                  </select>
                </td>
                <td className={css.centerCell}>
                  <input type="checkbox" checked={!!potCfg.inv}
                    onChange={(e) => updateInv(pot, e.target.checked ? 1 : 0)}
                    style={{ accentColor: 'var(--accent)' }} />
                </td>
                <td>
                  <input type="text" className={css.nameInput}
                    value={potCfg.name ?? ''} maxLength={10} placeholder="—"
                    onChange={(e) => updatePot(pot, 'name', e.target.value)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Trims section ──────────────────────────────────────────────────────────

const TRIM_DESCS: Record<string, string> = {
  T1: 'Left throttle trim',
  T2: 'Right throttle trim',
  T3: 'Right steering trim',
  T4: 'Left steering trim',
  T5: 'Centre button trim',
};

function TrimsSection({ onHover }: { onHover: (trim: string | null) => void }) {
  return (
    <div className={css.section}>
      <p className={css.hint}>Trim levers — built-in hardware, reference only. Hover to highlight on the diagram.</p>
      <table className={css.table}>
        <thead>
          <tr>
            <th>Trim</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {TRIMS.map((t) => (
            <tr key={t} className={css.tableRow}
              onMouseEnter={() => onHover(t)}
              onMouseLeave={() => onHover(null)}>
              <td className={css.swLabel}>{t}</td>
              <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{TRIM_DESCS[t] ?? t}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Expansion tab ─────────────────────────────────────────────────────────
const MODULE_POT_CONFIG: Record<ExpansionModuleType, { P3: string; P4: string }> = {
  none:         { P3: 'none', P4: 'none' },
  joystick:     { P3: 'with_detent', P4: 'with_detent' },
  switch_dual3: { P3: 'switch', P4: 'switch' },
  switch_3and2: { P3: 'switch', P4: 'switch' },
  switch_dual2: { P3: 'switch', P4: 'switch' },
};

const MODULE_FL_CONFIG: Record<ExpansionModuleType, { FL1: string; FL2: string }> = {
  none:         { FL1: 'none', FL2: 'none' },
  joystick:     { FL1: 'none', FL2: 'none' },
  switch_dual3: { FL1: '3pos', FL2: '3pos' },
  switch_3and2: { FL1: '3pos', FL2: '2pos' },
  switch_dual2: { FL1: '2pos', FL2: '2pos' },
};

function ExpansionTab() {
  const radio = useEditorStore((s) => s.radio);
  const updateRadio = useEditorStore((s) => s.updateRadio);
  const expansionModule = useEditorStore((s) => s.expansionModule);

  if (!radio) return null;

  const currentModule = expansionModule();

  function applyModule(moduleType: ExpansionModuleType) {
    const potCfg = MODULE_POT_CONFIG[moduleType];
    const flCfg = MODULE_FL_CONFIG[moduleType];
    updateRadio((r) => {
      const potsConfig = {
        ...r.potsConfig,
        P3: { ...(r.potsConfig?.['P3'] ?? { inv: 0, name: '' }), type: potCfg.P3 },
        P4: { ...(r.potsConfig?.['P4'] ?? { inv: 0, name: '' }), type: potCfg.P4 },
      };
      const switchConfig = {
        ...r.switchConfig,
        FL1: { ...(r.switchConfig?.['FL1'] ?? { name: '' }), type: flCfg.FL1 },
        FL2: { ...(r.switchConfig?.['FL2'] ?? { name: '' }), type: flCfg.FL2 },
      };
      const switchesFlex = moduleType === 'none' || moduleType === 'joystick'
        ? undefined
        : { FL1: { channel: 'P3' }, FL2: { channel: 'P4' } };
      return { ...r, potsConfig, switchConfig, switchesFlex };
    });
  }

  const p3Cfg = radio.potsConfig?.['P3'];
  const p4Cfg = radio.potsConfig?.['P4'];
  const fl1Cfg = radio.switchConfig?.['FL1'];
  const fl2Cfg = radio.switchConfig?.['FL2'];

  return (
    <div className={css.section}>
      <h3 className={css.sectionTitle}>Expansion Module</h3>
      <div className={css.grid}>
        <label className={css.label}>Installed module</label>
        <select className={css.select} value={currentModule}
          onChange={(e) => applyModule(e.target.value as ExpansionModuleType)}>
          {(Object.entries(EXPANSION_MODULES) as [ExpansionModuleType, { label: string }][]).map(([key, mod]) => (
            <option key={key} value={key}>{mod.label}</option>
          ))}
        </select>
      </div>

      {currentModule !== 'none' && (
        <>
          <h3 className={css.sectionTitle} style={{ marginTop: 20 }}>Expansion inputs</h3>
          <table className={css.table}>
            <thead>
              <tr><th>Input</th><th>Type</th><th>Custom name</th></tr>
            </thead>
            <tbody>
              {currentModule === 'joystick' && (
                <>
                  <tr className={css.tableRow}>
                    <td className={css.swLabel}>P3</td>
                    <td><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p3Cfg?.type ?? '—'}</span></td>
                    <td><input type="text" className={css.nameInput} value={p3Cfg?.name ?? ''} maxLength={10} placeholder="—"
                      onChange={(e) => updateRadio((r) => ({ ...r, potsConfig: { ...r.potsConfig, P3: { ...(r.potsConfig?.['P3'] ?? { type: 'none', inv: 0 }), name: e.target.value } } }))} /></td>
                  </tr>
                  <tr className={css.tableRow}>
                    <td className={css.swLabel}>P4</td>
                    <td><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p4Cfg?.type ?? '—'}</span></td>
                    <td><input type="text" className={css.nameInput} value={p4Cfg?.name ?? ''} maxLength={10} placeholder="—"
                      onChange={(e) => updateRadio((r) => ({ ...r, potsConfig: { ...r.potsConfig, P4: { ...(r.potsConfig?.['P4'] ?? { type: 'none', inv: 0 }), name: e.target.value } } }))} /></td>
                  </tr>
                </>
              )}
              {(currentModule === 'switch_dual3' || currentModule === 'switch_3and2' || currentModule === 'switch_dual2') && (
                <>
                  <tr className={css.tableRow}>
                    <td className={css.swLabel}>FL1</td>
                    <td><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fl1Cfg?.type ?? '—'}</span></td>
                    <td><input type="text" className={css.nameInput} value={fl1Cfg?.name ?? ''} maxLength={10} placeholder="—"
                      onChange={(e) => updateRadio((r) => ({ ...r, switchConfig: { ...r.switchConfig, FL1: { ...(r.switchConfig?.['FL1'] ?? { type: '2pos' }), name: e.target.value } } }))} /></td>
                  </tr>
                  <tr className={css.tableRow}>
                    <td className={css.swLabel}>FL2</td>
                    <td><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fl2Cfg?.type ?? '—'}</span></td>
                    <td><input type="text" className={css.nameInput} value={fl2Cfg?.name ?? ''} maxLength={10} placeholder="—"
                      onChange={(e) => updateRadio((r) => ({ ...r, switchConfig: { ...r.switchConfig, FL2: { ...(r.switchConfig?.['FL2'] ?? { type: '2pos' }), name: e.target.value } } }))} /></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </>
      )}

      {currentModule === 'none' && (
        <p className={css.hint} style={{ marginTop: 12 }}>
          Select a module to configure expansion inputs (P3, P4, FL1, FL2).
        </p>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export function RadioSettings({ navigate }: Props) {
  const [tab, setTab] = useState('audio');
  const [diagramSelected, setDiagramSelected] = useState<string | undefined>();
  const [toast, setToast] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [hasRadioBackups, setHasRadioBackups] = useState(false);

  const sdRoot = useEditorStore((s) => s.sdRoot);
  const radio = useEditorStore((s) => s.radio);
  const loadRadio = useEditorStore((s) => s.loadRadio);
  const listBackups = useEditorStore((s) => s.listBackups);
  const isDirty = useEditorStore((s) => s.isDirty('radio'));
  const saveRadio = useEditorStore((s) => s.saveRadio);
  const backupRadio = useEditorStore((s) => s.backupRadio);

  useEffect(() => {
    if (sdRoot && !radio) loadRadio();
  }, [sdRoot, radio, loadRadio]);

  // Check whether any radio backups exist so we can enable the History button.
  useEffect(() => {
    if (!sdRoot) { setHasRadioBackups(false); return; }
    listBackups('radio').then(entries => setHasRadioBackups(entries.length > 0));
  }, [sdRoot, listBackups]);

  async function handleBackup() {
    await backupRadio();
    setHasRadioBackups(true);
    setToast('Transmitter settings backed up');
  }

  // When a diagram control is clicked, switch to the hardware tab.
  function handleDiagramSelect(control: string) {
    setDiagramSelected(control);
    if (['SA', 'SB', 'SC', 'SD', 'FL1', 'FL2', 'P1', 'P2', 'P3', 'P4', 'T1', 'T2', 'T3', 'T4', 'T5'].includes(control)) {
      setTab('hardware');
    }
  }

  function handleHover(control: string | null) {
    if (control) setDiagramSelected(control);
    else setDiagramSelected(undefined);
  }

  return (
    <div className={css.root}>
      <div className={css.topBar}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate({ page: 'list' })}>
          ← Back
        </button>
        {isDirty && (
          <button className="btn btn-primary btn-sm" onClick={saveRadio}>Save</button>
        )}
        <span className={css.title}>Transmitter Settings</span>
        {radio && <span className={css.board}>{radio.board}</span>}
        {isDirty && <span className="badge badge-warning">Unsaved</span>}
        <div style={{ flex: 1 }} />
        {sdRoot && radio && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={handleBackup}>Backup</button>
            <button
              className="btn btn-ghost btn-sm"
              disabled={!hasRadioBackups}
              onClick={() => setShowHistory(true)}
            >
              History
            </button>
          </>
        )}
      </div>

      {radio && <TabBar tabs={TABS} active={tab} onChange={setTab} />}

      <div className={css.body}>
        {/* Left: tabbed settings — only when radio is loaded */}
        <div className={`${css.settingsPane} card-panel`}>
          {!radio ? (
            <div className={css.empty}>
              {sdRoot
                ? <p>Loading radio.yml…</p>
                : <p>Connect an SD card to edit audio, display and switch settings.</p>
              }
            </div>
          ) : (
            <div className={css.tabContent}>
              {tab === 'audio' && <AudioTab />}
              {tab === 'display' && <DisplayTab />}
              {tab === 'hardware' && (
                <>
                  <SwitchesTab onHover={handleHover} />
                  <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />
                  <PotsTab onHover={handleHover} />
                  <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />
                  <TrimsSection onHover={handleHover} />
                  <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />
                  <ExpansionTab />
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: MT12 diagram — always visible */}
        <div className={`${css.diagramPane} card-panel`}>
          <p className={css.diagramLabel}>MT12 controls</p>
          <Mt12Diagram
            sdRoot={sdRoot}
            selected={diagramSelected}
            onSelect={handleDiagramSelect}
          />
          {diagramSelected && (
            <p className={css.diagramHint}>
              <strong>{diagramSelected}</strong> — click to navigate to its settings
            </p>
          )}
        </div>
      </div>

      {showHistory && (
        <BackupHistory radioOnly onClose={() => setShowHistory(false)} />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
