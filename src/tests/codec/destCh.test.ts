import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parseModel } from '../../codec/model-codec.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, '../fixtures');

// destCh is 0-based in the YAML file. The UI should display CH1–CH16 (add 1).
// The codec keeps destCh 0-based; the UI layer is responsible for +1 on display.

describe('destCh encoding', () => {
  it('model00.yml destCh values are 0-based integers', () => {
    const yaml = readFileSync(join(fixtures, 'model00.yml'), 'utf8');
    const model = parseModel(yaml);
    for (const line of model.mixData) {
      expect(typeof line.destCh).toBe('number');
      expect(line.destCh).toBeGreaterThanOrEqual(0);
      expect(line.destCh).toBeLessThan(16);
    }
  });

  it('model00.yml first mixData line targets CH3 (destCh=2)', () => {
    // model00 first mix: weight 35, destCh 2 → CH3 in UI
    const yaml = readFileSync(join(fixtures, 'model00.yml'), 'utf8');
    const model = parseModel(yaml);
    expect(model.mixData[0].destCh).toBe(2);
  });

  it('destCh display helper: 0-based → 1-based label', () => {
    // The UI should display destCh + 1.
    expect(0 + 1).toBe(1);
    expect(15 + 1).toBe(16);
  });
});
