# Selection groups: the binding spec

One selection editor, used in two places in the graphty app: a style layer's "Which nodes / Which
edges" (the **style selector**) and each card in the Data place's Filters (the **import filter**).
All graph logic is graphty-element's. It builds the owner-approved direction of mock J (main
checkout `tmp/query-ui-research/interactive/J.html` and `j-framework/design.md`), settled by the tier 5
panel (`../studio/tier5/panel/*.md`). Binding decisions: `../studio/tier5/decided.md`.

## 1. The model

- A **selection** is an ordered list of **groups**; the result is everything in ANY group that is on.
- A group has a color, a name, an on box, a **Start with** (All or None) and ordered **steps**. A
  step is a verb plus one **condition card**:
    - **Add** (Figma's Union): the group so far plus what the card matches;
    - **Except** (Subtract): the group so far minus it;
    - **Keep** (Intersect): only what both hold.
- A card = a **value** (a data column, a built-in algorithm's output field, or a user-registered
  algorithm's field, each self-described by its descriptor) + **computed on** (the host's whole graph,
  or **So far**: this group before this step) + a **test** whose control the value's kind picks
  (section 5). A **Relative to** card tests against a **reference** (section 7).
- Start with, until chosen, is None when the first step is Add and All otherwise, and shows so.
- **Readiness.** A step is _applied_, _passes none_ (a definite answer) or _pending_ (computing,
  waiting for Run, no reference, test unset). Pending makes its group and the total pending: no count,
  no table mark, the group's last ready result as a dashed outline, later steps "Waits for step N".
- **Order icon** only on steps whose result depends on order: computed on So far (when So far differs
  from the whole), or an Add below a Keep or Except. Whole-graph steps are order-free.
- **Counts.** Group rows, step rows and the selection header carry the existing chip, "24 of 77":
  what passes so far, out of the host's whole graph (tier 4: every card counts against the whole
  graph). A change shows as a fading chip "24 -> 18". The accessible name adds the noun.
- **Unfinished work is kept** as a pending row; the "Dropped the name condition" toast goes.
- **Simple case.** One group draws no header: a step looks like today's card plus a verb icon.

## 2. The two hosts

|                          | Style selector                                  | Import filter                                                                                     |
| ------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Where                    | Style layer: Which nodes, Which edges           | Data place Filters, one selection per card                                                        |
| Header                   | The layer's row (its eye)                       | The approved card header, unchanged: name, count, remove, Select / Filter to / Filter out, on box |
| "Whole graph"            | What the import filter leaves drawn             | Everything loaded, before any filter                                                              |
| Runs read                | Runs on the drawn graph (`scope: "visible"`)    | Runs on the full graph (`scope: "graph"`)                                                         |
| Live references          | Hovered or selected, Selected follow the reader | Not offered; Selected freezes to node ids on commit                                               |
| Re-evaluated on          | Data, runs, sets, hover, selection              | Data, runs, sets                                                                                  |
| Order between selections | Layer order                                     | None: cards combine as decided (option B)                                                         |

**Why the import filter is "pre-load".** It decides which loaded data every later reader sees (runs,
layouts, layers, the table), so it reads only the loaded data and runs on all of it; a step reading a
run on the filtered picture would be circular. One following the pointer or selection would re-lay
the graph on every hover and click, and a Select card would chase its own selection; so its
references freeze to node ids on commit, as "Filter to neighbors" freezes its seeds, shown as a chip.
Filtering while a file is read ("Filter at import", `design/ui/framework/element-needs.md`) is not in
this build; when built it uses this editor with the Data section only.

## 3. Layout and Figma consistency

compact-mantine's Figma spec: 11/16 type, 24 px controls, 32 px rows, 40 px section headers, hints
only in tooltips. **No compact-mantine change is needed**: SegmentedControl, HistogramRow with its
`brush`, VariablePill, the count chip, TooltipShortcut and the listbox exist; the verb glyphs are
lucide icons the app already ships.

- **Group row** (Figma Layers row): chit, name, count chip, on box. F2 or double-click renames,
  Control+D duplicates, Delete removes, drag or Control+] / [ reorders. Hover marks its members.
- **Step row** (Figma Fill row), one line: verb icon (a menu button), value, short test ("6 to 10"),
  order icon, count chip, on box, remove X on hover and focus; full words in its tooltip and name
  ("Keep, degree 6 to 10, 24 of 77 nodes"). Reorders like groups.
- **The card opens inline under its row, one at a time** (tier 4 R4), keeping the approved card's
  anatomy (field name, count chip, remove, the range and its two boxes) and adding the test segment
  and the histogram. The field name is 11/16 semibold, not 9 px.
- **Card "..."** holds the rare options: Computed on, Settings, include not measured, Move up / down,
  Duplicate, Delete.
- **The only color in the editor is the chit.** **No sentences at rest**: "Nodes that pass every
  condition" and "All 77 nodes: add a condition to narrow" go.
- **Keyboard.** The step list is one Tab stop walked with arrows (roving focus). Enter opens a card;
  Escape closes the innermost thing per press (disarm target, close list, close card, end picking)
  and keeps edits (tier 3). Only the open card's controls are in the Tab order. A brush previews
  counts while dragging and writes one undo step on release; text writes on commit (tier 4 R3).
- **Width** (about 240 px): truncate the test before the value name; count and remove stay visible.

## 4. Dropdowns and segments, in order

- **"+" at a group's foot** (split button) adds a step with the implied verb (Add after None, Keep
  after All, else the last step's verb) and opens the value picker at once; its caret opens the verb
  menu first.
- **"+" Or** under the last group adds a group (Start with None, next palette color) and opens its
  value picker. Tooltip "Or: match another way".
- **Verb menu** (the row's icon, and the "+" caret), Figma's boolean order, icon plus word: Add
  (`SquaresUnite`), Except (`SquaresSubtract`), Keep (`SquaresIntersect`). No Exclude. Search
  aliases: union, subtract, remove, intersect, only.
- **Start with**: segmented "No nodes | All nodes" (edges on the edge side) on the group's first row.
- **Nodes | Edges**: the style layer keeps its two sections; a filter card has the existing Node |
  Edge segment above its selection.
- **Value picker**: ONE component for both hosts (the approved attribute picker, extended): search
  focused, placeholder "Find attributes, results". With nothing typed:
    1. **Data**: this side's columns in table order (Node id first), kind glyph, value summary right;
       then the other side's under "Edges (nodes touching)" / "Nodes (edge ends)"; then Data source
       (two or more sources) and, in the import filter only, Time window.
    2. **Results**: fields of existing runs, value first, by the run's exact title ("community --
       Louvain (resolution 2)"), with a computed dot. No rank or percentile entries.
    3. **Analyze's categories, in Analyze's order and headings**: fields of algorithms not yet run,
       with a clock and estimate when above the live budget. Degree is always listed; a single-field
       result is named by its method.
    4. **Added**: user-registered algorithms (the catalog's "custom").
    5. **Relative to**: section 7's presets.

    Typing ranks all sections as one list. A used value shows a dimmed check, never "(already a
    condition)"; an unusable one is greyed with the element's reason as tooltip; graph-level values are
    never entries. Highlighting never starts a run; Enter or a click commits.

- **Test segment**: chosen by kind (section 5), always visible; the text card keeps the approved
  operator select (Contains, Starts with, Is, Matches).
- **Computed on** (card "..."): "Filtered graph | So far" (style) or "Full graph | So far" (filter),
  sizes in tooltips. Only on Keep and Except, only for algorithms with `scopeInput: "subgraph"`; So far
  is disabled with its reason when it equals the whole.
- **Reference picker** (searchable): style: Hovered or selected, Selected (N), So far, "Sets" with
  each set, then nodes by typed name; filter: Selected (N), So far, Sets, typed nodes. "None" first
  only for an optional option. Beside it a 24 px target button ("Pick on canvas", Figma's
  eyedropper): pressed, the next click on a node in the canvas or table fills it; Escape disarms.
- **Group "..."**: Rename, Color, Duplicate, Save as set, Move up, Move down, Delete.
- **Selection header**: the preview toggle (section 9) and the toolbar's Table button (section 8).

## 5. Controls per kind

The table header, picker glyph and card all read the element's one kind fact
(`fieldMeasurement(field, shape)` plus section 10's facts).

| Kind     | Segment (default first)     | Control                                                                                                                                                                                           |
| -------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| number   | By value, By position       | HistogramRow brush over two boxes; position adds "# / %" and top / bottom; mean and median ticks; log axis when skewed; tie chip ("10 asked, 12 kept: tied at 57"); domain 0..1 gets a fixed axis |
| time     | By value, By position       | the same with dates; an upper end means the end of that day                                                                                                                                       |
| ordered  | Pick, By value, By position | counted checklist for named levels, histogram for numbers                                                                                                                                         |
| category | Pick, By size               | searchable counted checklist (members in the step's input, size as a faint bar); By size: the group-size histogram with By value, By position                                                     |
| tags     | Any, All                    | counted checklist ("none of" is an Except step)                                                                                                                                                   |
| flag     | Yes, No                     | the count beside each segment                                                                                                                                                                     |
| text     | approved operator select    | approved text box                                                                                                                                                                                 |

- **Not measured** (absent, NaN, infinite): a chip "Not measured: K" with an include toggle (default
  excluded), worded by the field's `missing` fact ("Unreached: 3"). It replaces "Has a value / Has no
  value".
- An untouched range is not a test: pending ("test unset"), boxes outlined.
- Brush ends land on data; ties keep together; switching the test and back restores its values.
- Unstable group ids are saved as "the group of X" (X its best-connected member), shown "Community of
  Valjean", following X across re-runs.
- The histogram is a view: boxes and thumbs are the keyboard input.
- **Not in this build** (mock J keeps them for later): hierarchy cuts, several reference nodes in one
  step (a second node for a one-node option is pending, "one node only"), pair-list link scores, bounds
  bound to a graph value.

## 6. Algorithms: outside runs, and So far

- **Runs live outside the cards**: a whole-graph run is the ordinary run Analyze makes, listed in
  Analyze and readable by every layer. The editor has no runs list; the step's run chip is a door to
  that run's row.
- **Picking a not-yet-run field starts the run on commit**, scoped as the host's whole graph, **without
  suggested styles** (`applySuggestedStyles` unset): the reader asked for a condition, not a repaint.
  Analyze runs keep their layer as today.
- **Cost gate** from `session.estimate` times the number of runs: under about 50 ms it runs as the
  reader edits; under about 1 s after the edit, with a computing chip and Cancel; above, the card shows
  "Run (about 6 min)" and the step is pending until pressed. Consent holds while a later estimate stays
  within twice the consented one.
- **Settings** (card "...") is Analyze's own options form for that algorithm. A change points the step
  at the run with those settings, creating it if needed; it never edits a run another reader uses.
- **So far runs belong to the step**: recomputed on its input, listed in Analyze as "<Method> (A, step
  2)", removed with the step. Same algorithm, settings and computed-on share one run.

## 7. References and Relative to

- **Hovered or selected** (style only): the hovered node, else a lone selected node (the keyboard walk
  moves the selection, so keyboard readers reach it). While the pointer moves, a step depending on it
  starts no run above the live budget ("Run (paused while hovering)").
- **Selected (N)**: the canvas selection, any size. Live in style; frozen on commit in a filter.
- **So far**: this group before this step. **Sets**: each set. **A node**: typed, or picked.

**Relative to presets**, each over an algorithm field or rule leaf and listed once: within k hops of;
connected to; on a path between (two references); downstream of / upstream of (directed); linked to at
least N of; shares a value with ("same community as"); is in; edges within; edges leaving; edges
touching; while <reference> has nodes (passes everything while the reference is not empty, else
nothing).

**The landing page's hover highlight is four style layers built with the editor** (acceptance 14):

1. Fade nodes: Start with All; Keep "while Hovered or selected has nodes"; Except "within 1 hop of
   Hovered or selected"; opacity 0.25.
2. Fade edges: edge side, Start with All; Keep "while ... has nodes"; Except "edges touching Hovered
   or selected"; opacity 0.15.
3. Darken its edges: edge side, Add "edges touching Hovered or selected"; a dark color.
4. Halo: Add "is in Hovered or selected"; halo.

The built-in `match: "hover"` selectors and the Hovered layer stay as they are.

## 8. Group colors and the table

- **Colors come from graphty-element**: an uncolored group takes the next color of the element's
  group palette (clear of the ring and hover hues, 3:1 on both themes), returned with the counts, so
  the app keeps no copy. The chit's name carries the color word ("A, teal, 24 of 77 nodes").
- **Graph**: in the preview members draw in their group's color; the first group wins.
- **Table**: open while picking, it shows a Group column first (a 12 px chit plus the name as text,
  never a row tint: lime tint means selected) and "Show only matches" on. Opening it never takes focus.
- **Count chips select what they count** (`design/ui/framework/task-flows.md` 4.3); hovering one marks
  its members.

### 8a. Owner question: open the data table automatically while picking? No.

The selection header carries the toolbar's Table button (same icon and key); pressed while
picking, the table opens on Show only matches with the Group column, for the session.

Why: the drawing moves only when the reader asks (tier 3 and 4 decided; owner 2026-10-24, "the
canvas is the frame"; tier 4's R5 took four reviews against a canvas that shrank unasked). Picking
happens on the canvas, and at 1440 x 900 the table leaves it about 330 px tall (visual walk
`s1/16.png`). All nine panelists said no; the members are one click away (the count chip).

## 9. Owner question: suspend styling and show group colors while picking? Yes.

**While the reader is picking** (a step card, the value picker or the verb menu of the selection is
open) the canvas shows a **preview**:

- every style layer is suspended (not removed, no undo step, the layer list unchanged);
- members draw in their group's color at the base look; the rest draws faint, never hidden, and keeps
  its label, so color is never the only signal;
- the Selected ring and the hover mark stay on top;
- the canvas key's title reads "Preview: Which nodes" (a filter: the card's name), with a swatch, name
  and count per group and "No match 7", so nobody thinks their styles were deleted;
- in the import filter, the card being edited is held: what its effect would remove stays drawn faint,
  so it can be seen and picked; other cards still apply.

It ends, styling returning in the same frame, on Done, Escape (once nothing smaller is open), a click
outside the selection, leaving the place or closing the panel; announced once, never saved. A
**preview toggle** in the selection header ("Group colors", pressed by default) turns it off for a
reader picking by an existing encoding or tuning a layer's look; the choice holds per session and host.
**graphty-element draws it** (`styles.preview`, section 10), as view state through one per-element
color index, never by the app hiding layers or touching meshes (CLAUDE.md, Graph Styling).

Why: a condition must be visible on commit, yet typing "Val" into a name card counts "1 node" with no
change on the canvas (interaction walk `which/09.png`); after Louvain the canvas already draws three
hues plus the gold ring (visual walk `s1/14.png`), so a group color on top is unreadable or equals a
community color, a picture that looks right and answers wrong. Figma's precedent is Outline mode, a
view that suspends paint without changing the file. Eight of nine panelists said yes on both hosts;
the Figma designer's "no in a style layer" is covered by the toggle. "Hue belongs to data" holds: the
preview is a transient view of the reader's own choice, and it always ends.

## 10. graphty-element API additions (additive, `@beta`) and what the app renders

Optional members and new exports only, marked experimental beside the filter-conditions API. The
saved `groups` form becomes a file format once released, so it stays `@beta` until the user study.

1. **`groups` rule leaf**, wherever a `RuleTree` goes (`match: "rule"` selectors, filter conditions,
   sets):
    ```ts
    { kind: "groups"; groups: readonly { id: string; name?: string; color?: string; on?: boolean;
        start?: "all" | "none"; steps: readonly { id: string; op: "add" | "keep" | "except";
        on?: boolean; rule: RuleTree; computedOn?: "whole" | "so-far" }[] }[] }
    ```
    Tier 4 flat cards convert losslessly (one group, All, whole-graph Keep steps). A filter effect's
    edge reading applies to each step as to a plain rule.
2. **Scope forms** (open union): `"focus"` (hovered, else a lone selected node; view state) and
   `"so-far"` (the step's input; only inside a `groups` step, else `E_BAD_RULE`). `node-id` and
   `node-set` options accept a Scope.
3. **`measure` leaf** `{ kind: "measure", algorithm, params?, field, test }`: the element starts the
   run without suggested styles, caches it by definition, recomputes on change, gates it on its
   estimate and reports pending and failure. Only where no existing leaf reads the value.
4. **`threshold.from?: "high" | "low"`** with the reserved `percentile`; **`missing?: "include" |
"exclude"`** on `range`, `categories`, `threshold`.
5. **`session.scope.countSteps(rule)`**: every group's and step's count in one pass, a state
   (`"applied" | "none" | "pending"`, open), a `{ code, params }` reason when not applied
   (`computing`, `run-needed`, `no-reference`, `test-unset`, `reference-outside`, `group-empty`,
   `run-failed`, `nothing-measured`, `one-node-only`), and each group's resolved color.
6. **`session.scope.histogram(path, { within?: Scope })`** for any readable value, run fields
   included, over a sorted index per path, set and data version.
7. **`session.styles.preview(input): { end(): void }`**, `input = { groups: [{ scope, color }], rest?:
"faint" | "plain", hold?: conditionId }`, plus `styles.previewing` and `style:preview-changed`. One
   at a time; a replaced handle's `end()` does nothing. No undo, not saved, not a layer.
8. **Descriptor facts** (optional): `valueKind` (`"tags"`, open), `domain`, `polarity`, `order`,
   `missing` (open), `unstable` on fields; `keywords` on algorithms. Declaration fixes that change no
   output: 0..1 domains, `polarity: "lower"` on distances and ranks, `missing: "unreached"` on bfs and
   shortest path. Retagging bfs `level`, k-core and dfs `value` ordinal changes what
   `fieldMeasurement` returns: it waits for the owner; this build keeps today's kind.
9. An additive `selection.focused` only if the keyboard-walked node is not already published.

Used as is: `applySuggestedStyles` (left unset), `session.estimate`, `visibility.conditions`,
`conditionCounts`, `selection.hovered`, `sets.list()`.

**The app renders only** rows, cards, menus, segments, the words for every code (`style/words.ts`,
`data-place/filterWords.ts`), chits from resolved colors, the key's preview title, focus and
announcements. It never evaluates a rule, counts, sequences a run, picks a color or paints.

## 11. Words

- Verbs Add, Except, Keep; Union, Subtract, Intersect in tooltips and aliases. A glossary entry ties
  them to the set-row commands of those names.
- **No noun for a group on screen** ("group" is a part of a partition in the glossary): a chit and a
  renamable letter, A, B, C.
- "Focus" (taken by the keyboard's focused row; rejected for Filter to) is **Hovered or selected**;
  "picked nodes" is **Selected (N)**; a named selection is a **set** ("Sets"); "this group so far" is
  **So far**.
- "Passes none" in neutral ink, never red; the Hovered layer's red "The rule leaves none" at rest goes.
- Filters effect segments are named by their short words, sentences only in tooltips. The effect sits
  in the card header and the verb is an icon, so "Filter out" over "Except" reads once each; the dry
  run checks this double negative.

## 12. Acceptance checks

Real input, read through the public API or the screen, Les Miserables: element checks in
graphty-element, app checks in `*.real-element.test.tsx` and story play functions.

1. Add degree By position 1 to 10, Add betweenness 1 to 10: Start with reads No nodes; the total
   equals an independent union.
2. A: Keep degree 6 to 10; B: Add community of Valjean. Total = A union B; B off removes only B's.
3. Brushing degree to 5 lands on 6; one undo step on release.
4. A step with no test stays pending after closing; no toast; no group count; the next step reads
   "Waits for step 1".
5. Moving a whole-graph step changes no count and draws no order icon; So far draws both.
6. A saved tier 4 filter card opens as one group, Start with All, same count and picture.
7. Both hosts' pickers list the same entries in the same order.
8. "deg" finds Degree before it has run; arrowing onto betweenness starts no run; Enter does.
9. "+" after All writes Keep; the caret's menu reads Add, Except, Keep.
10. Betweenness picked from a card is one run in Analyze; the layer list is unchanged.
11. With costs forced high: "Run (about X)", pending until pressed; Cancel leaves it pending.
12. A So far run is listed "<Method> (A, step N)" and goes with its step.
13. Changing a card's settings leaves a run another layer reads unchanged.
14. Section 7's four hover layers draw the built-in hover layers' picture, hovered and with a lone
    selected node.
15. A Hovered-or-selected step above the live budget starts no run while the pointer moves.
16. Target button: arm, click Valjean, the reference reads Valjean; Escape disarms.
17. In a filter, "within 1 hop of Selected" is frozen: selecting another node changes nothing.
18. Opening a step card suspends every layer (group colors, rest faint, ring kept, layer list
    unchanged); Escape restores the prior picture (pixel compare) with no undo step.
19. Preview toggle off shows the real styling while picking, for the session.
20. A Filter out card being edited keeps what it would hide drawn faint; Done hides it.
21. Opening a card does not open the table; the Table button opens it on Show only matches with the
    Group column, focus kept in the editor.
22. A group's count chip selects exactly its members.
23. Every group color is 3:1 on both canvas themes and differs from the ring and hover hues.
24. Keyboard only: one Tab stop, arrows, Enter; Control+] moves a step and announces it.
25. A screenshot audit of both hosts finds none of the removed sentences.

**Dry run and study re-tests**: "the most connected people who are also staff"; "color the people
within two steps of Valjean" from a fresh layer; pick, switch place, return: styles are back; a Filter
out card holding an Except step answered correctly.

## 13. Approved surfaces

The owner-approved Which nodes card and attribute picker (tier 4, bar 6) change as specified, at the
owner's request, keeping the card's anatomy and the filter card header; their reference screenshots
are retaken from the first build and recorded in `decided.md`.
