# Iteration 2: visual walkthrough of the unified style panel

The Visual Designer's expert walkthrough of the second build of the unified style panel: hierarchy,
spacing, alignment, typography, color, density and polish, in light and dark. Each finding has a
severity from 0 (cosmetic, no effect) to 4 (blocks the work), the screenshot that shows it, and the
package that owns the fix. Where the mechanism was read in source, the file is named; where it was
not, the finding says so.

## What was walked

- The production build of commit 2faecd941b (graphty 0.8.68), served at https://dev.ato.ms:9373,
  where the new workspace is the default page, driven with Playwright in its own browser context
  through the studio's browser gate.
- Les Miserables, opened from Samples. The app now turns on the starting rows itself (Hovered,
  Selected and Everything), so nothing was switched on by hand. The same scene as iteration 1 was
  then added through graphty-element's session: an Annotations folder holding Key people (Valjean,
  Javert, Cosette, Marius in orange), Degree, Edge betweenness, Louvain with community 3 recolored
  green, and a shortest route from Myriel to Marius. Every screen after that was reached by clicks
  and typing.
- Three passes: light at 1440 x 900, dark at 1440 x 900, light at 900 x 700. Each pass is 51
  screens. Computed text colors and field styles were read from the page.

Screenshots are under `design/ui/studio/tier3/build/i2-visual/` (written locally, not committed):

| Folder         | What it holds                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `light-1440/`  | light, 1440 x 900; `crops/` holds enlarged details; `log.txt` the accessibility tree of each panel and the computed field styles |
| `dark-1440/`   | the same screens, dark                                                                                                           |
| `light-900/`   | the same screens, light, 900 x 700                                                                                               |
| `contrast.txt` | computed color, size and weight of the panel's text kinds, both themes                                                           |

Paths below are relative to that folder. The screen numbers are the same in all three passes.

## Summary

28 findings: 2 at severity 3, 14 at severity 2, 12 at severity 1. Nothing blocks a task.

Iteration 2 fixed most of what iteration 1 found. Of iteration 1's 7 severity 3 findings, 5 are
gone: Label settings scrolls, the Louvain rows show their names and counts, the key no longer
prints the Selected layer's settings, the reader's app has the starting rows, and Which elements is
on every layer. The other 2 shrank: at 900 x 700 the drawing is visible but the key cuts off its
last block, and one community now has two names rather than three. The route is one row, the state
lines are readable, list titles have one look, and the dark theme's chits and ramp bars are visible.

Two things a reader meets on an ordinary path still mislead:

1. The route's Which elements prints a raw query with backticks.
2. The Values tab numbers communities by raw value while the key, popover and node inspector say
   "Group N".

The largest group of severity 2 findings is no longer Clear. It is size and rhythm. Every pair of
fields now stacks, one field to a row, with its label above it, so the panel is longer than in
iteration 1. Fields come in five widths, and the not-set look still differs between number fields
and the rest.

## Severity 3

### 1. The route's Which elements is a raw query

The Shortest route layer's Which elements reads "Nodes and edges where
results.shortest_path.onPath == `true`": an internal path, an operator and backticks, on the
panel a reader opens straight after Find path. The other run layers read in words ("Nodes where
Connections has a value").

- Evidence: `light-1440/crops/07-route-which.png`, `light-1440/07-route-Shortest_route.png`
- Owner: graphty-element first. The route layer's rule reaches the app as an expression, not as a
  rule the element describes, and the app prints an expression as it is
  (`graphty/src/workspace/style/whichRule.ts` line 277). Iteration 2's decision was that every run
  layer's rule is readable and editable. Which side turns the route into an expression was not
  read.

### 2. One community still has two names

The key, the Louvain popover and the node inspector now agree: the light blue community is
"Group 2". The Communities layer's Values tab still lists the raw values in size order, "1, 5, 3,
4, 2, 0", so the same light blue group is "5" there and "Group 2" everywhere else.

- Evidence: `light-1440/34-louvain-values.png` against `light-1440/28-louvain-popover.png` and
  `light-1440/03-scene-no-selection.png`
- Owner: graphty app (the Values tab's group list). One name per group, on every surface.

## Severity 2

### 3. The panel got longer: every pair now stacks

The panel no longer pairs fields (Shape | Size, Color | Width). Every field is a row of its own
with its label above it, about 48 px per field. Everything's Nodes and Edges sections are 510 px
for 7 fields and 4 list titles. Selected's panel is 760 px and runs past the window at 900 x 700.
This is the owner's open question on panel length. Figma's right panel keeps paired values on one
row (W and H, X and Y) with the label inside or beside the field.

- Evidence: `light-1440/04-everything.png`, `light-1440/crops/04-everything-nodes.png`, `light-900/05-selected.png`
- Owner: graphty app (`PropertyRow` wraps a pair when both fields cannot fit whole). At 240 px,
  with three reserved 24 px columns (settings, vary, Clear), they never fit, so the wrap is the
  only layout anyone sees.

### 4. Five field widths and six left edges in one tab

Within one Style tab, fields are 125 px (property rows), 196 px (a label's Look), 70 px (a label's
Size), 182 px (a folder's Selection colors) and 34 px (an effect's color). Graph settings uses
full-width 200 px fields. The left edges are those of iteration 1: Which elements (x 1209), the
section heading (1217), list titles and the label's Look (1221), settings gears (1229, 1233 on
entries), and fields (1243, 1249 on entries).

- Evidence: `light-1440/20-label-entry.png`, `light-1440/crops/20-label-rows.png`, `light-1440/11-folder-selection-colors.png`, `light-1440/44-graph-settings-style.png`
- Owner: graphty app.

### 5. An effect row cuts its own color down to two characters

Effect entries (Glow, Halo, Band) give their color field what is left after a 44 px name, the
vary glyph, the eye and the minus: about 34 px, so the value reads "FF" or "11". While an entry is
being added the same field is 120 px wide, because the eye and minus are not drawn yet, so the
field shrinks when the entry is committed. In dark, Halo's and Band's black chit has no outline
and nearly disappears against the field.

- Evidence: `light-1440/crops/05-selected-panel.png`, `light-1440/23-glow-picker.png`, `dark-1440/crops/05-effects.png`
- Owner: graphty app (`graphty/src/workspace/style/Effects.tsx`, the entry row around line 426).
  The chit outline is compact-mantine's color input, not read.

### 6. A category's Clear pushes its count and eye out of line

In the Louvain popover the recolored Group 3 row gets a "Back to the palette" minus, and its count
and eye move 27 px left of every other row's ("Group 3 11" against "Group 1 ... 20").

- Evidence: `light-1440/crops/28-cat-rows.png`, `dark-1440/crops/28-louvain.png`
- Owner: graphty app. `ValueRow` in `graphty/src/workspace/style/BindingPopover.tsx` (around line 807) renders the minus only when there is something to clear and reserves no column for it. The
  property rows reserve their Clear column, and these rows should do the same.

### 7. The not-set look still depends on the control

Selects and color fields show a not-set value in gray italic ("Icosphere", "6366F1"). The panel's
number fields show it in gray upright ("1", "8"). Label settings' and Graph settings' number fields
are italic ("Default", "10", "-12"). Label settings' text fields are upright ("Default" under Icon).
Number fields are also drawn with a gray fill and selects without one, set or not. "Mixed" is now
spelled one way.

- Evidence: `light-1440/crops/04-everything-nodes.png`, `light-1440/21-label-settings.png`, `light-1440/46-label-settings-end.png`, `light-1440/44-graph-settings-style.png`, field styles in `light-1440/log.txt` ("FIELDSTYLES")
- Owner: compact-mantine (the number input's placeholder style and fill), with the panel using one
  field variant everywhere.

### 8. Reset is still an "x" in popovers and Graph settings

The Style tab now clears with one minus at the row's end. The color popovers still reset Scale and
"More values than colors" with an "x". Graph settings resets Background color and Highlight color
with an "x". A category resets with a minus in the middle of its row (finding 6).

- Evidence: `light-1440/26-degree-ramp.png`, `light-1440/28-louvain-popover.png`, `light-1440/44-graph-settings-style.png`
- Owner: compact-mantine (`StyleSelect` and `CompactColorInput` draw their own reset), graphty app
  for where the minus goes.

### 9. A mixed color shows one solid swatch

With Key people (orange) and Connections (a Degree ramp) both selected, Color reads "Mixed" beside
a solid blue 6366F1 swatch, a color neither layer paints. The same happens on Selected, Hovered and
the draft with Both chosen (blue for nodes, gray for edges).

- Evidence: `light-1440/32-two-rows.png`, `light-1440/05-selected.png`
- Owner: graphty app (the swatch it passes for a mixed value), or compact-mantine if the input
  cannot draw a mixed swatch. Not read which.

### 10. Clear still names a layer the tree does not show

The starting rows are on, but Everything sets nothing, so every not-set value still comes from
"Node defaults" or "Edge defaults". Clear's tooltip reads "Clear: back to 1, from Node defaults",
and the accessible names say "Node defaults gives Icosphere". Neither row appears in the tree.

- Evidence: `light-1440/13-clear-tooltip.png`, `light-1440/04-everything.png`
- Owner: graphty app (words naming the hidden defaults rows); whether Everything should hold the
  defaults is the settled model's "Everything at the bottom", not read further.

### 11. One value has three or four names on one panel

Bridge edges' panel calls its value "Bridging" in Which elements and "Edge betweenness" on the
Color pill; the key says "Edge color: Edge betweenness". Connections' value is "Connections" in
Which elements and "Degree" on the pill and in the key. Communities' value is "Community" in Which
elements, "Louvain" on the pill and the key, and "Groups" in Values.

- Evidence: `light-1440/crops/30-eb-names.png`, `light-1440/25-degree.png`, `light-1440/27-louvain.png`
- Owner: not read. The words come from graphty-element's catalog names for a result (readable
  values and algorithm names) and from the app's sentences. One value should have one name on every
  surface.

### 12. A varied color still shows only its value's name at rest

Degree's Color row is a chit and "Degree". The ramp, its ends and Louvain's group chits are seen
only by opening the popover. The chit is a 12 px gradient square, too small to read as a ramp.

- Evidence: `light-1440/25-degree.png`, `light-1440/27-louvain.png`
- Owner: graphty app.

### 13. New labels draw at about 4 px

A new label reads Size 48, and the four drawn names ("Valjean", "Cosette", "Javert", "Marius") are
about 4 px tall at the default framing. They are unreadable, and the number in the field does not
match what is drawn. This is unchanged from iteration 1, where the number was 72.

- Evidence: `light-1440/crops/20-labels-canvas.png`, `light-1440/20-label-entry.png`
- Owner: graphty-element (label size unit and scale). Mechanism not read.

### 14. The selection ring disappears on a black node

The Selected layer now draws a dark ring that shows clearly on palette colors (Fantine, orange).
On the route's black nodes it is black on black: selecting Valjean changes almost nothing.
The route is the step most likely to come just before a reader selects a node.

- Evidence: `light-1440/crops/50-fantine.png` against `light-1440/crops/47-fantine-before.png`; `light-1440/crops/48-valjean.png`
- Owner: graphty-element (the starting Selected layer's look). A ring with a light inner edge, or
  one that picks its own contrast, is the element's to choose.

### 15. At 900 x 700 the key cuts its last block and the ramp covers the drawing

The key is now capped, and the drawing is visible, but the cap cuts "Edge color: Edge betweenness"
at its bottom edge and its ramp is not shown, with no mark that the card scrolls. The ramp popover
is 375 px wide (the iteration decided 240). At 900 x 700 it covers the whole canvas and the tree's
edge, so a reader cannot see a palette change while making it.

- Evidence: `light-900/03-scene-no-selection.png`, `light-900/26-degree-ramp.png`
- Owner: graphty app (the key's cap; the popover's width).

### 16. A new layer's kind control looks disabled

With nothing selected, a draft opens with no segment of Nodes | Edges | Both chosen, so all three
are the same pale gray and the control reads as unavailable. Once one is chosen it is white with a
dark border. "Add condition" is a centered text button with a "+", unlike every other add, which is
a "+" at the right edge.

- Evidence: `light-1440/40-draft.png`, `light-1440/41-draft-both.png`
- Owner: compact-mantine (`SegmentedControl`'s unselected look, known since tier 2), graphty app for
  the add button.

## Severity 1

### 17. Grids mark the current value with a dashed box

The shape and arrow grids now show whole names and mark the current value, but with a dashed
outline that reads as keyboard focus, not "chosen".

- Evidence: `light-1440/17-shape-select-open.png`, `light-1440/31-head-select-open.png`
- Owner: compact-mantine (`StyleSelect` grid layout).

### 18. The painted-over mark looks like the vary glyph

"Painted ..." is now an icon, so nothing is cut. But the icon is two linked squares, close to the
chain link the panel uses for "vary by". Its meaning ("Painted over by Communities and Shortest
route") is in its accessible name. A hover tooltip was not seen in this walk.

- Evidence: `light-1440/crops/09-tree.png`, `light-1440/log.txt` ("ROWBTNS")
- Owner: graphty app (`StyleTree`).

### 19. Kind glyphs have two strengths

The node glyph (a ringed dot) is drawn darker than the both-kinds glyph (dot and line), so Selected,
Shortest route and Everything look dimmed next to Hovered and Communities.

- Evidence: `light-1440/03-scene-no-selection.png`
- Owner: graphty app.

### 20. Label and Tooltip share one glyph

The Text "+" menu now holds Label and Tooltip, both drawn with the same "Aa".

- Evidence: `light-1440/18-text-menu.png`
- Owner: graphty app.

### 21. An inherited label shows as a caption with a live eye

Connections, which writes no label, lists "Label, from Key people" under Text in 9 px gray, with a
full-strength eye. The row reads as a disabled caption but has a working control.

- Evidence: `light-1440/36-row-menu.png`, `light-1440/39-add-menu.png`
- Owner: graphty app. Purpose of the eye here not read.

### 22. Which elements reads as plain text, and popovers use a larger type

The rule line ("Named: Valjean, ...") is a button with no mark at rest. Popover rows are 13 px
while the panel is 9 and 11 px.

- Evidence: `light-1440/12-key-people.png`, `light-1440/15-vary-picker.png`
- Owner: graphty app.

### 23. Label settings: one long column, two label sizes, over the header

Label settings scrolls now, but it starts at the window's top and covers the app header. "Text
color", "Background" and "Border color" are 11 px labels while "Font" and "Padding" are 9 px.
Four margins and other paired values each take a row.

- Evidence: `light-1440/21-label-settings.png`, `light-1440/45-label-settings-mid.png`
- Owner: graphty app (`LabelSection` fields); compact-mantine for the color field's label size.

### 24. Graph settings mixes two label styles

Sections and headings are fixed. Within Canvas, "Background", "View" and "Lighting" are 9 px dark
labels, while "Background color" and "Highlight color" are 11 px gray.

- Evidence: `light-1440/44-graph-settings-style.png`
- Owner: compact-mantine (the color input's own label), graphty app.

### 25. A folder's Selection colors field is out of line

It starts 9 px right of its heading, is 182 px wide, and has a dark outline that reads as focus.

- Evidence: `light-1440/11-folder-selection-colors.png`
- Owner: graphty app (`SelectionColors`).

### 26. "Fix at #B84203"

The popovers end with a full-width outlined button whose label is a raw hex. It has the strongest
border in the popover and says nothing a reader can see before pressing it.

- Evidence: `light-1440/26-degree-ramp.png`, `light-1440/28-louvain-popover.png`
- Owner: graphty app (words are the content designer's).

### 27. Two histograms of one value

The Values tab draws Degree's histogram in gray. The color popover draws the same histogram in
the ramp's colors.

- Evidence: `light-1440/33-degree-values.png` against `light-1440/26-degree-ramp.png`
- Owner: graphty app.

### 28. A bound pill narrows when its popover opens

Opening Degree's popover brings in a detach glyph beside the pill, and the pill narrows from 125 px
to about 97 px.

- Evidence: `light-1440/25-degree.png` against `light-1440/26-degree-ramp.png`
- Owner: graphty app (`PropertyRow`).

## Against the owner's three questions, as seen on screen

1. **Unsetting.** In the Style tab, Clear is now one minus at the end of a set row, with the value
   that comes back in its tooltip. The remaining inconsistency is outside the tab (the "x" in
   popovers and Graph settings, finding 8). Within the tab, the not-set look still differs by
   control (finding 7), and the tooltip names a hidden row (finding 10).
2. **No split parent.** No new row type was seen. Communities is an ordinary layer with ordinary
   controls, and its per-group colors are rows inside its binding. The tree has only layers and
   folders.
3. **Figma.** The build matches Figma in its dark menus and dropdowns, light popovers beside the
   panel, a minus at rest on list entries, an eye per entry, and "Select what it paints". It parts
   from Figma in one place that costs height: Figma pairs values on one row and puts the label
   beside or inside the field, while this build stacks every field under its own label (finding 3).

## What works

- Every popover the panel opens for editing a value (the vary picker, the color from data and Label
  settings) now opens beside the panel at its row's height. The vary glyph is drawn at rest in a
  column of its own, so a property row does not change width on focus.
- The ramp popover's histogram is in the ramp's colors, has labeled ends and labeled range fields,
  and its bars are visible in dark.
- The canvas key shows only real encodings, in group order, and in dark the black chit has a light
  outline.
- Locked and hidden states are stated at 11 px full strength with their glyph, above a dimmed panel.
- Graph settings opens on Style, in three headed sections.
- Every layer, including a run's, opens with Which elements and its count.
- The panel's text meets 4.5:1 in both themes (field labels 4.76:1 light, 7.62:1 dark).
