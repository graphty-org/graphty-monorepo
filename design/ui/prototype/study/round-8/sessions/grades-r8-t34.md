# Grades: keep a named angle and present the kept angles

Task: "The Les Miserables network is open (example data, not your own). You have turned the
drawing to an angle that tells the story well. Keep that exact angle under a name so you can show
it again, then show your kept angles one after another as you would in a meeting."

This task was never reached in the previous round. The success path is: open Views in the left
rail, press the plus (tooltip "Save view"), type a name, then press the play triangle (tooltip
"Present") and step through with the arrows.

Grading rule: success = a view saved under a name the participant chose, and the presented
sequence stepped through to it. Success with difficulty = looked under Export first, could not
name the view, or reached it only after a wrong turn or long search. Failure = no view kept, or no
way to step through. Graded on what ended on screen, not on what the participant believed.

## Grades

| Participant | Their claim | Grade | What ended on screen |
|---|---|---|---|
| Marketing analyst | success | success | Present mode, "Bridges to the barricade, 3 of 3", next arrow grayed (07.png); Escape back to the list with the view kept (08.png) |
| Data journalist | success | success | Present mode, "Javert closes in, 3 of 3" (08.png); Escape back, view kept (09.png) |
| Gephi holdout | success | success | Present mode, "Barricade, 3 of 3", next arrow grayed (09.png) |
| Recipe recipient | success | success with difficulty | Present mode, "View 4, 3 of 3" (10.png): kept and presented, but never named |

Tally: 3 success, 1 success with difficulty, 0 failure, 0 gave up. Every participant went
straight to Views; none looked under Export or anywhere else first. Single Ease Question 6 of 7
from all four.

## Notes per participant

- **Marketing analyst.** Predicted the plus meant "add the one I'm looking at" before hovering;
  the hover only confirmed it. Typed a name, presented, stepped to the end, left with Escape. Clean.
- **Data journalist.** Same path, same prediction before hovering. Clean.
- **Gephi holdout.** Same path. Correctly told the Views play triangle (Present) apart from the
  canvas toolbar play button (run layout) without trying either. Clean.
- **Recipe recipient.** Reached the save and present steps without a wrong turn, but pressed Enter
  on the offered "View 4" because he believed the click-through tool could not type text. The other
  three typed names with it, so the screen did not stop him; this is a session error, not a
  defect in the design. It still matches the "cannot name the view" rule, so the grade is success
  with difficulty. Treat it as weak evidence about naming: the name field was already selected
  for typing, which he noticed and approved of.

## How to read the hover guessing

All four transcripts show several failed guesses at a control's name ("+", "Add view", "Play
tour"). That is the test harness needing a text label to point at, not participants searching the
screen: on a real screen the pointer on the plus shows "Save view" at once. It was not counted as
difficulty.

## Findings that cut across participants (evidence counts)

| Finding | Seen by | Severity (Nielsen 0-4) |
|---|---|---|
| Nothing says what a saved view holds (camera only, or coloring, labels and filter too) or whether it follows later restyling | 4 of 4 | 3 |
| No place to add the one-line caption the example views show while presenting; own view plays with a title only | 4 of 4 | 3 |
| Cannot confirm the saved angle was captured: the new view looks identical to "Whole cast" and the thumbnails are too small to compare | 4 of 4 | 2 |
| "In tour" checkbox meaning learned only from the "1 of 3" count; an unticked view is silently left out | 4 of 4 | 2 |
| "Whole cast" caption talks about communities while the slide is colored by PageRank | 2 of 4 | 1 (example content) |
| Caption bar covers node labels near the bottom of a zoomed slide (Courfeyrac, Bossuet) | 1 of 4 | 2 |
| "Lock the canvas" in present mode has no explanation | 1 of 4 (a second guessed its meaning correctly) | 1 |

Mock-fidelity caution: the "identical to Whole cast" finding is partly an artifact. No participant
moved the camera before saving, and the prototype's saved view shows the start render. It still
points at a real gap: after saving there is no confirmation of what was captured. Verify with a
session that changes the angle before saving before ranking it above severity 2.
