# Consistency audit of the twelve round-2 mocks

A measured audit of `design/ui/object-first-ux/mocks/v2/screen-1.html` through `screen-12.html`
(and their PNG stills) against three baselines: the round-2 screen specifications in
`design/ui/object-first-ux/round-2/screens.md` and `revision.md`, the mock kit
`design/ui/object-first-ux/mocks/kit.css`, and the measured Figma study in
`design/ui/figma/components.md`. It answers three questions: is every shared part drawn the same
way and in the same place on every screen, does anything depart from the Figma measurements, and
how much text does each screen put in front of the reader.

Every number below was read from the DOM with a headless Chromium at the mocks' own 1440 x 960
page (a 1440 x 900 frame plus the 60 px caption strip), using `getBoundingClientRect` and
`getComputedStyle`, not estimated from the screenshots. The scripts and the raw dump are in
`tmp/object-first/audit/`:

- `measure.mjs` walks each screen and records boxes, computed styles, fonts, colours, text and
  count strings into `measure.json`;
- `report.mjs` prints the cross-screen comparisons from that dump (`node report.mjs shared`,
  `toolbar`, `overlays`, `tree`, `rows`, `controls`, `fonts`, `colors`, `brand`, `counts`,
  `words`, or `all`; the full output is `report.txt`);
- `probe-export.mjs` and `crop-png.mjs` are the pixel checks behind finding 1.

To reproduce: `node tmp/object-first/audit/measure.mjs > tmp/object-first/audit/measure.json`
then `node tmp/object-first/audit/report.mjs all`.

**Status.** This audit measured the first pass of the round-2 mocks. The blocker (finding 1)
and the majors were fixed in the kit and the generator afterwards and the mocks regenerated;
`revision.md` section 9.2 lists each finding and what was done, and what was left. The numbers
below describe the mocks as they were when measured; re-run the scripts for the current state.

## Terms used in this document

- **Frame**: the whole mocked window. **Panel**: the 240 px column at the left (Views and
  Objects) or the right (the inspector). **Canvas**: the graph area between them. **Stage**: the
  part of the canvas column above any strip docked under it (the transport bar, the open dock,
  the dock handle).
- **Row**: one horizontal band of a panel. The Figma baseline has 32 px rows for lists, tree
  rows and single-control property rows, 40 px section headers, 48 px panel title bars, and
  50 px for a two-column row that carries a 9 px caption above each control.
- **Control**: a button, select, switch, input, checkbox or chit a reader can operate. The
  baseline control height is 24 px.
- **Type role**: a named size / line height / weight from the Figma scale: body 11/16 weight
  450; strong body 11/16 550; panel title 13/22 550; empty-state heading 15/25 550; caption
  9/14 500; tree row 11/32 (600 for a top-level row, 400 nested). Anything else is "off scale".
- **Accent** or **brand**: the one blue, #0d99ff in light and #0c8ce9 in dark.
- **Primary button**: the one filled accent button on a screen. **Secondary**: transparent with
  a 1 px translucent outline. **Ghost**: transparent, no outline. **Light button**: the kit's
  white button on the dark secondary bar.
- **Tint**: the pale blue #e5f4ff that marks a selected row; **child tint**: the paler #f2f9ff on
  rows inside a selected parent.
- **Chit**: a 14 x 14 colour swatch (radius 2) inside a paint row. **Chip**: the 14 x 14 style
  preview at the right of a tree row (a swatch, a ring, a ramp, a strip, a size or line glyph).
- **Panel grid**: Figma's right-panel column layout, `16 | 88 | 8 | 88 | 8 | 24 | 8` = 240.
  Column A starts at x 1216 and column B at x 1312 on these mocks.
- **Header block**: the fixed 144 px block at the top of the inspector: the kind line and the
  name (48), the summary row (32), the reading row (32) and the tab strip (32).
- **Pill tab**: one of a short row of labels that swap a panel's contents; the selected one sits
  on a grey pill.
- **Shared element**: a part that appears on more than one screen in the same state (the file
  header, the section headers, the framing pill, Export, the toolbar, the dock handle, the
  status bar, the "?" button). The rule for a shared element is that its box and its styles
  are identical on every screen that has it.
- **Transient overlay**: something that is only on screen while a tool is armed or a control is
  open: the secondary bar, a flyout, a popover, a tooltip, a menu. "At rest" means with these
  excluded.
- **App-authored text**: prose the app composes (the reading sentence, a note, a status chip,
  the welcome copy, a bar sentence), as opposed to names and values that come from the data or
  from an object the reader made.

## Summary

The structural failure of round 1 is gone. No screen carries a local `<style>` block, every
class is a kit class, Inter loads on all twelve screens, screen 12's DOM is byte-identical to
screen 3's apart from `data-theme` and the caption, and the shared chrome sits at the same
pixel on every screen that has it: the file header at (0, 0, 239, 48), the Views header at
y 48, the Overview row at y 88, the Objects header at y 121, the tree at y 161, the framing pill
at (1208, 11.5), Export at (1381.75, 11.5), the header block's four bands at y 49 / 96 / 128 /
160, the first inspector row at y 193, the toolbar at (357, 784, 725, 56), the dock handle at
y 852, the status bar at y 876 and the "?" at (1412, 878.5). Row heights are 32 / 40 / 50,
controls are 24, chits are 14, section titles are 11/32 weight 550, and exactly one filled
button exists on every app screen.

What fails now is at a finer grain, and most of it is decided once in `kit.css` rather than per
screen, so each fix lands on all twelve screens at once:

1. **The primary button's text is near-black, not white** (blocker). "Export" on screens 2 to
   10 and "Choose a file" on screen 1 render `#000000e5` on `#0d99ff`; only the dark screen 12
   renders white. The cause is `kit.css` line 214, `.k-app button { color: inherit }`, whose
   specificity beats `.k-btn { color: var(--k-text-onbrand) }` at line 613.
2. **The inspector has three label grids** (major). Paint rows put the control at x 1272,
   property rows at x 1292, wide-label rows at x 1320, captioned two-column rows at 1216 and
   1312, and group-swatch rows at 1216. Screen 6's Style tab has five different control
   x-positions in eleven rows; none is Figma's column B (1312).
3. **The tree's root count is a different format on different screens** (major). "Karate Club"
   shows "34 nodes 78 edges"; "College football" and "Email network" show only "115 nodes" and
   "1,204 nodes" because the kit drops count parts when the name is long. The two Path rows on
   screen 8 lose their edge counts the same way. The rule "counts are formatted one way
   everywhere" holds only when the name is short.
4. **Three pill-tab variants** (major): the inspector strip (24 tall, padding 4, every tab
   weight 550), the dock's strip (24 tall, padding 8, weight 450 unselected) and the dock handle
   (20 tall, padding 6). Two of them are on screen 9 at once.
5. **The framing pill says "Fit" on four screens and "100%" on six** in the same 2D state, while
   the status bar says "100%" on all ten (major).
6. **Count formats** (major): a node-and-edge pair is written five ways across the screens.
7. **The mocks are 1440 x 900, not the 1600 x 1000 the specification asks for** (minor, but it
   changes the row budget the specification reasons about).

Everything else is either a pass or a deliberate, consistent departure from Figma that
`revision.md` argues for (the 56 px labelled toolbar, the dark secondary bar, the 32 px flyout
rows, the weight-550 tabs). Those are listed in section 9 so the owner can see each one and
decide once.

## 1. The frame and the shared element positions

Measured on screens 1 to 10 and 12 (screen 11 is the toolbar reference sheet, not an app
frame). Box is [x, y, width, height].

| Element                                     | Box on screens 2 to 10, 12                                                                                                 | Screen 1                                 | Verdict                                                                                                                                                                   |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frame                                       | 1440 x 900 (+60 caption); PNGs 1440 x 960                                                                                  | same                                     | fail vs spec: `screens.md` line 7 says 1600 x 1000, and `revision.md` line 375 budgets 21 rows at that size (the mocks fit 18)                                            |
| Left panel                                  | [0, 0, 240, 876], 1 px #e6e6e6 right edge                                                                                  | same                                     | pass                                                                                                                                                                      |
| Canvas column                               | [240, 0, 959, 876]                                                                                                         | same                                     | pass                                                                                                                                                                      |
| Right panel                                 | [1199, 0, 241, 876], 1 px #0000001a left edge, 50 px bottom padding                                                        | same                                     | pass (Figma 241 = 240 + edge)                                                                                                                                             |
| Status bar                                  | [0, 876, 1440, 24], 1 px #e6e6e6 top                                                                                       | same                                     | pass                                                                                                                                                                      |
| File header                                 | [0, 0, 239, 48] + 1 px line; name 13/22 550 at x 16; chevron 16 px tertiary at the right                                   | same, name in secondary text ("graphty") | pass                                                                                                                                                                      |
| Views header                                | [0, 48, 239, 40]; title 11/16 550 at x 16                                                                                  | same                                     | pass                                                                                                                                                                      |
| Views actions                               | "+" at x 179, "..." at x 207                                                                                               | only "+" at x 207, disabled; no "..."    | fail (minor): the "..." is absent rather than disabled, so the "+" moves 28 px                                                                                            |
| Overview row                                | [0, 88, 239, 32] holding a 223 x 24 pill, #f5f5f5, weight 550                                                              | no row; three verb rows at y 129         | pass (spec)                                                                                                                                                               |
| Divider                                     | 1 px at y 120                                                                                                              | at y 88                                  | pass                                                                                                                                                                      |
| Objects header                              | [0, 121, 239, 40]                                                                                                          | [0, 89, 239, 40]                         | fail (minor, spec-sanctioned): the Objects header and the tree are 32 px higher on screen 1 because the Views list is empty; the header also loses its "..."              |
| Objects actions                             | find at x 179, "..." at x 207                                                                                              | find at x 207, disabled                  | as above                                                                                                                                                                  |
| Tree top                                    | y 161                                                                                                                      | y 129                                    | as above                                                                                                                                                                  |
| Right header                                | [1199, 0, 241, 48] + 1 px line                                                                                             | same                                     | pass                                                                                                                                                                      |
| Framing pill                                | [1208, 11.5, w, 24], borderless, 11/450                                                                                    | same, disabled #0000004d                 | position pass; text fails (section 2.3)                                                                                                                                   |
| Export                                      | [1381.75, 11.5, 50.25, 24], #0d99ff                                                                                        | same, #d9d9d9 disabled                   | position pass; text colour fails (finding 1)                                                                                                                              |
| Header block                                | title [1200, 49, 240, 48]; summary [1200, 96, 240, 32]; reading [1200, 128, 240, 32]; tabs [1200, 160, 240, 32]; 1 px line | one 32 px row "Nothing loaded" at y 48   | pass                                                                                                                                                                      |
| First inspector row                         | y 193                                                                                                                      | -                                        | pass                                                                                                                                                                      |
| Toolbar                                     | [357, 784, 725, 56]; centre x 719.5 (canvas centre 719.5, window centre 720)                                               | same                                     | pass; screen 9 at y 488 and screen 10 at y 744 because the dock and the transport bar sit under the stage, which is the spec's "12 px above whatever is under the canvas" |
| Gap from toolbar bottom to the stage bottom | 12 px                                                                                                                      | 12                                       | pass on all                                                                                                                                                               |
| Dock handle                                 | [240, 852, 959, 24], 1 px top line                                                                                         | same, tabs at 30 percent                 | pass                                                                                                                                                                      |
| Status "?"                                  | [1412, 878.5, 20, 20]                                                                                                      | same                                     | pass                                                                                                                                                                      |
| Status readout                              | "100%" at x 1372.75                                                                                                        | same                                     | pass                                                                                                                                                                      |
| Legend card                                 | [1027, y, 160, h]; 12 px above the toolbar top, 12 px from the right panel                                                 | none                                     | pass on 3, 5, 6, 7, 8, 12                                                                                                                                                 |

The one thing that moves on an app screen, then, is screen 1's Objects header. `screens.md`
specifies "VIEWS header with a disabled '+', no rows", so the drop is intended; but it also
specifies the "..." on the loaded screens only by omission, and a control that appears after a
load is a control that jumps. Draw both headers with their "..." disabled on screen 1 and the
left panel is identical on all eleven.

## 2. The panels

### 2.1 Left panel: tree rows (pass, with one format failure)

Measured on every tree row of screens 2 to 10 and 12 (55 rows):

| Property                   | Baseline                                                  | Measured                                                                                 | Verdict                                                                                                |
| -------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Row                        | 32 tall                                                   | 32 on all 55                                                                             | pass                                                                                                   |
| Indent                     | 24 px per level; caret 16 x 32; icon 16 x 32; name at +40 | caret at x 0 / 24 / 48, icon at 16 / 40 / 64, name at 40 / 64 / 88                       | pass                                                                                                   |
| Name                       | 11/32; 400 nested; root 600 in Figma                      | 11/32 400 nested; root 550; selected 550                                                 | pass vs kit (which chooses 550 for the root on purpose, `kit.css` line 1144); departs from Figma's 600 |
| Count                      | secondary text, right-aligned before the chip             | 11/32 450 #00000080, right-aligned                                                       | pass                                                                                                   |
| Chip                       | 14 x 14, radius 2, at x 223                               | 14 x 14 at x 223 on every row; radius 2 for swatches, 0 for the svg size and line glyphs | pass                                                                                                   |
| Selected row               | #e5f4ff pill, weight 550                                  | #e5f4ff (dark #394360), 550                                                              | pass                                                                                                   |
| Child of a selected parent | #f2f9ff full-width band                                   | #f2f9ff on screens 7 and 9                                                               | pass                                                                                                   |
| Icon colour                | tertiary; primary on the root and the selected row        | #0000004d; #000000e5 on root and selected                                                | pass                                                                                                   |
| Eye and lock               | on hover and when set only                                | none drawn (no row is hidden or locked except the root's chip)                           | pass                                                                                                   |

The failure is the count format. The kit's tree row yields its parts in a fixed order when the
name, the count and the chip do not all fit in 240 px (`kit.css` lines 1400 onward: the
technical name drops first, then count parts from the right, then the name gets an ellipsis).
Measured:

| Screen             | Row                                                                                      | Count in the DOM                   | Count shown                                | Reason                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------- |
| 2, 3, 6, 8, 12     | Karate Club (root)                                                                       | 34 nodes, 78 edges                 | "34 nodes 78 edges"                        | fits                                                                                    |
| 4, 5, 7, 9         | College football (root)                                                                  | 115 nodes, 613 edges               | "115 nodes"                                | "613 edges" is wrapped out of the 32 px box                                             |
| 10                 | Email network (root)                                                                     | 1,204 nodes, 5,830 edges           | "1,204 nodes"                              | same                                                                                    |
| 8                  | Path: 12 -> 30                                                                           | 6 nodes, 5 edges                   | "6 nodes"                                  | same; the spec says "6 nodes 5 edges"                                                   |
| 8                  | Path: 1 -> 34                                                                            | 5 nodes, 4 edges                   | "5 nodes"                                  | same                                                                                    |
| 3, 6, 8, 9, 10, 12 | Connections (Degree), Communities (Louvain), Bridges (Betweenness), Influence (PageRank) | technical name in parentheses      | technical name hidden on every one of them | the "(Degree)" part never fits beside a count and a chip, so it is never seen in a tree |
| 5                  | How far from everything                                                                  | (no count; a "Run (4 min)" button) | name truncated with an ellipsis            | the button takes the count slot, by spec                                                |

So the root row reads "34 nodes 78 edges" on one dataset and "115 nodes" on another, and the
technical name the round-2 tree was meant to carry is never drawn on an app screen. The status
bar shows the full pair on every screen ("115 nodes 613 edges" at x 8), so the reader gets the
number, but the rule in `screens.md` line 27, "Counts are formatted one way everywhere", is
false at 240 px. Either the root row drops the count (the status bar has it) or the panel grows;
what it must not do is depend on the dataset's name length.

### 2.2 Left panel: the Views row and the suggestion rows (pass)

The Overview row is a 223 x 24 pill (Figma says 224; the 1 px is the panel's edge) on
#f5f5f5 with weight 550 on every loaded screen. Screen 2's three suggestion rows are 11/32
weight 400 in secondary text with a 16 px tool icon, indented one level; screen 1's three verb
rows ("Open a file...", "Paste data...", "From a URL...") are 11/24 weight 400 pills in
secondary text. Two different row types for two different things; both are on the kit.

### 2.3 Right panel header: the framing pill and Export

Position and size are identical on every screen. Two things are not:

- **Framing text.** Screens 2, 4, 5 and 6 read "Fit"; screens 3, 7, 8, 9, 10 and 12 read
  "100%". All ten are in 2D, and the status bar's right readout says "100%" on all ten. The
  specification allows both words but never says which state gets which; the mocks pick one
  per screen. On screens 2, 4, 5 and 6 the header says "Fit" while the status bar says "100%"
  of the same camera. Fail (major): decide the rule (the pill shows the framing name until
  the reader zooms, then the zoom; the status bar mirrors the pill) and apply it once.
- **Export text colour.** Finding 1. On screens 2 to 10 the computed `color` and
  `-webkit-text-fill-color` of the Export button are `rgba(0, 0, 0, 0.898)`; a pixel count in
  its 50 x 24 box on `screen-3.png` finds 76 dark pixels and 12 white; the 4x crop in
  `tmp/object-first/audit/crop-export-s3.png` shows black lettering on the blue. Screen 1's
  "Choose a file" is the same (134 dark, 10 white). Screen 12 renders white because in the
  dark theme `inherit` resolves to white. The contrast of near-black on #0d99ff is about 6:1,
  so this is not an accessibility failure; it is the primary button rendered in the wrong
  colour on eleven of twelve screens, and the two themes disagreeing about it. Figma section 7:
  primary text `--color-text-onbrand` #fff.

### 2.4 The inspector header block (pass, two notes)

| Part        | Spec                                                                                                     | Measured on 2 to 10, 12                                                                                                                                        | Verdict                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Title band  | 48 tall, kind in secondary text above the name 13/22 550, actions at the right                           | 48; kind 11/14 450 #00000080 at (1216, 55); name 13/20 550 at (1216, 69); actions 24 x 24 at x 1352 / 1380 / 1408                                              | pass; the 11/14 and 13/20 line heights are off the Figma scale (11/16 and 13/22) and are the kit's way of fitting two lines in 48 px |
| Summary row | 32, chip 14 x 14 at x 1216 then text                                                                     | 32; chip at (1216, 105)                                                                                                                                        | pass                                                                                                                                 |
| Reading row | 32 min, secondary, two-line clamp, "?" at the right                                                      | 32; four screens wrap to two 16 px lines inside it; "?" 24 x 24 at (1408, 124)                                                                                 | pass                                                                                                                                 |
| Tab strip   | 32 tall; tabs 24, padding 4, gap 4, every tab 550, selected on #f5f5f5; four names at most 27 characters | 24 x n, padding 4, gap 4, 11/550 on all, selected #f5f5f5 (dark #383838); longest strip Overview / Layout / Canvas / Data = 24 characters, right edge x 1417.5 | pass vs spec                                                                                                                         |

Two notes. First, the kind line carries the technical name on the two Measure screens ("Measure
Betweenness", "Measure PageRank") and the id on the node screen ("Node id 0"), while the tree
puts the technical name after the name in parentheses and the Define tab writes "Bridges
(Betweenness)": the same fact in three places in three spellings (minor). Second, the tab strip
departs from Figma's pill tab on purpose (Figma: padding 0 8, unselected weight 450 in secondary
text; here padding 0 4, every tab 550 in primary text, so four names fit 240 px). That is
`revision.md` section 2.3's decision and it is consistent on every screen; it is listed in
section 9.

### 2.5 The inspector rows and the label grid

Row heights over the ten inspectors (65 rows): 32 (53 rows), 40 (17 section headers), 50 (the
captioned two-column rows on screens 5 and 6), 64 (screen 8's three-line note). No 16 or 24 px
rows remain (round 1 had both). Pass, with the 64 px note as the one row that is not a row.

The label column is the failure. Every row starts its label at x 1216, but where the control
starts depends on the row type, and one tab mixes them:

| Row type (kit class)                            | Label width      | Control x                    | Where                                                           |
| ----------------------------------------------- | ---------------- | ---------------------------- | --------------------------------------------------------------- |
| Paint row (`k-paint-row`)                       | 52               | 1272                         | Colour, Outline, Missing, Other, Size on screens 3, 6, 7, 8, 12 |
| Property row (`k-prop`)                         | 68               | 1292                         | Scale, Palette, Overflow, Width, Pattern, Exact, Time, Method   |
| Wide-label property row (`k-prop k-label-wide`) | 96               | 1320                         | Show the largest (screen 7)                                     |
| Captioned two-column row (`k-row-2`)            | 88 + 88          | 1216 and 1312                | Weights / Direction, Values from / to                           |
| Legend row (`k-legend-row`)                     | 52 + 8           | 1276                         | Legend strip (screen 6)                                         |
| Group swatch row (`k-group-swatch`)             | none             | 1216 (chit), name at 1238    | the five swatch rows (screen 7)                                 |
| Attribute row (`k-attr-row`)                    | 16 px type glyph | 1240 (name), 1408 ("...")    | screen 10's Data tab                                            |
| Two-value row (`k-row` with two `k-kv`)         | free             | column A 1216, column B 1312 | Nodes / Edges, Density / Mean links, label / value              |

Screen 6's Style tab, top to bottom: chit at 1272, select at 1292, select at 1292, inputs at 1216
and 1312, checkboxes at 1216, chit at 1272, strip at 1276, icons at 1352. Screen 8's: chit at
1272, paint field at 1272, input at 1292, select at 1292. Figma's rule (section 45) is one grid,
`16 | 88 | 8 | 88 | 8 | 24 | 8`, with a wide control spanning A + B; its popovers use a
second, `16 | 64-72 | 8 | control | 16`. The kit's property row is a third grid,
`16 | 68 | 8 | 140 | 8`, and its paint row a fourth, `16 | 52 | 4 | 108 | ...`. Fail (major):
choose one label width for the inspector (68 is the kit's; 72 is Figma's popover) and give the
paint row the same one, so every control on a tab starts at one x.

Section headers: 40 tall, title 11/32 550 at x 1216, "+" at x 1408, 17 of 17. Empty sections
("Findings", "Notes") draw the title in secondary text, as Figma does. Pass.

### 2.6 Controls (pass, with the tab variants)

| Control           | Baseline                                                             | Measured (all screens)                                                                                                                                                           | Verdict                                                                 |
| ----------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Select            | 24 tall, white, 1 px #e6e6e6 inset, radius 5, padding-left 8, 11/450 | 24 tall on all 26; widths 45 to 140 (the inspector's property select is 140, the popover's 88 or 112, the transport's 56); the framing pill is the same control without its line | pass; the 140 width is the kit's grid (2.5)                             |
| Input             | 88 x 24, #f5f5f5, radius 5                                           | 88 x 24 on all 9 (the dock's search 156 x 24, as Figma's Find)                                                                                                                   | pass                                                                    |
| Switch            | 32 x 16 track, off #f5f5f5, on #0d99ff                               | 32 x 16 on all 7                                                                                                                                                                 | pass                                                                    |
| Checkbox          | 16 x 16, radius 2, #f5f5f5                                           | 16 x 16 on all 3                                                                                                                                                                 | pass                                                                    |
| Segmented control | 24 tall, #f5f5f5 track, checked face white with a 1 px inset line    | 140 x 24 (screen 10), 120 x 24 in the flyout with its own dark colours (screen 11)                                                                                               | pass                                                                    |
| Icon button       | 24 x 24                                                              | 24 x 24 on all 110; the status "?" is 20 x 20                                                                                                                                    | pass; the "?" is a kit choice (Figma's help is a 32 px floating circle) |
| Chit / chip       | 14 x 14, radius 2                                                    | 14 x 14 on all 121 (radius 0 on the 24 svg glyphs)                                                                                                                               | pass                                                                    |
| Pill tab          | 24 tall, padding 0 8, 450 unselected                                 | three variants, see below                                                                                                                                                        | fail                                                                    |
| Menu row          | 24 in Figma                                                          | 32 in the flyouts (57 rows)                                                                                                                                                      | deliberate (section 9)                                                  |
| Link              | 11/450 #007be5                                                       | 11/450 #007be5 on all 9                                                                                                                                                          | pass                                                                    |

The three pill-tab variants, all on kit classes:

| Where                                       | Height | Padding | Weight (unselected) | Colour (unselected) | Screens        |
| ------------------------------------------- | ------ | ------- | ------------------- | ------------------- | -------------- |
| Inspector tab strip (`.k-insp-tabs .k-tab`) | 24     | 4       | 550                 | primary             | 2 to 10, 12    |
| Dock header (`.k-dock-head .k-tab`)         | 24     | 8       | 450                 | primary             | 9              |
| Dock handle (`.k-dock-handle .k-tab`)       | 20     | 6       | 450                 | primary             | 1 to 8, 10, 12 |

Screen 9 draws the first two 300 px apart. Figma has one pill tab. Fail (major): the handle's
20 px is forced by the spec's 24 px strip, so either the strip is 32 px with 24 px tabs (Figma's
tab row) or the inspector strip adopts the same reduced padding as the handle; the dock header's
tabs should match the inspector's in any case.

## 3. The toolbar, the bars, the overlays, the legend and the status bar

### 3.1 The toolbar (pass on all twelve)

Identical on every screen: [357, 784, 725, 56] (or the same x at y 488 and y 744 where a dock
or the transport bar sits under the stage), white (#2c2c2c dark), radius 13, the 200-level
shadow, padding 8, gap 8; Select 32 x 32 at x 365 with a 16 x 32 chevron; Hand 32 x 32; a 1 x
56 divider at x 461; Filter, Neighbours, Path, Groups, Rank, Structure 40 x 40 at x 470 / 534
/ 582 / 646 / 710 / 774 with 16 x 40 chevrons after five of them; a divider at 838; Note and
Ask at 847 and 895; a divider at 943; the mode switch [952, 796, 122, 32] with four 28 x 28
options, the selected one on a white thumb with the 100-level shadow and brand text. Every
labelled tool has a 16 x 16 icon over an 8/10 weight-500 label. The armed tool (Select on ten
screens, Rank on screen 4) is the only brand fill in the bar. On screen 1 every tool but Select
and Hand is at 30 percent, chevrons and labels included. The width is 725, as `revision.md`
section 3.1 computes.

Departures from Figma, all deliberate and consistent: 56 tall (Figma 48), 40 px labelled tools
(32), an 8 px label (Figma has none; 8/10 500 is off the type scale), and unselected mode
options in primary text (Figma: secondary). Screen 11 draws the same bar at 1:1 and again in a
1280 px band; both measure 725 x 56.

### 3.2 The secondary bar (screens 4 and 11)

[446, 736, 547, 40], #1e1e1e, radius 13, 8 px above the toolbar, centred on the toolbar's
centre (719.5), padding 16 / 8, white 11/450 text; the select is transparent with a
#ffffff4d inset line; Options is a ghost button, Run the one light button (white, 37 x 24),
Cancel a ghost in #ffffffb2. Screen 11's three strips measure the same. Pass vs `revision.md`
section 3.5. It departs from Figma section 42 (a 40 px bar on the same light surface as the
toolbar, with #0d99ff for a selected item), and the kit still carries the unused Figma version
as `.k-toolbar-secondary` (`kit.css` line 876) beside the dark `.k-secondary-bar` (line 1241).
The bar's shadow is the 300-level (tooltip) token while the toolbar's is 200. Minor.

### 3.3 The flyout and the parameters popover (screens 4, 10, 11)

Flyout: #1e1e1e, radius 13, the 400-level shadow, padding 8 / 0, 32 px rows, 16 x 16 kind icon,
11/450 white label, the technical name and cost in #ffffffb2, the face row 550, a 1 px
#ffffff1a separator with 4 px margins before "Several...". Screen 11's six flyouts hold 3, 7, 6,
9, 12 and 8 rows (45), which matches `revision.md` section 3.4. Pass vs spec. Its left edge is
at x 758 while the Rank chevron is at x 750: Figma places a flyout's left edge on its chevron
(section 32); 8 px off. Minor.

Popover: 240 wide, white, radius 13, the 400-level shadow; header 40 with an 11/550 title at
x+16 and a 24 px close; rows 32 (50 for captioned pairs); labels 68 wide at x+16; controls at
x+92 (Figma: x+88..96). Screen 10's gear popover follows the same grid (its "Re-run" rows use
a full-width label and a switch at x+200; its caption note is 40 tall). Pass.

### 3.4 The legend card (screens 3, 5, 6, 7, 8, 12)

160 wide, white (#2c2c2c dark), radius 5, the 200-level shadow, padding 8 / 8; titles 24 tall
11/550 at x+12; items 20 tall with a 14 x 14 chit (28 x 14 line glyph on screen 8) and the count
in secondary text at the right; the ramp 136 x 12 with 9/12 end labels. Bottom edge 12 px above
the toolbar and right edge 12 px from the panel on all six. Pass, one implementation. The 20 px
item and the 9 px end labels are off Figma's row and type scales (minor). Screen 5's legend
lists the twelve conferences in id order; screen 7's lists eight in size order plus "and 4
more" and "Other", because "Show the largest" is 8 on screen 7 and unset on screen 5: two orders
for one Grouping, by the spec's own states (note).

### 3.5 The dock and the transport bar (screens 9 and 10)

Dock: [240, 556, 959, 320], a 1 px top line; header 32 (31 + line) with Table selected, the
Nodes / Edges tabs, a "Showing" select 90 x 24, a search 156 x 24 and a close; 32 px table rows
(63 cells), header cells 550, the selected row in #e5f4ff, a 16 px grab handle column. Pass.
Transport: [240, 812, 959, 40], window text 11/550, three 24 px ghost buttons, "Speed" and a 56
px select, the slider with 9 px end labels, the counts in secondary text, the gear pressed
(#0000001a) and a close. Pass. Both are single implementations on the kit.

### 3.6 The status bar (pass)

24 tall, 11/16 450 in secondary text, padding 8, gap 8, 1 px top line, on every screen. Items in
the specified priority order, separated by 1 x 12 lines: the counts at x 8 (never collapsed),
then the mask readout (screen 10), the computing chip with its Cancel link (screen 5), the
layout chip as a pause glyph plus "Spread out: settled" (plain text now, not round 1's outlined
chip), the armed tool ("Rank: Bridges", screen 4), the selection count (3, 8, 9, 12), and at the
right "100%" at x 1372.75 and the "?" at 1412. Screen 1 shows only the right two. The count
item's box is 32 tall inside the 24 px bar because the `.k-count` flex box is 32 tall; it clips
nothing and moves nothing (note).

## 4. Type

Inter 100..900 is loaded and `document.fonts.check("11px Inter")` is true on all twelve screens
(round 1's blocker). The type roles in use, counted over text elements outside the canvas svg
and the caption:

| Role found                                                                         | Screens            | On the Figma scale?                       |
| ---------------------------------------------------------------------------------- | ------------------ | ----------------------------------------- |
| 11/16 450 (body)                                                                   | all                | yes                                       |
| 11/16 550 (strong body)                                                            | all                | yes                                       |
| 11/32 400 / 450 / 550 (tree names, counts, section titles)                         | 2 to 10, 12        | yes (Figma's top-level row is 600)        |
| 13/22 550 (file header)                                                            | all                | yes                                       |
| 15/25 550 (welcome heading)                                                        | 1                  | yes                                       |
| 9/14 500 (captions above a two-column row)                                         | 4, 5, 6, 10, 11    | yes                                       |
| 11/24 400 (page-row pills: the welcome list, screen 1's verb rows)                 | 1                  | yes (Figma page row 11/24 400)            |
| 11/24 450 (input values)                                                           | 4, 6, 8, 9, 10, 11 | yes (input line 24)                       |
| 11/14 450 (the inspector kind line)                                                | 2 to 10, 12        | no: 11/16 body squeezed to fit 48 px      |
| 13/20 550 (the inspector name)                                                     | 2 to 10, 12        | no: 13/22 squeezed the same way           |
| 8/10 500, letter-spacing 0.1 (tool labels)                                         | all                | no: deliberate, `revision.md` section 3.1 |
| 9/12 450 (legend ramp end labels)                                                  | 6                  | no                                        |
| 9/16 450 (transport end labels, flyout issue numbers, the inspector's legend ends) | 6, 10, 11          | no                                        |
| 9/12 400 monospace (reference-sheet callouts)                                      | 11                 | no: reference sheet only                  |
| 15/25 550 with letter-spacing 0.055 (screen 11's page title)                       | 11                 | almost: the heading token is -0.075       |

Ten roles per app screen, four of them off the scale, all four consistent across screens. Pass
with notes; the two squeezed line heights in the header block are the only ones a reader could
see beside their on-scale twins (the 11/16 secondary summary text sits 32 px under the 11/14
kind line).

## 5. Colour

Distinct colours in use per screen, chrome only (the canvas svg, data swatches, ramps and strips
excluded):

| Screen                        | Text colours | Background fills | Border, outline and shadow colours |
| ----------------------------- | ------------ | ---------------- | ---------------------------------- |
| 1                             | 4            | 6                | 9                                  |
| 2, 3, 5, 6, 7, 8              | 3            | 5                | 9 to 10                            |
| 4 (bar, flyout, popover open) | 7            | 8                | 15                                 |
| 9 (dock open)                 | 3            | 6                | 9                                  |
| 10 (transport, popover open)  | 3            | 7                | 11                                 |
| 11 (reference sheet)          | 6            | 8                | 16                                 |
| 12 (dark)                     | 3            | 5                | 12                                 |

Every text colour is a token: #000000e5, #00000080, #0000004d (disabled, screen 1), #007be5
(links and the selected mode option), white and #ffffffb2 on dark surfaces, and #1e1e1e on the
light button. Every fill is a token: white, #f5f5f5, #e6e6e6, #e5f4ff (the selected dock row),
#0d99ff, #d9d9d9 (the disabled Export), #1e1e1e (menus and the secondary bar); dark #2c2c2c,
#383838, #444, #394360, #0c8ce9. The one fill that is a token but not the specified value is the
canvas: `kit.css` line 100 sets `--k-canvas: #f0f0f0`, `screens.md` line 577 says #f5f5f5, and
Figma's canvas is #f5f5f5 (the frame-name label note in section 50 measures it). Consistent on
all screens, so minor. The shadows are the four Figma elevation tokens verbatim.

The accent is used for: the primary button (fill), the armed tool (fill), a switch that is on
(fill: screens 4, 5, 10), the selected mode option (text), links (text), the selected dock row
and the tree selection (tint), the transport band (#0d99ff at 18 percent with brand handles),
and the progress ring (screen 5). All of these mean "the live or chosen UI state", which is
Figma's rule. Two or three brand fills per screen; exactly one is a button.

## 6. Count formats

Every text run containing a digit was classified by regular expression
(`report.mjs counts`). The node-and-edge pair, the one count the specification says is
"formatted one way everywhere", appears in five spellings:

| Format                                     | Regex                            | Where                                                 |
| ------------------------------------------ | -------------------------------- | ----------------------------------------------------- |
| "34 nodes 78 edges" (two runs 4 px apart)  | `\d+ nodes` + `\d+ edges`        | the tree root and the status bar, every loaded screen |
| "34 nodes, 78 edges"                       | `\d[\d,]* nodes, \d[\d,]* edges` | the welcome sheet's sample list (screen 1)            |
| "6 nodes, 5 edges"                         | same                             | the inspector summary row (screen 8)                  |
| "6, 5"                                     | `\d+, \d+`                       | the legend's Paths block (screen 8)                   |
| "412 of 1,204 nodes, 1,910 of 5,830 edges" | `\d+ of \d+ nodes, ...`          | the transport bar (screen 10)                         |

Other count strings, each used one way: "5 nodes" / "34 values" / "4 groups" / "12 neighbours"
(tree, summary, legend), bare numbers on Group rows and in the legend (by spec), "N of M"
("Computing 1 of 1", "rank 2 of 115", "412 of 1,204"), "N%" ("42%", "94%", "100%"), "N selected",
"and N more" (legend and inspector), "N more (Other)" (tree), "read 613, kept 613", "N to M"
("1 to 17"), "0.8x to 2.2x", "about 2 s" / "about 80 ms" / "about 4 min", "Run (4 min)", "2 px",
"9 colours", "1 option". Two of these say the same overflow three ways on screen 7: the tree
"4 more (Other) 28", the legend "and 4 more" then "Other 28", the inspector "and 3 more" (of
the eight shown) then "Other". Each is right for its place; together they make a reader count.
Fail (major) on the node-and-edge pair; note on the rest.

## 7. Restraint: words on screen and app-authored text

Word counts of every visible text node in the chrome (the canvas labels and the caption strip
excluded). "At rest" excludes the transient overlays. "App-authored" counts the sentences the
app composes: the reading row, notes, status chips, the welcome copy, the bar sentence, the
suggestion rows, captions and disclosure summaries; names, values, labels and control text are
not counted.

| Screen | Words, all | Words at rest | App-authored words at rest       | Longest app-authored run                                                                |
| ------ | ---------- | ------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| 1      | 73         | 73            | 9                                | "Drop a file here"                                                                      |
| 2      | 91         | 91            | 35                               | "34 nodes joined by 78 edges in one connected part" (10)                                |
| 3      | 114        | 114           | 25                               | "11 nodes, 32% of the scope" (6)                                                        |
| 4      | 162        | 85            | 26 (48 with the bar and popover) | "115 teams joined by 613 games in one connected part" (10)                              |
| 5      | 104        | 104           | 21                               | "Computing 1 of 1 Cancel" (5)                                                           |
| 6      | 97         | 97            | 27                               | "Node 34 has the most influence; the top three hold a third of it." (14)                |
| 7      | 122        | 122           | 20                               | "12 conferences; the largest has 13 teams." (7)                                         |
| 8      | 135        | 135           | 41                               | "Shares 1 edge with Path: 1 -> 34; this path wins Colour, Width and Pattern on it" (17) |
| 9      | 157        | 157           | 15                               | "Colour, Size, Outline" (3)                                                             |
| 10     | 155        | 108           | 31 (49 with the popover)         | "1,204 people joined by 5,830 emails over 12 months, in 3 parts." (12)                  |
| 11     | 677        | 345           | 224                              | the reference sheet's paragraphs                                                        |
| 12     | 114        | 114           | 25                               | as screen 3                                                                             |

Round 1's screens carried 61 to 228 words; round 2's carry 73 to 157 at rest with 9 to 41 of
them app-authored. Things said twice on one screen, all by the specification's own states:

- Screen 2: the node and edge count is on screen four times (tree root, status bar, the
  "Nodes 34 | Edges 78" row, the reading sentence).
- Screen 4: "on what is showing, 115 nodes, about 2 s" in the bar, "On what is showing, 115
  nodes" and "About 2 s" in the popover, "about 2 s" on the flyout row: the same scope and cost
  three times.
- Screen 5: "Computing 42% [Cancel]" in the summary row and "Computing 1 of 1 [Cancel]" in the
  status bar.
- Screen 10: the window "2019-03 to 2019-05" and "412 of 1,204" both in the transport bar and in
  the status bar.

Screen 8's 17-word note is the longest sentence in the app and the only row taller than 50 px.
No tooltip is drawn open on any screen and no menu is open without a pointer on it (round 1's
finding on screen 7 is fixed).

## 8. The dark theme (screen 12 against screen 3)

`diff` of the two HTML files, with `data-theme` stripped, differs only in the `<title>` and the
caption. Every measured box is identical. The tokens that change: panels #2c2c2c, canvas
#1e1e1e, dividers #444, the current-page pill and the selected tab #383838, brand #0c8ce9, the
selected row #394360, text white and #ffffffb2, tree icons #ffffff66, the mode-switch track
#444 with a #2c2c2c thumb and #7cc4f8 text, the legend card #2c2c2c, the toolbar's dark
shadow with its white inset hairlines. The menu surface stays #1e1e1e. On the canvas the outline
and labels are white. Pass. (`screens.md` line 578 says the selected pill tab is #444 in dark;
the kit uses #383838, which is what Figma section 16 measures; the spec line is the one to
correct.)

## 9. Departures from the Figma measurements

Every place the mocks measure differently from `design/ui/figma/components.md`, whether
deliberate or not. "Decided" means `revision.md` argues for it; "drift" means nothing does.

| Part                                                                                                                                                                         | Figma                                                           | Mocks                                                                                    | Kind                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Window                                                                                                                                                                       | 1600 x 1000 study; `screens.md` asks 1600 x 1000                | 1440 x 900                                                                               | drift (the row budget in `revision.md` 2.4 assumes 1600) |
| Primary button text                                                                                                                                                          | #fff (section 7)                                                | #000000e5 in light, #fff in dark                                                         | drift (finding 1)                                        |
| Floating toolbar                                                                                                                                                             | 48 tall, 32 px tools, no labels, centred on the window (40, 41) | 56 tall, 40 px labelled tools, 8 px labels, centred on the canvas                        | decided (3.1)                                            |
| Mode switch unselected option                                                                                                                                                | secondary icon colour (18)                                      | primary text                                                                             | drift (minor)                                            |
| Secondary bar                                                                                                                                                                | 40 tall on the light toolbar surface, 200 shadow (42)           | 40 tall, #1e1e1e, 300 shadow; the light version sits unused in the kit                   | decided (3.5); the shadow is drift                       |
| Flyout rows                                                                                                                                                                  | 24 tall, label at x+60 (32, 41)                                 | 32 tall, kind icon, technical name, cost, "..."                                          | decided (3.4)                                            |
| Flyout left edge                                                                                                                                                             | on the chevron (32)                                             | 8 px right of it                                                                         | drift (minor)                                            |
| Pill tab                                                                                                                                                                     | padding 0 8, unselected 450 secondary (16)                      | inspector: padding 0 4, all 550 primary; dock header: Figma's; handle: 20 tall padding 6 | decided (2.3) for the inspector; the other two are drift |
| Right-panel property row                                                                                                                                                     | one grid 16 / 88 / 8 / 88 / 8 / 24 / 8 (45)                     | property rows 16 / 68 / 8 / 140; paint rows 16 / 52 / 4 / 108; wide 16 / 96 / 8 / 112    | drift (finding 2)                                        |
| Paint row field                                                                                                                                                              | 156 wide: chit 14, hex 77, divider, opacity 54 (28)             | 108 wide: hex 50, opacity 30                                                             | drift, forced by the 52 px label                         |
| Top-level tree row                                                                                                                                                           | weight 600 (46)                                                 | 550                                                                                      | decided in the kit (line 1144)                           |
| Tree row count                                                                                                                                                               | Figma has none                                                  | secondary text before the chip, parts dropped when long                                  | new; the dropping is finding 3                           |
| Inspector kind line and name                                                                                                                                                 | 11/16 and 13/22 (1)                                             | 11/14 and 13/20                                                                          | drift (minor)                                            |
| Legend card                                                                                                                                                                  | no Figma part; the nearest is the 240 promo card (55)           | 160 wide, radius 5, 20 px items                                                          | new, consistent                                          |
| Help                                                                                                                                                                         | 32 px floating circle, 200 shadow (15)                          | 20 x 20 ghost "?" in the status bar                                                      | decided (1.6)                                            |
| Status bar                                                                                                                                                                   | none in Figma                                                   | 24 tall, 11 px secondary                                                                 | new, consistent                                          |
| Canvas colour                                                                                                                                                                | #f5f5f5                                                         | #f0f0f0                                                                                  | drift (minor)                                            |
| Menu, tooltip, popover, dialog, switch, checkbox, select, input, icon button, chit, section header, tree row geometry, page row, elevation, radii, text colours, dark tokens | as measured                                                     | as measured                                                                              | pass                                                     |

## 10. Rules scorecard

| #   | Rule                                                                                                       | Result                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Frame is 1600 x 1000 as `screens.md` specifies                                                             | fail: 1440 x 900 on all twelve                                                                                                  |
| 2   | Panels 240 (right 241 with its edge), status bar 24, no rail, no top bar                                   | pass                                                                                                                            |
| 3   | Every shared element has the same box and styles on every screen that has it                               | fail on one: screen 1's Objects header and tree are 32 px high and its two "..." buttons are absent; everything else identical  |
| 4   | File header 48 + 1, name 13/22 550, 16 px chevron                                                          | pass                                                                                                                            |
| 5   | Section and panel headers 40, title 11/32 550, 24 px actions at x+8 from the right                         | pass                                                                                                                            |
| 6   | Tree rows 32, indent 24, caret 16, icon 16, chip 14 at one x, selected tint and child tint                 | pass                                                                                                                            |
| 7   | Counts formatted one way everywhere                                                                        | fail: five spellings of the node-and-edge pair; the root count drops its edge part on three datasets; the Path rows drop theirs |
| 8   | Right header 48 + 1 with the framing pill and one filled Export                                            | pass on geometry; fail on the pill's text (Fit on 4 screens, 100% on 6, the status bar 100% on all)                             |
| 9   | Primary button is white text on the brand fill                                                             | fail on 11 of 12 screens                                                                                                        |
| 10  | Exactly one primary button per app screen                                                                  | pass (screen 1: Choose a file with Export disabled)                                                                             |
| 11  | Header block 144 (48 / 32 / 32 / 32), never scrolls                                                        | pass                                                                                                                            |
| 12  | Pill tabs: one variant                                                                                     | fail: three                                                                                                                     |
| 13  | Tab strip within 27 characters and 240 px                                                                  | pass (longest 24, right edge 1417.5)                                                                                            |
| 14  | Rows 32 / 40 / 50 only                                                                                     | pass (one 64 px note on screen 8)                                                                                               |
| 15  | One label column per panel; controls start at one x per row type                                           | fail: five control x-positions on one tab                                                                                       |
| 16  | Controls 24 tall; inputs 88; switch 32 x 16; checkbox 16; chit 14                                          | pass                                                                                                                            |
| 17  | Toolbar 725 x 56, radius 13, 200 shadow, 12 px above the strip below, centred, four groups, one brand fill | pass                                                                                                                            |
| 18  | Secondary bar 40, 8 px above the toolbar, centred                                                          | pass (dark by decision; its shadow token is the tooltip's)                                                                      |
| 19  | Flyout 32 px rows with icon, plain name, technical name, cost; left edge on its chevron                    | pass on rows; 8 px off on the edge                                                                                              |
| 20  | Popover 240, header 40, rows 32 / 50, controls at x+92                                                     | pass                                                                                                                            |
| 21  | Legend 160 wide, 12 above the toolbar, 12 from the panel, one implementation                               | pass                                                                                                                            |
| 22  | Status bar 24, 11 px secondary, items in priority order, "?" at the right                                  | pass                                                                                                                            |
| 23  | Inter loaded on every screen                                                                               | pass                                                                                                                            |
| 24  | Type roles on the Figma scale                                                                              | pass with four off-scale roles, all consistent (8/10 labels, 11/14 kind, 13/20 name, 9 px end labels)                           |
| 25  | Every colour a token; one accent meaning                                                                   | pass (canvas #f0f0f0 is a token but not the specified #f5f5f5)                                                                  |
| 26  | Screen 12 is screen 3 in dark with nothing moved                                                           | pass                                                                                                                            |
| 27  | No text said twice on one screen                                                                           | pass with four spec-driven repeats (section 7)                                                                                  |
| 28  | No open overlay without a cause on screen                                                                  | pass                                                                                                                            |
| 29  | Each inspector tab at most 14 rows; the panel never scrolls                                                | pass (11 rows at most; scrollHeight equals clientHeight on all)                                                                 |

Twenty-one pass, seven fail, one pass with the frame caveat.

## 11. Findings list

Severity: blocker = the mock shows the design wrong; major = the same thing is drawn two ways
across screens or breaks the panel grid; minor = a single drift or an off-baseline value that
is consistent across screens.

| #   | Severity | What                                                                                                                                                                                                                                                                                                                                                                                                                                           | Where                                                                                                                               |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | blocker  | The primary button's text renders #000000e5 on #0d99ff on every light screen (Export on 2 to 10, Choose a file on 1) and white only in dark; `.k-app button { color: inherit }` outranks `.k-btn`'s `color: var(--k-text-onbrand)`                                                                                                                                                                                                             | `kit.css` line 214 vs line 613; `tmp/object-first/audit/crop-export-s3.png`                                                         |
| 2   | major    | Three label grids in the inspector: paint rows put the control at x 1272, property rows at 1292, wide rows at 1320, captioned pairs at 1216 / 1312, swatch rows at 1216; screen 6 has five control x-positions in eleven rows and screen 8 three in five                                                                                                                                                                                       | `.k-paint-row` (label 52), `.k-prop` (68), `.k-label-wide` (96), `.k-row-2`, `.k-group-swatch` in `kit.css`; screens 3, 6, 7, 8, 12 |
| 3   | major    | The tree root count shows "34 nodes 78 edges" for Karate Club but "115 nodes" for College football and "1,204 nodes" for Email network; the Path rows on screen 8 show "6 nodes" for "6 nodes 5 edges"; the technical name "(Degree)" etc. is never visible on any app screen                                                                                                                                                                  | the yielding rule in `kit.css` (the `.k-tree-tech` / `.k-count` block near line 1400); screens 4, 5, 7, 8, 9, 10                    |
| 4   | major    | Three pill-tab variants: inspector 24 / padding 4 / all 550; dock header 24 / 8 / 450; dock handle 20 / 6 / 450; two of them on screen 9                                                                                                                                                                                                                                                                                                       | `.k-insp-tabs .k-tab` line 1193, `.k-dock-handle .k-tab` line 1296, `.k-tab` line 666                                               |
| 5   | major    | The framing pill reads "Fit" on screens 2, 4, 5, 6 and "100%" on 3, 7, 8, 9, 10, 12, all in 2D with the status bar reading "100%"                                                                                                                                                                                                                                                                                                              | `.k-framing` text in each screen                                                                                                    |
| 6   | major    | Five spellings of the node-and-edge pair ("34 nodes 78 edges", "34 nodes, 78 edges", "6 nodes, 5 edges", "6, 5", "412 of 1,204 nodes, 1,910 of 5,830 edges")                                                                                                                                                                                                                                                                                   | tree and status bar; welcome list (1); summary row (8); legend (8); transport (10)                                                  |
| 7   | minor    | The frame is 1440 x 900 where the specification says 1600 x 1000, so the "21 rows of room" the specification reasons with is 18 here                                                                                                                                                                                                                                                                                                           | every `screen-N.html` body style `--k-frame-w:1440px;--k-frame-h:900px`                                                             |
| 8   | minor    | Screen 1 omits the "..." on both left headers instead of disabling it, so the "+" and the find glyph sit at x 207 there and x 179 elsewhere, and the Objects header is at y 89 instead of 121                                                                                                                                                                                                                                                  | `screen-1.html` left panel                                                                                                          |
| 9   | minor    | The technical name is placed three ways: after the name in the tree "(Betweenness)", before the name on the kind line "Measure Betweenness", after it on the Define row "Bridges (Betweenness)"                                                                                                                                                                                                                                                | screens 5, 6, 9                                                                                                                     |
| 10  | minor    | The secondary bar uses the 300-level (tooltip) shadow; the toolbar it sits on uses 200; the kit keeps an unused light `.k-toolbar-secondary` beside the dark `.k-secondary-bar`                                                                                                                                                                                                                                                                | `kit.css` lines 876 and 1241                                                                                                        |
| 11  | minor    | The flyout's left edge is 8 px right of the Rank chevron (x 758 vs 750)                                                                                                                                                                                                                                                                                                                                                                        | `screen-4.html`, `.k-flyout`                                                                                                        |
| 12  | minor    | Off-scale type: 11/14 kind line and 13/20 name in the header block; 9/12 and 9/16 end labels in the legend and the transport; the tool label 8/10 500 (decided)                                                                                                                                                                                                                                                                                | `.k-insp-title`, `.k-legend-ramp-ends`, `.k-slider-end`, `.k-tool-name`                                                             |
| 13  | minor    | The canvas is #f0f0f0 where the specification and Figma say #f5f5f5                                                                                                                                                                                                                                                                                                                                                                            | `kit.css` line 100 `--k-canvas`                                                                                                     |
| 14  | minor    | Unselected mode-switch options are primary text; Figma's are secondary                                                                                                                                                                                                                                                                                                                                                                         | `.k-mode-opt.has-text`                                                                                                              |
| 15  | minor    | Screen 7's overflow is stated three ways at once ("4 more (Other) 28", "and 4 more" + "Other 28", "and 3 more" + "Other")                                                                                                                                                                                                                                                                                                                      | tree, legend, Style tab on `screen-7.html`                                                                                          |
| 16  | minor    | Screen 8's note row is 64 tall (three lines, 17 words), the only row off the 32 / 40 / 50 set                                                                                                                                                                                                                                                                                                                                                  | `.k-row-note` on `screen-8.html`                                                                                                    |
| 17  | minor    | Values drift from `screens.md`: screen 9 shows BrighamYoung (id 0, rank 2) for FloridaState (id 1, rank 3); screen 7 overrides conference 4 for 7, "9 colours" for "Tol vibrant 7 colours", "4 more (Other) 28" for 36, "and 3 more" for "and 7 more"; screen 3 "From Communities" for "Inherited from Communities"; screen 2 "Undirected (file)" for "Undirected, from file"; screen 5's tree row reads "Bridges" for "Bridges (Betweenness)" | screens 2, 3, 5, 7, 9                                                                                                               |
| 18  | note     | `screen-11.html` and `toolbar-reference.html` are byte-identical; two files carry one sheet                                                                                                                                                                                                                                                                                                                                                    | `mocks/v2/`                                                                                                                         |
| 19  | note     | `screens.md` line 578 gives the dark selected pill tab as #444; the kit and Figma use #383838. The spec line is wrong, not the mock                                                                                                                                                                                                                                                                                                            | `round-2/screens.md`                                                                                                                |

## 12. What to fix, in order

1. In `kit.css`, make `.k-btn` win over `.k-app button`: either raise its specificity
   (`.k-app .k-btn`) or set `color` on `.k-btn` with the same selector weight. Re-shoot the PNGs
   and re-run the pixel probe; the Export box on screen 3 should count white pixels, not dark.
2. Pick one inspector label width (68, the kit's property row) and give `.k-paint-row`,
   `.k-legend-row` and `.k-label-wide` the same one, so every control on a tab starts at x 1292.
   Re-run `report.mjs rows`; the "ctlX" histogram per screen should have one key besides the
   two-column rows.
3. Decide what a tree row drops at 240 px. Two honest options: the root row carries no count
   (the status bar has it and the Overview row has it) and the technical name is a tooltip; or
   the count keeps both parts and the name gets the ellipsis. Whichever it is, "College
   football" and "Karate Club" must read the same way.
4. Make the dock handle a 32 px strip with the kit's 24 px tabs, and give the dock header and
   the inspector strip the same tab (padding 4, weight 550 on all, or Figma's 8 / 450 on both).
5. State the framing-pill rule once in `revision.md` section 1 and apply it: the pill shows the
   framing name ("Fit") until the reader zooms, then the percentage, and the status bar's right
   readout mirrors the pill.
6. Write the count grammar once: "N nodes M edges" everywhere a pair appears (the welcome
   list, the summary row, the legend, the transport bar), with "of" only for a subset.
7. Set the frame to 1600 x 1000 (or change `screens.md` and the row budget to 1440 x 900), draw
   screen 1's two "..." buttons disabled, fix the canvas token to #f5f5f5, drop the unused light
   secondary bar from the kit, and align the flyout on its chevron. Then re-run
   `measure.mjs` and check that every "distinct signatures" line in `report.mjs shared` reads
   1 for the light screens plus 1 for screen 12.
