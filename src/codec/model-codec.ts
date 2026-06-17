import { loadYaml, dumpYaml } from './yaml-io.ts';
import type { Model, MixLine, ExpoLine } from '../types/model.ts';

// Ensure flightModes is always stored as a 9-char string of 0s and 1s.
// After pre-processing in yaml-io, js-yaml delivers it as a string.
// If constructing a MixLine/ExpoLine programmatically it might be a number.
function normaliseFlightModes(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') {
    // Should not happen from file parse (pre-processing handles it),
    // but cover programmatic construction.
    return val.toString(10).padStart(9, '0');
  }
  return '000000000';
}

export function parseModel(yamlText: string): Model {
  const raw = loadYaml(yamlText) as Record<string, unknown>;

  if (Array.isArray(raw.mixData)) {
    raw.mixData = (raw.mixData as MixLine[]).map((line) => ({
      ...line,
      flightModes: normaliseFlightModes(line.flightModes),
    }));
  }

  if (Array.isArray(raw.expoData)) {
    raw.expoData = (raw.expoData as ExpoLine[]).map((line) => ({
      ...line,
      flightModes: normaliseFlightModes(line.flightModes),
    }));
  }

  return raw as unknown as Model;
}

export function serialiseModel(model: Model): string {
  // Ensure flightModes values are strings before dumping (yaml-io postProcess
  // then strips the quotes js-yaml adds to digit-only strings).
  const out = {
    ...model,
    mixData: (model.mixData ?? []).map((line) => ({
      ...line,
      flightModes: normaliseFlightModes(line.flightModes),
    })),
    expoData: (model.expoData ?? []).map((line) => ({
      ...line,
      flightModes: normaliseFlightModes(line.flightModes),
    })),
  };
  return dumpYaml(out);
}
