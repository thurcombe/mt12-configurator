// MT12 diagram with built-in calibration mode.
// In calibration: mousedown places the dot, drag to where you want the label, release places label + line.

import { useState } from 'react';
import css from './Mt12Diagram.module.css';

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


const STORAGE_KEY = 'mt12-dot-positions';

interface DotPos {
  dx: number; dy: number;   // dot position (%)
  lx?: number; ly?: number; // label position (%) — undefined = use autoLabel fallback
}

interface DragState {
  dotX: number; dotY: number;
  curX: number; curY: number;
}

type Positions = Record<string, DotPos>;

function loadPositions(): Positions {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function savePositions(p: Positions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

// Fallback auto-placement for dots that only have dx/dy (old calibrations or no drag).
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

// Pulls line endpoint back toward the dot by `gap` units so there's breathing room before the label.
function retract(dx: number, dy: number, lx: number, ly: number, gap: number): { x: number; y: number } {
  const vx = lx - dx, vy = ly - dy;
  const len = Math.sqrt(vx * vx + vy * vy);
  if (len <= gap) return { x: lx, y: ly };
  return { x: lx - (vx / len) * gap, y: ly - (vy / len) * gap };
}

function getLabelPos(pos: DotPos): { lx: number; ly: number; anchor: 'start'|'middle'|'end' } {
  if (pos.lx !== undefined && pos.ly !== undefined) {
    // Use absolute position to determine anchor so labels near edges extend inward.
    // Left quarter → text goes right; right quarter → text goes left; otherwise by relative direction.
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
  onSelect?: (name: string) => void;
  onHover?: (name: string | null) => void;
  calibrating?: boolean;
  calibTarget?: string;
  dragPreview?: DragState | null;
  large?: boolean;
}

function AnnotatedPhoto({ positions, selected, hovered, onSelect, onHover,
  calibrating, calibTarget, dragPreview, large }: PhotoProps) {

  function active(name: string) { return selected === name || hovered === name; }
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
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents: calibrating ? 'none' : 'auto' }}
      >
        {CONTROLS.map((c) => {
          const pos = positions[c.name];
          if (!pos) return null;
          const on = active(c.name);
          const { lx, ly } = getLabelPos(pos);
          const col = on ? '#3b82f6' : (c.inert ? '#6b7280' : '#1e40af');
          const lineEnd = retract(pos.dx, pos.dy, lx, ly, 2.5);
          return (
            <g key={c.name}
              onClick={(e) => { if (!calibrating) { e.stopPropagation(); if (!c.inert) onSelect?.(c.name); } }}
              onMouseEnter={() => { if (!calibrating) onHover?.(c.name); }}
              onMouseLeave={() => { if (!calibrating) onHover?.(null); }}
              style={{ cursor: calibrating ? 'crosshair' : (c.inert ? 'default' : 'pointer') }}
            >
              <line x1={pos.dx} y1={pos.dy} x2={lineEnd.x} y2={lineEnd.y}
                stroke={col} strokeWidth={on ? 0.7 : 0.4} strokeLinecap="round" />
              <circle cx={pos.dx} cy={pos.dy} r={on ? dotR * 1.4 : dotR}
                fill={col} stroke="rgba(0,0,0,0.6)" strokeWidth="0.4" />
            </g>
          );
        })}

        {/* Drag preview: dot + live leader line to cursor */}
        {calibrating && dragPreview && (() => {
          const previewEnd = retract(dragPreview.dotX, dragPreview.dotY, dragPreview.curX, dragPreview.curY, 2.5);
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

        {/* Calibration target crosshair (for already-placed dot of current target) */}
        {calibrating && calibTarget && !dragPreview && (() => {
          const pos = positions[calibTarget];
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

      {/* HTML labels */}
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
            onClick={(e) => { if (!calibrating) { e.stopPropagation(); if (!c.inert) onSelect?.(c.name); } }}
            onMouseEnter={() => { if (!calibrating) onHover?.(c.name); }}
            onMouseLeave={() => { if (!calibrating) onHover?.(null); }}
            style={{
              position:'absolute', left:`${lx}%`, top:`${ly}%`,
              transform, textAlign,
              cursor: calibrating ? 'crosshair' : (c.inert ? 'default' : 'pointer'),
              lineHeight: 1.15,
              pointerEvents: calibrating ? 'none' : 'auto',
            }}
          >
            <span style={{
              display:'inline-block', fontSize, fontWeight:700,
              fontFamily:'system-ui,sans-serif',
              color: on ? '#fff' : (c.inert ? '#e5e7eb' : '#dbeafe'),
              background: on ? (c.inert ? 'rgba(55,65,81,0.85)' : 'rgba(29,78,216,0.85)')
                             : 'rgba(0,0,0,0.55)',
              padding:'1px 5px', borderRadius:3,
              whiteSpace:'nowrap',
            }}>{c.name}</span>
            {on && (
              <span style={{
                display:'block', marginTop:2, fontSize: fontSize * 0.82,
                fontFamily:'system-ui,sans-serif',
                color:'#fff',
                background:'rgba(0,0,0,0.75)',
                padding:'1px 5px', borderRadius:3,
                whiteSpace:'nowrap',
              }}>{c.desc}</span>
            )}
          </div>
        );
      })}

      {/* Preview label name at cursor tip */}
      {calibrating && dragPreview && calibTarget && (
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
          }}>{calibTarget}</span>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  selected?: string;
  onSelect?: (name: string) => void;
  compact?: boolean;
  className?: string;
}

export function Mt12Diagram({ selected, onSelect, className }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [enlarged, setEnlarged] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [calibTarget, setCalibTarget] = useState<string>(CONTROLS[0].name);
  const [positions, setPositions] = useState<Positions>(loadPositions);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const calibrated = CONTROLS.filter(c => positions[c.name]);
  const allCalibrated = calibrated.length === CONTROLS.length;

  function pctFromPointer(e: React.PointerEvent<HTMLDivElement>): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10));
    const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10));
    return { x, y };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!calibrating) return;
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

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState) return;
    const { x, y } = pctFromPointer(e);
    const next: Positions = {
      ...positions,
      [calibTarget]: { dx: dragState.dotX, dy: dragState.dotY, lx: x, ly: y },
    };
    setPositions(next);
    savePositions(next);
    setDragState(null);
    // Advance to next uncalibrated control
    const idx = CONTROLS.findIndex(c => c.name === calibTarget);
    const nextCtrl = CONTROLS.slice(idx + 1).find(c => !next[c.name])
                  ?? CONTROLS.find(c => !next[c.name]);
    if (nextCtrl) setCalibTarget(nextCtrl.name);
    else setCalibrating(false);
  }

  return (
    <div className={`${css.root} ${className ?? ''}`}>

      <div className={css.calibBar}>
        <button className={css.calibBtn} onClick={() => { setCalibrating(true); setEnlarged(true); }}>
          {allCalibrated ? '⚙ Re-calibrate' : '⚙ Calibrate dot positions'}
        </button>
        {Object.keys(positions).length > 0 && (
          <button className={css.calibBtn} onClick={() => {
            if (!window.confirm('Clear all calibration dots? You will need to re-calibrate from scratch.')) return;
            setPositions({});
            localStorage.removeItem(STORAGE_KEY);
          }}>
            Clear all
          </button>
        )}
        {!allCalibrated && Object.keys(positions).length > 0 && (
          <span className={css.calibHint}>{calibrated.length}/{CONTROLS.length} placed</span>
        )}
      </div>

      <div
        className={css.photoWrap}
        style={{ cursor: 'zoom-in' }}
        onClick={() => setEnlarged(true)}
      >
        <AnnotatedPhoto
          positions={positions}
          selected={selected}
          hovered={hovered}
          onSelect={onSelect}
          onHover={setHovered}
        />
        <span className={css.enlargeHint}>🔍 click to enlarge</span>
      </div>

{!calibrating && (
        <p className={css.hint}>Grey = trim levers · Click a label to go to its settings</p>
      )}

      {/* Enlarged modal — also used for calibration */}
      {enlarged && (
        <div
          style={{
            position:'fixed', inset:0,
            background:'rgba(0,0,0,0.92)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            gap:12, zIndex:500,
          }}
          onClick={() => { if (!calibrating) { setEnlarged(false); } }}
        >
          {calibrating && (
            <div
              style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}
              onClick={(e) => e.stopPropagation()}
            >
              <span style={{ color:'#f59e0b', fontFamily:'system-ui', fontSize:14 }}>
                {dragState
                  ? <>Drag to place label for <strong style={{ color:'#fbbf24' }}>{calibTarget}</strong>, then release</>
                  : <>Click <strong style={{ color:'#fbbf24' }}>{calibTarget}</strong> on the photo, then drag to place label</>
                }
              </span>
              <select
                style={{ background:'#1e293b', color:'#fff', border:'1px solid #475569', borderRadius:4, padding:'3px 8px', fontSize:13 }}
                value={calibTarget}
                onChange={(e) => setCalibTarget(e.target.value)}
              >
                {CONTROLS.map((c) => (
                  <option key={c.name} value={c.name}>
                    {positions[c.name] ? '✓' : '○'} {c.name} — {c.desc}
                  </option>
                ))}
              </select>
              <button
                style={{ background:'#3b82f6', border:'none', color:'#fff', borderRadius:4, padding:'4px 12px', cursor:'pointer', fontSize:13 }}
                onClick={(e) => { e.stopPropagation(); setCalibrating(false); setDragState(null); setEnlarged(false); }}
              >
                Done
              </button>
            </div>
          )}

          <div
            style={{
              position:'relative', width:'90vmin', maxWidth:860,
              cursor: calibrating ? 'crosshair' : 'default',
              userSelect: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={calibrating ? handlePointerDown : undefined}
            onPointerMove={calibrating ? handlePointerMove : undefined}
            onPointerUp={calibrating ? handlePointerUp : undefined}
          >
            {!calibrating && (
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
              onSelect={(name) => { onSelect?.(name); if (!calibrating) setEnlarged(false); }}
              onHover={setHovered}
              calibrating={calibrating}
              calibTarget={calibTarget}
              dragPreview={dragState}
              large
            />
          </div>
        </div>
      )}
    </div>
  );
}
