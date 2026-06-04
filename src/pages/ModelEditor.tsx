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
import { ModelSummary } from '../components/models/ModelSummary.tsx';
import { Mt12Diagram } from '../components/radio/Mt12Diagram.tsx';
import css from './ModelEditor.module.css';

interface Props {
  modelKey: string;
  navigate: (r: Route) => void;
}

const TABS: Tab[] = [
  { id: 'summary',     label: 'Summary' },
  { id: 'module',      label: 'Module' },
  { id: 'timers',      label: 'Timers' },
  { id: 'flightmodes', label: 'Flight Modes' },
  { id: 'mixes',       label: 'Mixes' },
  { id: 'expos',       label: 'Expos' },
  { id: 'limits',      label: 'Limits' },
  { id: 'logicalsw',   label: 'Logical Sw' },
  { id: 'specialfn',   label: 'Special Fn' },
  { id: 'kidmode',     label: 'Kid Mode' },
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
    'CH3 typically controls throttle, CH4 steering. Each channel can have multiple mix lines stacked — for example a base throttle input, ' +
    'multiplied by a dial for speed limiting, with a cruise-hold override on a switch.',
  expos:
    'Expo (exponential) and dual rate settings shape how your controls feel to drive. ' +
    'Dual rate sets the maximum stick travel as a percentage — 70% means the trigger can only reach 70% of full throttle. ' +
    'Expo curves the response near the centre position, making fine control gentler without reducing the maximum. ' +
    'You can have different rates switch in via a physical switch.',
  limits:
    'Output limits cap the minimum and maximum servo signal sent on each channel, protecting against over-travel that could damage servos or linkages. ' +
    'Subtrim adjusts the neutral/centre point without touching the physical trim levers. ' +
    'Invert flips the direction of a channel if your servo is wired in reverse.',
  logicalsw:
    'Logical switches are virtual switches you create from conditions — for example "SC is up AND throttle is above 30%", ' +
    'or a sticky switch that latches on when triggered and stays on until reset. ' +
    'They can be used as sources in mixes (cruise control) or triggers in special functions (play a sound).',
  specialfn:
    'Special functions run actions when a switch is activated — playing an audio file, adjusting the backlight, resetting a timer, ' +
    'setting a global variable, or disabling switches. The MT12 can play WAV files from the SD card for spoken alerts.',
  kidmode:
    'Kid Mode creates a safe driving profile for younger or less experienced drivers. ' +
    'It adds a second drive mode (FM1) with reduced maximum throttle and steering, a softer throttle ramp-up, ' +
    'and is activated by a switch you choose. The normal driving mode is unaffected — flip the switch back to return to full control.',
};

export function ModelEditor({ modelKey, navigate }: Props) {
  const [tab, setTab] = useState('summary');
  const [diagramSelected, setDiagramSelected] = useState<string | undefined>(undefined);
  const model = useEditorStore((s) => s.models[modelKey]);
  const isDirty = useEditorStore((s) => s.isDirty(modelKey));
  const updateModel = useEditorStore((s) => s.updateModel);
  const saveModel = useEditorStore((s) => s.saveModel);

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

  const tabDesc = TAB_DESCRIPTIONS[tab];

  return (
    <div className={css.root}>
      <div className={css.topBar}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate({ page: 'list' })}>
          ← Back
        </button>
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
        {isDirty && (
          <button className="btn btn-primary btn-sm" onClick={() => saveModel(modelKey)}>
            Save
          </button>
        )}
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <div className={css.body}>
        <div className={css.content}>
          {/* Tab description */}
          {tabDesc && (
            <p className={css.tabDesc}>{tabDesc}</p>
          )}

          {tab === 'summary'     && <ModelSummary model={model} onHoverControl={(c) => setDiagramSelected(c ?? undefined)} />}
          {tab === 'module'      && <ModuleEditor model={model} onChange={handleChange} />}
          {tab === 'timers'      && <TimerEditor model={model} onChange={handleChange} />}
          {tab === 'flightmodes' && <FlightModeEditor model={model} onChange={handleChange} />}
          {tab === 'mixes'       && <MixEditor model={model} onChange={handleChange} />}
          {tab === 'expos'       && <ExpoEditor model={model} onChange={handleChange} />}
          {tab === 'limits'      && <LimitsEditor model={model} onChange={handleChange} />}
          {tab === 'logicalsw'   && <LogicalSwEditor model={model} onChange={handleChange} />}
          {tab === 'specialfn'   && <SpecialFnEditor model={model} onChange={handleChange} />}
          {tab === 'kidmode'     && <KidModeWizard model={model} onChange={handleChange} />}
        </div>

        {/* MT12 diagram — always visible on right */}
        <div className={css.diagramPanel}>
          <div className={css.diagramTitle}>MT12 controls</div>
          <Mt12Diagram compact selected={diagramSelected} onSelect={setDiagramSelected} />
          {diagramSelected && (
            <p className={css.diagramHint}>
              <strong>{diagramSelected}</strong> — physical location on transmitter
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
