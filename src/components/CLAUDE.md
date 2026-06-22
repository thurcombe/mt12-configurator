# Component authoring rules

These rules apply whenever you are writing or editing any file under `src/components/` or `src/pages/`.

---

## Before writing any CSS

1. **Read `src/styles/shared.css` first.** Use its utility classes and CSS custom property tokens. Never redefine values that are already there.
2. **Read the most structurally similar existing component's `.module.css`** before writing a new one — copy its structure, then compose shared classes.

---

## Design tokens — always use the variable, never the raw value

| Intent | Variable | Value |
|--------|----------|-------|
| Form label column width | `var(--form-label-width)` | 160px |
| Top-level panel radius | `var(--panel-radius)` | 10px |
| Nested sub-panel radius | `var(--panel-radius-sm)` | 8px |
| Input padding | `var(--input-padding)` | 4px 8px |
| Input font size | `var(--input-font-size)` | 13px |
| Input background | `var(--bg)` | never `var(--surface)` |
| Picker dropdown max height | `var(--picker-max-height)` | 280px |
| Modal overlay background | `var(--overlay-bg)` | rgba(0,0,0,0.6) |

---

## Form layout

- **Two-column label + control grids:** use `.form-grid` from shared.css. Never write `grid-template-columns` for a form grid manually.
- **Form labels:** use `.form-label` from shared.css. Labels are `text-align: right`.
- **Inputs and selects:** use `.form-input` (or compose it): `composes: form-input from '../../styles/shared.css'`. Adjust the path depth as needed.
- **Small inputs in table rows:** use `.form-input-sm` from shared.css.

---

## Reach for these shared components before building anything inline

| Need | Component |
|------|-----------|
| Confirmation / destructive-action dialog | `src/components/shared/ConfirmModal.tsx` |
| Switch position picker | `src/components/shared/SwitchPicker.tsx` |
| Physical input source picker (knobs, trims) | `src/components/shared/InputSourcePicker.tsx` |
| Mix/expo source picker (full source list) | `src/components/shared/SrcRawPicker.tsx` |
| Weight + range slider | `src/components/shared/WeightSlider.tsx` |
| Flight mode checkboxes | `src/components/shared/FlightModeCheckboxes.tsx` |

**Never build an inline `position:fixed` overlay from scratch.** That is always `ConfirmModal`.

---

## Custom picker rules (SrcRawPicker, SwitchPicker, InputSourcePicker)

All three must be kept visually identical:
- Trigger button padding: `4px 8px`
- Dropdown: `maxHeight: var(--picker-max-height)`, `overflowY: 'auto'`, `zIndex: var(--picker-z-index)`
- No `overflow: hidden` on the dropdown panel

The pickers appear inside `overflow-x: auto` table wrappers in LogicalSwEditor and SpecialFnEditor. If you add a picker to a new table context, ensure the table wrapper does not have `overflow-x: auto` — it clips absolutely-positioned dropdowns.

---

## Expand/collapse accordion pattern

Follow `src/components/expos/ExpoEditor.tsx`:
- Container: `css.row` on a `border-radius: var(--panel-radius-sm)` panel
- Trigger button: `css.rowHeader`
- Caret indicator: `css.caret` — always named `caret`, never `chevron` or anything else
- Characters: `▾` (open) / `▸` (closed)
- Expanded body: `css.body` with `border-top: 1px solid var(--border)`

---

## Button sizing

All buttons in forms, modals, and editor toolbars use `btn btn-primary btn-sm` / `btn btn-ghost btn-sm` / `btn btn-danger btn-sm`. The non-`sm` size is only for standalone CTAs outside an editor context. When in doubt, use `btn-sm`.

---

## Shared utility functions (do not redefine)

- `expoFeel(expo: number): string` — `src/components/kidmode/kidFormatters.ts`
- `rampDesc(up: number, down: number): string` — `src/components/kidmode/kidFormatters.ts`

---

## Tests

Any change to component logic, codec functions, store actions, or shared utilities must be accompanied by a test. Do not consider a task done without one.

- Codec / pure logic → `src/tests/codec/` or `src/tests/components/`
- Store changes → `src/tests/store/`
- New shared utilities (e.g. `kidFormatters.ts`) → test file in the matching `src/tests/` subtree
- Purely visual/CSS-only changes → no test required, but state this explicitly

Run `npm test` before declaring any task complete.

---

## User manual

Any change that affects user-visible behaviour — new feature, changed UI text, renamed control, removed option, new warning — must include an update to `docs/user-manual.md` in the same task. Do not finish the code change and leave the manual for later.

---

## Git — never without explicit instruction

Do NOT commit, push, raise a PR, merge, tag, or cut a release unless the user explicitly says to. "The fix is done" is not an instruction to commit.

`main` is a protected branch. All changes must be delivered via a pull request — never push directly to `main`.
