## 0.9.6 (2026-10-05)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.9.5 (2026-10-05)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.9.4 (2026-10-04)

### 🚀 Features

- **compact-mantine:** add pinned columns and header glyphs, tooltips and menus to DataTable ([#924](https://github.com/graphty-org/graphty-monorepo/pull/924))
- **compact-mantine:** add descriptions, a search threshold and middle cuts to QuickActions ([#934](https://github.com/graphty-org/graphty-monorepo/pull/934))
- **compact-mantine:** give PageList rows a second line, a trailing value and a row menu ([#920](https://github.com/graphty-org/graphty-monorepo/pull/920))
- **compact-mantine:** add swatch, count, progress, description and row keys to Tree rows ([#908](https://github.com/graphty-org/graphty-monorepo/pull/908))
- **compact-mantine:** let a collapsed ControlSection show a one-line summary ([#916](https://github.com/graphty-org/graphty-monorepo/pull/916))

### 🩹 Fixes

- **compact-mantine:** clear the SonarQube findings on the quick actions and page list ([2c8016669](https://github.com/graphty-org/graphty-monorepo/commit/2c8016669))
- **compact-mantine:** always show the quick actions search field and keep focus there ([4f9c1a0c9](https://github.com/graphty-org/graphty-monorepo/commit/4f9c1a0c9))
- **compact-mantine:** leave Space on the QuickActions list alone ([#934](https://github.com/graphty-org/graphty-monorepo/pull/934))
- **compact-mantine:** keep a Pill's remove button reachable when a caller passes attributes ([#925](https://github.com/graphty-org/graphty-monorepo/pull/925))
- **compact-mantine:** keep header names clear of the menu caret; make columnMenu optional ([#924](https://github.com/graphty-org/graphty-monorepo/pull/924))
- **compact-mantine:** keep a PageList row menu out of the Tab order ([#920](https://github.com/graphty-org/graphty-monorepo/pull/920))
- **compact-mantine:** keep a DataTable header menu open when opened from the keyboard ([#924](https://github.com/graphty-org/graphty-monorepo/pull/924))
- **compact-mantine:** make a removable Pill's remove button reachable and named ([#925](https://github.com/graphty-org/graphty-monorepo/pull/925))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.3 (2026-10-04)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.9.2 (2026-10-04)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.9.1 (2026-10-04)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.9.0 (2026-10-03)

### 🚀 Features

- ⚠️  **compact-mantine:** stop theming Mantine's ColorInput and ColorPicker ([#672](https://github.com/graphty-org/graphty-monorepo/issues/672))
- ⚠️  **compact-mantine:** remove icon group row, narrow data row, add tree helpers ([1e463501](https://github.com/graphty-org/graphty-monorepo/commit/1e463501))
- ⚠️  **compact-mantine:** match the figma editor's components in light and dark ([#0](https://github.com/graphty-org/graphty-monorepo/issues/0))

### 🩹 Fixes

- **compact-mantine:** keep a focused tree row action's ring off its neighbor ([9c9c8acf](https://github.com/graphty-org/graphty-monorepo/commit/9c9c8acf))
- **compact-mantine:** draw a pressable row's ring inside its pill so its sides are not clipped ([438fc60b](https://github.com/graphty-org/graphty-monorepo/commit/438fc60b))
- **compact-mantine:** add a stat mode to DataRow ([#140](https://github.com/graphty-org/graphty-monorepo/issues/140))
- **compact-mantine:** settle the focused control's tooltip before two stories end ([1255563c](https://github.com/graphty-org/graphty-monorepo/commit/1255563c))
- **compact-mantine:** end the pick-from-flyout story once the face's tooltip shows ([24e02d33](https://github.com/graphty-org/graphty-monorepo/commit/24e02d33))
- **compact-mantine:** let focus and hover tooltips finish before a story is captured ([16bd9dcc](https://github.com/graphty-org/graphty-monorepo/commit/16bd9dcc))
- **compact-mantine:** make five overlay stories capture the same way every time ([b1aee374](https://github.com/graphty-org/graphty-monorepo/commit/b1aee374))
- **compact-mantine:** match figma rings, gaps and row pitch; honor reduced motion ([4f2e1912](https://github.com/graphty-org/graphty-monorepo/commit/4f2e1912))
- **compact-mantine:** keep the checked option on the field when a list overflows ([63ef41aa](https://github.com/graphty-org/graphty-monorepo/commit/63ef41aa))
- **compact-mantine:** match figma quick actions, submenus, shortcut sheet; fix story plays ([dded3759](https://github.com/graphty-org/graphty-monorepo/commit/dded3759))

### ⚠️  Breaking Changes

- **compact-mantine:** stop theming Mantine's ColorInput and ColorPicker  ([#672](https://github.com/graphty-org/graphty-monorepo/issues/672))
  the theme no longer styles Mantine's ColorInput or
  ColorPicker; both render as plain Mantine. Migration: use
  CompactColorInput (ColorPickerPanel for the picker on its own surface).
  Refs #672
- **compact-mantine:** remove icon group row, narrow data row, add tree helpers  ([1e463501](https://github.com/graphty-org/graphty-monorepo/commit/1e463501))
  IconGroupRow, IconGroupRowProps and IconGroupOption are
  removed. DataRow loses role, tabIndex, onDoubleClick and onContextMenu, and
  the DataRowRole type is removed. CHANGELOG-figma.md has the migrations.
- **compact-mantine:** match the figma editor's components in light and dark  ([#0](https://github.com/graphty-org/graphty-monorepo/issues/0))
  51 breaking changes, listed in compact-mantine/CHANGELOG-figma.md; the largest
  are the 240 px panel with 88 px fields, Select and Autocomplete as combobox roles, pill Tabs by
  default, one root popout at a time, and the restyled ControlSection.

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.19 (2026-10-02)

### 🩹 Fixes

- **compact-mantine:** accent text contrast, labelled segmented controls, one colour callback ([#135](https://github.com/graphty-org/graphty-monorepo/issues/135), [#136](https://github.com/graphty-org/graphty-monorepo/issues/136), [#141](https://github.com/graphty-org/graphty-monorepo/issues/141))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.18 (2026-10-02)

### 🚀 Features

- **compact-mantine:** let DataTable draw a window of a larger list ([0284b3ad](https://github.com/graphty-org/graphty-monorepo/commit/0284b3ad))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.17 (2026-10-02)

### 🩹 Fixes

- **compact-mantine:** type the CompoundRow warning spy so the test type-check passes ([42b0086e](https://github.com/graphty-org/graphty-monorepo/commit/42b0086e))
- **compact-mantine:** inputs follow the size scale and the password toggle has a name ([#7](https://github.com/graphty-org/graphty-monorepo/issues/7), [#137](https://github.com/graphty-org/graphty-monorepo/issues/137), [#82](https://github.com/graphty-org/graphty-monorepo/issues/82))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.16 (2026-10-01)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.8.15 (2026-10-01)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.8.14 (2026-09-30)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.8.13 (2026-09-30)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.8.12 (2026-09-29)

### 🩹 Fixes

- **compact-mantine:** draw the attribute glyph's dot as a filled disc ([c617d5e4](https://github.com/graphty-org/graphty-monorepo/commit/c617d5e4))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.11 (2026-09-28)

### 🚀 Features

- **workspace:** capture like chromatic and make the review page easier to judge ([a8f4ad8c](https://github.com/graphty-org/graphty-monorepo/commit/a8f4ad8c))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.10 (2026-09-28)

### 🩹 Fixes

- **tools:** run knip per package and build only projects with a build target ([1292b67a](https://github.com/graphty-org/graphty-monorepo/commit/1292b67a))
- **compact-mantine:** draw the indicator story's avatar without the network ([21399ea2](https://github.com/graphty-org/graphty-monorepo/commit/21399ea2))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.9 (2026-09-28)

### 🩹 Fixes

- **compact-mantine:** name modal close buttons and drop the menu focus placeholder ([01615522](https://github.com/graphty-org/graphty-monorepo/commit/01615522))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.8 (2026-09-27)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.8.7 (2026-09-26)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.8.6 (2026-09-25)

### 🩹 Fixes

- **graphty:** overlays close pop-outs, layer drags move one layer, runs keep their layers ([#184](https://github.com/graphty-org/graphty-monorepo/issues/184), [#164](https://github.com/graphty-org/graphty-monorepo/issues/164), [#163](https://github.com/graphty-org/graphty-monorepo/issues/163), [#6](https://github.com/graphty-org/graphty-monorepo/issues/6), [#4](https://github.com/graphty-org/graphty-monorepo/issues/4))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.5 (2026-09-24)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.8.4 (2026-09-24)

### 🩹 Fixes

- **compact-mantine:** ship the CommonJS type declarations ([a18984e6](https://github.com/graphty-org/graphty-monorepo/commit/a18984e6))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.3 (2026-09-24)

### 🩹 Fixes

- **compact-mantine:** lint stories and tests and fix what surfaced ([20c20faa](https://github.com/graphty-org/graphty-monorepo/commit/20c20faa))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.2 (2026-09-21)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.8.1 (2026-09-20)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.
