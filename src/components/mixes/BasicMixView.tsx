import { useState, useMemo } from 'react';
import type { Model } from '../../types/model.ts';
import { WeightSlider } from '../shared/WeightSlider.tsx';
import { SwitchPicker } from '../shared/SwitchPicker.tsx';
import { InputSourcePicker } from '../shared/InputSourcePicker.tsx';
import { KidModeWizard } from '../kidmode/KidModeWizard.tsx';
import { applyKidMode, removeKidMode } from '../kidmode/kidGenerator.ts';
import { calculateKidParams } from '../kidmode/kidCalculator.ts';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { BUILT_IN_CATEGORIES } from '../../data/vehicleTypes.ts';
import type { KidModeParams } from '../kidmode/kidDefaults.ts';
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
  removeGyroGain,
  defaultWizardParams,
  generateBasicModel,
  type BasicAnalysis,
  type WizardParams,
} from './basicPatterns.ts';
import { buildInputMap } from '../../codec/modelSummary.ts';
import { srcRawLabel } from '../../codec/srcRaw.ts';
import { MULTI_PROTOCOLS } from '../../codec/protocols.ts';
import css from './BasicMixView.module.css';
import { ModelImagePicker } from '../models/ModelImagePicker.tsx';

const SURFACE_PROTOCOLS = MULTI_PROTOCOLS;

const FAILSAFE_OPTIONS = [
  { value: 'no pulses', label: 'Stop — safest' },
  { value: 'hold',      label: 'Hold — keep last position' },
  { value: 'NOT_SET',   label: 'Not set — receiver decides' },
];

interface Props {
  model: Model;
  modelKey: string;
  onChange: (updater: (m: Model) => Model) => void;
  onSwitchToAdvanced?: () => void;
  onWizardActiveChange?: (active: boolean) => void;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BasicMixView({ model, modelKey, onChange, onSwitchToAdvanced, onWizardActiveChange }: Props) {
  const [wizardActive, setWizardActive] = useState(false);
  const [kidControlActive, setKidControlActive] = useState(false);
  const analysis = useMemo(() => analyseBasicPatterns(model), [model]);

  function setWizard(v: boolean) { setWizardActive(v); onWizardActiveChange?.(v); }

  // Inline KidControl wizard
  if (kidControlActive) {
    return (
      <div>
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}
          onClick={() => setKidControlActive(false)}>
          ← Back to summary
        </button>
        <KidModeWizard model={model} onChange={onChange} onApplied={() => setKidControlActive(false)} modelKey={modelKey} skipActiveCheck />
      </div>
    );
  }

  // Setup wizard
  if (analysis.kind === 'empty' || wizardActive) {
    const isRerun = wizardActive && analysis.kind === 'recognised';
    const initialParams = isRerun ? analysisToWizardParams(analysis, model) : undefined;
    onWizardActiveChange?.(true);
    return (
      <SetupWizard
        modelKey={modelKey}
        onChange={onChange}
        initialParams={initialParams}
        onCancel={wizardActive ? () => setWizard(false) : undefined}
        onSwitchToAdvanced={onSwitchToAdvanced}
        onLaunchKidControl={() => { setWizard(false); setKidControlActive(true); }}
      />
    );
  }

  if (analysis.kind === 'unrecognised') {
    return <UnrecognisedNotice onSwitchToAdvanced={onSwitchToAdvanced} />;
  }

  return (
    <RecognisedView
      model={model}
      modelKey={modelKey}
      analysis={analysis}
      onChange={onChange}
      onRunWizard={() => setWizard(true)}
      onRunKidControl={() => setKidControlActive(true)}
      onRemoveKidControl={() => onChange((m) => removeKidMode(m))}
    />
  );
}

// ── Unrecognised notice ────────────────────────────────────────────────────────

function UnrecognisedNotice({ onSwitchToAdvanced }: { onSwitchToAdvanced?: () => void }) {
  return (
    <div className={css.notice}>
      <span className={css.noticeIcon}>ℹ</span>
      <div>
        <p className={css.noticeTitle}>This model must be managed in Advanced view</p>
        <p className={css.noticeBody}>
          The mix configuration doesn't match the standard surface patterns and cannot be displayed here.
          {onSwitchToAdvanced
            ? <> Use <button className="btn btn-ghost btn-sm" style={{ marginLeft: 4, marginRight: 4 }} onClick={onSwitchToAdvanced}>Advanced view</button> to view and edit this model.</>
            : ' Switch to Advanced view to view and edit this model.'
          }
        </p>
      </div>
    </div>
  );
}

// ── Recognised view ────────────────────────────────────────────────────────────

interface RecognisedViewProps {
  model: Model;
  modelKey: string;
  analysis: BasicAnalysis;
  onChange: (updater: (m: Model) => Model) => void;
  onRunWizard: () => void;
  onRunKidControl: () => void;
  onRemoveKidControl: () => void;
}

function RecognisedView({ model, modelKey, analysis, onChange, onRunWizard, onRunKidControl, onRemoveKidControl }: RecognisedViewProps) {
  const clearKidControlSnapshot = useEditorStore(s => s.clearKidControlSnapshot);
  const inputMap = useMemo(() => buildInputMap(model.expoData ?? []), [model.expoData]);
  const kidActive = !!model.flightModeData?.['1'];
  const vehicleCategories = useEditorStore(s => s.vehicleCategories);
  const modelMeta = useEditorStore(s => s.modelMeta[modelKey]);
  const setModelScale = useEditorStore(s => s.setModelScale);
  const setModelVehicleType = useEditorStore(s => s.setModelVehicleType);

  const selectedCat = vehicleCategories.find(c => c.id === (modelMeta?.vehicleType ?? ''));

  return (
    <div className={css.root}>
      {analysis.throttle && (
        <ThrottleCard analysis={analysis} inputMap={inputMap} onChange={onChange} />
      )}
      {analysis.steering && (
        <SteeringCard analysis={analysis} onChange={onChange} />
      )}
      {analysis.gyro && (
        <GyroGainCard analysis={analysis} inputMap={inputMap} onChange={onChange} />
      )}

      {/* Vehicle details */}
      <section className={css.card}>
        <div className={css.cardHeader}>
          <span className={css.cardIcon}>🚗</span>
          <span className={css.cardTitle}>Vehicle details</span>
        </div>
        <div className={css.fieldRow}>
          <span className={css.fieldLabel}>Vehicle type</span>
          <select
            style={{ background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', fontSize:13, fontFamily:'var(--font)' }}
            value={modelMeta?.vehicleType ?? ''}
            onChange={(e) => setModelVehicleType(modelKey, e.target.value)}
          >
            <option value="">Not specified</option>
            {vehicleCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        {selectedCat && (
          <p className={css.fieldHint}>{selectedCat.description} · {selectedCat.speedMin}–{selectedCat.speedMax} mph</p>
        )}
        <div className={css.fieldRow}>
          <span className={css.fieldLabel}>Scale</span>
          <select
            style={{ background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', fontSize:13, fontFamily:'var(--font)' }}
            value={modelMeta?.scale ?? ''}
            onChange={(e) => setModelScale(modelKey, e.target.value)}
          >
            <option value="">Not specified</option>
            {RC_SCALES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <ModelImagePicker modelKey={modelKey} hoverScale={1.5} />
      </section>

      {/* Radio link */}
      <RadioLinkCard model={model} onChange={onChange} />

      {/* KidControl */}
      <KidControlCard
        model={model}
        modelKey={modelKey}
        kidActive={kidActive}
        onChange={onChange}
        onRunKidControl={onRunKidControl}
        onRemoveKidControl={() => { onRemoveKidControl(); clearKidControlSnapshot(modelKey); }}
      />

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

// ── KidControl card ───────────────────────────────────────────────────────────

function expoFeel(expo: number): string {
  if (expo <= 5)  return 'direct';
  if (expo <= 25) return 'slightly softer';
  if (expo <= 50) return 'noticeably softer';
  if (expo <= 75) return 'very soft';
  return 'extremely soft';
}

function rampDesc(up: number, down: number): string {
  const u = (up * 0.1).toFixed(1);
  const d = (down * 0.1).toFixed(1);
  if (up > 0 && down > 0) return `${u}s to speed up, ${d}s to slow down`;
  if (up > 0) return `${u}s to speed up`;
  return `${d}s to slow down`;
}

function KidControlCard({ model, modelKey, kidActive, onChange, onRunKidControl, onRemoveKidControl }: { model: Model; modelKey: string; kidActive: boolean; onChange: (updater: (m: Model) => Model) => void; onRunKidControl: () => void; onRemoveKidControl: () => void }) {
  const fm1 = model.flightModeData?.['1'];
  const triggerSwitch = fm1?.swtch && fm1.swtch !== 'NONE' ? fm1.swtch : null;
  const kidExpos = (model.expoData ?? []).filter(l => (l.name ?? '').startsWith('KID-'));
  const thExpo = kidExpos.find(l => l.name === 'KID-TH');
  const stExpo = kidExpos.find(l => l.name === 'KID-ST');
  const spMix = (model.mixData ?? []).find(l => l.name === 'KID-SP');

  const vehicleCategories      = useEditorStore(s => s.vehicleCategories);
  const kidPresets             = useEditorStore(s => s.kidPresets);
  const modelMeta              = useEditorStore(s => s.modelMeta[modelKey]);
  const recordKidControlApplied = useEditorStore(s => s.recordKidControlApplied);

  // Reconstruct applied params from model lines
  const appliedParams: KidModeParams | null = (thExpo && stExpo && spMix) ? {
    thrRate:   thExpo.weight,
    thrExpo:   thExpo.curve?.value ?? 0,
    speedUp:   spMix.speedUp,
    speedDown: spMix.speedDown,
    strRate:   stExpo.weight,
    strExpo:   stExpo.curve?.value ?? 0,
  } : null;

  // Stale detection — same two-path logic as KidModeWizard
  let stale = false;
  if (kidActive && appliedParams && modelMeta?.vehicleType) {
    const currentCat = vehicleCategories.find(c => c.id === modelMeta.vehicleType);
    if (currentCat) {
      const snap = modelMeta.kidSnapshot;
      if (snap) {
        // Precise: compare snapshot to current vehicle properties
        const vehicleChanged =
          currentCat.steeringCharacter !== snap.steeringCharacter ||
          currentCat.powerDelivery     !== snap.powerDelivery;
        if (vehicleChanged) {
          const preset = kidPresets.find(p => p.id === snap.presetId);
          if (preset) {
            const expected = calculateKidParams(currentCat, preset);
            stale = (
              Math.abs(appliedParams.thrRate  - expected.thrRate)  > 2 ||
              Math.abs(appliedParams.thrExpo  - expected.thrExpo)  > 2 ||
              Math.abs(appliedParams.speedUp  - expected.speedUp)  > 2 ||
              Math.abs(appliedParams.strRate  - expected.strRate)  > 2 ||
              Math.abs(appliedParams.strExpo  - expected.strExpo)  > 2
            );
          }
        }
      } else {
        // Fallback: check if the built-in vehicle type has been edited from its defaults
        const defaultCat = BUILT_IN_CATEGORIES.find(c => c.id === modelMeta.vehicleType);
        if (defaultCat) {
          stale =
            currentCat.steeringCharacter !== defaultCat.steeringCharacter ||
            currentCat.powerDelivery     !== defaultCat.powerDelivery;
        }
      }
    }
  }

  return (
    <section className={css.card}>
      <div className={css.cardHeader}>
        <span className={css.cardIcon}>🔒</span>
        <span className={css.cardTitle}>KidControl</span>
        {kidActive && <span className={css.cardMetaGreen}>Active</span>}
        {kidActive && modelMeta?.kidSnapshot && (() => {
          const name = kidPresets.find(p => p.id === modelMeta.kidSnapshot!.presetId)?.name;
          return name ? <span className={css.cardMetaMuted}>{name}</span> : null;
        })()}
      </div>
      {kidActive ? (
        <>
          {stale && (
            <div className={css.staleWarning}>
              <span className={css.staleIcon}>⚠</span>
              <div className={css.staleText}>
                <strong>Vehicle properties have changed</strong>
                <span>The vehicle type's steering or power character has been updated since KidControl was set up. The current limits may no longer suit your vehicle.</span>
              </div>
              {(() => {
                const snap = modelMeta?.kidSnapshot;
                const currentCat = vehicleCategories.find(c => c.id === modelMeta?.vehicleType);
                const preset = snap ? kidPresets.find(p => p.id === snap.presetId) : undefined;
                if (currentCat && preset) {
                  return (
                    <button className="btn btn-warning btn-sm" onClick={() => {
                      const newParams = calculateKidParams(currentCat, preset);
                      const sw = (fm1?.swtch && fm1.swtch !== 'NONE') ? fm1.swtch : 'SA2';
                      onChange(m => applyKidMode(m, newParams, sw));
                      recordKidControlApplied(modelKey, preset.id, currentCat.steeringCharacter, currentCat.powerDelivery);
                    }}>
                      Recalculate
                    </button>
                  );
                }
                return (
                  <button className="btn btn-warning btn-sm" onClick={onRunKidControl}>Review</button>
                );
              })()}
            </div>
          )}
          <p className={css.fieldHint}>Reduced throttle and steering limits apply when the trigger switch is engaged.</p>
          {triggerSwitch && (
            <div className={css.fieldRow}>
              <span className={css.fieldLabel}>Trigger switch</span>
              <span className={css.fieldInfo}>{triggerSwitch}</span>
            </div>
          )}
          {thExpo && (
            <div className={css.fieldRow}>
              <span className={css.fieldLabel}>Throttle limit</span>
              <span className={css.fieldInfo}>
                {thExpo.weight}% max
                {thExpo.curve?.value ? ` — ${expoFeel(thExpo.curve.value)} response (${thExpo.curve.value}% expo)` : ''}
              </span>
            </div>
          )}
          {spMix && (spMix.speedUp > 0 || spMix.speedDown > 0) && (
            <div className={css.fieldRow}>
              <span className={css.fieldLabel}>Speed ramp</span>
              <span className={css.fieldInfo}>{rampDesc(spMix.speedUp, spMix.speedDown)}</span>
            </div>
          )}
          {stExpo && (
            <div className={css.fieldRow}>
              <span className={css.fieldLabel}>Steering limit</span>
              <span className={css.fieldInfo}>
                {stExpo.weight}% max
                {stExpo.curve?.value ? ` — ${expoFeel(stExpo.curve.value)} response (${stExpo.curve.value}% expo)` : ''}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={onRunKidControl}>
              ⚙ Re-run KidControl wizard
            </button>
            <button className="btn btn-danger btn-sm" onClick={onRemoveKidControl}>
              Remove
            </button>
          </div>
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
  );
}

// ── Throttle card ──────────────────────────────────────────────────────────────

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
      <p className={css.fieldHint}>Sets how your trigger maps to throttle output. Configure cruise control and speed limiting below.</p>
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
  if (drate.switchMode) {
    return (
      <div className={css.subCard}>
        <div className={css.subHeader}><span className={css.subTitle}>Speed limiter</span></div>
        <p className={css.fieldHint}>
          Switch <strong>{drate.switchMode.swtch}</strong> caps throttle at <strong>{drate.switchMode.percent}%</strong> when active.
        </p>
      </div>
    );
  }
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
      <p className={css.fieldHint}>Sets how the steering wheel maps to your servo channel, including the centre-point trim offset.</p>
      <div className={css.fieldRow}>
        <span className={css.fieldLabel}>Steering rate</span>
        <WeightSlider value={steering.weight} onChange={(v) => onChange((m) => setSteeringWeight(m, analysis, v))} min={0} max={100} />
      </div>
      {strim && <STrimSubCard analysis={analysis} onChange={onChange} />}
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

// ── Gyro gain card ────────────────────────────────────────────────────────────

function GyroGainCard({ analysis, inputMap, onChange }: CardProps) {
  const { gyro } = analysis;
  if (!gyro) return null;
  const potLabel = inputMap[gyro.chn] ?? (gyro.chn === 2 ? 'P1' : 'P2');
  return (
    <section className={css.card}>
      <div className={css.cardHeader}>
        <span className={css.cardIcon}>⬡</span>
        <span className={css.cardTitle}>Gyro gain</span>
        <span className={css.cardMeta}>CH{gyro.destCh + 1}</span>
        <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)', fontSize:12, marginLeft:'auto' }}
          onClick={() => onChange((m) => removeGyroGain(m, analysis))}>Remove</button>
      </div>
      <p className={css.fieldHint}>
        The <strong>{potLabel}</strong> knob controls gyro sensitivity on CH{gyro.destCh + 1}.
      </p>
    </section>
  );
}

// ── Setup wizard ───────────────────────────────────────────────────────────────

const RC_SCALES = ['1:5','1:6','1:8','1:10','1:12','1:14','1:16','1:18','1:24','1:28','1:64'];

type WizardStep = 'details' | 'module' | 'throttle' | 'cruise' | 'drate' | 'steering' | 'gyro' | 'kidcontrol' | 'confirm';
const STEPS: WizardStep[] = ['details', 'module', 'throttle', 'cruise', 'drate', 'steering', 'gyro', 'kidcontrol', 'confirm'];
const STEP_LABELS: Record<WizardStep, string> = {
  details: 'Vehicle', module: 'Radio link', throttle: 'Throttle', cruise: 'Cruise', drate: 'Speed limiter',
  steering: 'Steering', gyro: 'Gyro', kidcontrol: 'KidControl', confirm: 'Done',
};

interface WizardProps {
  modelKey: string;
  onChange: (updater: (m: Model) => Model) => void;
  initialParams?: WizardParams;
  onCancel?: () => void;
  onSwitchToAdvanced?: () => void;
  onLaunchKidControl: () => void;
}

function SetupWizard({ modelKey, onChange, initialParams, onCancel, onSwitchToAdvanced, onLaunchKidControl }: WizardProps) {
  const [step, setStep] = useState<WizardStep>(STEPS[0]);

  const setModelScale = useEditorStore(s => s.setModelScale);
  const setModelVehicleType = useEditorStore(s => s.setModelVehicleType);
  const setModelPower = useEditorStore(s => s.setModelPower);
  const vehicleCategories = useEditorStore(s => s.vehicleCategories);
  const existingScale = useEditorStore(s => s.modelMeta[modelKey]?.scale ?? '');
  const existingVehicleType = useEditorStore(s => s.modelMeta[modelKey]?.vehicleType ?? '');
  const existingPower = useEditorStore(s => s.modelMeta[modelKey]?.power ?? '');
  const existingModelName = useEditorStore(s => s.models[modelKey]?.header?.name ?? '');
  const [params, setParams] = useState<WizardParams>({
    ...(initialParams ?? defaultWizardParams()),
    scale: existingScale,
    modelName: initialParams?.modelName ?? existingModelName,
    vehicleType: initialParams?.vehicleType ?? existingVehicleType,
    power: initialParams?.power ?? existingPower,
  });

  function patch(p: Partial<WizardParams>) { setParams(prev => ({ ...prev, ...p })); }
  function back() { setStep(STEPS[STEPS.indexOf(step) - 1]); }

  const potConflict = params.dRateMode === 'pot' && params.wantGyroGain && !!params.dRatePot && !!params.gyroGainPot && params.dRatePot === params.gyroGainPot;
  const swConflict  = params.wantCruise && params.dRateMode === 'switch' && params.cruiseSw === params.dRateSwitch;

  // Steering trim source conflicts — relevant when strimSrc matches any other source.
  const strimDRateConflict = params.wantSteering && !!params.strimSrc && params.dRateMode === 'pot' && !!params.dRatePot && params.strimSrc === params.dRatePot;
  const strimGyroConflict  = params.wantSteering && !!params.strimSrc && params.wantGyroGain && !!params.gyroGainPot && params.strimSrc === params.gyroGainPot;

  // What gets removed when the user proceeds through a conflicting step.
  const stepConflictWarning: Partial<Record<WizardStep, string>> = {};
  if (potConflict) {
    stepConflictWarning.drate = 'Gyro gain uses the same knob — proceeding will remove gyro gain.';
    stepConflictWarning.gyro  = 'Speed limiter uses the same knob — proceeding will disable the speed limiter.';
  }
  if (swConflict) {
    stepConflictWarning.cruise = 'Speed limiter uses the same switch — proceeding will disable the speed limiter.';
    stepConflictWarning.drate  = stepConflictWarning.drate
      ? stepConflictWarning.drate + ' Cruise control uses the same switch — proceeding will also remove cruise.'
      : 'Cruise control uses the same switch — proceeding will remove cruise.';
  }
  if (strimDRateConflict && strimGyroConflict) {
    stepConflictWarning.steering = 'Steering trim uses the same knob as speed limiter and gyro gain — proceeding will disable both.';
  } else if (strimDRateConflict) {
    stepConflictWarning.steering = 'Steering trim uses the same knob as speed limiter — proceeding will disable the speed limiter.';
  } else if (strimGyroConflict) {
    stepConflictWarning.steering = 'Steering trim uses the same knob as gyro gain — proceeding will disable gyro gain.';
  }

  function nextStep() {
    const updates: Partial<WizardParams> = {};
    if (step === 'drate') {
      if (potConflict) updates.wantGyroGain = false;
      if (swConflict)  updates.wantCruise = false;
    }
    if (step === 'cruise' && swConflict) updates.dRateMode = 'none';
    if (step === 'gyro'  && potConflict) updates.dRateMode = 'none';
    if (step === 'steering') {
      if (strimDRateConflict) updates.dRateMode = 'none';
      if (strimGyroConflict)  updates.wantGyroGain = false;
    }
    if (Object.keys(updates).length) setParams(prev => ({ ...prev, ...updates }));
    setStep(STEPS[STEPS.indexOf(step) + 1]);
  }

  function finish(p: WizardParams = params) {
    const generated = generateBasicModel(p);
    onChange((m) => ({
      ...m,
      header: p.modelName ? { ...m.header, name: p.modelName } : m.header,
      mixData: generated.mixData,
      expoData: [...(m.expoData ?? []).filter(() => false), ...generated.expoData],
      logicalSw: { ...(m.logicalSw ?? {}), ...generated.logicalSw },
      inputNames: { ...(m.inputNames ?? {}), ...generated.inputNames },
      moduleData: generated.moduleData,
    }));
    if (p.scale !== existingScale) setModelScale(modelKey, p.scale);
    if (p.vehicleType !== existingVehicleType) setModelVehicleType(modelKey, p.vehicleType);
    if (p.power !== existingPower) setModelPower(modelKey, p.power);
    if (p.wantKidControl) {
      onLaunchKidControl();
    } else {
      onCancel?.();
    }
  }

  function finishEarly() {
    // Apply conflict resolutions for the current step, then finish.
    const updates: Partial<WizardParams> = {};
    if (step === 'drate') {
      if (potConflict) updates.wantGyroGain = false;
      if (swConflict)  updates.wantCruise = false;
    }
    if (step === 'cruise' && swConflict) updates.dRateMode = 'none';
    if (step === 'gyro'  && potConflict) updates.dRateMode = 'none';
    if (step === 'steering') {
      if (strimDRateConflict) updates.dRateMode = 'none';
      if (strimGyroConflict)  updates.wantGyroGain = false;
    }
    finish(Object.keys(updates).length ? { ...params, ...updates } : params);
  }

  function chOptions(selfCh: number) {
    const used = new Map<number, string>();
    if (params.throttleDestCh !== selfCh) used.set(params.throttleDestCh, 'throttle');
    if (params.wantSteering && params.steeringDestCh !== selfCh) used.set(params.steeringDestCh, 'steering');
    if (params.wantGyroGain && params.gyroGainDestCh !== selfCh) used.set(params.gyroGainDestCh, 'gyro gain');
    return Array.from({ length: 16 }, (_, i) => {
      const who = used.get(i);
      return (
        <option key={i} value={i}>
          {who ? `CH${i + 1} — in use (${who})` : `CH${i + 1}`}
        </option>
      );
    });
  }

  function chConflict(selfCh: number, selfLabel: string): string | null {
    if (params.throttleDestCh === selfCh && selfLabel !== 'throttle') return 'This channel is also assigned to throttle.';
    if (params.wantSteering && params.steeringDestCh === selfCh && selfLabel !== 'steering') return 'This channel is also assigned to steering.';
    if (params.wantGyroGain && params.gyroGainDestCh === selfCh && selfLabel !== 'gyro gain') return 'This channel is also assigned to gyro gain.';
    return null;
  }

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
            {initialParams && s !== step ? (
              <button className={css.crumbClickable} onClick={() => setStep(s)}>{STEP_LABELS[s]}</button>
            ) : (
              <span className={s === step ? css.crumbActive : css.crumb}>{STEP_LABELS[s]}</span>
            )}
          </span>
        ))}
      </div>

      {step === 'details' && (
        <>
          <p className={css.stepTitle}>Vehicle details</p>
          <p className={css.stepSub}>Tell us about your model. All fields are optional — you can fill them in later from the editor.</p>
          <div className={css.wizardConfig}>
            <div className={css.fieldRow}>
              <span className={css.fieldLabel}>Name</span>
              <input
                type="text"
                maxLength={15}
                placeholder="e.g. Traxxas Slash"
                value={params.modelName}
                onChange={(e) => patch({ modelName: e.target.value })}
                style={{ background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', fontSize:13, fontFamily:'var(--font)', width:200 }}
                autoFocus
              />
            </div>
            <p className={css.fieldHint} style={{ marginTop: -4 }}>Maximum 15 characters — this is an EdgeTX limit.</p>
            <div className={css.fieldRow}>
              <span className={css.fieldLabel}>Scale</span>
              <select
                style={{ background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', fontSize:13, fontFamily:'var(--font)', width:130 }}
                value={params.scale}
                onChange={(e) => patch({ scale: e.target.value })}
              >
                <option value="">Not specified</option>
                {RC_SCALES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className={css.fieldRow}>
              <span className={css.fieldLabel}>Vehicle type</span>
              <select
                style={{ background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', fontSize:13, fontFamily:'var(--font)', width:280 }}
                value={params.vehicleType}
                onChange={(e) => patch({ vehicleType: e.target.value })}
              >
                <option value="">Not specified</option>
                {vehicleCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name} — {c.description} ({c.speedMin}–{c.speedMax} mph)</option>)}
              </select>
            </div>
            <div className={css.fieldRow}>
              <span className={css.fieldLabel}>Power</span>
              <select
                style={{ background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', fontSize:13, fontFamily:'var(--font)', width:160 }}
                value={params.power}
                onChange={(e) => patch({ power: e.target.value as 'battery' | 'fuel' | '' })}
              >
                <option value="">Not specified</option>
                <option value="battery">🔋 Battery (electric)</option>
                <option value="fuel">⛽ Fuel (nitro/petrol)</option>
              </select>
            </div>
            <ModelImagePicker modelKey={modelKey} />
          </div>
          <div className={css.wizardActions}>
            {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
            <button className="btn btn-primary btn-sm" onClick={nextStep}>Next →</button>
            {initialParams && <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={finishEarly}>Finish ✓</button>}
          </div>
        </>
      )}

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
            <button className="btn btn-ghost btn-sm" onClick={back}>← Back</button>
            <button className="btn btn-primary btn-sm" onClick={nextStep}>Next →</button>
            {initialParams && <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={finishEarly}>Finish ✓</button>}
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
                {chOptions(params.throttleDestCh)}
              </select>
            </div>
            {chConflict(params.throttleDestCh, 'throttle') && (
              <p className={css.fieldHint} style={{ color:'var(--danger)', marginTop:4 }}>
                {chConflict(params.throttleDestCh, 'throttle')}
              </p>
            )}
          </div>
          <div className={css.wizardActions}>
            <button className="btn btn-ghost btn-sm" onClick={back}>← Back</button>
            <button className="btn btn-primary btn-sm" onClick={nextStep}>Next →</button>
            {initialParams && <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={finishEarly}>Finish ✓</button>}
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
              {params.dRateMode === 'switch' && params.dRateSwitch === params.cruiseSw && (
                <p className={css.fieldHint} style={{ color:'var(--danger)', marginTop:4 }}>
                  This switch is also assigned to the speed limiter.
                </p>
              )}
              <div className={css.fieldRow}>
                <span className={css.fieldLabel}>Cruise speed</span>
                <WeightSlider value={params.cruiseSpeed} onChange={(v) => patch({ cruiseSpeed: v })} min={0} max={100} />
              </div>
            </div>
          )}
          {stepConflictWarning.cruise && (
            <p className={css.fieldHint} style={{ color:'var(--danger)', marginTop:8 }}>
              ⚠ {stepConflictWarning.cruise}
            </p>
          )}
          <div className={css.wizardActions}>
            <button className="btn btn-ghost btn-sm" onClick={back}>← Back</button>
            <button className="btn btn-primary btn-sm" onClick={nextStep}>Next →</button>
            {initialParams && <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={finishEarly}>Finish ✓</button>}
          </div>
        </>
      )}

      {step === 'drate' && (
        <>
          <p className={css.stepTitle}>Speed limiter</p>
          <p className={css.stepSub}>Limit the maximum throttle — useful for younger or less experienced drivers.</p>
          <div className={css.choiceGrid}>
            <button className={params.dRateMode === 'pot' ? css.choiceBtnActive : css.choiceBtn}
              onClick={() => patch({ dRateMode: 'pot' })}>
              <span className={css.choiceLabel}>Variable</span>
              <span className={css.choiceDesc}>A knob or trim lever continuously sets the max speed from 0 to 100%</span>
            </button>
            <button className={params.dRateMode === 'switch' ? css.choiceBtnActive : css.choiceBtn}
              onClick={() => patch({ dRateMode: 'switch' })}>
              <span className={css.choiceLabel}>Switch (fixed limit)</span>
              <span className={css.choiceDesc}>A switch toggles a fixed speed limit on/off</span>
            </button>
            <button className={params.dRateMode === 'none' ? css.choiceBtnActive : css.choiceBtn}
              onClick={() => patch({ dRateMode: 'none' })}>
              <span className={css.choiceLabel}>None</span>
              <span className={css.choiceDesc}>Full throttle always available</span>
            </button>
          </div>

          {params.dRateMode === 'pot' && (
            <div className={css.wizardConfig}>
              <div className={css.fieldRow}>
                <span className={css.fieldLabel}>Speed limit source</span>
                <InputSourcePicker
                  value={params.dRatePot}
                  onChange={(v) => patch({ dRatePot: v })}
                  options={[
                    { value:'T1', label:'T1', group:'Trim levers', conflict: (params.wantGyroGain && params.gyroGainPot === 'T1' ? 'gyro gain' : undefined) ?? (params.wantSteering && params.strimSrc === 'T1' ? 'steering trim' : undefined) },
                    { value:'T2', label:'T2', group:'Trim levers', conflict: (params.wantGyroGain && params.gyroGainPot === 'T2' ? 'gyro gain' : undefined) ?? (params.wantSteering && params.strimSrc === 'T2' ? 'steering trim' : undefined) },
                    { value:'T3', label:'T3', group:'Trim levers', conflict: (params.wantGyroGain && params.gyroGainPot === 'T3' ? 'gyro gain' : undefined) ?? (params.wantSteering && params.strimSrc === 'T3' ? 'steering trim' : undefined) },
                    { value:'T4', label:'T4', group:'Trim levers', conflict: (params.wantGyroGain && params.gyroGainPot === 'T4' ? 'gyro gain' : undefined) ?? (params.wantSteering && params.strimSrc === 'T4' ? 'steering trim' : undefined) },
                    { value:'T5', label:'T5', group:'Trim levers', conflict: (params.wantGyroGain && params.gyroGainPot === 'T5' ? 'gyro gain' : undefined) ?? (params.wantSteering && params.strimSrc === 'T5' ? 'steering trim' : undefined) },
                    { value:'P1', label:'P1 knob', group:'Knobs', conflict: (params.wantGyroGain && params.gyroGainPot === 'P1' ? 'gyro gain' : undefined) ?? (params.wantSteering && params.strimSrc === 'P1' ? 'steering trim' : undefined) },
                    { value:'P2', label:'P2 knob', group:'Knobs', conflict: (params.wantGyroGain && params.gyroGainPot === 'P2' ? 'gyro gain' : undefined) ?? (params.wantSteering && params.strimSrc === 'P2' ? 'steering trim' : undefined) },
                  ]}
                />
              </div>
            </div>
          )}

          {params.dRateMode === 'switch' && (
            <div className={css.wizardConfig}>
              <div className={css.fieldRow}>
                <span className={css.fieldLabel}>Limit switch</span>
                <SwitchPicker value={params.dRateSwitch} onChange={(v) => patch({ dRateSwitch: v })} />
              </div>
              {params.wantCruise && params.cruiseSw === params.dRateSwitch && (
                <p className={css.fieldHint} style={{ color:'var(--danger)', marginTop:4 }}>
                  This switch is also assigned to cruise control.
                </p>
              )}
              <div className={css.fieldRow}>
                <span className={css.fieldLabel}>Max throttle when on</span>
                <WeightSlider value={params.dRatePercent} onChange={(v) => patch({ dRatePercent: v })} min={0} max={100} />
              </div>
              <p className={css.fieldHint}>When the switch is active, throttle is capped at {params.dRatePercent}%.</p>
            </div>
          )}

          {stepConflictWarning.drate && (
            <p className={css.fieldHint} style={{ color:'var(--danger)', marginTop:8 }}>
              ⚠ {stepConflictWarning.drate}
            </p>
          )}
          <div className={css.wizardActions}>
            <button className="btn btn-ghost btn-sm" onClick={back}>← Back</button>
            <button className="btn btn-primary btn-sm" onClick={nextStep}>Next →</button>
            {initialParams && <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={finishEarly}>Finish ✓</button>}
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
                  {chOptions(params.steeringDestCh)}
                </select>
              </div>
              {chConflict(params.steeringDestCh, 'steering') && (
                <p className={css.fieldHint} style={{ color:'var(--danger)', marginTop:4 }}>
                  {chConflict(params.steeringDestCh, 'steering')}
                </p>
              )}
              <div className={css.fieldRow} style={{ marginTop: 12 }}>
                <span className={css.fieldLabel}>Steering trim</span>
                <InputSourcePicker
                  value={params.strimSrc}
                  onChange={(v) => patch({ strimSrc: v })}
                  options={[
                    { value:'T1', label:'T1', group:'Trim levers' },
                    { value:'T2', label:'T2', group:'Trim levers' },
                    { value:'T3', label:'T3', group:'Trim levers' },
                    { value:'T4', label:'T4', group:'Trim levers' },
                    { value:'T5', label:'T5', group:'Trim levers' },
                    { value:'P1', label:'P1 knob', group:'Knobs',
                      conflict: params.dRateMode === 'pot' && params.dRatePot === 'P1' && params.wantGyroGain && params.gyroGainPot === 'P1' ? 'speed limiter + gyro gain'
                               : params.dRateMode === 'pot' && params.dRatePot === 'P1' ? 'speed limiter'
                               : params.wantGyroGain && params.gyroGainPot === 'P1' ? 'gyro gain'
                               : undefined },
                    { value:'P2', label:'P2 knob', group:'Knobs',
                      conflict: params.dRateMode === 'pot' && params.dRatePot === 'P2' && params.wantGyroGain && params.gyroGainPot === 'P2' ? 'speed limiter + gyro gain'
                               : params.dRateMode === 'pot' && params.dRatePot === 'P2' ? 'speed limiter'
                               : params.wantGyroGain && params.gyroGainPot === 'P2' ? 'gyro gain'
                               : undefined },
                  ]}
                />
              </div>
            </div>
          )}
          {stepConflictWarning.steering && (
            <p className={css.fieldHint} style={{ color:'var(--danger)', marginTop:8 }}>
              ⚠ {stepConflictWarning.steering}
            </p>
          )}
          <div className={css.wizardActions}>
            <button className="btn btn-ghost btn-sm" onClick={back}>← Back</button>
            <button className="btn btn-primary btn-sm" onClick={nextStep}
              disabled={params.wantSteering && !params.strimSrc}>Next →</button>
            {initialParams && <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={finishEarly}>Finish ✓</button>}
          </div>
        </>
      )}

      {step === 'gyro' && (
        <>
          <p className={css.stepTitle}>Gyro gain control</p>
          <p className={css.stepSub}>Assign a pot knob to control gyro sensitivity. Optional — skip if your vehicle has no gyro or uses fixed gain.</p>
          <div className={css.choiceGrid}>
            <button className={params.wantGyroGain ? css.choiceBtnActive : css.choiceBtn} onClick={() => patch({ wantGyroGain: true })}>
              <span className={css.choiceLabel}>Yes, add gyro gain</span>
              <span className={css.choiceDesc}>A knob will control gyro sensitivity</span>
            </button>
            <button className={!params.wantGyroGain ? css.choiceBtnActive : css.choiceBtn} onClick={() => patch({ wantGyroGain: false })}>
              <span className={css.choiceLabel}>No gyro</span>
              <span className={css.choiceDesc}>Vehicle has no gyro or uses fixed sensitivity</span>
            </button>
          </div>
          {params.wantGyroGain && (
            <div className={css.wizardConfig}>
              <div className={css.fieldRow}>
                <span className={css.fieldLabel}>Gyro channel</span>
                <select className={css.channelSelect} value={params.gyroGainDestCh}
                  onChange={(e) => patch({ gyroGainDestCh: parseInt(e.target.value) })}>
                  {chOptions(params.gyroGainDestCh)}
                </select>
              </div>
              {chConflict(params.gyroGainDestCh, 'gyro gain') && (
                <p className={css.fieldHint} style={{ color:'var(--danger)', marginTop:4 }}>
                  {chConflict(params.gyroGainDestCh, 'gyro gain')}
                </p>
              )}
              <div className={css.fieldRow} style={{ marginTop: 8 }}>
                <span className={css.fieldLabel}>Gyro gain source</span>
                <InputSourcePicker
                  value={params.gyroGainPot}
                  onChange={(v) => patch({ gyroGainPot: v })}
                  options={[
                    { value:'T1', label:'T1', group:'Trim levers', conflict: (params.dRateMode === 'pot' && params.dRatePot === 'T1' ? 'speed limiter' : undefined) ?? (params.wantSteering && params.strimSrc === 'T1' ? 'steering trim' : undefined) },
                    { value:'T2', label:'T2', group:'Trim levers', conflict: (params.dRateMode === 'pot' && params.dRatePot === 'T2' ? 'speed limiter' : undefined) ?? (params.wantSteering && params.strimSrc === 'T2' ? 'steering trim' : undefined) },
                    { value:'T3', label:'T3', group:'Trim levers', conflict: (params.dRateMode === 'pot' && params.dRatePot === 'T3' ? 'speed limiter' : undefined) ?? (params.wantSteering && params.strimSrc === 'T3' ? 'steering trim' : undefined) },
                    { value:'T4', label:'T4', group:'Trim levers', conflict: (params.dRateMode === 'pot' && params.dRatePot === 'T4' ? 'speed limiter' : undefined) ?? (params.wantSteering && params.strimSrc === 'T4' ? 'steering trim' : undefined) },
                    { value:'T5', label:'T5', group:'Trim levers', conflict: (params.dRateMode === 'pot' && params.dRatePot === 'T5' ? 'speed limiter' : undefined) ?? (params.wantSteering && params.strimSrc === 'T5' ? 'steering trim' : undefined) },
                    { value:'P1', label:'P1 knob', group:'Knobs', conflict: (params.dRateMode === 'pot' && params.dRatePot === 'P1' ? 'speed limiter' : undefined) ?? (params.wantSteering && params.strimSrc === 'P1' ? 'steering trim' : undefined) },
                    { value:'P2', label:'P2 knob', group:'Knobs', conflict: (params.dRateMode === 'pot' && params.dRatePot === 'P2' ? 'speed limiter' : undefined) ?? (params.wantSteering && params.strimSrc === 'P2' ? 'steering trim' : undefined) },
                  ]}
                />
              </div>
            </div>
          )}
          {stepConflictWarning.gyro && (
            <p className={css.fieldHint} style={{ color:'var(--danger)', marginTop:8 }}>
              ⚠ {stepConflictWarning.gyro}
            </p>
          )}
          <div className={css.wizardActions}>
            <button className="btn btn-ghost btn-sm" onClick={back}>← Back</button>
            <button className="btn btn-primary btn-sm" onClick={nextStep}
              disabled={params.wantGyroGain && !params.gyroGainPot}>Next →</button>
            {initialParams && <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={finishEarly}>Finish ✓</button>}
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
            <button className="btn btn-primary btn-sm" onClick={nextStep}>Next →</button>
            {initialParams && <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={finishEarly}>Finish ✓</button>}
          </div>
        </>
      )}

      {step === 'confirm' && (
        <>
          <p className={css.stepTitle}>Ready to {initialParams ? 'apply' : 'create'}</p>
          <div className={css.wizardConfig} style={{ gap:6 }}>
            {params.modelName && (
              <p style={{ margin:0, fontSize:13, color:'var(--text)' }}>
                <strong>Name</strong>: {params.modelName}
              </p>
            )}
            <p style={{ margin:0, fontSize:13, color:'var(--text)' }}>
              <strong>Radio link</strong>: {SURFACE_PROTOCOLS.find(p => p.id === params.moduleProtocol)?.name ?? `Protocol ${params.moduleProtocol}`} · Failsafe: {FAILSAFE_OPTIONS.find(f => f.value === params.moduleFailsafe)?.label?.split(' — ')[0] ?? params.moduleFailsafe}
            </p>
            <p style={{ margin:0, fontSize:13, color:'var(--text)' }}>
              <strong>Throttle</strong> on CH{params.throttleDestCh + 1}
              {params.wantCruise && ` · Cruise via ${params.cruiseSw} (${params.cruiseSpeed}%)`}
              {params.dRateMode === 'pot' && ` · Speed limiter (${params.dRatePot} knob)`}
              {params.dRateMode === 'switch' && ` · Speed limit ${params.dRatePercent}% via ${params.dRateSwitch}`}
            </p>
            {params.wantSteering && (
              <p style={{ margin:0, fontSize:13, color:'var(--text)' }}>
                <strong>Steering</strong> on CH{params.steeringDestCh + 1}
                {params.strimSrc && ` · Trim via ${params.strimSrc}`}
              </p>
            )}
            {params.wantGyroGain && (
              <p style={{ margin:0, fontSize:13, color:'var(--text)' }}>
                <strong>Gyro gain</strong> on CH{params.gyroGainDestCh + 1} via {params.gyroGainPot} knob
              </p>
            )}
            {params.wantKidControl && (
              <p style={{ margin:0, fontSize:13, color:'var(--text)' }}>
                <strong>KidControl</strong> — wizard will launch next
              </p>
            )}
            {params.scale && (
              <p style={{ margin:0, fontSize:13, color:'var(--text)' }}>
                <strong>Scale</strong>: {params.scale}
              </p>
            )}
            {params.vehicleType && (
              <p style={{ margin:0, fontSize:13, color:'var(--text)' }}>
                <strong>Vehicle type</strong>: {vehicleCategories.find(c => c.id === params.vehicleType)?.name ?? params.vehicleType}
              </p>
            )}
          </div>
          <div className={css.wizardActions}>
            <button className="btn btn-ghost btn-sm" onClick={back}>← Back</button>
            {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
            <button className="btn btn-primary btn-sm" onClick={() => finish()}>
              {params.wantKidControl ? 'Create & launch KidControl →' : (initialParams ? 'Apply configuration' : 'Create configuration')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
