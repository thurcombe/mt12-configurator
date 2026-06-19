import type { Model } from '../../types/model.ts';
import type { ExpansionModuleType } from '../../hardware/mt12.ts';
import { EXPANSION_MODULES } from '../../hardware/mt12.ts';

export interface ExpansionConflict {
  controls: string[];                         // e.g. ['FL1', 'FL2'] or ['P3', 'P4']
  requiredFor: 'switch' | 'joystick' | 'both';
  installedModule: ExpansionModuleType;
}

const SWITCH_MODULES = new Set<ExpansionModuleType>(['switch_dual3', 'switch_3and2', 'switch_dual2']);

function scanModel(model: Model): { switchControls: Set<string>; joystickControls: Set<string> } {
  const switchControls = new Set<string>();
  const joystickControls = new Set<string>();

  function checkSrc(src: string | undefined) {
    if (!src) return;
    if (src === 'FL1') switchControls.add('FL1');
    if (src === 'FL2') switchControls.add('FL2');
    if (src === 'P3')  joystickControls.add('P3');
    if (src === 'P4')  joystickControls.add('P4');
  }

  // Switch references appear as e.g. "FL10", "FL11", "FL12", "!FL10"
  function checkSwitch(sw: string | undefined) {
    if (!sw) return;
    if (/FL1\d/.test(sw)) switchControls.add('FL1');
    if (/FL2\d/.test(sw)) switchControls.add('FL2');
  }

  for (const line of model.mixData ?? []) {
    checkSrc(line.srcRaw);
    checkSwitch(line.swtch);
  }
  for (const line of model.expoData ?? []) {
    checkSrc(line.srcRaw);
    checkSwitch(line.swtch);
  }
  for (const fm of Object.values(model.flightModeData ?? {})) {
    checkSwitch(fm.swtch);
  }
  for (const ls of Object.values(model.logicalSw ?? {})) {
    checkSwitch(ls.def);
    checkSwitch(ls.andsw);
  }
  for (const fn of Object.values(model.customFn ?? {})) {
    checkSwitch((fn as { swtch?: string }).swtch);
  }

  return { switchControls, joystickControls };
}

export function getExpansionConflict(model: Model, installedModule: ExpansionModuleType): ExpansionConflict | null {
  const { switchControls, joystickControls } = scanModel(model);

  const hasSwitchModule = SWITCH_MODULES.has(installedModule);
  const hasJoystick     = installedModule === 'joystick';

  const conflictSwitches  = switchControls.size  > 0 && !hasSwitchModule;
  const conflictJoystick  = joystickControls.size > 0 && !hasJoystick;

  if (!conflictSwitches && !conflictJoystick) return null;

  const controls: string[] = [
    ...(conflictSwitches  ? [...switchControls].sort()  : []),
    ...(conflictJoystick  ? [...joystickControls].sort() : []),
  ];

  const requiredFor: ExpansionConflict['requiredFor'] =
    conflictSwitches && conflictJoystick ? 'both'
    : conflictSwitches ? 'switch'
    : 'joystick';

  return { controls, requiredFor, installedModule };
}

export function expansionConflictLabel(conflict: ExpansionConflict): string {
  const installed = conflict.installedModule === 'none'
    ? 'no module installed'
    : `${EXPANSION_MODULES[conflict.installedModule].label} installed`;
  return `Uses ${conflict.controls.join(', ')} — ${installed}`;
}
