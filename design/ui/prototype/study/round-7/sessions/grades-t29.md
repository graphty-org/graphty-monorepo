# Grades: get your network into a new, empty project

The task: "You have just started a new, empty project. Get your network of characters into it. The
data on screen is a sample: characters of the novel Les Miserables, linked when they appear in the
same chapter. If that is not your line of work, treat them as your own people or things."

The intended path: from the empty project, press Add data... on the card in the middle of the
canvas (or open Data and press the "+" next to Sources), and the import page opens on the
characters' own file, miserables.gexf, with its 77 nodes and 254 edges listed, ready to Load
(shots/tasks/t29/04.png).

Grading rule: success means that import page, showing the characters' file, was reached from the
empty project's Add data... or the Sources "+". Success with difficulty means it was reached after
looking in the main menu or the toolbar first, a long search, or help from a hover. Failure means
the participant ended somewhere else or concluded wrongly. Gave up means they stopped. Grades go by
what was on screen at the end and what they concluded, not by how they rated themselves.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Explorer Elena | failure | failure | Pressed the big Add data... first, as intended, but it opened an import of somebody else's door-entry log (01.png). Cancelled, opened Data and found the characters already drawn with a full project around them (03-04.png), tried the left panel's Add data link (same door-entry log), then pressed Load on it. Her last screen is a project renamed "Door entries" with 421 nodes being read (08.png). She concluded, correctly, that her characters were never loaded by anything she did. |
| Recipe recipient (Tom) | failure | gave up | Big Add data... (door-entry log, 01.png), Cancel, Data (characters already there, which he could not explain), main menu, the left Add data link (door-entry log again), then Main menu > Open..., which listed three files that are not his (07.png). He stopped there by choice ("that's three wrong turns, I'd stop here") and would ask the sender to load it for him. Graded gave up rather than failure because he stopped on his own, with no wrong load made and an accurate reading of where he was. |
| Screen-reader analyst (Morgan) | gave up | gave up | The most thorough search: big Add data..., the left Add data link, Data, then found the Sources "+" by its accessible name "Add data to this graph" and its menu File... / From a URL... / Paste... / Set collection... (08.png) -- the second intended door. But File... opened a bank-transfers import (10.png), Load on the first import replaced the project with door entries (11.png), Open... listed other strangers' files, and Paste... finally showed the characters but stalled on a format choice whose two same-named controls did nothing (18-19.png). She stopped there. |

Totals: 0 success, 0 success with difficulty, 1 failure, 2 gave up. Ease scores: 2, 2, 2 out of 7.

## The main finding is a skeleton defect, not a design verdict

All three participants used one of the intended doors -- the big Add data... (all three, first) and
the Sources "+" (Morgan) -- and none of them was rewarded, because in the clickable skeleton those
doors are not wired to the screen this task's intended path ends on:

- Every "Add data..." control opens the door-entry import (the shared add-data command in
  app-b/lib.js goes to the import page's door-entries state), never the characters' file. The task's
  last screen, the import page on miserables.gexf, cannot be reached by clicking.
- The Data icon on the rail, pressed from the empty project, opens the full Les Miserables data
  place (77 nodes, 254 edges, a drawn graph) instead of the empty "No data. Add data" version the
  task path passes through. All three read this as the app having loaded something by itself, or
  the empty screen having lied.
- The main menu, opened from the empty project, shows the full project behind it (Morgan, Tom).
- File... in the Sources "+" menu opens a bank-transfers import; Open... lists another study's files.

So the grades say the skeleton failed this task, not that the design did. What the sessions DO show
about the design: everyone went to the big Add data... first and expected it to ask for a file
(3 of 3), and Morgan found the Sources "+" by its accessible name. The first-click choice the design
relies on is the one every participant made. This task should be rerun after the add-data command
can open a file choice that includes the characters' file.

## The mock artifact named in the task

The task warned that the empty project's Data place still shows the Les Miserables summary (77 nodes,
254 edges) in its right-hand panel (shots/tasks/t29/03.png). That artifact confused all three, and
in practice it was worse than the warning: from the empty project, the rail's Data led to the fully
populated place, so the whole canvas, not just the panel, contradicted "This graph is empty."

- Elena: "Did I just do that? I only clicked Data. Was it in there the whole time?" Later decided she
  had wandered into someone else's finished project.
- Tom: "Either it was always in there and the 'This graph is empty' screen was lying to me, or
  clicking 'Data' loaded something by itself."
- Morgan: "Thirty seconds ago the same Summary said 'No nodes or edges'. ... I will not count this as
  having done the task."

None of the three counted the populated Data place as success, and neither do these grades.

## Design findings (real, beyond the wiring)

| Finding | Evidence | Severity (0-4) |
|---|---|---|
| Add data... opens an import already filled with a file the person never chose, and the header switches to that file's name ("Open as a new graph"), so it reads as someone else's data replacing the project. Even once the wiring is fixed, Add data... should ask for the file before showing any table. | 3 of 3; Tom raised a compliance worry ("somebody's badge-swipe log"); Morgan: "I asked to add data to THIS project." | 3 |
| Load on an import into an existing project renames the project to the imported file. | Elena, Morgan (2 of 3 who pressed Load) | 3 |
| The paste flow's format choice has two controls with the same name ("Choose: GraphML or GEXF"), one opening the panel and one being the setting, and neither choosing GEXF nor pressing Format visibly does anything. | Morgan (1, screen reader) -- single voice, but the duplicate name is checkable in the render | 3 |
| No way to drag a file in or reach the person's own folders is visible anywhere. | Elena, Tom (2) | 2 |
| "Local only" in the header is not explained; two participants hoped it meant their file stays on their machine. | Tom, Morgan (2) | 1 |

Positive, kept: "Load cancelled: nothing was loaded" with Undo was the one message all three trusted
(3 of 3). Morgan valued the match report and the "Load is off" sentence, which say in words what is
wrong and how much (1, single voice).
