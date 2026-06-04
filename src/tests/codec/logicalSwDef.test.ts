import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parseModel } from '../../codec/model-codec.ts';
import { decodeDef, encodeDef, defArgCount } from '../../codec/logicalSwDef.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, '../fixtures');

describe('logicalSwDef encode/decode', () => {
  it('decodeDef splits FUNC_STICKY "SC2,SC2" into two args', () => {
    const d = decodeDef('FUNC_STICKY', 'SC2,SC2');
    expect(d.args).toEqual(['SC2', 'SC2']);
    expect(d.func).toBe('FUNC_STICKY');
  });

  it('decodeDef splits FUNC_VNEG "I1,-5" into two args', () => {
    const d = decodeDef('FUNC_VNEG', 'I1,-5');
    expect(d.args).toEqual(['I1', '-5']);
  });

  it('decodeDef splits FUNC_AND "!L3,!L2" into two args', () => {
    const d = decodeDef('FUNC_AND', '!L3,!L2');
    expect(d.args).toEqual(['!L3', '!L2']);
  });

  it('encodeDef round-trips', () => {
    expect(encodeDef('FUNC_STICKY', ['SC2', 'SC2'])).toBe('SC2,SC2');
    expect(encodeDef('FUNC_VNEG', ['I1', '-5'])).toBe('I1,-5');
  });

  it('defArgCount returns 2 for two-arg funcs', () => {
    expect(defArgCount('FUNC_STICKY')).toBe(2);
    expect(defArgCount('FUNC_AND')).toBe(2);
    expect(defArgCount('FUNC_VNEG')).toBe(2);
  });

  it('defArgCount returns 3 for FUNC_EDGE', () => {
    expect(defArgCount('FUNC_EDGE')).toBe(3);
  });

  it('defArgCount returns 1 for FUNC_DPOS/FUNC_DNEG', () => {
    expect(defArgCount('FUNC_DPOS')).toBe(1);
    expect(defArgCount('FUNC_DNEG')).toBe(1);
  });

  it('model00.yml logicalSw[0] def round-trips', () => {
    const yaml = readFileSync(join(fixtures, 'model00.yml'), 'utf8');
    const model = parseModel(yaml);
    const ls0 = model.logicalSw['0'];
    const decoded = decodeDef(ls0.func, ls0.def);
    const reEncoded = encodeDef(ls0.func, decoded.args);
    expect(reEncoded).toBe(ls0.def);
  });

  it('TRX4m-2024-10-05 complex logicalSw defs all round-trip', () => {
    const yaml = readFileSync(join(fixtures, 'TRX4m-2024-10-05.yml'), 'utf8');
    const model = parseModel(yaml);
    for (const [, ls] of Object.entries(model.logicalSw)) {
      const decoded = decodeDef(ls.func, ls.def);
      const reEncoded = encodeDef(ls.func, decoded.args);
      expect(reEncoded).toBe(ls.def);
    }
  });
});
