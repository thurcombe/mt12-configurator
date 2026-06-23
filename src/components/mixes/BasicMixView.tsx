import { useState, useMemo, useEffect } from 'react';
import type { Model } from '../../types/model.ts';
import { WeightSlider } from '../shared/WeightSlider.tsx';
import { SwitchPicker } from '../shared/SwitchPicker.tsx';
import { InputSourcePicker } from '../shared/InputSourcePicker.tsx';
import { KidModeWizard } from '../kidmode/KidModeWizard.tsx';
import { applyKidMode, removeKidMode } from '../kidmode/kidGenerator.ts';
import { expoFeel, rampDesc } from '../kidmode/kidFormatters.ts';
import { ConfirmModal } from '../shared/ConfirmModal.tsx';
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
  setGyroSource,
  setSTrimSource,
  setDRateSource,
  physicalSrcFor,
  defaultWizardParams,
  generateBasicModel,
  buildSourceOptions,
  type BasicAnalysis,
  type WizardParams,
} from './basicPatterns.ts';
import { buildInputMap, buildSwitchUsageMap } from '../../codec/modelSummary.ts';
import { MULTI_PROTOCOLS } from '../../codec/protocols.ts';
import { getExpansionConflict, refControl, switchPosLabel } from '../models/expansionConflict.ts';
import { EXPANSION_MODULES } from '../../hardware/mt12.ts';
import { Icon } from '../shared/Icon.tsx';
import { faSignal, faTowerBroadcast, faCar, faGear, faGaugeHigh, faArrowsLeftRight, faRotate, faShield, faTriangleExclamation, faCircleCheck, faDiamond, faHashtag } from '@fortawesome/free-solid-svg-icons';
import css from './BasicMixView.module.css';
import { ModelImagePicker } from '../models/ModelImagePicker.tsx';

const SURFACE_PROTOCOLS = MULTI_PROTOCOLS;

// Builds the amber-warning tooltip for a switch/source value when the control it
// references is no longer provided (or position overflows) on the installed module.
function expansionWarnTitle(
  ref: string | undefined | null,
  affected: Set<string>,
  overflowPositions: Set<string>,
  moduleLabel: string,
): string | undefined {
  if (!ref) return undefined;
  const norm = ref.startsWith('!') ? ref.slice(1) : ref;
  const ctrl = refControl(ref);
  if (!ctrl) return undefined;
  if (overflowPositions.has(norm)) {
    return `${switchPosLabel(norm)} is not available on ${moduleLabel} — this condition will never trigger.`;
  }
  if (affected.has(ctrl)) {
    return `${ctrl} isn't provided by the installed expansion module (${moduleLabel}). Its mixes and switch conditions will be inactive until the module is changed back or this model is updated.`;
  }
  return undefined;
}

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
  cancelSignal?: number;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BasicMixView({ model, modelKey, onChange, onSwitchToAdvanced, onWizardActiveChange, cancelSignal }: Props) {
  const [wizardActive, setWizardActive] = useState(false);
  const [kidControlActive, setKidControlActive] = useState(false);
  const analysis = useMemo(() => analyseBasicPatterns(model), [model]);

  function setWizard(v: boolean) { setWizardActive(v); onWizardActiveChange?.(v); }
  function setKidControl(v: boolean) { setKidControlActive(v); onWizardActiveChange?.(v); }

  // Respond to parent back-button press: cancel whichever wizard is active.
  useEffect(() => {
    if (!cancelSignal) return;
    if (kidControlActive) { setKidControl(false); return; }
    if (wizardActive)     { setWizard(false);      return; }
  }, [cancelSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Inline KidControl wizard
  if (kidControlActive) {
    return (
      <div>
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}
          onClick={() => setKidControl(false)}>
          ← Back to summary
        </button>
        <KidModeWizard model={model} onChange={onChange} onApplied={() => setKidControl(false)} modelKey={modelKey} skipActiveCheck />
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
        onLaunchKidControl={() => { setWizard(false); setKidControl(true); }}
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
      onRunKidControl={() => setKidControl(true)}
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
  const inUse = useMemo(() => buildSwitchUsageMap(model), [model]);
  const kidActive = !!model.flightModeData?.['1'];
  const expansionModule = useEditorStore(s => s.expansionModule);

  // Expansion-module conflict: which base controls (FL1/FL2/P3/P4) this model uses
  // that the installed module no longer provides. Drives the amber field/panel highlights.
  const installedModule = expansionModule();
  const { affectedControls, overflowPositions, moduleLabel } = useMemo(() => {
    const c = getExpansionConflict(model, installedModule);
    const affected = new Set<string>();
    const overflow = new Set<string>();
    if (c) {
      for (const ctrl of c.controls) {
        if (/^FL[12]\d$/.test(ctrl)) { overflow.add(ctrl); }
        const b = refControl(ctrl); if (b) affected.add(b);
      }
    }
    const label = installedModule === 'none' ? 'no module installed' : EXPANSION_MODULES[installedModule].label;
    return { affectedControls: affected, overflowPositions: overflow, moduleLabel: label };
  }, [model, installedModule]);

  const vehicleCategories = useEditorStore(s => s.vehicleCategories);
  const modelMeta = useEditorStore(s => s.modelMeta[modelKey]);
  const setModelScale = useEditorStore(s => s.setModelScale);
  const setModelVehicleType = useEditorStore(s => s.setModelVehicleType);
  const setModelPower = useEditorStore(s => s.setModelPower);

  const selectedCat = vehicleCategories.find(c => c.id === (modelMeta?.vehicleType ?? ''));

  const [pendingVehicleType, setPendingVehicleType] = useState<string | null>(null);

  function handleVehicleTypeChange(newValue: string) {
    if (kidActive) {
      setPendingVehicleType(newValue);
    } else {
      setModelVehicleType(modelKey, newValue);
    }
  }

  return (
    <div className={css.root}>
      {analysis.throttle && (
        <ThrottleCard model={model} analysis={analysis} inputMap={inputMap} onChange={onChange} affectedControls={affectedControls} overflowPositions={overflowPositions} moduleLabel={moduleLabel} inUse={inUse} />
      )}
      {analysis.steering && (
        <SteeringCard analysis={analysis} model={model} onChange={onChange} />
      )}
      {analysis.gyro && (
        <GyroGainCard model={model} analysis={analysis} inputMap={inputMap} onChange={onChange} />
      )}

      {/* Vehicle details */}
      <section className={css.card}>
        <div className={css.cardHeader}>
          <span className={css.cardIcon}><Icon icon={faCar} size={18} /></span>
          <span className={css.cardTitle}>Vehicle details</span>
        </div>
        <div className={css.fieldRow}>
          <span className={css.fieldLabel}>Model name</span>
          <input
            type="text"
            style={{ background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', fontSize:13, fontFamily:'var(--font)', width:180 }}
            value={model.header?.name ?? ''}
            placeholder={modelKey}
            maxLength={15}
            onChange={(e) => onChange(m => ({ ...m, header: { ...m.header, name: e.target.value } }))}
          />
        </div>
        <div className={css.fieldRow}>
          <span className={css.fieldLabel}>Vehicle type</span>
          <select
            style={{ background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', fontSize:13, fontFamily:'var(--font)' }}
            value={modelMeta?.vehicleType ?? ''}
            onChange={(e) => handleVehicleTypeChange(e.target.value)}
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
        <div className={css.fieldRow}>
          <span className={css.fieldLabel}>Power source</span>
          <select
            style={{ background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', fontSize:13, fontFamily:'var(--font)' }}
            value={modelMeta?.power ?? ''}
            onChange={(e) => setModelPower(modelKey, e.target.value as 'battery' | 'fuel' | '')}
          >
            <option value="">Not specified</option>
            <option value="battery">Battery (electric)</option>
            <option value="fuel">Fuel (nitro/petrol)</option>
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
        affectedControls={affectedControls}
        overflowPositions={overflowPositions}
        moduleLabel={moduleLabel}
      />

      {/* Setup wizard card */}
      <section className={css.card}>
        <div className={css.cardHeader}>
          <span className={css.cardIcon}><Icon icon={faGear} size={18} /></span>
          <span className={css.cardTitle}>Vehicle setup</span>
        </div>
        {analysis.throttle || analysis.steering ? (
          <>
            <p className={css.fieldHint}>Change throttle/steering channels, cruise control, or speed limiter settings.</p>
            <button className="btn btn-ghost btn-sm" onClick={onRunWizard} style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
              <Icon icon={faGear} size={12} /> Re-run setup wizard
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

      {pendingVehicleType !== null && (
        <ConfirmModal
          title="KidControl will be removed"
          message="This model has KidControl configured. Changing the vehicle type will remove the KidControl setup — you can configure it again afterwards."
          confirmLabel="Change type &amp; remove KidControl"
          onCancel={() => setPendingVehicleType(null)}
          onConfirm={() => {
            onChange(m => removeKidMode(m));
            clearKidControlSnapshot(modelKey);
            setModelVehicleType(modelKey, pendingVehicleType);
            setPendingVehicleType(null);
          }}
        />
      )}
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
        <span className={css.cardIcon}><Icon icon={faTowerBroadcast} size={18} /></span>
        <span className={css.cardTitle}>Radio link</span>
        {protocol && <span className={css.cardMeta}><Icon icon={faSignal} size={11} />{protocol.name}</span>}
      </div>
      <p className={css.fieldHint}>Which receiver is in your vehicle, and what should happen if the signal is lost.</p>
      <div className={css.fieldRow}>
        <span className={css.fieldLabel}>Receiver protocol</span>
        <select
          style={{ background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', fontSize:13, fontFamily:'var(--font)', flex:1 }}
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
          style={{ background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', fontSize:13, fontFamily:'var(--font)', flex:1 }}
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
  model: Model;
  analysis: BasicAnalysis;
  inputMap: Record<number, string>;
  onChange: (updater: (m: Model) => Model) => void;
  affectedControls?: Set<string>;
  overflowPositions?: Set<string>;
  moduleLabel?: string;
  inUse?: Record<string, string[]>;
}

// ── KidControl card ───────────────────────────────────────────────────────────


function KidControlCard({ model, modelKey, kidActive, onChange, onRunKidControl, onRemoveKidControl, affectedControls, overflowPositions, moduleLabel }: { model: Model; modelKey: string; kidActive: boolean; onChange: (updater: (m: Model) => Model) => void; onRunKidControl: () => void; onRemoveKidControl: () => void; affectedControls?: Set<string>; overflowPositions?: Set<string>; moduleLabel?: string }) {
  const inUse = useMemo(() => buildSwitchUsageMap(model), [model]);
  const fm1 = model.flightModeData?.['1'];
  const triggerSwitch = fm1?.swtch && fm1.swtch !== 'NONE' ? fm1.swtch : null;
  // The trigger switch lives inside this panel rather than in a standalone field,
  // so when it references a missing expansion control we highlight the whole panel.
  const triggerWarnTitle = expansionWarnTitle(triggerSwitch, affectedControls ?? new Set(), overflowPositions ?? new Set(), moduleLabel ?? '');
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
    <section className={`${css.card} ${stale || triggerWarnTitle ? css.cardStale : ''}`}>
      <div className={css.cardHeader}>
        <span className={css.cardIcon}><Icon icon={faShield} size={18} /></span>
        <span className={css.cardTitle}>KidControl</span>
        {kidActive && <span className={css.cardMetaGreen}><Icon icon={faCircleCheck} size={11} />Active</span>}
        {kidActive && modelMeta?.kidSnapshot && (() => {
          const name = kidPresets.find(p => p.id === modelMeta.kidSnapshot!.presetId)?.name;
          return name ? <span className={css.cardMetaMuted}><Icon icon={faDiamond} size={11} />{name}</span> : null;
        })()}
      </div>
      {kidActive ? (
        <>
          {triggerWarnTitle && (
            <div className={css.staleWarning}>
              <span className={css.staleIcon}><Icon icon={faTriangleExclamation} size={16} /></span>
              <div className={css.staleText}>
                <strong>Trigger switch unavailable</strong>
                <span>{triggerWarnTitle} Change the expansion module back or re-run the KidControl wizard to pick a different switch.</span>
              </div>
            </div>
          )}
          {stale && (
            <div className={css.staleWarning}>
              <span className={css.staleIcon}><Icon icon={faTriangleExclamation} size={16} /></span>
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
              <SwitchPicker
                value={triggerSwitch}
                warn={!!triggerWarnTitle}
                warnTitle={triggerWarnTitle}
                inUse={inUse}
                onChange={(v) => onChange((m) => ({
                  ...m,
                  flightModeData: {
                    ...m.flightModeData,
                    '1': { ...m.flightModeData?.['1']!, swtch: v },
                  },
                }))}
              />
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
            <button className="btn btn-ghost btn-sm" onClick={onRunKidControl} style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
              <Icon icon={faGear} size={12} /> Re-run KidControl wizard
            </button>
            <button className="btn btn-danger btn-sm" onClick={onRemoveKidControl}>
              Remove
            </button>
          </div>
        </>
      ) : modelMeta?.vehicleType ? (
        <>
          <p className={css.fieldHint}>KidControl adds a safe driving mode with reduced speed and steering limits, activated by a switch.</p>
          <button className="btn btn-ghost btn-sm" onClick={onRunKidControl}>
            + Set up KidControl
          </button>
        </>
      ) : (
        <p className={css.fieldHint} style={{ color: 'var(--text-muted)' }}>
          Set a vehicle type in Vehicle details above to enable KidControl.
        </p>
      )}
    </section>
  );
}

// ── Throttle card ──────────────────────────────────────────────────────────────

function ThrottleCard({ model, analysis, onChange, affectedControls, overflowPositions, moduleLabel, inUse }: CardProps) {
  const { throttle, cruise, drate } = analysis;
  if (!throttle) return null;
  return (
    <section className={css.card}>
      <div className={css.cardHeader}>
        <span className={css.cardIcon}><Icon icon={faGaugeHigh} size={18} /></span>
        <span className={css.cardTitle}>Throttle</span>
        <span className={css.cardMeta}><Icon icon={faHashtag} size={11} />CH{throttle.destCh + 1}</span>
      </div>
      <p className={css.fieldHint}>Sets how your trigger maps to throttle output. Configure cruise control and speed limiting below.</p>
      <div className={css.fieldRow}>
        <span className={css.fieldLabel}>Trigger rate</span>
        <WeightSlider value={throttle.weight} onChange={(v) => onChange((m) => setThrottleWeight(m, analysis, v))} min={0} max={100} />
      </div>
      {cruise ? (
        <CruiseSubCard analysis={analysis} onChange={onChange} affectedControls={affectedControls} overflowPositions={overflowPositions} moduleLabel={moduleLabel} inUse={inUse} />
      ) : (
        <button className={`btn btn-ghost btn-sm ${css.addBtn}`} onClick={() => onChange((m) => addCruise(m, analysis, 'SC2', 70))}>
          + Add cruise control
        </button>
      )}
      {drate && <DRateSubCard drate={drate} affectedControls={affectedControls} overflowPositions={overflowPositions} moduleLabel={moduleLabel} analysis={analysis} model={model} onChange={onChange} />}
    </section>
  );
}

function CruiseSubCard({ analysis, onChange, affectedControls, overflowPositions, moduleLabel, inUse }: { analysis: BasicAnalysis; onChange: CardProps['onChange']; affectedControls?: Set<string>; overflowPositions?: Set<string>; moduleLabel?: string; inUse?: Record<string, string[]> }) {
  const { cruise } = analysis;
  if (!cruise) return null;
  const warnTitle = expansionWarnTitle(cruise.setSw, affectedControls ?? new Set(), overflowPositions ?? new Set(), moduleLabel ?? '');
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
        <SwitchPicker value={cruise.setSw} onChange={(v) => onChange((m) => setCruiseSw(m, analysis, v))} warn={!!warnTitle} warnTitle={warnTitle} inUse={inUse} />
      </div>
      {warnTitle && <p className={css.fieldHint} style={{ color:'#f59e0b', display:'flex', alignItems:'baseline', gap:5 }}><Icon icon={faTriangleExclamation} size={12} />{warnTitle}</p>}
      <div className={css.fieldRow}>
        <span className={css.fieldLabel}>Cruise speed</span>
        <WeightSlider value={cruise.cruiseSpeed} onChange={(v) => onChange((m) => setCruiseSpeed(m, analysis, v))} min={0} max={100} />
      </div>
      {analysis.drate && <p className={css.fieldHint}>Base speed before the speed limiter knob is applied.</p>}
    </div>
  );
}

function DRateSubCard({ drate, affectedControls, overflowPositions, moduleLabel, analysis, model, onChange }: { drate: NonNullable<BasicAnalysis['drate']>; inputMap?: never; affectedControls?: Set<string>; overflowPositions?: Set<string>; moduleLabel?: string; analysis: BasicAnalysis; model: Model; onChange: CardProps['onChange'] }) {
  if (drate.switchMode) {
    const warnTitle = expansionWarnTitle(drate.switchMode.swtch, affectedControls ?? new Set(), overflowPositions ?? new Set(), moduleLabel ?? '');
    return (
      <div className={`${css.subCard} ${warnTitle ? css.subCardWarn : ''}`}>
        <div className={css.subHeader}><span className={css.subTitle}>Speed limiter</span></div>
        <p className={css.fieldHint}>
          Switch <strong>{drate.switchMode.swtch}</strong> caps throttle at <strong>{drate.switchMode.percent}%</strong> when active.
        </p>
        {warnTitle && <p className={css.fieldHint} style={{ color:'#f59e0b', display:'flex', alignItems:'baseline', gap:5 }}><Icon icon={faTriangleExclamation} size={12} />{warnTitle}</p>}
      </div>
    );
  }

  const expoData = model.expoData ?? [];
  const currentSrc = physicalSrcFor(drate.srcRaw, expoData);
  const strimMix = analysis.strim ? model.mixData[analysis.strim.globalIdx] : null;
  const strimSrc = strimMix ? physicalSrcFor(strimMix.srcRaw, expoData) : null;
  const gyroSrc = analysis.gyro ? physicalSrcFor(analysis.gyro.srcRaw, expoData) : null;

  function conflict(v: string) {
    if (v === strimSrc) return 'steering trim';
    if (v === gyroSrc) return 'gyro gain';
    return undefined;
  }

  const [min, max] = drate.range;
  const drateSrcOptions = buildSourceOptions(
    { T1: conflict('T1'), T2: conflict('T2'), T3: conflict('T3'), T4: conflict('T4'), T5: conflict('T5'), P1: conflict('P1'), P2: conflict('P2') }
  );

  return (
    <div className={css.subCard}>
      <div className={css.subHeader}><span className={css.subTitle}>Speed limiter</span></div>
      <p className={css.fieldHint}>
        This knob scales all throttle — fully down stops the vehicle ({min}–{max}%). Hover to highlight on the diagram.
      </p>
      <div className={css.fieldRow}>
        <span className={css.fieldLabel}>Limiter source</span>
        <InputSourcePicker
          value={currentSrc}
          options={drateSrcOptions}
          onChange={(v) => onChange((m) => setDRateSource(m, analysis, v))}
        />
      </div>
    </div>
  );
}

// ── Steering card ──────────────────────────────────────────────────────────────

function SteeringCard({ analysis, model, onChange }: { analysis: BasicAnalysis; model: Model; onChange: CardProps['onChange'] }) {
  const { steering, strim } = analysis;
  if (!steering) return null;
  return (
    <section className={css.card}>
      <div className={css.cardHeader}>
        <span className={css.cardIcon}><Icon icon={faArrowsLeftRight} size={18} /></span>
        <span className={css.cardTitle}>Steering</span>
        <span className={css.cardMeta}><Icon icon={faHashtag} size={11} />CH{steering.destCh + 1}</span>
      </div>
      <p className={css.fieldHint}>Sets how the steering wheel maps to your servo channel, including the centre-point trim offset.</p>
      <div className={css.fieldRow}>
        <span className={css.fieldLabel}>Steering rate</span>
        <WeightSlider value={steering.weight} onChange={(v) => onChange((m) => setSteeringWeight(m, analysis, v))} min={0} max={100} />
      </div>
      {strim && <STrimSubCard analysis={analysis} model={model} onChange={onChange} />}
    </section>
  );
}

function STrimSubCard({ analysis, model, onChange }: { analysis: BasicAnalysis; model: Model; onChange: CardProps['onChange'] }) {
  const { strim } = analysis;
  if (!strim) return null;

  const expoData = model.expoData ?? [];
  const strimMix = model.mixData[strim.globalIdx];
  const currentSrc = strimMix ? physicalSrcFor(strimMix.srcRaw, expoData) : '';

  const drateSrc = analysis.drate && !analysis.drate.switchMode
    ? physicalSrcFor(analysis.drate.srcRaw, expoData) : null;
  const gyroSrc = analysis.gyro
    ? physicalSrcFor(analysis.gyro.srcRaw, expoData) : null;

  function conflict(v: string) {
    if (v === drateSrc) return 'speed limiter';
    if (v === gyroSrc) return 'gyro gain';
    return undefined;
  }

  const strimSrcOptions = buildSourceOptions(
    { T1: conflict('T1'), T2: conflict('T2'), T3: conflict('T3'), T4: conflict('T4'), T5: conflict('T5'), P1: conflict('P1'), P2: conflict('P2') }
  );

  return (
    <div className={css.subCard}>
      <div className={css.subHeader}>
        <span className={css.subTitle}>Steering trim</span>
        <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)', fontSize:12 }}
          onClick={() => onChange((m) => removeSTrim(m, analysis))}>Remove</button>
      </div>
      <p className={css.fieldHint}>Adjusts the steering centre point. Hover to highlight the input on the diagram.</p>
      <div className={css.fieldRow}>
        <span className={css.fieldLabel}>Trim source</span>
        <InputSourcePicker
          value={currentSrc}
          options={strimSrcOptions}
          onChange={(v) => onChange((m) => setSTrimSource(m, analysis, v))}
        />
      </div>
      <div className={css.fieldRow}>
        <span className={css.fieldLabel}>Trim amount</span>
        <WeightSlider value={strim.weight} onChange={(v) => onChange((m) => setSTrimWeight(m, analysis, v))} min={-100} max={100} />
      </div>
    </div>
  );
}

// ── Gyro gain card ────────────────────────────────────────────────────────────

function GyroGainCard({ model, analysis, onChange }: CardProps) {
  const { gyro } = analysis;
  if (!gyro) return null;

  const expoData = model.expoData ?? [];
  // Derive the current physical source (what the user actually touches).
  const currentSrc = gyro.chn >= 0
    ? (expoData.find(e => e.chn === gyro.chn)?.srcRaw ?? (gyro.chn === 2 ? 'P1' : 'P2'))
    : gyro.srcRaw;

  // Derive sibling sources for conflict display.
  const drateSrc = analysis.drate && !analysis.drate.switchMode
    ? physicalSrcFor(analysis.drate.srcRaw, expoData) : null;
  const strimMix = analysis.strim ? model.mixData[analysis.strim.globalIdx] : null;
  const strimSrc = strimMix ? physicalSrcFor(strimMix.srcRaw, expoData) : null;

  function conflict(v: string) {
    if (v === drateSrc) return 'speed limiter';
    if (v === strimSrc) return 'steering trim';
    return undefined;
  }

  const gyroSrcOptions = buildSourceOptions(
    { T1: conflict('T1'), T2: conflict('T2'), T3: conflict('T3'), T4: conflict('T4'), T5: conflict('T5'), P1: conflict('P1'), P2: conflict('P2') }
  );

  return (
    <section className={css.card}>
      <div className={css.cardHeader}>
        <span className={css.cardIcon}><Icon icon={faRotate} size={18} /></span>
        <span className={css.cardTitle}>Gyro gain</span>
        <span className={css.cardMeta}><Icon icon={faHashtag} size={11} />CH{gyro.destCh + 1}</span>
        <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)', fontSize:12, marginLeft:'auto' }}
          onClick={() => onChange((m) => removeGyroGain(m, analysis))}>Remove</button>
      </div>
      <p className={css.fieldHint}>Controls gyro sensitivity on CH{gyro.destCh + 1}. Hover to highlight the input on the diagram.</p>
      <div className={css.fieldRow}>
        <span className={css.fieldLabel}>Gain source</span>
        <InputSourcePicker
          value={currentSrc}
          options={gyroSrcOptions}
          onChange={(v) => onChange((m) => setGyroSource(m, analysis, v))}
        />
      </div>
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

  // Build a switch usage map for the wizard from its own params so pickers show "In use by" correctly.
  const wizardSwitchInUse: Record<string, string[]> = {};
  if (params.wantCruise && params.cruiseSw && params.cruiseSw !== 'NONE') {
    wizardSwitchInUse[params.cruiseSw] = ['Cruise control'];
  }
  if (params.dRateMode === 'switch' && params.dRateSwitch && params.dRateSwitch !== 'NONE') {
    wizardSwitchInUse[params.dRateSwitch] = [...(wizardSwitchInUse[params.dRateSwitch] ?? []), 'Speed limiter'];
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
                <option value="battery">Battery (electric)</option>
                <option value="fuel">Fuel (nitro/petrol)</option>
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
                <SwitchPicker value={params.cruiseSw} onChange={(v) => patch({ cruiseSw: v })} inUse={wizardSwitchInUse} />
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
            <p className={css.fieldHint} style={{ color:'var(--danger)', marginTop:8, display:'flex', alignItems:'baseline', gap:5 }}>
              <Icon icon={faTriangleExclamation} size={12} />{stepConflictWarning.cruise}
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
                  options={buildSourceOptions(
                    Object.fromEntries(['T1','T2','T3','T4','T5','P1','P2'].map(v => [v,
                      (params.wantGyroGain && params.gyroGainPot === v ? 'gyro gain' : undefined)
                      ?? (params.wantSteering && params.strimSrc === v ? 'steering trim' : undefined)
                    ]))
                  )}
                />
              </div>
            </div>
          )}

          {params.dRateMode === 'switch' && (
            <div className={css.wizardConfig}>
              <div className={css.fieldRow}>
                <span className={css.fieldLabel}>Limit switch</span>
                <SwitchPicker value={params.dRateSwitch} onChange={(v) => patch({ dRateSwitch: v })} inUse={wizardSwitchInUse} />
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
            <p className={css.fieldHint} style={{ color:'var(--danger)', marginTop:8, display:'flex', alignItems:'baseline', gap:5 }}>
              <Icon icon={faTriangleExclamation} size={12} />{stepConflictWarning.drate}
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
                  options={buildSourceOptions(
                    Object.fromEntries(['P1','P2'].map(v => {
                      const isDrate = params.dRateMode === 'pot' && params.dRatePot === v;
                      const isGyro = params.wantGyroGain && params.gyroGainPot === v;
                      return [v, isDrate && isGyro ? 'speed limiter + gyro gain' : isDrate ? 'speed limiter' : isGyro ? 'gyro gain' : undefined];
                    }))
                  )}
                />
              </div>
            </div>
          )}
          {stepConflictWarning.steering && (
            <p className={css.fieldHint} style={{ color:'var(--danger)', marginTop:8, display:'flex', alignItems:'baseline', gap:5 }}>
              <Icon icon={faTriangleExclamation} size={12} />{stepConflictWarning.steering}
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
                  options={buildSourceOptions(
                    Object.fromEntries(['T1','T2','T3','T4','T5','P1','P2'].map(v => [v,
                      (params.dRateMode === 'pot' && params.dRatePot === v ? 'speed limiter' : undefined)
                      ?? (params.wantSteering && params.strimSrc === v ? 'steering trim' : undefined)
                    ]))
                  )}
                />
              </div>
            </div>
          )}
          {stepConflictWarning.gyro && (
            <p className={css.fieldHint} style={{ color:'var(--danger)', marginTop:8, display:'flex', alignItems:'baseline', gap:5 }}>
              <Icon icon={faTriangleExclamation} size={12} />{stepConflictWarning.gyro}
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
