# Tier 5 panel: the Visual Designer's proposal for the selection cards

Walked on build 13ab62a0bbe7 (graphty 0.8.92), volunteers.graphml, 1440 x 900, light scheme.
Screenshots: the main checkout's `tmp/design-studio/tier5/panel/visual/s1/` (01 to 16).

## What the live app shows today

- The two surfaces already draw one card two ways. Style's Which nodes card (s1/06): field name
  9 px bold, count as plain grey "24 nodes", "Add a condition" outside the card, a Between select
  and a bare slider. The Filters card (s1/10): same 9 px name, count as a blue pill "16 of 24",
  "Add a condition" inside the card, and the effect segments "Select | Filter to | Filter out" at
  about 8 px, the smallest text on the panel for the most consequential choice.
- The two attribute pickers have drifted: Filters heads its list "Nodes" with Node id first
  (s1/08); Style heads it "Data" with Node id under Structure (s1/05). "role (already a condition)"
  wraps to two lines (s1/15).
- A sentence sits where a control should: "Nodes that pass every condition".
- Louvain's run paints orange, blue and green at once and its key overlay reads "Color: Louvain"
  (s1/14); the selection ring is gold. Any group colors drawn on top would make three marks per node.
- The table leaves the canvas about 330 px tall (s1/16); selected rows are tinted lime. The Louvain column's header carries "#" and a sum glyph while the picker gives
  it the category glyph: one fact, two kinds.

## Answers to the owner's questions

**1. Open the table automatically while picking? No.** At the study size the dock halves the
canvas, and the canvas is where group colors read best. Give the editor's header a Table toggle
showing its shortcut, pressed while the dock is open; remember the reader's last choice. When the table is open during picking it shows "Show only
matches" and a group column: one 12 px swatch chit per row, never a row tint, because lime tint
already means selected.

**2. Suspend node and edge styling and paint group colors while picking? Yes, with a visible
switch.** While a selection editor has a card open, the canvas draws a picking view: every element
at the base neutral look, members painted in their group's color, the rest faded by the element's
dim mark. The reader's layers return when the editor closes. Reason: Louvain's colors plus the gold
ring plus a group color is unreadable. Two conditions: (a) the picking view is graphty-element's (a preview mode
or a top preview layer the element owns), never the app hiding layers; (b) the editor header
carries a pressed "Group colors" toggle and the key overlay's title reads the group names, so a
reader choosing by an existing encoding (pick the orange community) can turn it off and nobody
thinks their layers were deleted. Group colors come from graphty-element's palette, chosen to
avoid the selection band and hover mark hues; the app keeps no copy (visual-language A2).

**3. Algorithms in the cards or outside? Outside**, as the design says. A card only reads a run.
Picking a field whose algorithm has not run starts the same run Analyze starts, using the same
settings form (Resolution, Weight, "Under a second", Run, seen in s1/13) inside the card's
collapsed Settings row. The count chip slot holds the run state: a spinner chip with Cancel, or
"Run (about 6 min)".

## Dropdown contents and order

- **Group header row** (the Layers panel's row, 32 px): swatch chit in the icon slot, name
  (double-click renames), count chip, eye. "Start with" is a two-segment control on the group's
  first line, "All | None", never a dropdown: both choices are always visible.
- **Step verb menu** (one "+" at the end of the group, as Style layers' "+" opens a menu):
  Add (Union icon), Except (Subtract icon), Keep (Intersect icon), in Figma's boolean-menu order,
  each icon with its word. Figma's Exclude is not offered.
- **Value picker** (one picker for both surfaces, built on the approved attribute picker: search
  focused, kind glyphs, value summaries at right): Data, Results (runs in the session, dot =
  computed), the Analyze catalog's own category names ("Rank nodes and edges", "Find groups", ...),
  Added, Structure (within k hops of, connected to, on a path between, edges within / leaving,
  shares a value with, Data source, Largest component). A not-yet-run entry shows a clock glyph
  and its estimate in the summary slot. Entries name the value first ("community, Louvain"). An
  entry already used dims with a check glyph, never the words "(already a condition)".
- **Test**: the kind picks the control. Number, time and ordered: a 216 x 48 histogram with brush
  (the Values tab's histogram look and the Timeline's brush), and above it a two-segment "By value |
  By position". Category and tags: the existing checklist rows with dimmed counts. Flag: "Is | Is
  not". The "Between / At least" select stays only for typed bounds.
- **Computed on**: "Whole graph | So far", sizes in the tooltip; hidden when not recomputable.
- **Reference**: Focus, Selected node, Picked nodes, This group so far, then named selections,
  then type-to-find a node. Beside it a 24 px target button that arms picking from the canvas,
  Figma's eyedropper pattern.
- **Bounds**: compact-mantine's VariablePill (figma-spec 6.6) for mean, median and run values.

## What must match Figma and graphty

- Steps rest as one-line rows (verb icon, value, short test, count); one card open at a time,
  inline, as R4 already decided for filter cards. No drag grip glyph: Figma drags the row itself;
  Move up / Move down sit in the context menu.
- Card type: field name at 11/16 semi-bold, not a 9 px caption; segment words at 11 px. One count chip look in both surfaces: the pill.
- Verb icons are monochrome Figma glyphs. Mock J's green / blue / red tiles break "chrome color
  only for state" and red reads as an error.
- No tinted group box (mock J tints the open group blue): blue means focused. The only color in
  the editor is the group's chit.
- The no-sentence rule: "Nodes that pass every condition" goes; the Start with row says it.

## Risks

1. Height: a group, three steps and an open histogram card push Shape and Fill off a 900 px
   screen in the 240 px panel. Measure on the build.
2. Approved surfaces: the Which nodes card and the attribute picker are owner-approved; groups and
   ordered steps replace "flat cards, order never matters". The new direction is the owner's, but
   the reference screenshots must be retaken and recorded so the screenshot audit judges the new card.
3. Kind drift: if the table header, the picker and the card read the kind from different places,
   the card draws the wrong control. All three must read graphty-element's field measurement.
4. Group hues must clear the gold ring, the hover mark and the light canvas (also in dark mode).
5. Pending (dashed outline), faded and so-far states must differ without hovering.
6. The brush: build it from graphty's histogram and Timeline brush; moving it into Figma-locked
   compact-mantine goes to `owner-decisions.md`.
