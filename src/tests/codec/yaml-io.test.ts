import { describe, it, expect } from 'vitest';
import { loadYaml } from '../../codec/yaml-io.ts';

describe('loadYaml — CORE_SCHEMA enforcement', () => {
  it('parses standard YAML correctly', () => {
    const result = loadYaml('name: TRX4m\nchannel: 1') as Record<string, unknown>;
    expect(result.name).toBe('TRX4m');
    expect(result.channel).toBe(1);
  });

  it('rejects !!js/function tags', () => {
    expect(() => loadYaml('fn: !!js/function "function(){return 1}"')).toThrow();
  });

  it('rejects !!js/undefined tags', () => {
    expect(() => loadYaml("val: !!js/undefined ''")).toThrow();
  });

  it('rejects !!js/regexp tags', () => {
    expect(() => loadYaml("pat: !!js/regexp '/foo/gi'")).toThrow();
  });

  it('parses flightModes digit-strings without octal coercion', () => {
    const result = loadYaml('flightModes: 010000000') as Record<string, unknown>;
    // preProcess quotes the value so js-yaml treats it as a string, not octal
    expect(result.flightModes).toBe('010000000');
  });

  it('handles flightModes at end-of-file with no trailing newline', () => {
    const result = loadYaml('name: x\nflightModes: 010000000') as Record<string, unknown>;
    expect(result.flightModes).toBe('010000000');
  });
});
