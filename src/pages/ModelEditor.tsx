import { useState } from 'react';
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
import { YamlViewer } from '../components/yaml/YamlViewer.tsx';
import css from './ModelEditor.module.css';

interface Props {
  modelKey: string;
  navigate: (r: Route) => void;
}

const ADVANCED_TABS: Tab[] = [
  { id: 'module',      label: 'Module' },
  { id: 'timers',      label: 'Timers' },
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
  const [tab, setTab] = useState('module');
  const [diagramSelected, setDiagramSelected] = useState<string | undefined>(undefined);
  const [wizardActive, setWizardActive] = useState(false);
  const model = useEditorStore((s) => s.models[modelKey]);
  const isDirty = useEditorStore((s) => s.isDirty(modelKey));
  const updateModel = useEditorStore((s) => s.updateModel);
  const saveModel = useEditorStore((s) => s.saveModel);
  const sdRoot = useEditorStore((s) => s.sdRoot);

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
    setTab('module');
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
          <div className={css.diagramPanel}>
            <div className={css.diagramTitle}>MT12 controls</div>
            <Mt12Diagram sdRoot={sdRoot} model={model} selected={diagramSelected} onSelect={setDiagramSelected} />
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
          {tab === 'module'      && <ModuleEditor model={model} onChange={handleChange} />}
          {tab === 'timers'      && <TimerEditor model={model} onChange={handleChange} />}
          {tab === 'flightmodes' && <FlightModeEditor model={model} onChange={handleChange} />}
          {tab === 'mixes'       && <MixEditor model={model} onChange={handleChange} />}
          {tab === 'expos'       && <ExpoEditor model={model} onChange={handleChange} />}
          {tab === 'limits'      && <LimitsEditor model={model} onChange={handleChange} />}
          {tab === 'logicalsw'   && <LogicalSwEditor model={model} onChange={handleChange} />}
          {tab === 'specialfn'   && <SpecialFnEditor model={model} onChange={handleChange} />}
          {tab === 'kidmode'     && <KidModeWizard model={model} onChange={handleChange} modelKey={modelKey} />}
          {tab === 'yaml'        && <YamlViewer model={model} modelKey={modelKey} />}
        </div>

        <div className={css.diagramPanel}>
          <div className={css.diagramTitle}>MT12 controls</div>
          <Mt12Diagram sdRoot={sdRoot} model={model} selected={diagramSelected} onSelect={setDiagramSelected} />
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
