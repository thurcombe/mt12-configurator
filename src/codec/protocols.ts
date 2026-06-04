// Multi-protocol module (MULTI) RF protocol definitions.
// Protocol IDs and sub-type names match the DIY-Multiprotocol-TX-Module firmware
// (https://github.com/pascallanger/DIY-Multiprotocol-TX-Module) which EdgeTX uses
// internally and serialises as the numeric value in subType (e.g. "43,0").

export interface SubTypeInfo {
  id: number;
  name: string;
}

export interface ProtocolInfo {
  id: number;
  name: string;         // label shown in EdgeTX and in this UI
  subtypes: SubTypeInfo[];
  note?: string;        // optional pairing/binding hint
}

// Surface-relevant protocols from the MULTI firmware protocol enum.
// Ordered by how common they are in surface RC.
export const MULTI_PROTOCOLS: ProtocolInfo[] = [
  {
    id: 43,
    name: 'Traxxas TQi',
    subtypes: [],
    note: 'Radiomaster MT12 built-in multimodule. Pairs with Traxxas TQi (2.4 GHz) receivers.',
  },
  {
    id: 73,
    name: 'Traxxas TQ Gen2',
    subtypes: [],
    note: 'Older Traxxas TQ (not TQi) receivers.',
  },
  {
    id: 28,
    name: 'FlySky AFHDS2A',
    subtypes: [
      { id: 0, name: 'PWM + IBUS' },
      { id: 1, name: 'PPM + IBUS' },
      { id: 2, name: 'PWM + SBUS' },
      { id: 3, name: 'PPM + SBUS' },
      { id: 4, name: 'PWM + IBUS 16ch' },
      { id: 5, name: 'PPM + IBUS 16ch' },
    ],
    note: 'FlySky AFHDS2A receivers (e.g. FS-BS3, FS-A3). Also used by Absima, Reely, Carson branded cars.',
  },
  {
    id: 1,
    name: 'FlySky (AFHDS)',
    subtypes: [
      { id: 0, name: 'Standard' },
      { id: 1, name: 'V9x9' },
      { id: 2, name: 'V6x6' },
      { id: 3, name: 'V912' },
      { id: 4, name: 'CX20' },
    ],
    note: 'Older FlySky AFHDS receivers. Most modern FlySky cars use AFHDS2A (protocol 28) instead.',
  },
  {
    id: 6,
    name: 'DSM / Spektrum',
    subtypes: [
      { id: 0, name: 'DSM2 22ms (1F)' },
      { id: 1, name: 'DSM2 11ms (2F)' },
      { id: 2, name: 'DSMX 22ms (1F)' },
      { id: 3, name: 'DSMX 11ms (2F)' },
      { id: 4, name: 'Auto (detect)' },
      { id: 5, name: 'DSMR' },
    ],
    note: 'Spektrum / Losi / ECX / Team Associated cars. DSM2 or DSMX depends on your receiver.',
  },
  // Kept for files that were saved with legacy IDs 4/5 before MULTI ID 6 was known.
  { id: 4,  name: 'DSM2 (legacy)',  subtypes: [] },
  { id: 5,  name: 'DSMX (legacy)',  subtypes: [] },
  {
    id: 3,
    name: 'FrSky D8',
    subtypes: [
      { id: 0, name: 'Standard (8ch)' },
      { id: 1, name: 'No telemetry' },
    ],
  },
  {
    id: 15,
    name: 'FrSky X (D16)',
    subtypes: [
      { id: 0, name: 'D16' },
      { id: 1, name: 'D16 8ch' },
      { id: 2, name: 'D16 EU-LBT' },
      { id: 3, name: 'D16 EU-LBT 8ch' },
      { id: 4, name: 'Clone' },
      { id: 5, name: 'Clone 8ch' },
    ],
  },
  {
    id: 21,
    name: 'Futaba SFHSS',
    subtypes: [
      { id: 0, name: 'Standard' },
    ],
    note: 'Used in Futaba 4GRS/4PLS/4PKS surface transmitters.',
  },
];

// Backwards-compatible alias used by existing code.
/** @deprecated Use MULTI_PROTOCOLS */
export const SURFACE_PROTOCOLS = MULTI_PROTOCOLS;

export function protocolName(id: number): string {
  return MULTI_PROTOCOLS.find((p) => p.id === id)?.name ?? `Protocol ${id}`;
}

export function protocolById(id: number): ProtocolInfo | undefined {
  return MULTI_PROTOCOLS.find((p) => p.id === id);
}

// Parse "43,0" or 0 into { protocol, option }.
export function parseSubType(raw: string | number): { protocol: number; option: number } {
  if (typeof raw === 'number') return { protocol: raw, option: 0 };
  const parts = raw.split(',');
  return {
    protocol: parseInt(parts[0], 10),
    option: parts.length > 1 ? parseInt(parts[1], 10) : 0,
  };
}

// Serialise back to the YAML form. For multimodule use "N,M"; for simple use N.
export function formatSubType(protocol: number, option: number, useComma: boolean): string | number {
  if (useComma) return `${protocol},${option}`;
  return protocol;
}
