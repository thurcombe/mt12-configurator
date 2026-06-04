// Human-readable labels for EdgeTX srcRaw identifiers.

const STATIC: Record<string, string> = {
  TH: 'Throttle',
  ST: 'Steering',
  SA: 'SA',
  SB: 'SB',
  SC: 'SC',
  SD: 'SD',
  FL1: 'FL1',
  FL2: 'FL2',
  P1: 'P1 knob',
  P2: 'P2 knob',
  P3: 'Joystick X',
  P4: 'Joystick Y',
  MAX: 'MAX',
  HALF: 'HALF',
  NONE: 'None',
};

// Matches I0, I1, ... I15 — logical input channels
const INPUT_RE = /^I(\d+)$/;
// Matches ls(N) — logical switch value
const LS_RE = /^ls\((\d+)\)$/;
// Matches CH1 .. CH16 (1-based display names)
const CH_RE = /^CH(\d+)$/;

export function srcRawLabel(srcRaw: string): string {
  if (STATIC[srcRaw]) return STATIC[srcRaw];

  const inputM = INPUT_RE.exec(srcRaw);
  if (inputM) return `Input ${parseInt(inputM[1], 10) + 1}`;

  const lsM = LS_RE.exec(srcRaw);
  if (lsM) return `L${lsM[1]}`;

  const chM = CH_RE.exec(srcRaw);
  if (chM) return `CH${chM[1]}`;

  return srcRaw;
}

// Return the srcRaw identifier from a label (reverse of srcRawLabel, best-effort).
// Used in the UI to convert a picker selection back to the YAML string.
export function labelToSrcRaw(label: string): string {
  for (const [k, v] of Object.entries(STATIC)) {
    if (v === label) return k;
  }
  const inputM = /^Input (\d+)$/.exec(label);
  if (inputM) return `I${parseInt(inputM[1], 10) - 1}`;

  const lsM = /^L(\d+)$/.exec(label);
  if (lsM) return `ls(${lsM[1]})`;

  return label;
}
