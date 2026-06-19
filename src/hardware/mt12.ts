// MT12 hardware constants — verified from actual radio.yml structure.
// potsConfig uses P-keys (P1/P2/P3/P4); switchConfig uses SA/SB/SC/SD/FL1/FL2.

export const BASE_SWITCHES = [
  { key: 'SA', type: '3POS', label: 'SA' },
  { key: 'SB', type: '2POS', label: 'SB' },
  { key: 'SC', type: '2POS', label: 'SC' },
  { key: 'SD', type: '2POS', label: 'SD' },
] as const;

// FL1/FL2 are always present in switchConfig; included when type ≠ NONE.
export const FLEX_SWITCHES = ['FL1', 'FL2'] as const;

// potsConfig P-keys (match actual radio.yml field names)
export const BASE_POTS = [
  { key: 'P1', label: 'P1' },
  { key: 'P2', label: 'P2' },
] as const;

export const EXPANSION_POTS = ['P3', 'P4'] as const;

export const TRIMS = ['T1', 'T2', 'T3', 'T4', 'T5'] as const;

export type ExpansionModuleType =
  'none' | 'switch_dual3' | 'switch_3and2' | 'switch_dual2' | 'joystick';

export const EXPANSION_MODULES: Record<ExpansionModuleType, { label: string }> = {
  none:         { label: 'None' },
  switch_dual3: { label: 'Dual 3-pos switch module' },
  switch_3and2: { label: '3+2-pos switch module' },
  switch_dual2: { label: 'Dual 2-pos switch module' },
  joystick:     { label: 'Joystick module' },
};

export type BaseSwitchKey = typeof BASE_SWITCHES[number]['key'];
export type PotKey = typeof BASE_POTS[number]['key'] | typeof EXPANSION_POTS[number];
export type FlexSwitchKey = typeof FLEX_SWITCHES[number];
