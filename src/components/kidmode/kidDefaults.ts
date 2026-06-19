export interface KidModeParams {
  thrRate: number;    // throttle dual rate %
  thrExpo: number;    // throttle expo value (0..100)
  speedUp: number;    // throttle speed-up (0.1s units per full throw)
  speedDown: number;  // throttle speed-down
  strRate: number;    // steering dual rate %
  strExpo: number;    // steering expo value
}
