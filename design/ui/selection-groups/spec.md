# Selection groups: the binding spec

One selection editor, used in two places in the graphty app: a style layer's "Which nodes / Which
edges" (the **style selector**) and each card in the Data place's Filters (the **import filter**).
All graph logic is graphty-element's; its additions are in `element-api.md` beside this file. It
builds the owner-approved direction of mock J (main checkout `tmp/query-ui-research/interactive/J.html`
and `tmp/query-ui-research/j-framework/design.md`), settled by the tier 5 panel
(`../studio/tier5/panel/*.md`) and revised after three reviews (`../studio/tier5/spec-review-*.md`).
Binding decisions: `../studio/tier5/decided.md`.

## 1. The model

- A **selection** is on one side (nodes or edges) and is an ordered list of **groups**; the result is
  everything in ANY group that is on.
- A group has a color, a name, an on box, a **Start with** (All or None) and ordered **steps**. A
  step is a verb plus one **condition card**:
    - **Add** (Figma's Union): the group so far plus what the card matches;
    - **Except** (Subtract): the group so far minus it;
    - **Keep** (Intersect): only what both hold.
- A card = a **value** (a data column, an algorithm's output field, or a structure condition) +
  **computed on** (the host's **base**, section 2, or **So far**: this group before this step) + a
  **test** whose control the value's kind picks (section 5). A **Relative to** card tests against a
  **reference** (section 7).
- **Start with is written when the group is made, never derived**: a new selection's first group and
  every "+ Or" group start None; a converted tier 4 card starts All, and so does a layer of every
  node (one group of All, no step: what it paints). Moving steps never changes it.
- **Sides.** Start with speaks the selection's side. A node selection reads an edge value as "nodes
  touching a passing edge"; an edge selection reads a node value as "both ends pass" (default) or
  "either end passes", a chip on the row. A step still silent on the side changes nothing.
- **Step states.**
    - _Applied_, including _passes none_ (neutral ink). A chosen reference that is empty now matches
      nothing; a Keep or Except step, or one on So far, whose input is empty passes none.
    - _Inert_: a value, but the test is untouched, the reference unchosen, or a one-node option holds
      several nodes. It changes nothing; the row shows a short word ("No test", "No reference", "One
      node"), the full words in its tooltip.
    - _Pending_: its run is computing, waits for Run, is paused while hovering, failed, or is stale
      above the ask limit (section 6). A pending group keeps its last ready result (no flicker); a
      group never ready contributes nothing. Its chip shows the short word, the total counts ready
      groups (tooltip names the rest), later steps read "Waits for step N". At rest and while picking.
- **Unfinished work.** A step with a value is kept (inert until tested). A step with no value is
  taken back when its value picker closes with nothing chosen (Escape or a click away); focus returns
  to "+", announced once, no toast.
- **Order icon** on a step whose result depends on order: computed on So far (when it differs from
  the base), or on the base below a step of the other family (Add against Keep / Except). A run of
  base Keep and Except steps, or of base Add steps, is order-free.
- **Counts.** Group rows and the selection header carry the existing chip, "24 of 77": the result,
  out of the base. A step's chip counts the group so far after it, and its tooltip and name say so
  ("Keep, degree 6 to 10, 24 of 77 nodes so far"). A change fades "24 -> 18".
- **Simple case.** One group draws no header: a step is today's card plus a verb icon.

## 2. The two hosts

|                          | Style selector                                                   | Import filter                                                                                     |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Where                    | Style layer: Which nodes, Which edges                            | Data place Filters, one selection per card                                                        |
| Header                   | The layer's row (its eye)                                        | The approved card header, unchanged: name, count, remove, Select / Filter to / Filter out, on box |
| Base (screen word)       | **Filtered graph**: what the import filter leaves drawn          | **Full graph**: everything loaded, before any filter                                              |
| Runs read                | Runs on the filtered graph                                       | Runs on the full graph; filtered-graph runs greyed (circular)                                     |
| Live references          | Hovered or selected, Selected (N) follow the reader              | None: the element freezes Selected (N) to node ids on commit, shown as a chip                     |
| Re-evaluated on          | Data, runs, sets, hover, selection                               | Data, runs, sets                                                                                  |
| A count chip's click     | Selects what it counts (`design/ui/framework/task-flows.md` 4.3) | Opens the table on its rows (Matches only)                                                        |
| Order between selections | Layer order                                                      | None: cards combine as decided (option B)                                                         |

**Why.** The filter decides what every later reader sees: reading the filtered picture is circular,
following hover would re-lay the graph on every move, and a chip that selected would switch every
Select card off (tier 4), the edited one included. Filtering while a file is read is not in this build.

## 3. Layout and Figma consistency

compact-mantine's Figma spec: 11/16 type, 24 px controls, 32 px rows, 40 px section headers, hints
only in tooltips. **No compact-mantine change is needed**: SegmentedControl, HistogramRow with its
`brush`, VariablePill, the count chip, TooltipShortcut, MenuShortcut and the listbox exist; the verb
glyphs are lucide icons the app already ships.

- **Group row** (Figma Layers row): chit, name, count chip, on box. F2 or double-click renames,
  Mod+D duplicates, Delete removes, drag or Mod+] / Mod+[ reorders (Figma's bring forward / send
  backward); the style layer tree's rows gain the same keys. Hover marks its members.
- **The chit is hollow at rest, filled while the preview shows group colors**: at rest a filled
  swatch beside a layer would read as its paint, as a Figma fill swatch does.
- **Step row** (Figma Fill row), one line: verb icon (a menu button), value, short test ("6 to 10")
  or the inert word, order icon, count chip, on box, remove X on hover and focus; full words in its
  tooltip and name. Reorders like groups.
- **The card opens inline under its row, one at a time** (tier 4 R4), keeping the approved card's
  anatomy (field name, count chip, remove, the range and its two boxes), adding the test segment and
  the histogram. The field name is 11/16 semibold.
- **Card "..."**: Computed on, Settings, include not measured, Move up / down, Duplicate, Delete;
  every item with a key shows it (MenuShortcut), as `Groups.tsx` does.
- **The only color in the editor is the chit. No sentences at rest** ("Nodes that pass every
  condition", "All 77 nodes: add a condition to narrow" go).
- **Keyboard.** The step list is one Tab stop walked with arrows (roving focus). Enter opens a card;
  Escape closes the innermost thing per press (disarm target, close list, close card, end picking)
  and keeps edits (tier 3), except a just-added step with no value, which it takes back. Only the
  open card's controls are in the Tab order. A brush previews counts while dragging and writes one
  undo step on release; text writes on commit (tier 4 R3).
- **Width** (about 240 px): truncate the test, never the value name.

## 4. Dropdowns and segments, in order

- **"+" at a group's foot** (split button) adds a step and opens the value picker at once: Add on an
  empty None group, Keep on an empty All group, else the last step's verb. Its caret opens the verb
  menu first.
- **"+" Or** under the last group adds a group (None, the element's next free color) and opens its
  value picker; tooltip "Or: match another way"; disabled, reason in its tooltip, when the palette is
  used up.
- **Verb menu** (the row's icon, the "+" caret), Figma's boolean order, icon plus word: Add
  (`SquaresUnite`), Except (`SquaresSubtract`), Keep (`SquaresIntersect`). No Exclude. Aliases:
  union, subtract, remove, intersect, only.
- **Start with**: segmented "No nodes | All nodes" (edges on the edge side) on the group's first row.
  Sides: the style layer's two sections; a filter card's existing Node | Edge segment.
- **Value picker**: ONE component for both hosts (the approved attribute picker, extended), search
  focused, placeholder "Find attributes, results". With nothing typed:
    1. **Data**: this side's columns in table order (Node id first), kind glyph, value summary right;
       on the node side Degree (In, Out on a directed graph), read with no run; the other side's
       columns under "Edges (nodes touching)" / "Nodes (edge ends)"; Data source (two or more
       sources); Time window (import filter only).
    2. **Results**: fields of existing runs, value first, by the run's exact title ("community --
       Louvain (resolution 2)"), which names the scope when two runs differ by it; a computed dot. In
       the import filter, filtered-graph runs are greyed with the element's reason. No rank or
       percentile entries.
    3. **Analyze's categories, in Analyze's order and headings**: algorithms not yet run on this
       base, a clock and estimate above the live limit; committing starts the run. A single-field
       result is named by its method. Results with nothing per node or edge (link prediction pairs,
       temporal, graph facts) are not entries; hierarchical clustering and Girvan-Newman are
       categories, their cut in Settings.
    4. **Added**: user-registered algorithms (the catalog's "custom").
    5. **Structure** (the approved filter section, now in both hosts): Largest component, Isolated;
       on the edge side Self-loops, Repeated edges.
    6. **Relative to**: section 7's presets; "Neighbors of selection" is an alias of "within 1 hop of
       Selected (N)".

    Typing ranks all sections as one list. A used value shows a dimmed check; an unusable one is
    greyed, the element's reason as tooltip. Highlighting never starts a run; Enter or a click commits.

- **Test segment**: chosen by kind (section 5), always visible; the text card keeps the approved
  operator select (Contains, Starts with, Is, Matches).
- **Computed on** (card "..."): "Filtered graph | So far" or "Full graph | So far", sizes in
  tooltips; only on Keep and Except, only for algorithms with `scopeInput: "subgraph"`; So far
  disabled with its reason when it equals the base.
- **Reference picker** (searchable): style: Hovered or selected, Selected (N), So far, "Sets" with
  each set, then nodes by typed name; filter: the same without Hovered or selected. "None" first only
  for an optional option. Beside it a 24 px target button ("Pick on canvas", Figma's eyedropper):
  armed, the next click on a node in the canvas or table fills the reference, never changes the
  selection and never ends the preview; Escape disarms.
- **Group "..."**: Rename, Color, Duplicate, Save as set (live references freeze), Move up / down,
  Delete.
- **Selection header**: the preview toggle (section 9) and the toolbar's Table button (section 8).

## 5. Controls per kind

The table header, picker glyph and card all read the element's `valueKind` fact; the app never
derives a kind.

| Kind     | Segment (default first)  | Control                                                                                                                                                                                           |
| -------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| number   | By value, By position    | HistogramRow brush over two boxes; position adds "# / %" and top / bottom; mean and median ticks; log axis when skewed; tie chip ("10 asked, 12 kept: tied at 57"); domain 0..1 gets a fixed axis |
| time     | By value, By position    | the same with dates; an upper end means the end of that day                                                                                                                                       |
| ordered  | Pick, By position        | counted checklist in the declared order; numeric ordered values add By value                                                                                                                      |
| category | Pick, By size            | searchable counted checklist (members in the step's input, size as a faint bar); By size: the group-size histogram, By value or By position (largest N)                                           |
| tags     | Any, All                 | counted checklist ("none of" is an Except step), for values the element reports as tags                                                                                                           |
| flag     | Yes, No                  | the count beside each segment                                                                                                                                                                     |
| text     | approved operator select | approved text box                                                                                                                                                                                 |

- **Not measured** (absent, NaN, infinite): a chip "Not measured: K" with an include toggle (default
  excluded), worded by the field's `missing` fact ("Unreached: 3"). It replaces "Has a value / Has no
  value".
- An untouched range is not a test: the step is inert, boxes outlined.
- Brush ends land on data; ties keep together, by "#" and "%"; switching the test and back restores
  its values. The histogram is a view: boxes and thumbs are the keyboard input.
- A checked group of an unstable result is saved as "the group of X" (X the member the element names),
  shown "Community of Valjean", following X across re-runs.
- **Not in this build** (mock J keeps them): hierarchy cuts, several nodes for a one-node option,
  pair-list link scores, bounds bound to a graph value, "linked to at least N of".

## 6. Algorithms: outside runs, and So far

- **Every algorithm step saves as algorithm, settings, field and test**, whatever runs exist.
  graphty-element finds the run with that algorithm, settings and base, or starts one on commit: an
  ordinary run listed in Analyze, **without suggested styles** (a condition, not a repaint). One run
  per algorithm, settings and scope, shared; a style layer and a filter reading Louvain make two runs.
- **Removing that run in Analyze** makes the step pending ("Run"), never restarted unasked.
- **Run limits are element options**, unset by default; the app sets live 50 ms and ask 1 s. Under the
  live limit a run follows edits and hover; under the ask limit it starts on commit with a computing
  chip and Cancel; above it the card shows "Run (about 6 min)" and the step is pending until pressed
  (the element's `allowRun`). Consent holds until the step's definition changes. A stale run is rerun
  by the element under the same limits.
- **Settings** (card "...") is Analyze's own options form; a change points the step at the run with
  those settings, never editing a run another reader uses.
- **So far and live-reference computations belong to the step**: recomputed on its input, shared by
  identical steps, gone with the step, not in Analyze, no undo step. Their chip reads "So far" and opens
  Settings; a base run's chip is a door to its row in Analyze.

## 7. References and Relative to

- **Hovered or selected** (style only): the hovered node, else a lone selected node (reached by the
  keyboard walk), as the hover selector's `orSelected`. While the pointer moves, no run above the live
  limit starts ("Paused").
- **Selected (N)**: the canvas selection, any size. Live in style; frozen on commit in a filter.
- **So far**: this group before this step. **Sets**: each set. **A node**: typed, or picked.
- An unchosen reference makes the step inert; a chosen one that is empty now matches nothing, and is
  never read as an unset option (no run "from the first node").

**Relative to presets**, each listed once, each one rule form (`element-api.md` section 3):

| Preset                                        | Rule form                              |
| --------------------------------------------- | -------------------------------------- |
| is in                                         | `hops`, at most 0                      |
| within k hops of                              | `hops`, at most k (the reference too)  |
| connected to                                  | `hops`, no limit                       |
| downstream of / upstream of (directed graphs) | `hops`, direction out / in             |
| shares a value with ("Community of")          | `same-value`                           |
| on a path between (two references)            | `measure` of shortest path, both bound |
| edges touching / edges within / edges leaving | `touching`: either / both / one end    |
| while <reference> has nodes                   | `nonempty`: everything, else nothing   |

**The landing page's hover highlight is four style layers built with the editor** (acceptance 14),
with the values of `graphty/src/workspace/start/HeroGraph.tsx`:

1. Fade nodes: Start with All; Keep "while Hovered or selected has nodes"; Except "within 1 hop of
   Hovered or selected"; node opacity 0.3.
2. Fade edges: edge side, All; Keep "while ... has nodes"; Except "edges touching Hovered or
   selected"; edge opacity 0.15.
3. Its edges: edge side, None; Add "edges touching Hovered or selected"; the page's hot color,
   opacity 1, width x1.25.
4. Halo: None; Add "is in Hovered or selected"; the page's ring color as halo.

With nothing hovered or selected all four match nothing. The built-in `match: "hover"` selectors and
the Hovered layer stay.

## 8. Group colors and the table

- **Colors come from graphty-element**: a new group gets the first color of the element's group
  palette no other group holds (clear of the ring and hover hues, 3:1 on both themes), written into
  the group, so deleting or reordering never recolors another; the palette never wraps and is an
  element option. The chit's name carries the color word ("A, teal, 24 of 77 nodes").
- **Graph**: in the preview members draw in their group's color; the first group wins.
- **Table**: open while picking, it shows a Group column first (a 12 px chit plus the name, never a
  row tint: lime means selected), read from the element, and a new **Matches only** toggle, on (the
  glossary rejects "Show only"). Opening it never takes focus.
- **Count chips**: section 2. Hovering one marks its members. The selection header's chip is the
  style host's only (a filter card's own header counts the card); a group row's chip is its Enter.
- **Preview key rows** count what each group draws in its color (the first group wins, a group that
  is off draws none), from the element's `BranchReading.drawn`, so the rows and No match add up to
  the base; the group's full count stays on its editor row.

### 8a. Owner question: open the data table automatically while picking? No.

The selection header carries the toolbar's Table button (same icon and key); pressed while picking,
the table opens on Matches only with the Group column, for the session.

Why: the drawing moves only when the reader asks (owner 2026-10-24, "the canvas is the frame"); at
1440 x 900 the table leaves the canvas about 330 px tall (`s1/16.png`); nine of nine panelists said no.

## 9. Owner question: suspend styling and show group colors while picking? Yes.

**While the reader is picking** (a step card, the value picker or the verb menu is open) the canvas
shows a **preview**:

- every style layer is suspended (not removed, no undo step, the layer list unchanged);
- members draw in their group's color at the base look; the rest draws faint, never hidden, labels
  kept, so color is never the only signal; a pending group's last ready result is outlined;
- the Selected ring and the hover mark stay on top;
- the canvas key's title reads "Preview: Which nodes" (a filter: the card's name), with a swatch, name
  and count per group and "No match 7", so nobody thinks their styles are gone;
- in the import filter, the card being edited is held: what it would remove stays drawn faint.

It ends, styling returning in the same frame, on Done, Escape (once nothing smaller is open), a click
outside the editor (an armed target's click is picking, not outside), leaving the place or closing
the panel; announced once, never saved. A **preview toggle** in the selection header ("Group colors",
pressed by default) shows the real styling instead, per session and host. **graphty-element draws
it** (`styles.showBranches`), never the app hiding layers or touching meshes.

Why: "Val" in a name card counts "1 node" with no change on the canvas (`which/09.png`), and over
Louvain's hues a group color is unreadable (`s1/14.png`); Figma's Outline mode is the precedent.
Eight of nine panelists said yes; the Figma designer wanted it off in a style layer (a dry-run check).

## 10. What graphty-element adds, and what the app renders

The contract, with its canonical example, is `element-api.md`: additive and `@beta`.

**The app renders only** rows, cards, menus, segments, the words for every code (`style/words.ts`,
`data-place/filterWords.ts`), chits, the key's title, the table's Group column and Matches only
toggle, focus and announcements. It never evaluates, counts, converts a saved form, freezes a
reference, starts or gates a run, picks a color or paints.

## 11. Words

- Verbs Add, Except, Keep; Union, Subtract, Intersect in tooltips, aliases and a glossary entry.
- **No noun for a group on screen** ("group" is a part of a partition): a chit and a letter, A, B, C.
- **Scopes are the glossary's Filtered graph and Full graph** everywhere: Computed on, tooltips and
  run titles (`graphty/src/workspace/runWords.ts` says "visible" and "whole graph" today; this build
  changes it).
- **Hovered or selected** (not "Focus"), **Selected (N)** (not "picked nodes"), **set**, **So far**.
- Short words: No test, No reference, One node, Computing, Run, Paused, Failed, Stale. "Passes none"
  in neutral ink, never red; the Hovered layer's red "The rule leaves none" goes.
- The filter effect sits in the card header and the verb is an icon, so "Filter out" over "Except"
  reads once each; the dry run checks this double negative.

## 12. Acceptance checks

Real input, read through the public API or the screen, Les Miserables: element checks in
graphty-element, app checks in `*.real-element.test.tsx` and story play functions.

1. Fresh layer: Add degree By position 1 to 10, Add betweenness 1 to 10: Start with reads No nodes;
   the total equals an independent union.
2. A: Keep degree 6 to 10; B: Add community of Valjean. Total = A union B; B off removes only B's.
3. Brushing degree to 5 lands on 6; one undo step on release.
4. A step with a value and no test stays after closing, reads "No test", changes no count; no toast.
5. Swapping two base Keep steps changes no group or total count and draws no order icon; So far and
   an Add below a Keep draw it; moving an Except above an Add never changes Start with.
6. Saved tier 4 cards (a value, Largest component, Neighbors of selection) open as one group, Start
   with All, same count and picture.
7. Both pickers list the same entries in the same order, except Time window; states may differ.
8. "deg" finds Degree under Data with no run; arrowing onto betweenness starts no run; Enter does.
9. "+" on an All group writes Keep; the caret's menu reads Add, Except, Keep.
10. Betweenness picked in a style card is one filtered-graph run in Analyze, layer list unchanged; in
    a filter card that run is greyed and the pick starts a full-graph run.
11. Ask limit forced low: "Run (about X)", pending until pressed; Cancel leaves it pending; at rest
    the layer paints nothing for that group.
12. A So far run is not in Analyze and goes with its step.
13. Changing a card's settings leaves a run another layer reads unchanged.
14. Section 7's four layers draw the built-in hover layers' picture: hovered, with a lone selected
    node, and with neither (pixel compare).
15. A Hovered-or-selected step above the live limit starts no run while the pointer moves.
16. Target button: arm, click Valjean: the reference reads Valjean, selection and preview unchanged;
    Escape disarms.
17. In a filter, "within 1 hop of Selected" is frozen: selecting another node changes nothing.
18. Opening a step card suspends every layer (group colors, rest faint, ring kept, layer list
    unchanged); Escape restores the prior picture (pixel compare) with no undo step.
19. Preview toggle off shows the real styling while picking, for the session.
20. A Filter out card being edited keeps what it would hide drawn faint; Done hides it.
21. Opening a card does not open the table; the Table button opens it on Matches only with the Group
    column, focus kept in the editor.
22. A style group's count chip selects exactly its members; a filter's opens the table on them and
    no Select card switches off.
23. Group colors are 3:1 on both themes, differ from the ring and hover hues; deleting A keeps B's.
24. Keyboard only: one Tab stop, arrows, Enter; Mod+] moves a step and announces it; "..." items show
    their keys.
25. "+" then Escape leaves no step, focus on "+".
26. A screenshot audit of both hosts: no removed sentence, no filled chit at rest.

**Dry run and study re-tests**: "the most connected people who are also staff"; "color the people
within two steps of Valjean" from a fresh layer; pick, switch place, return: styles are back; a Filter
out card with an Except step; which preview default style-layer readers want.

## 13. Approved surfaces

The owner-approved Which nodes card and attribute picker (tier 4, bar 6) change as specified, at his
request, keeping the card's anatomy, the filter card header and the picker's Structure section;
their reference screenshots are retaken from the first build and listed in `decided.md`.
