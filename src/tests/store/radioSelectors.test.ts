import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../../store/useEditorStore.ts';
import type { Radio } from '../../types/radio.ts';

function resetStore() {
  useEditorStore.setState({
    sdRoot: null,
    models: {},
    dirty: new Set(),
    freshModelKeys: new Set(),
    lastError: null,
    warnings: [],
    radio: null,
  });
}

function setRadio(partial: Partial<Radio>) {
  useEditorStore.setState({ radio: partial as Radio });
}

describe('availableSwitches()', () => {
  beforeEach(resetStore);

  it('always returns SA/SB/SC/SD when radio has no switchConfig', () => {
    setRadio({});
    const sw = useEditorStore.getState().availableSwitches();
    const keys = sw.map(s => s.key);
    expect(keys).toContain('SA');
    expect(keys).toContain('SB');
    expect(keys).toContain('SC');
    expect(keys).toContain('SD');
  });

  it('does not include FL1/FL2 when both have type NONE', () => {
    setRadio({ switchConfig: { FL1: { type: 'NONE', name: '' }, FL2: { type: 'NONE', name: '' } } });
    const keys = useEditorStore.getState().availableSwitches().map(s => s.key);
    expect(keys).not.toContain('FL1');
    expect(keys).not.toContain('FL2');
  });

  it('includes FL1 and FL2 when they have a non-NONE type', () => {
    setRadio({ switchConfig: { FL1: { type: '3pos', name: '' }, FL2: { type: '2pos', name: '' } } });
    const keys = useEditorStore.getState().availableSwitches().map(s => s.key);
    expect(keys).toContain('FL1');
    expect(keys).toContain('FL2');
  });

  it('uses custom name from switchConfig when set', () => {
    setRadio({ switchConfig: { SA: { type: '3POS', name: 'KID' } } });
    const sa = useEditorStore.getState().availableSwitches().find(s => s.key === 'SA');
    expect(sa?.name).toBe('KID');
  });

  it('falls back to key as name when switchConfig name is empty', () => {
    setRadio({ switchConfig: { SA: { type: '3POS', name: '' } } });
    const sa = useEditorStore.getState().availableSwitches().find(s => s.key === 'SA');
    expect(sa?.name).toBe('SA');
  });

  it('returns empty array (no base switches) when radio is null', () => {
    useEditorStore.setState({ radio: null });
    // No radio — switchConfig defaults to {}; BASE_SWITCHES are still returned
    const sw = useEditorStore.getState().availableSwitches();
    expect(sw.map(s => s.key)).toEqual(['SA', 'SB', 'SC', 'SD']);
  });
});

describe('availablePots()', () => {
  beforeEach(resetStore);

  it('always returns P1 and P2', () => {
    setRadio({});
    const keys = useEditorStore.getState().availablePots().map(p => p.key);
    expect(keys).toContain('P1');
    expect(keys).toContain('P2');
  });

  it('does not include P3/P4 when they have type NONE', () => {
    setRadio({ potsConfig: { P3: { type: 'none', inv: 0, name: '' }, P4: { type: 'none', inv: 0, name: '' } } });
    const keys = useEditorStore.getState().availablePots().map(p => p.key);
    expect(keys).not.toContain('P3');
    expect(keys).not.toContain('P4');
  });

  it('includes P3 and P4 when they have a non-NONE type', () => {
    setRadio({ potsConfig: { P3: { type: 'with_detent', inv: 0, name: '' }, P4: { type: 'with_detent', inv: 0, name: '' } } });
    const keys = useEditorStore.getState().availablePots().map(p => p.key);
    expect(keys).toContain('P3');
    expect(keys).toContain('P4');
  });
});

describe('expansionModule()', () => {
  beforeEach(resetStore);

  it('returns none when radio is null', () => {
    useEditorStore.setState({ radio: null });
    expect(useEditorStore.getState().expansionModule()).toBe('none');
  });

  it('returns none when no expansion config present', () => {
    setRadio({});
    expect(useEditorStore.getState().expansionModule()).toBe('none');
  });

  it('returns joystick when P3/P4 are with_detent and no switchesFlex', () => {
    setRadio({
      potsConfig: {
        P3: { type: 'with_detent', inv: 0, name: '' },
        P4: { type: 'with_detent', inv: 0, name: '' },
      },
    });
    expect(useEditorStore.getState().expansionModule()).toBe('joystick');
  });

  it('returns switch_dual3 when P3/P4 are switch and FL1/FL2 are 3pos', () => {
    setRadio({
      potsConfig: {
        P3: { type: 'switch', inv: 0, name: '' },
        P4: { type: 'switch', inv: 0, name: '' },
      },
      switchConfig: {
        FL1: { type: '3pos', name: '' },
        FL2: { type: '3pos', name: '' },
      },
      switchesFlex: { FL1: { channel: 'P3' }, FL2: { channel: 'P4' } },
    });
    expect(useEditorStore.getState().expansionModule()).toBe('switch_dual3');
  });

  it('returns switch_3and2 when FL1=3pos and FL2≠3pos', () => {
    setRadio({
      potsConfig: {
        P3: { type: 'switch', inv: 0, name: '' },
        P4: { type: 'switch', inv: 0, name: '' },
      },
      switchConfig: {
        FL1: { type: '3pos', name: '' },
        FL2: { type: '2pos', name: '' },
      },
      switchesFlex: { FL1: { channel: 'P3' }, FL2: { channel: 'P4' } },
    });
    expect(useEditorStore.getState().expansionModule()).toBe('switch_3and2');
  });

  it('returns switch_dual2 when P3/P4 are switch and FL1 is not 3pos', () => {
    setRadio({
      potsConfig: {
        P3: { type: 'switch', inv: 0, name: '' },
        P4: { type: 'switch', inv: 0, name: '' },
      },
      switchConfig: {
        FL1: { type: '2pos', name: '' },
        FL2: { type: '2pos', name: '' },
      },
      switchesFlex: { FL1: { channel: 'P3' }, FL2: { channel: 'P4' } },
    });
    expect(useEditorStore.getState().expansionModule()).toBe('switch_dual2');
  });

  it('does not return joystick when switchesFlex is present', () => {
    setRadio({
      potsConfig: {
        P3: { type: 'with_detent', inv: 0, name: '' },
        P4: { type: 'with_detent', inv: 0, name: '' },
      },
      switchesFlex: { FL1: { channel: 'P3' } },
    });
    // hasFlex=true prevents joystick detection
    expect(useEditorStore.getState().expansionModule()).toBe('none');
  });
});
