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
  srcRaw: string;  // e.g. "I3"
  chn: number;     // expo input channel index
  range: [number, number]; // computed [min, max] from expo weight+offset
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

export interface BasicAnalysis {
  kind: 'recognised' | 'empty' | 'unrecognised';
  throttle: ThrottlePattern | null;
  cruise: CruisePattern | null;
  drate: DRatePattern | null;
  steering: SteeringPattern | null;
  strim: STrimPattern | null;
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

function expoRange(chn: number, model: Model): [number, number] {
  const expo = (model.expoData ?? []).find(e => e.chn === chn);
  if (!expo) return [-100, 100];
  const lo = Math.round((-100 * expo.weight / 100) + expo.offset);
  const hi = Math.round(( 100 * expo.weight / 100) + expo.offset);
  return [Math.min(lo, hi), Math.max(lo, hi)];
}

export function analyseBasicPatterns(model: Model): BasicAnalysis {
  const empty: BasicAnalysis = {
    kind: 'empty', throttle: null, cruise: null, drate: null, steering: null, strim: null,
  };

  const mixData = model.mixData ?? [];
  if (mixData.length === 0) return empty;

  let throttle: ThrottlePattern | null = null;
  let cruise: CruisePattern | null = null;
  let drate: DRatePattern | null = null;
  let steering: SteeringPattern | null = null;
  let strim: STrimPattern | null = null;
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
      const inputM = INPUT_RE.exec(line.srcRaw);
      if (inputM) {
        const chn = parseInt(inputM[1]);
        drate = { globalIdx: i, srcRaw: line.srcRaw, chn, range: expoRange(chn, model) };
      } else {
        hasUnknown = true;
      }
    } else if (STEER_NAMES.has(name) && !steering) {
      steering = { globalIdx: i, destCh: line.destCh, weight: line.weight };
    } else if (TRIM_NAMES.has(name) && !strim) {
      strim = { globalIdx: i, destCh: line.destCh, weight: line.weight };
    } else {
      hasUnknown = true;
    }
  }

  if (hasUnknown) {
    return { kind: 'unrecognised', throttle, cruise, drate, steering, strim };
  }
  if (!throttle && !steering) {
    return empty;
  }
  return { kind: 'recognised', throttle, cruise, drate, steering, strim };
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
  const trimLine: MixLine = {
    weight: 5,
    destCh: a.steering.destCh,
    srcRaw: 'I2',
    carryTrim: 0,
    mixWarn: 0,
    mltpx: 'ADD',
    offset: 0,
    swtch: 'NONE',
    flightModes: '000000000',
    delayUp: 0,
    delayDown: 0,
    speedUp: 0,
    speedDown: 0,
    name: 'S-TRIM',
  };
  const mixData = [...model.mixData, trimLine];
  return { ...model, mixData };
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
  wantSTrim: boolean;
  wantKidControl: boolean;
  moduleProtocol: number;
  moduleFailsafe: string;
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
    dRateMode:       analysis.drate ? 'pot' : 'none',
    dRatePot:        (() => {
      if (!analysis.drate || !model) return d.dRatePot;
      const expo = (model.expoData ?? []).find(e => e.chn === analysis.drate!.chn);
      return expo?.srcRaw === 'P1' ? 'P1' : 'P2';
    })(),
    dRateSwitch:     d.dRateSwitch,
    dRatePercent:    d.dRatePercent,
    wantSteering:    !!analysis.steering,
    steeringDestCh:  analysis.steering?.destCh   ?? d.steeringDestCh,
    steeringWeight:  analysis.steering?.weight    ?? d.steeringWeight,
    wantSTrim:       !!analysis.strim,
    wantKidControl:  false,
    moduleProtocol:  isNaN(currentProtocol) ? d.moduleProtocol : currentProtocol,
    moduleFailsafe:  mod?.failsafeMode ?? d.moduleFailsafe,
  };
}

export function defaultWizardParams(): WizardParams {
  return {
    throttleDestCh: 2,
    throttleWeight: 100,
    wantCruise: false,
    cruiseSw: 'SC2',
    cruiseSpeed: 70,
    dRateMode: 'none',
    dRatePot: 'P2',
    dRateSwitch: 'SC0',
    dRatePercent: 50,
    wantSteering: true,
    steeringDestCh: 3,
    steeringWeight: 100,
    wantSTrim: false,
    wantKidControl: false,
    moduleProtocol: 43,
    moduleFailsafe: 'no pulses',
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

  if (p.dRateMode === 'pot') {
    // Knob maps 0–100%: weight=50, offset=50 maps -100..+100 → 0..100%.
    if (p.dRatePot === 'P1') {
      expoData.push(blankExpoLine('P1', 2, 50, 50));
      inputNames['2'] = { val: 'STT' };
      mixData.push(blankMix('D-RATE', p.throttleDestCh, 'I2', 'MUL', 100, 0));
    } else {
      expoData.push(blankExpoLine('P2', 3, 50, 50));
      inputNames['2'] = { val: 'STT' };
      inputNames['3'] = { val: 'TDR' };
      mixData.push(blankMix('D-RATE', p.throttleDestCh, 'I3', 'MUL', 100, 0));
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

    if (p.wantSTrim) {
      if (!inputNames['2']) {
        expoData.push(blankExpoLine('P1', 2, 100, 0));
        inputNames['2'] = { val: 'STT' };
      }
      mixData.push(blankMix('S-TRIM', p.steeringDestCh, 'I2', 'ADD', 5, 0));
    }
  }

  return { mixData, expoData, logicalSw, inputNames, moduleData };
}
