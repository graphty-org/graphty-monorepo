# Consistency audit of the eight object-first mocks

An audit of `design/ui/object-first-ux/mocks/screen-1.html` through `screen-8.html` (and
their PNG stills) against two baselines: the mock kit `design/ui/object-first-ux/mocks/kit.css`
(reference sheet `kit.html`), and the measured Figma study in `design/ui/figma/components.md`
and `design/ui/figma/tokens/tokens.json`. It answers two questions: is the same thing drawn the
same way on every screen, and is anything on a screen that the reader did not ask for.

Every number below was read from the DOM of the HTML files with a headless Chromium at the
mocks' own 1440 x 960 viewport, not estimated from the screenshots. The scripts and the raw
dump are in `tmp/object-first/`: `audit-measure.mjs` (walks each screen and records boxes,
computed styles, colours, fonts and text), `audit-report.mjs` (prints the cross-screen
comparisons from `audit-measure.json`), `audit-fonts.mjs` (which typeface actually rendered),
`audit-crops.mjs` (3x crops of headers, toolbar, tree and status bar) and `audit-share.mjs`
(a pixel probe of the Share button). Re-run `node tmp/object-first/audit-measure.mjs > out.json`
then `node tmp/object-first/audit-report.mjs out.json <section>` to reproduce any table.

## Terms used in this document

- **Row**: one horizontal band of a panel. The Figma baseline has 32 px rows for lists, tree
  rows and single-control property rows, 40 px section headers, 48 px panel title bars, and
  50 px for a two-column row that carries a 9 px caption above each control.
- **Control**: a button, select, switch, input or chip a reader can operate. The baseline
  control height is 24 px; tool buttons in the floating toolbar are 32 px.
- **Type role**: a named combination of size, line height and weight from the Figma scale.
  The roles are body 11/16 weight 450; strong body 11/16 weight 550; panel title 13/22 weight
  550; empty-state heading 15/25 weight 550; caption 9/14 weight 500; top-level tree row
  11/32 weight 600. Anything outside that list is "off scale".
- **Accent**: the one brand blue, #0d99ff in light and #0c8ce9 in dark. "One accent meaning"
  asks that the blue always signals the same kind of thing.
- **Primary button**: the one filled accent button on a screen (Share in Figma). Every other
  button is **secondary** (transparent with a 1 px translucent outline) or **ghost**
  (transparent, no outline).
- **Tint**: the pale blue fill #e5f4ff that marks a selected row, an open trigger or a switch
  that is on; **child tint** is the paler #f2f9ff on rows inside a selected parent.
- **Chit**: a 14 x 14 colour swatch with radius 2 inside a paint row. **Chip** in the tree
  means the 14 x 14 Fill preview at the right of an object row (a colour, a ring, a size
  glyph or a four-colour strip).
- **Panel grid**: the right panel's column layout, `16 | 88 | 8 | 88 | 8 | 24 | 8` = 240.
  Column A and B are 88 wide; a wide control spans A + gap + B = 184, or 156 when two 24 px
  icons follow it.
- **Section header**: the 40 px band that titles a group of rows ("Summary", "Fill"), with a
  title in strong body type and 24 px action icons at the right.
- **Inspector**: the right panel's contents for whatever is selected (a dataset, an object,
  a node). **Tree**: the Objects list in the left panel.
- **Secondary bar**: the second, smaller floating bar that appears above the toolbar while a
  tool is mid-flow (screen 5). **Popover**: the light settings panel a tool or control opens
  (screen 7). **Legend**: the card at the bottom right of the canvas that keys colours and
  sizes.
- **Kit**: `kit.css`, the shared stylesheet the mocks were meant to be built from, with every
  class prefixed `k-`. **Local style**: a `<style>` block inside one screen's HTML that adds
  or overrides rules for that screen only.

## Summary

The mocks pass the parts that the kit enforces: 240 px panels, 32 px rows, 24 px controls,
40 px section headers, 11 px body text, weights 450 / 550, radii 2 / 5 / 13, every colour a
token value, one filled accent button per screen, dark menus and tooltips. They fail wherever
a screen had to draw something the kit does not define: the file menu in the left header, the
zoom-and-Share bar in the right header, the inspector title block, the tree row's count and
chip, the legend, the status-bar layout chip, the mode switch, the secondary bar, the Export
row and the whole Dataset inspector. Each of those was drawn by hand in each screen's local
style block, and each screen drew it differently.

The root cause is structural. Every screen carries 38 to 98 lines of local style and its own
private class vocabulary (`m-*` in screens 2 and 7, `s-*` in 3 and 4, bare `chip-*` and
`legend*` in 5, 6 and 8, `rp-*` in 8), and 6 of the 8 override kit rules for the tree row,
the tree meta, the chip or the mode switch. Until those parts move into `kit.css` the screens
cannot agree, and the next screen will disagree again.

Three findings are blockers, because they defeat the purpose the mocks exist for: screen 8 is
supposed to be screen 3 in dark and is not the same screen; seven of the eight screens did not
load the Inter font, so the type they show is not the type being proposed; and the same
inspector (Dataset) is laid out three different ways on screens 2, 5 and 7.

## 1. The structural finding: no shared drawing of the shared parts

| Screen | Local style lines | Kit rules it overrides | Private classes it invents |
|---|---|---|---|
| 1 | 38 | dropzone, heading, list pill, mode option, tool, welcome sheet | `k-scrim`, `k-sample-list`, `k-sample-size`, `k-tip-right` |
| 2 | 51 | app, mode option, tree actions, tree icon, tree name, tree row | `m-panel-head`, `m-kv`, `m-prose`, `m-suggest`, `m-chip`, `m-count`, `m-fill`, `m-row` |
| 3 | 51 | mode option, right panel, section, toolbar, tree actions, tree chip, tree meta, tree name, tree row | `s-topbar`, `s-file`, `s-type`, `s-cell`, `s-member`, `s-legend*`, `s-export`, `k-tree-spacer` |
| 4 | 85 | chip, mode option, section title | `s-app`, `s-file-header`, `s-right-header`, `s-zoom`, `s-inspector-head`, `s-chip*`, `s-legend*`, `s-status-chip`, `s-door`, `s-list`, `s-val` |
| 5 | 81 | app, ghost button, canvas, chip, heading, icons, label, paint row, panel type, select, status bar, swatch, tree, tree actions, tree meta, tree row, and 8 more | `k-panel-file`, `k-panel-top`, `k-zoom`, `k-secbar`, `k-legend-card`, `k-legend-row`, `k-legend-title`, `k-paint-mini`, `k-row-disclose`, `chip*` |
| 6 | 60 | heading, icons, mode option, paint row, right panel, panel type, row, secondary, toolbar, tree actions, tree chip, tree meta | `k-topbar`, `hist`, `legend*`, `rank-row`, `size-chit`, `sticky-*` |
| 7 | 98 | app, tree actions, tree row | `m-file`, `m-topbar`, `m-type`, `m-kv`, `m-prop`, `m-chip`, `m-dock*`, `m-grid`, `m-popover`, `m-menu`, `m-token*`, `m-status-chip` |
| 8 | 48 | app, chip, icons, mode option, panel type, secondary, toolbar, tree actions, tree chip, tree meta, tree name, tree row | `rp-header`, `rp-body`, `k-kv`, `k-type-kind`, `legend*` |

Consequence: the legend alone exists as four separate implementations (`s-legend` in 3 and 4,
`k-legend-card` in 5, `legend` in 6 and 8), the inspector title block as five
(`m-panel-head`, `s-type`, `s-inspector-head`, `k-panel-type` with and without `is-two-line`,
`m-type`), and the tree row's count and chip as four. Section 3 below lists what that cost.

Only one of these parts exists in the kit today: `k-panel-type` (the 49 px "selection type
row" for the right panel top), and even it is overridden in screens 5, 6 and 8. The kit has
no left-panel file header, no right-panel zoom-and-Share bar, no tree chip, no tree count
convention, no legend card, no secondary bar (only a `k-toolbar-secondary` height rule), no
status-bar chip, no data-table dock, no histogram, no token field and no "kind above name"
title block. Screens 2, 4 and 5 even say so in comments ("KIT GAP", "GAP", "the few things
the kit does not have yet").

**Severity: blocker.** Nothing else in this document stays fixed until these parts are added
to `kit.css` once and the local blocks deleted.

## 2. What is consistent (pass)

Measured on all eight screens unless noted.

| Property | Baseline | Measured | Verdict |
|---|---|---|---|
| Left panel width | 240 | 240 (241 on screen 4) | pass, one drift |
| Right panel width | 241 (240 + 1 px edge) | 241 | pass |
| Status bar | 24 tall, 11 px secondary text, 1 px top border | 24, 11 px, #00000080, #e6e6e6 top | pass |
| Section header | 40 tall, title 11 / 32 weight 550, letter-spacing normal, padding 0 8 0 16 | 40, 11 px 550, normal, 16 / 8 (0 left when collapsible) | pass |
| Section bottom | 12 px padding + 1 px divider | 12 + #e6e6e6 on every section except two on screen 3 (see 3.9) | pass |
| Tree row | 32 tall; caret 16 x 32; icon 16 x 32; name 11 / 32 | 32; 16 x 32; 16 x 32; 11 / 32 | pass |
| Views row ("Overview") | 32 row holding a 224 x 24 pill, current = #f5f5f5 fill + weight 550 | 32 / 223 x 24 / #f5f5f5 / 550 (dark #383838) | pass |
| Select trigger | 24 tall, white, 1 px #e6e6e6, radius 5, padding-left 8, 11 px 450 | all 34 selects match (one at padding 5, screen 6 palette) | pass |
| Icon buttons | 24 x 24 | 24 x 24 everywhere (one 60 x 24 zoom on screen 5, three 29 x 24 on screen 7) | pass |
| Switch | 32 x 16 track, radius full, off #f5f5f5, on #0d99ff | 32 x 16, full, #f5f5f5 / #0d99ff | pass |
| Segmented control | 88 x 24 track #f5f5f5, checked face white with 1 px #e6e6e6 inset | 88 x 24, 44 x 24 faces, matches | pass |
| Pill tabs (screen 7 dock) | 24 tall, radius 5, selected #f5f5f5 weight 550 | matches | pass |
| Link text | #007be5 (dark #7cc4f8) | matches on screens 3, 4, 6, 8 | pass |
| Tool buttons | 32 x 32, selected fill #0d99ff, chevron 16 x 32 | matches | pass |
| Toolbar surface | 48 tall, radius 13, elevation 200, 1 x 48 dividers | matches | pass |
| Toolbar centred on the window | yes | centre 719.5 to 720.1 of 720 | pass |
| Tooltip (screen 1) | #1e1e1e, radius 5, 11 px white, max-width 180 | matches | pass |
| Popover (screen 7) | 240 wide, radius 13, elevation 400, 40 px header with inset divider | matches | pass |
| Dark menu (screen 7) | #1e1e1e, 24 px rows, white 11 px, separators #ffffff1a | matches | pass |
| Text colours | #000000e5 / #00000080 / #0000004d, white and #ffffffb2 in dark | only those five appear in the chrome | pass |
| Surface colours | white, #f5f5f5, #e6e6e6, #1e1e1e menus; dark #2c2c2c / #383838 / #444 | only token values appear | pass |
| One filled accent button | one per screen | screen 1: "Choose a file" (Share disabled #d9d9d9); screens 2 to 8: Share only | pass |
| Dark theme tokens (screen 8) | per `screens.md` | surfaces, text, edges, brand #0c8ce9, menu unchanged | pass |

Two things worth stating as passes because they were checked specifically: the Share text
renders white on blue on every screen (a pixel probe found 85 white pixels on screen 2's
button and 46 on screen 4's, so the kit's `.k-app button { color: inherit }` rule does not win
in the render), and no screen has more than one filled brand button.

## 3. Inconsistencies

Each entry gives the baseline, the measurement per screen, the file and element, and a
severity. "Element" names the class or text that identifies the thing in the HTML.

### 3.1 Screen 8 is not screen 3 in dark (blocker)

`screens.md` says of screen 8: "Every measurement, every row, every word. The screen must be
readable as the same screen... find nothing moved." Measured against screen 3:

| Part | Screen 3 (`screen-3.html`) | Screen 8 (`screen-8.html`) |
|---|---|---|
| Right header order | zoom at x 1208, Share at 1384 | Share at 1310, zoom at 1366 (swapped); padding-left 16 not 8 |
| Panel header height | 48 | 49 |
| Views to Objects spacing | Objects header at y 120 | at y 134; a `k-divider` line between Views and Objects that screen 3 does not have |
| Tree root row | "Karate Club" with no count (weight 550) | "Karate Club  34 nodes 78..." truncated with an ellipsis (weight 600) |
| Tree names | full: "Connections (Degree)", "Communities (Louvain)" | truncated: "Connections ...", "Communities ..." because the lock and eye buttons are laid out on every row (`.k-tree-actions { position: absolute }` in screen 8, always 48 px wide) |
| Tree meta | inline after the name: "Degree > 8  5 nodes" | right-aligned before the chip |
| Members section | 277 tall: two columns, 4 rows of 16 px cells (`s-cell`, `s-member`) | 405 tall: 8 single rows of 32 px, each with a node icon |
| Export section | 117 tall: two labelled rows "Members [CSV] Export", "Framed image [PNG] Export", Export as a ghost button | 153 tall: 9 px captions ("Members", "Image framed on members") above the controls (`k-row-2`), Export as a secondary button 88 wide |
| Definition "Of" row | a clickable row at x 1272 with a chevron | a ghost button 168 wide at x 1248 |
| Legend swatches | 14 x 14 squares, radius 2 | 10 x 10 circles (`k-swatch-round`) |
| Legend padding | 4 top, 8 bottom | 8 / 8 |

Ten differences on a screen whose only job is to have none. Fix: build screen 8 from
screen 3's HTML with `data-theme="dark"` and nothing else changed.

### 3.2 Seven screens render a fallback typeface (blocker)

Only `screen-6.html` declares the `@font-face` for `inter-roman-latin.woff2` that sits in the
mocks folder. `audit-fonts.mjs` reports what the capture browser actually drew:

| Screen | Font loaded | Typeface that rendered |
|---|---|---|
| 1, 2, 3, 8 | none | DejaVu Sans |
| 4, 5, 7 | none | Liberation Sans |
| 6 | Inter 100..900 | Inter Variable |

So the PNGs show three typefaces, and on seven screens the 450 / 550 weights the visual
language depends on collapse to 400 / bold. Compare "Karate Club" in `screen-2.png` and
`screen-6.png`: the same 13 px 550 heading is visibly a different face and a different weight.
(`kit.html` has no `@font-face` either, so `kit-light.png` and `kit-dark.png` are also in
DejaVu.) Fix: put the `@font-face` in `kit.css` and re-shoot all eight PNGs and the kit sheets.

### 3.3 The Dataset inspector is laid out three ways (blocker)

Screens 2, 5 and 7 all show the same inspector (nothing selected, dataset loaded). The x
position and width of each control in the 240 px panel (panel starts at x 1200; column A is
1216..1304, column B 1312..1400):

| Row | Screen 2 | Screen 5 | Screen 7 | Baseline |
|---|---|---|---|---|
| Direction select | x 1276 w 100 | x 1272 w 92 | x 1288 w 96 | column B: x 1312 w 88 |
| "from file" note | "from file" | "(from file)" | "(file)" | one wording |
| Layout select | x 1296 w 104, label "Layout" | x 1216 w 184, no label | x 1288 w 144 | one placement |
| Dimensions segmented | x 1296 | x 1312 | x 1288 | x 1312 |
| Show select | x 1276 w 100 | x 1272 w 92 | x 1264 w 96 | x 1312 w 88 |
| Background paint row | x 1296 w 88 | x 1288 w 116 | x 1288 w 88 | 156 wide from x 1216 (Figma paint row) or B |
| Labels select | x 1296 w 88 | x 1272 w 152 | x 1288 w 144 | one width |
| Legend / Minimap / Notes switches | x 1296 | x 1288 | x 1288 | x 1312 |
| Default look: Node row | x 1264 w 120 "B3B3B3 1.0" | x 1264 w 116 "B3B3B3 1.0" | x 1288 w 88 "1.0" only, no hex | one row |
| Default look: Size row | absent | present ("Size 1.0") | absent | same rows on all three |
| Export: Image row | PNG x 1256 w 62, 2x x 1322 w 52, Export x 1378 | 1260 w 58, 1322 w 48, 1374 | 1258 w 60, 1324 w 48, 1378 | one row |
| Label column width | 48 / 64 / 80 | 36 / 48 / 64 | 64 (`m-prop`) | 88 (panel grid) or 72 (kit `k-row-labeled`) |
| Summary two-column cells | 24 tall (`m-kv`) | 24 tall (`k-paint`, `k-row-flex`) | 24 tall (`m-kv`) | 32 rows |

Nothing lines up between the three: the same select sits at three x positions and three
widths, the label column changes width row by row inside one panel (screen 5 uses 36, 48 and
64 in the same inspector), and screen 7 dropped the hex from the Default look row while screen
5 added a Size row the others lack. Fix: one `Dataset inspector` partial on the 88 / 88 / 24
grid, included by all three screens.

### 3.4 Right panel header: zoom and Share drawn four ways (major)

| Screen | Element | Zoom | Share | Header |
|---|---|---|---|---|
| 1 | `k-panel-file` | disabled outlined select, x 1312 w 64 | disabled #d9d9d9 at 1384 | 48 |
| 2, 3, 6 | `m-panel-head`, `s-topbar`, `k-topbar` | ghost button left-aligned at x 1208 | 1384 (1382 on 6) | 48 / 48 / 49 |
| 4, 7 | `s-right-header`, `m-topbar` | ghost button right-aligned at x 1318 / 1314, beside Share | 1386 | 48 |
| 5 | `k-panel-top` | `k-icon-btn` 60 wide at 1208 | 1386 | 49 |
| 8 | `rp-header` | ghost button at 1366, to the RIGHT of Share | Share at 1310 | 49, padding 16 |

`screens.md` specifies "the zoom menu ('100%' with a chevron, a 24 px pill) and Share". The
zoom control is a bordered pill on one screen and a borderless ghost button on seven; it is at
the left edge on four screens, next to Share on three, and after Share on one.

### 3.5 Left panel header: the file menu drawn three ways (major)

The header is "a 16 px menu glyph, the dataset name at 13/22 weight 550 with a chevron".

| Screen | Element | Name x | Chevron | Chevron colour | Bottom border |
|---|---|---|---|---|---|
| 1, 6 | `k-panel-file`, `k-panel-type` | 40 | 24 px glyph at x 207 (right edge) | #0000004d (screen 6: #000000e5) | yes |
| 3, 4, 7 | `s-file`, `s-file-header`, `m-file` | 40 | 16 px glyph at x 215 | #0000004d (screen 7: #00000080) | yes, yes, screen 4 none |
| 2, 5, 8 | `m-panel-head`, `k-panel-file`, `k-panel-type` | 40 (screen 5: 32) | 24 px glyph immediately after the name (x 128 / 114 / 134) | #0000004d | yes |
| all | | | header height 48 on 1, 2, 3, 4, 7; 49 on 5, 6, 8 | | |

Three chevron placements, two glyph sizes, three chevron colours, one missing divider
(screen 4), one 8 px shift of the name (screen 5), and a 1 px header height difference that
moves every row below it on screens 5, 6 and 8 (Views header at y 49 instead of 48, Objects at
121 / 125 / 134 instead of 120).

### 3.6 Tree rows: five formats for the count, two for its placement, and a moving chip (major)

The tree row spec is "caret, kind icon, name, count in secondary text, state glyph if any, a
14 x 14 Fill chip". Measured:

| Screen | Root row count | Object row count | Count placement | Chip x | Chip radius |
|---|---|---|---|---|---|
| 2 | "34 / 78" | (suggestions, none) | right, before the chip | 217 | 2 |
| 3 | none | "5 nodes", "34 values", "4 groups", "12" | inline after the name | 217 (169 on the selected row) | 0 |
| 4 | "115 / 613" | "10", "115", "12", "10" | right | 216 | 2 |
| 5 | "34 nodes 78 edges" | "5 nodes", "34 values", "4 groups", "12" | right | 221 | 2 (size chip 0) |
| 6 | "34 nodes" | "34", "4" | right | 217 | 2 |
| 7 | "115" | "10", "115", "12", "10" | right | 217 | 2 |
| 8 | "34 nodes 78..." (truncated) | "5 nodes", "34 values", "4 groups", "12" | right | 217 (169 selected) | 2 |

Other tree drifts:

- Indent: 24 px per level everywhere except screen 5, where it is 16 (`k-tree-row` icon at
  x 32 and 48 instead of 40 and 64; `screen-5.html` overrides `--k-tree-indent`).
- Root row weight: 600 (Figma's top-level layer weight) on 2, 4, 5, 6, 7, 8; 550 on screen 3
  (`.k-tree-row.is-top .k-tree-name { font-weight: 550 }` in `screen-3.html` line 28).
- Selected row: on screens 3 and 8 the chip jumps from x 217 to x 169 to make room for the
  lock and eye (48 px). In Figma the row content does not move when the actions appear; the
  name truncates instead. On screen 8 the actions are laid out on every row, so every name
  truncates (3.1).
- Carets: shown on all rows in 3, 4, 6, 7, 8 (`show-carets`); hidden on leaf rows in 2 and 5.
  Figma draws carets only while the pointer is over the panel or the row is expanded; either
  convention is fine but the mocks use both.
- Chip vocabulary: `k-tree-chip` (3, 6, 8), `s-chip` (4), `chip` (5), `m-chip` (2, 7); the
  "covered" 50 percent chip is `s-chip-dim` on 4, `chip-strip` at opacity .5 on 6, `is-covered`
  on 7.

### 3.7 The legend card: four implementations (major)

| Screen | Class | Row height | Swatch | Shows counts | Padding | Shadow token | Extra |
|---|---|---|---|---|---|---|---|
| 3 | `s-legend` | 24 | 14 x 14 square | yes ("12") | 4 / 8 | 200 | |
| 4 | `s-legend` | 20 | 12 x 12 square | no | 4 / 8 | 300 | "4 more, scroll" row |
| 5 | `k-legend-card` | 20 | 10 x 10 square | no | 4 / 4 | 200 | |
| 6 | `legend` | (ramp) | 120 x 12 ramp | | 8 / 10, title padding 0 | 200 | title at 11 / 24 |
| 8 | `legend` | 24 | 10 x 10 circle | yes | 8 / 8 | dark 200 | |

Screens 3 and 5 show the same legend (Communities + Connections) with different row heights,
swatch sizes and with or without counts. Screen 3 and 8 differ in swatch shape. The size glyph
row is 28 x 16 on 3, 28 x 14 on 5, 40 x 16 on 8.

### 3.8 Status bar layout chip: two drawings (major)

Screens 2, 3, 5, 6, 7, 8 draw "Spread out: settled" as a `k-chip` (16 px tall, radius 5, 1 px
#e6e6e6 outline, pause glyph before the text). Screen 4 draws it as `s-status-chip`: plain
text, no outline, radius 0, and the pause glyph AFTER the text ("Spread out: settled ||"). The
same status, on the same bar, in the same state.

### 3.9 Mode switch: three variants (major)

The 2D / 3D / VR / AR switch at the right of the toolbar:

| Screens | Faces | Option size | Type |
|---|---|---|---|
| 1, 2, 3, 4, 6, 8 | four text labels | 28 to 31.5 x 28 (text with padding on 1, 2, 4, 6, 8; fixed 28 on 3) | 11 px 450 |
| 5 | square and cube icons, then "VR", "AR" text | 28 x 28 | text at 10 px 500 (off scale) |
| 7 | four icons | 28 x 28 | |

This also changes the toolbar width: 566.75 (1, 2, 8), 553 (3, 5, 7), 565.5 (6), 581.25 (4).

### 3.10 Toolbar: screen 4 gives Select a chevron (major)

Screens 1, 2, 3, 5, 6, 7, 8 have four flyout chevrons (Filter, Path, Groups, Rank), matching
`screens.md`. Screen 4 has five: `screen-4.html` line 193 wraps the Select tool in a
`k-tool-group` with a `k-tool-chevron`. Nothing in the spec gives Select a flyout.

Also, the toolbar sits 16 px above the status bar on every screen (`screens.md` says 16) where
Figma and the kit (`.k-toolbar-float { bottom: 12px }`) say 12. Consistent between screens,
but off the baseline (minor).

### 3.11 Secondary bar height (major)

Screen 5's `k-secbar` is 32 px tall, radius 13, #1e1e1e. Figma's contextual secondary bar
(components.md section 42) is 40 tall with 24 px controls and 8 px padding, on the SAME light
surface as the toolbar (radius 13, elevation 200), and `kit.css` already has
`.k-toolbar-secondary { height: 40px; padding: 8px }`. The mock invented a dark 32 px variant
and its own select styling (`.k-secbar .k-select` transparent with a white 20 percent inset
line). `screens.md` itself specifies the dark 32 px bar, so the spec and the kit disagree here
and the mock followed the spec. Decide once; the Figma baseline says light and 40.

### 3.12 Inspector title block: name alignment and height (major)

The block at the top of the inspector (kind line + name + actions):

| Screen | Element | Kind line x | Name x | Height | Kind line type |
|---|---|---|---|---|---|
| 2 | `m-panel-head` | (file line) 1216 | 1224 | 48 | 11 / 16 |
| 3 | `s-type` | 1216 | 1224 | 48 | 11 / 14 |
| 4 | `s-inspector-head` | 1216 | 1216 | 48 | 11 / 14 |
| 6 | `k-panel-type` | 1216 | 1216 | 49 | 11 / 16 |
| 7 | `m-type` | (file line) 1216 | 1216 | 48 | 11 / 16 |
| 8 | `k-panel-type is-two-line` | 1216 | 1224 | 49 | 11 / 14 |

On screens 2, 3 and 8 the name is indented 8 px from the line above it (the kit's
`.k-panel-type .k-heading { padding-left: 8px }` leaks into a two-line layout it was not made
for); on 4, 6 and 7 they align. The 3x crops `s2-right-head.png` and `s4-right-head.png` in the
audit scratch folder show the two side by side.

### 3.13 Rows off the 32 px grid (major)

Figma's property rows are 32 tall (50 for a two-column captioned row, 48 for a fieldset).
Rows measured at other heights in the right panel:

| Screen | Rows | Height | Element |
|---|---|---|---|
| 2, 7 | Nodes / Edges, Density / Mean links, Parts / Weighted | 24 | `m-kv` cells |
| 3, 8 | Nodes / Edges, Inside edges / Cut edges | 16 | `s-cell`, `k-kv` |
| 6 | Damping / Iterations, Tolerance / Weights, Domain, Range | 41 | `k-field` inside `k-row-2` (the row is 50; the field is 41: 14 caption + 3 gap + 24) |
| 2, 5, 7 | "Default look" | 24 | `m-row`, `k-row-flex` with `height: 24px` inline |

The two-column value pairs ("Nodes 34 | Edges 78") are 24 tall on two screens and 16 tall on
two others for the same content. Figma has no 16 px row anywhere.

### 3.14 The Export row: three button treatments (major)

| Screen | Export button | Layout |
|---|---|---|
| 2, 5, 7 | secondary (outlined) 44 to 52 wide | select(s) + button on one 32 px row |
| 3 | ghost (no outline), 40 wide, padding-left 2 | labelled row: label 80 + select 88 + button |
| 6 | secondary, 216 wide (full row) | its own row under "Ranked list [CSV]" |
| 8 | secondary, 88 wide | two-column row with 9 px captions |

Ghost and secondary are different buttons in the baseline (section 8 and 9 of
`components.md`); the same action should not be one on screen 3 and the other on 2.

### 3.15 Section header details (minor)

- "Notes" header: padding-left 16 on screens 2, 3, 4, 5, 7, 8; 0 with a collapse caret on 6.
- "Made by" header: title in primary text on 2, 3, 5, 7, 8; secondary (`is-empty`) on 6.
  It is collapsed and empty on all of them.
- Screen 3's "Made by" and "Notes" sections have `padding-bottom: 0` and Notes has no
  divider; every other screen (including 8) has 12 px and a divider.
- Section header actions are text ghost buttons on screens 3 ("Select", "Focus") and 4
  ("Select"); Figma's section headers carry 24 px icon actions only. Not wrong, but it is a
  kit extension that should be defined once.

### 3.16 Type roles off the scale (minor)

Font census of the chrome (canvas labels excluded):

| Role found | Screens | Baseline role |
|---|---|---|
| 10 px / 28 weight 500 ("VR", "AR") | 5 | none; the mode switch is 11 / 16 450 elsewhere |
| 10 px / 32 `ui-monospace` (table numbers) | 7 | none; Figma's only mono is 11 / 18 Roboto Mono in Dev Mode |
| 11 px / 14 (kind line "Group", "Node id 1") | 3, 4, 8 | 11 / 16 body (screen 6 uses 11 / 16 for "Measure") |
| 11 px / 24 weight 550 (legend title "Influence") | 6 | 11 / 16 strong body (the other legends) |
| 11 px / 32 weight 550 root tree row | 3 | 11 / 32 weight 600 (Figma top-level layer; screens 2, 4 to 8) |

Everything else is on the scale: 11 / 16 450, 11 / 16 550, 13 / 22 550, 15 / 25 550, 9 / 14
500 and 11 / 32 for tree rows.

### 3.17 Colour and the one accent (minor, with one design note)

Every chrome colour is a token value; no stray hex was found. The accent is used for:

1. the active tool and Share (fill) on every screen, and a switch that is on (5, 6);
2. the selected mode face ("2D") and "See all ... in table" links (text, #007be5);
3. on the canvas, a solid ring on the picked node (screen 5) and a dashed ring on preview
   matches (screen 7), and the hovered histogram bar (screen 6, described in `screens.md`);
4. in `screens.md` only: the Path object's Fill "(#0d99ff on nodes and edges, edge width 3)".

Meanings 1 to 3 are all "this is the live or chosen UI state" and match Figma. Meaning 4 is
different in kind: it would paint DATA with the UI accent, so a path on the canvas would look
like a selection or a pick. That is a design decision for `object-model.md`, not a mock
defect, but it is the one place the accent stops meaning one thing.

Dark theme: the tree's ring chip on screen 8 is drawn in #444 (the divider token) where
`screens.md` says the outline turns #ffffff; the canvas outline did turn white. Minor.

### 3.18 Frame drifts (minor)

- Screen 4: left panel 241 wide (others 240), canvas 958 (others 959), right panel edge
  #e6e6e6 instead of the translucent #0000001a, left header without its bottom border.
- Screens 5, 6, 8: panel headers 49 instead of 48 (see 3.5).
- Screen 7: Objects header at y 125 (others 120 / 121) because of an extra 4 px gap after
  the Views row.

### 3.19 Values that drift from `screens.md` (minor)

Not consistency between screens, but between a screen and its own spec:

| Screen | Spec | Mock |
|---|---|---|
| 4 | "Bridges 0.031 rank 12 of 115" | "rank 3 of 115" |
| 4 | "Size 2.1 from Bridges" | "Size 2.3 from Bridges" |
| 4 | Look rows are "clickable" | drawn with a chevron; fine, but "Colour this node..." is a 208 px secondary button, not "a secondary text button" |
| 5 | Arrangement "Layout [Spread out v] [gear]" | no "Layout" label (select spans 184) |
| 6 | tree root "Karate Club  34 nodes 78 edges" | "34 nodes" |
| 7 | "Matches 10 nodes", "Filter: 10 match", ten value-7 nodes | "Matches 8 nodes", "Filter: 8 match", eight rings |
| 7 | Attributes row "..." visible "because the pointer is not on it but the mock shows it" | the verb menu is open with no pointer on the row (see 4) |
| 3 | Export "Image framed on members [PNG]" | label "Framed image" with the full text in a `title` tooltip |
| 3 | header "state badge slot empty" | no slot |

## 4. Restraint: words on screen and things nobody asked for

Word counts are of every visible text node in the chrome (both panels, toolbar, status bar,
overlays, legend, dock, welcome sheet), excluding the canvas node labels and the mock's own
caption strip. "App-authored" text is prose the app composes itself, as opposed to names and
values that come from the data or from an object the reader made.

| Screen | Words | Left | Right | Status | Overlays | Legend | Dock | App-authored prose on screen |
|---|---|---|---|---|---|---|---|---|
| 1 | 61 | 11 | 4 | 1 | 12 (tooltip) | | | "Open a graph", "Drop a file here", "Choose a file", "Nothing loaded", three verb rows, a 12-word sample blurb |
| 2 | 109 | 18 | 79 | 8 | | | | "34 nodes joined by 78 edges in one connected part", "from file", three suggestion rows, "Default look" |
| 3 | 122 | 28 | 63 | 10 | | 17 | | "11 nodes, 32% of the scope", "Inherited from Communities", "See all 11 in table" |
| 4 | 116 | 23 | 63 | 10 | | 16 | | "rank 3 of 115", "4 more, scroll", "played" x3, "See all 12 in table", "Colour this node...", "from Conference" etc. |
| 5 | 154 | 36 | 83 | 13 | 7 | 13 | | "Pick the end node" AND "Path: pick the end node" |
| 6 | 116 | 15 | 83 | 8 | | 6 | | "See all in table", "Reverse", "Reset" |
| 7 | 228 | 21 | 85 | 11 | 32 | | 79 | "Matches 8 nodes" AND "Filter: 8 match", "add a value", "Showing Everything" AND "Show Everything 115 of 115" |
| 8 | 132 | 36 | 65 | 10 | | 17 | | as screen 3 |

Things on a screen the reader did not ask for, or that say the same thing twice:

1. **Screen 1**: three ways to open a file are on screen at once: the welcome sheet's drop
   zone and "Choose a file", the three verb rows in the Objects list ("Open a file...",
   "Paste data...", "From a URL..."), and the file menu behind the header chevron. The right
   panel adds "Nothing loaded", a row that only says the panel is empty. The verb rows and the
   "Nothing loaded" row are the panels talking, which `screens.md` says they should not.
   (`screen-1.html`, `.k-list-row` x3 and the right panel row.)
2. **Screen 2**: the node and edge count appears three times: tree root "34 / 78", inspector
   "Nodes 34 Edges 78" plus the sentence "34 nodes joined by 78 edges in one connected part"
   (which also repeats "Parts 1"), and the status bar "34 nodes 78 edges". The sentence adds
   nothing the rows below it do not say. The three suggestion rows are by design, but note they
   are the only rows in the tree drawn in secondary text with tool icons, which makes them look
   like disabled objects rather than actions. (`m-prose`, `m-suggest`.)
3. **Screen 3 and 8**: the legend repeats the tree (Group 1..4 with the same counts) 800 px
   away. The legend is on by the spec, but it is 17 words that duplicate 17 words.
4. **Screen 4**: "4 more, scroll" is an instruction inside a legend; Figma never writes
   instructions into chrome. "played" on every neighbour row is the same word three times for
   a relationship that is the only kind in the file. (`s-legend-more`, `s-list`.)
5. **Screen 5**: the secondary bar says "Pick the end node" and the status bar says "Path:
   pick the end node" at the same time. One is enough; the status bar was specified to carry
   it, the secondary bar was not specified to carry a sentence at all in Figma's pattern.
6. **Screen 7**: three duplicates. "Matches 8 nodes" in the popover and "Filter: 8 match" in
   the status bar; "Showing [Everything]" in the dock header and "Show [Everything] 115 of 115"
   in the inspector; the verb menu ("Colour by, Size by, ...") is open beside the Attributes
   row with nothing pointing at it, which `screens.md` admits is there "to document the verbs".
   A still that shows a menu nobody opened is a mock artifact, not a screen state, and it puts
   32 overlay words on the busiest screen.
7. **Screen 6**: "Reset" is a text button next to Domain even though the domain is at its
   default; a reset control for an unchanged value is chrome nobody needs yet.

What is NOT a restraint problem: the inspectors' empty section headers ("Made by", "Notes")
match Figma's rule that an empty section is just its header; the Export section on the Dataset
inspector is by spec; the status bar's counts are by spec.

## 5. Findings list

Severity: blocker = the mock cannot do the job it exists for; major = the same thing is drawn
differently across screens or breaks the panel grid; minor = a single drift or an off-baseline
value that is consistent across screens.

| # | Severity | What | Where |
|---|---|---|---|
| 1 | blocker | No shared drawing of the shared parts: every screen carries 38 to 98 lines of local style and private classes; the file header, zoom/Share bar, title block, tree chip and count, legend, status chip, mode switch, secondary bar and Export row exist only as per-screen copies | all eight `screen-N.html` `<style>` blocks; `kit.css` lacks those parts |
| 2 | blocker | Screen 8 is not screen 3 in dark: header order, header height, a Views/Objects divider, root count, truncated names, count placement, Members layout, Export layout, "Of" row, legend swatch shape and padding all differ | `screen-8.html` vs `screen-3.html` (3.1) |
| 3 | blocker | Seven screens render DejaVu Sans or Liberation Sans, not Inter; only screen 6 declares the `@font-face`; the 450/550 weights are not what the PNGs show | `screen-1,2,3,4,5,7,8.html`, `kit.html`, `kit.css` (3.2) |
| 4 | blocker | The Dataset inspector is laid out three ways: every select at a different x and width, label column 36 to 80, Default look rows differ, Layout label missing on 5, hex missing on 7 | `screen-2.html` `m-kv`/`m-row`, `screen-5.html`, `screen-7.html` `m-prop` (3.3) |
| 5 | major | Right header drawn four ways: zoom as outlined select (1) vs ghost button (others); at the left edge (2, 3, 5, 6), beside Share (4, 7), after Share (8) | `k-panel-file`, `m-panel-head`, `s-topbar`, `s-right-header`, `k-panel-top`, `k-topbar`, `m-topbar`, `rp-header` (3.4) |
| 6 | major | Left header file-menu chevron in three places (right edge 24 px, right edge 16 px, after the name), three colours; name at x 32 on screen 5; no divider on screen 4; header 48 vs 49 | `k-panel-file`, `s-file`, `s-file-header`, `m-file`, `m-panel-head`, `k-panel-type` (3.5) |
| 7 | major | Tree counts in five formats ("34 / 78", "34 nodes 78 edges", "34 nodes", "115", none) and two placements (inline vs right-aligned) | `k-tree-meta` in every screen (3.6) |
| 8 | major | Tree indent 16 px per level on screen 5 (24 everywhere else) | `screen-5.html` `--k-tree-indent` override (3.6) |
| 9 | major | Chip moves 48 px left on the selected row (3, 8) and lock/eye reserve space on every row (8) so names truncate | `screen-3.html` line 33 to 35, `screen-8.html` line 29 to 31 (3.6) |
| 10 | major | Legend implemented four times with row heights 20 / 24, swatches 10 / 12 / 14 square or 10 round, with or without counts, two shadow tokens | `s-legend` (3, 4), `k-legend-card` (5), `legend` (6, 8) (3.7) |
| 11 | major | Status-bar layout chip is a bordered chip on six screens and plain text with the glyph after the text on screen 4 | `screen-4.html` `s-status-chip` (3.8) |
| 12 | major | Mode switch has three variants (text; icons + 10 px text; icons), changing the toolbar width by up to 28 px | `k-mode` in `screen-5.html`, `screen-7.html` vs the rest (3.9) |
| 13 | major | Screen 4 gives the Select tool a flyout chevron (five chevrons; spec and other screens have four) | `screen-4.html` line 193 (3.10) |
| 14 | major | Secondary bar is a dark 32 px bar; Figma's is light, 40 tall, on the toolbar surface, and `kit.css` already defines `k-toolbar-secondary` at 40 | `screen-5.html` `k-secbar`; `screens.md` screen 5 (3.11) |
| 15 | major | Inspector name indented 8 px from its kind/file line on screens 2, 3, 8 but aligned on 4, 6, 7; kind line 11/14 vs 11/16 | `k-panel-type .k-heading` padding leak (3.12) |
| 16 | major | Two-column value pairs are 24 px rows on 2, 7 and 16 px rows on 3, 8; "Default look" is a 24 px row; Figma has no rows under 32 | `m-kv`, `s-cell`, `k-kv`, `m-row` (3.13) |
| 17 | major | Export button is ghost on screen 3, secondary elsewhere; four row layouts for the same row | `s-export` (3), `k-row-2` (8), `k-span-3` (6) (3.14) |
| 18 | major | Duplicated text: secondary bar + status bar on 5; popover count + status bar, dock "Showing" + inspector "Show", on 7; count three times on 2; legend repeats the tree on 3 and 8 | `screen-5.html`, `screen-7.html`, `screen-2.html` `m-prose` (4) |
| 19 | major | An open verb menu with no pointer on screen 7, put there "to document the verbs" | `screen-7.html` `m-menu` (4) |
| 20 | minor | Screen 1 shows three ways to open a file at once plus a "Nothing loaded" row | `screen-1.html` (4) |
| 21 | minor | "4 more, scroll" instruction in the legend; "played" on every neighbour row | `screen-4.html` `s-legend-more`, `s-list` (4) |
| 22 | minor | Root tree row weight 550 on screen 3, 600 on all others | `screen-3.html` line 28 (3.6) |
| 23 | minor | Tree chip radius 0 on screen 3 and the size chip on 5; 2 elsewhere; chip x 216 / 217 / 221 | `k-tree-chip`, `chip-size` (3.6) |
| 24 | minor | Off-scale type: 10 px 500 (VR/AR on 5), 10 px monospace (dock numbers on 7), 11/24 legend title on 6 | `screen-5.html` line 79, `screen-7.html` `is-num`, `screen-6.html` `legend-title` (3.16) |
| 25 | minor | Notes header collapsible only on 6; "Made by" secondary only on 6; screen 3's last two sections drop the 12 px bottom and the divider | `screen-6.html`, `screen-3.html` (3.15) |
| 26 | minor | Screen 4 frame: left panel 241, right edge #e6e6e6, no header divider; screens 5/6/8 headers 49; screen 7 Objects header 4 px low | `screen-4.html`, `screen-5,6,8.html`, `screen-7.html` (3.18) |
| 27 | minor | Toolbar 16 px above the status bar on all screens; Figma and `kit.css` say 12 | `screens.md` conventions, every screen's `.k-toolbar-float { bottom: 16px }` (3.10) |
| 28 | minor | Values drift from `screens.md`: rank 3 vs 12, size 2.3 vs 2.1, 8 vs 10 matches, missing Layout label, "34 nodes" root, "Framed image" label | screens 3, 4, 5, 6, 7 (3.19) |
| 29 | minor | Dark ring chip drawn in #444 where the spec says the outline turns white | `screen-8.html` `k-tree-chip` (3.17) |
| 30 | note | The Path object's Fill is specified as the UI accent #0d99ff, the only place the accent would mean "data" rather than "UI state" | `screens.md` screen 5, "what happens next" (3.17) |

## 6. What to fix, in order

1. Add to `kit.css`, once each: the left file header (glyph, 13/22 name, 16 px chevron at the
   right edge), the right zoom-and-Share bar (ghost zoom at the left, Share at the right,
   48 tall), the inspector title block (kind line and name aligned at x 16, 48 tall), the tree
   count and chip (one format, right-aligned, 14 x 14 radius 2 at x 217, actions overlaying
   without moving the chip), the legend card (24 px rows, 14 x 14 chits, counts on), the
   status chip, the text mode switch, the light 40 px secondary bar, the Export row, the
   two-column value row at 32 px, and the `@font-face`. Delete every local `<style>` rule that
   duplicates one of these.
2. Make the Dataset inspector one HTML partial on the 88 / 88 / 24 grid and include it in
   screens 2, 5 and 7.
3. Regenerate screen 8 from screen 3's HTML with only `data-theme="dark"` changed.
4. Re-shoot all eight PNGs and `kit-light.png` / `kit-dark.png` with Inter loaded, then
   re-run `tmp/object-first/audit-measure.mjs` and check that the tables in section 3 collapse
   to one row each.
5. Remove the duplicated sentences (section 4) and the unopened menu on screen 7.
