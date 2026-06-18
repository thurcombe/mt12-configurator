import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { createMemoryRoot } from '../../fs/memoryFs.ts';
import { readTextFile } from '../../fs/sdcard.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, '../fixtures');

function fixtureYaml(name: string) {
  return readFileSync(join(fixtures, name), 'utf8');
}

function resetStore() {
  useEditorStore.setState({
    sdRoot: null,
    models: {},
    dirty: new Set(),
    freshModelKeys: new Set(),
    lastError: null,
    warnings: [],
  });
}

describe('importModelFromYaml', () => {
  beforeEach(resetStore);

  it('writes the file to the SD card immediately when connected', async () => {
    const sdRoot = createMemoryRoot({}) as any;
    useEditorStore.setState({ sdRoot });

    const yaml = fixtureYaml('model00.yml');
    await useEditorStore.getState().importModelFromYaml('model00', yaml);

    const written = await readTextFile(sdRoot, 'MODELS/model00.yml');
    expect(written.length).toBeGreaterThan(0);
  });

  it('is not dirty after import when SD card is connected', async () => {
    const sdRoot = createMemoryRoot({}) as any;
    useEditorStore.setState({ sdRoot });

    await useEditorStore.getState().importModelFromYaml('model00', fixtureYaml('model00.yml'));

    expect(useEditorStore.getState().dirty.has('model00')).toBe(false);
  });

  it('is dirty after import when no SD card is connected', async () => {
    await useEditorStore.getState().importModelFromYaml('model00', fixtureYaml('model00.yml'));

    expect(useEditorStore.getState().dirty.has('model00')).toBe(true);
  });

  it('stores the parsed model in state', async () => {
    await useEditorStore.getState().importModelFromYaml('model00', fixtureYaml('model00.yml'));

    expect(useEditorStore.getState().models['model00']).toBeDefined();
  });

  it('sets lastError and does not store model on invalid YAML', async () => {
    await useEditorStore.getState().importModelFromYaml('model00', 'not: valid: yaml: [[[');

    expect(useEditorStore.getState().models['model00']).toBeUndefined();
    expect(useEditorStore.getState().lastError).toBeTruthy();
  });
});

describe('loadAllModels', () => {
  beforeEach(resetStore);

  it('loads models from the card into state', async () => {
    const yaml = fixtureYaml('model00.yml');
    const sdRoot = createMemoryRoot({ 'MODELS/model00.yml': yaml }) as any;
    useEditorStore.setState({ sdRoot });

    await useEditorStore.getState().loadAllModels();

    expect(useEditorStore.getState().models['model00']).toBeDefined();
  });

  it('clears dirty flag for models reloaded from card', async () => {
    const yaml = fixtureYaml('model00.yml');
    const sdRoot = createMemoryRoot({ 'MODELS/model00.yml': yaml }) as any;
    useEditorStore.setState({ sdRoot, dirty: new Set(['model00']) });

    await useEditorStore.getState().loadAllModels();

    expect(useEditorStore.getState().dirty.has('model00')).toBe(false);
  });

  it('discards dirty models not on the card and not fresh', async () => {
    const yaml = fixtureYaml('model00.yml');
    const sdRoot = createMemoryRoot({ 'MODELS/model00.yml': yaml }) as any;
    useEditorStore.setState({ sdRoot, dirty: new Set(['model01']) });

    await useEditorStore.getState().loadAllModels();

    // model01 is not on card and not in freshModelKeys — discarded on refresh.
    expect(useEditorStore.getState().dirty.has('model01')).toBe(false);
  });

  it('preserves fresh (unsaved) models not present on card', async () => {
    const yaml = fixtureYaml('model00.yml');
    const sdRoot = createMemoryRoot({ 'MODELS/model00.yml': yaml }) as any;
    useEditorStore.setState({ sdRoot, models: { model01: {} as any }, freshModelKeys: new Set(['model01']), dirty: new Set(['model01']) });

    await useEditorStore.getState().loadAllModels();

    expect(useEditorStore.getState().models['model01']).toBeDefined();
  });
});
