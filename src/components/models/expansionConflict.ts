import type { Model } from '../../types/model.ts';
import type { ExpansionModuleType } from '../../hardware/mt12.ts';
import { EXPANSION_MODULES } from '../../hardware/mt12.ts';

export interface ExpansionConflict {
  controls: string[];                         // e.g. ['FL1', 'FL2', 'FL12'] or ['P3', 'P4']
  requiredFor: 'switch' | 'joystick' | 'both';
  installedModule: ExpansionModuleType;
}

// Human-readable descriptions of where each control is used, keyed by control name.
export type ControlUsageMap = Record<string, string[]>;

const SWITCH_POS_NAMES = ['↑', '—', '↓'];

/**
 * Converts a position code like "FL12" to a human-readable label like "FL1 ↓".
 * Falls back to "FL1 Pos N" for out-of-range indices.
 */
export function switchPosLabel(pos: string): string {
  const idx = parseInt(pos[3], 10);
  const ctrl = pos.slice(0, 3);
  return `${ctrl} ${SWITCH_POS_NAMES[idx] ?? `Pos ${idx}`}`;
}

/**
 * Maps a switch position, mix/expo source, or conflict-control string to the base
 * expansion control it depends on (FL1/FL2/P3/P4), or null if it references none.
 * Handles negation ("!FL10" → "FL1") and position suffixes ("FL12" → "FL1").
 */
export function refControl(ref: string | undefined | null): string | null {
  if (!ref) return null;
  const s = ref.startsWith('!') ? ref.slice(1) : ref;
  const m = s.match(/^(FL[12]|P[34])/);
  return m ? m[1] : null;
}

const SWITCH_MODULES = new Set<ExpansionModuleType>(['switch_dual3', 'switch_3and2', 'switch_dual2']);

interface ScanResult {
  switchControls:  Set<string>;  // 'FL1' | 'FL2'
  switchPositions: Set<string>;  // 'FL12', 'FL22' etc
  joystickControls: Set<string>; // 'P3' | 'P4'
  usages: ControlUsageMap;
}

function addUsage(usages: ControlUsageMap, control: string, label: string) {
  if (!usages[control]) usages[control] = [];
  if (!usages[control].includes(label)) usages[control].push(label);
}

function scanModel(model: Model): ScanResult {
  const switchControls   = new Set<string>();
  const switchPositions  = new Set<string>();
  const joystickControls = new Set<string>();
  const usages: ControlUsageMap = {};

  function checkSrc(src: string | undefined, context: string) {
    if (!src) return;
    if (src === 'FL1') { switchControls.add('FL1');  addUsage(usages, 'FL1', context); }
    if (src === 'FL2') { switchControls.add('FL2');  addUsage(usages, 'FL2', context); }
    if (src === 'P3')  { joystickControls.add('P3'); addUsage(usages, 'P3',  context); }
    if (src === 'P4')  { joystickControls.add('P4'); addUsage(usages, 'P4',  context); }
  }

  function checkSwitch(sw: string | undefined, context: string) {
    if (!sw) return;
    const m1 = sw.match(/FL(1)(\d)/);
    if (m1) {
      const pos = `FL1${m1[2]}`;
      switchControls.add('FL1'); switchPositions.add(pos);
      addUsage(usages, 'FL1', context); addUsage(usages, pos, context);
    }
    const m2 = sw.match(/FL(2)(\d)/);
    if (m2) {
      const pos = `FL2${m2[2]}`;
      switchControls.add('FL2'); switchPositions.add(pos);
      addUsage(usages, 'FL2', context); addUsage(usages, pos, context);
    }
  }

  for (const line of model.mixData ?? []) {
    const label = line.name ? `mix "${line.name}"` : 'unnamed mix';
    checkSrc(line.srcRaw, `${label} source`);
    checkSwitch(line.swtch, `${label} condition`);
  }
  for (const line of model.expoData ?? []) {
    const label = line.name ? `expo "${line.name}"` : 'unnamed expo';
    checkSrc(line.srcRaw, `${label} source`);
    checkSwitch(line.swtch, `${label} condition`);
  }
  for (const [, fm] of Object.entries(model.flightModeData ?? {})) {
    const label = fm.name ? `drive mode "${fm.name}"` : 'unnamed drive mode';
    checkSwitch(fm.swtch, `${label} condition`);
  }
  for (const [idx, ls] of Object.entries(model.logicalSw ?? {})) {
    const lsRef = `L${parseInt(idx) + 1}`;
    const lsSrcKey = `ls(${parseInt(idx) + 1})`;
    // Find a mix that uses this logical switch (as swtch condition OR as srcRaw source).
    const referencingMix = model.mixData?.find(l => {
      const s = l.swtch ?? '';
      return s === lsRef || s === `!${lsRef}` || l.srcRaw === lsSrcKey;
    });
    const label = referencingMix?.name ? `"${referencingMix.name}" switch` : lsRef;
    for (const arg of (ls.def ?? '').split(',')) checkSwitch(arg.trim(), `${label} condition`);
    checkSwitch(ls.andsw, `${label} AND condition`);
  }
  for (const [idx, fn] of Object.entries(model.customFn ?? {})) {
    const label = `special function SF${parseInt(idx) + 1}`;
    checkSwitch((fn as { swtch?: string }).swtch, `${label} condition`);
  }

  return { switchControls, switchPositions, joystickControls, usages };
}

export function getExpansionConflict(model: Model, installedModule: ExpansionModuleType): ExpansionConflict | null {
  const { switchControls, switchPositions, joystickControls } = scanModel(model);

  const hasSwitchModule = SWITCH_MODULES.has(installedModule);
  const hasJoystick     = installedModule === 'joystick';

  const conflictSwitches = switchControls.size > 0 && !hasSwitchModule;
  const conflictJoystick = joystickControls.size > 0 && !hasJoystick;

  const overflowPositions: string[] = [];
  const flMax = EXPANSION_MODULES[installedModule].flMaxPositions;
  if (hasSwitchModule && flMax) {
    for (const pos of switchPositions) {
      const idx = parseInt(pos[3], 10);
      const sw  = pos.slice(0, 3);
      const max = sw === 'FL1' ? flMax.FL1 : flMax.FL2;
      if (idx > max) overflowPositions.push(pos);
    }
  }

  if (!conflictSwitches && !conflictJoystick && overflowPositions.length === 0) return null;

  const controls: string[] = [
    ...(conflictSwitches  ? [...switchControls].sort()   : []),
    ...(conflictJoystick  ? [...joystickControls].sort() : []),
    ...overflowPositions.sort(),
  ];

  const requiredFor: ExpansionConflict['requiredFor'] =
    (conflictSwitches || overflowPositions.length > 0) && conflictJoystick ? 'both'
    : conflictJoystick ? 'joystick'
    : 'switch';

  return { controls, requiredFor, installedModule };
}

/** True if the model references FL1 or FL2 in any capacity. */
export function modelUsesFlexSwitches(model: Model): boolean {
  const { switchControls } = scanModel(model);
  return switchControls.size > 0;
}

/**
 * Returns a map of control → usage descriptions for use in warnings.
 * e.g. { FL2: ['mix "Cruise" source', 'drive mode "KidControl" condition'] }
 */
export function getControlUsages(model: Model): ControlUsageMap {
  return scanModel(model).usages;
}

export function expansionConflictLabel(conflict: ExpansionConflict): string {
  const moduleName = conflict.installedModule === 'none'
    ? 'no module'
    : EXPANSION_MODULES[conflict.installedModule].label;

  // Separate hard-missing controls from position-overflow references (e.g. FL12, FL22)
  const posOverflow = conflict.controls.filter(c => /^FL[12]\d$/.test(c));
  const missing     = conflict.controls.filter(c => !/^FL[12]\d$/.test(c));

  const parts: string[] = [];

  if (missing.length > 0) {
    const ctrlList = missing.join(', ');
    const verb = conflict.installedModule === 'none'
      ? `${ctrlList} ${missing.length > 1 ? 'are' : 'is'} used in this model but no module is installed — those mixes and switch conditions will be inactive`
      : `${ctrlList} ${missing.length > 1 ? 'are' : 'is'} used in this model but ${moduleName} doesn't provide ${missing.length > 1 ? 'them' : 'it'} — those mixes and switch conditions will be inactive`;
    parts.push(verb);
  }

  if (posOverflow.length > 0) {
    const labels = posOverflow.map(switchPosLabel);
    const first = labels[0];
    const extra = labels.length - 1;
    const ctrlStr = extra > 2
      ? `${first} (+ ${extra} other${extra > 1 ? 's' : ''})`
      : labels.join(', ');
    parts.push(`${ctrlStr} ${labels.length > 1 ? 'are' : 'is'} not available on ${moduleName} — ${labels.length > 1 ? 'those conditions' : 'that condition'} will never trigger`);
  }

  return parts.join('. ');
}

/**
 * Returns warn/warnTitle for a single switch or source reference.
 * Spread directly onto SwitchPicker or SrcRawPicker props.
 */
export function warnForRef(
  ref: string | undefined | null,
  conflict: ExpansionConflict | null,
): { warn: boolean; warnTitle?: string } {
  if (!ref || !conflict) return { warn: false };
  const norm = ref.startsWith('!') ? ref.slice(1) : ref;
  const ctrl = refControl(ref);
  if (!ctrl) return { warn: false };
  const moduleLabel = conflict.installedModule === 'none'
    ? 'no module installed'
    : EXPANSION_MODULES[conflict.installedModule].label;
  if (/^FL[12]\d$/.test(norm) && conflict.controls.includes(norm)) {
    return { warn: true, warnTitle: `${switchPosLabel(norm)} is not available on ${moduleLabel} — this condition will never trigger.` };
  }
  if (conflict.controls.includes(ctrl)) {
    return { warn: true, warnTitle: `${ctrl} isn't provided by the installed expansion module (${moduleLabel}). Its mixes and switch conditions will be inactive until the module is changed back or this model is updated.` };
  }
  return { warn: false };
}
