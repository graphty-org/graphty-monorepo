# Iteration 3 of the unified style panel: review and next steps

This is the Design Director's review of the third build of unified style layers in the real graphty
app. It says what the build does, what five expert walkthroughs found in it, how it stands against
the owner's three questions from the first design review, and what the next iteration builds. The
owner reviews the panel and approves it before any user study runs. This build is not ready for
that approval yet: nothing blocks a task, but six problems still hide information or lose a
reader's work, and the most visible one -- property names cut to two letters -- is the first thing
the owner would judge.

The design it builds is `design/ui/studio/tier3/design.md`; the earlier reviews are `../1/review.md`
and `../2/review.md`. The five reports are in this folder: `figma.md` (a Figma product designer),
`visual.md` (visual design, light and dark, 1440 x 900 and 900 x 700), `a11y.md` (keyboard, screen
reader, axe and 200% zoom), `engineer.md` (a screenshot audit at 1366 x 768 and 1920 x 1080) and
`ia.md` (coverage of every style and generic element picking on three datasets). Their screenshots
are under `design/ui/studio/tier3/build/` and are not committed.

## What the build does

The build is served at https://dev.ato.ms:9373/?next (frozen as `tier3-i3-617b43b270`, app version
0.8.68).

- **One line per property.** Every property is a row of about 28 px: its name at the left, the
  field, the vary glyph and Clear's minus. Selected and the shortest route now fit a 900 x 700
  window without scrolling; in iteration 2 both scrolled.
- **Unsetting you can trust.** Clear names what comes back, read over the layer's own elements
  ("back to 1, the default"); Undo right after Clear works and says what it undid. A field that a
  layer above paints over carries a mark naming that layer and how many of this layer's elements
  it covers.
- **Entries as Figma draws them.** Glow, Halo, Band and Outline are a chip, a name, a settings
  button, an eye and a minus; the color lives in the settings. Category rows (Louvain's groups)
  line up with a chip, a name, a count, an eye and a minus.
- **One name per value** in the tree, the rules, the pills and Undo ("Connections", "Community",
  "On the route"). The route's Which elements reads "Nodes and edges on the route"; the Values tab
  names Louvain's groups "Group 1" to "Group 6".
- **A kind change keeps the layer**: its id, name, place and focus, with an announcement.
- **A new layer** lands above the selected row with its kind chosen, and says what it holds before
  anything paints ("Nodes where label contains State", "24 nodes, added when a property is set").
- **Generic picking** works on College football, Les Miserables and a reader's own file: "name
  contains Bob" finds exactly the three Bobs; "Node id matches pattern [13579]$" gives true counts.
- **Coverage is whole**: every channel, label field and graph setting graphty-element publishes has
  a control, and 47 of 51 properties offer vary by (the four yes-or-no properties have none, by a
  recorded decision).

## What the experts found

The five walkthroughs returned 107 findings: none at severity 4, 9 at severity 3, 45 at severity 2,
47 at severity 1 and 6 at severity 0. Merged across experts they come to about 55 distinct
problems. No step raised a script error, a console error or a failed request; no popover leaves the
window; axe finds no violations in ten states in either theme, and all measured panel text is at
least 4.5:1. Of iteration 2's findings, the experts count most as fixed: the Figma designer 15 of
24, accessibility 12 of 21, coverage 9 of 17, and both of visual design's severity 3s.

### Hides information or loses work (severity 3)

- **Property names are cut to one or two letters on every layer** (four of five experts). The
  56 px name column also holds the property's settings button and the painted-over mark, so Shape
  reads "Sh...", Color "Co..." and a painted-over Color "C."; settings pop-outs cut "Wirefra...",
  "Pattern ...", "Tail opa...". The full name is only in a native title. The panel also has two
  positions for a settings button: in the name column on property rows, at the row's end on
  entries. Figma never cuts a property's name.
- **A kind change throws away the layer's settings.** Connections moved from Nodes to Edges keeps
  its row but loses its color binding, so it paints nothing, while the announcement says
  "Connections now paints edges" and its rule still reads a node value while counting 254 of 254
  edges. The kind radios select as the arrow keys move, so ArrowRight from Nodes to Both passes
  Edges and drops the node size, the color ramp, the label and the glow. Two Undos restore it; only
  the first is announced.
- **The ramp's start handle cannot be stepped back after one step.** The histogram is drawn over
  the binding's range instead of the data's, so stepping the start from 1 to 2 hides the 27 nodes
  with one connection and makes 2 the handle's minimum. Ctrl+Z inside the popover does nothing.
- **Focus falls to the page after Clear on a bound value, Remove on an effect, and Undo after
  either**, and nothing is announced. Remove on the last label sends focus to a pointer-only title
  button that is hidden from assistive technology.
- **"One color per value" on a number column paints shades of one orange.** College football's
  conference (12 codes) gets twelve oranges, the Palette field claims "Eight distinct colors", and
  the canvas key draws a continuous ramp labeled "6" to "5". Choosing a categorical palette by hand
  gives twelve distinct colors and a key of swatches, so the model works and the defaults mislead.
  graphty-element picks a sequential palette for an ordinal scale with no palette named, and its
  key takes ramp-or-swatches from the palette instead of the scale.
- **The Values tab's histogram breaks for a value bound by category or as text**: the axis reads
  "0" to "0", the bars are groups sorted by size, and the route's edge label counts the whole
  graph ("254 have a value") for a layer of 2 edges.

### Slows or misleads (severity 2), grouped

- **Values that say one thing while the canvas shows another.** A painted-over color is drawn at
  full strength (Key people's orange, while its nodes are drawn in community colors). "Varies"
  sits beside a solid swatch no layer paints. In the dark theme a "None" color is a white swatch.
  The default label font reads "Verdana" but draws a serif face where Verdana is missing, because
  graphty-element's default names no generic fallback. A new label's size reads 12 (screen pixels)
  while Clear promises "back to 48", a world size. Head reads "Triangle" on an undirected graph
  that draws no arrow heads. Hiding an effect and showing it again forgets its color.
- **Rows the layer does not own.** Every layer above Key people lists Key people's Label, Tooltip,
  Glow and Halo, each with an eye; that is 110 px per layer, and it pushes the route into
  scrolling. Several layers selected together show one layer's label as if all had it, and an edit
  there would write all of them.
- **Two grammars.** Graph settings, Label settings, the ramp and category popovers and the
  settings pop-outs still put a caption over a full-width field, against the Style tab's name at
  the left. Opacity left the color row for a popover holding one field. "Size combines" lives in
  Shape's settings because Size has no settings of its own.
- **Pickers.** The vary picker cuts the words that tell values apart ("Rank of Connectio...",
  "Position on the rou...") and heads its groups "Degree" and "Louvain" while the tree says
  Connections and Communities; the route's values read "Position on the route of On the route".
  The shape picker is a 540 x 380 px sheet over the drawing. The condition test reads "has a v...";
  a yes-or-no condition is a free text box. Find offers name a node by its id ("MmeDeR"), ignore
  run values by name ("Group 3", "degree") although graphty-element returns them, and never word an
  edge's source or target values, which graphty-element now publishes. Power is offered with no
  exponent. A number that names groups can be colored per value but not shaped per value. The
  bound color pill cuts "Conne...". The node inspector still says "Degree" and "Louvain".
- **Panels and popovers.** Label settings is a 860 px column of about 50 captioned fields, not
  anchored at its row. Tab past the last control of a pop-out goes to the page's top while the
  pop-out stays open. At 900 x 700 the 240 px color popovers cover most of the drawing. The key
  card is capped at 289 px with 400 px of empty canvas below it. The inspector's header and tabs
  scroll away. A locked layer still draws some of its controls at full strength. A new tooltip
  of fixed text is a bare field with no entry row. The Selected ring barely shows on Valjean, a
  black hub under dense edges. New labels draw black text with no halo, 4.0:1 on Louvain's blue.
  The black Glow chip is 1.35:1 on the dark panel.

Severity 0 and 1 items (left edges a few pixels off, kind glyphs of different sizes, a stray check
in the glyph grid, a disabled Text "+", the Effects "+" that sometimes adds and sometimes opens a
menu, colors spoken as hex, Undo announced assertively, a menu item's reason in its name, the
toolbar wrapping to three rows at 200% zoom, and similar) are folded into the units below where
they sit in the same code.

## Against the owner's three questions

1. **How does a reader unset a field so it stops overriding the layers beneath?** An empty field
   writes nothing; only a field with a value overrides. A set field carries a minus at rest whose
   tooltip names what comes back, read over the layer's own elements ("back to 1, the default");
   emptying the field and pressing Enter clears it too; Undo brings the value back and names it.
   When a layer above wins anyway, the field says so and names that layer. Three things still blur
   this, and the next iteration removes them: a lower layer's entries listed on every layer above
   (a reader cannot tell "mine" from "beneath, which I may cover"), a kind change that silently
   empties a layer, and a painted-over value drawn at full strength. To cover something a layer
   beneath draws, the reader adds an ordinary entry of their own: "Hide label from Key people" in
   the Text "+" menu adds this layer's label set to nothing. Covering and unsetting stay two
   different acts with two different controls.
2. **Is "split parent" a new kind of layer?** No. It does not exist in this build and none is
   planned. The tree has two row kinds, layer and folder, and nothing walked behaves like a third.
   Louvain's result is an ordinary layer whose color varies by Community; each group's color is an
   entry of that ordinary binding with its own chip, eye and minus; "New layer for Group 3" makes
   an ordinary layer with an ordinary rule. The same category rows already serve a second kind of
   value: College football's conference, a number column, gets the same rows and the same "New
   layer for" command (its palette default is fixed next).
3. **Is it consistent with Figma, and what else should it take?** Taken so far: Figma's one-line
   property rows, effect rows (chip, name, settings, eye, minus), Selection colors on a folder,
   "Mixed" only for a multi-selection, Undo reaching the document from an idle field, right-click
   selecting the row, grouped row menus with Hide and Lock, popovers beside the panel, the color
   picker with document swatches. Taken next: a property's name is never cut, and its rare
   settings sit behind one button per section, as Figma's Typography section has one "Type
   settings" button; a 1 px inner border on every swatch; a multi-selection that shows only what
   every selected layer shares; a layer that lists only its own properties; opacity inline in the
   color row; a compact icon grid for shapes, as Figma's grids of icons; an anchored label settings
   popover split into Basics and Details, as Figma's Type settings; color popovers that can be
   dragged off the drawing, as Figma's color picker can. Kept as graphty's own, with reasons: the
   vary glyph drawn at rest (tier 1: hidden doors were found only by guessing) and the
   painted-over mark (Figma does not stack paints, so it never needs one).

## Decided for iteration 4

Each decision is reversible by an edit.

- **A property's name is never cut.** The settings button leaves the name column: each kind
  section (Nodes, Edges) gets one settings button at its title's right, opening "Node settings"
  or "Edge settings" with every rare property of that kind (wireframe, show, how sizes combine,
  varying opacity, line pattern, how widths combine, the ends' colors and sizes), each a row in the
  same grammar as the Style tab. Reason: Figma's one Type settings button per section, and it adds
  no column to a 240 px row. The painted-over mark moves into the field, which draws a painted-over
  value dimmed, with a real tooltip on hover and focus naming the layer above and the count. The
  name column then holds only the name.
- **Opacity is back in the color row** as an inline percent for a fixed value (Figma's paint row).
  Varying opacity is a row of the section's settings.
- **One grammar everywhere**: name at the left, field at the right, in the Style tab, both section
  settings, Label settings, Graph settings and the ramp and category popovers. Graph settings loses
  its last fold ("Advanced"). Label settings opens beside its row, split into Basics (look, font,
  size, color, background) and Details (everything else).
- **A layer lists only its own entries.** The Text and Effects "+" menus offer "Hide label from Key
  people" (and the same for each entry a layer beneath draws on this layer's elements), which adds
  an ordinary entry of this layer set to nothing. The "+" is hidden when its menu would be empty,
  and is always a menu.
- **A kind change keeps everything.** graphty-element keeps a layer's node part and edge part
  across kind changes (a part the current kind does not draw waits until the kind includes it
  again), copies a shared property (color, opacity, label, tooltip) into a new part that has none,
  and rewrites a node rule moved to edges as "edges touching those nodes" (and an edge rule moved
  to nodes as "nodes at the ends of those edges"). Nodes, then Edges, then Both gives back every
  node setting. Each change is one undo step, and every Undo is announced. The radios keep the
  standard select-on-arrow behavior; nothing is lost by passing through.
- **Hiding an effect keeps its value**: graphty-element marks an effect off without forgetting its
  color (additive), so the eye brings back what was there.
- **A ramp's handles range over the data's full extent**: graphty-element draws a preview's bins
  over the whole data, not the binding's range, so a handle can always step back.
- **Focus never falls to the page.** After Clear, focus goes to the emptied field; after Remove, to
  the next entry or else the section's "+"; after Undo, to the restored control; after Escape on a
  new effect, to the "+" with "Glow not added". Each is announced in one polite status region.
- **"One color per value" passes a categorical palette** (the app's choice; an ordinal scale with
  no palette may stay sequential in graphty-element, as ordered categories often are). The Palette
  field shows the palette in force when none is set. graphty-element's key draws an ordinal
  encoding as swatches labeled by value, whatever the palette (a defect fix). graphty-element's
  `proposeEncoding` lets a number with few distinct values fit a property that takes a fixed set
  (shape), so the same column can be shaped per value (additive). A Data page control for "this
  number names groups" is held as a second door until a reader needs it.
- **The vary picker gives every name its own line**, the range dimmed beneath it in one number
  format; groups are headed by the run row's name ("Connections", "Communities"); a run's value
  that already says whose it is keeps its own name; the list is as tall as its content.
- **Edges read their ends.** The rule editor, the vary picker and find list the node values read at
  an edge's source and target, worded "the source's Connections"; find shows graphty-element's
  matches on a value's name ("degree", "Group 3"); find offers name a node by its name column.
- **Swatches**: a 1 px translucent inner border on every swatch in both themes; "Varies" and "Mixed"
  draw no swatch; "None" draws the same empty swatch in both themes.
- **The shape picker** is a 240 px popover of icon cells with names in tooltips and a search field,
  the current value checked inside its cell.
- **Pop-outs**: Tab past the last control closes the pop-out and moves to the control after its
  trigger; Shift+Tab from the first goes back to the trigger. A color popover can be dragged by its
  title, so a reader at 900 x 700 can move it off the drawing.
- **Labels**: a label sized in screen pixels with no size set draws at a screen default, and Clear
  names that value in that unit (graphty-element; the unit is unreleased, so the team's call). The
  app's new labels take a named look that passes 4.5:1 on every palette color and a font with a
  generic fallback (the app's choices). The element's default font gaining a fallback is a default
  change, so it is the owner's (below).
- **Facts beneath**: on an undirected graph the arrow head beneath is "None", what draws
  (graphty-element). The Selected ring is made visible on a size-1 black hub under dense edges
  (the starting rows are unreleased, so the team's call).
- **Panel frame**: the inspector's header and tabs stay put while the tab scrolls; the key card's
  height follows the canvas; a locked layer dims and disables every control under it; several
  selected layers show only what all of them share, and their writes are one undo step.
- **Held, with reasons**: number comparisons and a parity test on a numeric id (the pattern works
  and was the tier 3 decision); marking a draft's matches on the canvas before a value is written
  (the rule and the count name them); the eight label fields with no channel (no use yet); two
  layers whose rules differ only in case (the reader names layers); toggles for wireframe and show
  (they have three states, not two); one swatch size (a chip is the whole field, a field's swatch
  is a part of it).

## Units for iteration 4

Layer 1, graphty-element: `element-nothing-hidden-is-lost`, `element-previews-keys-and-fits`,
`element-label-and-beneath-facts`.

Layer 2, compact-mantine: `cm-swatches-and-grids`, `cm-popout-tree-and-names`.

Layer 3, the graphty app: `app-property-rows-whole-names`, `app-own-entries-and-focus`,
`app-pickers-find-and-rules`, `app-popovers-and-values`, `app-panels-frame-and-key`.

Layer 4: `i4-stories-and-review` (stories, owner-review screenshots, API report, guide pages).

Every severity 2 and 3 finding is in one of these units; severity 0 and 1 findings are included
where they sit in the same code, and the rest are held above with a reason.

## Still open for the owner

One new item, added to `owner-decisions.md`: graphty-element's default label font is bare
"Verdana", so a machine without Verdana draws labels in a serif face while every editor says
Verdana. Adding a generic fallback ("Verdana, sans-serif") changes what draws on those machines,
which is a default change. Until then the graphty app picks a font with a fallback for the labels
it adds.

Unchanged: the five breaking items (one element layer for both kinds, starting rows and run
placement on by default, the default selection and badge contrast, reduced motion, accordions only
if 900 x 700 still scrolls -- it no longer does, so the studio does not ask for them) and making
screen pixels the default label size.

At the approval review the owner should judge what the studio cannot: whether one settings button
per section reads as Figma's Type settings; whether a painted-over value drawn dimmed reads as
"not what is drawn"; and whether "Hide label from Key people" in the "+" menu is where a reader
looks to cover something beneath.
