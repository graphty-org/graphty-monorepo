# Tier 3 answer key: first use and styling -- GRADERS ONLY

Participants never see this file. Tasks: `tasks.md`. Bars: `criteria.md`. Participants: `roster.md`.

## How a session is graded

- **Grades:** S (succeeded on the success path or a route as short), SD (succeeded by a detour or
  with help the screen gave after a wrong turn), F (did not reach the success state, or reached it
  and said something wrong about it), G (gave up). Success = S or SD. VOID only when the tool or
  the run failed, or the participant opened a file outside its own folder (`leaks.json`).
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
  `Grade: S|SD|F|G|VOID`, `False done: yes|no`, `Wrong turns: <n>`.
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
difference is a finding.

| What                                                | Value                                                                                                                                                                                   |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Les Miserables                                      | 77 characters, 254 ties; node columns `id`, `name` only; tie column `shared_chapters`                                                                                                   |
| Les Miserables, most connected                      | Valjean, 36 ties (next Gavroche 22)                                                                                                                                                     |
| Les Miserables, names holding "Mme"                 | 6: Mme Magloire, Mme de R, Mme Thenardier, Mme Burgon, Mme Pontmercy, Mme Hucheloup                                                                                                     |
| Les Miserables, names holding "Mlle"                | 3: Mlle Baptistine, Mlle Gillenormand, Mlle Vaubois                                                                                                                                     |
| Les Miserables, ties with 5 or more shared chapters | 51 of 254                                                                                                                                                                               |
| Les Miserables, Louvain circles (run output)        | 6 circles: Group 1 to 6 of 20, 17, 11, 11, 10, 8 characters; Javert in Group 3, 11 characters (two runs on 31e8c2387 agreed)                                                            |
| Zachary's karate club                               | 34 members (ids 1 to 34), 78 ties; no columns but `id`                                                                                                                                  |
| Karate, most connected                              | member 34, 17 ties (next member 1, 16)                                                                                                                                                  |
| College football                                    | 115 teams, 613 ties; team names as one word (`FloridaState`, `Nebraska`); conference in `value`                                                                                         |
| Football, Louvain clusters (run output)             | 10 clusters, Group 1 to 10 of 16, 15, 14, 12, 11, 10, 10, 9, 9, 9 teams; Nebraska in Group 4, 12 teams (one run on 31e8c2387; record again)                                             |
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
| The starting look                                   | every node color `#6366F1`, size 1, shape icosphere; every tie dark gray, width 8                                                                                                       |
| lesmis-poster.graphty.json                          | Les Miserables with one layer "Poster": name contains "Mlle", node color `#FFA500` (orange), 3 characters                                                                               |
| volunteers-thanks.graphty.json                      | volunteers with one layer "Thank-you cards": hours 30 to 52 and trained yes, node color `#008000` (green), 6 people                                                                     |

## T37. A first look

- **Success (S):** names 77 characters (A) or 34 members (B) and 254 (A) or 78 (B) ties, both read
  from the screen (the Graph's Values: Nodes, Edges), and names Valjean (A) or member 34 (B) as the
  most connected, read from the screen (a hovered name, Degree in Values, a run's ranking). SD: the
  most connected named after one wrong pick corrected from the screen.
- **Success path (A, 5 steps):** 1. "No thanks" on the consent notice (may be left open). 2. Les
  Miserables on the start screen. 3. Values of the Graph shows Nodes 77, Edges 254. 4. Analyze,
  Degree (or the find box, or hovering the biggest hub). 5. Read Valjean, 36.
- **Final screen:** the counts and the name are on screen; the style tree is unchanged
  (`changes.changed` empty apart from what the participant chose).

## T38. Your own file, then one kind of person

- **Success (S):** the file loaded as a new graph (24 nodes; 63 ties A, 59 ties B, both said from
  the screen), and exactly the board and staff (A, 8) or companies and agencies (B, 10) drawn blue
  (any color a reader calls blue), everyone else unchanged.
- **Stacks that count:** a layer whose conditions are one category card on `role` (A) or `kind`
  (B) with two values ticked, and a blue color. Two layers (one per value) is also S. A layer that
  colors a hand-picked selection is SD (it holds node ids, not the rule).
- **Success path (A, 12 steps):** 1. "No thanks". 2. "Open project or file", choose
  volunteers.graphml. 3. Load (the read-the-file page shows "volunteers: 24 nodes, 63 edges"). 4. "+" beside Style layers. 5. Layer (the name field opens; Enter keeps "Layer 1"). 6. "Add a
  condition". 7. `role`. 8. Tick board. 9. Tick staff ("8 of 24"). 10. Done. 11. Fill "+", Color. 12. Type `blue` in the color box, Enter.
- **Final screen:** 8 (A) or 10 (B) blue dots; the layer's picker reads "role: board, staff" (or
  similar) with the count.

## T39. One color for the whole drawing

- **Success (S):** every node drawn in the asked color (A: any dark green; B: any orange), the ties
  unchanged.
- **Stacks that count:** the Everything layer's node color changed (S); a new layer with no
  condition (S); every node selected by hand and colored (SD: a selection, not the whole drawing).
- **Success path (A, 6 steps, the key steps of bar 4):** 1. "No thanks". 2. Les Miserables. 3. Everything in the layer list. 4. Style. 5. The color box ("Node color, set here"). 6. Type
  `darkgreen` (or a hex), Enter. The first styled graph is step 6.
- **Final screen:** all 77 (A) or 115 (B) nodes in the color; `styles.json` shows Everything's (or
  the new layer's) `node.color`.

## T40. Picked out by letters in a name

- **Success (S):** exactly the 6 (A) or 8 (B) drawn purple, everyone else unchanged, and the count
  said from the screen (the picker's "6 of 77", or counted on screen).
- **Stacks that count:** a layer with a text card on `name` -- contains "Mme" (A); starts with or
  contains "GAL" (B) -- and a purple color. The find box's rule (`=name contains ...`) selecting
  the same nodes, then a layer from the selection: SD.
- **Success path (A, 11 steps):** 1. "No thanks". 2. Les Miserables. 3. "+" beside Style layers. 4. Layer, Enter. 5. "Add a condition". 6. `name`. 7. Click the text box ("Type the text to
  match"; focus lands on the card's "contains" menu first). 8. Type `Mme` ("6 of 77"). 9. Done. 10. Fill "+", Color. 11. Type `purple`, Enter (writes `800080`).
- **B** adds the file: "Open project or file", choose yeast-galactose.graphml, Load (3 steps); then
  as A with "starts with" or "contains" and `GAL`.
- **Final screen:** the picker's line reads "name contains Mme, 6" (or "name starts with GAL, 8").

## T41. Two facts at once

- **Success (S):** exactly the 4 drawn red, the names said match the answer and were on screen
  (a hovered name, the table, the inspector), everyone else unchanged.
- **Stacks that count:** one layer with two cards: `trained` (A) or `on_record` (B) set to Yes,
  and `phone` (A) or `email` (B) set to "Has no value". Cards combine with AND.
- **Success path (A, 17 steps, piloted in `pilot-materials/T41A/`):** 1. "No thanks". 2. "Open
  project or file", volunteers.graphml. 3. Load. 4. "+". 5. Layer, Enter. 6. "Add a condition". 7. `trained` (the card starts on Yes: "15"). 8. "Add a condition". 9. `phone`. 10. Its match menu
  ("contains"). 11. "Has no value" ("4 of 24"). 12. Done. 13. Fill "+". 14. Color. 15. Type `red`,
  Enter. 16-17. Hover the four red dots (or open the table) to read their names.
- **Final screen:** four red dots; the picker reads "trained: yes, 15" and "phone: no value, 7".

## T42. At or over a line

- **Success (S):** exactly the 11 (A) or 9 (B) drawn orange and the count said from the screen.
- **Stacks that count:** a number card on `hours` (A) or `donations` (B) with its low end at 20
  (A) or 10,000 (B) and its high end at the maximum (52, 250,000) or above. "Highest" with a count
  that happens to give the same people is SD only if the participant checked the line on screen.
- **Success path (A, 13 steps):** file in (3 steps as T41), "+", Layer, "Add a condition",
  `hours`, the "from" box (`hours from, number`), type `20`, Tab ("11 of 24"), Done, Fill "+",
  Color, type `orange`, Enter.
- **Final screen:** the picker reads "hours 20 to 52, 11".

## T43. Bigger for more

- **Success (S):** node size follows `hours` (A) or `donations` (B) for every node, larger for more,
  and the person named as giving the most is Hannah Weiss (A) or Harlan Development (B), read from
  the screen.
- **Stacks that count:** a size bound to the column (the link icon beside Size, "Node size by
  attribute", a column picked). Sizes typed by hand for a few people: F (the drawing does not
  follow the number).
- **Success path (A, 11 steps):** file in (3), Everything (or a new layer), Style, Shape "+",
  Size, the link icon ("Node size by attribute"), `hours`, close the popover, hover the biggest
  dot to read its name.
- **Final screen:** dot sizes vary; `styles.json` shows a `node.size` binding reading `data.hours`.

## T44. Names on the drawing

- **Success (S):** every node carries its name as a label (A: `name` or `id`, which are the same
  text in Les Miserables; B: `name`, not `id`), and Cosette (A) or Lucy Grant (B) is readable on
  the last screenshot at the participant's own framing.
- **Success path (A, 8 steps):** 1. "No thanks". 2. Les Miserables. 3. Everything. 4. Style. 5. Text "+". 6. Label. 7. The label's column: `name`. 8. Zoom in, if needed, until a name reads.
- **Not a new finding:** the label drawn small at the default framing; the font with no fallback.

## T45. Ties apart from the people

- **Success (S):** A: exactly the 8 family ties drawn thick (wider than the 8 they start at) and
  red, every person and every other tie unchanged. B: exactly the 51 ties with 5 or more shared
  chapters thick and black, every character and every other tie unchanged.
- **Stacks that count:** a layer whose Edge tab has a category card on `kind` = family (A) or a
  number card on `shared_chapters` from 5 (B), with width and color on its Edge tab, and no node
  value. A layer that also writes a node look is F (people changed).
- **Success path (A, 15 steps):** file in (3 steps: neighbors.csv), "+", Layer, Enter, Edge tab,
  "Add a condition", `kind`, tick family ("8 of 30"), Done, Line "+", Width, type a width over 8,
  Color via Line "+", type `red`, Enter.
- **Detour to watch:** conditions added on the Node tab do not pick the layer's ties.
- **Final screen:** thick red ties; `styles.json` shows the edge part's selector and `edge.width`,
  `edge.color`; no `node.` value on the new layer.

## T46. One cluster in red

- **Success (S):** a Louvain run's clusters drawn in their colors, the cluster holding Javert (A)
  or Nebraska (B) bright red, every other cluster keeping its own distinct color, and its size said
  from the screen (A: 11 on 31e8c2387; B: 12 -- record both on the frozen build).
- **Stacks that count:** the group's own layer in the run's folder with its color changed (S); a
  new layer above whose condition picks that cluster (S); a layer of a hand selection (SD).
- **Success path (A, 13 steps, piloted in `pilot-materials/T46A/`):** 1. "No thanks". 2. Les
  Miserables. 3. Analyze. 4. Type `louvain`. 5. Enter. 6. Run (a "Louvain" folder of Group 1 to 6
  appears). 7. The find box, type `Javert`, Enter (Values, Memberships: Louvain Group 3). 8. The
  Louvain folder. 9. Expand it. 10. Group 3 (its row shows 11). 11. Style. 12. The color box. 13. Type `red`, Enter.
- **Final screen:** Group 3 red, the others in their colors; the answer 11.

## T47. Every cluster at once, colors kept

- **Success (S):** A: every node twice its starting size (2), every cluster's color unchanged.
  B: every node drawn as Box, every cluster's color unchanged.
- **Stacks that count:** the run's folder edited once (its Shape line, written to every group
  layer: S); each group layer edited one by one (S, steps counted); the Everything layer's size or
  shape (S, recorded as "around the folder": the group layers write only color, so it shows). Any
  cluster's color changed, or all clusters given one color through the folder's color field: F.
- **Success path (B, 13 steps, piloted in `pilot-materials/T47B/`):** 1. "No thanks". 2. College
  football. 3. Analyze. 4. `louvain`. 5. Enter. 6. Run (10 clusters). 7. The Louvain folder
  (Style shows "10 layers in Louvain", the Color line reads the purple "Layer" token with the
  clusters' swatches). 8. Shape "+". 9. Shape. 10. Open the shape list ("Node shape"). 11. Box.
  A: as B to step 9, then Size, type `2`, Enter.
- **Final screen:** cubes (B) or bigger dots (A) in ten (six) colors; `styles.json` shows each
  group layer with its own `node.color` and the new `node.shape` (or `node.size`).

## T48. Cluster colors on only some people

- **Success (S):** the clusters' colors drawn only on trained people (A, 15) or sources on the
  record (B, 12); every other node in the starting color; no cluster's color changed.
- **Stacks that count:** a `trained` (A) or `on_record` (B) card set to Yes on every cluster layer,
  added once on the folder's picker (S) or on each layer (S); a new layer above that paints the
  others back to `#6366F1` (SD: it covers, it does not pick).
- **Success path (A, 11 steps):** file in (3), Analyze, `louvain`, Enter, Run, the Louvain folder,
  Which nodes (open the picker), "Add a condition", `trained` (Yes; the count reads for the
  folder's layers together), Done.
- **Final screen:** 15 dots in cluster colors, 9 in the starting color.

## T49. Put it back

- **Success (S):** after the follow-up, the drawing and the style tree are as they were when the
  sample opened: the last line of `styles-steps.jsonl` has the same `look` as its first line with
  `graph: true`, and the red (A) or yellow (B) is gone.
- **Routes:** Undo (the arrow at the top, or Control+Z): S. Typing the old color back (`6366F1`):
  S only when the look matches exactly; a near color is F. Removing a layer the participant made:
  S when the look matches.
- **Success path (A, 6 + 1 steps, piloted in `pilot-materials/T49A/`):** 1. "No thanks". 2. Les
  Miserables. 3. Everything. 4. Style. 5. The color box. 6. Type `red`, Enter. `--end` gives the
  follow-up. 7. Control+Z (or the Undo arrow): the color reads `6366F1` again.
- **Final screen:** blue-violet dots; Everything's `node.color` is `#6366F1`.

## T50. What a colleague's color picks out

- **Success (S):** A: names the 3 orange characters (Mlle Baptistine, Mlle Gillenormand, Mlle
  Vaubois) and says what they share: "Mlle" in their name, read from the layer's conditions. B: says
  6 people are green and that they gave 30 or more hours and finished training, read from the
  layer's conditions. Both read from the screen.
- **SD:** the right rule after a wrong first reading corrected on screen. **F:** a rule guessed from
  the names alone (A) with no look at the conditions is F only if it is wrong; a right reading from
  the names alone (all three start "Mlle") is SD, recorded as "rule not read".
- **Success path (A, 6 steps):** 1. "No thanks". 2. "Open project or file", choose
  lesmis-poster.graphty.json. 3. The "Poster" layer. 4. Style: the picker's line reads "name
  contains Mlle, 3". 5-6. Hover the orange dots (or open the picker) to read the names.
- **Final screen:** the Poster layer's Style with its conditions shown; nothing changed
  (`changes.changed` empty).

## Change log

- 2026-10-17: Written for the first-use styling study; replaces the returning-user key of the
  earlier tier 3 drafts (git history only). Values checked on build `31e8c2387` by the pilots
  T41A, T46A, T47B and T49A in `pilot-materials/` and by `../tool/bars.mjs --tier 3`. T46 B names
  Nebraska, not Florida State: the file spells it `FloridaState`, so the find box finds nothing for
  "Florida State" and finds the University of Florida for "Florida".
