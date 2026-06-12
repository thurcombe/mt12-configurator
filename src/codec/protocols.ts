// Multi-protocol module (MULTI) RF protocol definitions.
// Protocol IDs and sub-type names match the DIY-Multiprotocol-TX-Module firmware
// (https://github.com/pascallanger/DIY-Multiprotocol-TX-Module) which EdgeTX uses
// internally and serialises as the numeric value in subType (e.g. "43,0").
//
// Excluded: receiver-mode protocols (FRSKY_RX, AFHDS2A_RX, BAYANG_RX, DSM_RX),
// debug tools (SCANNER, XN297DUMP), module housekeeping (CONFIG, PROTOLIST),
// and protocols requiring external hardware not on MT12 (OPENLRS, WILLIFM).
// FrSky R9 (65) requires an external SX1276 module, not the internal 4-in-1.

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

// Complete protocol list from Multiprotocol/Multiprotocol.h, sorted alphabetically.
export const MULTI_PROTOCOLS: ProtocolInfo[] = [
  { id: 24, name: 'ASSAN', subtypes: [] },
  { id: 14, name: 'Bayang', subtypes: [{ id: 0, name: 'Standard' }, { id: 1, name: 'X5C1' }, { id: 2, name: 'X5C1 clone' }, { id: 3, name: 'H8S3D' }, { id: 4, name: 'X16 AH' }, { id: 5, name: 'IRDRONE' }, { id: 6, name: 'DHD D4' }, { id: 7, name: 'Yizhan i6S' }] },
  { id: 95, name: 'BlueFly', subtypes: [] },
  { id: 96, name: 'BumbleBee', subtypes: [] },
  { id: 34, name: 'Cabell', subtypes: [], note: 'Open source telemetry protocol.' },
  { id: 13, name: 'CG023', subtypes: [{ id: 0, name: 'CG023' }, { id: 1, name: 'YD829' }] },
  { id: 37, name: 'Corona', subtypes: [{ id: 0, name: 'V1' }, { id: 1, name: 'V2' }, { id: 2, name: 'FW' }] },
  { id: 38, name: 'Crazyflie', subtypes: [] },
  { id: 12, name: 'CX10', subtypes: [{ id: 0, name: 'Green' }, { id: 1, name: 'Blue' }, { id: 2, name: 'DM007' }, { id: 4, name: 'JC3015-1' }, { id: 5, name: 'JC3015-2' }, { id: 6, name: 'MK33041' }] },
  { id: 33, name: 'DM002', subtypes: [] },
  {
    id: 6, name: 'DSM / Spektrum',
    subtypes: [
      { id: 0, name: 'DSM2 22ms (1F)' },
      { id: 1, name: 'DSM2 11ms (2F)' },
      { id: 2, name: 'DSMX 22ms (1F)' },
      { id: 3, name: 'DSMX 11ms (2F)' },
      { id: 4, name: 'Auto (detect)' },
      { id: 5, name: 'DSMR' },
    ],
    note: 'Spektrum / Losi / ECX / Team Associated / ARRMA.',
  },
  {
    id: 7, name: 'Walkera DEVO',
    subtypes: [
      { id: 0, name: '8ch' },
      { id: 1, name: '10ch' },
      { id: 2, name: '12ch' },
      { id: 3, name: '6ch' },
      { id: 4, name: '7ch' },
    ],
  },
  { id: 61, name: 'EazyRC', subtypes: [], note: 'EazyRC surface vehicles.' },
  { id: 16, name: 'E-Sky', subtypes: [] },
  { id: 35, name: 'E-Sky 150', subtypes: [] },
  { id: 69, name: 'E-Sky 150 V2', subtypes: [] },
  { id: 81, name: 'E010 R5', subtypes: [] },
  { id: 45, name: 'E01X', subtypes: [{ id: 0, name: 'E012' }, { id: 1, name: 'E015' }, { id: 2, name: 'E016H' }] },
  { id: 85, name: 'E016H', subtypes: [] },
  { id: 80, name: 'E016H V2', subtypes: [] },
  { id: 83, name: 'E129', subtypes: [{ id: 0, name: 'E129' }, { id: 1, name: 'C186' }] },
  {
    id: 1, name: 'FlySky AFHDS',
    subtypes: [
      { id: 0, name: 'Standard' },
      { id: 1, name: 'V9x9' },
      { id: 2, name: 'V6x6' },
      { id: 3, name: 'V912' },
      { id: 4, name: 'CX20' },
    ],
    note: 'Older FlySky AFHDS receivers. Most modern FlySky receivers use AFHDS2A.',
  },
  {
    id: 28, name: 'FlySky AFHDS2A',
    subtypes: [
      { id: 0, name: 'PWM + IBUS' },
      { id: 1, name: 'PPM + IBUS' },
      { id: 2, name: 'PWM + SBUS' },
      { id: 3, name: 'PPM + SBUS' },
      { id: 4, name: 'PWM + IBUS 16ch' },
      { id: 5, name: 'PPM + IBUS 16ch' },
    ],
    note: 'FlySky AFHDS2A receivers (FS-BS3, FS-A3). Also used by Absima, Reely, Carson.',
  },
  { id: 23, name: 'FQ777', subtypes: [{ id: 0, name: 'FQ777' }, { id: 1, name: 'H99' }] },
  { id: 3, name: 'FrSky D8', subtypes: [{ id: 0, name: 'Standard (8ch)' }, { id: 1, name: 'No telemetry' }] },
  { id: 67, name: 'FrSky L', subtypes: [] },
  {
    id: 65, name: 'FrSky R9',
    subtypes: [
      { id: 0, name: 'R9' },
      { id: 1, name: 'R9 8ch' },
      { id: 2, name: 'R9 EU' },
      { id: 3, name: 'R9 EU 8ch' },
    ],
    note: 'Requires external R9M module (SX1276) — not on internal 4-in-1.',
  },
  { id: 25, name: 'FrSky V1', subtypes: [], note: 'Legacy FrSky V1 (pre-D8) protocol.' },
  {
    id: 15, name: 'FrSky X (D16)',
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
    id: 64, name: 'FrSky X2',
    subtypes: [
      { id: 0, name: 'D16' },
      { id: 1, name: 'D16 8ch' },
      { id: 2, name: 'D16 EU-LBT' },
      { id: 3, name: 'D16 EU-LBT 8ch' },
    ],
  },
  { id: 21, name: 'Futaba SFHSS', subtypes: [{ id: 0, name: 'Standard' }], note: 'Futaba SFHSS receivers (4GRS, 4PLS, 4PKS etc).' },
  { id: 58, name: 'FX', subtypes: [{ id: 0, name: 'FX816' }, { id: 1, name: 'FX620' }] },
  { id: 20, name: 'FY326', subtypes: [] },
  { id: 47, name: 'GD00X', subtypes: [{ id: 0, name: 'GD000' }, { id: 1, name: 'GD001' }, { id: 2, name: 'GD002' }] },
  { id: 57, name: 'Graupner Hott', subtypes: [{ id: 0, name: 'Standard' }], note: 'Graupner/SJ Hott receivers.' },
  { id: 32, name: 'GW008', subtypes: [] },
  { id: 103, name: 'H36', subtypes: [] },
  { id: 36, name: 'H8 3D', subtypes: [{ id: 0, name: 'H8 Mini' }, { id: 1, name: 'H20' }, { id: 2, name: 'H20H' }, { id: 3, name: 'H20 Nest' }, { id: 4, name: 'H30C' }] },
  { id: 53, name: 'Height', subtypes: [] },
  { id: 4, name: 'HiSky', subtypes: [{ id: 0, name: 'HiSky' }, { id: 1, name: 'RF9X' }] },
  { id: 39, name: 'Hitec', subtypes: [{ id: 0, name: 'Optima' }, { id: 1, name: 'Minima' }], note: 'Hitec Optima and Minima receivers.' },
  { id: 26, name: 'Hontai', subtypes: [{ id: 0, name: 'Standard' }, { id: 1, name: 'JJRC X1' }, { id: 2, name: 'X5C1 clone' }] },
  { id: 2, name: 'Hubsan', subtypes: [{ id: 0, name: 'H107' }, { id: 1, name: 'H301' }, { id: 2, name: 'H501' }] },
  { id: 102, name: 'Jiabaile', subtypes: [], note: '1:43 scale surface cars.' },
  { id: 71, name: 'JJRC345', subtypes: [] },
  { id: 84, name: 'Joysway', subtypes: [], note: 'Joysway boats and surface vehicles.' },
  { id: 104, name: 'Kamtom', subtypes: [], note: 'Kamtom/SG racing cars.' },
  { id: 49, name: 'KF606', subtypes: [] },
  { id: 9, name: 'KN', subtypes: [{ id: 0, name: 'WLtoys' }, { id: 1, name: 'FeiLun' }] },
  { id: 73, name: 'Kyosho', subtypes: [{ id: 0, name: 'FHSS' }, { id: 1, name: 'Hype' }], note: 'Kyosho Mini-Z and surface receivers.' },
  { id: 93, name: 'Kyosho 2', subtypes: [] },
  { id: 98, name: 'Kyosho 3', subtypes: [] },
  { id: 82, name: 'LOLI', subtypes: [] },
  { id: 89, name: 'Losi', subtypes: [], note: 'Losi surface vehicles (some models use DSM instead).' },
  { id: 18, name: 'MJXQ', subtypes: [{ id: 0, name: 'E010' }, { id: 1, name: 'E010 Night' }, { id: 2, name: 'E012' }, { id: 3, name: 'E015' }, { id: 4, name: 'E016' }, { id: 5, name: 'WLH08' }, { id: 6, name: 'X600' }, { id: 7, name: 'X800' }, { id: 8, name: 'H26D' }, { id: 9, name: 'E010S' }, { id: 10, name: 'H26WH' }, { id: 11, name: 'X400' }, { id: 12, name: 'X900' }] },
  { id: 41, name: 'MJX Bugs', subtypes: [{ id: 0, name: 'Bugs 3' }] },
  { id: 42, name: 'MJX Bugs Mini', subtypes: [] },
  { id: 90, name: 'MouldKing', subtypes: [], note: 'MouldKing RC building brick vehicles.' },
  { id: 17, name: 'MT99XX', subtypes: [{ id: 0, name: 'MT99' }, { id: 1, name: 'H7' }, { id: 2, name: 'YZ' }, { id: 3, name: 'LS' }, { id: 4, name: 'FY805' }] },
  { id: 92, name: 'MT99XX2', subtypes: [] },
  { id: 78, name: 'Multiplex MLINK', subtypes: [{ id: 0, name: 'Standard' }], note: 'Multiplex MLINK receivers.' },
  { id: 44, name: 'NCC1701', subtypes: [] },
  { id: 77, name: 'OMP Hobby', subtypes: [] },
  { id: 51, name: 'Potensic', subtypes: [] },
  { id: 66, name: 'Propel', subtypes: [] },
  { id: 29, name: 'Q2X2', subtypes: [{ id: 0, name: 'Q222' }, { id: 1, name: 'Q242' }, { id: 2, name: 'Q282' }] },
  { id: 31, name: 'Q303', subtypes: [{ id: 0, name: 'Q303' }, { id: 1, name: 'CX35' }, { id: 2, name: 'CX10D' }, { id: 3, name: 'CX10WD' }] },
  { id: 72, name: 'Q90C', subtypes: [] },
  { id: 74, name: 'RadioLink', subtypes: [{ id: 0, name: 'Surface (RC4GS/RC6GS)' }, { id: 1, name: 'Air (RC4G)' }], note: 'RadioLink surface and air receivers.' },
  { id: 76, name: 'RealAcc', subtypes: [] },
  { id: 50, name: 'RedPine', subtypes: [{ id: 0, name: 'Fast' }, { id: 1, name: 'Slow' }] },
  { id: 94, name: 'Scorpio', subtypes: [] },
  { id: 97, name: 'SGF22', subtypes: [] },
  { id: 19, name: 'ShenQi', subtypes: [], note: 'ShenQi mini motorcycle and surface.' },
  { id: 105, name: 'ShenQi 2', subtypes: [], note: 'ShenQi 2 mini motorcycle.' },
  { id: 68, name: 'Skyartec', subtypes: [] },
  {
    id: 11, name: 'SLT / Tactic',
    subtypes: [
      { id: 0, name: 'SLT' },
      { id: 1, name: 'SLT v2' },
      { id: 2, name: 'Q7' },
      { id: 3, name: 'MR100' },
    ],
    note: 'Tactic / Hobbico / Ares / Duratrax surface vehicles.',
  },
  { id: 10, name: 'Syma', subtypes: [{ id: 0, name: 'Standard' }, { id: 1, name: 'X5C' }] },
  { id: 43, name: 'Traxxas TQi', subtypes: [], note: 'Traxxas TQi 2.4 GHz receivers.' },
  { id: 101, name: 'UDIRC', subtypes: [], note: 'UDIRC surface vehicles.' },
  { id: 5, name: 'V2X2', subtypes: [{ id: 0, name: 'V2X2' }, { id: 1, name: 'JXD506' }, { id: 2, name: 'MR101' }] },
  { id: 48, name: 'V761', subtypes: [{ id: 0, name: 'V761' }, { id: 1, name: 'V761-2' }, { id: 2, name: 'V761-3' }] },
  { id: 46, name: 'V911S', subtypes: [{ id: 0, name: 'V911S' }, { id: 1, name: 'E119' }] },
  { id: 22, name: 'Walkera J6Pro', subtypes: [] },
  { id: 40, name: 'WFly', subtypes: [{ id: 0, name: 'Standard' }] },
  { id: 79, name: 'WFly 2', subtypes: [] },
  { id: 30, name: 'WK2x01 (Walkera)', subtypes: [{ id: 0, name: 'WK2801' }, { id: 1, name: 'WK2401' }, { id: 2, name: 'W6_5_1' }, { id: 3, name: 'W6_6_1' }, { id: 4, name: 'W6_HeL' }, { id: 5, name: 'W6_HEL2' }] },
  { id: 106, name: 'WL91X', subtypes: [] },
  { id: 107, name: 'WPL', subtypes: [], note: 'WPL crawlers and trucks.' },
  { id: 91, name: 'Xerall', subtypes: [] },
  { id: 62, name: 'XK', subtypes: [{ id: 0, name: 'X450' }, { id: 1, name: 'X420' }] },
  { id: 99, name: 'XK2', subtypes: [] },
  { id: 8, name: 'YD717', subtypes: [{ id: 0, name: 'YD717' }, { id: 1, name: 'Skybotz' }, { id: 2, name: 'XinXun' }, { id: 3, name: 'NiHui' }, { id: 4, name: 'Symax4' }] },
  { id: 100, name: 'Yuxiang', subtypes: [] },
  { id: 52, name: 'ZSX', subtypes: [] },
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
