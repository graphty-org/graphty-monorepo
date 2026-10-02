# Round 7 grades: bringing a colleague's Les Miserables file into graphty

The task: a colleague emailed a network of the novel's characters; bring it into graphty. The
participant is not told that the file is broken. The file (miserables-edited.graphml) gives two
nodes the same id (11, lines 48 and 212) and has three edges ending at a node 80 that does not
exist (lines 590, 611 and 640), so graphty must refuse it.

What counts as success: the participant reads the refusal and can say which rows are at fault
and what to fix. Success with difficulty: reads it only after a second try. Failure: believes the
file loaded, with the gaps unknown.

The designed path is: the start screen with recent projects -> Open project or file... -> the
Data page showing the refusal ("miserables-edited.graphml has two nodes with the id 11 ...",
Load turned off, "Choose another file...").

Grades are decided from what ended on screen and what the participant concluded, not from their
own rating.

## The task could not be completed in this skeleton

On the start screen with recent projects, "Open project or file..." goes straight to the clean
Les Miserables project (77 nodes, 254 edges, from miserables.gexf, with PageRank, Louvain and the
other layers already applied). "New from data..." goes to the door-entries sample, and the drop
hint goes to the drag-over state. No control on that screen, and none on the screens after it,
leads to the refusal. Both participants clicked the right door first and were shown a file that
loaded perfectly, so no participant could see the refusal whatever they did.

The grades below still follow the rubric, because the rubric is about what ended on screen and
what was concluded, and both participants concluded "it loaded intact". But these two failures
are a wiring gap in the skeleton's start screen, not evidence about the refusal's design. The
refusal screen itself is untested this round. Fix: in the task's start state, have "Open project
or file..." (or a file picker standing in for the emailed attachment) lead to the refused-ids
state, then rerun the task.

## Grades

| Participant | Their rating | Grade | Why |
|---|---|---|---|
| Explorer Elena | success with difficulty | failure | Ended on the clean project with the node table open ("77 nodes") and concluded "It's in." Never saw a refusal; believes the file loaded complete. |
| Gephi holdout | success | failure | Ended on the Data page of the clean project (miserables.gexf, 77 nodes, 254 edges), checked counts and weights and concluded "It is in. Counts match." Never saw a refusal; believes the file loaded intact. |

Outcome count: 0 success, 0 success with difficulty, 2 failure, 0 gave up. Both failures are
caused by the unreachable target state, so the round produces no grade on the refusal itself.

## Findings that still stand (about the screens they did reach)

These come from screens the participants really used, so they are valid evidence even though the
task target was not reached.

1. Opening a file does not say which file was opened (2 of 2). Elena could not tell her file from
   the sample: "Open" and the Les Miserables sample card give the identical screen. The holdout
   found the file name only by going to the Data page (Sources: miserables.gexf) and the
   inspector's "from miserables.gexf" link. Nothing on arrival says "opened miserables.gexf".
   Severity 3 (major): for this exact task, "which file did I get?" is the question that a
   refusal or a partial load turns on.
2. A freshly opened file arrives already analyzed (2 of 2). Both asked whether the app or the
   colleague ran PageRank, Louvain, shortest paths, a watchlist and a report folder. Elena met
   five unknown terms on her first screen; the holdout wanted the parameters. This is partly a
   fixture choice (the opened file is a saved project), but no screen says whose work the layers
   are. Severity 2 (minor) as a fixture, 3 if a plain data file really opened this way.
3. "Attributes" does not separate what came from the file from what was computed (1 of 2, the
   holdout). "In use", "Other attributes" and "Results" mix file columns (label, group) with
   computed ones (degree, betweenness), so checking "did the import drop anything" needs a plain
   list of the file's own columns. Severity 2.
4. "New from data..." on this screen opens an unrelated sample (door entries) instead of a
   picker (1 of 2, Elena, who backed out). This is the same stand-in wiring as the main gap.
   Severity 2 as a skeleton defect; it reads to a participant as somebody else's data.
5. What built trust in the load was the table count plus its summary sentence, and the Data
   page's counts and "(full graph)" labels, not the canvas (2 of 2). Positive finding: the
   refusal design should keep using counts and line numbers, which it already does.

Single-voice observation, not a finding: Elena read Javert and Valjean sitting together as
"allies"; placement shows shared chapters, not sides.
