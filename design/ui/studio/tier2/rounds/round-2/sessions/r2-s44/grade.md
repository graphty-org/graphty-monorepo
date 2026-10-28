# Grade: session r2-s44 -- Elena (returning), task T4, dataset B (football)

Build: `8f0d5a6f7791 graphty@0.8.61` (session.json buildStamp), the round 2 study build named in
`criteria.md`. Start: empty. Files: players.csv, passes.csv.

## Grade: S

Graded from the last screenshot (`15.png`), the screens before it and the transcript, not from the
participant's rating (6 of 7).

- **Both files' rows are on the drawing.** After Load the header reads "players and passes", the
  inspector's subtitle reads "From 2 files", and Overview shows Nodes 11, Edges 18, Directed,
  Loaded weight "passes (closer)", Components 1 (`13.png`, `15.png`). Eleven dots are drawn.
  The participant chose "Add" for the unmatched row, and the answer key gives "With Add: 11 and
  18" as the correct counts for that choice (`08.png`: "10 node rows and 18 edge rows read; the
  load makes 11 nodes and 18 edges").
- **The counts are stated:** "11 players and 18 passing links", "players.csv had 10 rows and
  passes.csv 18 rows".
- **The unmatched row is named in full:** "line 17, Dina Moss s04 to "s11", 3 passes", a player
  not on the squad list, added with no name or position (`07.png`, `08.png`). This matches the
  key (line 17, `s04,s11,3`; s11 not in players.csv).
- The participant read the report before Load ("Show the 1 unmatched row", `07.png`), so there
  was no detour to find it. After Load they confirmed s11 and its edge with the find box
  (`14.png`: Nodes 1 "s11", Edges 1 "s04 -> s11") and confirmed the names arrived as an attribute
  (`15.png`: "s01, name: Ana Torres").

## Claims

- **No false "done".** "Every row arrived" is true for the choice made: Add kept the s11 row,
  so all 18 passes.csv rows are edges and all 10 players.csv rows are nodes, plus the added s11.
  The participant also said plainly that s11 has no row in players.csv.
- "with the pass counts used as how strong each link is" is true: Loaded weight "passes
  (closer)" (`13.png`).

## Wrong turns: 0

- Step 9 (`09.png`) is a tool miss, not a participant wrong turn: `--click "passes"` matched
  both the column header and the "Role of passes" select, and nothing happened. The next step
  named the control and worked. The session is not void: the tool did what the command said
  and the run went on.
- Steps 9 to 12 (making passes the weight and choosing "Higher means: Closer") are outside the
  task. The key asks graders to record a participant who stops to set the weight: this one did,
  deliberately, and it did not harm the result.

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 2 | The passes column comes in as a plain Attribute with "Weight: none (each edge counts 1)", and nothing on the import page suggests the count could be the weight. The participant had to think of opening the "Role of passes" dropdown on their own. | `08.png` "Weight: none (each edge counts 1)"; transcript step 8 "17 passes is not the same as 3"; known on this build (key, T4 Note). |
| 2 | Names are not drawn: the players' names come in as an attribute, the dots carry no labels, and the find box shows codes first ("s04 -> s11", "s01" over "name: Ana Torres"). The participant could not see who is who on the drawing. | `13.png` to `15.png`; transcript "I could not glance at the drawing and see who is who"; known on this build (key, T4 Note). |
| 1 | "Add a table" is a bare "+" with no words; the participant found it by guessing from the plural "Tables". | `04.png`, `05.png`; transcript "its small + button, which has no words on it". |
| 1 | "New from data..." gives no hint that it takes two spreadsheets; the participant called the choice "a lucky guess". | `01.png`, `03.png`; transcript, "What confused me". |
| 1 | The "Higher means" choice is explained with jargon (paths, PageRank, communities) before a choice is made, and the plain sentence after "Closer" uses an email example ("more emails between two people") on a football data set. | `11.png`, `12.png`; transcript steps 11 and 12. |
| 1 | Direction became "Directed" without the participant choosing it ("As the file says" was left as is); they accepted it but noticed they never chose it. | `12.png` Direction "As the file says"; `13.png` Direction Directed; transcript, last bullet. |
| 0 | Tool: `--click "passes"` was ambiguous between the column header and the role select and did nothing. A harness matter, not a product finding. | `09.png`; transcript step 9. |

## Bar notes

- Bar 2 (earlier work kept): start was empty; the end lists one source "players.csv and
  passes.csv" and the two default style layers (`work.json`). Nothing lost.
- Bar 4 (silent commit): Load visibly changed the screen (`12.png` to `13.png`), and the weight
  choice "Closer" changed the line to "Weight: passes (closer)" with a sentence (`11.png` to
  `12.png`). Not silent.
- Bar 5 (numbers that disagree): none. 11 nodes, 18 edges on the import summary and the
  Overview, with 11 dots drawn.
- The participant did not visit the Data page's Sources list after Load; not needed, because they
  read the unmatched row before Load.
- No build defect or implementation fault was hit in this session. Every problem above is a
  design or wording question, apart from the one tool miss.
