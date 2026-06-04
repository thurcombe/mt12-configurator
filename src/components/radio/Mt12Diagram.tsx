// MT12 diagram with label-placement mode.
// Label positions are stored in .webconfig/diagram-labels.json on the SD card.
// The image always shows; labels and placement require an SD card connection.

import { useState, useEffect, useMemo } from 'react';
import type { SdRoot } from '../../fs/sdcard.ts';
import type { Model } from '../../types/model.ts';
import { readWebConfig, writeWebConfig } from '../../fs/webconfig.ts';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { buildInputMap } from '../../codec/modelSummary.ts';
import css from './Mt12Diagram.module.css';

// ── Function map ───────────────────────────────────────────────────────────────
// Derives what each physical control is used for in the current model.

type FunctionMap = Record<string, string[]>;

function buildFunctionMap(model: Model): FunctionMap {
  const result: FunctionMap = {};

  function add(ctrl: string, fn: string) {
    if (!ctrl || ctrl === 'NONE') return;
    if (!result[ctrl]) result[ctrl] = [];
    if (!result[ctrl].includes(fn)) result[ctrl].push(fn);
  }

  // Strip position digit to get physical control: "SC2" → "SC"
  function ctrl(sw: string) { return sw.replace(/^!/, '').replace(/\d+$/, ''); }

  // TH is always throttle trigger
  add('TH', 'Throttle trigger');

  // Pots: find which input channel each pot maps to, then look at mix names using that channel
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
      else add(pot, (inputMap[parseInt(inputM![1])] ?? name) || 'Input');
    }
    // Condition switches on mix lines
    if (line.swtch && line.swtch !== 'NONE' && line.swtch !== 'ON') {
      const sw = ctrl(line.swtch);
      if (name === 'CRUISE') add(sw, 'Cruise control');
    }
  }

  // Logical switches → underlying physical switches
  for (const ls of Object.values(model.logicalSw ?? {})) {
    const args = ls.def?.split(',') ?? [];
    const physSwitches = [...new Set(args.map(a => ctrl(a)).filter(s => s && s !== 'NONE' && /^[A-Z]/.test(s)))];
    // Find what uses this LS (crude: check mix and customFn)
    let lsFn = 'Logical switch';
    if (ls.func === 'FUNC_STICKY') lsFn = 'Cruise toggle';
    else if (ls.func === 'FUNC_AND') lsFn = 'Combined switch';
    else if (ls.func === 'FUNC_OR') lsFn = 'Either switch';
    for (const sw of physSwitches) add(sw, lsFn);
  }

  // Flight mode switches
  for (const [key, fm] of Object.entries(model.flightModeData ?? {})) {
    if (key === '0' || !fm.swtch || fm.swtch === 'NONE') continue;
    const sw = ctrl(fm.swtch);
    const label = fm.name?.trim() || (key === '1' ? 'KidControl' : `Drive mode ${key}`);
    add(sw, label);
  }

  // Special functions
  for (const fn of Object.values(model.customFn ?? {})) {
    if (!fn.swtch || fn.swtch === 'NONE') continue;
    const sw = ctrl(fn.swtch);
    let desc = fn.func ?? 'Special function';
    if (fn.func === 'PLAY_TRACK') desc = `Audio: ${fn.def?.split(',')[0] ?? ''}`;
    add(sw, desc);
  }

  return result;
}

interface CtrlDef {
  name: string;
  desc: string;
  inert?: boolean;
}

const CONTROLS: CtrlDef[] = [
  { name:'P1',  desc:'Scroll dial (top right)'        },
  { name:'P2',  desc:'Scroll dial (left of wheel)'    },
  { name:'SC',  desc:'2-position switch'              },
  { name:'SA',  desc:'3-position switch'              },
  { name:'TH',  desc:'Throttle trigger'               },
  { name:'SD',  desc:'Grip button (thumb)'            },
  { name:'T1',  desc:'Steering trim lever', inert:true },
  { name:'T2',  desc:'Steering trim lever', inert:true },
  { name:'T3',  desc:'Trim lever',          inert:true },
  { name:'T4',  desc:'Trim lever',          inert:true },
  { name:'T5',  desc:'Trim lever',          inert:true },
];

const WEBCONFIG_FILE = 'diagram-labels.json';
// Legacy localStorage key — migrated to SD card on first connection.
const LEGACY_KEY = 'mt12-dot-positions';

interface DotPos {
  dx: number; dy: number;
  lx?: number; ly?: number;
}

interface DragState {
  dotX: number; dotY: number;
  curX: number; curY: number;
}

type Positions = Record<string, DotPos>;

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

// ── Annotated photo ────────────────────────────────────────────────────────────

interface PhotoProps {
  positions: Positions;
  selected?: string;
  hovered?: string | null;
  externalHighlight?: string | null;
  onSelect?: (name: string) => void;
  onHover?: (name: string | null) => void;
  placing?: boolean;
  activeControl?: string;
  dragPreview?: DragState | null;
  large?: boolean;
  functionMap?: FunctionMap;
  showFunctions?: boolean;
}

function AnnotatedPhoto({ positions, selected, hovered, externalHighlight, onSelect, onHover,
  placing, activeControl, dragPreview, large, functionMap, showFunctions }: PhotoProps) {

  function active(name: string) {
    return selected === name || hovered === name || externalHighlight === name;
  }
  const fontSize = large ? 15 : 11;
  const dotR = large ? 1.5 : 1.1;

  return (
    <div style={{ position:'relative', lineHeight:0 }}>
      <img
        src="/mt12-view2.jpg"
        alt="MT12 right-side view"
        style={{ display:'block', width:'100%', height:'auto' }}
        draggable={false}
      />

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents: placing ? 'none' : 'auto' }}
      >
        {CONTROLS.map((c) => {
          const pos = positions[c.name];
          if (!pos) return null;
          const on = active(c.name);
          const { lx, ly } = getLabelPos(pos);
          const col = on ? '#3b82f6' : (c.inert ? '#6b7280' : '#1e40af');
          const lineEnd = retract(pos.dx, pos.dy, lx, ly, 4);
          return (
            <g key={c.name}
              onClick={(e) => { if (!placing) { e.stopPropagation(); if (!c.inert) onSelect?.(c.name); } }}
              onMouseEnter={() => { if (!placing) onHover?.(c.name); }}
              onMouseLeave={() => { if (!placing) onHover?.(null); }}
              style={{ cursor: placing ? 'crosshair' : (c.inert ? 'default' : 'pointer') }}
            >
              <line x1={pos.dx} y1={pos.dy} x2={lineEnd.x} y2={lineEnd.y}
                stroke={col} strokeWidth={on ? 0.7 : 0.4} strokeLinecap="round" />
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

      {CONTROLS.map((c) => {
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
              const labelText = showFunctions
                ? (hasFunction ? fns[0] : (c.inert ? c.desc : c.name))
                : c.name;
              const isMapped = showFunctions && hasFunction && !c.inert;
              return (
                <>
                  <span style={{
                    display:'inline-block', fontSize, fontWeight: isMapped ? 700 : 500,
                    fontFamily:'system-ui,sans-serif',
                    color: on ? '#fff' : (c.inert ? '#e5e7eb' : (isMapped ? '#dbeafe' : 'rgba(255,255,255,0.5)')),
                    background: on ? (c.inert ? 'rgba(55,65,81,0.85)' : 'rgba(29,78,216,0.85)')
                                   : (isMapped ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.35)'),
                    padding:'1px 5px', borderRadius:3,
                    whiteSpace:'nowrap',
                  }}>{labelText}</span>
                  {/* Show additional functions as extra pills */}
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
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  sdRoot: SdRoot | null;
  model?: Model;
  selected?: string;
  onSelect?: (name: string) => void;
  className?: string;
}

export function Mt12Diagram({ sdRoot, model, selected, onSelect, className }: Props) {
  const externalHighlight = useEditorStore(s => s.diagramHighlight);
  const [hovered, setHovered] = useState<string | null>(null);
  const [showFunctions, setShowFunctions] = useState(false);
  const functionMap = useMemo(() => model ? buildFunctionMap(model) : undefined, [model]);
  const [enlarged, setEnlarged] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [activeControl, setActiveControl] = useState<string>(CONTROLS[0].name);
  const [positions, setPositions] = useState<Positions>({});
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  // Load positions from SD card when it connects; migrate from localStorage if needed.
  useEffect(() => {
    if (!sdRoot) return;
    (async () => {
      let saved = await readWebConfig<Positions>(sdRoot, WEBCONFIG_FILE);
      if (!saved) {
        // One-time migration from localStorage.
        try {
          const legacy = localStorage.getItem(LEGACY_KEY);
          if (legacy) {
            saved = JSON.parse(legacy);
            await writeWebConfig(sdRoot, WEBCONFIG_FILE, saved);
            localStorage.removeItem(LEGACY_KEY);
          }
        } catch { /* ignore */ }
      }
      if (saved) setPositions(saved);
    })();
  }, [sdRoot]);

  // Escape closes the modal.
  useEffect(() => {
    if (!enlarged) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setPlacing(false); setDragState(null); setEnlarged(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enlarged]);

  const placed = CONTROLS.filter(c => positions[c.name]);
  const allPlaced = placed.length === CONTROLS.length;

  async function savePositions(next: Positions) {
    setPositions(next);
    if (sdRoot) await writeWebConfig(sdRoot, WEBCONFIG_FILE, next);
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
    const wasAllPlaced = CONTROLS.every(c => positions[c.name]);
    const next: Positions = {
      ...positions,
      [activeControl]: { dx: dragState.dotX, dy: dragState.dotY, lx: x, ly: y },
    };
    await savePositions(next);
    setDragState(null);
    const idx = CONTROLS.findIndex(c => c.name === activeControl);
    const nextCtrl = CONTROLS.slice(idx + 1).find(c => !next[c.name])
                  ?? CONTROLS.find(c => !next[c.name]);
    if (nextCtrl) setActiveControl(nextCtrl.name);
    else if (!wasAllPlaced) setPlacing(false);
  }

  return (
    <div className={`${css.root} ${className ?? ''}`}>

      {/* Labels / Functions toggle — shown when model data is available */}
      {model && (
        <div className={css.placeBar}>
          <button
            className={!showFunctions ? css.placeBtn : css.placeBtnActive}
            onClick={() => setShowFunctions(false)}
          >
            Labels
          </button>
          <button
            className={showFunctions ? css.placeBtn : css.placeBtnActive}
            onClick={() => setShowFunctions(true)}
          >
            Functions
          </button>
        </div>
      )}

      {/* Toolbar — only shown when SD card connected */}
      {sdRoot ? (
        <div className={css.placeBar}>
          <button className={css.placeBtn} onClick={() => { setPlacing(true); setEnlarged(true); }}>
            {allPlaced ? '⚙ Reposition labels' : '⚙ Place control labels'}
          </button>
          {Object.keys(positions).length > 0 && !confirmingClear && (
            <button className={css.placeBtn} onClick={() => setConfirmingClear(true)}>
              Clear all
            </button>
          )}
          {confirmingClear && (
            <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
              <span style={{ color:'var(--text)' }}>Remove all label positions?</span>
              <button className="btn btn-danger btn-sm" onClick={() => { savePositions({}); setConfirmingClear(false); }}>
                Remove
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmingClear(false)}>
                Cancel
              </button>
            </span>
          )}
          {!allPlaced && Object.keys(positions).length > 0 && (
            <span className={css.placeHint}>{placed.length}/{CONTROLS.length} placed</span>
          )}
        </div>
      ) : (
        <p className={css.hint} style={{ marginBottom: 4 }}>
          Connect your SD card to place control labels and enable input settings.
        </p>
      )}

      {/* Photo */}
      <div
        className={css.photoWrap}
        style={{ cursor: 'zoom-in', position: 'relative' }}
        onClick={() => setEnlarged(true)}
      >
        <AnnotatedPhoto
          positions={positions}
          selected={selected}
          hovered={hovered}
          externalHighlight={externalHighlight}
          onSelect={onSelect}
          onHover={setHovered}
          functionMap={functionMap}
          showFunctions={showFunctions}
        />

        {/* Overlay when no SD card */}
        {!sdRoot && (
          <div style={{
            position:'absolute', inset:0,
            background:'rgba(0,0,0,0.45)',
            display:'flex', alignItems:'center', justifyContent:'center',
            borderRadius:7,
          }}>
            <span style={{
              background:'rgba(0,0,0,0.75)',
              color:'#fff',
              fontSize:12,
              fontFamily:'system-ui,sans-serif',
              padding:'6px 14px',
              borderRadius:6,
              textAlign:'center',
              lineHeight:1.5,
            }}>
              Connect SD card<br/>to enable labels
            </span>
          </div>
        )}
      </div>

      {!placing && sdRoot && (
        <p className={css.hint}>Blue = switches &amp; knobs · Grey = trim levers (reference only)</p>
      )}

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
                {CONTROLS.map((c) => (
                  <option key={c.name} value={c.name}>
                    {positions[c.name] ? '✓' : '○'} {c.name} — {c.desc}
                  </option>
                ))}
              </select>
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
              positions={positions}
              selected={selected}
              hovered={hovered}
              externalHighlight={externalHighlight}
              onSelect={(name) => { onSelect?.(name); if (!placing) setEnlarged(false); }}
              onHover={setHovered}
              placing={placing}
              activeControl={activeControl}
              dragPreview={dragState}
              functionMap={functionMap}
              showFunctions={showFunctions}
              large
            />
          </div>
        </div>
      )}
    </div>
  );
}
