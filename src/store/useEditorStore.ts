import { create } from 'zustand';
import type { SdRoot } from '../fs/sdcard.ts';
import { pickSdCard, readTextFile, writeTextFile, listModelFiles, deleteFile, deleteModelImage, writeBinaryFile, findModelImages, findImages } from '../fs/sdcard.ts';
import { createMemoryRoot } from '../fs/memoryFs.ts';
import SD_TEMPLATE from '../data/sd-template.json';
import { BUILT_IN_CATEGORIES, type VehicleCategory } from '../data/vehicleTypes.ts';
import { writeBackup, listBackups, listAllBackups, readBackup } from '../fs/backup.ts';
import type { BackupEntry } from '../fs/backup.ts';
import { readWebConfig, writeWebConfig } from '../fs/webconfig.ts';
import { parseModel, serialiseModel } from '../codec/model-codec.ts';
import { parseRadio, serialiseRadio } from '../codec/radio-codec.ts';
import { createBlankModel } from '../codec/modelTemplate.ts';
import { downloadYaml } from '../fs/download.ts';
import type { Model } from '../types/model.ts';
import type { Radio } from '../types/radio.ts';

// Model slot key: 'model00', 'model01', etc. (no .yml extension).
export type ModelKey = string;

const MODEL_KEY_RE = /^model\d+$/;
export function assertValidModelKey(key: string): void {
  if (!MODEL_KEY_RE.test(key)) throw new Error(`Invalid model key: "${key}"`);
}

const ALLOWED_IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp']);
export function safeImageExt(filename: string): string {
  const dot = filename.lastIndexOf('.');
  const ext = dot >= 0 ? filename.slice(dot).toLowerCase() : '';
  return ALLOWED_IMAGE_EXTS.has(ext) ? ext : '.png';
}

export interface AppSettings {
  backupCount: number;
}

const DEFAULT_SETTINGS: AppSettings = { backupCount: 5 };
const SETTINGS_WEBCONFIG = 'app-settings.json';

function friendlyError(e: unknown, context?: string): string {
  if (e instanceof DOMException) {
    if (e.name === 'NotAllowedError') return 'SD card permission denied — reconnect and try again.';
    if (e.name === 'NotFoundError') return `File not found${context ? ` (${context})` : ''}.`;
    if (e.name === 'AbortError') return '';
    return `Browser error: ${e.message}`;
  }
  if (e instanceof Error) {
    if (e.name === 'YAMLException') {
      const shortMsg = e.message.split('\n')[0];
      return `Invalid YAML${context ? ` in ${context}` : ''}: ${shortMsg}`;
    }
    return e.message;
  }
  return String(e);
}

interface EditorState {
  // Connection
  sdRoot: SdRoot | null;

  // Data
  models: Record<ModelKey, Model>;
  radio: Radio | null;

  // Dirty tracking — keys are ModelKey or 'radio'
  dirty: Set<string>;
  // Keys created fresh this session (never saved to disk) — cleaned up on confirm-leave
  freshModelKeys: Set<string>;

  // Model images — object URLs keyed by model slot key
  modelImages: Record<ModelKey, string>;
  pendingModelImageFiles: Record<ModelKey, File>;
  loadModelImages: () => Promise<void>;
  uploadModelImage: (key: ModelKey, file: File) => Promise<void>;
  revertModelImage: (key: ModelKey, prevFile: File | null, wasAlreadyDirty: boolean) => Promise<void>;

  // Per-model app metadata — stored in .webconfig/model-meta.json
  modelMeta: Record<ModelKey, { scale?: string; vehicleType?: string; power?: 'battery' | 'fuel' }>;
  setModelScale: (key: ModelKey, scale: string) => Promise<void>;
  setModelVehicleType: (key: ModelKey, vehicleType: string) => Promise<void>;
  setModelPower: (key: ModelKey, power: 'battery' | 'fuel' | '') => Promise<void>;

  // Vehicle categories (built-in + custom) — custom stored in .webconfig/vehicle-categories.json
  vehicleCategories: VehicleCategory[];
  vehicleTypeImages: Record<string, string>;  // category id → object URL
  loadVehicleCategories: () => Promise<void>;
  saveCustomVehicleCategory: (cat: VehicleCategory) => Promise<void>;
  deleteCustomVehicleCategory: (id: string) => Promise<void>;
  uploadVehicleTypeImage: (typeId: string, file: File) => Promise<void>;

  // Diagram highlight — any component can set this to highlight a control on the MT12 diagram
  diagramHighlight: string | null;
  setDiagramHighlight: (control: string | null) => void;

  // Error / warning state
  lastError: string | null;
  warnings: string[];

  // App settings (persisted to localStorage)
  settings: AppSettings;

  // Actions — SD card
  connectSdCard: () => Promise<void>;
  disconnectSdCard: () => void;

  // Actions — models
  loadAllModels: () => Promise<void>;
  loadModel: (key: ModelKey) => Promise<void>;
  saveModel: (key: ModelKey) => Promise<void>;
  saveAllModels: () => Promise<void>;
  updateModel: (key: ModelKey, updater: (m: Model) => Model) => void;
  createModel: (key: ModelKey, name?: string) => void;
  duplicateModel: (sourceKey: ModelKey, destKey: ModelKey) => Promise<void>;
  deleteModel: (key: ModelKey) => Promise<void>;
  importModelFromYaml: (key: ModelKey, yaml: string) => Promise<void>;

  // Actions — radio
  loadRadio: () => Promise<void>;
  saveRadio: () => Promise<void>;
  updateRadio: (updater: (r: Radio) => Radio) => void;

  // Actions — backups
  backupModel: (key: ModelKey) => Promise<void>;
  backupRadio: () => Promise<void>;
  listBackups: (modelName: string) => Promise<BackupEntry[]>;
  listAllBackups: () => Promise<BackupEntry[]>;
  restoreBackup: (key: ModelKey, entry: BackupEntry) => Promise<void>;
  deleteBackup: (entry: BackupEntry) => Promise<void>;
  restoreRadioBackup: (entry: BackupEntry) => Promise<void>;

  // Actions — save all
  saveAll: () => Promise<void>;

  // Actions — settings
  updateSettings: (patch: Partial<AppSettings>) => void;

  // Remove a never-saved model from memory without touching the SD card
  discardFreshModel: (key: ModelKey) => void;

  // Revert (discard unsaved edits and restore from disk)
  revertModel: (key: ModelKey) => Promise<void>;
  revertRadio: () => Promise<void>;

  // Helpers
  isDirty: (key: string) => boolean;
  clearError: () => void;
  clearWarnings: () => void;
}

function modelNameFromModel(model: Model): string {
  return model.header?.name ?? 'unknown';
}

export const useEditorStore = create<EditorState>((set, get) => ({
  sdRoot: null,
  models: {},
  radio: null,
  dirty: new Set(),
  freshModelKeys: new Set(),
  lastError: null,
  warnings: [],
  settings: DEFAULT_SETTINGS,
  modelImages: {},
  pendingModelImageFiles: {},
  modelMeta: {},
  vehicleCategories: BUILT_IN_CATEGORIES,
  vehicleTypeImages: {},
  diagramHighlight: null,
  setDiagramHighlight: (control) => set({ diagramHighlight: control }),

  loadModelImages: async () => {
    const { sdRoot, models, pendingModelImageFiles } = get();
    if (!sdRoot) return;
    const keys = Object.keys(models);
    if (keys.length === 0) return;
    try {
      const images = await findModelImages(sdRoot, keys);
      // Don't overwrite object URLs for keys with pending (unsaved) image changes.
      const filtered = Object.fromEntries(
        Object.entries(images).filter(([k]) => !pendingModelImageFiles[k as ModelKey])
      ) as Record<ModelKey, string>;
      set((s) => ({ modelImages: { ...s.modelImages, ...filtered } }));
    } catch { /* ignore */ }
  },

  uploadModelImage: async (key, file) => {
    assertValidModelKey(key);
    const url = URL.createObjectURL(file);
    set((s) => {
      if (s.modelImages[key]) URL.revokeObjectURL(s.modelImages[key]);
      const dirty = new Set(s.dirty);
      dirty.add(key);
      return {
        pendingModelImageFiles: { ...s.pendingModelImageFiles, [key]: file },
        modelImages: { ...s.modelImages, [key]: url },
        dirty,
      };
    });
  },

  revertModelImage: async (key, prevFile, wasAlreadyDirty) => {
    set((s) => {
      const modelImages = { ...s.modelImages };
      const pendingModelImageFiles = { ...s.pendingModelImageFiles };
      const dirty = new Set(s.dirty);
      if (modelImages[key]) URL.revokeObjectURL(modelImages[key]);
      if (prevFile) {
        modelImages[key] = URL.createObjectURL(prevFile);
        pendingModelImageFiles[key] = prevFile;
      } else {
        delete modelImages[key];
        delete pendingModelImageFiles[key];
        if (!wasAlreadyDirty) dirty.delete(key);
      }
      return { modelImages, pendingModelImageFiles, dirty };
    });
    if (!prevFile) {
      const { sdRoot } = get();
      if (sdRoot) {
        try {
          const images = await findModelImages(sdRoot, [key]);
          set((s) => ({ modelImages: { ...s.modelImages, ...images } }));
        } catch { /* ignore */ }
      }
    }
  },

  setModelScale: (key, scale) => {
    set((s) => {
      const modelMeta = { ...s.modelMeta, [key]: { ...(s.modelMeta[key] ?? {}), scale } };
      const dirty = new Set(s.dirty);
      dirty.add(key);
      return { modelMeta, dirty };
    });
  },

  setModelVehicleType: (key, vehicleType) => {
    set((s) => {
      const modelMeta = { ...s.modelMeta, [key]: { ...(s.modelMeta[key] ?? {}), vehicleType } };
      const dirty = new Set(s.dirty);
      dirty.add(key);
      return { modelMeta, dirty };
    });
  },

  setModelPower: (key, power) => {
    set((s) => {
      const entry = { ...(s.modelMeta[key] ?? {}) };
      if (power) entry.power = power as 'battery' | 'fuel';
      else delete entry.power;
      const modelMeta = { ...s.modelMeta, [key]: entry };
      const dirty = new Set(s.dirty);
      dirty.add(key);
      return { modelMeta, dirty };
    });
  },

  loadVehicleCategories: async () => {
    const { sdRoot } = get();
    const custom = sdRoot
      ? await readWebConfig<VehicleCategory[]>(sdRoot, 'vehicle-categories.json').catch(() => null)
      : null;
    const categories = [...BUILT_IN_CATEGORIES, ...(custom ?? []).map((c) => ({ ...c, custom: true }))];
    set({ vehicleCategories: categories });
    // Load type images
    if (sdRoot) {
      const ids = categories.map((c) => c.id);
      const images = await findImages(sdRoot, '.webconfig/vehicle-type-images', ids).catch(() => ({}));
      set({ vehicleTypeImages: images });
    }
  },

  saveCustomVehicleCategory: async (cat) => {
    const { sdRoot, vehicleCategories } = get();
    const existing = vehicleCategories.filter((c) => c.custom);
    const idx = existing.findIndex((c) => c.id === cat.id);
    const next = idx >= 0
      ? existing.map((c) => c.id === cat.id ? cat : c)
      : [...existing, cat];
    const updated = [...BUILT_IN_CATEGORIES, ...next.map((c) => ({ ...c, custom: true }))];
    set({ vehicleCategories: updated });
    if (sdRoot) writeWebConfig(sdRoot, 'vehicle-categories.json', next).catch(() => {});
  },

  deleteCustomVehicleCategory: async (id) => {
    const { sdRoot, vehicleCategories } = get();
    const updated = vehicleCategories.filter((c) => c.id !== id || !c.custom);
    set({ vehicleCategories: updated });
    const custom = updated.filter((c) => c.custom);
    if (sdRoot) writeWebConfig(sdRoot, 'vehicle-categories.json', custom).catch(() => {});
  },

  uploadVehicleTypeImage: async (typeId, file) => {
    const { sdRoot, vehicleTypeImages } = get();
    const ext = safeImageExt(file.name);
    const sdPath = `.webconfig/vehicle-type-images/${typeId}${ext}`;
    if (sdRoot) {
      const buf = await file.arrayBuffer();
      await writeBinaryFile(sdRoot, sdPath, buf);
    }
    if (vehicleTypeImages[typeId]) URL.revokeObjectURL(vehicleTypeImages[typeId]);
    set({ vehicleTypeImages: { ...vehicleTypeImages, [typeId]: URL.createObjectURL(file) } });
  },

  connectSdCard: async () => {
    try {
      const isDemo = new URLSearchParams(window.location.search).has('demo');
      const root = isDemo
        ? (createMemoryRoot(SD_TEMPLATE) as unknown as SdRoot)
        : await pickSdCard();
      set({ sdRoot: root, lastError: null });
      // Load settings from SD card webconfig.
      const saved = await readWebConfig<AppSettings>(root, SETTINGS_WEBCONFIG);
      if (saved) set({ settings: { ...DEFAULT_SETTINGS, ...saved } });
      // Load per-model metadata (scale, vehicleType, power etc.)
      const meta = await readWebConfig<Record<string, { scale?: string; vehicleType?: string; power?: 'battery' | 'fuel' }>>(root, 'model-meta.json');
      if (meta) set({ modelMeta: meta });
      // Load vehicle categories + type images
      get().loadVehicleCategories();
    } catch (e) {
      const msg = friendlyError(e);
      if (msg) set({ lastError: msg });

    }
  },

  disconnectSdCard: () => {
    const { modelImages, vehicleTypeImages } = get();
    Object.values(modelImages).forEach((url) => URL.revokeObjectURL(url));
    Object.values(vehicleTypeImages).forEach((url) => URL.revokeObjectURL(url));
    set({
      sdRoot: null,
      models: {},
      radio: null,
      dirty: new Set(),
      freshModelKeys: new Set(),
      modelImages: {},
      pendingModelImageFiles: {},
      modelMeta: {},
      vehicleCategories: BUILT_IN_CATEGORIES,
      vehicleTypeImages: {},
      lastError: null,
      warnings: [],
    });
  },

  loadAllModels: async () => {
    const { sdRoot } = get();
    if (!sdRoot) return;
    const newWarnings: string[] = [];
    try {
      const files = await listModelFiles(sdRoot);
      const updates: Record<ModelKey, Model> = {};
      for (const filename of files) {
        const key = filename.replace('.yml', '');
        try {
          const yaml = await readTextFile(sdRoot, `MODELS/${filename}`);
          updates[key] = parseModel(yaml);
        } catch (e) {
          const msg = friendlyError(e, filename);
          if (msg) newWarnings.push(`Skipped ${filename}: ${msg}`);
        }
      }
      set((s) => {
        // Any slot loaded from disk is no longer dirty or fresh.
        const freshModelKeys = new Set(s.freshModelKeys);
        for (const key of Object.keys(updates)) freshModelKeys.delete(key);
        // Rebuild model map from disk only, plus intentionally-created fresh models.
        // This ensures in-memory-only models (e.g. a restore to a new slot that was never
        // saved) are discarded when the user refreshes from card.
        const freshModels = Object.fromEntries(
          [...freshModelKeys].filter((k) => s.models[k]).map((k) => [k, s.models[k]!])
        );
        const newModels = { ...freshModels, ...updates };
        // Drop stale dirty flags for models that no longer exist.
        const dirty = new Set([...s.dirty].filter((k) => k === 'radio' || newModels[k as ModelKey]));
        // Clean up pending image state for models reloaded from disk.
        const pendingModelImageFiles = { ...s.pendingModelImageFiles };
        const modelImages = { ...s.modelImages };
        for (const key of Object.keys(updates)) {
          if (pendingModelImageFiles[key as ModelKey]) {
            if (modelImages[key as ModelKey]) URL.revokeObjectURL(modelImages[key as ModelKey]);
            delete modelImages[key as ModelKey];
            delete pendingModelImageFiles[key as ModelKey];
          }
        }
        return { models: newModels, dirty, warnings: newWarnings, lastError: null, freshModelKeys, pendingModelImageFiles, modelImages };
      });
      get().loadModelImages();
    } catch (e) {
      set({ lastError: friendlyError(e) });
    }
  },

  loadModel: async (key: ModelKey) => {
    const { sdRoot } = get();
    if (!sdRoot) return;
    try {
      const yaml = await readTextFile(sdRoot, `MODELS/${key}.yml`);
      const model = parseModel(yaml);
      set((s) => ({
        models: { ...s.models, [key]: model },
        lastError: null,
      }));
    } catch (e) {
      set({ lastError: friendlyError(e, `${key}.yml`) });
    }
  },

  saveModel: async (key: ModelKey) => {
    const { sdRoot, models, settings } = get();
    const model = models[key];
    if (!model) return;

    // Remove from freshModelKeys immediately (synchronous, before any await) so that if the
    // user navigates away while the write is in flight, confirmLeave calls revertModel rather
    // than discardFreshModel. revertModel reads from disk (if write completed) or preserves the
    // in-memory model (if write not yet done) — either way the model is not lost.
    set((s) => {
      const freshModelKeys = new Set(s.freshModelKeys);
      freshModelKeys.delete(key);
      return { freshModelKeys };
    });

    const yaml = serialiseModel(model);

    if (!sdRoot) {
      // No SD card — download the file instead
      downloadYaml(`${key}.yml`, yaml);
      set((s) => {
        const dirty = new Set(s.dirty);
        dirty.delete(key);
        return { dirty, lastError: null };
      });
      return;
    }

    try {
      // Backup first, then write.
      const currentYaml = await readTextFile(sdRoot, `MODELS/${key}.yml`).catch(() => null);
      if (currentYaml) {
        await writeBackup(sdRoot, modelNameFromModel(model), currentYaml, settings.backupCount);
      }
      await writeTextFile(sdRoot, `MODELS/${key}.yml`, yaml);
      const { modelMeta, pendingModelImageFiles } = get();
      await writeWebConfig(sdRoot, 'model-meta.json', modelMeta).catch(() => {});
      const pendingImageFile = pendingModelImageFiles[key];
      if (pendingImageFile) {
        const ext = safeImageExt(pendingImageFile.name);
        const buf = await pendingImageFile.arrayBuffer();
        await writeBinaryFile(sdRoot, `IMAGES/${key}${ext}`, buf);
      }
      set((s) => {
        const dirty = new Set(s.dirty);
        dirty.delete(key);
        const pendingModelImageFiles = { ...s.pendingModelImageFiles };
        delete pendingModelImageFiles[key];
        return { dirty, lastError: null, pendingModelImageFiles };
      });
    } catch (e) {
      set({ lastError: friendlyError(e, `${key}.yml`) });
    }
  },

  saveAllModels: async () => {
    const { dirty } = get();
    for (const key of Array.from(dirty)) {
      if (key !== 'radio') await get().saveModel(key);
    }
  },

  updateModel: (key: ModelKey, updater: (m: Model) => Model) => {
    set((s) => {
      const model = s.models[key];
      if (!model) return s;
      const dirty = new Set(s.dirty);
      dirty.add(key);
      return { models: { ...s.models, [key]: updater(model) }, dirty };
    });
  },

  createModel: (key: ModelKey, name = '') => {
    assertValidModelKey(key);
    set((s) => {
      const dirty = new Set(s.dirty);
      dirty.add(key);
      const freshModelKeys = new Set(s.freshModelKeys);
      freshModelKeys.add(key);
      return { models: { ...s.models, [key]: createBlankModel(name) }, dirty, freshModelKeys };
    });
  },

  duplicateModel: async (sourceKey: ModelKey, destKey: ModelKey) => {
    assertValidModelKey(sourceKey);
    assertValidModelKey(destKey);
    set((s) => {
      const source = s.models[sourceKey];
      if (!source) return s;
      const srcName = source.header?.name ?? '';
      const suffix = ' Copy';
      const newName = srcName
        ? (srcName.slice(0, 15 - suffix.length) + suffix).slice(0, 15)
        : 'Copy';
      const dirty = new Set(s.dirty);
      dirty.add(destKey);
      const freshModelKeys = new Set(s.freshModelKeys);
      freshModelKeys.add(destKey);
      return {
        models: { ...s.models, [destKey]: { ...source, header: { ...source.header, name: newName } } },
        dirty,
        freshModelKeys,
      };
    });
    const { sdRoot } = get();
    if (sdRoot) await get().saveModel(destKey);
  },

  deleteModel: async (key: ModelKey) => {
    // Remove from in-memory store immediately, revoking any image blob URL.
    set((s) => {
      const models = { ...s.models };
      delete models[key];
      const dirty = new Set(s.dirty);
      dirty.delete(key);
      const freshModelKeys = new Set(s.freshModelKeys);
      freshModelKeys.delete(key);
      const modelImages = { ...s.modelImages };
      if (modelImages[key]) {
        URL.revokeObjectURL(modelImages[key]);
        delete modelImages[key];
      }
      const pendingModelImageFiles = { ...s.pendingModelImageFiles };
      delete pendingModelImageFiles[key];
      return { models, dirty, freshModelKeys, modelImages, pendingModelImageFiles };
    });
    // Delete from SD card if connected (ignore errors — file may not exist yet).
    const { sdRoot } = get();
    if (sdRoot) {
      try { await deleteFile(sdRoot, `MODELS/${key}.yml`); } catch { /* ignore */ }
      try { await deleteModelImage(sdRoot, key); } catch { /* ignore */ }
    }
  },

  importModelFromYaml: async (key: ModelKey, yaml: string) => {
    assertValidModelKey(key);
    try {
      const model = parseModel(yaml);
      set((s) => {
        const dirty = new Set(s.dirty);
        dirty.add(key);
        const freshModelKeys = new Set(s.freshModelKeys);
        freshModelKeys.add(key);
        return { models: { ...s.models, [key]: model }, lastError: null, dirty, freshModelKeys };
      });
      const { sdRoot } = get();
      if (sdRoot) {
        await get().saveModel(key);
      } else {
        set((s) => {
          const dirty = new Set(s.dirty);
          dirty.delete(key);
          const freshModelKeys = new Set(s.freshModelKeys);
          freshModelKeys.delete(key);
          return { dirty, freshModelKeys };
        });
      }
    } catch (e) {
      set({ lastError: friendlyError(e, key) });
    }
  },

  loadRadio: async () => {
    const { sdRoot } = get();
    if (!sdRoot) return;
    try {
      const yaml = await readTextFile(sdRoot, 'RADIO/radio.yml');
      const radio = parseRadio(yaml);
      set({ radio, lastError: null });
    } catch (e) {
      set({ lastError: String(e) });
    }
  },

  saveRadio: async () => {
    const { sdRoot, radio, settings } = get();
    if (!sdRoot || !radio) return;
    try {
      const yaml = serialiseRadio(radio);
      const currentYaml = await readTextFile(sdRoot, 'RADIO/radio.yml').catch(() => null);
      if (currentYaml) {
        await writeBackup(sdRoot, 'radio', currentYaml, settings.backupCount);
      }
      await writeTextFile(sdRoot, 'RADIO/radio.yml', yaml);
      set((s) => {
        const dirty = new Set(s.dirty);
        dirty.delete('radio');
        return { dirty, lastError: null };
      });
    } catch (e) {
      set({ lastError: friendlyError(e, 'radio.yml') });
    }
  },

  updateRadio: (updater: (r: Radio) => Radio) => {
    set((s) => {
      if (!s.radio) return s;
      const dirty = new Set(s.dirty);
      dirty.add('radio');
      return { radio: updater(s.radio), dirty };
    });
  },

  backupRadio: async () => {
    const { sdRoot, radio, settings } = get();
    if (!sdRoot || !radio) return;
    try {
      const yaml = serialiseRadio(radio);
      await writeBackup(sdRoot, 'radio', yaml, settings.backupCount);
    } catch (e) {
      set({ lastError: friendlyError(e, 'radio.yml') });
    }
  },

  backupModel: async (key: ModelKey) => {
    const { sdRoot, models, settings } = get();
    if (!sdRoot) return;
    const model = models[key];
    if (!model) return;
    try {
      const yaml = serialiseModel(model);
      await writeBackup(sdRoot, modelNameFromModel(model), yaml, settings.backupCount);
    } catch (e) {
      set({ lastError: friendlyError(e, `${key}.yml`) });
    }
  },

  listBackups: async (modelName: string) => {
    const { sdRoot } = get();
    if (!sdRoot) return [];
    try {
      return await listBackups(sdRoot, modelName);
    } catch {
      return [];
    }
  },

  listAllBackups: async () => {
    const { sdRoot } = get();
    if (!sdRoot) return [];
    try {
      return await listAllBackups(sdRoot);
    } catch {
      return [];
    }
  },

  deleteBackup: async (entry: BackupEntry) => {
    const { sdRoot } = get();
    if (!sdRoot) return;
    try {
      await deleteFile(sdRoot, entry.path);
    } catch (e) {
      set({ lastError: friendlyError(e, entry.filename) });
    }
  },

  restoreRadioBackup: async (entry: BackupEntry) => {
    const { sdRoot, radio, settings } = get();
    if (!sdRoot) return;
    try {
      // Backup current radio before overwriting.
      if (radio) {
        const currentYaml = serialiseRadio(radio);
        await writeBackup(sdRoot, 'radio', currentYaml, settings.backupCount);
      }
      const backupYaml = await readBackup(sdRoot, entry);
      const restoredRadio = parseRadio(backupYaml);
      set((s) => {
        const dirty = new Set(s.dirty);
        dirty.add('radio');
        return { radio: restoredRadio, dirty, lastError: null };
      });
    } catch (e) {
      set({ lastError: friendlyError(e, entry.filename) });
    }
  },

  restoreBackup: async (key: ModelKey, entry: BackupEntry) => {
    const { sdRoot, models, settings } = get();
    if (!sdRoot) return;
    try {
      // Backup current version before restoring.
      const current = models[key];
      if (current) {
        const currentYaml = serialiseModel(current);
        await writeBackup(sdRoot, modelNameFromModel(current), currentYaml, settings.backupCount);
      }
      const backupYaml = await readBackup(sdRoot, entry);
      const model = parseModel(backupYaml);
      set((s) => {
        const dirty = new Set(s.dirty);
        dirty.add(key);
        return { models: { ...s.models, [key]: model }, dirty, lastError: null };
      });
    } catch (e) {
      set({ lastError: String(e) });
    }
  },

  saveAll: async () => {
    await get().saveAllModels();
    const { dirty } = get();
    if (dirty.has('radio')) await get().saveRadio();
  },

  updateSettings: (patch: Partial<AppSettings>) => {
    set((s) => {
      const next = { ...s.settings, ...patch };
      const { sdRoot } = get();
      if (sdRoot) writeWebConfig(sdRoot, SETTINGS_WEBCONFIG, next).catch(() => {});
      return { settings: next };
    });
  },

  discardFreshModel: (key: ModelKey) => {
    set((s) => {
      const models = { ...s.models };
      delete models[key];
      const dirty = new Set(s.dirty);
      dirty.delete(key);
      const freshModelKeys = new Set(s.freshModelKeys);
      freshModelKeys.delete(key);
      const pendingModelImageFiles = { ...s.pendingModelImageFiles };
      const modelImages = { ...s.modelImages };
      if (pendingModelImageFiles[key]) {
        if (modelImages[key]) URL.revokeObjectURL(modelImages[key]);
        delete modelImages[key];
        delete pendingModelImageFiles[key];
      }
      return { models, dirty, freshModelKeys, pendingModelImageFiles, modelImages };
    });
  },

  revertModel: async (key: ModelKey) => {
    // Clear dirty immediately so the UI stops showing it as unsaved.
    set((s) => {
      const dirty = new Set(s.dirty);
      dirty.delete(key);
      const pendingModelImageFiles = { ...s.pendingModelImageFiles };
      const modelImages = { ...s.modelImages };
      if (pendingModelImageFiles[key]) {
        if (modelImages[key]) URL.revokeObjectURL(modelImages[key]);
        delete modelImages[key];
        delete pendingModelImageFiles[key];
      }
      return { dirty, pendingModelImageFiles, modelImages };
    });
    // Reload from disk to restore the actual saved state.
    const { sdRoot } = get();
    if (!sdRoot) return;
    try {
      const yaml = await readTextFile(sdRoot, `MODELS/${key}.yml`);
      const model = parseModel(yaml);
      set((s) => ({ models: { ...s.models, [key]: model } }));
    } catch { /* leave in-memory model as-is; dirty already cleared */ }
    // Revert model meta for this key from disk.
    try {
      const saved = await readWebConfig<Record<string, { scale?: string; vehicleType?: string; power?: 'battery' | 'fuel' }>>(sdRoot, 'model-meta.json');
      set((s) => {
        const modelMeta = { ...s.modelMeta };
        if (saved?.[key]) modelMeta[key] = saved[key];
        else delete modelMeta[key];
        return { modelMeta };
      });
    } catch { /* leave meta as-is */ }
    // Reload image from disk for this key.
    try {
      const images = await findModelImages(sdRoot, [key]);
      set((s) => ({ modelImages: { ...s.modelImages, ...images } }));
    } catch { /* ignore */ }
  },

  revertRadio: async () => {
    set((s) => {
      const dirty = new Set(s.dirty);
      dirty.delete('radio');
      return { dirty };
    });
    const { sdRoot } = get();
    if (!sdRoot) return;
    try {
      const yaml = await readTextFile(sdRoot, 'RADIO/radio.yml');
      const radio = parseRadio(yaml);
      set({ radio });
    } catch { /* leave in-memory radio as-is; dirty already cleared */ }
  },

  isDirty: (key: string) => get().dirty.has(key),

  clearError: () => set({ lastError: null }),
  clearWarnings: () => set({ warnings: [] }),
}));
