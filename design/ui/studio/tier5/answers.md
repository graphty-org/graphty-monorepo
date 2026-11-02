# Tier 5 answer key (graders and pilots only)

Never shown to participants. Each task: its success definition, the success path, and what the
final screen, the end-state records or the saved file must show. Every count below was computed
from the files (networkx 2.8, scripts `data.py` and `big.py` under the main checkout's
`tmp/design-studio/tier5/prep/`, `shifts.py` under `tmp/design-studio/tier5/materials/`, and
`tool/files/big-50k.py`) and, where marked "read", also read off a build. Paths name controls as
the **workspace UI** draws them on build fc1d7ee4f6 (graphty@0.8.92, 2026-11-02; walks under the
main checkout's `tmp/design-studio/tier5/materials/p1` to `p9`); a path marked "(walked)" was
walked there end to end, the others follow the same controls and the dry run walks them. Each core
task's path step count is written as "Path steps: N" (bar 8) in `tool/steps.mjs`'s units: every
click, key, typed text and file chosen counts, looking does not.

## How the workspace UI reads, for graders

- **At rest** a style layer's Which nodes, and a filter card, are a read-only outline: one row per
  step ("installed before 2000", "Except on_record Yes", "Degree min 2 Edges"), the count on the
  title row ("2 of 7"). A click on a row, Enter on it, or Edit opens the **workspace** over the
  canvas: header "Which nodes -- <layer>" or "<card name> -- Filters" with the result count, then
  Group colors | Styled, Table, Clear, Cancel, Done; under it the outline column, the canvas as the
  preview (Fit), the matches strip, and the selected row's properties (Condition... and Or... on
  its first row, the Except switch, the value field, the test, Advanced).
- A new layer and a new filter card start as **All nodes** with no step and open with the value
  picker open. Condition... adds a narrowing step (Keep, never written); the Except switch makes it
  subtract; Or... adds a group ("A", "or B" in the outline).
- **Done** (or Escape once nothing smaller is open) keeps the edits; **Cancel** undoes everything
  since the workspace opened; **Clear** returns the rule to All nodes. A filter applies while it is
  edited (the top bar's count changes at once).
- A style layer's selection is graded by the inspector's Which nodes count ("4 of 14", over the
  filtered graph; "1,076 of 50k" short), the workspace header, and the canvas key ("Color: Staff, 4
  of 24 nodes", over the full graph: two bases, a known finding). A filter is graded by the top
  bar's "N of M nodes" and the card's "N of M". A color is "orange" when the layer's fill is any
  visibly orange or red-orange hue (the setups use E4572E); a different hue with the right members
  is SD for the color, never P.

## Facts no briefing may hold

- `Ben Adler` -- T74 A's answer (also `Seun Okoro`, `Priya Nair`, `Hannah Weiss`)
- `Seun Okoro` -- T74 A
- `Priya Nair` -- T74 A
- `Hannah Weiss` -- T74 A
- `Mill Pond` -- T74 B's answer (with Cedar Bend, which its prompt does not name, and Fox Creek)
- `Fox Creek` -- T74 B
- `v02` -- James Carter's id, which T73 A must find (the volunteer file designates no name)
- `G03` -- Cedar Bend's id (T73 B)
- `1,076` -- T79 A's answer
- `1,050` -- T79 B's answer

## The files

- `volunteers.graphml`: 24 people v01-v24, 63 ties (a shift worked together), undirected. `name`,
  `role` (volunteer 15, staff 5: v02 James Carter, v09 Hannah Weiss, v17 Ken Ito, v21 Ben Adler,
  v24 Zara Ahmed; board 3: v01 Maria Lopez, v13 Seun Okoro, v23 Paul Dubois), `hours`, `trained`
  (false: v04, v06, v08, v12, v13, v15, v19, v22, v24), `phone` (missing on 7). No column is
  designated as the name on `volunteers.txt`. The find box finds "James" ("v02, name: James
  Carter").
- `volunteers-shifts.graphml` (new, T78 A): the same file with `shifts` on each tie, seeded (1 on
  32 ties, 2 or more on 31).
- `sources.graphml`: 24 people and organizations, 59 ties. `kind` person 14, company 6 (s01, s04,
  s07, s17, s20, s24), agency 4 (s09, s12, s15, s22); `on_record` true for s17, s09, s22 among
  them.
- Gauges on `gauges-clean.txt`: 11 gauges G01-G11, 13 stretches with `km`, directed (flows.csv
  runs from one gauge to the next), one piece, `station` designated as the name. `installed`
  dates: G01 1998-05-12, G02 2003-07-01, G03 2001-04-18, G04 2010-09-09, G05 1995-06-30, G06
  2012-03-14, G07 2008-08-22, G08 2015-05-05, G09 1999-10-11, G10 2018-06-27, G11 2006-01-16.
  `telemetry` yes: G01, G02, G04, G06, G07, G09, G11; no: G03, G05, G08, G10. `depth_cm`: G03 140,
  G05 155, G09 210, G01 118, others under 100, G07 blank. `km` 1.6 to 3.6; 3 km or longer: G06-G01
  3.2, G04-G08 3.6, G05-G08 3.1.
- Graph researchers sample: 549 people, 2,084 ties (369 repeated: one per paper), undirected, one
  piece; Degree counts every tie (median 4, highest 111).
- `yeast-galactose.graphml`: 331 genes, 361 interactions, 26 pieces (largest 249 genes, 298
  interactions); `gal80Rexp` missing on 2 genes.
- `staff-50k.graphml` and `sensors-50k.graphml` (new, T79; written by `tool/files/big-50k.py`, which
  git ignores the output of): 50,000 nodes, 100,000 ties each, undirected; `name` ("Person 00017")
  and `dept` (40 departments, Facilities 11,575 the largest, Grants 1,076 the 11th), or `station`
  and `basin` (40 basins, Otter Creek 1,050 the 11th). The checklist draws the 8 largest, so the
  answer's value is never drawn before a search.

## T70. A simple choice, twice

- **Success**: a style layer whose selection is the staff (A) / the gauges put in during the 1990s
  (B), filled orange; and a filter card that keeps the trained (A) / the gauges that send readings
  (B) in the picture without deleting. The participant reports both counts.
- **A values**: in the picture **15 of 24** (top bar "15 of 24 nodes, 25 of 63 edges"); in orange
  **4** (v02, v09, v17, v21; Zara Ahmed is staff but untrained, so out of the picture). The layer's
  Which nodes reads "4 of 15". A report of 5 orange read before filtering is P unless the
  participant says one is out of the picture.
- **B values** (read): in the picture **7 of 11** (G01, G02, G04, G06, G07, G09, G11; top bar "7 of
  11 nodes, 3 of 13 edges"); in orange **2** (G01 1998, G09 1999; G05 1995 sends no readings);
  Which nodes "2 of 7", key "Color: Layer 1, 2 of 11 nodes".
- **Path (A)**: Style layers "+" (Add a layer or a folder) > Layer; Which nodes (the workspace
  opens, value picker open); `role`; tick staff; Done; Fill "+" (Add to node fill); type the hex
  (the color box is focused, its text selected); Enter. Then Data; Filters "+" (Add filter; the
  workspace opens, picker open); `trained`; Value...; Yes; Done. Path steps: 15 (A).
- **Path (B)** (walked): the same, with `installed` (its test opens on Before, the date box
  focused): type 2000, Enter, Done, Fill, hex, Enter; then Data, Add filter, `telemetry`, tick
  yes, Done. Path steps: 15 (B). Between 1990 and 1999 is equal (more steps).
- **Also success**: the filter first (the layer then counts over the filtered graph: staff 4);
  trained No / telemetry no with the Except switch; a color picked from the swatch.
- **Not success**: a style layer with Visibility hidden instead of a filter card (the people are
  still in the network's counts: tier 4 T66's rule); a selection on the canvas; deleting nodes.
- **Follow-up**: the owner's preview question (group colors while picking) and the overwhelm rating.

## T71. Either of two things

- **Success**: one filter card with two ways in (an "Or" group: A role board, or B hours 30 or
  more; B telemetry no, or B installed before 2000); or an equal result. The participant reports
  the count.
- **A values**: **10 of 24** (board v01, v13, v23 plus 30 hours or more v02, v05, v09, v16, v17,
  v21, v24). Both at once would be 0; board alone 3; hours alone 7.
- **B values**: **6 of 11** (G01, G03, G05, G08, G09, G10). Both at once 1 (G05).
- **Path (A)**: Data; Add filter; `role`; tick board; Or... (the new group's picker opens);
  `hours`; type 30 (the Min box takes focus after the pick); Enter; Done. Path steps: 9 (A).
- **Path (B)**: Data; Add filter; `telemetry`; tick no; Or...; `installed`; type 2000; Enter; Done.
  Path steps: 9 (B).
- **Final screen**: the card's outline "A / role board / or B / hours min 30" (B: "telemetry no /
  or B / installed before 2000"), the top bar's count.
- **Also success**: any other route that leaves exactly those in the picture with one card (the
  route noted). Two cards are not equal: both must hold.
- **Not success**: two cards (A 0, B 1); the second value added by Condition... in the same group
  (both at once).
- **Follow-up**: the owner's table question (the matches strip under the drawing while deciding)
  and the overwhelm rating.

## T72. All of one kind, but not some

- **Success**: a style layer whose selection is A companies and agencies not on the record / B
  telemetry yes not installed in the 1990s, filled orange; the participant reports the count.
- **A values** (read): **7 of 24**: Bayview Holdings, Harlan Development, Northgate Capital, Port
  Authority, Riverside Partners, Silverline Media, Zoning Board.
- **B values**: **5 of 11**: G02, G04, G06, G07, G11.
- **Path (A)** (walked to the Except switch): + > Layer; Which nodes; `kind`; tick company; tick
  agency; Condition...; `on_record`; Value...; Yes; the Except switch; Done; Fill; hex; Enter.
  Final outline: "kind agency, company / Except on_record Yes", header "7 of 24".
- **Path (B)**: + > Layer; Which nodes; `telemetry`; tick yes; Condition...; `installed`; type
  2000; Enter; the Except switch; Done; Fill; hex; Enter.
- **Also success**: a second step with on_record No / installed not before 2000 (equal result).
- **Not success**: a filter card; a second layer painting the on-record ones back in the default
  color (P: the count is right on the canvas but no layer holds the rule).

## T73. Close to one person or place

- **Success**: a style layer whose selection is within 2 hops of James Carter (A) / Cedar Bend
  (B), the center included, filled orange; the participant reports the count.
- **A values**: **16 of 24**: v01-v10, v13-v17, v21. One hop would be 9.
- **B values** (read): **7 of 11**: G01, G02, G03, G04, G05, G08, G11. The hop count ignores the
  river's direction; Downstream of Cedar Bend within 2 would be 4 (G03, G04, G05, G08), and is P
  ("in either direction" is in the prompt).
- **Path (B)** (walked): + > Layer; Which nodes; type "within"; Enter (Within hops of; focus goes
  to the reference field); Enter (the reference picker opens, its search focused); type Cedar;
  Enter; Done; Fill; hex; Enter. Hops is 2 by default. Path steps: 12 (B). The row reads "Within 2
  hops of Cedar Bend".
- **Path (A)**: the same with "James": spec 4.3 searches every column when no label column is
  designated, so the reference search finds James Carter by `name`; the dry run reads whether this
  build does (if not, the find box first: type James, read "v02", then type v02 in the reference
  search: two steps more). Path steps: 12 (A), or 14 by the find box.
- **Also success (A)**: James selected first (Pick on canvas, or the find result's click and the
  reference "Selected (1)"): a live reference, equal while he stays selected; the grader checks the
  layer still counts 16 after the selection changes (P unless the participant pinned it to v02).
- **Not success**: 1 hop; Analyze's Steps away colored by its own suggested style (no layer
  selection; P if the colored set is right).

## T74. The few a measure puts first

- **Success**: a style layer whose selection is the highest 5 by PageRank (A) / the highest 3 by
  Betweenness (B), filled orange; the participant names them.
- **A values**: Ben Adler v21, Seun Okoro v13, Priya Nair v05, Hannah Weiss v09, James Carter v02
  (PageRank 0.0586 to 0.0545; the sixth, v23, is 0.0512: no tie at the cut).
- **B values**: Mill Pond G02, Cedar Bend G03, Fox Creek G04. The dry run reads the fourth's value
  to check there is no tie at the cut.
- **Path (A)**: + > Layer; Which nodes; type "page"; Enter (Results: PageRank, the run the start
  holds); the mode select ("By value"); By position; type 5; Enter; Done; Fill; hex; Enter. Path
  steps: 12 (A).
- **Path (B)**: the same with "between" (Analyze's Betweenness, not yet run: committing starts the
  run, which finishes at once on 11 gauges) and 3. Path steps: 12 (B).
- **Also success**: By value with a hand-typed lower bound that leaves exactly those (SD, a wrong
  turn per try); Analyze run first, then the picker's Results.
- **Not success**: the table sorted and nodes selected by hand (no layer selection); Analyze's
  suggested style (colors every node by value).

## T75. A big network made readable

- **Success**: one filter card (or cards) that leaves A **105** / B **24** in the picture; the
  participant reports the count.
- **A values** (read): Degree 10 or more: **112 of 549**; the largest piece among those 112:
  **105** (3 pieces: 105, 5, 2). A Largest component step over the full graph keeps all 112,
  because the full graph is one piece: that is P (the count is 112, the stranded 7 stay).
- **B values**: largest piece **249 of 331**; then Degree 2 or more **170**; then gal80Rexp 0.5 or
  more **24** ("24 of 331 nodes, 4 of 361 edges"). The order of the three steps does not change B's
  count.
- **Path (B)**: Data; Add filter; type "largest"; Enter (Structure: Largest component);
  Condition...; type "degree"; Enter; type 2; Enter; Condition...; type "gal80"; Enter; type 0.5;
  Enter; Done.
- **Path (A)** (read to the Largest component step): Data; Add filter; type "degree"; Enter; type
  10; Enter; Condition...; type "largest"; Enter -- the header reads "112 of 549". **Still blocked
  on fc1d7ee4f6**: Largest component's pane has no Advanced, so it cannot be computed on So far (spec
  4.2: Computed on is offered only for algorithms with `scopeInput: "subgraph"`). A is P at best
  (112) on this build.
- **Not success**: a style layer that fades the rest (the network still holds them); deleting.

## T76. The start screen's pointing effect

- **Success**: with the pointer on a node, every node not adjacent to it drawn faint and its edges
  drawn strong; with the pointer on nothing, the drawing as at rest. The participant says how they
  checked (pointed at a node and away).
- **Path**: Style layers "+" (Add a layer or a folder) > Hover highlight (a folder of 4 layers).
  Two steps.
- **Also success**: the four layers built in the workspace, as `../../selection-groups/spec.md`
  section 7 lists them (Hovered or selected references); fading only the nodes, with the edges
  untouched, is P.
- **Not success**: the built-in Hovered row's settings changed alone (it marks the hovered node
  only: P if the hovered node stands out and nothing fades).

## T77. Changing what a colleague set up

- **Success**: the existing filter card and the existing layer changed (not replaced): A hours 20
  or more in the filter, and an Or group in the Staff layer (hours 30 or more); B an Or group in
  the filter (depth_cm 140 or more), and the Oldest layer's date bound moved to before 2005. The
  participant reports both counts.
- **A values** (read): in the picture **10 of 24** (v02, v03, v05, v09, v10, v14, v16, v17, v20,
  v21); in orange **6** (Which nodes "6 of 10": A staff 4, or B hours 30 or more 6).
- **B values** (read): in the picture **9 of 11** (the 7 plus G03, G05); in orange **5** (G01,
  G02, G03, G05, G09; Which nodes "5 of 9").
- **Path (A)** (walked): Data; the card's row "trained Yes" (its outline opens: "trained Yes /
  hours min 10"); the row "hours min 10" (the workspace opens on that step); the "hours from" box
  (double-click selects it); type 20; Enter; Done; Graph; the Staff layer's outline row "role
  staff"; Or...; `hours`; type 30; Enter; Done. 14 steps.
- **Path (B)** (walked): Data; Edit on the card "telemetry yes" (or Enter on its row); Or...;
  `depth_cm`; type 140; Enter; Done; Graph; the Oldest layer's row "installed before 2000"; the
  date box; Ctrl+A; type 2005; Enter; Done. 14 steps.
- **Also success**: a new card or layer that gives the same counts while the old one is removed
  (SD); Clear on the old one and rebuilt (SD); the participant's own color.
- **Not success**: a second filter card for the deep gauges (both must hold: 2 in the picture); the
  old layer left painting under a new one with a different rule (two rules for one color).

## T78. Counting just the strong ties (the weak-links task)

- **Success**: a style layer whose selection is Degree computed on just the strong ties (A
  `shifts` 2 or more, Degree 3 or more; B `km` under 3, Degree 2 or more), filled orange; the
  participant reports the count.
- **A values** (read): **11 of 24** (v01, v02, v05, v06, v10, v11, v13, v16, v20, v21, v23). Every
  tie counted: 24 (everyone; the near miss). Strong ties with Degree 2 or more: 22.
- **B values** (read): **7 of 11** (G02, G03, G04, G05, G07, G08, G11). Every stretch counted: 9.
  In or Out alone on the directed river differ (P).
- **Path (A)** (walked): + > Layer; Which nodes; type "degree"; Enter; type 3; Enter; Advanced;
  Edges where ...; Edge value...; `shifts`; type 2 (its Min box takes focus); Enter; Done; Fill;
  hex; Enter. 17 steps. The row reads "Degree min 3 Edges"; Advanced's right "Edges: shifts min 2".
- **Path (B)** (walked): the same with Degree min 2, `km`, then the "km to" box, Ctrl+A, type 2.9
  (or 3: no stretch is exactly 3 km), Enter. 19 steps.
- **Also success**: a Data place filter card on the ties (`shifts` 2 or more / `km` under 3) and
  the layer's Degree on the filtered graph: an equal count, but every reader loses the weak ties;
  noted as its route (the placement study's T4 counted it).
- **Not success**: Degree on every tie (A 24, B 9).

## T79. One kind, in a network of 50,000

- **Success**: a style layer whose selection is dept Grants (A) / basin Otter Creek (B), filled
  orange; the participant reports the count.
- **A values** (read): **1,076 of 50,000** (Which nodes "1,076 of 50k", key "1,076 of 50,000
  nodes"). **B values**: **1,050 of 50,000**.
- **Path (A)** (walked): + > Layer; Which nodes; `dept` (the checklist: "Search 40" focused, 8
  rows, "32 more"); type Grants; tick Grants; Done; Fill; hex; Enter. 10 steps.
- **Path (B)**: the same with `basin` and Otter Creek.
- **Not success**: a filter card (the others leave the picture); nodes clicked on the canvas.
- **Timing** (read, fc1d7ee4f6 on this machine's GPU): load 38 to 50 s; the tick 3 s input delay
  then 14 s busy; Done 3 s then 14 s; Fill and its color under 2 s each. Graded never by time; the
  report lists each session's waits.

## Build notes (fc1d7ee4f6)

Seen in the walks of 2026-11-02; each is a candidate for the dry run, not a confirmed finding.

- **The data table and the matches strip both draw** when the data table was open before the
  workspace opened (every gauges start leaves it open): the strip's header is cut and the table
  shows under it (p1 `04.png`, `11.png`; p4 `08.png`). Fails the calm-first check.
- **A false "covered" warning after an edit**: the Fill row reads "Covered by Everything on 6 of 6"
  and the key "6 nodes covered by Everything" while the canvas draws the six orange (T77 A after
  the Or group, p2 `12.png`; T77 B after the date change, "5 of 5", p4 `20.png`). Two halves: a
  severity 3 candidate (still present from 7ca4cae647).
- **The camera after a setup**: on `volunteers-thanks.txt` the canvas is zoomed in on a corner
  after the setup's last Done, and opening the workspace does not frame it (p2 `01.png` to
  `09.png`); spec 3.0 frames once when more than a quarter of the nodes fall outside the cell.
- **A collapsed card named by its first step only**: "trained Yes" never says hours until opened
  (T77 A). A flag step with no value names its card "trained pick yes or no" while the picker is
  shut (setup walk).
- **A click on a single-step card's row** ("telemetry yes") showed Edit but did not open the
  workspace; Enter on the row did (p4 `03.png` to `08.png`, once).
- **T79**: the staff file's `name` ("Person 00017") is offered as a time on the Values tab ("Time:
  name, Set in Data"), graphty-element's sniffing (p5 `01.png`).
- **T75 A**: no So far on Largest component (above).
- Fixed since 7ca4cae647: the reference row names the node ("Within 2 hops of Cedar Bend"); no
  preview key over the canvas; no effect word on a filter card. Not re-read: the date test's mode
  select (Before, After, Between); every tier 5 date prompt needs only Before.
