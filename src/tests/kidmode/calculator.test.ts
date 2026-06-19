import { describe, it, expect } from 'vitest';
import { calculateKidParams } from '../../components/kidmode/kidCalculator.ts';
import { BUILT_IN_CATEGORIES } from '../../data/vehicleTypes.ts';
import { BUILTIN_KID_PRESETS } from '../../data/kidPresets.ts';

const crawler     = BUILT_IN_CATEGORIES.find(c => c.id === 'crawler')!;
const shortCourse = BUILT_IN_CATEGORIES.find(c => c.id === 'short-course')!;
const desert      = BUILT_IN_CATEGORIES.find(c => c.id === 'desert')!;

const newbie      = BUILTIN_KID_PRESETS.find(p => p.id === 'newbie')!;
const learner     = BUILTIN_KID_PRESETS.find(p => p.id === 'learner')!;
const confident   = BUILTIN_KID_PRESETS.find(p => p.id === 'confident')!;
const independent = BUILTIN_KID_PRESETS.find(p => p.id === 'independent')!;

describe('calculateKidParams', () => {
  describe('output is always in valid range', () => {
    it('all params are within bounds for every preset × every vehicle', () => {
      for (const vehicle of BUILT_IN_CATEGORIES) {
        for (const preset of BUILTIN_KID_PRESETS) {
          const p = calculateKidParams(vehicle, preset);
          expect(p.thrRate).toBeGreaterThanOrEqual(20);
          expect(p.thrRate).toBeLessThanOrEqual(100);
          expect(p.thrExpo).toBeGreaterThanOrEqual(0);
          expect(p.thrExpo).toBeLessThanOrEqual(100);
          expect(p.speedUp).toBeGreaterThanOrEqual(0);
          expect(p.speedUp).toBeLessThanOrEqual(25);
          expect(p.strRate).toBeGreaterThanOrEqual(25);
          expect(p.strRate).toBeLessThanOrEqual(100);
          expect(p.strExpo).toBeGreaterThanOrEqual(0);
          expect(p.strExpo).toBeLessThanOrEqual(100);
          expect(p.speedDown).toBe(0);
        }
      }
    });
  });

  describe('monotonicity — more restriction = tighter limits', () => {
    it('newbie thrRate < learner < confident < independent for any vehicle', () => {
      for (const vehicle of BUILT_IN_CATEGORIES) {
        const rates = [newbie, learner, confident, independent].map(p => calculateKidParams(vehicle, p).thrRate);
        for (let i = 0; i < rates.length - 1; i++) {
          expect(rates[i]).toBeLessThanOrEqual(rates[i + 1]);
        }
      }
    });

    it('newbie strRate ≤ learner ≤ confident ≤ independent for any vehicle', () => {
      for (const vehicle of BUILT_IN_CATEGORIES) {
        const rates = [newbie, learner, confident, independent].map(p => calculateKidParams(vehicle, p).strRate);
        for (let i = 0; i < rates.length - 1; i++) {
          expect(rates[i]).toBeLessThanOrEqual(rates[i + 1]);
        }
      }
    });

    it('newbie speedUp ≥ learner ≥ confident ≥ independent (more restriction = slower ramp)', () => {
      for (const vehicle of BUILT_IN_CATEGORIES) {
        const ramps = [newbie, learner, confident, independent].map(p => calculateKidParams(vehicle, p).speedUp);
        for (let i = 0; i < ramps.length - 1; i++) {
          expect(ramps[i]).toBeGreaterThanOrEqual(ramps[i + 1]);
        }
      }
    });
  });

  describe('known values — short-course + newbie (model01 baseline)', () => {
    it('thrRate=38, thrExpo=32, speedUp=25, strRate=58, strExpo=32', () => {
      const p = calculateKidParams(shortCourse, newbie);
      expect(p.thrRate).toBe(38);
      expect(p.thrExpo).toBe(32);
      expect(p.speedUp).toBe(25);
      expect(p.strRate).toBe(58);
      expect(p.strExpo).toBe(32);
    });
  });

  describe('vehicle character affects output', () => {
    it('punchy power delivery (desert) produces higher thrExpo than soft delivery (crawler)', () => {
      const desertParams  = calculateKidParams(desert, newbie);
      const crawlerParams = calculateKidParams(crawler, newbie);
      expect(desertParams.thrExpo).toBeGreaterThan(crawlerParams.thrExpo);
    });
  });
});

describe('BUILTIN_KID_PRESETS', () => {
  it('contains exactly 4 presets', () => {
    expect(BUILTIN_KID_PRESETS).toHaveLength(4);
  });

  it('ids are newbie / learner / confident / independent', () => {
    const ids = BUILTIN_KID_PRESETS.map(p => p.id);
    expect(ids).toContain('newbie');
    expect(ids).toContain('learner');
    expect(ids).toContain('confident');
    expect(ids).toContain('independent');
  });

  it('restrictionLevels are ordered descending', () => {
    const levels = BUILTIN_KID_PRESETS.map(p => p.restrictionLevel);
    for (let i = 0; i < levels.length - 1; i++) {
      expect(levels[i]).toBeGreaterThan(levels[i + 1]);
    }
  });

  it('all presets are marked builtIn', () => {
    expect(BUILTIN_KID_PRESETS.every(p => p.builtIn)).toBe(true);
  });
});
