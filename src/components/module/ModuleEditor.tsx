import type { Model, ModuleData } from '../../types/model.ts';
import { MULTI_PROTOCOLS, protocolById, parseSubType, formatSubType } from '../../codec/protocols.ts';
import { Tooltip } from '../shared/Tooltip.tsx';
import css from './ModuleEditor.module.css';

interface Props {
  model: Model;
  onChange: (updater: (m: Model) => Model) => void;
}

// EdgeTX YAML type strings → friendly Mode labels
// In EdgeTX UI the outer selector is called "Mode".
const MODULE_MODES = [
  { value: 'TYPE_MULTIMODULE', label: 'MULTI (Multi-Protocol module)' },
  { value: 'TYPE_CROSSFIRE',   label: 'CRSF / ELRS (Crossfire, ExpressLRS)' },
  { value: 'TYPE_XJT_PXX1',   label: 'XJT (FrSky internal)' },
  { value: 'TYPE_ISRM_PXX2',  label: 'ISRM (FrSky ACCESS)' },
  { value: 'TYPE_R9M_PXX2',   label: 'R9M (FrSky long-range)' },
  { value: 'TYPE_PPM',         label: 'PPM (legacy universal)' },
  { value: 'TYPE_SBUS_JOYSTICK', label: 'SBUS' },
  { value: 'TYPE_GHOST',       label: 'Ghost' },
  { value: 'TYPE_AFHDS3',      label: 'AFHDS3 (FlySky)' },
  { value: 'none',             label: 'None / disabled' },
  // legacy lowercase values written by older configs
  { value: 'multi',       label: 'MULTI (legacy)' },
  { value: 'crossfire',   label: 'CRSF (legacy)' },
];

const FAILSAFE_MODES = [
  { value: 'not set',    label: 'Not set' },
  { value: 'hold',       label: 'Hold — keep last position' },
  { value: 'custom',     label: 'Custom — use programmed values' },
  { value: 'no pulses',  label: 'No pulses — stop all servo output' },
  { value: 'receiver',   label: "Receiver's built-in failsafe" },
];

function isMultiMode(type: string) {
  return type === 'TYPE_MULTIMODULE' || type === 'multi';
}

function ModulePanel({ idx, mod, onChange }: { idx: string; mod: ModuleData; onChange: (m: ModuleData) => void }) {
  const isMulti = isMultiMode(mod.type);
  const label = idx === '0' ? 'Internal' : 'External';
  const sub = parseSubType(mod.subType);
  const usesComma = typeof mod.subType === 'string' && (mod.subType as string).includes(',');

  const proto = protocolById(sub.protocol);
  const hasSubTypes = (proto?.subtypes.length ?? 0) > 0;
  const hasSubTypeRaw = !isMulti && mod.subType !== undefined && mod.subType !== null && mod.subType !== 0 && mod.subType !== '';

  return (
    <div className={css.panel}>
      <h3 className={css.panelTitle}>Module {idx} — {label}</h3>

      <div className={css.grid}>

        {/* ── Mode ── */}
        <label className={css.label}>
          Mode{' '}
          <Tooltip text="The type of RF module hardware installed. 'MULTI' is the Multi-Protocol module built into the MT12 — it supports Traxxas, FlySky, Spektrum and many others. Select CRSF for ExpressLRS or Crossfire." />
        </label>
        <select
          className={css.select}
          value={mod.type}
          onChange={(e) => onChange({ ...mod, type: e.target.value })}
        >
          {MODULE_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          {!MODULE_MODES.find((m) => m.value === mod.type) && (
            <option value={mod.type}>{mod.type}</option>
          )}
        </select>

        {/* ── Type (protocol) — only for MULTI mode ── */}
        {isMulti && (
          <>
            <label className={css.label}>
              Type{' '}
              <Tooltip text="The specific RF protocol spoken by your receiver. Must exactly match the receiver's chip. Traxxas TQi receivers use 'Traxxas TQi'. FlySky/Absima/Reely receivers typically use 'FlySky AFHDS2A'. Spektrum/Losi/ECX use 'DSM / Spektrum'." />
            </label>
            <div>
              <select
                className={css.select}
                value={sub.protocol}
                onChange={(e) => {
                  const protocol = parseInt(e.target.value, 10);
                  // Reset option to 0 when protocol changes
                  onChange({ ...mod, subType: formatSubType(protocol, 0, usesComma) });
                }}
              >
                {MULTI_PROTOCOLS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                {!MULTI_PROTOCOLS.find((p) => p.id === sub.protocol) && (
                  <option value={sub.protocol}>Protocol {sub.protocol}</option>
                )}
              </select>
              {proto?.note && (
                <div className={css.protoNote}>{proto.note}</div>
              )}
            </div>

            {/* ── Sub-type — dropdown if known, number input otherwise ── */}
            <label className={css.label}>
              Sub-type{' '}
              <Tooltip text="A variant of the selected protocol. For FlySky AFHDS2A: PWM+IBUS means PWM servo output with IBUS telemetry (most common). PPM+SBUS sends a PPM combined signal with SBUS. Match this to your receiver's wiring." />
            </label>
            {hasSubTypes ? (
              <select
                className={css.select}
                value={sub.option}
                onChange={(e) => {
                  const option = parseInt(e.target.value, 10);
                  onChange({ ...mod, subType: formatSubType(sub.protocol, option, usesComma) });
                }}
              >
                {proto!.subtypes.map((st) => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            ) : (
              <div className={css.subTypeRow}>
                <input
                  type="number"
                  className={css.inputSm}
                  value={sub.option}
                  min={0}
                  max={15}
                  onChange={(e) => {
                    const option = parseInt(e.target.value, 10) || 0;
                    onChange({ ...mod, subType: formatSubType(sub.protocol, option, usesComma) });
                  }}
                />
                <span className={css.subTypeHint}>No sub-types defined for this protocol</span>
              </div>
            )}
          </>
        )}

        {/* Raw sub-type for non-MULTI modules that have one */}
        {!isMulti && hasSubTypeRaw && (
          <>
            <label className={css.label}>
              Sub-type{' '}
              <Tooltip text="Protocol-specific variant from the YAML file. Refer to your module or receiver documentation." />
            </label>
            <input
              type="text"
              className={css.input}
              value={String(mod.subType)}
              onChange={(e) => onChange({ ...mod, subType: e.target.value })}
            />
          </>
        )}

        {/* ── Channels start ── */}
        <label className={css.label}>
          Channels start{' '}
          <Tooltip text="The first channel to transmit to the receiver, 0-based (0 = CH1). Leave at 0 unless you are using a trainer or second transmitter setup." />
        </label>
        <input
          type="number"
          className={css.input}
          value={mod.channelsStart}
          min={0}
          max={31}
          onChange={(e) => onChange({ ...mod, channelsStart: parseInt(e.target.value, 10) || 0 })}
        />

        {/* ── Channels count ── */}
        <label className={css.label}>
          Channels count{' '}
          <Tooltip text="How many channels to transmit. Traxxas TQi uses 6. Most surface receivers accept 8 or 16. Sending more than the receiver supports does no harm." />
        </label>
        <input
          type="number"
          className={css.input}
          value={mod.channelsCount}
          min={1}
          max={32}
          onChange={(e) => onChange({ ...mod, channelsCount: parseInt(e.target.value, 10) || 1 })}
        />

        {/* ── Failsafe ── */}
        <label className={css.label}>
          Failsafe{' '}
          <Tooltip text="What the receiver does when it loses signal for more than ~1 second. 'Hold' keeps the last known position (car keeps going). 'No pulses' stops all servo output — safest for surface cars as it cuts throttle." />
        </label>
        <select
          className={css.select}
          value={mod.failsafeMode}
          onChange={(e) => onChange({ ...mod, failsafeMode: e.target.value })}
        >
          {FAILSAFE_MODES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          {!FAILSAFE_MODES.find((f) => f.value === mod.failsafeMode) && (
            <option value={mod.failsafeMode}>{mod.failsafeMode}</option>
          )}
        </select>

      </div>
    </div>
  );
}

export function ModuleEditor({ model, onChange }: Props) {
  const modules = model.moduleData ?? {};

  function updateModule(idx: string, mod: ModuleData) {
    onChange((m) => ({
      ...m,
      moduleData: { ...m.moduleData, [idx]: mod },
    }));
  }

  if (Object.keys(modules).length === 0) {
    return <p style={{ color: 'var(--text-muted)', padding: 20 }}>No module data in this model.</p>;
  }

  return (
    <div className={css.root}>
      {Object.entries(modules).map(([idx, mod]) => (
        <ModulePanel
          key={idx}
          idx={idx}
          mod={mod}
          onChange={(m) => updateModule(idx, m)}
        />
      ))}
    </div>
  );
}
