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
5bd16cda6e by the same pilots again: every value below held, and the run outputs repeated.

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

## Success paths on build 5bd16cda6e

Every success path below was walked on the frozen build 5bd16cda6e by the round 1 pilots in
`rounds/r1d1/pilot/<task><half>/` (in its `5bd16cda6e/` subfolder where an older walk sits beside
it), by pointer, by detours and by keyboard. Not yet walked on this build, and owed before round 1:
T45 B (all three ways; its lines below are from ed4351b258) and T46 A by keyboard. Steps are counted
one thing a person does each: a click, a typed entry with its Enter, one key, one option picked.
"Open project or file" with the file chosen in the chooser is one step (the tool's `--upload` does
both). Things every path meets on this build:

- **A new layer's name box** opens with "Layer 1" selected. Enter, Escape or the next click all
  keep the name, so it is no step of its own. A new layer reads "Node and edge layer"; adding a
  Fill makes it "Node layer", adding a Width "Edge layer" (the name stays "Layer 1").
- **Selecting a layer** (Everything, a folder, a group) opens its inspector already on the Style
  tab. Clicking Style is no step. The Node or Edge tab is the one the last layer shown was on.
- **A sample or file just opened** shows the Graph inspector on its Values tab. By keyboard, focus
  lands on the layer row "Hovered, node layer, 0 nodes", and the counts are announced ("volunteers:
  24 nodes, 63 edges"); the read-the-file page announces only "All 24 rows".
- **A selected node's inspector** opens on its Values tab, titled by the node's id (`v20`, `74`
  for Nebraska) with the name a row below. Its look is under Style > "Why this look"; the layer
  link there ("Open layer Poster") opens that layer on the tab last shown, usually Values.
- **Fill "+"** ("Add to node fill", tooltip "Add color") opens no menu: it adds the Color line at
  once, with focus in the color box and its value (`6366F1`) selected, opens a key over the drawing
  ("Color: Layer 1, 8 of 24 nodes") and turns the toolbar's Legend on, before any color is typed.
  Line "+" ("Add to edge line") still opens a menu (Color, Width, Pattern, Pattern count, Curved);
  after its Color or Width (and after Size), focus is in the new box with its value selected.
  Typing a word (`blue` gives `0000FF`) or a hex and Enter works at once.
- **The color box's accessible name** reads "Node color, set here, blue" for the starting
  `6366F1`, and names a typed color by a nearby name: `purple` (`800080`) is announced "dark
  pink" ("Node color now dark pink, on 6 nodes"), `darkgreen` "dark green". Grade a color on the
  hex in the style tree, never on the spoken name.
- **A color word the box cannot read** (`dark green`) gets a red message,
  `"dark green" is not a color. Type a color name or a hex code such as 2E8B57.`, and the box
  shrinks while it shows it.
- **Escape in a color box** after typing puts the old value back and keeps focus in the box, value
  selected. With nothing typed it does nothing (focus stays; Tab or a click leaves).
- **Control+Z with focus in a color box** undoes the last change at once ("Undid changing Color on
  Everything."); so does the Undo arrow (tooltip "Undo changing Color on Everything Ctrl+Z"). Undo
  is dimmed when a sample or file opens ("Nothing to undo"); an extra Control+Z does nothing.
- **Picking a column for a condition** ("Find an attribute": the file's columns under Data, then
  "Node id" under Structure; nothing is highlighted when the list opens, so the first ArrowDown
  highlights the first row) puts focus in the card's text box (text column; named "name: text to
  match") or its from box (number column; "hours from, number") with the value selected, so
  typing replaces it. The match menu is named "<column>: how to match" ("phone: how to match",
  value "Contains"). A text card's count follows typing; a number card's count and the drawing
  change only on Enter or Tab. Enter in the text box or the from box closes the picker as Done
  does. Escape in a text box closes the picker and keeps the typed text. A card left with no value
  is dropped: Enter in an empty text box, or a click elsewhere in the panel, gives the notice
  "Dropped the email condition: it had no value yet"; a click on the drawing dropped one with no
  notice (T41 A).
- **The find box:** a word with no match gives 'No match for "most". To select by a value, type
  a rule such as graphty.degree > 19' (on a file, a column of it: "hours > 27", "id > 18"). A
  column name offers "Select the 15 nodes (trained: yes)" or "(email: has a value)", and Enter
  selects them and rewrites the box to `=trained`. A rule typed plain (`hours >= 20`) offers
  "Select the 11 nodes (hours 20 or more)". A rule on a column that is not there gives a red
  'No column named "degree". Did you mean: graphty.degree > 30', and Enter takes the suggestion.
  Node rows are titled by id with the name under them; a value row ("role is board (3)") selects
  every node with that value, and Shift+click on a second value row adds to the selection. Enter
  on a list of nodes selects only the first and empties the box.
- **A layer made from a selection** (the selection's Style tab, then Fill "+", or right-click >
  "New layer from selection") is named after the one node (`Valjean`, `v16`, `74`), "8 nodes"
  ("Picked by hand: 8 nodes"; notice "Made layer 8 nodes for 8 nodes"), or, from a find-box rule,
  after its rule ("hours 20 or more", "email: has a value", "Rule: trained && !phone"). Its cards
  can be edited, and it renames itself to follow them ("Picked by hand: 1 node and nam..." while a
  hand-picked card and a rule card are both there; cards combine with AND).
- **Hovering a node shows nothing**: no name, no tooltip. A node's name is read by clicking it or
  from the table. The key over the drawing ("Color: Poster") has no tooltip, does nothing when
  clicked and is not in the Tab order. On the drawing, the keyboard turns the camera (and `=`
  zooms) but reaches no node; a keyboard reader gets names from the table.
- **Control+O with a graph open** offers "Add to <graph>" with a warning that its edges would be
  added again and "Replace <file>" as the main button; Cancel leaves the graph as it was. With a
  saved project, the same file reopens in place.
- **The consent notice** left unanswered goes away once a graph opens. By keyboard it is the last
  stop on the start screen, after the four samples.

## T37. A first look

- **Not run in round 1.** Walked on 5bd16cda6e by `rounds/r1d1/pilot/T37A/5bd16cda6e/` and
  `T37B/` (`success/`, `detours-b/`, `keyboard/`).
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
  a Run button opens; "How many edges each node has: the most connected rank highest."). 5. Run
  (every node colored by degree, a Degree layer added). 6. Click the darkest node: Valjean,
  Degree 36, "#1 of 77". A node selected before the run stays selected, and its inspector adds
  "Results: Degree 36, #1 of 77" by itself, so step 6 is then not needed. Or, for 6 to 7: Table,
  then the Degree header (sorts highest first, Valjean 36 on top). After the run the analysis list
  holds two options named "Degree" (under Recent and under Rank nodes and edges). By keyboard (B):
  the table sorted by Degree reads rowheader "34", gridcell "17"; Enter selects it, "17, #1 of 34".
- **Find-box route (an expert route that reaches the name):** `=degree > 30` (B `=degree > 16`)
  gives 'No column named "degree". Did you mean: graphty.degree > 30, Select the 1 node'; Enter
  selects Valjean, Degree 36 (B member 34, Degree 17). Graded by its length like any route.
  `degree` alone offers "graphty.degree, Select the 77 nodes", and Enter selects every node,
  which names no one.
- **Routes that do not reach the name on this build:** hovering a node (shows nothing); a word in
  the find box (`most`: "No match", with the hint rule `graphty.degree > 19`, B `id > 18`); the
  table before a run (A: only Id and name; B: only Id, "Columns: 1 of 1"); the Data place (A:
  attributes id, name, shared_chapters; B: only id, also after a run); the biggest-looking sphere
  (in 3D a near node looks biggest: on B it was node 25, Degree 3, on both pointer walks); on B
  the analysis filter's `ties`, which does not list Degree (`connected` and `most` do, and `most`
  highlights it); PageRank (its "Start here" badge) gives a score and a rank ("0.02108, #19 of
  34"), not a count of ties.
- **Final screen:** the counts and the name on screen. The Degree layer the run adds recolors every
  node; it comes with the run and is not held against the participant.

## T38. Your own file, then one kind of person

- **Success (S):** the file loaded as a new graph (24 nodes; 63 ties A, 59 ties B, both said from
  the screen), and exactly the board and staff (A, 8) or companies and agencies (B, 10) drawn blue
  (any color a reader calls blue), everyone else unchanged.
- **Stacks that count:** a layer whose conditions are one category card on `role` (A) or `kind`
  (B) with two values ticked, and a blue color. Two layers (one per value) is also S. A layer that
  colors a hand-picked selection is SD (it holds node ids, not the rule): the find box's row "role
  is board (3)" (B: "kind is company (6)", below the node rows, reached by scrolling) selects them;
  Shift+click on "role is staff (5)" adds to the selection (8 selected, though the selection's
  summary reads only role "staff (5)"); styling it makes one layer "8 nodes" ("Picked by hand: 8
  nodes", notice "Made layer 8 nodes for 8 nodes").
- **The starting color** `6366F1` is a blue-violet, and a screen reader calls it "blue": a
  participant may call everyone blue already, or doubt that `0000FF` beside it changed anything.
  Grade on the style tree and the last screen.
- **Success path (A, 12 steps):** 1. "No thanks". 2. "Open project or file", volunteers.graphml. 3. Load (the read-the-file page shows "volunteers: 24 nodes, 63 edges"; then Values: Nodes 24,
  Edges 63). 4. "+" beside Style layers ("Add a layer or a folder"; its menu is Layer, Folder,
  "Select...", Analyze..., and "Select..." checks layers, not nodes). 5. Layer. 6. "Add a
  condition". 7. `role` (a card "Is any of": volunteer 16, staff 5, board 3). 8. Tick board. 9.
  Tick staff ("8 of 24"). 10. Done. 11. Fill "+" (the Color line, focus in its box). 12. Type
  `blue`, Enter (`0000FF`).
- **B:** the same with sources.graphml ("sources: 24 nodes, 59 edges"), `kind` (person 14,
  company 6, agency 4), company and agency ("10 of 24").
- **Dead ends on this build:** right-clicking a node offers no way to pick everyone like it;
  right-clicking a table cell does nothing; a column's "Options" offers only Move left and Move
  right; the inspector's value cannot be clicked; the Data place's attribute shows "Distinct
  values 3" without listing them, and its menu (Add label line, Filter to..., Show in table) has
  no color. Its "Filter to..." step takes one value and hides the rest instead of coloring (F),
  and leaving it without "Add step" still applies it (3 of 24 nodes drawn; Undo reverts).
- **Final screen:** 8 (A) or 10 (B) blue dots; the picker reads "role: board, staff, 8" (B: "kind:
  company, agency, 10", values in the order ticked). The key over the drawing names the layer
  ("Color: Layer 1, 8 of 24 nodes"), not the values.

## T39. One color for the whole drawing

- **Success (S):** every node drawn in the asked color (A: any dark green; B: any orange), the ties
  unchanged.
- **Stacks that count:** the Everything layer's node color changed (S); a new layer with no
  condition (S; "+", Layer, Fill "+", the color: 7 steps on A, and it adds "Color: Layer 1" to the
  key); every node selected by hand and colored (SD: a selection, not the whole drawing).
  Coloring one node from its own inspector (Fill "+") makes a one-node layer named after the node
  ("Javert", "Valjean"): not a success.
- **Success path (A, 5 steps, the key steps of bar 4):** 1. "No thanks". 2. Les Miserables. 3.
  Everything in the layer list (its inspector opens on Style, Node). 4. Click the color box ("Node
  color, set here, blue"; the first click selects its value). 5. Type `darkgreen` (or a hex),
  Enter (`006400`). The first styled graph is step 5. B: College football, `orange` gives
  `FFA500`. The Everything route adds nothing to the key. A node's Style > "Why this look" >
  "Everything" opens Everything on its Color line.
- **Bar 4:** frozen at 12 steps as "twice the answer key's 6"; the key counts 5 on this build.
  The bar is not changed here (`criteria.md` change log).
- **Likely false finish:** Graph settings, and the Graph inspector's Style tab (the sample opens on
  Values, one click away), offer only the canvas's Background color; typing the color there
  paints the background and leaves the nodes blue-violet. Its reset is a dash ("Reset Background
  color to default").
- **Detour on the Edge tab:** Everything > Edge > Line Color paints every tie (F unless removed;
  "Remove edge color" takes it off, and Control+Z with focus in the box undoes it).
- **Final screen:** all 77 (A) or 115 (B) nodes in the color; `styles.json` shows Everything's (or
  the new layer's) `node.color`.

## T40. Picked out by letters in a name

- **Success (S):** exactly the 6 (A) or 8 (B) drawn purple, everyone else unchanged, and the count
  said from the screen (the picker's "6 of 77", the find list's "Nodes 6", or counted on screen).
  A screen reader announces `800080` as "dark pink": grade the hex.
- **Stacks that count:** a layer with a text card on `name` -- contains "Mme" (A); starts with or
  contains "GAL" (B) -- and a purple color. The find box cannot pick all its matches (Enter selects
  only the first and empties the box; Ctrl+click on a row replaces the selection and closes the
  list), so a find-box route styles one node at a time: SD only if every one of the 6 (8) ends
  purple. A layer made from a selected node's Style tab is named after that node (A
  "MmeMagloire", B "YBR019C", "Picked by hand: 1 node"); adding a `name` contains card to it
  gives 1 of 77 (AND) and the name "Picked by hand: 1 node and nam...", and removing the
  hand-picked card gives 6 of 77 (8 of 331) and the name "name contains Mme": that route ends on
  the right set (SD). Removing a layer's last card makes it match every node at once (no notice).
- **Filters detours:** a step on `name` offers only "Is". Typing `Mme` suggests all six Mme names
  (B: `GAL` suggests all 8, GAL10 first); Enter takes the first and a second Enter adds "name is
  Mme Magloire" (B "name is GAL10"), leaving 1 of 77 (1 of 331) drawn (Control+Z undoes it). It
  hides, never colors: F.
- **Success path (A, 10 steps):** 1. "No thanks". 2. Les Miserables. 3. "+" beside Style layers. 4. Layer. 5. "Add a condition". 6. `name` (a Contains card, focus in "Type the text to match"). 7. Type `Mme` ("6 of 77"). 8. Enter (closes the picker as Done does: "name contains Mme, 6"). 9. Fill "+" (the Color line, focus in its box; the key "Color: Layer 1, 6 of 77 nodes" appears). 10. Type `purple`, Enter (writes `800080`).
- **B** brings the file in first: "No thanks", "Open project or file" with yeast-galactose.graphml,
  Load (3 steps, against A's 2), then as A from step 3 with `GAL` ("8 of 331"): 11 steps with
  "Contains"; with "Starts with", 2 more (the match menu, then "Starts with"): 13. The 8 purple
  dots are small and two overlap, so counting the drawing gives 7: the count is read from "8 of
  331".
- **Final screen:** the picker's line reads "name contains Mme, 6" (B: "name starts with GAL, 8"
  or "name contains GAL, 8").

## T41. Two facts at once

- **Success (S):** exactly the 4 drawn red, the names said match the answer and were on screen
  (the inspector after a click, or the table), everyone else unchanged.
- **Stacks that count:** one layer with two cards: `trained` (A) or `on_record` (B) set to Yes,
  and `phone` (A) or `email` (B) set to "Has no value". Cards combine with AND. Routes through the
  find box that end on the 4 are SD: `=trained && !phone` selects exactly the 4, and right-click >
  "New layer from selection", then Fill "+" > red, paints them (layer "Rule: trained && !phone");
  or `email` ("Select the 15 nodes (email: has a value)"), styled, makes a layer "email: has a
  value" whose card can be switched to "Has no value" and joined by on_record Yes (4 of 24). In
  that second route the 15 with an email keep their selection rings while the layer paints four
  others: grade the layer. A column name alone (`=phone` 17, `=email` 15) selects those who HAVE
  a value: a layer made from it and left so paints the wrong set. An unreadable rule
  (`=email missing`) says "Not a rule Find can read (at character 8). Still selected: 15 nodes."
- **Where "Has no value" is:** only in a card's match menu (a text card's, and a yes/no card's,
  which offers Yes, No, Has a value and Has no value). The attribute list answers `missing` and
  `no value` with "Nothing found"; a text card with `missing` typed reads "0 of 24" and "phone
  leaves none"; Filters' Is box lists only values; the find box answers `missing phone` with a
  number rule ("hours > 27").
- **Success path (A, 18 steps):** 1. "No thanks". 2. "Open project or file", volunteers.graphml. 3. Load. 4. "+". 5. Layer. 6. "Add a condition" (phone reads "70% have a value"). 7. `trained`
  (the card starts on Yes: "15 of 24"). 8. "Add a condition". 9. `phone` (focus in its text box,
  past the match menu: by keyboard one Shift+Tab back). 10. Its match menu ("phone: how to match",
  value "Contains"). 11. "Has no value" ("4 of 24"). 12. Done. 13. Fill "+" (focus in the color
  box). 14. Type `red`, Enter. 15-18. Click each of the four red dots and read the name row in the
  inspector. Or open the table and find the four by their trained and phone cells: the table does
  not mark which rows the layer paints, and a missing value is a blank cell there ("No value" in
  the inspector and to a screen reader). Sorted on phone, the blank rows come last; Enter on a row
  selects that node. The selection's summary leaves out a column none of the selected has (no
  phone row for the 4).
- **B:** the same with sources.graphml, `on_record` ("12") and `email` ("4 of 24"). The four are
  s19 Tomas Varga, s17 Friends of the Waterfront, s11 Ines Moreau and s05 Della Whitfield.
- **Final screen:** four red dots; the picker reads "trained: yes, 15" and "phone: no value, 7"
  (B: "on_record: yes, 12" and "email: no value, 9"), "4 of 24".

## T42. At or over a line

- **Not run in round 1.** Walked on 5bd16cda6e by `rounds/r1d1/pilot/T42A/5bd16cda6e/` and
  `T42B/5bd16cda6e/`.
- **Success (S):** exactly the 11 (A) or 9 (B) drawn orange and the count said from the screen.
- **Stacks that count:** a number card on `hours` (A) or `donations` (B) with its low end at 20
  (A) or 10,000 (B) and its high end at the maximum (52, 250,000) or above. The card's match menu
  offers Between, Highest, Has a value and Has no value; "at or over" is Between with the high end
  left at the maximum. "Highest" is a top-N count (it starts at 10, which picks one source too
  many on B; typing 20 on A gives the chip "hours: highest 20, 20" and 20 of 24; typing 10000 on B
  takes it without a message, "donations: highest 10000, 24", every source): SD only if the
  participant checked the line on screen. The find box's plain `hours >= 20` ("Select the 11
  nodes (hours 20 or more)") or `donations >= 10000` selects the same people (the box then reads
  `=hours >= 20`); a layer from that selection ("hours 20 or more", "donations 10000 or more") is
  SD.
- **The from box on this build:** it starts at the column's lowest value (A `2`, B `0`), with
  focus in it and the value selected, so typing replaces it. The count and the drawing do not
  follow typing: they change on Enter (which closes the picker as Done does) or Tab. Escape in an
  edited box puts back the last good value and leaves the picker open; Escape from an unedited box
  closes it.
- **Bad values on this build:** `10,000` is taken as 10000 (9 of 24). `$10,000` and `>=20` are
  refused inline: '"$10,000" is not a number. Type a number, like 130,000. The count and drawing
  still use 0 to 250000.' (A: "like 27", "2 to 52"), the picker stays open, and the message stays
  until the box is left even after a valid value is typed. A low end above the high end (300000),
  then Escape, goes back to the full range with "donations: what was typed was not a number the
  card takes, so it went back to 0 to 250000." The high end set to 20 instead gives 2 to 20, 14 of
  24 (F). Grade on the line the card ends with.
- **Success path (A, 10 steps):** 1-3. File in ("No thanks", "Open project or file" with
  volunteers.graphml, Load). 4. "+". 5. Layer. 6. "Add a condition". 7. `hours` (Between 2 to
  52, focus in the from box, `2` selected). 8. Type `20`, Enter ("11 of 24"; the picker closes,
  "hours 20 to 52, 11"). 9. Fill "+" (focus in the color box). 10. Type `orange`, Enter. B: the
  same with `donations` and `10000` ("9 of 24"), 10 steps.
- **Final screen:** the picker reads "hours 20 to 52, 11" (B: "donations 10000 to 250000, 9");
  the key "Color: Layer 1, 11 of 24 nodes".

## T43. Bigger for more

- **Success (S):** node size follows `hours` (A) or `donations` (B) for every node, larger for more,
  and the person named as giving the most is Hannah Weiss (A) or Harlan Development (B), read from
  the screen.
- **Stacks that count:** a size bound to the column (the link icon beside Size, "Node size by
  attribute", a column picked) on Everything (S) or on a layer covering every node, such as the
  "hours: has a value" ("donations: has a value") layer the find box's `hours` (all 24 selected,
  the box then reading `=hours`) and the selection's Shape "+" > Size make (SD; it starts at a
  fixed size 1, which covers an earlier binding on Everything and removes its key line, until it
  is bound itself). Sizes typed by hand for a few people: F (the drawing does not follow the
  number). A size bound on a one-node or hand-picked layer covers only those nodes: F; the key
  over the drawing then adds a line naming them ("v09: 1 of 24 nodes", "3 nodes: 3 of 24 nodes")
  under "Size: hours". A dot's own Style tab, Shape "+" > Size, makes such a one-node layer
  (named by id, `v09`).
- **Success path (A, 7 steps):** 1-3. File in. 4. Everything (Style open; its Size line is already
  there at 1, and Shape "+" is disabled). 5. The link icon beside Size (tooltip and accessible
  name "Node size by attribute"; a popover with the same title opens with nothing highlighted,
  listing "Fixed size", the number columns, and "Does not fit: 5 attributes, Show why"). 6.
  `hours` (the popover closes by itself; the Size box then shows a chip "hours" with "From 1 to
  3", and a key "Size: hours" with a wedge from 2 to 52 appears over the drawing). 7. Click the
  biggest dot: the inspector shows Hannah Weiss, hours 52 (B: Harlan Development, donations
  250,000).
- **Reading "the most" on this build:** on A, in 3D a dot's size also depends on its distance from
  the camera, and v09 (52) and v02 (48) draw about the same size, so the biggest is not clear at a
  glance; with all 24 selected, the selection rings grow with each dot too (v24, 38 hours, looks
  as big as v09). On B it is plain (250,000 against 90,000 next; the big blue dot near the camera
  is s15 Zoning Board, 0). The table sorted on the hours (donations) header puts the answer first
  (Table, then the header: 2 more steps); the Data place's "Show in table" opens it unsorted. The
  read-the-file page already lists Hannah Weiss with 52 before Load. A name read only from a dot
  that looked biggest and was wrong is F.
- **Final screen:** dot sizes vary; `styles.json` shows a `node.size` binding reading `data.hours`
  (B: `data.donations`).

## T44. Names on the drawing

- **Success (S):** every node carries its name as a label (A: `name`, or `id`, which holds the
  name with its spaces dropped, `MlleVaubois`, both accepted; B: `name`, not `id`), and Cosette
  (A) or Lucy Grant (B) is readable on the last screenshot at the participant's own framing.
- **Labels hidden by overlap:** after the column is picked the screen reads "77 labels, N hidden"
  (B: "24 labels, 4 hidden"); N follows the zoom and the label size (A: 6 at the start, 5 while
  zooming in, 21 at size 96 at that zoom; B: 0 zoomed in on Lucy Grant). The app leaves out labels
  that would overlap, and "Show all labels" draws them all, over each other. "Every node carries
  its name" is judged on the style tree (`node.label` by `data.name` painted on every node), so a
  participant who stops at "N hidden" can still be S when the named person is readable. Whether
  they noticed is recorded.
- **Success path (A, 7 steps):** 1. "No thanks". 2. Les Miserables. 3. Everything (Style open). 4.
  Text "+" ("Add to node text"; a menu of Label and Tooltip). 5. Label (the column picker opens by
  itself with nothing highlighted: Find an attribute, Fixed text, then Data (`name`), then
  Structure ("Node id"; once picked the source box reads "id"); the first ArrowDown highlights
  Fixed text). 6. `name`. 7. Zoom in with the wheel (it zooms toward the pointer; several turns)
  until Cosette reads. Label settings has a Size (48, "Size in: Scene units"): typing 96 and
  Enter doubles every label. By keyboard: `/` or Control+F to the find box, `Cosette`, Enter
  (Cosette selected, focus out of the box), then `f` (Frame selection); a clicked find box
  behaves the same. `=` zooms the view when the drawing itself has focus, and does nothing
  elsewhere.
- **B:** brings the file in first (3 steps against A's 2), then as A: 8 steps, or 9 with "Show all
  labels". The keyboard route the same with `Lucy Grant` (the find row reads "v16 name: Lucy
  Grant"; the inspector heading is "v16").
- **Detours that do not succeed:** the Graph inspector's Style tab has a Labels section with
  overlap options only ("Hide overlapping labels", "Move labels off nodes and edges"); a selected
  node's own Text "+" makes a one-node layer (named "Cosette", B "v16"; "Made layer Cosette for 1
  node") that labels only that node; "Fixed text" with `name` typed puts the word "name" on every
  node (recovered by picking the name column from the "Label source: Fixed text" button); Escape
  in a new Label line's picker removes the line ("Label not added: no value was picked"; for
  Fixed text with nothing typed, "no words were typed").
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
  layer "shared_chapters 5 or more" (SD; on ed4351b258). A's find box row "kind is family (8)",
  the last row below the fold, selects the 8 ("8 edges selected"; Enter alone selects only the
  first tie), and Line "+" > Width makes the layer "8 edges", "Picked by hand: 8 edges" (SD). A
  clicked tie's own Style tab, Line "+" > Color, makes a one-tie layer ("Nils -> Pia", "Picked by
  hand: 1 edge"); removing its card paints all 30 ties (the name stays), and a kind = family card
  then brings it to 8 and renames it "kind: family": with Width added, that route ends on the 8
  (SD).
- **Everything's Edge tab on this build:** it reads "Everything styles all 30 edges: it is the base
  layer, under every other layer." (B: 254) with no Add a condition, so no condition can be added
  there. Its Color's link icon colors every tie by `kind`; the Color by kind table's "New layer
  for family" makes a layer that can be made red and wide, but the other ties keep their new
  colors until "Remove edge color" on Everything (about 15 steps; F unless the other ties end as
  they started; on ed4351b258).
- **Width on this build:** a width typed over the default 8 (20, 24) draws only a little thicker at
  the default framing (selected ties draw far thicker until the selection clears). Graded on
  `edge.width` above 8. Adding Width changes the layer's subtitle to "Edge layer"; its name stays.
- **Success path (A, 16 steps):** 1-3. File in (neighbors.csv). 4. "+". 5. Layer. 6. Edge tab. 7.
  "Add a condition" (years_known, close, kind). 8. `kind`. 9. Tick family ("8 of 30"). 10. Done
  ("kind: family, 8"). 11. Line "+" (a menu: Color, Width, Pattern, Pattern count, Curved). 12.
  Width (focus in its box, 8 selected). 13. Type a width over 8, Enter. 14. Line "+". 15. Color
  (focus in "Edge color, set here, gray", `A9A9A9` selected; the key "Edge color: Layer 1, 8 of 30
  edges" appears). 16. Type `red`, Enter.
- **B (16 steps on ed4351b258; not walked on 5bd16cda6e):** 1. "No thanks". 2. Les Miserables. 3.
  "+". 4. Layer. 5. Edge tab. 6. "Add a condition". 7. `shared_chapters` (Between 1 to 31). 8.
  Click the from box (selects `1`). 9. Type `5`, Tab ("51 of 254"). 10. Done. 11-16. Width and
  color as A, `blue`. On ed4351b258 the from box arrived with the caret after `1`, so step 8 was
  needed; on 5bd16cda6e the from box arrives with its value selected (T42), so B is likely 15
  steps: walk it before round 1. Step 5 (A: 6) is no step when the new layer already opens on
  Edge.
- **Detour to watch:** conditions added on the Node tab do not pick the layer's ties; an edge
  column typed in the Node tab's list gives "kind is an edge attribute; it is on the Edge tab"
  (plain text: Enter does nothing, Escape closes the list). Fill "+" there adds a Color line at
  `6366F1` at once, and a color typed in it paints every person (F); Control+Z with focus in the
  box undoes the color but leaves the Fill line at `6366F1` in the tree, and a second Control+Z
  removes the line. A right-click on a tie offers Select endpoints, Frame selection, New layer
  from selection and Add note.
- **Final screen:** thick red (blue) ties; `styles.json` shows the edge part's selector and
  `edge.width`, `edge.color`; no `node.` value on the new layer.

## T46. One cluster in red

- **Success (S):** a Louvain run's clusters drawn in their colors, the cluster holding Javert (A)
  or Nebraska (B) bright red, every other cluster keeping its own distinct color, and its size said
  from the screen (A: 11; B: 12, both read again on 5bd16cda6e).
- **Stacks that count:** the group's own layer in the run's folder with its color changed (S); the
  folder's "Color from each layer" table with that group's swatch set (S; its picker takes `red`
  and the drawing changes at once, with "Color: 1 changed" and Undo; the picker covers much of the
  drawing and stays open after Enter; Escape twice leaves focus on the folder's Color field); a
  new layer above whose condition picks that cluster (S); a layer of a hand selection (SD). The
  table lists the groups and their counts but not which one holds Javert (Nebraska).
- **Shorter routes on this build:** a node's Memberships button (accessible name "Louvain Group
  3", drawn as two columns "Louvain" and "Group 3") opens the group's own layer on its Color
  field, expands the folder and marks the row in Style layers: red there paints that group (S). A
  node's Style > "Why this look" > the group opens the same layer (S).
- **Traps on this build:** the folder's chain icon (accessible name "Give all 6 layers one node
  color", tooltip "One value for all: use orange for all 6 layers") paints every group one color,
  a color already changed included (F; its inline Undo restores them). The "Color: Louvain" key
  over the drawing looks like a list of groups but does nothing on hover or click and shows no
  sizes. A node's own Style tab, Fill "+", makes a one-node layer ("Javert", B "74") in `330055`
  at once and adds it to the key: one node, not the cluster (F if left). On B, `cluster` in the
  analysis filter highlights Clustering coefficient (a ranking) first, and Enter opens it; Louvain
  is second, with no "Start here" badge under that filter.
- **Success path (A, 13 steps):** 1. "No thanks". 2. Les Miserables. 3. Analyze. 4. Type
  `louvain`. 5. Enter. 6. Run (a "Louvain" folder of Group 1 to 6 appears, a "Color: Louvain" key
  opens over the top left, and the drawing is redrawn smaller and lower). 7. Click the find box. 8. Type `Javert`, Enter (the inspector, titled by the id; Values, Memberships: Louvain Group 3). 9. The Louvain folder's row in the layer list (not the inspector's "Louvain Group 3" button,
  which shares the name "Louvain"). 10. Its expand caret (the small chevron left of the folder
  icon: tooltip "Expand Louvain" but no name or button role of its own; clicking the name does not
  expand it). 11. Group 3 (its row shows 11; Style open). 12. Click the color box (selects
  `009E73`). 13. Type `red`, Enter (`FF0000`). Undo and Redo call a one-group change "changing
  color on 6 layers".
- **B:** the same on College football with `Nebraska` (the inspector is titled `74`): Group 4, 12
  teams, starting color `A1CAF1` (10 groups; palette "Nineteen contrasting colors": Group 1
  yellow, 3 orange, 5 crimson, 9 dark blue, 10 salmon; Group 5's crimson `BE0032` sits close to
  the new red). By keyboard the folder row reads "Louvain, folder, 10 layers"; ArrowRight expands
  it. Groups 3 and 4 on A both hold 11, so a count read off the wrong row still reads 11.
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
  "76" for Tennessee; "Made layer 76 for 1 node") that writes Icosphere to that node at once (a
  cube turns back into a ball) and adds it to the key: not a success.
- **Success path (A, 11 steps):** 1. "No thanks". 2. Les Miserables. 3. Analyze. 4. `louvain`. 5.
  Enter. 6. Run (six groups in a Louvain folder; a color key opens over the top left; the drawing
  is redrawn smaller). 7. The Louvain folder (Style shows "6 layers in Louvain. Layers added later
  are not changed."; the Color line shows the purple "Layer" token with the groups' swatches, and
  Which nodes reads "Louvain: <<Layer>>", drawn with guillemets). 8. Shape "+" (a menu of Shape
  and Size). 9. Shape (the Shape line is added, showing "Icosphere" in italics; by keyboard focus
  is on it, by pointer no focus ring shows; a screen reader hears "Node shape added: pick a value
  for every layer", which nothing on screen shows). 10. Open the list (visible label "Shape",
  accessible name "Node shape, default Icosphere" until a value is picked, then "Node shape";
  Enter also opens it). 11. Box ("Shape: 6 changed", Undo; the key gains "Shape: Louvain, Box").
  Or by keys at step 10: type `box` (Box highlighted), Enter. B: the same on College football:
  "10 layers in Louvain", "Shape: 10 changed"; the key then scrolls, hiding Groups 9 and 10.
- **The shape list:** the first click on Box took on every pilot walk. Tab from the open list
  moves focus to "Node shape by attribute" but leaves the list open over the panel (Escape from
  there does not close it).
- **Undo past the run, then Redo,** brings the folder back with every group matching 0 nodes (no
  colors, no key) while its header says "77 of 77 nodes"; running Louvain again offers "Update
  Louvain layer", which changes nothing. Recovery is undoing past the run and running it afresh.
  A session caught here is graded on where it ends; the trap is a build defect, not a wrong turn.
- **A group layer's own Shape "+" > Shape** writes a plain "Icosphere" at once and adds "Shape:
  Louvain, Icosphere, 20 of 77 nodes" to the key, before any value is picked.
- **Route: around** gives no "changed" line and no shape entry in the key; the folder route adds a
  "Shape: Louvain" entry with a "Box" row to the key.
- **Final screen:** cubes in six (A) or ten (B) colors; `styles.json` shows each group layer with
  its own `node.color` and `node.shape` `box`.

## T48. Cluster colors on only some people

- **Success (S):** the clusters' colors drawn only on trained people (A, 15) or sources on the
  record (B, 12); every other node in the starting color; no cluster's color changed; and the
  count said from the screen: 15 (A) or 12 (B). A number read off one cluster's line is F. The
  card's chip ("trained: yes, 15") counts the whole file, on the folder and on a single cluster
  layer alike (Group 1 alone paints 5 and its chip still reads 15), and on these files it equals
  the answer because every node is in a cluster, so a count read from it is accepted; so is the
  key's "15 of 24 nodes" under "Color: Louvain". (The two counts are not added to "Facts no
  briefing may hold": a bare 15 or 12 matches unrelated text in persona files, and no briefing
  names T48.)
- **Stacks that count:** a `trained` (A) or `on_record` (B) card set to Yes on every cluster layer,
  added once on the folder's picker (S, `Route: folder`), on two or more cluster layers picked
  together (S, `Route: several`) or on each layer (S, `Route: one by one`; after one layer the key
  reads "21 of 24 nodes", B "20 of 24"); a new layer above that paints the others back to
  `#6366F1` (SD, `Route: cover`: it covers, it does not pick; Fill "+" there gives `6366F1` at
  once, so the cover is one click once its card is set; made while one cluster layer is selected,
  the new layer lands inside the Louvain folder, where it still covers).
- **Not graded by the key yet (for the Director, `criteria.md` log):** a Filters step "on_record
  is Yes", then Louvain run while it is on (clusters worked out on the 12 shown only; the key
  reads "Color: Louvain on 12 nodes"), then the step turned off. It ends on the target look and
  the count 12, but the clusters are not the whole file's, and no `Route:` value fits.
- **False finishes on this build:** a Filters step "trained is Yes" ("on_record is Yes") left on
  keeps 15 (12) of 24 and hides the others instead of leaving them in the starting color: the right
  count with the wrong look (F). Removing the folder's Louvain card ("Remove Louvain from every
  layer") makes every cluster layer paint everyone in one color (F). The find box's `trained`
  (`on_record`) selects the 15 (12), and nothing there restores the others. Everything has no
  Which nodes: "Everything styles all 24 nodes: it is the base layer, under every other layer."
  Clicking a group in the color key does nothing.
- **Success path (A, 12 steps):** 1-3. File in. 4. Analyze. 5. `louvain`. 6. Enter. 7. Run (3
  clusters; the inspector stays on the Graph; a "Color: Louvain" key with Group 1 to 3 opens over
  the drawing, and a screen reader hears "Louvain finished: 3 groups, each a layer in the Louvain
  folder of Style layers"). 8. The Louvain folder ("3 layers in Louvain. Layers added later are
  not changed."; "Which nodes ... 24 of 24 nodes", chip "Louvain: <<Layer>>"). 9. Which nodes
  (opens the picker; its card reads "<<Layer>> 3 layers"). 10. "Add a condition" (its results
  list the run as "Louvain (already a condition)"). 11. `trained` (the card starts on Yes: "15 of
  24 nodes"; the drawing changes at once, and the key adds "15 of 24 nodes"). 12. Done (chips
  "Louvain: <<Layer>>" and "trained: yes, 15"). B: the same with `on_record` ("12 of 24 nodes",
  "on_record: yes, 12"). Adding the card redraws the layout: every node moves.
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
  B; all red `030d9c64dd57`, all yellow `c05072721f31`). The picker's first swatch ("blue
  6366F1"), typing `6366F1` back, deleting one's own layer, and removing then re-adding Color give
  a tree that matches the start in every value but its revision (`54ae8c137668`). Until the tool
  strips it, graders compare `styles.json` with `styles-start.json` with `revision` ignored and
  grade on that.
- **Routes:** the Undo arrow (tooltip "Undo changing Color on Everything Ctrl+Z"), or Control+Z,
  which works with focus still in the color box: S. After the one undo Undo is dimmed (no tooltip
  on hover; focus stays on it by keyboard, and a second Enter does nothing), and an extra press
  does nothing. Typing the old color back (`6366F1`) or the picker's first swatch: S when the tree
  matches, values compared as above; a near color (`blue` gives `0000FF`, `purple` `800080`) is
  F. Removing the Color line with its minus ("Remove node color"; focus then jumps to Effects'
  "+") and adding it again (Fill "+" gives `6366F1` in one click): S. Removing the line alone
  draws the default blue-violet, so the screen looks as it opened, while the tree holds no color
  (`15c2d32ec164`): F under the definition above (and a false done if the participant says it is
  done), though the screen cannot show the difference; logged for the Director in `criteria.md`.
  Reopening the sample (Main menu > Open sample, then the dialog "Discard unsaved changes?" and its
  button "Discard"; it clears the undo history): S. Removing a layer the participant made: S when
  the look matches. Hiding Everything blanks the whole drawing. The Main menu, Layer actions and
  the canvas's right-click menu hold no undo.
- **Success path (A, 5 + 1 steps):** 1. "No thanks". 2. Les Miserables. 3. Everything (Style
  open). 4. Click the color box (selects the hex; no picker opens). 5. Type `red`, Enter. `--end`
  gives the follow-up. 6. The Undo arrow, or Control+Z (one key, focus still in the box): the color
  reads `6366F1` again ("Undid changing Color on Everything."). B: Zachary's karate club, `yellow`
  (`FFFF00`). By keyboard the Undo button is 26 (B 28) Shift+Tabs back from the color box;
  Control+Z is the quick route.
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
  layer (Style open: "Which nodes 3 of 77", the chip "name contains Mlle, 3"). 4. Values: the
  members, by id (`MlleBaptistine`), or click each orange dot (3 more steps; hover shows nothing).
  B: volunteers-thanks.graphty.json, "Thank-you cards": "Which nodes 6 of 24" with the chips "hours
  30 to 52, 7" and "trained: yes, 15" (each card's own count, not 6; nothing on the collapsed line
  says both must hold, and "Nodes that pass every card" shows only once it is opened); opened, the
  card reads "Between 30 to 52". Its Values tab: "Matched nodes 6", "Node color on 6 of 6 nodes",
  members v02, v05, v09, v16, v17, v21.
- **Another route:** a colored node's Style > "Why this look" > "Open layer Poster" opens the
  layer on its Values tab (members), and its rule is one more click, on Style. Opening the rule (a
  click on the chip) puts focus in its first box; Enter, Escape and Done all leave it unchanged.
  Right-click > "Select what it paints" on the layer selects its nodes, but the selection names
  none of them. Everything's Color line on B reads "Covered by Thank-you cards on 6 of 24" as plain
  text.
- **Final screen:** the layer's Style with its conditions shown; nothing changed
  (`changes.changed` empty).

## T51. Each kind its own color

- **Success (S):** three distinct colors on `role` (A) or `kind` (B), every node of a value in its
  value's color; the color named for the board (A) or the agencies (B) read from the key or the
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
  grade the color named against the drawing; green is F.
- **Success path (A, 6 steps):** 1. "No thanks". 2. "Open project or file", volunteers.graphml. 3.
  Load. 4. Everything (Style open). 5. The link icon beside Color (tooltip "Node color by
  attribute"; a popover with the same title opens with nothing highlighted, listing the file's
  columns under Data -- name, role, hours, trained, phone -- and "Node id" under Structure). 6.
  `role` (three colors; the drawing re-frames; the key over the drawing reads "Color: role" with
  volunteer, staff and board; three small squares appear under the Color line, and the status
  says "Node color varies by role, on 24 nodes"). The board's color is read from the key, from a
  square's tooltip (hovering one shows its value, "board"), or from the "Color by role" dialog the
  Color line opens (palette shown as "Eight distinct colors"; Escape returns focus to the box).
  The link icon is then named "Stop varying node color by data": clicking it again removes the
  binding.
- **Reference values (5bd16cda6e, the same as ed4351b258):** A: volunteer orange, staff sky blue
  (the screen reader says "blue"), board green (`#009E73`; the screen reader says "teal"). B:
  person orange, company sky blue, agency green (`#009E73`, "teal"). B's key reads "Color: kind".
  The key shows three lines in three distinct colors on both. Accept green or teal.
- **Detours on this build:** a color typed on Everything makes every node one color with no key
  line; the find box's "role is board (3)" selects the 3 (rows by id), and styling them makes the
  hand-picked layer above; the Data place's attribute (its menu and "Attribute actions": Add label
  line, Filter to..., Show in table) and a node's right-click menu offer no color by value.
- **Final screen:** three colors on the drawing; `styles.json` shows a `node.color` binding
  reading `data.role` (or `data.kind`), palette okabe-ito.

## Change log

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
