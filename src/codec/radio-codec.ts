import { loadYaml, dumpYaml } from './yaml-io.ts';
import type { Radio } from '../types/radio.ts';

export function parseRadio(yamlText: string): Radio {
  const raw = loadYaml(yamlText) as Record<string, unknown>;
  // Strip checksum — it's a hardware CRC we cannot compute and EdgeTX
  // ignores it when manuallyEdited is set.
  delete raw['checksum'];
  return raw as unknown as Radio;
}

export function serialiseRadio(radio: Radio): string {
  const out = {
    ...radio,
    manuallyEdited: 1,
  };
  // Ensure checksum is never emitted.
  delete (out as Record<string, unknown>)['checksum'];
  return dumpYaml(out);
}
