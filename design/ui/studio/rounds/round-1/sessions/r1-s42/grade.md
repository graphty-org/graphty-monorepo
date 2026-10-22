# Grade: session r1-s42 -- Ruth, "What did I get?" on Les Miserables

**Grade: SD** (success with difficulty). All four answers are right and each was read off the
screen. It is SD rather than S because Ruth had to guess what "Components 1" means (nothing on
screen says it), and her one attempt to read the connections table opened a screen for loading a
new file instead.

The session ran on build `9d6598eea3e9 graphty@0.8.53`. No files were downloaded (the task needs
none).

## The four answers (4 of 4 right)

1. **77 characters.** `02.png`: Values > Overview reads Nodes 77. `14.png` (the last screenshot):
   the Data view's source line reads "77 nodes, 254 edges", and the node table "77 rows, 77 nodes".
2. **254 connections.** `02.png`: Edges 254; `14.png`: the edge table "254 rows, 254 edges".
3. **One component, so every character can be reached.** `02.png`: Components 1. Her answer: "I
   think yes -- 'Components 1', and the drawing is one piece. I'm inferring the meaning of
   'components'; nothing on screen said so." Correct and honestly hedged, not a confident wrong
   answer.
4. **Recorded facts.** `14.png`: Attributes list Nodes -> `id`, `name`; Edges -> `shared_chapters`.
   She named exactly these, and correctly worked out that Degree (shown on Valjean's panel,
   `08.png`) is counted by the program, not in the file. `13.png`/`14.png` add that
   `shared_chapters` is an amount from the file, on every connection, 1 to 31.

## Measures

- **Steps:** 13 `real.mjs` steps after the start (`02.png` to `14.png`), against a success path of
  2-3: about 4 to 6x. She had the four answers after step 6 (`09.png`); the rest was checking.
- **Wrong turns:** 3. Clicking the edge table in Data (`10.png`) opened "Add to Les Miserables"
  and needed Cancel; two clicks meant for a connection line hit empty canvas (`12.png`, `14.png`),
  and the first one deselected Valjean. The three hovers and the search for Valjean were checks,
  not wrong turns.
- **False "done":** none. Her closing "Mostly yes ... one rests on my guess" matches the screen;
  "77 rows became 77 nodes and 254 rows became 254 edges, so nothing was dropped" is what
  `09.png` shows. truth_on_screen: not applicable.
- **Counts against the drawing (bar 5):** none disagree; Overview, Data and the start page's "77
  characters" all agree.
- **Usage card:** declined with "No thanks" at step 2, no detour.
- **Tool prints:** step 3 `--hover "Components"` printed ambiguous (2 matches) and timed out;
  step 4 `--click "Find nodes, edges, values"` found nothing by the search box's placeholder text.
  Both were redone by coordinates and worked as a person's click would, so not a tool fault. The
  second may mean the search box has no accessible name beyond its placeholder; worth checking in
  the automated accessibility check.
- **Build-decided:** no. **Void:** no.

## Problems

| #   | Severity | Kind         | Problem                                                                                                                                                                                                                                                                                                       | Evidence                          |
| --- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 1   | 3        | build-defect | Clicking the "Edge table" source row in Data opens "Add to Les Miserables" (a file loader) instead of showing that table's rows. The control does something unrelated to its label, and there is no other way to read the connection rows from Data. Not yet reproduced as a scripted path, so not confirmed. | step 7 `10.png`                   |
| 2   | 2        | wording      | "Components 1" is unexplained and hovering it shows nothing; a first-time user can only guess that it means "everyone is reachable". This is what made the session SD.                                                                                                                                        | steps 3 `03.png`-`05.png`         |
| 3   | 2        | behavior     | The direction line "Undirected, from the file: directed 0" runs into the panel's right edge and "directed 0" means nothing to her; "Edges per ..." is cut off.                                                                                                                                                | `02.png`                          |
| 4   | 2        | behavior     | Connection lines are too thin to click; two tries hit empty canvas and the first dropped the selected character. She never saw one connection with both names and its `shared_chapters` value.                                                                                                                | step 9 `12.png`, step 11 `14.png` |
| 5   | 1        | behavior     | Source names in Data are truncated ("Les Mis...", "Node t...", "Ed...") although the panel has room for the counts.                                                                                                                                                                                           | `09.png`, `14.png`                |
| 6   | 1        | wording      | Nodes, Edges, Density are not her words; she mapped nodes to characters only because the start page said "77 characters".                                                                                                                                                                                     | `02.png`                          |
| 7   | 1        | behavior     | The selected node panel lists Degree beside `id` and `name` with nothing saying it is computed rather than from the file; she resolved it only by comparing with the Data attribute list.                                                                                                                     | `08.png`                          |
| 8   | 1        | opinion      | No names drawn on the dots, so a character can be found only by typing a name already known.                                                                                                                                                                                                                  | `02.png`                          |
