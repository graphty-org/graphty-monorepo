# Grade: session r3-s37 -- Tom (lab manager), what did I get, Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted, trackpad.
Graded from the last screenshot (09.png), the screenshots it depends on (03.png, 07.png, 08.png)
and the transcript, plus one scripted re-run on the same build. No files were saved, and the task
asks for none. Not from the participant's rating (6 of 7).

## Grade: SD (success with difficulty)

All four answers are right and each was read off the screen:

1. **Characters: 77.** Overview "Nodes 77" (02.png, still on 09.png); the Data panel "77 nodes"
   (03.png); the table "77 nodes" (08.png). Holds.
2. **Connections: 254.** Overview "Edges 254" (09.png); the edge table "254 edges" (07.png).
   Holds.
3. **Everyone can reach everyone: yes.** From "Components 1" (09.png). Correct, but stated as
   "I believe so ... fairly but not fully sure", because nothing on screen says what Components
   means. It is the right answer, not a confident wrong one.
4. **Recorded facts.** Characters: `id` and `name` (Attributes, 03.png; the table's "Columns: 2 of
   2", 08.png). Connections: `shared_chapters` (03.png; the edge table, 07.png, with From and To
   as the two ends). He also correctly tells the program's Degree (05.png) apart from the file's
   facts. Holds.

- **Why SD and not S:** every answer was on screen by step 3 (03.png), on the success path, but
  he could not trust the reachability answer from the word "Components" and spent six more steps
  trying to confirm it and the other facts (two hovers that showed nothing, a node click, a missed
  edge click, both table tabs). He finished with the reachability answer still hedged.
- **Route:** the success path (open the sample, Values > Overview, the rail's Data), then the
  table from the Data panel's edge source as a check.
- **Build-decided:** no. The success path worked. **Void:** no.
- **Failure codes:** none.
- **Usage card:** declined ("No thanks") without a detour, for a stated reason (he answers for
  where lab data goes). No wrong belief about what is sent.

## Counts

| | This session | Success path |
|---|---|---|
| Steps (real.mjs commands, after the start) | 9 (step 2 held 2 commands) | 3 |
| Wrong turns | 1 | -- |

- Wrong turn 1: step 6, a click aimed at an edge from Myriel. It missed (edges are hairline thin),
  dropped the selected node and was abandoned.
- The hovers at steps 4 and 9 looked for an explanation that does not exist; they are counted as
  steps, not wrong turns. The node click (step 5) and the two table tabs (steps 7-8) were checks
  whose results he used.
- Steps against the path: 9 / 3, 3x, outside the 2x measure. The excess is verification, caused
  by problems 1 and 2 below.

## False "done"

None. His closing claims ("I have what I came for"; the debrief's four answers) match 09.png,
07.png and 08.png. The reachability answer is marked as uncertain, which is honest, not a false
claim.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. Problems 2 and 3 were
reproduced by `rounds/round-3/repro/r3-s37/repro.sh`, which opens the sample and hovers
"Components" and the direction row. Its output is in `run/` and `run.log`: `run/03.png` and
`run/05.png` show the same clipped row and truncated label, and the tool reports `tooltip: null`
for both hovers.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | wording | "Components 1" is the only answer to "can everyone reach everyone", and nothing says what a component is: no tooltip, no plain sentence such as "all connected". He guessed right but would not repeat it without asking a colleague. A newcomer who guesses wrong gets the reachability question wrong. | Step 2, 02.png; step 4, 04.png (hover, `tooltip: null`); debrief. Repro `run/04.png`. |
| 2 | 2 | build-defect | The direction row in Overview shows only its value, "Undirected, from the file: directed 0", indented and running past the panel's right edge; its label "Direction" (the row's accessible name) is not visible. "directed 0" is unexplained (zero directed edges in the file) and there is no tooltip. | Step 2, 02.png; step 9, 09.png (hover, `tooltip: null`). Repro `run/03.png`, `run/05.png`, same on every run. |
| 3 | 1 | build-defect | The Overview label "Edges per ..." is cut off with no tooltip, so "1 to 36, mean 6.597" cannot be read as a degree range. Not needed for the task. | 02.png, 09.png. Repro `run/03.png`. |
| 4 | 1 | behavior | Source names in the Data panel are cut to "Les Mis...", "Node t..." and "Ed..." although the panel has room beside the counts; he had to guess a node table and an edge table until a tooltip confirmed "Edge table". | Step 3, 03.png; step 7, 07.png. |
| 5 | 1 | behavior | Edges are hairline thin and cannot practically be clicked with a trackpad; the missed click on empty canvas silently dropped the selected node and returned the panel to Overview. | Step 6, 06.png. |
| 6 | 1 | accessibility | Small grey captions ("77 nodes", "In the order loaded", the source row counts) are hard to read for a reader with reading glasses. Opinion, held one level down. | 07.png, 08.png; debrief. |
| 7 | 0 | opinion | Ids in the table are cut ("MlleBapt...", "MmeMa..."). Did not affect any answer. | 07.png, 08.png. |

**What worked:** the sample was one click from the start screen, and the start screen's "77
characters" already answered one question. Nodes, Edges and Components were on screen the moment
the drawing appeared. The Data panel's Attributes list and the table's "Columns: 2 of 2" / "3 of
3" let him say with confidence that nothing else is recorded. The counts agree everywhere he
looked (start screen, Overview, Data panel, table).
