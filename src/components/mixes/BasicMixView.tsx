import { useState, useMemo } from 'react';
import type { Model } from '../../types/model.ts';
import { WeightSlider } from '../shared/WeightSlider.tsx';
import { SwitchPicker } from '../shared/SwitchPicker.tsx';
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
import css from './BasicMixView.module.css';

interface Props {
  model: Model;
  onChange: (updater: (m: Model) => Model) => void;
  onSwitchToAdvanced?: () => void;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BasicMixView({ model, onChange, onSwitchToAdvanced }: Props) {
  const [wizardActive, setWizardActive] = useState(false);
  const analysis = useMemo(() => analyseBasicPatterns(model), [model]);

  // New/empty model → wizard immediately, no cancel button
  if (analysis.kind === 'empty' || wizardActive) {
    const initialParams = (wizardActive && analysis.kind === 'recognised')
      ? analysisToWizardParams(analysis)
      : undefined;
    return (
      <SetupWizard
        model={model}
        onChange={onChange}
        initialParams={initialParams}
        onCancel={wizardActive ? () => setWizardActive(false) : undefined}
        onSwitchToAdvanced={onSwitchToAdvanced}
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
      onSwitchToAdvanced={onSwitchToAdvanced}
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
  onSwitchToAdvanced?: () => void;
}

function RecognisedView({ model, analysis, onChange, onRunWizard, onSwitchToAdvanced }: RecognisedViewProps) {
  const inputMap = useMemo(() => buildInputMap(model.expoData ?? []), [model.expoData]);

  return (
    <div className={css.root}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <button className="btn btn-ghost btn-sm" onClick={onRunWizard}>
          ⚙ Re-run setup wizard
        </button>
        {onSwitchToAdvanced && (
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--text-muted)' }}
            onClick={onSwitchToAdvanced}>
            Advanced view
          </button>
        )}
      </div>

      {analysis.throttle && (
        <ThrottleCard analysis={analysis} inputMap={inputMap} onChange={onChange} />
      )}
      {analysis.steering && (
        <SteeringCard analysis={analysis} onChange={onChange} />
      )}
      {!analysis.throttle && !analysis.steering && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          No throttle or steering configured.{' '}
          <button className="btn btn-ghost btn-sm" onClick={onRunWizard}>Run setup wizard</button>
        </p>
      )}
    </div>
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
        <WeightSlider
          value={throttle.weight}
          onChange={(v) => onChange((m) => setThrottleWeight(m, analysis, v))}
          min={0} max={100}
        />
      </div>

      {cruise ? (
        <CruiseSubCard analysis={analysis} onChange={onChange} />
      ) : (
        <button
          className={`btn btn-ghost btn-sm ${css.addBtn}`}
          onClick={() => onChange((m) => addCruise(m, analysis, 'SC2', 70))}
        >
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
      {analysis.drate && (
        <p className={css.fieldHint}>Base speed before the speed limiter knob is applied — actual cruise speed depends on the knob position.</p>
      )}
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
        The <strong>{knobLabel}</strong> knob scales all throttle output —
        fully down stops the vehicle regardless of trigger ({min}–{max}%).
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

type WizardStep = 'throttle' | 'cruise' | 'drate' | 'steering' | 'confirm';
const STEPS: WizardStep[] = ['throttle', 'cruise', 'drate', 'steering', 'confirm'];
const STEP_LABELS: Record<WizardStep, string> = {
  throttle: 'Throttle', cruise: 'Cruise', drate: 'Speed limiter', steering: 'Steering', confirm: 'Done',
};

interface WizardProps {
  model: Model;
  onChange: (updater: (m: Model) => Model) => void;
  initialParams?: WizardParams;
  onCancel?: () => void;
  onSwitchToAdvanced?: () => void;
}

function SetupWizard({ onChange, initialParams, onCancel, onSwitchToAdvanced }: WizardProps) {
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
    }));
    onCancel?.();
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
            <button className={params.wantCruise ? css.choiceBtnActive : css.choiceBtn}
              onClick={() => patch({ wantCruise: true })}>
              <span className={css.choiceLabel}>Yes, add cruise control</span>
              <span className={css.choiceDesc}>Pick a switch to toggle cruise on/off</span>
            </button>
            <button className={!params.wantCruise ? css.choiceBtnActive : css.choiceBtn}
              onClick={() => patch({ wantCruise: false })}>
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
            <button className={params.wantDRate ? css.choiceBtnActive : css.choiceBtn}
              onClick={() => patch({ wantDRate: true })}>
              <span className={css.choiceLabel}>Yes, add speed limiter</span>
              <span className={css.choiceDesc}>P2 knob limits maximum speed</span>
            </button>
            <button className={!params.wantDRate ? css.choiceBtnActive : css.choiceBtn}
              onClick={() => patch({ wantDRate: false })}>
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
            <button className={params.wantSteering ? css.choiceBtnActive : css.choiceBtn}
              onClick={() => patch({ wantSteering: true })}>
              <span className={css.choiceLabel}>Set up steering</span>
              <span className={css.choiceDesc}>Steering wheel controls direction</span>
            </button>
            <button className={!params.wantSteering ? css.choiceBtnActive : css.choiceBtn}
              onClick={() => patch({ wantSteering: false })}>
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

      {step === 'confirm' && (
        <>
          <p className={css.stepTitle}>Ready to {initialParams ? 'apply' : 'create'}</p>
          <p className={css.stepSub}>
            {initialParams
              ? 'This will replace your current mixes with the configuration below.'
              : 'This will set up your model with the following configuration:'}
          </p>
          <div className={css.wizardConfig} style={{ gap:6 }}>
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
          </div>
          <div className={css.wizardActions}>
            <button className="btn btn-ghost btn-sm" onClick={back}>← Back</button>
            {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
            <button className="btn btn-primary btn-sm" onClick={finish}>
              {initialParams ? 'Apply configuration' : 'Create configuration'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
