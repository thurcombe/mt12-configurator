export interface CalibData {
  mid: number;
  spanNeg: number;
  spanPos: number;
}

export interface TrainerMixLine {
  srcChn: number;
  mode: string;
  studWeight: number;
}

export interface RadioCustomFn {
  swtch: string;
  func: string;
  def: string;
}

export interface SerialPortConfig {
  mode: string;
  power: number;
}

export interface PotConfig {
  type: string;
  inv: number;
  name: string;
}

export interface SwitchConfig {
  type: string;
  name: string;
}

export interface SwitchFlex {
  channel: string;
}

export interface Radio {
  manuallyEdited: number;
  timezoneMinutes: number;
  hatsMode: string;
  ppmunit: number;
  semver: string;
  board: string;
  calib: Record<string, CalibData>;
  currModel: number;
  contrast: number;
  vBatWarn: number;
  txVoltageCalibration: number;
  backlightMode: string;
  antennaMode: string;
  disableRtcWarning: number;
  keysBacklight: number;
  dontPlayHello: number;
  internalModule: string;
  trainer: {
    mix: Record<string, TrainerMixLine>;
  };
  view: number;
  fai: number;
  beepMode: string;
  alarmsFlash: number;
  disableMemoryWarning: number;
  disableAlarmWarning: number;
  stickMode: number;
  timezone: number;
  adjustRTC: number;
  inactivityTimer: number;
  internalModuleBaudrate: number;
  splashMode: number;
  hapticMode: string;
  switchesDelay: number;
  lightAutoOff: number;
  templateSetup: number;
  PPM_Multiplier: number;
  hapticLength: number;
  beepLength: number;
  hapticStrength: number;
  gpsFormat: number;
  audioMuteEnable: number;
  speakerPitch: number;
  speakerVolume: number;
  vBatMin: number;
  vBatMax: number;
  backlightBright: number;
  globalTimer: number;
  bluetoothBaudrate: number;
  bluetoothMode: string;
  countryCode: number;
  pwrOnSpeed: number;
  pwrOffSpeed: number;
  noJitterFilter: number;
  imperial: number;
  disableRssiPoweroffAlarm: number;
  USBMode: number;
  jackMode: number;
  ttsLanguage: string;
  beepVolume: number;
  wavVolume: number;
  varioVolume: number;
  backgroundVolume: number;
  varioPitch: number;
  varioRange: number;
  varioRepeat: number;
  customFn: Record<string, RadioCustomFn>;
  serialPort: Record<string, SerialPortConfig>;
  potsConfig: Record<string, PotConfig>;
  switchConfig: Record<string, SwitchConfig>;
  switchesFlex?: Record<string, SwitchFlex>;
  backlightColor: number;
  bluetoothName: string;
  ownerRegistrationID: string;
  rotEncMode: number;
  uartSampleMode: number;
  radioGFDisabled: number;
  radioTrainerDisabled: number;
  modelHeliDisabled: number;
  modelFMDisabled: number;
  modelCurvesDisabled: number;
  modelGVDisabled: number;
  modelLSDisabled: number;
  modelSFDisabled: number;
  modelCustomScriptsDisabled: number;
  modelTelemetryDisabled: number;
}
