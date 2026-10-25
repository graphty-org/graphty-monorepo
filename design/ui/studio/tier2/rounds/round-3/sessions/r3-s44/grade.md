# Grade: session r3-s44 -- Jordan (regular analyst), bus stops (T24 B), one tie on the drawing

**Grade: SD** (success with difficulty). Jordan's answer, "The Station-Stadium link takes 4
minutes", matches the key (4). The last screenshot (`08.png`) shows exactly the two ends selected:
Station and Stadium carry yellow halos and no other stop does; the inspector reads "2 nodes
selected" (subtitle "Selection"), Summary Nodes 2, "Edges joining these nodes 1"; the left
panel's Selection row reads 2. That is the key's end state. It is SD, not S, because the two were
selected only after a detour: three clicks that tried to build the selection one stop at a time
and each left one stop selected (`04.png` to `06.png`), before Jordan went back to the tie and
used "Select endpoints" (`07.png`, `08.png`).

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900, tool commit `acf3894e2c56`, no uncommitted changes. Start: setup
`bus-stops-ranked-names.txt` (session.json's setup list: bus-stops.csv loaded, PageRank run and
drawn as size and color, id labels on, all labels shown), ending on the Everything inspector
(`01.png`). `leaks.json` shows no leaks.

**The session record.** `transcript.md` holds only the End command and Jordan's own words; the
per-step log (commands and what was seen at each step) is not there, and `session.log` is empty,
as in the neighboring sessions. The eight screenshots, `session.json`, `work-start.json` and
`work.json` are complete and agree with each other, so the run itself did not fail and the
session is not void. The steps below are read from the screenshots, with the order of the
selection attempts taken from Jordan's own note ("Shift-click and Ctrl-click both just swapped
which stop was selected").

## The answer against the key

- **The number (right, read from the screen).** `03.png`: a click on the line opened the edge
  inspector "Station -> Stadium", subtitle "Edge", Summary From Station, To Stadium, minutes 4;
  the line drawn with a blue band; Selection row 1. The click landed on the line on the first
  try (no near miss).
- **The two ends (right, after a detour).** `04.png`: Station alone selected (node inspector,
  PageRank 0.05495, #7 of 10). `05.png`: Stadium alone selected; Station lost its halo
  (Selection 1). `06.png`: Station alone again (Selection 1). These are a plain click, a
  Shift-click and a Ctrl-click, none of which added to the selection. `07.png`: the tie opened
  again (blue band, minutes 4) with the "Edge actions" menu open on "Select endpoints", "Frame
  selection F", "Add note N", covering the From value and part of the "Values" tab, as the key
  notes. `08.png`: after "Select endpoints", Station and Stadium selected and nothing else.
- **How Jordan got from "point out the two" to "Select endpoints":** by giving up on adding stops
  one at a time and looking through the tie's own menu. In Jordan's words, it "happened to fit
  this exact task".
- **Traps:** not fallen into. No name-click after Select endpoints (the key's single-stop trap);
  no miss that cleared the selection; no lasting style added in place of a selection.
- `work.json` agrees: start and end both hold the one PageRank run, the four layers and the one
  source; `gone` is empty. Nothing lost.

## Claims

- "Station and Stadium are the only two stops highlighted on the drawing (2 nodes selected)":
  true on `08.png`. No false "done".

## Measures

- **Steps:** 7 `real.mjs` steps after the start (`02.png` to `08.png`) against the success
  path's 3 (click the line, "Edge actions", "Select endpoints").
- **Wrong turns:** 2 -- the Shift-click and the Ctrl-click that each replaced the selection
  instead of adding to it (`05.png`, `06.png`). The first plain click on Station (`04.png`) was a
  reasonable start of the one-at-a-time route the key accepts, and is counted in the detour, not
  as a wrong turn.
- **Clicked the line itself:** yes, 1 try (`03.png`), after one hover (`02.png`).
- **First move:** a hover on the line (`02.png`: no tooltip, the screen unchanged).
- **Ease (self-rated, not used for the grade):** 5 of 7.

## Problems

1. **Shift-click and Ctrl-click on a stop replace the selection instead of adding to it, and
   nothing says how to select more than one.** Severity 3. Evidence: `04.png` Station selected;
   `05.png` Stadium selected and Station's halo gone, Selection 1; `06.png` Station alone again,
   Selection 1. Jordan: "nothing said why or how to pick more than one ... If I had wanted two
   stops that were not joined by a link, I would have been stuck." The answer key lists "Selecting
   [the two] with Shift held" as an accepted route; on this build it does not work. Seen also in
   session r3-s43 (Dana, T24 A: "Shift did not add -- it replaced"), so confirmed at two
   participants. Not 4: the task could still be done through the tie's menu.
2. **Hovering the line gives no tooltip and no change.** Severity 1. Evidence: `02.png` is the
   start screen with the pointer over the line; nothing about the tie shows until it is clicked.
   Jordan: "hovering the line gave no tooltip". The click that followed worked at once.
3. **"Select endpoints" is found only inside the tie's three-dot menu, in a word the reader does
   not use.** Severity 2 (opinion and behavior, one participant here). Evidence: Jordan reached it
   only after three failed selection clicks (`04.png` to `06.png`) and called finding it luck. The
   menu's button is an unlabeled "..." at the inspector's top right (`03.png`).
