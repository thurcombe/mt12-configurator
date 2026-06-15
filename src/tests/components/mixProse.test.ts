import { describe, it, expect } from 'vitest';
import type { MixLine } from '../../types/model.ts';
import { describeMix } from '../../components/mixes/mixProse.ts';

function mixLine(overrides: Partial<MixLine> = {}): MixLine {
  return {
    weight: 100,
    destCh: 0,
    srcRaw: 'TH',
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
    name: '',
    ...overrides,
  };
}

describe('describeMix fallback (no context)', () => {
  it('ADD: "Adds Throttle to CH1"', () => {
    expect(describeMix(mixLine({ mltpx: 'ADD', srcRaw: 'TH', destCh: 0 }))).toBe('Adds Throttle to CH1');
  });

  it('MUL: "Scales CH1 by Throttle"', () => {
    expect(describeMix(mixLine({ mltpx: 'MUL', srcRaw: 'TH', destCh: 0 }))).toBe('Scales CH1 by Throttle');
  });

  it('REPL: "Sets CH2 to Steering"', () => {
    expect(describeMix(mixLine({ mltpx: 'REPL', srcRaw: 'ST', destCh: 1 }))).toBe('Sets CH2 to Steering');
  });

  it('unknown mltpx falls back to "src → CHn"', () => {
    expect(describeMix(mixLine({ mltpx: 'UNKNOWN' as 'ADD', srcRaw: 'TH', destCh: 0 }))).toBe('Throttle → CH1');
  });
});
