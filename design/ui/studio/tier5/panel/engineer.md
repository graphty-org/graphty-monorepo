# Tier 5 panel: Design Engineer proposal (graphty-element API, big graphs)

Walked on build 13ab62a0bbe7 (graphty@0.8.92), Les Miserables; screenshots under the main checkout's
`tmp/design-studio/tier5/panel/engineer/style/` (01 to 13).

## What the live app does today

- Style layer "Which nodes" picker (05.png): two groups, Data (`name`) and Structure (`Node id`).
  Typing "degree" says "Nothing found" (06c.png) although the inspector shows a degree histogram and
  the element has a `degree` rule leaf.
- Data place Filters "+" (08c.png) is a different list: Nodes, Edges, Structure (Largest component).
  The same act is drawn by two pickers with different grouping; `Node id` is Structure in one and
  Nodes in the other.
- Algorithm values reach the picker only after an Analyze run (13.png): PageRank, "PageRank rank
  (1 = highest)" and "PageRank percentile" as three separate entries. Running PageRank also added a
  color layer that repainted every node (12.png): a run started from a picker must not do that.
- The number card (09c.png) is Between + slider + two boxes, no histogram.
- Sentences at rest: "Nodes that pass every condition", "All 77 nodes: add a condition to narrow".

## Answers to the owner's questions

**1. Open the data table automatically while picking? No.** The dock takes canvas width (at 900 px
it already covers the drawing and overflows its header), the table is view-only, and a choice that
acts before the reader decides cost the most in tier 4. Instead each group's count chip and the
total chip are buttons that open the table showing only that group's rows, and the table keeps the
group color in its mark column; on big graphs its marks refresh on brush release only.

**2. Suspend node/edge styling and paint group colors while picking? Yes, as an element view state,
on while the editor is open, with one toggle.** Not by hiding layers (undo steps, persisted, styling outside
the layer system). Proposed additive @beta
member: `session.styles.preview({ groups: [{ scope, color }], rest: "plain" | "faint" } | null)`,
view state like `hover` selectors (no undo, not saved, not in the layer list). The import filter
draws dropped elements "faint"; the style selector draws the layer's result. A toggle button in the
editor header (tooltip with its key) shows the real styling. Big graphs: the preview writes one
per-instance color index from the group masks the counts already computed; no material setters
(per-element material changes cost the size of the scene).

**3. Algorithms: outside the cards (agree with mock J).** Picking a field that has not run starts
an ordinary session run, the same one Analyze makes, listed in Analyze, readable by styles; it is
started with suggested styles OFF. The card shows only its state chip (computing / estimate /
Run about X / failed code). The only run a card owns is "computed on this group so far". The
element sequences runs (the `measure` leaf), never the app.

## Dropdowns, contents and order

One shared picker component for both surfaces (fix the two-picker split in the shared component).

- **Start with**: a two-segment control, All | None (not a menu), first row of each group.
- **Step verb** ("+" on a group): Add, Except, Keep, in Figma's boolean order (Union, Subtract,
  Intersect) with Figma's boolean icons; the step row shows the icon only, the word in its tooltip.
  No Exclude (no meaning here). "New group" is a separate "+" on the selection header.
- **Value picker** (search focused, ranked as in mock J), sections in order:
    1. Data -- node then edge columns, the approved attribute picker look; `Node id` here.
    2. Results -- one entry per field of each existing run, value first ("community -- Louvain");
       no rank / percentile entries ("by position" covers them).
    3. Algorithms -- not yet run, by catalog category, with an estimate chip; Degree included (it is
       cheap and the most asked-for value).
    4. Added -- user-registered algorithms (catalog "custom").
    5. Structure -- within k hops of, connected to, on a path between, linked to at least N of,
       shares a value with, edges within / leaving, largest component, data source, time window,
       "while ... is not empty". Unsupported value kinds greyed, reason in the tooltip.
- **Test**: chosen by kind, not a menu. Number / time / ordered: histogram brush above the approved
  range card (added, not restyled) with a By value | By position segment; category: counted
  checklist; flag: Is | Is not segment.
- **Computed on**: Whole | So far segment with sizes, only on Keep and Except, only when the
  algorithm has `scopeInput: "subgraph"`.
- **Reference**: Focus, Selected, Picked, This group so far, then named selections (`sets.list()`),
  then type to find a node; a target button arms a canvas click (Escape disarms).

## What must match Figma and graphty

- Steps are Layers-panel rows: icon, name, count right-aligned, on box, "..." on hover; one card
  open at a time in a Properties-style body (tier 4 R4). A group row carries its color swatch in
  the icon slot as the style-layer rows do.
- compact-mantine SegmentedControl, the existing count chip ("X of Y"), Escape and commit rules
  (R3): a brush previews counts while dragging and writes one undo step on release.
- No sentences at rest; the two sentences above become tooltips.
- Vocabulary risk: the glossary names filter outcomes "Filter to / Filter out" and rejects "Focus"
  as a word for Filter to. Keep / Except / Focus need a glossary entry before they ship.

## Element API (all additive, @beta beside the filter-conditions API)

- A `groups` rule leaf `{ kind: "groups", groups: [{ start, color?, steps: [{ op, rule, on?,
computedOn? }] }] }`. Today's flat cards are one group, start All, whole-graph Keep steps, so the
  old conditions convert losslessly. Style layers use it through `{ match: "rule" }`; the Data
  filter through `visibility` conditions with effect Select | Filter to | Filter out.
- `scope.countSteps(rule)`: every step's and group's count in one pass, with not-ready reasons as
  `{ code, params }`. N separate `scope.count` calls re-evaluate each prefix (steps squared).
- `histogram(path, { within })` for any readable value (today `data.histogram` takes data columns
  only), backed by a sorted index per (path, computed-on, data version): a brush move is a binary
  search, not a rescan.
- The `measure` leaf, `threshold.from: "low"`, the reserved `percentile` and `scope`, and a
  `"focus"` scope (the hover selector's `orSelected` rule).
- New value kinds read from descriptor `measurement` / `valueKind`; adding members to
  `ReadableValueKind` would change what an existing API returns.

Big graphs: masks are bit arrays (1M nodes = 125 KB); a changed step re-folds only the steps after
it from cached prefix masks; a Focus step never starts a run above the live budget while hovering.

## Risks

1. Retagging bfs `level` as ordinal changes `fieldMeasurement` for its shape: owner's call (mock J
   section 2); everything else here is additive.
2. A run started from a picker that adds suggested styles would repaint the graph mid-pick.
3. Ordered steps supersede tier 4's "order never matters" (owner direction for mock J).
4. The saved `groups` form becomes a file format once released: keep it @beta until the study.
5. The pickers drifting apart again: one component, and one test that both list the same entries.
