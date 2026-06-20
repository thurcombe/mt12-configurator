// Plain-English analysis of a model's configuration.

import type { Model, MixLine, ExpoLine } from '../types/model.ts';

// Returns a map of physical switch base key → human-readable usage descriptions.
// e.g. { SC: ['Cruise control'], SA: ['KidControl'] }
// Used by SwitchPicker to show which switches are already assigned in the model.
export function buildSwitchUsageMap(model: Model): Record<string, string[]> {
  const map: Record<string, string[]> = {};

  // Key is the full switch value WITH position digit (e.g. "FL20", "SC2") so callers
  // can show "in use" only on the specific position that's actually assigned.
  // Strip only the leading ! for negated switches.
  function add(sw: string | undefined | null, usage: string) {
    if (!sw || sw === 'NONE' || sw === 'ON') return;
    const key = sw.replace(/^!/, '');
    if (!key) return;
    // Skip numeric tokens — FUNC_EDGE defs include delay values like "200" that
    // are not switch references and must not appear as usage-map keys.
    if (/^-?\d+$/.test(key)) return;
    if (!map[key]) map[key] = [];
    if (!map[key].includes(usage)) map[key].push(usage);
  }

  for (const [idx, fm] of Object.entries(model.flightModeData ?? {})) {
    if (idx === '0') continue;
    add(fm.swtch, fm.name?.trim() || `Drive mode ${idx}`);
  }

  for (const line of model.mixData ?? []) {
    add(line.swtch, line.name?.trim() || 'Mix');
  }

  for (const line of model.expoData ?? []) {
    add(line.swtch, line.name?.trim() || 'Expo');
  }

  const switchFuncs = new Set(['FUNC_AND', 'FUNC_OR', 'FUNC_XOR', 'FUNC_STICKY', 'FUNC_LATCH', 'FUNC_EDGE']);
  for (const [idx, ls] of Object.entries(model.logicalSw ?? {})) {
    const lsIndex1 = parseInt(idx) + 1;
    let label: string;
    if (ls.func === 'FUNC_STICKY') {
      // Cruise control — find the mix that sources from this LS for a readable label
      const lsSrc = `ls(${lsIndex1})`;
      const usingMix = (model.mixData ?? []).find(m => m.srcRaw === lsSrc);
      const mixName = usingMix?.name?.trim();
      label = mixName === 'CRUISE' ? 'Cruise control' : (mixName || 'Cruise control');
    } else {
      label = `L${lsIndex1}`;
    }
    if (switchFuncs.has(ls.func) && ls.def) {
      for (const arg of ls.def.split(',')) add(arg, label);
    }
    add(ls.andsw, `${label} AND`);
  }

  for (const [idx, fn] of Object.entries(model.customFn ?? {})) {
    const f = fn as { swtch?: string; func?: string };
    const label = f.func ? `${f.func} (SF${parseInt(idx) + 1})` : `SF${parseInt(idx) + 1}`;
    add(f.swtch, label);
  }

  for (const [idx, timer] of Object.entries(model.timers ?? {})) {
    add(timer.swtch, timer.name?.trim() || `Timer ${parseInt(idx) + 1}`);
  }

  return map;
}
import { srcRawLabel } from './srcRaw.ts';
import { parseSubType, protocolName } from './protocols.ts';
import { switchLabel } from './switches.ts';

// Build a map from input channel index → source label (I0=TH, I1=ST, etc.)
export function buildInputMap(expoData: ExpoLine[]): Record<number, string> {
  const map: Record<number, string> = {};
  for (const line of expoData) {
    if (!(line.chn in map)) {
      map[line.chn] = srcRawLabel(line.srcRaw);
    }
  }
  return map;
}

// Strip the position suffix from a switch name: "SC2" → "SC", "SA0" → "SA"
function stripSwitchPos(s: string): string {
  return s.replace(/\d+$/, '');
}

// MT12 physical control names recognised by the diagram
const PHYSICAL_CONTROLS = new Set(['SA','SB','SC','SD','FL1','FL2','P1','P2','P3','P4','TH','ST']);

// Resolve a logical switch index (1-based from srcRaw ls(N)) to the underlying
// physical switch name and a human label.
function resolveLogicalSw(
  model: Model,
  lsIndex1: number,
): { label: string; controls: string[] } {
  const ls = model.logicalSw?.[String(lsIndex1 - 1)]; // logicalSw uses 0-based keys
  if (!ls) return { label: `L${lsIndex1}`, controls: [] };

  const args = ls.def ? ls.def.split(',') : [];
  const switches = args
    .map(stripSwitchPos)
    .filter((s) => s && s !== 'NONE' && /^[A-Z]/.test(s));
  const unique = [...new Set(switches)];
  const physical = unique.filter((s) => PHYSICAL_CONTROLS.has(s));

  const primarySw = physical[0] ?? unique[0];
  let label = primarySw ?? `L${lsIndex1}`;

  if (primarySw) {
    const funcSuffix: Record<string, string> = {
      FUNC_STICKY: 'sticky hold',
      FUNC_LATCH:  'latch',
      FUNC_AND:    'combined',
      FUNC_OR:     'either',
    };
    const suffix = funcSuffix[ls.func];
    if (suffix) label = `${label} (${suffix})`;
  }

  return { label, controls: physical };
}

export function friendlySrcRaw(
  srcRaw: string,
  inputMap: Record<number, string>,
  model: Model,
): { label: string; controls: string[] } {
  // Input channel (I0, I1, ...) — map to physical source via expo data
  const inputM = /^I(\d+)$/.exec(srcRaw);
  if (inputM) {
    const idx = parseInt(inputM[1], 10);
    const srcLabel = inputMap[idx] ?? `Input ${idx + 1}`;
    const ctrl = PHYSICAL_CONTROLS.has(srcLabel) ? srcLabel : null;
    return { label: srcLabel, controls: ctrl ? [ctrl] : [] };
  }

  // Logical switch ls(N) — resolve to underlying physical switch + label
  const lsM = /^ls\((\d+)\)$/.exec(srcRaw);
  if (lsM) {
    return resolveLogicalSw(model, parseInt(lsM[1], 10));
  }

  // Direct physical control
  const label = srcRawLabel(srcRaw);
  const ctrl = PHYSICAL_CONTROLS.has(srcRaw) ? srcRaw : null;
  return { label, controls: ctrl ? [ctrl] : [] };
}

// Common mix name → human label
export const NAME_MAP: Record<string, string> = {
  CRUISE:   'Cruise hold',
  THROT:    'Throttle',
  THROTTLE: 'Throttle',
  'D-RATE': 'Speed limiter',
  STEER:    'Steering',
  'S-TRIM': 'Steering trim',
  'KID-TH': 'Kid Mode throttle rate',
  'KID-ST': 'Kid Mode steering rate',
  'KID-SP': 'Kid Mode speed ramp',
};

const MLTPX_VERB: Record<string, string> = {
  ADD:  'Add',
  MUL:  'Scale by',
  REPL: 'Set to',
};

export interface MixLineSummary {
  friendlyName: string;
  detail: string;
  switch?: string;
  controls: string[];   // physical MT12 control names for diagram hover
  kidMode?: boolean;
  fmRestricted?: boolean;
}

export interface ChannelSummary {
  ch: number;           // 1-based
  name?: string;        // from limitData or inferred
  role: 'Throttle' | 'Steering' | 'Unknown';
  lines: MixLineSummary[];
}

export interface ExpoSummary {
  source: string;
  rate: number;
  expo: number;
  switch?: string;
  kidMode?: boolean;
}

export interface ModelSummary {
  protocol: string;
  channels: ChannelSummary[];
  expos: ExpoSummary[];
  kidMode: { active: boolean; triggerSwitch?: string };
  timerCount: number;
  flightModeCount: number;
}

export function detectRole(lines: MixLine[], inputMap: Record<number, string>, model: Model): ChannelSummary['role'] {
  for (const l of lines) {
    const { label: src } = friendlySrcRaw(l.srcRaw, inputMap, model);
    if (l.srcRaw === 'TH' || src === 'Throttle') return 'Throttle';
    if (l.srcRaw === 'ST' || src === 'Steering') return 'Steering';
    if (src.toLowerCase().includes('throttle')) return 'Throttle';
    if (src.toLowerCase().includes('steering')) return 'Steering';
  }
  return 'Unknown';
}

function summariseMixLine(line: MixLine, inputMap: Record<number, string>, model: Model): MixLineSummary {
  const nameKey = (line.name ?? '').toUpperCase().trim();
  const friendlyName = NAME_MAP[nameKey] ?? line.name ?? '';
  const verb = MLTPX_VERB[line.mltpx] ?? line.mltpx;
  const { label: srcLabel, controls: srcControls } = friendlySrcRaw(line.srcRaw, inputMap, model);

  let detail = `${verb} ${srcLabel}`;
  if (line.mltpx === 'ADD' || line.mltpx === 'REPL') {
    if (Math.abs(line.weight) !== 100) detail += ` (${line.weight}%)`;
    if (line.offset !== 0) detail += `, offset ${line.offset > 0 ? '+' : ''}${line.offset}%`;
  }
  if (line.speedUp || line.speedDown) {
    detail += ` — ramp ${line.speedUp * 0.1}s up / ${line.speedDown * 0.1}s down`;
  }

  const sw = line.swtch && line.swtch !== 'NONE' ? switchLabel(line.swtch) : undefined;
  const kidMode = (line.name ?? '').startsWith('KID-');
  const fmRestricted = line.flightModes?.charAt(0) === '1';

  // Combine controls from srcRaw and the gating switch
  const swControl = line.swtch && line.swtch !== 'NONE'
    ? [stripSwitchPos(line.swtch)].filter(s => PHYSICAL_CONTROLS.has(s))
    : [];
  const controls = [...new Set([...srcControls, ...swControl])];

  return { friendlyName, detail, switch: sw, controls, kidMode, fmRestricted };
}

function summariseExpoLine(line: ExpoLine, inputMap: Record<number, string>, model: Model): ExpoSummary {
  const { label: source } = friendlySrcRaw(line.srcRaw, inputMap, model);
  const sw = line.swtch && line.swtch !== 'NONE' ? switchLabel(line.swtch) : undefined;
  const kidMode = (line.name ?? '').startsWith('KID-');
  const fmRestricted = line.flightModes?.charAt(0) === '1';
  return {
    source,
    rate: line.weight,
    expo: line.curve?.value ?? 0,
    switch: sw,
    kidMode: kidMode || fmRestricted,
  };
}

export function buildModelSummary(model: Model): ModelSummary {
  const inputMap = buildInputMap(model.expoData ?? []);

  // Group mixes by destCh
  const byChannel: Record<number, MixLine[]> = {};
  for (const line of model.mixData ?? []) {
    const ch = line.destCh;
    if (!byChannel[ch]) byChannel[ch] = [];
    byChannel[ch].push(line);
  }

  const channels: ChannelSummary[] = Object.entries(byChannel)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([chStr, lines]) => {
      const ch = parseInt(chStr, 10) + 1; // 1-based
      const limitName = model.limitData?.[parseInt(chStr)]?.name;
      const role = detectRole(lines, inputMap, model);
      // Prefer explicit limit name, else use inferred role label
      const name = limitName || (role !== 'Unknown' ? role : undefined);
      return {
        ch,
        name,
        role,
        lines: lines.map((l) => summariseMixLine(l, inputMap, model)),
      };
    });

  // Expo lines — group by source, skip kid-mode lines if kid mode section covers them
  const expoGroups: Record<string, ExpoSummary[]> = {};
  for (const line of model.expoData ?? []) {
    const s = summariseExpoLine(line, inputMap, model);
    if (!expoGroups[s.source]) expoGroups[s.source] = [];
    expoGroups[s.source].push(s);
  }
  // Flatten, de-dup by source (take the first non-kid-mode line per source as the "normal" rate)
  const expos: ExpoSummary[] = Object.values(expoGroups)
    .map((group) => group.find((e) => !e.kidMode) ?? group[0])
    .filter(Boolean) as ExpoSummary[];

  // Protocol
  const mod = model.moduleData?.['0'];
  let protocol = 'No module';
  if (mod) {
    if (mod.type === 'TYPE_MULTIMODULE' || mod.type === 'multi') {
      const { protocol: proto } = parseSubType(mod.subType);
      protocol = `${protocolName(proto)} via Multimodule`;
    } else {
      protocol = mod.type.replace('TYPE_', '');
    }
  }

  // Kid mode
  const fm1 = model.flightModeData?.['1'];
  const kidMode = fm1
    ? { active: true, triggerSwitch: fm1.swtch && fm1.swtch !== 'NONE' ? fm1.swtch : undefined }
    : { active: false };

  // Timers
  const timerCount = Object.keys(model.timers ?? {}).length;

  // Non-default flight modes
  const flightModeCount = Object.keys(model.flightModeData ?? {}).length;

  return { protocol, channels, expos, kidMode, timerCount, flightModeCount };
}
