# Iteration 3: visual walkthrough of the unified style panel

The Visual Designer's expert walkthrough of the third build of the unified style panel: hierarchy,
spacing, alignment, typography, color, density and polish, in light and dark. Each finding has a
severity from 0 (cosmetic, no effect) to 4 (blocks the work), the screenshot that shows it, and the
package that owns the fix. Where the mechanism was read in source, the file is named; where it was
not, the finding says so.

## What was walked

- The production build of commit 617b43b270 (graphty 0.8.68), served at https://dev.ato.ms:9373,
  where the new workspace is the default page, driven with Playwright in its own browser context
  through the studio's browser gate.
- Les Miserables, opened from Samples, with the app's own starting rows (Hovered, Selected,
  Everything). The same scene as iterations 1 and 2 was then added through graphty-element's
  session: an Annotations folder holding Key people (Valjean, Javert, Cosette, Marius in orange,
  size 2), Degree, Edge betweenness, Louvain with community 3 recolored green, and a shortest route
  from Myriel to Marius. Every screen after that was reached by clicks and typing.
- Three passes: light at 1440 x 900, dark at 1440 x 900, light at 900 x 700, 51 screens each.
  Computed field styles and text contrast were read from the page.

Screenshots are under `design/ui/studio/tier3/build/i3-visual/` (written locally, not committed):

| Folder         | What it holds                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `light-1440/`  | light, 1440 x 900; `crops/` holds enlarged details; `log.txt` the accessibility tree of each panel and the computed field styles |
| `dark-1440/`   | the same screens, dark; `crops/`                                                                                                 |
| `light-900/`   | the same screens, light, 900 x 700                                                                                               |
| `contrast.txt` | computed color, size and weight of the panel's text kinds, both themes                                                           |

Paths below are relative to that folder. The screen numbers are the same in all three passes.

## Summary

25 findings: 1 at severity 3, 10 at severity 2, 13 at severity 1, 1 at severity 0. Nothing blocks a
task.

Iteration 3 fixed both of iteration 2's severity 3 findings: the route's Which elements reads
"Nodes and edges on the route", and the Values tab names Louvain's groups "Group 1" to "Group 6" as
the key does. Most of the severity 2 list is gone too: every not-set value in the Style tab is gray
italic, Clear is one minus everywhere including the popovers and Graph settings, effect rows are a
chip and a name, category rows line up, "Mixed" has no swatch, Clear's tooltip says "the default"
instead of naming a hidden row, new labels draw at a readable size, the ramp popover is 240 px and
ends in a quiet "Use one color", a new layer starts with Nodes chosen, and the pill keeps its width.

The panel is also much shorter. At 900 x 700, Selected (two node effects, one edge effect) ends at
655 px and the route at about 580 px; neither scrolls.

The one severity 3 is new and comes from that shortening: the one-line rows put the settings gear
inside the label column, so on every layer "Shape", "Color" and "Head" read "Sh...", "Co..." and
"He...", and a painted-over Color reads "C.". The row's name is the first thing a reader looks for.

The severity 2 findings are mostly about a value that says one thing while the canvas shows
another: a painted-over color shown at full strength, "Varies" beside a solid swatch, a default
font that is not the one drawn, a default arrow head on a graph that draws none, a dark "None"
swatch that is white, and a label size whose Clear goes to a different unit.

## Severity 3

### 1. Property names are cut on every layer

Each property row is now one line: name, settings gear, field, vary link, Clear. The gear sits in
the name's column, so the name gets about 30 px. "Size", "Width" and "Tail" fit; "Shape", "Color"
and "Head" become "Sh...", "Co..." and "He..." on every layer, light and dark, at every window
size. When the row is painted over, its mark takes the same column and Color shrinks to "C.". On
Communities the row reads "C. [chip] Comm...", with both the name and the value cut. Effect and
label entries put their gear at the right, after the field (x 1349), so the panel has two gear
columns as well.

- Evidence: `light-1440/crops/04-everything-panel.png`, `light-1440/crops/12-key-people.png`,
  `light-1440/28-louvain-popover.png`, `dark-1440/crops/05-panel.png`
- Owner: graphty app. `graphty/src/workspace/style/PropertyRow.tsx` (line 157: "What the label
  column holds after the name: the row's settings button"). One path: the gear joins the right-hand
  columns, as effect and label entries already place it, which gives the name the 24 px back and
  leaves one gear column on the panel.

## Severity 2

### 2. A painted-over value looks fully set

Key people's Color shows E8590C in full-strength text with a solid orange swatch and "set here".
All four of its nodes are drawn in their community colors, because Communities and Shortest route
paint over them ("on 4 of 4 nodes"). The only sign is a 12 px gray glyph squeezed into the name
column, and it has no tooltip on hover; its meaning is in the accessible name only. The row's most
visible part, the orange, is the one thing the canvas does not show.

- Evidence: `light-1440/crops/12-key-people.png` against `light-1440/03-scene-no-selection.png`;
  `light-1440/log.txt` ("Painted over by Shortest route and Communities on 4 of 4 nodes");
  `light-1440/crops/51-tip.png` (the tree's mark, hovered, no tooltip)
- Owner: graphty app.

### 3. "Varies" keeps a solid swatch

"Mixed" lost its swatch. "Varies", the word for a value that differs beneath, kept one: a new
layer's node color reads "Varies" beside a solid orange-yellow square, and its edge color "Varies"
beside a solid orange square. Neither color is what the layers beneath paint across the layer's
elements.

- Evidence: `light-1440/41-draft-both.png`, `dark-1440/41-draft-both.png`
- Owner: graphty app (the swatch it passes for a varied value), or compact-mantine if the color
  input cannot draw no swatch. Not read which.

### 4. The default label font is not the one drawn

Label settings says the font is "Verdana" (gray italic, the default). On this machine, which has
no Verdana, the four names are drawn in a serif face, unlike every other text in the app. The
element's default font is the bare name "Verdana" with no generic fallback, while its own named
label looks already say "Verdana, sans-serif".

- Evidence: `light-1440/crops/20-labels-canvas.png`, `light-1440/21-label-settings.png`
- Owner: graphty-element (`src/config/RichTextStyle.ts` line 68 and `src/meshes/RichTextLabel.ts`
  line 205, against `src/catalog/label-looks.ts` line 39). Changing the default string is a default
  change, so the element decides whether it counts as breaking; the app may meanwhile set a font
  with a fallback as its own choice when it adds a label.

### 5. A label's size has two units in one field

A new label reads Size 12 (screen pixels) and draws readable. Its Clear says "Clear: back to 48,
the default": the default beneath is the old world size, which iterations 1 and 2 saw draw about 4
px tall. One field, two units, and Clear lands on the unreadable one.

- Evidence: `light-1440/log.txt` ("ARIA label": "Node label size, set here, 12", "Clear: back to
  48, the default"), `light-1440/20-label-entry.png`
- Owner: graphty app (it adds labels in screen pixels over a default in world size); whether the
  default beneath should follow the unit is graphty-element's. Clear itself was not pressed.

### 6. In dark, "None" draws a white swatch

Label settings' Background and Outline read "None" beside a solid white square in dark, which reads
as white. In light the same square is white with a gray edge and reads as empty.

- Evidence: `dark-1440/crops/21-none.png`, `dark-1440/21-label-settings.png`
- Owner: compact-mantine (the color input's empty swatch). Figma draws no fill as an empty square
  with a slash or checkerboard in both themes.

### 7. Two layouts for one kind of field

The Style tab now draws one line per property, name on the left. Graph settings and Label settings
still put the name above a full-width field ("Background color", "Lighting", "Text color", "Font"),
so the same kind of value has two shapes and two widths. The new layer's Which elements block also
starts 8 px left of every other block (x 1209 against 1217), with full-width fields.

- Evidence: `light-1440/44-graph-settings-style.png`, `light-1440/21-label-settings.png`,
  `light-1440/41-draft-both.png`
- Owner: graphty app. Iteration 3's plan named one gutter and one field column across all four.

### 8. The node inspector still uses the run's names

The tree, the rule, the pill and the vary picker call Degree's value "Connections" and Louvain's
"Community". Selecting Fantine shows "Degree 15" under Summary, "Degree 15, #6 of 77" under
Results, and "Louvain: Group 5" under Memberships.

- Evidence: `light-1440/50-fantine-selected.png` against `light-1440/25-degree.png`
- Owner: graphty app (the node inspector).

### 9. The selection ring still barely shows on the route's hub

Selected now draws a gray halo and a black glow. On Fantine (orange) it is a visible mid-gray ring,
though gray reads as "dimmed" more than "chosen". On Valjean, a black route node in a dense hub at
size 1, selecting changes almost nothing: the halo is lost under the edges and the "Valjean" label.

- Evidence: `light-1440/crops/48-valjean.png` against `light-1440/crops/47-valjean-before.png`;
  `light-1440/crops/50-fantine.png`
- Owner: graphty-element (the starting Selected look).

### 10. Arrow head says "Triangle" on a graph that draws none

Les Miserables is undirected and its edges are drawn with no arrow heads. Every layer's Head field
reads "Triangle" in the not-set look, which says a triangle is what comes back.

- Evidence: `light-1440/crops/04-everything-panel.png`, `light-1440/crops/20-labels-canvas.png`,
  `light-1440/03-scene-no-selection.png` (the Values tab: "Undirected, from the file")
- Owner: not read. Either graphty-element's answer for what lies beneath should say no head on an
  undirected graph, or the app should not show the head row there.

### 11. At 900 x 700 the color popovers cover the drawing

The ramp and category popovers are 240 px wide as decided, but at 900 x 700 the drawing is about
360 px wide, and both popovers cover most of it, so a reader cannot see a palette change while
making it. At 1440 x 900 the category popover hides the right-hand cluster.

- Evidence: `light-900/26-degree-ramp.png`, `light-900/28-louvain-popover.png`,
  `light-1440/28-louvain-popover.png`
- Owner: graphty app (popover placement; the drawing's framing does not move aside).

## Severity 1

### 12. Two swatch sizes for one idea

A color is a 12 px square in a property field, the key and the Values tab, and a 24 px chip in
effect, category and folder rows. Side by side on Selected the two sizes read as two kinds of
thing.

- Evidence: `light-1440/05-selected.png`
- Owner: graphty app.

### 13. Grids mark the current value with a stray check

The shape and arrow grids mark the current value with a thin check in the gap at the cell's top
left, which reads as stray, not as "chosen".

- Evidence: `light-1440/crops/17-check.png`, `light-1440/31-head-select-open.png`
- Owner: compact-mantine (`StyleSelect` grid layout).

### 14. A new label's count lags

Right after a label is added, its count reads "0 labels, 0 hidden" while four names are drawn. A
moment later it reads "4 labels, 0 hidden".

- Evidence: `light-1440/20-label-entry.png` against `light-1440/23-glow-picker.png`
- Owner: graphty app (when it reads the count). Not read.

### 15. Label entries have their own field look and edge

The label's source ("name") is a 54 px field with a pale outline, unlike every other field. Look,
Size and Position start their fields 4 px right of the property rows above them.

- Evidence: `light-1440/crops/20-label-rows.png`
- Owner: graphty app.

### 16. The vary picker cuts names and mixes number formats

"Percentile of Co..." is cut in a 240 px list. Ranges read "1 to 36", "1 to 61" and "0.2208 to 1"
in one column.

- Evidence: `light-1440/15-vary-picker.png`
- Owner: graphty app.

### 17. An inherited label is a caption with a live eye

Layers that write no label list "Label, from Key people" under Text in gray, with a full-strength
eye. Unchanged since iteration 2.

- Evidence: `light-1440/25-degree.png`, `light-1440/49-selected-with-selection.png`
- Owner: graphty app.

### 18. The tree's painted-over mark has no tooltip

The mark is now two rings, not a link, so it no longer looks like the vary glyph. Hovering it shows
nothing; what it means is in its accessible name only.

- Evidence: `light-1440/crops/51-tip.png`, `light-1440/log.txt` ("ROWBTNS")
- Owner: graphty app (`StyleTree`).

### 19. At 900 x 700 the key's chevron covers its last heading

The key now marks that it scrolls, but the chevron sits over "Edge color: Bridge edges", which is
cut in half under it.

- Evidence: `light-900/03-scene-no-selection.png`
- Owner: graphty app.

### 20. Two layers selected show one layer's label and color

With Key people and Connections selected, the panel lists a "name" label entry and one orange
Selection colors chip, both Key people's only, with no "Mixed".

- Evidence: `light-1440/32-two-rows.png`
- Owner: graphty app.

### 21. The ramp's range fields are gray-filled

"Values from" and "Values to" are the only fields on the panel or its popovers with a gray fill,
set or not.

- Evidence: `light-1440/26-degree-ramp.png`
- Owner: compact-mantine or graphty app; not read which.

### 22. Key and pill name a value by different words

The key titles its blocks by layer ("Color: Communities", "Edge color: Bridge edges") while the
pill and rule name the value ("Community", "Bridging"). Each is defensible; together a reader sees
two names for one encoding.

- Evidence: `light-1440/30-edge-betweenness.png`
- Owner: graphty app (words are the content designer's).

### 23. Graph settings' Advanced caret sits outside the gutter

The "Advanced" expander's caret is at x 1209, left of the 1217 edge everything else uses. The
tree's folder caret also hangs left of the glyph column.

- Evidence: `light-1440/44-graph-settings-style.png`, `light-1440/crops/09-tree.png`
- Owner: graphty app.

### 24. Dark: the black glow chip is near the panel color

Selected's Glow chip is black on the dark panel. It has a faint edge and is visible, but it is the
weakest mark on the row.

- Evidence: `dark-1440/crops/05-panel.png`
- Owner: compact-mantine (chip outline in dark).

## Severity 0

### 25. Popover text buttons are indented

"One color per value" and "Use one color: orange" start 8 px right of the popover's content edge
(their button padding).

- Evidence: `light-1440/26-degree-ramp.png`, `light-1440/28-louvain-popover.png`
- Owner: compact-mantine (subtle button padding) or graphty app.

## Against the owner's three questions, as seen on screen

1. **Unsetting.** In the Style tab, popovers and Graph settings, Clear is one minus at the end of
   a set row, and its tooltip says what comes back ("back to 1, the default", "back to blue, the
   default"). Every not-set value is gray italic. What still makes "what comes back" untrustworthy
   is a few values that name something the canvas does not draw: a Head of "Triangle" on an
   undirected graph (finding 10), a font of "Verdana" drawn in serif (4), a label size whose Clear
   lands in another unit (5), and "Varies" beside a solid swatch (3). A field painted over by a
   layer above now says so, but too quietly (2).
2. **No split parent.** No new row type was seen. The tree has layers and folders only.
   Communities is an ordinary layer whose color varies by Community; each group is a row inside its
   color popover, with its own eye, Clear and "New layer for Group 3".
3. **Figma.** The build now matches Figma's right panel in more places: one line per property with
   the name at the left, effect rows as a chip, name, settings, eye and minus, dark grid pickers and
   menus, a row menu grouped by dividers with Hide and Lock, and a quiet text action at a popover's
   end. Where it parts from Figma it costs legibility: Figma keeps a property's name whole and puts
   a row's settings at its right end, while this build puts the gear in the name's column
   (finding 1). Figma draws "no fill" as an empty slashed square in both themes (finding 6).

## What works

- The route's Which elements reads in words, and the Values tab names groups as the key does.
- Panels fit: at 900 x 700 Selected, the route, Key people with a label, and Communities all fit
  without scrolling.
- One not-set look (gray italic) and one Clear (minus) across the panel; computed styles agree.
- Effect rows show a 24 px chip and a whole name; category rows line up with a reserved Clear
  column.
- The vary chip shows the ramp or the palette at rest; the pill keeps its width when its popover
  opens.
- New labels draw readable at the default framing.
- Label settings opens below the header, pairs its fields two to a row, and scrolls.
- The ramp popover's histogram, the Values tab's histogram and the key's ramp use the same colors.
- Kind glyphs share one strength; the painted-over glyph no longer looks like the vary link.
- A new layer starts with Nodes chosen, and "+" at the title's right adds a condition.
- The panel's text meets 4.5:1 in both themes (field labels 4.76:1 light, 7.62:1 dark).
