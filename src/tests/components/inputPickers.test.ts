// Tests for physical-input picker consistency:
// - Toggle/2-pos switches must expose positions 0 and 2 (not 0 and 1)
// - 3-pos switches expose all three positions: 0, 1, 2
// - The option value keys produced by buildOptions must match the keys produced
//   by buildSwitchUsageMap so that "In use by" annotations fire correctly
// - Every toggle switch option named "↓" must have a value ending in "2"

import { describe, it, expect } from 'vitest';
import { buildOptions } from '../../components/shared/SwitchPicker.tsx';
import { buildSwitchUsageMap } from '../../codec/modelSummary.ts';
import type { Model, MixLine, LogicalSw } from '../../types/model.ts';

function model(partial: Partial<Model>): Model { return partial as Model; }
function mix(p: Partial<MixLine>): MixLine { return p as MixLine; }
function lsw(p: Partial<LogicalSw>): LogicalSw { return p as LogicalSw; }

// ── Switch position encoding ──────────────────────────────────────────────────

describe('buildOptions — switch position encoding', () => {
  it('generates positions 0 and 2 (not 0 and 1) for a toggle switch', () => {
    const opts = buildOptions([{ key: 'SC', name: 'SC', type: 'toggle' }]);
    const values = opts.map(o => o.value);
    expect(values).toContain('SC0');
    expect(values).toContain('SC2');
    expect(values).not.toContain('SC1');
  });

  it('generates positions 0 and 2 (not 0 and 1) for a 2POS switch', () => {
    const opts = buildOptions([{ key: 'SB', name: 'SB', type: '2POS' }]);
    const values = opts.map(o => o.value);
    expect(values).toContain('SB0');
    expect(values).toContain('SB2');
    expect(values).not.toContain('SB1');
  });

  it('generates all three positions 0, 1, 2 for a 3pos switch', () => {
    const opts = buildOptions([{ key: 'SA', name: 'SA', type: '3pos' }]);
    const values = opts.map(o => o.value);
    expect(values).toContain('SA0');
    expect(values).toContain('SA1');
    expect(values).toContain('SA2');
  });

  it('is case-insensitive for 3POS detection', () => {
    const opts3 = buildOptions([{ key: 'SA', name: 'SA', type: '3POS' }]);
    const opts3l = buildOptions([{ key: 'SA', name: 'SA', type: '3pos' }]);
    expect(opts3.map(o => o.value)).toEqual(opts3l.map(o => o.value));
  });

  it('labels the down position with ↓ for toggle switches', () => {
    const opts = buildOptions([{ key: 'SC', name: 'SC', type: 'toggle' }]);
    const downOpt = opts.find(o => o.value === 'SC2');
    expect(downOpt).toBeDefined();
    expect(downOpt!.label).toContain('↓');
  });

  it('does not include a ↓ option for toggle switches that ends in 1', () => {
    const opts = buildOptions([{ key: 'SC', name: 'SC', type: 'toggle' }]);
    const downOpts = opts.filter(o => o.label.includes('↓'));
    for (const o of downOpts) {
      expect(o.value).toMatch(/2$/);
    }
  });

  it('labels toggle as 2-pos and 3pos as 3-pos in the display label', () => {
    const toggleOpts = buildOptions([{ key: 'SC', name: 'SC', type: 'toggle' }]);
    const threeOpts  = buildOptions([{ key: 'SA', name: 'SA', type: '3POS' }]);
    expect(toggleOpts.find(o => o.value === 'SC0')!.label).toContain('2-pos');
    expect(threeOpts.find(o => o.value === 'SA0')!.label).toContain('3-pos');
  });
});

// ── Consistency: usage-map keys match picker option values ────────────────────

describe('buildSwitchUsageMap / buildOptions key consistency', () => {
  it('SC2 from a FUNC_STICKY logical switch matches an option value from buildOptions for a toggle SC', () => {
    // This is the exact scenario that was broken: cruise control assigns SC2 (down),
    // but the picker only generated SC0 and SC1, so "In use by" never appeared.
    const m = model({
      logicalSw: { '0': lsw({ func: 'FUNC_STICKY', def: 'SC2,SC2', andsw: 'NONE' }) },
      mixData: [mix({ name: 'CRUISE', srcRaw: 'ls(1)' })],
    });
    const usageMap = buildSwitchUsageMap(m);
    const opts = buildOptions([{ key: 'SC', name: 'SC', type: 'toggle' }]);
    const optValues = new Set(opts.map(o => o.value));

    // The usage map must have SC2
    expect(usageMap['SC2']).toContain('Cruise control');

    // And SC2 must appear as an option value so the picker can display "In use by"
    expect(optValues.has('SC2')).toBe(true);
  });

  it('SA2 (3-pos down) from a flight mode matches an option value from buildOptions', () => {
    const m = model({ flightModeData: { '1': { name: 'Kid', swtch: 'SA2' } as any } });
    const usageMap = buildSwitchUsageMap(m);
    const opts = buildOptions([{ key: 'SA', name: 'SA', type: '3pos' }]);
    const optValues = new Set(opts.map(o => o.value));

    expect(usageMap['SA2']).toContain('Kid');
    expect(optValues.has('SA2')).toBe(true);
  });

  it('every key produced by buildSwitchUsageMap is also a value in buildOptions for standard MT12 switches', () => {
    const mt12Switches = [
      { key: 'SA', name: 'SA', type: '3pos' },
      { key: 'SB', name: 'SB', type: 'toggle' },
      { key: 'SC', name: 'SC', type: 'toggle' },
      { key: 'SD', name: 'SD', type: 'toggle' },
    ];

    // Build a model that uses a position from every switch
    const m = model({
      mixData: [
        mix({ name: 'A', swtch: 'SA0' }),
        mix({ name: 'B', swtch: 'SA1' }),
        mix({ name: 'C', swtch: 'SA2' }),
        mix({ name: 'D', swtch: 'SB0' }),
        mix({ name: 'E', swtch: 'SB2' }),
        mix({ name: 'F', swtch: 'SC0' }),
        mix({ name: 'G', swtch: 'SC2' }),
        mix({ name: 'H', swtch: 'SD0' }),
        mix({ name: 'I', swtch: 'SD2' }),
      ],
    });

    const usageMap = buildSwitchUsageMap(m);
    const opts = buildOptions(mt12Switches);
    const optValues = new Set(opts.map(o => o.value));

    for (const key of Object.keys(usageMap)) {
      expect(optValues.has(key), `usage key "${key}" not present in picker options`).toBe(true);
    }
  });
});
