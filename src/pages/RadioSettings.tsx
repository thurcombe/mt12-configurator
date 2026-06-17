import { useState, useEffect } from 'react';
import type { Route } from '../App.tsx';
import { BackupHistory } from '../components/models/BackupHistory.tsx';
import { Toast } from '../components/shared/Toast.tsx';
import { useEditorStore } from '../store/useEditorStore.ts';
import type { SdRoot } from '../fs/sdcard.ts';
import { readWebConfig, writeWebConfig } from '../fs/webconfig.ts';
import { Mt12Diagram } from '../components/radio/Mt12Diagram.tsx';
import type { Tab } from '../components/layout/TabBar.tsx';
import { TabBar } from '../components/layout/TabBar.tsx';
import css from './RadioSettings.module.css';

interface Props {
  navigate: (r: Route) => void;
}

const TABS: Tab[] = [
  { id: 'audio', label: 'Audio' },
  { id: 'display', label: 'Display' },
  { id: 'switches', label: 'Switches' },
  { id: 'pots', label: 'Pots' },
];

const BACKLIGHT_MODES = ['off', 'keys', 'sticks', 'both', 'on'];
const BEEP_MODES = ['quiet', 'alarms', 'nokey', 'all'];
const HAPTIC_MODES = ['off', 'alarms', 'nokey', 'all'];
const SWITCH_TYPES = ['NONE', '2POS', '3POS', 'TOGGLE', 'MULTIPOS'];
const POT_TYPES = ['NONE', 'POT', 'SLIDER', 'MULTIPOS_SWITCH', 'axis_x', 'axis_y'];
const POT_TYPE_LABEL: Record<string, string> = {
  NONE: 'Not installed',
  POT: 'Pot (no detent)',
  SLIDER: 'Slider',
  MULTIPOS_SWITCH: 'Multi-position',
  axis_x: 'Joystick X axis',
  axis_y: 'Joystick Y axis',
  with_detent: 'Pot (with detent)',
  without_detent: 'Pot (no detent)',
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
const MT12_SWITCHES = ['SA', 'SB', 'SC', 'SD', 'FL1', 'FL2'];

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
          {MT12_SWITCHES.map((sw) => {
            const swCfg = cfg[sw] ?? { type: 'NONE', name: '' };
            return (
              <tr key={sw} className={css.tableRow}
                onMouseEnter={() => onHover(sw)}
                onMouseLeave={() => onHover(null)}>
                <td className={css.swLabel}>{sw}</td>
                <td>
                  <select className={css.selectSm} value={swCfg.type}
                    onChange={(e) => updateSwitch(sw, 'type', e.target.value)}>
                    {SWITCH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    {!SWITCH_TYPES.includes(swCfg.type) && <option value={swCfg.type}>{swCfg.type}</option>}
                  </select>
                </td>
                <td>
                  <input type="text" className={css.nameInput}
                    value={swCfg.name ?? ''} maxLength={10} placeholder="—"
                    onChange={(e) => updateSwitch(sw, 'name', e.target.value)} />
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
const MT12_POTS = ['P1', 'P2', 'P3', 'P4'];

function PotsTab({ onHover, sdRoot }: { onHover: (pot: string | null) => void; sdRoot: SdRoot | null }) {
  const radio = useEditorStore((s) => s.radio);
  const updateRadio = useEditorStore((s) => s.updateRadio);
  const [hiddenPots, setHiddenPots] = useState<Set<string>>(new Set());

  // Load hidden-pots preference from SD card webconfig.
  useEffect(() => {
    if (!sdRoot) return;
    readWebConfig<string[]>(sdRoot, 'hidden-inputs.json').then(data => {
      if (data) setHiddenPots(new Set(data));
    });
  }, [sdRoot]);

  if (!radio) return null;

  const cfg = radio.potsConfig ?? {};

  async function hide(pot: string) {
    const next = new Set(hiddenPots); next.add(pot); setHiddenPots(next);
    if (sdRoot) await writeWebConfig(sdRoot, 'hidden-inputs.json', [...next]);
  }
  async function show(pot: string) {
    const next = new Set(hiddenPots); next.delete(pot); setHiddenPots(next);
    if (sdRoot) await writeWebConfig(sdRoot, 'hidden-inputs.json', [...next]);
  }

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

  const visible = MT12_POTS.filter(p => !hiddenPots.has(p));
  const hidden  = MT12_POTS.filter(p =>  hiddenPots.has(p));

  return (
    <div className={css.section}>
      <p className={css.hint}>Hover a row to highlight the pot on the diagram.</p>
      <table className={css.table}>
        <thead>
          <tr>
            <th>Pot</th>
            <th>Type</th>
            <th>Inverted</th>
            <th>Custom name</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visible.map((pot) => {
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
                <td>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--text-muted)' }}
                    title="Hide this pot — it won't affect the transmitter"
                    onClick={() => hide(pot)}>
                    Hide
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {hidden.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Hidden (not installed): {hidden.join(', ')}
          </span>
          {hidden.map(pot => (
            <button key={pot} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
              onClick={() => show(pot)}>
              Show {pot}
            </button>
          ))}
        </div>
      )}

      <p className={css.hint} style={{ marginTop: 12 }}>
        P1 &amp; P2 are the knobs on the transmitter body. P3 &amp; P4 are the optional 4-way joystick expansion module (bottom slot).
        Hiding a pot here only affects this app — it does not change anything on your transmitter.
      </p>
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
    setToast('Radio settings backed up');
  }

  // When a diagram control is clicked, switch to the relevant settings tab.
  function handleDiagramSelect(control: string) {
    setDiagramSelected(control);
    if (['SA', 'SB', 'SC', 'SD', 'FL1', 'FL2'].includes(control)) setTab('switches');
    if (['P1', 'P2', 'P3', 'P4'].includes(control)) setTab('pots');
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
        <span className={css.title}>Radio Settings</span>
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
        {isDirty && (
          <button className="btn btn-primary btn-sm" onClick={saveRadio}>Save</button>
        )}
      </div>

      {radio && <TabBar tabs={TABS} active={tab} onChange={setTab} />}

      <div className={css.body}>
        {/* Left: tabbed settings — only when radio is loaded */}
        <div className={css.settingsPane}>
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
              {tab === 'switches' && <SwitchesTab onHover={handleHover} />}
              {tab === 'pots' && <PotsTab onHover={handleHover} sdRoot={sdRoot} />}
            </div>
          )}
        </div>

        {/* Right: MT12 diagram — always visible */}
        <div className={css.diagramPane}>
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
