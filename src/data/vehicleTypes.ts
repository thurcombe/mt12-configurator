import type { VehicleType as KidVehicleType } from '../components/kidmode/kidDefaults.ts';

export interface VehicleCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  speedMin: number;  // actual RC car speed, mph
  speedMax: number;
  kidType: KidVehicleType;  // maps to KidControl default preset
  custom?: boolean;
}

export const BUILT_IN_CATEGORIES: VehicleCategory[] = [
  {
    id: 'crawler',
    name: 'Crawler',
    icon: '🐢',
    description: 'Rock crawler — very low speed, maximum precision and control',
    speedMin: 3,
    speedMax: 10,
    kidType: 'crawler',
  },
  {
    id: 'trail',
    name: 'Scale Trail',
    icon: '⛰️',
    description: 'Scale trail truck — realistic crawling with moderate terrain speed',
    speedMin: 5,
    speedMax: 18,
    kidType: 'crawler',
  },
  {
    id: 'short-course',
    name: 'Short Course',
    icon: '🏁',
    description: 'Short course truck — off-road oval racing, mid-range speed',
    speedMin: 20,
    speedMax: 40,
    kidType: 'sport',
  },
  {
    id: 'buggy',
    name: 'Buggy / Truggy',
    icon: '🏎️',
    description: 'Off-road buggy or truggy — fast and agile on rough terrain',
    speedMin: 25,
    speedMax: 50,
    kidType: 'rally',
  },
  {
    id: 'monster',
    name: 'Monster Truck',
    icon: '🚛',
    description: 'Monster truck — big air, bashing, moderate top speed',
    speedMin: 20,
    speedMax: 35,
    kidType: 'sport',
  },
  {
    id: 'sport',
    name: 'Sport / Touring',
    icon: '🏎️',
    description: 'On-road sport or touring car — high grip, fast on tarmac',
    speedMin: 30,
    speedMax: 55,
    kidType: 'sport',
  },
  {
    id: 'rally',
    name: 'Rally',
    icon: '🚗',
    description: 'Rally car — mixed surface, aggressive throttle, high speed',
    speedMin: 35,
    speedMax: 65,
    kidType: 'rally',
  },
  {
    id: 'desert',
    name: 'Desert Racer',
    icon: '⚡',
    description: 'High-speed desert racer — very fast, needs strong KidControl limits',
    speedMin: 50,
    speedMax: 80,
    kidType: 'highspeed',
  },
  {
    id: 'drift',
    name: 'Drift',
    icon: '💨',
    description: 'Drift car — controlled slides, rear-wheel drive bias',
    speedMin: 15,
    speedMax: 40,
    kidType: 'sport',
  },
];
