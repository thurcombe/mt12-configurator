import { useState } from 'react';
import type React from 'react';
import type { Route } from '../App.tsx';
import { Icon } from '../components/shared/Icon.tsx';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import { useEditorStore } from '../store/useEditorStore.ts';
import { BUILTIN_KID_PRESETS } from '../data/kidPresets.ts';
import type { KidPreset } from '../types/kidPreset.ts';

interface Props {
  navigate: (r: Route) => void;
  from?: Route;
}

const BUILTIN_IDS = new Set(BUILTIN_KID_PRESETS.map(p => p.id));

function blankPreset(): KidPreset {
  return { id: '', name: '', description: '', restrictionLevel: 50 };
}

function generateId(name: string): string {
  return `custom-${name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
}

function RestrictionBar({ level }: { level: number }) {
  const filled = Math.round(level / 10);
  return (
    <div style={{ display: 'flex', gap: 2, marginTop: 6 }} title={`Restriction level: ${level}%`}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{
          flex: 1, height: 5, borderRadius: 2,
          background: i < filled ? 'var(--accent)' : 'var(--border)',
        }} />
      ))}
    </div>
  );
}

export function KidPresetsPage({ navigate, from }: Props) {
  const kidPresets = useEditorStore(s => s.kidPresets);
  const saveUserKidPreset = useEditorStore(s => s.saveUserKidPreset);
  const deleteUserKidPreset = useEditorStore(s => s.deleteUserKidPreset);
  const sdRoot = useEditorStore(s => s.sdRoot);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [draft, setDraft] = useState<KidPreset>(blankPreset());
  const [idError, setIdError] = useState('');

  const builtIn = kidPresets.filter(p => BUILTIN_IDS.has(p.id));
  const custom = kidPresets.filter(p => !BUILTIN_IDS.has(p.id));

  function startAdd() {
    setDraft(blankPreset());
    setAddingNew(true);
    setEditingId(null);
    setIdError('');
  }

  function startEdit(preset: KidPreset) {
    setDraft({ ...preset });
    setEditingId(preset.id);
    setAddingNew(false);
    setIdError('');
  }

  function startClone(preset: KidPreset) {
    setDraft({ ...preset, id: '', name: `${preset.name} (copy)`, builtIn: undefined });
    setAddingNew(true);
    setEditingId(null);
    setIdError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setAddingNew(false);
    setIdError('');
  }

  function saveEdit() {
    if (addingNew) {
      const id = generateId(draft.name);
      if (!id || id === 'custom-') { setIdError('Name is required'); return; }
      if (kidPresets.some(p => p.id === id)) { setIdError('A preset with this name already exists'); return; }
      saveUserKidPreset({ ...draft, id });
    } else {
      saveUserKidPreset(draft);
    }
    cancelEdit();
  }

  const inputStyle = {
    background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 4, padding: '4px 8px', fontSize: 13, fontFamily: 'var(--font)', width: '100%',
  } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(from ?? { page: 'list' })}>← Back</button>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Driver Presets</span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={startAdd}>+ New preset</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 900, padding: '24px 20px 48px' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 24px', maxWidth: 580 }}>
            Driver presets define the skill level of the person driving. When setting up KidControl,
            you pick a preset and the app calculates appropriate limits from the vehicle's characteristics.
            {!sdRoot && <span style={{ color: 'var(--warning)' }}> Connect an SD card to persist custom presets.</span>}
          </p>

          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', margin: '0 0 12px' }}>Built-in presets</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {builtIn.map(preset => (
                <div key={preset.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{preset.name}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', background: 'var(--surface-hi)', borderRadius: 4, padding: '1px 5px' }}><Icon icon={faLock} size={10} />built-in</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>{preset.description}</p>
                  <RestrictionBar level={preset.restrictionLevel} />
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => startClone(preset)}>Clone</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(custom.length > 0 || addingNew) && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', margin: '0 0 12px' }}>Custom presets</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {custom.map(preset =>
                  editingId === preset.id ? (
                    <PresetForm
                      key={preset.id}
                      draft={draft}
                      idError={idError}
                      isNew={false}
                      inputStyle={inputStyle}
                      onChange={p => setDraft(d => ({ ...d, ...p }))}
                      onSave={saveEdit}
                      onCancel={cancelEdit}
                    />
                  ) : (
                    <div key={preset.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{preset.name}</span>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>{preset.description}</p>
                      <RestrictionBar level={preset.restrictionLevel} />
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(preset)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteUserKidPreset(preset.id)}>Delete</button>
                      </div>
                    </div>
                  )
                )}
                {addingNew && (
                  <PresetForm
                    draft={draft}
                    idError={idError}
                    isNew
                    inputStyle={inputStyle}
                    onChange={p => setDraft(d => ({ ...d, ...p }))}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                  />
                )}
              </div>
            </div>
          )}

          {!addingNew && custom.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              No custom presets yet — click "New preset" or clone a built-in to create one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PresetForm({ draft, idError, isNew, inputStyle, onChange, onSave, onCancel }: {
  draft: KidPreset;
  idError: string;
  isNew: boolean;
  inputStyle: React.CSSProperties;
  onChange: (p: Partial<KidPreset>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
        {isNew ? 'New preset' : 'Edit preset'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</label>
        <input style={inputStyle} placeholder="e.g. Gentle beginner" value={draft.name} autoFocus={isNew} onChange={e => onChange({ name: e.target.value })} />
        {idError && <p style={{ color: 'var(--danger)', fontSize: 11, margin: 0 }}>{idError}</p>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
        <input style={inputStyle} placeholder="Short description of who this suits" value={draft.description} onChange={e => onChange({ description: e.target.value })} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Restriction level ({draft.restrictionLevel}%)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 40 }}>None</span>
          <input type="range" min={0} max={100} value={draft.restrictionLevel} onChange={e => onChange({ restrictionLevel: parseInt(e.target.value) })} style={{ flex: 1, accentColor: 'var(--accent)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 40, textAlign: 'right' }}>Max</span>
        </div>
        <RestrictionBar level={draft.restrictionLevel} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={onSave}>Save</button>
      </div>
    </div>
  );
}
