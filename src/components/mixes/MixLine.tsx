import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { MixLine as MixLineData, Model } from '../../types/model.ts';
import { srcRawLabel } from '../../codec/srcRaw.ts';
import { switchLabel } from '../../codec/switches.ts';
import { describeMix } from './mixProse.ts';
import css from './MixLine.module.css';

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
    <div ref={setNodeRef} style={style} className={`${css.row} ${isDragging ? css.dragging : ''}`}>
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
          {sw && <span className={css.sw}>{sw}</span>}
          {hasSpeed && <span className={css.tag}>SPD</span>}
          {hasDelay && <span className={css.tag}>DLY</span>}
        </div>
        <div className={css.prose}>{prose}</div>
      </button>
    </div>
  );
}
