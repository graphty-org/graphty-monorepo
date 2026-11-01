# Selection cards: the Figma Product Designer's proposal

Walked on build 13ab62a0bbe7 with volunteers.graphml: a style layer's Which nodes, the Data place's
Filters "+" and a role card, and Analyze. Screenshots: main checkout
`tmp/design-studio/tier5/panel/figma/w1/` (06 to 17).

## What the live build does today

- The two surfaces draw one card two ways. The Filters card has a count chip ("5 of 24"),
  Select | Filter to | Filter out and an on box (13.png); the Style card has a text count ("24
  nodes"), no effect, no on box (08.png). Closed, the Style card rests as a chip
  ("hours 2 to 52, 24 nodes", 10.png); the Filters card never closes.
- The two "+" pickers list the same columns in different orders: Style puts Node id under
  Structure (07.png), Filters puts it under Nodes and adds Largest component and Neighbors of
  selection (17c.png). Both draw a rule line after each section label, which the 2026-10-23 menu
  decision removed.
- "Nodes that pass every condition" is a UI sentence (owner rule: hints go in tooltips), and it
  states AND, which the new model replaces with "any group".
- A test is a select ("Between, Highest, Has a value, Has no value", 09.png) over a bare slider; no
  histogram, no by value / by position.
- Algorithm values appear in the pickers only after a run; Analyze is a separate popover with
  its own settings card and Run (15.png).

## One component, two headers

The Which nodes editor and a filter card become ONE component with one resting drawing. The only
difference is the header: a filter card adds the effect segmented control (Select | Filter to |
Filter out) and its on box; a style layer has neither (the layer's eye does that job). Counts are
always a chip, on the whole-graph base (decided 2026-10-30). Fix the shared component once, never
one screen.

## Figma patterns to match

- **Groups are layer-like rows** (Figma Layers panel): a color chit, the name (double-click
  renames), the count chip, the on box. Hovering a group or a step row puts the hover mark on its
  members, as hovering a style row already does (crosswalk row "Hovering a style in Selection
  colors"). Drag reorders; Delete removes a focused row; Control+D duplicates a group. Steps
  inside a group reorder by drag, because order is meaning (crosswalk: steps append at the end).
- **Steps are property rows** (Figma's Fill rows): one line at rest (verb glyph, value, short test,
  count; full words in the tooltip), click opens the card inline, X removes (graphty's existing
  remove, kept over Figma's minus because every graphty card uses X).
- **Verbs are Figma's boolean-operation glyphs**: Add = Union (`squares-unite`), Keep = Intersect
  (`squares-intersect`), Except = Subtract (`squares-subtract`), all in lucide-react, which the app
  already uses. Drawn as a 3-option icon segmented control (figma-spec 5.2, 24 x 24 glyph boxes,
  a tooltip per option) at the row's left, so changing a verb is one click, not a menu. Exclude
  (xor) is left out: no workflow needs it. The same glyphs already mean Union / Intersect /
  Subtract on set rows, so one glyph keeps one meaning across graphty.
- **Add first, configure after**: a group's "+" adds a step and opens the value picker at once
  (the Label "+" exception: a step with no value means nothing). Default verb: Add when the group
  starts with none, Keep when it starts with all.
- **Binding gesture**: a bound end of a range uses Figma's variable hexagon (as mock J), the same
  in-field button number rows already have.
- **Outline mode is the precedent for group colors** (Figma View > Outlines, Control+Y): a view
  mode that suspends paint without changing the file.

## The owner's open questions

1. **Open the table automatically while picking? No.** Figma never opens a panel on its own (UI3
   reverted panels that moved unasked), and the dock costs canvas height on the surface whose
   whole job is the picture. Instead the group and total count chips are a door: click opens the
   table on Show only matches, with the table's key shown in the tooltip. Re-test in the study:
   if readers with count-only feedback mis-pick, revisit.
2. **Suspend styling and paint group colors while picking? Yes in the filter editor, as a view
   mode; no in a style layer.** In a filter card the reader judges membership, and a color-by
   layer underneath makes group hue unreadable. Model it on Outline mode: on while the filter
   editor is open, one toggle in the editor header ("Group colors", with its key) to go back to
   the styled picture, off when the editor closes, never a layer, never in the legend, never
   saved. In a style layer the layer's own paint on its members IS the preview (edits apply live,
   as in Figma); group colors there only when the reader toggles them. This must be a
   graphty-element capability (an additive @beta preview option the element draws), never the
   app painting meshes (CLAUDE.md, Graph Styling).
3. **Algorithms run outside the cards.** Agree with J. Picking a field that has not run starts an
   ordinary run, listed in Analyze's results, with a computing chip and Cancel on the card. Its
   settings open from a settings button in the card in the SAME popover Analyze draws (one
   drawing per thing). Only "computed on this group so far" belongs to the step, and its row says
   so.

## Dropdown contents and order

- **Start with** (group header): segmented "All | None", the default set by the first verb.
- **Verb**: segmented icons Add, Keep, Except (that order: union, then the two narrowing ops).
- **Value picker** (one component for both surfaces, search shown and focused, arrows, Enter):
    1. Data -- columns in file order, kind glyph left, range or value count right.
    2. Results -- runs in this project, by run name (dot = computed).
    3. Analyze -- not-yet-run fields grouped by the catalog's categories, the cost estimate as a
       clock chip; entries name the value first ("community -- Louvain").
    4. Added -- user-registered algorithms.
    5. Structure -- Within k hops of, Connected to, On a path between, Linked to at least N of,
       Shares a value with, Downstream of, Upstream of, Edges within, Edges leaving, Largest
       component, While ... is not empty.
       Node id goes in Data, first, on both surfaces. Placeholder "Find a value" (it now lists
       results, not only attributes).
- **Test** (by kind): number, time, ordered: histogram with "By value | By position" segmented;
  category: counted checklist plus "By size"; flag: Is | Is not. "Has a value" / "Has no value"
  become the "not measured: K" chip's include toggle, not test options.
- **Computed on**: segmented "Whole graph | This group so far", behind the card's "...".
- **Reference picker**: Selected, Hovered, Pinned (the words the built-in layers already use),
  then This group so far, then sets, then a node by typing; a crosshair target button beside it
  arms canvas picking (Escape disarms).

## Words that collide with graphty's glossary

- "Group" is a part of a partition (glossary), and communities are offered as groups. Do not
  print "Group" on these rows: the section label reads "Any of", rows are named by their chit
  number until renamed. The noun is a decision for the content designer.
- "Focus" is a rejected word (glossary: Fade others). Name the reference "Hovered or selected".
- "Selection" is the canvas selection; the editor stays "Which nodes / Which edges" and "filter".
- "Named selection" is a **set**.

## Risks

- Group colors as canvas hue breaks the recorded departure "canvas marks are neutral; hue belongs
  to data". The view-mode framing is the forcing fact (a transient view, not a mark); the owner
  should confirm.
- A per-row verb segmented control widens the row; at 240 px the value chip may truncate. Truncate
  the test, never the value name (Figma never truncates a property name).
- Two counts per row (step and group) plus a total can read as three bases. All are whole-graph
  counts of what passes so far; show the step's as a delta in the tooltip only.
- The landing page's hover highlight needs "Hovered" as a live reference; a run keyed to hover
  must never start above the live budget while the pointer moves (J's rule).
- No compact-mantine change is needed: segmented control, select, checkbox and popover all exist
  in their Figma form; the glyphs are lucide icons.
