import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { Model, MixLine } from '../../types/model.ts';
import { ChannelGroup } from './ChannelGroup.tsx';
import { MixLineModal } from './MixLineModal.tsx';
import { buildSwitchUsageMap } from '../../codec/modelSummary.ts';
import type { ExpansionConflict } from '../models/expansionConflict.ts';
import css from './MixEditor.module.css';

interface Props {
  model: Model;
  onChange: (updater: (m: Model) => Model) => void;
  expansionConflict?: ExpansionConflict | null;
}

function blankMixLine(destCh: number): MixLine {
  return {
    weight: 100,
    destCh,
    srcRaw: 'NONE',
    carryTrim: 0,
    mixWarn: 0,
    mltpx: 'ADD',
    offset: 0,
    swtch: 'NONE',
    flightModes: '000000000',
    delayUp: 0,
    delayDown: 0,
    speedUp: 0,
    speedDown: 0,
    name: '',
  };
}

// Reorder within a channel: find lines belonging to destCh, move oldIdx→newIdx,
// then reconstruct the flat mixData array preserving inter-channel order.
function reorderWithinChannel(
  mixData: MixLine[],
  destCh: number,
  globalOldIdx: number,
  globalNewIdx: number,
): MixLine[] {
  // Extract channel line indices in order
  const channelGlobalIdxs = mixData
    .map((_, i) => i)
    .filter((i) => mixData[i].destCh === destCh);

  const oldPos = channelGlobalIdxs.indexOf(globalOldIdx);
  const newPos = channelGlobalIdxs.indexOf(globalNewIdx);
  if (oldPos === -1 || newPos === -1 || oldPos === newPos) return mixData;

  const reordered = arrayMove(channelGlobalIdxs, oldPos, newPos);

  // Build new flat array: replace channel positions with reordered
  const result = [...mixData];
  reordered.forEach((srcGlobalIdx, i) => {
    result[channelGlobalIdxs[i]] = mixData[srcGlobalIdx];
  });
  return result;
}

export function MixEditor({ model, onChange, expansionConflict }: Props) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [isNewLine, setIsNewLine] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const mixData = model.mixData ?? [];

  // Group lines by channel (0-based destCh), preserving global indices.
  const byChannel = new Map<number, { line: MixLine; globalIdx: number }[]>();
  mixData.forEach((line, idx) => {
    const ch = line.destCh;
    if (!byChannel.has(ch)) byChannel.set(ch, []);
    byChannel.get(ch)!.push({ line, globalIdx: idx });
  });

  // Show channels that have lines, sorted by channel number.
  const usedChannels = Array.from(byChannel.keys()).sort((a, b) => a - b);

  const emptyChannels = Array.from({ length: 16 }, (_, i) => i).filter((ch) => !byChannel.has(ch));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIdx = parseInt(String(active.id), 10);
    const overIdx = parseInt(String(over.id), 10);

    // Only reorder within same channel.
    if (mixData[activeIdx]?.destCh !== mixData[overIdx]?.destCh) return;

    const destCh = mixData[activeIdx].destCh;
    const newMixData = reorderWithinChannel(mixData, destCh, activeIdx, overIdx);
    onChange((m) => ({ ...m, mixData: newMixData }));
  }

  function handleSaveLine(globalIdx: number, line: MixLine) {
    onChange((m) => {
      const mixData = [...m.mixData];
      mixData[globalIdx] = line;
      return { ...m, mixData };
    });
  }

  function handleDeleteLine(globalIdx: number) {
    onChange((m) => ({
      ...m,
      mixData: m.mixData.filter((_, i) => i !== globalIdx),
    }));
  }

  function handleAddLine(destCh: number) {
    const newLine = blankMixLine(destCh);
    const data = model.mixData ?? [];
    const lastChannelIdx = data.map((l, i) => ({ l, i }))
      .filter(({ l }) => l.destCh === destCh)
      .pop()?.i ?? -1;
    const insertAt = lastChannelIdx + 1;

    onChange((m) => {
      const newData = [...m.mixData];
      newData.splice(insertAt, 0, newLine);
      return { ...m, mixData: newData };
    });
    setEditingIdx(insertAt);
    setIsNewLine(true);
  }

  const allIds = mixData.map((_, i) => String(i));

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className={css.root}>
        <div className={css.toolbar}>
          <span className={css.hint}>{mixData.length} mix line{mixData.length !== 1 ? 's' : ''}</span>
          {emptyChannels.length > 0 && (
            <select
              className="btn btn-ghost btn-sm"
              value=""
              onChange={(e) => { if (e.target.value !== '') handleAddLine(parseInt(e.target.value, 10)); }}
            >
              <option value="">+ Add channel…</option>
              {emptyChannels.map((ch) => (
                <option key={ch} value={ch}>CH{ch + 1}</option>
              ))}
            </select>
          )}
        </div>

        <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
          <div className={css.groups}>
            {/* Show channels with lines */}
            {usedChannels.map((ch) => (
              <ChannelGroup
                key={ch}
                ch={ch + 1}
                lines={byChannel.get(ch) ?? []}
                model={model}
                defaultOpen={true}
                onEdit={(globalIdx) => setEditingIdx(globalIdx)}
                onAddLine={handleAddLine}
              />
            ))}
          </div>
        </SortableContext>
      </div>

      {editingIdx !== null && mixData[editingIdx] && (
        <MixLineModal
          line={mixData[editingIdx]}
          onSave={(line) => { handleSaveLine(editingIdx, line); setIsNewLine(false); setEditingIdx(null); }}
          onDelete={() => { handleDeleteLine(editingIdx); setEditingIdx(null); setIsNewLine(false); }}
          onClose={() => {
            if (isNewLine) handleDeleteLine(editingIdx);
            setEditingIdx(null);
            setIsNewLine(false);
          }}
          inUse={buildSwitchUsageMap(model)}
          expansionConflict={expansionConflict}
        />
      )}
    </DndContext>
  );
}
