import type { Model, ExpoLine, MixLine, FlightModeData } from '../../types/model.ts';
import type { KidModeParams } from './kidDefaults.ts';

// flightModes string: 9 chars, '0' = active, '1' = excluded.
// "100000000" = excluded from FM0, active in FM1+.
const FM0_EXCLUDED = '100000000';

export function isKidModeActive(model: Model): boolean {
  return '1' in (model.flightModeData ?? {});
}

export function applyKidMode(model: Model, params: KidModeParams, triggerSwitch: string): Model {
  const fm0 = model.flightModeData?.['0'];

  // Build FM1 trims: inherit all trim channels from FM0 (mode=1 = use FM0)
  const fm0Trims = fm0?.trim ?? {};
  const fm1Trims: FlightModeData['trim'] = {};
  for (const key of Object.keys(fm0Trims)) {
    fm1Trims[key] = { value: 0, mode: 1 };
  }

  // Build FM1 gvars: zero out (inherit semantics are per-GVar in EdgeTX)
  const fm0Gvars = fm0?.gvars ?? {};
  const fm1Gvars: FlightModeData['gvars'] = {};
  for (const key of Object.keys(fm0Gvars)) {
    fm1Gvars[key] = { val: 0 };
  }

  const fm1: FlightModeData = {
    name: 'Kid',
    swtch: triggerSwitch,
    fadeIn: 2,
    fadeOut: 2,
    trim: fm1Trims,
    gvars: fm1Gvars,
  };

  // Find throttle destCh from existing TH mix lines (0-based)
  const thrDestCh = model.mixData.find((l) => l.srcRaw === 'TH')?.destCh ?? 2;

  // Find steering destCh from existing ST mix lines (0-based)
  const strDestCh = model.mixData.find((l) => l.srcRaw === 'ST')?.destCh ?? 3;

  // Find TH expo line chn (physical input channel index)
  const thrExpoChn = model.expoData.find((l) => l.srcRaw === 'TH')?.chn ?? 0;
  // Find ST expo line chn
  const strExpoChn = model.expoData.find((l) => l.srcRaw === 'ST')?.chn ?? 1;

  const kidThrExpo: ExpoLine = {
    mode: 3,
    scale: 0,
    trimSource: 0,
    srcRaw: 'TH',
    chn: thrExpoChn,
    swtch: 'NONE',
    flightModes: FM0_EXCLUDED,
    weight: params.thrRate,
    name: 'KID-TH',
    offset: 0,
    curve: { type: 1, value: params.thrExpo },
  };

  const kidStrExpo: ExpoLine = {
    mode: 3,
    scale: 0,
    trimSource: 0,
    srcRaw: 'ST',
    chn: strExpoChn,
    swtch: 'NONE',
    flightModes: FM0_EXCLUDED,
    weight: params.strRate,
    name: 'KID-ST',
    offset: 0,
    curve: { type: 1, value: params.strExpo },
  };

  // Throttle speed-limit mix: REPL in FM1, overrides the full CH stack with
  // a speed-limited pass-through of TH (already rate-limited by KID-TH expo).
  const kidSpMix: MixLine = {
    weight: 100,
    destCh: thrDestCh,
    srcRaw: 'TH',
    carryTrim: 0,
    mixWarn: 0,
    mltpx: 'REPL',
    offset: 0,
    swtch: 'NONE',
    flightModes: FM0_EXCLUDED,
    delayUp: 0,
    delayDown: 0,
    speedUp: params.speedUp,
    speedDown: params.speedDown,
    name: 'KID-SP',
  };

  // Also add a steering speed-limit mix on the steering channel
  const kidStMix: MixLine = {
    weight: 100,
    destCh: strDestCh,
    srcRaw: 'ST',
    carryTrim: 0,
    mixWarn: 0,
    mltpx: 'REPL',
    offset: 0,
    swtch: 'NONE',
    flightModes: FM0_EXCLUDED,
    delayUp: 0,
    delayDown: 0,
    speedUp: 0,
    speedDown: 0,
    name: 'KID-ST',
  };

  return {
    ...model,
    flightModeData: {
      ...model.flightModeData,
      '1': fm1,
    },
    expoData: [...model.expoData, kidThrExpo, kidStrExpo],
    mixData: [...model.mixData, kidSpMix, kidStMix],
  };
}

export function removeKidMode(model: Model): Model {
  const fmData = { ...model.flightModeData };
  delete fmData['1'];

  return {
    ...model,
    flightModeData: fmData,
    expoData: model.expoData.filter((l) => !l.name.startsWith('KID-')),
    mixData: model.mixData.filter((l) => !l.name.startsWith('KID-')),
  };
}
