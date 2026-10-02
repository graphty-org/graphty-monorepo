# Round 7 grades: t13, "rerun March's analysis on April's transfers"

The task: "April's transfers have arrived as a new export. You want everything you built on
March -- the rings, the rankings, the colors -- to run again on April's numbers in place of
March's, without rebuilding anything." The project is "Transfers, March 2026": two source files
(accounts-2026-03.csv, transfers-2026-03.csv), an amount filter, Louvain communities and a
"Links in (count)" ranking.

What counts as success: the transfers file's menu in Data > Sources offers "Replace with file...",
the Data page then shows April's file in March's place, and after Load the runs are marked out of
date (or rerun) with each changed number marked. Success with difficulty: reaching "Replace with
file..." on a second try, from the project menu or another wrong start. Failure: opening April as
a new project or a new graph and rebuilding, ending somewhere else, or concluding wrongly.

The designed path is: the graph at rest -> Data -> the transfers file's "..." menu -> "Replace
with file..." (transfers-2026-04.csv, 8,370 rows, "every role carried over") -> Load -> Data
showing the replaced file -> Louvain marked "used March data, now April: 132 accounts added, 39
removed" with a Rerun button.

Grades are decided from what ended on screen and what the participant concluded, not from their
own rating.

## Grades

| Participant | Their rating | Grade | Why |
|---|---|---|---|
| Fraud analyst | gave up | **gave up** | Never opened the transfers file's "..." menu: about a dozen guessed names for it missed, and "More" twice opened the graph's own menu instead. Tried Add data > File (it opened "Open as a new graph" and dropped the amount weight, so she cancelled) and Apply recipe (someone else's recipe, cancelled). Did not rebuild; stopped at about fifteen minutes. Last screen: the Data place with the graph's "More actions" tooltip. |
| Analyst Alex | failure | **gave up** | Found "Actions for transfers-2026-03.csv" by hover on the fourth guess, chose "Replace with file...", read the match report and pressed Load -- every action the design asks for. The screen after Load still read transfers-2026-03.csv, 9,113 rows and edges, the filter was gone, and the Graph view was the start screen unchanged ("Run from Louvain, Sep 28"). He concluded he could not tell whether April loaded, which is a correct reading of that screen, and stopped on the Analyze picker rather than rebuild. |
| Marketing analyst | failure | **gave up** | Same route and same Load as Alex; read the unchanged file name, counts and Louvain sizes after Load and the vanished filter. Looked for a rerun-everything in the graph menu and the project menu, opened Apply recipe, saw a different analysis and cancelled. Did not open April as a new graph. Ended on the Apply recipe dialog: "I would not put these numbers in a deck." |
| Supply chain analyst | failure | **failure** | Reached "Replace with file..." on the fifth try and pressed Load; after Load saw March's numbers and the dropped filter. Opened Louvain's "More actions" and pressed Rerun, which switched the screen to an unrelated project (Les Miserables, 77 nodes). Ended somewhere else. The cause is a broken route in the skeleton, not her choice, but her last screen holds none of her work. |
| Genomics Cytoscape user | failure | **gave up** | Found the source menu on the second real try (the moderator notes the extra misses were the study tool's naming), chose "Replace with file...", praised "every role carried over", pressed Load. After Load: March file name, 9,113 edges, no filter, Graph identical to the start. Clicked "from Louvain, Sep 28" hoping for run details or a rerun and got the general Analyze picker; stopped there: "I don't know, and that's the answer." |
| ML engineer (recommendations) | gave up | **gave up** | Found the menu on the third guessed name, chose "Replace with file...", pressed Load. Saw the March file and counts, the dropped filter, an unchanged Graph view, then reopened the source menu and "Edit source..." showed the March file and March rows, and concluded the replace "did not take". Correct reading of the skeleton; stopped. Ended on "Edit: transfers". |

**Tally: 0 success, 0 success with difficulty, 1 failure, 5 gave up (6 sessions).**

Nobody opened April as a new graph and nobody rebuilt the analysis: the failure the task was
written to catch did not happen. 5 of 6 found "Replace with file..." and 6 of 6 who saw it said it
was their own word for the job ("exactly it", "literally what I want"). 5 of 6 praised the match
report line "all 4 columns ... are here, so every role carried over". No one completed the second
half of the task -- seeing April in March's place and the runs marked out of date -- because the
skeleton never shows it.

## This round does not measure the design's second half

Three defects in the skeleton decided every session that got past the menu:

1. **The state after Load still shows March.** The designed screen after Load (shots/tasks/t13/05.png)
   reads transfers-2026-03.csv, "9,113 rows, 9,113 edges, r..." and a Summary of 9,113 edges. The
   only sign of the replace, ", replaced Sep 30", is cut off at "r..." and has no tooltip. 5 of 5
   who pressed Load read this as "April did not load" or "I cannot tell". The replace preview just
   before it said 8,370 rows, so the screen contradicted itself.
2. **The filter disappears after Load.** The start state has "amount is at least 1,000, 812 of
   3,000 nodes"; the after-Load state has "No filters" and no message. 5 of 5 noticed and 5 of 5
   called it silent loss of their work -- the opposite of the task. It is the after-Load state
   being built with no filter steps, not a designed behavior.
3. **The out-of-date mark is unreachable.** The designed Louvain inspector ("Louvain used March
   data. It is now April: 132 accounts added, 39 removed." with Rerun, shots/tasks/t13/06.png)
   exists, but Graph after Load returns to the plain start screen ("Run from Louvain, Sep 28", same
   sizes). 4 of 4 who went back to Graph saw no mark, and Louvain's Rerun (1 of 1) opened the Les
   Miserables project.

## Findings that do measure the design

| Finding | Evidence | Severity (Nielsen 0-4) |
|---|---|---|
| The source row's "..." has no visible label and looks like the inspector's "..." beside it; "More" reached the graph's menu, which holds "Clear graph data". | 6 of 6 opened or hovered the wrong menu first; 5 of 6 needed hover to learn the name. Part of the count is the study tool clicking by name (moderator notes, 2 sessions), so the real-mouse cost is lower but not zero: 4 of 6 also clicked the file name first and got the mapping editor. | 2 |
| Clicking the file name opens the mapping editor, which has no "choose a different file", and the file name inside it is dead text. | 6 of 6 clicked the file first expecting to swap it there; 4 of 6 clicked the name in the editor again. | 2 |
| The replace preview shows March's rows (2026-03-29, 2026-03-25 ...) under April's file name. | 5 of 5 who reached the preview questioned whether it was really the April file. Likely a fixture artifact (the preview samples March's file), but it read as a trust failure. | 3 if real, 0 if fixture |
| The replace match report drops "every row has both ends", so nobody can tell whether April's transfers point at accounts missing from the March accounts file. | 3 of 5 (Alex, genomics, ML engineer) asked for that count unprompted. | 3 |
| Nothing says what Load will do to the runs and styles. | 3 of 5 said the preview gave no hint about Louvain or the ranking; 3 of 6 asked for one "refresh everything, list what reran" summary. | 2 |
| The Data tab turns the colored graph gray ("Nothing is colored or sized by a row"). | 4 of 6 feared they had lost their colors just by opening Data. | 2 |
| "Apply recipe or style file..." in the project menu reads as the reuse-my-work path and offers someone else's recipe. | 4 of 6 considered it; 3 of 6 opened it and cancelled. | 1 |
| "from Louvain, Sep 28" opens the general Analyze picker, not the run's details or a rerun. | 2 of 2 who clicked it expected run details. | 2 |

## What the round tells us

The first half of the design works: the verb is right and in the right place, and the column
carry-over is the most-praised moment in the task. The second half cannot be judged until the
after-Load state shows April's file name and row count, keeps the filter, and leads to the Louvain
and "Links in" rows marked out of date. Rerun t13 once those three states are fixed; until then
its outcomes say nothing about whether a reader can tell which month they are looking at.
