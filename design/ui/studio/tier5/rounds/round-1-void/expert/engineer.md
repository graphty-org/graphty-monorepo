# Screenshot audit: tier 5 screens at 1200 x 900 and 900 x 700

Build 1e123d7d33 (the frozen tier 5 build), served by `real.mjs` with `REAL_DIST` set to
`.study-builds/tier5-r1d1-1e123d7d33` and `REAL_VIEWPORT` set per size, default color scheme.
Every screenshot below was looked at. Sessions (folder names relative to this file's folder,
`engineer/`):

| Session | Start | What it walks |
| --- | --- | --- |
| `style-<size>` | volunteers.txt | The graph at the start; a style layer's Which nodes: a new rule with its picker open, a step pane, Except on, an Or group with its picker open, the reference picker closed, open, typed and chosen, Advanced with Edges where, No match, the read-only outline at rest |
| `filter-<size>` | volunteers.txt | The same states in a Data place filter card |
| `thanks-<size>` | volunteers-thanks.txt | A colleague's filter and layer at rest in both places, a layer's workspace opened from the Data place |
| `big-<size>` | staff-50k.txt | 50,000 nodes: the graph at the start, Control+A, the checklist, Check N, a step with many values, the reference picker open, typed and chosen, Selected (N), the outline at rest in both places |

`<size>` is `1200x900` or `900x700`. Each session ended with `--end`.

Severity: 4 blocks a task, 3 a serious obstacle, 2 a visible defect a person notices and works
around, 1 a polish defect, 0 not a problem.

## Findings

### 3 -- At 900 x 700 the workspace preview collapses to a sliver

- **Screen:** every workspace state at 900 x 700, in both places.
- **Evidence:** `style-900x700/03.png` to `12.png` (the preview is about 44 px wide, from x 297 to
  341; the graph is a few dots); `filter-900x700/03.png` to `12.png` (about 84 px); `thanks-900x700/05.png`;
  `big-900x700/03.png` to `10.png` (50,000 nodes drawn as a 40 px tile). The matches strip under it
  shows one column and its search box is cut to "Se".
- **What happens:** the columns around the preview keep fixed widths -- the outline (200 to 280 px),
  the step pane (320 px) and, in a style layer, the properties column (240 px) -- so the preview takes
  whatever is left, which at 900 px is almost nothing. The preview is the reason the workspace sits
  over the canvas (decided.md, "One non-modal workspace edits every rule"); at this width it cannot
  be read. decided.md settles 1280 x 800 (a 424 px preview) and says nothing below it.
- **Owner:** graphty app (the workspace layout in `graphty/src/workspace/selection/`).

### 2 -- An outline row's reference is cut off, and cut two different ways

- **Screen:** the workspace outline with a "Within N hops of" row.
- **Evidence:** `filter-1200x900/08.png` ("Within 2 hops of No re", clipped at the column edge with no
  ellipsis); `style-900x700/07.png` ("No reference" runs to the column's edge);
  `big-1200x900/10.png` and `big-1200x900/11.png` ("Within 2 hops of Selected..." and "Selected (...",
  with an ellipsis).
- **What happens:** the part of the row that says which node the step counts from is the part that
  is lost. One row clips hard, another ends in an ellipsis.
- **Owner:** graphty app (outline row layout).

### 2 -- The matches strip cuts its last column with no sign there is more

- **Screen:** the matches strip under the preview, at both sizes.
- **Evidence:** `style-1200x900/03.png` ("trai"), `style-1200x900/06.png` to `12.png` ("hou" once the
  Group column is added), `big-1200x900/07.png` to `10.png` ("Research Computin" runs under the
  strip's right edge). In `big-1200x900/05.png` the strip shows its vertical scrollbar; once the Group
  column makes the table wider (`big-1200x900/07.png`) that scrollbar is pushed out of view as well.
- **What happens:** the table is wider than the strip; there is no horizontal scrollbar, no ellipsis
  and no fade, so a person cannot tell a column is there.
- **Owner:** graphty app (the strip's table; check whether it is compact-mantine's table, in which
  case the overflow treatment belongs there).

### 2 -- At 900 x 700 the workspace title drops the name of what is being edited

- **Screen:** the workspace header at 900 x 700.
- **Evidence:** `big-900x700/03.png` and `08.png` ("Which nodes -- L..."), `filter-900x700/08.png`
  ("Except role staff -- Filt...").
- **What happens:** the title truncates while the count, the Group colors | Styled control and the
  buttons keep their room, so the layer's or card's name -- the only thing saying which rule is open --
  goes first.
- **Owner:** graphty app (workspace header).

### 2 -- One count in two number formats

- **Screen:** a layer's read-only outline at rest beside the sidebar and the workspace header.
- **Evidence:** `big-1200x900/12.png` ("37.5k of 50k" on the outline's title row) against
  `big-1200x900/11.png` (the sidebar's "37,512") and `big-1200x900/10.png` (the header's "37,512 of
  50,000"). The outline's own group rows say "35,960" and "5,485" a few pixels below.
- **Owner:** graphty app (number formatting in the outline's title row).

### 2 -- Values panel: a cut sentence, a wrapped label, and a run-on value list

- **Screen:** the Values tab of the properties column on the 50,000-node network.
- **Evidence:** `big-1200x900/01.png` and `big-900x700/01.png` ("972 nodes joined to no other n..."
  ends in an ellipsis; "Largest component" wraps to two lines while every other label is one line;
  "Time: name" and its "Set in Data" button sit 16 px left of the rows under them).
  `big-1200x900/02.png` and `big-900x700/02.png` (with 5,000 nodes selected: dept's 40 values are one
  right-aligned paragraph of about 30 lines, splitting names from their counts across lines --
  "Student / Services (196)", "Alumni / Relations (73)"; "Edges joining these nodes" and "5,000 of
  5,000 have a value" wrap).
- **Owner:** graphty app (the Values tab).

### 2 -- The picture is cropped at the start of a filtered project

- **Screen:** the graph at the start of `volunteers-thanks.txt` (a filter keeping 14 of 24 nodes).
- **Evidence:** `thanks-1200x900/01.png` (edges leave the canvas at the left edge; a node at the right
  edge is cut by the properties column); `thanks-900x700/01.png` (several of the 14 nodes are off the
  canvas); `thanks-1200x900/05.png` (the workspace preview inherits the crop: a node is cut at the
  outline's edge).
- **What happens:** the drawing is not framed to what the filter leaves in the picture. The mechanism
  was not traced in this audit: either the camera keeps a frame from before the filter or the frame
  is taken before the filter's nodes settle.
- **Owner:** graphty-element if its frame on a visibility change is wrong; graphty app if it frames
  at the wrong moment. To trace before fixing.

### 2 -- Control+A on 50,000 nodes selects 5,000 and says nothing

- **Screen:** the 50,000-node network after a click on empty canvas and Control+A.
- **Evidence:** `big-1200x900/02.png` and `big-900x700/02.png` ("5,000 nodes selected"; the sidebar's
  Selected row reads 5,000; the reference picker later offers "Selected (5,000)",
  `big-1200x900/07.png`).
- **What happens:** select-all stops at a tenth of the graph and no word on screen says it stopped
  short. Whether the limit is intended was not traced.
- **Owner:** graphty-element (what a key on the canvas does is the element's control).

### 2 -- The reference shows a bare id once chosen

- **Screen:** the reference picker after a choice.
- **Evidence:** `style-1200x900/09.png` (the option reads "v02 name James Carter") against
  `style-1200x900/10.png` (the field and the outline row read "v02"); the same with "n10569" in
  `big-1200x900/09.png`.
- **What happens:** a person who chose James Carter by name sees only an id they never typed.
- **Owner:** graphty app (which of the node's values the field and the row show).

### 2 -- A filter card's name stops describing the card

- **Screen:** a Data filter card after an Or group is added.
- **Evidence:** `filter-1200x900/13.png` (the card is still named "Except role staff" while it holds
  "A: all nodes except role staff, or B: within 2 hops of v02", and lets 23 of 24 through).
- **Owner:** graphty app (the card's default name follows its first step and is not refreshed).

### 1 -- The two pickers group their entries differently

- **Screen:** the attribute picker and the reference picker, in both places.
- **Evidence:** `style-1200x900/03.png` (attribute picker: headers "Data" and "Results" indented past
  their items); `style-1200x900/08.png` (reference picker in a layer: three entries with no header,
  then a "So far" header whose one entry "Nodes 24" is indented past it); `filter-1200x900/08.png`
  (reference picker in a filter: a "Selection" header indented past its items, then "So far" with a
  divider between it and "Nodes 24", so "So far" reads as an empty group and "Nodes 24" as a header).
- **Owner:** graphty app; if the group header style comes from compact-mantine's Combobox, the indent
  is fixed there.

### 1 -- The attribute picker cuts its list mid-row

- **Screen:** a new rule with its picker open.
- **Evidence:** `style-1200x900/03.png`, `filter-1200x900/03.png`, `style-900x700/03.png` (below the
  "Results" header only the top sliver of the next entry shows; no scrollbar is drawn).
- **Owner:** graphty app (the dropdown's height), or compact-mantine if its Combobox hides the
  scrollbar.

### 1 -- The step's count moves when a reference is chosen

- **Evidence:** `style-1200x900/07.png` ("0 so far No reference" on its own line above the verb's
  select) against `style-1200x900/10.png` ("16 so far" to the right of the select, the line above
  gone, everything below moving up 22 px).
- **Owner:** graphty app (step pane).

### 1 -- The read-only outline indents Except differently from the workspace

- **Evidence:** `style-1200x900/13.png` and `filter-1200x900/13.png` ("Except role staff" starts at the
  heading's left edge, while "All nodes" and "Within 2 hops of v02" are indented under their group);
  in the workspace (`style-1200x900/06.png`) "Except" has a column of its own and "role staff" lines
  up with the group's other rows.
- **Owner:** graphty app (outline at rest).

### 1 -- Two search boxes look different in one workspace

- **Evidence:** `big-1200x900/03.png` (the checklist's "Search 40" has no icon and a shorter box; the
  matches strip's "Search matches" has a magnifier icon).
- **Owner:** graphty app.

### 1 -- "Edges where ..." spaces its ellipsis

- **Evidence:** `style-1200x900/11.png` ("Edges where ..." beside "Condition...", "Or...", "Value..."
  and "Edge value..." with no space).
- **Owner:** graphty app (`StepPane.tsx`).

### 1 -- Search results for a name are in no visible order

- **Evidence:** `big-1200x900/08.png` (typing "Person 1" lists n19570, n14558, n15616, n17528,
  n10569, ...: "Nodes 8 of 10,000", not by name or id).
- **Owner:** graphty-element if the order comes from its node search; graphty app if it re-orders.

### 0 -- Noted, settled elsewhere

- The style workspace replaces the left panel and keeps the properties column; the filter workspace
  keeps the Data panel and covers the properties column, so the step pane sits in a different place
  in each (`style-1200x900/04.png` against `filter-1200x900/05.png`). decided.md, "Which panel it
  covers depends on the host", settles this.
- In the Data place the properties column still shows the selected style layer, and its Edit opens the
  layer's workspace while the rail has Data lit (`thanks-1200x900/04.png`, `05.png`). decided.md, "the
  right sidebar stays visible and usable", allows it.

## Not found

No overlap between controls, no text drawn over text, no bare Mantine control where compact-mantine
has one among the controls looked at (the workspace's Group colors | Styled and Edges selectors are
the same SegmentedControl; the properties column's Node | Edge is a tab list, a different control for
a different job), and no difference between the two hosts in the step pane's rows themselves.
