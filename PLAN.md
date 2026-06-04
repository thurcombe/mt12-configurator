# EdgeTX MT12 Config Editor — Project Plan

## Overview
A browser-based webapp to create and edit EdgeTX 2.10.0 model profiles for the Radiomaster MT12 surface transmitter, replacing the painful on-device menu navigation. Reads/writes YAML files directly to the SD card mounted at `/media/thurcombe/CE66-871F`.

## Current Status
**Phase: COMPLETE — All phases 1–9 done**
Last updated: 2026-06-04

---

## Key Context

### Hardware
- Radiomaster MT12 surface transmitter (pistol-grip style)
- SD card mounts at `/media/thurcombe/CE66-871F`
- Active models: `MODELS/model00.yml` (TRX4m crawler), `MODELS/model01.yml` (empty)
- Backup files: `BACKUP/*.yml` (EdgeTX writes here natively)
- Radio settings: `RADIO/radio.yml`

### MT12 Controls (from radio.yml)
- SA: 3-position switch
- SB, SC, SD: toggle switches (2-pos, likely momentary)
- FL1, FL2: 2-position latching switches
- P1, P2: scroll wheel pots with centre detent
- P3: joystick X axis
- P4: joystick Y axis
- **NOTE: Switch physical positions on TX face are NOT YET MAPPED** — needed for SVG diagram. Ask user or get photo.

### TRX4m "Kid Mode" — existing config
- P2 knob = throttle dual rate (0–100% multiplier via D-RATE MUL mix)
- SC toggle + L1 (FUNC_STICKY) = plays "thrhld" audio cue only — does NOT gate any mix
- No steering rate limiting currently
- No speedUp/slowDown on throttle
- Kid mode for crawler is subtle (already slow/stable) — very different from a fast rally car

### YAML Format Notes (CRITICAL)
- `flightModes: 000000000` — unquoted in file, js-yaml parses as integer 0. Must always serialise as 9-char quoted string.
- `destCh` is 0-based in YAML, display as CH1-16 in UI (add 1 for display, subtract 1 on save)
- `logicalSw`, `customFn`, `flightModeData`, `inputNames` use numbered object keys (`0:`, `1:`) not YAML sequences — keep as plain JS objects, do NOT convert to arrays
- `mixData`, `expoData` use YAML sequences (dash-items) — keep as arrays
- `radio.yml` has `checksum` field — strip on parse, set `manuallyEdited: 1` on serialise, never emit checksum
- `subType: "43,0"` — comma-packed string, split to `{protocol, option}` on parse, rejoin on serialise
- Round-trip fidelity is the #1 risk — test first before building any UI

### Surface Protocols (Multimodule)
- 43 = Traxxas TQi (2.4GHz) — current TRX4m
- 73 = Traxxas TQ Gen2
- 4 = DSM2, 5 = DSMX (Spektrum)
- Others as needed — surface-only scope

---

## Tech Stack
- **Vite + React + TypeScript** — frontend only, no backend
- **js-yaml** — YAML parse/serialise
- **Zustand** — state management + dirty tracking
- **@dnd-kit/core + @dnd-kit/sortable** — drag-to-reorder mix lines
- **fflate** — zip download fallback (no wasm)
- **Vitest** — unit tests (codec layer only, no UI tests)
- No CSS framework — plain CSS modules

---

## File Structure
```
edgetx/
├── PLAN.md                          ← this file
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
│
├── src/
│   ├── main.tsx
│   ├── App.tsx                      # routing: ModelList / ModelEditor / RadioSettings
│   │
│   ├── types/
│   │   ├── radio.ts
│   │   └── model.ts                 # MixLine, ExpoLine, LogicalSw, ModuleData, etc.
│   │
│   ├── codec/
│   │   ├── yaml-io.ts               # js-yaml load/dump wrappers
│   │   ├── radio-codec.ts           # parse/serialise radio.yml
│   │   ├── model-codec.ts           # parse/serialise modelXX.yml
│   │   ├── srcRaw.ts                # srcRaw string ↔ friendly label
│   │   ├── protocols.ts             # subType "N,M" ↔ protocol name
│   │   ├── switches.ts              # switch string ↔ label
│   │   └── logicalSwDef.ts          # def string encode/decode per func type
│   │
│   ├── store/
│   │   └── useEditorStore.ts        # models, radio, dirty flags, backup actions
│   │
│   ├── fs/
│   │   ├── sdcard.ts                # File System Access API wrapper
│   │   ├── backup.ts                # write to BACKUP/ before every save, prune old
│   │   └── download.ts              # zip download fallback
│   │
│   ├── pages/
│   │   ├── ModelList.tsx
│   │   └── ModelEditor.tsx          # tab container
│   │
│   └── components/
│       ├── layout/
│       │   ├── AppShell.tsx
│       │   └── TabBar.tsx
│       │
│       ├── radio/
│       │   ├── RadioSettings.tsx
│       │   └── Mt12Diagram.tsx      # SVG of TX face with labelled switches
│       │
│       ├── models/
│       │   ├── ModelCard.tsx        # edit / duplicate / delete / history
│       │   └── BackupHistory.tsx    # list backups, diff preview, restore
│       │
│       ├── mixes/
│       │   ├── MixEditor.tsx        # channel groups + DnD
│       │   ├── MixLine.tsx
│       │   ├── MixLineModal.tsx
│       │   └── ChannelGroup.tsx
│       │
│       ├── expos/
│       │   ├── ExpoEditor.tsx
│       │   └── ExpoLine.tsx
│       │
│       ├── limits/
│       │   └── LimitsEditor.tsx     # per-channel min/max/subtrim/invert
│       │
│       ├── logicalsw/
│       │   ├── LogicalSwEditor.tsx
│       │   └── LogicalSwRow.tsx
│       │
│       ├── specialfn/
│       │   ├── SpecialFnEditor.tsx
│       │   └── SpecialFnRow.tsx
│       │
│       ├── timers/
│       │   └── TimerEditor.tsx
│       │
│       ├── module/
│       │   └── ModuleEditor.tsx
│       │
│       ├── flightmodes/
│       │   └── FlightModeEditor.tsx
│       │
│       ├── kidmode/
│       │   ├── KidModeWizard.tsx    # vehicle type + speed → slider defaults
│       │   └── KidModeSliders.tsx   # adjustable defaults before generating
│       │
│       └── shared/
│           ├── SwitchPicker.tsx
│           ├── SrcRawPicker.tsx
│           ├── WeightSlider.tsx
│           ├── FlightModeCheckboxes.tsx
│           └── DirtyBadge.tsx
│
└── src/tests/
    ├── codec/
    │   ├── round-trip.test.ts       # parse → dump → diff real YAML files
    │   ├── flightModes.test.ts      # 000000000 string preservation
    │   ├── destCh.test.ts           # 0-based ↔ 1-based conversion
    │   ├── subType.test.ts          # "43,0" pack/unpack
    │   └── logicalSwDef.test.ts     # per-func def encoding
    └── kidmode/
        └── generator.test.ts        # input model → correct FM1 output
```

---

## Features

### Model List Page
- Grid of model cards showing name + protocol badge
- Actions per card: **Edit**, Duplicate, Delete, **History** (backup restore)
- Add new model button (picks lowest free slot)
- Link to Radio Settings

### Model Editor Page (tabs)
| Tab | Description |
|-----|-------------|
| Mixes | Channel-grouped mix lines, drag-to-reorder, full edit modal |
| Expos | Per-input dual rate + expo curve, per switch/FM |
| Limits | Per-channel output min/max/subtrim/invert |
| Logical Switches | Condition builder, func-aware def parsing |
| Special Functions | swtch → func → def rows |
| Timers | Up to 3 timers with mode/switch/beep config |
| Module | Protocol picker (surface protocols), multimodule options |
| Flight Modes | Up to 9 FMs, switch, fade, trim overrides, GVars |
| **Kid Mode** | Wizard + sliders → generates FM1 with safe-driving constraints |

### Kid Mode Generator
1. Wizard: vehicle type (crawler/sport/rally/high-speed) × speed class (slow/medium/fast)
2. Derives defaults: throttle max %, throttle expo %, throttle speedUp/Down, steering DR %, steering expo %
3. Presents all as adjustable sliders with live effective-value preview
4. On confirm: adds FM1 "Kid" (switch = user picks), clones throttle/steering expo lines with FM0 exclusion, adds throttle mix with speedUp/slowDown
5. Kid mode is reversible — delete FM1 to remove it

### Radio Settings Page
- Audio: volumes (beep/wav/vario/bg/speaker), pitch
- Display: backlight mode/brightness/colour
- Switch config: type + name per switch (SA–SD, FL1–FL2)
- Pot config: type + name per pot (P1–P4)
- **MT12 SVG diagram**: interactive TX face with each control labelled — clicking navigates to its config; in model editor context, highlights mix/expo lines that reference it

### Backup & Restore
- Every save: backs up current file to `BACKUP/{name}-{ISO-timestamp}.yml` first
- Auto-prune: keep last 5 backups per model (configurable)
- History UI: timestamped list → diff preview against current → Restore (which itself creates a backup first)
- Applies to both model files and radio.yml

### Save Flow
- File System Access API (Chrome/Edge): direct read/write to SD card folder
- Fallback: download as zip preserving directory structure (`MODELS/`, `RADIO/`, `BACKUP/`)
- Dirty tracking: unsaved badge per model, Save All button in app shell

---

## Implementation Phases

### Phase 1 — Foundation & Codec [x] COMPLETE
- [x] 1.1 Scaffold: `npm create vite`, install deps, tsconfig, vitest config
- [x] 1.2 `yaml-io.ts`: js-yaml load/dump wrappers with style options
- [x] 1.3 `model-codec.ts` + `radio-codec.ts`: parse/serialise with all types
- [x] 1.4 `srcRaw.ts`, `protocols.ts`, `switches.ts`, `logicalSwDef.ts`
- [x] 1.5 Round-trip tests against real YAML fixtures (model00.yml, radio.yml, backups)
- [x] 1.6 Fix any round-trip failures before proceeding

### Phase 2 — Data Layer & File System [x] COMPLETE
- [x] 2.1 TypeScript types: `radio.ts`, `model.ts`
- [x] 2.2 `sdcard.ts`: FSA wrapper (openSdCard, readTextFile, writeTextFile, listModelFiles)
- [x] 2.3 `backup.ts`: write backup before save, prune old, list backups
- [x] 2.4 `download.ts`: zip fallback with fflate
- [x] 2.5 `useEditorStore.ts`: Zustand store with load/save/dirty/backup actions

### Phase 3 — App Shell & Model List [x] COMPLETE
- [x] 3.1 `App.tsx`: routing between pages
- [x] 3.2 `AppShell.tsx`: SD card status, Save All button, dirty badge
- [x] 3.3 `ModelList.tsx`: model cards grid
- [x] 3.4 `ModelCard.tsx`: edit/duplicate/delete/history actions
- [x] 3.5 `BackupHistory.tsx`: list → preview → restore flow
- [x] 3.6 Add new model (minimal template from model01.yml)

### Phase 4 — Model Editor: Simple Tabs [x] COMPLETE
- [x] 4.1 `ModelEditor.tsx` + `TabBar.tsx`
- [x] 4.2 `ModuleEditor.tsx`: protocol picker, multimodule options
- [x] 4.3 `TimerEditor.tsx`: up to 3 timers
- [x] 4.4 `FlightModeEditor.tsx`: FM list, switch, fade, trims, GVars

### Phase 5 — Mix Editor [x] COMPLETE
- [x] 5.1 `MixEditor.tsx`: channel groups layout
- [x] 5.2 `MixLine.tsx`: collapsed row summary
- [x] 5.3 `MixLineModal.tsx`: full edit form (srcRaw, destCh, mltpx, weight, offset, switch, delays, speeds, FM bits)
- [x] 5.4 `ChannelGroup.tsx`: collapsible CH1-16 headers
- [x] 5.5 DnD within channel groups via @dnd-kit
- [x] 5.6 Shared components: `SrcRawPicker`, `SwitchPicker`, `WeightSlider`, `FlightModeCheckboxes`

### Phase 6 — Expo, Limits, Logic, Special Fn [x] COMPLETE
- [x] 6.1 `ExpoEditor.tsx` + `ExpoLine.tsx`: dual rate %, expo curve, switch, FM
- [x] 6.2 `LimitsEditor.tsx`: per-channel min/max/subtrim/invert
- [x] 6.3 `LogicalSwEditor.tsx` + `LogicalSwRow.tsx`: func-aware def builder
- [x] 6.4 `SpecialFnEditor.tsx` + `SpecialFnRow.tsx`

### Phase 7 — Radio Settings & MT12 Diagram [x] COMPLETE
- [x] 7.1 `RadioSettings.tsx`: audio, display sections
- [x] 7.2 Switch config section (type + name per switch)
- [x] 7.3 Pot config section (type + name per pot)
- [x] 7.4 `Mt12Diagram.tsx`: SVG of TX face with labelled controls (layout from official MT12 manual PDF)
- [x] 7.5 Wire diagram clicks to config fields (click → switches/pots tab; hover → diagram highlight)
- [ ] 7.6 In model editor context: hovering switch highlights referencing mix/expo lines (deferred to Phase 9)

### Phase 8 — Kid Mode [x] COMPLETE
- [x] 8.1 Vehicle type × speed class matrix → default values table (`kidDefaults.ts`)
- [x] 8.2 `KidModeWizard.tsx`: 3-step wizard (vehicle → speed → sliders/confirm)
- [x] 8.3 Adjustable sliders for all params with live effective-value preview
- [x] 8.4 Generator: FM1 + TH/ST expo clones (FM0 excluded) + KID-SP/KID-ST mixes with speedUp/speedDown
- [x] 8.5 Kid mode tests: 17 tests covering FM1 structure, expo lines, mix lines, remove, idempotency

### Phase 9 — Polish [x] COMPLETE
- [x] 9.1 `DirtyBadge.tsx` shared component; indicators already present in AppShell/ModelEditor/RadioSettings/ModelCard from prior phases
- [x] 9.2 Navigation guard in App.tsx: intercepts route changes away from dirty editor/radio, shows "Leave?" confirm dialog
- [x] 9.3 `friendlyError()` in store: translates DOMException (NotAllowedError, NotFoundError), YAMLException, generic errors. `loadAllModels` now skips bad files and surfaces them as dismissable warnings, not blocking errors.
- [x] 9.4 `AppSettings` in store (persisted to localStorage); `backupCount` wired to `writeBackup` calls; ⚙ button in AppShell opens `SettingsModal`

---

## Open Questions
1. **MT12 switch physical positions** — need photo or description of TX face for SVG diagram. Which side are SA/SB/SC/SD/FL1/FL2/P1/P2/joystick?
2. **Kid mode FM slot** — assume FM1 is always free, or check and use next available?
3. **Logical switch def for kid mode trigger** — which switch should activate kid FM by default in the wizard?

---

## Test Fixtures (real files on SD card)
- `/media/thurcombe/CE66-871F/MODELS/model00.yml` — primary round-trip test
- `/media/thurcombe/CE66-871F/RADIO/radio.yml` — radio codec test
- `/media/thurcombe/CE66-871F/BACKUP/TRX4m-2024-10-10.yml` — same as model00, cross-check
- `/media/thurcombe/CE66-871F/BACKUP/TRX4m-2024-10-05.yml` — older, more complex (logical switches, LED functions, telemetry)
- `/media/thurcombe/CE66-871F/BACKUP/CAR2-2024-10-04.yml` — CROSSFIRE module, different structure
