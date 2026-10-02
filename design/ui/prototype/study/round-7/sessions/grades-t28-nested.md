# Round 7 grades: bringing a second nested research export in alongside the first

The task: the project "Research network, March 2026" holds one export from a research database
(200 nodes: 170 researchers and 30 institutions, 670 edges, with records nested inside records).
Bring the newest export into this project alongside the earlier one.

What counts as success: the Data page refuses the export as not valid JSON, and the participant
says what to fix or what to ask the database owner for. Success with difficulty: the participant
needs the second line of the problem block ("Fix the file at that place, or choose another
file.") pointed out. Failure: the participant believes some of it loaded.

The designed path is: the just-loaded research network -> the Data page showing the refusal
("network-export-2026-03.json is not valid JSON: line 1,214, column 9 expects a comma or a
closing brace", Load off).

Grades are decided from what ended on screen and what the participant concluded, not from their
own rating.

## Grades

| Participant | Their rating | Grade | Why |
|---|---|---|---|
| Computational biologist | gave up | **gave up** | Last screen (17.png): still on the research network, after pressing Refresh on the March source. Tried every load route: Data, the unlabeled plus (found by guessing its name), File, Set collection, From a URL, Paste, the source's own menu (Replace, Refresh), the graph switcher and Compare graphs, the project and main menus. Every load route opened an unrelated dataset (bank transfers, or Les Miserables) as a new graph. Never saw the refusal. Stopped and said she would do it in R. |
| Knowledge engineer | gave up | **gave up** | Last screen (10.png): the import of an unrelated transfers CSV, headed "Open as a new graph", not loaded. Data, the plus (tooltip "Add data to this graph"), File, then Set collection, both reaching the same transfers import. Stopped after "two unexplained failures". Never saw the refusal. |
| Expert Emma | failure | **failure** | Last screen (17.png): the project is now "Transfers, March 2026" with a Louvain run she never made, and the graph switcher lists only Transfers. She read "Open as a new graph" as possibly meaning a new graph in this project, pressed Load on the transfers CSV as a stand-in for her export, and found her research network gone. She ended somewhere else. She did not believe her export had loaded; she concluded the import had replaced her project. |

**Tally: 0 success, 0 success with difficulty, 1 failure, 2 gave up (3 sessions).** Ease ratings
were 2, 2 and 2 out of 7.

## These sessions say nothing about the refusal screen

No participant saw the screen this task was written to test, and none could have. Three
problems with the task and the skeleton, all upstream of the design under test:

1. **The refusal screen is unreachable by clicking.** Nothing in the skeleton links to the
   invalid-JSON state: no control on the research network, in Add data, in the file chooser or
   in the source's menu leads there. The designed path is a jump between two routes, not a
   click path. File, Set collection, From a URL and Paste all open other datasets' fixtures
   (transfers, structuring alerts, Les Miserables). That is a skeleton gap, not design
   behavior, but every participant read it as the design sending them to the wrong file.
2. **The task never tells the participant there is a broken file.** "Bring the newest export in"
   gives no file to pick and no reason to expect a refusal. The success condition (say what to
   fix) needs the participant to have met the error first.
3. **The target screen contradicts the task.** The refusal names network-export-2026-03.json --
   the earlier export already loaded, not a newer one -- and is headed "Open as a new graph",
   while the task says "alongside the earlier one". A participant who did reach it would have
   reason to think the wrong file had been opened in the wrong place.

Studio decision: grade what happened (no participant reached the end state), and do not count
these sessions as evidence for or against the refusal block. Reason: the task as run measured
the load entry points, not the error message. To test the refusal, rerun with a task that hands
the participant a named broken export ("the database sent network-export-2026-04.json; bring it
in") and a click path from the file chooser to that file.

## What the sessions do show

Counts are out of 3. These are findings about the load entry points, which all three exercised.

| Finding | Seen by | Severity |
|---|---|---|
| "Add data to this graph" (the Sources plus) leads to an import headed "Open as a new graph". No choice between adding to this graph and opening a new one appears anywhere on the import. The refusal screen itself carries the same header, so this is in the design, not only in the fixtures. | 3 of 3 | 4 (catastrophe): it contradicts the task's goal and all three stopped on it |
| Nothing offers "add a newer export of this source and keep the old one". The source's menu has Rename, Replace with file, Edit source, Refresh; all three read Replace as destructive and the opposite of the task. | 3 of 3 | 3 (major) |
| "Set collection..." in the Add data menu could not be interpreted; each guessed it meant a set of exports and was wrong. | 3 of 3 | 2 (minor) |
| The Sources plus and the source row's dots are icon-only; all three had to guess a name to reach them, and two hit the inspector's "More actions" first. | 3 of 3 | 2 (minor) |
| After Load, the project title changes to the imported file and the earlier graph is gone from the graph switcher. | 1 of 3 (the only one who pressed Load) | 4 if the design does this; single voice, confirm before acting |
| The source name is truncated ("network-export-2026-0..."), cutting off the date, the one part that tells two exports apart; only a hover shows it. | 1 of 3 named it; all three relied on the hover or the menu title to read it | 2 (minor) |
| "Compare graphs..." is offered when the project holds one graph and no way to add a second is visible. | 2 of 3 | 2 (minor) |

What all three liked, unprompted: the match report on the import (row, id and edge counts),
and Cancel or Escape giving "Load cancelled: nothing was loaded" with Undo. The biologist and
Emma also praised the import's progress dialog and the comparison panel's "descriptive only"
wording.

The underlying job -- keeping two dated exports of the same source side by side to compare them
-- was what all three expected, and each named the tool they would use instead (R with a release
column, named graphs in GraphDB, one graph object per snapshot in a notebook). That job has no
home in the skeleton today. Whether it should be two sources in one graph, two graphs in one
project, or a version of a source is an open structural question for the spec, not something
these sessions settle.
