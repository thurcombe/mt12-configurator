import { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { MixLine, Model } from '../../types/model.ts';
import { MixLineRow } from './MixLine.tsx';
import css from './ChannelGroup.module.css';

interface Props {
  ch: number;
  lines: { line: MixLine; globalIdx: number }[];
  model?: Model;
  defaultOpen?: boolean;
  onEdit: (globalIdx: number) => void;
  onAddLine: (destCh: number) => void;
}

export function ChannelGroup({ ch, lines, model, defaultOpen = false, onEdit, onAddLine }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const ids = lines.map((l) => String(l.globalIdx));
  const channelLines = lines.map(l => l.line);

  return (
    <div className={css.group}>
      <button className={css.header} onClick={() => setOpen((o) => !o)}>
        <span className={css.caret}>{open ? '▾' : '▸'}</span>
        <span className={css.chLabel}>CH{ch}</span>
        <span className={css.count}>{lines.length} {lines.length === 1 ? 'mix' : 'mixes'}</span>
      </button>

      {open && (
        <div className={css.body}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {lines.map(({ line, globalIdx }, idx) => (
              <MixLineRow
                key={globalIdx}
                id={String(globalIdx)}
                line={line}
                model={model}
                channelLines={channelLines}
                lineIndex={idx}
                onEdit={() => onEdit(globalIdx)}
              />
            ))}
          </SortableContext>

          <button className={css.addBtn} onClick={() => onAddLine(ch - 1)}>
            + Add mix line
          </button>
        </div>
      )}
    </div>
  );
}
