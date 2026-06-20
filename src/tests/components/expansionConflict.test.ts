import { describe, it, expect } from 'vitest';
import type { Model, MixLine, ExpoLine, FlightModeData, LogicalSw, CustomFn, Timer } from '../../types/model.ts';
import {
  getExpansionConflict,
  getControlUsages,
  modelUsesFlexSwitches,
  expansionConflictLabel,
  refControl,
} from '../../components/models/expansionConflict.ts';
import { buildSwitchUsageMap } from '../../codec/modelSummary.ts';

// ── Fixtures ─────────────────────────────────────────────────────────────────
// scanModel only reads mixData/expoData/flightModeData/logicalSw/customFn, so the
// rest of the Model can be omitted and the partial cast to Model.

function model(partial: Partial<Model>): Model {
  return partial as Model;
}

function mix(p: Partial<MixLine>): MixLine { return p as MixLine; }
function expo(p: Partial<ExpoLine>): ExpoLine { return p as ExpoLine; }
function fm(p: Partial<FlightModeData>): FlightModeData { return p as FlightModeData; }
function lsw(p: Partial<LogicalSw>): LogicalSw { return p as LogicalSw; }
function fn(p: Partial<CustomFn>): CustomFn { return p as CustomFn; }
function timer(p: Partial<Timer>): Timer { return p as Timer; }

describe('getExpansionConflict — missing controls', () => {
  it('flags FL1 switch reference when no module is installed', () => {
    const m = model({ mixData: [mix({ name: 'Cruise', swtch: 'FL10' })] });
    const c = getExpansionConflict(m, 'none');
    expect(c).not.toBeNull();
    expect(c!.controls).toContain('FL1');
    expect(c!.requiredFor).toBe('switch');
    expect(c!.installedModule).toBe('none');
  });

  it('flags FL1 when a joystick module is installed (switches not provided)', () => {
    const m = model({ mixData: [mix({ name: 'Cruise', swtch: 'FL10' })] });
    const c = getExpansionConflict(m, 'joystick');
    expect(c).not.toBeNull();
    expect(c!.controls).toEqual(['FL1']);
    expect(c!.requiredFor).toBe('switch');
  });

  it('does not flag FL1 when a switch module is installed and the position fits', () => {
    const m = model({ mixData: [mix({ name: 'Cruise', swtch: 'FL10' })] });
    expect(getExpansionConflict(m, 'switch_dual3')).toBeNull();
    expect(getExpansionConflict(m, 'switch_dual2')).toBeNull();
  });

  it('flags P3 joystick source when no module is installed', () => {
    const m = model({ mixData: [mix({ name: 'Aux', srcRaw: 'P3' })] });
    const c = getExpansionConflict(m, 'none');
    expect(c).not.toBeNull();
    expect(c!.controls).toContain('P3');
    expect(c!.requiredFor).toBe('joystick');
  });

  it('does not flag P3 when a joystick module is installed', () => {
    const m = model({ mixData: [mix({ name: 'Aux', srcRaw: 'P3' })] });
    expect(getExpansionConflict(m, 'joystick')).toBeNull();
  });

  it("reports requiredFor 'both' when switch and joystick controls are both missing", () => {
    const m = model({ mixData: [mix({ name: 'Cruise', swtch: 'FL10' }), mix({ name: 'Aux', srcRaw: 'P3' })] });
    const c = getExpansionConflict(m, 'none');
    expect(c!.requiredFor).toBe('both');
    expect(c!.controls).toEqual(['FL1', 'P3']);
  });

  it("reports requiredFor 'joystick' for a P3 reference under a switch module", () => {
    const m = model({ mixData: [mix({ name: 'Cruise', swtch: 'FL10' }), mix({ name: 'Aux', srcRaw: 'P3' })] });
    const c = getExpansionConflict(m, 'switch_dual3');
    // FL1 fits the switch module, only P3 conflicts.
    expect(c!.requiredFor).toBe('joystick');
    expect(c!.controls).toEqual(['P3']);
  });

  it('detects references across expo, flight-mode, logical-switch and special-function fields', () => {
    expect(getExpansionConflict(model({ expoData: [expo({ name: 'St', swtch: 'FL20' })] }), 'none')).not.toBeNull();
    expect(getExpansionConflict(model({ flightModeData: { '1': fm({ name: 'Kid', swtch: 'FL10' }) } }), 'none')).not.toBeNull();
    expect(getExpansionConflict(model({ logicalSw: { '0': lsw({ def: 'FL11', andsw: 'NONE' }) } }), 'none')).not.toBeNull();
    expect(getExpansionConflict(model({ customFn: { '0': fn({ swtch: 'FL20' }) } }), 'none')).not.toBeNull();
  });

  it('returns null when the model references no expansion controls', () => {
    const m = model({ mixData: [mix({ name: 'Throttle', srcRaw: 'TH', swtch: 'SA2' })] });
    expect(getExpansionConflict(m, 'none')).toBeNull();
    expect(getExpansionConflict(m, 'switch_dual3')).toBeNull();
  });
});

describe('getExpansionConflict — switch-position overflow', () => {
  it('flags FL12 (3-pos position) when only a dual-2-pos module is installed', () => {
    const m = model({ flightModeData: { '1': fm({ name: 'Kid', swtch: 'FL12' }) } });
    const c = getExpansionConflict(m, 'switch_dual2');
    expect(c).not.toBeNull();
    expect(c!.controls).toContain('FL12');
    expect(c!.requiredFor).toBe('switch');
  });

  it('does not flag FL12 when a dual-3-pos module provides the third position', () => {
    const m = model({ flightModeData: { '1': fm({ name: 'Kid', swtch: 'FL12' }) } });
    expect(getExpansionConflict(m, 'switch_dual3')).toBeNull();
  });

  it('flags FL22 on a 3+2-pos module (FL2 is only 2-position there)', () => {
    const m = model({ mixData: [mix({ name: 'X', swtch: 'FL22' })] });
    const c = getExpansionConflict(m, 'switch_3and2');
    expect(c!.controls).toContain('FL22');
  });

  it('allows FL12 but flags FL22 on a 3+2-pos module', () => {
    const m = model({ mixData: [mix({ name: 'A', swtch: 'FL12' }), mix({ name: 'B', swtch: 'FL22' })] });
    const c = getExpansionConflict(m, 'switch_3and2');
    expect(c).not.toBeNull();
    expect(c!.controls).toEqual(['FL22']);
  });

  it('allows positions 0 and 1 on a dual-2-pos module', () => {
    const m = model({ mixData: [mix({ name: 'A', swtch: 'FL10' }), mix({ name: 'B', swtch: 'FL11' })] });
    expect(getExpansionConflict(m, 'switch_dual2')).toBeNull();
  });
});

describe('getControlUsages', () => {
  it('records human-readable usage descriptions per control', () => {
    const m = model({
      mixData: [mix({ name: 'Cruise', srcRaw: 'FL2' })],
      flightModeData: { '1': fm({ name: 'KidControl', swtch: 'FL22' }) },
    });
    const usages = getControlUsages(m);
    expect(usages['FL2']).toContain('mix "Cruise" source');
    expect(usages['FL2']).toContain('drive mode "KidControl" condition');
    expect(usages['FL22']).toContain('drive mode "KidControl" condition');
  });

  it('labels logical switches and special functions by their 1-based index', () => {
    const m = model({
      logicalSw: { '2': lsw({ def: 'FL10', andsw: 'NONE' }) },
      customFn: { '4': fn({ swtch: 'FL20' }) },
    });
    const usages = getControlUsages(m);
    expect(usages['FL1']).toContain('logical switch L3 input');
    expect(usages['FL2']).toContain('special function SF5 condition');
  });

  it('falls back to "unnamed" labels when a line has no name', () => {
    const m = model({ mixData: [mix({ srcRaw: 'FL1' })] });
    expect(getControlUsages(m)['FL1']).toContain('unnamed mix source');
  });
});

describe('modelUsesFlexSwitches', () => {
  it('is true for FL1/FL2 references', () => {
    expect(modelUsesFlexSwitches(model({ mixData: [mix({ swtch: 'FL10' })] }))).toBe(true);
  });
  it('is false when only joystick or base controls are referenced', () => {
    expect(modelUsesFlexSwitches(model({ mixData: [mix({ srcRaw: 'P3' })] }))).toBe(false);
    expect(modelUsesFlexSwitches(model({ mixData: [mix({ swtch: 'SA2', srcRaw: 'TH' })] }))).toBe(false);
  });
});

describe('refControl', () => {
  it('maps switch positions and sources to their base control', () => {
    expect(refControl('FL1')).toBe('FL1');
    expect(refControl('FL12')).toBe('FL1');
    expect(refControl('!FL10')).toBe('FL1');
    expect(refControl('FL2')).toBe('FL2');
    expect(refControl('FL22')).toBe('FL2');
    expect(refControl('P3')).toBe('P3');
    expect(refControl('P4')).toBe('P4');
  });
  it('returns null for base switches, sticks, and empty input', () => {
    expect(refControl('SA2')).toBeNull();
    expect(refControl('TH')).toBeNull();
    expect(refControl('')).toBeNull();
    expect(refControl(undefined)).toBeNull();
    expect(refControl(null)).toBeNull();
  });
});

describe('expansionConflictLabel', () => {
  it('describes missing controls with no module installed', () => {
    const label = expansionConflictLabel({ controls: ['FL1'], requiredFor: 'switch', installedModule: 'none' });
    expect(label).toContain('FL1');
    expect(label).toContain('no module is installed');
  });

  it('names the installed module for missing controls', () => {
    const label = expansionConflictLabel({ controls: ['P3'], requiredFor: 'joystick', installedModule: 'switch_dual3' });
    expect(label).toContain('Dual 3-pos switch module');
    expect(label).toContain("doesn't provide");
  });

  it('describes a position overflow as never triggering', () => {
    const label = expansionConflictLabel({ controls: ['FL12'], requiredFor: 'switch', installedModule: 'switch_dual2' });
    expect(label).toContain('FL12');
    expect(label).toContain('requires more switch positions');
    expect(label).toContain('will never trigger');
  });

  it('combines missing and overflow descriptions', () => {
    // Reachable combo: a switch module is installed, so a P3 joystick reference is
    // missing while an FL12 position overflows the dual-2-pos module.
    const label = expansionConflictLabel({ controls: ['P3', 'FL12'], requiredFor: 'both', installedModule: 'switch_dual2' });
    expect(label).toContain('P3');
    expect(label).toContain("doesn't provide");
    expect(label).toContain('FL12');
    expect(label).toContain('will never trigger');
  });
});

describe('buildSwitchUsageMap', () => {
  it('maps a mix switch to the mix name', () => {
    const m = model({ mixData: [mix({ name: 'Cruise', swtch: 'SC2' })] });
    expect(buildSwitchUsageMap(m)['SC2']).toContain('Cruise');
  });

  it('maps a flight mode switch (skips fm index 0)', () => {
    const m = model({
      flightModeData: {
        '0': fm({ name: 'Normal', swtch: 'SA0' }),
        '1': fm({ name: 'KidControl', swtch: 'SA1' }),
      },
    });
    const u = buildSwitchUsageMap(m);
    expect(u['SA0']).toBeUndefined(); // fm 0 is skipped
    expect(u['SA1']).toContain('KidControl');
  });

  it('maps expo and timer switches', () => {
    const m = model({
      expoData: [expo({ name: 'RaceMode', swtch: 'SB1' })],
      timers: { '0': timer({ name: 'LapTimer', swtch: 'SD0' }) },
    });
    const u = buildSwitchUsageMap(m);
    expect(u['SB1']).toContain('RaceMode');
    expect(u['SD0']).toContain('LapTimer');
  });

  it('deduplicates usages when the same switch appears in multiple contexts', () => {
    const m = model({
      mixData: [mix({ name: 'Cruise', swtch: 'SC2' }), mix({ name: 'Cruise', swtch: 'SC2' })],
    });
    expect(buildSwitchUsageMap(m)['SC2'].length).toBe(1);
  });

  it('infers "Cruise control" label for FUNC_STICKY that drives a CRUISE mix', () => {
    const m = model({
      logicalSw: { '0': lsw({ func: 'FUNC_STICKY', def: 'SC2,SC2', andsw: 'NONE' }) },
      mixData: [mix({ name: 'CRUISE', srcRaw: 'ls(1)' })],
    });
    expect(buildSwitchUsageMap(m)['SC2']).toContain('Cruise control');
  });

  it('uses L<N> label for non-sticky logical switches', () => {
    const m = model({ logicalSw: { '2': lsw({ func: 'FUNC_AND', def: 'SC0,SA1', andsw: 'NONE' }) } });
    const u = buildSwitchUsageMap(m);
    expect(u['SC0']).toContain('L3');
    expect(u['SA1']).toContain('L3');
  });

  it('does not add numeric FUNC_EDGE delay args as map keys', () => {
    // FUNC_EDGE def: "switch,lo_ms,hi_ms" — only the first arg is a switch.
    const m = model({ logicalSw: { '0': lsw({ func: 'FUNC_EDGE', def: 'SC2,200,500', andsw: 'NONE' }) } });
    const u = buildSwitchUsageMap(m);
    expect(u['SC2']).toBeDefined();
    expect(u['200']).toBeUndefined();
    expect(u['500']).toBeUndefined();
  });

  it('returns empty map for a model with no switch assignments', () => {
    const m = model({ mixData: [mix({ srcRaw: 'TH', swtch: 'NONE' })] });
    expect(Object.keys(buildSwitchUsageMap(m))).toHaveLength(0);
  });
});
