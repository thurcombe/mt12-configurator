import { create } from 'zustand';
import type { SdRoot } from '../fs/sdcard.ts';
import { pickSdCard, readTextFile, writeTextFile, listModelFiles } from '../fs/sdcard.ts';
import { writeBackup, listBackups, readBackup } from '../fs/backup.ts';
import type { BackupEntry } from '../fs/backup.ts';
import { parseModel, serialiseModel } from '../codec/model-codec.ts';
import { parseRadio, serialiseRadio } from '../codec/radio-codec.ts';
import { createBlankModel } from '../codec/modelTemplate.ts';
import { downloadYaml } from '../fs/download.ts';
import type { Model } from '../types/model.ts';
import type { Radio } from '../types/radio.ts';

// Model slot key: 'model00', 'model01', etc. (no .yml extension).
export type ModelKey = string;

export interface AppSettings {
  backupCount: number;
}

const DEFAULT_SETTINGS: AppSettings = { backupCount: 5 };
const SETTINGS_KEY = 'edgetx-editor-settings';

function loadPersistedSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(s: AppSettings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

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

  // Error / warning state
  lastError: string | null;
  warnings: string[];

  // App settings (persisted to localStorage)
  settings: AppSettings;

  // Actions — SD card
  connectSdCard: () => Promise<void>;

  // Actions — models
  loadAllModels: () => Promise<void>;
  loadModel: (key: ModelKey) => Promise<void>;
  saveModel: (key: ModelKey) => Promise<void>;
  saveAllModels: () => Promise<void>;
  updateModel: (key: ModelKey, updater: (m: Model) => Model) => void;
  createModel: (key: ModelKey, name?: string) => void;
  duplicateModel: (sourceKey: ModelKey, destKey: ModelKey) => void;
  deleteModel: (key: ModelKey) => void;
  importModelFromYaml: (key: ModelKey, yaml: string) => void;

  // Actions — radio
  loadRadio: () => Promise<void>;
  saveRadio: () => Promise<void>;
  updateRadio: (updater: (r: Radio) => Radio) => void;

  // Actions — backups
  listBackups: (modelName: string) => Promise<BackupEntry[]>;
  restoreBackup: (key: ModelKey, entry: BackupEntry) => Promise<void>;

  // Actions — save all
  saveAll: () => Promise<void>;

  // Actions — settings
  updateSettings: (patch: Partial<AppSettings>) => void;

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
  settings: loadPersistedSettings(),

  connectSdCard: async () => {
    try {
      const root = await pickSdCard();
      set({ sdRoot: root, lastError: null });
    } catch (e) {
      const msg = friendlyError(e);
      if (msg) set({ lastError: msg });
    }
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
      set((s) => ({ models: { ...s.models, ...updates }, warnings: newWarnings, lastError: null }));
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

    const yaml = serialiseModel(model);

    if (!sdRoot) {
      // No SD card — download the file instead
      downloadYaml(`${key}.yml`, yaml);
      set((s) => {
        const dirty = new Set(s.dirty);
        dirty.delete(key);
        const freshModelKeys = new Set(s.freshModelKeys);
        freshModelKeys.delete(key);
        return { dirty, freshModelKeys, lastError: null };
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
      set((s) => {
        const dirty = new Set(s.dirty);
        dirty.delete(key);
        const freshModelKeys = new Set(s.freshModelKeys);
        freshModelKeys.delete(key);
        return { dirty, freshModelKeys, lastError: null };
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
    set((s) => {
      const dirty = new Set(s.dirty);
      dirty.add(key);
      const freshModelKeys = new Set(s.freshModelKeys);
      freshModelKeys.add(key);
      return { models: { ...s.models, [key]: createBlankModel(name) }, dirty, freshModelKeys };
    });
  },

  duplicateModel: (sourceKey: ModelKey, destKey: ModelKey) => {
    set((s) => {
      const source = s.models[sourceKey];
      if (!source) return s;
      const dirty = new Set(s.dirty);
      dirty.add(destKey);
      return {
        models: { ...s.models, [destKey]: { ...source } },
        dirty,
      };
    });
  },

  deleteModel: (key: ModelKey) => {
    set((s) => {
      const models = { ...s.models };
      delete models[key];
      const dirty = new Set(s.dirty);
      dirty.delete(key);
      return { models, dirty };
    });
  },

  importModelFromYaml: (key: ModelKey, yaml: string) => {
    try {
      const model = parseModel(yaml);
      set((s) => ({
        models: { ...s.models, [key]: model },
        lastError: null,
      }));
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

  listBackups: async (modelName: string) => {
    const { sdRoot } = get();
    if (!sdRoot) return [];
    try {
      return await listBackups(sdRoot, modelName);
    } catch {
      return [];
    }
  },

  restoreBackup: async (key: ModelKey, entry: BackupEntry) => {
    const { sdRoot, models } = get();
    if (!sdRoot) return;
    try {
      // Backup current version before restoring.
      const current = models[key];
      if (current) {
        const currentYaml = serialiseModel(current);
        await writeBackup(sdRoot, modelNameFromModel(current), currentYaml);
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
      persistSettings(next);
      return { settings: next };
    });
  },

  revertModel: async (key: ModelKey) => {
    // Clear dirty immediately so the UI stops showing it as unsaved.
    set((s) => {
      const dirty = new Set(s.dirty);
      dirty.delete(key);
      return { dirty };
    });
    // Reload from disk to restore the actual saved state.
    const { sdRoot } = get();
    if (!sdRoot) return;
    try {
      const yaml = await readTextFile(sdRoot, `MODELS/${key}.yml`);
      const model = parseModel(yaml);
      set((s) => ({ models: { ...s.models, [key]: model } }));
    } catch { /* leave in-memory model as-is; dirty already cleared */ }
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
