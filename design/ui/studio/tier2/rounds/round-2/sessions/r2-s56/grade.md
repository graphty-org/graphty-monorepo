# Grade: session r2-s56 -- Ruth (returning), Florentine families (T12R B), one family and who they are tied to

**Grade: S** (success). `04.png` shows the Medici Neighborhood view: header "Medici" over
"Neighborhood", "Back to Medici", the heading "Medici and 6 connections", Hops 1/2/3 with 1 chosen,
"Filter to neighbors", and the six names Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati,
Tornabuoni, with Selection 7. Ruth named all six from that list and said six. She read facts about
the Medici on the node's Values tab (`03.png`): id and name Medici, Degree 6, PageRank "0.1458, #1
of 15", all matching the key. Route: the find box, the node row, then the Degree row (the word, not
the chevron). This is the key's Degree route, with no detour.

**The last screenshot (`06.png`) is not the Medici list.** After reaching the answer she clicked
Ridolfi in the list and opened Ridolfi's connections ("Ridolfi and 3 connections": Medici, Strozzi,
Tornabuoni) to check one marriage from the other side. That check is correct and changes nothing in
the answer; the answer itself was on screen in `04.png` and the transcript names it from there. As
in this round's other graded sessions whose answer was read on an earlier screen and confirmed in
the transcript, the grade rests on `04.png` plus the transcript, and `06.png` is consistent with it
(Medici heads Ridolfi's list).

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900, no uncommitted changes. Start: setup `florentine-ranked.txt` (Florentine families
ranked by PageRank, sized and colored by it, no names drawn, `01.png`), as the task specifies.
`session.log` is empty: no script, console or request errors. Not void.

## The answer against the key

- **Medici selected (right).** `03.png`: inspector header "Medici / Node", Selection 1, the dot
  haloed.
- **A fact read (right).** `03.png`: Degree 6; Results PageRank "0.1458, #1 of 15".
- **The six families by name from the screen (right).** `04.png` lists Acciaiuoli, Albizzi,
  Barbadori, Ridolfi, Salviati, Tornabuoni, spelled exactly as in the key; the debrief repeats all
  six and gives the count.
- **Not partial.** She saw the six "Medici -- X" ties in the find list first (`02.png`) and said so,
  but she did not answer from them: she went on to the Neighborhood list and answered from it. So
  this is not the key's SD for neighbors read from the ties.
- `work.json`: start and end identical (one PageRank run labeled Influence, three layers, one
  source); nothing gone.

## Measures

- **Steps:** 5 `real.mjs` steps after the start. The answer was on screen after 3 (`02.png` click
  and type in the find box, `03.png` the node row, `04.png` Degree), against the key's 4 on this
  build (`/`, type, Enter, Degree); clicking the box instead of `/` and the row instead of Enter
  folds one step. The last 2 (`05.png`, `06.png`) were a deliberate cross-check, not a search.
- **Wrong turns:** 0. She never picked a tie instead of the node, never pressed Down arrow, never
  touched Hops or "Filter to neighbors". The Ridolfi check was chosen and worked.
- **False "done":** none. "Finished: yes" with six named families is true; Medici, a fact, all six
  names and the count were on screen (`03.png`, `04.png`). truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Broken habit:** partial and recovered. Her history says she read the list of connections
  "on the right-hand side"; on this build the list is one click behind the Degree row. She noticed
  ("I don't see the list of connections I used to read here"), took the chevron as the only thing
  to press, and found it at once.
- **Route recorded:** Degree row, clicked on the word "Degree".
- **Implementation defects hit:** none. Every screen matches the key's description of this build
  (find list with "Nodes 1" and "Edges 6", Values tab with Summary and Results, the Neighborhood
  view, Selection n + 1). No control failed to respond and no step was refused.
- **Earlier work kept:** yes, `work.json` shows nothing gone.
- **Build-decided:** no. **Void:** no. **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                    | Evidence                                                                 |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | 1        | visibility      | Opening the connections list selects the whole neighborhood without asking: Selection goes from 1 to 7 with no message, and clicking a neighbor resets it (1, then 4 on Ridolfi's list). Ruth noticed and said she would have been surprised had she been about to act on "the selection". Seen also in r2-s55, so confirmed (2 participants). | `03.png` Selection 1, `04.png` 7, `05.png` 1, `06.png` 4; debrief        |
| 2   | 1        | discoverability | The node's Values tab shows "Degree 6 >" but nothing labeled "connections" or a list of names; the returning user's habit (read the list on the right) needs one click whose purpose the screen does not name. She found it by elimination ("the arrow was the only thing to press").                          | `03.png`; transcript step 3, debrief                                     |
| 3   | 1        | comprehension   | "Hops 1 2 3" carries no explanation of what a hop is; she guessed 1 meant direct ties and left it.                                                                                                                                                                                          | `04.png`; debrief                                                        |
| 4   | 0        | comprehension   | PageRank "#1 of 15" does not say what it ranked over or which run produced it. Not needed for this task.                                                                                                                                                                                   | `03.png`; debrief                                                        |
| 5   | 0        | visibility      | Two controls look lit at once on the list's first screen: Hops "1" (white fill) and the first neighbor (gray hover fill from the resting pointer), as the key describes. She did not mention it.                                                                                            | `04.png` (Acciaiuoli), `06.png` (Medici)                                 |
| 6   | 0        | visibility      | On the drawing the family asked about wears the same yellow glow as its neighbors, so Medici is not set apart from the six. She read the rings correctly.                                                                                                                                  | `04.png`; transcript step 4                                              |

No severity 3 or 4: the answer was right and complete on the first route, the only habit change
cost one click she worked out alone, and every confusion she raised was about a side effect or a
control she did not need.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
