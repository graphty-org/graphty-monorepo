# Tier 3 answer key: first use and styling -- GRADERS ONLY

Participants never see this file. Tasks: `tasks.md`. Bars: `criteria.md`. Participants: `roster.md`.

## How a session is graded

- **Grades:** S (succeeded on the success path or a route as short), SD (succeeded by a detour or
  with help the screen gave after a wrong turn), F (did not reach the success state, or reached it
  and said something wrong about it), G (gave up). Success = S or SD. VOID only when the tool or
  the run failed, or the participant opened a file outside its own folder (`leaks.json`). A
  give-up the persona file scripts ("scripted exit") is graded G with the line `Scripted exit: yes`
  after the first three; it is never VOID and stays in bar 1's denominator.
- **From what:** the last screenshot, the files in `downloads/` and `saved/`, the transcript, and
  the style tree `real.mjs` writes: `styles-start.json` and `styles.json` (the whole tree at the
  start and the end, every layer's conditions, values and counts, and `changes`: layers gone,
  added and changed) and `styles-steps.jsonl` (whether each screenshot's looks differ from the
  first graph the session drew). Never from the participant's own rating.
- **An answer counts only when it was on screen first** (a count, a name, a rule) at or before the
  step where the participant gave it. A right answer the screen never showed is F.
- **False "done":** the participant says the task is done while the last screen or the style tree
  shows it is not. Recorded apart from the grade (bar 2).
- **Wrong turns:** a move that leads away from the success state and is later undone or abandoned
  (opening the wrong place, a look put on the wrong layer, a card on the wrong field). Counted per
  session (bar 3).
- **Steps are counted the same way for the participant and the key:** one step is one thing a
  person does -- a click, a typed entry with its Enter, one key, picking one option. Typing and
  picking the offered match is one step. A click the tool refused (keyboard-only mode) is none.
- **`grade.md` starts with three lines**, which `../tool/score.mjs` reads:
  `Grade: S|SD|F|G|VOID`, `False done: yes|no`, `Wrong turns: <n>`. A T47 or T48 success adds
  `Route: folder|several|one by one|around|cover` (T47 and T48 below); every T46 and T47 session
  adds `Token: touched|not touched, <what followed>` (did the reader open or change a field
  showing the purple "Layer" token, and what came of it); a scripted exit adds `Scripted exit: yes`.
- **Severity** 0-4 (Nielsen) for every problem, with the step and screenshot. Not new findings:
  a new name drawn too small at the default framing, and the default label font naming no fallback
  (open owner decisions, `../owner-decisions.md`).

## Rules settled before round 1 (2026-10-18)

These override any line below that says otherwise.

- **T46 to T48, any community analysis counts.** The prompts ask the program to work out circles
  or clusters and never name one method, so a run of any community analysis the analysis list
  offers (Louvain, Leiden, Label propagation, Markov, Spectral, Hierarchical) is the clusters the
  task means. Where a task below says "Louvain", read "the community analysis the participant
  ran"; each method's group sizes and target count are read twice on the frozen build
  (`criteria.md`, preflight 5) and graded against. A per-node ranking (Clustering coefficient) is
  not a clustering: F.
- **T48 B, a run while a filter step is on**, then the step turned off: `Route: around`. It ends on
  the target look and count but is not the bulk edit, so it never counts toward the bulk route
  bar.
- **T44 A, `id` as the name:** accepted (S), as below; it is the name with its spaces dropped
  (`MlleVaubois`), and the reader reads who each node is.
- **T49 is graded by the drawing.** Success: the change was made (as below), and the last
  `colors` in `styles-steps.jsonl` with `graph: true` equal the first's; S or SD by the usual
  rule. A style tree that then differs from the start (the Color line removed, a `revision`
  changed) is recorded as a finding about the design, never as an F or a false "done": the screen
  cannot show the difference.
- **T46 to T48, a method whose two runs differ** (preflight 5 marks it in Reference values): the
  session is graded against its own run. The target group and its count are read from that
  session's `styles.json`, never from a fixed number.
- **A styled node left selected** (the find-box detours on T40 A, T40 B and T50 A) is graded by
  its color in the style tree, not by how its selection ring tints it. A tint that makes it read
  as a color the key does not say is recorded for the audit as a key-and-drawing disagreement.

## Facts no briefing may hold

What a task asks a participant to find. `real.mjs --brief` refuses a briefing that holds one;
`--leaks` voids a session whose briefing does.

- `Valjean` -- T37 A's most connected character
- `Aisha Bello`, `Diego Ruiz`, `Nora Lindqvist`, `Julia Rossi` -- T41 A's answer
- `Della Whitfield`, `Ines Moreau`, `Friends of the Waterfront`, `Tomas Varga` -- T41 B's answer
- `Hannah Weiss` -- T43 A's answer
- `Harlan Development` -- T43 B's answer
- `Mlle Baptistine`, `Mlle Gillenormand`, `Mlle Vaubois` -- T50 A's answer
- `GAL80` -- part of T40 B's answer

## Reference values

Read from the study files and the samples, and checked on build `31e8c2387` (app 0.8.68) by the
pilots in `pilot-materials/` and by the scripted walk of `../tool/bars.mjs --tier 3`. Values that
depend on a run's output are marked; each is read again on the frozen build before round 1, and a
difference is a finding. Read again on 58556989e8 by the pilots in `rounds/r1/pilot/`, and on the
frozen build ed4351b258 by the pilots in `rounds/r1d1/pilot/`, and on the frozen build
5bd16cda6e by the same pilots again, and on the frozen build 6dd0b00bd7 by the pilots in
`rounds/r1d2/pilot/`: every value below held, and the run outputs repeated (Les Miserables'
Louvain sizes not read again on 6dd0b00bd7, where T46 A was not walked; the run gave 6 groups).
Read again on the frozen build e3c5bca8e6 by the pilots in `rounds/r1/pilot/` (T37 A to T51 B):
every value held, Les Miserables' Louvain run gave 6 groups with Javert in Group 3 of 11, and
the T49 looks repeated.

| What                                                | Value                                                                                                                                                                                   |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Les Miserables                                      | 77 characters, 254 ties; node columns `id`, `name` only (`id` is the name with its spaces dropped: `MlleVaubois`); tie column `shared_chapters`                                         |
| Les Miserables, most connected                      | Valjean, 36 ties (next Gavroche 22)                                                                                                                                                     |
| Les Miserables, names holding "Mme"                 | 6: Mme Magloire, Mme de R, Mme Thenardier, Mme Burgon, Mme Pontmercy, Mme Hucheloup                                                                                                     |
| Les Miserables, names holding "Mlle"                | 3: Mlle Baptistine, Mlle Gillenormand, Mlle Vaubois                                                                                                                                     |
| Les Miserables, ties with 5 or more shared chapters | 51 of 254                                                                                                                                                                               |
| Les Miserables, Louvain circles (run output)        | 6 circles: Group 1 to 6 of 20, 17, 11, 11, 10, 8 characters; Javert in Group 3, 11 characters (two runs on 31e8c2387 agreed; the same on 58556989e8 and ed4351b258)                     |
| Zachary's karate club                               | 34 members (ids 1 to 34), 78 ties; no columns but `id`                                                                                                                                  |
| Karate, most connected                              | member 34, 17 ties (next member 1, 16)                                                                                                                                                  |
| College football                                    | 115 teams, 613 ties; team names as one word (`FloridaState`, `Nebraska`); conference in `value`                                                                                         |
| Football, Louvain clusters (run output)             | 10 clusters, Group 1 to 10 of 16, 15, 14, 12, 11, 10, 10, 9, 9, 9 teams; Nebraska in Group 4, 12 teams (one run on 31e8c2387; the same in two runs on 58556989e8 and on ed4351b258)     |
| volunteers.graphml                                  | 24 people, 63 ties; columns `name` (text), `role` (category: volunteer 16, staff 5, board 3), `hours` (whole number 2 to 52), `trained` (yes/no, 15 yes), `phone` (text, missing for 7) |
| volunteers, Louvain circles (run output)            | 3 circles of 8; 5 trained in each, 15 in all (ed4351b258)                                                                                                                               |
| volunteers, board or staff                          | 8                                                                                                                                                                                       |
| volunteers, trained and no phone                    | 4: Aisha Bello, Diego Ruiz, Nora Lindqvist, Julia Rossi                                                                                                                                 |
| volunteers, 20 or more hours                        | 11                                                                                                                                                                                      |
| volunteers, most hours                              | Hannah Weiss, 52                                                                                                                                                                        |
| volunteers, 30 or more hours and trained (T50 B)    | 6: James Carter, Priya Nair, Hannah Weiss, Lucy Grant, Ken Ito, Ben Adler (Zara Ahmed, 38 hours, not trained)                                                                           |
| sources.graphml                                     | 24 sources, 59 ties; `name`, `kind` (person 14, company 6, agency 4), `donations` (0 to 250,000), `on_record` (12 yes), `email` (missing for 9)                                         |
| sources, Louvain clusters (run output)              | 3 clusters; 4 on the record in each, 12 in all (ed4351b258)                                                                                                                             |
| sources, company or agency                          | 10                                                                                                                                                                                      |
| sources, on the record and no email                 | 4: Della Whitfield, Ines Moreau, Friends of the Waterfront, Tomas Varga                                                                                                                 |
| sources, 10,000 or more in donations                | 9                                                                                                                                                                                       |
| sources, most donations                             | Harlan Development, 250,000                                                                                                                                                             |
| neighbors.csv                                       | 16 people, 30 ties; tie columns `kind` (neighbors 16, family 8, coworkers 6), `years_known`, `close`                                                                                    |
| yeast-galactose.graphml                             | 331 genes, 361 ties; names beginning with GAL: 8 (GAL1, GAL2, GAL3, GAL4, GAL7, GAL10, GAL11, GAL80); no other name holds GAL                                                           |
| The starting look                                   | every node color `#6366F1`, size 1, shape icosphere; every tie dark gray (`A9A9A9`), width 8                                                                                            |
| lesmis-poster.graphty.json                          | Les Miserables with one layer "Poster": name contains "Mlle", node color `#FFA500` (orange), 3 characters                                                                               |
| volunteers-thanks.graphty.json                      | volunteers with one layer "Thank-you cards": hours 30 to 52 and trained yes, node color `#008000` (green), 6 people                                                                     |

## Success paths on build e3c5bca8e6

Every success path below was walked on the frozen build e3c5bca8e6 by the round 1 pilots in
`rounds/r1/pilot/<task><half>/` (one folder per walk: pointer, detours, keyboard), by pointer,
by detours and by keyboard. Not walked by keyboard on this build, and owed before round 1: T46 B
(the walk stopped after the start screen's Tab stops) and T49 B (the same). Steps are counted one thing a person does
each: a click, a typed entry with its Enter, one key, one option picked. "Open project or file"
with the file chosen in the chooser is one step (the tool's `--upload` does both). Things every
path meets on this build:

- **A new layer's name box** opens with "Layer 1" selected. Enter, Escape or the next click all
  keep the name, so it is no step of its own. A new layer reads "Node and edge layer". It becomes
  "Node layer" (its Edge tab "not styled") as soon as a node column is picked or a value ticked in
  its Which nodes, and "Edge layer" as soon as a condition is added on its Edge tab; the row's
  count follows at once (254, then 51 on T45 B; 8 on T45 A). The name stays "Layer 1".
- **A new layer's "Which nodes"** ("Which edges" on the Edge tab) arrives collapsed, reading "All
  24 nodes: add a condition to narrow". A click on that line only expands the section, showing
  "+ Add a condition" and Done; a second click, on "Add a condition", opens the attribute list.
  The key counts both: "Which nodes" and "Add a condition" are two steps. By keyboard, Enter on
  the button "Which nodes, 24 of 24 nodes, All 24 nodes: add a condition to narrow" puts focus on
  "Add a condition", and Enter there opens the list. While the list is open it covers Done.
- **Selecting a layer** (Everything, a folder, a group) opens its inspector already on the Style
  tab. Clicking Style is no step. A new layer always opens on the Node tab; an existing one on the
  tab last shown.
- **A sample or file just opened** shows the Graph inspector on its Values tab. By keyboard, focus
  lands on the inspector's heading "Graph, volunteers: 24 nodes, 63 edges" and the counts are
  announced; the layer list is 5 or 6 Shift+Tabs back (Analyze, the canvas "Graph drawing", the
  separator "Resize left panel", Graph settings, the Everything row), or 12 to 14 Tabs forward
  through the inspector and the top bar. Tab into the layer tree lands on Everything, its last
  row, not its first (Hovered). F6 cycles the inspector, the canvas, the toolbar and the "Resize
  left panel" separator; it never reaches the left panel's find box or tree, or the top bar. A
  dimmed Undo or Redo is not a Tab stop (Tab goes from "Project: ..." to "Local only"); on hover
  it shows the tooltip "Nothing to undo". Going backwards later never returns to that heading. On
  the read-the-file page, Load announces only "All 24 rows"; the sentence with the node and edge
  counts is outside that region. The start screen's Tab order wraps from "No thanks" to Main menu.
- **The toolbar** is one Tab stop (Analyze); Layout, View, Legend, Table, Filters and Quick actions
  are reached with the arrow keys, and nothing says so. Filters switches the left panel to Data.
- **A run** (Degree, Louvain) recolors at once, and its key ("Color: Louvain") opens over the top
  left; the drawing then shrinks and moves right, about 130 to 170 px (Valjean from 766,410 to
  905,413). The same re-framing happens whenever the color key first appears after a committed
  color or a size or color binding, and the drawing stays off center after Undo removes the key.
  The analysis card's button is named "Run <analysis>" ("Run Degree", "Run Louvain"). After a run
  the analysis list holds the analysis twice (under Recent and under its group). The analysis
  filter's `most` highlights Degree first, with Most flow dimmed ("Select 2 nodes first").
- **A selected node's inspector** opens on its Values tab, titled by the node's id (`v20`, `74`
  for Nebraska) with the name a row below. Its look is under Style > "Why this look"; the layer
  link there ("Open layer Poster") opens that layer on the tab last shown.
- **Fill "+"** ("Add to node fill", also its tooltip) opens no menu: it adds the Color line at
  once, with focus in the color box and its value (`6366F1`) selected. The key over the drawing
  ("Color: Layer 1", "8 of 24 nodes" on a second line) and the toolbar's Legend come only once a
  color is typed and committed. Line "+" ("Add to edge line") still opens a menu (Color, Width,
  Pattern, Pattern count, Curved); after its Color or Width (and after Size), focus is in the new
  box with its value selected. Typing a word (`blue` gives `0000FF`) or a hex and Enter works at
  once.
- **Enter in a just-added color box** keeps focus in the box with the new value selected
  ("Node color, set here, blue", `0000FF`), on every kind of layer; Tab then goes to "Node color
  by attribute". After a Line "+" > Color, Enter leaves the Color row below Width and focus in the
  box. Escape in a just-added box removes the whole line ("Edge width not added", "Node color not
  added"; a selection's just-added Size line too) and moves focus to the section's "+"; in a set
  box it only discards the edit.
- **An unset Color line** (Fill "+" on a new layer that will cover others, or Color added back
  after its line was removed) shows `6366F1` in italics with the name "Node color, not set, drawn
  #6366F1 indigo". It takes the value it shows: Enter on it, or `6366F1` typed and Enter, sets
  `6366F1` and repaints. Tab leaves it unset, and Escape removes the line.
- **The color box's accessible name** reads "Node color, set here, indigo" for the starting
  `6366F1` on Everything, "Node color, not set, drawn #6366F1 indigo" on a just-added line (the
  edge's "Edge color, not set, drawn #A9A9A9 dark gray"), and names a typed color by a nearby name
  (`purple` is "purple", "Node color now purple, on 6 nodes"; Group 5's crimson `BE0032` is
  "pink"). Grade a color on the hex in the style tree, never on the spoken name. A "Pick node
  color" swatch button comes just before the box in Tab order.
- **A color word with a space** (`dark green`) is read as that color (`006400`).
- **Escape in a color box** after typing puts the old value back and keeps focus in the box, value
  selected ("Edit discarded; this stays 0000FF."). With nothing typed it does nothing.
- **Control+Z with focus in a color box** undoes the last change at once ("Undid changing node
  color on Everything."); so does the Undo arrow (tooltip "Undo changing node color on Everything
  Ctrl+Z"; once enabled the button's name is "Undo changing node color on Everything"). Undo is
  dimmed when a sample or file opens, and dimmed it is no Tab stop; an extra Control+Z does
  nothing. Control+Shift+Z and Control+Y redo ("Redid changing node color on Everything."). With
  focus in the find box, Control+Z undoes the box's typing, not a style change.
- **Picking a column for a condition** ("Find an attribute": the file's columns under Data, then
  "Node id" under Structure; nothing is highlighted when the list opens, so the first ArrowDown
  highlights the first row) puts focus in the card's text box (text column; named "name: text to
  match") or its from box (number column; "hours from, number") with the value selected, so
  typing replaces it. Tab in the list closes it and picks nothing; only Enter or a click picks.
  The match menu is named "<column>: how to match" ("phone: how to match", value "Contains"; on a
  yes/no card the same name is on the value select, Yes / No / Has a value / Has no value). A
  category card lists "volunteer, 16 nodes" and so on; its "Remove role" button comes before the
  values in Tab order, as drawn at the card's top, and Tab from the last value goes to "Add a
  condition". By keyboard, Enter on a ticked value closes the card as Done does. A text card's
  count follows typing (by keyboard each letter's count is announced: "30 of 331 nodes", "9 of
  331 nodes", "8 of 331 nodes"), and typing opens a list of the matching names under the box, over
  Match case and Done; ArrowDown on a name is announced "GAL1 selected", yet Enter keeps the typed
  text, Tab closes the list and goes to Match case. In a text card one Escape closes the whole
  picker and keeps the text (a rule matching no one stays: "phone contains missing, 0 nodes"); in
  a number card the first Escape puts back the last good value and leaves the picker open. A
  number card's count and the drawing change only on Enter or Tab; by keyboard Tab out of the from
  box announces the count ("11 of 24 nodes"). Enter in the text box or the from box closes the
  picker as Done does. After a text card's match kind is picked ("Starts with"), focus stays on
  the match menu: typing reopens the menu and the letters are lost, so the text box needs a click
  first. A card left with no value is dropped with a notice ("Dropped the name condition: it was
  not finished", no Undo) after Enter, Escape in its empty box, or a click on the drawing, which
  also deselects the layer; a click in either side panel leaves the picker open and drops nothing.
- **Chips** carry the word: "role: board, staff, 8 nodes", "name contains Mme, 6 nodes", "hours 20
  to 52, 11 nodes". Each chip counts its own card over the whole file.
- **The find box:** a word with no match gives 'No match for "most". To select by a value, type
  a rule such as name == 'Napoleon'' (on a file, a number column of it: "hours >= 27", "donations
    > = 130000"; on the karate club, which has only `id`, no hint); Enter there does nothing. A
    > column name offers "Select the 15 nodes (trained: yes)" or "(email: has a value)", and Enter
    > selects them; the box keeps the typed text (no `=` is added). A rule typed plain (`hours >= 20`)
    > offers "Select the 11 nodes (hours 20 or more)". `=degree > 30` shows "Did you mean Degree?" and
    > the option "Degree > 30, Select the 1 node" ("(Degree above 30)" after a Degree run; a screen
    > reader hears "Did you mean Degree > 30?"); Enter selects that node and keeps `=degree > 30` in
    > the box. Node rows are titled by id with the
    > name under them; a value row ("role is board (3)", "kind is company (6)") is in view and
    > selects every node with that value, and Shift+click on a second value row (or on node rows)
    > adds to the selection, marks each picked row with a check and keeps the list open (the typed
    > text then stays in the box); a plain click on a second value row replaces the selection. Enter on a
    > list of nodes selects only the first and empties the box. Escape clears the text and keeps the
    > selection and focus; a second Escape moves focus to the drawing, and a third clears the
    > selection ("Selection cleared: 1 node"). The clear button ("Clear") empties the text and keeps
    > the selection. After the selection clears, a "Select by a value:" heading can stay under the
    > box with nothing below it.
- **A layer made from a selection** (the selection's Style tab, then Fill "+" or Shape "+" > Size,
  or right-click > "New layer from selection") is not made until a value is committed: the Style
  tab first says "The first style you set makes a layer for the 8 selected nodes", and the line
  sits there with no layer, its unset Size or Shape line saying "Not set yet: the first size you
  pick makes the layer". "New layer from selection" itself shows no notice, leaves focus on the
  drawing and may leave the inspector on Values. In such a layer "Style nodes" shows dimmed. Then it is named after the one node (`Valjean`, `v16`, `74`; "Made
  layer 74 for 1 node"), "8 nodes" ("Picked by hand: 8 nodes"; notice "Made a layer for the 8
  selected nodes"), or, from a find-box rule, after its rule ("hours 20 or more", "donations above
  10000", "email: has a value", "Rule: trained && !phone"). Its cards can be edited, and it
  renames itself to follow them ("Picked and name" while a hand-picked card and a rule card are
  both there; cards combine with AND).
- **Hovering a node shows nothing**: no name, no tooltip, though the cursor becomes a hand; only
  the Hovered layer's count goes to 1. A
  node's name is read by clicking it or from the table. The key over the drawing ("Color: Poster")
  has no tooltip, does nothing when clicked and is not in the Tab order. On the drawing, the
  keyboard turns the camera (and `=` zooms) but reaches no node; a keyboard reader gets names
  from the table. The table opens with focus on its "Id" header; headers are buttons ("Degree,
  sorted descending"), cells are named by their value only, arrows move inside the grid, Tab
  leaves it, and Escape moves focus to the toolbar's Table button. A third click on a header
  returns to "In the order loaded"; sorting keeps the old scroll position.
- **Control+O with a graph open** offers "Add to <graph>" with a warning that its edges would be
  added again ("the load makes 24 nodes and 118 edges"), and Cancel, "Replace <file>" (the main
  button) and Load (which adds the file a second time); Cancel leaves the graph as it was. With a
  saved project, the same file reopens in place.
- **The consent notice** left unanswered goes away once a graph opens. By keyboard it is the last
  stop on the start screen, after the four samples; Enter on "No thanks" moves focus to "Open
  project or file..." and announces "Usage data stays off...".

## T37. A first look

- **Not run in round 1.** Walked on e3c5bca8e6 by `rounds/r1/pilot/T37A/` (`v-pointer/`,
  `v-detours/`, `v-keyboard/`) and `T37B/` (`r2-success/`, `r2-detours/`, `r2-keyboard/`).
- **Success (S):** names 77 characters (A) or 34 members (B) and 254 (A) or 78 (B) ties, both read
  from the screen, and names Valjean (A) or member 34 (B) as the one with the most ties, read from
  the screen: a node's inspector showing a Degree equal to the Values tab's "Highest" (36 on A,
  17 on B), a node's inspector after a Degree run ("Degree 36, #1 of 77"), the table sorted on
  its Degree column, or the find box's rule leaving that one node. SD: the most connected named
  after one wrong pick corrected from the screen (on B the color ramp draws 17, 16 and 12 in
  nearly the same dark brown, so a first click may land on member 1, "#2 of 34", or 33, "#3").
- **Where the counts are:** the sample opens on the Graph's Values tab, which already shows Nodes,
  Edges and "Degree, Highest 36" (B: 17) with no name; the start card also says "77 characters"
  ("34 members"), with no tie count. The Data place shows them too (B: Node table 34 rows, Edge
  table 78 rows), and a keyboard opening announces "Zachary's karate club: 34 nodes, 78 edges".
  Clicking the Highest row or the histogram shows no name.
- **A node's degree before any run:** a node's inspector (left- or right-click) already shows its
  Degree ("Degree 36", B "Degree 3" on a small node) with no rank. Clicking that Degree row opens
  the node's neighborhood ("Valjean and 36 connections") and replaces the selection with its
  neighbors; Escape or Back returns.
- **Shortest path (A, 3 steps):** 1. "No thanks". 2. Les Miserables (Values: Nodes 77, Edges 254,
  Highest 36). 3. Click the central node: the inspector reads Valjean, Degree 36, which matches
  Highest 36. B: Zachary's karate club, member 34, Degree 17.
- **Run path (A, 6 steps):** 1. "No thanks". 2. Les Miserables. 3. Analyze. 4. Degree (a card with
  a Run button opens; "How many edges each node has: the most connected rank highest."; the button
  is named "Run Degree"). 5. Run (every node colored by degree, a Degree layer added, the color
  key 1 to 36 opens, the toolbar's Legend turns on, and the drawing moves right and shrinks). 6.
  Click the darkest node: Valjean, Degree 36, "#1 of 77". By keyboard, Shift+A opens "Filter
  analyses", ArrowDown highlights Degree, Enter focuses "Run Degree", and Enter announces "Degree
  added, running", then "Degree finished" (no name), with focus back on Analyze; Enter with
  nothing highlighted does nothing. A node
  selected before the run stays selected, and its inspector adds "Results: Degree 36, #1 of 77" by
  itself, so step 6 is then not needed. Or, for 6 to 7: Table, then the Degree header (sorts
  highest first, Valjean 36 on top). By keyboard (B): the table's headers are buttons ("Id",
  "Degree, sorted descending", live "Sorted by Degree, highest first"); ArrowDown reads gridcell
  "17" and ArrowLeft rowheader "34"; Enter selects it, "17, #1 of 34".
- **Find-box route (an expert route that reaches the name):** `=degree > 30` (B `=degree > 16`)
  shows "Did you mean Degree?" and the option "Degree > 30, Select the 1 node" (B "Degree > 16");
  Enter selects Valjean, Degree 36 (B member 34, Degree 17), announces only "1 node selected", and
  keeps the typed text in the box. After a Degree run the option adds "(Degree above 30)" (B
  "(Degree above 16)"), and the box still keeps what was typed; the stale "Did you mean Degree?"
  line can reappear under the unfocused box after a run, and is spoken again. Graded by its
  length like any route. `degree` alone offers "Degree, Select the 77 nodes" (B 34), and Enter
  selects every node and keeps `degree` in the box, which names no one.
- **Routes that do not reach the name on this build:** hovering a node (shows nothing); a word in
  the find box (`most`: "No match", with the hint rule `name == 'Napoleon'` on A, which leads
  nowhere near degree); the table before a run (A: only Id and name, "Columns: 2 of 2"; B: only
  Id, and "Columns: 1 of 1" is dimmed with the tooltip "No other columns to show or hide"); the
  Data place (A: attributes id, name, shared_chapters; B: only id; its selection summary reads
  "Degree 1 to 17" and "id mean 17.5"); the filter step's Attribute list (Node id, name,
  shared_chapters: no Degree); the Values tab's "Highest" row and histogram (no name on click;
  hovering "About Degree" opens its tooltip and an explanation popover at once); the
  biggest-looking sphere (in 3D a near node looks biggest: on B node 25, Degree 3); the analysis
  filter's `ties` (A and B: HITS and the group analyses, no Degree; `connected` lists Degree;
  `most` highlights Degree first and Enter opens its card, with Most flow dimmed); a right-click
  on the central node (it selects Valjean and the inspector shows Degree 36: this reaches the
  answer like a click); Quick actions (`degree` and `most connected`: "No results"); PageRank
  (its "Start here" badge) gives a score and a rank ("0.02108, #19 of 34"), not a count of ties.
- **Keys in the find box after a rule selection:** the first Escape empties the box, the second
  moves focus to the drawing with the node still selected, the third clears the selection
  ("Selection cleared: 1 node"). Tab from the box goes to its clear button. On B, Escape on a
  node's inspector (focus on its "Degree 17" row) does not clear the selection and announces
  nothing.
- **Final screen:** the counts and the name on screen. The Degree layer the run adds recolors every
  node; it comes with the run and is not held against the participant.

## T38. Your own file, then one kind of person

- **Success (S):** the file loaded as a new graph (24 nodes; 63 ties A, 59 ties B, both said from
  the screen), and exactly the board and staff (A, 8) or companies and agencies (B, 10) drawn blue
  (any color a reader calls blue), everyone else unchanged.
- **Stacks that count:** a layer whose conditions are one category card on `role` (A) or `kind`
  (B) with two values ticked, and a blue color. Two layers (one per value) is also S. A layer that
  colors a hand-picked selection is SD (it holds node ids, not the rule): the find box's row "role
  is board (3)" (B: "kind is company (6)", in view without scrolling) selects them; Shift+click on
  "role is staff (5)" adds to the selection (8 selected; the selection's summary reads role "staff
  (5), board (3)"); styling it makes one layer "8 nodes" ("Picked by hand: 8 nodes", notice "Made
  a layer for the 8 selected nodes"). Find-box node rows are titled by id (`v01`, `s01`), not name.
  The table route is SD the same way: sorted on `role` (`kind`), a click on the first row and
  Shift+click on the eighth (tenth) select them, and Style, Fill "+", blue makes "8 nodes" ("10
  nodes"), "Picked by hand".
- **The starting color** `6366F1` is a blue-violet; a screen reader calls it "indigo". A participant
  may still call everyone blue already, or doubt that `0000FF` beside it changed anything. Grade on
  the style tree and the last screen.
- **Success path (A, 13 steps):** 1. "No thanks". 2. "Open project or file", volunteers.graphml. 3. Load (the read-the-file page shows "volunteers: 24 nodes, 63 edges"; then Values: Nodes 24,
  Edges 63). 4. "+" beside Style layers ("Add a layer or a folder"; its menu is Layer, Folder,
  "Select layers...", Analyze..., and "Select layers..." checks layers, not nodes). 5. Layer. 6.
  Which nodes (the collapsed line "add a condition to narrow"; it only expands). 7. "Add a
  condition". 8. `role` (a card "Is any of": "volunteer, 16 nodes", "staff, 5 nodes", "board, 3
  nodes"). 9. Tick board (the subtitle becomes "Node layer"). 10. Tick staff ("8 of 24"; the
  drawing does not change yet). 11. Done. 12. Fill "+" (the Color line, focus in its box). 13.
  Type `blue`, Enter (`0000FF`; focus stays in the box; the key appears and the drawing jumps
  right). By keyboard, after Layer focus stays in the tree, and Which nodes is 10 Tabs on.
- **B:** the same with sources.graphml ("sources: 24 nodes, 59 edges"), `kind` (person 14,
  company 6, agency 4), company and agency ("10 of 24"), 13 steps. Nodes are titled by id in the
  inspector and the find box (`v23`, `s12`), the name only a row below.
- **Dead ends on this build:** right-clicking a node offers no way to pick everyone like it;
  right-clicking a table cell does nothing; a column's "Options" offers only Move left and Move
  right; the inspector's value cannot be clicked. The Data place's attribute lists its values with
  counts (volunteer 16, staff 5, board 3), but a value row does nothing on click or right-click,
  and its menu (Add label line, Filter to..., Show in table) has no color. Its "Filter to..." offers
  "Is any of" with a checkbox per value ("24 to 8 nodes") and hides the rest instead of coloring
  once "Add step" is pressed (F); left without "Add step" it is dropped with the notice 'Filter
  step not added: "role is staff or board". Press Add step to use a step.' and hides nothing.
- **Final screen:** 8 (A) or 10 (B) blue dots; the picker reads "role: board, staff, 8 nodes" (B:
  "kind: company, agency, 10 nodes", values in the order ticked). The key over the drawing names
  the layer ("Color: Layer 1, 8 of 24 nodes"), not the values.

## T39. One color for the whole drawing

- **Success (S):** every node drawn in the asked color (A: any dark green; B: any orange), the ties
  unchanged.
- **Stacks that count:** the Everything layer's node color changed (S); a new layer with no
  condition (S; "No thanks", the sample, "+", Layer, Fill "+", the color and Enter: 6 steps on A
  and B, and it adds "Color: Layer 1" to the key, the drawing jumping right and down as the key
  appears); every node selected by hand and colored (SD: a selection, not the whole drawing; on
  this build Control+A on the canvas selects nothing, and neither the canvas menu nor the find box
  (`all`: No match) selects every node).
  Coloring one node from its own inspector (Fill "+") makes a one-node layer named after the node
  ("Javert", "Valjean"): not a success.
- **Success path (A, 5 steps, the key steps of bar 4):** 1. "No thanks". 2. Les Miserables. 3.
  Everything in the layer list (its inspector opens on Style, Node). 4. Click the color box ("Node
  color, set here, indigo"; the first click selects its value). 5. Type `darkgreen` (or a hex),
  Enter (`006400`). The first styled graph is step 5. B: College football, `orange` gives
  `FFA500`. The Everything route adds nothing to the key. A node's Style > "Why this look" >
  "Everything" opens Everything on Style, Node, with focus on the heading "Everything"; the Color
  line is neither focused nor marked. By keyboard, Everything is 8 Shift+Tabs from the graph
  heading (or 12 Tabs), and Enter on its row leaves focus on the row: the color box is 19 to 20
  Tabs on, through Graph settings, the separator, the canvas, the toolbar and the Shape section.
- **Bar 4:** frozen at 12 steps as "twice the answer key's 6"; the key counts 5 on this build.
  The bar is not changed here (`criteria.md` change log).
- **Likely false finish:** Graph settings, and the Graph inspector's Style tab (the sample opens on
  Values, one click away), offer only the canvas's Background color; typing the color there
  paints the background and leaves the nodes blue-violet. Its reset is a dash ("Reset Background
  color to default"); Control+Z undoes it with "Undid changing settings.".
- **Detour on the Edge tab:** Everything > Edge > Line Color paints every tie (F unless removed;
  "Remove edge color" takes it off, and Control+Z with focus in the box undoes it). After "Remove
  edge color" the Width line slides up under the pointer and its remove dash takes focus, so a
  second click or Enter removes Width too.
- **Final screen:** all 77 (A) or 115 (B) nodes in the color; `styles.json` shows Everything's (or
  the new layer's) `node.color`.

## T40. Picked out by letters in a name

- **Success (S):** exactly the 6 (A) or 8 (B) drawn purple, everyone else unchanged, and the count
  said from the screen (the picker's "6 of 77", the find list's "Nodes 6", or counted on screen).
  Grade the hex (`800080`; a screen reader says "purple").
- **Stacks that count:** a layer with a text card on `name` -- contains "Mme" (A); starts with or
  contains "GAL" (B) -- and a purple color. In the find box, `Mme` lists "Nodes 6" and "Edges 26"
  (B: `GAL` "Nodes 8" and value rows "name is GAL10 (1)"); Enter selects only the first node and
  empties the box, and a click on a row selects that one node, so styling then makes a one-node
  layer ("MmeMagloire", B "YBR019C", "Picked by hand: 1 node"). Shift+click on rows adds to the
  selection and keeps the list open (each picked row shows a check); clicking the inspector's
  Style tab then clears the typed text; styled, the 6 make the layer "6 nodes", "Picked by hand: 6
  nodes" (SD), and while still selected they keep a thick yellow ring that makes them read yellow
  (graded on the tree). Right-click > "New layer from selection" on the six makes no layer until
  Fill "+" and a color are set. Adding a `name` contains card to a one-node layer gives
  1 of 77 (AND) and renames it "Picked and name" as the text is typed; removing the hand-picked
  card gives 6 of 77 (8 of 331) and the name "name contains Mme" (SD). On B, removing that card
  puts focus in the next card's box and opens its list of names over Done, and a click on Done
  lands on the option GAL3 and does nothing until the list is closed. Removing a layer's last card
  makes it match every node at once (no notice). The find list names nodes by id
  (`MmeMagloire`), the card's suggestions by name ("Mme Magloire").
- **Filters detours:** a step on `name` offers Contains and a text box. After the attribute is
  picked, focus moves into the text box, so `Mme` typed right away lands there and lists the six
  names; Enter adds "name contains Mme, 77 to 6 nodes" (B "name contains GAL, 331 to 8 nodes"),
  hiding the rest without reframing. It hides, never colors: F. Control+Z undoes it ('Undid adding
  the filter step "name contains Mme".'; undoing the step's switch reads 'Undid turning off the
  filter step ...'). On B, Everything colored with the step on colors every node once the step is
  off: F.
- **Success path (A, 11 steps):** 1. "No thanks". 2. Les Miserables. 3. "+" beside Style layers. 4. Layer. 5. Which nodes (only expands). 6. "Add a condition". 7. `name` (a Contains card, focus in "Type the text to match"). 8. Type `Mme` ("6 of 77"; a list of the six full names opens under the box, over Match case and
  Done). 9. Enter (keeps `Mme` even if a name in the list is highlighted, and closes the picker as
  Done does: "name contains Mme, 6 nodes"). 10. Fill "+" (the Color line, focus in its box; no key
  yet). 11. Type `purple`, Enter (writes `800080`; the key "Color: Layer 1, 6 of 77 nodes"
  appears, the drawing jumps sideways and shrinks, and focus stays in the box, "Node color now
  purple, on 6 nodes"). By keyboard the Style layers "+" is 14 Tabs from the graph heading, and
  Which nodes 11 Tabs from the new layer's row.
- **B** brings the file in first: "No thanks", "Open project or file" with yeast-galactose.graphml,
  Load (3 steps, against A's 2), then as A from step 3 with `GAL` ("8 of 331"): 12 steps with
  "Contains"; with "Starts with", 3 more (the match menu, "Starts with", then a click in the text
  box, because focus stays on the menu and typed letters reopen it): 15. The 8 purple
  dots are small dark dots in the middle of the drawing and two overlap, so counting the drawing
  gives 7: the count is read from "8 of 331".
- **Final screen:** the picker's line reads "name contains Mme, 6 nodes" (B: "name starts with GAL,
  8 nodes" or "name contains GAL, 8 nodes").

## T41. Two facts at once

- **Success (S):** exactly the 4 drawn red, the names said match the answer and were on screen
  (the inspector after a click, or the table), everyone else unchanged.
- **Stacks that count:** one layer with two cards: `trained` (A) or `on_record` (B) set to Yes,
  and `phone` (A) or `email` (B) set to "Has no value". Cards combine with AND. Routes through the
  find box that end on the 4 are SD: `=trained && !phone` selects exactly the 4, and right-click >
  "New layer from selection", then Fill "+" > red, paints them (layer "Rule: trained && !phone");
  or `email` ("Select the 15 nodes (email: has a value)"), styled, makes a layer "email: has a
  value" whose card can be switched to "Has no value" and joined by on_record Yes (4 of 24).
  "New layer from selection" makes no layer by itself: the layer ("Rule: trained && !phone")
  appears once the color is set. In
  that second route the 15 with an email keep their selection rings while the layer paints four
  others: grade the layer. A column name alone (`=phone` 17, `=email` 15) selects those who HAVE
  a value: a layer made from it and left so paints the wrong set. An unreadable rule
  (`=email missing`) says "Not a rule Find can read (at character 8). Still selected: 15 nodes."
- **Where "Has no value" is:** only in a card's match menu (a text card's, and a yes/no card's,
  which offers Yes, No, Has a value and Has no value). The attribute list answers `missing` and
  `no value` with "Nothing found"; a text card with `missing` typed reads "0 of 24" and "phone
  leaves none"; the find box answers `missing phone` with a number rule ("hours >= 27", B
  "donations >= 130000"). Filters' phone (email) step has a match menu with Has a value and Has no
  value, and Add step hides the other 17 (B 15) instead of coloring the four: F (Undo restores).
- **Success path (A, 19 steps):** 1. "No thanks". 2. "Open project or file", volunteers.graphml. 3. Load. 4. "+". 5. Layer. 6. Which nodes (only expands). 7. "Add a condition" (phone reads "70% have a value"). 8. `trained`
  (the card starts on Yes: "15 of 24"). 9. "Add a condition". 10. `phone` (focus in its text box,
  past the match menu: by keyboard one Shift+Tab back). 11. Its match menu ("phone: how to match",
  value "Contains"). 12. "Has no value" ("4 of 24"). 13. Done. 14. Fill "+" (focus in the color
  box). 15. Type `red`, Enter. 16-19. Click each of the four red dots and read the name row in the
  inspector. Or open the table and find the four by their trained and phone cells: the table does
  not mark which rows the layer paints, and a missing value is a blank cell there ("No value" in
  the inspector and to a screen reader). Sorted on phone, the blank rows come last; Enter on a row
  selects that node; by keyboard the table opens on its Id header, Tab leaves it, and Escape in
  the grid moves focus to Table. The selection's summary gives counts only ("phone 0 of 4 have a value",
  "name 4 of 4 have a value") and names no one. The inspector is titled by id (`v20`), the name a
  row below. After step 15 focus stays in the color box ("Node color, set here, red", `FF0000`).
  By keyboard, the layer "+" is 13 Tabs from the graph heading, Which nodes 9 to 10 Tabs from the
  new layer's row, and Enter on Which nodes with a card in it goes straight to the first card's
  value. Escape in an empty new text card drops it at once, as Enter does.
- **B:** the same with sources.graphml, `on_record` ("12") and `email` ("4 of 24"). The four are
  s19 Tomas Varga, s17 Friends of the Waterfront, s11 Ines Moreau and s05 Della Whitfield, 19
  steps. The find box's `=on_record && !email`, then right-click > "New layer from selection" and
  Fill red, makes the layer "Rule: on_record && !email" (SD).
- **Final screen:** four red dots; the picker reads "trained: yes, 15 nodes" and "phone: no value, 7
  nodes" (B: "on_record: yes, 12 nodes" and "email: no value, 9 nodes"), "4 of 24".

## T42. At or over a line

- **Not run in round 1.** Walked on e3c5bca8e6 by `rounds/r1/pilot/T42A/` and `T42B/`.
- **Success (S):** exactly the 11 (A) or 9 (B) drawn orange and the count said from the screen.
- **Stacks that count:** a number card on `hours` (A) or `donations` (B) with its low end at 20
  (A) or 10,000 (B) and its high end at the maximum (52, 250,000) or above. The card's match menu
  offers Between, Highest, Has a value and Has no value; "at or over" is Between with the high end
  left at the maximum. "Highest" is a top-N count (it starts at 10, which picks one source too
  many on B); after it is picked focus goes to its count box with `10` selected.
  In its count box, 20 on A gives "top 20 by hours, 20 nodes", 20 of 24 (F unless the participant
  checked the line on screen; SD then); 10000 on B is refused, 'There are only 24 nodes. Type 24
  to keep all 24, or fewer...', and Escape puts back 10 ("top 10 by donations, 10 nodes"). The
  find box's `hours >= 20` ("Select the 11 nodes (hours 20 or more)") or `donations >= 10000`
  selects the same people, and the box keeps the typed text; a layer from that selection ("hours
  20 or more") is SD, and so is `donations > 10000` (9, layer "donations above 10000"). The
  no-match hint teaches `>=` ("hours >= 27", "donations >= 130000"); `hours > 20` gives 10 and
  misses the person at exactly 20 (F if left). The find box's selection rings are gold-yellow,
  close to the asked orange: grade on the tree.
- **The from box on this build:** it starts at the column's lowest value (A `2`, B `0`), with
  focus in it and the value selected, so typing replaces it. The count and the drawing do not
  follow typing: they change on Enter (which closes the picker as Done does) or Tab (which moves
  to the "to" box, and by keyboard announces "11 of 24 nodes"). Escape in an edited box
  puts back the last good value and leaves the picker open; a second Escape closes it with focus
  on Which nodes. Dragging the low handle moves the line too (22 gives 10). One Control+Z can undo
  two card changes in a row (the typed 20 and a later drag both go back to 2 to 52).
- **Bad values on this build:** `10,000` is taken as 10000 (9 of 24). `$10,000` and `>=20` are
  refused inline: '"$10,000" is not a number. Type a number, like 130,000. The count and drawing
  still use 0 to 250000.' (A: "still use 2 to 52"), the picker stays open, and Escape puts the old
  value back and removes the message with focus still in the box. A low end above the high end
  (300000), then Escape, goes back to the full range with "donations: what was typed was not a
  number the card takes, so it went back to 0 to 250000." The high end set instead gives 2 to 20,
  14 of 24 (A) or "donations 0 to 10000, 15 nodes" (B): F. Grade on the line the card ends with.
- **Success path (A, 11 steps):** 1-3. File in ("No thanks", "Open project or file" with
  volunteers.graphml, Load). 4. "+". 5. Layer ("All 24 nodes: add a condition to narrow"). 6.
  Which nodes (only expands). 7. "Add a condition". 8. `hours` (Between 2 to 52, focus in the from
  box, `2` selected; the subtitle already "Node layer"). 9. Type `20`, Enter ("11 of 24"; the
  picker closes, "hours 20 to 52, 11 nodes"). 10. Fill "+" (tooltip "Add to node fill"; focus in
  the color box; no key, no Legend). 11. Type `orange`, Enter (the key "Color: Layer 1" with "11
  of 24 nodes" on a second line, Legend on, the drawing jumping right; focus stays in the box,
  `FFA500` selected; "Node color now orange, on 11 nodes"). B: the same with `donations` and
  `10000` ("9 of 24"), 11 steps.
- **Dead ends:** the Data place's attribute menu and right-click offer only Add label line, Filter
  to... and Show in table; "Filter to..." with 20 and Enter adds the step at once, without Add
  step, and hides the other 13 (F; its line reads "24 to 11 nodes"). A node's right-click replaces
  the current selection with that node. On B, styling a find-box selection and pressing Tab out of
  the color box makes the layer and moves focus to the Style tab.
- **Final screen:** the picker reads "hours 20 to 52, 11 nodes" (B: "donations 10000 to 250000, 9
  nodes"); the key "Color: Layer 1", "11 of 24 nodes".

## T43. Bigger for more

- **Success (S):** node size follows `hours` (A) or `donations` (B) for every node, larger for more,
  and the person named as giving the most is Hannah Weiss (A) or Harlan Development (B), read from
  the screen.
- **Stacks that count:** a size bound to the column (the link icon beside Size, "Node size by
  attribute", a column picked) on Everything (S) or on a layer covering every node, such as the
  "hours: has a value" ("donations: has a value") layer the find box's `hours` (all 24 selected;
  the box keeps `hours`) and the selection's Shape "+" > Size make (SD). That Size line arrives at
  1 with focus in its box and the line "Not set yet: the first size you pick makes the layer"; it
  makes no layer until a value is committed with Enter or the size is bound (notice "Made layer
  hours: has a value for 24 nodes"), and Escape in it removes the line with focus on Shape "+";
  then the layer covers an earlier binding on Everything until it is bound itself. Sizes typed by hand for a few people: F (the drawing does not follow the number). A
  size bound on a one-node or hand-picked layer covers only those nodes: F; the key over the
  drawing then adds a line naming them ("v09: 1 of 24 nodes") under "Size: hours". A fixed size on
  a hand-picked layer above the binding ("3 nodes" at 4) leaves the key reading only "Size:
  donations" and names nothing covered. A dot's own Style tab, Shape "+" > Size and a value, makes
  a one-node layer named by id ("Made layer v09 for 1 node"). Once another layer reads the column,
  the size popover lists it under an "In use" heading.
- **Success path (A, 7 steps):** 1-3. File in. 4. Everything (Style open; its Size line is already
  there at 1, Shape "+" is disabled, and the tab ends with "Edges: 4 styles / Edit edges"). 5. The
  link icon beside Size (tooltip and accessible name "Node size by attribute"; a popover with the
  same title opens with nothing highlighted, listing "Fixed size", a "Data" heading over the
  number columns, and "Does not fit: 5 attributes, Show why"; a screen reader hears that row as
  option "5 attributes, hidden, holds text, not groups or amounts (3), holds groups, not amounts
  (2), Show why", and the headings are not exposed). 6. `hours` (the popover closes by itself;
  the Size box then shows a chip "hours" with "From 1 to 3", a key "Size: hours" with a wedge from
  2 to 52 appears over the drawing and the drawing re-frames to the right, and a screen reader
  hears "Node size varies by hours, on 24 nodes", which nothing on screen shows). 7. Click the
  biggest dot: the inspector, titled by id (`v09`), shows Hannah Weiss, hours 52 (B: Harlan
  Development, donations 250,000). By keyboard, Enter on the Size chip opens the dialog "Size by
  hours" (focus on the dialog itself), and Escape returns to the chip; in the dialog the box
  labeled "Combine" is named "How size meets the layers beneath" and exposes no value. The size
  link's name "Stop varying node size by data" differs from its tooltip.
- **Reading "the most" on this build:** on A, in 3D a dot's size also depends on its distance from
  the camera, and v09 (52) and v02 (48) draw about the same size, so the biggest is not clear at a
  glance; with all 24 selected, the selection rings grow with each dot too (v24, 38 hours, looks
  as big as v09). On B it is plain (250,000 against 90,000 next; the big blue dot near the camera
  is s15 Zoning Board, 0). On the drawing the keyboard reaches no dot. With "Values to" lowered to
  100,000 and "Clamp outliers" off, 250,000 and 90,000 draw about the same size. The table sorted on the hours (donations) header puts the answer first
  (Table, then the header: 2 more steps); the Data place's "Show in table" opens it unsorted, and
  its attribute summary shows "Highest 52" with no name and no size action. Making every dot bigger
  by hand can push a dot under the inspector's edge (the drawing is not re-framed). The
  read-the-file page already lists Hannah Weiss with 52 before Load. A name read only from a dot
  that looked biggest and was wrong is F.
- **Final screen:** dot sizes vary; `styles.json` shows a `node.size` binding reading `data.hours`
  (B: `data.donations`).

## T44. Names on the drawing

- **Success (S):** every node carries its name as a label (A: `name`, or `id`, which holds the
  name with its spaces dropped, `MlleVaubois`, both accepted; B: `name`, not `id`), and Cosette
  (A) or Lucy Grant (B) is readable on the last screenshot at the participant's own framing.
- **Labels hidden by overlap:** after the column is picked the screen reads "77 labels, 0 hidden"
  (B: "24 labels, 0 hidden"), although labels in the dense middle visibly touch. On A the count
  stays 0 over 5 wheel turns toward Cosette and reads "5 hidden" at size 96, with Cosette
  readable; on B it stays 0 over 6 turns and at size 96. Nothing shows which names are hidden. The app leaves out labels that would overlap,
  and "Show all labels" draws them all, over each other; even with "Hide overlapping labels" on,
  some names are drawn over others, and the selection ring covers the top of a selected node's
  name. "Every node carries its name" is judged on the style tree (`node.label` by `data.name`
  painted on every node), so a participant who stops at "N hidden" can still be S when the named
  person is readable on the last screenshot; enlarging the labels can hide that person's name, and
  the grade follows the last screenshot. Whether they noticed is recorded.
- **Success path (A, 7 steps):** 1. "No thanks". 2. Les Miserables. 3. Everything (Style open). 4.
  Text "+" ("Add to node text"; a menu of Label and Tooltip). 5. Label (the column picker opens by
  itself with nothing highlighted: Find an attribute, Fixed text, then Data (`name`), then
  Structure ("Node id"; once picked the source box reads "id"); the first ArrowDown highlights
  Fixed text; reopened from "Fixed text" it shows Fixed text highlighted). 6. `name` (live "Node
  label added", spoken only; "77 labels, 0 hidden"). 7. Zoom in with the wheel (it zooms toward
  the pointer; several turns) until Cosette reads (5 turns on the pilot walk). Label settings (the
  gear, tooltip "Label settings", spoken "Node label settings") has a Size (48, "Size in: Scene
  units"): typing 96 and Enter doubles every label and keeps focus; Escape after typing reverts;
  Tab goes to "Reset Size to default" (drawn as a bare minus); Escape on a committed value closes
  the popover onto the gear. With a label in place, Text "+" offers Label look, Label size, Label
  position and Tooltip; Label size adds "Size 48" with focus in the box. By keyboard: `/` or Control+F to the find box, `Cosette`, Enter
  (Cosette selected, focus out of the box), then `f` (Frame selection); a clicked find box
  behaves the same. `=` zooms the view when the drawing itself has focus, and does nothing
  elsewhere.
- **B:** brings the file in first (3 steps against A's 2), then as A: 8 steps, or 9 with "Show all
  labels". The keyboard route the same with `Lucy Grant` (the find row reads "v16 name: Lucy
  Grant"; the inspector heading is "v16"). By keyboard, Everything is reached from the graph
  heading by Tab, F6 three times and three Tabs (A: about 22 Tabs to Text "+" in all), and Text
  "+" is 17 Tabs after Everything (4 to Analyze, 13 more); the toolbar's other tools are on the
  arrow keys. Escape on a node's heading does not clear the selection. `f` frames the selection,
  can turn the view, and is not announced.
- **Detours that do not succeed:** the Graph inspector's Style tab has a Labels section with
  overlap options only ("Hide overlapping labels", "Move labels off nodes and edges"); a selected
  node's own Text "+" makes a one-node layer (named "Cosette", B "v16"; "Made layer Cosette for 1
  node") that labels only that node; "Fixed text" with `name` typed puts the word "name" on every
  node (recovered by picking the name column from the "Label source: Fixed text" button); Escape
  in a new Label line's picker removes the line ("Label not added: no value was picked"; for
  Fixed text with nothing typed, "no words were typed"). With a one-node layer labeling by name,
  Everything's picker lists `name` under "Used elsewhere" though its own line shows Fixed text.
  Turning "Hide overlapping labels" off cannot be undone (Undo stays "Nothing to undo"), and "Show
  all labels" is not on the undo stack. Quick actions: `names` gives "No results"; `label` offers
  a dimmed "Add label line - Open a node attribute in Data > Attributes first". With a node
  attribute open in Data > Attributes, that "Add label line" works: a new layer "name" ("name: has
  a value, 77 nodes"), Look Card, Size 72, every node labeled: a success by the usual rule (S or SD
  by its length and wrong turns).
- **Not a new finding:** the label drawn small at the default framing; the font with no fallback;
  ties drawn across label text.

## T45. Ties apart from the people

- **Success (S):** A: exactly the 8 family ties drawn thick (wider than the 8 they start at) and
  red, every person and every other tie unchanged. B: exactly the 51 ties with 5 or more shared
  chapters thick and blue (any color a reader calls blue), every character and every other tie
  unchanged.
- **Stacks that count:** a layer whose Edge tab has a category card on `kind` = family (A) or a
  number card on `shared_chapters` from 5 (B), with width and color on its Edge tab, and no node
  value. A layer that also writes a node look is F (people changed). B's find-box rule
  (`=shared_chapters >= 5`) selects the 51, and the selection's Line "+" > Width makes an edge
  layer "shared_chapters 5 or more" (SD; `chapters` alone gives No match, and `5` lists 17 ties
  each showing "shared_chapters: 5"). A's find box row "kind is family (8)", in view, selects the 8 ("8 edges selected"; Enter alone selects only the
  first tie), and Line "+" > Width makes the layer "8 edges", "Picked by hand: 8 edges" (SD). A
  clicked tie's own Style tab, Line "+" > Color, makes a one-tie layer ("Nils -> Pia", "Picked by
  hand: 1 edge"); removing its card paints all 30 ties (the name stays), and a kind = family card
  then brings it to 8 and renames it "kind: family": with Width added, that route ends on the 8
  (SD).
- **Everything's Edge tab on this build:** it reads "Everything styles all 30 edges: it is the base
  layer, under every other layer." (B: 254) with no Add a condition, so no condition can be added
  there. Its Color's link icon colors every tie by `kind` (B: its "Edge width by attribute" offers
  `shared_chapters`, which would vary every tie's width: F), and Escape closes the list onto the
  link. The family row's "Set properties for family" > Width opens a box with `8` selected, so
  typing 24 gives 24; once one group has a width, the key "Edge width: kind" lists every group at 8. Control+Z inside the "Color by kind" popover undoes ("Undid changing edge color on
  Everything."). The other ties keep their new colors until "Remove edge color" on Everything,
  which removes the whole base Color line (F unless the other ties end as they started). The family
  row's actions also offer "New layer for family", which makes a correct `kind: family` layer
  carrying the group's width; with red set there and Everything's edge color removed, the route
  ends on the 8 (SD), though Everything keeps a width-by-kind override and the key still shows
  "Edge width: kind". The family swatch shows the tooltip "family" and does nothing on click.
- **Width on this build:** a width typed over the default 8 (20, 24) draws only a little thicker at
  the default framing (selected ties draw far thicker, and a blue band covers their color, until
  the selection clears). Graded on `edge.width` above 8. The subtitle changes to "Edge layer" and
  the layer row's count from the node count (16, B 77) to the ties' (8, B 51) as soon as the edge
  condition is added and its value ticked or typed; the name stays. On A, Tab after a typed width
  commits it but keeps focus in the box with the value selected; a second Tab moves on.
- **Success path (A, 17 steps):** 1-3. File in (neighbors.csv). 4. "+". 5. Layer. 6. Edge tab (a
  new layer always opens on Node). 7. Which edges (the collapsed line "All 30 edges: add a
  condition to narrow"; only expands). 8. "Add a condition" (years_known, close, kind). 9. `kind`. 10. Tick family ("8 of 30"). 11. Done ("kind: family, 8 edges"). 12. Line "+" (a menu: Color,
  Width, Pattern, Pattern count, Curved). 13. Width (focus in its box, 8 selected). 14. Type a
  width over 8, Enter. 15. Line "+". 16. Color (focus in "Edge color, not set, drawn #A9A9A9 dark
  gray", `A9A9A9` selected). 17. Type `red`, Enter (the key "Edge color: Layer 1, 8 of 30 edges"
  appears; the Color row stays below Width and focus stays in the box). By keyboard, Enter on a
  ticked value closes the card as Done does; Escape in the just-added Width box after typing
  removes the line ("Edge width not added"); Escape in a committed width box restores the value
  with nothing spoken, while the color box says "Edit discarded; this stays FF0000.".
- **B (16 steps):** 1. "No thanks". 2. Les Miserables. 3. "+". 4. Layer. 5. Edge tab. 6. Which
  edges (only expands; on the B keyboard walk one Enter on Which edges opened the list). 7. "Add a condition". 8.
  `shared_chapters` (Between 1 to 31, focus in the from box with `1` selected). 9. Type `5`, Tab
  ("51 of 254"). 10. Done ("shared_chapters 5 to 31, 51 edges"). 11. Line "+". 12. Width. 13. Type
  `24`, Enter. 14. Line "+". 15. Color. 16. Type `blue`, Enter (the key "Edge color: Layer 1, 51
  of 254 edges"; focus stays in the box, `0000FF` selected, the Color row below Width). Escape in
  the width box restores 24 and keeps focus; Tab goes to "Edge width by attribute"; Escape in the
  color box after typing gives "Edit discarded; this stays 0000FF." (spoken only); "Pick edge
  color" ignores Escape. By keyboard, Escape in the from box with `5` typed puts back `1`.
- **Detour to watch:** conditions added on the Node tab do not pick the layer's ties; an edge
  column typed in the Node tab's list offers the action "Add kind on the Edge tab" ("Add
  shared_chapters on the Edge tab", in full), and Enter takes it: the Edge tab opens with the card
  added; going back to the Node tab before a value is ticked drops that card ("Dropped the kind
  condition: it was not finished"). Fill "+" there adds a Color line at `6366F1` at once, and a color
  typed in it paints every person (F); Control+Z with focus in the box undoes the color, and a
  second Control+Z removes the whole new layer. A layer with only an edge condition reads "Edge
  layer"; one node look then flips it to "Node layer" with "Edge not styled". A right-click on a tie selects it and offers Select
  endpoints, Frame selection, New layer from selection and Add note; Escape closes the menu and the
  tie stays selected; "New layer from selection" on one family tie never reaches the other 7. The Data place's tie attribute offers only "Filter to..." and "Show in
  table" (a filter hides ties: F).
- **Final screen:** thick red (blue) ties; `styles.json` shows the edge part's selector and
  `edge.width`, `edge.color`; no `node.` value on the new layer.

## T46. One cluster in red

- **Walked on e3c5bca8e6 by `rounds/r1/pilot/T46A/`** (`f-pointer/`, `f-detours/`,
  `f-keyboard/`) **and `T46B/`** (`w3-pointer/`, `w3-detours/`; B's keyboard walk stopped after the
  start screen and is owed).
- **Success (S):** a community run's clusters drawn in their colors, the cluster holding Javert (A)
  or Nebraska (B) bright red, every other cluster keeping its own distinct color, and its size said
  from the screen (A: 11; B: 12; both read again on e3c5bca8e6). Which methods count: "Rules
  settled before round 1" above.
- **Stacks that count:** the group's own layer in the run's folder with its color changed (S); the
  folder's "Color from each layer" table with that group's swatch set (S; its picker takes `red`
  and the drawing changes at once, with "Color: 1 changed" and Undo; the picker covers much of the
  drawing and closes on Enter, leaving the table open; Escape twice leaves focus on the folder's
  Color field; clicking the folder's name selects it and does not expand it; the folder's swatch
  strip names a group on hover and does nothing on click); a
  new layer above whose condition picks that cluster (S); a layer of a hand selection (SD). The
  table lists the groups and their counts but not which one holds Javert (Nebraska), and shows
  "Source: <<Layer>>" beside "Change source".
- **Shorter routes on this build:** a node's Memberships button (accessible name "Louvain Group
  3", B "Louvain Group 4", drawn as two columns) opens the group's own layer, expands the folder and
  marks the row in Style layers: red there paints that group (S). By pointer no focus ring shows on
  the Color field and the button looks like plain text (default cursor, no tooltip); by keyboard
  focus lands on the group's heading ("Group 3"). A node's Style > "Why this look" > "Open layer
  Louvain / Group 4" opens the same layer (S).
- **Traps on this build:** the folder's chain icon (accessible name "Give all 6 layers one node
  color", tooltip "One value for all: use orange for all 6 layers"; B "Give all 10 layers one node
  color", "use yellow", then "Color: 9 changed") paints every group one color, a color already
  changed included (F; its inline "Undo the color change" restores them). The "Color: Louvain" key
  over the drawing looks like a list of groups but does nothing on hover or click and shows no
  sizes. A node's own Style tab, Fill "+", adds a Color line showing the group's color in italics
  (inherited) and makes no layer; typing that same color and Enter does nothing; a different color
  and Enter makes a one-node layer ("Javert", B "74"; "Made layer 74 for 1 node") and adds "Color:
  74" to the key: one node, not the cluster (F if left). Group 5's crimson `BE0032` (B) sits next
  to the new red on the drawing and in the key. On B, `cluster` in the
  analysis filter highlights Clustering coefficient (a ranking) first, and Enter opens it; its run
  paints an orange 0.1111 to 0.6667 scale (F); Louvain is second, with no "Start here" badge under
  that filter; Tab there with an option highlighted closes the popover and takes nothing. On A,
  `circles` and `community` give "No analysis matches", `together` lists only Edge betweenness,
  and `group` lists Louvain, the other community methods, Girvan-Newman and Connected components.
  A one-node layer from a node's Style is named by id on B ("74"), and the key then scrolls ("3
  more below"). The Data place does not list the run's groups. Quick actions answers `Javert`,
  `color` and `louvain` with "No results".
- **Success path (A, 12 steps; walked on A and B):** 1. "No thanks". 2. Les Miserables. 3. Analyze. 4.
  Type `louvain`. 5. Enter. 6. Run (a "Louvain" folder of Group 1 to 6 appears and a "Color:
  Louvain" key opens over the top left; the drawing moves right and shrinks, about x 520-1015 to
  x 690-1120). 7. Click the find
  box. 8. Type `Javert`, Enter (the inspector, titled by the id; Values, Memberships: Louvain Group
  3). 9. The Louvain folder's expand caret (the small chevron left of the folder icon, default
  cursor, tooltip "Expand Louvain" over the folder's name; the folder row need not be clicked
  first, and clicking the name does not expand it). 10. Group 3 (its row shows 11; Style open). 11. Click the color box (selects `009E73`). 12. Type `red`, Enter (`FF0000`). The Undo tooltip
  then reads "Undo changing node color on Group 3 Ctrl+Z". In the box, Escape after typing
  restores `FF0000` and keeps focus; Tab goes to "Node color by attribute".
- **B:** the same on College football with `Nebraska` (the inspector is titled `74`): Group 4, 12
  teams, starting color `A1CAF1` (10 groups; palette "Nineteen contrasting colors": Group 1
  yellow, 3 orange, 5 crimson, 9 dark blue, 10 salmon). The answer shows on the Group 4 row, as
  "12 of 115" and as "Louvain: Group 4, 12 nodes". By keyboard the folder row reads "Louvain, folder, 10 layers"; ArrowRight expands
  it. Groups 3 and 4 on A both hold 11, so a count read off the wrong row still reads 11. By
  keyboard (A), Analyze is 18 Tabs from the opened graph, the layer tree is entered at Everything,
  and the opened group layer's color box is 14 Tabs on.
- **Final screen:** Group 3 (B: 4) red, the others in their colors; the answer 11 (B: 12).

## T47. Every cluster at once, colors kept

- **Success (S):** every node drawn as Box (A and B), every cluster's color unchanged.
- **Stacks that count:** the run's folder edited once (its Shape line, written to every group
  layer: S, `Route: folder`); two or more group layers picked together and edited once (S,
  `Route: several`; Group 1, Shift+click Group 10, Shape "+" > Shape, `box`, Enter gives "Shape:
  10 changed"); each group layer edited one by one (S, steps counted, `Route: one by one`); the
  Everything layer's shape (S, `Route: around`: the group layers write only color, so it shows,
  but the bulk edit was not used). Any cluster's color changed, or all clusters given one color
  through the folder's color field: F. A route on the file's conference column (`value`) instead
  of a run: F (not the program's clusters). Bar 1 holds for T47 only when at least half its S and
  SD sessions are `folder` or `several`; the stall rule and question 3 count the same. A node's
  own Style tab, Shape "+" > Shape, makes a one-node layer named by the node's id (A "Valjean", B
  "37" for GeorgiaTech): the Shape line appears with no layer, and the layer ("Made layer Myriel
  for 1 node", "Made layer 37 for 1 node") is made only when a value is picked; the one cube is
  hidden under the selection glow: not a success.
- **Success path (A, 11 steps):** 1. "No thanks". 2. Les Miserables. 3. Analyze. 4. `louvain`. 5.
  Enter. 6. Run (six groups in a Louvain folder; a color key opens over the top left; the drawing
  moves right and is drawn slightly smaller). 7. The Louvain folder (Style shows "6 layers in Louvain. Layers added later
  are not changed."; the Color line shows the purple "Layer" token with the groups' swatches, and
  Which nodes reads "Louvain: <<Layer>>", drawn with guillemets). 8. Shape "+" (a menu of Shape
  and Size). 9. Shape (the Shape line is added, showing "Icosphere" in italics; by keyboard focus
  is on it, by pointer no focus ring shows; a screen reader hears "Node shape added: pick a value
  for every layer", which nothing on screen shows). 10. Open the list (visible label "Shape",
  accessible name "Node shape, default Icosphere" until a value is picked, then "Node shape,
  Box"; Enter also opens it; on the unset line Icosphere is drawn highlighted, with no check; a
  check shows only on a value that is set). 11. Box ("Shape: 6 changed", Undo; the key gains "Shape: Louvain, Box").
  Or by keys at step 10: type `box` (Box highlighted; the box still shows "Icosphere" while
  typing), Enter. B: the same on College football: "10 layers in Louvain", "Shape: 10 changed";
  the key then scrolls ("3 more below"), hiding Groups 8 to 10. By keyboard, Tab into the layer
  tree lands on Everything (the bottom row); ArrowUp reaches the folder; from the opened graph,
  Analyze is 18 to 20 Tabs away, and on B Enter in the Louvain card's Resolution box runs it.
- **The shape list:** the first click on Box took on every pilot walk. Escape closes the list and
  keeps the value and focus; Tab closes it and moves focus to "Node shape by attribute" (whose
  tooltip then covers the "Shape: 6 changed" line). Typing the prompt's own word `cube` highlights
  nothing and shows no message (only "cube" at the grid's foot), and Enter does nothing; the reader
  must find Box. ArrowRight at a row's end does not wrap to the next row. Quick actions finds
  nothing for `shape` or `cube`, and the find box answers `cube` with "No match".
- **Undo past the run, then Redo,** brings back the folder with every group, its count and color
  and the key; Box then applies normally, and a run after undoing offers plain Louvain.
- **Undo of a shape set on the folder or on several layers** turns the drawing back to balls while
  the open inspector still shows "Box" as set (spoken "default Icosphere" with value Box); picking
  Box again does nothing until another shape is picked first. A session caught here is graded on
  where it ends; the trap is a build defect, not a wrong turn.
- **A group layer's own Shape "+" > Shape** adds an italic, unset "Icosphere" line, with no "Not
  set yet" hint; nothing changes and nothing is added to the key until a value is picked, and "-"
  removes the line. The folder's Color field opens "Color from each layer", with nothing about
  shape; on B one Escape closes that table onto the field.
- **Route: around** gives no "changed" line and no shape entry in the key; the folder route adds a
  "Shape: Louvain" entry with a "Box" row to the key.
- **Final screen:** cubes in six (A) or ten (B) colors; `styles.json` shows each group layer with
  its own `node.color` and `node.shape` `box`.

## T48. Cluster colors on only some people

- **Success (S):** the clusters' colors drawn only on trained people (A, 15) or sources on the
  record (B, 12); every other node in the starting color; no cluster's color changed; and the
  count said from the screen: 15 (A) or 12 (B). A number read off one cluster's line is F. The
  card's chip ("trained: yes, 15 nodes") counts the whole file, on the folder and on a single cluster
  layer alike (Group 1 alone paints 5 and its chip still reads 15), and on these files it equals
  the answer because every node is in a cluster, so a count read from it is accepted; so is the
  key's "15 of 24 nodes" under "Color: Louvain". (The two counts are not added to "Facts no
  briefing may hold": a bare 15 or 12 matches unrelated text in persona files, and no briefing
  names T48.)
- **Stacks that count:** a `trained` (A) or `on_record` (B) card set to Yes on every cluster layer,
  added once on the folder's picker (S, `Route: folder`), on two or more cluster layers picked
  together (S, `Route: several`) or on each layer (S, `Route: one by one`; after one layer the key
  reads "21 of 24 nodes", B "20 of 24"); a new layer above that paints the others back to
  `#6366F1` (SD, `Route: cover`: it covers, it does not pick). Fill "+" there adds an unset line
  showing `6366F1` in italics that paints nothing until Enter, which sets it and repaints the
  others (typing another color and then `6366F1` over it also sets it). Made while one cluster
  layer or the folder is selected, the new layer lands inside the Louvain folder, where it still
  covers; on a new layer with no conditions Which nodes opens with the attribute list closed, and
  one click on "Add a condition" opens it. A single cluster layer's Which nodes reads "8 of 24
  nodes". The cover route never shows the answer: the key reads "Color: Layer 1, 9 of 24 nodes"
  (B 12) and the group rows carry no count, so 15 must be worked out; the cover layer's row has no
  swatch.
- **A Filters step "on_record is Yes", then the run while it is on, then the step turned off:**
  `Route: around` ("Rules settled before round 1"). While the step is on the key reads "Color:
  Louvain" with "12 of 24 nodes"; "Color: Louvain on 12 nodes" shows once the step is off. Turning
  the step off, or undoing it, does not re-frame the drawing, and a cluster stays cut off at the
  canvas's right edge. After a run started from the Data panel the left panel stays on Data, so
  the folder is out of sight until the Graph rail button is pressed.
- **False finishes on this build:** a Filters step "trained is Yes" ("on_record is Yes") left on
  keeps 15 (12) of 24 and hides the others instead of leaving them in the starting color: the right
  count with the wrong look (F). Removing the folder's Louvain card ("Remove Louvain from every
  layer") makes every cluster layer paint everyone in one color (F). The find box's `trained`
  (`on_record`) selects the 15 (12), and nothing there restores the others. Everything has no
  Which nodes: "Everything styles all 24 nodes: it is the base layer, under every other layer."
  Clicking a group in the color key does nothing. The Filters button switches the left panel from
  Style layers to Data. The find box's clear button and Escape empty the text but keep the 15 (12)
  selected, and their rings stay on the drawing through later steps; Escape with focus in a layer's
  inspector clears that selection, with no Undo. The find box's `not trained` finds nothing.
- **Success path (A, 12 steps):** 1-3. File in. 4. Analyze. 5. `louvain`. 6. Enter. 7. Run (3
  clusters; the inspector stays on the Graph; a "Color: Louvain" key with Group 1 to 3 opens over
  the drawing, which moves about 130 px right and is redrawn smaller, and a screen reader hears
  "Louvain finished: 3 groups, each a layer in the Louvain
  folder of Style layers"). 8. The Louvain folder ("3 layers in Louvain. Layers added later are
  not changed."; "Which nodes ... 24 of 24 nodes", chip "Louvain: <<Layer>>"). 9. Which nodes
  (a collapsed line; the click opens the picker; its card reads "<<Layer>> 3 layers"). 10. "Add a condition" (its results
  list the run as "Louvain (already a condition)"). 11. `trained` (the card starts on Yes: "15 of
  24 nodes"; the drawing changes at once, and the key adds "15 of 24 nodes"). 12. Done (chips
  "Louvain: <<Layer>>" and "trained: yes, 15 nodes"). B: the same with `on_record` ("12 of 24
  nodes", "on_record: yes, 12 nodes"). No node moves when the card is added. A new layer's
  attribute list also lists a "Community size 8 to 8" entry under Results. The answer also shows
  on Everything's Fill line: "Covered by Group 1, Group 2 and Group 3 on 15 of 24". By keyboard,
  Enter on Louvain in the analysis list puts focus on "Run Louvain" (Enter in the Resolution box,
  when reached, runs the analysis at once); "Remove trained" comes before the card's value
  (Shift+Tab), and Tab from the value goes to "Add a condition"; from the folder row, Which nodes
  is 10 Tabs on; Which nodes is named "Louvain: each layer's own value" while the screen shows
  "Louvain: <<Layer>>". The "Select layers..." route (the `several` route) works; its checkboxes
  have no accessible name, and the folder's own checkbox shows partly checked with all three
  layers checked.
- **Final screen:** 15 (B: 12) dots in cluster colors, 9 (B: 12) in the starting color. The color
  key still lists every group.

## T49. Put it back

- **Success (S):** after the follow-up, the drawing and the style tree are as they were when the
  sample opened: the last line of `styles-steps.jsonl` has the same `look` as its first line with
  `graph: true`, and the red (A) or yellow (B) is gone.
- **The change must have been made:** S requires a line of `styles-steps.jsonl` before the
  follow-up whose look has every node red (A) or yellow (B) (its `colors` holds that one color);
  without it, F, whatever the last look.
- **The look on this build:** `look` (`styleContent` in `../tool/measure.mjs`) keeps each layer's
  `revision`. Undo and reopening the sample give the start's look exactly (`14bbda5e594c` on A and
  B; all red `030d9c64dd57`, all yellow `c05072721f31`). The picker's first swatch ("indigo
  6366F1"), typing `6366F1` back over a set color, and deleting one's own layer give a tree that
  matches the start in every value but its revision (`54ae8c137668`). From an empty start,
  `styles-start.json` and the `start` field of `styles.json` are null (no graph is open yet), so
  the start is the first line of `styles-steps.jsonl` with `graph: true`; the grade is by its
  `colors` ("Rules settled before round 1").
- **Routes:** the Undo arrow (tooltip "Undo changing node color on Everything Ctrl+Z"), or
  Control+Z, which works with focus still in the color box: S. After the one undo Undo is dimmed
  (hover shows "Nothing to undo"; dimmed it is no Tab stop), and an extra press does nothing.
  Control+Z with focus in the find box undoes the typing there, not the color. Typing the old
  color back (`6366F1`) or the picker's first swatch ("indigo 6366F1", `54ae8c137668`): S, the
  drawing matching; a near color (`blue` gives `0000FF`, also typed over the hex in the picker;
  `purple` `800080`) is F. The picker marks the color it was opened on as "<name> <hex>, the color
  before this edit" ("yellow FFFF00, the color before this edit" once yellow was set), which is
  not the color the sample opened with: picking it is F. Enter in the picker's hex box applies
  the color and closes the picker; Escape there discards a typed value; a click into the hex box
  puts the caret after the value, so typed text becomes `FF0000blue`, and Enter then closes the
  picker silently with nothing changed. Removing the Color line with its minus ("Remove node
  color"; focus then jumps to Effects' "+") and adding it again is S when the line is then set to
  `6366F1`: Fill "+" brings it back unset, with `6366F1` in italics; Enter on it, or `6366F1` typed
  and Enter, sets it (`54ae8c137668`); Tab leaves it unset, and Escape removes the line again. Removing the line alone
  draws the default blue-violet, so the screen looks as it opened, while the tree holds no color
  (`15c2d32ec164`): graded by the drawing, which matches ("Rules settled before round 1"), and
  recorded as a finding about the design.
  Reopening the sample (Main menu > Open sample, the open sample marked "Open now", then the
  dialog "Discard unsaved changes?" and its button "Discard"; it clears the undo history): S. So is
  Main menu > Back to start > Discard, then the sample from the start screen. Removing a layer the participant made: S when
  the look matches. Hiding Everything blanks the whole drawing. The Main menu, Layer actions and
  the canvas's right-click menu hold no undo.
- **Success path (A, 5 + 1 steps):** 1. "No thanks". 2. Les Miserables. 3. Everything (Style
  open). 4. Click the color box ("Node color, set here, indigo"; selects the hex; no picker opens). 5. Type `red`, Enter (focus stays in the box). `--end` gives the follow-up. 6. The Undo arrow, or
  Control+Z (one key, focus still in the box): the color reads `6366F1` again ("Undid changing
  node color on Everything."). Control+Shift+Z and Control+Y redo. B: Zachary's karate club,
  `yellow` (`FFFF00`). By keyboard (A; B's keyboard walk is owed) the sample is 6 Tabs from the
  start, Everything 14 Tabs on, the color box 19 more, and the Undo button 25 Shift+Tabs back from
  the color box, named "Undo changing node color on Everything"; Control+Z is the quick route.
  The picker's close button, Hex format list, eyedropper and sliders are not Tab stops; Tab past
  the last swatch closes the picker onto the color box. Hiding Everything with its eye ("Turn this
  layer off") blanks the drawing, ties included.
- **Final screen:** blue-violet dots; Everything's `node.color` is `#6366F1`.

## T50. What a colleague's color picks out

- **Success (S):** A: names the 3 orange characters (Mlle Baptistine, Mlle Gillenormand, Mlle
  Vaubois) and says what they share: "Mlle" in their name, read from the layer's conditions. B: says
  6 people are green and that they gave 30 or more hours and finished training, read from the
  layer's conditions. Both read from the screen.
- **SD:** the right rule after a wrong first reading corrected on screen. **F:** a rule guessed from
  the names alone (A) with no look at the conditions is F only if it is wrong; a right reading from
  the names alone (all three start "Mlle") is SD under bar 1, recorded as "rule not read", and counts
  as not read (F) for question 5, which is reported per half: A's names give the rule away. On B a
  green count of 7 or 15 read off a single card's chip is F.
- **Success path (A, 4 steps):** 1. "No thanks". 2. "Open project or file",
  lesmis-poster.graphty.json (the project opens, with three orange dots and a key "Color: Poster,
  3 of 77 nodes"; "New from data..." > "Choose a file..." opens it the same way). 3. The "Poster"
  layer (Style open: "Which nodes 3 of 77", the chip "name contains Mlle, 3 nodes"). 4. Values: the
  members, by id (`MlleBaptistine`), or click each orange dot (3 more steps; hover shows nothing).
  B: volunteers-thanks.graphty.json, "Thank-you cards": "Which nodes 6 of 24" with the chips "hours
  30 to 52, 7 nodes" and "trained: yes, 15 nodes" (each card's own count, not 6; nothing on the
  collapsed line, or in its spoken name, says both must hold, and "Nodes that pass every
  condition" shows only once it is opened); opened, the hours card shows the match menu "Between"
  and two boxes, 30 and 52. Its Values tab: "Matched nodes 6", "Node color on 6 of 6 nodes",
  members v02, v05, v09, v16, v17, v21. The rule as the screen states it, "hours 30 to 52" (or
  "between 30 and 52") and trained, is the layer's rule (52 is the file's highest), so it is read
  as the key's "30 or more hours and finished training": S.
- **Another route:** a colored node's Style > "Why this look" > "Open layer Poster" opens the
  layer on the tab last shown (usually Style, with the rule); that node's own Style tab shows Fill
  with "+" and no Color line. Opening the rule (a click on the chip) opens the card with its
  suggestion list closed and focus in its first box; the first Escape closes the card, and Enter,
  Escape and Done all leave the rule unchanged. On A, one ArrowDown opens the list of the three
  names with nothing highlighted (Enter then changes nothing); a second ArrowDown and Enter
  rewrites the rule (`Mlle Baptistine`, 1 of 77): a change to the colleague's project, which
  `changes.changed` shows; Control+Z undoes it, and the open card shows the restored text at once.
  Grade the reading; a rule left rewritten is recorded as a wrong turn. On B, Enter in the from
  box closes the card with focus on Which nodes; the trained value select opens Yes / No / Has a
  value / Has no value over Add a condition and Done.
  Right-click > "Select what it paints" on the layer selects its nodes, but the selection names
  none of them. On B its summary reads "hours 31 to 52, mean 41.67", "trained Yes (6)" and "role
  staff (4), volunteer (2)": the selection's range, not the layer's rule. How a reading of "31 or
  more hours and trained" taken from that summary alone is graded is left to the Director
  (`criteria.md` log). Everything's Color line on B
  reads "Covered by Thank-you cards on 6 of 24", the layer's name a link to it (A: "Covered by
  Poster on 3 of 77"). Members on the Values tab are listed by id; Enter or a click on one selects
  it and replaces the layer's inspector with the node's (titled by id), and Escape there clears
  the selection and leaves focus on the Graph heading with the layer closed. The find box answers
  `orange` and `green` with "No match"; the table has no color column and cannot show only the
  selection.
- **Final screen:** the layer's Style with its conditions shown; nothing changed
  (`changes.changed` empty).

## T51. Each kind its own color

- **Success (S):** three distinct colors on `role` (A) or `kind` (B), every node of a value in its
  value's color; the color named for the board (A) or the companies (B) read from the key or the
  panel at or before the step it is said; the ties and every other look unchanged. A color named
  from the drawing alone, with no look at the key or the panel, is SD if right and F if wrong.
- **Stacks that count:** a color bound to `role` (A) or `kind` (B), one color per value, on
  Everything or a new layer (S); three layers, each a category card on one value with its own
  color (S); hand-picked selections colored (SD: they hold node ids, not the rule; the layer is
  named "3 nodes", "Picked by hand", and its key line reads "Color: 3 nodes"). Two values in one
  color, or one value left in the starting color: F. Two hand-made layers leave the third value in
  the starting color with no line in the key: F, though the drawing shows three colors. A
  hand-made layer over a binding on Everything (B: an "Agencies" layer in red, then Everything
  bound to `kind`) draws the agencies red; the key lists "Color: Agencies" red and, under "kind",
  "agency ... covered by Agencies", and the Color line says "Covered by Agencies on 4 of 24":
  grade the color named against the drawing.
- **Success path (A, 6 steps):** 1. "No thanks". 2. "Open project or file", volunteers.graphml. 3.
  Load. 4. Everything (Style open). 5. The link icon beside Color (tooltip "Node color by
  attribute"; a popover with the same title opens with nothing highlighted, listing the file's
  columns under Data -- name, role, hours, trained, phone -- and "Node id" under Structure). 6.
  `role` (three colors; the key over the drawing opens, reading "Color: role" with volunteer,
  staff and board, and the drawing shrinks and moves right to clear it; three small squares
  appear under the Color line, a square's tooltip sitting over the square to its left; a screen
  reader hears "Node color varies by role, on 24 nodes", which is not shown on screen). The board's color is read from the key, from a
  square's tooltip (hovering one shows its value, "board"), or from the "Color by role" dialog the
  Color line opens (palette shown as "Eight distinct colors"; Escape returns focus to the Color
  line). After the binding the Color line is a button named "Node color: role, 3 groups, Eight
  distinct colors: volunteer orange, staff blue, board green", which already speaks the answer.
  The link icon is then named "Stop varying node color by data": clicking it again removes the
  binding (by keyboard it is one Tab after the Color line, with no confirmation; Shift+Tab from
  the line goes to "Pick node color"). In the attribute list, Tab closes it and picks nothing; the
  squares are not Tab stops, so by keyboard the colors are read in the dialog ("company , 6
  nodes"), from the Color line's name, or from the key. In the dialog each row's Hide and actions
  buttons are Tab stops after the grid; Escape on a row's actions button does nothing, and Escape
  from its Hide button closes the dialog onto the Color line. By keyboard, Everything's Color line
  is 5 Shift+Tabs to the tree and then 19 Tabs from the opened graph.
- **Reference values (e3c5bca8e6, the same as 6dd0b00bd7 and ed4351b258):** A: volunteer orange, staff sky blue
  (the screen reader says "blue"), board green (`#009E73`; the screen reader says "green"). B:
  person orange, company sky blue (`#56B4E9`; the screen reader says "blue"), agency green
  (`#009E73`, "green"). B's key reads "Color: kind". The key shows three lines in three distinct
  colors on both. Accept green or teal on A; sky blue, light blue or blue on B.
- **Detours on this build:** a color typed on Everything makes every node one color with no key
  line; the find box's "role is board (3)" selects the 3 (rows by id), and styling them makes the
  hand-picked layer above (its name and key line, "3 nodes", never say board, and a color typed
  on Everything first has no key line at all; after Enter on its color focus stays in the box, as
  on every layer); a node's own Style tab bound to `role` makes a one-node layer ("v12") whose key
  lists only its node's value, while its Color line's three squares and spoken name still list
  all three: F; three hand-made layers with a category card each (S once all three are made; after
  two, the third value stays indigo with no key line: F); the Data place's attribute (its menu
  and "Attribute actions": Add label line, Filter to..., Show in table), a node's right-click
  menu and Analyze (`color`: "No analysis matches") offer no color by value.
- **Final screen:** three colors on the drawing; `styles.json` shows a `node.color` binding
  reading `data.role` (or `data.kind`), palette okabe-ito.

## Change log

- 2026-10-19 (round 1 pilots on e3c5bca8e6): the success paths and their notes match the frozen
  build e3c5bca8e6 as the pilots in `rounds/r1/pilot/` saw it. A new layer's collapsed Which
  nodes (Which edges) only expands on its first click, so "Add a condition" is a step of its own:
  T38 13 steps, T40 A 11, T40 B 12 (15 with Starts with, which also needs a click in the text box
  because focus stays on the match menu), T41 19, T42 11 on both halves, T45 A 17 and B 16; T39's
  new-layer route is 6. The subtitle and the row's count follow a condition as soon as it is
  added. Enter in a just-added color box keeps focus in the box on every layer, and after Line "+"

    > Color the Color row stays below Width. An unset line takes the value it shows (T48's cover is
    > no longer 2 steps longer; T49's remove-and-re-add ends S with Enter). Runs and the first key
    > re-frame the drawing (it moves right and shrinks). The find box answers `=degree` with "Did you
    > mean Degree?" and keeps the typed text; its no-match hints teach `>=`; picked rows show a check.
    > The analysis card's button is "Run Degree", and `most` highlights Degree. A dimmed Undo is no Tab
    > stop, shows "Nothing to undo" on hover, and Control+Y redoes. T43's selection Size line says
    > "Not set yet"; T44's hidden count starts at 0 on both halves and Quick actions' "Add label line"
    > works once an attribute is open in Data; T45's "New layer for family" route reaches the 8 (SD);
    > T46 A is now walked; T47's `cube` highlights nothing (no Cylinder false finish), and Redo after
    > undoing the run brings the groups back; T48's filtered run is graded `Route: around`, as already
    > settled; T49's picker Enter closes the picker and its swatch reads "the color before this edit";
    > T50's opened card keeps its list closed and B's "hours 30 to 52" reading is S; T51's link icon is
    > one Tab after the Color line. Owed: T46 B and T49 B by keyboard. No success definition's target
    > changed and no bar changed.

- 2026-10-18 (round 1 pilots on 6dd0b00bd7): the success paths and their notes match the frozen
  build 6dd0b00bd7 as the pilots in `rounds/r1d2/pilot/` saw it. Every chip now ends in "nodes"
  ("name contains Mme, 6 nodes"). Fill "+" opens no key until a color is committed, and Enter in a
  new layer's new color box moves focus to the disabled Fill "+". A new layer's Which nodes arrives
  collapsed, and its "add a condition to narrow" line is the Add a condition step. A new cover
  line, or Color added back after removal, is unset with `6366F1` in italics and cannot be set to
  that value directly (T48's cover is 2 steps longer; T49's remove-and-re-add is no longer S unless
  it ends set to `6366F1`). The keyboard lands on the inspector's graph heading after an open. The
  find box keeps the typed text (no `=`), its no-match hint on Les Miserables is a name rule, a
  plain `degree > 30` is mapped without a message, and Shift+click adds node rows too (T40's find
  route can end on the six, SD). Filter steps are "Is any of" or Contains cards, hide on "Add
  step" and are dropped without it. Layers from a selection appear only when a value is committed
  ("Made a layer for the 8 selected nodes"). Runs keep the drawing's size and place, and T48's card
  moves no node. T42's Highest refuses a count over the node count on B. T44's hidden counts
  changed (A 7 at the start, B 1, never 0). T45 B walks in 15 steps; a new layer always opens on
  the Node tab; the Node tab offers "Add kind on the Edge tab". T46's caret alone expands the folder
  (12 steps, walked on B only); the node's own Fill makes no layer at once. T47's Tab closes the
  shape list, and `cube` picks Cylinder. T49's Undo button is 27 Shift+Tabs away and the start
  color is named "indigo". T51's drawing does not re-frame and its status is spoken only. Owed
  before round 1: T46 A all three ways, T37 A and T43 B by keyboard. No success definition's target
  changed and no bar changed.

- 2026-10-18 (round 1 pilots on 5bd16cda6e): the success paths and their notes match the frozen
  build 5bd16cda6e as the pilots in `rounds/r1d1/pilot/` saw it. Fill "+" now adds the Color line
  at once with focus in its box (no Color menu step): T38 12 steps, T39's new-layer route 7, T40 A
  10 and B 11 (13 with Starts with), T41 18. The from box arrives with its value selected and its
  count changes on Enter or Tab, not while typing: T42 10 steps on both halves. Control+Z works
  with focus in a color box (T39, T45, T49: the undo is one key). The color box's spoken name
  ("blue" for `6366F1`, "dark pink" for `800080`) is not used to grade. The find box now reaches
  answers by rule: T37's `=degree > 30` (via "Did you mean") names Valjean; T41's `=trained &&
!phone` and T41 B's edited "email: has a value" layer reach the four (SD); a column name says
  what it selects. Layers made from a selection are named for their rule and rename themselves as
  cards change (T40, T41, T43, T45). Shift+click on a second find-box value row adds to the
  selection: T38's hand-picked route ends as one layer "8 nodes". T37 B's analysis filter lists
  Degree for `connected` and `most`; its layout drew the same on both walks. T43's popover reads
  "5 attributes", and a hand-picked binding's key line names its layer. T44's picker opens with
  nothing highlighted, lists "Node id" under Structure, and `=` zooms by keyboard. T45's Node-tab
  detour points to the Edge tab; T45 B was not walked on this build. T46's Memberships button
  expands the folder and marks the group, and the run redraws the drawing smaller. T47's first
  shape click is not swallowed; a Redo of the run brings back an empty folder. T48's Run opens a
  color key and the Everything layer has no Which nodes; a filtered-run route is left for the
  Director. T50's "Why this look" link opens the layer on Values. T51's popover has no `id`
  highlighted, and a covered value's key line says "covered by". No success definition's target
  changed and no bar changed.

- 2026-10-17 (round 1 pilots on ed4351b258): the success paths and their notes match the frozen
  build as the pilots in `rounds/r1d1/pilot/` saw it. Every path meets: focus in the color box
  after Fill or Line "+" > Color (no click in the box: T38 13 steps, T40 A 11 and B 12, T41 19,
  T42 A 12 and B 11, T45 A 16); focus in a card's text or from box after its column is picked, and
  Enter there closing the picker (T40); the color box's message for an unreadable word; Escape
  keeping focus in a color box; Undo dimmed when a file opens; Control+Z doing nothing while focus
  is in a text box; a new layer opening on the last-shown Node or Edge tab. T37 accepts a node's
  Degree matched against the Values tab's Highest (both on screen before any run; a 3-step route),
  and B's table and Data place hold only id. T38 and T51 read "Picked by hand: N nodes", not "A
  rule set elsewhere". T40's Filters detour leaves 1 of 77 (A) or adds nothing (B), not 0. T41's
  match menu is named by its column. T42's from box no longer crashes, takes `10,000`, and refuses
  `$10,000` with a message. T43's popover is titled "Node size by attribute"; the find box's "Rule:
  hours" route is SD. T44 accepts `id` on A though it drops the spaces; labels can be sized; the
  wheel zooms toward the pointer; the keyboard route needs `/` or Control+F. T45's Everything Edge
  tab offers no condition (its "removes ties" detour cannot happen; its color-by-kind detour is
  recorded). T46's Memberships button and "Why this look" now open the right group layer (shorter
  routes, S); the run opens a key instead of zooming; B's palette is "Nineteen contrasting colors".
  T47's Shape box takes typing, and its first option click is swallowed. T48's lines read "24 of
  24 nodes" with no "3 layers"; its Filters false finish keeps 15 (12), not 0. T49's Undo route
  matches the start exactly; the extra undo does nothing; removing the line alone looks done. T50's
  path walks (its build defect is fixed). T51's popover is titled "Node color by attribute", the
  key reads "Color: role" ("Color: kind"), and the squares name their value on hover. Reference
  values add the volunteers' and sources' Louvain outputs. No success definition's target changed
  and no bar changed.

- 2026-10-17 (round 1 pilots on 58556989e8): every success path rewritten as the frozen build
  shows it, counted one click or entry per step (the old paths grouped "Fill +, Color" and "Layer,
  Enter"); a new section names what every path meets on this build. The Color line needs a click
  in its box before typing (T38, T40 to T42, T45); Style is no step (T39, T43, T44, T46, T47, T49,
  T51); hovering shows no name, so names come from a click or the table (T37, T41, T43, T50); T37
  reads the most connected from a Degree run's rank or the sorted table, and its run's Degree layer
  is not held against the participant; T43's popover closes itself and its Size line is already
  there; T44 is judged on the style tree when labels are hidden by overlap; T47's path is 11
  steps, not 13; T48 accepts a count read from the card's chip (it equals the answer on these
  files); T49 compares style trees with `revision` ignored and adds reopening the sample and
  removing then re-adding the color as routes; T50's path cannot be walked on this build (the
  project's layer is not joined to its row) and is recorded as build-decided; T51's colors are
  recorded. T42 records that `10,000` and `$10,000` become `0` and that a low end above the high
  end crashes the inspector. No success definition's target changed and no bar changed.

- 2026-10-17 (second review, before the freeze): T47 A is cubes, as B (its "clearly bigger" had
  no threshold a grader could apply, and its "the same for all" was never asked). T48 grades carry
  `Route:` (folder, several, one by one, cover), and both T47 and T48 hold bar 1 only when most
  successes went by the folder or several route. T46 and T47 grades carry a `Token:` line for
  question 3.

- 2026-10-17 (after the review of the tier 3 materials): T51 added. T45 B blue, not black. T47 A's
  success is "bigger than the start, the same for all", not "twice" (the starting size is never on
  screen); T47 grades carry a `Route:` line and bar 1 holds only when most successes went through
  the clusters; a route on the file's conferences is F. T48 needs the count. T49 needs the change
  to have been made. T50 A's names-only reading counts as not read for question 5. A scripted exit
  is G, never VOID. T42 records what the box does with `10,000` and `$10,000`. Not taken: giving
  lesmis-poster a rule its names do not show (the file holds names only; a new column means
  re-making and re-reading the project), so question 5 is reported per half instead.
- 2026-10-17: Written for the first-use styling study; replaces the returning-user key of the
  earlier tier 3 drafts (git history only). Values checked on build `31e8c2387` by the pilots
  T41A, T46A, T47B and T49A in `pilot-materials/` and by `../tool/bars.mjs --tier 3`. T46 B names
  Nebraska, not Florida State: the file spells it `FloridaState`, so the find box finds nothing for
  "Florida State" and finds the University of Florida for "Florida".
