# Tier 5 answer key (graders and pilots only)

Never shown to participants. Each task: its success definition, the success path, and what the
final screen, the end-state records or the saved file must show. Every count below was computed
from the files (networkx 2.8, scripts `data.py` and `big.py` under the main checkout's
`tmp/design-studio/tier5/prep/`) and, where marked "read", also read off build 7ca4cae647 in the
preparation pilots (walks under the main checkout's `tmp/design-studio/tier5/prep/pilot/`). Paths
name controls as 7ca4cae647 draws them; the dry run re-reads every path and value on the frozen
build and logs each change in `criteria.md`. Each core task's path step count is written as "Path
steps: N" (bar 7) in `tool/steps.mjs`'s units: every click, key, typed text and file chosen counts,
looking does not. The counts below were walked on 7ca4cae647; the dry run re-counts them on the
frozen build.

Grading reads the step log, the screenshots and the end-state records (`work.json`, `styles.json`,
`data.json`). A style layer's selection is graded by its count in the editor header ("4 of 15") and
the canvas key, a filter by the top bar's "N of M nodes" and the inspector's "Nodes showing". A
color is graded as "orange" when the layer's fill is any visibly orange or red-orange hue (the
setups use E4572E); a different hue with the right members is SD for the color, never P.

## Facts no briefing may hold

- `Ben Adler` -- T74 A's answer (also `Seun Okoro`, `Priya Nair`, `Hannah Weiss`)
- `Seun Okoro` -- T74 A
- `Priya Nair` -- T74 A
- `Hannah Weiss` -- T74 A
- `Mill Pond` -- T74 B's answer (with Cedar Bend, which its prompt does not name, and Fox Creek)
- `Fox Creek` -- T74 B
- `v02` -- James Carter's id, which T73 A must find (the volunteer file designates no name)
- `G03` -- Cedar Bend's id (T73 B)

## The files

- `volunteers.graphml`: 24 people v01-v24, 63 ties (a shift worked together), undirected. `name`,
  `role` (volunteer 15, staff 5: v02 James Carter, v09 Hannah Weiss, v17 Ken Ito, v21 Ben Adler,
  v24 Zara Ahmed; board 3: v01 Maria Lopez, v13 Seun Okoro, v23 Paul Dubois), `hours`, `trained`
  (false: v04, v06, v08, v12, v13, v15, v19, v22, v24), `phone` (missing on 7). No column is
  designated as the name on `volunteers.txt`: the canvas draws no labels and the reference list
  and its search know only v01-v24 (read). The find box finds "James" (read: "v02, name: James
  Carter").
- `sources.graphml`: 24 people and organizations, 59 ties. `kind` person 14, company 6 (s01, s04,
  s07, s17, s20, s24), agency 4 (s09, s12, s15, s22); `on_record` true for s17, s09, s22 among
  them.
- Gauges on `gauges-clean.txt`: 11 gauges G01-G11, 13 stretches, directed (flows.csv runs from
  one gauge to the next), one piece, `station` designated as the name. `installed` dates: G01
  1998-05-12, G02 2003-07-01, G03 2001-04-18, G04 2010-09-09, G05 1995-06-30, G06 2012-03-14, G07
  2008-08-22, G08 2015-05-05, G09 1999-10-11, G10 2018-06-27, G11 2006-01-16. `telemetry` yes: G01,
  G02, G04, G06, G07, G09, G11; no: G03, G05, G08, G10. `depth_cm`: G03 140, G05 155, G09 210, G01
  118, others under 100, G07 blank.
- Graph researchers sample: 549 people, 2,084 ties (369 repeated: one per paper), undirected, one
  piece; Degree counts every tie (median 4, highest 111).
- `yeast-galactose.graphml`: 331 genes, 361 interactions, 26 pieces (largest 249 genes, 298
  interactions); `gal80Rexp` missing on 2 genes.

## T70. A simple choice, twice

- **Success**: a style layer whose selection is the staff (A) / the gauges put in during the 1990s
  (B), filled orange; and a filter card (Filter to the trained / the gauges that send readings, or
  Filter out the others) that takes the rest out of the picture without deleting. The participant
  reports both counts.
- **A values**: in the picture **15 of 24** (read: top bar "15 of 24 nodes, 25 of 63 edges"); in
  orange **4** (v02, v09, v17, v21; Zara Ahmed is staff but untrained, so out of the picture). The
  layer's header reads "4 of 15" over the filtered graph. A report of 5 orange read from the
  layer's "staff, 5 nodes" before filtering is P unless the participant says one is out of the
  picture.
- **B values**: in the picture **7 of 11** (G01, G02, G04, G06, G07, G09, G11); in orange **2**
  (G01 1998, G09 1999; G05 1995 sends no readings).
- **Path (A)**, from the Graph place: Style layers "+" (Add a layer or a folder) > Layer; "Add a
  step: Keep"; the value picker's `role`; tick "staff"; Done; Fill "+" (Add to node fill); type
  the hex (the color box is focused with its text selected); Enter. Then Data; Filters "+" (Add
  filter); `trained`; the "trained is" select; Yes; Done; the card's Filter to. Path steps: 16 (A).
- **Path (B)**: the same, with `installed` (its card opens on Before with "A date or a year"
  focused): type 2000, Enter, Done, Fill; then the filter on `telemetry`, tick "yes, 7 nodes",
  Done, Filter to. Path steps: 17 (B). Between 1990 and 1999 is equal (one more step).
- **Also success**: the filter first (the layer's card then counts over the filtered graph: staff
  4); Filter out on trained No / telemetry no; a filter card's own effect left at Select and then
  switched; a color picked from the swatch.
- **Not success**: the filter card's Select used to "color" (a selection is not a color and is
  lost on the next click); a style layer with Visibility hidden instead of a filter card (the
  people are still in the network's counts: tier 4 T66's rule); deleting nodes.
- **Build notes (7ca4cae647)**: the filter card's effect (Select | Filter to | Filter out) is not
  drawn while its editor is open, only on the folded card after Done; a new filter card starts on
  Select, so the first committed step selects (read: "4 nodes selected"). The date card's "how to
  match" select does not change from Before to After or Between: choosing After clears the box and
  the select still reads Before (read twice, by pointer and by keys); every tier 5 date prompt
  needs only Before. The preview's key reads "Preview: Which nodes" with one row and "No match".
- **Follow-up**: graded only as a measure (the owner's preview question): does the participant
  read the group colors as a preview, and which default they want.

## T71. Either of two things

- **Success**: one filter card with two ways in (an "Or" group: A role board, B hours 30 or more;
  B telemetry no, B installed before 2000), Filter to; or an equal result. The participant reports
  the count.
- **A values**: **10 of 24** (board v01, v13, v23 plus 30 hours or more v02, v05, v09, v16, v17,
  v21, v24). Both at once would be 0; board alone 3; hours alone 7.
- **B values**: **6 of 11** (read: "6 of 11 nodes, 2 of 13 edges": G01, G03, G05, G08, G09, G10).
  Both at once 1 (G05).
- **Path (A)**: Data; Add filter; `role`; tick "board"; Or (the new group's value picker opens);
  `hours`; the "hours from" box; type 30; Enter; Done; Filter to. Path steps: 11 (A).
- **Path (B)** (read): Data; Add filter; `telemetry`; tick "no, 4 nodes"; Or; `installed`; the date
  box; type 2000; Enter; Done; Filter to. Path steps: 11 (B).
- **Also success**: any other route that leaves exactly those in the picture with one card (the
  route noted). Two Filter to cards are not equal: both must hold.
- **Not success**: two cards (A 0, B 1); one group with a Keep step (the same as both at once); a
  Select card left on (nothing leaves the picture).
- **Follow-up**: a measure for the owner's table question (did they open the table while picking,
  from where).

## T72. All of one kind, but not some

- **Success**: a style layer whose selection is A companies and agencies not on the record / B
  telemetry yes not installed in the 1990s, filled orange; the participant reports the count.
- **A values**: **7 of 24** (read): Bayview Holdings, Harlan Development, Northgate Capital, Port
  Authority, Riverside Partners, Silverline Media, Zoning Board.
- **B values**: **5 of 11** (read): G02, G04, G06, G07, G11.
- **Path (A)** (read): Add a layer > Layer; Add a step: Keep; `kind`; tick company and agency; the
  "+" caret (Add a step with a verb) > Except; `on_record`; "on_record is"; Yes; Done; Fill;
  color; Enter.
- **Path (B)** (read): Add a layer > Layer; Keep; `telemetry`; tick yes; caret > Except;
  `installed`; the date box; 2000; Enter; Done; Fill; color; Enter.
- **Also success**: a second Keep step with on_record No / installed not before 2000 (equal
  result); company and agency as two groups each with an Except step.
- **Not success**: a filter card; a second layer painting the on-record ones back in the default
  color (P: the count is right on the canvas but no layer holds the rule).

## T73. Close to one person or place

- **Success**: a style layer whose selection is within 2 hops of James Carter (A) / Cedar Bend
  (B), the center included, filled orange; the participant reports the count.
- **A values**: **16 of 24** (read: "Within 2 hops of v02 ... 16"): v01-v10, v13-v17, v21. One hop
  would be 9.
- **B values**: **7 of 11** (read): G01, G02, G03, G04, G05, G08, G11. The hop count ignores the
  river's direction (read); Downstream of Cedar Bend within 2 would be 4 (G03, G04, G05, G08), and
  is P ("in either direction" is in the prompt).
- **Path (A)**: the find box (Find nodes, edges, values); type James (the result reads "v02, name:
  James Carter"); Add a layer > Layer; Keep; type "within"; Enter (the reference list opens,
  focused); type v02; Enter; the Hops box; select its text; type 2; Enter; Done; Fill; color;
  Enter. Path steps: 17 (A).
- **Path (B)** (read): Add a layer > Layer; Keep; type "within"; Enter; type Cedar; Enter; Hops;
  select its text; type 2; Enter; Done; Fill; color; Enter. Path steps: 15 (B).
- **Also success (A)**: James selected first (the find result's click selects him and moves the
  inspector to him; back on the layer, the reference "Selected (1)"): a live reference, equal while
  he stays selected; the grader checks the layer still counts 16 after the selection changes (it
  will not, being live: P unless the participant pinned it to v02). Designating `name` as the label
  in Data first, then typing James: S.
- **Not success**: 1 hop; Analyze's Steps away (BFS) colored by its own suggested style (no
  layer selection; P if the colored set is right).
- **Build notes (7ca4cae647)**: with no name designated the reference list lists v01-v24 and typing
  "James" finds nothing (A's main obstacle); with `station` designated, typing "Cedar" finds Cedar
  Bend, but the row then reads "Within 2 hops of G03" (the id, not the name). The reference list is
  not capped in height on this build (it runs to the window's foot).

## T74. The few a measure puts first

- **Success**: a style layer whose selection is the highest 5 by PageRank (A) / the highest 3 by
  Betweenness (B), filled orange; the participant names them.
- **A values** (read): Ben Adler v21, Seun Okoro v13, Priya Nair v05, Hannah Weiss v09, James Carter
  v02 (PageRank 0.0586 to 0.0545; the sixth, v23, is 0.0512: no tie at the cut).
- **B values** (read): Mill Pond G02, Cedar Bend G03, Fox Creek G04. The dry run reads the fourth's
  value to check there is no tie at the cut.
- **Path (A)** (read): Add a layer > Layer; Keep; type "page"; Enter (Results: PageRank, the run
  the start holds); the "how to match" select; Highest; type 5 (the box holds 10, selected); Enter;
  Done; Fill; color; Enter. Path steps: 13 (A).
- **Path (B)** (read): Add a layer > Layer; Keep; type "between"; Enter (Analyze's "Rank nodes and
  edges" > Betweenness, not yet run: committing starts the run, which finishes at once on 11
  gauges); how to match; Highest; type 3; Enter; Done; Fill; color; Enter. Path steps: 13 (B).
- **Also success**: Between with a hand-typed lower bound that leaves exactly those (SD, a wrong
  turn per try); Analyze run first, then the editor's Results.
- **Not success**: the table sorted and nodes selected by hand (no layer selection); Analyze's
  suggested style (colors every node by value).

## T75. A big network made readable

- **Success**: one filter card (or cards) that leaves A **105** / B **24** in the picture, Filter
  to; the participant reports the count.
- **A values**: Degree 10 or more: **112 of 549** (read); the largest piece among those 112:
  **105** (3 pieces: 105, 5, 2). A card reading the largest piece over the full graph keeps all
  112, because the full graph is one piece: that is P (the count is 112, the stranded 7 stay).
- **B values**: largest piece **249 of 331** (read); then Degree 2 or more **170** (read); then
  gal80Rexp 0.5 or more **24** (read: "24 of 331 nodes, 4 of 361 edges"). The order of the three
  steps does not change B's count (Degree within the largest piece equals Degree in the graph).
- **Path (B)** (read): Data; Add filter; type "largest"; Enter (Structure: Largest component,
  applied as picked with no card); "Add a step: Keep"; type "degree"; Enter; "Degree from"; type
  2; Enter; Keep; type "gal80"; Enter; "gal80Rexp from"; type 0.5; Enter; Done; Filter to.
- **Path (A)**: Data; Add filter; Degree; from 10; Enter; Keep; Largest component computed on So far
  (the group before this step). **Blocked on 7ca4cae647**: Largest component opens no card and its
  "..." menu holds Duplicate, Move up, Move down, Hide and Delete, with no Computed on (read); a
  second card reads the full graph. A is therefore P at best (112) on this build; the dry run
  decides whether the frozen build offers So far on a structure value (`decided.md`: Computed on is
  offered only for algorithms with `scopeInput: "subgraph"`).
- **Not success**: a style layer that fades the rest (the network still holds them); deleting.

## T76. The start screen's pointing effect

- **Success**: with the pointer on a node, every node not adjacent to it drawn faint and its edges
  drawn strong; with the pointer on nothing, the drawing as at rest. The participant says how they
  checked (pointed at a node and away).
- **Path**: Style layers "+" (Add a layer or a folder) > Hover highlight (read: a folder "Hover
  highlight" of 4 layers; pointing at a node fades the rest and darkens its edges). Two steps.
- **Also success**: the four layers built in the editor, as `../../selection-groups/spec.md`
  section 7 lists them (Hovered or selected references); fading only the nodes, with the edges
  untouched, is P.
- **Not success**: the built-in Hovered row's settings changed alone (it marks the hovered node
  only, not its neighbors: P if the hovered node stands out and nothing fades).
- **Build notes (7ca4cae647)**: the folder's Which nodes shows two chips "The rule: «Layer», 1 of 2
  layers" (a code word on screen) and the key keeps the PageRank legend titled "PageRank (visible),
  full graph" when a filter is on (two scope words at once).

## T77. Changing what a colleague set up

- **Success**: the existing filter card and the existing layer changed (not replaced by new ones):
  A hours 20 or more in the filter, and a second way into the Staff layer (Or: hours 30 or more); B
  a second way into the filter (Or: depth_cm 140 or more), and the Oldest layer's date bound moved
  to before 2005. The participant reports both counts.
- **A values** (read): in the picture **10 of 24** (v02, v03, v05, v09, v10, v14, v16, v17, v20,
  v21); in orange **6** (read "6 of 10": staff v02, v09, v17, v21 and v05, v16).
- **B values**: in the picture **9 of 11** (the 7 plus G03, G05); in orange **5** (G01, G02, G03,
  G05, G09).
- **Path (A)** (read): Data; the card's disclosure ("trained, hours"); the hours row; the "hours
  from" box; select its text; type 20; Enter; Done; Graph; the Staff row (or its folded Which nodes
  chip "role staff"); Or; `hours`; "hours from"; type 30; Enter; Done.
- **Path (B)**: Data; the card's disclosure; Or; `depth_cm`; "depth_cm from"; type 140; Enter;
  Done; Graph; Oldest; its "installed before 2000" chip; the installed row; the date box; select;
  type 2005; Enter; Done.
- **Also success**: a new card or layer that gives the same counts while the old one is removed
  (SD); the participant's own color.
- **Not success**: a second filter card for the deep gauges (both must hold: B stays 2 of 11 deep
  and sending, so 2 in the picture); the old layer left painting under a new one with a different
  rule (two rules for one color).
- **Build notes (7ca4cae647)**: the canvas key reads "Color: Staff, 4 of 24 nodes" while the
  editor reads "4 of 14" (two bases for one count); after the Or group the Fill row reads "Covered
  by Everything on 6 of 6" and the key "6 nodes covered by Everything" while the canvas draws the
  six in the layer's color (a false warning, read). Opening the filter card's editor does not start
  the preview; opening a step card does.
