import { describe, it, expect } from 'vitest';
import {
  BASE_SWITCHES, BASE_POTS, EXPANSION_POTS, FLEX_SWITCHES, TRIMS, EXPANSION_MODULES,
} from '../../hardware/mt12.ts';

describe('MT12 hardware constants', () => {
  it('BASE_SWITCHES contains SA/SB/SC/SD in order', () => {
    expect(BASE_SWITCHES.map(s => s.key)).toEqual(['SA', 'SB', 'SC', 'SD']);
  });

  it('SA is 3POS; SB/SC/SD are 2POS', () => {
    expect(BASE_SWITCHES.find(s => s.key === 'SA')?.type).toBe('3POS');
    for (const key of ['SB', 'SC', 'SD'] as const) {
      expect(BASE_SWITCHES.find(s => s.key === key)?.type).toBe('2POS');
    }
  });

  it('BASE_POTS contains P1 and P2', () => {
    expect(BASE_POTS.map(p => p.key)).toEqual(['P1', 'P2']);
  });

  it('EXPANSION_POTS contains P3 and P4', () => {
    expect(EXPANSION_POTS).toEqual(['P3', 'P4']);
  });

  it('FLEX_SWITCHES contains FL1 and FL2', () => {
    expect(FLEX_SWITCHES).toEqual(['FL1', 'FL2']);
  });

  it('TRIMS contains T1–T5', () => {
    expect(TRIMS).toEqual(['T1', 'T2', 'T3', 'T4', 'T5']);
  });

  it('EXPANSION_MODULES has exactly 5 entries including none', () => {
    const keys = Object.keys(EXPANSION_MODULES);
    expect(keys).toHaveLength(5);
    expect(keys).toContain('none');
    expect(keys).toContain('switch_dual3');
    expect(keys).toContain('switch_3and2');
    expect(keys).toContain('switch_dual2');
    expect(keys).toContain('joystick');
  });

  it('all EXPANSION_MODULES entries have a non-empty label', () => {
    for (const mod of Object.values(EXPANSION_MODULES)) {
      expect(mod.label.length).toBeGreaterThan(0);
    }
  });
});
