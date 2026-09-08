# INSPECTOR-TITLE-1.9 -- the one inspector title row

Decided once, applied to all 40 boards that draw an inspector. Nothing here is
a per-board choice. Where a board differs, the difference is a STATE difference,
it is one of the two named below, and the board's own comment says which.

Eight boards draw no inspector and are untouched: CanvasToolbar, ImportFlow,
ImportLargeFile, ImportOptions, ImportParseError, ImportRecognised, IpadPanel,
Welcome.

---

## 1. What was measured, before

| thing | values in the set |
|---|---|
| trailing cluster inventory | 7 -- `Copy reading, Toggle` (15), `Pin as A, Toggle` (9), `Toggle` (9), `Copy reading, Pin as A, Toggle` (4), `Style selection, Toggle` (1), `Pin as A, Close (Esc)` (1), `Copy reading, Pin as A` (1) |
| row right padding | 2 -- 8px on 21 boards, 12px on 19 |
| left-group gap | 3 -- 8px on 38, 6px on MultiSelection, 4px on FilterBuilderExpert |
| cluster gap | 2 -- 4px on 39, 0px on FilterBuilderExpert |
| leading glyph | 5 -- the inspector rect (32), the Analyze bar chart (2), a table glyph (1), the register's PIN glyph drawn as decoration (3), none (2) |
| name band | **6** -- 141, 145, 169, 173, 195, 197 |

Measured by rendering all 48 boards and reading `clientWidth` against
`scrollWidth` on every span of every inspector title row: **one board's name
pair actually rendered truncated** -- StyleFromAnalysis, `Style layer  Groups
(granularity 2.5)`, 201px of name in a 197px band. That is fewer than the pass
brief's seventeen; the brief's "five different widths" is real and is six. The
defect is therefore not mainly a wall of visible clipping. It is that six
different bands existed **for no reason a drafter could state**, so which board
clipped was an accident of which glyph and which padding it happened to carry,
and any string one word longer landed on a different board each time.

---

## 2. The row

    flex: 0 0 36px; height: 36px; display: flex; align-items: center;
    justify-content: space-between; gap: 8px; padding: 0 8px 0 16px;
    border-bottom: 1px solid #48525c; box-sizing: border-box;

- **Right padding 8, one value.** It is the 1.6 grid's own value: the grid is
  `16 | 224 | 8 | 24 | 8`, so a trailing 24px control ends at x = 272, and the
  title row's cluster now ends where every section header's trailing glyph
  already ends. 12px put the cluster 4px inside that line on 19 boards.
- Left padding 16, height 36, the bottom rule and the row gap of 8 are
  unchanged, because 40 boards already agreed on them.
- The row has exactly two children: the name group and the cluster.

## 3. The left group

    <div style="flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 4px;">
      <span style="flex: 0 0 auto; font-size: 12px; font-weight: 500; line-height: 1.2; color: #d5d7da; white-space: nowrap;">KIND</span>
      <span title="IDENTITY" style="flex: 0 1 auto; min-width: 0; font-size: 11px; line-height: 1.2; color: #7a828e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">IDENTITY</span>
    </div>

- **The kind first, at 12px 500, and it never truncates.** Five kinds, and they
  are 5.4's own rows: `Graph summary`, `Node`, `Selection`, `Result`,
  `Style layer`. ExplorePanel titled its row `3 nodes` -- the count, not the
  kind -- against DataTableDrawer, FilterBuilderExpert and MultiSelection, which
  all said `Selection`; it now reads `Selection  3 nodes` like its three peers.
- **The identity second, at 11px in `#7a828e`, and it is the half that gives.**
  It carries its own full text in a `title`, `min-width: 0`, and
  `text-overflow: ellipsis`. That is 6.3's ladder installed as a mechanism
  rather than patched onto the one row that needed it: both halves render when
  they fit; the technical or identity half truncates with its tooltip when they
  do not; the plain half never truncates. Nothing in the set reaches the second
  rung today (section 6), and a longer state now degrades correctly instead of
  overflowing the column.
- **Gap 4, not 8.** 6.3 renders a pair as one label separated by a space; 4 is
  the grid's small gap and the nearest honest value to a 12px space (3.3px).
  8 is the gap between separate objects, and the two halves are one label.
  FilterBuilderExpert already used 4.
- **No leading glyph.** This is the one deletion this pass makes, and it is
  what buys the fit. Four reasons, each checkable:
  1. It had five spellings across 40 boards and no rule saying which kind gets
     which. It was itself one of the drifting things in this row.
  2. On ExplorerAfterCard, ExplorerExpert and GroupProfilePopout it was the
     register's PIN verb glyph, drawn non-interactively, in the same 36px row
     as the real `Pin as A` control -- one verb, two drawings, one board, which
     is the defect REGISTER section 9 names.
  3. On 32 boards it was the register's `toggle inspector` rect: the same glyph
     the top bar draws for the same surface, and draws ACTIVE in blue whenever
     the inspector is open. The inspector's identity is already marked, in
     colour, 900px away. A second, grey, non-clickable copy of it beside text
     that says what is selected is decoration.
  4. It cost 22px (14 glyph + 8 gap) of the one row in the shell where 6.3 says
     the plain name must never truncate, and those 22px are exactly what makes
     all 40 name pairs fit at 280 with no truncation anywhere.

  This is not a new move. FilterBuilderExpert had already dropped it alone, for
  this reason, and its comment says so: "the 14px pane glyph that used to lead
  the row is dropped". CompareSplit had dropped it too. The pass generalises
  what two boards had already concluded.

  The activity panel header keeps its leading glyph and should: five activities
  share one 280px column, so the glyph says which one is open and pairs with the
  rail's highlighted item. The inspector is one surface. There is nothing to
  disambiguate, so the asymmetry is earned rather than arbitrary.
- **No Coming tag in this row.** ExplorePanel and FilterBuilderExpert tagged the
  title row for unshipped multi-selection. REGISTER 15.3's rule is "one tag, one
  control", and 5.4's sentence is that mockups mark multi-selection *controls*
  Coming -- the surface header is neither. MultiSelection had already made this
  exact call in writing ("the Coming tag stays on the Explore panel's Selection
  section header ... dropped from this row so the size reads in full"). Both
  boards keep every other Coming tag they draw (ExplorePanel 5, FilterBuilder
  Expert 6), including the ones on the multi-selection controls themselves.

## 4. The trailing cluster -- one inventory, one order

    <div style="flex: 0 0 auto; display: flex; align-items: center; gap: 4px;">

Three slots, always in this order, and **nothing else is ever in this row**:

| # | verb | glyph (REGISTER) | drawn when |
|---|---|---|---|
| 1 | `Copy reading` | 1.2 `copy`, 14px | the surface's own content is a reading (7.5 / RT-10) |
| 2 | `Pin as A` | 1.2 `pin`, 14px | a node, edge, selection or result is shown (5.4, verbatim) |
| 3 | `Toggle inspector (D)` | 12px closed disclosure caret (registered by this pass, section 5) | always, on every desktop inspector |
| 3 | `Close (Esc)` | 1.1 `close (dialog, overlay, ...)`, 12px | instead of 3, on the iPad inspector, which is an overlay (5.2) |

The order is 6.8's own panel-header row read for this surface -- *view toggles,
pin, overflow, close*. The inspector header has no view toggle. `Copy reading`
is not a fourth kind: it is the collapsed head of the surface's copy group under
6.8's collapse clause, whose menu carries `Copy reading`, `Copy as TSV` and that
surface's export and record copies, and it sits where a collapsed group sits, at
the head. Every board's own comment already spells that menu out.

**Why there is no separate overflow kebab.** 6.8 caps a panel header at "3 plus
overflow", so a fourth 24px control is allowed by the cap and refused here by
the row: four icons is 108px of cluster, which leaves 139 for the name and
truncates `Categories for group 3`, which is the whole reason this pass exists.
The copy control is already the collapsed menu, so a kebab beside it would be a
second menu in a 36px row. Nothing needed a home it could not reach: the one
one-off verb that was in the row, DataTableDrawer's `Style selection`, is a
multi-selection *action* in 5.4 and its home is that board's pinned action
block, which already ends in a `More` row -- 6.8 point 4's non-hover twin. It
left the header and did not need an overflow to leave into.

**The two state gates, and only two.**

- Pin. 5.4: "a pin icon appears whenever a node, edge, selection or result is
  shown". So: Node, Selection and Result rows draw it; Graph summary and Style
  layer do not. On MultiSelection it is drawn ENGAGED (`background: #28364e;
  color: #4a7ee8`) because card A is pinned, and the title stays `Pin as A` --
  an active toggle does not rename itself (REGISTER 10.2).
- Copy reading. Drawn where the surface's own content is a reading. Rendering
  all 40 inspectors and looking for an RT-10 reading (12px / 1.5 / `#a3a8b1`)
  found one on 37 of them -- every kind including a single node ("Linked to
  37 others, more than 99% of nodes. Rank 1 of 200 by Bridges.") -- and none on
  StylePanel, StyleLibrary or StyleDiverging. StyleFromAnalysis *does* show a
  reading, and still draws no copy control: that reading is in its Source
  section and belongs to the run that made the layer, not to the layer, and 5.4
  gives "Open result" as the route to the run's own surface, where the copy
  control lives. **A style layer therefore never draws either verb**, which is
  the one-icon case.

Cluster widths, and the name band each leaves:

| row state | cluster | band | boards | longest name in that state |
|---|---|---|---|---|
| Copy + Pin + close | 3 x 24 + 2 x 4 = 80 | **167** | 16 | MultiSelection, `Selection  7 nodes, 4 edges`, 153 |
| Copy + close | 2 x 24 + 4 = 52 | **195** | 20 | `Graph summary`, 97 |
| close alone | 24 | **223** | 4 | StyleFromAnalysis, `Style layer  Groups (granularity 2.5)`, 201 |

Band = 279 (280 less the 1px border) - 16 left pad - 8 right pad - 8 row gap -
cluster. Three bands, and each one is decided by the row's own state rather than
by which glyph and padding the board happened to carry.

## 5. The register entry this pass adds

`Copy reading`, `Pin as A` and `Close (Esc)` are already registered (1.2 copy,
1.2 pin with 10.1 and 10.2, 1.1 close). One verb in this row was not.

The title row's collapse control is drawn with the **12px closed disclosure
caret** and titled `Toggle inspector (D)`, on 39 boards. The register's
`toggle inspector` row (1.1) carries the *rect* glyph, which is the top bar's
drawing. So the drawing this row actually uses was unregistered. It is added
to REGISTER-1.5 as its own row in 1.1 and recorded in section 8 as a documented
reuse, not as drift:

| Verb | 16px stroke glyph (inner SVG) | Title |
|---|---|---|
| collapse inspector (the inspector title row's own control, 12px) | `<polyline points="6,4 10,8 6,12"></polyline>` | `Toggle inspector (D)` |

One verb, two positions, one binding. The top bar's rect is the switch and says
whether the inspector is shown, drawn active when it is; the title row's
right-pointing caret is the surface's own collapse affordance and only ever
appears inside the thing it collapses, which is what keeps the two readable
apart -- the same relationship the rail and the activity panel's
`Close the panel (Cmd+B)` already have. On the iPad the inspector is an overlay
(5.2), so it takes 1.1's `close` X and `Close (Esc)` instead, unchanged.

## 6. Where the 6.3 fallback lands

Nowhere, after the cluster is fixed. Rendering all 40 boards and comparing
`scrollWidth` to `clientWidth` on every span of every inspector title row:
**0 clipped**. The tightest rows are StyleFromAnalysis at 201 of 223 and
MultiSelection at 153 of 167.

The ladder is still installed on every identity span (`min-width: 0`,
`text-overflow: ellipsis`, the full string in `title`), because 6.3 wants a rule
and not a patch, and the threshold is now sayable: **at three slots this row
holds 167px of name.** A 6.3 canonical pair longer than that truncates its
technical half into the row's title -- `Most connected (Degree centrality)`
measures 200 as a one-label pair and would, which is why a result row's header
names the kind and the run's name renders in the body one line below, where it
has the full 256px band.

## 7. What moved, and where it went

- **`Copy reading` on 9 boards moved up into the 36px title row.** REGISTER 10.1
  settles this control as "the title-row control ... in a 36px inspector or
  panel title row" across 27 boards, and RT-8 gives a header its surface's
  verbs. Nine boards drew the same control lower down instead -- beside the
  reading on ContextMenu, ExploreNotesList, ExplorerLargeGraph,
  SettingsPerformance and SettingsShortcuts; on the result's identity row on
  AnalyzeSweep, ExplorerAfterCard and GroupProfilePopout; in an RT-7 verb row on
  TimeSlider. It is one control per surface, so it was moved and not copied: the
  lower instance is gone on each of those nine and each board's comment now says
  where it went. AiPanel and CategoryTable had already made this move; those
  nine had not.
- **`Copy reading` was added, new, to 7 boards** that drew it nowhere:
  CompareSplit, DataTableDrawer, ExplorerExpert, ExplorerNotes, HistoryPopover,
  InspectorGenomics, IpadInspector, and it is now on every surface that shows a
  reading. HistoryPopover's bare `Copy` on its result card is untouched;
  REGISTER 10.1 names that board explicitly and keeps it bare.
- **`Pin as A` was added to DataTableDrawer**, which shows a selection and drew
  no header pin. Its action block's `Pin as A` text row stays: REGISTER 12.1
  makes the pinned action block labelled rows, and MultiSelection and
  ExplorePanel already draw both.
- **`Toggle inspector (D)` was added to MultiSelection**, which drew none. Its
  comment had dropped it for fit; the row now has 14px of slack with it in.
- **`Style selection` left DataTableDrawer's title row** for that board's action
  block `More` (section 4).
- **The Coming tag left ExplorePanel's and FilterBuilderExpert's title rows**
  (section 3).

## 8. Residuals, named rather than half-fixed

1. **DataTableDrawer prints its selection size twice** -- `Selection` in the
   header and a 14px `3 nodes  Coming` count row 40px below. MIN-1 gives the
   size to the header and the status bar. The header was left without an
   identity string rather than add a third printing; the content row is that
   board's own and is not this pass's.
2. **DataTableDrawer stacks two copy glyphs**, `Copy reading` in the header and
   `Copy ids` on the count row below. REGISTER 10.1 permits both -- different
   objects, different titles, and only the title-row one is the surface's.
3. **`Toggle inspector (D)` names two controls on one screen**, the top bar's
   rect and this row's caret. Section 5 registers the caret and states the
   division; whether the title-row control should instead read
   `Close the inspector (D)`, matching the activity panel's
   `Close the panel (Cmd+B)`, is a naming question and belongs to VOCAB and the
   register, not to this row.
4. **The result's own name is not in the header.** On the six Result boards the
   header says `Result` and the run's 6.3 pair (`Bridges (Betweenness
   centrality)`, `Groups (Communities, Louvain)`) renders in the body one line
   below. That is the right place for it -- the body band is 256px and the
   header band is 167 -- but it does mean the header's kind word and the body's
   first line sit 8px apart. Whether the header should carry the run name is a
   result-shape question, not a title-row one.
