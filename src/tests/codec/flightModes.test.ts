import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parseModel, serialiseModel } from '../../codec/model-codec.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, '../fixtures');

describe('flightModes preservation', () => {
  it('parses 000000000 as the string "000000000" not integer 0', () => {
    const yaml = readFileSync(join(fixtures, 'model00.yml'), 'utf8');
    const model = parseModel(yaml);
    for (const line of model.mixData) {
      expect(typeof line.flightModes).toBe('string');
      expect(line.flightModes).toMatch(/^\d{9}$/);
    }
    for (const line of model.expoData) {
      expect(typeof line.flightModes).toBe('string');
      expect(line.flightModes).toMatch(/^\d{9}$/);
    }
  });

  it('round-trips flightModes = 000000000 without losing leading zeros', () => {
    const input = `
semver: 2.10.0
header:
   name: "TestModel"
timers: {}
telemetryProtocol: 0
thrTrim: 0
noGlobalFunctions: 0
displayTrims: 0
ignoreSensorIds: 0
trimInc: 0
disableThrottleWarning: 0
displayChecklist: 0
extendedLimits: 0
extendedTrims: 0
throttleReversed: 0
enableCustomThrottleWarning: 0
disableTelemetryWarning: 0
showInstanceIds: 0
checklistInteractive: 0
hatsMode: GLOBAL
customThrottleWarningPosition: 0
beepANACenter: 0
mixData:
 -
   weight: 100
   destCh: 0
   srcRaw: TH
   carryTrim: 0
   mixWarn: 0
   mltpx: ADD
   offset: 0
   swtch: "NONE"
   flightModes: 000000000
   delayUp: 0
   delayDown: 0
   speedUp: 0
   speedDown: 0
   name: ""
expoData: []
logicalSw: {}
customFn: {}
flightModeData: {}
thrTraceSrc: TH
switchWarningState: ""
rssiSource: none
rfAlarms:
   warning: 45
   critical: 42
thrTrimSw: 0
potsWarnMode: WARN_OFF
jitterFilter: GLOBAL
moduleData: {}
inputNames: {}
potsWarnEnabled: 0
view: 0
modelRegistrationID: ""
usbJoystickExtMode: 0
usbJoystickIfMode: JOYSTICK
usbJoystickCircularCut: 0
radioGFDisabled: GLOBAL
radioTrainerDisabled: GLOBAL
modelHeliDisabled: GLOBAL
modelFMDisabled: GLOBAL
modelCurvesDisabled: GLOBAL
modelGVDisabled: GLOBAL
modelLSDisabled: GLOBAL
modelSFDisabled: GLOBAL
modelCustomScriptsDisabled: GLOBAL
modelTelemetryDisabled: GLOBAL
`;
    const model = parseModel(input);
    expect(model.mixData[0].flightModes).toBe('000000000');

    const out = serialiseModel(model);
    // Must emit without YAML quotes so EdgeTX can read it as the octal-like string.
    expect(out).toMatch(/flightModes: 000000000/);
    expect(out).not.toMatch(/flightModes: '000000000'/);
    expect(out).not.toMatch(/flightModes: "000000000"/);
  });

  it('round-trips octal-ambiguous flightModes like 010000000 correctly', () => {
    // This would be corrupted to 2097152 if we let js-yaml parse as octal.
    const input = `
semver: 2.10.0
header:
   name: "Test"
timers: {}
telemetryProtocol: 0
thrTrim: 0
noGlobalFunctions: 0
displayTrims: 0
ignoreSensorIds: 0
trimInc: 0
disableThrottleWarning: 0
displayChecklist: 0
extendedLimits: 0
extendedTrims: 0
throttleReversed: 0
enableCustomThrottleWarning: 0
disableTelemetryWarning: 0
showInstanceIds: 0
checklistInteractive: 0
hatsMode: GLOBAL
customThrottleWarningPosition: 0
beepANACenter: 0
mixData:
 -
   weight: 100
   destCh: 0
   srcRaw: TH
   carryTrim: 0
   mixWarn: 0
   mltpx: ADD
   offset: 0
   swtch: "NONE"
   flightModes: 010000000
   delayUp: 0
   delayDown: 0
   speedUp: 0
   speedDown: 0
   name: ""
expoData: []
logicalSw: {}
customFn: {}
flightModeData: {}
thrTraceSrc: TH
switchWarningState: ""
rssiSource: none
rfAlarms:
   warning: 45
   critical: 42
thrTrimSw: 0
potsWarnMode: WARN_OFF
jitterFilter: GLOBAL
moduleData: {}
inputNames: {}
potsWarnEnabled: 0
view: 0
modelRegistrationID: ""
usbJoystickExtMode: 0
usbJoystickIfMode: JOYSTICK
usbJoystickCircularCut: 0
radioGFDisabled: GLOBAL
radioTrainerDisabled: GLOBAL
modelHeliDisabled: GLOBAL
modelFMDisabled: GLOBAL
modelCurvesDisabled: GLOBAL
modelGVDisabled: GLOBAL
modelLSDisabled: GLOBAL
modelSFDisabled: GLOBAL
modelCustomScriptsDisabled: GLOBAL
modelTelemetryDisabled: GLOBAL
`;
    const model = parseModel(input);
    expect(model.mixData[0].flightModes).toBe('010000000');

    const out = serialiseModel(model);
    expect(out).toMatch(/flightModes: 010000000/);
  });

  it('all model00.yml flightModes serialise without YAML quotes', () => {
    const yaml = readFileSync(join(fixtures, 'model00.yml'), 'utf8');
    const model = parseModel(yaml);
    const out = serialiseModel(model);
    expect(out).not.toMatch(/flightModes: '[^']+'/);
    expect(out).not.toMatch(/flightModes: "[^"]+"/);
  });
});
