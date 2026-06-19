export interface KidPreset {
  id: string;
  name: string;
  description: string;
  restrictionLevel: number;  // 0–100, 100 = maximum restriction
  builtIn?: boolean;
}
