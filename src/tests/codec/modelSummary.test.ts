import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parseModel } from '../../codec/model-codec.ts';
import { buildInputMap, detectRole, buildModelSummary } from '../../codec/modelSummary.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, '../fixtures');

function loadModel(name: string) {
  return parseModel(readFileSync(join(fixtures, name), 'utf8'));
}

describe('buildInputMap', () => {
  it('maps expo channel indices to their source labels', () => {
    const model = loadModel('model00.yml');
    const map = buildInputMap(model.expoData);
    // model00 has TH and ST expo lines on channels 0 and 1
    expect(map[0]).toBe('Throttle');
    expect(map[1]).toBe('Steering');
  });

  it('returns empty map for empty expoData', () => {
    expect(buildInputMap([])).toEqual({});
  });

  it('uses the first expo line per channel (no overwrite)', () => {
    const lines = [
      { chn: 0, srcRaw: 'TH', weight: 100, offset: 0, curve: { type: 0, value: 0 }, name: '', swtch: 'NONE', flightModes: '000000000', mode: 0 },
      { chn: 0, srcRaw: 'ST', weight: 100, offset: 0, curve: { type: 0, value: 0 }, name: '', swtch: 'NONE', flightModes: '000000000', mode: 0 },
    ];
    const map = buildInputMap(lines);
    expect(map[0]).toBe('Throttle');
  });
});

describe('detectRole', () => {
  it('returns Throttle when srcRaw is TH', () => {
    const model = loadModel('model00.yml');
    const inputMap = buildInputMap(model.expoData);
    const thLines = model.mixData.filter(l => l.srcRaw === 'TH');
    expect(detectRole(thLines, inputMap, model)).toBe('Throttle');
  });

  it('returns Unknown for an empty mix list', () => {
    const model = loadModel('model00.yml');
    const inputMap = buildInputMap(model.expoData);
    expect(detectRole([], inputMap, model)).toBe('Unknown');
  });
});

describe('buildModelSummary', () => {
  it('returns a summary with channels, expos, and protocol', () => {
    const model = loadModel('model00.yml');
    const summary = buildModelSummary(model);
    expect(summary.channels.length).toBeGreaterThan(0);
    expect(summary.expos.length).toBeGreaterThan(0);
    expect(typeof summary.protocol).toBe('string');
    expect(summary.protocol.length).toBeGreaterThan(0);
  });

  it('identifies throttle and steering channel roles', () => {
    const model = loadModel('model00.yml');
    const summary = buildModelSummary(model);
    const roles = summary.channels.map(c => c.role);
    expect(roles).toContain('Throttle');
    expect(roles).toContain('Steering');
  });

  it('channels use 1-based numbering', () => {
    const model = loadModel('model00.yml');
    const summary = buildModelSummary(model);
    for (const ch of summary.channels) {
      expect(ch.ch).toBeGreaterThanOrEqual(1);
    }
  });

  it('reports kid mode as inactive on a stock model', () => {
    const model = loadModel('model00.yml');
    const summary = buildModelSummary(model);
    expect(summary.kidMode.active).toBe(false);
  });

  it('reports timerCount and flightModeCount as non-negative integers', () => {
    const model = loadModel('model00.yml');
    const summary = buildModelSummary(model);
    expect(summary.timerCount).toBeGreaterThanOrEqual(0);
    expect(summary.flightModeCount).toBeGreaterThanOrEqual(0);
  });
});
