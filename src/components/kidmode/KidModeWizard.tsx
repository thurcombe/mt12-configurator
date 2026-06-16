import { useState } from 'react';
import type { Model } from '../../types/model.ts';
import { SwitchPicker } from '../shared/SwitchPicker.tsx';
import {
  DEFAULTS,
  VEHICLE_LABELS,
  SPEED_LABELS,
  type VehicleType,
  type SpeedClass,
  type KidModeParams,
} from './kidDefaults.ts';
import { applyKidMode, removeKidMode, isKidModeActive } from './kidGenerator.ts';
import { useEditorStore } from '../../store/useEditorStore.ts';
import type { VehicleCategory } from '../../data/vehicleTypes.ts';
import css from './KidModeWizard.module.css';

interface Props {
  model: Model;
  onChange: (updater: (m: Model) => Model) => void;
  onApplied?: () => void;
  modelKey: string;
}

type Step = 'vehicle' | 'speed' | 'sliders';

const SPEED_CLASSES: SpeedClass[] = ['slow', 'medium', 'fast'];

const SPEED_DESCRIPTIONS: Record<SpeedClass, string> = {
  slow: 'Very conservative — for young or first-time drivers',
  medium: 'Balanced — comfortable limits for most kids',
  fast: 'Light limits — for older or experienced kids',
};

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

export function KidModeWizard({ model, onChange, onApplied, modelKey }: Props) {
  const storedTypeId = useEditorStore(s => s.modelMeta[modelKey]?.vehicleType ?? '');
  const vehicleCategories = useEditorStore(s => s.vehicleCategories);
  const setModelVehicleType = useEditorStore(s => s.setModelVehicleType);

  const storedCat = vehicleCategories.find(c => c.id === storedTypeId);
  const derivedKidType = storedCat?.kidType;

  const [step, setStep] = useState<Step>(derivedKidType ? 'speed' : 'vehicle');
  const [vehicle, setVehicle] = useState<VehicleType>(derivedKidType ?? 'crawler');
  const [vehicleLabel, setVehicleLabel] = useState<string>(storedCat?.name ?? VEHICLE_LABELS[derivedKidType ?? 'crawler']);
  const [speed, setSpeed] = useState<SpeedClass>('slow');
  const [params, setParams] = useState<KidModeParams>(DEFAULTS[derivedKidType ?? 'crawler'].slow);
  const [triggerSwitch, setTriggerSwitch] = useState('FL10');

  const active = isKidModeActive(model);

  function param<K extends keyof KidModeParams>(key: K, value: KidModeParams[K]) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  function handleSelectCategory(cat: VehicleCategory) {
    setModelVehicleType(modelKey, cat.id);
    setVehicle(cat.kidType);
    setVehicleLabel(cat.name);
    setStep('speed');
    setParams(DEFAULTS[cat.kidType][speed]);
  }

  function handleSelectSpeed(s: SpeedClass) {
    setSpeed(s);
    setParams(DEFAULTS[vehicle][s]);
    setStep('sliders');
  }

  function handleApply() {
    onChange((m) => applyKidMode(m, params, triggerSwitch));
    onApplied?.();
  }

  function handleRemove() {
    onChange((m) => removeKidMode(m));
  }

  if (active) {
    const fm1 = model.flightModeData?.['1'];
    const trigSw = fm1?.swtch && fm1.swtch !== 'NONE' ? fm1.swtch : null;
    const kidExpos = (model.expoData ?? []).filter(l => (l.name ?? '').startsWith('KID-'));
    const thExpo = kidExpos.find(l => l.name === 'KID-TH');
    const stExpo = kidExpos.find(l => l.name === 'KID-ST');
    const spMix = (model.mixData ?? []).find(l => l.name === 'KID-SP');
    return (
      <div className={css.root}>
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
              <span className={css.activeValue}>{trigSw}</span>
            </div>
          )}
          {thExpo && (
            <div className={css.activeRow}>
              <span className={css.activeLabel}>Throttle limit</span>
              <span className={css.activeValue}>
                {thExpo.weight}% max{thExpo.curve?.value ? ` — ${expoFeel(thExpo.curve.value)} response (${thExpo.curve.value}% expo)` : ''}
              </span>
            </div>
          )}
          {spMix && (spMix.speedUp > 0 || spMix.speedDown > 0) && (
            <div className={css.activeRow}>
              <span className={css.activeLabel}>Speed ramp</span>
              <span className={css.activeValue}>{rampDesc(spMix.speedUp, spMix.speedDown)}</span>
            </div>
          )}
          {stExpo && (
            <div className={css.activeRow}>
              <span className={css.activeLabel}>Steering limit</span>
              <span className={css.activeValue}>
                {stExpo.weight}% max{stExpo.curve?.value ? ` — ${expoFeel(stExpo.curve.value)} response (${stExpo.curve.value}% expo)` : ''}
              </span>
            </div>
          )}
          <button className="btn btn-danger btn-sm" style={{ marginTop: 8 }} onClick={handleRemove}>
            Remove KidControl
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={css.root}>
      {/* Breadcrumb */}
      <div className={css.breadcrumb}>
        <button
          className={step === 'vehicle' ? css.crumbActive : css.crumb}
          onClick={() => setStep('vehicle')}
        >
          1. Vehicle
        </button>
        <span className={css.crumbSep}>›</span>
        <button
          className={step === 'speed' ? css.crumbActive : css.crumb}
          onClick={() => step !== 'vehicle' && setStep('speed')}
          disabled={step === 'vehicle'}
        >
          2. Speed
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

      {/* Step 1 — Vehicle type */}
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

      {/* Step 2 — Speed class */}
      {step === 'speed' && (
        <div>
          <h3 className={css.stepTitle}>How fast is the driver?</h3>
          <p className={css.stepSub}>Vehicle: <strong>{vehicleLabel}</strong></p>
          <div className={css.speedGrid}>
            {SPEED_CLASSES.map((s) => (
              <button
                key={s}
                className={css.speedCard}
                onClick={() => handleSelectSpeed(s)}
              >
                <span className={css.speedLabel}>{SPEED_LABELS[s]}</span>
                <span className={css.speedDesc}>{SPEED_DESCRIPTIONS[s]}</span>
                <div className={css.speedPreview}>
                  <span>Thr: {DEFAULTS[vehicle][s].thrRate}%</span>
                  <span>Str: {DEFAULTS[vehicle][s].strRate}%</span>
                </div>
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={() => setStep('vehicle')}>
            ← Back
          </button>
        </div>
      )}

      {/* Step 3 — Sliders */}
      {step === 'sliders' && (
        <div>
          <h3 className={css.stepTitle}>Adjust limits</h3>
          <p className={css.stepSub}>
            {vehicleLabel} · {SPEED_LABELS[speed]} — tweak before applying
          </p>

          <div className={css.section}>
            <h4 className={css.sectionTitle}>Throttle</h4>
            <SliderRow label="Max rate" value={params.thrRate} min={10} max={100} onChange={(v) => param('thrRate', v)} />
            <SliderRow label="Expo" value={params.thrExpo} min={0} max={100} onChange={(v) => param('thrExpo', v)} />
            <SliderRow
              label="Speed up (×0.1s)"
              value={params.speedUp}
              min={0}
              max={25}
              unit=""
              onChange={(v) => param('speedUp', v)}
            />
            <SliderRow
              label="Speed down (×0.1s)"
              value={params.speedDown}
              min={0}
              max={25}
              unit=""
              onChange={(v) => param('speedDown', v)}
            />
          </div>

          <div className={css.section}>
            <h4 className={css.sectionTitle}>Steering</h4>
            <SliderRow label="Max rate" value={params.strRate} min={10} max={100} onChange={(v) => param('strRate', v)} />
            <SliderRow label="Expo" value={params.strExpo} min={0} max={100} onChange={(v) => param('strExpo', v)} />
          </div>

          <div className={css.section}>
            <h4 className={css.sectionTitle}>Trigger switch</h4>
            <p className={css.switchHint}>KidControl activates when this switch is in the selected position (FM1).</p>
            <div className={css.switchRow}>
              <label className={css.switchLabel}>Switch</label>
              <SwitchPicker value={triggerSwitch} onChange={setTriggerSwitch} />
            </div>
          </div>

          <div className={css.previewBox}>
            <span className={css.previewTitle}>Effective in KidControl (FM1)</span>
            <div className={css.previewGrid}>
              <span>Throttle</span><span>{params.thrRate}% max, expo {params.thrExpo}, accel {params.speedUp * 0.1}s / decel {params.speedDown * 0.1}s</span>
              <span>Steering</span><span>{params.strRate}% max, expo {params.strExpo}</span>
              <span>Trigger</span><span>{triggerSwitch}</span>
            </div>
          </div>

          <div className={css.actions}>
            <button className="btn btn-ghost btn-sm" onClick={() => setStep('speed')}>
              ← Back
            </button>
            <button className="btn btn-primary" onClick={handleApply}>
              Apply KidControl
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
