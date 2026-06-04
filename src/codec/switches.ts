// Human-readable labels for EdgeTX switch position strings.
// A switch string is either a plain identifier like "NONE", "ON",
// or a switch+position like "SA0", "SA1", "SA2", optionally negated "!SA0".

export interface SwitchPos {
  sw: string;
  pos: number;
  negated: boolean;
}

// Parse a raw switch string from YAML into its parts.
export function parseSwitchStr(raw: string): SwitchPos | null {
  if (!raw || raw === 'NONE' || raw === 'ON') return null;

  const negated = raw.startsWith('!');
  const s = negated ? raw.slice(1) : raw;

  // Logical switch L1..L32
  const lsM = /^L(\d+)$/.exec(s);
  if (lsM) return { sw: `L${lsM[1]}`, pos: 0, negated };

  // Physical switch with position digit at end
  const physM = /^([A-Z]+\d?)(\d)$/.exec(s);
  if (physM) return { sw: physM[1], pos: parseInt(physM[2], 10), negated };

  return null;
}

const POS_LABELS: Record<number, string> = {
  0: '↑',
  1: '—',
  2: '↓',
};

export function switchLabel(raw: string): string {
  if (raw === 'NONE') return 'None';
  if (raw === 'ON') return 'Always ON';

  const negated = raw.startsWith('!');
  const s = negated ? raw.slice(1) : raw;

  const lsM = /^L(\d+)$/.exec(s);
  if (lsM) return `${negated ? '!' : ''}L${lsM[1]}`;

  const physM = /^([A-Z]+\d?)(\d)$/.exec(s);
  if (physM) {
    const sw = physM[1];
    const pos = parseInt(physM[2], 10);
    const posLabel = POS_LABELS[pos] ?? String(pos);
    return `${negated ? '!' : ''}${sw} ${posLabel}`;
  }

  return raw;
}
