# Iteration 3: the style panel walked as a Figma product designer

An expert walkthrough of the third build of the unified style panel (the layer tree on the left,
the Style tab on the right), judged against how Figma's right sidebar solves the same control
problems: controls, menus, cardinality, density and consistency. Severity runs from 0 (not a
problem) to 4 (blocks the work). Each finding names its screenshot and the package that owns the
fix; where the cause was read in source, the file is named.

## What was walked

- The production build served at https://dev.ato.ms:9373, build stamp `617b43b270eb`
  (graphty 0.8.68, the branch head). Driven with Playwright in its own browser context through
  the studio's browser gate, at 1440 x 900 and then 900 x 700, device scale 2, dark theme.
- Les Miserables from Samples, laid out as a circle in 2D, with the same scene as iterations 1
  and 2, built through graphty-element's session: an Annotations folder holding Key people (four
  characters in orange, size 2), Degree, Edge betweenness, Louvain with community 3 recolored
  green, and a route from Myriel to Marius. The app turned on the starting rows (Everything,
  Selected, Hovered) and top placement by itself. Everything after that was clicks, keys and
  hovers.
- Screenshots (local, not committed): `design/ui/studio/tier3/build/figma-i3/`. Names below are
  relative to that folder. The driver and its four step files are in `tmp/figma-i3/` of this
  worktree (`walk.mjs`, `s1.mjs` to `s4.mjs`, with their logs).

## Summary

21 findings: 1 at severity 3, 13 at severity 2, 7 at severity 1. Of iteration 2's 24 findings, 15
are fixed, 6 are partly fixed and 3 were not reached or are still open (listed at the end).
Iteration 2's severity 4 (changing a layer's kind destroyed it) is fixed: the layer keeps its
name, place and id, and the change is announced.

The panel now has Figma's density: one line per property, and the Selected layer and the route
both fit 900 x 700 without scrolling (`s2-43-small-selected.png`, `s2-44-small-route.png`). Undo
after Clear works and says what it undid. Effect rows are Figma's (chip, name, settings, eye,
minus), category rows keep their columns, "Mixed" appears only for a multi-selection and has no
swatch, a painted-over field names the layers above and how many elements they cover, the route
reads "Nodes and edges on the route", and a new layer lands above the selected row with its kind
chosen. The price of the one-line row is paid in its label column: the property names are cut to
one or two letters on every layer, and that is the one severity 3 left.

## Severity 3

1. **Property names are cut to one or two letters.** The label column is 56 px and holds the
   name, the painted-over mark and the settings gear (`graphty/src/workspace/style/style.css`
   line 20, `--ws-label: 56px`, and `.ws-field-label`). A row with a gear leaves the name about 26
   px: "Sh..." for Shape, "Co..." for Color, "He..." for Head, and "C." when the painted-over mark
   is also there (Key people, Connections, Communities). Measured in the page: Shape 26 of 33 px,
   Color 12 of 29 px. The full name is only in a native `title`, which no hover in the walk
   brought up. It happens at rest on every layer, at 1440 x 900 and 900 x 700. Figma never
   truncates a property name: it names a section by its title (Fill, Stroke), names a field by an
   icon or letter inside it (W, H, X), and puts a section's extra settings at the right end of the
   row (Stroke's advanced-settings button). This build already puts the gear after the field on
   every entry row (Label, Glow, Halo, Band), so the panel has two gear positions. Proposal: move
   the property gear to the right of the field, the column entry rows already use, and the
   painted-over mark into the field (or onto the name as a color plus the tooltip); the 56 px
   column then holds every name whole. This is what the owner will judge first when asked
   whether one-line rows read as Figma's. Owner: graphty app (`PropertyRow.tsx`, `style.css`).
   Evidence: `s2-13-key-tab-crop.png`, `s2-09-connections.png`, `s1-04-selected.png`.

## Severity 2

2. **Changing the kind keeps the layer but drops what it painted.** Connections changed from
   Nodes to Edges keeps its row, name and place and announces "Connections now paints edges"
   (fixed from iteration 2's severity 4), but its color binding is gone, every edge field is
   empty, so it paints nothing, and its rule still reads "Where a value: Connections has a v..."
   over edges while counting 254 of 254 edges. The decided rewrite was "edges touching those
   nodes". The announcement says the layer paints edges; it paints none. Undo restores it. Owner:
   graphty-element (the rule rewrite, and carrying a binding to the other kind where the channel
   exists, edge color here), graphty app for the sentence. Evidence: `s4-01-connections-to-edges.png`.

3. **Opacity left the color row.** The decision for this iteration kept the inline percent for a
   fixed opacity and moved only "vary opacity" into the color row's settings. In the build the
   percent is gone from the row and the color gear opens a popover holding one field, Opacity
   (`s2-20-color-settings.png`). Figma keeps opacity inline in every fill row; a popover for one
   field is a click spent for nothing. Owner: graphty app (`PropertyRow.tsx`).

4. **Size's setting lives under Shape.** Size has no gear of its own, so "Size combines" sits in
   the Shape settings popover, under Wireframe and Show (`s2-19-shape-settings.png`). A reader
   looking for how sizes combine opens Size's row and finds nothing. The same popover mixes row
   grammars: "Wirefra..." is cut in a left label, "Size combines" is a caption over a full-width
   field. Owner: graphty app.

5. **An entry from a lower layer is listed on every layer above it.** "Label, from Key people"
   with an eye appears in the Text section of Connections, Communities and the route
   (`s2-32-degree-ramp.png`, `s2-34-communities-pop.png`, `s2-44-small-route.png`). It is drawn
   like the layer's own entry, only grayer, and its eye writes "hide the label" into this layer.
   With five labeled layers each layer above them would list five rows it never asked for. Figma's
   panel lists only the selected object's own properties. Proposal: list only this layer's own
   entries, and offer "Hide label from Key people" in the Text "+" menu, which then adds an
   ordinary entry of this layer. Owner: graphty app (`LabelSection.tsx`).

6. **"Varies" still sits next to a swatch.** A new layer's Color field reads "Varies" beside a
   solid yellow swatch, a color no layer paints (`s2-41-draft.png`). Mixed lost its swatch this
   iteration; Varies needs the same rule. Owner: compact-mantine (`CompactColorInput`'s
   no-single-value state).

7. **A dark chip disappears on the dark panel.** Selected's Glow chip is #111111 with no outline
   on the dark panel, so the first layer every reader opens shows an empty slot where its glow
   color should be (`s2-28-selected-tab-crop.png`, `s1-04-selected.png`). Figma draws a 1 px
   translucent border inside every swatch so black reads on dark and white on light. Owner:
   compact-mantine (the swatch).

8. **The shape picker is a 540 px sheet over the drawing.** Twenty-five shapes with captions in a
   four-column grid, 540 x 380 px, covering the canvas, the key and the toolbar at 900 x 700; the
   current shape's check floats outside its cell, left of Icosphere. Every other popover is 240 px
   beside the panel. Proposal: a 240 px popover with icon-only cells (names in tooltips) and the
   search field the value picker already has. Owner: graphty app, compact-mantine for the grid
   select. Evidence: `s2-18-shape-open.png`, `s3-10-small-shape-open.png`.

9. **Names still split in the pickers.** The vary picker's groups are "Degree", "Louvain" and
   "Shortest path" while the tree calls the same runs Connections, Communities and Shortest route;
   the route's values read "Position on the route of On the route" and "Distance from the source
   of On the route"; "Rank of Connectio..." and "Percentile of ..." are cut on one line. The rows
   themselves now say Connections everywhere (fixed). Owner: graphty-element (a value's plain name
   that reads alone), graphty app (group by the run row's name). Evidence: `s2-21-vary-picker.png`,
   `s4-03-tooltip-source.png`.

10. **A new tooltip has no row.** After Tooltip > Fixed text the panel shows a bare full-width
    field, "Type the words", with no glyph, name, eye or minus, wider than every other field and
    at its own left edge, while the label above it is a full entry row. Not walked further (no
    text typed). Owner: graphty app (`LabelSection.tsx`). Evidence: `s4-04-text-entries-crop.png`.

11. **Label settings is still a full-height column.** It now starts below the top bar, shows the
    value beneath instead of "Default", and hides the gradient editor while Gradient is Off
    (fixed), but it is still 280 x 860 px with about 50 fields, each a caption over a field,
    scrolling 1,568 px in 820. Figma's Type settings popover anchors at its row and splits Basics
    from Details. Owner: graphty app (`LabelSettings.tsx`), compact-mantine (pop-out placement).
    Evidence: `s3-01-label-settings.png`, `s3-09-small-label-settings.png`.

12. **Popovers and Graph settings keep the old two-line grammar.** The decision gave the Style
    tab, Label settings and Graph settings one gutter and one field column; Graph settings still
    puts a caption over every field (Background color, Highlight color, Method, Scale), and so do
    the ramp and category popovers (Scale, Palette, Values from, More values than colors). The
    reader learns two layouts for the same kind of field. Owner: graphty app. Evidence:
    `s2-42-graph-settings.png`, `s2-32-degree-ramp.png`, `s2-34-communities-pop.png`.

13. **The condition test is still cut.** The attribute now has its own line ("Connections"), but
    the test beneath is a 115 px select reading "has a v...". Owner: graphty app
    (`WhichElements.tsx`). Evidence: `s3-03-conn-which-open.png`.

14. **Several layers selected show one layer's label as if shared.** Key people and Connections
    selected together show Label "name" with its eye and minus, and label Size "Mixed", though only
    Key people has a label; Connections shows that label only as an entry from below. Figma's
    multi-selection shows a property only when every selected object has it. Owner: graphty app
    (`MultiRowPanel.tsx`). Evidence: `s2-38-multi.png`.

## Severity 1

15. Yes-or-no settings are selects ("Solid", "Shown" for Wireframe and Show); Figma uses a toggle
    or a checkbox for a two-state setting, as this build does for "Show all labels" and "Clamp
    outliers". Owner: graphty app. `s2-19-shape-settings.png`.
16. Left edges: the open Which elements editor starts 11 px left of every other row in the tab;
    label sub-rows (Look, Size, Position) are indented 4 px and their fields start 4 to 11 px right
    of the property fields above. Owner: graphty app. `s2-41-draft.png`, `s2-25-label-entry.png`.
17. The new layer's tree row has no kind glyph while it is "not written yet", though its kind is
    already Nodes. Owner: graphty app. `s2-41-draft.png`.
18. Tree kind glyphs still differ in size and weight: the node glyph is a 16 px ring, the
    both-kinds glyph a small dim pair. Owner: graphty app. `s1-02-tree-crop.png`.
19. The Text "+" stays on screen disabled once a label and a tooltip exist ("one of each kind
    already"); Figma removes an add button that cannot add. Low cost either way; the tooltip
    explains it. Owner: graphty app. `s4-04-text-entries-crop.png`.
20. Graph settings keeps one collapsible section, Advanced; Figma's panel has none. Owner: graphty
    app. `s2-42-graph-settings.png`.
21. The ramp popover scrolls its own content at 1440 x 900 (a scrollbar beside the histogram and
    the scale fields) although the window has room below it. Owner: graphty app.
    `s2-32-degree-ramp.png`.

## Iteration 2 findings, rechecked by clicking

- Fixed: Undo right after Clear (Ctrl+Z in the field restores size 2 and shows "Undid clearing
  node size on Key people", `s2-17-key-undo.png`); every property costs one line and both long
  layers fit 900 x 700; effect rows are chip, name, settings, eye, minus with the color in the
  settings (`s2-29-glow-settings.png`); a label added at the default size is readable
  (`s2-25-label-entry.png`); Clear names "the default" instead of a hidden layer
  (`s2-15-key-minus-tooltip.png`); a painted-over field says so with the layers and the count
  ("Painted over by Shortest route and Communities on 4 of 4 nodes", `s2-14-key-painted-tip.png`);
  Selected, which matches nothing, is no longer marked painted over; the route's rule reads in
  words; category rows have chips and a reserved minus column (`s2-35-communities-pop-crop.png`);
  Clear is a minus everywhere, ramp and Graph settings included; a new layer lands above the
  selection with its kind chosen; right-click selects the row; the row menu has three dividers and
  Hide and Lock with their shortcuts (`s2-01-tree-context-menu.png`); not-set numbers and selects
  share one italic gray look; Mixed appears only for several rows and with no swatch; the Values
  tab names Louvain's groups Group 1 to Group 6 (`s4-05-communities-values.png`).
- Partly fixed: one name per value (rows agree; picker groups do not, finding 9); left edges
  (finding 16); Label settings (finding 11); condition truncation (finding 13); the value beneath
  in the shape grid is now a check, but outside its cell (finding 8); value picker rows are one
  line, but names cut (finding 9).
- Not reached or still open: Escape on a new tooltip entry and where focus lands (not walked);
  the tree's kind glyphs (finding 18); Graph settings' last collapsible section (finding 20).

## Against the owner's three questions

- **How does a reader unset a field so it stops overriding lower layers?** An empty field writes
  nothing, so only a field with a value overrides. A set field carries a minus at rest; its
  tooltip says what comes back ("Clear: back to 1, the default"); emptying the field and pressing
  Enter clears it too; Undo brings it back and names it. When a layer above wins anyway, the
  field's name carries a mark whose tooltip names that layer. This answers the question cleanly
  for properties. Two places still blur it: an entry from a lower layer shown on every layer above
  (finding 5), where a reader cannot tell "my entry" from "an entry beneath that I may hide", and a
  kind change that silently empties a layer (finding 2).
- **Is "split parent" a new layer type?** Not in this build. The tree has two row kinds, layer and
  folder. Louvain's result is an ordinary layer whose color varies by Community; each group's
  color is an entry of that ordinary binding with its own eye, minus and "...", and "New layer for
  Group 3" makes an ordinary layer with an ordinary rule (`s2-36-communities-3-menu.png`). A
  folder shows its layers and Selection colors (`s3-05-folder.png`). Nothing walked behaves like a
  third kind, so the interaction stays one grammar.
- **Is it consistent with Figma, and what else should it take?** Taken: Figma's one-line property
  row, effect rows, Selection colors on folders, Mixed for a selection only, Cmd/Ctrl+Z reaching
  the document, right-click selecting, grouped layer menus with Hide and Lock, popovers beside the
  panel, the color picker with document swatches, the variable picker's one-line rows. Next to
  take: Figma's label rule, a property name never truncated, with the extra-settings button at the
  row's right end (finding 1); a 1 px border inside every swatch (finding 7); a multi-selection
  that shows only shared properties (finding 14); toggles for two-state settings (finding 15); an
  anchored Type settings popover with Basics and Details (finding 11); opacity inline in the color
  row (finding 3). Kept as graphty's own: the vary glyph at rest, and the painted-over mark, which
  Figma does not need because it does not stack paints.

## Not walked

- A data set with many fields (the vary picker's search and grouping under load) and a number
  column painted as categories (College football's conference); the coverage walkthrough covers
  both.
- Keyboard order and screen-reader output beyond focus after Clear and after the kind change.
