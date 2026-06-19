import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parseModel } from '../../codec/model-codec.ts';
import { applyKidMode, removeKidMode, isKidModeActive } from '../../components/kidmode/kidGenerator.ts';
import { calculateKidParams } from '../../components/kidmode/kidCalculator.ts';
import { BUILT_IN_CATEGORIES } from '../../data/vehicleTypes.ts';
import { BUILTIN_KID_PRESETS } from '../../data/kidPresets.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, '../fixtures');

function loadModel(name: string) {
  const yaml = readFileSync(join(fixtures, name), 'utf8');
  return parseModel(yaml);
}

const crawler  = BUILT_IN_CATEGORIES.find(c => c.id === 'crawler')!;
const sport    = BUILT_IN_CATEGORIES.find(c => c.id === 'sport')!;
const rally    = BUILT_IN_CATEGORIES.find(c => c.id === 'rally')!;
const desert   = BUILT_IN_CATEGORIES.find(c => c.id === 'desert')!;

const newbie    = BUILTIN_KID_PRESETS.find(p => p.id === 'newbie')!;
const learner   = BUILTIN_KID_PRESETS.find(p => p.id === 'learner')!;
const confident = BUILTIN_KID_PRESETS.find(p => p.id === 'confident')!;

describe('kidGenerator', () => {
  it('isKidModeActive returns false on stock model', () => {
    const model = loadModel('model00.yml');
    expect(isKidModeActive(model)).toBe(false);
  });

  it('isKidModeActive returns true after applyKidMode', () => {
    const model = loadModel('model00.yml');
    const result = applyKidMode(model, calculateKidParams(crawler, newbie), 'FL10');
    expect(isKidModeActive(result)).toBe(true);
  });

  describe('FM1 structure', () => {
    it('creates FM1 with name "Kid" and correct switch', () => {
      const model = loadModel('model00.yml');
      const result = applyKidMode(model, calculateKidParams(crawler, newbie), 'FL10');
      const fm1 = result.flightModeData['1'];
      expect(fm1).toBeDefined();
      expect(fm1.name).toBe('Kid');
      expect(fm1.swtch).toBe('FL10');
    });

    it('FM1 has fadeIn and fadeOut of 2', () => {
      const model = loadModel('model00.yml');
      const result = applyKidMode(model, calculateKidParams(sport, learner), 'SA0');
      const fm1 = result.flightModeData['1'];
      expect(fm1.fadeIn).toBe(2);
      expect(fm1.fadeOut).toBe(2);
    });

    it('FM1 trim modes are set to inherit FM0 (mode=1)', () => {
      const model = loadModel('model00.yml');
      const result = applyKidMode(model, calculateKidParams(crawler, newbie), 'FL10');
      const fm1 = result.flightModeData['1'];
      for (const trim of Object.values(fm1.trim)) {
        expect(trim.mode).toBe(1);
      }
    });

    it('does not overwrite existing FM0', () => {
      const model = loadModel('model00.yml');
      const fm0Before = model.flightModeData['0'];
      const result = applyKidMode(model, calculateKidParams(crawler, newbie), 'FL10');
      expect(result.flightModeData['0']).toEqual(fm0Before);
    });
  });

  describe('expo lines', () => {
    it('adds KID-TH expo line with FM0 excluded', () => {
      const model = loadModel('model00.yml');
      const params = calculateKidParams(crawler, newbie);
      const result = applyKidMode(model, params, 'FL10');
      const kidTh = result.expoData.find((l) => l.name === 'KID-TH');
      expect(kidTh).toBeDefined();
      expect(kidTh!.srcRaw).toBe('TH');
      expect(kidTh!.weight).toBe(params.thrRate);
      expect(kidTh!.curve.value).toBe(params.thrExpo);
      expect(kidTh!.flightModes).toBe('100000000');
    });

    it('adds KID-ST expo line with FM0 excluded', () => {
      const model = loadModel('model00.yml');
      const params = calculateKidParams(rally, learner);
      const result = applyKidMode(model, params, 'FL10');
      const kidSt = result.expoData.find((l) => l.name === 'KID-ST');
      expect(kidSt).toBeDefined();
      expect(kidSt!.srcRaw).toBe('ST');
      expect(kidSt!.weight).toBe(params.strRate);
      expect(kidSt!.curve.value).toBe(params.strExpo);
      expect(kidSt!.flightModes).toBe('100000000');
    });

    it('preserves original expo lines', () => {
      const model = loadModel('model00.yml');
      const origCount = model.expoData.length;
      const result = applyKidMode(model, calculateKidParams(crawler, newbie), 'FL10');
      // Two new expo lines added
      expect(result.expoData.length).toBe(origCount + 2);
    });
  });

  describe('mix lines', () => {
    it('adds KID-SP mix with correct speedUp/speedDown on throttle channel', () => {
      const model = loadModel('model00.yml');
      const params = calculateKidParams(desert, newbie);
      const result = applyKidMode(model, params, 'FL10');
      const kidSp = result.mixData.find((l) => l.name === 'KID-SP');
      expect(kidSp).toBeDefined();
      expect(kidSp!.speedUp).toBe(params.speedUp);
      expect(kidSp!.speedDown).toBe(params.speedDown);
      expect(kidSp!.flightModes).toBe('100000000');
      expect(kidSp!.mltpx).toBe('REPL');
      expect(kidSp!.srcRaw).toBe('TH');
    });

    it('KID-SP destCh matches existing TH mix destCh', () => {
      const model = loadModel('model00.yml');
      const thrCh = model.mixData.find((l) => l.srcRaw === 'TH')!.destCh;
      const result = applyKidMode(model, calculateKidParams(crawler, newbie), 'FL10');
      const kidSp = result.mixData.find((l) => l.name === 'KID-SP');
      expect(kidSp!.destCh).toBe(thrCh);
    });

    it('preserves original mix lines', () => {
      const model = loadModel('model00.yml');
      const origCount = model.mixData.length;
      const result = applyKidMode(model, calculateKidParams(crawler, newbie), 'FL10');
      // Two new mix lines added
      expect(result.mixData.length).toBe(origCount + 2);
    });
  });

  describe('removeKidMode', () => {
    it('removes FM1 from flightModeData', () => {
      const model = loadModel('model00.yml');
      const withKid = applyKidMode(model, calculateKidParams(crawler, newbie), 'FL10');
      const removed = removeKidMode(withKid);
      expect(isKidModeActive(removed)).toBe(false);
      expect(removed.flightModeData['1']).toBeUndefined();
    });

    it('removes all KID-* expo and mix lines', () => {
      const model = loadModel('model00.yml');
      const withKid = applyKidMode(model, calculateKidParams(crawler, newbie), 'FL10');
      const removed = removeKidMode(withKid);
      expect(removed.expoData.every((l) => !l.name.startsWith('KID-'))).toBe(true);
      expect(removed.mixData.every((l) => !l.name.startsWith('KID-'))).toBe(true);
    });

    it('restores original expo and mix counts after remove', () => {
      const model = loadModel('model00.yml');
      const withKid = applyKidMode(model, calculateKidParams(crawler, newbie), 'FL10');
      const removed = removeKidMode(withKid);
      expect(removed.expoData.length).toBe(model.expoData.length);
      expect(removed.mixData.length).toBe(model.mixData.length);
    });

    it('is idempotent on a model with no kid mode', () => {
      const model = loadModel('model00.yml');
      const result = removeKidMode(model);
      expect(result.expoData.length).toBe(model.expoData.length);
      expect(result.mixData.length).toBe(model.mixData.length);
    });
  });

  it('more restricted preset produces lower throttle rate than less restricted', () => {
    const model = loadModel('model00.yml');
    const restricted = applyKidMode(model, calculateKidParams(crawler, newbie), 'FL10');
    const less = applyKidMode(model, calculateKidParams(crawler, confident), 'FL10');
    const restrictedRate = restricted.expoData.find((l) => l.name === 'KID-TH')!.weight;
    const lessRate = less.expoData.find((l) => l.name === 'KID-TH')!.weight;
    expect(restrictedRate).toBeLessThan(lessRate);
  });
});
