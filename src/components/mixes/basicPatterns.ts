// Pattern detection and mutation helpers for the Basic mix view.
// All functions are pure — they return new model objects, never mutate in place.

import type { Model, MixLine, ExpoLine, LogicalSw, InputName, ModuleData } from '../../types/model.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ThrottlePattern {
  globalIdx: number;
  destCh: number;  // 0-based
  weight: number;
}

export interface CruisePattern {
  globalIdx: number;
  lsKey: string;     // key in model.logicalSw, e.g. "0"
  lsIndex1: number;  // 1-based, as used in srcRaw ls(N)
  cruiseSpeed: number; // 0–100; = weight + offset (both are speed/2)
  setSw: string;     // switch position string, e.g. "SC2"
}

export interface DRatePattern {
  globalIdx: number;
  srcRaw: string;
  // pot mode (srcRaw matches I\d+):
  chn: number;
  range: [number, number];
  // switch mode (srcRaw === 'MAX'):
  switchMode?: { swtch: string; percent: number };
}

export interface SteeringPattern {
  globalIdx: number;
  destCh: number;
  weight: number;
}

export interface STrimPattern {
  globalIdx: number;
  destCh: number;
  weight: number;
}

export interface GyroGainPattern {
  globalIdx: number;
  destCh: number;
  srcRaw: string;
  chn: number;  // expo input channel (2 = P1, 3 = P2)
}

export interface BasicAnalysis {
  kind: 'recognised' | 'empty' | 'unrecognised';
  throttle: ThrottlePattern | null;
  cruise: CruisePattern | null;
  drate: DRatePattern | null;
  steering: SteeringPattern | null;
  strim: STrimPattern | null;
  gyro: GyroGainPattern | null;
}

// ── Analysis ──────────────────────────────────────────────────────────────────

const LS_SRC_RE = /^ls\((\d+)\)$/;
const INPUT_RE = /^I(\d+)$/;
const KID_RE = /^KID-/;

const THROTTLE_NAMES = new Set(['THROT', 'THROTTLE']);
const CRUISE_NAMES   = new Set(['CRUISE']);
const DRATE_NAMES    = new Set(['D-RATE', 'DRATE']);
const STEER_NAMES    = new Set(['STEER', 'STEERING']);
const TRIM_NAMES     = new Set(['S-TRIM', 'STRIM']);
const GYRO_NAMES     = new Set(['GYRO-GAIN', 'GYROGAIN', 'GYRO']);

function expoRange(chn: number, model: Model): [number, number] {
  const expo = (model.expoData ?? []).find(e => e.chn === chn);
  if (!expo) return [-100, 100];
  const lo = Math.round((-100 * expo.weight / 100) + expo.offset);
  const hi = Math.round(( 100 * expo.weight / 100) + expo.offset);
  return [Math.min(lo, hi), Math.max(lo, hi)];
}

export function analyseBasicPatterns(model: Model): BasicAnalysis {
  const empty: BasicAnalysis = {
    kind: 'empty', throttle: null, cruise: null, drate: null, steering: null, strim: null, gyro: null,
  };

  const mixData = model.mixData ?? [];
  if (mixData.length === 0) return empty;

  let throttle: ThrottlePattern | null = null;
  let cruise: CruisePattern | null = null;
  let drate: DRatePattern | null = null;
  let steering: SteeringPattern | null = null;
  let strim: STrimPattern | null = null;
  let gyro: GyroGainPattern | null = null;
  let hasUnknown = false;

  for (let i = 0; i < mixData.length; i++) {
    const line = mixData[i];
    const name = (line.name ?? '').toUpperCase().trim();

    // Kid-mode lines are managed by the Kid Mode tab — skip transparently.
    if (KID_RE.test(name)) continue;

    if (THROTTLE_NAMES.has(name) && !throttle) {
      throttle = { globalIdx: i, destCh: line.destCh, weight: line.weight };
    } else if (CRUISE_NAMES.has(name) && !cruise) {
      const lsM = LS_SRC_RE.exec(line.srcRaw);
      if (lsM) {
        const lsIndex1 = parseInt(lsM[1]);
        const lsKey = String(lsIndex1 - 1);
        const ls = model.logicalSw?.[lsKey];
        const setSw = ls?.def.split(',')[0] ?? 'SC2';
        const cruiseSpeed = line.weight + line.offset; // weight=speed/2, offset=speed/2
        cruise = { globalIdx: i, lsKey, lsIndex1, cruiseSpeed, setSw };
      } else {
        hasUnknown = true;
      }
    } else if (DRATE_NAMES.has(name) && !drate) {
      if (line.srcRaw === 'MAX') {
        drate = { globalIdx: i, srcRaw: 'MAX', chn: -1, range: [0, 100], switchMode: { swtch: line.swtch, percent: line.weight } };
      } else {
        const inputM = INPUT_RE.exec(line.srcRaw);
        if (inputM) {
          const chn = parseInt(inputM[1]);
          drate = { globalIdx: i, srcRaw: line.srcRaw, chn, range: expoRange(chn, model) };
        } else if (/^T\d$/.test(line.srcRaw)) {
          drate = { globalIdx: i, srcRaw: line.srcRaw, chn: -1, range: [-100, 100] };
        } else {
          hasUnknown = true;
        }
      }
    } else if (STEER_NAMES.has(name) && !steering) {
      steering = { globalIdx: i, destCh: line.destCh, weight: line.weight };
    } else if (TRIM_NAMES.has(name) && !strim) {
      strim = { globalIdx: i, destCh: line.destCh, weight: line.weight };
    } else if (GYRO_NAMES.has(name) && !gyro) {
      const inputM = INPUT_RE.exec(line.srcRaw);
      if (inputM) {
        gyro = { globalIdx: i, destCh: line.destCh, srcRaw: line.srcRaw, chn: parseInt(inputM[1]) };
      } else if (/^T\d$/.test(line.srcRaw)) {
        gyro = { globalIdx: i, destCh: line.destCh, srcRaw: line.srcRaw, chn: -1 };
      } else {
        hasUnknown = true;
      }
    } else if (name === '' && line.srcRaw === 'TH' && !throttle) {
      // Unnamed throttle line — radio-native setup without wizard naming
      throttle = { globalIdx: i, destCh: line.destCh, weight: line.weight };
    } else if (name === '' && line.srcRaw === 'ST' && !steering) {
      // Unnamed steering line — radio-native setup without wizard naming
      steering = { globalIdx: i, destCh: line.destCh, weight: line.weight };
    } else {
      hasUnknown = true;
    }
  }

  if (hasUnknown) {
    return { kind: 'unrecognised', throttle, cruise, drate, steering, strim, gyro };
  }
  if (!throttle && !steering) {
    return empty;
  }
  return { kind: 'recognised', throttle, cruise, drate, steering, strim, gyro };
}

// ── Mutation helpers ──────────────────────────────────────────────────────────

function updateMixLine(model: Model, globalIdx: number, patch: Partial<MixLine>): Model {
  const mixData = model.mixData.map((l, i) =>
    i === globalIdx ? { ...l, ...patch } : l
  );
  return { ...model, mixData };
}

export function setThrottleWeight(model: Model, a: BasicAnalysis, weight: number): Model {
  if (!a.throttle) return model;
  return updateMixLine(model, a.throttle.globalIdx, { weight });
}

export function setSteeringWeight(model: Model, a: BasicAnalysis, weight: number): Model {
  if (!a.steering) return model;
  return updateMixLine(model, a.steering.globalIdx, { weight });
}

export function setSTrimWeight(model: Model, a: BasicAnalysis, weight: number): Model {
  if (!a.strim) return model;
  return updateMixLine(model, a.strim.globalIdx, { weight });
}

export function setCruiseSpeed(model: Model, a: BasicAnalysis, speed: number): Model {
  if (!a.cruise) return model;
  const half = Math.round(speed / 2);
  return updateMixLine(model, a.cruise.globalIdx, { weight: half, offset: half });
}

export function setCruiseSw(model: Model, a: BasicAnalysis, sw: string): Model {
  if (!a.cruise) return model;
  const logicalSw = { ...(model.logicalSw ?? {}) };
  const existing = logicalSw[a.cruise.lsKey];
  if (!existing) return model;
  logicalSw[a.cruise.lsKey] = { ...existing, def: `${sw},${sw}` };
  return { ...model, logicalSw };
}

export function removeCruise(model: Model, a: BasicAnalysis): Model {
  if (!a.cruise) return model;
  const mixData = model.mixData.filter((_, i) => i !== a.cruise!.globalIdx);
  const logicalSw = { ...(model.logicalSw ?? {}) };
  delete logicalSw[a.cruise.lsKey];
  return { ...model, mixData, logicalSw };
}

export function addCruise(model: Model, a: BasicAnalysis, sw: string, speed: number): Model {
  if (!a.throttle) return model;

  // Find next free LS key.
  const existingLs = model.logicalSw ?? {};
  let lsIdx = 0;
  while (existingLs[String(lsIdx)] !== undefined) lsIdx++;
  const lsKey = String(lsIdx);
  const lsIndex1 = lsIdx + 1;

  const newLs: LogicalSw = {
    func: 'FUNC_STICKY',
    def: `${sw},${sw}`,
    andsw: 'NONE',
    delay: 0,
    duration: 0,
  };
  const logicalSw = { ...existingLs, [lsKey]: newLs };

  const half = Math.round(speed / 2);
  const cruiseLine: MixLine = {
    weight: half,
    destCh: a.throttle.destCh,
    srcRaw: `ls(${lsIndex1})`,
    carryTrim: 0,
    mixWarn: 0,
    mltpx: 'REPL',
    offset: half,
    swtch: 'NONE',
    flightModes: '000000000',
    delayUp: 0,
    delayDown: 0,
    speedUp: 0,
    speedDown: 0,
    name: 'CRUISE',
  };

  // Insert before the THROT line so REPL runs first.
  const mixData = [...model.mixData];
  mixData.splice(a.throttle.globalIdx, 0, cruiseLine);

  return { ...model, mixData, logicalSw };
}

export function removeSTrim(model: Model, a: BasicAnalysis): Model {
  if (!a.strim) return model;
  const mixData = model.mixData.filter((_, i) => i !== a.strim!.globalIdx);
  return { ...model, mixData };
}

export function addSTrim(model: Model, a: BasicAnalysis): Model {
  if (!a.steering) return model;
  // Pick the first pot channel not already used by an expo line.
  const usedChns = new Set((model.expoData ?? []).filter(e => /^P\d/.test(e.srcRaw ?? '')).map(e => e.chn));
  const strimChn = !usedChns.has(2) ? 2 : !usedChns.has(3) ? 3 : null;
  if (strimChn === null) return model;  // Both pots in use — nothing to add
  const strimExpo: ExpoLine = {
    mode: 3, scale: 0, trimSource: 0,
    srcRaw: strimChn === 2 ? 'P1' : 'P2',
    chn: strimChn, swtch: 'NONE', flightModes: '000000000',
    weight: 100, name: '', offset: 0, curve: { type: 1, value: 0 },
  };
  const needsExpo = !usedChns.has(strimChn);
  const trimLine: MixLine = {
    weight: 5,
    destCh: a.steering.destCh,
    srcRaw: `I${strimChn}`,
    carryTrim: 0, mixWarn: 0, mltpx: 'ADD', offset: 0,
    swtch: 'NONE', flightModes: '000000000',
    delayUp: 0, delayDown: 0, speedUp: 0, speedDown: 0,
    name: 'S-TRIM',
  };
  const expoData = needsExpo ? [...(model.expoData ?? []), strimExpo] : (model.expoData ?? []);
  return { ...model, expoData, mixData: [...model.mixData, trimLine] };
}

export function removeGyroGain(model: Model, a: BasicAnalysis): Model {
  if (!a.gyro) return model;
  const mixData = model.mixData.filter((_, i) => i !== a.gyro!.globalIdx);
  return { ...model, mixData };
}

export function setGyroSource(model: Model, a: BasicAnalysis, newSrc: string): Model {
  if (!a.gyro) return model;
  const oldChn = a.gyro.chn; // 2=P1, 3=P2, -1=direct (trim lever)

  // Remove the current gyro mix line.
  let mixData = model.mixData.filter((_, i) => i !== a.gyro!.globalIdx);
  let expoData = [...(model.expoData ?? [])];
  const inputNames = { ...(model.inputNames ?? {}) };

  // Clean up the old expo input channel if nothing else references it.
  if (oldChn >= 0) {
    const srcRef = `I${oldChn}`;
    if (!mixData.some(m => m.srcRaw === srcRef)) {
      expoData = expoData.filter(e => e.chn !== oldChn);
      delete inputNames[String(oldChn)];
    }
  }

  // Add new gyro mix (and expo line if the new source is a pot knob).
  if (newSrc === 'P1' || newSrc === 'P2') {
    const newChn = newSrc === 'P1' ? 2 : 3;
    if (!expoData.some(e => e.chn === newChn)) {
      expoData = [...expoData, blankExpoLine(newSrc, newChn, 100, 0)];
      inputNames[String(newChn)] = { val: 'GYRO' };
    }
    mixData = [...mixData, blankMix('GYRO-GAIN', a.gyro.destCh, `I${newChn}`, 'ADD', 100, 0)];
  } else {
    mixData = [...mixData, blankMix('GYRO-GAIN', a.gyro.destCh, newSrc, 'ADD', 100, 0)];
  }

  return { ...model, mixData, expoData, inputNames };
}

// Returns the physical hardware source name for a mix's srcRaw.
// If srcRaw is an expo input like 'I2', resolves to the expo line's srcRaw (e.g. 'P1').
// Otherwise returns srcRaw directly.
export function physicalSrcFor(srcRaw: string, expoData: ExpoLine[]): string {
  const m = INPUT_RE.exec(srcRaw);
  if (m) {
    const chn = parseInt(m[1]);
    return expoData.find(e => e.chn === chn)?.srcRaw ?? srcRaw;
  }
  return srcRaw;
}

export function setDRateSource(model: Model, a: BasicAnalysis, newSrc: string): Model {
  if (!a.drate || a.drate.switchMode) return model;
  const drateMix = model.mixData[a.drate.globalIdx];
  if (!drateMix) return model;

  const oldChn = a.drate.chn; // -1 for direct, >=0 for expo channel

  let mixData = model.mixData.filter((_, i) => i !== a.drate!.globalIdx);
  let expoData = [...(model.expoData ?? [])];
  const inputNames = { ...(model.inputNames ?? {}) };

  if (oldChn >= 0) {
    const srcRef = `I${oldChn}`;
    if (!mixData.some(m => m.srcRaw === srcRef)) {
      expoData = expoData.filter(e => e.chn !== oldChn);
      delete inputNames[String(oldChn)];
    }
  }

  if (newSrc === 'P1' || newSrc === 'P2') {
    const newChn = newSrc === 'P1' ? 2 : 3;
    if (!expoData.some(e => e.chn === newChn)) {
      expoData = [...expoData, blankExpoLine(newSrc, newChn, 50, 50)];
      inputNames[String(newChn)] = { val: newSrc === 'P1' ? 'STT' : 'TDR' };
    }
    mixData = [...mixData, blankMix('D-RATE', drateMix.destCh, `I${newChn}`, 'MUL', 100, 0)];
  } else {
    mixData = [...mixData, blankMix('D-RATE', drateMix.destCh, newSrc, 'MUL', 50, 50)];
  }

  return { ...model, mixData, expoData, inputNames };
}

export function setSTrimSource(model: Model, a: BasicAnalysis, newSrc: string): Model {
  if (!a.strim) return model;
  const strimMix = model.mixData[a.strim.globalIdx];
  if (!strimMix) return model;

  const oldInputM = INPUT_RE.exec(strimMix.srcRaw);
  const oldChn = oldInputM ? parseInt(oldInputM[1]) : -1;

  let mixData = model.mixData.filter((_, i) => i !== a.strim!.globalIdx);
  let expoData = [...(model.expoData ?? [])];
  const inputNames = { ...(model.inputNames ?? {}) };

  if (oldChn >= 0) {
    const srcRef = `I${oldChn}`;
    if (!mixData.some(m => m.srcRaw === srcRef)) {
      expoData = expoData.filter(e => e.chn !== oldChn);
      delete inputNames[String(oldChn)];
    }
  }

  if (newSrc === 'P1' || newSrc === 'P2') {
    const newChn = newSrc === 'P1' ? 2 : 3;
    if (!expoData.some(e => e.chn === newChn)) {
      expoData = [...expoData, blankExpoLine(newSrc, newChn, 100, 0)];
      inputNames[String(newChn)] = { val: 'STR' };
    }
    mixData = [...mixData, blankMix('S-TRIM', a.strim.destCh, `I${newChn}`, 'ADD', a.strim.weight, 0)];
  } else {
    mixData = [...mixData, blankMix('S-TRIM', a.strim.destCh, newSrc, 'ADD', a.strim.weight, 0)];
  }

  return { ...model, mixData, expoData, inputNames };
}

// ── Wizard generation ─────────────────────────────────────────────────────────

export interface WizardParams {
  throttleDestCh: number;
  throttleWeight: number;
  wantCruise: boolean;
  cruiseSw: string;
  cruiseSpeed: number;
  // Speed limiter
  dRateMode: 'none' | 'pot' | 'switch';
  dRatePot: string;        // 'P1' or 'P2' — for pot mode
  dRateSwitch: string;     // switch position e.g. 'SC0' — for switch mode
  dRatePercent: number;    // 0–100 — max throttle when switch is active (switch mode)
  wantSteering: boolean;
  steeringDestCh: number;
  steeringWeight: number;
  strimSrc: string;     // physical input for steering trim, e.g. 'P1', 'T2', 'T5'
  strimWeight: number;  // trim authority % (additive weight on steering channel)
  // Gyro gain
  wantGyroGain: boolean;
  gyroGainDestCh: number;
  gyroGainPot: string;     // 'P1' or 'P2'
  wantKidControl: boolean;
  moduleProtocol: number;
  moduleFailsafe: string;
  scale: string;
  modelName: string;
  vehicleType: string;
  power: 'battery' | 'fuel' | '';
}

// Convert an existing analysis back into wizard params so the wizard can be pre-populated.
export function analysisToWizardParams(analysis: BasicAnalysis, model?: Model): WizardParams {
  const d = defaultWizardParams();
  const mod = model?.moduleData?.['0'];
  const subTypeParts = typeof mod?.subType === 'string' ? mod.subType.split(',') : [];
  const currentProtocol = subTypeParts.length ? parseInt(subTypeParts[0], 10) : d.moduleProtocol;
  return {
    throttleDestCh:  analysis.throttle?.destCh   ?? d.throttleDestCh,
    throttleWeight:  analysis.throttle?.weight    ?? d.throttleWeight,
    wantCruise:      !!analysis.cruise,
    cruiseSw:        analysis.cruise?.setSw       ?? d.cruiseSw,
    cruiseSpeed:     analysis.cruise?.cruiseSpeed ?? d.cruiseSpeed,
    dRateMode:       analysis.drate
      ? (analysis.drate.switchMode ? 'switch' : 'pot')
      : 'none',
    dRatePot:        (() => {
      if (!analysis.drate || analysis.drate.switchMode || !model) return d.dRatePot;
      if (/^T\d$/.test(analysis.drate.srcRaw)) return analysis.drate.srcRaw;
      const expo = (model.expoData ?? []).find(e => e.chn === analysis.drate!.chn);
      return expo?.srcRaw ?? d.dRatePot;
    })(),
    dRateSwitch:     analysis.drate?.switchMode?.swtch ?? d.dRateSwitch,
    dRatePercent:    analysis.drate?.switchMode?.percent ?? d.dRatePercent,
    wantSteering:    !!analysis.steering,
    steeringDestCh:  analysis.steering?.destCh   ?? d.steeringDestCh,
    steeringWeight:  analysis.steering?.weight    ?? d.steeringWeight,
    strimSrc: (() => {
      if (!analysis.strim || !model) return d.strimSrc;
      const strimMix = model.mixData[analysis.strim.globalIdx];
      if (!strimMix) return d.strimSrc;
      const inputM = INPUT_RE.exec(strimMix.srcRaw);
      if (inputM) {
        const chn = parseInt(inputM[1]);
        const expo = (model.expoData ?? []).find(e => e.chn === chn);
        return expo?.srcRaw ?? d.strimSrc;
      }
      return strimMix.srcRaw ?? d.strimSrc;
    })(),
    strimWeight: analysis.strim?.weight ?? d.strimWeight,
    wantGyroGain:    !!analysis.gyro,
    gyroGainDestCh:  analysis.gyro?.destCh ?? d.gyroGainDestCh,
    gyroGainPot: (() => {
      if (!analysis.gyro || !model) return d.gyroGainPot;
      if (/^T\d$/.test(analysis.gyro.srcRaw)) return analysis.gyro.srcRaw;
      const expo = (model.expoData ?? []).find(e => e.chn === analysis.gyro!.chn);
      return expo?.srcRaw ?? d.gyroGainPot;
    })(),
    wantKidControl:  false,
    moduleProtocol:  isNaN(currentProtocol) ? d.moduleProtocol : currentProtocol,
    moduleFailsafe:  mod?.failsafeMode ?? d.moduleFailsafe,
    scale:           '',
    modelName:       model?.header?.name ?? '',
    vehicleType:     '',
    power:           '',
  };
}

export function defaultWizardParams(): WizardParams {
  return {
    throttleDestCh: 1,   // CH2
    throttleWeight: 100,
    wantCruise: false,
    cruiseSw: 'SC2',
    cruiseSpeed: 70,
    dRateMode: 'none',
    dRatePot: 'P2',
    dRateSwitch: 'SC0',
    dRatePercent: 50,
    wantSteering: true,
    steeringDestCh: 0,   // CH1
    steeringWeight: 100,
    strimSrc: '',
    strimWeight: 100,
    wantGyroGain: false,
    gyroGainDestCh: 2,   // CH3
    gyroGainPot: '',
    wantKidControl: false,
    moduleProtocol: 43,
    moduleFailsafe: 'no pulses',
    scale: '',
    modelName: '',
    vehicleType: '',
    power: '',
  };
}

function blankExpoLine(srcRaw: string, chn: number, weight: number, offset: number): ExpoLine {
  return {
    mode: 3,
    scale: 0,
    trimSource: 0,
    srcRaw,
    chn,
    swtch: 'NONE',
    flightModes: '000000000',
    weight,
    name: '',
    offset,
    curve: { type: 1, value: 0 },
  };
}

function blankMix(name: string, destCh: number, srcRaw: string, mltpx: string, weight: number, offset: number, swtch = 'NONE'): MixLine {
  return {
    weight,
    destCh,
    srcRaw,
    carryTrim: 0,
    mixWarn: 0,
    mltpx,
    offset,
    swtch,
    flightModes: '000000000',
    delayUp: 0,
    delayDown: 0,
    speedUp: 0,
    speedDown: 0,
    name,
  };
}

export interface GeneratedConfig {
  mixData: MixLine[];
  expoData: ExpoLine[];
  logicalSw: Record<string, LogicalSw>;
  inputNames: Record<string, InputName>;
  moduleData: Record<string, ModuleData>;
}

export function generateBasicModel(p: WizardParams): GeneratedConfig {
  const mixData: MixLine[] = [];
  const expoData: ExpoLine[] = [];
  const logicalSw: Record<string, LogicalSw> = {};
  const inputNames: Record<string, InputName> = {};
  const moduleData: Record<string, ModuleData> = {
    '0': {
      type: 'TYPE_MULTIMODULE',
      subType: `${p.moduleProtocol},0`,
      channelsStart: 0,
      channelsCount: 16,
      failsafeMode: p.moduleFailsafe,
      mod: {
        multi: {
          disableTelemetry: 0,
          disableMapping: 0,
          autoBindMode: 0,
          lowPowerMode: 0,
          receiverTelemetryOff: 0,
          receiverHigherChannels: 0,
          optionValue: 0,
        },
      },
    },
  };

  // Expo for TH (chn 0) and ST (chn 1) — always created.
  expoData.push(blankExpoLine('TH', 0, 100, 0));
  expoData.push(blankExpoLine('ST', 1, 100, 0));
  inputNames['0'] = { val: 'TH' };
  inputNames['1'] = { val: 'ST' };

  // Throttle channel.
  if (p.wantCruise) {
    const half = Math.round(p.cruiseSpeed / 2);
    logicalSw['0'] = {
      func: 'FUNC_STICKY',
      def: `${p.cruiseSw},${p.cruiseSw}`,
      andsw: 'NONE',
      delay: 0,
      duration: 0,
    };
    // CRUISE must be first (REPL sets the base, THROT adds on top).
    mixData.push(blankMix('CRUISE', p.throttleDestCh, 'ls(1)', 'REPL', half, half));
  }

  mixData.push(blankMix('THROT', p.throttleDestCh, 'TH', 'ADD', p.throttleWeight, 0));

  if (p.dRateMode === 'pot' && p.dRatePot) {
    if (p.dRatePot === 'P1' || p.dRatePot === 'P2') {
      const chn = p.dRatePot === 'P1' ? 2 : 3;
      if (!inputNames[String(chn)]) {
        expoData.push(blankExpoLine(p.dRatePot, chn, 50, 50));
        inputNames[String(chn)] = { val: p.dRatePot === 'P1' ? 'STT' : 'TDR' };
      }
      mixData.push(blankMix('D-RATE', p.throttleDestCh, `I${chn}`, 'MUL', 100, 0));
    } else {
      // Trim lever direct source — weight=50, offset=50 maps -100..+100 → 0..100%
      mixData.push(blankMix('D-RATE', p.throttleDestCh, p.dRatePot, 'MUL', 50, 50));
    }
  } else if (p.dRateMode === 'switch') {
    // Fixed limit: MUL by MAX at dRatePercent weight, gated by the chosen switch.
    // When switch is active: channel × (100 × dRatePercent/100) = channel × dRatePercent%.
    mixData.push(blankMix('D-RATE', p.throttleDestCh, 'MAX', 'MUL', p.dRatePercent, 0, p.dRateSwitch));
  }

  // Steering channel.
  if (p.wantSteering) {
    // Expo for ST already created at chn 1.
    mixData.push(blankMix('STEER', p.steeringDestCh, 'I1', 'ADD', p.steeringWeight, 0));

    // Steering trim — added when user chose a source.
    if (p.strimSrc === 'P1' || p.strimSrc === 'P2') {
      const strimChn = p.strimSrc === 'P1' ? 2 : 3;
      if (!inputNames[String(strimChn)]) {
        expoData.push(blankExpoLine(p.strimSrc, strimChn, 100, 0));
        inputNames[String(strimChn)] = { val: 'STR' };
      }
      mixData.push(blankMix('S-TRIM', p.steeringDestCh, `I${strimChn}`, 'ADD', p.strimWeight, 0));
    } else if (p.strimSrc) {
      // Trim lever (T1–T5) — used directly as srcRaw, no expo line needed.
      mixData.push(blankMix('S-TRIM', p.steeringDestCh, p.strimSrc, 'ADD', p.strimWeight, 0));
    }
  }

  // Gyro gain channel.
  if (p.wantGyroGain && p.gyroGainPot) {
    if (p.gyroGainPot === 'P1' || p.gyroGainPot === 'P2') {
      const gyroChn = p.gyroGainPot === 'P1' ? 2 : 3;
      if (!inputNames[String(gyroChn)]) {
        expoData.push(blankExpoLine(p.gyroGainPot, gyroChn, 100, 0));
        inputNames[String(gyroChn)] = { val: 'GYRO' };
      }
      mixData.push(blankMix('GYRO-GAIN', p.gyroGainDestCh, `I${gyroChn}`, 'ADD', 100, 0));
    } else {
      // Trim lever direct source
      mixData.push(blankMix('GYRO-GAIN', p.gyroGainDestCh, p.gyroGainPot, 'ADD', 100, 0));
    }
  }

  return { mixData, expoData, logicalSw, inputNames, moduleData };
}
