# Screenshot audit: tier 5 screens at 1200 x 900 and 900 x 700

Build 1e123d7d33 (the frozen tier 5 build), served by `real.mjs` with `REAL_DIST` set to
`.study-builds/tier5-r1d1-1e123d7d33` and `REAL_VIEWPORT` set per size, default color scheme.
Every screenshot below was looked at. Sessions are in this file's folder, `engineer/`, and each one
ended with `--end`:

| Session | Start | What it walks |
| --- | --- | --- |
| `style-<size>` | volunteers.txt | The graph at the start; a style layer's Which nodes: a new rule with its picker open, a step pane, Except on, an Or group with its picker open, the reference picker closed, open, typed and chosen, Advanced with Edges where, No match, the read-only outline at rest |
| `filter-<size>` | volunteers.txt | The same states in a Data place filter card |
| `thanks-<size>` | volunteers-thanks.txt | A colleague's filter and layer at rest in both places, a layer's workspace opened from the Data place |
| `big-<size>` | staff-50k.txt | 50,000 nodes: the graph at the start, Control+A, the checklist, Check N, a step with many values, the reference picker open, typed and chosen, Selected (N), the outline at rest in both places |

`<size>` is `1200x900` or `900x700`. Screenshot N shows the screen after step N - 1 of the walk.
Git keeps only the sessions' records; the 88 screenshots are also kept in the main checkout's
`tmp/design-studio/tier5/rounds/round-1/expert/engineer/`, under the same session names.

Severity: 4 blocks a task, 3 a serious obstacle, 2 a visible defect a person notices and works
around, 1 a polish defect, 0 not a problem. Ratings are against the tier's settled behaviors
(`../../../decided.md`) and whether a task is blocked, not against how bad a screen looks.

## Findings

### 2 -- At 900 x 700 the workspace preview collapses to a sliver

- **Screen:** every workspace state at 900 x 700, in both places.
- **Evidence:** `style-900x700/03.png` to `12.png`, `big-900x700/03.png` to `10.png` (the preview
  is about 44 px wide, from x 297 to 341; 50,000 nodes are a 40 px tile); `filter-900x700/03.png`
  to `12.png` (about 84 px); `thanks-900x700/05.png`. The matches strip under it shows one column and
  its search box is cut to "Se".
- **Mechanism:** the workspace grid is `fit-content(280px) minmax(0, 1fr) auto`
  (`graphty/src/workspace/selection/selection.css` 223): the outline keeps at least 200 px (or the
  width of the panel it covers), the step pane at least 320 px (`.sel-ws-props`, 320), and in a
  style layer the properties column stays beside them, so the preview gets what is left: 900 less
  the 56 px rail, 240, 240 and 320 is 44.
- **Why 2, not 3:** decided.md and the spec set check widths at 1440 x 900 and 1280 x 800 only
  (decided.md "Workspace built", "At 1280 x 800 the preview is 424 px wide"; spec "Per surface");
  no task runs below that and the step pane, where the work is done, keeps its full width. A width
  rule for smaller windows needs a decided.md entry before code.
- **Owner:** graphty app (workspace layout).

### 2 -- The matches strip cuts its last column and loses its scrollbar

- **Screen:** the matches strip under the preview, at both sizes.
- **Evidence:** `style-1200x900/03.png` to `05.png` ("trai"), `style-1200x900/06.png` to `12.png`
  ("hou" once the Group column is added); `big-1200x900/05.png` shows the strip's vertical
  scrollbar at x 632, and in `big-1200x900/06.png` to `10.png`, with the Group column added,
  "Research Computin" runs under the strip's right edge and the vertical scrollbar is gone.
- **Mechanism:** `.sel-ws-strip` is `overflow: hidden` and its table cell `.sel-ws-strip-table`
  sets no `min-width: 0` (`selection.css` 297-313), so the grid item grows to the table's own
  width and the strip clips its right side -- the last column and the table's vertical scrollbar
  with it. No horizontal scrollbar, ellipsis or fade says a column is there.
- **Owner:** graphty app (strip CSS). The table is compact-mantine's `DataTable`, which already
  scrolls when its box is bounded; nothing to change there.

### 2 -- An outline row's reference is cut off, two different ways

- **Screen:** the workspace outline with a "Within N hops of" row, and the read-only outline.
- **Evidence:** `filter-1200x900/08.png` ("Within 2 hops of No re", a hard clip at the column edge,
  no ellipsis); `style-1200x900/07.png` ("No reference" runs to the column's edge);
  `big-1200x900/10.png` ("Selected...", with an ellipsis) and `big-1200x900/11.png`, `12.png`
  ("Selected (...", cut inside the parenthesis, at rest).
- **What happens:** the part of the row that names what the step counts from is the part lost.
  decided.md "Rows" says a cut test keeps an ellipsis; the filter host's row has none.
- **Owner:** graphty app (outline row layout).

### 2 -- A chosen reference shows its id, not the name it was found by

- **Screen:** the reference field and the outline row after a choice.
- **Evidence:** `style-1200x900/09.png` (the option reads "v02 name James Carter") against
  `style-1200x900/10.png` (field and row read "v02"); `filter-1200x900/10.png`; `big-1200x900/09.png`
  ("n10569" for "Person 10569").
- **What happens:** decided.md ("Words", line 694) says a reference row shows the value that matched;
  a person who chose James Carter by name sees an id they never typed.
- **Owner:** graphty app (`referenceWords` in `ReferencePicker.tsx` and the outline row).

### 2 -- Control+A on 50,000 nodes selects 5,000 and says nothing

- **Screen:** the 50,000-node network after a click on empty canvas and Control+A.
- **Evidence:** `big-1200x900/02.png`, `big-900x700/02.png` ("5,000 nodes selected"; the Selected
  row reads 5,000); `big-1200x900/07.png` (the reference picker offers "Selected (5,000)").
- **Mechanism:** graphty-element caps a selection at `DEFAULT_SELECTION_CAP` (5,000,
  `graphty-element/src/session/selection/SelectionApi.ts` 57) on purpose and reports it: the
  selection's state has `cap` and `truncated`. Nothing in `graphty/src` reads `truncated`, so the
  app never says the selection stopped short.
- **Owner:** graphty app (say it, from the element's fact). The element already gives the fact.

### 2 -- At 900 x 700 the workspace title drops the name of what is being edited

- **Screen:** the workspace header at 900 x 700.
- **Evidence:** `big-900x700/03.png` to `10.png` ("Which nodes -- L..."), `filter-900x700/08.png`
  ("Except role staff -- Filt...").
- **What happens:** the title truncates while the count, Group colors | Styled and the buttons keep
  their room, so the layer's or card's name -- the only words saying which rule is open -- goes
  first. "Group colors" also fills its segment edge to edge at this width (`big-900x700/03.png`).
- **Owner:** graphty app (workspace header).

### 2 -- A filter card's name stops describing the card

- **Screen:** a Data filter card after a second step or an Or group.
- **Evidence:** `filter-1200x900/13.png` (named "Except role staff" while it holds "A: all nodes
  except role staff, or B: within 2 hops of v02" and lets 23 of 24 through); `thanks-1200x900/04.png`
  (named "trained Yes" while it also keeps hours 10 or more).
- **What happens:** the default name follows the first step and is not refreshed. A person scanning
  the Filters list reads a rule the card does not apply.
- **Owner:** graphty app (filter card default name).

### 2 -- The picture is cropped at the start of a filtered project

- **Screen:** the graph at the start of `volunteers-thanks.txt` (a filter keeping 14 of 24 nodes).
- **Evidence:** `thanks-1200x900/01.png` to `06.png` (edges leave the canvas at the left and right
  edges, nodes sit against the toolbar); `thanks-900x700/01.png`; the workspace preview inherits it
  (`thanks-1200x900/05.png`: nodes cut at the outline's edge). The unfiltered start
  (`style-1200x900/01.png`) is framed whole.
- **What happens:** the drawing is not framed to what the filter leaves. Not traced: either the
  camera keeps a frame from before the filter, or the frame is taken before the filtered layout
  settles. Fit works around it.
- **Owner:** graphty-element if its frame on a visibility change is wrong; graphty app if it frames
  at the wrong moment. Trace before fixing.

### 2 -- Values panel: a cut sentence, a wrapped label, a run-on value list

- **Screen:** the Values tab of the properties column on the 50,000-node network.
- **Evidence:** `big-1200x900/01.png`, `big-900x700/01.png` ("972 nodes joined to no other n..."
  ends in an ellipsis; "Largest component" wraps to two lines while every other label is one line;
  "Time: name" and its "Set in Data" sit 16 px left of the rows under it). `big-1200x900/02.png`,
  `big-900x700/02.png` (with 5,000 selected: dept's 40 values are one right-aligned paragraph of
  about 30 lines that splits names from their counts -- "Student / Services (196)"; "Edges joining
  these nodes" and "5,000 of 5,000 have a value" wrap).
- **Owner:** graphty app (the Values tab).

### 1 -- The pickers indent their group headers inconsistently

- **Evidence:** `style-1200x900/03.png` (attribute picker: "Data" and "Results" indented 20 px past
  their items); `style-1200x900/08.png` (reference picker in a layer: three entries with no header,
  then "So far" at the items' indent and its entry "Nodes 24" at the header indent);
  `filter-1200x900/08.png` (in a filter: "Selection" indented past its items, then "So far" with a
  divider between it and "Nodes 24", so "So far" reads as an empty group); `big-1200x900/08.png`
  ("Nodes 8 of 10,000" indented past its results).
- **Owner:** graphty app (`references.ts` sections); if the header style is compact-mantine's
  Combobox group label, the indent is fixed there.

### 1 -- The attribute picker cuts its list mid-row

- **Evidence:** `style-1200x900/03.png`, `06.png`, `filter-1200x900/03.png` (below "Results" only
  the top sliver of the next entry shows; no scrollbar is drawn).
- **Owner:** graphty app (dropdown height), or compact-mantine if its Combobox hides the scrollbar.

### 1 -- The reference picker grows past its field

- **Evidence:** `big-1200x900/07.png` (the list is the field's width, x 657 to 840) against
  `big-1200x900/08.png` (typed: the list widens to x 857); `big-900x700/08.png` (x 357 to 557
  under a field that ends at 540).
- **What happens:** decided.md holds the value picker to its field's width (`width="target"`); the
  reference picker, a second build of a picker, does not follow it.
- **Owner:** graphty app (`ReferencePicker.tsx`).

### 1 -- The step's count moves when a reference is chosen

- **Evidence:** `style-1200x900/07.png` ("0 so far No reference" on its own line above the verb's
  select) against `style-1200x900/10.png` ("16 so far" beside a narrower select, the line above gone,
  everything below moving up 22 px); the same in `big-1200x900/06.png` and `09.png`.
- **Owner:** graphty app (`StepPane.tsx`).

### 1 -- One count in two number formats

- **Evidence:** `big-1200x900/12.png` ("37.5k of 50k" on the outline's title row, "35,960" and
  "5,485" on the group rows under it); `big-1200x900/10.png` (header "37,512 of 50,000").
- **Mechanism:** `shortCount` (`graphty/src/workspace/selection/words.ts` 58) shortens from 10,000
  for the title row only.
- **Owner:** graphty app.

### 1 -- The read-only outline indents Except differently from the workspace

- **Evidence:** `style-1200x900/13.png`, `filter-1200x900/13.png` ("Except role staff" starts at the
  heading's left edge while "All nodes" and "Within 2 hops of v02" are indented under their group);
  in the workspace (`style-1200x900/06.png`) "Except" has a column of its own.
- **Owner:** graphty app (outline at rest).

### 1 -- Two wordings for edges that draw nothing

- **Evidence:** `style-1200x900/03.png` ("Edges: nothing set" on a new layer) against
  `style-1200x900/04.png` ("Edges: not styled" one step later, and the Edge tab's "not styled").
- **Mechanism:** `OtherLine` in `graphty/src/workspace/style/StylePanel.tsx` writes "not styled",
  but a new layer whose edge half is styled and sets nothing goes through `stylesWords`, which says
  "nothing set"; the function's own comment promises one wording whatever the state.
- **Owner:** graphty app.

### 1 -- Two search boxes look different in one workspace

- **Evidence:** `big-1200x900/03.png` (the checklist's "Search 40" has no icon and a shorter box;
  the strip's "Search matches" has a magnifier).
- **Owner:** graphty app (use compact-mantine's `SearchInput` in both, as the strip does).

### 1 -- Search results for a name are in no visible order

- **Evidence:** `big-1200x900/08.png` ("Person 1" lists n19570, n14558, n15616, n17528, n10569...).
- **Mechanism:** graphty-element's find ranks by where the text matched and breaks ties in graph
  order (`graphty-element/src/session/query.ts` 685); every "Person 1xxxx" ties, so the list is the
  file's row order.
- **Owner:** graphty-element (tie order); an additive option, not a changed default.

### 0 -- Noted, settled elsewhere

- The style workspace covers the left panel and keeps the properties column; the filter workspace
  keeps the Data panel and covers the properties column (`style-1200x900/04.png` against
  `filter-1200x900/05.png`). decided.md, "Which panel it covers depends on the host".
- In the Data place the properties column still shows the selected layer and its Edit opens the
  layer's workspace while the rail has Data lit (`thanks-1200x900/04.png`, `05.png`). decided.md, "the
  right sidebar stays visible and usable".
- The outline's title row shows Edit while it has focus or the pointer and the count otherwise
  (`big-1200x900/11.png` against `12.png`, `style-1200x900/13.png`): one control, two states.

## Not found

No control drawn over another, no text over text, no bare Mantine control where compact-mantine
has one among the controls looked at (Group colors | Styled and Edges are the same SegmentedControl;
the strip's table is compact-mantine's DataTable), and no difference between the hosts in the step
pane's rows themselves.
