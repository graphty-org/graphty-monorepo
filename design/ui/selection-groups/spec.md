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
- A group has a color, a name, an on state (the eye), a **Start with** (All or None) and ordered **steps**. Once
  there are several groups each holds its letter as its name, written when it is made, as its color
  is, so moving or copying a group never renames one (a copy takes the next free letter and color);
  a lone group goes by the selection's title. A step is a verb plus one **condition card**:
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
  "either end passes", said on the row and the folded chip ("either end"; both ends goes unsaid). A
  step still silent on the side changes nothing.
- **Step states.**
    - _Applied_, including _passes none_ (neutral ink). A chosen reference that is empty now matches
      nothing; a Keep or Except step, or one on So far, whose input is empty passes none.
    - _Inert_: a value, but the test is untouched, the reference unchosen, or a one-node option holds
      several nodes. It changes nothing; the row shows a short word ("No test", "No reference", "One
      node"), the full words in its tooltip.
    - _Pending_: its run is computing, waits for Run, is paused while hovering, failed, or is stale
      above the ask limit (section 6). A pending group keeps its last ready result (no flicker); a
      group never ready contributes nothing. Its row shows the short word, the total counts ready
      groups (tooltip names the rest), later steps read "Waits for step N". At rest and while picking.
- **Unfinished work.** A step with a value is kept (inert until tested). A step with no value is
  taken back when its value picker closes with nothing chosen (Escape or a click away); focus returns
  to the Add row, announced once, no toast.
- **Order.** A step's result depends on order when it is computed on So far (when that differs from
  the base), or on the base below a step of the other family (Add against Keep / Except). A run of
  base Keep and Except steps, or of base Add steps, is order-free. A So far step carries the "So far"
  tag on its row; no order icon is drawn (revised 2026-11-01).
- **Counts.** The title row and group rows carry the count, "24 of 77": the result, out of the base. A
  step's count is the group so far after it; it is shown in the step pane and the row's tooltip and
  name ("Keep, degree 6 to 10, 24 of 77 nodes so far"), never in the row. A change fades
  "24 -> 18". In the style host a count's click selects what it counts; in the import filter it is
  plain text, because the table lists a group's members, never one step's.
- **Simple case.** One group draws no group row: its steps sit under the title row.

## 2. The two hosts

|                          | Style selector                                                   | Import filter                                                                                  |
| ------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Where                    | Style layer: Which nodes, Which edges                            | Data place Filters, one selection per card                                                     |
| Header                   | The layer's row (its eye)                                        | On box, name, count; Select N, Duplicate and Delete in its "..." (section 3.3; no effect word) |
| Base (screen word)       | **Filtered graph**: what the import filter leaves drawn          | **Full graph**: everything loaded, before any filter                                           |
| Runs read                | Runs on the filtered graph                                       | Runs on the full graph; filtered-graph runs greyed (circular)                                  |
| Live references          | Hovered or selected, Selected (N) follow the reader              | None: the element freezes Selected (N) to node ids on commit, shown as a chip                  |
| Re-evaluated on          | Data, runs, sets, hover, selection                               | Data, runs, sets                                                                               |
| A count chip's click     | Selects what it counts (`design/ui/framework/task-flows.md` 4.3) | Opens the table on its rows (Matches only)                                                     |
| Order between selections | Layer order                                                      | None: cards combine as decided (option B)                                                      |

**Why.** The filter decides what every later reader sees: reading the filtered picture is circular,
following hover would re-lay the graph on every move, and a count that selected would mix picking
with filtering. Filtering while a file is read is not in this build.

## 3. Presentation: what shows, and when

Revised 2026-11-01 after the owner's review of the built cards ("cramped", "disorganized", "no
progressive disclosure", `../studio/tier5/owner-feedback-2026-11-01.md`). The editor is an
**outline and one property pane**, as Figma's Layers panel above its Design panel and as graphty's
own Style tab: the outline is the recipe at rest; the pane holds the controls of the ONE selected
row. Nothing opens inline, so rows never move, wrap or leave gaps. Reference mock:
main checkout `tmp/selection-redesign/outline/index.html` (served at `/outline/` by servherd's
`selection-redesign-mocks`).

compact-mantine's Figma spec: 11/16 type, 24 px controls, 32 px rows, 40 px section headers, hints
only in tooltips. **No compact-mantine change is needed** (SegmentedControl, HistogramRow with its
`brush`, the listbox, Menu with MenuShortcut, Checkbox, the count text).

**At rest** means no row is selected: the editor is read, not edited. **Selected** means one row is
selected and the pane under the outline shows its controls; the canvas shows the preview (section 9).
Picking ends, and the editor returns to rest, on Escape (once nothing smaller is open), a click on
the canvas or outside the editor (an armed target's click is picking, not outside), leaving the place
or closing the panel.

### 3.1 The outline, row by row

Every row is one 32 px line of fixed columns: an indent (16 px under a group row once there are two
groups), a **verb column 40 px wide**, the **value name** (never truncated), the **test** (the only
part that truncates, at its tail, the full words in the row's tooltip and name), then **tags** for
non-default settings (never truncated), then the row's state word. A column that is empty takes no
space at rest; nothing reserves space for a control that is not drawn.

| Row                                                               | At rest                                                                                                                                                                                                                                                                                  | On hover or focus                                                                                                                               | Selected (pane)                 |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Title** ("Which nodes", "Which edges", or a filter card's name) | The name and the result, "12 of 77" (tooltip names the base: "of 60 in the filtered graph"). A filter card adds its on box first.                                                                                                                                                        | Unchanged.                                                                                                                                      | Title pane (3.2).               |
| **Group** (only once there are two)                               | Hollow chit, letter, count ("4"). "Off" when turned off.                                                                                                                                                                                                                                 | The eye (turn off); the canvas marks its members.                                                                                               | Group pane.                     |
| **All nodes** (a group that starts with everything)               | Empty verb column, "All nodes" in secondary ink. A group that starts with none draws no row.                                                                                                                                                                                             | Its count, the base.                                                                                                                            | Group pane.                     |
| **Step**                                                          | Verb word (Add, Keep, Except), value ("Community"), test ("1, 3 and 4 more", "min 10", "3 to 7", "Valjean"), tags ("So far", "Either end"), state word if any ("No test", "No reference", "One node", "Run", "Computing", "Waits", "Passes none", "Off"). No count, button, box or icon. | The canvas marks what the group holds after this step; the tooltip gives the full words and "24 of 77 nodes so far".                            | Step pane.                      |
| **Add row** (per group)                                           | Not drawn, except on an empty selection, where it is the only row.                                                                                                                                                                                                                       | Under the hovered group: the verbs that can change it, as words: "Add...", or "Keep... Except..." on an All group with no step, else all three. | Under the selected row's group. |
| **Or...**                                                         | Not drawn.                                                                                                                                                                                                                                                                               | Under the last group, once any group has a step. Disabled when the palette is used up, reason in its tooltip.                                   | Same.                           |

- **Passes none** is drawn at rest, in neutral ink, on the step that emptied its group, so an empty
  result is never silent. The title's count then reads "0 of 77".
- **Relative to rows** put the condition in the value column and the reference in the test:
  "Within 2 hops | Valjean", "Is in | Selected (3)", "While | Watchlist has nodes". A long node name
  truncates; the condition never does.
- **Numeric tests** use the Min and Max boxes' words: "min 10", "max 1", "3 to 7", "top 10".
- **Category, ordered and tag tests** summarize: up to three values ("1, 3, 4"), else "1, 3 and
  2,083 more" (sorted, thousands separated). A row never lists every value.
- The **chit is hollow at rest, filled while the preview shows group colors** (unchanged).
- **The only color in the editor is the chit. No sentences** anywhere in the editor.

### 3.2 The property pane

One pane, under the outline, for the selected row; the step's controls are never repeated in the
row. **Advanced** is a collapsed disclosure, collapsed every time a row is selected; when a setting
in it is not at its default, its name is written on Advanced's right ("So far", "Either end").

| Selected row           | Pane, always visible                                                                                                                                                                                                                                | "..." menu (keys shown)                                                           | Advanced (collapsed)                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Step**               | Verb segment Add / Keep / Except (Union, Intersect, Subtract in tooltips), the running count ("138", tooltip "138 of 254 edges so far"), "..."; the value field (opens the value picker); the test for its kind (section 5) or "Run (about 4 min)". | Turn off, Duplicate (Mod+D), Move up (Mod+]), Move down (Mod+[), Delete (Del).    | Computed on (Filtered or Full graph, So far), Edge ends (Both, Either), Not measured (include), the algorithm's Settings. |
| **Group**              | Name and "..."; Start with (No nodes / All nodes); Color.                                                                                                                                                                                           | Duplicate, Save as set, Move up, Move down, Delete.                               | None.                                                                                                                     |
| **All nodes**          | As the group.                                                                                                                                                                                                                                       | As the group.                                                                     | None.                                                                                                                     |
| **Title, style layer** | Start with (one group only); Preview (Group colors / Styled).                                                                                                                                                                                       | None.                                                                             | None.                                                                                                                     |
| **Title, filter card** | Name and "..."; Nodes / Edges; Start with (one group only); Preview.                                                                                                                                                                                | **Select N** (selects the card's matches on the canvas, once), Duplicate, Delete. | None.                                                                                                                     |

### 3.3 Filter cards

- The Filters list draws **one open card**: its outline (and the pane when a row is selected).
  Every other card is one collapsed row: on box, name, "53 of 77". Clicking a collapsed card opens it.
- **A filter card always says what stays**: its selection IS what stays, so a card has no effect
  word. A new card starts as one group of **All nodes** and narrows with Keep and Except; Add
  widens. "Leave out community 1" is "All nodes / Except Community 1".
- Saved tier 4 cards convert (graphty-element converts saved forms, section 10): Filter to becomes
  All + Keep <its condition>; Filter out becomes All + Except <its condition>; Select becomes All +
  Keep <its condition> with the card turned off, so it changes nothing until the reader turns it
  on or uses Select N.

### 3.4 Keyboard

The outline is one Tab stop walked with arrows (roving focus); Enter moves focus into the pane;
Escape closes the innermost thing per press (disarm the target, close a list or menu, deselect the
row, end picking) and keeps edits (tier 3), except a just-added step with no value and a new filter
card with no step, which it takes back. In the outline: Delete removes the selected row, Mod+D
duplicates, Mod+] / Mod+[ move it (Figma's bring forward / send backward); the style layer tree's
rows gain the same keys. A brush previews counts while dragging and writes one undo step on
release; text writes on commit (tier 4 R3).

## 4. Adding things, and the dropdowns in order

### 4.1 One meaning for "+"

**"+" appears only in a section header and adds a new item to the list under it**: "Style layers +"
adds a style layer, "Filters +" adds a filter card. Nothing inside a selection draws a "+".

- **A step** is added by the verb word in the group's Add row ("Add...", "Keep...", "Except..."),
  which adds the step with that verb and opens the value picker at once. Only verbs that can change
  the group are offered: an empty None group offers Add; an All group with no step offers Keep and
  Except; afterwards all three.
- **A group** is added by "Or..." (a None group in the element's next free color, its value picker
  opened); tooltip "Or: match another way".
- Escape or a click away from a value picker that chose nothing takes the new step (and a new
  group's only step, and the group) back; focus returns to the Add row, announced once, no toast.

### 4.2 Dropdowns and segments

- **Verb segment** (step pane): Add, Keep, Except (Figma's boolean order Union, Intersect,
  Subtract in tooltips; aliases union, subtract, remove, intersect, only). No Exclude. Verbs are
  words everywhere; a verb is never shown only as a glyph.
- **Start with**: segmented "No nodes | All nodes" (edges on the edge side) in the group pane, or the
  title pane while there is one group. Sides: the style layer's two sections; a filter card's
  Nodes | Edges segment in its title pane.
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

- **Test**: chosen by kind (section 5), in the step pane; the text test keeps the approved operator
  select (Contains, Starts with, Is, Matches).
- **Computed on** (Advanced): "Filtered graph | So far" or "Full graph | So far", sizes in tooltips;
  only on Keep and Except, only for algorithms with `scopeInput: "subgraph"`; So far disabled with its
  reason when it equals the base. When So far is on, the row carries the "So far" tag.
- **Reference field** (step pane) with a 24 px target button beside it ("Pick on canvas", Figma's
  eyedropper): armed, the next click on a node in the canvas or table fills the reference, never
  changes the selection and never ends the preview; Escape disarms. The reference picker is 4.3's.
- **Hops**: a number box, default 2.

### 4.3 Large graphs: every list is bounded

Checked on a generated graph of 50,000 nodes, about 99,000 edges and 5,000 communities. No surface
draws a list whose length grows with the graph; past its cap a list says how many it holds and
search finds the rest. Long lists are virtualized listboxes (compact-mantine's).

| Surface                                  | With nothing typed                                                                                                                                                                                            | While typing                                                                                                                     | Shown when chosen                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Reference picker**                     | "Pick on canvas" first; Live: Hovered or selected (style only), Selected (N), So far; Sets: the first 8 by name, heading "8 of 31" past 8; Nodes: a heading with the node count and **no node rows**.         | The same sections filtered; nodes by name, prefix matches first then by degree, **at most 8**, heading "Nodes 8 of 1,691".       | One token in the reference field and the row: a node's name, "Selected (1,240)", a set's name. Never a list of nodes. |
| **"While ... has nodes"**                | The reference picker above: it takes ONE reference.                                                                                                                                                           | Same.                                                                                                                            | "While Watchlist has nodes" on one row.                                                                               |
| **Category, ordered and tag checklists** | A search box ("Search 5,000") once there are more than 8 values; then **8 rows in all**: checked values first (at most 8, then "2,077 more checked"), the largest unchecked fill the rest, then "6 of 4,999". | Matches, checked or not, **at most 8**, then "8 of 199"; a **Check N** button ticks every match (Uncheck N when all are ticked). | The row's summary ("1, 3 and 2,083 more").                                                                            |
| **Number tests**                         | The histogram binned to 32 bars, log height when skewed, read from the element's binned facts; Min and Max boxes.                                                                                             | Typing into Min or Max.                                                                                                          | "min 10", "3 to 7".                                                                                                   |
| **Value picker**                         | Columns, results and algorithms, not values; virtualized.                                                                                                                                                     | Ranked as one list.                                                                                                              | The value name.                                                                                                       |
| **Preview key and table**                | One key row per group (the palette caps groups) and No match; the table virtualizes and opens only on the Table button.                                                                                       | --                                                                                                                               | --                                                                                                                    |
| **Runs**                                 | Above the ask limit the step reads "Run (about 4 min)" and waits for a press.                                                                                                                                 | --                                                                                                                               | --                                                                                                                    |

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

- **Not measured** (absent, NaN, infinite), in Advanced: "Not measured: K" with an include toggle (default
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
  identical steps, gone with the step, not in Analyze, no undo step. Their row carries the "So far" tag and their
  Settings are in Advanced; a base run's chip is a door to its row in Analyze.

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

**While the reader is picking** (a row of the editor is selected, or one of its pickers or menus is
open) the canvas shows a **preview**:

- every style layer is suspended (not removed, no undo step, the layer list unchanged);
- members draw in their group's color at the base look; the rest draws faint, never hidden, labels
  kept, so color is never the only signal; a pending group's last ready result is outlined;
- the Selected ring and the hover mark stay on top: graphty-element keeps every layer of the state
  selected or hovered (the Selected and Hovered rows, or a reader's own) drawing, above the group
  colors;
- pointing at or focusing a group's row marks it: its members stay at full strength, every other
  group's are drawn faint (`BranchesView.mark`);
- the canvas key's title reads "Preview: Which nodes" (a filter: the card's name), with a swatch, name
  and count per group and "No match 7", so nobody thinks their styles are gone;
- in the import filter, the card being edited is held: what it would remove stays drawn faint.

It ends, styling returning in the same frame, on Done, Escape (once nothing smaller is open), a click
outside the editor (an armed target's click is picking, not outside), leaving the place or closing
the panel; announced once, never saved. One preview at a time: an editor that starts picking ends
the other editor's picking, and the key reads the view graphty-element draws
(`styles.shownBranches`), never a store, so the key, the table and the canvas always describe one
selection. A single group goes by the selection's title in the key and the table, never "A". A **preview toggle** in the selection header ("Group colors",
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

- **Step verbs are words: Add, Keep, Except**, in a fixed column on every row and in the step pane's
  segment; Union, Intersect, Subtract in tooltips, aliases and a glossary entry. Never a glyph alone.
- **"Or..."** adds an alternative (a group); **"Add...", "Keep...", "Except..."** add a step. The
  ellipsis says the item opens a picker, as Figma's menu items do.
- **No noun for a group on screen** ("group" is a part of a partition): a chit and a letter, A, B, C.
- **Scopes are the glossary's Filtered graph and Full graph** everywhere: Computed on, tooltips and
  run titles (`graphty/src/workspace/runWords.ts` says "visible" and "whole graph" today; this build
  changes it).
- **Hovered or selected** (not "Focus"), **Selected (N)** (not "picked nodes"), **set**, **So far**.
- Short words: No test, No reference, One node, Computing, Run, Paused, Failed, Stale. "Passes none"
  in neutral ink, never red; the Hovered layer's red "The rule leaves none" goes.
- **A filter card has no effect word** (revised 2026-11-01: the owner did not understand "Select",
  "Filter to" and "Filter out" on the card). The card is what stays: All nodes, then Keep and
  Except. **Select N** is a one-time command in the card's "..." menu. **Filter to** and **Filter
  out** remain the glossary's commands on a selection, a table row, a legend entry or a band; each
  creates a card (All + Keep, or All + Except, "is in" the frozen selection). The glossary's
  **filter step** loses its outcome: "one card of the Filters list: the nodes or edges that stay".
  Rejected: Show only and Hide (display words, the glossary's), Keep only (clashes with the Keep
  verb), Include and Exclude (Include is the not-measured toggle), "and / but not / or" as verbs
  (they read as a sentence, which the owner's data UI rules forbid).
- **Numeric tests on rows use the boxes' words**: min, max, "3 to 7", top. **"Passes none"**,
  **"Off"** and the inert words are the only state words.

## 12. Acceptance checks

Real input, read through the public API or the screen, Les Miserables: element checks in
graphty-element, app checks in `*.real-element.test.tsx` and story play functions.

1. Fresh layer: Add degree By position 1 to 10, Add betweenness 1 to 10: Start with reads No nodes;
   the total equals an independent union.
2. A: Keep degree 6 to 10; B: Add community of Valjean. Total = A union B; B off removes only B's.
3. Brushing degree to 5 lands on 6; one undo step on release.
4. A step with a value and no test stays after closing, reads "No test", changes no count; no toast.
5. Swapping two base Keep steps changes no group or total count; a So far step's row carries the "So
   far" tag; moving an Except above an Add never changes Start with.
6. Saved tier 4 cards (a value, Largest component, Neighbors of selection) open as one group, Start
   with All, same count and picture.
7. Both pickers list the same entries in the same order, except Time window; states may differ.
8. "deg" finds Degree under Data with no run; arrowing onto betweenness starts no run; Enter does.
9. An All group with no step offers "Keep..." and "Except..." and no Add; an empty None group offers
   only "Add..."; afterwards all three.
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
18. Selecting a step row suspends every layer (group colors, rest faint, ring kept, layer list
    unchanged); Escape restores the prior picture (pixel compare) with no undo step.
19. Preview toggle off shows the real styling while picking, for the session.
20. A filter card being edited keeps what it leaves out drawn faint; ending the picking hides it.
21. Selecting a row does not open the table; the Table button opens it on Matches only with the Group
    column, focus kept in the editor.
22. A style group's count selects exactly its members; a filter's opens the table on them.
23. Group colors are 3:1 on both themes, differ from the ring and hover hues; deleting A keeps B's.
24. Keyboard only: one Tab stop, arrows, Enter; Mod+] moves a step and announces it; "..." items show
    their keys.
25. "Keep..." then Escape leaves no step, focus on the Add row; "Or..." then Escape leaves no group;
    "Filters +" then Escape leaves no card.
26. Picking a yes-or-no value writes nothing and selects nothing until Yes or No is picked; a data
    column named rank is listed under Data.
27. A value with no test (Largest component, Isolated) applies as picked; its pane shows no test.
28. A node step reading an edge value counts only the edges the filter left (neighbors.csv,
    Desmond filtered out: kind = coworkers holds Gwen, Ian, Kurt, Lila, Nils).
29. A So far step's pane draws its test from the values its own computation gave, never "Computing".
30. The style tree's rows move with Mod+] (up, Figma's bring forward) and Mod+[ (down, send backward),
    as a selection's rows.
31. A screenshot audit of both hosts: no removed sentence, no filled chit at rest.

**The owner's feedback of 2026-11-01**, one check or more per point, on Les Miserables and on a
generated graph of 50,000 nodes (`tmp/selection-redesign/outline/check.mjs` runs 32 to 36 and the list caps of 37 on the mock):

32. _Cramped, hard to find what matters._ At rest (task 2 loaded, no row selected) the editor draws
    no button, box, input or icon except a filter card's on box; each row is one line; the first
    thing in the editor is the title and its count ("12 of 77").
33. _Disorganized: buttons, empty spaces, row breaks._ Every value name starts at the same x in a
    group; no row is taller than 32 px at 240 px wide, with the longest task 4 and 50,000-node rows;
    a hidden control takes no space; a step's controls appear only in the pane, never in the row.
34. _No progressive disclosure._ Advanced is collapsed on every row selection and names the
    non-default settings on its right; tasks 1 to 3 are built without opening Advanced or any "...".
35. _"Select", "Filter to", "Filter out"._ No filter card shows any of the three words; "Leave out
    community 1" is built as All nodes / Except Community 1; "Select 138" is the first item of the
    card's "..." and selects exactly the card's matches.
36. _The two "+"._ Every "+" on screen sits in a section header and adds one item to the list under
    it; no "+" (and no "+"-like test word) appears inside any selection.
37. _"While has nodes" and large graphs._ On 50,000 nodes: the reference picker shows no node row
    before typing and at most 8 after; "While" takes one reference shown as one token; after "Check
    2,084" and clearing the search, the checklist draws at most 8 rows and the step row reads "1, 3
    and 2,083 more"; no picker or popover extends past the window; each change re-counts in under
    50 ms for degree, hops and a category.
38. _"Confusing and overwhelming."_ The dry run's first-time readers (the tier 5 roster) build tasks 1
    and 3 unaided from a fresh layer and a fresh filter card, and say in their own words what each
    card keeps; the owner reviews the mock and the build before any study session.

**Dry run and study re-tests**: "the most connected people who are also staff"; "color the people
within two steps of Valjean" from a fresh layer; pick, switch place, return: styles are back; a Filter
out card with an Except step; which preview default style-layer readers want.

## 13. Approved surfaces

The owner-approved Which nodes card and attribute picker (tier 4, bar 6) change as specified, at his
request (2026-10-31, and his review of 2026-11-01, which also changes the filter card header: section
3.3), keeping the picker's Structure section;
their reference screenshots are retaken from the first build and listed in `decided.md`.
