# Selection cards: the Interaction Designer's proposal

The selection model (groups of ordered Add / Keep / Except steps, one condition card each)
replaces the cards in a style layer's "Which nodes / Which edges" and in the Data place's Filters.
Live walk: Les Miserables, build 13ab62a0bbe7, `tmp/design-studio/tier5/panel/interaction/which/`.

## What the live app does today

- Typing "Val" in a name card counts "1 node" but the canvas does not change (09.png).
- The two "+" pickers differ (Data / Structure against Nodes / Edges / Structure); neither offers
  Degree, which the Values tab draws (07, 11.png).
- The filter's number card has no count; the style card has one (12.png), though the owner ruled
  (2026-10-29) that they are one card.

## Owner question 1: open the data table while picking?

**No automatic opening. The table follows the editor when it is open, and opening it is one click.**

- The editor header carries the toolbar's Table button (same icon, same key); pressed while
  picking, the table opens with a group color column and "Show only matches" on. The choice sticks
  for the session.
- Why: the canvas is the frame (owner, 2026-10-24); opening the dock unasked moves the drawing and
  breaks "nothing starts unasked". Counts that select what they count cover checking by name.

## Owner question 2: suspend styling and paint group colors while picking?

**Yes, as a picking view that lasts exactly as long as the editor is open.**

- While a selection editor is open: every style layer is suspended (not removed, no undo step, the
  layer list unchanged), members are filled with their group's color, everything else is drawn
  faded. The legend shows the group swatches.
- Done, Escape or a click away ends it and the real styles return in the same frame.
- An icon toggle in the editor header (tooltip "Picking colors") shows the real styles instead, for
  a reader tuning a layer's look against its own selection. Default on.
- Hovering a group or step row puts the hover mark on its members (Figma's "hovering a style marks
  what uses it", crosswalk line 214).
- Why: a condition with no visible effect fails "visible on commit" (the "Val" walk above).
- graphty-element owns it: an additive preview call (selection plus palette, returning a handle the
  app ends) drawn by element-owned transient layers, never layers the app writes.

## Dropdowns, contents and order

**Group header** (a Figma Layers row): color chit, name (F2 renames), count chip (selects the
members), eye, "..." (Duplicate, Delete, Save as named selection). One group draws no header, so the
simple case looks like today's card; "Add group" is a "+" under the last group.

**Start with**: a segmented control "All | None" on the group's first row, shown while editing.

**Verb menu**: the step row's leading icon with a chevron, as Figma's boolean-operation dropdown.
The faces are Add (Union icon), Keep (Intersect), Except (Subtract). Exclude is not offered. "+"
writes the verb the position implies (Add after "None", Keep after "All") and opens the field
picker straight away: one pick, not two.

**Field picker** (one component for both surfaces; search box focused; first typed letters rank):

1. In use: values this selection already reads.
2. Data: columns of this side (nodes or edges), then the other side's under its own heading (a node
   step reading an edge value offers "nodes touching", per mock J).
3. Results: runs that exist, a dot icon, the run's settings in the entry ("community -- Louvain,
   resolution 2").
4. Algorithms: not yet run, by catalog category, a clock icon with the element's estimate.
5. Added: user-registered algorithms.
6. Structure: within k hops of, connected to, on a path between, linked to at least N of, shares a
   value with, edges within / leaving, and "while ... is not empty".

Entries name the value first; one that cannot apply is greyed with the element's reason as its
tooltip; descriptions are tooltips; graph values are never entries.

**Test control**: no dropdown. The kind chooses the control (histogram brush, counted checklist,
date brush, is / is not). "By value | By position" is a visible segmented control on every orderable
card (owner, 2026-10-31). The card's "..." holds the rare options: computed on (Whole graph | This
group so far), include not measured, view, the algorithm's settings.

**Reference picker** (a searchable combobox): Focus, Selected node, Picked nodes (n), This group so
far, then named selections, then a node by typing its name. Beside it is a target button, Figma's
eyedropper habit: armed, the next canvas or table click fills the row; Escape disarms. Typing the
name is the keyboard route.

**Effect** (Data filter only): Select | Filter to | Filter out, a segmented control on the filter
row, Select for a new filter (tier 4 decision). A filter row is one selection with its effect, on
box and count. The order of filter rows still does not matter (owner option B); only steps inside
a group are ordered.

## How algorithms appear and run

Outside the cards. Picking an algorithm that has not run starts an ordinary whole-graph run that
lands in Results as if from Analyze, readable by every layer. Under about 1 s it runs on pick with a
computing chip and Cancel; above, the card shows "Run (about 6 min)" and the count is a pending
chip. A setting changed in the card's "..." points the step at a run with those settings, never
rewriting a run another layer reads. Only "computed on this group so far" runs belong to the step.
graphty-element evaluates, runs, caches and reports pending and failure (the additive `measure`
leaf); the app sequences nothing.

The landing page's hover is expressible: Keep "while Focus is not empty", Except "within 1 hop of
Focus", plus an edge selection and a Focus halo layer.

## Matching Figma and the rest of graphty

- A step row is one line (verb icon, value, short test, count); a click opens its card as a
  popover beside it (live edits, one undo step, outside click keeps, Escape restores). Today's
  inline cards are accordions, which the owner ruled out.
- "+" opens a picker; nothing is written until a value is picked (a dashed unchosen card writes
  nothing).
- A bound end (mean, median, a run's graph value) uses compact-mantine's `VariablePill`, Figma's
  apply-variable gesture.
- Rows behave like layer rows (Alt+Up/Down moves, Delete with Undo, one Tab stop with roving focus).
  Esc does one thing per press: disarm target, close menu, close card, end picking.

## Risks

1. The picking view faked in the app. Build the element's preview call first.
2. Within-group order is new for Filters; a Keep below an Add may be read as applying to all.
   The order icon and the moved-count chip guard it; test it.
3. Focus references rerun on hover: gate on the element's estimate, never a timer.
4. Figma's boolean glyphs may be missing from compact-mantine's locked set: record in
   `owner-decisions.md`, ship text faces.
5. Group colors must come from the element's palette and stay distinct from selection and hover.
6. The two pickers drift again: one component, one test that both list the same entries.
