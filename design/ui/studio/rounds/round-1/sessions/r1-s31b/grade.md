# Grade: session r1-s31b -- Dev, his own list of ties (friends.csv)

**Grade: S** (success). The file was drawn with the expected counts, Dev stated 20 people and 41
ties, and he checked that nothing was dropped against a rows count on screen, not against the
Overview alone.

## Against the success definition

1. **Graph from friends.csv drawn.** `03.png`: drawn straight after the upload, no import page.
   Overview reads Nodes 20, Edges 41 (the reference values).
2. **Counts stated.** Transcript at `03.png`: "Nodes 20, Edges 41 ... That matches the task."
3. **Nothing dropped, checked against a rows count.** `04.png` (last screenshot), Data > Sources:
   "friends.csv 20 nodes, 41 edges"; node table "20 rows, 20 nodes"; edge table "41 rows, 41
   edges". Dev: "Rows in equal nodes/edges out, so nothing dropped." That is the check the task
   asks for. No roles were changed.

No files were saved, and the task needs none.

## Measures

- **Steps:** 3 steps after the start: "No thanks" on the usage card (`02.png`); "Open project or
  file..." with the upload (`03.png`); "Data" (`04.png`). The success path is 3, plus the usage
  card that every session must answer, so 1.0x.
- **Wrong turns:** 0.
- **False "done":** none. "Finished" matches `04.png`, which shows the rows counts he cites.
  truth_on_screen: not applicable.
- **Build-decided:** no. **Void:** no.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | The drawing shows no names on the nodes after the upload, so Dev cannot tell who is who in his own friendship network. He judges success by the figure and the figure is anonymous. | step 3 `03.png`, step 4 `04.png` |
| 2 | 2 | wording | In Data > Sources the two table names are cut off ("Node ...", "Edge t...") while the counts beside them are shown in full; the name of the table is the part the reader needs to tell the rows apart. | step 4 `04.png` |
| 3 | 1 | opinion | The Overview gives counts but says nothing about whether every row arrived; Dev found the rows count only by going to look for proof in the Data place, which he did not know existed. | step 3 `03.png`, step 4 `04.png` |
| 4 | 1 | opinion | "Direction: Directed" surprised him for a friendship list, which he thinks of as two-way. The file was read as directed with no question asked; correct for the data, but nothing on screen says how to change it. | step 3 `03.png` |

None of these is a build defect under the criteria (no crash, dead control, wrong count or
keyboard block), so no scripted repro was needed. Problems 1 and 2 count toward confirmation as
behavior and wording if another participant meets them.
