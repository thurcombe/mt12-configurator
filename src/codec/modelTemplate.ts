import type { Model } from '../types/model.ts';

const GVARS_DEFAULT = Object.fromEntries(
  Array.from({ length: 9 }, (_, i) => [String(i), { val: 0 }]),
);

export function createBlankModel(name = ''): Model {
  return {
    semver: '2.10.0',
    header: { name },
    timers: {},
    telemetryProtocol: 0,
    thrTrim: 0,
    noGlobalFunctions: 0,
    displayTrims: 0,
    ignoreSensorIds: 0,
    trimInc: 0,
    disableThrottleWarning: 0,
    displayChecklist: 0,
    extendedLimits: 0,
    extendedTrims: 0,
    throttleReversed: 0,
    enableCustomThrottleWarning: 0,
    disableTelemetryWarning: 0,
    showInstanceIds: 0,
    checklistInteractive: 0,
    hatsMode: 'TRIMS_ONLY',
    customThrottleWarningPosition: 0,
    beepANACenter: 0,
    mixData: [],
    expoData: [],
    logicalSw: {},
    customFn: {},
    flightModeData: {
      '0': {
        trim: {},
        name: '',
        swtch: 'NONE',
        fadeIn: 0,
        fadeOut: 0,
        gvars: GVARS_DEFAULT,
      },
    },
    thrTraceSrc: 'TH',
    switchWarningState: '',
    rssiSource: 'none',
    rfAlarms: { warning: 45, critical: 42 },
    thrTrimSw: 0,
    potsWarnMode: 'WARN_OFF',
    jitterFilter: 'GLOBAL',
    moduleData: {
      '0': {
        type: 'TYPE_MULTIMODULE',
        subType: '43,0',
        channelsStart: 0,
        channelsCount: 16,
        failsafeMode: 'NOT_SET',
        mod: {
          multi: {
            disableTelemetry: 0,
            disableMapping: 0,
            autoBindMode: 0,
            lowPowerMode: 0,
            receiverTelemetryOff: 0,
            receiverHigherChannels: 0,
            optionValue: 0,
          },
        },
      },
    },
    inputNames: {},
    potsWarnEnabled: 0,
    view: 0,
    modelRegistrationID: '',
    usbJoystickExtMode: 0,
    usbJoystickIfMode: 'JOYSTICK',
    usbJoystickCircularCut: 0,
    radioGFDisabled: 'GLOBAL',
    radioTrainerDisabled: 'GLOBAL',
    modelHeliDisabled: 'GLOBAL',
    modelFMDisabled: 'GLOBAL',
    modelCurvesDisabled: 'GLOBAL',
    modelGVDisabled: 'GLOBAL',
    modelLSDisabled: 'GLOBAL',
    modelSFDisabled: 'GLOBAL',
    modelCustomScriptsDisabled: 'GLOBAL',
    modelTelemetryDisabled: 'GLOBAL',
  };
}

// Find the lowest free model slot key (model00..model59).
export function findFreeSlot(existingKeys: string[]): string | null {
  for (let i = 0; i < 60; i++) {
    const key = `model${String(i).padStart(2, '0')}`;
    if (!existingKeys.includes(key)) return key;
  }
  return null;
}
