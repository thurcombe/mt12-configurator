export type VehicleType = 'crawler' | 'sport' | 'rally' | 'highspeed';
export type SpeedClass = 'slow' | 'medium' | 'fast';

export interface KidModeParams {
  thrRate: number;    // throttle dual rate %
  thrExpo: number;    // throttle expo value (-100..100)
  speedUp: number;    // throttle speed-up (0.1s units per full throw)
  speedDown: number;  // throttle speed-down
  strRate: number;    // steering dual rate %
  strExpo: number;    // steering expo value
}

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  crawler: 'Crawler',
  sport: 'Sport',
  rally: 'Rally',
  highspeed: 'High-speed',
};

export const SPEED_LABELS: Record<SpeedClass, string> = {
  slow: 'Slow',
  medium: 'Medium',
  fast: 'Fast',
};

export const DEFAULTS: Record<VehicleType, Record<SpeedClass, KidModeParams>> = {
  crawler: {
    slow:   { thrRate: 60, thrExpo: 20, speedUp: 20, speedDown: 0, strRate: 70, strExpo: 15 },
    medium: { thrRate: 75, thrExpo: 15, speedUp: 20, speedDown: 0, strRate: 80, strExpo: 10 },
    fast:   { thrRate: 90, thrExpo: 10, speedUp: 20, speedDown: 0, strRate: 95, strExpo:  5 },
  },
  sport: {
    slow:   { thrRate: 55, thrExpo: 25, speedUp: 20, speedDown: 0, strRate: 65, strExpo: 20 },
    medium: { thrRate: 70, thrExpo: 20, speedUp: 20, speedDown: 0, strRate: 75, strExpo: 15 },
    fast:   { thrRate: 85, thrExpo: 15, speedUp: 20, speedDown: 0, strRate: 90, strExpo: 10 },
  },
  rally: {
    slow:   { thrRate: 50, thrExpo: 30, speedUp: 20, speedDown: 0, strRate: 60, strExpo: 25 },
    medium: { thrRate: 65, thrExpo: 25, speedUp: 20, speedDown: 0, strRate: 70, strExpo: 20 },
    fast:   { thrRate: 80, thrExpo: 20, speedUp: 20, speedDown: 0, strRate: 85, strExpo: 15 },
  },
  highspeed: {
    slow:   { thrRate: 40, thrExpo: 40, speedUp: 20, speedDown: 0, strRate: 55, strExpo: 35 },
    medium: { thrRate: 55, thrExpo: 30, speedUp: 20, speedDown: 0, strRate: 65, strExpo: 25 },
    fast:   { thrRate: 70, thrExpo: 25, speedUp: 20, speedDown: 0, strRate: 80, strExpo: 15 },
  },
};
