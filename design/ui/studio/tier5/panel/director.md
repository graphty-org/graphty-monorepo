# Tier 5 panel: Design Director's proposal

Walked on build 13ab62a0bbe7 (graphty@0.8.92), Les Miserables, 1440 x 900. Screens: main checkout
`tmp/design-studio/tier5/panel/director/sel/01.png` to `16.png`.

## What the live app does today

- **Which nodes** (Style, layer editor): "Add a condition" opens a picker with Data (name) and
  Structure (Node id). No algorithm output, no structural condition, no reference. A card is field,
  operator Select, value box; the panel carries two sentences ("Nodes that pass every condition",
  "All 77 nodes: add a condition to narrow") and a toast "Dropped the name condition: it was not
  finished" when an empty card is left (06-09).
- **Filters** (Data place): "+" opens a picker grouped differently (Nodes, Edges, Structure:
  Largest component). The card is field, "Between", slider, two boxes: no count, no Select / Hide,
  no on box (11). Tier 4's R2 (one picker) and R4 (header with count and effect) are not visible in
  this build; check `git log` before anyone builds on them.
- **Analyze** palette: headed categories ("Rank nodes and edges") with a one-line description per
  entry (14). This is the catalog grouping the field picker should reuse.

The two surfaces disagree on the same act, and neither can use a result.

## One component, two homes

Build the J group editor once (`SelectionEditor`) and mount it in both places:

- Style layer: "Which nodes / Which edges" holds the layer's selection.
- Data place: "Filters" holds the data filter's selection plus ONE effect for the whole list, a
  segmented "Mark | Hide", default Mark (tier 4: 5 of 5 marking-first participants lost the picture
  on a subtractive default).

The tier 4 owner-approved Style card is the starting surface: a J step is that card with a verb
icon in front, so its header, count and remove stay as approved.

## Owner question 1: open the data table automatically?

**No.** The count chip on every group and step is a button: click opens the table on the matches
(one deliberate click, Figma's "select matching layers" gesture). When the table is already open
it follows the editor: a group swatch column, matches marked, "Only matches" toggle. Reason: the
drawing moves only when the reader asks; tier 4 R5 was four reviews against a canvas that shrank
unasked.

## Owner question 2: suspend styling and show group colors while picking?

**Yes, as a preview view mode, not a style change.** While a step card is open, the canvas draws
members in their group's color, everything else muted gray, and the legend shows the group swatches
(the key and the drawing never disagree). Closing the card, Done or Escape restores the layers. One
icon toggle in the editor header ("Preview groups", tooltip with its key) shows the real styling
instead. graphty-element owns it: a transient top layer the StyleManager draws and never persists,
shown as a temporary "Preview" row at the top of the layer list while active (appearance only
through layers; nothing hidden from the list). Additive `@beta` API next to the filter-conditions
API, e.g. `previewSelection(selection, { colors })` returning a handle with `end()`. Figma's analogue:
Outline mode, a view, not an edit.

## Dropdowns: contents and order

1. **"+" on a group** adds a step with defaults (Figma "+" adds first with defaults): verb Add when
   the group starts with none, else Keep; it opens the field picker at once.
2. **Verb** is the step row's leading icon, a menu in Figma's boolean order with Figma's glyphs:
   Add (Union), Except (Subtract), Keep (Intersect). Full words in tooltips. No Exclude.
3. **Start with**: a segmented "All | None" on the group's first row, not a dropdown.
4. **Field picker** (search focused; one component in both homes), groups in order:
   Data (this tab's columns, then the other kind's columns, labelled Nodes / Edges);
   Results (runs already in this session, dot = computed);
   catalog categories with Analyze's headings and order (not-run entries show a clock and estimate);
   Added (user-registered algorithms, the catalog's "custom");
   Structure (within k hops of, connected to, on a path between, linked to at least N of, shares a
   value with, edges within / leaving, largest component; Data source only with 2+ sources; Time
   window only in Filters; "while ... is not empty").
   Entries name the value first ("community -- Louvain"), kind glyph left, range or "not run" right.
   Descriptions go in the entry's tooltip, not under the list (owner: no sentences).
5. **Test**: chosen by kind, segmented, not a dropdown: number/time/ordered "By value | By position";
   category checklist with search and counts; flag "Is | Is not"; text keeps the approved operator
   Select (Contains, Starts with, Is, Matches). Histogram vs slider and "Computed on: Whole graph |
   Group so far" sit behind the card's "...".
6. **Reference**: a combobox: Selected node, Picked nodes, Focus, This group so far, a divider, named
   selections, then "type a node name". A target button beside it (Figma's eyedropper pattern) arms a
   canvas or table click; Escape disarms.
7. **Group "..."**: Rename, Color, Duplicate, Save as named selection, Delete. Color is a chit that
   opens the Look's palette (Figma's fill chit); defaults come from the element's categorical palette.

## How algorithms appear and run

Outside the cards, as J says. Picking a not-run field starts an ordinary whole-graph run: it lands in
Results with "read by 1 step", Analyze sees it, every layer can read it. Under ~50 ms it runs as the
reader edits, under ~1 s it runs with a computing chip and Cancel, above that the card shows the only
run control it owns: "Run (about 6 min)". Settings (options) sit collapsed in the card; changing them
makes a new shared run, never edits one another reader uses. Only "Group so far" runs belong to the
step. **Team decision needed:** a run started from a card must NOT add the automatic result layer
that an Analyze run adds (the reader asked for a condition, not a repaint); its row in Results
offers "Color by" instead.

## Must match Figma and graphty

- Group = a Properties-panel section (Fill-list pattern): header with chit, name, count, "+", "...";
  steps = rows with icon, value, short test, count, eye, remove; drag to reorder. No tree indent
  (graphty's Layout / Analyze rule and R4).
- Card opens inline (the approved Style card), one open at a time; Enter opens, Escape closes the
  innermost first.
- Counts read "24 / 77" like the layer rows; segmented controls are compact-mantine's, as Node / Edge.

## Risks

1. **Owner decisions collide.** 2026-10-29 "flat cards, order never matters" vs J's ordered steps.
   The owner's new request wins for the model, but say so in the report; Filters becomes ordered.
2. **Boolean glyphs** may not exist in the icon set; compact-mantine is Figma-locked. Draw them as app
   icons; anything that needs a compact-mantine change goes to `owner-decisions.md`.
3. **240 px panel** is tight for a histogram with two boxes and a binding hexagon; pilot at 1200 x 900.
4. **Auto layers and hover runs**: card-started runs that repaint, and Focus steps that start runs on
   hover, would move the picture unasked.
5. **Screen sentences** above and the "Dropped ..." toast must go.
6. **Preview mode honesty**: a muted canvas the reader forgets is on reads as a lost style. It must end
   with the card and show as a list row.
7. **Missing element facts** (`valueKind`, `polarity`, `domain`, `measure` leaf): all additive, but
   bfs `level` retagged ordinal may break `catalog` readers; group it or defer it.
