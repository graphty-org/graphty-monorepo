# Grade: session r3-s55 -- Ruth (tier 1 graduate, returning), Les Miserables (T12R A), one person and who they are tied to

**Grade: S** (success). `05.png` shows Javert's Neighborhood view: header "Javert" over
"Neighborhood", "Back to Javert", the heading "Javert and 17 connections", Hops 1/2/3 with 1
chosen, "Filter to neighbors", and the 17 names Babet, Bamatabois, Claquesous, Cosette, Enjolras,
Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier,
Toussaint, Valjean, Woman1, Woman2, with Selection 18 and the 17 neighbors haloed on the drawing.
Ruth named all 17 from that list, spelled as on screen, and said 17. She read facts about Javert
on the node's Values tab (`04.png`): id and name Javert, Degree 17, PageRank "0.0303, #5 of 77",
all matching the key. Route: the find box, the node row (by Enter on the highlighted first row),
then the Degree row (the word "Degree", not the chevron). This is the key's Degree route, with no
detour.

**The last screenshot (`06.png`) is not the neighbor list.** After reaching the answer she typed
Javert again and opened the tie "Javert -- Valjean" to learn what a tie means: the edge inspector
reads From Javert, To Valjean, shared_chapters 17, and the tie is drawn blue. That check is
correct, changes nothing in the answer and does not alter the graph (`work.json`: start and end
are identical, nothing gone). The answer was on screen in `05.png` and the transcript names it
from there; as in the earlier graded T12R sessions whose last screen was a later check
(`../../round-2/sessions/r2-s56/grade.md`), the grade rests on `05.png` plus the transcript, and
`06.png` is consistent with it (Valjean is one of the 17; the tie's 17 is shared chapters, not a
neighbor count, and she kept the two apart).

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900, no uncommitted changes. Start: setup `lesmis-ranked.txt` (PageRank run, nodes sized
and colored by it, no names drawn, `01.png`), as the task specifies. `session.log` and
`setup.log` are empty: no script, console or request errors. No leaks (`leaks.json`: 0 calls).
Not void.

## The answer against the key

- **Javert selected (right).** `04.png`: inspector header "Javert / Node", Selection 1, his dot
  haloed. Selecting him did not move the camera, as the key says for this build.
- **A fact read (right).** `04.png`: Degree 17; Results PageRank "0.0303, #5 of 77".
- **Neighbors by name from the screen (right).** `05.png` lists all 17, spelled exactly as in the
  key; the debrief repeats them all and gives 17. Not names from memory, not ids, not a count with
  no names behind it.
- **Not partial.** The neighbors were read from the Neighborhood list, not from the find box's
  edge rows or by clicking dots, so not SD. Her count was cross-checked against "Edges 17" in the
  find list (`02.png`) and Degree 17, both right; she did not take 6 from the visible tie rows.
- **Traps the key names:** she did not press Down arrow by habit (so did not open a tie instead
  of the node); she did not confuse Degree 17 with the Javert -- Valjean tie's shared_chapters 17
  (she called them "two different 17s").

## Measures

- **Route:** find box clicked and "Javert" typed in one step (`02.png`: "Nodes 1" Javert,
  "Edges 17" with six ties in view); a click on the text "Javert" (`03.png`, identical to
  `02.png`); Enter on the highlighted first row (`04.png`); "Degree" (`05.png`); then the tie
  check (`06.png`).
- **Steps:** 5 after the start (`02.png` to `06.png`); 4 to the answer (`05.png`), one of which
  did nothing. The key's path is 4 (`/`, type, Enter, Degree); hers to the answer is the same
  length with the step that did nothing in place of `/`.
- **The step that did nothing (`03.png`) is a tool refusal, not a wrong turn.** `real.mjs`
  refused `--click "Javert"` as ambiguous: the find list held 18 matches for that text (the node
  row and the 17 tie rows, each containing "Javert"), so nothing was clicked and the screen did
  not change (03.png and 02.png are the same image, 133079 bytes each). A sighted person would
  click the top row; the tool's exact-target rule, not the app, made this a step. Not counted as
  a wrong turn, and not a void: the run did not fail, and the next step reached the node.
- **Wrong turns: 0.** The tie opened in step 5 was a deliberate check of what a tie means, made
  after the answer was on screen, not a detour toward it.
- **False "done": none.** Every final claim holds on screen: 17 named characters (`05.png`),
  degree 17 and PageRank 0.0303, #5 of 77 (`04.png`), Javert -- Valjean shared_chapters 17
  (`06.png`). truth_on_screen: holds.
- **Route recorded for the round comparison:** Degree row, by the word (not the chevron), reached
  by remembering the arrow from her history ("Last time that opened who they're tied to").
- **Ease (from the transcript):** 6 of 7. Not used for the grade.

## Problems

1. **Nothing on the node or its neighbor list says what a connection is. Severity 2.** Evidence:
   `04.png` "Degree 17" and `05.png` "Javert and 17 connections" never name the relation; the task
   asks who he "shares chapters with", and Ruth said "Says who? Nothing here says a tie means
   sharing a chapter." She had to retype the name and open one tie (`06.png`, "shared_chapters
   17") to answer that from the data: one extra round trip, done correctly. No wrong conclusion,
   so not higher.
2. **Two different 17s sit one click apart. Severity 1.** Evidence: Degree 17 and "Javert and 17
   connections" (`04.png`, `05.png`) against the Javert -- Valjean tie's shared_chapters 17
   (`06.png`). Ruth noticed and kept them apart ("Easy to mix up when reading a number to an
   editor"); the key names this trap. Not acted on wrongly here.
3. **The neighbor list gives names only, no per-tie value. Severity 1 (opinion, held down one
   level).** Evidence: `05.png` lists 17 bare names; Ruth: "To see how many chapters each one
   shares with him, I would have to open each tie one at a time." Outside the task's question.
4. **The find list mixes the person with every tie containing the name. Severity 1.** Evidence:
   `02.png` "Nodes 1: Javert" over "Edges 17", every row containing "Javert"; picking the person
   took Enter on the marked first row. For a sighted person a click on the top row works, so the
   cost observed here comes mostly from the tool's exact-target rule (see Measures), not from the
   app.

Not studied, as every tier 2 report says: keyboard-only and screen-reader access are untested by
sessions. The participant is simulated; this pass is weak evidence until real people confirm it.
