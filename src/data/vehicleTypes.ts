export interface VehicleCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  speedMin: number;           // actual RC car speed, mph
  speedMax: number;
  steeringCharacter: number;  // 0 = very stable, 100 = very twitchy
  powerDelivery: number;      // 0 = smooth/linear, 100 = punchy/instant
  builtIn?: boolean;
}

export const BUILT_IN_CATEGORIES: VehicleCategory[] = [
  {
    id: 'crawler',
    name: 'Crawler',
    icon: '🐢',
    description: 'Rock crawler — very low speed, maximum precision and control',
    speedMin: 3,
    speedMax: 10,
    steeringCharacter: 10,
    powerDelivery: 10,
    builtIn: true,
  },
  {
    id: 'trail',
    name: 'Scale Trail',
    icon: '⛰️',
    description: 'Scale trail truck — realistic crawling with moderate terrain speed',
    speedMin: 5,
    speedMax: 18,
    steeringCharacter: 20,
    powerDelivery: 15,
    builtIn: true,
  },
  {
    id: 'short-course',
    name: 'Short Course',
    icon: '🏁',
    description: 'Short course truck — off-road oval racing, mid-range speed',
    speedMin: 20,
    speedMax: 40,
    steeringCharacter: 50,
    powerDelivery: 55,
    builtIn: true,
  },
  {
    id: 'buggy',
    name: 'Buggy / Truggy',
    icon: '🏎️',
    description: 'Off-road buggy or truggy — fast and agile on rough terrain',
    speedMin: 25,
    speedMax: 50,
    steeringCharacter: 65,
    powerDelivery: 70,
    builtIn: true,
  },
  {
    id: 'monster',
    name: 'Monster Truck',
    icon: '🚛',
    description: 'Monster truck — big air, bashing, moderate top speed',
    speedMin: 20,
    speedMax: 35,
    steeringCharacter: 45,
    powerDelivery: 60,
    builtIn: true,
  },
  {
    id: 'sport',
    name: 'Sport / Touring',
    icon: '🏎️',
    description: 'On-road sport or touring car — high grip, fast on tarmac',
    speedMin: 30,
    speedMax: 55,
    steeringCharacter: 60,
    powerDelivery: 65,
    builtIn: true,
  },
  {
    id: 'rally',
    name: 'Rally',
    icon: '🚗',
    description: 'Rally car — mixed surface, aggressive throttle, high speed',
    speedMin: 35,
    speedMax: 65,
    steeringCharacter: 70,
    powerDelivery: 75,
    builtIn: true,
  },
  {
    id: 'desert',
    name: 'Desert Racer',
    icon: '⚡',
    description: 'High-speed desert racer — very fast, wide power band',
    speedMin: 50,
    speedMax: 80,
    steeringCharacter: 55,
    powerDelivery: 85,
    builtIn: true,
  },
  {
    id: 'drift',
    name: 'Drift',
    icon: '💨',
    description: 'Drift car — controlled slides, rear-wheel drive bias',
    speedMin: 15,
    speedMax: 40,
    steeringCharacter: 80,
    powerDelivery: 50,
    builtIn: true,
  },
];
