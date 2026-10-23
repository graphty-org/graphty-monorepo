# Iteration 1 of the unified style panel: review and next steps

This is the Design Director's review of the first build of unified style layers in the real graphty
app. It says what the build does, what five expert walkthroughs found in it, how it stands against
the owner's three questions from the first design review, and what the next iteration builds. The
owner reviews the panel and approves it before any user study runs; this build is not ready for
that approval yet.

The design it builds is `design/ui/studio/tier3/design.md`. The five reports are in this folder:
`figma.md` (a Figma product designer), `visual.md` (visual design), `a11y.md` (keyboard, screen
reader and zoom), `engineer.md` (a screenshot audit at 1366 x 768 and 1920 x 1080) and `ia.md`
(coverage of every style and generic element picking). Their screenshots are under
`design/ui/studio/tier3/build/` and are not committed.

## What the build does

The build is served at https://dev.ato.ms:9373/?next (the new workspace; frozen as
`tier3-i1-68a2140049`).

- **A layer tree on the left** with two row kinds, layer and folder, in paint order. Rows carry a
  pin, a lock and an eye; folders nest; a "Painted over" mark says when a row is fully covered by
  rows above it. Add layer and Add folder sit on the tree's "+". A footer opens Graph settings.
- **A Style tab on the right** for the selected row. A hand-made layer opens with Which elements
  (Nodes, Edges or Both, then one rule, read back as a sentence with its count). Then a Nodes group
  (Shape | Size, Color) and an Edges group (Color | Width, Head | Tail), with rarer properties behind
  each row's settings button. An empty field is "not set here" and shows the value beneath in gray;
  a set field carries a minus that clears it, and the minus's tooltip names the value and the layer
  that come back. Text, Tooltip and Effects are lists with "+".
- **Vary by**: a glyph at a field's end opens a searchable value picker; a varied value becomes a
  pill that opens a ramp popover (numbers) or a category popover (one row per value, each
  recolorable, with "New layer for <value>").
- **Labels**: an entry per label with a source, a look, a size and a settings pop-out holding every
  label field.
- **A Values tab** with what a row paints and the values it reads, and **Graph settings** (layout,
  view, background, selection colors).
- **graphty-element** gained the style tree, rows that paint both kinds, starting rows (Everything,
  Selected, Hovered), generic rules with a text test, what lies beneath a row, a binding preview,
  per-value entries that follow their groups across re-runs, colors across rows, new channels
  (visibility, label size and colors, halo and band), shape and arrow glyphs and label looks. All of
  it is additive and recorded under "decided by the team" in `owner-decisions.md`.

## What the experts found

The five walkthroughs returned 122 findings. Many are the same defect seen by two or three experts;
merged, they come to about 60 distinct problems. No step raised a script error or a failed request.

### What works

The grammar taken from Figma mostly arrived: a set field carries its minus at rest, the minus says
what comes back, Delete clears a focused select, the eye and lock left the panel header, label looks
read like Figma's text styles. Generic picking works: "name contains Mme" and "odd-numbered ids"
reach the right elements on both Les Miserables and College football, by find and by conditions,
with counts that match the data, and no algorithm has a door of its own. Key people with a label, a
tooltip, glow and halo fits a 1366 x 768 window with room to spare.

### Blocks a task (severity 4)

- **Label settings cannot be reached past its first screen.** The pop-out is 2,280 px tall, pinned
  to the top of the window, and nothing scrolls; about 40 controls (gradient, letters, placement,
  motion, badge) are never on screen, and Tab walks focus through them invisibly. Three experts
  found it. Cause: compact-mantine's pop-out clamps its top to 0 and has no height cap.
- **No keyboard path moves a layer into or out of a folder.** Alt+Arrow moves only among siblings
  and passes over a folder, and the row menu has no "Move to folder". Cause: compact-mantine's tree
  and the app's row menu.

### Breaks the settled model or hides what a task needs (severity 3)

- **Who made a layer changes what its panel offers.** Which elements appears only on layers a
  reader made; a run's layers (Connections, Communities, Bridge edges, the route) and the starting
  rows never say what they paint. The owner's settled model says provenance never changes behavior.
  Cause: the panel shows the section only when every part's source is the reader. Behind it, the
  rule editor cannot read a run's values at all, so "degree at least 10" or "Top 10 by degree" cannot
  be written, and "New layer for 3" makes a rule the editor shows blank.
- **The app a reader opens has no starting rows.** Opening a sample gives no Everything, Selected or
  Hovered; only the review stories turned them on. So the selection's look has no home in the
  panel, and every Clear tooltip names "Node defaults", a layer the tree never shows. Separately,
  Bridge edges (run second) sits above the route (run last) and paints over its edges.
- **One shortest route is two rows**, "Shortest route (nodes)" and "Shortest route (edges)", where
  the design has one layer painting both. Cause: the run's suggested layers come from
  graphty-element as two single-kind layers.
- **Louvain's category rows show only a hex field.** The value name and count are drawn under a
  color field that ignores its slot's width, so community 3 cannot be told from community 5.
- **One community has two or three names**: "Group 2" in the key (ranked by size), "5" in the
  Values tab and the category popover, "Group 1" in the node inspector.
- **The key fills with entries nobody can read**: six "Selected" rows (halo and band sizes,
  opacities, colors) while nothing is selected, and "Key people 72" for a label's size. At 900 x 700
  the key takes 240 of the canvas's 365 px and the drawing is framed into a speck.
- **Only 11 properties offer vary by.** graphty-element can drive 21 more from a value (node shape,
  which the owner named, opacity, outline, glow and halo colors, line pattern, arrow kind and size,
  motion speed, band), and the panel has no button for them.
- **About 20 styles have no control**: the captions at an edge's ends, a tooltip's look, label color
  and background varying by a value, fixed typed label words, and three label fields. The coverage
  test marks five of these "not offered", so it passes against the design.
- **A new layer cannot get its rule before it paints.** The draft offers only Nodes | Edges | Both;
  the rule appears after the first value, which lands on every element first (all 115 teams grew
  before the rule narrowed them to 24).
- **Focus is lost** when a value picker or binding popover closes and when the panel makes a layer
  (draft, "New layer for <value>"); nothing announces where it went.

### Slows or misleads (severity 2), grouped

- **Clear and "not set" have several looks.** Clear is a row-end minus, a minus between paired
  fields, a minus inside a category field, or the field's own "x" (label look and size, ramp scale,
  graph colors, motion speed). Mixed reads "MIXED" in color fields beside a solid swatch and "Mixed"
  in number fields. Number fields are gray whether set or not; not-set is gray text only. Color
  fields do not speak "not set" or "mixed" to a screen reader.
- **Rows jump and clip.** A field shrinks 25 px when it gets its minus and again when focus brings
  in the vary glyph; paired Color | Width rows clip hex values and cut "Edge betweenness" to
  "Edge ...". There are six different left edges in one tab. The vary glyph is invisible until
  hover, though tier 1 found the bind button was the only way into color-by and size-by.
- **Popovers open in three places**, often over the panel and the field they edit, where Figma
  opens them beside the panel at the row's height.
- **Pickers.** The shape grid cuts 22 of 25 names ("Pentago..." three times) and marks no current
  value; the vary picker carries no fact per value (range, count), lacks the "In use" and "Facts"
  groups, and offers in- and out-degree on an undirected graph; the ramp popover paints its bars one
  color, leaves its two From/To pairs unlabeled, and steps a rank by 6.85.
- **Lists.** Text's "+" opens a menu of one item because Tooltip is a separate list; adding a label
  also writes a look and a size of 72 that draws about 6 px tall; Escape on a new tooltip leaves an
  empty entry; effect entries take two lines; one add action costs two Tab stops.
- **Tree and header.** "Painted over" is cut to "Painted..." and its tooltip names no layer; Space on
  a row hides the layer silently; the row menu lacks Duplicate, Move to folder and Select what it
  paints; Graph settings opens on the Values tab and scrolls sideways.
- **Locked and hidden** layers say so in 9 px text; a locked layer's native disabled fieldset drops
  every control out of the Tab order and leaves three of them drawn at full contrast.
- **Which elements and find.** A layer's kind cannot change once made; find says nothing on no match,
  offers "This node" three times without naming the node, and cuts its counts; the Attribute list
  has both "Id" and "id"; every hand-made layer stays named "New layer".
- **Smaller.** Accessible names miss the kind word in a both-kinds layer ("Add text" twice); bound
  values do not name their property; Values tab has two "Summary" headings and a histogram of
  community ids; dark theme loses a black key chit and the ramp's dark bars; the selection's yellow
  halo vanishes on a yellow community; the node size field accepts letters and commits 0.

Severity 0 and 1 items (a paintbrush glyph on every row, a 2 px label misalignment, menus without
glyphs, colors spoken as hex, the undo line after a Clear) are folded into the units below where
they touch the same code.

## Against the owner's three questions

1. **Unsetting.** The mechanism is right and the experts confirmed it reads: set fields carry a
   minus at rest, its tooltip names what comes back, Delete clears. What fails is consistency:
   four looks for Clear, two spellings of mixed, a not-set state drawn differently per control and
   silent to screen readers, and Clear tooltips naming a layer the reader's app never shows. All of
   it is fixed next iteration; the starting rows become the app's default so "what comes back"
   always names a row the reader can see.
2. **No split parent.** Built as decided: two row kinds only, per-group colors as entries in the
   ordinary binding, anything else for a group through "New layer for <value>". The defects are in
   the doors around it (category rows that hide their names, a rule the editor cannot read, three
   names for one community), not in the model. One more inconsistency surfaced and is fixed: a
   run's layers behave differently from a reader's.
3. **Figma.** The Figma walkthrough adopted list grammar, minus at rest and label looks as built.
   Taken now from its findings: popovers beside the panel at the row's height, 240 px wide; a
   reserved icon column so fields never jump; opacity as a percent inline in the color row (Figma's
   paint row; compact-mantine's color input already has the box); one-line effect rows; "Select
   what it paints" in the row menu and header (Figma's "Select matching layers"); Duplicate and Move
   to folder in the row menu.

## Decided for iteration 2

Decisions made here, each reversible by an edit:

- **The graphty app turns on `startingRows` and `runPlacement: "top"`** for a new or opened project
  that has not set them. graphty-element's defaults stay neutral (off and beneath); setting them is
  the app's choice as a consumer, which the architecture rules allow. Reason: the settled model has
  Selected and Hovered as default layers and Everything at the bottom, and a run that finishes last
  must paint on top.
- **Which elements on every layer, whatever made it.** graphty-element exposes every run layer's
  selector as an editable rule, and one list of every value a rule or binding can read (data
  columns and run results, each with its plain name, kind, range or value count and rule path). The
  app's rule editor and vary picker both read that list instead of building their own.
- **A run that paints nodes and edges lands as one row.** graphty-element joins the suggested layers
  of one run into a both-kinds row, as `styles.addRow` already does for a reader.
- **A layer's kind can change in place** (additive `RowWrite.target`, adding or dropping a part),
  so Edges and Both stop being disabled.
- **The Selected starting row gets a look that is visible on every palette color** and passes 3:1
  against the background. The starting rows are unreleased, so this is not the owner's breaking
  item 3 (that item is the existing `selectionStyle` default, and it stays open).
- **The vary glyph is drawn at rest**, in a column every row reserves, departing from Figma's
  hover-only "Apply variable". Reason: tier 1's evidence that the bind button was the one way into
  color-by and size-by and that hidden doors were found only by guessing; the reserved column also
  ends the row jump.
- **Text holds Label and Tooltip** under one "+" (the design's original grouping); a one-item menu
  becomes a direct button anywhere it remains.
- **A draft layer chooses its elements first**: kind, find and conditions are live before any value
  is written, the kind is preselected from the current selection, and the layer is named by its rule
  until a reader renames it.
- **A locked layer keeps its controls focusable** (`aria-disabled`, the reason as their
  description) instead of a native disabled fieldset.
- **The inspector stays 240 px wide** at every window size, as Figma's default sidebar; truncation is
  fixed in the rows, not by a wider panel.
- **The key shows only blocks a reader can read**: no block for a row that paints nothing, no
  sizes, opacities or label sizes as bare numbers; its height is capped so the drawing keeps the
  canvas at 900 x 700.

## Units for iteration 2

Layer 1, graphty-element: `element-run-rows-and-rules` (one row per run, rules readable,
kind change in place, run order under top placement), `element-readable-values` (one list of
readable values, run values in rules, categorical results marked), `element-small-facts` (label
size scale, Selected starting look, a layout description, a channel's minimum, legend counts).

Layer 2, compact-mantine: `cm-popout-fit-and-focus`, `cm-field-states`, `cm-glyph-grid-and-ramp`,
`cm-tree-move-into-folder`.

Layer 3, the graphty app: `app-defaults-and-tree`, `app-property-rows`, `app-lists-and-labels`,
`app-popovers-and-picker`, `app-key-values-settings`.

Layer 4: `app-which-elements-and-draft` (it shares the Style tab with `app-property-rows`).

Layer 5: `i2-stories-and-review` (stories, owner-review screenshots, API report and guide pages).

Every severity 2 to 4 finding is in one of these units; the severity 0 and 1 findings are included
where they sit in the same code.

## Still open for the owner

Nothing in this iteration needs the owner's decision before it is built. At the approval review the
owner should judge two things the studio cannot: whether the Selected layer at rest, ten gray fields
around its two effects, is acceptable noise (decision 1.1), and whether a per-entry eye that hides
what lies beneath reads like Figma's eye. The five breaking items in `owner-decisions.md` (one
element layer for both kinds, starting rows and run placement on by default, the default selection
and badge contrast, reduced motion, accordions only if 900 x 700 still scrolls) are unchanged.
