# The graphty app's visual language

This is the design system for the graphty app: the rules for how the app LOOKS, stated as
numbers and checks, so that the mocks and the built app can be held to the same standard. The
other documents in this folder describe what the app does and where each thing lives (the UX).
This one describes how every part is drawn (the design). If a mock or a screen of the built app
breaks a rule here, either the screen is wrong or this document is, and one of them is changed.
They are never both left as they are.

Every value here comes from one of two measured sources, and each rule says which:

1. **compact-mantine**, the component library the app is built with. It was rebuilt to match
   the Figma editor's own interface, property by property. Its values live in three files under
   `/home/apowers/Projects/graphty-monorepo/.worktrees/compact-mantine-figma/compact-mantine/`:
   - `src/theme/tokens.ts`: every colour, type role, spacing step, radius, shadow and duration,
     as code. Cited below as **tokens.ts**.
   - `design/figma-spec.md`: the specification each component was built to, component by
     component and state by state. Cited as **spec** plus its section number ("spec 2.3").
   - `CHANGELOG-figma.md`: what actually shipped, including where the build departed from the
     specification. Cited as **changelog**. Where the changelog and the spec disagree, the
     changelog wins, because it describes the code.
2. **The Figma study**, the measurements of the Figma editor that compact-mantine was built
   from, in `/home/apowers/Projects/graphty-monorepo/design/ui/figma/`. Cited as **Figma
   components** plus a section number (`components.md`) or **Figma flows** plus a section
   number (`flows.md`).

Decisions this document makes itself, where neither source settles a question for graphty,
are marked **(decided here)** with their reason. All of them are two-way doors: changing one is
an edit to this file and to the mocks.

The UX documents referred to are `round-2/revision.md`, `round-3/revision-round-3.md` and
`round-4/revision-round-4.md` in this folder. Mock screens are cited by number ("screen 3");
they are the files `mocks/v2/screen-<n>.html`. Screens 103 to 114 are the round-4 screens,
specified in `round-4/revision-round-4.md` section 9.1 and not yet drawn.

## 0. Words used here

- **Frame**: the whole app window. **Chrome**: everything in the frame that is not the graph:
  panels, bars, buttons, menus. **Canvas**: the area where graphty-element draws the graph.
- **Rail**: the 56 px column of icon buttons at the far left. **Left panel**: the 240 px panel
  the active rail button shows. **Inspector**: the 240 px right panel, which always shows the
  selection. **Dock**: the drawer under the canvas (Table, History). **Toolbar**: the floating
  bar at the bottom centre of the canvas. **Secondary bar**: the smaller bar above the toolbar
  while a tool is armed. **Status bar**: the 24 px strip across the bottom of the window.
- **Row**: one horizontal band of a panel, holding one thing. **Control**: anything a reader can
  operate (button, field, select, switch, checkbox, colour chit).
- **Surface**: a filled area that other things sit on: a panel, the toolbar, a menu, a dialog.
- **Token**: a named value from compact-mantine, written as its CSS custom property,
  `--cm-<name>`. A colour token has a light value and a dark value, written `light / dark`.
- **Ink**: the colour of text and icons. **Fill**: the colour of a surface or a control's face.
- **Accent**: the one blue, #0d99ff in light and #0c8ce9 in dark (`--cm-bg-brand`).
- **Elevation**: a drop shadow that says a surface floats above the one under it.
- **Glyph**: the drawing inside an icon. **Icon box**: the square the glyph is centred in.
- **At rest**: the frame after a load, with nothing hovered, open or running.
- **App-authored text**: words the app wrote (labels, hints, explanations), as opposed to the
  reader's own words (object names, notes) and the data's (labels, values, column names).

## 1. Principles

Six rules sit above all the others. Each is written as a test that a reviewer can apply to a
screen and answer yes or no. They come from the round-1 analysis of why the current app was
hard to use (`analysis.md` section 4) and from the Figma study (Figma flows 1).

| # | Principle | The test | Where it comes from |
|---|---|---|---|
| P1 | **Restraint.** Chrome is quiet so the graph can be loud | Every chrome colour on screen is a `--cm-*` token; no chrome element uses a data colour; at most one filled accent button per surface (section 7.4) | `analysis.md` section 4, "one primary button" |
| P2 | **Content over chrome.** At rest, the words on screen are the reader's and the data's | At rest, each panel carries at most one app-authored sentence, and that sentence is about the reader's data (the reading row); no hints, tips, "i" icons, "coming soon" tags or suggestion cards | `analysis.md` section 4, "no app-authored text at rest" |
| P3 | **One home per capability.** Each capability is drawn in exactly one place | For any control on a screen, the UX documents name one home for it; every other way in is a shortcut (a key, a Ctrl+K row, a menu row) that opens that home, never a second copy of its controls | `analysis.md` section 4; round-4 section 2.1 |
| P4 | **Disclosure on request.** A section appears when it has content or the reader asks | No empty list, empty chart or placeholder row is drawn; an empty section is only its 40 px header with a "+"; optional canvas furniture (legend, minimap) is off until switched on | `analysis.md` section 4 |
| P5 | **Never act unasked.** The app draws what it was asked for and stops | After a load nothing computes, no panel switches, nothing floats over the canvas; a tool arms on the first click and runs only on Run or Enter; the rail's panel changes only when the reader presses a rail button (the one exception is the first load, round-4 section 2.4) | `analysis.md` section 4; round-2 decision T1 |
| P6 | **Consistency.** One thing is drawn one way, everywhere | Every part in section 7's table is the compact-mantine component named there, with its default props; no screen draws its own variant; the checklist in section 12 passes | spec 1; root `CLAUDE.md` "UI Components": use the default components, fix the shared one |

**How to use P6 in practice.** If a screen needs something a compact-mantine component does
not do, the fix goes into compact-mantine, and every screen gets it. A local restyle is a
defect, even when it looks right (root `CLAUDE.md`, "UI Components", the lock-button example).

## 2. Layout

### 2.1 The frame

```
 57          240                      canvas (the rest)                     241
+----+-----------------+---------------------------------------------+------------------+
|rail| file header  48 |                                             | header        48 |
|    |-----------------|                                             |------------------|
| 56 | panel title  40 |                                             | header block 144 |
| x  |-----------------|                                             | (kind, name,     |
| 56 |                 |                                             |  summary, read-  |
|btns| panel rows      |                                             |  ing, tabs)      |
|    | 32 each         |       [secondary bar 40, 8 above toolbar]   |------------------|
|    |                 |       [ toolbar 48, 12 above the dock    ]  | tab rows 32 each |
|    |                 |---------------------------------------------|                  |
|foot|                 | dock handle 32 (or the open dock, 320-360)  |                  |
+----+-----------------+---------------------------------------------+------------------+
| status bar 24                                                                         |
+---------------------------------------------------------------------------------------+
```

| Part | Size | Surface | Source |
|---|---|---|---|
| Rail | 56 wide + 1 px `--cm-border` right edge; padding 8 top, 16 bottom; full height above the status bar | `--cm-bg` | spec 11.4; round-4 2.2 |
| Left panel | 240 wide (resizable 240 to 480 by `ResizeHandle`), 1 px `--cm-border-translucent` edge on the canvas side | `--cm-bg` | spec 9.1, 9.9; round-4 2.3 |
| Inspector | 240 wide + 1 px `--cm-border-translucent` edge = 241 | `--cm-bg` | Figma components 45 |
| Canvas | the remainder: 902 px at a 1440 window, 742 px at 1280 | graphty-element's background (section 4.6) | round-4 2.1 |
| File header (left panel top) | 48 tall: dataset name 13/22 weight 550, then the file-menu chevron | `--cm-bg`, 1 px `--cm-border` below | round-2 screens conventions |
| Inspector header | 48 tall: framing pill, Export | `--cm-bg`, 1 px `--cm-border` below | round-2 screens conventions |
| Panel title row (each rail panel) | 40 tall: the panel's name, at most two 24 px icon buttons ("+", "...") | none | round-4 2.3; Figma components 44 (left-panel group header) |
| Inspector header block | 144 tall, never scrolls: kind and name 48, summary 32, reading 32, tabs 32 | none | round-2 2.6 rule 1 |
| Toolbar | 48 tall, width hugs content (465 px, 505 with Time), centred on the canvas, 12 px above what is under the canvas | `--cm-bg`, radius 13, elevation 200 | spec 11.1; round-4 3.1 |
| Secondary bar | 40 tall, 8 px above the toolbar | `--cm-bg`, radius 13, elevation 200 | spec 11.3 |
| Time transport bar | 40 tall across the canvas's width, above the dock handle; the toolbar rises 40 px with it | `--cm-bg`, 1 px `--cm-border` above | round-2 6.1; round-4 5 |
| Dock handle (closed dock) | 32 tall strip of pill tabs (Table, History) | `--cm-bg`, 1 px `--cm-border` above | round-2 9.2; round-4 2.8 |
| Open dock | 320 to 360 tall, resizable, as wide as the canvas | `--cm-bg`, 1 px `--cm-border` above | `round-3/history-errors.md` |
| Status bar | 24 tall, full window width, 11/16 text | `--cm-bg`, 1 px `--cm-border` above | round-2 1.6 |

Rules:

- **L1.** Panels are separated from each other and from the canvas by 1 px lines, never by
  shadows or gaps (spec 2.6, 9.7).
- **L2.** Only surfaces that float over the canvas are rounded and elevated: the toolbar, the
  secondary bar, the command palette, menus, popovers, dialogs, the toast, tooltips, and the
  movable scatter-plot panel. Anything docked to a window edge is square and flat.
- **L3.** The toolbar never shrinks and never wraps. Below about 800 px of canvas it may overlap
  the panels, as Figma's does (Figma components 40).
- **L4.** The mocks are drawn at 1440 x 900. The frame must also work at 1280 x 800, the
  smallest window the design supports (round-4 2.1).

### 2.2 The panel grid

Every panel row sits on one grid of 240 px (spec 9.1, `PANEL_GRID` in compact-mantine):

```
| 16 pad | column A 88 | 8 | column B 88 | 8 | trail 24 | 8 pad |   = 240
x: 0      16            104  112          200  208       232      240
```

- **G1.** A control that spans both columns is 184 wide (x 16 to 200). With two 24 px icon
  buttons after it, 156.
- **G2.** A row's trailing icon button sits at x 208 to 232. A section header's last action
  button also ends at x 232.
- **G3.** Three equal segments across both columns are 61.33 each with no gap (spec 9.1
  `TRIPLE`).
- **G4.** A field's leading 24 px slot (a glyph or a letter) is part of the field, not of the
  row (spec 6.1).
- **G5.** A wider panel (the left panel dragged to 480) adds space at the end of each row; rows
  do not stretch their controls (spec 9.1).
- **G6.** Popovers use their own grid: 16 padding, a 64 to 72 px label column, 8 gap, controls
  from x 88 to 96 (spec 8.4).

### 2.3 Row heights

One row, one job. These are the only row heights in the chrome (spec 9.1, 9.2, 9.3, 10.1,
10.2; Figma components 44 to 48):

| Row type | Height | Anatomy |
|---|---|---|
| Property row (one control) | 32 | a 24 px control centred, 4 above and below; padding 0 8 0 16 |
| Tree row | 32 | caret 16, kind icon 16, name; hover and selection are a 24 px pill inset 4 8 4 12 |
| List row (page, view, dataset, column) | 32 | a 24 px pill inset 4 8 4 12 around the content |
| Checkbox or switch row | 32 | 16 box, 8 gap, label |
| Field row with a legend | 48 | 16 caption band, 4 gap, 24 controls, 4 |
| Captioned two-column row | 50 | 9/14 caption above each column, 3 gap, 24 control |
| Section header | 40 | title at x 16, actions at the end; 12 px of padding closes the section, then a 1 px divider |
| Panel title row | 40 | as a section header |
| File header, inspector header | 48 | |
| Menu row | 24 | inside a dark menu, highlight pill inset 8 each side |
| Command palette row | 32 | 32 icon slot, 13/24 label, key at the right |
| Find result | 52 (34 for one line) | icon 16, name, parent path |
| Table row (dock) | 40, header 40 | cell grid 1 px `--cm-border` |
| Status bar | 24 | |
| Dock handle | 32 | 24 px pill tabs |

- **R1.** A row that needs more than one line does not grow: it is split into two rows, or its
  extra detail goes in a tooltip or a disclosure (spec 9.6; round-2 2.6 rule 3).
- **R2.** Rows set their line-height to the row height rather than padding (tree rows 11/32),
  so text is centred by construction (Figma components 1).
- **R3.** No inspector tab exceeds 14 rows with every conditional row drawn (round-2 2.6 rule 3).

### 2.4 Spacing

The scale is 4, 8, 12, 16, 24, 32 px, nothing else (spec 2.4; tokens.ts `compactSpacing`):

| Step | Used for |
|---|---|
| 4 | gap between icon buttons in a cluster; gap between pill tabs; field legend to control |
| 8 | gap between toolbar groups; gap between two fields; right padding of a panel; menu and popover inner padding; secondary bar above toolbar |
| 12 | the bottom padding of a section, and nothing else; toolbar above the dock |
| 16 | left padding of a panel row; popover body padding; toast above the toolbar |
| 24, 32 | gaps between blocks in dialogs only |

- **S1.** There is no 6 px, 10 px or 20 px spacing in the chrome. (Mantine's own `sm` used to be
  6; compact-mantine moved it to 8.)
- **S2.** 1 px and 2 px gaps occur only inside a joined control (a tool and its chevron are 1 px
  apart; segmented options 0).

### 2.5 Alignment

- **A1.** Every text in a panel starts at x 16 or at a grid column (x 16, 112, 208). Nested tree
  rows step their icon 24 px per level (x 16, 40, 64 ...) (spec 10.1).
- **A2.** Numbers in a column of rows (counts, values, percentages) are right-aligned at the
  column's end, and use tabular figures (`font-variant-numeric: tabular-nums`) so digits line
  up. **(decided here**: Inter has tabular figures; without them a column of values jitters.)
- **A3.** Icons are centred in their icon box; the box, not the glyph, is aligned to the grid.
- **A4.** A row's actions cluster at its end, 4 px apart, the last one at x 232.

### 2.6 Density

The app is dense on purpose: it is a tool used for hours, and Figma's density is the target.

- **D1.** Controls are 24 px tall. Tool buttons, the rail's icon pills, large icon buttons and
  the command palette's search field are 32. Nothing interactive in a panel is taller than 32.
- **D2.** Body text is 11 px. There is no "comfortable" or large mode; a reader who wants larger
  text uses the browser's zoom, which scales everything together.
- **D3.** The minimum target is 24 x 24 px (WCAG 2.2 target size, 2.5.8). Glyphs may be smaller;
  their hit box may not.

## 3. Type

### 3.1 The family

Inter Variable, bundled in compact-mantine (latin subset, SIL Open Font License), so weights
450, 550 and 600 render exactly with no setup and no network request. The fallback stack is
`"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Roboto", "Helvetica Neue",
sans-serif`. Monospace, for code only (formulas, commands, error codes): `"Roboto Mono",
ui-monospace, SFMono-Regular, Menlo, monospace`, not bundled. (tokens.ts `CM_FONT_FAMILY`,
`CM_FONT_FAMILY_MONO`; changelog, "The bundled font".)

- **T1.** One sans family in the whole chrome. The canvas's node labels are graphty-element's
  and follow the reader's style, not this rule.
- **T2.** No uppercase text anywhere in the chrome, including section headers. (Several UX
  documents write section names in capitals, such as "ROLES" in round-4 2.4, to mark them as
  headers in a table; on screen they are "Roles".) (spec 2.3)
- **T3.** Emphasis is weight, never size, colour or italics (spec 2.3).

### 3.2 The scale, and one job per size

These are the only type styles in the chrome. Each has one job; a style may not be used for
another job to "make it fit" or "make it stand out". (tokens.ts `CM_TYPE`; spec 2.3; changelog
"Type" and items 21 and 39.)

| Style | Size / line-height | Weight | Letter-spacing | Its job, and nothing else |
|---|---|---|---|---|
| Empty-state heading | 15 / 25 | 550 | -0.075px | the one heading of an empty panel or the Welcome sheet |
| Panel title | 13 / 22 | 550 | -0.032px | the dataset name in the file header; the selected object's name in the inspector; a dialog's title is NOT this (it is section title) |
| Palette row | 13 / 24 | 400 | -0.003px | the command palette's search text and its rows |
| Section title | 11 / 16 (32 in a header) | 550 | normal | section headers, panel title rows, popover and dialog titles, the selected pill tab, table column headers, the toast's message |
| Body | 11 / 16 | 450 | 0.055px | everything else a reader reads: labels, values, button labels, menu rows, tooltips, list rows, the status bar |
| Tree row, top level | 11 / 32 | 600 | 0.055px | names of top-level tree rows only (the Dataset, and objects at the first level) |
| Tree row, nested | 11 / 32 | 400 | 0.055px | names of nested tree rows only |
| Caption | 9 / 14 | 500 | 0.27px | the caption or legend above a field or a two-column row |
| Rail label | 9 / 14 | 450 | 0.045px | the word under a rail icon, and nothing else |
| Result path | 10 / 16 | 400 | normal | the parent path on a Find result row (compact-mantine `ResultRow`), and nothing else |
| Shortcut sheet | 12 / 16 (tabs 12 / 38) | 400 | normal | the keyboard shortcuts sheet only |
| Key cap | 14 / 24 | 400 | normal | key caps on the shortcuts sheet only |
| Code | 11 / 16, monospace | 400 | normal | formulas, commands ("Copy as command"), error codes in brackets |

- **T4.** The weights in use are 400, 450, 500, 550 and 600, each tied to a style above. A
  weight is never set on its own to emphasise a word, with one exception: the matched part of a
  Find result is 600 (spec 10.4).
- **T5.** No text is smaller than 11 px except the three 9 px and 10 px styles above, each in its
  one place.
- **T6.** A selected row or tab does not change size. The selected pill tab changes weight from
  450 to 550 and reserves the width of its bold label, so selecting never shifts layout
  (spec 5.1).
- **T7.** Truncation: a name that does not fit ends in an ellipsis and shows in full in a
  tooltip. A count or a number is never truncated or abbreviated to fit (round-2 screens
  conventions).

**Where this departs from the current mocks.** The v2 mocks draw every pill tab at 550 and the
selected tree row at 550. compact-mantine draws unselected tabs at 450 in secondary ink and does
not change a tree row's weight when it is selected (spec 5.1, 10.1). This document follows
compact-mantine; the generator should be changed (section 13).

### 3.3 Field labels

compact-mantine's field labels (Mantine's `label` prop) and `ControlGroup` legends are captions:
9/14 weight 500 in `--cm-text-secondary` (changelog items 21 and 39). The spec's earlier 11/16
legend was replaced in the build. A caption names a field in at most three words ("Opacity",
"Corner radius", "Font size").

## 4. Colour

### 4.1 How colour is organised

Every chrome colour is a compact-mantine token, written with the CSS `light-dark()` function, so
one set of rules produces both themes (spec 2). The app never writes a hex value for chrome.
Ink is translucent black in light (90, 50 and 30 percent) and translucent white in dark (100, 70
and 40 percent), so the same ink reads correctly on white, grey and tinted fills (Figma
components 2).

### 4.2 The palette by role

Light / dark. Source: tokens.ts `CM_COLORS`; spec 2.1.

**Ink (text and icons)**

| Role | Token | Light / dark | Used for |
|---|---|---|---|
| Primary ink | `--cm-text`, `--cm-icon` | #000000e5 / #ffffff | names, values, labels a reader acts on, icons of controls |
| Secondary ink | `--cm-text-secondary`, `--cm-icon-secondary` | #00000080 / #ffffffb2 | captions, legends, counts in rows, secondary lines, unselected tab labels, the status bar's text, unselected segment icons |
| Tertiary ink | `--cm-text-tertiary`, `--cm-icon-tertiary` | #0000004d / #ffffff66 | placeholders, tree carets, nested kind icons, the caret on a select, hidden rows |
| Disabled ink | `--cm-text-disabled`, `--cm-icon-disabled` | #0000004d / #ffffff66 | disabled controls only |
| Brand ink | `--cm-text-brand`, `--cm-icon-brand` | #007be5 / #7cc4f8 | links; the glyph of an open or active control (an open popover trigger, the active rail button, a toggle that is on) |
| Danger ink | `--cm-text-danger` | #dc3412 / #fca397 | the sentence of an error; a destructive menu row |
| Ink on the accent | `--cm-text-onbrand` | #ffffff | text and icons on a filled accent surface |

**Surfaces and fills**

| Role | Token | Light / dark | Used for |
|---|---|---|---|
| Panel | `--cm-bg` | #ffffff / #2c2c2c | panels, bars, the toolbar, popovers, dialogs, the command palette |
| Field fill | `--cm-bg-secondary` | #f5f5f5 / #383838 | filled fields, segmented tracks, the selected pill tab, the current list row |
| Hover | `--cm-bg-hover` | #f5f5f5 / #383838 | a row, tab, tool or rail pill under the pointer |
| Pressed | `--cm-bg-pressed` | #e6e6e6 / #444444 | pressed; a chevron whose flyout is open; a row whose popover is open |
| Hover on a transparent control | `--cm-bg-transparent-hover` | #0000000d / #ffffff0d | ghost icon buttons and secondary buttons |
| Pressed on a transparent control | `--cm-bg-transparent-pressed` | #0000001a / #ffffff1a | the same, pressed |
| Selected | `--cm-bg-selected` | #e5f4ff / #394360 | a selected row; an open trigger; a toggle that is on; the active rail pill |
| Child of selected | `--cm-bg-selected-secondary` | #f2f9ff / #32394d | rows inside a selected tree parent; hover on a toggle that is on |
| Accent fill | `--cm-bg-brand` | #0d99ff / #0c8ce9 | the primary button, the armed tool, a checked blue checkbox, a switch that is on, the menu highlight, progress fill |
| Disabled fill | `--cm-bg-disabled` | #d9d9d9 / #757575 | a disabled filled button |
| Menu and tooltip | `--cm-bg-menu`, `--cm-bg-tooltip` | #1e1e1e in both | menus, list boxes, tooltips, the shortcuts sheet |
| Toast | `--cm-bg-toolbar` | #2c2c2c in both | the toast |
| Hint banner | `--cm-bg-info` | #e5f4ff / #394360 | the banner that may tuck under the secondary bar |

**Lines**

| Role | Token | Light / dark | Used for |
|---|---|---|---|
| Divider | `--cm-border` | #e6e6e6 / #444444 | section dividers, panel top and bottom lines, toolbar dividers, a field's hover outline, the select trigger's border, table grid |
| Panel edge | `--cm-border-translucent` | #0000001a / #ffffff1a | a side panel's edge against the canvas; the secondary button's outline; dark-menu separators |
| Strong translucent | `--cm-border-translucent-strong` | #00000033 / #ffffff33 | checkbox and switch edges |
| Focus and selected edge | `--cm-border-selected` | #0d99ff / #0c8ce9 | the focus ring; a focused field's outline; the drop target box; the inline rename border |
| Danger edge | `--cm-border-danger-strong` | #dc3412 / #fca397 | an invalid field's outline |

**Status**

| Role | Token | Light / dark | Used for |
|---|---|---|---|
| Danger fill | `--cm-bg-danger` | #f24822 / #e03e1a | the confirm button of a destructive, not undoable action (screen 44), and nothing else |
| Success fill | `--cm-bg-success` | #14ae5c / #198f51 | not used by the app today (reserved) |
| Warning fill | `--cm-bg-warning` | #ffcd29 / #f3c11b | the fill of the warning glyph only; never behind text, never as text colour |
| Component purple | `--cm-text-component`, `--cm-bg-component-tertiary`, `--cm-icon-component-tertiary` | #8638e5 / #d1a8ff, and tints | reserved; not used by the app (**decided here**: Figma uses purple to mean "an instance of a reusable component"; graphty has no such thing in the chrome yet. The candidate is a saved style applied to an object. Until that is decided, no purple) |

### 4.3 What the accent means

**The accent means "the live or chosen state of the interface, or the one action this surface
is for".** It never means data, never decorates, never warns. (`analysis.md` section 3 and 4,
"one meaning for the accent"; spec 1 rule 5.)

The accent may appear as:

- a fill (`--cm-bg-brand`): the armed tool, the primary button, a checked checkbox in a dialog,
  a switch that is on, the highlighted menu row, the progress bar's fill, the notification dot,
  the selected option in the toolbar's view-mode menu (its check);
- a tint (`--cm-bg-selected`) with a brand glyph: a selected row, the active rail button, a
  control whose popover or menu is open, a toggle icon button that is on;
- a 1 px line (`--cm-border-selected`): keyboard focus, a focused field, a drop target;
- brand ink (`--cm-text-brand`): a link.

It may not appear as: a section header, a count, a chart in the chrome that shows data (the
histograms and sparklines in rows use `--cm-icon-secondary`, with only the highlighted bin in
the accent, spec 9.8), an icon at rest, a heading, a background band, or anything on the
canvas.

### 4.4 Selection

| Where | How selection is drawn | Source |
|---|---|---|
| Tree and list rows | a 24 px pill of `--cm-bg-selected`, radius 5, inset 4 8 4 12; contiguous selected rows merge into one block; rows inside a selected parent take `--cm-bg-selected-secondary` | spec 10.1 |
| The inspector | the selected object's name in the panel title style; nothing tinted | round-2 2.3 |
| The canvas | graphty-element's own selection halo (gold), never the accent | `analysis.md` section 3 |
| Table rows (dock) | every cell `--cm-bg-selected`; no hover tint | spec 10.6 |
| Multiple objects selected | the inspector's fields that differ read "Mixed" (section 7.3) | Figma flows 2 |

### 4.5 Data colours are content

The graph's colours (community palettes, measure ramps, highlight colours for Sets, the
reader's own style colours) are the reader's content, like the text of a document.

- **C1.** Chrome never uses a data colour. A tree row's style chip and a legend swatch SHOW data
  colours; they do not borrow them for anything else (no tinted rows, no coloured names, no
  coloured counts).
- **C2.** Data never uses the accent. graphty-element's highlight palette, from which each new
  Set takes its colour, is disjoint from every categorical palette and never contains #0d99ff,
  #0c8ce9, #007be5 or the selected tint (round-2 5.4; `analysis.md` 5.13).
- **C3.** The same data colour is drawn the same everywhere it appears: on the canvas, in the
  tree chip, in the legend, in the inspector's Style tab. The chrome reads it from
  graphty-element; it never keeps its own copy (root `CLAUDE.md`, "The app MUST NOT work around
  graphty-element").
- **C4.** Switching the theme does not change data colours. Only the element's default greys
  for unstyled nodes and edges change (#757575 nodes and #5a5a5a edges in dark), and that is the
  element's job (`analysis.md` section 3; graphty-element issues #291 and #331).

### 4.6 The canvas

The canvas background is graphty-element's, not a chrome token: #f5f5f5 in light and #1e1e1e
in dark by default (the mock kit's `--k-canvas`), and whatever the reader's Look sets. The
chrome never paints over the canvas except with floating surfaces (L2) and the reader's own
legend card.

### 4.7 The two contrast settings

compact-mantine has a `highContrast` option (`createCompactTheme({ highContrast: true })`),
off by default. When on, it changes only colour tokens, to values from Figma's own palette, so
that every text and control pair passes WCAG 2.2 AA (spec 2.9; changelog "The high-contrast
option"). What it changes:

| Token | Figma default (light / dark) | High contrast (light / dark) |
|---|---|---|
| secondary text and icons | #00000080 / #ffffffb2 | #0000008c / unchanged |
| placeholder (tertiary text) | #0000004d / #ffffff66 | #0000008c / #ffffffb2 |
| checkbox and switch edges | #00000033 / #ffffff33 | #00000073 / #ffffff59 |
| field edge (a new 1 px inside edge on every filled field) | none | #00000073 / #ffffff59 |
| selected segment edge | #e6e6e6 / #444444 | #00000073 / #ffffff73 |
| focus ring | #0d99ff / #0c8ce9 | #007be5 / unchanged |
| accent fill (white text on it) | #0d99ff / #0c8ce9 | #0768cf / #0a6dc2 |
| links and brand glyphs | #007be5 / #7cc4f8 | #0768cf / unchanged |
| danger and success fills | #f24822, #14ae5c | #bd2915, #008043 |

Dividers do not change. Nothing moves or resizes.

- **C5.** The app offers this as one switch in Settings, labelled "High-contrast interface".
  **(decided here**: the Styles panel already has a Look called "High contrast", which changes
  the GRAPH. The two must not share a name, by the rule "one word for one thing", `analysis.md`
  section 4.)
- **C6.** Every mock is drawn in the default (Figma) contrast. Screen 12 is the dark twin of
  screen 3; no screen needs a high-contrast twin, because the option changes tokens only.

### 4.8 Dark surfaces in both themes

Menus, list boxes, tooltips, the toast, the shortcuts sheet and key caps are dark in the light
theme too (spec 1 rules 10, 8; spec 11.8). They are drawn by setting `color-scheme: dark` on an
inner wrapper, so every token inside resolves to its dark value; the surface's shadow keeps the
page's theme (spec 2.6). The app never builds a light menu.

## 5. Shape and depth

### 5.1 Radii

Four values, each with its own set of parts (spec 2.5; tokens.ts `compactRadius`):

| Radius | Parts |
|---|---|
| 2 | checkbox face, colour chit, key cap, size badge |
| 5 | every button, field, select, tab, tooltip, row highlight pill, menu highlight, badge, chip |
| 13 | menus, list boxes, popovers, dialogs, the toolbar, the secondary bar, the command palette, the toast, the scatter-plot panel |
| full | switch track, slider track, avatar, help button, notification dot, progress bar |

Joined controls use one-sided radii: `5px 0 0 5px` and `0 5px 5px 0`. The toolbar's view-mode
options inside a sliding track use 3 (spec 5.3); graphty's view-mode control is a button, so
it uses 5.

### 5.2 Borders versus fills

- **B1.** Fields are filled and borderless at rest (`--cm-bg-secondary`), outlined in
  `--cm-border` on hover, ringed in the accent on focus. The one outlined field is `Select`
  (spec 6, 6.4).
- **B2.** Buttons: the primary is filled; the secondary is transparent with a 1 px translucent
  outline; the ghost has neither (spec 4.1).
- **B3.** Nothing inside a panel is boxed. There are no cards, no bordered groups, no inset
  wells. The only lines in a panel are the 1 px divider below each section and the table grid in
  the dock (spec 9.7; `analysis.md` section 3, "Borders versus whitespace": the current app had
  43 border edges against Figma's 26).
- **B4.** A divider is always `--cm-border` 1 px, except a panel's edge against the canvas and a
  separator inside a dark menu, which are `--cm-border-translucent`.

### 5.3 Elevation

Panels have no shadow. Floating surfaces take one of these, and only these (spec 2.6; tokens.ts
`CM_ELEVATIONS`):

| Level | Used by, in graphty |
|---|---|
| 100 | nothing in graphty today (Figma uses it for the sliding thumb of a mode switch) |
| 200 | the toolbar, the secondary bar, the command palette, the floating help button if one is used |
| 300 | tooltips |
| 400 | menus, list boxes, light popovers (the parameters popover, the colour picker, the default-look popover), the scatter-plot panel |
| 500 | dialogs (Import, Export, Settings, confirmations) |
| toast | the toast only |

In dark, each level adds white inset hairlines (the tokens do this). No other shadow, glow or
blur exists in the chrome. There is no backdrop behind a dialog unless the dialog blocks all
other work (spec 8.5, `withOverlay` false by default).

## 6. Iconography

### 6.1 Boxes and sizes

| Place | Icon box | Glyph drawn | Source |
|---|---|---|---|
| Panel icon buttons (section actions, row actions, "+", "...") | 24 | 12 nominal (10 to 14) | spec 4.3, 9.1 `GLYPH` |
| Tree kind icon, inline icon in a field, search magnifier | 16 | 10 to 16 | spec 10.1, 6.2 |
| Toolbar tools, rail icons, large icon buttons | 24, in a 32 button or pill | 15 to 18 | spec 11.2, 11.4 |
| Menu leading icon | 24 | as a toolbar glyph | spec 8.1 |
| Close X | 10 x 10 in a 24 box | | spec 4.7 |
| Caret (select, section, flyout chevron) | 5 x 3 in a 10 slot | | spec 9.1 `CHEVRON` |
| Check (menus, checkboxes) | 9 x 8.5 | | spec 5.4 |

### 6.2 How a glyph is drawn

- **I1.** Glyphs are outlines drawn with round caps and joins, one CSS pixel wide at the size
  they are drawn, in `currentColor`. Colour always comes from the control's ink token, never
  from the drawing (compact-mantine `src/icons/index.tsx`, `strokeFor`).
- **I2.** A glyph is filled only to show a state that its outline already shows (the bound form
  of a field glyph; a filled dot for "on"). Never for decoration.
- **I3.** The set, in order of preference: compact-mantine's registers (`UiGlyph` for chrome
  glyphs, `FieldGlyph` and `FIELD_LETTERS` for a field's leading slot), then `lucide-react`
  (already a dependency of both compact-mantine and the app) drawn with `absoluteStrokeWidth`
  and `strokeWidth={1}` so its strokes match. A glyph the app needs more than once is proposed
  into compact-mantine's register rather than kept in the app. **(decided here**: one visual
  weight across all icons; lucide's default 2 px stroke would read twice as heavy as the
  register.)
- **I4.** A field's leading slot draws only from its closed register; a concept with no entry
  keeps its word (compact-mantine `FieldGlyphName`, "a small drawing can replace a word only if
  the drawings are a fixed set a reader can learn").
- **I5.** One concept, one glyph, everywhere: the kind icon of a Measure is the same in the tree,
  the toolbar's Rank tool, the flyout rows, the command palette and the inspector's kind line.
- **I6.** Figma's icons are never copied (Figma study `README.md`).

### 6.3 When an icon may stand alone

An icon with no word next to it is allowed only when all three hold:

1. It has a tooltip that names it, with its key when it has one ("Rank  R"), and an accessible
   name equal to that tooltip's name (spec 4.3: every icon-only button has a tooltip).
2. It is one of: a universal convention (close X, plus, minus, "...", eye, lock, gear, search,
   caret, check); a toolbar tool (where the tooltip IS the label, round-4 3.1); or a rail button
   (which has its 9 px word anyway).
3. It is not the primary action of its surface, not a destructive action, and not a dialog's
   commit button. Those always carry a word: "Export", "Run", "Create", "Delete", "Cancel".

Every other control carries a word. The rail keeps its words because five abstract panels
("Styles", "Views") cannot be guessed from pictures (round-4 2.2). The view-mode button's face
IS a word ("2D", "3D", "VR", "AR"), in body strong (round-4 3.4).

## 7. Components

### 7.1 Which component does which job

Use the compact-mantine component named here, with its default props, for every instance of the
job. A job not in this table is added here before it is drawn.

| Job | Component | Notes |
|---|---|---|
| The rail and its buttons | `NavRail`, `RailButton` | active = `aria-expanded`; notification dot = `Indicator` |
| Floating toolbar | `Toolbar`, `ToolGroup`, `ToolButton`, `Toolbar.Divider` | tools 32 x 32, chevrons 16 x 32 |
| Flyout of a tool; the view-mode menu | `Menu` (dark) | rows `menuitemradio` with the check column |
| Secondary bar | `SecondaryToolbar` | a light surface, not dark (section 13) |
| Command palette | `QuickActions` | 529 x 354, 8 above the toolbar |
| Object tree; paint order; views list; style layer list | `Tree` | flat `Tree` when no item has children |
| Other selectable lists (datasets, columns, pages) | `Tree` (flat) or `PageList` / `PageRow` | never `DataRow` (changelog, `DataRow` keeps only readings) |
| A reading (a statistic, a fact, a rank) | `DataRow`, `MetricRow`, `RankChip` | not selectable, not renamed |
| Find | `SearchInput` + `ResultRow` | |
| Rename in place | `InlineRename` (built into `Tree` and `PageList`) | F2 or double-click |
| Section with a header | `ControlSection` | 40 header, 12 bottom, divider below |
| Field row with a caption | `FieldRow`, `ControlGroup` | captions above |
| A number | `NumberInput` / `PanelField kind="number"` / `StyleNumberInput` | scrub slot, no steppers |
| A choice from a list | `Select` (outlined) / `PanelField kind="select"` / `StyleSelect` | dark list box over the trigger |
| A typed value with suggestions | `ComboInput` | |
| Text | `TextInput`, `Textarea` | |
| 2 to 6 mutually exclusive options, shown at once | `SegmentedControl` | icon options carry a visually hidden word |
| On / off | `Switch` in a row; `Checkbox variant="neutral"` in a panel list; blue `Checkbox` in dialogs | |
| On / off as an icon (eye, lock, pin) | `ToggleIconButton` | fires on pointer down |
| A colour | `CompactColorInput` (paint row) + `ColorPickerPanel` | 14 px chit inside the field |
| A gradient or ramp | `GradientEditor`, `RampRow` | |
| Icon button | `ActionIcon` (subtle) | 24 box; 32 for large |
| Text button | `Button`: filled (primary), `default` (secondary), `subtle` (ghost), `danger` | 24 tall (32 for `md`) |
| Button with a menu of variants | `SplitButton` | "Create" and "Create and focus" (round-4 3.5) |
| Advanced settings for a row | `AdvancedButton` + `Popout` | preferred over folding content away with `ControlSubGroup` (spec 9.4) |
| Floating settings | `Popout` (light popover) | 240 wide, one root at a time |
| Right-click | `ContextMenu` | also Shift+F10 |
| Tooltip | `Tooltip` inside one app-wide `Tooltip.Group`; `TooltipShortcut` for the key | |
| Dialog | `Modal` + `ModalFooter` | sizes 320 / 480 / 760 |
| Transient confirmation | `Toast` via `useToast` | one at a time |
| Tabs in the inspector, the dock, a popover header | `Tabs` (pills) | |
| Panel width | `ResizeHandle` | |
| Keyboard shortcuts | `ShortcutSheet`, `Kbd` | |
| Data table (dock) | `DataTable` | |
| Scrolling | `ScrollArea` (hover scrollbar) | |
| Progress | `Loader` (16), `Progress` | |
| Help menu at the rail's foot | `ActionIcon` (32) opening a `Menu` | |

**What compact-mantine does not have, and the app composes:** the status bar (a 24 px row of
body text in secondary ink and 20 px subtle `Button`s for its chips), the file header (a
`SplitButton`-like pair: the name renames, the chevron opens the file menu), the inspector
header block, and the time transport bar. Each is built only from the components above; none
introduces a colour, size or radius outside this document. If a second consumer would need one
of them, it moves into compact-mantine.

### 7.2 States

Every control has these states, drawn the same everywhere (spec 4 to 11):

| State | How it is drawn | Notes |
|---|---|---|
| Rest | as section 4 | focusable controls carry a transparent 1 px outline so focus never shifts layout |
| Hover | the control's hover fill (`--cm-bg-hover` for rows, tabs, tools, rail; `--cm-bg-transparent-hover` for ghost and secondary buttons; `--cm-border` outline for fields) | instant; icons do not change colour |
| Pressed | `--cm-bg-pressed` or `--cm-bg-transparent-pressed`; primary button `--cm-bg-brand-pressed` | |
| Focus (keyboard) | 1 px `--cm-border-selected`; outside (+1) on buttons, tabs and checkboxes; inside (-1) on fields, joined segments, toolbar tools and the active rail pill; double ring on a filled accent tool | only on `:focus-visible`, except text and number fields, which ring on any focus |
| Selected | tint `--cm-bg-selected` for rows; `--cm-bg-secondary` plus weight 550 for the selected pill tab and the current page row; accent fill for the armed tool | a selected tab is grey, not blue |
| Open | a trigger whose menu or popover is showing: `--cm-bg-selected` with a brand glyph (icon buttons, rail); `--cm-bg-pressed` (tool chevrons, rows that opened a popover) | |
| On | toggle icon button: `--cm-bg-selected` + brand glyph; switch: accent track | |
| Disabled | disabled ink; filled buttons `--cm-bg-disabled`; no hover; skipped by Tab | a disabled control that the reader might expect to work has a tooltip saying why ("12,400 nodes showing; VR takes up to 10,000", round-4 3.4) |
| Mixed | number and text fields show the word "Mixed"; a checkbox shows a dash; a switch shows a centred bar | when several objects are selected and their values differ |
| Invalid | field outline `--cm-border-danger-strong`, hidden while focused; bad input reverts on commit | no inline error text in panels (Figma flows 6) |
| Loading | a filled button keeps its width, shows a 16 px spinner, cursor `progress` | |

### 7.3 Row types

The panel rows are a small closed set. A new kind of row is added to this table before it is
drawn.

| Row type | Height | Built from |
|---|---|---|
| Section header | 40 | `ControlSection` |
| Property row (one control on the grid) | 32 | `PanelField`, `CompactColorInput`, `ActionRow` |
| Field row with a caption band | 48 | `FieldRow` / `ControlGroup` |
| Two-column captioned row | 50 | `FieldRow` with labels |
| Toggle row | 32 | `ToggleRow` (neutral checkbox or switch) |
| Tree row | 32 | `Tree` |
| List row (views, datasets, columns) | 32 | flat `Tree` or `PageRow` |
| Reading row | 32 | `DataRow`, `MetricRow` |
| Chart row | 32 (sparkline) or 64 (histogram) | `SparklineRow`, `HistogramRow` |
| Prose block (one sentence about the data) | 16 per line, at most two lines | `ProseBlock` |
| Link row ("Columns and roles >") | 32 | `PageRow` with a trailing caret |

### 7.4 The primary button

- **K1.** At most one filled accent button per surface. A surface is: the frame's panels
  together; the toolbar with its secondary bar; each dialog; each popover. On a loaded screen the
  frame's one is Export (round-2 screens conventions); before a load it is the Welcome sheet's
  first way in. While a tool is armed, the secondary bar's Run is its surface's one.
- **K2.** A dialog's footer is Cancel (secondary) then the primary, end-aligned, 8 apart. A
  destructive confirm uses the danger button instead of the primary (spec 8.5).

## 8. Motion and timing

- **M1.** Overlays appear and disappear in one frame: menus, submenus, flyouts, list boxes,
  popovers, dialogs, tooltips, the toast, the command palette, tabs, rows. No fade, slide or
  scale (spec 2.8; Figma flows 1 rule 1).
- **M2.** What moves, and only this (spec 2.8; tokens.ts `CM_MOTION`):

| What | Property, duration, easing |
|---|---|
| Section header title, chevron and "+" on hover, empty sections only | colour, 100 ms ease-out |
| Hover-revealed row actions (tree row eye and lock) | opacity, 100 ms ease-out |
| Checkbox tick, when checking | 100 ms, `--cm-ease-in-out` |
| Switch knob and track | 100 ms |
| Loading button label out, spinner in | 200 ms, `--cm-ease-loading` |
| The toolbar rising above the time transport bar | none (**decided here**: Figma animates this lift over 250 ms, but compact-mantine has no token for it and the rule M1 is simpler to check; the bar moves in one frame) |

- **M3.** Tooltips: 1000 ms before the first one opens; 0 ms for the next while one is showing
  or within 300 ms after it closed; 300 ms to hide; a pointer-down, a key or the wheel hides at
  once. One `Tooltip.Group` wraps the whole app (spec 8.3; changelog "Tooltips").
  **Exception (round-4 3.1):** the toolbar's tooltips replace its missing labels, so they open
  with no delay. compact-mantine cannot yet give one tooltip its own delay inside the app-wide
  group (changelog, "Known differences"); until it can, the toolbar uses the shared timing. The
  fix belongs in compact-mantine.
- **M4.** Hover feedback (fills, the two-way hover link between a row and the canvas) is
  instant.
- **M5.** Toasts: about 3 s under 20 characters, about 6 s otherwise; a toast with an action
  stays until acted on or replaced; one toast at a time (spec 8.6).
- **M6.** `prefers-reduced-motion` removes nothing: there are no large movements to remove
  (spec 2.8).
- **M7.** Progress is shown, not animated for its own sake: a ring or bar that reflects real
  progress, or a static glyph when progress is unknown (round-2 section 4, step 6).

## 9. Words

### 9.1 Voice

- **W1.** Plain, short, specific, in the second person only when a sentence must address the
  reader. No "please", no "successfully", no exclamation marks, no "Oops".
- **W2.** Buttons and menu rows are verbs ("Export", "Run", "Add data...", "Save view");
  sections, tabs and panels are nouns ("Roles", "Style", "Data").
- **W3.** One word for one thing across the whole app (`analysis.md` section 4). A term is
  defined once in the UX documents; the chrome never prints a synonym for it. The plain name
  comes first; the technical name is secondary text in a flyout, the tooltip of a tree row, and
  the inspector's kind line ("Bridges", tooltip "Betweenness centrality") (round-2 screens
  conventions).
- **W4.** A label is at most three words; a button at most two, not counting an ellipsis.

### 9.2 Capitalisation and punctuation

- **W5.** Sentence case everywhere: "Export styles...", "Open table", "Show hidden faintly".
  Only proper nouns and the view modes ("2D", "3D", "VR", "AR") are capitalised beyond the first
  word.
- **W6.** A command that asks for more before it acts ends in "..." (three ASCII dots): "Import
  styles...", "Replace...". A command that acts at once has none: "Reload", "Save view".
- **W7.** Keys are written with the key names joined by "+": "Ctrl+K", "Alt+2", "Shift+T".
  In a tooltip the key follows the name after two spaces ("Data  Alt+2") (spec 8.3
  `TooltipShortcut`).
- **W8.** No full stop at the end of a label, a row, a button or a one-line tooltip. A sentence
  in a dialog or an error ends with one.

### 9.3 Numbers, counts and units

- **W9.** The count grammar (round-2 screens conventions), one spelling everywhere: a pair is
  "34 nodes  78 edges" (two spaces, no comma); a subset uses "of": "412 of 1,204 nodes"; a
  tree row carries one count ("5 nodes", "4 edges", "34 values", "4 groups"; a Group carries a
  bare "12"); the root row carries none.
- **W10.** Thousands are separated with a comma ("1,204"). A count is never abbreviated ("12k"
  is not allowed) and never truncated.
- **W11.** Measure values in rows show three significant figures ("0.031", "12.4", "1,204");
  the table and the value's tooltip show the full value. **(decided here**: the inspector's 88 px
  field fits about 12 characters, and three figures are enough to compare rows.)
- **W12.** Units follow the number after a space ("80 ms", "8 s", "240 px"), except percent,
  which has none ("42%"). Estimates say "about" ("about 80 ms"), never "~".
- **W13.** Dates are ISO ("2019-01-15", a month "2019-01"); times are 24-hour ("10:42").
- **W14.** Singular and plural agree: "1 node", "2 nodes"; never "node(s)".

### 9.4 Empty states, errors, confirmations

- **W15.** An empty section is its header with a "+". An empty panel shows one empty-state
  heading (15/25), at most one sentence, and the actions that fill it (the Data panel before a
  load, round-4 2.4). Nothing is drawn for a feature that does not exist yet.
- **W16.** An error says what happened in one sentence, then the code in brackets, then what to
  do as a button: "The file is not valid GraphML (E_PARSE, line 12). [Open another file...]".
  Details go behind "Copy details" (`round-3/history-errors.md`).
- **W17.** A non-fatal error is a status-bar chip, not a dialog (`round-3/history-errors.md`,
  "Non-fatal element errors").
- **W18.** Reversible actions never ask first; they are undone with Ctrl+Z. Only an action that
  loses work that cannot be undone asks (closing with unsaved work, screen 17; removing data,
  screen 44). The question names the loss: "Close Email network? 3 objects are not saved."

### 9.5 No app-authored text at rest

- **W19.** At rest, the words in a panel are: its title and section headers, the labels of its
  rows, the reader's names, the data's values, and at most one sentence about the data (the
  Dataset Overview's reading, an object's reading row). Nothing else.
- **W20.** Explanations appear on request: in a tooltip, behind a "?" at the end of a reading
  row, in the command palette, in Help. Tool tooltips carry one sentence each (round-4 3.1).
- **W21.** Text is never said twice on one screen (for example the secondary bar and the status
  bar both saying "pick the end node") (`analysis.md` section 4).

## 10. Interaction patterns

### 10.1 Selection

- Click selects one; Shift+click extends a range in a list; Ctrl+click toggles one; a drag on
  empty canvas draws a marquee; Escape clears (Figma flows 2; spec 10.1).
- The inspector always shows the selection, or the Dataset when nothing is selected
  (round-4 section 0).
- Selecting on the canvas expands the tree to the object and scrolls its row into view, when
  the Objects panel is open (Figma flows 2).

### 10.2 Hover to highlight

- Hovering a tree row, a paint-order row, a "Made:" row or a History row outlines its members on
  the canvas; hovering a node on the canvas gives its rows the hover fill. Both are instant and
  drawn by graphty-element (round-4 2.7; Figma flows 2).
- Hovering never changes the selection, the inspector or the camera.

### 10.3 Inspector tabs

- Pill tabs, 24 px tall in a 32 px row, 4 px apart; they activate on pointer-down; arrows move
  and select (spec 5.1).
- One tab is one job; three or four tabs per kind; four names total at most 27 characters
  (round-2 2.6).
- The header block above the tabs never scrolls and never changes with the tab (round-2 2.6).

### 10.4 Disclosure

- A section collapses only where its content is optional; its caret sits in the 16 px left
  gutter, and its header carries a summary so a collapsed section still answers the common
  question (spec 9.2; round-2 2.6 rule 4).
- Advanced settings open in a popover from a 24 px `AdvancedButton`, not by folding rows away
  inside the panel (spec 9.4).
- Collapsing and expanding happen in one frame (M1).

### 10.5 Menus and popovers

- One overlay at a time: opening a menu or a root popover closes the open one (spec 8.1, 8.4).
- Menus open 4 px below their trigger; toolbar flyouts open 4 px above their chevron; context
  menus open at the pointer; list boxes open over their trigger with the current value on top of
  it (spec 8.1, 6.5, 11.2).
- Popovers are 240 wide and dock flush against the panel whose row opened them, on the canvas
  side: to the left of the inspector, to the right of the left panel (spec 8.4 docks to the
  start side; the left panel's popovers mirror it, **decided here**, because a popover to the
  left of the left panel would be off screen).
- Escape closes the top-most overlay only; focus returns to the control that opened it
  (spec 8.4; Figma flows 8).

### 10.6 Drag and drop

- Tree reorder: the dragged row keeps its pill; the target container gets a 1 px accent box;
  the insertion point is a 2 px `--cm-icon` line at the insertion depth; drop zones are the top
  quarter (before), middle half (into), bottom quarter (after or first child) (spec 10.1).
  Alt+ArrowUp and Alt+ArrowDown do the same from the keyboard (changelog, `Tree`).
- The Styles panel's paint order is the tree's order seen by paint; dragging a row there moves
  it in the tree (round-4 2.5).
- A file dragged over the window draws a 1 px accent outline around the drop area with one line
  saying what the drop will do ("Import data", "Import styles", "Run a recipe") (round-4 2.5;
  screen 101).
- Panel edges drag with `ResizeHandle`: no visible handle at rest, a grip only on keyboard focus
  (spec 9.9).

### 10.7 Keyboard

- Every control is reachable and operable from the keyboard. The rail, the toolbar, tab lists
  and trees are one Tab stop each with roving focus (arrows, Home, End) (spec 11.1, 11.4, 5.1,
  10.1).
- Ctrl+F6 and Ctrl+Shift+F6 move between regions: canvas, left panel, inspector, toolbar,
  status bar (Figma flows 8). **(decided here**: the app has no hidden canvas focus target of
  its own; the canvas region is graphty-element's.)
- Ctrl+K opens the command palette; Ctrl+F opens Find; "?" is not a shortcut (Ctrl+/ opens the
  shortcuts sheet) (round-4 2.3, 4).
- Enter in a field commits and keeps focus there; Escape reverts; Tab commits and moves on
  (spec 6.1).
- Tooltips also open on keyboard focus, with the same timing (spec 8.3).

### 10.8 Undo

- Every change the reader makes is one undo step, including a scrub (one step on release), an
  import, a style import and a look applied (Figma flows 6; round-4 6.3).
- Undo and redo (Ctrl+Z, Ctrl+Shift+Z) give no toast; the change itself is the feedback. The
  History dock draws the journal (Figma flows 3; round-2 decision 1).

## 11. Accessibility baseline

The target is WCAG 2.2 AA with the high-contrast option on, and nothing worse than Figma with it
off.

1. **Contrast.** With `highContrast` on, every text and control pair passes AA (spec 2.9). With
   it off, these known pairs fall short, as Figma's do, and are accepted: secondary text on
   white (4.0:1), placeholder text (2.3:1), white on the accent (2.99:1), the focus ring on
   white (2.99:1), checkbox edges.
2. **Colour is never the only signal.** A state shown by colour also has a glyph or a word: a
   stale object has a glyph and "Stale", an error has a glyph and a sentence, a selected row
   also has `aria-selected`.
3. **Focus is always visible** on keyboard focus (1 px ring, section 7.2) and never moves the
   layout.
4. **Names.** Every control has an accessible name; an icon-only control's name equals its
   tooltip's name (section 6.3). Tooltips are wired with `aria-describedby` (spec 14, a
   deliberate departure from Figma).
5. **Structure.** The object tree is a WAI-ARIA tree with levels, expansion and selection;
   menus use `menuitemradio` and `menuitemcheckbox`; the command palette is a dialog with a
   combobox and a listbox; toasts are `role=alert` (spec 10.1, 11.9, 8.6, 14).
6. **Keyboard.** Everything operable by pointer is operable by keyboard, including the context
   menu (Shift+F10) and the shortcuts sheet (Escape closes it) (spec 14).
7. **Targets** are at least 24 x 24 px (WCAG 2.5.8).
8. **Zoom.** The chrome is sized in CSS pixels and scales with browser zoom. At 200% on a
   1440 px window the panels may cover most of the canvas; text must not be clipped. (Not yet
   checked on any mock.)
9. **Motion.** There is no motion large enough to need reducing (section 8).

## 12. The consistency checklist

Each check is phrased so that a script reading the DOM (`getBoundingClientRect`,
`getComputedStyle`) or a reviewer with a ruler can answer pass or fail, for a mock or for the
built app. The existing mock audit scripts, `tmp/object-first/audit/measure.mjs` and
`report.mjs`, already measure several of them.

**Layout**

1. The rail is 56 px wide plus a 1 px border; each rail button is 56 x 56 with a 32 x 32 pill.
2. The left panel and the inspector are each 240 px wide (241 with the edge), unless the reader
   resized the left panel, which is then between 240 and 480.
3. The status bar is 24 px tall; the dock handle 32; the toolbar 48; the secondary bar 40; the
   transport bar 40.
4. The toolbar is horizontally centred on the canvas and its bottom edge is 12 px above the
   element under the canvas; the secondary bar's bottom is 8 px above the toolbar's top.
5. Every panel row is 32 px tall, except section headers and panel title rows (40), field rows
   (48), captioned two-column rows (50), file and inspector headers (48) and chart rows (64).
6. Every control in a panel is 24 px tall; every tool button, rail pill and large icon button
   is 32.
7. In every panel row, the first text or control starts at x 16 from the panel's inner edge,
   and trailing icon buttons end at x 232.
8. Every padding, margin and gap in the chrome is one of 0, 1, 2, 3, 4, 8, 12, 16, 24, 32 px
   (3 only between a caption and its control).
9. No inspector tab holds more than 14 rows.

**Type**

10. Every text element's font family begins with Inter (monospace only for code).
11. Every text element's size and weight match one row of the table in section 3.2, and that row
    is its job there.
12. No text is smaller than 11 px, except rail labels and field captions (9 px) and a Find
    result's parent path (10 px).
13. No text is uppercase (computed `text-transform` is `none` and the string is not written in
    capitals), except the view-mode faces and proper nouns.
14. Text that does not fit ends in an ellipsis and has a tooltip with the full text; no count or
    number is truncated.

**Colour**

15. Every colour, background, border and shadow in the chrome resolves to a `--cm-*` token's
    value for the current theme.
16. At most one filled accent button per surface (K1).
17. The accent (#0d99ff, #0c8ce9, #007be5, #7cc4f8, #e5f4ff, #394360) appears only in the
    roles listed in section 4.3.
18. No chrome element's text or fill uses a data palette colour; the only data colours in the
    chrome are inside style chips, legend swatches, colour chits and chart rows.
19. Menus, list boxes and tooltips are #1e1e1e in both themes; the toast is #2c2c2c.
20. The dark twin of a screen differs from the light one only in token values (compare the
    DOM: same boxes, same text).
21. No yellow text; `--cm-bg-warning` only fills the warning glyph.

**Shape and depth**

22. Every radius is 0, 2, 3, 5, 13 or fully round, and the part matches section 5.1.
23. No surface docked to a window edge has a shadow or a radius.
24. Every floating surface's shadow is one of the elevation tokens, at the level section 5.3
    gives its kind.
25. No element inside a panel has a border on more than one side, other than a field on hover
    or focus, the Select trigger, a secondary button and the dock's table grid.

**Icons**

26. Every icon box is 16, 24 or 32 px square, and every stroke is 1 CSS px.
27. Every icon-only control has a tooltip and an accessible name, and the two names match.
28. The primary action, every destructive action and every dialog commit button carries a word.
29. Each object kind uses one glyph everywhere it appears (tree, toolbar, flyout, palette,
    inspector).

**Components and states**

30. Every control is a compact-mantine component from section 7.1, used with its default
    variant for its job; no app-side style overrides a compact-mantine component's size, colour
    or radius.
31. Every focusable element shows a 1 px `--cm-border-selected` ring on keyboard focus, and its
    box does not move when it does.
32. A control whose menu or popover is open shows its open state.
33. Every disabled control that the reader might expect to work has a tooltip giving the reason.

**Motion**

34. No element in the chrome has a transition or animation other than those listed in
    section 8 (M2), and none longer than 200 ms.
35. Tooltips open after 1000 ms cold and hide after 300 ms.

**Words**

36. Every label, button, tab, menu row and header is in sentence case.
37. Every command that opens a dialog or asks for more ends in "..."; none that acts at once
    does.
38. Every count pair is written "N nodes  M edges" with two spaces; every number of 1,000 or
    more has a thousands comma; no count is abbreviated.
39. At rest, each panel has at most one app-authored sentence, and it is about the data.
40. No sentence appears twice on one screen.
41. No two labels on one screen use different words for the same thing, and no label uses a
    word that the UX documents define as something else.

**Accessibility**

42. Every interactive target is at least 24 x 24 px.
43. With `highContrast` on, every text and control pair measures at least 4.5:1 (text) or 3:1
    (non-text) against what it sits on.
44. Every state shown by colour is also shown by a glyph, a word or an ARIA state.

## 13. Where the current mocks and documents disagree with this

These are the known differences between this document and the v2 mocks, the mock kit
(`mocks/kit.css`) or the earlier UX documents. In each case this document follows compact-mantine,
and the mock generator (`design/ui/object-first-ux/gen/`) or the
older document should change.

| # | The mocks or documents say | This document says | Why |
|---|---|---|---|
| 1 | The secondary bar is dark with a light Run button (kit `.k-secondary-bar`, `.k-btn-light`) | a light surface (`--cm-bg`, elevation 200) whose Run is the filled accent | compact-mantine `SecondaryToolbar`, spec 11.3 |
| 2 | Every pill tab is weight 550 (round-2 screens conventions; kit `.k-tab`) | unselected tabs 450 in secondary ink, the selected one 550 on a grey pill | spec 5.1 |
| 3 | The selected tree row is weight 550 (round-2 screens conventions) | a tree row's weight is set by its level (600 top, 400 nested), not by selection | spec 10.1 |
| 4 | Menu rows are 32 px (`analysis.md` section 3) | 24 px | spec 8.1 |
| 5 | The toolbar is 56 px with 8 px labels under 40 px buttons (round-2 screens conventions) | 48 px, 32 px tools, no labels | round-4 3.1 |
| 6 | Field captions and legends: 11/16 weight 400 (spec 9.3) | 9/14 weight 500 | changelog items 21 and 39 (what shipped) |
| 7 | The kit has tokens compact-mantine lacks: `--k-text-warning`, `--k-text-success`, `--k-bg-danger-tertiary`, `--k-bg-success-tertiary`, `--k-bg-warning-tertiary`, and matching borders | they are not used; a status is a glyph and words in normal ink, and a danger sentence in `--cm-text-danger` | P6: the kit may not have colours the component library does not; if the app needs one, it is added to compact-mantine first |
| 8 | Toolbar tooltips open with no delay (round-4 3.1) | the shared 1000 / 0 / 300 timing until compact-mantine supports a per-tooltip delay inside the group | changelog, "Known differences" |
| 9 | The "?" button at the right of the status bar (round-2 1.6) | gone; Help is at the rail's foot | round-4 2.8 |

## 14. Annotated examples

**A section in the Data panel (screen 104), on the grid.**

```
x:  0   16                 104 112                200 208      232 240
    +-----------------------------------------------------------------+
 40 |   Roles                                            [+]           |  section title 11/32 550
    |                                                                 |
 32 |   Id                     [from            v]                    |  label 11/16 450 secondary,
 32 |   Label                  [name            v]                    |  Select 88 wide, outlined
 32 |   Time                   [sent            v]                    |
 16 |   Changing a role reloads and keeps your objects                |  the one sentence, 11/16
 12 |                                                                 |  secondary; section bottom 12
    +-----------------------------------------------------------------+  1 px --cm-border divider
```

**A tree row, hovered, then selected (spec 10.1).**

```
hover:     |    [>][#] Communities            4 groups   (eye)(lock) |  24 px pill #f5f5f5, inset 4 8 0 12
selected:  |    [v][#] Communities            4 groups               |  24 px pill #e5f4ff, inset 4 8 4 12
child:     |[        [.] Group 1                  12              ]  |  full 32 px band #f2f9ff
            ^16 caret ^16 icon, name 11/32 600 (top) or 400 (nested); count secondary, right-aligned
```

**The toolbar at rest (round-4 3.1; screen 103).**

```
+--------------------------------------------------------------------------------+
| [>|v] | [F|v] [P|v] [G|v] [R|v] [S|v] | [T] [#] | [3D v] |      48 tall, radius 13
+--------------------------------------------------------------------------------+
  32+1+16 = 49 per group, 8 between; 1 px dividers full height; no words except "3D"
  armed tool: #0d99ff fill, white glyph; tooltip above: "Rank  R: give every node a value"
```

**A tooltip on a rail button (screen 103 inset).**

```
[Data]  -->  +-------------------+
             | Data  Alt+2       |   #1e1e1e in both themes, 24 tall, padding 4 8, radius 5,
             +-------------------+   11/16 450 white; key in #ffffffb2, 12 px after the name
```
