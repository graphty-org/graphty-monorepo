# Selection groups: the binding spec

One selection editor, used in two places in the graphty app: a style layer's "Which nodes / Which
edges" (the **style selector**) and each card in the Data place's Filters (the **import filter**).
All graph logic is graphty-element's; its additions are in `element-api.md` beside this file. It
builds the owner-approved direction of mock J (main checkout `tmp/query-ui-research/interactive/J.html`
and `tmp/query-ui-research/j-framework/design.md`), settled by the tier 5 panel
(`../studio/tier5/panel/*.md`) and revised after three reviews (`../studio/tier5/spec-review-*.md`).
Where it lives was settled on 2026-11-01 (section 3): a read-only outline in the sidebar, and one
non-modal **workspace** over the canvas column for every edit. Binding decisions:
`../studio/tier5/decided.md`.

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
      groups (tooltip names the rest), later steps read "Waits for step N". At rest and while the workspace is open.
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
| A count chip's click     | Selects what it counts (`design/ui/framework/task-flows.md` 4.3) | Opens the strip on its rows (Matches only)                                                     |
| Order between selections | Layer order                                                      | None: cards combine as decided (option B)                                                      |
| Workspace title          | "Which nodes -- Style layer 1" (the section, then the layer)     | "Strong core -- Filters" (the card's name, then the place)                                     |

**Why.** The filter decides what every later reader sees: reading the filtered picture is circular,
following hover would re-lay the graph on every move, and a count that selected would mix picking
with filtering. Filtering while a file is read is not in this build.

## 3. Presentation: what shows, and when

Revised 2026-11-01 after the owner's review of the built cards ("cramped", "disorganized", "no
progressive disclosure", `../studio/tier5/owner-feedback-2026-11-01.md`), then placed after the
placement study (`../studio/tier5/placement-study.md`). The editor is an **outline and one property
pane**, as Figma's Layers panel beside its Design panel: the outline is the recipe; the pane holds
the controls of the ONE selected row. Nothing opens inline, so rows never move, wrap or leave gaps.

compact-mantine's Figma spec: 11/16 type, 24 px controls, 32 px rows, 40 px section headers, hints
only in tooltips. **No compact-mantine change is needed** (SegmentedControl, Select, HistogramRow
with its `brush`, the listbox, Menu with MenuShortcut, Checkbox, Button, the count text).

### 3.0 Placement: a read-only outline at rest, one workspace for editing

Decided 2026-11-01 (`../studio/tier5/decided.md`, "Placement 2026-11-01"). The study found no
measurable difference between the sidebar, a bottom drawer and a workspace; the designer panel
(main checkout `tmp/selection-redesign/study/panel.md`) recommended this hybrid, and the owner
prefers the workspace. Reference mock: main checkout `tmp/selection-redesign/workspace/` and its
`shared/editor.js` (the mock is modal; this spec is not, below).

**At rest** the workspace is closed and the sidebar shows the selection as a **read-only outline**:
the rows of 3.1, one line per step, no pane and no control but one **Edit** button on the title row
(and a filter card's on box), drawn on hover or focus over the row's end, so the name keeps the
row's width. A row's tooltip gives the full words and the count; the canvas is marked only in the
workspace, whose preview it is. **Edit, a click on any outline row, or Enter on one opens the
workspace** with that row selected (Edit selects the title row). A selection with no step opens on
its new step's pane instead, the value field focused (Enter opens the value picker under it). There is no editing pane in the
sidebar: the sidebar outline is the editor's summary, never a second editor.

**The workspace** is ONE surface that edits every rule tree in graphty -- a style layer's Which
nodes and Which edges, and a Data filter card -- with the same outline, verbs and controls.

- **Where.** It covers the canvas column and the side panel its host does not use: a style layer's
  (edited from the inspector) covers the left panel too, a filter card's (edited from the Data
  place's Filters, in the left panel) covers the inspector. **The sidebar that holds the
  selection stays visible and usable**: the layer's other properties, or the other filter cards.
  **No scrim, no focus trap, nothing visible behind it inert**; the covered panel takes no focus,
  and its opaque columns widen to cover it whole, so the preview shows only the canvas. The canvas
  toolbar, which the columns and the matches strip lie over, is hidden and takes no focus until the
  workspace closes; Fit is the workspace's own framing.
- **The canvas is the preview.** The workspace's center is transparent: the reader sees and clicks
  the main canvas there, drawing section 9's preview. The workspace is an overlay: opening, closing
  or resizing it never re-frames, moves or resizes the main drawing (the canvas is the frame). A
  **Fit** button in the preview's corner frames the group's members on request, as the toolbar's
  fit does; nothing frames by itself.
- **Layout, left to right**, under a 40 px header:
    - **Outline column**: 3.1's rows, **sized to its content when the workspace opens** (the
      longest row, 200 to 280 px) and **fixed at that width until it closes**: a row's words never
      widen it mid-edit or move the preview; longer rows truncate as 3.1 says.
    - **Preview**: the canvas, the preview key at its top left (section 9), the Fit button; with the
      **matches table strip** under it (section 8): Matches only, the Group column first, columns
      sized to their content, virtualized, 30% of the workspace's height. The header's Table button
      hides or shows the strip, per session.
    - **Properties column**, 320 px: the selected row's pane (3.2) at that full width, so the
      histogram, checklist and value fields never truncate or stack.
- **Header**: the title naming the owner (section 2's "Workspace title"), the result count ("12 of
  77"), then Group colors | Styled (section 9, a segment at 11/16), Table (a subtle toggle named
  "Table of matches"), **Clear** and **Cancel** (subtle, as Table), **Done** (filled). The header
  is the one place the result count is drawn while the workspace is open: the outline's title row
  drops it, a step pane's "N so far" is drawn only where it differs from the result, the strip's
  Group column only with two or more groups, the Filters header's total only with two or more
  cards on. The title pane's "..." holds no view items (Table and Group colors are the header's).
- **Per surface** (the check widths): at 1440 x 900 with no left panel the preview is at least
  560 px wide; at 1280 x 800 at least 440 px wide, the strip at least 180 px tall. Below that the
  strip folds to its header row and the Table button opens it; the outline and properties columns
  never shrink under their content.
- **Clicks while it is open.** A click on the canvas does what it does on the canvas (selects,
  hovers), or picks when the target is armed (4.2); a click in the sidebar edits the sidebar. Neither
  closes the workspace. Opening another owner's editor (another layer's Which nodes, another
  card's row) switches the one workspace to it, keeping the current edits (Done).
- **Done** (header, or **Escape** once nothing smaller is open, or leaving the place) keeps every edit
  and closes it; focus returns to the sidebar row or Edit button that opened it. **Cancel** restores
  the selection to what it was when the workspace opened, as one undo step (so Cancel itself can be
  undone), and closes it. Edits made in the sidebar meanwhile are the sidebar's own undo steps and
  stay. **Escape never discards work.**
- **Clear** (header) returns the selection to where a new layer or card starts: one group starting
  with **All nodes** and no step (a filter card keeps its name and on box), so Clear and a new
  layer show the same empty state ("77 of 77", the All nodes row). One undo step, announced
  "Cleared"; Mod+Z, the app's Undo or Cancel bring it back.
- **Accessibility.** The workspace is a named region landmark (`role="region"`, named by its title),
  not a dialog. F6 and Shift+F6 treat the workspace as one region in the ring (the header, the
  outline, the properties and the preview's controls are its Tab order), between the panel it
  covers and the one beside it; Enter and Escape move between the outline and the pane. Opening announces "Editing Which nodes,
  Style layer 1" and moves focus to the selected outline row; closing announces "Done, 12 of 77" or
  "Cancelled" and returns focus. Cancel, Clear and Done are buttons in the header's Tab order with
  their names; Cancel has no key of its own and needs none (it is a button).

Rejected: the bottom drawer (it takes half the canvas, re-frames it on every move and takes the
table's edge); a modal workspace (it hides the layer's Fill and the layers beneath, so the real
styling cannot be shown, and NN/g advises against modals for decisions that need other sources);
editing in the sidebar (240 px truncates "Core number min 3" at 1280 and stacks the pane under the
outline).

**At rest** below means the workspace is closed; **open** means it is open, one row selected (the
title row at least); the canvas shows the preview (section 9) for as long as it is open.

### 3.1 The outline, row by row

The same rows draw the sidebar's read-only outline and the workspace's outline column; only the
workspace's rows select. Every row is one 32 px line of fixed columns: an indent (16 px under a group row once there are two
groups), a **verb column 40 px wide**, the **value name**, the **test** (it truncates first, at its
tail, listed names before "and N more"; then the value name, which keeps its first word; the full
words are in the row's tooltip and name), then **tags** for non-default settings and the row's
state word. **A tag is a bare dimmed word** ("Links", "So far", "Either end"), no border; a Links
tag's condition is in the row's tooltip and on Advanced's right, never on the row. **A tag gives
way before the test, so the condition never gives way to a tag**; the state word never truncates
except on a relative row (below). A list of more than nine values is said as its count ("1,898
values"), never two names of it. A pending step's row says "Run";
the estimate is in its tooltip and on the pane's Run button. A list's "and N more" is never
cut: the names before it are. A column that is empty takes no space at rest; nothing reserves space
for a control that is not drawn. Every row's words are 11/16 (`Text size="sm"`); verb, value and
test in normal ink, dimmed only the state word and "All nodes"; only the title is 600.

**Pointing and selecting never add or remove a row.** The outline holds only recipe rows; hover and
focus change a row's background, its eye and the canvas marking; selecting changes only the
highlight. "Condition..." and "Or..." are buttons in the pane's first row (3.2), never rows
(repolish 2: selecting a group inserted "Step..." and "Or..." and moved every row under it 32 px).

**A condition is said once.** "All nodes" is drawn only for a group that starts with everything and
has no step yet, or whose first step is Except. A group's first step at the group's own verb (Keep
in an All group, Add in a None group) leaves the verb column empty: "Degree max 3", never "All nodes
/ Keep Degree max 3". Every group row after the first writes "or" in its verb column ("or B"), so
groups read as alternatives at rest.

| Row                                                                                   | At rest                                                                                                                                                                                                                                                                                                                                     | On hover or focus                                                                                                    | Selected (pane)                                                        |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Title** ("Which nodes", "Which edges", or a filter card's name)                     | The name and the result, "12 of 77" (tooltip names the base: "of 60 in the filtered graph"). A filter card adds its on box first. In the sidebar, an Edit button at the right (3.0).                                                                                                                                                        | Unchanged.                                                                                                           | Title pane (3.2).                                                      |
| **Group** (only once there are two)                                                   | "or" (after the first), hollow chit, letter, count ("4"). "Off" when turned off; "Passes none" when Start with empties it.                                                                                                                                                                                                                  | The canvas marks its members; in the workspace, the eye (turn off).                                                  | Group pane.                                                            |
| **All nodes** (a group that starts with everything, before a first Except or no step) | Empty verb column, "All nodes" in secondary ink. Any other group draws no row.                                                                                                                                                                                                                                                              | Its count, the base.                                                                                                 | Group pane.                                                            |
| **Step**                                                                              | Verb word (Add, Keep, Except; empty on a group's first step at the group's verb), value ("Community"), test ("1, 3 and 4 more", "min 10", "3 to 7", "Valjean"), tags ("So far", "Either end"), state word if any ("No test", "No reference", "One node", "Run", "Computing", "Waits", "Passes none", "Off"). No count, button, box or icon. | The canvas marks what the group holds after this step; the tooltip gives the full words and "24 of 77 nodes so far". | Step pane.                                                             |
| **Condition row**                                                                     | Drawn only on an empty selection whose group starts with nothing, where it is the only row: "Condition..." in the value column. A group that draws All nodes draws no Condition row.                                                                                                                                                        | Unchanged.                                                                                                           | Opens the value picker (from the sidebar: the workspace, picker open). |

- **Deleting never re-shapes the row under the pointer.** After a delete no row is selected (a
  repeated Delete deletes nothing) and focus stays at the deleted row's place. The outline keeps its
  shape while the pointer is over it: a lone remaining group keeps its group row, and the simple
  case (one group draws no group row) takes effect when the pointer leaves the outline column or the
  workspace closes. Letters never change (section 1): a lone unnamed group goes by the selection's
  title on its row and in its pane, as the key and the table say it, never by another group's letter.
- **Passes none** is drawn at rest, in neutral ink, on the step that emptied its group, so an empty
  result is never silent. The title's count then reads "0 of 77".
- **Relative to rows** put the condition in the value column and the reference in the test:
  "Within 2 hops | Valjean", "Is in | Selected (3)", "While | Watchlist has nodes". A long node name
  truncates; the condition never does. With no reference, While reads its whole value, "While ...
  has nodes", with no test column. When space runs out the reference and then the state word give
  way with an ellipsis (both are in the row's tooltip).
- A value keeps normal ink in every state (Off, No test, Run); a selected row drops its state word,
  which its pane already shows.
- **Numeric tests** use the Min and Max boxes' words: "min 10", "max 1", "3 to 7", "top 10".
- **Category, ordered and tag tests** summarize: up to three values ("1, 3, 4"), else "1, 3 and
  2,083 more" (sorted, thousands separated). A row never lists every value.
- The **chit is hollow at rest, filled while the preview shows group colors** (unchanged).
- **The only color in the editor is the chit. No sentences** anywhere in the editor.

### 3.2 The property pane

One pane, the workspace's properties column (3.0), for the selected row; the step's controls are
never repeated in the row. **Every pane's first row is the same**: "Condition..." (adds a step to
the selected row's group with its default verb; not drawn on the title pane of a selection with two
groups) and "Or..." at the left, then the pane's icon buttons and "..." at the right (Done is the
workspace's, in its header). The pane's own main
control is its second row. Every control is the compact Select's default size (24 px, 11/16 type);
the value and reference fields are the compact Select's trigger with its own chevron (compact-mantine
themes InputBase as its Select). **A step being added** has a pane of its own: its verb word and its
value field, the value picker opening under that field (never at the outline row), its outline row
lit as "Value..." until a value is picked. A state the Run button does not say (Paused, Waits for
step 1, No reference) is written on the pane's verb row, as on the step's row. **Advanced** is a collapsed disclosure, collapsed every time a row is selected; when a setting
in it is not at its default, its name is written on Advanced's right ("So far", "Either end",
"Links: weight min 2").

| Selected row           | Pane, always visible                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | "..." menu (keys shown)                                                                                                             | Advanced (collapsed)                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Step**               | Verb segment of the verbs that can change the group at this step (Add / Keep / Except; Union, Intersect, Subtract in tooltips and in each radio's name; the first step of an All group offers Keep and Except; one verb alone, as on a None group's first step, is written as a word, never a segment of one), "138 so far" drawn beside it (tooltip "138 of 254 edges so far"), "..."; the value field (opens the value picker); the test for its kind (section 5) or "Run (about 4 min)". After a value is picked, focus goes to the test's first control. | Turn off, Duplicate (Mod+D), Move up (Mod+]), Move down (Mod+[), Delete (Del).                                                      | Computed on (Filtered or Full graph, So far), Links (All links, or Links where ..., 3.5), Edge ends (Both, Either), Not measured (include), the algorithm's Settings. |
| **Group**              | Name box, count, "..."; Color (the compact color field; it writes the group's color, which the preview, the key and the table follow).                                                                                                                                                                                                                                                                                                                                                                                                                       | Duplicate, Save as set, Move up, Move down, Delete.                                                                                 | Start with (No nodes / All nodes, with its caption).                                                                                                                  |
| **All nodes**          | As the group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | As the group.                                                                                                                       | None.                                                                                                                                                                 |
| **Title, style layer** | "...".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | **Select N** (Table and Group colors are the header's, never repeated here).                                                        | None.                                                                                                                                                                 |
| **Title, filter card** | "..."; Nodes / Edges (a new card). A card named after its only step adds that step's controls under it (3.3).                                                                                                                                                                                                                                                                                                                                                                                                                                                | **Select N** (selects the card's matches on the canvas, once), Duplicate (Mod+D), Delete (Del); the keys work on the title row too. | None.                                                                                                                                                                 |

### 3.3 Filter cards

- The Filters list draws **one open card**: its read-only outline (3.0); its rows and Edit open the
  workspace titled "<card name> -- Filters". "Filters +" adds a card and opens the workspace on its
  title row, Nodes | Edges and the value picker open.
  Every other card is one collapsed row: on box, name, "53 of 77", in the open card's 11/16 type;
  the name is cut only when the count would otherwise leave the row. The whole row (but the on box)
  opens the card, and focus lands on its title row, so the next Space switches its on box.
- **A card named after its only step draws no outline**: its title row is the recipe ("Degree min
  10", with the step's state word if any), and in the workspace its title pane holds the step's
  controls under the card's own.
- **A filter card always says what stays**: its selection IS what stays, so a card has no effect
  word. A new card starts as one group of **All nodes** and narrows with Keep and Except; Add
  widens. "Leave out community 1" is "All nodes / Except Community 1".
- Saved tier 4 cards convert (graphty-element converts saved forms, section 10): Filter to becomes
  All + Keep <its condition>; Filter out becomes All + Except <its condition>. A saved Select card
  hides nothing: until the owner decides whether the element rewrites it on load
  (`../studio/owner-decisions.md`, 2026-11-01), it is shown read-only in its own words, "Select
  <condition>", counting what stays (all of it, "77 of 77"), its box as the element holds it.
- A Filter to card on an edge value with no reading (tier 4) also hides the nodes off its edges; an
  edges selection keeps every node, so it has no editable form: it stays read-only, in its words,
  and keeps meaning what it meant (`scope.asUnion` returns null for it).
- A card that removes and that no editor reads (a saved Filter out of a selection) counts what stays,
  never what it matches.
- **A card is named by its first step as its row says it** ("Degree min 10"), and the name follows
  its edits. A first step that removes keeps its verb ("Except role volunteer"), and so does a
  removing card no editor reads, so a name never reads as what the card takes away. The Filters header shows what the cards on leave together, "41 of 77", in neutral ink,
  or "Passes none".
- The open card's on box takes no Tab stop: Space on the title row switches it, and the title row's
  name ends ", off" while it is off. The box is named "Use <name>", as a group's eye is "Use A".

### 3.4 Keyboard

Each outline (the sidebar's, the workspace's) is one Tab stop walked with arrows (roving focus). In
the sidebar Enter opens the workspace on the focused row; in the workspace Enter moves focus into the
pane, and F6 cycles regions (3.0). **Escape closes the innermost open thing per press and never
discards work**: disarm the target, close a list, menu or Advanced, return focus from the pane to
the outline, then close the workspace as Done (tier 3). It takes back only what holds nothing: a
just-added step with no value and a new filter card with no step. In the outline: Delete removes the selected row, Mod+D
duplicates, Mod+] / Mod+[ move it (Figma's bring forward / send backward); the style layer tree's
rows gain the same keys. A brush previews counts while dragging and writes one undo step on
release; text writes on commit (tier 4 R3).

### 3.5 Fixes from the placement study

Every session of the study (`../studio/tier5/placement-study.md`) hit the same editor problems,
whatever the placement. Each is fixed here; acceptance 39 to 47 check them.

1. **Scoping by links is inside the editor.** Nine of nine readers looked in the editor for "ignore
   links with weight under 2"; three never found the graph-wide Data filter. A step whose value is
   computed from the links (an algorithm's field, Degree, a Relative to condition) has **Links** in
   its Advanced: "All links" (default) or "Links where ...", which opens one edge condition (an edge
   value and its test, the controls of section 5, no groups). The step is then computed on only the
   links that pass, and the scope is visible: the row carries the tag "Links: weight min 2", Advanced
   names it on its right, and the step's histogram is drawn from the scoped computation. Such a
   computation belongs to the step, as a So far one does (section 6). graphty-element adds the
   step's `links` (`element-api.md` section 4). The graph-wide Data filter stays, for links no
   reader should see at all.
2. **A checklist never re-sorts under the cursor.** Ticking or unticking leaves every row where it
   is. The order (checked first, then the largest) is set only when the list opens and when the
   search changes; "Check N" ticks in place too.
3. **Starting over is one press.** Clear in the workspace header, with undo (3.0); deleting never
   re-shapes the row under the pointer (3.1).
4. **Escape closes the innermost thing and never discards work** (3.4); on the workspace it is Done.
5. **Plain words for the terms readers guessed at.** Degree's tooltip and picker entry say "links
   at a node" (In: "incoming links", Out: "outgoing links"), and "links", "connections" find it;
   Core number's tooltip comes from the catalog's description and "core", "k-core" find it; "While
   ... has nodes" has the tooltip "Everything while it holds a node, else nothing". Tooltips only:
   no sentence is drawn in the editor.
6. **"By position" never switches a step by an accidental click.** The number and time test's mode
   is a compact Select showing its current mode ("By value"), above the histogram, never a segment
   beside it; choosing By position starts untouched (the step reads "No test" until a position is
   entered) and choosing By value again restores the range that was there. Only an explicit choice
   changes the mode.

## 4. Adding things, and the dropdowns in order

### 4.1 One meaning for "+"

**"+" appears only in a section header and adds a new item to the list under it**: "Style layers +"
adds a style layer, "Filters +" adds a filter card. Nothing inside a selection draws a "+".

- **A step** is added by "Condition..." in the pane's first row (or the Condition row of an empty
  selection), which adds a step with the group's default verb (Keep in an All group, Add in a None
  group) and opens the value picker at once. The pane's verb segment is the only verb chooser. A
  "+" in a section header adds a new item; "Condition..." and "Or..." add inside the open one, and
  are words, not "+", so the two never look alike.
- **A group** is added by "Or..." (a None group in the element's next free color, its value picker
  opened). Disabled when the palette is used up, its reason in its tooltip.
- Escape or a click away from a value picker that chose nothing takes the new step (and a new
  group's only step, and the group) back; focus returns to the button that added it, announced
  once, no toast.

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
- **Links** (Advanced, 3.5): "All links | Links where ...", on every step computed from the links
  (an algorithm's field, Degree, Relative to); the edge condition opens under it in the pane. The
  row carries the "Links: <condition>" tag while it is set.
- **Reference field** (step pane) with a 24 px target button beside it ("Pick on canvas", Figma's
  eyedropper): armed, the next click on a node in the canvas or table fills the reference, never
  changes the selection and never ends the preview; Escape disarms. The reference picker is 4.3's.
- **Hops**: a number box, default 2.

### 4.3 Large graphs: every list is bounded

Checked on a generated graph of 50,000 nodes, about 99,000 edges and 5,000 communities. No surface
draws a list whose length grows with the graph; past its cap a list says how many it holds and
search finds the rest. Long lists are virtualized listboxes (compact-mantine's).

| Surface                                  | With nothing typed                                                                                                                                                                                                                                                                                                                                                             | While typing                                                                                                                                                                                                                                                                                                                                                                    | Shown when chosen                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Reference picker**                     | "Pick on canvas" first; then, under no heading, Hovered or selected (style only), Selected (N), So far (a filter's under "Selection"); Sets: the first 8 by name, heading "8 of 31" past 8; Nodes: a heading with the node count and **no node rows**.                                                                                                                         | The same sections filtered; nodes by id or name, **an exact match first**, then prefix matches, then by degree, **at most 8**, heading "Nodes 8 of 1,691", or "Nodes 0" when none match. A graph with no label column is searched in every column, so a "name" column is found; a row whose name does not show the text shows the value that holds it, dimmed ("community 12"). | One token in the reference field and the row: a node's name, "Selected (1,240)", a set's name. Never a list of nodes. |
| **"While ... has nodes"**                | The reference picker above: it takes ONE reference.                                                                                                                                                                                                                                                                                                                            | Same.                                                                                                                                                                                                                                                                                                                                                                           | "While Watchlist has nodes" on one row.                                                                               |
| **Category, ordered and tag checklists** | A search box ("Search 5,000") once there are more than 8 values; then **8 rows in all**, 11/16 type, the list box holding the height of its 8 rows while searched: checked values first (at most 8, then "2,077 more checked"), the largest unchecked fill the rest, then "6 of 4,999"; that order is set on open and on each search, and **ticking never moves a row** (3.5). | Matches, checked or not, **at most 8**, then "8 of 199"; a **Check N** button ticks every match (Uncheck N when all are ticked).                                                                                                                                                                                                                                                | The row's summary ("1, 3 and 2,083 more").                                                                            |
| **Number tests**                         | The histogram binned to 32 bars, log height when skewed, read from the element's binned facts; Min and Max boxes.                                                                                                                                                                                                                                                              | Typing into Min or Max.                                                                                                                                                                                                                                                                                                                                                         | "min 10", "3 to 7".                                                                                                   |
| **Value picker**                         | Columns, results and algorithms, not values; virtualized.                                                                                                                                                                                                                                                                                                                      | Ranked as one list.                                                                                                                                                                                                                                                                                                                                                             | The value name.                                                                                                       |
| **Preview key and table**                | One key row per group (the palette caps groups) and No match; the table virtualizes and opens only on the Table button.                                                                                                                                                                                                                                                        | --                                                                                                                                                                                                                                                                                                                                                                              | --                                                                                                                    |
| **Runs**                                 | Above the ask limit the step reads "Run" and its pane "Run (about 4 min)", and waits for a press. Girvan-Newman is charged a betweenness pass per round, so its estimate is honest, and it computes in the element's Worker. A hops, touching or same-value step on Hovered or selected waits (Paused) over the live limit while the pointer is on a node.                     | --                                                                                                                                                                                                                                                                                                                                                                              | --                                                                                                                    |

## 5. Controls per kind

The table header, picker glyph and card all read the element's `valueKind` fact; the app never
derives a kind.

| Kind     | Segment (default first)        | Control                                                                                                                                                                                           |
| -------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| number   | By value, By position (Select) | HistogramRow brush over two boxes; position adds "# / %" and top / bottom; mean and median ticks; log axis when skewed; tie chip ("10 asked, 12 kept: tied at 57"); domain 0..1 gets a fixed axis |
| time     | By value, By position (Select) | the same with dates; an upper end means the end of that day                                                                                                                                       |
| ordered  | Pick, By position              | counted checklist in the declared order; numeric ordered values add By value                                                                                                                      |
| category | Pick, By size                  | searchable counted checklist (members in the step's input, size as a faint bar); By size: the group-size histogram, By value or By position (largest N)                                           |
| tags     | Any, All                       | counted checklist ("none of" is an Except step), for values the element reports as tags                                                                                                           |
| flag     | Yes, No                        | the count beside each segment                                                                                                                                                                     |
| text     | approved operator select       | approved text box                                                                                                                                                                                 |

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
- **So far, live-reference and link-scoped computations belong to the step**: recomputed on its
  input, shared by identical steps, gone with the step, not in Analyze, no undo step. Their row
  carries the "So far" or "Links: ..." tag and their Settings are in Advanced; a base run's chip is a door to its row in Analyze.

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
- **Table**: the workspace's matches strip (3.0), and the main table when it is open, show a Group column first (a 12 px chit plus the name, never a
  row tint: lime means selected), read from the element, and a new **Matches only** toggle, on (the
  glossary rejects "Show only"). Opening it never takes focus.
- **Count chips**: section 2. Hovering one marks its members. The title row's count is the
  style host's only (a filter card's own header counts the card); a group row's chip is its Enter.
- **Preview key rows** count what each group draws in its color (the first group wins, a group that
  is off draws none), from the element's `BranchReading.drawn`, so the rows and No match add up to
  the base; the group's full count stays on its editor row.

### 8a. Owner question: open the data table automatically while picking? No.

The main data table never opens by itself. Revised 2026-11-01: the workspace draws its own matches
strip under the preview (3.0), shown by default and hidden or shown by the workspace's Table button
(the toolbar's icon and key) for the session; it overlays the canvas like the rest of the workspace,
so the drawing never moves.

Why: the drawing moves only when the reader asks (owner 2026-10-24, "the canvas is the frame"); at
1440 x 900 the main table leaves the canvas about 330 px tall (`s1/16.png`); nine of nine panelists
said no to the main table. The study's readers used the strip to check a count by name.

## 9. Owner question: suspend styling and show group colors while picking? Yes.

**While the workspace is open** (3.0) the canvas shows a **preview**:

- every style layer is suspended (not removed, no undo step, the layer list unchanged);
- members draw in their group's color at the base look; the rest draws faint, never hidden, labels
  kept, so color is never the only signal; a pending group's last ready result is outlined;
- the Selected ring and the hover mark stay on top: graphty-element keeps every layer of the state
  selected or hovered (the Selected and Hovered rows, or a reader's own) drawing, above the group
  colors;
- pointing at, focusing or selecting a group's row marks it: its members are drawn in its color on
  top, at full strength, and every other group's faint (`BranchesView.mark`);
- the canvas key, at the preview's top left inside the workspace, is titled "Preview: Which nodes" (a filter: the card's name), with a swatch, name
  and count per group and "No match 7", so nobody thinks their styles are gone. A group whose every
  member an earlier group already draws reads "B 1, under A", never 0, so the key, its row and its
  pane agree. While graphty-element is still drawing the view (a large graph repaints over several
  frames), the key's title says "Drawing", so its counts are never read as the canvas's;
- in the import filter, the card being edited is drawn **over the full graph**, the base it counts
  on (`BranchesView.base: "full"`): every card's removals are lifted while it is edited, what they
  hide is drawn faint, and the card's own matches are drawn in its color even when another card
  hides them. What is visible does not change.

It ends, styling returning in the same frame, when the workspace closes (Done, Escape once nothing
smaller is open, Cancel, leaving the place); a click on the canvas or in the sidebar never ends it.
Announced once, never saved. One preview at a time, as there is one workspace, and the key reads the view graphty-element draws
(`styles.shownBranches`), never a store, so the key, the table and the canvas always describe one
selection. A single group goes by the selection's title in the key and the table, never "A". A **preview toggle** in the workspace header ("Group colors | Styled",
Group colors by default) shows the real styling instead, per session and host, with the sidebar's
edits to the layer's other properties visible in it. **graphty-element draws
it** (`styles.showBranches`), never the app hiding layers or touching meshes.

Why: "Val" in a name card counts "1 node" with no change on the canvas (`which/09.png`), and over
Louvain's hues a group color is unreadable (`s1/14.png`); Figma's Outline mode is the precedent.
Eight of nine panelists said yes; the Figma designer wanted it off in a style layer (a dry-run check).

## 10. What graphty-element adds, and what the app renders

The contract, with its canonical example, is `element-api.md`: additive and `@beta`.

**The app renders only** the workspace and the sidebar outline, rows, cards, menus, segments, the words for every code (`style/words.ts`,
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
- **Workspace words**: Edit (opens it), Done, Cancel, Clear, Fit, Table, "Group colors | Styled";
  its title is the owner's name, "Which nodes -- Style layer 1", "Strong core -- Filters". The
  workspace has no noun of its own on screen. **Links**, "All links", "Links where ..." (the
  glossary's "edge" stays the word in column and side names; "links" is the reader's word for the
  scope, as Degree's tooltip says "links at a node").

## 12. Acceptance checks

Real input, read through the public API or the screen, Les Miserables: element checks in
graphty-element, app checks in `*.real-element.test.tsx` and story play functions. "Open" means the
workspace is open (3.0); "at rest" means it is closed.

1. Fresh layer: Add degree By position 1 to 10, Add betweenness 1 to 10: Start with reads No nodes;
   the total equals an independent union.
2. A: Keep degree 6 to 10; B: Add community of Valjean. Total = A union B; B off removes only B's.
3. Brushing degree to 5 lands on 6; one undo step on release.
4. A step with a value and no test stays after its picker closes and after Done, reads "No test",
   changes no count; no toast.
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
11. Ask limit forced low: "Run (about X)", pending until pressed; Cancel of the run leaves it pending;
    at rest the layer paints nothing for that group.
12. A So far run is not in Analyze and goes with its step.
13. Changing a card's settings leaves a run another layer reads unchanged.
14. Section 7's four layers draw the built-in hover layers' picture: hovered, with a lone selected
    node, and with neither (pixel compare).
15. A Hovered-or-selected step above the live limit starts no run while the pointer moves.
16. Target button, open: arm, click Valjean on the canvas or in the matches strip: the reference
    reads Valjean, selection and preview unchanged, the workspace still open; Escape disarms and
    leaves it open.
17. In a filter, "within 1 hop of Selected" is frozen: selecting another node changes nothing.
18. Opening the workspace suspends every layer (group colors, rest faint, ring kept, layer list
    unchanged) and leaves the camera where it was (pixel compare of an unchanged node's position);
    Done restores the prior picture (pixel compare) with no undo step.
19. Group colors | Styled set to Styled shows the real styling while open, for the session; a Fill
    changed in the sidebar while open shows in it.
20. A filter card being edited keeps what it leaves out drawn faint; closing the workspace hides it.
21. Opening the workspace does not open the main table; its matches strip shows Matches only with
    the Group column; the Table button hides and shows the strip; focus stays in the workspace.
22. A style group's count selects exactly its members; a filter's opens the strip on them.
23. Group colors are 3:1 on both themes, differ from the ring and hover hues; deleting A keeps B's.
24. Keyboard only: each outline is one Tab stop walked with arrows; Enter on a sidebar row opens the
    workspace on that row; Enter moves into the pane; Mod+] moves a step and announces it; "..."
    items show their keys.
25. "Condition..." then Escape leaves no step, focus on "Condition..."; "Or..." then Escape leaves no
    group; "Filters +" then Escape leaves no card; none of them closes the workspace.
26. Picking a yes-or-no value writes nothing and selects nothing until Yes or No is picked; a data
    column named rank is listed under Data.
27. A value with no test (Largest component, Isolated) applies as picked; its pane shows no test.
28. A node step reading an edge value counts only the edges the filter left (neighbors.csv,
    Desmond filtered out: kind = coworkers holds Gwen, Ian, Kurt, Lila, Nils).
29. A So far step's pane draws its test from the values its own computation gave, never "Computing".
30. The style tree's rows move with Mod+] (up, Figma's bring forward) and Mod+[ (down, send backward),
    as a selection's rows.
31. A screenshot audit of both hosts, at rest and open: no removed sentence, no filled chit at rest.

**The owner's feedback of 2026-11-01**, one check or more per point, on Les Miserables and on a
generated graph of 50,000 nodes (`tmp/selection-redesign/shared/check.mjs workspace` runs 32 to 37
and 39 to 47 on the mock):

32. _Cramped, hard to find what matters._ At rest (task 2 loaded) the sidebar draws no button, box,
    input or icon except the title row's Edit and a filter card's on box; each row is one line; the
    first thing in the selection is the title and its count ("12 of 77").
33. _Disorganized: buttons, empty spaces, row breaks._ Every value name starts at the same x in a
    group; no row is taller than 32 px in the 240 px sidebar or the workspace's outline column, with
    the longest task 4 and 50,000-node rows; a hidden control takes no space; a step's controls
    appear only in the properties column, never in a row; the outline column is no wider than its
    longest row (200 to 280 px).
34. _No progressive disclosure._ Advanced is collapsed on every row selection and names the
    non-default settings on its right; tasks 1 to 3 are built without opening Advanced or any "...".
35. _"Select", "Filter to", "Filter out"._ No filter card shows any of the three words; "Leave out
    community 1" is built as All nodes / Except Community 1; "Select 138" is the first item of the
    card's "..." and selects exactly the card's matches.
36. _The two "+"._ Every "+" on screen sits in a section header and adds one item to the list under
    it; no "+" (and no "+"-like test word) appears inside any selection or the workspace.
37. _"While has nodes" and large graphs._ On 50,000 nodes: the reference picker shows no node row
    before typing and at most 8 after; "While" takes one reference shown as one token; after "Check
    2,084" and clearing the search, the checklist draws at most 8 rows and the step row reads "1, 3
    and 2,083 more"; no picker, popover or strip row extends past the workspace; the strip renders
    at most its visible rows; each change re-counts in under 50 ms for degree, hops and a category.
38. _"Confusing and overwhelming."_ The dry run's first-time readers (the tier 5 roster) build tasks 1
    and 3 unaided from a fresh layer and a fresh filter card, and say in their own words what each
    card keeps; the owner reviews the mock and the build before any study session.

**Placement and the study's fixes (2026-11-01)**, at 1440 x 900 and 1280 x 800:

39. _Non-modal workspace._ Open: the right sidebar is visible and a click there changes the layer's
    Fill with the workspace still open; no scrim is drawn; the canvas's camera is unchanged from
    before opening and after closing; at 1280 x 800 the preview is at least 440 px wide and the
    strip 180 px tall; the properties column is 320 px and no step field in it truncates.
40. _One workspace for every rule._ A layer's Which nodes opens it titled "Which nodes -- <layer>";
    a filter card's row opens the same workspace titled "<card> -- Filters"; opening one while the
    other is open switches it and keeps the first one's edits.
41. _Done and Cancel._ Three edits then Cancel: the selection, counts and picture equal those before
    opening, and Mod+Z brings the three edits back; three edits then Escape (nothing smaller open)
    closes it as Done with the edits kept. Escape with a list open closes only the list.
42. _Scope by links in the editor._ Task 4 ("core number at least 3, ignoring links with weight
    under 2") is built inside the workspace with Links where weight min 2 on the Core number step:
    42 nodes, the row shows "Links: weight min 2", no Data filter is touched, and the Data filter's
    count is unchanged.
43. _The checklist stays put._ With the pointer on the 3rd row of a 5,000-value checklist, ticking
    it and the 4th and 5th leaves every row's position unchanged (pixel compare of row tops); the
    order changes only after the search is edited or the list reopens.
44. _Starting over._ Clear empties the selection to its Condition row in one press; Mod+Z restores
    it exactly. With groups A and B, deleting A leaves no row selected, the row under the pointer
    still B's group row, and a second Delete deletes nothing.
45. _Words._ Degree's tooltip says "links at a node"; typing "links" or "connections" finds Degree,
    "k-core" finds Core number; While's tooltip is present; no sentence is drawn in the workspace.
46. _By position._ A click anywhere on the histogram or its boxes never changes the test's mode;
    choosing By position in the mode Select leaves the step "No test" and the count unchanged until a
    position is typed; choosing By value restores the prior range.
47. _Accessibility._ The workspace is a region landmark named by its title; F6 from the workspace
    reaches the right sidebar and Shift+F6 returns; opening and closing are announced once each;
    Cancel is reached by Tab from the header's Clear and activates with Enter or Space; focus
    returns to the row or Edit that opened it.

**Dry run and study re-tests**: "the most connected people who are also staff"; "color the people
within two steps of Valjean" from a fresh layer; pick, switch place, return: styles are back; a Filter
out card with an Except step; which preview default style-layer readers want; a first-click test
that readers find Edit from the sidebar outline; task 4 at 1280 x 800 without the Data place.

## 13. Approved surfaces

The owner-approved Which nodes card and attribute picker (tier 4, bar 6) change as specified, at his
request (2026-10-31, and his review of 2026-11-01, which also changes the filter card header: section
3.3), keeping the picker's Structure section;
their reference screenshots are retaken from the first build and listed in `decided.md`.
