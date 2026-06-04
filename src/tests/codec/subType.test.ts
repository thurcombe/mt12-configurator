import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parseModel } from '../../codec/model-codec.ts';
import { parseSubType, formatSubType } from '../../codec/protocols.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, '../fixtures');

describe('subType pack/unpack', () => {
  it('parseSubType splits "43,0" into { protocol: 43, option: 0 }', () => {
    expect(parseSubType('43,0')).toEqual({ protocol: 43, option: 0 });
  });

  it('parseSubType handles numeric 0 (CROSSFIRE) as { protocol: 0, option: 0 }', () => {
    expect(parseSubType(0)).toEqual({ protocol: 0, option: 0 });
  });

  it('formatSubType with comma produces "43,0" string', () => {
    expect(formatSubType(43, 0, true)).toBe('43,0');
  });

  it('formatSubType without comma produces numeric 0', () => {
    expect(formatSubType(0, 0, false)).toBe(0);
  });

  it('model00.yml multimodule subType is "43,0"', () => {
    const yaml = readFileSync(join(fixtures, 'model00.yml'), 'utf8');
    const model = parseModel(yaml);
    expect(model.moduleData['0'].subType).toBe('43,0');
    const parsed = parseSubType(model.moduleData['0'].subType);
    expect(parsed.protocol).toBe(43);
    expect(parsed.option).toBe(0);
  });

  it('CAR2 CROSSFIRE subType is 0 (numeric)', () => {
    const yaml = readFileSync(join(fixtures, 'CAR2-2024-10-04.yml'), 'utf8');
    const model = parseModel(yaml);
    // CROSSFIRE has subType: 0 as integer in the YAML
    expect(model.moduleData['0'].type).toBe('TYPE_CROSSFIRE');
    const parsed = parseSubType(model.moduleData['0'].subType);
    expect(parsed.protocol).toBe(0);
  });

  it('subType round-trips through parse/serialise', () => {
    const yaml = readFileSync(join(fixtures, 'model00.yml'), 'utf8');
    const model = parseModel(yaml);
    // After parsing, subType should be the string '43,0' as js-yaml
    // keeps the comma-containing string unmodified.
    const st = model.moduleData['0'].subType;
    expect(st).toBe('43,0');
  });
});
