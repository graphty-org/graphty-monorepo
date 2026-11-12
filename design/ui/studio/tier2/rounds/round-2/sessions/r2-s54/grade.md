# Grade: session r2-s54 -- Dana (returning regular analyst) reads the Station-Stadium bus link and makes its two stops stand out (T24 B, bus-stops.csv)

**Grade: S** (success).

- **The number is right and was read from the screen.** One click on the line (757,160; the tool
  printed `edge with id "15"`) opened the edge inspector "Station -> Stadium", subtitle "Edge",
  From Station, To Stadium, minutes 4, with the line drawn with a blue band and the Selection row
  at 1 (`02.png`). Dana answered 4 minutes, the answer key's value.
- **Station and Stadium, and no other stop, stand out at the end.** She took the key's success
  path to the selection ("Edge actions", "Select endpoints"; `03.png`), which left exactly the two
  ringed in yellow, "2 nodes selected", Nodes 2, "Edges joining these nodes 1", Selection row 2
  (`04.png`). That already met S. She then gave the selection a color of its own (selection Style
  tab, "Add to Fill", "Color"; `05.png` to `07.png`) and clicked empty canvas to check it held
  (`08.png`).
- **The end state is a color, not a selection.** The answer key's S names a selection, but it
  grades other routes by their end state, and the task asks only that the two "stand out". The
  last screen (`08.png`) shows Station and Stadium blue-purple and every other stop in the
  PageRank orange, a "2 nodes" layer in the left list and "Color: 2 nodes" on the key. That
  separates exactly the two, and it survives a click elsewhere. Graded the same way as the earlier
  T24 session that also ended on a color layer after reaching the selection (round 1, r1-s51). The
  steps after `04.png` were a choice to make the mark lasting, not a detour: no missed click, no
  wrong tie opened, nothing undone.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), 1440 x 900, no uncommitted changes:
the frozen build named in the criteria. The setup ran `bus-stops-ranked-names.txt` and ended on
the Everything inspector as the key says. Every screenshot matches its command. Not void.

## What the last screen shows (`08.png`)

- Station and Stadium drawn blue-purple; the other eight stops in the PageRank shading (Harbor
  darkest and largest).
- Left list: Selection (no count), "2 nodes", PageRank 10, Everything.
- Key at the top left: "Color: 2 nodes" with a purple square, then "Size: PageRank" and "Color:
  PageRank", both 0.04282 to 0.3273. The taller key covers the top of the "Depot" label; the word
  still reads.
- Right panel on the graph Overview: Nodes 10, Edges 17, Directed, Density 0.1889, Components 1.
- No selection, no filter; all 10 stops drawn.

## Claims

- "So the link takes 4 minutes" (`02.png`): true, the inspector reads minutes 4.
- "Station and Stadium are still blue and nothing else is ... so I am done" (`08.png`): true.
- **False "done" claims: 0.**

## Wrong turns: 0

Every move went forward: the line click, the actions button, Select endpoints, the selection's
Style tab, Add to Fill, Color, and a check click on empty canvas.

## Measures

- **Clicked the line itself:** yes, first try (757,160, between the key's 762,145 and the older
  752,170 point; it landed on the line, not on the "Stadium" label).
- **How she got from "the two on this link" to "Select endpoints":** she opened the three-dot
  button beside the inspector title on a guess ("I will try that to see if it offers something for
  the two stops"), and read "endpoints" as "the two ends of a link are the two stops" (`03.png`).
- Steps: 7 (key's success path: 4). Ease (self-rated, not used in grading): 6 of 7.
- Did not read the tie as running the other way or to another stop; no "on 20 nodes" issue (no
  filter step on this task).

## Problems

| # | Severity | Problem | Evidence |
|---|----------|---------|----------|
| 1 | 2 | The style layer made from a selection is named only "2 nodes", in the left list and on the drawing's key ("Color: 2 nodes"). Neither says which two stops or why, so the key does not explain the mark to someone reading the picture later. Dana looked for a way to name it and did not see one at a glance. | `07.png`, `08.png`; wrap-up: "If I came back next month I would not know which two or why." |
| 2 | 1 | Nothing tells the reader whether the selection's yellow ring is a lasting mark or goes away on the next click. Dana was unsure the ring counted as "standing out" and added a color layer to make sure (3 extra steps). Opinion and an unneeded detour that did not hurt the outcome; held one level down. | `04.png`; transcript at `04.png`: "a glow from clicking feels like it will vanish the moment I click somewhere else." |
| 3 | 1 | "Select endpoints" is a technical word; Dana guessed its meaning correctly but said "Select Station and Stadium" or "Select both stops" would have been plain. Opinion only, path completed; held one level down. | `03.png`; wrap-up first bullet. |
| 4 | 1 | When the key grows a row, its box covers the top of the "Depot" label. The word still reads, so nothing needed to act is hidden. | `08.png` (compare `02.png`, where "Depot" is clear). |

No severity 3 or 4 problem in this session.

## Notes for the round

- A second T24 session ends on a lasting color layer instead of a selection, after reaching the
  selection first (here because the selection ring looked temporary). The answer key's S wording (a selection) does not name this end state; the task's "stand out" does
  cover it.
- The simulated participant is told she has used the program before; she was no faster than a new
  user on the edge menu, which her history does not name.
