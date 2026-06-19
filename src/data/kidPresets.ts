import type { KidPreset } from '../types/kidPreset.ts';

export const BUILTIN_KID_PRESETS: KidPreset[] = [
  {
    id: 'newbie',
    name: 'Newbie',
    description: 'Completely new to R/C. Operates steering and throttle in a binary fashion and needs to develop the muscle memory for modulating physical inputs. Maximum assistance applied.',
    restrictionLevel: 100,
    builtIn: true,
  },
  {
    id: 'learner',
    name: 'Learner',
    description: 'Has some R/C experience and is beginning to feather throttle and steering rather than snapping to full travel. Still benefits from assistance limiting input scale while that control develops.',
    restrictionLevel: 65,
    builtIn: true,
  },
  {
    id: 'confident',
    name: 'Confident Learner',
    description: 'Has a solid grasp of proportional input control. Handles most situations well but benefits from a light hand on high-power or high-speed vehicles where the consequences of overcorrection are greater.',
    restrictionLevel: 35,
    builtIn: true,
  },
  {
    id: 'independent',
    name: 'Independent',
    description: 'Demonstrates reliable throttle and steering control across all driving conditions. Minimal assistance applied — a light safety margin for high-performance vehicles rather than active correction.',
    restrictionLevel: 10,
    builtIn: true,
  },
];
