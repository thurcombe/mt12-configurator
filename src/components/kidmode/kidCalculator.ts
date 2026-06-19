import type { VehicleCategory } from '../../data/vehicleTypes.ts';
import type { KidPreset } from '../../types/kidPreset.ts';
import type { KidModeParams } from './kidDefaults.ts';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function clampRound(v: number, lo: number, hi: number): number {
  return Math.round(Math.max(lo, Math.min(hi, v)));
}

/**
 * Derives KidControl parameters from vehicle physical characteristics and driver
 * skill preset. Formulas are calibrated against the legacy preset lookup table.
 *
 * restriction=100 → maximum limits (Newbie)
 * restriction=0   → minimal limits (unrestricted)
 */
export function calculateKidParams(vehicle: VehicleCategory, preset: KidPreset): KidModeParams {
  const r  = preset.restrictionLevel / 100;
  const pd = vehicle.powerDelivery / 100;
  const sc = vehicle.steeringCharacter / 100;

  // Throttle rate: restriction drives it linearly from 38% (max restriction) to 98% (free).
  const thrRate = clampRound(lerp(98, 38, r), 20, 100);

  // Throttle expo: restriction adds centre softness, punchy power delivery adds more.
  const thrExpo = clampRound(2 + 15 * r + 27 * pd, 0, 100);

  // Throttle speed ramp: restriction slows acceleration, punchy delivery increases ramp time.
  const speedUp = clampRound(lerp(3, 22, r) + 6 * pd, 0, 25);

  // Steering rate: derived from a bilinear fit to the legacy table.
  // High restriction and twitchy character both reduce the available steering throw.
  const strRate = clampRound(112 - 38 * r - 33 * sc, 25, 100);

  // Steering expo: restriction adds centre softness, twitchy character amplifies it further.
  const strExpo = clampRound(-5 + 15 * r + 44 * sc, 0, 100);

  return { thrRate, thrExpo, speedUp, speedDown: 0, strRate, strExpo };
}
