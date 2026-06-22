// MT12 diagram with label-placement mode.
// Label positions are stored in .webconfig/diagram-labels.json on the SD card.
// The image always shows; labels and placement require an SD card connection.

import { useState, useEffect, useMemo } from 'react';
import type { SdRoot } from '../../fs/sdcard.ts';
import type { Model } from '../../types/model.ts';
import { readWebConfig, writeWebConfig } from '../../fs/webconfig.ts';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { buildInputMap } from '../../codec/modelSummary.ts';
import type { ExpansionModuleType } from '../../hardware/mt12.ts';
import { EXPANSION_MODULES } from '../../hardware/mt12.ts';
import css from './Mt12Diagram.module.css';

// ── Function map ───────────────────────────────────────────────────────────────

type FunctionMap = Record<string, string[]>;

function buildFunctionMap(model: Model): FunctionMap {
  const result: FunctionMap = {};

  function add(ctrl: string, fn: string) {
    if (!ctrl || ctrl === 'NONE') return;
    if (!result[ctrl]) result[ctrl] = [];
    if (!result[ctrl].includes(fn)) result[ctrl].push(fn);
  }

  function ctrl(sw: string) { return sw.replace(/^!/, '').replace(/\d$/, ''); }

  add('TH', 'Throttle trigger');

  const inputMap = buildInputMap(model.expoData ?? []);
  const chnToPot: Record<number, string> = {};
  for (const line of model.expoData ?? []) {
    if (/^P\d/.test(line.srcRaw)) chnToPot[line.chn] = line.srcRaw;
  }

  for (const line of model.mixData ?? []) {
    const name = (line.name ?? '').toUpperCase();
    const inputM = /^I(\d+)$/.exec(line.srcRaw);
    const pot = inputM ? chnToPot[parseInt(inputM[1])] : null;
    if (pot) {
      if (name === 'D-RATE' || name === 'DRATE') add(pot, 'Speed limiter');
      else if (name === 'S-TRIM' || name === 'STRIM') add(pot, 'Steering trim');
      else if (name === 'GYRO-GAIN' || name === 'GYROGAIN' || name === 'GYRO') add(pot, 'Gyro gain');
      else add(pot, (inputMap[parseInt(inputM![1])] ?? name) || 'Input');
    } else if (!inputM && line.srcRaw && line.srcRaw !== 'NONE') {
      if (name === 'S-TRIM' || name === 'STRIM') add(line.srcRaw, 'Steering trim');
      else if (name === 'D-RATE' || name === 'DRATE') add(line.srcRaw, 'Speed limiter');
      else if (name === 'GYRO-GAIN' || name === 'GYROGAIN' || name === 'GYRO') add(line.srcRaw, 'Gyro gain');
    }
    if (line.swtch && line.swtch !== 'NONE' && line.swtch !== 'ON') {
      const sw = ctrl(line.swtch);
      if (name === 'CRUISE') add(sw, 'Cruise control');
    }
  }

  for (const ls of Object.values(model.logicalSw ?? {})) {
    const args = ls.def?.split(',') ?? [];
    const physSwitches = [...new Set(args.map(a => ctrl(a)).filter(s => s && s !== 'NONE' && /^[A-Z]/.test(s)))];
    let lsFn = 'Logical switch';
    if (ls.func === 'FUNC_STICKY') lsFn = 'Cruise toggle';
    else if (ls.func === 'FUNC_AND') lsFn = 'Combined switch';
    else if (ls.func === 'FUNC_OR') lsFn = 'Either switch';
    for (const sw of physSwitches) add(sw, lsFn);
  }

  for (const [key, fm] of Object.entries(model.flightModeData ?? {})) {
    if (key === '0' || !fm.swtch || fm.swtch === 'NONE') continue;
    const sw = ctrl(fm.swtch);
    const label = fm.name?.trim() || (key === '1' ? 'KidControl' : `Drive mode ${key}`);
    add(sw, label);
  }

  for (const fn of Object.values(model.customFn ?? {})) {
    if (!fn.swtch || fn.swtch === 'NONE') continue;
    const sw = ctrl(fn.swtch);
    let desc = fn.func ?? 'Special function';
    if (fn.func === 'PLAY_TRACK') desc = `Audio: ${fn.def?.split(',')[0] ?? ''}`;
    add(sw, desc);
  }

  return result;
}

// ── Types & constants ──────────────────────────────────────────────────────────

interface CtrlDef {
  name: string;
  desc: string;
  inert?: boolean;
}

interface DotPos {
  dx: number; dy: number;
  lx?: number; ly?: number;
  lineStyle?: 'solid' | 'dashed';
}

interface DragState {
  dotX: number; dotY: number;
  curX: number; curY: number;
}

type Positions = Record<string, DotPos>;

const CONTROLS: CtrlDef[] = [
  { name:'P1',  desc:'Scroll dial (top right)'        },
  { name:'P2',  desc:'Scroll dial (left of wheel)'    },
  { name:'SC',  desc:'2-position switch'              },
  { name:'SA',  desc:'3-position switch'              },
  { name:'SB',  desc:'2-position switch (top right)'  },
  { name:'TH',  desc:'Throttle trigger'               },
  { name:'SD',  desc:'Grip button (thumb)'            },
  { name:'T1',  desc:'Trim lever', inert:true },
  { name:'T2',  desc:'Trim lever', inert:true },
  { name:'T3',  desc:'Trim lever', inert:true },
  { name:'T4',  desc:'Trim lever', inert:true },
  { name:'T5',  desc:'Trim lever', inert:true },
];

const BUILTIN_POSITIONS: Positions = {
  P1: { dx:77.9, dy:25.6, lx:88.6, ly:13.6 },
  P2: { dx:38.7, dy:26.1, lx:17.2, ly:13.9 },
  SC: { dx:47.3, dy:43.3, lx:47,   ly:53.5 },
  SA: { dx:58.4, dy:45.3, lx:64.1, ly:54.6 },
  SB: { dx:54.2, dy:31.8, lx:55.4, ly:57.5, lineStyle: 'dashed' },
  TH: { dx:72.1, dy:41.7, lx:82.3, ly:41.6 },
  SD: { dx:11.2, dy:87.6, lx:4.8,  ly:66   },
  T1: { dx:48.5, dy:17.1, lx:39.1, ly:6.2  },
  T2: { dx:68.6, dy:17.2, lx:76.7, ly:7.3  },
  T3: { dx:74.3, dy:33.1, lx:85.3, ly:34.1 },
  T4: { dx:43.5, dy:33.5, lx:25.7, ly:38.3 },
  T5: { dx:46.4, dy:36.2, lx:11.9, ly:51.2 },
};

// Controls that have built-in label positions on the TX diagram.
// Used by RadioSettings to warn when a configured control has no diagram placement.
export const BUILTIN_PLACED_CONTROLS = new Set(Object.keys(BUILTIN_POSITIONS) as string[]);

// ── Module constants ───────────────────────────────────────────────────────────

const MODULE_IMAGE: Partial<Record<ExpansionModuleType, string>> = {
  switch_dual3: '/module-switch.jpg',
  switch_3and2: '/module-switch.jpg',
  switch_dual2: '/module-switch.jpg',
  joystick:     '/module-joystick.jpg',
};

const MODULE_CONTROLS: Partial<Record<ExpansionModuleType, CtrlDef[]>> = {
  switch_dual3: [{ name:'FL1', desc:'Left toggle (3-pos)' }, { name:'FL2', desc:'Right toggle (3-pos)' }],
  switch_3and2: [{ name:'FL1', desc:'Left toggle (3-pos)' }, { name:'FL2', desc:'Right toggle (2-pos)' }],
  switch_dual2: [{ name:'FL1', desc:'Left toggle (2-pos)' }, { name:'FL2', desc:'Right toggle (2-pos)' }],
  joystick:     [{ name:'P3', desc:'Joystick X axis' }, { name:'P4', desc:'Joystick Y axis' }],
};

const SWITCH_MODULE_BUILTIN: Positions = { FL1:{ dx:44, dy:38.5, lx:38.7, ly:11.7 }, FL2:{ dx:63.8, dy:27.1, lx:79.6, ly:10.8 } };

const MODULE_BUILTIN_POSITIONS: Partial<Record<ExpansionModuleType, Positions>> = {
  switch_dual3: SWITCH_MODULE_BUILTIN,
  switch_3and2: SWITCH_MODULE_BUILTIN,
  switch_dual2: SWITCH_MODULE_BUILTIN,
  joystick:     { P3:{ dx:45, dy:55, lx:18,  ly:72 }, P4:{ dx:55, dy:45, lx:82, ly:28 } },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function autoLabel(dx: number, dy: number): { lx: number; ly: number; anchor: 'start'|'middle'|'end' } {
  const regions = [
    { lx: dx < 78 ? 85 : dx + 8, ly: dy, anchor: 'start' as const,
      score: Math.max(0, dx - 50) * 2 + Math.max(0, 78 - dx) * -1 },
    { lx: dx > 18 ? 10 : dx - 8, ly: dy, anchor: 'end' as const,
      score: Math.max(0, 50 - dx) * 2 + Math.max(0, dx - 18) * -1 },
    { lx: dx, ly: dy > 12 ? 7 : dy - 8, anchor: 'middle' as const,
      score: Math.max(0, 50 - dy) * 1.5 },
    { lx: dx, ly: dy < 72 ? 78 : dy + 8, anchor: 'middle' as const,
      score: Math.max(0, dy - 50) * 1.5 },
  ];
  const best = dx > 50 ? regions[0] : dy < 40 ? regions[2] : regions[1];
  return {
    lx: Math.max(2, Math.min(98, best.lx)),
    ly: Math.max(4, Math.min(96, best.ly)),
    anchor: best.anchor,
  };
}

function retract(dx: number, dy: number, lx: number, ly: number, gap: number): { x: number; y: number } {
  const vx = lx - dx, vy = ly - dy;
  const len = Math.sqrt(vx * vx + vy * vy);
  if (len <= gap) return { x: lx, y: ly };
  return { x: lx - (vx / len) * gap, y: ly - (vy / len) * gap };
}

function getLabelPos(pos: DotPos): { lx: number; ly: number; anchor: 'start'|'middle'|'end' } {
  if (pos.lx !== undefined && pos.ly !== undefined) {
    let anchor: 'start'|'middle'|'end';
    if (pos.lx < 22) anchor = 'start';
    else if (pos.lx > 78) anchor = 'end';
    else { const d = pos.lx - pos.dx; anchor = d > 3 ? 'start' : d < -3 ? 'end' : 'middle'; }
    return { lx: pos.lx, ly: pos.ly, anchor };
  }
  return autoLabel(pos.dx, pos.dy);
}

// ── AnnotatedPhoto ─────────────────────────────────────────────────────────────

interface PhotoProps {
  imageSrc: string;
  controls: CtrlDef[];
  positions: Positions;
  selected?: string;
  hovered?: string | null;
  externalHighlight?: string | null;
  warningControls?: string[];
  onSelect?: (name: string) => void;
  onHover?: (name: string | null) => void;
  placing?: boolean;
  activeControl?: string;
  dragPreview?: DragState | null;
  large?: boolean;
  functionMap?: FunctionMap;
  showFunctions?: boolean;
  titleLabel?: string;
}

function AnnotatedPhoto({ imageSrc, controls, positions, selected, hovered, externalHighlight,
  warningControls, onSelect, onHover, placing, activeControl, dragPreview, large, functionMap, showFunctions, titleLabel }: PhotoProps) {

  function active(name: string) {
    return selected === name || hovered === name || externalHighlight === name;
  }
  function warned(name: string) {
    return !!warningControls?.includes(name);
  }
  const fontSize = large ? 15 : 11;
  const dotR = large ? 1.5 : 1.1;

  return (
    <div style={{ position:'relative', lineHeight:0 }}>
      <img
        src={imageSrc}
        alt="MT12 diagram"
        style={{ display:'block', width:'100%', height:'auto' }}
        draggable={false}
      />

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents: placing ? 'none' : 'auto' }}
      >
        {controls.map((c) => {
          const pos = positions[c.name];
          if (!pos) return null;
          const on = active(c.name);
          const { lx, ly } = getLabelPos(pos);
          const col = c.inert ? '#6b7280' : warned(c.name) ? '#f59e0b' : '#3b82f6';
          const lineEnd = retract(pos.dx, pos.dy, lx, ly, 4);
          return (
            <g key={c.name}
              onClick={(e) => { if (!placing) { e.stopPropagation(); if (!c.inert) onSelect?.(c.name); } }}
              onMouseEnter={() => { if (!placing) onHover?.(c.name); }}
              onMouseLeave={() => { if (!placing) onHover?.(null); }}
              style={{ cursor: placing ? 'crosshair' : (c.inert ? 'default' : 'pointer') }}
            >
              <line x1={pos.dx} y1={pos.dy} x2={lineEnd.x} y2={lineEnd.y}
                stroke={col} strokeWidth={on ? 0.7 : 0.4} strokeLinecap="round"
                strokeDasharray={pos.lineStyle === 'dashed' ? '2 1.5' : undefined} />
              <circle cx={pos.dx} cy={pos.dy} r={on ? dotR * 1.4 : dotR}
                fill={col} stroke="rgba(0,0,0,0.6)" strokeWidth="0.4" />
            </g>
          );
        })}

        {placing && dragPreview && (() => {
          const previewEnd = retract(dragPreview.dotX, dragPreview.dotY, dragPreview.curX, dragPreview.curY, 4);
          return (
            <g>
              <circle cx={dragPreview.dotX} cy={dragPreview.dotY} r={dotR * 1.4}
                fill="#f59e0b" stroke="rgba(0,0,0,0.6)" strokeWidth="0.4" />
              <line x1={dragPreview.dotX} y1={dragPreview.dotY}
                    x2={previewEnd.x} y2={previewEnd.y}
                stroke="#f59e0b" strokeWidth="0.6" strokeDasharray="2 1.5" strokeLinecap="round" />
              <circle cx={dragPreview.curX} cy={dragPreview.curY} r={1.2}
                fill="none" stroke="#f59e0b" strokeWidth="0.6" />
            </g>
          );
        })()}

        {placing && activeControl && !dragPreview && (() => {
          const pos = positions[activeControl];
          if (!pos) return null;
          return (
            <g>
              <circle cx={pos.dx} cy={pos.dy} r={2.5}
                fill="none" stroke="#f59e0b" strokeWidth="0.8" />
              <line x1={pos.dx - 4} y1={pos.dy} x2={pos.dx + 4} y2={pos.dy}
                stroke="#f59e0b" strokeWidth="0.5" />
              <line x1={pos.dx} y1={pos.dy - 4} x2={pos.dx} y2={pos.dy + 4}
                stroke="#f59e0b" strokeWidth="0.5" />
            </g>
          );
        })()}
      </svg>

      {controls.map((c) => {
        const pos = positions[c.name];
        if (!pos) return null;
        const on = active(c.name);
        const { lx, ly, anchor } = getLabelPos(pos);
        const transform = anchor === 'end' ? 'translate(-100%,-50%)'
                        : anchor === 'middle' ? 'translate(-50%,-50%)'
                        : 'translate(0,-50%)';
        const textAlign = anchor === 'end' ? 'right' : anchor === 'middle' ? 'center' : 'left';
        return (
          <div key={c.name}
            onClick={(e) => { if (!placing) { e.stopPropagation(); if (!c.inert) onSelect?.(c.name); } }}
            onMouseEnter={() => { if (!placing) onHover?.(c.name); }}
            onMouseLeave={() => { if (!placing) onHover?.(null); }}
            style={{
              position:'absolute', left:`${lx}%`, top:`${ly}%`,
              transform, textAlign,
              cursor: placing ? 'crosshair' : (c.inert ? 'default' : 'pointer'),
              lineHeight: 1.15,
              pointerEvents: placing ? 'none' : 'auto',
            }}
          >
            {(() => {
              const fns = showFunctions ? (functionMap?.[c.name] ?? []) : [];
              const hasFunction = fns.length > 0;
              const labelText = showFunctions ? (hasFunction ? fns[0] : c.name) : c.name;
              const isMapped = showFunctions && hasFunction;
              const w = warned(c.name) && !c.inert;
              return (
                <>
                  <span style={{
                    display:'inline-block', fontSize, fontWeight: isMapped ? 700 : 500,
                    fontFamily:'system-ui,sans-serif',
                    color: on ? '#fff' : (c.inert ? '#e5e7eb' : (isMapped ? '#dbeafe' : (showFunctions ? 'rgba(255,255,255,0.3)' : '#fff'))),
                    background: on ? (c.inert ? 'rgba(55,65,81,0.85)' : (w ? 'rgba(217,119,6,0.9)' : 'rgba(29,78,216,0.85)'))
                                   : (w ? 'rgba(217,119,6,0.9)' : (isMapped ? 'rgba(0,0,0,0.65)' : (showFunctions ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.35)'))),
                    padding:'1px 5px', borderRadius:3,
                    whiteSpace:'nowrap',
                  }}>{labelText}</span>
                  {showFunctions && fns.slice(1).map((fn, i) => (
                    <span key={i} style={{
                      display:'block', marginTop:2, fontSize: fontSize * 0.82,
                      fontFamily:'system-ui,sans-serif',
                      color:'#fff',
                      background:'rgba(0,0,0,0.65)',
                      padding:'1px 5px', borderRadius:3,
                      whiteSpace:'nowrap',
                    }}>{fn}</span>
                  ))}
                  {on && (
                    <span style={{
                      display:'block', marginTop:2, fontSize: fontSize * 0.82,
                      fontFamily:'system-ui,sans-serif',
                      color:'#fff',
                      background:'rgba(0,0,0,0.75)',
                      padding:'1px 5px', borderRadius:3,
                      whiteSpace:'nowrap',
                    }}>{showFunctions && hasFunction ? c.name : c.desc}</span>
                  )}
                </>
              );
            })()}
          </div>
        );
      })}

      {placing && dragPreview && activeControl && (
        <div style={{
          position:'absolute',
          left:`${dragPreview.curX}%`,
          top:`${dragPreview.curY}%`,
          transform: 'translate(6px,-50%)',
          pointerEvents:'none',
        }}>
          <span style={{
            display:'block', fontSize: large ? 15 : 11, fontWeight:700,
            fontFamily:'system-ui,sans-serif',
            color:'#f59e0b',
            textShadow:'0 0 4px #000,0 0 8px #000',
            whiteSpace:'nowrap',
          }}>{activeControl}</span>
        </div>
      )}

      {titleLabel && (
        <div style={{
          position:'absolute', left:'50%', bottom:'6%',
          transform:'translateX(-50%)',
          textAlign:'center',
          pointerEvents:'none',
        }}>
          <span style={{
            display:'inline-block',
            fontSize: large ? 13 : 10,
            fontWeight: 600,
            fontFamily:'system-ui,sans-serif',
            color:'#fff',
            background:'rgba(0,0,0,0.6)',
            padding:'2px 8px',
            borderRadius: 3,
            whiteSpace:'nowrap',
          }}>{titleLabel}</span>
        </div>
      )}
    </div>
  );
}

// ── AnnotatedDiagram ───────────────────────────────────────────────────────────
// Self-contained diagram panel with SD card persistence, zoom, and drag-to-place labels.

interface DiagramProps {
  imageSrc: string;
  controls: CtrlDef[];
  builtinPositions: Positions;
  webConfigKey: string;
  sdRoot: SdRoot | null;
  selected?: string;
  onSelect?: (name: string) => void;
  externalHighlight?: string | null;
  warningControls?: string[];
  diagramLabel?: string;
  functionMap?: FunctionMap;
  showFunctions?: boolean;
  legacyLocalStorageKey?: string;
}

function AnnotatedDiagram({ imageSrc, controls, builtinPositions, webConfigKey, sdRoot,
  selected, onSelect, externalHighlight, warningControls, diagramLabel, functionMap, showFunctions,
  legacyLocalStorageKey }: DiagramProps) {

  const [hovered, setHovered] = useState<string | null>(null);
  const [enlarged, setEnlarged] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [activeControl, setActiveControl] = useState<string>(controls[0]?.name ?? '');
  const [positions, setPositions] = useState<Positions>(builtinPositions);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!sdRoot) { setPositions(builtinPositions); return; }
    (async () => {
      let saved = await readWebConfig<Positions>(sdRoot, webConfigKey);
      if (!saved && legacyLocalStorageKey) {
        try {
          const legacy = localStorage.getItem(legacyLocalStorageKey);
          if (legacy) {
            saved = JSON.parse(legacy);
            await writeWebConfig(sdRoot, webConfigKey, saved);
            localStorage.removeItem(legacyLocalStorageKey);
          }
        } catch (e) {
          setSaveError(`Could not save label positions: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      if (saved) setPositions(saved);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdRoot, webConfigKey]);

  useEffect(() => {
    if (!enlarged) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setPlacing(false); setDragState(null); setEnlarged(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enlarged]);

  const placed = controls.filter(c => positions[c.name]);
  const allPlaced = placed.length === controls.length;

  async function savePositions(next: Positions) {
    setPositions(next);
    if (sdRoot) {
      try {
        await writeWebConfig(sdRoot, webConfigKey, next);
        setSaveError(null);
      } catch (e) {
        setSaveError(`Could not save label positions: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  function pctFromPointer(e: React.PointerEvent<HTMLDivElement>): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10));
    const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10));
    return { x, y };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!placing) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = pctFromPointer(e);
    setDragState({ dotX: x, dotY: y, curX: x, curY: y });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState) return;
    const { x, y } = pctFromPointer(e);
    setDragState(prev => prev ? { ...prev, curX: x, curY: y } : null);
  }

  async function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState) return;
    const { x, y } = pctFromPointer(e);
    const wasAllPlaced = controls.every(c => positions[c.name]);
    const next: Positions = {
      ...positions,
      [activeControl]: { dx: dragState.dotX, dy: dragState.dotY, lx: x, ly: y },
    };
    await savePositions(next);
    setDragState(null);
    const idx = controls.findIndex(c => c.name === activeControl);
    const nextCtrl = controls.slice(idx + 1).find(c => !next[c.name])
                  ?? controls.find(c => !next[c.name]);
    if (nextCtrl) setActiveControl(nextCtrl.name);
    else if (!wasAllPlaced) setPlacing(false);
  }

  return (
    <div>
      {saveError && (
        <div style={{ fontSize: 11, color: 'var(--danger)', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 4, padding: '4px 8px', marginBottom: 4 }}>
          {saveError}
        </div>
      )}

      {/* Toolbar */}
      {sdRoot ? (
        <div className={css.placeBar}>
          <button className={css.placeBtn} onClick={() => { setPlacing(true); setEnlarged(true); }}>
            {allPlaced ? '⚙ Reposition labels' : '⚙ Place control labels'}
          </button>
          {!confirmingClear && (
            <button className={css.placeBtn} onClick={() => setConfirmingClear(true)}>Reset</button>
          )}
          {confirmingClear && (
            <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
              <span style={{ color:'var(--text)' }}>Reset to defaults?</span>
              <button className="btn btn-danger btn-sm" onClick={() => { savePositions(builtinPositions); setConfirmingClear(false); }}>
                Reset
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmingClear(false)}>Cancel</button>
            </span>
          )}
          {!allPlaced && Object.keys(positions).length > 0 && (
            <span className={css.placeHint}>{placed.length}/{controls.length} placed</span>
          )}
        </div>
      ) : (
        <p className={css.hint} style={{ marginBottom: 4 }}>
          Connect your SD card to reposition labels.
        </p>
      )}

      {/* Photo — click to zoom */}
      <div
        className={css.photoWrap}
        style={{ cursor: 'zoom-in', position: 'relative' }}
        onClick={() => setEnlarged(true)}
      >
        <AnnotatedPhoto
          imageSrc={imageSrc}
          controls={controls}
          positions={positions}
          selected={selected}
          hovered={hovered}
          externalHighlight={externalHighlight}
          warningControls={warningControls}
          onSelect={onSelect}
          onHover={setHovered}
          functionMap={functionMap}
          showFunctions={showFunctions}
          titleLabel={diagramLabel}
        />
      </div>

      {/* Enlarged modal */}
      {enlarged && (
        <div
          style={{
            position:'fixed', inset:0,
            background:'rgba(0,0,0,0.92)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            gap:12, zIndex:500,
          }}
          onClick={() => { if (!placing) setEnlarged(false); }}
        >
          {placing && (
            <div
              style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}
              onClick={(e) => e.stopPropagation()}
            >
              <span style={{ color:'#f59e0b', fontFamily:'system-ui', fontSize:14 }}>
                {dragState
                  ? <>Drag to place label for <strong style={{ color:'#fbbf24' }}>{activeControl}</strong>, then release</>
                  : <>Click <strong style={{ color:'#fbbf24' }}>{activeControl}</strong> on the photo, drag to where you want its label</>
                }
              </span>
              <select
                style={{ background:'#1e293b', color:'#fff', border:'1px solid #475569', borderRadius:4, padding:'3px 8px', fontSize:13 }}
                value={activeControl}
                onChange={(e) => setActiveControl(e.target.value)}
              >
                {controls.map((c) => (
                  <option key={c.name} value={c.name}>
                    {positions[c.name] ? '✓' : '○'} {c.name} — {c.desc}
                  </option>
                ))}
              </select>
              {positions[activeControl] && (() => {
                const cur = positions[activeControl].lineStyle ?? 'solid';
                return (
                  <button
                    title={cur === 'dashed' ? 'Line: dashed (click for solid)' : 'Line: solid (click for dashed)'}
                    style={{ background:'#1e293b', border:'1px solid #475569', color:'#fff', borderRadius:4, padding:'3px 8px', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:6 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const next: Positions = {
                        ...positions,
                        [activeControl]: { ...positions[activeControl], lineStyle: cur === 'dashed' ? undefined : 'dashed' },
                      };
                      savePositions(next);
                    }}
                  >
                    <svg width="28" height="10" viewBox="0 0 28 10" style={{ display:'block' }}>
                      {cur === 'dashed'
                        ? <line x1="1" y1="5" x2="27" y2="5" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
                        : <line x1="1" y1="5" x2="27" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      }
                    </svg>
                    {cur === 'dashed' ? 'Dashed' : 'Solid'}
                  </button>
                );
              })()}
              <button
                style={{ background:'#3b82f6', border:'none', color:'#fff', borderRadius:4, padding:'4px 12px', cursor:'pointer', fontSize:13 }}
                onClick={(e) => { e.stopPropagation(); setPlacing(false); setDragState(null); setEnlarged(false); }}
              >
                Done
              </button>
            </div>
          )}

          <div
            style={{
              position:'relative', width:'90vmin', maxWidth:860,
              cursor: placing ? 'crosshair' : 'default',
              userSelect: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={placing ? handlePointerDown : undefined}
            onPointerMove={placing ? handlePointerMove : undefined}
            onPointerUp={placing ? handlePointerUp : undefined}
          >
            {!placing && (
              <button onClick={() => setEnlarged(false)} style={{
                position:'absolute', top:-36, right:0,
                background:'none', border:'none', color:'#fff',
                fontSize:14, cursor:'pointer', fontFamily:'system-ui', padding:'4px 8px',
              }}>✕ Close</button>
            )}
            <AnnotatedPhoto
              imageSrc={imageSrc}
              controls={controls}
              positions={positions}
              selected={selected}
              hovered={hovered}
              externalHighlight={externalHighlight}
              warningControls={warningControls}
              onSelect={(name) => { onSelect?.(name); if (!placing) setEnlarged(false); }}
              onHover={setHovered}
              placing={placing}
              activeControl={activeControl}
              dragPreview={dragState}
              functionMap={functionMap}
              showFunctions={showFunctions}
              titleLabel={diagramLabel}
              large
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

interface Props {
  sdRoot: SdRoot | null;
  model?: Model;
  selected?: string;
  onSelect?: (name: string) => void;
  warningControls?: string[];
  className?: string;
}

export function Mt12Diagram({ sdRoot, model, selected, onSelect, warningControls, className }: Props) {
  const externalHighlight = useEditorStore(s => s.diagramHighlight);
  const expansionModule = useEditorStore(s => s.expansionModule);
  const moduleType = expansionModule();
  const [showFunctions, setShowFunctions] = useState(() => localStorage.getItem('mt12-show-functions') === 'true');
  const functionMap = useMemo(() => model ? buildFunctionMap(model) : undefined, [model]);

  const moduleImg = MODULE_IMAGE[moduleType];
  const moduleControls = MODULE_CONTROLS[moduleType];
  const moduleBuiltin = MODULE_BUILTIN_POSITIONS[moduleType] ?? {};

  return (
    <div className={`${css.root} ${className ?? ''}`}>

      {/* TX diagram */}
      <AnnotatedDiagram
        imageSrc="/mt12-view2.jpg"
        controls={CONTROLS}
        builtinPositions={BUILTIN_POSITIONS}
        webConfigKey="diagram-labels.json"
        legacyLocalStorageKey="mt12-dot-positions"
        sdRoot={sdRoot}
        selected={selected}
        onSelect={onSelect}
        externalHighlight={externalHighlight}
        warningControls={warningControls}
        functionMap={functionMap}
        showFunctions={showFunctions}
      />

      {/* Labels / Functions toggle — only when model data available */}
      {model && (
        <div className={css.viewToggle} onClick={() => setShowFunctions(v => { const next = !v; localStorage.setItem('mt12-show-functions', String(next)); return next; })}>
          <span className={`${css.viewToggleLabel} ${!showFunctions ? css.viewToggleLabelActive : ''}`}>Labels</span>
          <div className={css.toggleTrack}>
            <div className={`${css.toggleThumb} ${showFunctions ? css.toggleThumbRight : ''}`} />
          </div>
          <span className={`${css.viewToggleLabel} ${showFunctions ? css.viewToggleLabelActive : ''}`}>Functions</span>
        </div>
      )}

      {!sdRoot && (
        <p className={css.hint}>Blue = switches &amp; knobs · Grey = trim levers (reference only)</p>
      )}

      {/* Expansion module diagram — only when a module is configured and has an image */}
      {moduleType !== 'none' && moduleImg && moduleControls && (
        <div style={{ marginTop: 12 }}>
          <AnnotatedDiagram
            imageSrc={moduleImg}
            controls={moduleControls}
            builtinPositions={moduleBuiltin}
            webConfigKey={`diagram-module-${moduleType}-labels.json`}
            sdRoot={sdRoot}
            externalHighlight={externalHighlight}
            warningControls={warningControls}
            diagramLabel={EXPANSION_MODULES[moduleType]?.label ?? 'Expansion module'}
          />
        </div>
      )}
    </div>
  );
}
