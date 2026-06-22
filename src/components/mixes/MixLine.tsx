import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { MixLine as MixLineData, Model } from '../../types/model.ts';
import { srcRawLabel } from '../../codec/srcRaw.ts';
import { switchLabel } from '../../codec/switches.ts';
import { describeMix } from './mixProse.ts';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { Icon } from '../shared/Icon.tsx';
import { faToggleOn, faClock, faGauge } from '@fortawesome/free-solid-svg-icons';
import css from './MixLine.module.css';

// Physical controls that have a dot on the MT12 diagram
const DIAGRAM_CONTROLS = new Set(['SA','SB','SC','SD','FL1','FL2','P1','P2','P3','P4','TH']);

function srcToControl(srcRaw: string): string | null {
  if (DIAGRAM_CONTROLS.has(srcRaw)) return srcRaw;
  // Strip switch position: "SC2" → "SC"
  const stripped = srcRaw.replace(/\d+$/, '');
  if (DIAGRAM_CONTROLS.has(stripped)) return stripped;
  return null;
}

interface Props {
  line: MixLineData;
  id: string;
  model?: Model;
  channelLines?: MixLineData[];
  lineIndex?: number;
  onEdit: () => void;
}

const MLTPX_SYMBOL: Record<string, string> = {
  ADD: '+',
  MUL: '×',
  REPL: '=',
};

export function MixLineRow({ line, id, model, channelLines, lineIndex, onEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const setHighlight = useEditorStore(s => s.setDiagramHighlight);
  const control = srcToControl(line.srcRaw) ?? (line.swtch && line.swtch !== 'NONE' ? srcToControl(line.swtch.replace(/\d+$/, '')) : null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const src = srcRawLabel(line.srcRaw);
  const sw = line.swtch && line.swtch !== 'NONE' ? switchLabel(line.swtch) : null;
  const mltpx = MLTPX_SYMBOL[line.mltpx] ?? line.mltpx;
  const hasSpeed = line.speedUp || line.speedDown;
  const hasDelay = line.delayUp || line.delayDown;

  const prose = model && channelLines != null && lineIndex != null
    ? describeMix(line, { model, channelLines, lineIndex })
    : describeMix(line);

  return (
    <div ref={setNodeRef} style={style} className={`${css.row} ${isDragging ? css.dragging : ''}`}
      onMouseEnter={() => control && setHighlight(control)}
      onMouseLeave={() => setHighlight(null)}
    >
      <button className={css.handle} {...attributes} {...listeners} title="Drag to reorder">
        ⠿
      </button>

      <button className={css.content} onClick={onEdit}>
        <div className={css.tags}>
          <span className={css.name}>{line.name || src}</span>
          <span className={css.src}>{src}</span>
          <span className={css.mltpx}>{mltpx}</span>
          <span className={css.weight}>{line.weight > 0 ? '+' : ''}{line.weight}%</span>
          {line.offset !== 0 && <span className={css.offset}>off {line.offset}%</span>}
          {sw && <span className={css.sw}><Icon icon={faToggleOn} size={10} />{sw}</span>}
          {hasSpeed && <span className={css.tag}><Icon icon={faGauge} size={10} />SPD</span>}
          {hasDelay && <span className={css.tag}><Icon icon={faClock} size={10} />DLY</span>}
        </div>
        <div className={css.prose}>{prose}</div>
      </button>
    </div>
  );
}
