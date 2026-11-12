# Iteration 2 of the unified style panel: review and next steps

This is the Design Director's review of the second build of unified style layers in the real
graphty app. It says what the build does, what five expert walkthroughs found in it, how it stands
against the owner's three questions from the first design review, and what the next iteration
builds. The owner reviews the panel and approves it before any user study runs; this build is
closer but not ready for that approval: one finding still destroys a layer, and ten more hide
information or break a rule the owner settled.

The design it builds is `design/ui/studio/tier3/design.md`; iteration 1's review is
`../1/review.md`. The five reports are in this folder: `figma.md` (a Figma product designer),
`visual.md` (visual design, light and dark, 1440 x 900 and 900 x 700), `a11y.md` (keyboard, screen
reader, axe and 200% zoom), `engineer.md` (a screenshot audit at 1366 x 768 and 1920 x 1080) and
`ia.md` (coverage of every style and generic element picking on two datasets). Their screenshots
are under `design/ui/studio/tier3/build/` and are not committed.

## What the build does

The build is served at https://dev.ato.ms:9373/?next (frozen as `tier3-i2-2faecd941b`, app
version 0.8.68).

- **The app a reader opens has the starting rows.** Opening any sample gives Everything (pinned to
  the bottom, writing nothing), Selected (a dark ring and a white glow) and Hovered, and a run that
  finishes last paints on top. The app sets both; graphty-element's defaults stay neutral.
- **Every layer is the same.** A run's layers open with Which elements and its count like a
  reader's; the shortest route is one row that paints nodes and edges; a layer's kind (Nodes,
  Edges, Both) can be changed in place; the rule editor reads a run's values ("Connections is 10
  or more").
- **Property rows keep their width.** The vary glyph is drawn at rest in a reserved column, Clear
  is one minus at the row's end, opacity sits in the color row as a percent, and every bindable
  property offers vary by (43 of 51; the other 8 are discussed below).
- **Lists.** Text holds Label and Tooltip under one "+"; Effects holds Outline, Glow, Halo, Band
  and Motion; every channel graphty-element has, including captions at an edge's ends and a
  tooltip's look, now has a control.
- **Popovers open beside the panel at the row's height** and give focus back when they close. The
  ramp popover paints its histogram in the ramp's colors with labeled ends; the category popover
  shows each group's name, color and count, with "New layer for Group 3".
- **The tree** moves rows into and out of folders by keyboard (Alt+arrows, "Move to folder"), has
  Duplicate and "Select what it paints" in its row menu, and names the layer that paints over a row.
- **A new layer chooses its elements first**: kind, find and conditions work before any value is
  written.

## What the experts found

The five walkthroughs returned 116 findings: 1 at severity 4, 11 at severity 3, 58 at severity 2,
43 at severity 1 and 3 at severity 0. Merged across experts they come to about 55 distinct
problems. No step raised a script error, a console error or a failed request, and no popover leaves
the window. Of iteration 1's findings, the experts count most as fixed (the Figma designer 14 of
22, visual design 5 of 7 major ones, accessibility 17 of 25, coverage 9 of 13).

### What works

Label settings scrolls and fits the window, also at 200% zoom. Louvain's category rows show their
names and counts. The key shows only real encodings and keeps the drawing visible at 900 x 700.
Locked and hidden layers say so at full strength. The panel's text meets 4.5:1 in both themes.
Generic picking works on Les Miserables and College football: "name contains Mme" and "node id
matches [13579]$" reach the right elements by find and by conditions, with correct counts, and no
algorithm has a door of its own. Every style graphty-element can draw has a control except
node.flat and node.marker, which are left out with a recorded reason.

### Blocks a task (severity 4)

- **Changing a layer's kind from Nodes to Edges destroys the layer.** It is renamed with an internal
  id (`connections_1`), paints nothing, the Style tab goes empty and focus falls to the page. Arrow
  keys select radios as they move, so ArrowRight from Nodes toward Both passes Edges and triggers
  it. Cause, read in source: `retargetRow` in graphty-element's `StylesApi.ts` mints a new layer id
  when a one-part row changes to the other single kind, and copies a rule that reads node values
  onto edges, where it matches nothing. Nodes to Both works because it keeps the existing part.

### Hides information or breaks a settled rule (severity 3)

- **Undo right after a Clear does nothing.** Clear puts focus in the emptied field, and the app's
  key handler leaves Ctrl+Z to a text field even when the field has no edit of its own. Escape
  then Ctrl+Z works. Clear is the owner's first question; undo is its safety net.
- **One value has up to four names.** Degree's value is "Connections" in the tree and the rule but
  "Degree" on the pill; Louvain's is "Communities", "Community", "Louvain" and "Groups"; edge
  betweenness is "Bridge edges", "Bridging" and "Edge betweenness"; the route is "Shortest route"
  and "Shortest path". Undo says "Undid changing Color on Degree" about a row the tree calls
  Connections. graphty-element's catalog already gives each value one plain name; the app reads
  it in some places and the run's technical name in others.
- **The Values tab names Louvain's groups by raw id** (1, 5, 3, 4, 2, 0) where the key, popover and
  node inspector say "Group 1" to "Group 6". Open since iteration 1.
- **The route's Which elements prints a raw query**, "Nodes and edges where
  results.shortest_path.onPath == `true`", and opens the editor in Expression mode. The element's
  rule reader already reads it as a condition; the app's `formOf` in `whichRule.ts` never asks.
- **Effect rows (Glow, Halo, Band) cut their color to two hex digits** ("FF", "11"): the field is
  about 34 px wide with 11 px of text, wide only while focused, and its 14 px swatch fails target
  size. The Selected row, the first look every reader meets, is unreadable at rest.
- **A label entry and a tooltip entry look identical**; the kind is only in the accessible name.
- **Detach and the draft's first write drop focus to the page** and announce nothing.
- **A number column that names categories cannot be painted as categories.** College football's
  conference (0 to 11) gets a 12-step orange-to-brown ramp, though graphty-element's ordinal scale
  paints numbers as categories; the popover offers only number scales and ramp palettes.

### Slows or misleads (severity 2), grouped

- **The panel got longer.** Every pair of fields stacks, one field per line under its caption,
  because a paired row with two reserved columns per field does not fit 240 px. Selected is about
  760 px and the route about 940 px; both scroll at 900 x 700 and at 1366 x 768. Fields come in five
  widths and the tab has five or six left edges.
- **What comes back is read over the wrong elements.** The gray value beneath and Clear's tooltip
  read the layers beneath over the whole graph, not over this layer's own elements, so "Louvain
  Group 3", whose 11 nodes are all green, says "back to mixed"; a layer matching nothing (Hovered,
  Selected with nothing selected) reads "Mixed" and is marked "Painted over" by no one; Clear
  names "Node defaults" and "Edge defaults", graphty-element's own base layers, which the tree
  never shows. A field that a layer above paints over gives no sign of it.
- **"Mixed" means two things** (several rows that disagree, and one row's unset field over varied
  layers beneath) and still sits beside a solid swatch no layer paints.
- **The not-set look depends on the control**: gray italic in selects and colors, gray upright in
  the panel's number fields, italic in Label and Graph settings' numbers, upright in text fields;
  number fields are gray-filled set or not. A set color does not say "set here".
- **Clear is still an "x"** in the ramp's Scale, "More values than colors" and Graph settings'
  colors, and a minus everywhere else. A category row's minus has no reserved column and shifts
  that row's count and eye 27 px.
- **Varied values.** A bound color shows only a 12 px chit and a name at rest; the pill narrows when
  its popover opens; the ramp popover is 375 px at 900 x 700 and covers the drawing, opens downward
  and scrolls its own histogram out of view while room above is unused; it ends in a full-width
  "Fix at #B84203" button.
- **Pickers read two lists.** Find cannot read a run's values while the rule editor can; the rule
  editor lists Rank and Percentile flat without saying of what, while the vary picker groups them
  under their run; an edge-only layer on data without edge columns gets an empty list with no words;
  an edge's source and target are not readable values. Data that holds its own colors cannot be
  painted with them (the element's passthrough scale is not offered). Opacity has no vary glyph.
- **Labels.** A new label at size 48 draws about 4 px tall; a label bound to a number prints 15
  decimals on the canvas; Label settings covers the app header, shows a full gradient editor while
  Gradient is "Default", reads "Default" instead of the value beneath, and Escape in its hex field
  blurs to the page; label controls lack the kind word in a both-kinds layer.
- **The Selected ring is black on black** on the route's nodes, so selecting Valjean changes almost
  nothing there.
- **Which elements and the draft.** "Connec..." and "has a va..." cut side by side in a condition
  row; a draft shows no sentence, count or canvas mark until a value is written; its Nodes | Edges |
  Both control starts with nothing chosen and reads as disabled; find offers are cut where they
  differ ("Nodes where name is Mme ...").
- **Tree, key and settings.** Every row's Lock and Hide buttons are Tab stops (16 for 8 rows); the
  key card scrolls but cannot take focus, cuts its last block at 900 x 700, runs under the inspector
  at 200% zoom and prints motion speed as a bare number; several rows selected together show only
  Nodes and Selection colors; Values tab lists a continuous measure as "Groups, largest first" with
  two sections of one title.

Severity 0 and 1 items (glyph sizes in the tree, the painted-over glyph that looks like the vary
link, a dashed "current value" mark that reads as focus, right-click not selecting the row, menu
items whose names include their shortcut, Home and End on ramp sliders, colors spoken as hex,
headings that are buttons, and similar) are folded into the units below where they touch the same
code.

## Against the owner's three questions

1. **Unsetting.** The mechanism the owner was shown holds: a set field carries a minus at rest, its
   tooltip says what comes back, Delete and empty-then-Enter clear, every kind of field answers the
   same way. Three things still make "what comes back" untrustworthy, and all three are fixed next:
   the answer is read over the whole graph instead of the layer's own elements (graphty-element
   gains a scoped answer); it names layers the reader cannot see ("Node defaults" becomes "the
   default"); and Undo right after Clear does nothing. A field painted over by a layer above will say
   so, naming that layer, so the reader can see when a value of theirs is not what is drawn.
2. **No split parent.** None exists in this build and none is planned. There are two row kinds,
   layer and folder. Louvain's result is an ordinary layer whose color varies by Community; a
   group's own color is an entry in that ordinary binding; "New layer for Group 3" makes an ordinary
   layer with an ordinary rule. The mechanism is reusable by design and the next iteration proves
   it on a second kind of value: any column with few distinct values, numbers included (College
   football's conference), gets the same category popover and the same "New layer for" command.
3. **Figma.** Taken this iteration from the Figma walkthrough: one row per property (Figma's
   property rows) instead of a caption over every field; effect rows as Figma draws them (chip,
   name, settings, eye, minus; the color lives in the settings); "Mixed" only for a multi-selection
   that disagrees, as text with no swatch; a variable chip that shows its colors at rest; Cmd/Ctrl+Z
   reaching the document whenever a field has no pending edit; right-click selecting the row; row
   menus grouped by dividers with Hide and Lock; one 16 px gutter; flat section titles everywhere
   (Figma's right panel has no collapsing sections); "+" at a section title's right for "Add
   condition". Kept as a deliberate departure: the vary glyph drawn at rest (tier 1's evidence that
   hidden doors were found only by guessing).

## Decided for iteration 3

Each decision is reversible by an edit.

- **One row per property, about 28 px, label at the left.** A short label (11 px) in a fixed column,
  then the field, then the vary column and the Clear column. Pairs no longer share a row. Reason:
  a caption over each field doubles the height, and pairs do not fit 240 px with their columns.
  Measured target: Selected and the route fit 900 x 700 without scrolling. If they still scroll,
  accordions stay the owner's item 5; nothing collapsible is built.
- **One gutter and one field column** across the Style tab, Label settings, Graph settings and the
  folder's Selection colors.
- **What lies beneath is read over the row's own elements.** graphty-element adds an option to
  `styles.agreement` that scopes it to the elements a row matches (additive). For a row that
  matches nothing, it reads only the rows beneath that match every element, so Selected and Hovered
  show what an element gets when it enters them. A row that matches nothing is never "painted over".
- **Words for what comes back.** A value from graphty-element's own base layers is "the default";
  several values beneath read "Varies" with the layers in the tooltip; "Mixed" is only for several
  selected rows that disagree, as text without a swatch.
- **A painted-over field says so**: its label carries the tree's painted-over mark, with a tooltip
  naming the layer above and how many of this layer's elements it covers. The tree's mark gets a
  glyph that is not a link.
- **Effect and category rows use a chip, not a hex field.** compact-mantine's color input gets a
  chip-only form (a 24 px swatch opening the picker, with its name and "set here" or "not set" for
  screen readers). The color, strength and opacity of an effect live in its settings popover.
- **One name per value, from graphty-element's catalog.** Pills, rules, the key, the Values tab,
  the pickers and Undo name a value by its plain name ("Connections", "Community", "Bridging", "On
  the route"); a group by its group name ("Group 3"). A technical name ("degree") may appear as the
  picker's secondary text. A run's row keeps the run's plain name. Undo names the row as the tree
  does.
- **A kind change keeps the layer.** The row keeps its id, name and place. A rule that reads node
  values, moved to Edges, becomes "edges touching those nodes" (the existing between/touching
  choice), so the layer still paints; Edges to Nodes with an edge rule becomes "nodes at the ends of
  those edges". Focus stays on the kind control and the change is announced.
- **A column with few distinct values offers "One color per value"**, numbers included, using the
  element's ordinal scale, when graphty-element says how many distinct values a number column has
  (additive `ReadableValue.valueCount` for numbers). A column whose values are colors offers "Use
  the values as colors" (the passthrough scale) when graphty-element says so (additive fact).
- **Find and the rule editor read one list**, run results included; the element's find offers a rule
  once when two rules match the same elements. Edges get readable values for their source and
  target (additive); an empty list says why and points to Both.
- **Opacity varies through the color row's settings popover**; the inline percent stays for a fixed
  value. Yes-or-no properties (wireframe, show, curved, edge show) get no vary by: a rule plus a
  fixed value is their one home. Both are recorded in `coverage.ts` as decisions.
- **Labels draw readable at the default framing.** graphty-element adds a label size in screen
  pixels as an option (additive; world size stays the default), and the app adds new labels at a
  screen size it chooses. A label bound to a number takes a number format option (additive; default
  unchanged), which the app sets. This answers the open owner item on label size with the additive
  route that item named; the breaking route stays the owner's.
- **The Selected starting ring stands off every node color**, black included, and the background,
  at 3:1. It is unreleased, so this is the team's call.
- **Tree keyboard**: one Tab stop for the tree; Hide and Lock move to the row menu and their
  shortcuts, as in Figma. Right-click selects the row first. A new layer lands directly above the
  selected row with its kind preselected from the selection (Nodes when nothing is selected).
- **The ramp popover is 240 px wide at every window size** and opens where it fits whole, upward
  when the room is above. Its last action is a quiet text button, "Use one color", naming the color.

## Units for iteration 3

Layer 1, graphty-element: `element-kind-change-keeps-layer`, `element-scoped-beneath`,
`element-readable-values-3`, `element-labels-and-selected-look`.

Layer 2, compact-mantine: `cm-field-states-and-chips`, `cm-tree-popout-menus`.

Layer 3, the graphty app: `app-property-rows-one-line`, `app-effects-and-labels`,
`app-popovers-and-pickers`, `app-tree-key-settings`.

Layer 4: `app-which-elements-names-values` (it shares the Style tab with the layer 3 units).

Layer 5: `i3-stories-and-review` (stories, owner-review screenshots, API report, guide pages).

Every severity 2 to 4 finding is in one of these units; severity 0 and 1 findings are included
where they sit in the same code.

## Still open for the owner

Nothing in this iteration needs the owner's decision before it is built. At the approval review the
owner should judge what the studio cannot: whether the Selected row at rest, a column of empty
fields around its two effects, is acceptable; whether an entry's eye that hides what lies beneath
reads like Figma's eye; and whether one-line rows with a left label read as Figma's panel. The five
breaking items in `owner-decisions.md` (one element layer for both kinds, starting rows and run
placement on by default, the default selection and badge contrast, reduced motion, accordions only
if 900 x 700 still scrolls) and the label-size question are unchanged; the next build adds the
additive screen-pixel label size, which makes the label item's breaking route optional.
