# Grade: session r2-s49 -- Alex (intermediate graph analyst), T3 "Your own list of ties"

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). Started empty, 1440 x 900. Graded from the
last screenshot (06.png), the earlier screenshots it rests on (03.png, 04.png) and the transcript.
No files were downloaded (the task asks for none; there is no downloads folder).

## Grade: S (success)

- **Success definition met.** The graph from friends.csv is drawn and the Overview reads Nodes 20,
  Edges 41, Directed (03.png, 04.png), the reference values. Alex states 20 people and 41 ties
  (step 3 and the debrief). He checked "nothing dropped" against the rows count on screen: Data >
  Sources "friends.csv 41 rows, 41 edges" (04.png, still on screen in 06.png).
- **Why S, not SD:** the check rests on a rows count on screen, not on the Overview alone, and no
  role was changed. He reached Data through the "From friends.csv" link under the Graph heading
  instead of the Data rail button; both open the same page, so the route is equivalent.
- **Failure codes:** none. **Build-decided:** no. **Void:** no.

## Counts

|                                 | This session                                                                                                                        | Reference                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Steps (real.mjs) to the success | 3 after the start: decline usage data (02.png), open and upload in one step (03.png), "From friends.csv" to Data > Sources (04.png) | 3 on round 2's build ("Open project or file...", upload, Data) |
| Steps in all                    | 5 after the start (02.png to 06.png)                                                                                                | --                                                             |
| Wrong turns                     | 1                                                                                                                                   | --                                                             |

The one extra step against the reference is dismissing the usage box, which every route needs;
open and upload were issued as one command, so the success path itself took the reference length.

Wrong turn:

1. Step 5 (05.png, identical to 04.png byte for byte): pointed at a node to learn its name; nothing
   appeared (the tool reports the node "Omar" under the pointer and no tooltip). He recovered by
   clicking it (step 6, 06.png). This came after the task was met and is his own check that the
   dots carry his names.

## False "done"

None. His closing claims match the screens: Nodes 20 and Edges 41 (03.png, 04.png); Sources
"friends.csv 41 rows, 41 edges" (04.png, 06.png); Components 1 (04.png); the clicked node is
"Omar" with Degree 4 (06.png).

## Problems

Severity 0-4 (Nielsen). None is a build defect (no crash, dead control, wrong count or keyboard
gap), so no scripted repro was needed. Items 1 to 3 were also seen in session r2-s48 (Tom, T3), so
they are confirmed at two participants.

| #   | Sev | Kind     | Problem                                                                                                                                                                                                                                                                                                        | Evidence                       |
| --- | --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 1   | 1   | wording  | No line says that every row was used and none skipped. After loading, the Graph place shows only totals; the rows count that proves nothing was dropped sits on the Data page, reached through a small "From friends.csv" link, and even there it has to be worked out by comparing "41 rows" with "41 edges". | Step 3, 03.png; step 4, 04.png |
| 2   | 1   | behavior | Nodes carry no names and pointing at one shows nothing; the name appears only after a click selects it. On a 20-node file he expected names to be visible.                                                                                                                                                     | Step 5, 05.png; step 6, 06.png |
| 3   | 1   | wording  | A two-column source,target list loads as "Directed" with arrowheads; he read a who-knows-whom list as two-way and saw no place to say so. The counts are right; the doubt comes from the word and the arrows.                                                                                                  | Step 3, 03.png                 |
| 4   | 1   | behavior | Two pairs of nodes near the bottom of the drawing overlap (around x 570, y 755 and x 720, y 745), so counting dots on the picture gives fewer than 20; he relied on the panel instead.                                                                                                                         | Steps 3-6, 03.png to 06.png    |

What worked, for the record: "Files are read on this computer and never uploaded" and "Local only"
answered his first question beside the Open button (01.png); the CSV opened and drew at once with
no import step, with the right counts (03.png); the "From friends.csv" link led straight to the
import record with the rows count and the column types, weight as a number (04.png).
