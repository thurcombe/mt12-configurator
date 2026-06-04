import type { MixLine, Model } from '../../types/model.ts';
import { summarizeLs } from '../../codec/logicalSwDef.ts';
import { switchLabel } from '../../codec/switches.ts';
import { srcRawLabel } from '../../codec/srcRaw.ts';
import { buildInputMap, detectRole, friendlySrcRaw, NAME_MAP } from '../../codec/modelSummary.ts';

export interface MixProseContext {
  model: Model;
  channelLines: MixLine[];  // all lines on this destCh, in order
  lineIndex: number;        // index of this line within channelLines
}

const LS_SRC_RE = /^ls\((\d+)\)$/;

function effectiveOutput(weight: number, offset: number, sourceValue: number): number {
  return Math.round((weight / 100) * sourceValue + offset);
}

// Describe a logical switch in terms of the physical switch the user sees.
function lsCondition(lsIndex1: number, model: Model): string {
  const ls = model.logicalSw?.[String(lsIndex1 - 1)];
  if (!ls) return `L${lsIndex1}`;
  return summarizeLs(ls);
}

function fmt01s(tenths: number): string {
  return `${(tenths / 10).toFixed(1)}s`;
}

// Compute the effective [min, max] output of an input source given the model's expo data.
// Input channels (I0, I1, ...) are defined by their expo line weight+offset.
// Physical sources (TH, P1, etc.) run the full ±100 range.
function inputRange(srcRaw: string, model: Model): [number, number] {
  const inputM = /^I(\d+)$/.exec(srcRaw);
  if (inputM) {
    const idx = parseInt(inputM[1]);
    const expo = (model.expoData ?? []).find(e => e.chn === idx);
    if (expo) {
      const lo = Math.round((-100 * expo.weight / 100) + expo.offset);
      const hi = Math.round(( 100 * expo.weight / 100) + expo.offset);
      return [Math.min(lo, hi), Math.max(lo, hi)];
    }
  }
  return [-100, 100];
}

export function describeMix(line: MixLine, ctx?: MixProseContext): string {
  if (!ctx) return fallback(line);

  const { model, channelLines, lineIndex } = ctx;
  const inputMap = buildInputMap(model.expoData ?? []);
  const role = detectRole(channelLines, inputMap, model);
  const roleName = role === 'Unknown' ? `CH${line.destCh + 1}` : role.toLowerCase();

  const nameKey = (line.name ?? '').toUpperCase().trim();
  const friendlyName = NAME_MAP[nameKey] ?? line.name ?? '';

  const linesBefore = channelLines.slice(0, lineIndex);
  const linesAfter  = channelLines.slice(lineIndex + 1);
  const addAfter  = linesAfter.find(l => l.mltpx === 'ADD');
  const mulAfter  = linesAfter.find(l => l.mltpx === 'MUL');
  // Preceding REPL line driven by a logical switch — gives this ADD line its contextual meaning
  const lsReplBefore = linesBefore.slice().reverse().find(
    l => l.mltpx === 'REPL' && LS_SRC_RE.test(l.srcRaw)
  );

  // ── Logical switch source ───────────────────────────────────────────────────
  const lsMatch = LS_SRC_RE.exec(line.srcRaw);
  if (lsMatch) {
    const condition = lsCondition(parseInt(lsMatch[1]), model);
    const onVal  = effectiveOutput(line.weight, line.offset, 100);
    const offVal = effectiveOutput(line.weight, line.offset, -100);

    let prose: string;
    switch (line.mltpx) {
      case 'REPL': {
        if (offVal === 0) {
          if (mulAfter) {
            const { label: mulSrc } = friendlySrcRaw(mulAfter.srcRaw, inputMap, model);
            const [mulMin, mulMax] = inputRange(mulAfter.srcRaw, model);
            const scaledMin = Math.round(onVal * mulMin / 100);
            const scaledMax = Math.round(onVal * mulMax / 100);
            prose = `When ${condition}, ${mulSrc} controls cruise speed (${scaledMin}–${scaledMax}%)`;
            if (addAfter) {
              const { label: addSrc } = friendlySrcRaw(addAfter.srcRaw, inputMap, model);
              prose += ` — ${addSrc} still adds on top`;
            }
          } else {
            prose = `When ${condition}, sets ${roleName} to ${onVal}%`;
            if (addAfter) {
              const { label: addSrc } = friendlySrcRaw(addAfter.srcRaw, inputMap, model);
              prose += ` — ${addSrc} still adds on top`;
            }
          }
        } else {
          prose = `Sets ${roleName} to ${onVal}% when ${condition}, ${offVal}% otherwise`;
          if (mulAfter) {
            const { label: mulSrc } = friendlySrcRaw(mulAfter.srcRaw, inputMap, model);
            prose += ` (scaled by ${mulSrc})`;
          }
        }
        break;
      }
      case 'ADD':
        prose = offVal === 0
          ? `Adds ${onVal}% to ${roleName} while ${condition}`
          : `Adds ${onVal}% when ${condition}, ${offVal > 0 ? '+' : ''}${offVal}% otherwise`;
        break;
      case 'MUL':
        prose = `Scales ${roleName} by ${condition}`;
        break;
      default:
        prose = `${condition} → ${roleName}`;
    }

    return friendlyName ? `${friendlyName}: ${lcFirst(prose)}` : prose;
  }

  // ── Continuous source ───────────────────────────────────────────────────────
  const { label: srcLabel } = friendlySrcRaw(line.srcRaw, inputMap, model);
  const w = line.weight;

  let prose: string;
  switch (line.mltpx) {
    case 'ADD': {
      if (lsReplBefore) {
        // There's a preceding cruise-style REPL — explain the dual role
        const replLsM = LS_SRC_RE.exec(lsReplBefore.srcRaw)!;
        const replCondition = lsCondition(parseInt(replLsM[1]), model);
        const offVal2 = effectiveOutput(lsReplBefore.weight, lsReplBefore.offset, -100);
        if (offVal2 === 0) {
          // When the preceding REPL is off it outputs 0, so this ADD is the sole source in that case
          prose = `Your ${srcLabel} trigger — provides all ${roleName} normally; adds extra on top when ${replCondition}`;
        } else {
          prose = `Adds ${srcLabel} trigger on top of the channel base`;
        }
      } else {
        const pct = Math.abs(w) !== 100 ? ` at ${Math.abs(w)}%` : '';
        const inv = w < 0 ? 'inverted ' : '';
        prose = `Adds ${inv}${srcLabel}${pct} to ${roleName}`;
        if (line.offset !== 0) prose += `, offset ${line.offset > 0 ? '+' : ''}${line.offset}%`;
      }
      break;
    }
    case 'MUL': {
      if (lsReplBefore) {
        const [mMin, mMax] = inputRange(line.srcRaw, model);
        if (mMin === 0) {
          prose = `${srcLabel} limits the total — turn it down to stop the vehicle entirely, up for full range`;
        } else {
          prose = `${srcLabel} scales the total output (${mMin}–${mMax}%)`;
        }
      } else {
        prose = `Scales ${roleName} by ${srcLabel}`;
        if (Math.abs(w) !== 100) prose += ` (${Math.abs(w)}%)`;
      }
      break;
    }
    case 'REPL':
      prose = `Sets ${roleName} to ${srcLabel}`;
      if (Math.abs(w) !== 100) prose += ` at ${Math.abs(w)}%`;
      if (w < 0) prose += ' (inverted)';
      if (line.offset !== 0) prose += `, offset ${line.offset > 0 ? '+' : ''}${line.offset}%`;
      break;
    default:
      prose = `${srcLabel} → ${roleName}`;
  }

  // Condition switch
  const sw = line.swtch && line.swtch !== 'NONE' ? switchLabel(line.swtch) : null;
  if (sw) prose += `, when ${sw}`;

  // Speed/delay
  const su = line.speedUp ?? 0, sd = line.speedDown ?? 0;
  if (su && sd && su === sd) prose += `, ramps over ${fmt01s(su)}`;
  else if (su && sd) prose += `, ramps up ${fmt01s(su)} / down ${fmt01s(sd)}`;
  else if (su) prose += `, ramps up over ${fmt01s(su)}`;
  else if (sd) prose += `, ramps down over ${fmt01s(sd)}`;

  const du = line.delayUp ?? 0, dd = line.delayDown ?? 0;
  if (du && dd && du === dd) prose += `, ${fmt01s(du)} delay`;
  else if (du) prose += `, ${fmt01s(du)} delay up`;
  else if (dd) prose += `, ${fmt01s(dd)} delay down`;

  return friendlyName ? `${friendlyName}: ${lcFirst(prose)}` : prose;
}

function lcFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

// Minimal fallback when no model context is available.
function fallback(line: MixLine): string {
  const src = srcRawLabel(line.srcRaw);
  const ch = `CH${line.destCh + 1}`;
  switch (line.mltpx) {
    case 'ADD':  return `Adds ${src} to ${ch}`;
    case 'MUL':  return `Scales ${ch} by ${src}`;
    case 'REPL': return `Sets ${ch} to ${src}`;
    default:     return `${src} → ${ch}`;
  }
}
