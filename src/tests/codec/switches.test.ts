import { describe, it, expect } from 'vitest';
import { parseSwitchStr, switchLabel } from '../../codec/switches.ts';

describe('parseSwitchStr', () => {
  it('returns null for NONE', () => {
    expect(parseSwitchStr('NONE')).toBeNull();
  });

  it('returns null for ON', () => {
    expect(parseSwitchStr('ON')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseSwitchStr('')).toBeNull();
  });

  it('parses a two-position physical switch SA0', () => {
    expect(parseSwitchStr('SA0')).toEqual({ sw: 'SA', pos: 0, negated: false });
  });

  it('parses a three-position physical switch SC2', () => {
    expect(parseSwitchStr('SC2')).toEqual({ sw: 'SC', pos: 2, negated: false });
  });

  it('parses a negated switch !SA0', () => {
    expect(parseSwitchStr('!SA0')).toEqual({ sw: 'SA', pos: 0, negated: true });
  });

  it('parses a negated mid-position !SC1', () => {
    expect(parseSwitchStr('!SC1')).toEqual({ sw: 'SC', pos: 1, negated: true });
  });

  it('parses a logical switch L3', () => {
    expect(parseSwitchStr('L3')).toEqual({ sw: 'L3', pos: 0, negated: false });
  });

  it('parses a negated logical switch !L5', () => {
    expect(parseSwitchStr('!L5')).toEqual({ sw: 'L5', pos: 0, negated: true });
  });

  it('parses FL1 multi-digit switch name (FL10)', () => {
    // "FL10" → sw="FL1", pos=0
    expect(parseSwitchStr('FL10')).toEqual({ sw: 'FL1', pos: 0, negated: false });
  });
});

describe('switchLabel', () => {
  it('labels NONE as "None"', () => {
    expect(switchLabel('NONE')).toBe('None');
  });

  it('labels ON as "Always ON"', () => {
    expect(switchLabel('ON')).toBe('Always ON');
  });

  it('labels position 0 with ↑', () => {
    expect(switchLabel('SA0')).toBe('SA ↑');
  });

  it('labels position 1 with —', () => {
    expect(switchLabel('SA1')).toBe('SA —');
  });

  it('labels position 2 with ↓', () => {
    expect(switchLabel('SA2')).toBe('SA ↓');
  });

  it('includes ! prefix for negated switch', () => {
    expect(switchLabel('!SC2')).toBe('!SC ↓');
  });

  it('labels a logical switch L3', () => {
    expect(switchLabel('L3')).toBe('L3');
  });

  it('labels a negated logical switch !L5', () => {
    expect(switchLabel('!L5')).toBe('!L5');
  });
});
