import { useState, useMemo } from 'react';
import type { Model } from '../../types/model.ts';
import { SwitchPicker } from '../shared/SwitchPicker.tsx';
import { buildSwitchUsageMap } from '../../codec/modelSummary.ts';
import { switchLabel } from '../../codec/switches.ts';
import type { KidModeParams } from './kidDefaults.ts';
import { calculateKidParams } from './kidCalculator.ts';
import { applyKidMode, removeKidMode, isKidModeActive } from './kidGenerator.ts';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { BUILT_IN_CATEGORIES, type VehicleCategory } from '../../data/vehicleTypes.ts';
import type { KidPreset } from '../../types/kidPreset.ts';
import css from './KidModeWizard.module.css';

interface Props {
  model: Model;
  onChange: (updater: (m: Model) => Model) => void;
  onApplied?: () => void;
  modelKey: string;
  skipActiveCheck?: boolean;
}

type Step = 'vehicle' | 'preset' | 'sliders';

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, unit = '%', onChange }: SliderRowProps) {
  return (
    <div className={css.sliderRow}>
      <span className={css.sliderLabel}>{label}</span>
      <input
        type="number"
        className={css.sliderNum}
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
      />
      <input
        type="range"
        className={css.sliderRange}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
      />
      <span className={css.sliderVal}>{value}{unit}</span>
    </div>
  );
}

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

function restrictionBar(level: number) {
  const filled = Math.round(level / 10);
  return (
    <div className={css.restrictionBar} title={`Restriction level: ${level}%`}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className={i < filled ? css.restrictionFilled : css.restrictionEmpty} />
      ))}
    </div>
  );
}

function extractActiveParams(model: Model): KidModeParams | null {
  const kidExpos = (model.expoData ?? []).filter(l => l.name?.startsWith('KID-'));
  const thExpo = kidExpos.find(l => l.name === 'KID-TH');
  const stExpo = kidExpos.find(l => l.name === 'KID-ST');
  const spMix = (model.mixData ?? []).find(l => l.name === 'KID-SP');
  if (!thExpo || !stExpo || !spMix) return null;
  return {
    thrRate: thExpo.weight,
    thrExpo: thExpo.curve?.value ?? 0,
    speedUp: spMix.speedUp,
    speedDown: spMix.speedDown,
    strRate: stExpo.weight,
    strExpo: stExpo.curve?.value ?? 0,
  };
}

function paramsHaveDrifted(applied: KidModeParams, expected: KidModeParams): boolean {
  return (
    Math.abs(applied.thrRate  - expected.thrRate)  > 2 ||
    Math.abs(applied.thrExpo  - expected.thrExpo)  > 2 ||
    Math.abs(applied.speedUp  - expected.speedUp)  > 2 ||
    Math.abs(applied.strRate  - expected.strRate)  > 2 ||
    Math.abs(applied.strExpo  - expected.strExpo)  > 2
  );
}

export function KidModeWizard({ model, onChange, onApplied, modelKey, skipActiveCheck }: Props) {
  const storedTypeId = useEditorStore(s => s.modelMeta[modelKey]?.vehicleType ?? '');
  const kidSnapshot  = useEditorStore(s => s.modelMeta[modelKey]?.kidSnapshot);
  const vehicleCategories = useEditorStore(s => s.vehicleCategories);
  const kidPresets = useEditorStore(s => s.kidPresets);
  const setModelVehicleType = useEditorStore(s => s.setModelVehicleType);
  const recordKidControlApplied = useEditorStore(s => s.recordKidControlApplied);
  const clearKidControlSnapshot = useEditorStore(s => s.clearKidControlSnapshot);

  const storedCat = vehicleCategories.find(c => c.id === storedTypeId);

  const [step, setStep] = useState<Step>(storedCat ? 'preset' : 'vehicle');
  const [selectedCat, setSelectedCat] = useState<VehicleCategory>(storedCat ?? vehicleCategories[0]);
  const [selectedPreset, setSelectedPreset] = useState<KidPreset>(kidPresets[0]);
  const [params, setParams] = useState<KidModeParams>(() =>
    storedCat ? calculateKidParams(storedCat, kidPresets[0]) : calculateKidParams(vehicleCategories[0], kidPresets[0])
  );
  const [triggerSwitch, setTriggerSwitch] = useState('SA2');
  const [editingActive, setEditingActive] = useState(false);

  const active = isKidModeActive(model);
  const inUse = useMemo(() => buildSwitchUsageMap(model), [model]);

  function param<K extends keyof KidModeParams>(key: K, value: KidModeParams[K]) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  function handleSelectCategory(cat: VehicleCategory) {
    setModelVehicleType(modelKey, cat.id);
    setSelectedCat(cat);
    setStep('preset');
  }

  function handleSelectPreset(preset: KidPreset) {
    setSelectedPreset(preset);
    setParams(calculateKidParams(selectedCat, preset));
    setStep('sliders');
  }

  function handleApply() {
    onChange((m) => applyKidMode(m, params, triggerSwitch));
    recordKidControlApplied(modelKey, selectedPreset.id, selectedCat.steeringCharacter, selectedCat.powerDelivery);
    setEditingActive(false);
    onApplied?.();
  }

  function handleRemove() {
    onChange((m) => removeKidMode(m));
    clearKidControlSnapshot(modelKey);
  }

  function handleEditLimits() {
    const current = extractActiveParams(model);
    if (current) setParams(current);
    setEditingActive(true);
  }

  function handleRecalculate(vehicle: VehicleCategory, preset?: KidPreset) {
    setSelectedCat(vehicle);
    if (preset) {
      setSelectedPreset(preset);
      setParams(calculateKidParams(vehicle, preset));
      setEditingActive(true);
    } else {
      // No known preset — take user back to preset selection
      setStep('preset');
    }
  }

  // ── Edit mode overlay (sliders over the active card) ──────────────────────
  if (active && editingActive) {
    return (
      <div className={css.root}>
        <div className={css.section}>
          <h4 className={css.sectionTitle}>Throttle</h4>
          <SliderRow label="Max rate" value={params.thrRate} min={10} max={100} onChange={(v) => param('thrRate', v)} />
          <SliderRow label="Expo" value={params.thrExpo} min={0} max={100} onChange={(v) => param('thrExpo', v)} />
          <SliderRow label="Speed up (×0.1s)" value={params.speedUp} min={0} max={25} unit="" onChange={(v) => param('speedUp', v)} />
          <SliderRow label="Speed down (×0.1s)" value={params.speedDown} min={0} max={25} unit="" onChange={(v) => param('speedDown', v)} />
        </div>
        <div className={css.section}>
          <h4 className={css.sectionTitle}>Steering</h4>
          <SliderRow label="Max rate" value={params.strRate} min={10} max={100} onChange={(v) => param('strRate', v)} />
          <SliderRow label="Expo" value={params.strExpo} min={0} max={100} onChange={(v) => param('strExpo', v)} />
        </div>
        <div className={css.section}>
          <h4 className={css.sectionTitle}>Trigger switch</h4>
          <p className={css.switchHint}>KidControl activates when this switch is in the selected position (FM1).</p>
          <div className={css.sliderRow}>
            <span className={css.sliderLabel}>Switch</span>
            <SwitchPicker value={triggerSwitch} onChange={setTriggerSwitch} style={{ gridColumn: '2 / -1' }} inUse={inUse} />
          </div>
        </div>
        <div className={css.previewBox}>
          <span className={css.previewTitle}>Effective in KidControl (FM1)</span>
          <div className={css.previewGrid}>
            <span>Throttle</span><span>{params.thrRate}% max, expo {params.thrExpo}, accel {(params.speedUp * 0.1).toFixed(1)}s / decel {(params.speedDown * 0.1).toFixed(1)}s</span>
            <span>Steering</span><span>{params.strRate}% max, expo {params.strExpo}</span>
            <span>Trigger</span><span>{triggerSwitch}</span>
          </div>
        </div>
        <div className={css.actions}>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditingActive(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply}>Apply changes</button>
        </div>
      </div>
    );
  }

  // ── Active summary card ────────────────────────────────────────────────────
  if (active && !skipActiveCheck) {
    const fm1 = model.flightModeData?.['1'];
    const trigSw = fm1?.swtch && fm1.swtch !== 'NONE' ? fm1.swtch : null;
    const appliedParams = extractActiveParams(model);

    // Detect staleness: vehicle type properties have changed since KidControl was applied.
    // Primary path: snapshot was recorded at apply time — compare exactly.
    // Fallback path: no snapshot (pre-existing KidControl) — compare current vehicle
    //   properties against the hardcoded built-in defaults to detect edits.
    let stale = false;
    let stalePreset: KidPreset | undefined;
    let staleCat: VehicleCategory | undefined;

    if (appliedParams && storedTypeId) {
      staleCat = vehicleCategories.find(c => c.id === storedTypeId);
      if (staleCat) {
        if (kidSnapshot) {
          stalePreset = kidPresets.find(p => p.id === kidSnapshot.presetId);
          const vehicleChanged =
            staleCat.steeringCharacter !== kidSnapshot.steeringCharacter ||
            staleCat.powerDelivery     !== kidSnapshot.powerDelivery;
          if (vehicleChanged && stalePreset) {
            stale = paramsHaveDrifted(appliedParams, calculateKidParams(staleCat, stalePreset));
          }
        } else {
          // No snapshot — check if the built-in has been edited from its shipped defaults
          const defaultCat = BUILT_IN_CATEGORIES.find(c => c.id === storedTypeId);
          if (defaultCat) {
            stale =
              staleCat.steeringCharacter !== defaultCat.steeringCharacter ||
              staleCat.powerDelivery     !== defaultCat.powerDelivery;
          }
        }
      }
    }

    return (
      <div className={css.root}>
        {stale && staleCat && stalePreset && (
          <div className={css.staleWarning}>
            <span className={css.staleIcon}>⚠</span>
            <div className={css.staleText}>
              <strong>Vehicle properties have changed</strong>
              <span>The {staleCat.name}'s steering or power character has been updated since KidControl was set up. The current limits may no longer suit your vehicle.</span>
            </div>
            <button
              className="btn btn-warning btn-sm"
              onClick={() => handleRecalculate(staleCat!, stalePreset!)}
            >
              Recalculate
            </button>
          </div>
        )}
        <div className={css.activeCard}>
          <div className={css.activeHeader}>
            <span className={css.activeBadge}>KidControl active</span>
          </div>
          <p className={css.activeHint}>
            KidControl is enabled — reduced throttle and steering limits apply when the trigger switch is engaged.
          </p>
          {trigSw && (
            <div className={css.activeRow}>
              <span className={css.activeLabel}>Trigger switch</span>
              <span className={css.activeValue}>{switchLabel(trigSw)}</span>
            </div>
          )}
          {appliedParams && (
            <>
              <div className={css.activeRow}>
                <span className={css.activeLabel}>Throttle limit</span>
                <span className={css.activeValue}>
                  {appliedParams.thrRate}% max — {expoFeel(appliedParams.thrExpo)} response ({appliedParams.thrExpo}% expo)
                </span>
              </div>
              {(appliedParams.speedUp > 0 || appliedParams.speedDown > 0) && (
                <div className={css.activeRow}>
                  <span className={css.activeLabel}>Speed ramp</span>
                  <span className={css.activeValue}>{rampDesc(appliedParams.speedUp, appliedParams.speedDown)}</span>
                </div>
              )}
              <div className={css.activeRow}>
                <span className={css.activeLabel}>Steering limit</span>
                <span className={css.activeValue}>
                  {appliedParams.strRate}% max — {expoFeel(appliedParams.strExpo)} response ({appliedParams.strExpo}% expo)
                </span>
              </div>
            </>
          )}
          <div className={css.activeActions}>
            <button className="btn btn-ghost btn-sm" onClick={handleEditLimits}>
              Edit limits
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleRemove}>
              Remove KidControl
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Wizard steps ───────────────────────────────────────────────────────────
  return (
    <div className={css.root}>
      <div className={css.breadcrumb}>
        <button className={step === 'vehicle' ? css.crumbActive : css.crumb} onClick={() => setStep('vehicle')}>
          1. Vehicle
        </button>
        <span className={css.crumbSep}>›</span>
        <button
          className={step === 'preset' ? css.crumbActive : css.crumb}
          onClick={() => step !== 'vehicle' && setStep('preset')}
          disabled={step === 'vehicle'}
        >
          2. Driver
        </button>
        <span className={css.crumbSep}>›</span>
        <button
          className={step === 'sliders' ? css.crumbActive : css.crumb}
          onClick={() => step === 'sliders' && setStep('sliders')}
          disabled={step !== 'sliders'}
        >
          3. Adjust &amp; Confirm
        </button>
      </div>

      {step === 'vehicle' && (
        <div>
          <h3 className={css.stepTitle}>What type of vehicle?</h3>
          <div className={css.cardGrid}>
            {vehicleCategories.map((cat) => (
              <button key={cat.id} className={css.typeCard} onClick={() => handleSelectCategory(cat)}>
                <span className={css.typeIcon}>{cat.icon}</span>
                <span className={css.typeLabel}>{cat.name}</span>
                <span className={css.typeDesc}>{cat.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'preset' && (
        <div>
          <h3 className={css.stepTitle}>Who is driving?</h3>
          <p className={css.stepSub}>Vehicle: <strong>{selectedCat.name}</strong></p>
          <div className={css.speedGrid}>
            {kidPresets.map((preset) => (
              <button key={preset.id} className={css.speedCard} onClick={() => handleSelectPreset(preset)}>
                <span className={css.speedLabel}>{preset.name}</span>
                <span className={css.speedDesc}>{preset.description}</span>
                {restrictionBar(preset.restrictionLevel)}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={() => setStep('vehicle')}>
            ← Back
          </button>
        </div>
      )}

      {step === 'sliders' && (
        <div>
          <h3 className={css.stepTitle}>Adjust limits</h3>
          <p className={css.stepSub}>{selectedCat.name} — tweak before applying</p>

          <div className={css.section}>
            <h4 className={css.sectionTitle}>Throttle</h4>
            <SliderRow label="Max rate" value={params.thrRate} min={10} max={100} onChange={(v) => param('thrRate', v)} />
            <SliderRow label="Expo" value={params.thrExpo} min={0} max={100} onChange={(v) => param('thrExpo', v)} />
            <SliderRow label="Speed up (×0.1s)" value={params.speedUp} min={0} max={25} unit="" onChange={(v) => param('speedUp', v)} />
            <SliderRow label="Speed down (×0.1s)" value={params.speedDown} min={0} max={25} unit="" onChange={(v) => param('speedDown', v)} />
          </div>

          <div className={css.section}>
            <h4 className={css.sectionTitle}>Steering</h4>
            <SliderRow label="Max rate" value={params.strRate} min={10} max={100} onChange={(v) => param('strRate', v)} />
            <SliderRow label="Expo" value={params.strExpo} min={0} max={100} onChange={(v) => param('strExpo', v)} />
          </div>

          <div className={css.section}>
            <h4 className={css.sectionTitle}>Trigger switch</h4>
            <p className={css.switchHint}>KidControl activates when this switch is in the selected position (FM1).</p>
            <div className={css.sliderRow}>
              <span className={css.sliderLabel}>Switch</span>
              <SwitchPicker value={triggerSwitch} onChange={setTriggerSwitch} style={{ gridColumn: '2 / -1' }} inUse={inUse} />
            </div>
          </div>

          <div className={css.previewBox}>
            <span className={css.previewTitle}>Effective in KidControl (FM1)</span>
            <div className={css.previewGrid}>
              <span>Throttle</span><span>{params.thrRate}% max, expo {params.thrExpo}, accel {(params.speedUp * 0.1).toFixed(1)}s / decel {(params.speedDown * 0.1).toFixed(1)}s</span>
              <span>Steering</span><span>{params.strRate}% max, expo {params.strExpo}</span>
              <span>Trigger</span><span>{triggerSwitch}</span>
            </div>
          </div>

          <div className={css.actions}>
            <button className="btn btn-ghost btn-sm" onClick={() => setStep('preset')}>← Back</button>
            <button className="btn btn-primary" onClick={handleApply}>Apply KidControl</button>
          </div>
        </div>
      )}
    </div>
  );
}
