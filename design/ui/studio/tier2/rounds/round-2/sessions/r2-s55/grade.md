# Grade: session r2-s55 -- Jordan (returning), Les Miserables (T12R A), one person and who they are tied to

**Grade: S** (success). The last screen (`05.png`) shows Javert's Neighborhood view: header "Javert"
over "Neighborhood", "Back to Javert", the heading "Javert and 17 connections", Hops 1/2/3 with 1
chosen, "Filter to neighbors", and the 17 names Babet, Bamatabois, Claquesous, Cosette, Enjolras,
Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier,
Toussaint, Valjean, Woman1, Woman2. The left panel's Selection reads 18. Jordan named all 17 from that
list and said 17. He read two facts about Javert on the node's Values tab (`04.png`): Degree 17
and PageRank "0.0303, #5 of 77". Route: the find box, the node row, then the Degree row (he clicked
the word, not the chevron). This is the key's Degree route, with no detour.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `lesmis-ranked.txt` (Les Miserables ranked by PageRank, PageRank
inspector open on its Style tab, `01.png`), as the task specifies.

## The answer against the key

- **Javert selected (right).** `04.png`: inspector header "Javert / Node", Selection 1, his dot
  haloed.
- **A fact read (right).** `04.png`: Degree 17; Results PageRank "0.0303, #5 of 77", matching the key.
- **Neighbors by name from the screen (right).** `05.png` lists all 17 names, spelled exactly as
  in the key. The debrief repeats them all and gives the count, 17. These are not names from
  memory, ids or a count with no names behind it.
- **Not partial.** The neighbors were read from the Neighborhood list, not from the find box's edge
  rows or by clicking dots, so this is not SD.

## Measures

- **Steps:** 4 `real.mjs` steps after the start (`02.png` to `05.png`). Three of them did something.
  Step 3 was refused by the tool and changed nothing (`03.png` is byte-identical to `02.png`). The
  key's path on this build is 4 steps (`/`, type, Enter, Degree). Jordan clicked the find box
  instead of pressing `/` and clicked the node row instead of pressing Enter, which is the same
  count. 1.0x, not counting the refused step.
- **Wrong turns:** 0. He never picked a tie instead of the node, never pressed Down arrow, and
  never used "Filter to neighbors" or Hops.
- **False "done":** none. "That's my answer, so I'm done" (step 5) is true: Javert, a fact, all 17
  names and the count are on screen. truth_on_screen: holds.
- **Ease (from the transcript):** 7 of 7. It was not used for the grade.
- **Broken habit:** none. The habit from his history (find box, the name, the Degree row, read the
  list) still worked on this build. The new Hops and "Filter to neighbors" controls did not get in
  his way.
- **Route recorded:** Degree row, clicked on the word "Degree".
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, and the tool named the
  ambiguous match it refused. `work.json` shows nothing gone: the same run, layers and source at
  start and end.
- **Scripted exit:** not applicable. He finished.

## Problems

| #   | Severity | Kind               | Problem                                                                                                                                                                                                                                                         | Evidence                                                                                              |
| --- | -------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | 1        | visibility         | Opening the connections list selects the whole neighborhood without asking. Selection goes from 1 to 18 with no message. Jordan noticed only because the number on the left jumped, and he said he "didn't ask for it". It did not change his answer.         | `04.png` Selection 1, `05.png` Selection 18; transcript step 5 and debrief                             |
| 2   | 1        | scanning           | Under one "Javert" node row, the find list shows 17 "Javert -- X" edge rows. Jordan said the person's own row "is easy to miss among them". He still picked it.                                                                                                     | `02.png`; debrief                                                                                     |
| 3   | 1        | comprehension      | Jordan did not know what "Filter to neighbors" would do to his drawing, so he left it alone. The label alone does not say that it hides the other nodes. The tooltip that says so appears only on hover, and he did not hover.                                                              | `05.png`; debrief                                                                                     |
| 4   | 1        | accessibility-name | The node row and all 17 edge rows match the name "Javert", so the tool refused the click and nothing happened. A pointer user would just click the top row, but a voice-control or name-based user meets the same ambiguity. It cost one step.                      | `03.png` (unchanged from `02.png`); transcript step 3                                                 |
| 5   | 0        | visibility         | On the list's first screen, two controls look lit at once: Hops "1" has a solid white fill, and the first neighbor, Babet, has a gray fill. The gray fill is a hover from the pointer, which is still resting where Degree was clicked. Jordan did not mention it. | `05.png`                                                                                              |
| 6   | 0        | visibility         | On the drawing, Javert wears the same yellow glow as his 17 neighbors, so the person asked about is not set apart. Jordan read the glow as "his circle" and was not misled.                                                                                         | `05.png`; transcript step 5                                                                           |

There is no problem of severity 3 or 4. The answer was right and complete, the habitual route still
worked, and every doubt Jordan raised was about a side effect or a new control he did not need.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person, so a pass here is weak evidence. A simulated returning
user is likely to be faster than a real one on a route its history names, and this route is one
of those.
