export interface LimitData {
  min: number;
  max: number;
  offset: number;
  invert: number;
  name?: string;
  ppmCenter?: number;
  symetrical?: number;
}

export interface CurveRef {
  type: number;
  value: number;
}

export interface MixLine {
  weight: number;
  destCh: number;
  srcRaw: string;
  carryTrim: number;
  mixWarn: number;
  mltpx: string;
  offset: number;
  swtch: string;
  flightModes: string;
  delayUp: number;
  delayDown: number;
  speedUp: number;
  speedDown: number;
  name: string;
}

export interface ExpoLine {
  mode: number;
  scale: number;
  trimSource: number;
  srcRaw: string;
  chn: number;
  swtch: string;
  flightModes: string;
  weight: number;
  name: string;
  offset: number;
  curve: CurveRef;
}

export interface LogicalSw {
  func: string;
  def: string;
  andsw: string;
  delay: number;
  duration: number;
}

export interface CustomFn {
  swtch: string;
  func: string;
  def: string;
}

export interface GVar {
  val: number;
}

export interface TrimData {
  value: number;
  mode: number;
}

export interface FlightModeData {
  trim: Record<string, TrimData>;
  name: string;
  swtch: string;
  fadeIn: number;
  fadeOut: number;
  gvars: Record<string, GVar>;
}

export interface MultiModuleOptions {
  disableTelemetry: number;
  disableMapping: number;
  autoBindMode: number;
  lowPowerMode: number;
  receiverTelemetryOff: number;
  receiverHigherChannels: number;
  optionValue: number;
}

export interface CrsfModuleOptions {
  telemetryBaudrate: number;
}

export interface ModuleData {
  type: string;
  subType: string | number;
  channelsStart: number;
  channelsCount: number;
  failsafeMode: string;
  mod: Record<string, unknown>;
}

export interface Timer {
  start: number;
  swtch: string;
  value: number;
  mode: string | number;
  countdownBeep: number;
  minuteBeep: number;
  persistent: number;
  countdownStart: number;
  showElapsed: number;
  extraHaptic: number;
  name: string;
}

export interface InputName {
  val: string;
}

export interface CurveData {
  type: number;
  smooth: number;
  points: number;
  name: string;
}

export interface PointData {
  val: number;
}

export interface TelemetrySensorId {
  id?: number;
  instance?: number;
}

export interface TelemetrySensor {
  id1: TelemetrySensorId;
  id2: TelemetrySensorId;
  label: string;
  subId: number;
  type: string;
  unit: number;
  prec: number;
  autoOffset: number;
  filter: number;
  logs: number;
  persistent: number;
  onlyPositive: number;
  cfg: Record<string, unknown>;
}

export interface TrainerMixLine {
  srcChn: number;
  mode: string;
  studWeight: number;
}

export interface TrainerData {
  mode: string;
  channelsStart: number;
  channelsCount: number;
  frameLength: number;
  delay: number;
  pulsePol: number;
}

export interface RfAlarms {
  warning: number;
  critical: number;
}

export interface Model {
  semver: string;
  header: { name: string };
  timers: Record<string, Timer>;
  telemetryProtocol: number;
  thrTrim: number;
  noGlobalFunctions: number;
  displayTrims: number;
  ignoreSensorIds: number;
  trimInc: number;
  disableThrottleWarning: number;
  displayChecklist: number;
  extendedLimits: number;
  extendedTrims: number;
  throttleReversed: number;
  enableCustomThrottleWarning: number;
  disableTelemetryWarning: number;
  showInstanceIds: number;
  checklistInteractive: number;
  hatsMode: string;
  customThrottleWarningPosition: number;
  beepANACenter: number;
  limitData?: LimitData[];
  mixData: MixLine[];
  expoData: ExpoLine[];
  curves?: Record<string, CurveData>;
  points?: Record<string, PointData>;
  logicalSw: Record<string, LogicalSw>;
  customFn: Record<string, CustomFn>;
  flightModeData: Record<string, FlightModeData>;
  thrTraceSrc: string;
  switchWarningState: string;
  rssiSource: string;
  rfAlarms: RfAlarms;
  thrTrimSw: number;
  potsWarnMode: string;
  jitterFilter: string;
  moduleData: Record<string, ModuleData>;
  trainerData?: TrainerData;
  inputNames: Record<string, InputName>;
  potsWarnEnabled: number;
  telemetrySensors?: Record<string, TelemetrySensor>;
  screens?: Record<string, unknown>;
  view: number;
  modelRegistrationID: string;
  usbJoystickExtMode: number;
  usbJoystickIfMode: string;
  usbJoystickCircularCut: number;
  radioGFDisabled: string;
  radioTrainerDisabled: string;
  modelHeliDisabled: string;
  modelFMDisabled: string;
  modelCurvesDisabled: string;
  modelGVDisabled: string;
  modelLSDisabled: string;
  modelSFDisabled: string;
  modelCustomScriptsDisabled: string;
  modelTelemetryDisabled: string;
}
