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
difference is a finding. Read again on the frozen build 58556989e8 by the round 1 pilots
(`rounds/r1/pilot/`): every value below held; the run outputs repeated.

| What                                                | Value                                                                                                                                                                                   |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Les Miserables                                      | 77 characters, 254 ties; node columns `id`, `name` only; tie column `shared_chapters`                                                                                                   |
| Les Miserables, most connected                      | Valjean, 36 ties (next Gavroche 22)                                                                                                                                                     |
| Les Miserables, names holding "Mme"                 | 6: Mme Magloire, Mme de R, Mme Thenardier, Mme Burgon, Mme Pontmercy, Mme Hucheloup                                                                                                     |
| Les Miserables, names holding "Mlle"                | 3: Mlle Baptistine, Mlle Gillenormand, Mlle Vaubois                                                                                                                                     |
| Les Miserables, ties with 5 or more shared chapters | 51 of 254                                                                                                                                                                               |
| Les Miserables, Louvain circles (run output)        | 6 circles: Group 1 to 6 of 20, 17, 11, 11, 10, 8 characters; Javert in Group 3, 11 characters (two runs on 31e8c2387 agreed; the same on 58556989e8)                                    |
| Zachary's karate club                               | 34 members (ids 1 to 34), 78 ties; no columns but `id`                                                                                                                                  |
| Karate, most connected                              | member 34, 17 ties (next member 1, 16)                                                                                                                                                  |
| College football                                    | 115 teams, 613 ties; team names as one word (`FloridaState`, `Nebraska`); conference in `value`                                                                                         |
| Football, Louvain clusters (run output)             | 10 clusters, Group 1 to 10 of 16, 15, 14, 12, 11, 10, 10, 9, 9, 9 teams; Nebraska in Group 4, 12 teams (one run on 31e8c2387; the same in two runs on 58556989e8)                       |
| volunteers.graphml                                  | 24 people, 63 ties; columns `name` (text), `role` (category: volunteer 16, staff 5, board 3), `hours` (whole number 2 to 52), `trained` (yes/no, 15 yes), `phone` (text, missing for 7) |
| volunteers, board or staff                          | 8                                                                                                                                                                                       |
| volunteers, trained and no phone                    | 4: Aisha Bello, Diego Ruiz, Nora Lindqvist, Julia Rossi                                                                                                                                 |
| volunteers, 20 or more hours                        | 11                                                                                                                                                                                      |
| volunteers, most hours                              | Hannah Weiss, 52                                                                                                                                                                        |
| volunteers, 30 or more hours and trained (T50 B)    | 6: James Carter, Priya Nair, Hannah Weiss, Lucy Grant, Ken Ito, Ben Adler (Zara Ahmed, 38 hours, not trained)                                                                           |
| sources.graphml                                     | 24 sources, 59 ties; `name`, `kind` (person 14, company 6, agency 4), `donations` (0 to 250,000), `on_record` (12 yes), `email` (missing for 9)                                         |
| sources, company or agency                          | 10                                                                                                                                                                                      |
| sources, on the record and no email                 | 4: Della Whitfield, Ines Moreau, Friends of the Waterfront, Tomas Varga                                                                                                                 |
| sources, 10,000 or more in donations                | 9                                                                                                                                                                                       |
| sources, most donations                             | Harlan Development, 250,000                                                                                                                                                             |
| neighbors.csv                                       | 16 people, 30 ties; tie columns `kind` (neighbors 16, family 8, coworkers 6), `years_known`, `close`                                                                                    |
| yeast-galactose.graphml                             | 331 genes, 361 ties; names beginning with GAL: 8 (GAL1, GAL2, GAL3, GAL4, GAL7, GAL10, GAL11, GAL80); no other name holds GAL                                                           |
| The starting look                                   | every node color `#6366F1`, size 1, shape icosphere; every tie dark gray (`A9A9A9`), width 8                                                                                            |
| lesmis-poster.graphty.json                          | Les Miserables with one layer "Poster": name contains "Mlle", node color `#FFA500` (orange), 3 characters                                                                               |
| volunteers-thanks.graphty.json                      | volunteers with one layer "Thank-you cards": hours 30 to 52 and trained yes, node color `#008000` (green), 6 people                                                                     |

## Success paths on build 58556989e8

Every success path below was walked on the frozen build by the round 1 pilots
(`rounds/r1/pilot/<task><half>/`, by pointer, by detours and by keyboard). Steps are counted one
thing a person does each: a click, a typed entry with its Enter, one key, one option picked.
"Open project or file" with the file chosen in the chooser is one step (the tool's `--upload`
does both). Things every path meets on this build:

- **A new layer's name box** opens with "Layer 1" selected. Enter, Escape or the next click all
  keep the name, so it is no step of its own.
- **Selecting a layer** (Everything, a folder, a group) opens its inspector already on the Style
  tab, Node tab. Clicking Style is no step.
- **After Fill "+" > Color** (and Line "+" > Color) focus lands on the swatch button "Pick Node
  color" ("Pick Edge color"), not on the color box: typed letters go nowhere, and Enter opens the
  picker, whose Hex box silently refuses a color word such as `blue`. The color box ("Node color,
  set here") must be clicked first (by keyboard, one Tab). It takes a word (`blue` gives
  `0000FF`) or a hex. A word it cannot read (`dark green`, `orang`) gets a red border and no
  message. After Size and Width focus is in the box, and typing works.
- **Hovering a node shows nothing**: no name, no tooltip. A node's name is read by clicking it (the
  inspector; its title is the node's id and its name is a row below) or from the table.
- **Undo is already active when a sample or file opens** ("Undo 2 changes"): one Control+Z past
  the participant's own changes empties the drawing ("No nodes to draw"); Redo brings it back.
- **Escape in a color box** puts the old value back and sends focus to the page.

## T37. A first look

- **Not run in round 1.** Walked on 58556989e8 by `rounds/r1/pilot/T37A/` and `T37B/`.
- **Success (S):** names 77 characters (A) or 34 members (B) and 254 (A) or 78 (B) ties, both read
  from the screen, and names Valjean (A) or member 34 (B) as the one with the most ties, read from
  the screen: a node's inspector after a Degree run ("Degree 36, #1 of 77"), or the table sorted
  on its Degree column. SD: the most connected named after one wrong pick corrected from the
  screen (on B the color ramp draws 16 and 17 in nearly the same dark brown, so a first click may
  land on member 1, "#2 of 34").
- **Where the counts are:** the sample opens on the Graph's Values tab, which already shows Nodes,
  Edges and "Degree, Highest 36" (B: 17) with no name; the start card also says "77 characters"
  ("34 members"). Clicking the Highest row or the histogram shows no name.
- **Success path (A, 6 steps):** 1. "No thanks". 2. Les Miserables (Values: Nodes 77, Edges 254). 3. Analyze. 4. Degree (a card with a Run button opens). 5. Run (every node colored by degree, a
  Degree layer added). 6. Click the darkest node: the inspector reads Valjean, Degree 36, "#1 of
  77". Or, for 6 to 7: Table, then the Degree header (sorts highest first, Valjean 36 on top).
- **Routes that do not reach the name on this build:** hovering a node (shows nothing); the find
  box (`degree` gives "No match"; a rule `=degree > ...` matches nothing, even after the run); the
  table before a run (only id and name, no Degree column); the biggest-looking sphere (in 3D a
  near node looks biggest: on B it is node 15, Degree 2).
- **Final screen:** the counts and the name on screen. The Degree layer the run adds recolors every
  node; it comes with the run and is not held against the participant.

## T38. Your own file, then one kind of person

- **Success (S):** the file loaded as a new graph (24 nodes; 63 ties A, 59 ties B, both said from
  the screen), and exactly the board and staff (A, 8) or companies and agencies (B, 10) drawn blue
  (any color a reader calls blue), everyone else unchanged.
- **Stacks that count:** a layer whose conditions are one category card on `role` (A) or `kind`
  (B) with two values ticked, and a blue color. Two layers (one per value) is also S. A layer that
  colors a hand-picked selection is SD (it holds node ids, not the rule): the find box's row "role
  is board (3)" selects the 3, and styling them makes a layer named "3 nodes" whose Which nodes
  reads "A rule set elsewhere".
- **The starting color** `6366F1` is a blue-violet: a participant may call everyone blue already,
  or doubt that `0000FF` beside it changed anything. Grade on the style tree and the last screen.
- **Success path (A, 14 steps):** 1. "No thanks". 2. "Open project or file", volunteers.graphml. 3. Load (the read-the-file page shows "volunteers: 24 nodes, 63 edges"). 4. "+" beside Style
  layers ("Add a layer or a folder"). 5. Layer. 6. "Add a condition". 7. `role`. 8. Tick board. 9. Tick staff ("8 of 24"). 10. Done. 11. Fill "+". 12. Color. 13. Click the color box ("Node
  color, set here"). 14. Type `blue`, Enter.
- **B:** the same with sources.graphml ("sources: 24 nodes, 59 edges"), `kind`, company and agency
  ("10 of 24").
- **Final screen:** 8 (A) or 10 (B) blue dots; the picker reads "role: board, staff, 8" (B: "kind:
  company, agency, 10", values in the order ticked).

## T39. One color for the whole drawing

- **Success (S):** every node drawn in the asked color (A: any dark green; B: any orange), the ties
  unchanged.
- **Stacks that count:** the Everything layer's node color changed (S); a new layer with no
  condition (S); every node selected by hand and colored (SD: a selection, not the whole drawing).
  Coloring one node from its own inspector (Fill "+" > Color) makes a one-node layer named after
  the node: not a success.
- **Success path (A, 5 steps, the key steps of bar 4):** 1. "No thanks". 2. Les Miserables. 3. Everything in the layer list (its inspector opens on Style). 4. Click the color box ("Node
  color, set here"; the first click selects its value). 5. Type `darkgreen` (or a hex), Enter. The
  first styled graph is step 5. B: College football, `orange` gives `FFA500`.
- **Bar 4:** frozen at 12 steps as "twice the answer key's 6"; the key now counts 5 on this build.
  The bar is not changed here (`criteria.md` change log).
- **Likely false finish:** Graph settings, and the Graph inspector's Style tab, offer only the
  canvas's Background color; typing the color there paints the background.
- **Final screen:** all 77 (A) or 115 (B) nodes in the color; `styles.json` shows Everything's (or
  the new layer's) `node.color`.

## T40. Picked out by letters in a name

- **Success (S):** exactly the 6 (A) or 8 (B) drawn purple, everyone else unchanged, and the count
  said from the screen (the picker's "6 of 77", or counted on screen).
- **Stacks that count:** a layer with a text card on `name` -- contains "Mme" (A); starts with or
  contains "GAL" (B) -- and a purple color. The find box cannot pick all its matches (Enter selects
  only the first; its value rows are exact names only), so a find-box route styles one node at a
  time: SD only if every one of the 6 (8) ends purple.
- **Detour that empties the drawing:** Filters, a step on `name` offers only "Is"; typing `Mme`
  and Enter adds "name is Mme", which hides every node ("0 of 77"). Undo restores it.
- **Success path (A, 13 steps):** 1. "No thanks". 2. Les Miserables. 3. "+" beside Style layers. 4. Layer. 5. "Add a condition". 6. `name`. 7. Click the text box ("Type the text to match";
  focus lands on the card's "contains" menu first, and letters typed there are lost). 8. Type
  `Mme` ("6 of 77"; Enter does nothing). 9. Done. 10. Fill "+". 11. Color. 12. Click the color box. 13. Type `purple`, Enter (writes `800080`).
- **B** brings the file in first: "No thanks", "Open project or file" with yeast-galactose.graphml,
  Load (3 steps, against A's 2), then as A from step 3 with `GAL` ("8 of 331"): 14 steps with
  "contains"; with "starts with", 2 more (the match menu, then "starts with"): 16.
- **Final screen:** the picker's line reads "name contains Mme, 6" (B: "name starts with GAL, 8"
  or "name contains GAL, 8").

## T41. Two facts at once

- **Success (S):** exactly the 4 drawn red, the names said match the answer and were on screen
  (the inspector after a click, or the table), everyone else unchanged.
- **Stacks that count:** one layer with two cards: `trained` (A) or `on_record` (B) set to Yes,
  and `phone` (A) or `email` (B) set to "Has no value". Cards combine with AND. A layer made from
  a find-box selection and then narrowed with the second card also ends on the 4 (SD: its first
  part is "A rule set elsewhere"). Typing a column name in the find box selects those who HAVE a
  value (`=phone`, `=email`): the opposite of missing.
- **Success path (A, 20 steps):** 1. "No thanks". 2. "Open project or file", volunteers.graphml. 3. Load. 4. "+". 5. Layer. 6. "Add a condition". 7. `trained` (the card starts on Yes: "15"). 8. "Add a condition". 9. `phone`. 10. Its match menu (shows "contains"; named "phone: match"). 11. "Has no value" ("4 of 24"). 12. Done. 13. Fill "+". 14. Color. 15. Click the color box. 16. Type `red`, Enter. 17-20. Click each of the four red dots and read the name row in the
  inspector. Or open the table and find the four by their trained and phone cells: the table does
  not mark which rows the layer paints.
- **B:** the same with sources.graphml, `on_record` ("12") and `email` ("4 of 24"). The four are
  s19 Tomas Varga, s17 Friends of the Waterfront, s11 Ines Moreau and s05 Della Whitfield.
- **Final screen:** four red dots; the picker reads "trained: yes, 15" and "phone: no value, 7"
  (B: "on_record: yes, 12" and "email: no value, 9"), "4 of 24".

## T42. At or over a line

- **Not run in round 1.** Walked on 58556989e8 by `rounds/r1/pilot/T42A/` and `T42B/`.
- **Success (S):** exactly the 11 (A) or 9 (B) drawn orange and the count said from the screen.
- **Stacks that count:** a number card on `hours` (A) or `donations` (B) with its low end at 20
  (A) or 10,000 (B) and its high end at the maximum (52, 250,000) or above. The card's match menu
  offers Between, Highest, Has a value and Has no value; "at or over" is Between with the high end
  left at the maximum. "Highest" is a top-N count (its default 10 picks one source too many on B):
  SD only if the participant checked the line on screen. The find box's rule `=hours >= 20` (or
  plain `donations >= 10000`) selects the same people; a layer from that selection is SD.
- **The from box on this build:** it starts at the column's lowest value (A `2`, B `0`), and a
  click leaves the caret after it with nothing selected. On A typing then appends (`22`, `220`);
  on B a digit after the `0` empties the box and the keystrokes are lost. Double-click (or
  Control+A) selects the value first; by keyboard, Tab selects it.
- **A low end above the high end crashes the inspector** ("This panel could not be shown", Reload
  panel), whether typed into the from box (`220`) or the to box. After Reload panel the layer keeps
  the half-typed value (A: "hours 22 to 52, 10"). A build defect that decides the session.
- **The number as the prompt writes it:** on 58556989e8 `10,000` and `$10,000` typed into the
  from box each end as `0` after Tab, with no message, and the card stays at 24. That is a finding
  before the task runs (preflight 5). Grade the session on the line the card ends with.
- **Success path (A, 14 steps):** 1-3. File in ("No thanks", "Open project or file" with
  volunteers.graphml, Load). 4. "+". 5. Layer. 6. "Add a condition". 7. `hours` (Between 2 to
  52). 8. Double-click the from box (`hours from, number`). 9. Type `20`, Tab ("11 of 24"). 10. Done. 11. Fill "+". 12. Color. 13. Click the color box. 14. Type `orange`, Enter. B: the same
  with `donations` and `10000` ("9 of 24").
- **Final screen:** the picker reads "hours 20 to 52, 11" (B: "donations 10000 to 250000, 9").

## T43. Bigger for more

- **Success (S):** node size follows `hours` (A) or `donations` (B) for every node, larger for more,
  and the person named as giving the most is Hannah Weiss (A) or Harlan Development (B), read from
  the screen.
- **Stacks that count:** a size bound to the column (the link icon beside Size, "Node size by
  attribute", a column picked). Sizes typed by hand for a few people: F (the drawing does not
  follow the number). A size bound on a one-node layer (made from a selected node's own Style tab)
  covers only that node: F.
- **Success path (A, 7 steps):** 1-3. File in. 4. Everything (Style open; its Size line is already
  there at 1, and Shape "+" is disabled). 5. The link icon beside Size (tooltip "Size by
  attribute", accessible name "Node size by attribute"; a popover titled "Vary by" opens). 6. `hours`
  (the popover closes by itself; the Size box then reads "1 to 3"). 7. Click the biggest dot: the
  inspector shows Hannah Weiss, hours 52 (B: Harlan Development, donations 250,000).
- **Reading "the most" on this build:** in 3D a dot's size also depends on its distance from the
  camera, and v09 (52) and v02 (48) draw about the same size, so the biggest is not clear at a
  glance. The table sorted on the hours (donations) header puts the answer first (Table, then the
  header: 2 more steps). A name read only from a dot that looked biggest and was wrong is F.
- **Final screen:** dot sizes vary; `styles.json` shows a `node.size` binding reading `data.hours`
  (B: `data.donations`).

## T44. Names on the drawing

- **Success (S):** every node carries its name as a label (A: `name` or `id`, which are the same
  text in Les Miserables; B: `name`, not `id`), and Cosette (A) or Lucy Grant (B) is readable on
  the last screenshot at the participant's own framing.
- **Labels hidden by overlap:** after the column is picked the screen reads "77 labels, 7 hidden"
  (B: "24 labels, 4 hidden"); the app leaves out labels that would overlap, and "Show all labels"
  draws them all. "Every node carries its name" is judged on the style tree (`node.label` by
  `data.name` painted on every node), so a participant who stops at "N hidden" can still be S when
  the named person is readable. Whether they noticed is recorded.
- **Success path (A, 7 steps):** 1. "No thanks". 2. Les Miserables. 3. Everything (Style open). 4. Text "+" ("Add to node text"; a menu of Label and Tooltip). 5. Label (the column picker opens
  by itself with "Fixed text" first and highlighted). 6. `name`. 7. Zoom in with the wheel (it
  zooms toward the canvas's center, not the pointer; several turns) until Cosette reads. By
  keyboard there is no zoom key: the find box, `Cosette`, Enter, then `f` (Frame selection).
- **B:** brings the file in first (3 steps against A's 2), then as A: 8 steps, or 9 with "Show all
  labels".
- **Detours that do not succeed:** the Graph inspector's Style tab has a Labels section with
  overlap options only; a selected node's own Text "+" makes a one-node layer that labels only
  that node; "Fixed text" with `name` typed puts the word "name" on every node. Label settings has
  no text size: labels cannot be made larger.
- **Not a new finding:** the label drawn small at the default framing; the font with no fallback.

## T45. Ties apart from the people

- **Success (S):** A: exactly the 8 family ties drawn thick (wider than the 8 they start at) and
  red, every person and every other tie unchanged. B: exactly the 51 ties with 5 or more shared
  chapters thick and blue (any color a reader calls blue), every character and every other tie
  unchanged.
- **Stacks that count:** a layer whose Edge tab has a category card on `kind` = family (A) or a
  number card on `shared_chapters` from 5 (B), with width and color on its Edge tab, and no node
  value. A layer that also writes a node look is F (people changed). B's find-box rule
  (`=shared_chapters >= 5`) and a layer from the selection end on the same 51 (SD).
- **Detour that removes ties:** Everything's Edge tab hint "All 254 edges: add a condition to
  narrow" (A: 30) invites the condition there; adding it makes every other tie vanish. F unless
  undone.
- **Width on this build:** a width typed over the default 8 (20, 24) draws only a little thicker at
  the default framing. Graded on `edge.width` above 8.
- **Success path (A, 17 steps):** 1-3. File in (neighbors.csv). 4. "+". 5. Layer. 6. Edge tab. 7. "Add a condition". 8. `kind`. 9. Tick family ("8 of 30"). 10. Done. 11. Line "+". 12. Width
  (focus in its box). 13. Type a width over 8, Enter. 14. Line "+". 15. Color. 16. Click the color
  box ("Edge color, set here"). 17. Type `red`, Enter.
- **B (16 steps):** 1. "No thanks". 2. Les Miserables. 3. "+". 4. Layer. 5. Edge tab. 6. "Add a
  condition". 7. `shared_chapters` (Between 1 to 31). 8. Double-click the from box. 9. Type `5`,
  Tab ("51 of 254"). 10. Done. 11-16. Width and color as A, `blue`. Escape in the from box keeps
  the typed value and closes the card.
- **Detour to watch:** conditions added on the Node tab do not pick the layer's ties; the Node
  tab's list has only node columns.
- **Final screen:** thick red (blue) ties; `styles.json` shows the edge part's selector and
  `edge.width`, `edge.color`; no `node.` value on the new layer.

## T46. One cluster in red

- **Success (S):** a Louvain run's clusters drawn in their colors, the cluster holding Javert (A)
  or Nebraska (B) bright red, every other cluster keeping its own distinct color, and its size said
  from the screen (A: 11; B: 12, both read on 58556989e8).
- **Stacks that count:** the group's own layer in the run's folder with its color changed (S); the
  folder's "Color from each layer" table with that group's swatch set (S; its picker refuses
  `red`, takes `FF0000`, and the drawing changes only when the popover closes, by Escape); a new
  layer above whose condition picks that cluster (S); a layer of a hand selection (SD).
- **Traps on this build:** a node's "Why this look > Louvain" opens the run's inspector, whose one
  Color field holds Group 1's color; setting red there paints Group 1, the wrong cluster (F). The
  inspector's Memberships button ("Louvain Group 3") opens a group inspector that says "This run
  paints nothing by group" and cannot style; its Values tab gives the size. The folder's chain icon
  "Give all 6 layers one node color" paints every group one color (F).
- **Success path (A, 13 steps):** 1. "No thanks". 2. Les Miserables. 3. Analyze. 4. Type `louvain`. 5. Enter. 6. Run (a "Louvain" folder of Group 1 to 6 appears; the drawing zooms out). 7. Click the
  find box. 8. Type `Javert`, Enter (Values, Memberships: Louvain Group 3). 9. The Louvain folder's
  row in the layer list (not the inspector's "Louvain Group 3" button). 10. Its expand caret (the
  small chevron left of the folder icon; clicking the name does not expand it). 11. Group 3 (its
  row shows 11; Style open). 12. Click the color box (selects `009E73`). 13. Type `red`, Enter
  (`FF0000`).
- **B:** the same on College football with `Nebraska`: Group 4, 12 teams (10 groups; the palette
  "Eight distinct colors" is extended, so Groups 1, 5 and 9 are three close oranges and Group 5 is
  near the new red). Groups 3 and 4 on A both hold 11, so a count read off the wrong row still
  reads 11.
- **Final screen:** Group 3 (B: 4) red, the others in their colors; the answer 11 (B: 12).

## T47. Every cluster at once, colors kept

- **Success (S):** every node drawn as Box (A and B), every cluster's color unchanged.
- **Stacks that count:** the run's folder edited once (its Shape line, written to every group
  layer: S, `Route: folder`); two or more group layers picked together and edited once (S,
  `Route: several`); each group layer edited one by one (S, steps counted, `Route: one by one`);
  the Everything layer's shape (S, `Route: around`: the group layers write only color, so
  it shows, but the bulk edit was not used). Any cluster's color changed, or all clusters given
  one color through the folder's color field: F. A route on the file's conference column (`value`)
  instead of a run: F (not the program's clusters). Bar 1 holds for T47 only when at least half
  its S and SD sessions are `folder` or `several`; the stall rule and question 3 count the same.
- **Success path (A, 11 steps):** 1. "No thanks". 2. Les Miserables. 3. Analyze. 4. `louvain`. 5. Enter. 6. Run (six groups in a Louvain folder). 7. The Louvain folder (Style shows "6 layers in
  Louvain. Layers added later are not changed."; the Color line shows the purple "Layer" token with
  the groups' swatches). 8. Shape "+" (a menu of Shape and Size). 9. Shape (the Shape line is
  added, showing "Icosphere" selected in italics; typing does nothing). 10. Open the list (visible
  label "Shape", accessible name "Node shape"; Enter also opens it). 11. Box ("Shape: 6 changed",
  Undo). B: the same on College football: "10 layers in Louvain", "Shape: 10 changed".
- **Route: around** gives no "changed" line and no shape entry in the key; the folder route adds
  "Shape: Louvain Box" to the key.
- **Final screen:** cubes in six (A) or ten (B) colors; `styles.json` shows each group layer with
  its own `node.color` and `node.shape` `box`.

## T48. Cluster colors on only some people

- **Success (S):** the clusters' colors drawn only on trained people (A, 15) or sources on the
  record (B, 12); every other node in the starting color; no cluster's color changed; and the
  count said from the screen: 15 (A) or 12 (B). A number read off one cluster's line is F. The
  card's chip ("trained: yes, 15") counts the whole file, and on these files it equals the answer
  because every node is in a cluster, so a count read from it is accepted. (The two counts are
  not added to "Facts no briefing may hold": a bare 15 or 12 matches unrelated text in persona
  files, and no briefing names T48.)
- **Stacks that count:** a `trained` (A) or `on_record` (B) card set to Yes on every cluster layer,
  added once on the folder's picker (S, `Route: folder`), on two or more cluster layers picked
  together (S, `Route: several`) or on each layer (S, `Route: one by one`); a new layer above that
  paints the others back to `#6366F1` (SD, `Route: cover`: it covers, it does not pick; on this
  build a layer added while a cluster layer is the current row lands inside the folder, which then
  reads "4 layers" and "24 of 24 nodes"). Bar 1 holds for T48 only when at least half its S and SD
  sessions are `folder` or `several`.
- **False finishes on this build:** a filter step on `trained` hides the untrained ("15 of 24
  nodes") instead of leaving them in the starting color (F); a Filters step "trained is yes" keeps
  0 of 24 (only `true` matches there). Removing the folder's Louvain card ("Remove Louvain from
  every layer") makes every cluster layer paint everyone in one color (F). A condition added to
  Everything changes nothing on the drawing.
- **Success path (A, 12 steps):** 1-3. File in. 4. Analyze. 5. `louvain`. 6. Enter. 7. Run (3
  clusters; the inspector stays on the Graph and nothing points to the new folder). 8. The Louvain
  folder ("Which nodes: 3 layers, 24 of 24"). 9. Which nodes (opens the picker). 10. "Add a
  condition". 11. `trained` (the card starts on Yes: "3 layers, 15 of 24 nodes"). 12. Done (chips
  "Louvain: <<Layer>>, 3 layers" and "trained: yes, 15"). B: the same with `on_record` ("3 layers,
  12 of 24 nodes").
- **Final screen:** 15 (B: 12) dots in cluster colors, 9 (B: 12) in the starting color.

## T49. Put it back

- **Success (S):** after the follow-up, the drawing and the style tree are as they were when the
  sample opened: the last line of `styles-steps.jsonl` has the same `look` as its first line with
  `graph: true`, and the red (A) or yellow (B) is gone.
- **The change must have been made:** S requires a line of `styles-steps.jsonl` before the
  follow-up whose look has every node red (A) or yellow (B) (its `colors` holds that one color);
  without it, F, whatever the last look.
- **The look on this build:** `look` (`styleContent` in `../tool/measure.mjs`) keeps each layer's
  `revision`, so a style tree that matches the start in every value but its revision hashes
  differently (`54ae8c137668` against the start's `14bbda5e594c` on A and B). Until the tool strips
  it, graders compare `styles.json` with `styles-start.json` with `revision` ignored and grade on
  that.
- **Routes:** Undo (the arrow at the top, or Control+Z): S; one press too many empties the drawing
  (the sample's own opening is undoable), which is F unless Redo brings it back. Typing the old
  color back (`6366F1`; the picker's first swatch is that color): S when the tree matches, values
  compared as above; a near color (`purple` gives `800080`) is F. Removing the Color line with its
  minus ("Remove node color") and adding Color again gives `6366F1` and a matching tree: S.
  Removing the line alone is F: the tree then holds no color but the drawing stays red (yellow).
  Reopening the sample (Main menu > Open sample, or Back to start, then Discard unsaved changes
  and the sample) gives the opening look exactly: S. Removing a layer the participant made: S when
  the look matches.
- **Success path (A, 5 + 1 steps):** 1. "No thanks". 2. Les Miserables. 3. Everything (Style
  open). 4. Click the color box. 5. Type `red`, Enter. `--end` gives the follow-up. 6. Control+Z
  (or the Undo arrow, tooltip "Undo changing Color on Everything"): the color reads `6366F1` again.
  B: Zachary's karate club, `yellow` (`FFFF00`).
- **Final screen:** blue-violet dots; Everything's `node.color` is `#6366F1`.

## T50. What a colleague's color picks out

- **Success (S):** A: names the 3 orange characters (Mlle Baptistine, Mlle Gillenormand, Mlle
  Vaubois) and says what they share: "Mlle" in their name, read from the layer's conditions. B: says
  6 people are green and that they gave 30 or more hours and finished training, read from the
  layer's conditions. Both read from the screen.
- **SD:** the right rule after a wrong first reading corrected on screen. **F:** a rule guessed from
  the names alone (A) with no look at the conditions is F only if it is wrong; a right reading from
  the names alone (all three start "Mlle") is SD under bar 1, recorded as "rule not read", and counts
  as not read (F) for question 5, which is reported per half: A's names give the rule away.
- **On 58556989e8 the success path cannot be walked.** An opened project's layer is not joined to
  its row: the layer list shows the row's id "layer-1_2" instead of "Poster" ("Thank-you cards"),
  its Style tab is empty, its Values tab says "This row is gone" (the layer's Values reached from
  a node's "Why this look" does list the members), and the screen reader names it "layer-1_2,
  layer, paints nothing". Only the key over the drawing carries the name. The rule is on no
  screen, so no session can be S on this build: the best reachable is A's names read by clicking
  each orange dot and the rule guessed from them (SD, rule not read), and on B the six green people
  counted and their hours and training read one by one in the inspector. A build defect that
  decides the task; it is fixed and the build refrozen before T50 runs (preflight 4).
- **Success path once the layer opens (A, 4 steps):** 1. "No thanks". 2. "Open project or file",
  lesmis-poster.graphty.json (the project opens; "New from data..." refuses it as holding no
  nodes). 3. The "Poster" layer (Style open: the picker's line reads "name contains Mlle, 3"). 4. Values: the members (by id, `MlleBaptistine`), or click each orange dot (3 more steps; hover
  shows nothing). B: volunteers-thanks.graphty.json, "Thank-you cards", "hours 30 to 52" and
  "trained: yes", 6.
- **Final screen:** the layer's Style with its conditions shown; nothing changed
  (`changes.changed` empty).

## T51. Each kind its own color

- **Success (S):** three distinct colors on `role` (A) or `kind` (B), every node of a value in its
  value's color; the color named for the board (A) or the agencies (B) read from the key or the
  panel at or before the step it is said; the ties and every other look unchanged. A color named
  from the drawing alone, with no look at the key or the panel, is SD if right and F if wrong.
- **Stacks that count:** a color bound to `role` (A) or `kind` (B), one color per value, on
  Everything or a new layer (S); three layers, each a category card on one value with its own
  color (S); hand-picked selections colored (SD: they hold node ids, not the rule). Two values in
  one color, or one value left in the starting color: F. Two hand-made layers leave the third
  value in the starting color with no line in the key: F, though the drawing shows three colors.
- **Success path (A, 6 steps):** 1. "No thanks". 2. "Open project or file", volunteers.graphml. 3. Load. 4. Everything (Style open). 5. The link icon beside Color ("Node color by attribute";
  a popover titled "Vary by"). 6. `role` (three colors; the key over the drawing reads "Color:
  Everything" with volunteer, staff and board). The board's color is read from the key, or from
  the "Color by role" dialog the Color line opens. The small color squares under the Color line
  name no value to a sighted reader (no tooltip, no text).
- **Reference values (58556989e8):** A: volunteer orange, staff sky blue, board green (`#009E73`;
  the screen reader says "teal"). B: person orange, company sky blue, agency green (`#009E73`,
  "teal"). The key shows three lines in three distinct colors on both. Accept green or teal.
- **Final screen:** three colors on the drawing; `styles.json` shows a `node.color` binding
  reading `data.role` (or `data.kind`), palette okabe-ito.

## Change log

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
