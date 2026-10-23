# Grade: session r4-s02 -- Ruth (tier 1 graduate, returning), bus stops (T24 B), one tie on the drawing

**Grade: S** (success). The last screen (`04.png`) shows Station and Stadium ringed in yellow and
no other stop, the inspector titled "2 nodes selected" (subtitle "Selection") with Summary "Nodes
2" and "Edges joining these nodes 1", and the left panel's Selection row 2. Earlier, after a click
on the Station-Stadium line, the inspector read "Station -> Stadium", "Edge", From Station, To
Stadium, minutes 4 (`02.png`), and Ruth answered 4 minutes, the key's value. She selected the two
ends one after the other, Station then a Shift-click on Stadium, which the key accepts on this build
as a route with the same end state as Select endpoints. No detour.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `bus-stops-ranked-names.txt` (ranked, colored and sized by
PageRank, every name drawn). Tool commit `71ed347b39a5`, no uncommitted changes.

## The answer against the key

- **The number (right).** `02.png`: inspector "Station -> Stadium", From Station, To Stadium,
  minutes 4; the line drawn with a blue band; Selection row 1. Ruth read the 4 from that panel,
  not from the line's look. The tool printed "edge with id 15", the key's tie.
- **The two ends selected (right).** `04.png`: exactly Station and Stadium ringed, "2 nodes
  selected", Nodes 2, Edges joining these nodes 1, Selection 2. The middle screen (`03.png`) shows
  Station alone after a plain click (Selection 1), and the Shift-click added Stadium rather than
  replacing it, as the key records for 5277e2cbe.
- **Not a failure route.** No Ctrl-click (which would have left one stop), no click on a drawn name
  after the two were selected, no miss on empty canvas after selecting. No color or size used in
  place of a selection.
- **How she got from "the two on this tie" to a selection.** She never opened the edge's actions
  menu and never saw "Select endpoints". She reached for the habit she brought from other programs
  ("shift-click ... the way you add to a selection everywhere else") and it worked. `work.json`
  shows nothing added or gone: one run, the same four layers, no notes, no steps.

## Measures

- **Steps:** 3 `real.mjs` steps after the start (`02.png` to `04.png`): click the line, click
  Station, Shift-click Stadium. The success path is also 3 (click the line, Edge actions, Select
  endpoints). 1.0x.
- **Wrong turns:** 0.
- **False "done":** none. "I'm done" (after `04.png`) is true: the minutes were read from the
  screen and exactly the two stops are selected. truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none. Each click changed the inspector and the Selection count.
- **Numbers that disagree:** none. Selection 2 in the left panel matches "Nodes 2" in the
  inspector; minutes 4 matches the key.
- **Read the tie the wrong way round:** no. She quoted the panel's From and To, not the arrow.
- **Broken habit:** none.
- **Build-decided:** yes, in part: the Shift-click route exists only from 5277e2cbe (on
  26f3bb968e43 it replaced the selection). **Void:** no. Every step printed its result and
  screenshot; leaks.json shows no leaks.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                         | Evidence                                                                                                                  |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | comprehension   | With two stops selected, the inspector gives only counts ("Nodes 2", "Edges joining these nodes 1") and no names, so the only proof of which two are selected is the yellow rings on the drawing, partly covered by the white name boxes.     | `04.png`; transcript, "What confused me": "I had to trust the rings on the drawing to know which two they were"            |
| 2   | 1        | discoverability | Nothing tells a user a line can be clicked before trying it, and the Station-Stadium line is thin and runs close to the Depot-Station line. Her first try landed, so it cost nothing here.                                                      | `01.png`, `02.png`; transcript, "What confused me"                                                                         |
| 3   | 1        | legibility      | The arrowhead of the Depot-Station line sits right at Station, beside the selected Station-Stadium line, so the drawing seemed to her to show the tie pointing into Station while the title reads "Station -> Stadium". She relied on From and To instead. | `02.png` (arrowhead near 760,128 at Station; the selected line's own head at Stadium is under the blue band); transcript |

No severity 3 or 4: the number and the end state were right, and her doubts were about how sure
she could be, not about what she did. The ends command ("Select endpoints") went unseen, which
the task records but does not count against her since another route reached the same state.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
