import { describe, it, expect } from 'vitest';
import { srcRawLabel, labelToSrcRaw } from '../../codec/srcRaw.ts';

describe('srcRawLabel', () => {
  it('labels TH as Throttle', () => {
    expect(srcRawLabel('TH')).toBe('Throttle');
  });

  it('labels ST as Steering', () => {
    expect(srcRawLabel('ST')).toBe('Steering');
  });

  it('labels MAX and HALF', () => {
    expect(srcRawLabel('MAX')).toBe('MAX');
    expect(srcRawLabel('HALF')).toBe('HALF');
  });

  it('labels NONE as None', () => {
    expect(srcRawLabel('NONE')).toBe('None');
  });

  it('labels P1 and P2 as knobs', () => {
    expect(srcRawLabel('P1')).toBe('P1 knob');
    expect(srcRawLabel('P2')).toBe('P2 knob');
  });

  it('labels P3/P4 as joystick axes', () => {
    expect(srcRawLabel('P3')).toBe('Joystick X');
    expect(srcRawLabel('P4')).toBe('Joystick Y');
  });

  it('labels I0 as Input 1 (1-based)', () => {
    expect(srcRawLabel('I0')).toBe('Input 1');
  });

  it('labels I15 as Input 16', () => {
    expect(srcRawLabel('I15')).toBe('Input 16');
  });

  it('labels ls(1) as L1', () => {
    expect(srcRawLabel('ls(1)')).toBe('L1');
  });

  it('labels ls(10) as L10', () => {
    expect(srcRawLabel('ls(10)')).toBe('L10');
  });

  it('labels CH3 as CH3 (display name passes through)', () => {
    expect(srcRawLabel('CH3')).toBe('CH3');
  });

  it('returns unknown identifiers unchanged', () => {
    expect(srcRawLabel('XYZZY')).toBe('XYZZY');
  });
});

describe('labelToSrcRaw', () => {
  it('maps Throttle back to TH', () => {
    expect(labelToSrcRaw('Throttle')).toBe('TH');
  });

  it('maps Steering back to ST', () => {
    expect(labelToSrcRaw('Steering')).toBe('ST');
  });

  it('maps "Input 1" back to I0', () => {
    expect(labelToSrcRaw('Input 1')).toBe('I0');
  });

  it('maps "Input 16" back to I15', () => {
    expect(labelToSrcRaw('Input 16')).toBe('I15');
  });

  it('maps L1 back to ls(1)', () => {
    expect(labelToSrcRaw('L1')).toBe('ls(1)');
  });

  it('maps L10 back to ls(10)', () => {
    expect(labelToSrcRaw('L10')).toBe('ls(10)');
  });

  it('returns unknown labels unchanged', () => {
    expect(labelToSrcRaw('XYZZY')).toBe('XYZZY');
  });
});

describe('srcRawLabel / labelToSrcRaw round-trip', () => {
  const staticKeys = ['TH', 'ST', 'P1', 'P2', 'P3', 'P4', 'MAX', 'HALF', 'NONE', 'SA', 'SB', 'SC', 'SD', 'FL1', 'FL2'];

  for (const key of staticKeys) {
    it(`round-trips ${key}`, () => {
      expect(labelToSrcRaw(srcRawLabel(key))).toBe(key);
    });
  }

  it('round-trips input channel I3', () => {
    expect(labelToSrcRaw(srcRawLabel('I3'))).toBe('I3');
  });

  it('round-trips logical switch ls(5)', () => {
    expect(labelToSrcRaw(srcRawLabel('ls(5)'))).toBe('ls(5)');
  });
});
