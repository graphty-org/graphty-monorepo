# Iteration 1: visual walkthrough of the unified style panel

The Visual Designer's expert walkthrough of the first build of the unified style panel: hierarchy,
spacing, alignment, typography, color, density and polish, in light and dark. Each finding has a
severity from 0 (cosmetic, no effect) to 4 (blocks the work), the screenshot that shows it, and the
package that owns the fix. Where the mechanism was read in source, the file is named; where it was
not, the finding says so.

## What was walked

- The production build of commit 68a2140049, served at https://dev.ato.ms:9373 (the new workspace
  is the default page there), driven with Playwright in its own browser context through the
  studio's browser gate.
- Les Miserables, opened from Samples. The same rows the owner-review stories build were then added
  through graphty-element's session, as those stories do: an Annotations folder holding Key people
  (Valjean, Javert, Cosette, Marius in orange), Degree, Edge betweenness, Louvain with community 3
  recolored green, and a shortest route from Myriel to Marius. Every screen after that was reached
  by clicks and typing.
- Four passes: the app as a reader opens it (no starting rows, light, 1440 x 900); with the starting
  rows (Everything, Selected, Hovered) turned on, in light and in dark at 1440 x 900; and light at
  900 x 700.
- Computed text colors and sizes of the panel's text kinds were read from the page in both themes.

Screenshots are under `design/ui/studio/tier3/build/i1-visual/` (written locally, not committed):

| Folder                 | What it holds                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `light-1440/`          | the app as a reader opens it, no starting rows (its text spacing is a capture artifact: that pass ran without `--font-render-hinting=none`) |
| `light-1440-starting/` | with Everything, Selected and Hovered, light                                                                                                |
| `dark-1440-starting/`  | the same, dark                                                                                                                              |
| `light-900-starting/`  | the same, light, 900 x 700                                                                                                                  |
| `label-settings/`      | Label settings at both sizes, and with its last field focused                                                                               |
| `contrast.txt`         | computed color, size and weight of each text kind, both themes                                                                              |

Paths below are relative to that folder.

## Summary

34 findings: 7 at severity 3, 20 at severity 2, 7 at severity 1. Nothing blocks a task outright,
but seven things a reader meets on an ordinary path either cannot be reached, cannot be read, or
say something false:

1. Half of Label settings is below the window and nothing scrolls.
2. Louvain's category rows hide which group each color belongs to.
3. One community has three different numbers on three surfaces.
4. The key leads with six rows for the Selected layer while nothing is selected.
5. At 900 x 700 the key takes the canvas and the drawing shrinks to a speck.
6. The app a reader opens has no Everything, Selected or Hovered rows, and Clear names a layer the
   tree never shows.
7. Which elements appears only on layers the reader made; a run's layers hide it.

The largest group of severity 2 findings is one theme: the panel's field states (set, not set,
mixed, cleared) are drawn several different ways by different controls. Fixing that is one rule
applied in compact-mantine and in the panel, not twenty separate fixes.

## Severity 3

### 1. Label settings runs off the bottom of the window and cannot be scrolled

The Label settings popover is one column of about 50 fields. It renders 2,280 px tall, is pinned to
the top of the window (it covers the app header), and nothing inside it scrolls: at 1440 x 900 the
fields from "Margin above" down (Letters, Placement, Motion and distance, Badge -- about 60% of the
popover) are never on screen. Focusing the last field ("Largest number shown") leaves it at y = 2,244.
The popover also covers the left 20 px of the inspector, cutting "Style" to "yle".

- Evidence: `label-settings/label-settings-1440x900.png`, `label-settings/label-settings-last-focused-900x700.png`, `light-1440-starting/46-label-settings-end.png`
- Owner: compact-mantine. `Popout.Panel` clamps its top to 0 when the panel is taller than the
  window (`compact-mantine/src/components/popout/PopoutPanel.tsx`, around line 255) but sets no
  maximum height, so every tall popout has this problem, not only this one.
- Also visual: the group captions (Type, Box, Letters) are 9 px, the size of the field labels under
  them, so the groups do not read as groups; paired values (four margins, shadow right and down,
  padding and corners) each take a full row.

### 2. Louvain's category rows do not say which group each color is

The color binding popover lists one row per community, but each row shows only a hex field, an eye
and "...": no group name, no count. A reader cannot tell which row is community 3 except by
recognizing its green.

- Evidence: `light-1440/crops/louvain-popover.png`, `light-1440-starting/29-louvain-popover.png`
- Owner: graphty app. `ValueRow` in `graphty/src/workspace/style/BindingPopover.tsx` (around line 728) does draw the name and the count, after the chit, but puts a full `CompactColorInput` in a
  96 px box; the input is wider than the box and covers both. The clear button lands inside the
  field as a result (finding 9). The row needs a chit, not a hex field.

### 3. One community has three different numbers

The canvas key names communities by size rank ("Group 2"); the Values tab lists the raw values ("5");
the category menu says "New layer for 3" (the raw value); the node inspector says "Group 1" (rank).
The light blue community is "Group 2" in the key and "5" in the Values tab. Only community 1 and
community 3 happen to agree.

- Evidence: `light-1440-starting/03-scene-no-selection.png` (key), `light-1440/32-louvain-values.png` (Values), `light-1440-starting/48-valjean-selected.png` (inspector)
- Owner: graphty app. The key words come from `swatch.rank` (`graphty/src/workspace/canvas/legendWords.ts`
  line 130); the Values tab prints the value. One name per group, on every surface.
- Also: the key lists the recolored "Group 3" first, ahead of 1 and 2 (finding 33).

### 4. The key leads with the Selected layer while nothing is selected

With the starting rows on, the first six rows of the key are "Selected" with 0.4, 1.45, a yellow
chit, 1, 2.5 and a blue chit: the Selected layer's halo and band settings, printed as if they were
encodings, while no node is selected. The key grows to 650 px. Adding a label to Key people adds
another such row, "Key people 72" (the label size).

- Evidence: `light-1440-starting/03-scene-no-selection.png`, `light-1440-starting/21-label-entry.png`
- Owner: graphty app. `LegendCard` prints every block `styles.legend()` returns. What a key shows is
  the app's choice; whether the element should also say "this layer matches nothing now" was not
  read.

### 5. At 900 x 700 the key takes the canvas

At 900 x 700 the key card is 240 px of a 365 px canvas, and the drawing is framed into the space
left over: about 60 px wide, against the right edge. The graph is effectively not visible.

- Evidence: `light-900-starting/41-draft-both.png`, `light-900-starting/21-label-entry.png`
- Owner: graphty app (the key's reserved margin and the framing that follows it). Finding 4 makes
  it worse, but a key with only real encodings would still be 400 px tall here.

### 6. The reader's app has no starting rows, and Clear names a layer nobody can see

Opened from Samples, the real app shows no Everything, Selected or Hovered rows: the stories the
owner reviewed turn `startingRows` on, and nothing in the app does. Every Clear tooltip and every
"not set" field's accessible name then names "Node defaults" or "Edge defaults" ("Clear: back to 1,
from Node defaults"), layers the tree never shows. With the starting rows on, Everything is at the
bottom of the tree but sets nothing: all its fields are placeholders deferring to the same hidden
"Node defaults".

- Evidence: `light-1440/03-scene-no-selection.png` (no starting rows), `light-1440/crops/10-clear-tooltip-right.png`, `light-1440-starting/04-everything.png`
- Owner: graphty app (`graphty/src/workspace/graph-place/StyleTree.tsx` reads
  `session.config.startingRows`; nothing in the app sets it). The owner's settled model puts
  Selected and Hovered as default layers and Everything at the bottom, so the reviewed screenshots
  show a tree a reader never meets.

### 7. Which elements appears only on layers the reader made

Key people opens with "Which elements: Named: Valjean, Javert, Cosette, Marius, 4 of 77 nodes". The
route, Connections, Communities and Bridge edges open straight onto Nodes or Edges: a run's layer
never says what it paints. Who made a layer changes what its panel shows, which the settled model
rules out.

- Evidence: `light-1440/04-route-Shortest_route_nodes_.png` against `light-1440/09-key-people.png`
- Owner: graphty app, `graphty/src/workspace/style/StylePanel.tsx` lines 149-161 (`own` gates
  `WhichElements` on `source.by === "user"`).

## Severity 2

### 8. A field's state is drawn differently by each kind of control

The design asks for two cues per state. On screen, the fill means nothing consistent: number fields
are gray-filled whether set ("24") or not ("1"); the same color field is white in a paired row
(route edges) and gray in a full row (Key people); selects are always white. "Not set" is then
shown by gray text alone in numbers and selects, and by gray italic only in color fields.

- Evidence: `light-1440/crops/route-edges-panel.png`, `light-1440/crops/09-key-people-right.png`
- Owner: compact-mantine (the input variants and the color field's default style,
  `compact-mantine/src/theme/css/color.css.ts` `.cm-paint-input[data-is-default]`), with the panel
  choosing one variant for every field.

### 9. Clear has four looks

The same command is a minus at the row's end (core rows), a minus between the two fields of a pair
(Color | Width), a minus inside the field (category rows, finding 2), and an "x" beside Look, label
Size, Scale, "Fold into Other", Background color and Highlight color. The panel's right edge no
longer lists what the layer writes.

- Evidence: `light-1440/crops/route-edges-panel.png`, `light-1440/18-label-entry.png`, `light-1440/crops/degree-ramp.png`, `light-1440-starting/44-graph-settings-style.png`
- Owner: graphty app (where the minus goes), compact-mantine (`StyleSelect` and `CompactColorInput`
  draw their own "x" reset).

### 10. "Mixed" and "MIXED" on one row, beside a swatch that is not mixed

In the draft with Both chosen, edge Color reads "MIXED" and Width reads "Mixed" side by side. The
mixed color field also draws a solid swatch (blue 6366F1 for nodes, gray for edges) next to the word.

- Evidence: `light-1440-starting/41-draft-both.png`, `light-1440/30-two-rows.png`
- Owner: compact-mantine (`.cm-paint-hex` sets `text-transform: uppercase`,
  `compact-mantine/src/theme/css/color.css.ts` line 164); graphty app for the swatch.

### 11. Paired fields are too narrow for their values

In Color | Width the color field clips its hex ("00000" with the last digit cut) and a varied
color's name ("Edge ..." for Edge betweenness), because the clear minus takes the middle of the row.

- Evidence: `light-1440/crops/route-edges-panel.png`, `light-1440/28-edge-betweenness.png`
- Owner: graphty app (row layout).

### 12. A field shrinks when it takes focus

Focusing Size brings in the vary glyph, and the field narrows from about 97 px to 58 px to make
room; the row shifts under the pointer.

- Evidence: `light-1440/crops/09-key-people-right.png` against `light-1440/crops/10-clear-tooltip-right.png`
- Owner: graphty app (`PropertyRow`). Reserve the glyph's slot at rest.

### 13. Popovers open in three different places

The vary picker opens over the inspector and covers the Size field it edits; the color binding
popovers overlap the inspector by about 40 px, cutting "Tooltip" and "Effects" to "p" and "ts";
Color settings and the label source picker open fully to the left of the panel, as the design says.

- Evidence: `light-1440/12-vary-picker.png`, `light-1440/24-degree-ramp.png`, `light-1440/crops/14-color-row-settings-right.png`
- Owner: graphty app (anchors and placement per popover); not read which use compact-mantine's
  Popout and which Mantine's own.

### 14. Glyph grids cut names and do not mark the current value

The shape grid cuts 11 of 25 names, three of them to the same "Pentago..." and three to "Elongat...";
the arrow grid cuts "Inverted...", "Open tri...", "Open di...", "Crow's f...". Neither grid marks the
value the field holds (Icosphere, Triangle).

- Evidence: `light-1440/15-shape-select-open.png`, `light-1440/29-head-select-open.png`
- Owner: compact-mantine. `StyleSelect` drops its check column in grid layout
  (`compact-mantine/src/components/StyleSelect.tsx` line 239); the app chooses four columns.

### 15. Too many left edges in the Style tab

One panel aligns to at least six edges: Which elements (x 1209), the Nodes heading (1217), list
titles (1221), the label entry's Look and Size (1221), the row gears (1229, and 1233 on entries),
and field labels and fields (1245, and 1249 on entries).

- Evidence: `light-1440/18-label-entry.png`, `light-1440/crops/09-key-people-right.png`
- Owner: graphty app.

### 16. A layer's state is the smallest text on the panel

"This layer is locked" and "Hidden: changes will not show until it is shown" are 9 px secondary
text, the same as field labels, above controls that look nearly unchanged.

- Evidence: `light-1440/34-locked.png`, `light-1440/35-hidden.png`
- Owner: graphty app (`StateLine`).

### 17. List titles have two looks

"Text" is 9 px at full strength; "Tooltip" and "Effects" are 9 px at 55% (4.76:1). "Effects" turns
full strength only while an entry is being added. The weight looks like a state, but no state
explains it.

- Evidence: `contrast.txt`, `light-1440/21-glow-picker.png` against `light-1440/22-glow-after.png`
- Owner: graphty app.

### 18. "Painted over" is a truncated word in the tree

"Connections Painted ..." and "Selected Painted ..." cut the mark itself; the whole fact is only in
a tooltip. A short name ("Selected") is cut while longer ones fit.

- Evidence: `light-1440/crops/tree.png`, `light-1440-starting/50-painted-over-hover.png`
- Owner: graphty app (`StyleTree`).

### 19. One route is two rows

The shortest route appears as "Shortest route (nodes)" and "Shortest route (edges)", two rows with
two panels, where the design has one layer that paints both.

- Evidence: `light-1440/crops/tree.png`
- Owner: graphty-element (the run makes two single-kind layers); the app only reads the tree.

### 20. A varied color shows only its value's name at rest

Degree's Color row is a pill reading "Degree". There is no ramp strip, no domain ends and, for
Louvain, no category chits, so what the layer paints is visible only by opening the popover.

- Evidence: `light-1440/23-degree.png`, `light-1440/25-louvain.png`
- Owner: graphty app.

### 21. A new label reads 72 and draws at about 6 px

The default label's Size field reads 72, and the drawn names ("Marius", "Cosette", "Valjean") are
about 6 px tall at the default framing: unreadable, and a number that does not match what is seen.

- Evidence: `light-1440-starting/crops/valjean-selected-canvas.png`, `light-1440/18-label-entry.png`
- Owner: graphty-element (label size unit and scale). Mechanism not read.

### 22. Graph settings mixes three sections and opens on Values

The "Graph settings" button opens the Graph inspector on its Values tab. On Style, the layout
controls (Method, Shape 3D | 2D, Spring length, Gravity, Advanced, Applied) follow Labels with no
heading and at a different left edge, so they read as label settings; the panel has two 3D | 2D
controls ("View" under Canvas, "Shape" under layout).

- Evidence: `light-1440/39-graph-settings.png`, `light-1440-starting/44-graph-settings-style.png`
- Owner: graphty app.

### 23. Dark theme: a black chit and the dark ramp bars disappear

In dark, the key's black "Shortest path" chit measures 1.5:1 against the card (WCAG 1.4.11 asks
3:1); in the ramp popover, mid-domain bars measure about 2.1:1 against the popover and the
darkest bars are not visible.

- Evidence: `dark-1440-starting/21-label-entry.png`, `dark-1440-starting/27-degree-ramp.png`
- Owner: graphty app (a chit outline in `LegendCard`; the histogram in `BindingPopover`).

### 24. The selection is hard to see on a yellow node

Selecting Valjean (in the yellow Louvain group) draws a yellow halo around a yellow-orange node;
it is barely distinguishable from its neighbors.

- Evidence: `light-1440-starting/crops/valjean-selected-canvas.png` against `light-1440-starting/crops/valjean-unselected-canvas.png`
- Owner: graphty-element (the starting Selected layer's look).

### 25. Unselected segments look disabled

In Which elements, "Edges" and "Both" are pale enough to read as unavailable next to the chosen
"Nodes". Known since tier 2.

- Evidence: `light-1440-starting/42-which-elements-open.png`
- Owner: compact-mantine (`SegmentedControl` theme).

### 26. Values tab: repeated headings, a blank-looking row, a histogram of ids

The route's Values tab has two "Summary" headings. "Values read" is a label with no value beside it,
so the next row ("Degree: Current") reads as its value. Louvain's tab draws a histogram of community
numbers ("0 to 5, median 3"), which measures nothing.

- Evidence: `light-1440/33-route-values.png`, `light-1440/31-degree-values.png`, `light-1440/32-louvain-values.png`
- Owner: graphty app; whether the element marks community values as categories was not read.

### 27. The ramp popover's fields have no labels

The domain fields under Palette ("1", "36") have no labels, and the "1" sits flush against its
border with no inner padding. "Change source" is plain black text with nothing marking it as a
button.

- Evidence: `light-1440/crops/degree-ramp.png`
- Owner: graphty app (`BindingPopover`); the padding may be compact-mantine's number field, not read.

## Severity 1

### 28. Paired labels sit on different lines

"Shape" sits 2 to 3 px lower than "Size" above the same row.

- Evidence: `light-1440/crops/09-key-people-right.png`
- Owner: graphty app.

### 29. Every layer row carries two glyphs

A brush on every layer row, then a kind glyph (dot, line or both); a folder puts its glyph in the
brush's column, so folder names start at a different edge from layer names.

- Evidence: `light-1440/crops/tree.png`
- Owner: graphty app.

### 30. Menus behind "+" are uneven

Add layer / Add folder has no glyphs while the Effects menu has them; the Text "+" opens a menu with
one item (Label).

- Evidence: `light-1440/36-add-menu.png`, `light-1440/16-text-menu.png`
- Owner: graphty app.

### 31. Selected at rest is ten controls for two effects

The Selected layer writes a halo and a band; its panel draws seven empty core fields and three empty
list titles around them. The design left this for the owner to judge; on screen it is noise.

- Evidence: `light-1440-starting/05-selected.png`
- Owner: owner's call on the design.

### 32. A folder's Selection colors field is out of line

It starts 8 px right of its heading and has a dark outline that reads as focus.

- Evidence: `light-1440/08-folder-selection-colors.png`
- Owner: graphty app (`SelectionColors`).

### 33. The key lists a recolored group first

"Group 3" comes before Groups 1 and 2 because it has its own entry.

- Evidence: `light-1440-starting/03-scene-no-selection.png`
- Owner: graphty app.

### 34. Which elements reads as plain text, and popovers use a larger type

The rule line ("Named: Valjean, ...") is a button with no mark at rest. Popover rows are 13 px while
the panel is 9 and 11 px, so moving from panel to popover changes the type scale.

- Evidence: `light-1440/crops/09-key-people-right.png`, `light-1440/12-vary-picker.png`
- Owner: graphty app.

## What works

- Not-set fields show the value beneath as a placeholder, and the minus tooltip names the value and
  the layer it comes from before anything is cleared.
- Added entries (label, glow) open their value picker at once, and Escape leaves nothing behind.
- The ramp popover's histogram is painted in the ramp's own colors, so the mapping is seen.
- Hidden rows gray in the tree and gray the row's own chits in the panel; locked rows show a closed
  lock that stays visible.
- The canvas stays light in dark mode, so encoding colors keep their meaning; the panels' own text
  meets 4.5:1 in both themes (field labels 4.76:1 light, 7.62:1 dark).

## Note for the next walker

Headless Chromium without `--font-render-hinting=none --disable-lcd-text` draws gaps inside words
("Bridge edg es"). The `light-1440/` pass shows it; it is not an app defect.
