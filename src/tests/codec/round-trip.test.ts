import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parseModel, serialiseModel } from '../../codec/model-codec.ts';
import { parseRadio, serialiseRadio } from '../../codec/radio-codec.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, '../fixtures');

function readFixture(name: string): string {
  return readFileSync(join(fixtures, name), 'utf8');
}

describe('model round-trip', () => {
  const modelFixtures = [
    'model00.yml',
    'TRX4m-2024-10-10.yml',
    'TRX4m-2024-10-05.yml',
    'CAR2-2024-10-04.yml',
  ];

  for (const file of modelFixtures) {
    it(`${file}: parse → serialise → parse gives identical model`, () => {
      const original = readFixture(file);
      const model1 = parseModel(original);
      const yaml2 = serialiseModel(model1);
      const model2 = parseModel(yaml2);
      expect(model2).toEqual(model1);
    });
  }
});

describe('radio round-trip', () => {
  it('radio.yml: parse → serialise → parse gives identical radio (minus checksum, manuallyEdited normalised)', () => {
    const original = readFixture('radio.yml');
    const radio1 = parseRadio(original);
    expect((radio1 as unknown as Record<string, unknown>)['checksum']).toBeUndefined();
    const yaml2 = serialiseRadio(radio1);
    const radio2 = parseRadio(yaml2);
    // serialiseRadio intentionally sets manuallyEdited=1; normalise before comparing.
    const r1 = { ...radio1, manuallyEdited: 1 };
    expect(radio2).toEqual(r1);
  });

  it('radio.yml: serialise sets manuallyEdited = 1', () => {
    const original = readFixture('radio.yml');
    const radio = parseRadio(original);
    const yaml2 = serialiseRadio(radio);
    expect(yaml2).toMatch(/manuallyEdited: 1/);
  });

  it('radio.yml: serialise never emits checksum', () => {
    const original = readFixture('radio.yml');
    const radio = parseRadio(original);
    const yaml2 = serialiseRadio(radio);
    expect(yaml2).not.toMatch(/checksum:/);
  });
});
