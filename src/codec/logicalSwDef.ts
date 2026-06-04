// Encode/decode the `def` field of a logical switch row.
// The format is func-dependent — a comma-separated list of arguments.
//
// Function categories and their def structure:
//   Two-source comparisons (FUNC_VEQUAL, FUNC_VNEG, FUNC_VPOS, FUNC_APOS,
//     FUNC_ANEG, FUNC_AND, FUNC_OR, FUNC_XOR):  "<src>,<threshold_or_src>"
//   Sticky (FUNC_STICKY, FUNC_LATCH):           "<set_sw>,<reset_sw>"
//   Edge (FUNC_EDGE):                           "<sw>,<low>,<high>"
//   Single-source bool (FUNC_DPOS, FUNC_DNEG):  "<src>"
//   Timer-based (FUNC_TIMER, FUNC_DELTA):       implementation-specific
//
// For Phase 1 we just pass the string through; UI layers parse it as needed.

export type LogicalSwFunc =
  | 'FUNC_VEQUAL' | 'FUNC_VNEG' | 'FUNC_VPOS'
  | 'FUNC_APOS'  | 'FUNC_ANEG'
  | 'FUNC_AND'   | 'FUNC_OR'   | 'FUNC_XOR'
  | 'FUNC_STICKY'| 'FUNC_LATCH'
  | 'FUNC_EDGE'
  | 'FUNC_DPOS'  | 'FUNC_DNEG'
  | 'FUNC_TIMER' | 'FUNC_DELTA';

export interface LogicalSwDecoded {
  func: LogicalSwFunc;
  args: string[];
}

// Split the raw def string into ordered args for the given function type.
export function decodeDef(func: string, def: string): LogicalSwDecoded {
  return {
    func: func as LogicalSwFunc,
    args: def ? def.split(',') : [],
  };
}

// Re-join args back into a def string.
export function encodeDef(_func: string, args: string[]): string {
  return args.join(',');
}

import { srcRawLabel } from './srcRaw.ts';
import { switchLabel } from './switches.ts';

// Plain-English description of what a logical switch does.
export function summarizeLs(ls: { func: string; def: string }): string {
  const args = ls.def ? ls.def.split(',') : [];
  const sw  = (i: number) => switchLabel(args[i] ?? 'NONE');
  const src = (i: number) => srcRawLabel(args[i] ?? '');
  const num = (i: number) => args[i] ?? '?';

  switch (ls.func) {
    case 'FUNC_AND':    return `${sw(0)} AND ${sw(1)}`;
    case 'FUNC_OR':     return `${sw(0)} OR ${sw(1)}`;
    case 'FUNC_XOR':    return `${sw(0)} XOR ${sw(1)}`;
    case 'FUNC_STICKY':
      return args[0] === args[1]
        ? `toggles on ${sw(0)}`
        : `ON when ${sw(0)}, OFF when ${sw(1)}`;
    case 'FUNC_LATCH':  return `set by ${sw(0)}, reset by ${sw(1)}`;
    case 'FUNC_VPOS':   return `${src(0)} > ${num(1)}`;
    case 'FUNC_VNEG':   return `${src(0)} < ${num(1)}`;
    case 'FUNC_VEQUAL': return `${src(0)} = ${num(1)}`;
    case 'FUNC_APOS':   return `|${src(0)}| > ${num(1)}`;
    case 'FUNC_ANEG':   return `|${src(0)}| < ${num(1)}`;
    case 'FUNC_DPOS':   return `${src(0)} rising`;
    case 'FUNC_DNEG':   return `${src(0)} falling`;
    case 'FUNC_EDGE':
      return num(1) === num(2)
        ? `${sw(0)} held ${num(1)}ms`
        : `${sw(0)} held ${num(1)}–${num(2)}ms`;
    case 'FUNC_TIMER':  return `timer ${num(0)}s/${num(1)}s`;
    case 'FUNC_DELTA':  return `${src(0)} changing`;
    default:            return ls.func;
  }
}

// How many arguments does this function take?
export function defArgCount(func: string): number {
  switch (func) {
    case 'FUNC_EDGE':   return 3;
    case 'FUNC_DPOS':
    case 'FUNC_DNEG':  return 1;
    default:           return 2;
  }
}
