import { useState, useMemo } from 'react';
import type { Model } from '../../types/model.ts';
import { WeightSlider } from '../shared/WeightSlider.tsx';
import { SwitchPicker } from '../shared/SwitchPicker.tsx';
import { KidModeWizard } from '../kidmode/KidModeWizard.tsx';
import {
  analyseBasicPatterns,
  analysisToWizardParams,
  setThrottleWeight,
  setSteeringWeight,
  setSTrimWeight,
  setCruiseSpeed,
  setCruiseSw,
  removeCruise,
  addCruise,
  removeSTrim,
  addSTrim,
  defaultWizardParams,
  generateBasicModel,
  type BasicAnalysis,
  type WizardParams,
} from './basicPatterns.ts';
import { buildInputMap } from '../../codec/modelSummary.ts';
import { srcRawLabel } from '../../codec/srcRaw.ts';
import { MULTI_PROTOCOLS } from '../../codec/protocols.ts';
import css from './BasicMixView.module.css';

// Surface-relevant protocols shown in the wizard (most common first).
const SURFACE_PROTOCOLS = MULTI_PROTOCOLS.filter(p =>
  [43, 73, 28, 6].includes(p.id)
);

const FAILSAFE_OPTIONS = [
  { value: 'no pulses', label: 'Stop — cut all output (safest for surface vehicles)' },
  { value: 'hold',      label: 'Hold — keep last position' },
  { value: 'NOT_SET',   label: 'Not set — receiver decides' },
];

interface Props {
  model: Model;
  onChange: (updater: (m: Model) => Model) => void;
  onSwitchToAdvanced?: () => void;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BasicMixView({ model, onChange, onSwitchToAdvanced }: Props) {
  const [wizardActive, setWizardActive] = useState(false);
  const [kidControlActive, setKidControlActive] = useState(false);
  const analysis = useMemo(() => analyseBasicPatterns(model), [model]);

  // Inline KidControl wizard
  if (kidControlActive) {
    return (
      <div className={css.root}>
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12, alignSelf: 'flex-start' }}
          onClick={() => setKidControlActive(false)}>
          ← Back to summary
        </button>
        <KidModeWizard model={model} onChange={onChange} />
      </div>
    );
  }

  // Setup wizard
  if (analysis.kind === 'empty' || wizardActive) {
    const initialParams = (wizardActive && analysis.kind === 'recognised')
      ? analysisToWizardParams(analysis, model)
      : undefined;
    return (
      <SetupWizard
        onChange={onChange}
        initialParams={initialParams}
        onCancel={wizardActive ? () => setWizardActive(false) : undefined}
        onSwitchToAdvanced={onSwitchToAdvanced}
        onLaunchKidControl={() => { setWizardActive(false); setKidControlActive(true); }}
      />
    );
  }

  if (analysis.kind === 'unrecognised') {
    return <UnrecognisedNotice onSwitchToAdvanced={onSwitchToAdvanced} />;
  }

  return (
    <RecognisedView
      model={model}
      analysis={analysis}
      onChange={onChange}
      onRunWizard={() => setWizardActive(true)}
      onRunKidControl={() => setKidControlActive(true)}
    />
  );
}

// ── Unrecognised notice ────────────────────────────────────────────────────────

function UnrecognisedNotice({ onSwitchToAdvanced }: { onSwitchToAdvanced?: () => void }) {
  return (
    <div className={css.notice}>
      <span className={css.noticeIcon}>ℹ</span>
      <div>
        <p className={css.noticeTitle}>Custom configuration detected</p>
        <p className={css.noticeBody}>
          This model uses mix lines that don't match the standard surface patterns.
          {onSwitchToAdvanced && (
            <> <button className="btn btn-ghost btn-sm" style={{ marginLeft: 4 }}
              onClick={onSwitchToAdvanced}>Switch to Advanced view</button> to see and edit them.</>
          )}
        </p>
      </div>
    </div>
  );
}

// ── Recognised view ────────────────────────────────────────────────────────────

interface RecognisedViewProps {
  model: Model;
  analysis: BasicAnalysis;
  onChange: (updater: (m: Model) => Model) => void;
  onRunWizard: () => void;
  onRunKidControl: () => void;
}

function RecognisedView({ model, analysis, onChange, onRunWizard, onRunKidControl }: RecognisedViewProps) {
  const inputMap = useMemo(() => buildInputMap(model.expoData ?? []), [model.expoData]);
  const kidActive = !!model.flightModeData?.['1'];

  return (
    <div className={css.root}>
      {analysis.throttle && (
        <ThrottleCard analysis={analysis} inputMap={inputMap} onChange={onChange} />
      )}
      {analysis.steering && (
        <SteeringCard analysis={analysis} onChange={onChange} />
      )}

      {/* Radio link */}
      <RadioLinkCard model={model} onChange={onChange} />

      {/* KidControl */}
      <section className={css.card}>
        <div className={css.cardHeader}>
          <span className={css.cardIcon}>🔒</span>
          <span className={css.cardTitle}>KidControl</span>
          {kidActive && <span className={css.cardMeta}>Active</span>}
        </div>
        {kidActive ? (
          <>
            <p className={css.fieldHint}>KidControl is active — reduced throttle and steering limits are in effect when the trigger switch is engaged.</p>
            <button className="btn btn-ghost btn-sm" onClick={onRunKidControl}>
              ⚙ Re-run KidControl wizard
            </button>
          </>
        ) : (
          <>
            <p className={css.fieldHint}>KidControl adds a safe driving mode with reduced speed and steering limits, activated by a switch.</p>
            <button className="btn btn-ghost btn-sm" onClick={onRunKidControl}>
              + Set up KidControl
            </button>
          </>
        )}
      </section>

      {/* Setup wizard card */}
      <section className={css.card}>
        <div className={css.cardHeader}>
          <span className={css.cardIcon}>⚙</span>
          <span className={css.cardTitle}>Vehicle setup</span>
        </div>
        {analysis.throttle || analysis.steering ? (
          <>
            <p className={css.fieldHint}>Change throttle/steering channels, cruise control, or speed limiter settings.</p>
            <button className="btn btn-ghost btn-sm" onClick={onRunWizard}>
              ⚙ Re-run setup wizard
            </button>
          </>
        ) : (
          <>
            <p className={css.fieldHint}>No throttle or steering configured yet.</p>
            <button className="btn btn-ghost btn-sm" onClick={onRunWizard}>
              Run setup wizard
            </button>
          </>
        )}
      </section>
    </div>
  );
}

// ── Radio link card ───────────────────────────────────────────────────────────

function RadioLinkCard({ model, onChange }: { model: Model; onChange: (updater: (m: Model) => Model) => void }) {
  const mod = model.moduleData?.['0'];
  const subTypeParts = typeof mod?.subType === 'string' ? mod.subType.split(',') : [];
  const protocolId = subTypeParts.length ? parseInt(subTypeParts[0], 10) : 43;
  const protocol = MULTI_PROTOCOLS.find(p => p.id === protocolId);
  const failsafe = mod?.failsafeMode ?? 'NOT_SET';
  const failsafeLabel = FAILSAFE_OPTIONS.find(f => f.value === failsafe)?.label ?? failsafe;

  function setProtocol(id: number) {
    onChange((m) => ({
      ...m,
      moduleData: {
        ...m.moduleData,
        '0': { ...(m.moduleData?.['0'] ?? {}), subType: `${id},0` } as typeof m.moduleData[string],
      },
    }));
  }

  function setFailsafe(value: string) {
    onChange((m) => ({
      ...m,
      moduleData: {
        ...m.moduleData,
        '0': { ...(m.moduleData?.['0'] ?? {}), failsafeMode: value } as typeof m.moduleData[string],
      },
    }));
  }

  return (
    <section className={css.card}>
      <div className={css.cardHeader}>
        <span className={css.cardIcon}>📡</span>
        <span className={css.cardTitle}>Radio link</span>
        {protocol && <span className={css.cardMeta}>{protocol.name}</span>}
      </div>
      <p className={css.fieldHint}>Which receiver is in your vehicle, and what should happen if the signal is lost.</p>
      <div className={css.fieldRow}>
        <span className={css.fieldLabel}>Receiver protocol</span>
        <select
          style={{ background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', fontSize:13, fontFamily:'var(--font)' }}
          value={protocolId}
          onChange={(e) => setProtocol(parseInt(e.target.value))}
        >
          {SURFACE_PROTOCOLS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          {!SURFACE_PROTOCOLS.find(p => p.id === protocolId) && (
            <option value={protocolId}>{protocol?.name ?? `Protocol ${protocolId}`}</option>
          )}
        </select>
      </div>
      <div className={css.fieldRow}>
        <span className={css.fieldLabel}>Signal lost</span>
        <select
          style={{ background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', fontSize:13, fontFamily:'var(--font)' }}
          value={failsafe}
          onChange={(e) => setFailsafe(e.target.value)}
        >
          {FAILSAFE_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          {!FAILSAFE_OPTIONS.find(f => f.value === failsafe) && <option value={failsafe}>{failsafeLabel}</option>}
        </select>
      </div>
    </section>
  );
}

// ── Throttle card ──────────────────────────────────────────────────────────────

interface CardProps {
  analysis: BasicAnalysis;
  inputMap: Record<number, string>;
  onChange: (updater: (m: Model) => Model) => void;
}

function ThrottleCard({ analysis, inputMap, onChange }: CardProps) {
  const { throttle, cruise, drate } = analysis;
  if (!throttle) return null;
  return (
    <section className={css.card}>
      <div className={css.cardHeader}>
        <span className={css.cardIcon}>⚡</span>
        <span className={css.cardTitle}>Throttle</span>
        <span className={css.cardMeta}>CH{throttle.destCh + 1}</span>
      </div>
      <p className={css.fieldHint}>Your trigger controls forward/backward speed.</p>
      <div className={css.fieldRow}>
        <span className={css.fieldLabel}>Trigger rate</span>
        <WeightSlider value={throttle.weight} onChange={(v) => onChange((m) => setThrottleWeight(m, analysis, v))} min={0} max={100} />
      </div>
      {cruise ? (
        <CruiseSubCard analysis={analysis} onChange={onChange} />
      ) : (
        <button className={`btn btn-ghost btn-sm ${css.addBtn}`} onClick={() => onChange((m) => addCruise(m, analysis, 'SC2', 70))}>
          + Add cruise control
        </button>
      )}
      {drate && <DRateSubCard drate={drate} inputMap={inputMap} />}
    </section>
  );
}

function CruiseSubCard({ analysis, onChange }: { analysis: BasicAnalysis; onChange: CardProps['onChange'] }) {
  const { cruise } = analysis;
  if (!cruise) return null;
  return (
    <div className={css.subCard}>
      <div className={css.subHeader}>
        <span className={css.subTitle}>Cruise control</span>
        <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)', fontSize:12 }}
          onClick={() => onChange((m) => removeCruise(m, analysis))}>Remove</button>
      </div>
      <p className={css.fieldHint}>Hold this switch to drive at a fixed speed without pressing the trigger. Toggle again to disengage.</p>
      <div className={css.fieldRow}>
        <span className={css.fieldLabel}>Switch</span>
        <SwitchPicker value={cruise.setSw} onChange={(v) => onChange((m) => setCruiseSw(m, analysis, v))} />
      </div>
      <div className={css.fieldRow}>
        <span className={css.fieldLabel}>Cruise speed</span>
        <WeightSlider value={cruise.cruiseSpeed} onChange={(v) => onChange((m) => setCruiseSpeed(m, analysis, v))} min={0} max={100} />
      </div>
      {analysis.drate && <p className={css.fieldHint}>Base speed before the speed limiter knob is applied.</p>}
    </div>
  );
}

function DRateSubCard({ drate, inputMap }: { drate: NonNullable<BasicAnalysis['drate']>; inputMap: Record<number, string> }) {
  const knobLabel = inputMap[drate.chn] ?? srcRawLabel(drate.srcRaw);
  const [min, max] = drate.range;
  return (
    <div className={css.subCard}>
      <div className={css.subHeader}><span className={css.subTitle}>Speed limiter</span></div>
      <p className={css.fieldHint}>
        The <strong>{knobLabel}</strong> knob scales all throttle — fully down stops the vehicle ({min}–{max}%).
      </p>
    </div>
  );
}

// ── Steering card ──────────────────────────────────────────────────────────────

function SteeringCard({ analysis, onChange }: { analysis: BasicAnalysis; onChange: CardProps['onChange'] }) {
  const { steering, strim } = analysis;
  if (!steering) return null;
  return (
    <section className={css.card}>
      <div className={css.cardHeader}>
        <span className={css.cardIcon}>↔</span>
        <span className={css.cardTitle}>Steering</span>
        <span className={css.cardMeta}>CH{steering.destCh + 1}</span>
      </div>
      <p className={css.fieldHint}>Your steering wheel controls direction.</p>
      <div className={css.fieldRow}>
        <span className={css.fieldLabel}>Steering rate</span>
        <WeightSlider value={steering.weight} onChange={(v) => onChange((m) => setSteeringWeight(m, analysis, v))} min={0} max={100} />
      </div>
      {strim ? (
        <STrimSubCard analysis={analysis} onChange={onChange} />
      ) : (
        <button className={`btn btn-ghost btn-sm ${css.addBtn}`} onClick={() => onChange((m) => addSTrim(m, analysis))}>
          + Add steering trim
        </button>
      )}
    </section>
  );
}

function STrimSubCard({ analysis, onChange }: { analysis: BasicAnalysis; onChange: CardProps['onChange'] }) {
  const { strim } = analysis;
  if (!strim) return null;
  return (
    <div className={css.subCard}>
      <div className={css.subHeader}>
        <span className={css.subTitle}>Steering trim</span>
        <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)', fontSize:12 }}
          onClick={() => onChange((m) => removeSTrim(m, analysis))}>Remove</button>
      </div>
      <p className={css.fieldHint}>Adjusts the steering centre point.</p>
      <div className={css.fieldRow}>
        <span className={css.fieldLabel}>Trim amount</span>
        <WeightSlider value={strim.weight} onChange={(v) => onChange((m) => setSTrimWeight(m, analysis, v))} min={-100} max={100} />
      </div>
    </div>
  );
}

// ── Setup wizard ───────────────────────────────────────────────────────────────

type WizardStep = 'module' | 'throttle' | 'cruise' | 'drate' | 'steering' | 'kidcontrol' | 'confirm';
const STEPS: WizardStep[] = ['module', 'throttle', 'cruise', 'drate', 'steering', 'kidcontrol', 'confirm'];
const STEP_LABELS: Record<WizardStep, string> = {
  module: 'Radio link', throttle: 'Throttle', cruise: 'Cruise', drate: 'Speed limiter',
  steering: 'Steering', kidcontrol: 'KidControl', confirm: 'Done',
};

interface WizardProps {
  onChange: (updater: (m: Model) => Model) => void;
  initialParams?: WizardParams;
  onCancel?: () => void;
  onSwitchToAdvanced?: () => void;
  onLaunchKidControl: () => void;
}

function SetupWizard({ onChange, initialParams, onCancel, onSwitchToAdvanced, onLaunchKidControl }: WizardProps) {
  const [step, setStep] = useState<WizardStep>('throttle');
  const [params, setParams] = useState<WizardParams>(initialParams ?? defaultWizardParams());

  function patch(p: Partial<WizardParams>) { setParams(prev => ({ ...prev, ...p })); }
  function next() { setStep(STEPS[STEPS.indexOf(step) + 1]); }
  function back() { setStep(STEPS[STEPS.indexOf(step) - 1]); }

  function finish() {
    const generated = generateBasicModel(params);
    onChange((m) => ({
      ...m,
      mixData: generated.mixData,
      expoData: [...(m.expoData ?? []).filter(() => false), ...generated.expoData],
      logicalSw: { ...(m.logicalSw ?? {}), ...generated.logicalSw },
      inputNames: { ...(m.inputNames ?? {}), ...generated.inputNames },
      moduleData: generated.moduleData,
    }));
    if (params.wantKidControl) {
      onLaunchKidControl();
    } else {
      onCancel?.();
    }
  }

  const chOptions = Array.from({ length: 16 }, (_, i) => (
    <option key={i} value={i}>CH{i + 1}</option>
  ));

  return (
    <div className={css.wizard}>
      <div className={css.wizardHeader}>
        <h2 className={css.wizardTitle}>
          {initialParams ? 'Reconfigure your vehicle' : 'Set up your vehicle'}
        </h2>
        <p className={css.wizardSub}>
          {initialParams
            ? 'Adjust the configuration below. This will replace your current mixes.'
            : 'Answer a few questions to create the right configuration for your transmitter.'}
        </p>
        {onSwitchToAdvanced && (
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}
            onClick={onSwitchToAdvanced}>
            Prefer to configure manually? Switch to Advanced view
          </button>
        )}
      </div>

      <div className={css.breadcrumb}>
        {STEPS.map((s, i) => (
          <span key={s} style={{ display:'flex', alignItems:'center', gap:4 }}>
            {i > 0 && <span className={css.crumbSep}>›</span>}
            <span className={s === step ? css.crumbActive : css.crumb}>{STEP_LABELS[s]}</span>
          </span>
        ))}
      </div>

      {step === 'module' && (
        <>
          <p className={css.stepTitle}>Radio link</p>
          <p className={css.stepSub}>What receiver is fitted in your vehicle, and what should the vehicle do if the radio signal is lost?</p>
          <div className={css.wizardConfig}>
            <div className={css.fieldRow}>
              <span className={css.fieldLabel}>Receiver protocol</span>
              <select
                style={{ background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', fontSize:13, fontFamily:'var(--font)' }}
                value={params.moduleProtocol}
                onChange={(e) => patch({ moduleProtocol: parseInt(e.target.value) })}
              >
                {SURFACE_PROTOCOLS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {SURFACE_PROTOCOLS.find(p => p.id === params.moduleProtocol)?.note && (
              <p className={css.fieldHint}>{SURFACE_PROTOCOLS.find(p => p.id === params.moduleProtocol)!.note}</p>
            )}
            <div className={css.fieldRow}>
              <span className={css.fieldLabel}>If signal is lost</span>
              <select
                style={{ background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', fontSize:13, fontFamily:'var(--font)' }}
                value={params.moduleFailsafe}
                onChange={(e) => patch({ moduleFailsafe: e.target.value })}
              >
                {FAILSAFE_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
          <div className={css.wizardActions}>
            {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
            <button className="btn btn-primary btn-sm" onClick={next}>Next →</button>
          </div>
        </>
      )}

      {step === 'throttle' && (
        <>
          <p className={css.stepTitle}>Throttle</p>
          <p className={css.stepSub}>Your trigger controls speed. Which channel does your ESC/motor listen to?</p>
          <div className={css.wizardConfig}>
            <div className={css.fieldRow}>
              <span className={css.fieldLabel}>Throttle channel</span>
              <select className={css.channelSelect} value={params.throttleDestCh}
                onChange={(e) => patch({ throttleDestCh: parseInt(e.target.value) })}>
                {chOptions}
              </select>
            </div>
          </div>
          <div className={css.wizardActions}>
            {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
            <button className="btn btn-primary btn-sm" onClick={next}>Next →</button>
          </div>
        </>
      )}

      {step === 'cruise' && (
        <>
          <p className={css.stepTitle}>Cruise control</p>
          <p className={css.stepSub}>Drive at a fixed speed without holding the trigger, toggled by a switch.</p>
          <div className={css.choiceGrid}>
            <button className={params.wantCruise ? css.choiceBtnActive : css.choiceBtn} onClick={() => patch({ wantCruise: true })}>
              <span className={css.choiceLabel}>Yes, add cruise control</span>
              <span className={css.choiceDesc}>Pick a switch to toggle cruise on/off</span>
            </button>
            <button className={!params.wantCruise ? css.choiceBtnActive : css.choiceBtn} onClick={() => patch({ wantCruise: false })}>
              <span className={css.choiceLabel}>No cruise control</span>
              <span className={css.choiceDesc}>Trigger always controls throttle directly</span>
            </button>
          </div>
          {params.wantCruise && (
            <div className={css.wizardConfig}>
              <div className={css.fieldRow}>
                <span className={css.fieldLabel}>Cruise switch</span>
                <SwitchPicker value={params.cruiseSw} onChange={(v) => patch({ cruiseSw: v })} />
              </div>
              <div className={css.fieldRow}>
                <span className={css.fieldLabel}>Cruise speed</span>
                <WeightSlider value={params.cruiseSpeed} onChange={(v) => patch({ cruiseSpeed: v })} min={0} max={100} />
              </div>
            </div>
          )}
          <div className={css.wizardActions}>
            <button className="btn btn-ghost btn-sm" onClick={back}>← Back</button>
            <button className="btn btn-primary btn-sm" onClick={next}>Next →</button>
          </div>
        </>
      )}

      {step === 'drate' && (
        <>
          <p className={css.stepTitle}>Speed limiter knob</p>
          <p className={css.stepSub}>Use the P2 knob to scale your maximum throttle — useful for letting younger drivers use the same transmitter.</p>
          <div className={css.choiceGrid}>
            <button className={params.wantDRate ? css.choiceBtnActive : css.choiceBtn} onClick={() => patch({ wantDRate: true })}>
              <span className={css.choiceLabel}>Yes, add speed limiter</span>
              <span className={css.choiceDesc}>P2 knob limits maximum speed</span>
            </button>
            <button className={!params.wantDRate ? css.choiceBtnActive : css.choiceBtn} onClick={() => patch({ wantDRate: false })}>
              <span className={css.choiceLabel}>No speed limiter</span>
              <span className={css.choiceDesc}>Full throttle always available</span>
            </button>
          </div>
          <div className={css.wizardActions}>
            <button className="btn btn-ghost btn-sm" onClick={back}>← Back</button>
            <button className="btn btn-primary btn-sm" onClick={next}>Next →</button>
          </div>
        </>
      )}

      {step === 'steering' && (
        <>
          <p className={css.stepTitle}>Steering</p>
          <p className={css.stepSub}>Your steering wheel controls direction.</p>
          <div className={css.choiceGrid}>
            <button className={params.wantSteering ? css.choiceBtnActive : css.choiceBtn} onClick={() => patch({ wantSteering: true })}>
              <span className={css.choiceLabel}>Set up steering</span>
              <span className={css.choiceDesc}>Steering wheel controls direction</span>
            </button>
            <button className={!params.wantSteering ? css.choiceBtnActive : css.choiceBtn} onClick={() => patch({ wantSteering: false })}>
              <span className={css.choiceLabel}>Skip steering</span>
              <span className={css.choiceDesc}>Configure manually in Advanced view</span>
            </button>
          </div>
          {params.wantSteering && (
            <div className={css.wizardConfig}>
              <div className={css.fieldRow}>
                <span className={css.fieldLabel}>Steering channel</span>
                <select className={css.channelSelect} value={params.steeringDestCh}
                  onChange={(e) => patch({ steeringDestCh: parseInt(e.target.value) })}>
                  {chOptions}
                </select>
              </div>
              <div className={css.fieldRow}>
                <span className={css.fieldLabel}>Steering trim</span>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                  <input type="checkbox" checked={params.wantSTrim}
                    onChange={(e) => patch({ wantSTrim: e.target.checked })}
                    style={{ accentColor:'var(--accent)', width:14, height:14 }} />
                  <span style={{ fontSize:13, color:'var(--text-muted)' }}>Add a trim adjustment for steering centre</span>
                </label>
              </div>
            </div>
          )}
          <div className={css.wizardActions}>
            <button className="btn btn-ghost btn-sm" onClick={back}>← Back</button>
            <button className="btn btn-primary btn-sm" onClick={next}>Next →</button>
          </div>
        </>
      )}

      {step === 'kidcontrol' && (
        <>
          <p className={css.stepTitle}>KidControl</p>
          <p className={css.stepSub}>KidControl adds a safe driving mode with reduced speed and steering limits, activated by a switch. Great for younger or less experienced drivers.</p>
          <div className={css.choiceGrid}>
            <button className={params.wantKidControl ? css.choiceBtnActive : css.choiceBtn} onClick={() => patch({ wantKidControl: true })}>
              <span className={css.choiceLabel}>Yes, set up KidControl</span>
              <span className={css.choiceDesc}>Launch the KidControl wizard after this step</span>
            </button>
            <button className={!params.wantKidControl ? css.choiceBtnActive : css.choiceBtn} onClick={() => patch({ wantKidControl: false })}>
              <span className={css.choiceLabel}>Not now</span>
              <span className={css.choiceDesc}>Can be set up later from the model summary</span>
            </button>
          </div>
          <div className={css.wizardActions}>
            <button className="btn btn-ghost btn-sm" onClick={back}>← Back</button>
            <button className="btn btn-primary btn-sm" onClick={next}>Next →</button>
          </div>
        </>
      )}

      {step === 'confirm' && (
        <>
          <p className={css.stepTitle}>Ready to {initialParams ? 'apply' : 'create'}</p>
          <div className={css.wizardConfig} style={{ gap:6 }}>
            <p style={{ margin:0, fontSize:13, color:'var(--text)' }}>
              <strong>Radio link</strong>: {SURFACE_PROTOCOLS.find(p => p.id === params.moduleProtocol)?.name ?? `Protocol ${params.moduleProtocol}`} · Failsafe: {FAILSAFE_OPTIONS.find(f => f.value === params.moduleFailsafe)?.label?.split(' — ')[0] ?? params.moduleFailsafe}
            </p>
            <p style={{ margin:0, fontSize:13, color:'var(--text)' }}>
              <strong>Throttle</strong> on CH{params.throttleDestCh + 1}
              {params.wantCruise && ` · Cruise via ${params.cruiseSw} (${params.cruiseSpeed}%)`}
              {params.wantDRate && ' · Speed limiter (P2 knob)'}
            </p>
            {params.wantSteering && (
              <p style={{ margin:0, fontSize:13, color:'var(--text)' }}>
                <strong>Steering</strong> on CH{params.steeringDestCh + 1}
                {params.wantSTrim && ' · with trim'}
              </p>
            )}
            {params.wantKidControl && (
              <p style={{ margin:0, fontSize:13, color:'var(--text)' }}>
                <strong>KidControl</strong> — wizard will launch next
              </p>
            )}
          </div>
          <div className={css.wizardActions}>
            <button className="btn btn-ghost btn-sm" onClick={back}>← Back</button>
            {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
            <button className="btn btn-primary btn-sm" onClick={finish}>
              {params.wantKidControl ? 'Create & launch KidControl →' : (initialParams ? 'Apply configuration' : 'Create configuration')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
