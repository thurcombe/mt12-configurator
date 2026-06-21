import { useState } from 'react';
import type React from 'react';
import type { Route } from '../App.tsx';
import { useEditorStore } from '../store/useEditorStore.ts';
import { TabBar } from '../components/layout/TabBar.tsx';
import type { Tab } from '../components/layout/TabBar.tsx';
import { ModuleEditor } from '../components/module/ModuleEditor.tsx';
import { TimerEditor } from '../components/timers/TimerEditor.tsx';
import { FlightModeEditor } from '../components/flightmodes/FlightModeEditor.tsx';
import { MixEditor } from '../components/mixes/MixEditor.tsx';
import { ExpoEditor } from '../components/expos/ExpoEditor.tsx';
import { LimitsEditor } from '../components/limits/LimitsEditor.tsx';
import { LogicalSwEditor } from '../components/logicalsw/LogicalSwEditor.tsx';
import { SpecialFnEditor } from '../components/specialfn/SpecialFnEditor.tsx';
import { KidModeWizard } from '../components/kidmode/KidModeWizard.tsx';
import { BasicMixView } from '../components/mixes/BasicMixView.tsx';
import { Mt12Diagram } from '../components/radio/Mt12Diagram.tsx';
import { getExpansionConflict } from '../components/models/expansionConflict.ts';
import { YamlViewer } from '../components/yaml/YamlViewer.tsx';
import { isKidModeActive, removeKidMode } from '../components/kidmode/kidGenerator.ts';
import { MULTI_PROTOCOLS } from '../codec/protocols.ts';
import type { Model } from '../types/model.ts';
import css from './ModelEditor.module.css';

// ── Vehicle details tab ────────────────────────────────────────────────────────

const FAILSAFE_OPTS = [
  { value: 'no pulses', label: 'Stop — safest' },
  { value: 'hold',      label: 'Hold — keep last position' },
  { value: 'NOT_SET',   label: 'Not set — receiver decides' },
];

function VehicleDetailsTab({ model, modelKey, navigate, onChange }: {
  model: Model;
  modelKey: string;
  navigate: (r: Route) => void;
  onChange: (updater: (m: Model) => Model) => void;
}) {
  const vehicleCategories = useEditorStore(s => s.vehicleCategories);
  const modelMeta = useEditorStore(s => s.modelMeta[modelKey]);
  const setModelVehicleType = useEditorStore(s => s.setModelVehicleType);
  const clearKidControlSnapshot = useEditorStore(s => s.clearKidControlSnapshot);

  const selectedCat = vehicleCategories.find(c => c.id === (modelMeta?.vehicleType ?? ''));

  const [pendingVehicleType, setPendingVehicleType] = useState<string | null>(null);

  function handleVehicleTypeChange(newValue: string) {
    if (isKidModeActive(model)) {
      setPendingVehicleType(newValue);
    } else {
      setModelVehicleType(modelKey, newValue);
    }
  }

  const mod = model.moduleData?.['0'];
  const subTypeParts = typeof mod?.subType === 'string' ? mod.subType.split(',') : [];
  const protocolId = subTypeParts.length ? parseInt(subTypeParts[0], 10) : 43;
  const protocol = MULTI_PROTOCOLS.find(p => p.id === protocolId);
  const failsafe = mod?.failsafeMode ?? 'NOT_SET';

  function setProtocol(id: number) {
    onChange(m => ({
      ...m,
      moduleData: {
        ...m.moduleData,
        '0': { ...(m.moduleData?.['0'] ?? {}), subType: `${id},0` } as typeof m.moduleData[string],
      },
    }));
  }

  function setFailsafe(value: string) {
    onChange(m => ({
      ...m,
      moduleData: {
        ...m.moduleData,
        '0': { ...(m.moduleData?.['0'] ?? {}), failsafeMode: value } as typeof m.moduleData[string],
      },
    }));
  }

  const fieldRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 };
  const fieldLabel: React.CSSProperties = { fontSize: 13, color: 'var(--text-muted)', minWidth: 130 };
  const sel: React.CSSProperties = { background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 13, fontFamily: 'var(--font)' };

  return (
    <div style={{ maxWidth: 560 }}>
      <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Model</div>
        <div style={fieldRow}>
          <span style={fieldLabel}>Name</span>
          <input
            type="text"
            style={{ background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', fontSize:13, fontFamily:'var(--font)', width:180 }}
            value={model.header?.name ?? ''}
            placeholder={modelKey}
            maxLength={15}
            onChange={(e) => onChange(m => ({ ...m, header: { ...m.header, name: e.target.value } }))}
          />
        </div>
      </section>

      <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Vehicle type</div>
        <div style={fieldRow}>
          <span style={fieldLabel}>Type</span>
          <select style={sel} value={modelMeta?.vehicleType ?? ''} onChange={e => handleVehicleTypeChange(e.target.value)}>
            <option value="">Not specified</option>
            {vehicleCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        {selectedCat && (
          <>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, marginBottom: 10 }}>
              {selectedCat.description} · {selectedCat.speedMin}–{selectedCat.speedMax} mph
            </p>
            <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Steering character</div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${selectedCat.steeringCharacter}%`, background: 'var(--accent)', borderRadius: 3 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                  <span>Stable</span><span>Twitchy</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Power delivery</div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${selectedCat.powerDelivery}%`, background: 'var(--accent)', borderRadius: 3 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                  <span>Smooth</span><span>Punchy</span>
                </div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => navigate({ page: 'vehicle-types' })}>
              Edit vehicle types →
            </button>
          </>
        )}
      </section>

      <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px' }}>
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Radio link</div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Which receiver is in your vehicle, and what should happen if the signal is lost.</p>
        <div style={fieldRow}>
          <span style={fieldLabel}>Receiver protocol</span>
          <select style={sel} value={protocolId} onChange={e => setProtocol(parseInt(e.target.value))}>
            {MULTI_PROTOCOLS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            {!MULTI_PROTOCOLS.find(p => p.id === protocolId) && (
              <option value={protocolId}>{protocol?.name ?? `Protocol ${protocolId}`}</option>
            )}
          </select>
        </div>
        <div style={fieldRow}>
          <span style={fieldLabel}>Signal lost</span>
          <select style={sel} value={failsafe} onChange={e => setFailsafe(e.target.value)}>
            {FAILSAFE_OPTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            {!FAILSAFE_OPTS.find(f => f.value === failsafe) && <option value={failsafe}>{failsafe}</option>}
          </select>
        </div>
      </section>

      {pendingVehicleType !== null && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:24, maxWidth:400, width:'90%', boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
            <p style={{ fontSize:14, lineHeight:1.5, margin:'0 0 20px' }}>
              <strong>KidControl will be removed</strong><br/>
              This model has KidControl configured. Changing the vehicle type will remove the KidControl setup — you can configure it again afterwards.
            </p>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setPendingVehicleType(null)}>Cancel</button>
              <button className="btn btn-danger btn-sm" onClick={() => {
                onChange(m => removeKidMode(m));
                clearKidControlSnapshot(modelKey);
                setModelVehicleType(modelKey, pendingVehicleType);
                setPendingVehicleType(null);
              }}>Change type &amp; remove KidControl</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  modelKey: string;
  navigate: (r: Route) => void;
}

const ADVANCED_TABS: Tab[] = [
  { id: 'vehicle-details', label: 'Vehicle' },
  { id: 'module',          label: 'Module' },
  { id: 'timers',          label: 'Timers' },
  { id: 'flightmodes', label: 'Drive Modes' },
  { id: 'mixes',       label: 'Mixes' },
  { id: 'expos',       label: 'Expos' },
  { id: 'limits',      label: 'Limits' },
  { id: 'logicalsw',   label: 'Logical Sw' },
  { id: 'specialfn',   label: 'Special Fn' },
  { id: 'kidmode',     label: 'KidControl' },
  { id: 'yaml',        label: 'YAML' },
];

const TAB_DESCRIPTIONS: Record<string, string> = {
  'vehicle-details':
    'Vehicle type, physical characteristics, and the radio link used to communicate with your receiver.',
  module:
    'Configures the radio transmitter module — the hardware that sends the RF signal to your receiver. ' +
    'For the MT12 you will typically use the built-in Multi-Protocol module (MULTI) paired with a protocol that matches your receiver, ' +
    'such as Traxxas TQi, FlySky AFHDS2A, or Spektrum DSM.',
  timers:
    'Timers count elapsed time during use. You can set them to count up from zero, or count down from a preset time with an audio warning. ' +
    'Useful for tracking battery usage, run sessions, or enforcing a driving time limit.',
  flightmodes:
    'Drive modes (called "flight modes" in EdgeTX) let you switch between completely different sets of settings using a physical switch. ' +
    'FM0 is always the default. FM1 onwards activate when their assigned switch is flipped — for example Kid Mode runs in FM1 with reduced throttle and steering limits.',
  mixes:
    'Mixes define how physical inputs (trigger, wheel, switches, pots) are processed into the output channels sent to the receiver. ' +
    'CH3 typically controls throttle, CH4 steering. Each channel can have multiple mix lines stacked.',
  expos:
    'Expo (exponential) and dual rate settings shape how your controls feel to drive. ' +
    'Dual rate sets the maximum stick travel as a percentage. ' +
    'Expo curves the response near the centre position, making fine control gentler without reducing the maximum.',
  limits:
    'Output limits cap the minimum and maximum servo signal sent on each channel, protecting against over-travel. ' +
    'Subtrim adjusts the neutral/centre point. Invert flips the direction of a channel.',
  logicalsw:
    'Logical switches are virtual switches you create from conditions — for example a sticky switch that latches on when triggered and stays on until reset. ' +
    'They can be used in mixes (cruise control) or triggers in special functions.',
  specialfn:
    'Special functions run actions when a switch is activated — playing an audio file, adjusting the backlight, resetting a timer, or setting a global variable.',
  kidmode:
    'KidControl creates a safe driving profile with reduced maximum throttle and steering, a softer throttle ramp-up, ' +
    'activated by a switch you choose. Flip the switch back to return to full control.',
};

export function ModelEditor({ modelKey, navigate }: Props) {
  const [viewMode, setViewMode] = useState<'basic' | 'advanced'>('basic');
  const [tab, setTab] = useState('vehicle-details');
  const [diagramSelected, setDiagramSelected] = useState<string | undefined>(undefined);
  const [wizardActive, setWizardActive] = useState(false);
  const model = useEditorStore((s) => s.models[modelKey]);
  const isDirty = useEditorStore((s) => s.isDirty(modelKey));
  const updateModel = useEditorStore((s) => s.updateModel);
  const saveModel = useEditorStore((s) => s.saveModel);
  const sdRoot = useEditorStore((s) => s.sdRoot);
  const expansionModule = useEditorStore((s) => s.expansionModule);
  const expansionConflict = model ? getExpansionConflict(model, expansionModule()) : null;
  // Normalise position refs (e.g. FL12 → FL1) to diagram control keys
  const diagramWarnings = expansionConflict
    ? [...new Set(expansionConflict.controls.map(c => c.match(/^(FL[12])\d$/) ? c.slice(0, 3) : c))]
    : undefined;

  if (!model) {
    return (
      <div style={{ padding: 28 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate({ page: 'list' })} style={{ marginBottom: 20 }}>
          ← Back to models
        </button>
        <p style={{ color: 'var(--text-muted)' }}>Model not found: {modelKey}</p>
      </div>
    );
  }

  function handleChange(updater: (m: typeof model) => typeof model) {
    updateModel(modelKey, updater);
  }

  function switchToAdvanced() {
    setViewMode('advanced');
    setTab('vehicle-details');
  }

  // ── Basic view ─────────────────────────────────────────────────────────────

  if (viewMode === 'basic') {
    return (
      <>
      <div className={css.root}>
        <div className={css.topBar}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate({ page: 'list' })}>
            ← Back
          </button>
          {isDirty && (
            <button className="btn btn-primary btn-sm" onClick={() => saveModel(modelKey)}>Save</button>
          )}
          {!wizardActive && (
            <input
              type="text"
              className={css.nameInput}
              value={model.header?.name ?? ''}
              placeholder={modelKey}
              maxLength={15}
              onChange={(e) => handleChange((m) => ({ ...m, header: { ...m.header, name: e.target.value } }))}
            />
          )}
          {isDirty && <span className="badge badge-warning">Unsaved</span>}
          <div style={{ flex: 1 }} />
          <div className={css.toggleGroup}>
            <button className={css.toggleActive}>Basic</button>
            <button className={css.toggle} onClick={switchToAdvanced}>Advanced</button>
          </div>
        </div>

        <div className={css.body}>
          <div className={css.content}>
            <BasicMixView model={model} modelKey={modelKey} onChange={handleChange} onWizardActiveChange={setWizardActive} />
          </div>
          <div className={`${css.diagramPanel} card-panel`}>
            <div className={css.diagramTitle}>MT12 controls</div>
            <Mt12Diagram sdRoot={sdRoot} model={model} selected={diagramSelected} onSelect={setDiagramSelected} warningControls={diagramWarnings} />
            {diagramSelected && (
              <p className={css.diagramHint}>
                <strong>{diagramSelected}</strong> — physical location on transmitter
              </p>
            )}
          </div>
        </div>
      </div>
      </>
    );
  }

  // ── Advanced view ───────────────────────────────────────────────────────────

  const tabDesc = TAB_DESCRIPTIONS[tab];

  return (
    <>
    <div className={css.root}>
      <div className={css.topBar}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate({ page: 'list' })}>
          ← Back
        </button>
        {isDirty && (
          <button className="btn btn-primary btn-sm" onClick={() => saveModel(modelKey)}>Save</button>
        )}
        <input
          type="text"
          className={css.nameInput}
          value={model.header?.name ?? ''}
          placeholder={modelKey}
          maxLength={15}
          onChange={(e) => handleChange((m) => ({ ...m, header: { ...m.header, name: e.target.value } }))}
        />
        {isDirty && <span className="badge badge-warning">Unsaved</span>}
        <div style={{ flex: 1 }} />
        <div className={css.toggleGroup}>
          <button className={css.toggle} onClick={() => setViewMode('basic')}>Basic</button>
          <button className={css.toggleActive}>Advanced</button>
        </div>
      </div>

      <TabBar tabs={ADVANCED_TABS} active={tab} onChange={setTab} />

      <div className={css.body}>
        <div className={css.content}>
          {tabDesc && <p className={css.tabDesc}>{tabDesc}</p>}
          {tab === 'vehicle-details' && <VehicleDetailsTab model={model} modelKey={modelKey} navigate={navigate} onChange={handleChange} />}
          {tab === 'module'      && <ModuleEditor model={model} onChange={handleChange} />}
          {tab === 'timers'      && <TimerEditor model={model} onChange={handleChange} />}
          {tab === 'flightmodes' && <FlightModeEditor model={model} onChange={handleChange} expansionConflict={expansionConflict} />}
          {tab === 'mixes'       && <MixEditor model={model} onChange={handleChange} expansionConflict={expansionConflict} />}
          {tab === 'expos'       && <ExpoEditor model={model} onChange={handleChange} expansionConflict={expansionConflict} />}
          {tab === 'limits'      && <LimitsEditor model={model} onChange={handleChange} />}
          {tab === 'logicalsw'   && <LogicalSwEditor model={model} onChange={handleChange} expansionConflict={expansionConflict} />}
          {tab === 'specialfn'   && <SpecialFnEditor model={model} onChange={handleChange} expansionConflict={expansionConflict} />}
          {tab === 'kidmode'     && <KidModeWizard model={model} onChange={handleChange} modelKey={modelKey} />}
          {tab === 'yaml'        && <YamlViewer model={model} modelKey={modelKey} />}
        </div>

        <div className={css.diagramPanel}>
          <div className={css.diagramTitle}>MT12 controls</div>
          <Mt12Diagram sdRoot={sdRoot} model={model} selected={diagramSelected} onSelect={setDiagramSelected} warningControls={diagramWarnings} />
          {diagramSelected && (
            <p className={css.diagramHint}>
              <strong>{diagramSelected}</strong> — physical location on transmitter
            </p>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
