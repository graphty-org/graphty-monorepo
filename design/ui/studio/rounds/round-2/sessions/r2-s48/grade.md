# Grade: session r2-s48 -- Tom (recipe recipient), T3 "Your own list of ties"

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). Started empty, 1440 x 900. Graded from the
last screenshot (08.png), the earlier screenshots it rests on (04.png, 06.png) and the transcript.
No files were downloaded (the task asks for none).

## Grade: S (success)

- **Success definition met.** The graph from friends.csv is drawn and the Overview reads Nodes 20,
  Edges 41, Directed (05.png, 06.png), the reference values. Tom states 20 people and 41 ties
  (steps 5, 6 and 8). He checked "nothing dropped" against two rows counts on screen: the import
  page's sentence "0 node rows and 41 edge rows read; the load makes 20 nodes and 41 edges"
  (04.png) and Data > Sources "friends.csv 41 rows, 41 edges" (06.png).
- **Why S, not SD:** the check rests on a rows count on screen, not on the Overview alone, and no
  role or dropdown was changed (he left every proposed role as it was). Going by "New from
  data..." instead of "Open project or file..." is an accepted route in the task's definition.
- **Failure codes:** none. **Build-decided:** no. **Void:** no.

## Counts

| | This session | Reference |
|---|---|---|
| Steps (real.mjs) to the success | 4 after the start to the drawing with the import sentence read (step 5, Load); 5 to Data > Sources (step 6) | 3 on round 2's build ("Open project or file...", upload, Data) |
| Steps in all | 7 after the start (02.png to 08.png) | -- |
| Wrong turns | 1 | -- |

The extra steps against the reference: dismissing the usage box (step 2, needed on either route)
and the import page route itself (one more click, Load), which is an accepted route.

Wrong turn:

1. Step 7 (07.png): pointed at a node to learn its name; nothing appeared (the tool reports the
   node "Omar" under the pointer and no tooltip). He recovered by clicking it (step 8). This came
   after the task was already met and is his own check that the dots are his people.

## False "done"

None. His closing claim ("20 people, 41 ties, 41 rows read and 41 made") matches the screens:
08.png shows Sources "41 rows, 41 edges"; 06.png shows Nodes 20 and Edges 41. His side claim that
Omar has 4 ties matches "Degree 4" in 08.png.

## Problems

Severity 0-4 (Nielsen). One participant each; none is a build defect, so no scripted repro was
needed.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | accessibility | The import page's key lines are set very small and in low-contrast gray: "Drop a file here, or choose a file...", "Choose a file first" beside the disabled Load, the "Each row is a node / an edge" switch, and the rows sentence. Tom (52, reading glasses) had to lean in. | Step 3, 03.png; step 4, 04.png |
| 2 | 2 | wording | The import page speaks only in "node" and "edge" and heads the preview with "node (20) --friends (41)--> node", which Tom read as a formula. "Each row is a node / an edge" asks a question he could not have answered had it not been pre-chosen. | Step 4, 04.png |
| 3 | 1 | wording | "Nothing was dropped" has to be worked out by comparing two numbers ("41 rows, 41 edges"); no line says that all rows were used and none skipped. | Step 6, 06.png; 04.png |
| 4 | 1 | wording | "Direction: As the file says" implies the file states a direction; a plain two-column list loads as "Directed" with arrowheads, and Tom wondered whether friendships were made one-way. The count is the expected one; the doubt comes from the words. | Step 3, 03.png; step 5, 05.png |
| 5 | 1 | behavior | Nodes carry no names and pointing at one shows nothing; the name appears only after a click selects it. | Steps 7-8, 07.png, 08.png |
| 6 | 1 | wording | "Degree", "Density 0.1079" and "Components 1" are unexplained terms in the Overview and node Summary; Tom ignored them or guessed. | Step 5, 05.png; step 8, 08.png |
| 7 | 0 | wording | The preview's "Line" column starts at 2 (the header is line 1), which made him double-take. | Step 4, 04.png |

What worked, for the record: "Files are read on this computer and never uploaded" and "Local only"
answered his first question (01.png); the import page proposed source, target and weight roles
correctly and gave the node and edge counts before Load (04.png); Data > Sources gives the rows
count after loading (06.png).
